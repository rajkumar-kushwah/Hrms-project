import { z } from "zod";

export const createLeaveTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Leave type name is required")
    .max(100, "Leave type name cannot exceed 100 characters"),

  description: z
    .string()
    .trim()
    .min(1, "Description cannot be less than 1 characters")
    .max(500, "Description cannot exceed 500 characters")
    .optional(),

  daysPerYear: z
    .number()
    .min(0, "Days per year cannot be negative")
    .max(365, "Days per year cannot exceed 365")
    .optional(),

  isPaid: z.boolean().optional(),
});

export const updateLeaveTypeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Leave type name is required")
    .max(100, "Leave type name cannot exceed 100 characters")
    .optional(),

  description: z
    .string()
    .trim()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),

  daysPerYear: z
    .number()
    .min(0, "Days per year cannot be negative")
    .optional(),

  isPaid: z.boolean().optional(),

  isActive: z.boolean().optional(),
});