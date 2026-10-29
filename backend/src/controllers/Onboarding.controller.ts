
import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import { OnboardingStage, OnboardingStatus } from "@prisma/client";

import * as OnboardingService from "../services/Onboarding.service.js";
import { submitChecklistDocument } from "../services/Onboarding.service.js";
import cloudinary from "../config/cloudinary.js";
import { prisma } from "../config/db.js";
import {
    getCompanyId,
    isAdminRole,
} from "../utilis/roleUtils.js";

// Change this import path if your shared helper file is located elsewhere.

const rejectUnauthorized = (res: Response) =>
    res.status(403).json({
        success: false,
        message: "Not authorized",
    });

const rejectMissingCompany = (res: Response) =>
    res.status(400).json({
        success: false,
        message: "Company ID is required. Please select a company.",
    });

// POST /api/onboarding/start/:userId
export const startOnboarding = async (req: Request, res: Response) => {
    try {
        if (!isAdminRole(req.user?.role?.name)) {
            return rejectUnauthorized(res);
        }

        const companyId = getCompanyId(req);

        if (!companyId) {
            return rejectMissingCompany(res);
        }

        const { userId } = req.params as { userId: string };

        if (!userId?.trim()) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

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

        const data = await OnboardingService.startOnboarding(
            userId,
            companyId,
            parsedTargetDate,
            notes?.trim() || undefined
        );

        return res.status(201).json({
            success: true,
            data,
        });
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to start onboarding",
        });
    }
};

// GET /api/onboarding?companyId=...&status=IN_PROGRESS
export const getOnboardingList = async (req: Request, res: Response) => {
    try {
        if (!isAdminRole(req.user?.role?.name)) {
            return rejectUnauthorized(res);
        }

        const companyId = getCompanyId(req);

        if (!companyId) {
            return rejectMissingCompany(res);
        }

        const rawStatus = req.query.status;

        if (rawStatus !== undefined && typeof rawStatus !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid onboarding status",
            });
        }

        const status = rawStatus as OnboardingStatus | undefined;

        if (
            status &&
            !Object.values(OnboardingStatus).includes(status)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid onboarding status",
            });
        }

        const data = await OnboardingService.getOnboardingList(
            companyId,
            status
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error: unknown) {
        return res.status(500).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to fetch onboarding list",
        });
    }
};

// GET /api/onboarding/:userId
export const getOnboardingDetail = async (
    req: Request,
    res: Response
) => {
    try {
        if (!isAdminRole(req.user?.role?.name)) {
            return rejectUnauthorized(res);
        }

        const { userId } = req.params as { userId: string };

        if (!userId?.trim()) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const companyId = getCompanyId(req);

        if (!companyId) {
            return rejectMissingCompany(res);
        }

        const data = await OnboardingService.getOnboardingDetail(
            userId,
            companyId
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch onboarding detail";

        const status = message.toLowerCase().includes("not found")
            ? 404
            : 400;

        return res.status(status).json({
            success: false,
            message,
        });
    }
};

// PATCH /api/onboarding/item/:itemId/toggle
export const toggleChecklistItem = async (
    req: Request,
    res: Response
) => {
    try {
        if (!isAdminRole(req.user?.role?.name)) {
            return rejectUnauthorized(res);
        }

        const companyId = getCompanyId(req);

        if (!companyId) {
            return rejectMissingCompany(res);
        }

        const actingUserId = req.user?.id;

        if (!actingUserId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user ID is missing",
            });
        }

        const { itemId } = req.params as { itemId: string };

        if (!itemId?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Checklist item ID is required",
            });
        }

        const data = await OnboardingService.toggleChecklistItem(
            itemId,
            companyId,
            actingUserId
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to update checklist item",
        });
    }
};

// PATCH /api/onboarding/:userId/stage
export const setStageManually = async (
    req: Request,
    res: Response
) => {
    try {
        if (!isAdminRole(req.user?.role?.name)) {
            return rejectUnauthorized(res);
        }

        const companyId = getCompanyId(req);

        if (!companyId) {
            return rejectMissingCompany(res);
        }

        const { userId } = req.params as { userId: string };
        const { stage } = req.body as { stage?: string };

        if (!userId?.trim()) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        if (
            !stage ||
            !Object.values(OnboardingStage).includes(
                stage as OnboardingStage
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid onboarding stage",
            });
        }

        const data = await OnboardingService.setStageManually(
            userId,
            companyId,
            stage as OnboardingStage
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to update onboarding stage",
        });
    }
};

// PATCH /api/onboarding/:userId/status
export const setOnboardingStatus = async (
    req: Request,
    res: Response
) => {
    try {
        if (!isAdminRole(req.user?.role?.name)) {
            return rejectUnauthorized(res);
        }

        const companyId = getCompanyId(req);

        if (!companyId) {
            return rejectMissingCompany(res);
        }

        const { userId } = req.params as { userId: string };
        const { status } = req.body as { status?: string };

        if (!userId?.trim()) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
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

        const data = await OnboardingService.setOnboardingStatus(
            userId,
            companyId,
            status
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to update onboarding status",
        });
    }
};

