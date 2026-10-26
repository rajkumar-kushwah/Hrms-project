
import type { Request, Response } from "express";
import * as BranchService from "../services/branch.service.js";
import {
    getCompanyId,
    isSuperAdminRole,
} from "../utilis/roleUtils.js";
import {
    isDatabaseUnavailable,
    sendDatabaseUnavailable,
} from "../utilis/dbErrors.js";

// Resolve company context from the logged-in user.
const resolveCompanyId = (req: Request): string | null =>
    isSuperAdminRole(req.user?.role?.name) ? null : getCompanyId(req);

// Handle controller errors consistently.
const handleBranchError = (
    res: Response,
    error: unknown,
    statusCode = 400
) => {
    if (isDatabaseUnavailable(error)) {
        return sendDatabaseUnavailable(res);
    }

    const message =
        error instanceof Error ? error.message : "An unexpected error occurred";

    return res.status(statusCode).json({
        success: false,
        message,
    });
};

// Create branch
export const createBranch = async (req: Request, res: Response) => {
    try {
        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company not found in session",
            });
        }

        const branch = await BranchService.createBranch(companyId, req.body);

        return res.status(201).json({
            success: true,
            message: "Branch created successfully",
            data: branch,
        });
    } catch (error: unknown) {
        return handleBranchError(res, error);
    }
};

// Get all branches
export const getBranches = async (req: Request, res: Response) => {
    try {
        const companyId = resolveCompanyId(req);
        const branches = await BranchService.getAllBranches(companyId);

        return res.status(200).json({
            success: true,
            data: branches,
        });
    } catch (error: unknown) {
        return handleBranchError(res, error, 500);
    }
};

// Get branch by ID
export const getBranchById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid branch id",
            });
        }

        const branch = await BranchService.getBranchById(
            id,
            resolveCompanyId(req)
        );

        return res.status(200).json({
            success: true,
            data: branch,
        });
    } catch (error: unknown) {
        return handleBranchError(res, error, 404);
    }
};

// Update branch
export const updateBranch = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid branch id",
            });
        }

        const branch = await BranchService.updateBranch(
            id,
            resolveCompanyId(req),
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Branch updated successfully",
            data: branch,
        });
    } catch (error: unknown) {
        return handleBranchError(res, error);
    }
};

// Delete branch
export const deleteBranch = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid branch id",
            });
        }

        const result = await BranchService.deleteBranch(
            id,
            resolveCompanyId(req)
        );

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: unknown) {
        return handleBranchError(res, error);
    }
};

// Permanently delete branch
export const permanentDeleteBranch = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid branch id",
            });
        }

        const result = await BranchService.permanentDeleteBranch(
            id,
            resolveCompanyId(req)
        );

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: unknown) {
        return handleBranchError(res, error);
    }
};

// Get geofencing overview
export const getGeoFencingOverview = async (
    req: Request,
    res: Response
) => {
    try {
        const result = await BranchService.getGeoFencingOverview(
            resolveCompanyId(req)
        );

        return res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error: unknown) {
        return handleBranchError(res, error, 500);
    }
};
