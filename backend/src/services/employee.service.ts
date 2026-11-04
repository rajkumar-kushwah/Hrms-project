
import { prisma } from "../config/db.js";
import bcrypt from "bcrypt";
import {
    isAdminRole,
    isCompanyAdminRole,
    normalizeRoleName,
} from "../utilis/roleUtils.js";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface CreateEmployeeData {
    name: string;
    email: string;
    password: string;
    roleId: number;
    branchId?: string;
    categoryId?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    maritalStatus?: string;
    currentAddress?: string;
    permanentAddress?: string;
    designation?: string;
    joiningDate?: string;
    employmentType?: string;
    workShift?: string;
    reportingManagerId?: string;
    panNumber?: string;
    aadharNumber?: string;
    bankAccountNumber?: string;
    bankIFSC?: string;
    bankName?: string;
    pfNumber?: string;
    esiNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    grossSalary?: number;
}

interface UpdateEmployeeData {
    name?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    maritalStatus?: string;
    currentAddress?: string;
    permanentAddress?: string;
    designation?: string;
    joiningDate?: string;
    employmentType?: string;
    workShift?: string;
    roleId?: number;
    branchId?: string;
    categoryId?: string;
    reportingManagerId?: string;
    panNumber?: string;
    aadharNumber?: string;
    bankAccountNumber?: string;
    bankIFSC?: string;
    bankName?: string;
    pfNumber?: string;
    esiNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    isActive?: boolean;
    grossSalary?: number;
}

// ─────────────────────────────────────────────
// Create Employee
// ─────────────────────────────────────────────

