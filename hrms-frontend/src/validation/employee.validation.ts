import { z } from "zod";
import { isValidPhoneNumber } from "react-phone-number-input";

export const employeeSchema = z.object({
    // TAB 1 - Basic
    name: z
        .string()
        .trim()
        .min(3, "Name must be at least 3 characters")
        .max(64, "Name must not exceed 64 characters")
        .regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, {
            message: "Name can contain only letters and spaces",
        }),

    email: z
        .string()
        .trim()
        .email("Invalid email address")
        .max(64, "Email must not exceed 64 characters"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(30, "Password must not exceed 30 characters")
        .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
        .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
        .regex(/[0-9]/, "Password must contain at least 1 numeric character")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least 1 special character"),

    roleId: z
        .number()
        .min(1, "Role is required"),

    branchId: z
        .string()
        .min(1, "Branch is required"),

    categoryId: z
        .string()
        .min(1, "Category is required"),

    phone: z
        .string()
        .refine(
            (value) => isValidPhoneNumber(value),
            "Invalid phone number"
        ),

    // TAB 2 - Personal
    dateOfBirth: z
        .string()
        .min(1, "Date of birth is required"),

    gender: z
        .string()
        .min(1, "Gender is required"),

    bloodGroup: z
        .string()
        .min(1, "Blood group is required"),

    maritalStatus: z
        .string()
        .min(1, "Marital status is required"),

    currentAddress: z
        .string()
        .trim()
        .min(5, "Current address must be at least 5 characters")
        .max(255, "Current address must not exceed 255 characters"),

    permanentAddress: z
        .string()
        .trim()
        .min(5, "Permanent address must be at least 5 characters")
        .max(255, "Permanent address must not exceed 255 characters"),

    emergencyContactName: z
        .string()
        .trim()
        .min(3, "Emergency contact name must be at least 3 characters")
        .max(64, "Emergency contact name must not exceed 64 characters")
        .regex(/^[A-Za-z]+(?: [A-Za-z]+)*$/, {
            message: "Emergency contact name can contain only letters and spaces",
        }),

    emergencyContactPhone: z
        .string()
        .refine(
            (value) => isValidPhoneNumber(value),
            "Invalid emergency contact phone number"
        ),

    // TAB 3 - Employment
    designation: z
        .string()
        .trim()
        .min(2, "Designation must be at least 2 characters")
        .max(100, "Designation must not exceed 100 characters"),

    grossSalary: z
        .number({
            message: "Gross salary is required",
        })
        .positive("Gross salary must be greater than 0")
        .max(100000000, "Gross salary is too large")
        .optional(),

    joiningDate: z
        .string()
        .min(1, "Joining date is required"),

    employmentType: z
        .string()
        .min(1, "Employment type is required"),

    workShift: z
        .string()
        .min(1, "Work shift is required"),

    reportingManagerId: z.string().optional(),

    // TAB 4 - Bank & ID
    panNumber: z
        .string()
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN number"),

    aadharNumber: z
        .string()
        .regex(/^\d{12}$/, "Aadhar number must be 12 digits"),

    bankName: z
        .string()
        .trim()
        .min(2, "Bank name must be at least 2 characters")
        .max(100, "Bank name must not exceed 100 characters"),

    bankAccountNumber: z
        .string()
        .regex(/^\d{9,18}$/, "Invalid bank account number"),

    bankIFSC: z
        .string()
        .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),

    pfNumber: z
        .string(),

    esiNumber: z
        .string(),
});

export const updateEmployeeSchema = employeeSchema.omit({
  password: true,
});
export const passwordSchema = employeeSchema.shape.password;