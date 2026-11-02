
import type { Request, Response } from "express";
import { z } from "zod";

import { getLeaveReportService } from "../services/leaveReport.service.js";

import {
    getCompanyId,
    isSuperAdminRole,
    isAdminRole,
} from "../utilis/roleUtils.js";

import {
    isDatabaseUnavailable,
    sendDatabaseUnavailable,
} from "../utilis/dbErrors.js";

type AuthenticatedUser = {
    id: string;
    companyId: string | null;
    role?: {
        name: string;
    } | null;
};

type AuthenticatedRequest = Request & {
    user?: AuthenticatedUser;
};

const querySchema = z.object({
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    search: z.string().trim().optional(),
    status: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const getLeaveReport = async (
    req: Request,
    res: Response
) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const user = authReq.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized.",
            });
        }

        const parsed = querySchema.safeParse(req.query);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid report filters.",
                errors: parsed.error.flatten(),
            });
        }

        const filters = parsed.data;

        const admin = isAdminRole(user.role?.name);
        const superAdmin = isSuperAdminRole(user.role?.name);

        if (!admin) {
            return res.status(403).json({
                success: false,
                message: "Not authorized.",
            });
        }

        // Super Admin: selected company from request header.
        // Company Admin: company ID from logged-in user.
        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: superAdmin
                    ? "Please select a company."
                    : "Company not found in session.",
            });
        }

        const startDate = filters.startDate
            ? new Date(`${filters.startDate}T00:00:00.000`)
            : undefined;

        const endDate = filters.endDate
            ? new Date(`${filters.endDate}T23:59:59.999`)
            : undefined;

        if (startDate && endDate && startDate > endDate) {
            return res.status(400).json({
                success: false,
                message: "Start date cannot be after end date.",
            });
        }

        const result = await getLeaveReportService({
            companyId,
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
            ...(filters.search ? { search: filters.search } : {}),
            ...(filters.status && filters.status !== "all"
                ? { status: filters.status }
                : {}),
            page: filters.page,
            limit: filters.limit,
        });

        return res.status(200).json({
            success: true,
            message: "Leave report fetched successfully.",
            data: result,
        });
    } catch (error: unknown) {
        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        console.error("Leave report error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch leave report.",
        });
    }
};