export const createEmployee = async (
    companyId: string,
    createdBy: string,
    requestingUserRole: string,
    data: CreateEmployeeData
) => {
    if (!companyId) {
        throw new Error("Company selection is required");
    }

    const normalizedRole = normalizeRoleName(requestingUserRole);

    const isCompanyAdmin = isCompanyAdminRole(normalizedRole);

    // Email duplicate check
    const existingUser = await prisma.user.findUnique({
        where: {
            email: data.email,
        },
        select: {
            id: true,
        },
    });

    if (existingUser) {
        throw new Error("Email already exists");
    }

    // Validate selected company
    const company = await prisma.company.findUnique({
        where: {
            id: companyId,
        },
        select: {
            id: true,
            isActive: true,
        },
    });

    if (!company) {
        throw new Error("Company not found");
    }

    if (!company.isActive) {
        throw new Error("Company is inactive");
    }

    // Branch validation
    if (data.branchId) {
        const branch = await prisma.branch.findUnique({
            where: {
                id: data.branchId,
            },
        });

        if (!branch) {
            throw new Error("Branch not found");
        }

        if (!branch.isActive) {
            throw new Error("Branch is inactive");
        }

        if (branch.companyId !== companyId) {
            throw new Error(
                "Branch does not belong to this company"
            );
        }
    }

    // Category validation
    if (data.categoryId) {
        const category = await prisma.category.findUnique({
            where: {
                id: data.categoryId,
            },
        });

        if (!category) {
            throw new Error("Category not found");
        }

        if (!category.isActive) {
            throw new Error("Category is inactive");
        }

        if (category.companyId !== companyId) {
            throw new Error(
                "Category does not belong to this company"
            );
        }
    }

    // Role validation
    const role = await prisma.role.findUnique({
        where: {
            id: data.roleId,
        },
    });

    if (!role || !role.isActive) {
        throw new Error("Role not found or inactive");
    }

    if (
        role.companyId !== null &&
        role.companyId !== companyId
    ) {
        throw new Error(
            "Role does not belong to this company"
        );
    }

    // Only Company Admin cannot assign system roles.
    // Super Admin is allowed to assign system roles.
    if (isCompanyAdmin && role.isSystemRole) {
        throw new Error(
            "Company Admin cannot assign system roles"
        );
    }

    // Reporting manager validation
    if (data.reportingManagerId) {
        const manager = await prisma.user.findFirst({
            where: {
                id: data.reportingManagerId,
                companyId,
            },
            select: {
                id: true,
            },
        });

        if (!manager) {
            throw new Error(
                "Reporting manager does not belong to this company"
            );
        }
    }

    // Generate company-wise employee code
    const existingCodes = await prisma.user.findMany({
        where: {
            companyId,
            employeeCode: {
                startsWith: "EMP",
            },
        },
        select: {
            employeeCode: true,
        },
    });

    const maxNumber = existingCodes.reduce((max, user) => {
        const match = user.employeeCode?.match(/^EMP(\d+)$/i);

        if (!match) {
            return max;
        }

        return Math.max(max, Number(match[1]));
    }, 0);

    const employeeCode =
        `EMP${String(maxNumber + 1).padStart(4, "0")}`;

    // Hash password
    const hashedPassword = await bcrypt.hash(
        data.password,
        10
    );

    // Create employee
    const employee = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashedPassword,

            companyId,
            roleId: data.roleId,
            createdBy,
            employeeCode,

            isActive: !role.requiresOnboarding,

            employmentStatus: role.requiresOnboarding
                ? "ONBOARDING"
                : "ACTIVE",

            ...(data.branchId && {
                branchId: data.branchId,
            }),

            ...(data.categoryId && {
                categoryId: data.categoryId,
            }),

            ...(data.phone && {
                phone: data.phone,
            }),

            ...(data.dateOfBirth && {
                dateOfBirth: new Date(data.dateOfBirth),
            }),

            ...(data.gender && {
                gender: data.gender,
            }),

            ...(data.bloodGroup && {
                bloodGroup: data.bloodGroup,
            }),

            ...(data.maritalStatus && {
                maritalStatus: data.maritalStatus,
            }),

            ...(data.currentAddress && {
                currentAddress: data.currentAddress,
            }),

            ...(data.permanentAddress && {
                permanentAddress: data.permanentAddress,
            }),

            ...(data.designation && {
                designation: data.designation,
            }),

            ...(data.joiningDate && {
                joiningDate: new Date(data.joiningDate),
            }),

            ...(data.employmentType && {
                employmentType: data.employmentType,
            }),

            ...(data.workShift && {
                workShift: data.workShift,
            }),

            ...(data.reportingManagerId && {
                reportingManagerId: data.reportingManagerId,
            }),

            ...(data.panNumber && {
                panNumber: data.panNumber,
            }),

            ...(data.aadharNumber && {
                aadharNumber: data.aadharNumber,
            }),

            ...(data.bankAccountNumber && {
                bankAccountNumber: data.bankAccountNumber,
            }),

            ...(data.bankIFSC && {
                bankIFSC: data.bankIFSC,
            }),

            ...(data.bankName && {
                bankName: data.bankName,
            }),

            ...(data.pfNumber && {
                pfNumber: data.pfNumber,
            }),

            ...(data.esiNumber && {
                esiNumber: data.esiNumber,
            }),

            ...(data.emergencyContactName && {
                emergencyContactName: data.emergencyContactName,
            }),

            ...(data.emergencyContactPhone && {
                emergencyContactPhone: data.emergencyContactPhone,
            }),

            ...(data.grossSalary !== undefined && {
                grossSalary: data.grossSalary,
            }),
        },

        include: {
            role: {
                select: {
                    id: true,
                    name: true,
                },
            },
            branch: {
                select: {
                    id: true,
                    name: true,
                },
            },
            category: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    const { password: _, ...employeeWithoutPassword } = employee;

    return employeeWithoutPassword;
};

// ─────────────────────────────────────────────
// Get All Employees
// ─────────────────────────────────────────────

export const getEmployees = async (
    companyId: string | null,
    requestingUserId: string,
    requestingUserRole: string
) => {
    const normalizedRole = normalizeRoleName(requestingUserRole);
    const isAdmin = isAdminRole(normalizedRole);

    // Super Admin can see all companies when no company is selected.
    // Company Admin should always receive their own company ID.
    const roles = await prisma.role.findMany({
        select: {
            id: true,
            name: true,
        },
    });

    const companyAdminRoleIds = roles
        .filter((role) => isCompanyAdminRole(role.name))
        .map((role) => role.id);

    const employees = await prisma.user.findMany({
        where: {
            ...(companyId
                ? { companyId }
                : { companyId: { not: null } }),

            ...(companyAdminRoleIds.length > 0 && {
                roleId: {
                    notIn: companyAdminRoleIds,
                },
            }),

            ...(!isAdmin && {
                id: requestingUserId,
            }),
        },

        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            employeeCode: true,
            designation: true,
            grossSalary: true,
            joiningDate: true,
            isActive: true,
            createdAt: true,
            companyId: true,

            role: {
                select: {
                    id: true,
                    name: true,
                },
            },

            branch: {
                select: {
                    id: true,
                    name: true,
                },
            },

            category: {
                select: {
                    id: true,
                    name: true,
                },
            },

            company: {
                select: {
                    id: true,
                    name: true,
                },
            },

            onboarding: {
                select: {
                    status: true,
                    currentStage: true,
                    targetDate: true,

                    items: {
                        select: {
                            isRequired: true,
                            isCompleted: true,
                        },
                    },
                },
            },
        },

        orderBy: {
            createdAt: "desc",
        },
    });

    return employees.map((employee) => {
        const requiredItems =
            employee.onboarding?.items.filter(
                (item) => item.isRequired
            ) ?? [];

        const completedRequired =
            requiredItems.filter(
                (item) => item.isCompleted
            );

        const progressPercent =
            requiredItems.length > 0
                ? Math.round(
                    (completedRequired.length /
                        requiredItems.length) * 100
                )
                : 0;

        return {
            ...employee,

            onboarding: employee.onboarding
                ? {
                    status: employee.onboarding.status,
                    currentStage: employee.onboarding.currentStage,
                    progressPercent,
                    targetDate: employee.onboarding.targetDate,
                }
                : null,
        };
    });
};

