
import { prisma } from "../config/db.js";
import { isWithinGeoFence } from "../utilis/geoFencing.js";
import {
    normalizeRoleName,
    isAdminRole,
} from "../utilis/roleUtils.js";

// ─── Shared helpers ──────────────────────────────────────────

const getCompanySettings = async (companyId: string) => {
    const settings = await prisma.companySettings.findUnique({
        where: { companyId },
    });

    if (settings) return settings;

    return prisma.companySettings.create({
        data: { companyId },
    });
};

const startOfDay = (date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

const getDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
    ).padStart(2, "0")}`;

const isValidDate = (date: Date) =>
    !Number.isNaN(date.getTime());

const isEmployeeRole = (roleName?: string | null) =>
    !isAdminRole(normalizeRoleName(roleName));

const getMonthRange = (month: number, year: number) => {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error("Invalid month");
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        throw new Error("Invalid year");
    }

    const start = new Date(year, month - 1, 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(year, month, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

// ─── Punch In ───────────────────────────────────────────────

export const punchIn = async (
    userId: string,
    companyId: string,
    data: { latitude: number; longitude: number }
) => {
    if (!companyId) {
        throw new Error("Company not found");
    }

    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            companyId,
            isActive: true,
        },
        include: {
            branch: true,
            role: { select: { name: true } },
        },
    });

    if (!user) throw new Error("Employee not found");

    if (!isEmployeeRole(user.role?.name)) {
        throw new Error("Admin users cannot punch attendance here");
    }

    if (!user.branchId || !user.branch) {
        throw new Error("No branch assigned to you");
    }

    const branch = user.branch;
    const settings = await getCompanySettings(companyId);

    const hasGeoCoordinates =
        branch.latitude != null &&
        branch.longitude != null &&
        branch.geoRadius != null &&
        branch.geoRadius > 0;

    const isWithinFence = hasGeoCoordinates
        ? isWithinGeoFence(
            data.latitude,
            data.longitude,
            branch.latitude!,
            branch.longitude!,
            branch.geoRadius!
        )
        : true;

    const now = new Date();
    const today = startOfDay(now);

    const existing = await prisma.attendance.findFirst({
        where: {
            userId,
            companyId,
            date: today,
        },
    });

    if (existing?.punchInTime) {
        throw new Error("You have already punched in today");
    }

    // Compare against the configured cutoff in Indian Standard Time.
    const timeParts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(now);

    const hour = Number(
        timeParts.find((part) => part.type === "hour")?.value
    );
    const minute = Number(
        timeParts.find((part) => part.type === "minute")?.value
    );

    const isLate =
        hour > settings.lateMarkHour ||
        (hour === settings.lateMarkHour &&
            minute > settings.lateMarkMinute);

    const attendance = await prisma.attendance.upsert({
        where: {
            userId_date: {
                userId,
                date: today,
            },
        },
        update: {
            punchInTime: now,
            punchInLat: data.latitude,
            punchInLng: data.longitude,
            isWithinGeoFence: isWithinFence,
            status: isLate ? "Late" : "Present",
            companyId,
            branchId: user.branchId,
        },
        create: {
            userId,
            companyId,
            branchId: user.branchId,
            date: today,
            punchInTime: now,
            punchInLat: data.latitude,
            punchInLng: data.longitude,
            isWithinGeoFence: isWithinFence,
            status: isLate ? "Late" : "Present",
        },
    });

    return {
        attendance,
        isWithinFence,
        message: isWithinFence
            ? "Punched in successfully"
            : "Punched in — but you are outside the branch location",
    };
};

// ─── Punch Out ──────────────────────────────────────────────

export const punchOut = async (
    userId: string,
    companyId: string,
    data: { latitude: number; longitude: number }
) => {
    if (!companyId) {
        throw new Error("Company not found");
    }

    const today = startOfDay(new Date());

    const attendance = await prisma.attendance.findFirst({
        where: {
            userId,
            companyId,
            date: today,
        },
    });

    if (!attendance?.punchInTime) {
        throw new Error("You haven't punched in today");
    }

    if (attendance.punchOutTime) {
        throw new Error("You have already punched out today");
    }

    const settings = await getCompanySettings(companyId);
    const now = new Date();

    const workingHours =
        (now.getTime() - attendance.punchInTime.getTime()) /
        (1000 * 60 * 60);

    if (workingHours < 0) {
        throw new Error("Invalid punch-in time");
    }

    const status =
        workingHours < settings.halfDayHours
            ? "Half-day"
            : attendance.status;

    const updated = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
            punchOutTime: now,
            punchOutLat: data.latitude,
            punchOutLng: data.longitude,
            workingHours: Number(workingHours.toFixed(2)),
            status,
        },
    });

    return {
        attendance: updated,
        message: "Punched out successfully",
    };
};

// ─── Today's Attendance ─────────────────────────────────────

export const getTodayAttendance = async (userId: string) => {
    const today = startOfDay(new Date());

    return prisma.attendance.findFirst({
        where: {
            userId,
            date: today,
        },
    });
};

// ─── My Attendance History ──────────────────────────────────

export const getMyAttendance = async (
    userId: string,
    companyId: string,
    month?: number,
    year?: number
) => {
    if (!companyId) {
        throw new Error("Company not found");
    }

    const currentDate = new Date();
    const targetMonth = month ?? currentDate.getMonth() + 1;
    const targetYear = year ?? currentDate.getFullYear();
    const { start: startDate, end: endDate } = getMonthRange(
        targetMonth,
        targetYear
    );

    const today = startOfDay(currentDate);
    const settings = await getCompanySettings(companyId);

    const [employee, records, holidays, approvedLeaves] =
        await Promise.all([
            prisma.user.findFirst({
                where: { id: userId, companyId },
                select: { id: true },
            }),

            prisma.attendance.findMany({
                where: {
                    userId,
                    companyId,
                    date: { gte: startDate, lte: endDate },
                },
                orderBy: { date: "asc" },
            }),

            prisma.holiday.findMany({
                where: {
                    companyId,
                    isActive: true,
                    date: { gte: startDate, lte: endDate },
                },
                select: { name: true, date: true },
            }),

            prisma.leaveRequest.findMany({
                where: {
                    userId,
                    companyId,
                    status: "Approved",
                    startDate: { lte: endDate },
                    endDate: { gte: startDate },
                },
                include: {
                    leaveType: { select: { name: true } },
                },
            }),
        ]);

    if (!employee) {
        throw new Error("Employee does not belong to this company");
    }

    const attendanceMap = new Map(
        records.map((record) => [
            getDateKey(new Date(record.date)),
            record,
        ])
    );

    const holidayMap = new Map(
        holidays.map((holiday) => [
            getDateKey(new Date(holiday.date)),
            holiday.name,
        ])
    );

    const leaveMap = new Map<string, string>();

    for (const leave of approvedLeaves) {
        const from = startOfDay(
            new Date(
                Math.max(
                    leave.startDate.getTime(),
                    startDate.getTime()
                )
            )
        );

        const to = startOfDay(
            new Date(
                Math.min(
                    leave.endDate.getTime(),
                    endDate.getTime()
                )
            )
        );

        for (
            let cursor = new Date(from);
            cursor <= to;
            cursor.setDate(cursor.getDate() + 1)
        ) {
            const key = getDateKey(cursor);

            if (!leaveMap.has(key)) {
                leaveMap.set(key, leave.leaveType.name);
            }
        }
    }

    const result: Array<
        (typeof records)[number] | {
            id: string;
            userId: string;
            companyId: string;
            branchId: null;
            date: Date;
            punchInTime: null;
            punchOutTime: null;
            punchInLat: null;
            punchInLng: null;
            punchOutLat: null;
            punchOutLng: null;
            workingHours: number;
            isWithinGeoFence: boolean;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            holidayName?: string;
        }
    > = [];

    for (
        let cursor = new Date(startDate);
        cursor <= endDate;
        cursor.setDate(cursor.getDate() + 1)
    ) {
        const date = new Date(cursor);
        if (date > today) continue;

        const key = getDateKey(date);

        // Priority: actual attendance > holiday > approved leave > week off > absent.
        const attendance = attendanceMap.get(key);

        if (attendance) {
            result.push(attendance);
            continue;
        }

        const holidayName = holidayMap.get(key);

        if (holidayName !== undefined) {
            result.push({
                id: `holiday-${key}`,
                userId,
                companyId,
                branchId: null,
                date,
                punchInTime: null,
                punchOutTime: null,
                punchInLat: null,
                punchInLng: null,
                punchOutLat: null,
                punchOutLng: null,
                workingHours: 0,
                isWithinGeoFence: false,
                status: "Holiday",
                holidayName,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            continue;
        }

        const leaveName = leaveMap.get(key);

        if (leaveName !== undefined) {
            result.push({
                id: `leave-${key}`,
                userId,
                companyId,
                branchId: null,
                date,
                punchInTime: null,
                punchOutTime: null,
                punchInLat: null,
                punchInLng: null,
                punchOutLat: null,
                punchOutLng: null,
                workingHours: 0,
                isWithinGeoFence: false,
                status: `On Leave (${leaveName})`,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            continue;
        }

        if (settings.weekOffDays.includes(date.getDay())) {
            result.push({
                id: `weekoff-${key}`,
                userId,
                companyId,
                branchId: null,
                date,
                punchInTime: null,
                punchOutTime: null,
                punchInLat: null,
                punchInLng: null,
                punchOutLat: null,
                punchOutLng: null,
                workingHours: 0,
                isWithinGeoFence: false,
                status: "Week Off",
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            continue;
        }

        result.push({
            id: `absent-${key}`,
            userId,
            companyId,
            branchId: null,
            date,
            punchInTime: null,
            punchOutTime: null,
            punchInLat: null,
            punchInLng: null,
            punchOutLat: null,
            punchOutLng: null,
            workingHours: 0,
            isWithinGeoFence: false,
            status: "Absent",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    return result.reverse();
};

// ─── All Employees Attendance (Admin) ───────────────────────

export const getAllAttendance = async (
    companyId: string | null,
    date?: string
) => {
    const targetDate = date ? new Date(date) : new Date();

    if (!isValidDate(targetDate)) {
        throw new Error("Invalid attendance date");
    }

    targetDate.setHours(0, 0, 0, 0);

    // A null companyId is the Super Admin's global scope.
    // The controller must authorize this before calling the service.
    const companyFilter = companyId ? { companyId } : {};

    const [users, records, approvedLeaves] = await Promise.all([
        prisma.user.findMany({
            where: {
                ...companyFilter,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                employeeCode: true,
                designation: true,
                companyId: true,
                role: { select: { name: true } },
                branch: { select: { id: true, name: true } },
            },
        }),

        prisma.attendance.findMany({
            where: {
                ...companyFilter,
                date: targetDate,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeCode: true,
                        designation: true,
                        role: { select: { name: true } },
                    },
                },
                branch: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { punchInTime: "desc" },
        }),

        prisma.leaveRequest.findMany({
            where: {
                ...companyFilter,
                status: "Approved",
                startDate: { lte: targetDate },
                endDate: { gte: targetDate },
            },
            include: {
                leaveType: { select: { name: true } },
            },
        }),
    ]);

    const employees = users.filter((user) =>
        isEmployeeRole(user.role?.name)
    );

    const employeeIds = new Set(
        employees.map((employee) => employee.id)
    );

    const employeeRecords = records.filter((record) =>
        employeeIds.has(record.userId)
    );

    const recordMap = new Map(
        employeeRecords.map((record) => [
            record.userId,
            record,
        ])
    );

    const leaveMap = new Map<string, string>();

    for (const leave of approvedLeaves) {
        if (employeeIds.has(leave.userId)) {
            leaveMap.set(leave.userId, leave.leaveType.name);
        }
    }

    // Company-specific week-off rules. For global reports, resolve
    // each employee's company's own settings instead of assuming Sunday.
    const companyIds = [
        ...new Set(
            employees
                .map((employee) => employee.companyId)
                .filter((id): id is string => id !== null)
        ),
    ];

    const settingsRows = await prisma.companySettings.findMany({
        where: { companyId: { in: companyIds } },
        select: { companyId: true, weekOffDays: true },
    });

    const weekOffByCompany = new Map(
        settingsRows.map((settings) => [
            settings.companyId,
            settings.weekOffDays,
        ])
    );

    const dateKey = getDateKey(targetDate);

    return employees.map((employee) => {
        const existing = recordMap.get(employee.id);

        if (existing) return existing;

        const leaveName = leaveMap.get(employee.id);

        const weekOffDays = employee.companyId
            ? weekOffByCompany.get(employee.companyId) ?? [0]
            : [0];

        const status = leaveName
            ? `On Leave (${leaveName})`
            : weekOffDays.includes(targetDate.getDay())
                ? "Week Off"
                : "Absent";

        return {
            id: `${status === "Absent" ? "absent" : status === "Week Off" ? "weekoff" : "leave"}-${employee.id}-${dateKey}`,
            userId: employee.id,
            companyId: employee.companyId,
            branchId: employee.branch?.id ?? null,
            date: targetDate,
            punchInTime: null,
            punchOutTime: null,
            punchInLat: null,
            punchInLng: null,
            punchOutLat: null,
            punchOutLng: null,
            workingHours: 0,
            isWithinGeoFence: false,
            status,
            createdAt: new Date(),
            updatedAt: new Date(),
            user: {
                id: employee.id,
                name: employee.name,
                employeeCode: employee.employeeCode,
                designation: employee.designation,
            },
            branch: employee.branch,
        };
    });
};

// ─── Live Attendance ─────────────────────────────────────────

// ─── Live Attendance ─────────────────────────────────────────

export const getLiveAttendance = async (
    companyId: string | null
) => {
    const today = startOfDay(new Date());

    const records = await prisma.attendance.findMany({
        where: {
            ...(companyId ? { companyId } : {}),
            date: today,
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    employeeCode: true,
                    designation: true,
                    role: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
            branch: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: {
            punchInTime: "desc",
        },
    });

    return records.filter((record) =>
        isEmployeeRole(record.user.role?.name)
    );
};

// ─── Employee Attendance ────────────────────────────────────

export const getEmployeeAttendance = async (
    userId: string,
    companyId: string | null,
    month?: number,
    year?: number
) => {
    const employee = await prisma.user.findFirst({
        where: {
            id: userId,
            ...(companyId ? { companyId } : {}),
        },
        select: {
            id: true,
            name: true,
            employeeCode: true,
            companyId: true,
            branch: { select: { id: true, name: true } },
        },
    });

    if (!employee) {
        throw new Error("Employee not found");
    }

    if (!employee.companyId) {
        throw new Error("Employee is not assigned to a company");
    }

    return getMyAttendance(
        employee.id,
        employee.companyId,
        month,
        year
    );
};

// ─── Employee Basic Info ─────────────────────────────────────

export const getEmployeeBasicInfo = async (userId: string) => {
    const employee = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
            designation: true,
            branch: { select: { id: true, name: true } },
        },
    });

    if (!employee) {
        throw new Error("Employee not found");
    }

    return employee;
};

// ─── Monthly Attendance / Payroll Sheet ──────────────────────

export type DayStatus =
    | "Present"
    | "Late"
    | "Half-day"
    | "Absent"
    | "Week Off"
    | "Unpaid Week Off"
    | "Holiday"
    | "Paid Leave"
    | "Unpaid Leave"
    | "Future";

interface DayRules {
    year: number;
    month: number;
    weekOffDays: number[];
    holidayKeys: Set<string>;
    todayKey: string;
}

export const resolveMonthDays = (
    rules: DayRules,
    attendanceByKey: Map<string, string>,
    leaveByKey: Map<string, boolean>
): DayStatus[] => {
    const {
        year,
        month,
        weekOffDays,
        holidayKeys,
        todayKey,
    } = rules;

    const daysInMonth = new Date(year, month, 0).getDate();

    const hasAttendanceInWeek = (weekOffDate: Date) => {
        const dayOfWeek = weekOffDate.getDay();
        const daysBackToMonday =
            dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const monday = new Date(weekOffDate);
        monday.setDate(
            monday.getDate() - daysBackToMonday
        );

        const previousDay = new Date(weekOffDate);
        previousDay.setDate(previousDay.getDate() - 1);

        for (
            let cursor = new Date(monday);
            cursor <= previousDay;
            cursor.setDate(cursor.getDate() + 1)
        ) {
            if (weekOffDays.includes(cursor.getDay())) continue;

            const key = getDateKey(cursor);
            if (holidayKeys.has(key)) continue;

            const status = attendanceByKey.get(key);

            if (
                status === "Present" ||
                status === "Late" ||
                status === "Half-day"
            ) {
                return true;
            }
        }

        return false;
    };

    const days: DayStatus[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const key = getDateKey(date);

        if (key > todayKey) {
            days.push("Future");
            continue;
        }

        if (weekOffDays.includes(date.getDay())) {
            days.push(
                hasAttendanceInWeek(date)
                    ? "Week Off"
                    : "Unpaid Week Off"
            );
            continue;
        }

        if (holidayKeys.has(key)) {
            days.push("Holiday");
            continue;
        }

        const attendanceStatus = attendanceByKey.get(key);

        if (attendanceStatus !== undefined) {
            days.push(
                attendanceStatus === "Present" ||
                    attendanceStatus === "Late" ||
                    attendanceStatus === "Half-day"
                    ? attendanceStatus
                    : "Absent"
            );
            continue;
        }

        const isPaidLeave = leaveByKey.get(key);

        if (isPaidLeave !== undefined) {
            days.push(
                isPaidLeave ? "Paid Leave" : "Unpaid Leave"
            );
            continue;
        }

        days.push("Absent");
    }

    return days;
};

export const getMonthlySheet = async (
    companyId: string,
    month: number,
    year: number
) => {
    if (!companyId) {
        throw new Error("Company not found");
    }

    const { start: monthStart, end: monthEnd } =
        getMonthRange(month, year);

    const firstDayIndex = monthStart.getDay();
    const lookbackStart = new Date(monthStart);

    lookbackStart.setDate(
        lookbackStart.getDate() -
        (firstDayIndex === 0 ? 6 : firstDayIndex - 1)
    );
    lookbackStart.setHours(0, 0, 0, 0);

    const todayKey = getDateKey(startOfDay(new Date()));

    const [settings, users] = await Promise.all([
        prisma.companySettings.findUnique({
            where: { companyId },
        }),

        prisma.user.findMany({
            where: {
                companyId,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                employeeCode: true,
                role: { select: { name: true } },
                branch: { select: { name: true } },
            },
            orderBy: { name: "asc" },
        }),
    ]);

    const employees = users.filter((user) =>
        isEmployeeRole(user.role?.name)
    );

    if (employees.length === 0) {
        return { month, year, employees: [] };
    }

    const employeeIds = employees.map((employee) => employee.id);
    const weekOffDays = settings?.weekOffDays ?? [0];

    const [holidays, attendance, leaves] = await Promise.all([
        prisma.holiday.findMany({
            where: {
                companyId,
                isActive: true,
                date: { gte: monthStart, lte: monthEnd },
            },
            select: { date: true },
        }),

        prisma.attendance.findMany({
            where: {
                companyId,
                userId: { in: employeeIds },
                date: {
                    gte: lookbackStart,
                    lte: monthEnd,
                },
                punchInTime: { not: null },
            },
            select: {
                userId: true,
                date: true,
                status: true,
            },
        }),

        prisma.leaveRequest.findMany({
            where: {
                companyId,
                userId: { in: employeeIds },
                status: "Approved",
                startDate: { lte: monthEnd },
                endDate: { gte: monthStart },
            },
            include: {
                leaveType: { select: { isPaid: true } },
            },
        }),
    ]);

    const holidayKeys = new Set(
        holidays.map((holiday) =>
            getDateKey(new Date(holiday.date))
        )
    );

    const attendanceByUser = new Map<
        string,
        Map<string, string>
    >();

    for (const record of attendance) {
        const key = getDateKey(new Date(record.date));

        const perUser =
            attendanceByUser.get(record.userId) ??
            new Map<string, string>();

        if (!perUser.has(key)) {
            perUser.set(key, record.status);
        }

        attendanceByUser.set(record.userId, perUser);
    }

    const leavesByUser = new Map<
        string,
        Map<string, boolean>
    >();

    for (const leave of leaves) {
        const perUser =
            leavesByUser.get(leave.userId) ??
            new Map<string, boolean>();

        const from = startOfDay(
            new Date(
                Math.max(
                    leave.startDate.getTime(),
                    monthStart.getTime()
                )
            )
        );

        const to = startOfDay(
            new Date(
                Math.min(
                    leave.endDate.getTime(),
                    monthEnd.getTime()
                )
            )
        );

        for (
            let cursor = new Date(from);
            cursor <= to;
            cursor.setDate(cursor.getDate() + 1)
        ) {
            const key = getDateKey(cursor);

            if (!perUser.has(key)) {
                perUser.set(key, leave.leaveType.isPaid);
            }
        }

        leavesByUser.set(leave.userId, perUser);
    }

    const rules: DayRules = {
        year,
        month,
        weekOffDays,
        holidayKeys,
        todayKey,
    };

    return {
        month,
        year,
        employees: employees.map((employee) => ({
            userId: employee.id,
            name: employee.name ?? "",
            employeeCode: employee.employeeCode,
            branchName: employee.branch?.name ?? null,
            days: resolveMonthDays(
                rules,
                attendanceByUser.get(employee.id) ??
                new Map<string, string>(),
                leavesByUser.get(employee.id) ??
                new Map<string, boolean>()
            ),
        })),
    };
};
