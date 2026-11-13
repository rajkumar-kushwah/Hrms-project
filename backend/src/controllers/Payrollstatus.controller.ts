import type { Request, Response } from "express";
import * as PayrollStatusService from "../services/Payrollstatus.service.js";
import { isAdminRole } from "../utilis/roleUtils.js";

// ─────────────────────────────────────────────────────────────
// POST /api/payroll/confirm
// Admin / Company Admin only
// ─────────────────────────────────────────────────────────────

export const confirmPayrollHandler = async (req: Request, res: Response) => {
    try {
        if (!isAdminRole(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to confirm payroll",
            });
        }

        const userIds = req.body?.userIds;
        const month = Number(req.body?.month) || new Date().getMonth() + 1;
        const year = Number(req.body?.year) || new Date().getFullYear();

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "userIds is required",
            });
        }

        const data = await PayrollStatusService.confirmPayroll(
            userIds as string[],
            month,
            year
        );

        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/payroll/mark-paid
// Admin / Company Admin only
// ─────────────────────────────────────────────────────────────

export const markPaidHandler = async (req: Request, res: Response) => {
    try {
        if (!isAdminRole(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to mark payroll as paid",
            });
        }

        const userIds = req.body?.userIds;
        const month = Number(req.body?.month) || new Date().getMonth() + 1;
        const year = Number(req.body?.year) || new Date().getFullYear();
        const paymentRef: string | undefined = req.body?.paymentRef;

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "userIds is required",
            });
        }

        const data = await PayrollStatusService.markPayrollAsPaid(
            userIds as string[],
            month,
            year,
            paymentRef
        );

        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/payroll/employee/:userId/revert-to-draft
// Admin / Company Admin only
// ─────────────────────────────────────────────────────────────

export const revertToDraftHandler = async (req: Request, res: Response) => {
    try {
        if (!isAdminRole(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to revert payroll",
            });
        }

        const userId = req.params.userId as string;
        const month = Number(req.body?.month) || new Date().getMonth() + 1;
        const year = Number(req.body?.year) || new Date().getFullYear();

        const data = await PayrollStatusService.revertPayrollToDraft(
            userId,
            month,
            year
        );

        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};