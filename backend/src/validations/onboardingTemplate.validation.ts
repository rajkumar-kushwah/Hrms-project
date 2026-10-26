
import { z } from "zod";

export const onboardingStages = [
  "OFFER",
  "JOINING",
  "DOCUMENTS",
  "TRAINING",
  "ACTIVE",
] as const;

const documentInputTypeSchema = z
  .enum(["FILE_UPLOAD", "DOCUMENT_NUMBER", "EITHER"])
  .nullable()
  .optional();

export const createTemplateSchema = z.object({
  companyId: z.string().uuid().optional(),
  stage: z.enum(onboardingStages),
  title: z.string().trim().min(1, "Title is required").max(150),
  description: z.string().max(1000).optional(),
  isRequired: z.boolean().optional(),
  requiresDocument: z.boolean().optional(),
  documentInputType: documentInputTypeSchema,
});

export const updateTemplateSchema = z
  .object({
    companyId: z.string().uuid().optional(),
    title: z.string().trim().min(1, "Title is required").max(150).optional(),
    description: z.string().max(1000).optional(),
    isRequired: z.boolean().optional(),
    requiresDocument: z.boolean().optional(),
    documentInputType: documentInputTypeSchema,
  })
  .refine(
    (data) => Object.keys(data).some((key) => key !== "companyId"),
    { message: "At least one field to update is required" },
  );

export const reorderTemplateSchema = z.object({
  companyId: z.string().uuid().optional(),
  stage: z.enum(onboardingStages),
  orderedIds: z.array(z.string().uuid()).max(500),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type ReorderTemplateInput = z.infer<typeof reorderTemplateSchema>;
