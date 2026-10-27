
import type { Request, Response } from "express";
import * as AttendanceService from "../services/attendance.service.js";
import * as SheetService from "../services/attendance.service.js";
import {
    isDatabaseUnavailable,
    sendDatabaseUnavailable,
} from "../utilis/dbErrors.js";
import {
    isAdminRole,
    isSuperAdminRole,
    normalizeRoleName,
    getCompanyId,
} from "../utilis/roleUtils.js";
import { prisma } from "../config/db.js";

export const punchIn = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const companyId = getCompanyId(req);

        if (!userId || !companyId) {
            return res.status(400).json({
                success: false,
                message: "User or company information is missing",
            });
        }

        const result = await AttendanceService.punchIn(
            userId,
            companyId,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result.attendance,
        });
    } catch (error: unknown) {
        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Punch in failed",
        });
    }
};

export const punchOut = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const companyId = getCompanyId(req);

        if (!userId || !companyId) {
            return res.status(400).json({
                success: false,
                message: "User or company information is missing",
            });
        }

        const result = await AttendanceService.punchOut(
            userId,
            companyId,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result.attendance,
        });
    } catch (error: unknown) {
        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Punch out failed",
        });
    }
};

export const getTodayAttendance = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User information is missing",
            });
        }

        const attendance = await AttendanceService.getTodayAttendance(userId);

        return res.status(200).json({
            success: true,
            data: attendance,
        });
    } catch (error: unknown) {
        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch attendance",
        });
    }
};

export const getMyAttendance = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const companyId = getCompanyId(req);
        const month = req.query.month ? Number(req.query.month) : undefined;
        const year = req.query.year ? Number(req.query.year) : undefined;

        if (!userId || !companyId) {
            return res.status(400).json({
                success: false,
                message: "User or company information is missing",
            });
        }

        const attendance = await AttendanceService.getMyAttendance(
            userId,
            companyId,
            month,
            year
        );

        return res.status(200).json({
            success: true,
            data: attendance,
        });
    } catch (error: unknown) {
        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch attendance",
        });
    }
};

export const getAllAttendance = async (req: Request, res: Response) => {
    try {
        const companyId = isSuperAdminRole(req.user?.role?.name)
            ? null
            : getCompanyId(req);

        if (!isSuperAdminRole(req.user?.role?.name) && !companyId) {
            return res.status(400).json({
                success: false,
                message: "Company information is missing",
            });
        }

        const date = typeof req.query.date === "string"
            ? req.query.date
            : undefined;

        const attendance = await AttendanceService.getAllAttendance(
            companyId,
            date
        );

        return res.status(200).json({
            success: true,
            data: attendance,
        });
    } catch (error: unknown) {
        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch attendance",
        });
    }
};

// Get live attendance
export const getLiveAttendance = async (req: Request, res: Response) => {
    try {
        const superAdmin = isSuperAdminRole(req.user?.role?.name);
        const companyId = superAdmin ? null : getCompanyId(req);

        if (!superAdmin && !companyId) {
            return res.status(400).json({
                success: false,
                message: "Company information is missing",
            });
        }

        const attendance = await AttendanceService.getLiveAttendance(companyId);

        return res.status(200).json({
            success: true,
            data: attendance,
        });
    } catch (error: unknown) {
        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch live attendance",
        });
    }
};

// Get employee's monthly attendance
export const getEmployeeAttendance = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;
        const companyId = getCompanyId(req);
        const month = req.query.month ? Number(req.query.month) : undefined;
        const year = req.query.year ? Number(req.query.year) : undefined;

        if (!userId || !companyId) {
            return res.status(400).json({
                success: false,
                message: "User or company information is missing",
            });
        }

        const [attendance, employee] = await Promise.all([
            AttendanceService.getEmployeeAttendance(
                userId,
                companyId,
                month,
                year
            ),
            AttendanceService.getEmployeeBasicInfo(userId),
        ]);

        return res.status(200).json({
            success: true,
            data: { attendance, employee },
        });
    } catch (error: unknown) {
        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to fetch employee attendance",
        });
    }
};


// GET /api/attendance/monthly-sheet?month=9&year=2026
// Super Admin: /api/attendance/monthly-sheet?month=9&year=2026&companyId=COMPANY_ID
export const getMonthlySheet = async (req: Request, res: Response) => {
    try {
        const roleName = normalizeRoleName(req.user?.role?.name);
        const userId = req.user?.id;
        const companyId = getCompanyId(req);

        const month = Number(req.query.month) || new Date().getMonth() + 1;
        const year = Number(req.query.year) || new Date().getFullYear();

        if (!Number.isInteger(month) || month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                message: "Invalid month",
            });
        }

        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            return res.status(400).json({
                success: false,
                message: "Invalid year",
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User information is missing",
            });
        }

        // Employee: sirf apni attendance sheet
        if (roleName === "employee") {
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: "Company information is missing",
                });
            }

            const data = await AttendanceService.getMyAttendance(
                userId,
                companyId,
                month,
                year
            );

            return res.status(200).json({
                success: true,
                data,
            });
        }

        // Sirf Super Admin aur Company Admin ko monthly sheet access hai.
        if (
            roleName !== "super_admin" &&
            roleName !== "company_admin"
        ) {
            return res.status(403).json({
                success: false,
                message: "Not authorized",
            });
        }

        // Super Admin ke liye selected company required hai.
        // Company Admin ke liye getCompanyId(req) apni company return karega.
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company",
            });
        }

        // Confirm the selected company exists.
        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Selected company not found",
            });
        }

        const data = await SheetService.getMonthlySheet(
            company.id,
            month,
            year
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error: unknown) {
        console.error("Monthly sheet failed:", error);

        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(500).json({
            success: false,
            message: "Failed to fetch monthly attendance",
        });
    }
};
