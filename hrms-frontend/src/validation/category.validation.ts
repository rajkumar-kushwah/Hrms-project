
import { z } from "zod";

const categoryNameSchema = z
    .string()
    .trim()
    .min(1, "Category name is required")
    .max(100, "Category name must not exceed 100 characters")
    .regex(
        /^(?=.*[A-Za-z])[A-Za-z ]{1,100}$/,
        "Category name must contain only letters and spaces"
    );

export const createCategorySchema = z.object({
    name: categoryNameSchema,

    description: z
        .string()
        .trim()
        .max(500, "Description must not exceed 500 characters")
        .optional()
        .or(z.literal("")),

    branchId: z
        .string()
        .trim()
        .min(1, "Branch is required"),
});

export const updateCategorySchema = z.object({
    name: categoryNameSchema.optional(),

    description: z
        .string()
        .trim()
        .max(500, "Description must not exceed 500 characters")
        .optional()
        .or(z.literal("")),

    isActive: z.boolean().optional(),
}).refine(
    (data) => Object.keys(data).length > 0,
    {
        message: "At least one field is required for update",
    }
);

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
