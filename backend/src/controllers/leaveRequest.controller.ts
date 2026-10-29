// leaveRequest.controller.ts
import type { Request, Response } from "express";
import * as LeaveRequestService from "../services/leaveRequest.service.js";
import { getCompanyId, isSuperAdminRole } from "../utilis/roleUtils.js";
// Create leave request
export const createLeaveRequest = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const companyId = getCompanyId(req);

        if (!userId || !companyId) {
            return res.status(400).json({
                success: false,
                message: "Company selection is required.",
            });
        }

        const leave = await LeaveRequestService.createLeaveRequest(
            userId,
            companyId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Leave request submitted successfully",
            data: leave,
        });
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to create leave request",
        });
    }
};

// Get logged-in user's leave requests
// Get leave requests based on role
export const getMyLeaveRequests = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const isSuperAdmin = isSuperAdminRole(req.user?.role?.name);
        const companyId = getCompanyId(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        // Super Admin: fetch all leave requests for selected company
        if (isSuperAdmin) {
            if (!companyId) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a company first.",
                });
            }

            const leaves =
                await LeaveRequestService.getAllLeaveRequests(companyId);

            return res.status(200).json({
                success: true,
                data: leaves,
            });
        }

        // Other users: fetch only their own leave requests
        const leaves =
            await LeaveRequestService.getMyLeaveRequests(userId);

        return res.status(200).json({
            success: true,
            data: leaves,
        });
    } catch (error: unknown) {
        return res.status(500).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch leave requests",
        });
    }
};

// Get all leave requests
export const getAllLeaveRequests = async (req: Request, res: Response) => {
    try {
        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: isSuperAdminRole(req.user?.role?.name)
                    ? "Please select a company first."
                    : "Company information is missing.",
            });
        }

        const status =
            typeof req.query.status === "string"
                ? req.query.status
                : undefined;

        const leaves = await LeaveRequestService.getAllLeaveRequests(
            companyId,
            status
        );

        return res.status(200).json({
            success: true,
            data: leaves,
        });
    } catch (error: unknown) {
        return res.status(500).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch leave requests",
        });
    }
};

// Approve or reject leave
export const approveRejectLeave = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const approvedBy = req.user?.id;
        const companyId = getCompanyId(req);
        const { status, rejectReason } = req.body;

        if (!approvedBy) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company first.",
            });
        }

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status",
            });
        }

        // NOTE: Service should also verify that this leave belongs
        // to companyId before approving or rejecting it.
        const leave = await LeaveRequestService.approvedRejectLeave(
            id,
            approvedBy,
            status,
            rejectReason
        );

        return res.status(200).json({
            success: true,
            message: `Leave ${status.toLowerCase()} successfully`,
            data: leave,
        });
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to update leave request",
        });
    }
};

// Cancel leave request
export const cancelLeaveRequest = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const result = await LeaveRequestService.cancelLeaveRequest(id, userId);

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to cancel leave request",
        });
    }
};

// Revoke leave
export const revokeLeave = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const revokedBy = req.user?.id;
        const companyId = getCompanyId(req);

        if (!revokedBy) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company first.",
            });
        }

        // NOTE: Service should verify company ownership before revoking.
        const result = await LeaveRequestService.revokeLeave(id, revokedBy);

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to revoke leave",
        });
    }
};