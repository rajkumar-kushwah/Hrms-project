// import type { DocumentInputType, OnboardingStage } from "@prisma/client";
// import { prisma } from "../config/db.js";

// export const createTemplateItem = async (
//     companyId: string,
//     data: {
//         stage: "OFFER" | "JOINING" | "DOCUMENTS" | "TRAINING" | "ACTIVE";
//         title: string;
//         description?: string;
//         isRequired?: boolean;
//         requiresDocument?: boolean;
//         documentInputType?: DocumentInputType | null;
//     }
// ) => {
//     if (!data.title?.trim()) {
//         throw new Error("Title is required");
//     }

//     // New item goes to the end of its stage's list
//     const lastItem = await prisma.onboardingChecklistTemplate.findFirst({
//         where: { companyId, stage: data.stage },
//         orderBy: { order: "desc" },
//         select: { order: true },
//     });

//     const nextOrder = (lastItem?.order ?? -1) + 1;

//     return prisma.onboardingChecklistTemplate.create({
//         data: {
//             companyId,
//             stage: data.stage,
//             title: data.title.trim(),
//             description: data.description?.trim() || null,
//             isRequired: data.isRequired ?? true,
//             requiresDocument: data.requiresDocument ?? false,
//             documentInputType: data.requiresDocument ? data.documentInputType ?? "FILE_UPLOAD" : null,
//             order: nextOrder,
//         },
//     });
// };


// const STAGE_ORDER = ["OFFER", "JOINING", "DOCUMENTS", "TRAINING", "ACTIVE"] as const;

// export const getTemplatesByStage = async (companyId: string) => {
//     const items = await prisma.onboardingChecklistTemplate.findMany({
//         where: { companyId, isActive: true },
//         orderBy: [{ stage: "asc" }, { order: "asc" }],
//     });

//     const grouped: Record<string, typeof items> = {};
//     for (const stage of STAGE_ORDER) {
//         grouped[stage] = items.filter((item) => item.stage === stage);
//     }

//     return grouped;
// };

// // ─────────────────────────────────────────────────────────────
// // Update Template Item
// // ─────────────────────────────────────────────────────────────

// export const updateTemplateItem = async (
//     id: string,
//     companyId: string,
//     data: {
//         title?: string;
//         description?: string;
//         isRequired?: boolean;
//         requiresDocument?: boolean;
//         documentInputType?: DocumentInputType | null;
//     }
// ) => {
//     const existing = await prisma.onboardingChecklistTemplate.findUnique({
//         where: { id },
//     });

//     if (!existing || existing.companyId !== companyId) {
//         throw new Error("Checklist item not found");
//     }

//     const requiresDocument =
//         data.requiresDocument ?? existing.requiresDocument;

//     return prisma.onboardingChecklistTemplate.update({
//         where: { id },
//         data: {
//             ...(data.title !== undefined && { title: data.title.trim() }),
//             ...(data.description !== undefined && { description: data.description.trim() || null }),
//             ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
//             ...(data.requiresDocument !== undefined && { requiresDocument: data.requiresDocument }),
//             documentInputType: requiresDocument
//                 ? data.documentInputType ??
//                 existing.documentInputType ??
//                 "FILE_UPLOAD"
//                 : null,
//         },
//     });
// };

// // ─────────────────────────────────────────────────────────────
// // Delete Template Item (soft delete — keeps isActive history clean)
// // ─────────────────────────────────────────────────────────────

// export const deleteTemplateItem = async (id: string, companyId: string) => {
//     const existing = await prisma.onboardingChecklistTemplate.findUnique({
//         where: { id },
//     });

//     if (!existing || existing.companyId !== companyId) {
//         throw new Error("Checklist item not found");
//     }

//     await prisma.onboardingChecklistTemplate.update({
//         where: { id },
//         data: { isActive: false },
//     });

//     return { message: "Checklist item removed" };
// };

// // ─────────────────────────────────────────────────────────────
// // Reorder Items within a stage
// // ─────────────────────────────────────────────────────────────
// // Body: { stage: "...", orderedIds: ["id1", "id2", "id3"] }
// // The array's position becomes each item's new `order`.
// // ─────────────────────────────────────────────────────────────

// export const reorderTemplateItems = async (
//     companyId: string,
//     stage: OnboardingStage,
//     orderedIds: string[]
// ) => {
//     // Verify all IDs belong to this company + stage before touching anything
//     const items = await prisma.onboardingChecklistTemplate.findMany({
//         where: { id: { in: orderedIds }, companyId, stage, isActive: true },
//         select: { id: true },
//     });

//     if (items.length !== orderedIds.length) {
//         throw new Error("One or more items do not belong to this company/stage");
//     }

//     await prisma.$transaction(
//         orderedIds.map((id, index) =>
//             prisma.onboardingChecklistTemplate.update({
//                 where: { id },
//                 data: { order: index },
//             })
//         )
//     );

//     return { message: "Order updated" };
// };







