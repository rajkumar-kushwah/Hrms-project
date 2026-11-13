import { prisma } from "../config/db.js";
import { type Request, type Response } from "express";
import {
    isSuperAdminRole,
    isHRRole,
} from "../utilis/roleUtils.js";

// monthly attendance controller

export const getMonthlyAttendance = async (req: Request, res: Response) => {
    try {
        const session: any = req.session;
        const userId = session?.userId;
        const companyId = session?.companyId;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const month = Number(req.query.month);
        const year = Number(req.query.year);

        if (!month || !year) {
            return res.status(400).json({
                message: "Month and year are required",
            });
        }

        // month start
        const start = new Date(year, month - 1, 1);

        // month end
        const end = new Date(year, month, 0, 23, 59, 59, 999);

        // logged-in user + roles
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                role: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }



        let attendance;

        // SUPER_ADMIN / HR → all employees full attendance
        if (
            isSuperAdminRole(user.role) ||
            isHRRole(user.role)
        ) {
            attendance = await prisma.attendance.findMany({
                where: {
                    companyId: companyId,
                    punchInTime: {
                        gte: start,
                        lte: end,
                    },
                },
                include: {
                    user: {
                        include: {
                            role: true,
                            branch: true,
                            category: true,
                        },
                    },
                },
                orderBy: {
                    punchInTime: "asc",
                },
            });
        }

        // Normal employee → only own attendance
        else {
            attendance = await prisma.attendance.findMany({
                where: {
                    companyId,
                    userId: userId,
                    punchInTime: {
                        gte: start,
                        lte: end,
                    },
                },
                include: {
                    user: {
                        include: {
                            role: true,
                            branch: true,
                            category: true,
                        },
                    },
                },
                orderBy: {
                    punchInTime: "asc",
                },
            });
        }

        return res.status(200).json({
            success: true,
            message: "Monthly attendance fetched successfully",
            data: attendance,
        });
    } catch (error) {
        console.error("Monthly attendance error:", error);

        return res.status(500).json({
            message: "Server error",
        });
    }
};


// filtered monthly attendance

export const FilteredMonthlyAttendance = async (
    req: Request,
    res: Response
) => {
    try {
        const session: any = req.session;
        const userId = session?.userId;
        const companyId = session?.companyId;

        if (!userId) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const month = Number(req.query.month);
        const year = Number(req.query.year);

        const departmentId = Number(req.query.departmentId);
        const employeeId = Number(req.query.employeeId);

        const status = req.query.status as string;

        if (!month || !year) {
            return res.status(400).json({
                message: "Month and year are required",
            });
        }

        // month start
        const start = new Date(year, month - 1, 1);

        // month end
        const end = new Date(year, month, 0, 23, 59, 59, 999);

        // logged-in user + roles
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                role: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }



        // dynamic where
        const where: any = {
            companyId,
            checkIn: {
                gte: start,
                lte: end,
            },
        };

        // status filter
        if (status && status !== "all") {
            where.status = status;
        }

        const name = req.query.name as string;

        where.user = {
            employee: {}
        };

        if (departmentId) {
            where.user.employee.departmentId = departmentId;
        }

        if (name) {
            where.user.employee.firstName = {
                contains: name,
                mode: "insensitive",
            };
        }

        // employee filter
        if (employeeId) {
            where.userId = employeeId;
        }

        // normal employee → only own data
        if (
            !isSuperAdminRole(user.role) &&
            !isHRRole(user.role)
        ) {
            where.userId = userId;
        }

        const attendance =
            await prisma.attendance.findMany({
                where,
                include: {
                    user: {
                        include: {
                            role: true,
                            branch: true,
                            category: true,
                        },
                    },
                },
                orderBy: {
                    punchInTime: "asc",
                },
            });

        return res.status(200).json({
            success: true,
            message:
                "Monthly attendance fetched successfully",
            data: attendance,
        });
    } catch (error) {
        console.error(
            "Monthly attendance error:",
            error
        );

        return res.status(500).json({
            message: "Server error",
        });
    }
};