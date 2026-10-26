
import type { Request, Response } from "express";
import * as CategoryService from "../services/category.service.js";
import {
    getCompanyId,
    isSuperAdminRole,
} from "../utilis/roleUtils.js";
import {
    isDatabaseUnavailable,
    sendDatabaseUnavailable,
} from "../utilis/dbErrors.js";

const resolveCompanyId = (req: Request): string | null =>
    isSuperAdminRole(req.user?.role?.name) ? null : getCompanyId(req);

const handleCategoryError = (
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

// Create category
export const createCategory = async (req: Request, res: Response) => {
    try {
        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company not found in session",
            });
        }

        const category = await CategoryService.createCategory(
            companyId,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: category,
        });
    } catch (error: unknown) {
        return handleCategoryError(res, error);
    }
};

// Get all categories
export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await CategoryService.getCategories(
            resolveCompanyId(req)
        );

        return res.status(200).json({
            success: true,
            data: categories,
        });
    } catch (error: unknown) {
        return handleCategoryError(res, error, 500);
    }
};

// Get category by ID
export const getCategoryById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid category id",
            });
        }

        const category = await CategoryService.getCategoryById(
            id,
            resolveCompanyId(req)
        );

        return res.status(200).json({
            success: true,
            data: category,
        });
    } catch (error: unknown) {
        return handleCategoryError(res, error, 404);
    }
};

// Update category
export const updateCategory = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid category id",
            });
        }

        const category = await CategoryService.updateCategory(
            id,
            resolveCompanyId(req),
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Category updated successfully",
            data: category,
        });
    } catch (error: unknown) {
        return handleCategoryError(res, error);
    }
};

// Delete category
export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid category id",
            });
        }

        const result = await CategoryService.deleteCategory(
            id,
            resolveCompanyId(req)
        );

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: unknown) {
        return handleCategoryError(res, error);
    }
};

// Permanently delete category
export const permanentDeleteCategory = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid category id",
            });
        }

        const result = await CategoryService.permanentDeleteCategory(
            id,
            resolveCompanyId(req)
        );

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: unknown) {
        return handleCategoryError(res, error);
    }
};
