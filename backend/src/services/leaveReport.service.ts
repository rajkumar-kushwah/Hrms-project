
import { prisma } from "../config/db.js";
import type { Prisma } from "@prisma/client";

type LeaveReportFilters = {
    companyId: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    status?: string;
    page: number;
    limit: number;
};

export const getLeaveReportService = async (
    filters: LeaveReportFilters
) => {
    const {
        companyId,
        startDate,
        endDate,
        search,
        status,
        page,
        limit,
    } = filters;

    // Only active employees of the selected company.
    const userWhere: Prisma.UserWhereInput = {
        companyId,
        isActive: true,

        // Exclude system roles.
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
    };

    // Common filter for all report queries.
    const where: Prisma.LeaveRequestWhereInput = {
        user: {
            is: userWhere,
        },

        ...(startDate || endDate
            ? {
                  AND: [
                      ...(startDate
                          ? [{ endDate: { gte: startDate } }]
                          : []),
                      ...(endDate
                          ? [{ startDate: { lte: endDate } }]
                          : []),
                  ],
              }
            : {}),

        ...(status && status.toLowerCase() !== "all"
            ? {
                  status: {
                      equals: status,
                      mode: "insensitive",
                  },
              }
            : {}),
    };

    const getStatusCount = (value: string) =>
        prisma.leaveRequest.count({
            where: {
                ...where,
                status: {
                    equals: value,
                    mode: "insensitive",
                },
            },
        });

    const [
        total,
        approved,
        pending,
        rejected,
        cancelled,
        leaveRequests,
    ] = await Promise.all([
        // Counts include active employees only.
        prisma.leaveRequest.count({ where }),

        getStatusCount("Approved"),
        getStatusCount("Pending"),
        getStatusCount("Rejected"),
        getStatusCount("Cancelled"),

        // Employee leave records.
        prisma.leaveRequest.findMany({
            where,

            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        employeeCode: true,
                        companyId: true,
                        isActive: true,

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

                leaveType: {
                    select: {
                        name: true,
                        isPaid: true,
                    },
                },

                approvedByUser: {
                    select: {
                        name: true,
                    },
                },
            },

            orderBy: {
                createdAt: "desc",
            },

            skip: (page - 1) * limit,
            take: limit,
        }),
    ]);

    return {
        summary: {
            total,
            approved,
            pending,
            rejected,
            cancelled,
        },

        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },

        data: leaveRequests,
    };
};
