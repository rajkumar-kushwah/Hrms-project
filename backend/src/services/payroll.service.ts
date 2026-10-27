
import { prisma } from "../config/db.js";
import { getLockedPayrollIfExists } from "./Payrollstatus.service.js";
import { normalizeRoleName } from "../utilis/roleUtils.js";

// ─────────────────────────────────────────────────────────────
// Helper: Date Key
// ─────────────────────────────────────────────────────────────

const getDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}-${String(
        date.getDate()
    ).padStart(2, "0")}`;
};

// ─────────────────────────────────────────────────────────────
// Helper: Expand Holiday Date Range
// ─────────────────────────────────────────────────────────────

const getHolidayDateKeys = (
    holidayStart: Date,
    holidayEnd: Date,
    rangeStart: Date,
    rangeEnd: Date
): string[] => {
    const from = new Date(
        Math.max(holidayStart.getTime(), rangeStart.getTime())
    );

    const to = new Date(
        Math.min(holidayEnd.getTime(), rangeEnd.getTime())
    );

    from.setHours(0, 0, 0, 0);
    to.setHours(0, 0, 0, 0);

    const keys: string[] = [];

    for (
        const current = new Date(from);
        current <= to;
        current.setDate(current.getDate() + 1)
    ) {
        keys.push(getDateKey(current));
    }

    return keys;
};

// ─────────────────────────────────────────────────────────────
// Calculate Employee Payroll
// ─────────────────────────────────────────────────────────────

const calculateEmployeePayroll = async (
    userId: string,
    companyId: string,
    month: number,
    year: number
) => {
    // 1. Employee

    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            companyId,
        },
        select: {
            grossSalary: true,
            name: true,
            employeeCode: true,
            designation: true,
            isActive: true,
        },
    });

    if (!user) {
        throw new Error("User not found");
    }

    if (user.grossSalary === null || user.grossSalary === undefined) {
        throw new Error("Gross salary not found");
    }

    if (!user.isActive) {
        throw new Error("Employee is inactive");
    }

    // 2. Company Settings

    const companySettings = await prisma.companySettings.findUnique({
        where: {
            companyId,
        },
    });

    if (!companySettings) {
        throw new Error("Company settings not found");
    }

    // 3. Locked Payroll Check

    const locked = await getLockedPayrollIfExists(userId, month, year);

    if (locked) {
        return {
            userId,
            user: {
                id: userId,
                name: user.name,
                employeeCode: user.employeeCode,
                designation: user.designation,
            },
            month,
            year,
            totalDaysInMonth: locked.totalDaysInMonth,
            elapsedCalendarDays: locked.elapsedCalendarDays,
            totalWorkingDays: locked.workingDays,
            holidayDays: locked.holidayDays,
            presentDays: locked.presentDays,
            paidLeaveDays: locked.paidLeaveDays,
            unpaidLeaveDays: locked.unpaidLeaveDays,
            absentDays: locked.absentDays,
            payableDays: locked.payableDays,
            grossSalary: locked.grossSalary,
            earnedSalary: locked.earnedSalary,
            perDaySalary: locked.perDaySalary,
            totalUnpaidDays:
                locked.perDaySalary > 0
                    ? Number(
                          (
                              locked.unpaidDeduction /
                              locked.perDaySalary
                          ).toFixed(2)
                      )
                    : 0,
            deductionAmount: locked.unpaidDeduction,
            netSalary: locked.netSalary,
            status: locked.status,
        };
    }

    const weekOffDays = companySettings.weekOffDays ?? [0];

    // 4. Month Date Range

    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const totalDaysInMonth = new Date(year, month, 0).getDate();

    // 5. Calculation End Date

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    let calculationEndDate: Date;

    if (
        year === today.getFullYear() &&
        month === today.getMonth() + 1
    ) {
        calculationEndDate = new Date(today);
    } else if (new Date(year, month - 1, 1) > today) {
        calculationEndDate = new Date(year, month - 1, 0);
    } else {
        calculationEndDate = new Date(endDate);
    }

    calculationEndDate.setHours(23, 59, 59, 999);

    // 6. Elapsed Calendar Days

    let elapsedCalendarDays = 0;

    if (calculationEndDate >= startDate) {
        const currentDate = new Date(startDate);

        while (currentDate <= calculationEndDate) {
            elapsedCalendarDays++;
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    // 7. Company Holidays: Date Range

    const holidays = await prisma.holiday.findMany({
        where: {
            companyId,
            isActive: true,
            startDate: {
                lte: calculationEndDate,
            },
            endDate: {
                gte: startDate,
            },
        },
        select: {
            startDate: true,
            endDate: true,
            name: true,
        },
    });

    const holidayDates = new Set<string>();

    for (const holiday of holidays) {
        // Keep these checks while Prisma fields are nullable.
        if (!holiday.startDate || !holiday.endDate) {
            continue;
        }

        const keys = getHolidayDateKeys(
            holiday.startDate,
            holiday.endDate,
            startDate,
            calculationEndDate
        );

        for (const key of keys) {
            holidayDates.add(key);
        }
    }

    // 8. Count Working Days / Holidays / Week-Offs

    let weekOffCount = 0;
    let holidayDays = 0;
    let totalWorkingDays = 0;

    const loopDate = new Date(startDate);

    while (loopDate <= calculationEndDate) {
        const dayOfWeek = loopDate.getDay();
        const dateKey = getDateKey(loopDate);

        if (weekOffDays.includes(dayOfWeek)) {
            weekOffCount++;
        } else if (holidayDates.has(dateKey)) {
            holidayDays++;
        } else {
            totalWorkingDays++;
        }

        loopDate.setDate(loopDate.getDate() + 1);
    }

    // 9. Attendance Check Start Date

    const attendanceCheckStartDate = new Date(startDate);
    const startDay = attendanceCheckStartDate.getDay();

    const daysSinceMonday = startDay === 0 ? 6 : startDay - 1;

    attendanceCheckStartDate.setDate(
        attendanceCheckStartDate.getDate() - daysSinceMonday
    );
    attendanceCheckStartDate.setHours(0, 0, 0, 0);

    // 10. Attendance Records

    const attendanceRecords = await prisma.attendance.findMany({
        where: {
            userId,
            date: {
                gte: attendanceCheckStartDate,
                lte: calculationEndDate,
            },
            punchInTime: {
                not: null,
            },
        },
    });

    const attendanceMap = new Map<
        string,
        (typeof attendanceRecords)[number]
    >();

    for (const attendance of attendanceRecords) {
        const key = getDateKey(new Date(attendance.date));

        if (!attendanceMap.has(key)) {
            attendanceMap.set(key, attendance);
        }
    }

    // 11. Present / Half Day

    let presentDays = 0;
    let halfDays = 0;

    for (const attendance of attendanceRecords) {
        const attendanceDate = new Date(attendance.date);
        const key = getDateKey(attendanceDate);

        if (
            attendanceDate < startDate ||
            attendanceDate > calculationEndDate
        ) {
            continue;
        }

        if (holidayDates.has(key)) {
            continue;
        }

        if (weekOffDays.includes(attendanceDate.getDay())) {
            continue;
        }

        if (
            attendance.status === "Present" ||
            attendance.status === "Late"
        ) {
            presentDays++;
        } else if (attendance.status === "Half-day") {
            halfDays++;
        }
    }

    // 12. Weekly-Off Eligibility

    let paidWeekOffDays = 0;
    let unpaidWeekOffDays = 0;

    const weekOffEligibilityMap = new Map<string, boolean>();
    const weekOffCheckDate = new Date(startDate);

    while (weekOffCheckDate <= calculationEndDate) {
        const dayOfWeek = weekOffCheckDate.getDay();
        const currentDateKey = getDateKey(weekOffCheckDate);

        if (weekOffDays.includes(dayOfWeek)) {
            const monday = new Date(weekOffCheckDate);

            const daysBackToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

            monday.setDate(monday.getDate() - daysBackToMonday);
            monday.setHours(0, 0, 0, 0);

            const attendanceCheckEnd = new Date(weekOffCheckDate);
            attendanceCheckEnd.setDate(attendanceCheckEnd.getDate() - 1);
            attendanceCheckEnd.setHours(23, 59, 59, 999);

            let hasAttendanceInWeek = false;
            const attendanceDate = new Date(monday);

            while (attendanceDate <= attendanceCheckEnd) {
                const checkDateKey = getDateKey(attendanceDate);
                const checkDayOfWeek = attendanceDate.getDay();

                if (!weekOffDays.includes(checkDayOfWeek)) {
                    const isHoliday = holidayDates.has(checkDateKey);

                    if (!isHoliday) {
                        const attendance = attendanceMap.get(checkDateKey);

                        if (
                            attendance &&
                            (
                                attendance.status === "Present" ||
                                attendance.status === "Late" ||
                                attendance.status === "Half-day"
                            )
                        ) {
                            hasAttendanceInWeek = true;
                            break;
                        }
                    }
                }

                attendanceDate.setDate(attendanceDate.getDate() + 1);
            }

            weekOffEligibilityMap.set(
                currentDateKey,
                hasAttendanceInWeek
            );

            if (hasAttendanceInWeek) {
                paidWeekOffDays++;
            } else {
                unpaidWeekOffDays++;
            }
        }

        weekOffCheckDate.setDate(weekOffCheckDate.getDate() + 1);
    }

    // 13. Approved Leaves

    const approvedLeaves = await prisma.leaveRequest.findMany({
        where: {
            userId,
            status: "Approved",
            startDate: {
                lte: calculationEndDate,
            },
            endDate: {
                gte: startDate,
            },
        },
        include: {
            leaveType: {
                select: {
                    isPaid: true,
                    name: true,
                },
            },
        },
    });

    // 14. Paid / Unpaid Leave

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    const countedLeaveDates = new Set<string>();

    for (const leave of approvedLeaves) {
        const leaveStart = new Date(
            Math.max(leave.startDate.getTime(), startDate.getTime())
        );

        const leaveEnd = new Date(
            Math.min(
                leave.endDate.getTime(),
                calculationEndDate.getTime()
            )
        );

        for (
            const date = new Date(leaveStart);
            date <= leaveEnd;
            date.setDate(date.getDate() + 1)
        ) {
            const dayOfWeek = date.getDay();
            const dateKey = getDateKey(date);

            if (countedLeaveDates.has(dateKey)) {
                continue;
            }

            if (weekOffDays.includes(dayOfWeek)) {
                continue;
            }

            if (holidayDates.has(dateKey)) {
                continue;
            }

            if (attendanceMap.has(dateKey)) {
                continue;
            }

            countedLeaveDates.add(dateKey);

            if (leave.leaveType.isPaid) {
                paidLeaveDays++;
            } else {
                unpaidLeaveDays++;
            }
        }
    }

    // 15. Prevent Duplicate Leave Days

    const availableLeaveDays = Math.max(
        totalWorkingDays - presentDays - halfDays,
        0
    );

    paidLeaveDays = Math.min(paidLeaveDays, availableLeaveDays);

    const remainingDays = Math.max(
        totalWorkingDays - presentDays - halfDays - paidLeaveDays,
        0
    );

    unpaidLeaveDays = Math.min(unpaidLeaveDays, remainingDays);

    // 16. Absent Days

    const accountedDays =
        presentDays + halfDays + paidLeaveDays + unpaidLeaveDays;

    const absentDays = Math.max(
        totalWorkingDays - accountedDays,
        0
    );

    // 17. Salary Calculation

    const grossSalary = user.grossSalary;

    const perDaySalary =
        totalDaysInMonth > 0
            ? grossSalary / totalDaysInMonth
            : 0;

    // 18. Earned Salary

    const earnedSalary = elapsedCalendarDays * perDaySalary;

    // 19. Half-Day Deduction

    const halfDayDeduction = halfDays * 0.5;

    // 20. Total Unpaid Days

    const totalUnpaidDays =
        unpaidLeaveDays +
        absentDays +
        unpaidWeekOffDays +
        halfDayDeduction;

    // 21. Deduction Amount

    const deductionAmount = totalUnpaidDays * perDaySalary;

    // 22. Net Salary

    const netSalary = Math.max(earnedSalary - deductionAmount, 0);

    // 23. Payable Days

    const payableDays = Math.max(
        elapsedCalendarDays - totalUnpaidDays,
        0
    );

    // 24. Save Payroll

    await prisma.payroll.upsert({
        where: {
            userId_month_year: {
                userId,
                month,
                year,
            },
        },
        update: {
            grossSalary,
            workingDays: totalWorkingDays,
            holidayDays,
            presentDays,
            paidLeaveDays,
            unpaidLeaveDays,
            absentDays,
            unpaidDeduction: Number(deductionAmount.toFixed(2)),
            netSalary: Number(netSalary.toFixed(2)),
            totalDaysInMonth,
            elapsedCalendarDays,
            payableDays,
            earnedSalary: Number(earnedSalary.toFixed(2)),
            perDaySalary: Number(perDaySalary.toFixed(2)),
        },
        create: {
            userId,
            month,
            year,
            grossSalary,
            workingDays: totalWorkingDays,
            holidayDays,
            presentDays,
            paidLeaveDays,
            unpaidLeaveDays,
            absentDays,
            unpaidDeduction: Number(deductionAmount.toFixed(2)),
            netSalary: Number(netSalary.toFixed(2)),
            totalDaysInMonth,
            elapsedCalendarDays,
            payableDays,
            earnedSalary: Number(earnedSalary.toFixed(2)),
            perDaySalary: Number(perDaySalary.toFixed(2)),
            status: "DRAFT",
        },
    });

    return {
        userId,
        user: {
            id: userId,
            name: user.name,
            employeeCode: user.employeeCode,
            designation: user.designation,
        },
        month,
        year,
        totalDaysInMonth,
        elapsedCalendarDays,
        calculationStartDate: getDateKey(startDate),
        calculationEndDate: getDateKey(calculationEndDate),
        weekOffDays,
        weekOffCount,
        paidWeekOffDays,
        unpaidWeekOffDays,
        holidayDays,
        totalWorkingDays,
        presentDays,
        halfDays,
        paidLeaveDays,
        unpaidLeaveDays,
        absentDays,
        payableDays,
        grossSalary,
        earnedSalary: Number(earnedSalary.toFixed(2)),
        perDaySalary: Number(perDaySalary.toFixed(2)),
        totalUnpaidDays: Number(totalUnpaidDays.toFixed(2)),
        deductionAmount: Number(deductionAmount.toFixed(2)),
        netSalary: Number(netSalary.toFixed(2)),
        status: "DRAFT",
    };
};

// ─────────────────────────────────────────────────────────────
// Get Payroll Summary
// ─────────────────────────────────────────────────────────────

export const getPayrollSummary = async (
    companyId: string | null,
    month: number,
    year: number,
    userId?: string
) => {
    if (!companyId) {
        throw new Error("Company ID is required");
    }

    const roles = await prisma.role.findMany({
        select: {
            id: true,
            name: true,
        },
    });

    const excludedRoleIds = roles
        .filter((role) => {
            const normalizedRole = normalizeRoleName(role.name);

            return (
                normalizedRole === "company_admin" ||
                normalizedRole === "super_admin"
            );
        })
        .map((role) => role.id);

    const employees = await prisma.user.findMany({
        where: {
            companyId,
            isActive: true,
            ...(userId ? { id: userId } : {}),
            ...(
                excludedRoleIds.length > 0 && !userId
                    ? { roleId: { notIn: excludedRoleIds } }
                    : {}
            ),
        },
        select: {
            id: true,
        },
    });

    const payrollData = await Promise.all(
        employees.map((employee) =>
            calculateEmployeePayroll(
                employee.id,
                companyId,
                month,
                year
            )
        )
    );

    return payrollData;
};

// ─────────────────────────────────────────────────────────────
// Get Single Employee Payroll Detail
// ─────────────────────────────────────────────────────────────

export const getEmployeePayrollDetail = async (
    userId: string,
    companyId: string | null,
    month: number,
    year: number
) => {
    if (!companyId) {
        throw new Error("Company ID is required");
    }

    return await calculateEmployeePayroll(
        userId,
        companyId,
        month,
        year
    );
};

// ─────────────────────────────────────────────────────────────
// Update Employee Salary
// ─────────────────────────────────────────────────────────────

export const updateEmployeeSalary = async (
    userId: string,
    companyId: string | null,
    grossSalary: number
) => {
    if (!companyId) {
        throw new Error("Company ID is required");
    }

    if (!Number.isFinite(grossSalary) || grossSalary < 0) {
        throw new Error("Gross salary must be a valid non-negative number");
    }

    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            companyId,
        },
        select: {
            id: true,
        },
    });

    if (!user) {
        throw new Error("Employee not found in this company");
    }

    return await prisma.user.update({
        where: {
            id: userId,
        },
        data: {
            grossSalary,
        },
        select: {
            id: true,
            name: true,
            grossSalary: true,
        },
    });
};