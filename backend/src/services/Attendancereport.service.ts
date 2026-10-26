
import { prisma } from "../config/db.js";
import {
    getMonthlySheet,
    type DayStatus,
} from "../services/attendance.service.js";

const round1 = (value: number) => Math.round(value * 10) / 10;

export const getAttendanceReport = async (
    companyId: string,
    month: number,
    year: number
) => {
    const sheet = await getMonthlySheet(companyId, month, year);

    const monthStart = new Date(year, month - 1, 1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(year, month, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const userIds = sheet.employees.map((employee) => employee.userId);

    const hourRows = userIds.length
        ? await prisma.attendance.groupBy({
              by: ["userId"],
              where: {
                  companyId,
                  userId: { in: userIds },
                  date: { gte: monthStart, lte: monthEnd },
                  workingHours: { gt: 0 },
              },
              _sum: { workingHours: true },
              _count: { workingHours: true },
          })
        : [];

    const hoursByUser = new Map(
        hourRows.map((row) => [
            row.userId,
            {
                total: row._sum.workingHours ?? 0,
                days: row._count.workingHours,
            },
        ])
    );

    const employees = sheet.employees.map((employee) => {
        const count = (status: DayStatus) =>
            employee.days.filter((day) => day === status).length;

        const present = count("Present");
        const late = count("Late");
        const halfDay = count("Half-day");
        const absent = count("Absent");
        const paidLeave = count("Paid Leave");
        const unpaidLeave = count("Unpaid Leave");
        const weekOff = count("Week Off");
        const unpaidWeekOff = count("Unpaid Week Off");
        const holiday = count("Holiday");

        const workingDays =
            present + late + halfDay + absent + paidLeave + unpaidLeave;

        const attended = present + late + halfDay * 0.5;
        const hours = hoursByUser.get(employee.userId);

        return {
            userId: employee.userId,
            name: employee.name,
            employeeCode: employee.employeeCode,
            branchName: employee.branchName ?? "Unassigned",
            present,
            late,
            halfDay,
            absent,
            paidLeave,
            unpaidLeave,
            weekOff,
            unpaidWeekOff,
            holiday,
            workingDays,
            attendancePercent:
                workingDays > 0
                    ? Math.round((attended / workingDays) * 100)
                    : 0,
            unpaidDays:
                absent + unpaidLeave + unpaidWeekOff + halfDay * 0.5,
            totalHours: round1(hours?.total ?? 0),
            avgHours:
                hours && hours.days > 0
                    ? round1(hours.total / hours.days)
                    : 0,
        };
    });

    type Row = (typeof employees)[number];

    const summarize = (rows: Row[]) => {
        const total = (pick: (row: Row) => number) =>
            rows.reduce((sum, row) => sum + pick(row), 0);

        return {
            employeeCount: rows.length,
            present: total((row) => row.present),
            late: total((row) => row.late),
            halfDay: total((row) => row.halfDay),
            absent: total((row) => row.absent),
            leave: total((row) => row.paidLeave + row.unpaidLeave),
            unpaidDays: total((row) => row.unpaidDays),
            totalHours: round1(total((row) => row.totalHours)),
            avgAttendancePercent: rows.length
                ? Math.round(
                      total((row) => row.attendancePercent) / rows.length
                  )
                : 0,
        };
    };

    const branchNames = [
        ...new Set(employees.map((employee) => employee.branchName)),
    ].sort();

    return {
        month,
        year,
        totals: summarize(employees),
        byBranch: branchNames.map((name) => ({
            name,
            ...summarize(
                employees.filter((employee) => employee.branchName === name)
            ),
        })),
        employees,
    };
};
