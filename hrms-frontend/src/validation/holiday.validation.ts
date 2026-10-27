import { z } from "zod";

const isValidDate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split("-").map(Number);

    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
};

export const holidayNameSchema = z
    .string()
    .trim()
    .min(1, "Holiday name is required")
    .max(100, "Holiday name cannot exceed 100 characters");

export const holidayDateSchema = z
    .string()
    .min(1, "Date is required")
    .refine(isValidDate, "Please enter a valid date");

const holidayFieldsSchema = z.object({
    name: holidayNameSchema,
    startDate: holidayDateSchema,
    endDate: holidayDateSchema,
});

export const createHolidaySchema = holidayFieldsSchema.refine(
    (data) => data.startDate <= data.endDate,
    {
        message: "End date must be on or after start date",
        path: ["endDate"],
    }
);

export const updateHolidaySchema = z
    .object({
        name: holidayNameSchema.optional(),
        startDate: holidayDateSchema.optional(),
        endDate: holidayDateSchema.optional(),
    })
    .refine(
        (data) =>
            data.startDate === undefined ||
            data.endDate === undefined ||
            data.startDate <= data.endDate,
        {
            message: "End date must be on or after start date",
            path: ["endDate"],
        }
    );

export type CreateHolidayData = z.infer<typeof createHolidaySchema>;
export type UpdateHolidayData = z.infer<typeof updateHolidaySchema>;