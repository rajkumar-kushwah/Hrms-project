import { prisma } from "../config/db.js";

// ─────────────────────────────────────────────
// Create Holiday
// ─────────────────────────────────────────────

export const createHoliday = async (
    companyId: string,
    data: {
        name: string;
        startDate: string;
        endDate: string;
    }
) => {
    const name = data.name.trim();

    if (!name) {
        throw new Error("Holiday name is required");
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (
        !data.startDate ||
        !data.endDate ||
        isNaN(startDate.getTime()) ||
        isNaN(endDate.getTime())
    ) {
        throw new Error("Invalid holiday date range");
    }

    // Date-only values ko normalize karein
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);

    if (startDate > endDate) {
        throw new Error("Start date cannot be after end date");
    }

    // Check overlapping holidays in the same company
    const existing = await prisma.holiday.findFirst({
        where: {
            companyId,
            startDate: {
                lte: endDate,
            },
            endDate: {
                gte: startDate,
            },
        },
    });

    if (existing) {
        throw new Error(
            "Another holiday already exists within this date range"
        );
    }

    return await prisma.holiday.create({
        data: {
            name,
            startDate,
            endDate,
            companyId,
        },
    });
};


// ─────────────────────────────────────────────
// Get Holidays
// Active + Inactive
// ─────────────────────────────────────────────

export const getHolidays = async (
    companyId: string | null
) => {
    return await prisma.holiday.findMany({
        where: {
            ...(companyId ? { companyId } : {}),
        },
        orderBy: {
            startDate: "asc",
        },
    });
};


// ─────────────────────────────────────────────
// Get Active Holidays
// Payroll / Leave validation ke liye
// ─────────────────────────────────────────────

export const getActiveHolidays = async (
    companyId: string
) => {
    return await prisma.holiday.findMany({
        where: {
            companyId,
            isActive: true,
        },
        orderBy: {
            startDate: "asc",
        },
    });
};


// ─────────────────────────────────────────────
// Update Holiday
// ─────────────────────────────────────────────

export const updateHoliday = async (
    id: string,
    data: {
        name?: string;
        startDate?: string;
        endDate?: string;
    }
) => {
    const existing = await prisma.holiday.findUnique({
        where: {
            id,
        },
    });

    if (!existing) {
        throw new Error("Holiday not found");
    }

    const updateData: {
        name?: string;
        startDate?: Date;
        endDate?: Date;
    } = {};

    if (data.name !== undefined) {
        const name = data.name.trim();

        if (!name) {
            throw new Error("Holiday name is required");
        }

        updateData.name = name;
    }

    const startDate = data.startDate !== undefined
        ? new Date(data.startDate)
        : existing.startDate
            ? new Date(existing.startDate)
            : new Date(NaN);

    const endDate = data.endDate !== undefined
        ? new Date(data.endDate)
        : existing.endDate
            ? new Date(existing.endDate)
            : new Date(NaN);

    if (
        isNaN(startDate.getTime()) ||
        isNaN(endDate.getTime())
    ) {
        throw new Error("Valid start date and end date are required");
    }

    if (
        (data.startDate !== undefined &&
            (!data.startDate || isNaN(startDate.getTime()))) ||
        (data.endDate !== undefined &&
            (!data.endDate || isNaN(endDate.getTime())))
    ) {
        throw new Error("Invalid holiday date range");
    }

    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(0, 0, 0, 0);

    if (startDate > endDate) {
        throw new Error("Start date cannot be after end date");
    }

    if (data.startDate !== undefined) {
        updateData.startDate = startDate;
    }

    if (data.endDate !== undefined) {
        updateData.endDate = endDate;
    }

    // Check overlap with other holidays in the same company
    if (
        data.startDate !== undefined ||
        data.endDate !== undefined
    ) {
        const duplicate = await prisma.holiday.findFirst({
            where: {
                companyId: existing.companyId,
                startDate: {
                    lte: endDate,
                },
                endDate: {
                    gte: startDate,
                },
                NOT: {
                    id,
                },
            },
        });

        if (duplicate) {
            throw new Error(
                "Another holiday already exists within this date range"
            );
        }
    }

    return await prisma.holiday.update({
        where: {
            id,
        },
        data: updateData,
    });
};


// ─────────────────────────────────────────────
// Deactivate Holiday
// ─────────────────────────────────────────────

export const deactivateHoliday = async (
    id: string
) => {
    const existing = await prisma.holiday.findUnique({
        where: {
            id,
        },
    });

    if (!existing) {
        throw new Error("Holiday not found");
    }

    await prisma.holiday.update({
        where: {
            id,
        },
        data: {
            isActive: false,
        },
    });

    return {
        message: "Holiday deactivated successfully",
    };
};


// ─────────────────────────────────────────────
// Activate Holiday
// ─────────────────────────────────────────────

export const activateHoliday = async (
    id: string
) => {
    const existing = await prisma.holiday.findUnique({
        where: {
            id,
        },
    });

    if (!existing) {
        throw new Error("Holiday not found");
    }

    await prisma.holiday.update({
        where: {
            id,
        },
        data: {
            isActive: true,
        },
    });

    return {
        message: "Holiday activated successfully",
    };
};