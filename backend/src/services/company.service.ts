import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";

// ─────────────────────────────────────────────
// Normalize Role / Module Name
// ─────────────────────────────────────────────

const normalizeName = (value?: string | null) => {
    return value
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_");
};


// ─────────────────────────────────────────────
// Auto Company Code Generate
// ─────────────────────────────────────────────

const generateCompanyCode = async (): Promise<string> => {
    const lastCompany = await prisma.company.findFirst({
        orderBy: {
            createdAt: "desc",
        },
        select: {
            code: true,
        },
    });

    let number = 1;

    if (lastCompany?.code) {
        const match = lastCompany.code.match(/^COMP_(\d+)$/);

        if (match) {
            number = Number(match[1]) + 1;
        }
    }

    const newNumber = String(number).padStart(3, "0");

    return `COMP_${newNumber}`;
};


// ─────────────────────────────────────────────
// Validate GST
// ─────────────────────────────────────────────

const validateGST = (gst: string): boolean => {
    const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    return gstRegex.test(gst);
};


// ─────────────────────────────────────────────
// Create Company
// ─────────────────────────────────────────────

export const createCompanyService = async (data: {
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    logo?: string;
    gstNumber?: string;
    subscriptionPlan?: string;
    maxBranches?: number;
    maxEmployees?: number;
}) => {
    if (data.gstNumber && !validateGST(data.gstNumber)) {
        throw new Error("Invalid GST Number format");
    }

    const companyCode = await generateCompanyCode();

    const company = await prisma.company.create({
        data: {
            ...data,
            code: companyCode,
            isActive: true,
        },
    });

    return company;
};


// ─────────────────────────────────────────────
// Get All Companies
// ─────────────────────────────────────────────

export const getAllCompanies = async (
    companyId?: string | null,
    requestingUserRole?: string | null
) => {
    const normalizedRole = normalizeName(requestingUserRole);

    const isSuperAdmin =
        normalizedRole === "super_admin";

    const companies = await prisma.company.findMany({
        where: isSuperAdmin
            ? {}
            : {
                id: companyId ?? "",
            },

        orderBy: {
            createdAt: "desc",
        },
    });

    return companies;
};

// ─────────────────────────────────────────────
// Get Company By ID
// ─────────────────────────────────────────────

export const getCompanyById = async (id: string) => {
    const company = await prisma.company.findUnique({
        where: {
            id,
        },
    });

    if (!company) {
        throw new Error("Company not found");
    }

    return company;
};



// ─────────────────────────────────────────────
// Update Company
// ─────────────────────────────────────────────

export const updateCompany = async (
    id: string,
    data: {
        name?: string;
        email?: string;
        phone?: string;
        website?: string;
        address?: string;
        gstNumber?: string;
        subscriptionPlan?: string;
        maxBranches?: number;
        maxEmployees?: number;
        isActive?: boolean;
    }
) => {
    if (data.gstNumber && !validateGST(data.gstNumber)) {
        throw new Error("Invalid GST Number format");
    }

    const company = await prisma.company.update({
        where: {
            id,
        },
        data,
    });

    return company;
};


// ─────────────────────────────────────────────
// Deactivate Company
// ─────────────────────────────────────────────

export const deactivateCompany = async (id: string) => {
    await prisma.company.update({
        where: {
            id,
        },
        data: {
            isActive: false,
        },
    });

    return {
        message: "Company deactivated successfully",
    };
};


// ─────────────────────────────────────────────
// Permanent Delete Company
// ─────────────────────────────────────────────

export const permanentDeleteCompany = async (id: string) => {
    const company = await prisma.company.findUnique({
        where: {
            id,
        },
        include: {
            users: true,
        },
    });

    if (!company) {
        throw new Error("Company not found");
    }

    // Delete dependent records first
    await prisma.permission.deleteMany({
        where: {
            companyId: id,
        },
    });

    await prisma.role.deleteMany({
        where: {
            companyId: id,
        },
    });

    await prisma.category.deleteMany({
        where: {
            companyId: id,
        },
    });

    await prisma.branch.deleteMany({
        where: {
            companyId: id,
        },
    });

    await prisma.user.deleteMany({
        where: {
            companyId: id,
        },
    });

    // Delete company
    await prisma.company.delete({
        where: {
            id,
        },
    });

    return {
        message: "Company permanently deleted",
    };
};

