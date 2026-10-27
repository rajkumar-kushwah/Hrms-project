
import { z } from "zod";

const holidayDateSchema = z
    .string()
    .trim()
    .min(1, "Holiday date is required")
    .refine(
        (value) => !isNaN(new Date(value).getTime()),
        "Invalid holiday date"
    );

export const createHolidaySchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Holiday name is required")
            .max(100, "Holiday name cannot exceed 100 characters"),

        startDate: holidayDateSchema,

        endDate: holidayDateSchema,
    })
    .refine(
        (data) =>
            new Date(data.startDate) <= new Date(data.endDate),
        {
            message: "End date must be on or after start date",
            path: ["endDate"],
        }
    );

export type CreateHolidayData = z.infer<
    typeof createHolidaySchema
>;

export const updateHolidaySchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Holiday name cannot be empty")
            .max(100, "Holiday name cannot exceed 100 characters")
            .optional(),

        startDate: holidayDateSchema.optional(),

        endDate: holidayDateSchema.optional(),
    })
    .refine(
        (data) =>
            data.startDate === undefined ||
            data.endDate === undefined ||
            new Date(data.startDate) <= new Date(data.endDate),
        {
            message: "End date must be on or after start date",
            path: ["endDate"],
        }
    );

export type UpdateHolidayData = z.infer<
    typeof updateHolidaySchema
>;
