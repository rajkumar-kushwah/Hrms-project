import type { Request, Response } from "express";
import * as ReportService from "../services/Attendancereport.service.js";
import { isDatabaseUnavailable, sendDatabaseUnavailable } from "../utilis/dbErrors.js";

const isAdminUser = (req: Request) => {
    const roleName = req.user?.role?.name
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    return roleName === "super_admin" || roleName === "company_admin";
};

// GET /api/attendance/report?month=9&year=2026
export const getAttendanceReport = async (req: Request, res: Response) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company context to view the report",
            });
        }

        const month = Number(req.query.month) || new Date().getMonth() + 1;
        const year = Number(req.query.year) || new Date().getFullYear();

        if (!Number.isInteger(month) || month < 1 || month > 12) {
            return res.status(400).json({ success: false, message: "Invalid month" });
        }

        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            return res.status(400).json({ success: false, message: "Invalid year" });
        }

        const data = await ReportService.getAttendanceReport(companyId, month, year);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        console.error("Attendance report failed:", error);

        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(500).json({ success: false, message: error.message });
    }
};

// attendance routes file mein (dynamic /:something routes se pehle):
// router.get("/report", protect, getAttendanceReport);