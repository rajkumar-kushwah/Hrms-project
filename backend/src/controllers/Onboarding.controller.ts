import type { Request, Response } from "express";
import * as OnboardingService from "../services/Onboarding.service.js";
import { OnboardingStage, OnboardingStatus } from "@prisma/client";
import {
    submitChecklistDocument,
} from "../services/Onboarding.service.js";

const isAdminUser = (req: Request) => {
    const roleName = req.user?.role?.name
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    return roleName === "super_admin" || roleName === "company_admin";
};

// POST /api/onboarding/start/:userId
export const startOnboarding = async (req: Request, res: Response) => {
    try {

        const { targetDate, notes } = (req.body ?? {}) as {
            targetDate?: string;
            notes?: string;
        };

        let parsedTargetDate: Date | undefined;

        if (targetDate) {
            parsedTargetDate = new Date(targetDate);

            if (Number.isNaN(parsedTargetDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid target date",
                });
            }
        }
        if (!isAdminUser(req)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const { userId } = req.params as { userId: string };
        const data = await OnboardingService.startOnboarding(userId, companyId, parsedTargetDate, notes?.trim() || undefined);
        return res.status(201).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// GET /api/onboarding?status=IN_PROGRESS
export const getOnboardingList = async (req: Request, res: Response) => {
    try {

        if (!isAdminUser(req)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const status = req.query.status as OnboardingStatus | undefined;
        if (status && !Object.values(OnboardingStatus).includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid onboarding status" });
        }

        const data = await OnboardingService.getOnboardingList(companyId, status);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/onboarding/:userId
export const getOnboardingDetail = async (req: Request, res: Response) => {
    try {

        const { userId } = req.params as { userId: string };

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        if (!isAdminUser(req)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const data = await OnboardingService.getOnboardingDetail(userId, companyId);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(404).json({ success: false, message: error.message });
    }
};

// PATCH /api/onboarding/item/:itemId/toggle
export const toggleChecklistItem = async (req: Request, res: Response) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const companyId = req.user?.companyId;
        const actingUserId = req.user?.id;
        if (!companyId || !actingUserId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const { itemId } = req.params as { itemId: string };
        const data = await OnboardingService.toggleChecklistItem(itemId, companyId, actingUserId);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// PATCH /api/onboarding/:userId/stage
// Body: { stage: "DOCUMENTS" }
export const setStageManually = async (req: Request, res: Response) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const { userId } = req.params as { userId: string };
        const { stage } = req.body as { stage: string };

        if (!Object.values(OnboardingStage).includes(stage as OnboardingStage)) {
            return res.status(400).json({
                success: false,
                message: "Invalid onboarding stage",
            });
        }
        const data = await OnboardingService.setStageManually(userId, companyId, stage as OnboardingStage);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

// PATCH /api/onboarding/:userId/status
// Body: { status: "ON_HOLD" | "IN_PROGRESS" }
export const setOnboardingStatus = async (req: Request, res: Response) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const companyId = req.user?.companyId;
        if (!companyId) {
            return res.status(400).json({ success: false, message: "Company ID is required" });
        }

        const { userId } = req.params as { userId: string };
        const { status } = req.body as { status: string };

        if (
            !Object.values(OnboardingStatus).includes(
                status as OnboardingStatus
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid onboarding status",
            });
        }

        if (
            status !== OnboardingStatus.IN_PROGRESS &&
            status !== OnboardingStatus.ON_HOLD
        ) {
            return res.status(400).json({
                success: false,
                message: "Only IN_PROGRESS or ON_HOLD status is allowed",
            });
        }

        const data = await OnboardingService.setOnboardingStatus(userId, companyId, status);
        return res.status(200).json({ success: true, data });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const resetEmployeeOnboarding = async (
    req: Request,
    res: Response
) => {
    try {

        if (!isAdminUser(req)) {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }

        const { userId } = req.params as { userId: string };

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company ID is required",
            });
        }

        const data = await OnboardingService.resetOnboarding(
            userId,
            companyId
        );

        return res.status(200).json({
            success: true,
            message: "Onboarding reset successfully",
            data,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to reset onboarding",
        });
    }
};

export const submitChecklistDocumentController = async (
    req: Request,
    res: Response
) => {
    try {
        const { itemId } = req.params;
        const { documentUrl, documentNumber } = req.body;

        const actingUserId = req.user?.id;
        const companyId = req.user?.companyId;


        if (typeof itemId !== "string" || !itemId.trim()) {
            return res.status(400).json({
                success: false,
                message: "Checklist item ID is required.",
            });
        }


        const data = await submitChecklistDocument(
            itemId,
            companyId,
            actingUserId,
            { documentUrl, documentNumber }
        );

        return res.status(200).json({
            success: true,
            message: "Document submitted and checklist completed.",
            data,
        });
    } catch (error: any) {
        const message = error.message || "Unable to submit document.";

        const status =
            message === "Checklist item not found."
                ? 404
                : 400;

        return res.status(status).json({
            success: false,
            message,
        });
    }
};