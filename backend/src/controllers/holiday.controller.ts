import type { Request, Response } from "express";
import {
    createHoliday,
    getHolidays,
    getActiveHolidays,
    updateHoliday,
    deactivateHoliday,
    activateHoliday,
} from "../services/holiday.service.js";
import { getCompanyId } from "../utilis/roleUtils.js";

// ─────────────────────────────────────────────
// Error Message Helper
// ─────────────────────────────────────────────

const getErrorMessage = (error: unknown): string => {
    return error instanceof Error
        ? error.message
        : "An unexpected error occurred";
};

// ─────────────────────────────────────────────
// Create Holiday
// ─────────────────────────────────────────────

export const createHolidayController = async (
    req: Request,
    res: Response
) => {
    try {
        const { name, startDate, endDate } = req.body;

        const companyId = getCompanyId(req);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company before creating a holiday",
            });
        }

        if (
            typeof name !== "string" ||
            typeof startDate !== "string" ||
            typeof endDate !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, start date and end date are required",
            });
        }

        const holiday = await createHoliday(companyId, {
            name,
            startDate,
            endDate,
        });

        return res.status(201).json({
            success: true,
            message: "Holiday created successfully",
            data: holiday,
        });
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error("Create Holiday Error:", message);

        return res.status(400).json({
            success: false,
            message: message || "Failed to create holiday",
        });
    }
};

// ─────────────────────────────────────────────
// Get Holidays
// ─────────────────────────────────────────────

export const getHolidaysController = async (
    req: Request,
    res: Response
) => {
    try {
        const companyId = req.user?.companyId ?? null;
        const holidays = await getHolidays(companyId);

        return res.status(200).json({
            success: true,
            message: "Holidays fetched successfully",
            data: holidays,
        });
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error("Get Holidays Error:", message);

        return res.status(500).json({
            success: false,
            message: message || "Failed to fetch holidays",
        });
    }
};

// ─────────────────────────────────────────────
// Get Active Holidays
// ─────────────────────────────────────────────

export const getActiveHolidaysController = async (
    req: Request,
    res: Response
) => {
    try {
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company not found",
            });
        }

        const holidays = await getActiveHolidays(companyId);

        return res.status(200).json({
            success: true,
            message: "Active holidays fetched successfully",
            data: holidays,
        });
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error("Get Active Holidays Error:", message);

        return res.status(500).json({
            success: false,
            message: message || "Failed to fetch active holidays",
        });
    }
};

// ─────────────────────────────────────────────
// Update Holiday
// ─────────────────────────────────────────────

export const updateHolidayController = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;
        const { name, startDate, endDate } = req.body;

        if (typeof id !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid holiday ID",
            });
        }

        if (
            (name !== undefined && typeof name !== "string") ||
            (startDate !== undefined && typeof startDate !== "string") ||
            (endDate !== undefined && typeof endDate !== "string")
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid holiday update data",
            });
        }

        const holiday = await updateHoliday(id, {
            ...(name !== undefined ? { name } : {}),
            ...(startDate !== undefined ? { startDate } : {}),
            ...(endDate !== undefined ? { endDate } : {}),
        });

        return res.status(200).json({
            success: true,
            message: "Holiday updated successfully",
            data: holiday,
        });
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error("Update Holiday Error:", message);

        return res.status(400).json({
            success: false,
            message: message || "Failed to update holiday",
        });
    }
};

// ─────────────────────────────────────────────
// Deactivate Holiday
// ─────────────────────────────────────────────

export const deactivateHolidayController = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;

        if (typeof id !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid holiday ID",
            });
        }

        const result = await deactivateHoliday(id);

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error("Deactivate Holiday Error:", message);

        return res.status(400).json({
            success: false,
            message: message || "Failed to deactivate holiday",
        });
    }
};

// ─────────────────────────────────────────────
// Activate Holiday
// ─────────────────────────────────────────────

export const activateHolidayController = async (
    req: Request,
    res: Response
) => {
    try {
        const { id } = req.params;

        if (typeof id !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid holiday ID",
            });
        }

        const result = await activateHoliday(id);

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error("Activate Holiday Error:", message);

        return res.status(400).json({
            success: false,
            message: message || "Failed to activate holiday",
        });
    }
};