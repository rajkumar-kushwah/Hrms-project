import { prisma } from "../config/db.js";
import { OnboardingStatus, type Onboarding, DocumentInputType } from "@prisma/client";

const STAGE_ORDER = ["OFFER", "JOINING", "DOCUMENTS", "TRAINING", "ACTIVE"] as const;
type Stage = (typeof STAGE_ORDER)[number];

const nextStage = (current: Stage): Stage | null => {
    const index = STAGE_ORDER.indexOf(current);

    if (index === STAGE_ORDER.length - 1) {
        return null;
    }

    return STAGE_ORDER[index + 1] ?? null;
};

// ─────────────────────────────────────────────────────────────
// Start Onboarding — called right after a new employee is created.
// Clones ALL active template items (every stage) into this employee's
// own checklist, so HR sees the full journey upfront.
// ─────────────────────────────────────────────────────────────

export const startOnboarding = async (
    userId: string,
    companyId: string | null,
    targetDate?: Date,
    notes?: string
) => {
    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            ...(companyId !== null ? { companyId } : {}),
        },
    });

    if (!user || !user.companyId) {
        throw new Error("Employee not found or company not assigned");
    }

    const actualCompanyId = user.companyId;

    const existing = await prisma.onboarding.findUnique({
        where: { userId },
    });

    if (existing) {
        throw new Error("Onboarding already started for this employee");
    }
    const requiredStages = [
        "OFFER",
        "JOINING",
        "DOCUMENTS",
        "TRAINING",
        "ACTIVE",
    ] as const;

    const templateItems =
        await prisma.onboardingChecklistTemplate.findMany({
            where: {
                companyId: actualCompanyId,
                isActive: true,
            },
            orderBy: [
                { stage: "asc" },
                { order: "asc" },
            ],
        });

    const missingStages = requiredStages.filter(
        (stage) =>
            !templateItems.some(
                (item) => item.stage === stage && item.isRequired
            )
    );

    if (missingStages.length > 0) {
        throw new Error(
            `Active checklist templates missing for: ${missingStages.join(", ")}. Please configure the onboarding checklist templates first.`
        );
    }

    const result = await prisma.$transaction(async (tx) => {
        const onboarding = await tx.onboarding.create({
            data: {
                userId,
                companyId: actualCompanyId,
                currentStage: "OFFER",
                status: "IN_PROGRESS",
                ...(targetDate !== undefined && { targetDate }),
                ...(notes !== undefined && { notes }),

                items: {
                    create: templateItems.map((template) => ({
                        templateId: template.id,
                        stage: template.stage,
                        title: template.title,
                        description: template.description,
                        isRequired: template.isRequired,
                        requiresDocument: template.requiresDocument,
                        documentInputType: template.documentInputType,
                        order: template.order,
                    })),
                },
            },
            include: {
                items: true,
            },
        });

        await tx.user.update({
            where: { id: userId },
            data: {
                employmentStatus: "ONBOARDING",
                isActive: false,
            },
        });

        return onboarding;
    });

    return result;
};

// ─────────────────────────────────────────────────────────────
// List — all employees currently onboarding (or all, with filters),
// with progress % for a quick overview table.
// ─────────────────────────────────────────────────────────────

export const getOnboardingList = async (companyId: string | null, status?: OnboardingStatus) => {
    const onboardings = await prisma.onboarding.findMany({
        where: {
            ...(companyId !== null ? { companyId } : {}),
            ...(status ? { status } : {}),
        },
        include: {
            user: {
                select: { id: true, name: true, employeeCode: true, designation: true },
            },
            items: { select: { isCompleted: true, isRequired: true } },
        },
        orderBy: { startDate: "desc" },
    });

    return onboardings.map((o) => {
        const requiredItems = o.items.filter((i) => i.isRequired);
        const completedRequired = requiredItems.filter((i) => i.isCompleted);

        return {
            id: o.id,
            userId: o.userId,
            user: o.user,
            currentStage: o.currentStage,
            status: o.status,
            startDate: o.startDate,
            targetDate: o.targetDate,
            notes: o.notes,
            completedAt: o.completedAt,
            progressPercent:
                requiredItems.length > 0
                    ? Math.round((completedRequired.length / requiredItems.length) * 100)
                    : 100,
        };
    });
};

