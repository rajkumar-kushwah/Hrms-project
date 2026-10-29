import { prisma } from "../config/db.js";

// ─────────────────────────────────────────────
// Create Leave Type
// ─────────────────────────────────────────────

export const createLeaveType = async (
    companyId: string,
    data: {
        name: string;
        description?: string;
        daysPerYear?: number;
        isPaid?: boolean;
    }
) => {
    const existing = await prisma.leaveType.findFirst({
        where: {
            name: data.name,
            companyId,
        },
    });

    if (existing) {
        throw new Error("Leave type already exists");
    }

    const leaveType = await prisma.leaveType.create({
        data: {
            ...data,
            companyId,
        },
    });

    return leaveType;
};


// ─────────────────────────────────────────────
// Get ALL Leave Types
// Used by Leave Policy page
// Active + Inactive
// ─────────────────────────────────────────────

export const getLeaveTypes = async (
    companyId: string | null
) => {
    return await prisma.leaveType.findMany({
        where: {
            ...(companyId ? { companyId } : {}),
        },

        orderBy: {
            createdAt: "asc",
        },
    });
};


// ─────────────────────────────────────────────
// Get ACTIVE Leave Types
// Used by Apply Leave page
// ─────────────────────────────────────────────

export const getActiveLeaveTypes = async (
    companyId: string | null
) => {
    return await prisma.leaveType.findMany({
        where: {
            ...(companyId ? { companyId } : {}),
            isActive: true,
        },

        orderBy: {
            createdAt: "asc",
        },
    });
};


// ─────────────────────────────────────────────
// Update Leave Type
// ─────────────────────────────────────────────

export const updateLeaveType = async (
    id: string,
    data: {
        name?: string;
        description?: string;
        daysPerYear?: number;
        isPaid?: boolean;
        isActive?: boolean;
    },
    companyId: string | null,
) => {
    const existing = await prisma.leaveType.findUnique({
        where: {
            id,
        },
    });

    if (!existing) {
        throw new Error("Leave type not found");
    }

    // companyId check must be here, not in controller.
    if (existing.companyId !== companyId) {
        throw new Error("Leave type does not belong to this company");
    }

    return await prisma.leaveType.update({
        where: {
            id,
        },

        data,
    });
};



// Permanently Delete Leave Type
export const deleteLeaveType = async (
    id: string,
    companyId: string | null
) => {
    const existing = await prisma.leaveType.findUnique({
        where: { id },
    });

    if (!existing) {
        throw new Error("Leave type not found");
    }

    if (!companyId || existing.companyId !== companyId) {
        throw new Error("Leave type does not belong to this company");
    }

    return await prisma.leaveType.delete({
        where: { id },
    });
};
// ─────────────────────────────────────────────
// Activate Leave Type
// ─────────────────────────────────────────────

export const activateLeaveType = async (id: string, companyId: string | null) => {
    const existing = await prisma.leaveType.findUnique({
        where: {
            id,
        },
    });

    if (!existing) {
        throw new Error("Leave type not found");
    }

    if (existing.companyId !== companyId) {
        throw new Error("Leave type does not belong to this company");
    }

    await prisma.leaveType.update({
        where: {
            id,
        },

        data: {
            isActive: true,
        },
    });

    return {
        message: "Leave type activated successfully",
    };
};