export const activateCompany = async (id: string) => {
    await prisma.company.update({
        where: { id },
        data: { isActive: true },
    });

    return { message: "Company activated successfully" };
};

// ─────────────────────────────────────────────
// Generate Password
// ─────────────────────────────────────────────

const passwordgenerated = (email: string) => {
    const prefix = email.slice(0, 3);

    return `${prefix}@123`;
};


// ─────────────────────────────────────────────
// Assign Company Admin
// ─────────────────────────────────────────────

export const assignCompanyAdmin = async (
    companyId: string,
    data: {
        name: string;
        email: string;
        password: string;
    },
    createdBy?: string
) => {
    // ─────────────────────────────────────────
    // Find Company
    // ─────────────────────────────────────────

    const company = await prisma.company.findUnique({
        where: {
            id: companyId,
        },
    });

    if (!company) {
        throw new Error("Company not found");
    }


    // ─────────────────────────────────────────
    // Check Existing User
    // ─────────────────────────────────────────

    const existingUser = await prisma.user.findUnique({
        where: {
            email: data.email,
        },
    });

    if (existingUser) {
        throw new Error("User already exists");
    }


    // ─────────────────────────────────────────
    // Find Existing Company Admin Role
    //
    // Company_Admin
    // company_admin
    // Company Admin
    // COMPANY ADMIN
    //
    // sab normalize hokar company_admin banenge
    // ─────────────────────────────────────────

    const companyRoles = await prisma.role.findMany({
        where: {
            companyId: company.id,
        },
        select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            isSystemRole: true,
            companyId: true,
        },
    });

    let companyAdminRole = companyRoles.find(
        (role) =>
            normalizeName(role.name) === "company_admin"
    );


    // ─────────────────────────────────────────
    // Create Company Admin Role If Not Exists
    // ─────────────────────────────────────────

    if (!companyAdminRole) {
        companyAdminRole = await prisma.role.create({
            data: {
                name: "Company_Admin",
                description: "Company level admin",
                isActive: true,
                isSystemRole: true,
                companyId: companyId,
            },
        });


        // ─────────────────────────────────────
        // Create Permissions
        // ─────────────────────────────────────

        const allModules = await prisma.module.findMany({
            select: {
                id: true,
                name: true,
            },
        });

        await prisma.permission.createMany({
            data: allModules.map((module) => {
                const moduleName = normalizeName(module.name);

                const isCompanyModule =
                    moduleName === "company";

                return {
                    roleId: companyAdminRole!.id,
                    moduleId: module.id,
                    companyId: companyId,

                    canView: true,

                    canCreate: !isCompanyModule,

                    canEdit: !isCompanyModule,

                    canDelete: false,
                };
            }),

            skipDuplicates: true,
        });
    }


    // ─────────────────────────────────────────
    // Hash Password
    // ─────────────────────────────────────────

    const hashedPassword = await bcrypt.hash(
        data.password,
        10
    );


    // ─────────────────────────────────────────
    // Create User
    // ─────────────────────────────────────────

    const user = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashedPassword,

            isActive: true,

            companyId: companyId,

            roleId: companyAdminRole.id,

            createdBy: createdBy ?? null,
        },
    });


    // ─────────────────────────────────────────
    // Response
    // ─────────────────────────────────────────

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            companyId: user.companyId,

            // Database se actual role name
            role: companyAdminRole.name,
        },

        company: {
            id: company.id,
            name: company.name,
            code: company.code,
        },
    };
};


// ─────────────────────────────────────────────
// Get My Company
// ─────────────────────────────────────────────

export const getMyCompany = async (companyId: string) => {
    const company = await prisma.company.findUnique({
        where: {
            id: companyId,
        },
    });

    if (!company) {
        throw new Error("Company not found");
    }

    return company;
};