// ─────────────────────────────────────────────────────────────
// Detail — full checklist for one employee, grouped by stage
// ─────────────────────────────────────────────────────────────

export const getOnboardingDetail = async (userId: string, companyId: string | null) => {
    const onboarding = await prisma.onboarding.findUnique({
        where: { userId },
        include: {
            user: {
                select: { id: true, name: true, employeeCode: true, designation: true },
            },
            items: { orderBy: [{ stage: "asc" }, { order: "asc" }] },
        },
    });

    if (
        !onboarding ||
        (companyId !== null && onboarding.companyId !== companyId)
    ) {
        throw new Error("Onboarding record not found or access denied");
    }

    const grouped: Record<string, typeof onboarding.items> = {};
    for (const stage of STAGE_ORDER) {
        grouped[stage] = onboarding.items.filter((i) => i.stage === stage);
    }

    return {
        id: onboarding.id,
        userId: onboarding.userId,
        user: onboarding.user,
        currentStage: onboarding.currentStage,
        status: onboarding.status,
        startDate: onboarding.startDate,
        targetDate: onboarding.targetDate,
        notes: onboarding.notes,
        completedAt: onboarding.completedAt,
        itemsByStage: grouped,
    };
};

// ─────────────────────────────────────────────────────────────
// Toggle a checklist item — marks complete/incomplete, and auto-
// advances the employee's stage once every REQUIRED item in the
// current stage is done. If ACTIVE stage finishes, the whole
// onboarding completes and the employee becomes fully Active.
// ─────────────────────────────────────────────────────────────

// export const toggleChecklistItem = async (
//     itemId: string,
//     companyId: string,
//     actingUserId: string
// ) => {
//     const item = await prisma.onboardingChecklistItem.findUnique({
//         where: { id: itemId },
//         include: { onboarding: true },
//     });

//     if (!item || item.onboarding.companyId !== companyId) {
//         throw new Error("Checklist item not found");
//     }

//     if (item?.onboarding.status === "ON_HOLD") {
//         throw new Error(
//             "Onboarding is on hold. Resume onboarding before updating checklist."
//         );
//     }

//     if (item?.onboarding.status === "COMPLETED") {
//         throw new Error(
//             "Completed onboarding cannot be modified."
//         );
//     }


//     const willBeCompleted = !item.isCompleted;

//     await prisma.onboardingChecklistItem.update({
//         where: { id: itemId },
//         data: {
//             isCompleted: willBeCompleted,
//             completedAt: willBeCompleted ? new Date() : null,
//             completedBy: willBeCompleted ? actingUserId : null,
//         },
//     });

//     return await evaluateStageProgress(item.onboardingId);
// };