// ─────────────────────────────────────────────
// Get Single Employee
// ─────────────────────────────────────────────

export const getEmployeeById = async (
    id: string,
    requestingUserId: string,
    requestingUserRole: string,
    requestingCompanyId: string
) => {
    const normalizedRole = normalizeRoleName(requestingUserRole);
    const isAdmin = isAdminRole(normalizedRole);

    // Employee can view only own profile.
    if (!isAdmin && requestingUserId !== id) {
        throw new Error(
            "Access denied — you can only view your own profile"
        );
    }

    const employee = await prisma.user.findUnique({
        where: {
            id,
        },

        select: {
            companyId: true,
            id: true,
            name: true,
            email: true,
            phone: true,
            employeeCode: true,
            dateOfBirth: true,
            gender: true,
            bloodGroup: true,
            maritalStatus: true,
            currentAddress: true,
            permanentAddress: true,
            designation: true,
            grossSalary: true,
            joiningDate: true,
            employmentType: true,
            workShift: true,
            panNumber: true,
            aadharNumber: true,
            bankAccountNumber: true,
            bankIFSC: true,
            bankName: true,
            pfNumber: true,
            esiNumber: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            isActive: true,

            role: {
                select: {
                    id: true,
                    name: true,
                },
            },

            branch: {
                select: {
                    id: true,
                    name: true,
                },
            },

            category: {
                select: {
                    id: true,
                    name: true,
                },
            },

            reportingManager: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    if (!employee) {
        throw new Error("Employee not found");
    }

    // Enforce company boundary for admins and employees.
    if (employee.companyId !== requestingCompanyId) {
        throw new Error(
            "Employee does not belong to the selected company"
        );
    }

    return employee;
};

// ─────────────────────────────────────────────
// Update Employee
// ─────────────────────────────────────────────

export const updateEmployee = async (
    id: string,
    requestingUserId: string,
    requestingUserRole: string,
    requestingCompanyId: string,
    data: UpdateEmployeeData
) => {
    const normalizedRole = normalizeRoleName(requestingUserRole);
    const isAdmin = isAdminRole(normalizedRole);
    const isCompanyAdmin = isCompanyAdminRole(normalizedRole);
    const isSelf = requestingUserId === id;

    const existing = await prisma.user.findUnique({
        where: {
            id,
        },
    });

    if (!existing) {
        throw new Error("Employee not found");
    }

    // Company boundary check
    if (existing.companyId !== requestingCompanyId) {
        throw new Error(
            "Employee does not belong to the selected company"
        );
    }

    // Access check
    if (!isAdmin && !isSelf) {
        throw new Error(
            "Access denied — you can only edit your own profile"
        );
    }

    // Employee self-edit: allow only safe profile fields.
    const updateData: UpdateEmployeeData = isAdmin
        ? { ...data }
        : {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.email !== undefined && { email: data.email }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.dateOfBirth !== undefined && {
                dateOfBirth: data.dateOfBirth,
            }),
            ...(data.gender !== undefined && { gender: data.gender }),
            ...(data.bloodGroup !== undefined && {
                bloodGroup: data.bloodGroup,
            }),
            ...(data.maritalStatus !== undefined && {
                maritalStatus: data.maritalStatus,
            }),
            ...(data.currentAddress !== undefined && {
                currentAddress: data.currentAddress,
            }),
            ...(data.permanentAddress !== undefined && {
                permanentAddress: data.permanentAddress,
            }),
        };

    // Email duplicate check
    if (updateData.email && updateData.email !== existing.email) {
        const existingEmail = await prisma.user.findUnique({
            where: {
                email: updateData.email,
            },
            select: {
                id: true,
            },
        });

        if (existingEmail && existingEmail.id !== id) {
            throw new Error("Email already exists");
        }
    }

    // Role validation
    if (updateData.roleId !== undefined) {
        const role = await prisma.role.findUnique({
            where: {
                id: updateData.roleId,
            },
        });

        if (!role || !role.isActive) {
            throw new Error("Role not found or inactive");
        }

        if (
            role.companyId !== null &&
            role.companyId !== requestingCompanyId
        ) {
            throw new Error(
                "Role does not belong to this company"
            );
        }

        // Only Company Admin is restricted from assigning system roles.
        if (isCompanyAdmin && role.isSystemRole) {
            throw new Error(
                "Company Admin cannot assign system roles"
            );
        }
    }

    // Branch validation
    if (updateData.branchId) {
        const branch = await prisma.branch.findUnique({
            where: {
                id: updateData.branchId,
            },
        });

        if (!branch) {
            throw new Error("Branch not found");
        }

        if (!branch.isActive) {
            throw new Error("Branch is inactive");
        }

        if (branch.companyId !== requestingCompanyId) {
            throw new Error(
                "Branch does not belong to this company"
            );
        }
    }

    // Category validation
    if (updateData.categoryId) {
        const category = await prisma.category.findUnique({
            where: {
                id: updateData.categoryId,
            },
        });

        if (!category) {
            throw new Error("Category not found");
        }

        if (!category.isActive) {
            throw new Error("Category is inactive");
        }

        if (category.companyId !== requestingCompanyId) {
            throw new Error(
                "Category does not belong to this company"
            );
        }
    }

    // Reporting manager validation
    if (updateData.reportingManagerId) {
        const manager = await prisma.user.findFirst({
            where: {
                id: updateData.reportingManagerId,
                companyId: requestingCompanyId,
            },
            select: {
                id: true,
            },
        });

        if (!manager) {
            throw new Error(
                "Reporting manager does not belong to this company"
            );
        }
    }

    const {
        dateOfBirth,
        joiningDate,
        ...rest
    } = updateData;

    const employee = await prisma.user.update({
        where: {
            id,
        },

        data: {
            ...rest,

            ...(dateOfBirth !== undefined && {
                dateOfBirth: dateOfBirth
                    ? new Date(dateOfBirth)
                    : null,
            }),

            ...(joiningDate !== undefined && {
                joiningDate: joiningDate
                    ? new Date(joiningDate)
                    : null,
            }),
        },

        include: {
            company: {
                select: {
                    id: true,
                    name: true,
                },
            },

            role: {
                select: {
                    id: true,
                    name: true,
                },
            },

            branch: {
                select: {
                    id: true,
                    name: true,
                },
            },

            category: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    const { password: _, ...employeeWithoutPassword } = employee;

    return employeeWithoutPassword;
};

// ─────────────────────────────────────────────
// Update Employee Status
// ─────────────────────────────────────────────

export const updateEmployeeStatus = async (
    id: string,
    isActive: boolean
) => {
    const existing = await prisma.user.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
        },
    });

    if (!existing) {
        throw new Error("Employee not found");
    }

    const employee = await prisma.user.update({
        where: {
            id,
        },

        data: {
            isActive,
        },

        select: {
            id: true,
            name: true,
            isActive: true,
        },
    });

    return {
        message: isActive
            ? "Employee activated successfully"
            : "Employee deactivated successfully",
        employee,
    };
};

// ─────────────────────────────────────────────
// Permanently Delete Employee
// ─────────────────────────────────────────────

export const deleteEmployee = async (id: string) => {
    const existing = await prisma.user.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
            name: true,
        },
    });

    if (!existing) {
        throw new Error("Employee not found");
    }

    await prisma.user.delete({
        where: {
            id,
        },
    });

    return {
        message: "Employee deleted successfully",
    };
};

// ─────────────────────────────────────────────
// Reset Employee Password
// ─────────────────────────────────────────────

export const resetEmployeePassword = async (
    id: string,
    password: string
) => {
    const employee = await prisma.user.findUnique({
        where: {
            id,
        },
        select: {
            id: true,
        },
    });

    if (!employee) {
        throw new Error("Employee not found");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
        where: {
            id,
        },

        data: {
            password: hashedPassword,
        },
    });

    return {
        message: "Password reset successfully",
    };
};
