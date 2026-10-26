
import type { Request, Response } from "express";
import * as ReportService from "../services/Attendancereport.service.js";
import {
    isDatabaseUnavailable,
    sendDatabaseUnavailable,
} from "../utilis/dbErrors.js";
import {
    getCompanyId,
    isSuperAdminRole,
    normalizeRoleName,
} from "../utilis/roleUtils.js";

// GET /api/attendance/report?month=9&year=2026&companyId=...
export const getAttendanceReport = async (
    req: Request,
    res: Response
) => {
    try {
        const roleName = normalizeRoleName(req.user?.role?.name);
        const superAdmin = isSuperAdminRole(roleName);
        const companyAdmin = roleName === "company_admin";

        if (!superAdmin && !companyAdmin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized",
            });
        }

        // Super Admin selects a company; Company Admin uses their own company.
        const requestedCompanyId =
            typeof req.query.companyId === "string"
                ? req.query.companyId.trim()
                : "";

        const companyId = superAdmin
            ? requestedCompanyId || null
            : getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: superAdmin
                    ? "Please select a company to view the report"
                    : "Company not found in session",
            });
        }

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

        const data = await ReportService.getAttendanceReport(
            companyId,
            month,
            year
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error: unknown) {
        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        console.error("Attendance report failed:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch attendance report",
        });
    }
};