export const toggleChecklistItem = async (
    itemId: string,
    companyId: string | null,
    actingUserId: string
) => {
    const item = await prisma.onboardingChecklistItem.findUnique({
        where: { id: itemId },
        include: { onboarding: true },
    });

    if (
        !item ||
        (companyId !== null && item.onboarding.companyId !== companyId)
    ) {
        throw new Error("Checklist item not found or access denied");
    }

    // Current onboarding stage check
    if (item.stage !== item.onboarding.currentStage) {
        throw new Error(
            `You can only modify checklist items for the current stage: ${item.onboarding.currentStage}.`
        );
    }

    if (item.onboarding.status === "ON_HOLD") {
        throw new Error(
            "Onboarding is on hold. Resume onboarding before updating checklist."
        );
    }

    if (item.onboarding.status === "COMPLETED") {
        throw new Error(
            "Completed onboarding cannot be modified."
        );
    }

    const willBeCompleted = !item.isCompleted;

    // Validate documents before marking the item as completed.
    if (willBeCompleted && item.requiresDocument) {
        const inputType =
            item.documentInputType ?? "FILE_UPLOAD";

        const hasDocument = Boolean(item.documentUrl?.trim());
        const hasDocumentNumber = Boolean(
            item.documentNumber?.trim()
        );

        if (
            inputType === "FILE_UPLOAD" &&
            !hasDocument
        ) {
            throw new Error(
                "Please upload the required document first."
            );
        }

        if (
            inputType === "DOCUMENT_NUMBER" &&
            !hasDocumentNumber
        ) {
            throw new Error(
                "Please enter the required document number first."
            );
        }

        if (
            inputType === "EITHER" &&
            !hasDocument &&
            !hasDocumentNumber
        ) {
            throw new Error(
                "Please upload a document or enter a document number."
            );
        }
    }

    await prisma.onboardingChecklistItem.update({
        where: { id: itemId },
        data: {
            isCompleted: willBeCompleted,
            completedAt: willBeCompleted ? new Date() : null,
            completedBy: willBeCompleted ? actingUserId : null,
        },
    });

    return await evaluateStageProgress(item.onboardingId);
};


// ─────────────────────────────────────────────────────────────
// Internal: check if current stage's required items are all done.
// If so, move to the next stage (or complete onboarding if this
// was the last stage).
// ─────────────────────────────────────────────────────────────

const evaluateStageProgress = async (onboardingId: string): Promise<Onboarding> => {
    const onboarding = await prisma.onboarding.findUnique({
        where: { id: onboardingId },
        include: { items: true },
    });

    if (!onboarding) throw new Error("Onboarding not found");
    if (onboarding.status !== "IN_PROGRESS") return onboarding; // on hold / completed

    const currentStage = onboarding.currentStage as Stage;

    const requiredItems = onboarding.items.filter(
        (i) => i.stage === currentStage && i.isRequired
    );

    // Khaali array par every() true deta hai, to jis stage mein required
    // item nahi hai wo bhi "done" maana jayega aur aage badh jayega
    const allRequiredDone =
        requiredItems.length > 0 &&
        requiredItems.every((i) => i.isCompleted);

    if (!allRequiredDone) return onboarding;

    const upcoming = nextStage(currentStage);

    // Aakhri stage bhi complete: poora onboarding khatam
    if (upcoming === null) {
        return prisma.$transaction(async (tx) => {
            const updated = await tx.onboarding.update({
                where: { id: onboardingId },
                data: { status: "COMPLETED", completedAt: new Date() },
            });

            await tx.user.update({
                where: { id: onboarding.userId },
                data: { employmentStatus: "ACTIVE", isActive: true },
            });

            return updated;
        });
    }

    await prisma.onboarding.update({
        where: { id: onboardingId },
        data: { currentStage: upcoming },
    });

    // Agla stage bhi already complete (ya khaali) ho to wahan se bhi aage badho
    return evaluateStageProgress(onboardingId);
};

// ─────────────────────────────────────────────────────────────
// Manual stage override (HR can move someone forward/back manually
// if needed, bypassing the auto-advance check)
// ─────────────────────────────────────────────────────────────

export const setStageManually = async (
    userId: string,
    companyId: string | null,
    stage: Stage
) => {
    const onboarding = await prisma.onboarding.findUnique({
        where: { userId },
    });

    if (
        !onboarding ||
        (companyId !== null && onboarding.companyId !== companyId)
    ) {
        throw new Error("Onboarding record not found or access denied");
    }

    if (onboarding.status === "COMPLETED") {
        throw new Error(
            "Cannot change stage because onboarding is already completed"
        );
    }

    if (!STAGE_ORDER.includes(stage)) {
        throw new Error("Invalid onboarding stage");
    }

    return prisma.onboarding.update({
        where: { userId },
        data: { currentStage: stage },
    });
};

