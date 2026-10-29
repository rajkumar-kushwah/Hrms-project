// leaveType.controller.ts
import type { Request, Response } from "express";
import * as LeaveTypeService from "../services/leaveType.service.js";
import { getCompanyId, isSuperAdminRole } from "../utilis/roleUtils.js";

// Create Leave Type
export const createLeaveType = async (req: Request, res: Response) => {
    try {
        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company first.",
            });
        }

        const leaveType = await LeaveTypeService.createLeaveType(
            companyId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Leave type created successfully",
            data: leaveType,
        });
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to create leave type",
        });
    }
};

// Get Leave Types
export const getLeaveTypes = async (req: Request, res: Response) => {
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

        const leaveTypes = await LeaveTypeService.getLeaveTypes(companyId);

        return res.status(200).json({
            success: true,
            data: leaveTypes,
        });
    } catch (error: unknown) {
        return res.status(500).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch leave types",
        });
    }
};

// Update Leave Type
export const updateLeaveType = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company first.",
            });
        }

        // Service must verify that this leave type belongs to companyId.
        const leaveType = await LeaveTypeService.updateLeaveType(
            id,
            req.body,
            companyId
        );

        return res.status(200).json({
            success: true,
            message: "Leave type updated successfully",
            data: leaveType,
        });
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to update leave type",
        });
    }
};

// Delete Leave Type// Permanently Delete Leave Type
export const deleteLeaveType = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;
        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company first.",
            });
        }

        await LeaveTypeService.deleteLeaveType(id, companyId);

        return res.status(200).json({
            success: true,
            message: "Leave type deleted successfully",
        });
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to delete leave type",
        });
    }
};