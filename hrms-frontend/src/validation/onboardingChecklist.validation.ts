import { z } from "zod";

export const onboardingChecklistSchema = z
    .object({
        title: z
            .string()
            .trim()
            .min(1, "Checklist title is required")
            .max(150, "Title cannot exceed 150 characters"),

        description: z
            .string()
            .max(1000, "Description cannot exceed 1000 characters"),

        isRequired: z.boolean(),

        requiresDocument: z.boolean(),

        documentInputType: z.enum([
            "FILE_UPLOAD",
            "DOCUMENT_NUMBER",
            "EITHER",
        ]),
    })
    .superRefine((data, ctx) => {
        if (data.requiresDocument && !data.documentInputType) {
            ctx.addIssue({
                code: "custom",
                path: ["documentInputType"],
                message: "Please select a document input type",
            });
        }
    });

export type OnboardingChecklistFormValues = z.infer<
    typeof onboardingChecklistSchema
>;