// ─────────────────────────────────────────────────────────────
// Put on hold / resume
// ─────────────────────────────────────────────────────────────

export const setOnboardingStatus = async (
    userId: string,
    companyId: string | null,
    status: "IN_PROGRESS" | "ON_HOLD"
) => {
    const onboarding = await prisma.onboarding.findUnique({
        where: { userId },
    });

    if (
        !onboarding ||
        (companyId !== null && onboarding.companyId !== companyId)
    ) {
        throw new Error("Onboarding record not found or access denied");
    }

    if (onboarding.status === "COMPLETED") {
        throw new Error("Onboarding already completed");
    }

    if (status !== "IN_PROGRESS" && status !== "ON_HOLD") {
        throw new Error("Invalid onboarding status");
    }

    return prisma.onboarding.update({
        where: { userId },
        data: { status },
    });
};

export const resetOnboarding = async (
    userId: string,
    companyId: string | null
) => {
    const onboarding = await prisma.onboarding.findUnique({
        where: { userId },
    });

    if (
        !onboarding ||
        (companyId !== null && onboarding.companyId !== companyId)
    ) {
        throw new Error("Onboarding record not found or access denied");
    }

    if (onboarding.status === "COMPLETED") {
        throw new Error("Completed onboarding cannot be reset");
    }

    return prisma.$transaction(async (tx) => {
        await tx.onboarding.delete({
            where: { id: onboarding.id },
        });

        await tx.user.update({
            where: { id: userId },
            data: {
                employmentStatus: "ONBOARDING",
                isActive: false,
            },
        });

        return { success: true };
    });
};


type SubmitChecklistDocumentInput = {
    documentUrl?: string | null;
    documentNumber?: string | null;
};

export const submitChecklistDocument = async (
    itemId: string,
    companyId: string | null,
    actingUserId: string,
    data: SubmitChecklistDocumentInput
) => {
    const item = await prisma.onboardingChecklistItem.findFirst({
        where: {
            id: itemId,
            ...(companyId !== null
                ? { onboarding: { companyId } }
                : {}),
        },
        include: {
            onboarding: true,
        },
    });

    if (!item) {
        throw new Error("Checklist item not found or access denied");
    }

    if (item.stage !== item.onboarding.currentStage) {
        throw new Error(
            `You can only modify checklist items for the current stage: ${item.onboarding.currentStage}.`
        );
    }

    if (
        item.onboarding.status === OnboardingStatus.COMPLETED ||
        item.onboarding.status === OnboardingStatus.ON_HOLD
    ) {
        throw new Error("This onboarding cannot be updated.");
    }

    if (!item.requiresDocument) {
        throw new Error("This checklist item does not require a document.");
    }

    const documentUrl = data.documentUrl?.trim() || null;
    const documentNumber = data.documentNumber?.trim() || null;

    const inputType = item.documentInputType ?? DocumentInputType.FILE_UPLOAD;

    switch (inputType) {
        case DocumentInputType.FILE_UPLOAD:
            if (!documentUrl) {
                throw new Error("Please upload the required document.");
            }
            break;

        case DocumentInputType.DOCUMENT_NUMBER:
            if (!documentNumber) {
                throw new Error("Please enter the required document number.");
            }
            break;

        case DocumentInputType.EITHER:
            if (!documentUrl && !documentNumber) {
                throw new Error(
                    "Please upload a document or enter a document number."
                );
            }
            break;

        default:
            throw new Error("Invalid document input type.");
    }

    const updatedItem = await prisma.onboardingChecklistItem.update({
        where: { id: itemId },
        data: {
            documentUrl,
            documentNumber,
            isCompleted: true,
            completedAt: new Date(),
            completedBy: actingUserId,
        },
    });

    await evaluateStageProgress(item.onboardingId);

    return updatedItem;
};


