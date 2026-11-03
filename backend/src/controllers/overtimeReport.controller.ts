
import type { Request, Response } from "express";
import * as OvertimeService from "../services/overtimeReport.service.js";
import { prisma } from "../config/db.js";
import {
    isSuperAdminRole,
    getCompanyId,
} from "../utilis/roleUtils.js";

export const getOvertimeReport = async (
    req: Request,
    res: Response
) => {
    try {
        const {
            startDate,
            endDate,
            search,
            page = "1",
            limit = "10",
            companyId: selectedCompanyId,
        } = req.query;

        // 1. Get authenticated user ID from session
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
        }

        // 2. Fetch authenticated user with role
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            include: {
                role: true,
            },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user not found.",
            });
        }

        // 3. Check Super Admin role using role name
        const isSuperAdmin = isSuperAdminRole(user.role?.name);

        // 4. Resolve company ID according to user role
        let companyId: string;

        if (isSuperAdmin) {
            companyId = String(selectedCompanyId || "").trim();
        } else {
            companyId = getCompanyId(req) || "";
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company ID is required.",
            });
        }

        // 5. Validate date range
        if (startDate && endDate) {
            const start = new Date(String(startDate));
            const end = new Date(String(endDate));

            if (
                Number.isNaN(start.getTime()) ||
                Number.isNaN(end.getTime())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid date range.",
                });
            }

            if (start > end) {
                return res.status(400).json({
                    success: false,
                    message: "Start date cannot be after end date.",
                });
            }
        }

        // 6. Prepare report filters
        const filters = {
            ...(startDate ? { startDate: String(startDate) } : {}),
            ...(endDate ? { endDate: String(endDate) } : {}),
            ...(search ? { search: String(search).trim() } : {}),
            page: Math.max(1, Number(page) || 1),
            limit: Math.min(100, Math.max(1, Number(limit) || 10)),
        };

        // 7. Fetch overtime report
        const report = await OvertimeService.getOvertimeReportService(
            filters,
            companyId
        );

        return res.status(200).json({
            success: true,
            message: "Overtime report fetched successfully.",
            data: report,
        });
    } catch (error) {
        console.error("Overtime report error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch overtime report.",
        });
    }
};
