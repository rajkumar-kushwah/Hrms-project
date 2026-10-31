
import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import * as TemplateService from "../services/Onboardingtemplate.service.js";
import {
    createTemplateSchema,
    updateTemplateSchema,
    reorderTemplateSchema,
} from "../validations/onboardingTemplate.validation.js";
import { DocumentInputType, Prisma } from "@prisma/client";

const getRole = (req: Request): string =>
    req.user?.role?.name
        ?.trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_") ?? "";

const isAdminUser = (req: Request): boolean =>
    ["super_admin", "company_admin"].includes(getRole(req));

const getRequestedCompanyId = (req: Request): string | undefined => {
    const bodyCompanyId: unknown = req.body?.companyId;
    const queryCompanyId: unknown = req.query.companyId;
    const headerCompanyId = req.headers["x-company-id"];

    if (typeof bodyCompanyId === "string" && bodyCompanyId.trim()) {
        return bodyCompanyId.trim();
    }

    if (typeof queryCompanyId === "string" && queryCompanyId.trim()) {
        return queryCompanyId.trim();
    }
    if (typeof headerCompanyId === "string" && headerCompanyId.trim()) {
        return headerCompanyId.trim();
    }

    return undefined;
};

const resolveCompanyId = async (
    req: Request,
): Promise<string | null> => {
    const role = getRole(req);
    const sessionCompanyId = req.user?.companyId;
    const requestedCompanyId = getRequestedCompanyId(req);

    // Super Admin must select a company.
    if (role === "super_admin") {
        if (!requestedCompanyId) {
            return null;
        }

        const company = await prisma.company.findUnique({
            where: { id: requestedCompanyId },
            select: { id: true },
        });

        if (!company) {
            throw new Error("Company not found");
        }

        return company.id;
    }

    // Company Admin can access only their own company's templates.
    if (role === "company_admin") {
        if (!sessionCompanyId) {
            return null;
        }

        if (
            requestedCompanyId &&
            requestedCompanyId !== sessionCompanyId
        ) {
            throw new Error("You cannot access another company's templates");
        }

        return sessionCompanyId;
    }

    throw new Error("Not authorized");
};

const sendError = (res: Response, error: unknown) => {
    const message =
        error instanceof Error ? error.message : "Something went wrong";

    if (message === "Not authorized") {
        return res.status(403).json({ success: false, message });
    }

    if (message.includes("another company's")) {
        return res.status(403).json({ success: false, message });
    }

    if (message === "Company not found") {
        return res.status(404).json({ success: false, message });
    }

    if (message === "Checklist item not found") {
        return res.status(404).json({ success: false, message });
    }

    if (
        message === "Company ID is required" ||
        message === "Company is required"
    ) {
        return res.status(400).json({ success: false, message });
    }

    if (
        message.includes("required") ||
        message.includes("belong to this company") ||
        message.includes("Duplicate checklist")
    ) {
        return res.status(400).json({ success: false, message });
    }

    return res.status(500).json({
        success: false,
        message: "Internal server error",
    });
};

// GET /api/onboarding-template?companyId=...
export const getTemplates = async (req: Request, res: Response) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({
                success: false,
                message: "Not authorized",
            });
        }

        const companyId = await resolveCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company ID is required",
            });
        }

        const data = await TemplateService.getTemplatesByStage(companyId);

        return res.status(200).json({ success: true, data });
    } catch (error: unknown) {
        return sendError(res, error);
    }
};

// POST /api/onboarding-template
export const createTemplateItem = async (
    req: Request,
    res: Response,
) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({
                success: false,
                message: "Not authorized",
            });
        }

        const parsed = createTemplateSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid checklist data",
                errors: parsed.error.flatten(),
            });
        }

        const companyId = await resolveCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company ID is required",
            });
        }

        const item = parsed.data;

        const data = await TemplateService.createTemplateItem(companyId, {
            stage: item.stage,
            title: item.title,
            ...(item.description !== undefined && {
                description: item.description,
            }),
            ...(item.isRequired !== undefined && {
                isRequired: item.isRequired,
            }),
            ...(item.requiresDocument !== undefined && {
                requiresDocument: item.requiresDocument,
            }),
            ...(item.documentInputType !== undefined && {
                documentInputType: item.documentInputType,
            }),
        });

        return res.status(201).json({ success: true, data });
    } catch (error: unknown) {
        return sendError(res, error);
    }
};

// PATCH /api/onboarding-template/:id





// PATCH /api/onboarding-template/:id
// PATCH /api/onboarding-template/:id
export const updateTemplateItem = async (
    req: Request,
    res: Response,
) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({
                success: false,
                message: "Not authorized",
            });
        }

        const id = req.params.id;

        if (typeof id !== "string" || !id.trim()) {
            return res.status(400).json({
                success: false,
                message: "Valid checklist item ID is required",
            });
        }

        const parsed = updateTemplateSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid checklist data",
                errors: parsed.error.flatten(),
            });
        }

        const companyId = await resolveCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company ID is required",
            });
        }

        const item = parsed.data;

        const updateData = {
            ...(item.title !== undefined ? { title: item.title } : {}),
            ...(item.description !== undefined
                ? { description: item.description }
                : {}),
            ...(item.isRequired !== undefined
                ? { isRequired: item.isRequired }
                : {}),
            ...(item.requiresDocument !== undefined
                ? { requiresDocument: item.requiresDocument }
                : {}),
            ...(item.documentInputType !== undefined
                ? { documentInputType: item.documentInputType }
                : {}),
        };

        const data = await TemplateService.updateTemplateItem(
            id,
            companyId,
            updateData,
        );

        return res.status(200).json({
            success: true,
            message: "Checklist item updated successfully",
            data,
        });
    } catch (error: unknown) {
        console.error("Update onboarding template error:", error);
        return sendError(res, error);
    }
};

// DELETE /api/onboarding-template/:id
export const deleteTemplateItem = async (
    req: Request,
    res: Response,
) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({
                success: false,
                message: "Not authorized",
            });
        }

        const companyId = await resolveCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company ID is required",
            });
        }

        const id = req.params.id;

        if (typeof id !== "string" || !id.trim()) {
            return res.status(400).json({
                success: false,
                message: "Valid checklist item ID is required",
            });
        }

        const data = await TemplateService.deleteTemplateItem(id, companyId);

        return res.status(200).json({ success: true, data });
    } catch (error: unknown) {
        return sendError(res, error);
    }
};

// POST /api/onboarding-template/reorder
export const reorderTemplateItems = async (
    req: Request,
    res: Response,
) => {
    try {
        if (!isAdminUser(req)) {
            return res.status(403).json({
                success: false,
                message: "Not authorized",
            });
        }

        const parsed = reorderTemplateSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid reorder data",
                errors: parsed.error.flatten(),
            });
        }

        const companyId = await resolveCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company ID is required",
            });
        }

        const { stage, orderedIds } = parsed.data;

        const data = await TemplateService.reorderTemplateItems(
            companyId,
            stage,
            orderedIds,
        );

        return res.status(200).json({ success: true, data });
    } catch (error: unknown) {
        return sendError(res, error);
    }
};
