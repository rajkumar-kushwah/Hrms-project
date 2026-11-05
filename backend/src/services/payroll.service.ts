


import { prisma } from "../config/db.js";
import { getLockedPayrollIfExists } from "./Payrollstatus.service.js";
import { isEmployeeRole } from "../utilis/roleUtils.js";

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
            role: {
                select: {
                    name: true,
                },
            },
        },
    });

    if (!user) {
        throw new Error("Employee not found");
    }

    // Only Employee role can have payroll
    if (!isEmployeeRole(user.role?.name)) {
        throw new Error("Payroll is only available for employees");
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

    const weekOffDays = companySettings.weekOffDays ?? [0];

    // 3. Month Date Range

    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const totalDaysInMonth = new Date(year, month, 0).getDate();

    // 4. Calculation End Date

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

    // 5. Full Month Week-Off / Salary Days

    let monthWeekOffCount = 0;

    const fullMonthLoop = new Date(startDate);

    while (fullMonthLoop <= endDate) {
        if (weekOffDays.includes(fullMonthLoop.getDay())) {
            monthWeekOffCount++;
        }

        fullMonthLoop.setDate(fullMonthLoop.getDate() + 1);
    }

    // Salary days = Total calendar days - Full month week-offs
    // Holidays remain paid and are included in salary days.

    const monthSalaryDays = Math.max(
        totalDaysInMonth - monthWeekOffCount,
        0
    );

    // 6. Elapsed Calendar / Salary Days

    let elapsedCalendarDays = 0;
    let elapsedPayableDays = 0;
    let weekOffCount = 0;

    if (calculationEndDate >= startDate) {
        const currentDate = new Date(startDate);

        while (currentDate <= calculationEndDate) {
            elapsedCalendarDays++;

            if (weekOffDays.includes(currentDate.getDay())) {
                weekOffCount++;
            } else {
                // Week-offs excluded.
                // Holidays included because they are paid.
                elapsedPayableDays++;
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    // 7. Locked Payroll Check

    const locked = await getLockedPayrollIfExists(
        userId,
        month,
        year
    );

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
            monthSalaryDays: locked.workingDays,
            monthWeekOffCount,
            weekOffCount,
            totalWorkingDays: locked.workingDays,
            workingDays: locked.workingDays,
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

    // 8. Company Holidays

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

    // 9. Count Actual Working Days / Holidays

    let holidayDays = 0;
    let totalWorkingDays = 0;

    const loopDate = new Date(startDate);

    while (loopDate <= calculationEndDate) {
        const dayOfWeek = loopDate.getDay();
        const dateKey = getDateKey(loopDate);

        if (weekOffDays.includes(dayOfWeek)) {
            // Week-off: excluded from working days
        } else if (holidayDates.has(dateKey)) {
            // Company holiday: paid, not an actual working day
            holidayDays++;
        } else {
            totalWorkingDays++;
        }

        loopDate.setDate(loopDate.getDate() + 1);
    }

    // 10. Attendance Records

    const attendanceRecords = await prisma.attendance.findMany({
        where: {
            userId,
            companyId,
            date: {
                gte: startDate,
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

    // 11. Present / Half-Day

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

    // 12. Approved Leaves

    const approvedLeaves = await prisma.leaveRequest.findMany({
        where: {
            userId,
            companyId,
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

    // 13. Paid / Unpaid Leave

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    const countedLeaveDates = new Set<string>();

    for (const leave of approvedLeaves) {
        const leaveStart = new Date(
            Math.max(
                leave.startDate.getTime(),
                startDate.getTime()
            )
        );

        const leaveEnd = new Date(
            Math.min(
                leave.endDate.getTime(),
                calculationEndDate.getTime()
            )
        );

        leaveStart.setHours(0, 0, 0, 0);
        leaveEnd.setHours(0, 0, 0, 0);

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

            // Week-offs are not leave days
            if (weekOffDays.includes(dayOfWeek)) {
                continue;
            }

            // Holidays are paid separately
            if (holidayDates.has(dateKey)) {
                continue;
            }

            // Attendance already counted
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

    // 14. Prevent Duplicate Leave Days

    const availableLeaveDays = Math.max(
        totalWorkingDays - presentDays - halfDays,
        0
    );

    paidLeaveDays = Math.min(
        paidLeaveDays,
        availableLeaveDays
    );

    const remainingDays = Math.max(
        totalWorkingDays -
            presentDays -
            halfDays -
            paidLeaveDays,
        0
    );

    unpaidLeaveDays = Math.min(
        unpaidLeaveDays,
        remainingDays
    );

    // 15. Absent Days

    const accountedDays =
        presentDays +
        halfDays +
        paidLeaveDays +
        unpaidLeaveDays;

    const absentDays = Math.max(
        totalWorkingDays - accountedDays,
        0
    );

    // 16. Salary Calculation

    const grossSalary = user.grossSalary;

    // Dynamic divisor:
    // November 2026 with Sunday week-off:
    // 30 total days - 5 Sundays = 25 salary days.

    const perDaySalary =
        monthSalaryDays > 0
            ? grossSalary / monthSalaryDays
            : 0;

    // 17. Earned Salary

    // All elapsed non-week-off days are included.
    // This includes paid company holidays.

    const earnedSalary =
        elapsedPayableDays * perDaySalary;

    // 18. Half-Day Deduction

    const halfDayDeduction = halfDays * 0.5;

    // 19. Total Unpaid Days

    // No week-off deduction.
    // Week-offs are already excluded from salary days.

    const totalUnpaidDays =
        unpaidLeaveDays +
        absentDays +
        halfDayDeduction;

    // 20. Deduction Amount

    const deductionAmount =
        totalUnpaidDays * perDaySalary;

    // 21. Net Salary

    const netSalary = Math.max(
        earnedSalary - deductionAmount,
        0
    );

    // 22. Payable Days

    const payableDays = Math.max(
        elapsedPayableDays - totalUnpaidDays,
        0
    );

    // 23. Save Payroll

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
            workingDays: monthSalaryDays,
            holidayDays,
            presentDays,
            paidLeaveDays,
            unpaidLeaveDays,
            absentDays,
            unpaidDeduction: Number(
                deductionAmount.toFixed(2)
            ),
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
            workingDays: monthSalaryDays,
            holidayDays,
            presentDays,
            paidLeaveDays,
            unpaidLeaveDays,
            absentDays,
            unpaidDeduction: Number(
                deductionAmount.toFixed(2)
            ),
            netSalary: Number(netSalary.toFixed(2)),
            totalDaysInMonth,
            elapsedCalendarDays,
            payableDays,
            earnedSalary: Number(earnedSalary.toFixed(2)),
            perDaySalary: Number(perDaySalary.toFixed(2)),
            status: "DRAFT",
        },
    });

    // 24. Response

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
        monthWeekOffCount,
        weekOffCount,

        monthSalaryDays,
        workingDays: monthSalaryDays,

        holidayDays,
        totalWorkingDays,

        elapsedPayableDays,

        presentDays,
        halfDays,
        paidLeaveDays,
        unpaidLeaveDays,
        absentDays,

        payableDays,

        grossSalary,
        earnedSalary: Number(earnedSalary.toFixed(2)),
        perDaySalary: Number(perDaySalary.toFixed(2)),

        totalUnpaidDays: Number(
            totalUnpaidDays.toFixed(2)
        ),

        deductionAmount: Number(
            deductionAmount.toFixed(2)
        ),

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

    // Get only Employee role IDs.
    // Super Admin and Company Admin are automatically excluded.

    const employeeRoles = await prisma.role.findMany({
        where: {
            name: {
                // Role names are checked below using normalized helper.
                not: "",
            },
        },
        select: {
            id: true,
            name: true,
        },
    });

    const employeeRoleIds = employeeRoles
        .filter((role) => isEmployeeRole(role.name))
        .map((role) => role.id);

    if (employeeRoleIds.length === 0) {
        return [];
    }

    const employees = await prisma.user.findMany({
        where: {
            companyId,
            isActive: true,
            roleId: {
                in: employeeRoleIds,
            },
            ...(userId ? { id: userId } : {}),
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

    // calculateEmployeePayroll validates Employee role
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
        throw new Error(
            "Gross salary must be a valid non-negative number"
        );
    }

    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            companyId,
        },
        select: {
            id: true,
            role: {
                select: {
                    name: true,
                },
            },
        },
    });

    if (!user || !isEmployeeRole(user.role?.name)) {
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