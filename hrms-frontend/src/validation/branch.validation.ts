
import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";

// Optional string: blank and whitespace-only values are allowed
const optionalText = (schema: z.ZodString) =>
    z.preprocess(
        (value) =>
            typeof value === "string" && value.trim() === ""
                ? undefined
                : value,
        schema.optional()
    );

const nameRegex = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

export const branchSchema = z
    .object({
        // Required: Branch Name
        name: z
            .string()
            .trim()
            .min(3, "Branch name must be at least 3 characters")
            .max(64, "Branch name must not exceed 64 characters")
            .superRefine((value, ctx) => {
                const invalidChars = [
                    ...new Set(value.match(/[^A-Za-z ]/g) || []),
                ];

                if (invalidChars.length > 0) {
                    const names = invalidChars.map((char) => {
                        switch (char) {
                            case ",":
                                return "Comma (,)";
                            case "+":
                                return "Plus (+)";
                            case "@":
                                return "At sign (@)";
                            case "-":
                                return "Hyphen (-)";
                            case "_":
                                return "Underscore (_)";
                            case ".":
                                return "Dot (.)";
                            default:
                                return `Character (${char})`;
                        }
                    });

                    ctx.addIssue({
                        code: "custom",
                        message: `${names.join(", ")} not allowed. Only letters and spaces are allowed.`,
                    });
                }
            }),

        // Optional: Email
        email: optionalText(
            z
                .string()
                .email("Enter a valid email address")
                .max(64, "Email must not exceed 64 characters")
        ),

        // Optional: Indian Mobile Number
        phone: z
            .string()
            .trim()
            .refine(
                (value) =>
                    value === "" ||
                    (isValidPhoneNumber(value, "IN") &&
                        /^\+91[6-9]\d{9}$/.test(value)),
                {
                    message: "Enter a valid 10-digit Indian mobile number",
                }
            )
            .optional(),

        // Optional: Address
        address: optionalText(
            z
                .string()
                .min(3, "Address must be at least 3 characters")
                .max(255, "Address must not exceed 255 characters")
        ),

        // Optional: City
        city: optionalText(
            z.string().regex(nameRegex, {
                message: "City can contain only letters and spaces",
            })
        ),

        // Optional: State
        state: optionalText(
            z.string().regex(nameRegex, {
                message: "State can contain only letters and spaces",
            })
        ),

        // Optional: Indian Pincode
        pincode: optionalText(
            z.string().regex(/^[1-9]\d{5}$/, {
                message: "Enter a valid 6-digit Indian pincode",
            })
        ),

        // Optional: Manager Name
        managerName: optionalText(
            z
                .string()
                .min(3, "Manager name must be at least 3 characters")
                .max(64, "Manager name must not exceed 64 characters")
                .regex(nameRegex, {
                    message: "Manager name can contain only letters and spaces",
                })
        ),

        // Optional: Branch Coordinates
        latitude: z
            .number()
            .min(-90, "Latitude must be between -90 and 90")
            .max(90, "Latitude must be between -90 and 90")
            .optional(),

        longitude: z
            .number()
            .min(-180, "Longitude must be between -180 and 180")
            .max(180, "Longitude must be between -180 and 180")
            .optional(),

        geoRadius: z
            .number()
            .positive("Geo radius must be greater than 0")
            .optional(),

        locationName: optionalText(
            z.string().max(255, "Location name must not exceed 255 characters")
        ),

        isActive: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
        // Latitude and longitude must be selected together
        const hasLatitude = data.latitude !== undefined;
        const hasLongitude = data.longitude !== undefined;

        if (hasLatitude !== hasLongitude) {
            ctx.addIssue({
                code: "custom",
                path: hasLatitude ? ["longitude"] : ["latitude"],
                message: "Please select a valid branch location",
            });
        }
    });
