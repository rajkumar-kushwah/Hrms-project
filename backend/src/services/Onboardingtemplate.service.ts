import type { DocumentInputType, OnboardingStage } from "@prisma/client";
import { prisma } from "../config/db.js";

export const createTemplateItem = async (
    companyId: string,
    data: {
        stage: "OFFER" | "JOINING" | "DOCUMENTS" | "TRAINING" | "ACTIVE";
        title: string;
        description?: string;
        isRequired?: boolean;
        requiresDocument?: boolean;
        documentInputType?: DocumentInputType | null;
    }
) => {
    if (!data.title?.trim()) {
        throw new Error("Title is required");
    }

    // New item goes to the end of its stage's list
    const lastItem = await prisma.onboardingChecklistTemplate.findFirst({
        where: { companyId, stage: data.stage },
        orderBy: { order: "desc" },
        select: { order: true },
    });

    const nextOrder = (lastItem?.order ?? -1) + 1;

    return prisma.onboardingChecklistTemplate.create({
        data: {
            companyId,
            stage: data.stage,
            title: data.title.trim(),
            description: data.description?.trim() || null,
            isRequired: data.isRequired ?? true,
            requiresDocument: data.requiresDocument ?? false,
            documentInputType: data.requiresDocument ? data.documentInputType ?? "FILE_UPLOAD" : null,
            order: nextOrder,
        },
    });
};


const STAGE_ORDER = ["OFFER", "JOINING", "DOCUMENTS", "TRAINING", "ACTIVE"] as const;

export const getTemplatesByStage = async (companyId: string) => {
    const items = await prisma.onboardingChecklistTemplate.findMany({
        where: { companyId, isActive: true },
        orderBy: [{ stage: "asc" }, { order: "asc" }],
    });

    const grouped: Record<string, typeof items> = {};
    for (const stage of STAGE_ORDER) {
        grouped[stage] = items.filter((item) => item.stage === stage);
    }

    return grouped;
};

// ─────────────────────────────────────────────────────────────
// Update Template Item
// ─────────────────────────────────────────────────────────────

export const updateTemplateItem = async (
    id: string,
    companyId: string,
    data: {
        title?: string;
        description?: string;
        isRequired?: boolean;
        requiresDocument?: boolean;
        documentInputType?: DocumentInputType | null;
    }
) => {
    const existing = await prisma.onboardingChecklistTemplate.findUnique({
        where: { id },
    });

    if (!existing || existing.companyId !== companyId) {
        throw new Error("Checklist item not found");
    }

    const requiresDocument =
        data.requiresDocument ?? existing.requiresDocument;

    return prisma.onboardingChecklistTemplate.update({
        where: { id },
        data: {
            ...(data.title !== undefined && { title: data.title.trim() }),
            ...(data.description !== undefined && { description: data.description.trim() || null }),
            ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
            ...(data.requiresDocument !== undefined && { requiresDocument: data.requiresDocument }),
            documentInputType: requiresDocument
                ? data.documentInputType ??
                existing.documentInputType ??
                "FILE_UPLOAD"
                : null,
        },
    });
};

// ─────────────────────────────────────────────────────────────
// Delete Template Item (soft delete — keeps isActive history clean)
// ─────────────────────────────────────────────────────────────

export const deleteTemplateItem = async (id: string, companyId: string) => {
    const existing = await prisma.onboardingChecklistTemplate.findUnique({
        where: { id },
    });

    if (!existing || existing.companyId !== companyId) {
        throw new Error("Checklist item not found");
    }

    await prisma.onboardingChecklistTemplate.update({
        where: { id },
        data: { isActive: false },
    });

    return { message: "Checklist item removed" };
};

// ─────────────────────────────────────────────────────────────
// Reorder Items within a stage
// ─────────────────────────────────────────────────────────────
// Body: { stage: "...", orderedIds: ["id1", "id2", "id3"] }
// The array's position becomes each item's new `order`.
// ─────────────────────────────────────────────────────────────

export const reorderTemplateItems = async (
    companyId: string,
    stage: OnboardingStage,
    orderedIds: string[]
) => {
    // Verify all IDs belong to this company + stage before touching anything
    const items = await prisma.onboardingChecklistTemplate.findMany({
        where: { id: { in: orderedIds }, companyId, stage, isActive: true },
        select: { id: true },
    });

    if (items.length !== orderedIds.length) {
        throw new Error("One or more items do not belong to this company/stage");
    }

    await prisma.$transaction(
        orderedIds.map((id, index) =>
            prisma.onboardingChecklistTemplate.update({
                where: { id },
                data: { order: index },
            })
        )
    );

    return { message: "Order updated" };
};