// DELETE /api/onboarding/:userId/reset
export const resetEmployeeOnboarding = async (
    req: Request,
    res: Response
) => {
    try {
        if (!isAdminRole(req.user?.role?.name)) {
            return rejectUnauthorized(res);
        }

        const { userId } = req.params as { userId: string };

        if (!userId?.trim()) {
            return res.status(400).json({
                success: false,
                message: "User ID is required",
            });
        }

        const companyId = getCompanyId(req);

        if (!companyId) {
            return rejectMissingCompany(res);
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
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to reset onboarding",
        });
    }
};

// POST /api/onboarding/checklist/:itemId/submit-document
export const submitChecklistDocumentController = async (
    req: Request,
    res: Response
) => {
    try {
        if (!isAdminRole(req.user?.role?.name)) {
            return rejectUnauthorized(res);
        }

        const { itemId } = req.params as { itemId: string };

        if (!itemId?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Checklist item ID is required",
            });
        }

        const companyId = getCompanyId(req);

        if (!companyId) {
            return rejectMissingCompany(res);
        }

        const actingUserId = req.user?.id;

        if (!actingUserId) {
            return res.status(401).json({
                success: false,
                message: "Authenticated user ID is missing",
            });
        }

        const { documentUrl, documentNumber } = (req.body ?? {}) as {
            documentUrl?: string | null;
            documentNumber?: string | null;
        };

        const data = await submitChecklistDocument(
            itemId,
            companyId,
            actingUserId,
            {
                ...(documentUrl !== undefined ? { documentUrl } : {}),
                ...(documentNumber !== undefined
                    ? { documentNumber }
                    : {}),
            }
        );

        return res.status(200).json({
            success: true,
            message: "Document submitted and checklist completed.",
            data,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Unable to submit document.";

        const status = message.toLowerCase().includes("not found")
            ? 404
            : 400;

        return res.status(status).json({
            success: false,
            message,
        });
    }
};

// POST /api/onboarding/:itemId/upload-document
export const uploadOnboardingDocument = async (
    req: Request,
    res: Response
) => {
    try {
        const itemId = req.params.itemId;

        if (typeof itemId !== "string" || !itemId.trim()) {
            return res.status(400).json({
                success: false,
                message: "Checklist item ID is required.",
            });
        }

        if (!isAdminRole(req.user?.role?.name)) {
            return rejectUnauthorized(res);
        }

        const companyId = getCompanyId(req);

        if (!companyId) {
            return rejectMissingCompany(res);
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select a document to upload.",
            });
        }

        const item = await prisma.onboardingChecklistItem.findFirst({
            where: {
                id: itemId,
                onboarding: {
                    is: { companyId },
                },
            },
            include: {
                onboarding: true,
            },
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Checklist item not found or access denied.",
            });
        }

        if (item.stage !== item.onboarding.currentStage) {
            return res.status(400).json({
                success: false,
                message: `You can only upload documents for the current stage: ${item.onboarding.currentStage}.`,
            });
        }

        if (item.onboarding.status !== OnboardingStatus.IN_PROGRESS) {
            return res.status(400).json({
                success: false,
                message: "Only active onboarding can be updated.",
            });
        }

        if (!item.requiresDocument) {
            return res.status(400).json({
                success: false,
                message: "This checklist item does not require a document.",
            });
        }

        const inputType = item.documentInputType ?? "FILE_UPLOAD";

        if (inputType === "DOCUMENT_NUMBER") {
            return res.status(400).json({
                success: false,
                message: "This item requires a document number, not a file.",
            });
        }

        const file = req.file;

        const uploadResult = await new Promise<{
            secure_url: string;
            public_id: string;
        }>((resolve, reject) => {
            const resourceType =
                file.mimetype === "application/pdf" ? "raw" : "image";

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "hrms/onboarding",
                    resource_type: resourceType,
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    if (!result) {
                        reject(
                            new Error("Cloudinary returned no upload result.")
                        );
                        return;
                    }

                    resolve({
                        secure_url: result.secure_url,
                        public_id: result.public_id,
                    });
                }
            );

            uploadStream.end(file.buffer);
        });

        return res.status(200).json({
            success: true,
            message: "Document uploaded successfully.",
            data: {
                url: uploadResult.secure_url,
                publicId: uploadResult.public_id,
            },
        });
    } catch (error: unknown) {
        console.error("Onboarding document upload failed:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to upload document. Please try again.",
        });
    }
};

// Multer errors
export const handleOnboardingUploadError = (
    error: unknown,
    _req: Request,
    res: Response,
    next: NextFunction
) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message:
                error.code === "LIMIT_FILE_SIZE"
                    ? "File size must not exceed 5 MB."
                    : "Please select only one file.",
        });
    }

    if (
        error instanceof Error &&
        error.message === "Only PDF, JPG and PNG files are allowed."
    ) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }

    return next(error);
};
