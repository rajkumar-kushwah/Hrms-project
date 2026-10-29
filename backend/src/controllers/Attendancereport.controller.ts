
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

        // Super Admin: selected company from header/query
        // Company Admin: company ID from logged-in user's session
        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: superAdmin
                    ? "Please select a company to view the report."
                    : "Company not found in session.",
            });
        }

        const currentDate = new Date();

        const month =
            typeof req.query.month === "string" &&
            req.query.month.trim() !== ""
                ? Number(req.query.month)
                : currentDate.getMonth() + 1;

        const year =
            typeof req.query.year === "string" &&
            req.query.year.trim() !== ""
                ? Number(req.query.year)
                : currentDate.getFullYear();

        if (!Number.isInteger(month) || month < 1 || month > 12) {
            return res.status(400).json({
                success: false,
                message: "Invalid month. Month must be between 1 and 12.",
            });
        }

        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            return res.status(400).json({
                success: false,
                message: "Invalid year.",
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
            message: "Failed to fetch attendance report.",
        });
    }
};
