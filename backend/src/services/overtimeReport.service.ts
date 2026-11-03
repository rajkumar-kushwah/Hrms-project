import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";

const STANDARD_WORKING_HOURS = 8;

interface OvertimeFilters {
    startDate?: string | undefined;
    endDate?: string | undefined;
    search?: string | undefined;
    page?: number;
    limit?: number;
}

export const getOvertimeReportService = async (
    filters: OvertimeFilters,
    companyId: string
) => {
    const {
        startDate,
        endDate,
        search,
        page = 1,
        limit = 10,
    } = filters;

    const skip = (page - 1) * limit;

    const attendanceWhere: Prisma.AttendanceWhereInput = {
        date: {
            ...(startDate ? { gte: new Date(`${startDate}T00:00:00.000Z`) } : {}),
            ...(endDate ? { lte: new Date(`${endDate}T23:59:59.999Z`) } : {}),
        },

        user: {
            is: {
                companyId,
                isActive: true,
                role: {
                    is: {
                        isSystemRole: false,
                    },
                },
                ...(search
                    ? {
                        OR: [
                            {
                                name: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                            {
                                email: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                            {
                                employeeCode: {
                                    contains: search,
                                    mode: "insensitive",
                                },
                            },
                        ],
                    }
                    : {}),
            },
        },
    };

    const attendanceRecords = await prisma.attendance.findMany({
        where: attendanceWhere,
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    employeeCode: true,
                    branch: {
                        select: {
                            name: true,
                        },
                    },
                    category: {
                        select: {
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            date: "desc",
        },
    });

    const overtimeRecords = attendanceRecords
        .map((record) => {
            const workingHours = Number(record.workingHours ?? 0);

            const overtimeHours = Math.max(
                workingHours - STANDARD_WORKING_HOURS,
                0
            );

            return {
                id: record.id,
                date: record.date,
                userId: record.user.id,
                employeeCode: record.user.employeeCode,
                employeeName: record.user.name,
                email: record.user.email,
                branch: record.user.branch?.name ?? "-",
                category: record.user.category?.name ?? "-",
                workingHours,
                overtimeHours,
            };
        })
        .filter((record) => record.overtimeHours > 0);

    const totalRecords = overtimeRecords.length;

    const summary = {
        totalOvertimeHours: Number(
            overtimeRecords
                .reduce((sum, record) => sum + record.overtimeHours, 0)
                .toFixed(2)
        ),

        employeesWithOvertime: new Set(
            overtimeRecords.map((record) => record.userId)
        ).size,

        totalOvertimeDays: totalRecords,
    };

    const data = overtimeRecords.slice(skip, skip + limit);

    return {
        summary,
        data,
        pagination: {
            page,
            limit,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
        },
    };
};