import type { DocumentInputType, OnboardingStage, Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";

const STAGE_ORDER = [
    "OFFER",
    "JOINING",
    "DOCUMENTS",
    "TRAINING",
    "ACTIVE",
] as const;

type CreateTemplateData = {
    stage: OnboardingStage;
    title: string;
    description?: string;
    isRequired?: boolean;
    requiresDocument?: boolean;
    documentInputType?: DocumentInputType | null;
};

type UpdateTemplateData = {
    title?: string;
    description?: string;
    isRequired?: boolean;
    requiresDocument?: boolean;
    documentInputType?: DocumentInputType | null;
};

function validateTitle(title: string | undefined): string | undefined {
    if (title === undefined) return undefined;

    const trimmed = title.trim();

    if (!trimmed) {
        throw new Error("Title is required");
    }

    return trimmed;
}

export const createTemplateItem = async (
    companyId: string,
    data: CreateTemplateData,
) => {
    if (!companyId) throw new Error("Company is required");

    const title = validateTitle(data.title);

    if (!title) throw new Error("Title is required");

    const requiresDocument = data.requiresDocument ?? false;

    const lastItem = await prisma.onboardingChecklistTemplate.findFirst({
        where: {
            companyId,
            stage: data.stage,
            isActive: true,
        },
        orderBy: { order: "desc" },
        select: { order: true },
    });

    return prisma.onboardingChecklistTemplate.create({
        data: {
            companyId,
            stage: data.stage,
            title,
            description: data.description?.trim() || null,
            isRequired: data.isRequired ?? true,
            requiresDocument,
            documentInputType: requiresDocument
                ? data.documentInputType ?? "FILE_UPLOAD"
                : null,
            order: (lastItem?.order ?? -1) + 1,
        },
    });
};

export const getTemplatesByStage = async (companyId: string) => {
    if (!companyId) throw new Error("Company is required");

    const items = await prisma.onboardingChecklistTemplate.findMany({
        where: {
            companyId,
            isActive: true,
        },
        orderBy: [{ stage: "asc" }, { order: "asc" }],
    });

    const grouped: Record<
        (typeof STAGE_ORDER)[number],
        typeof items
    > = {
        OFFER: [],
        JOINING: [],
        DOCUMENTS: [],
        TRAINING: [],
        ACTIVE: [],
    };

    for (const item of items) {
        grouped[item.stage].push(item);
    }

    return grouped;
};





// const validateTitle = (title: string | undefined): string | undefined => {
//     if (title === undefined) return undefined;

//     const trimmedTitle = title.trim();

//     if (!trimmedTitle) {
//         throw new Error("Checklist title cannot be empty");
//     }

//     return trimmedTitle;
// };


export const updateTemplateItem = async (
    id: string,
    companyId: string,
    data: UpdateTemplateData,
) => {
    const existing = await prisma.onboardingChecklistTemplate.findFirst({
        where: {
            id,
            companyId,
            isActive: true,
        },
    });

    if (!existing) {
        throw new Error("Checklist item not found");
    }

    const title = validateTitle(data.title);
    const requiresDocument =
        data.requiresDocument ?? existing.requiresDocument;

    const documentInputType: DocumentInputType | null = requiresDocument
        ? data.documentInputType ?? existing.documentInputType ?? "FILE_UPLOAD"
        : null;

    const templateUpdateData: Prisma.OnboardingChecklistTemplateUpdateInput = {
        ...(title !== undefined ? { title } : {}),
        ...(data.description !== undefined
            ? { description: data.description.trim() || null }
            : {}),
        ...(data.isRequired !== undefined
            ? { isRequired: data.isRequired }
            : {}),
        requiresDocument,
        documentInputType,
    };

    const checklistUpdateData: Prisma.OnboardingChecklistItemUpdateManyMutationInput = {
        ...(title !== undefined ? { title } : {}),
        ...(data.description !== undefined
            ? { description: data.description.trim() || null }
            : {}),
        ...(data.isRequired !== undefined
            ? { isRequired: data.isRequired }
            : {}),
        requiresDocument,
        documentInputType,
    };

    return prisma.$transaction(async (tx) => {
        const updatedTemplate = await tx.onboardingChecklistTemplate.update({
            where: { id: existing.id },
            data: templateUpdateData,
        });

        // Existing checklist items linked to this template
        const linkedResult = await tx.onboardingChecklistItem.updateMany({
            where: {
                templateId: existing.id,
                onboarding: { companyId },
            },
            data: checklistUpdateData,
        });

        // Legacy items whose templateId was never saved
        const legacyResult = await tx.onboardingChecklistItem.updateMany({
            where: {
                templateId: null,
                title: existing.title,
                stage: existing.stage,
                order: existing.order,
                onboarding: { companyId },
            },
            data: checklistUpdateData,
        });

        console.log("Template ID:", existing.id);
        console.log("Linked items updated:", linkedResult.count);
        console.log("Legacy items updated:", legacyResult.count);

        return updatedTemplate;
    });
};



export const deleteTemplateItem = async (
    id: string,
    companyId: string,
) => {
    const existing = await prisma.onboardingChecklistTemplate.findFirst({
        where: {
            id,
            companyId,
        },
    });

    if (!existing) {
        throw new Error("Checklist item not found");
    }

    await prisma.onboardingChecklistTemplate.delete({
        where: {
            id: existing.id,
        },
    });

    return { message: "Checklist item deleted successfully" };
};
export const reorderTemplateItems = async (
    companyId: string,
    stage: OnboardingStage,
    orderedIds: string[],
) => {
    if (!companyId) throw new Error("Company is required");

    if (new Set(orderedIds).size !== orderedIds.length) {
        throw new Error("Duplicate checklist item IDs are not allowed");
    }

    const items = await prisma.onboardingChecklistTemplate.findMany({
        where: {
            id: { in: orderedIds },
            companyId,
            stage,
            isActive: true,
        },
        select: { id: true },
    });

    if (items.length !== orderedIds.length) {
        throw new Error(
            "One or more items do not belong to this company/stage",
        );
    }

    await prisma.$transaction(
        orderedIds.map((id, index) =>
            prisma.onboardingChecklistTemplate.update({
                where: { id },
                data: { order: index },
            }),
        ),
    );

    return { message: "Order updated" };
};
