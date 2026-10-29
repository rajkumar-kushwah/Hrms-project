// payrollReportController.ts
import type { Request, Response } from "express";
import { getMonthlyPayrollReport } from "../services/payrollreport.service.js";
import { getCompanyId, normalizeRoleName } from "../utilis/roleUtils.js";

// GET /api/payroll/report?month=9&year=2026
// Super Admin: /api/payroll/report?month=9&year=2026&companyId=COMPANY_ID
export const monthlyPayrollReport = async (req: Request, res: Response) => {
    try {
        const companyId = getCompanyId(req);
        const userId = req.user?.id;
        const role = normalizeRoleName(req.user?.role?.name);

        const isAdmin =
            role === "company_admin" ||
            role === "super_admin";

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company information is required",
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User information is required",
            });
        }

        const month = Number(req.query.month);
        const year = Number(req.query.year);

        if (
            !Number.isInteger(month) ||
            month < 1 ||
            month > 12 ||
            !Number.isInteger(year) ||
            year < 2000
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid month and year are required",
            });
        }

        const report = await getMonthlyPayrollReport(
            companyId,
            month,
            year,
            isAdmin ? undefined : userId
        );

        return res.status(200).json({
            success: true,
            data: report,
        });
    } catch (error: unknown) {
        console.error("Monthly payroll report failed:", error);

        const message =
            error instanceof Error
                ? error.message
                : "Failed to generate payroll report";

        return res.status(500).json({
            success: false,
            message,
        });
    }
};