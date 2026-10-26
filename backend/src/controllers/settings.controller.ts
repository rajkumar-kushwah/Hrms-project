import type { Request, Response } from "express";
import * as SettingsService from "../services/settings.service.js";
import {
    isSuperAdminRole,
    getCompanyId,
} from "../utilis/roleUtils.js";
import { prisma } from "../config/db.js";

const resolveCompanyId = (req: Request): string | null => {
    const superAdmin = isSuperAdminRole(req.user?.role?.name);

    if (superAdmin) {
        return typeof req.query.companyId === "string"
            ? req.query.companyId
            : null;
    }

    return getCompanyId(req);
};

export const getSettings = async (req: Request, res: Response) => {
    try {
        const superAdmin = isSuperAdminRole(req.user?.role?.name);
        const companyId = resolveCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: superAdmin
                    ? "Please select a company"
                    : "No company assigned",
            });
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }

        const settings = await SettingsService.getSettings(companyId);

        return res.status(200).json({
            success: true,
            data: settings,
        });
    } catch (error: unknown) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to load settings",
        });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const superAdmin = isSuperAdminRole(req.user?.role?.name);
        const companyId = resolveCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: superAdmin
                    ? "Please select a company"
                    : "No company assigned",
            });
        }

        const company = await prisma.company.findUnique({
            where: { id: companyId },
            select: { id: true },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }

        const settings = await SettingsService.updateSettings(
            companyId,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Settings updated successfully",
            data: settings,
        });
    } catch (error: unknown) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to update settings",
        });
    }
};