import type { Request, Response } from "express";
import * as TemplateService from "../services/Onboardingtemplate.service.js";
import type { OnboardingStage } from "@prisma/client";

const isAdminUser = (req: Request) => {
    const roleName = req.user?.role?.name
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    return roleName === "super_admin" || roleName === "company_admin";
};

// GET /api/onboarding-template
export const getTemplates = async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const data = await TemplateService.getTemplatesByStage(companyId);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/onboarding-template
export const createTemplateItem = async (req: Request, res: Response) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const data = await TemplateService.createTemplateItem(companyId, req.body);
        return res.status(201).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// PATCH /api/onboarding-template/:id
export const updateTemplateItem = async (req: Request, res: Response) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const { id } = req.params as { id: string };
        const data = await TemplateService.updateTemplateItem(id, companyId, req.body);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// DELETE /api/onboarding-template/:id
export const deleteTemplateItem = async (req: Request, res: Response) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const { id } = req.params as { id: string };
        const data = await TemplateService.deleteTemplateItem(id, companyId);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// POST /api/onboarding-template/reorder
// Body: { stage: "DOCUMENTS", orderedIds: ["id1", "id2", ...] }
export const reorderTemplateItems = async (req: Request, res: Response) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const { stage, orderedIds } = req.body as {
            stage: OnboardingStage;
            orderedIds: string[];
        };

        const validStages: OnboardingStage[] = [
            "OFFER",
            "JOINING",
            "DOCUMENTS",
            "TRAINING",
            "ACTIVE",
        ];

        if (
            !validStages.includes(stage) ||
            !Array.isArray(orderedIds) ||
            orderedIds.some((id) => typeof id !== "string")
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid stage and orderedIds are required",
            });
        }

        const data = await TemplateService.reorderTemplateItems(companyId, stage, orderedIds);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};