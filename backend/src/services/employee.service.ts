import { prisma } from "../config/db.js";
import bcrypt from "bcrypt";

// ─────────────────────────────────────────────
// Normalize Role / Name
// ─────────────────────────────────────────────

const normalizeName = (value?: string | null) => {
    return value
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_");
};


// ─────────────────────────────────────────────
// Create Employee
// ─────────────────────────────────────────────

export const createEmployee = async (
    companyId: string,
    createdBy: string,
    requestingUserRole: string,
    data: {
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
) => {
    // ─────────────────────────────────────────
    // Normalize Requesting Role
    // ─────────────────────────────────────────

    const normalizedRequestingRole =
        normalizeName(requestingUserRole);


    // ─────────────────────────────────────────
    // Email Duplicate Check
    // ─────────────────────────────────────────

    const existingUser = await prisma.user.findUnique({
        where: {
            email: data.email,
        },
    });

    if (existingUser) {
        throw new Error("Email already exists");
    }


    // ─────────────────────────────────────────
    // Employee Code
    // ─────────────────────────────────────────

    const lastCode = await prisma.user.findFirst({
        where: {
            companyId,
            employeeCode: {
                not: null,
            },
        },
        orderBy: {
            createdAt: "desc",
        },
        select: {
            employeeCode: true,
        },
    });

    let nextNumber = 1;

    if (lastCode?.employeeCode) {
        nextNumber =
            parseInt(
                lastCode.employeeCode.replace("EMP", ""),
                10
            ) + 1;
    }

    const employeeCode =
        `EMP${String(nextNumber).padStart(4, "0")}`;


    // ─────────────────────────────────────────
    // Branch Validation
    // ─────────────────────────────────────────

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


    // ─────────────────────────────────────────
    // Category Validation
    // ─────────────────────────────────────────

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


    // ─────────────────────────────────────────
    // Role Validation
    // ─────────────────────────────────────────

    const role = await prisma.role.findUnique({
        where: {
            id: data.roleId,

        },

    });

    if (!role) {
        throw new Error("Role not found");
    }

    // Role company check
    if (
        role.companyId !== null &&
        role.companyId !== companyId
    ) {
        throw new Error(
            "Role does not belong to this company"
        );
    }

    // Company Admin cannot assign system roles
    if (
        normalizedRequestingRole === "company_admin" &&
        role.isSystemRole
    ) {
        throw new Error(
            "Company Admin cannot assign system roles"
        );
    }


    // ─────────────────────────────────────────
    // Hash Password
    // ─────────────────────────────────────────

    const hashedPassword = await bcrypt.hash(
        data.password,
        10
    );

    // ─────────────────────────────────────────
    // Create Employee
    // ─────────────────────────────────────────

    const employee = await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashedPassword,

            isActive: !role.requiresOnboarding,
            employmentStatus: role.requiresOnboarding
                ? "ONBOARDING"
                : "ACTIVE",

            companyId,

            roleId: data.roleId,

            createdBy,

            employeeCode,

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
                reportingManagerId:
                    data.reportingManagerId,
            }),

            ...(data.panNumber && {
                panNumber: data.panNumber,
            }),

            ...(data.aadharNumber && {
                aadharNumber: data.aadharNumber,
            }),

            ...(data.bankAccountNumber && {
                bankAccountNumber:
                    data.bankAccountNumber,
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
                emergencyContactName:
                    data.emergencyContactName,
            }),

            ...(data.emergencyContactPhone && {
                emergencyContactPhone:
                    data.emergencyContactPhone,
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

    const {
        password: _,
        ...employeeWithoutPassword
    } = employee;

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
    const normalizedRequestingRole =
        normalizeName(requestingUserRole);

    const isAdminRole =
        normalizedRequestingRole === "super_admin" ||
        normalizedRequestingRole === "company_admin";


    // ─────────────────────────────────────────
    // Find Company Admin Role IDs
    // ─────────────────────────────────────────

    const roles = await prisma.role.findMany({
        select: {
            id: true,
            name: true,
        },
    });

    const companyAdminRoleIds = roles
        .filter(
            (role) =>
                normalizeName(role.name) ===
                "company_admin"
        )
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

            ...(!isAdminRole && {
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
                        requiredItems.length) *
                    100
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
    const normalizedRequestingRole =
        normalizeName(requestingUserRole);

    const isAdminRole =
        normalizedRequestingRole === "super_admin" ||
        normalizedRequestingRole === "company_admin";


    // ─────────────────────────────────────────
    // Employee Can View Only Own Profile
    // ─────────────────────────────────────────

    if (
        !isAdminRole &&
        requestingUserId !== id
    ) {
        throw new Error(
            "Access denied — you can only view your own profile"
        );
    }


    // ─────────────────────────────────────────
    // Find Employee
    // ─────────────────────────────────────────

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


    // ─────────────────────────────────────────
    // Company Admin → Only Own Company
    // ─────────────────────────────────────────

    if (
        normalizedRequestingRole === "company_admin" &&
        employee.companyId !== requestingCompanyId
    ) {
        throw new Error("Access denied");
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
    data: {
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
) => {
    // ─────────────────────────────────────────
    // Find Existing Employee
    // ─────────────────────────────────────────

    const existing = await prisma.user.findUnique({
        where: {
            id,
        },
    });

    if (!existing) {
        throw new Error("Employee not found");
    }



    // ─────────────────────────────────────────
    // Normalize Requesting Role
    // ─────────────────────────────────────────

    const normalizedRequestingRole =
        normalizeName(requestingUserRole);

    const isAdminRole =
        normalizedRequestingRole === "super_admin" ||
        normalizedRequestingRole === "company_admin";

    const isSelf =
        requestingUserId === id;

    if (existing.companyId !== requestingCompanyId) {
        throw new Error(
            "Employee does not belong to the selected company"
        );
    }
    // ─────────────────────────────────────────
    // Access Check
    // ─────────────────────────────────────────

    if (!isAdminRole && !isSelf) {
        throw new Error(
            "Access denied — you can only edit your own profile"
        );
    }


    // ─────────────────────────────────────────
    // Company Admin → Own Company Only
    // ─────────────────────────────────────────

    // if (
    //     normalizedRequestingRole === "company_admin" &&
    //     existing.companyId !== requestingCompanyId
    // ) {
    //     throw new Error(
    //         "Access denied — this employee doesn't belong to your company"
    //     );
    // }


    const safeData: typeof data = { ...data };


    if (safeData.email && safeData.email !== existing.email) {
        const existingEmail = await prisma.user.findUnique({
            where: {
                email: safeData.email,
            },
        });

        if (existingEmail && existingEmail.id !== id) {
            throw new Error("Email already exists");
        }
    }


    // ─────────────────────────────────────────
    // Employee Self Edit
    // ─────────────────────────────────────────

    if (
        !isAdminRole &&
        isSelf &&
        safeData.isActive !== undefined
    ) {
        throw new Error(
            "You cannot change employee status"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.roleId !== undefined
    ) {
        throw new Error(
            "You cannot change your role"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.branchId !== undefined
    ) {
        throw new Error(
            "You cannot change your branch"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.categoryId !== undefined
    ) {
        throw new Error(
            "You cannot change your category"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.reportingManagerId !== undefined
    ) {
        throw new Error(
            "You cannot change your reporting manager"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.panNumber !== undefined
    ) {
        throw new Error(
            "You cannot change your pan number"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.aadharNumber !== undefined
    ) {
        throw new Error(
            "You cannot change your aadhar number"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.bankAccountNumber !== undefined
    ) {
        throw new Error(
            "You cannot change your bank account number"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.bankIFSC !== undefined
    ) {
        throw new Error(
            "You cannot change your bank IFSC"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.bankName !== undefined
    ) {
        throw new Error(
            "You cannot change your bank name"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.pfNumber !== undefined
    ) {
        throw new Error(
            "You cannot change your pf number"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.esiNumber !== undefined
    ) {
        throw new Error(
            "You cannot change your esi number"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.grossSalary !== undefined
    ) {
        throw new Error(
            "You cannot change your gross salary"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.emergencyContactName !== undefined
    ) {
        throw new Error(
            "You cannot change your emergency contact name"
        );
    }

    if (
        !isAdminRole &&
        isSelf &&
        safeData.emergencyContactPhone !== undefined
    ) {
        throw new Error(
            "You cannot change your emergency contact phone"
        );
    }

    // ─────────────────────────────────────────
    // Role Validation
    // ─────────────────────────────────────────

    if (safeData.roleId !== undefined) {
        const role = await prisma.role.findUnique({
            where: {
                id: safeData.roleId,
            },
        });

        if (!role) {
            throw new Error("Role not found");
        }

        // Role company check
        if (
            role.companyId !== null &&
            role.companyId !== requestingCompanyId
        ) {
            throw new Error(
                "Role does not belong to this company"
            );
        }

        if (
            normalizedRequestingRole ===
            "company_admin" &&
            role.isSystemRole
        ) {
            throw new Error(
                "Company Admin cannot assign system roles."
            );
        }
    }




    // Employee sensitive fields edit nahi kar sakta
    // ─────────────────────────────────────────
    const updateData: typeof data = (() => {
        if (!isAdminRole && isSelf) {
            const {
                roleId,
                branchId,
                categoryId,
                isActive,
                designation,
                joiningDate,
                employmentType,
                reportingManagerId,
                panNumber,
                aadharNumber,
                bankAccountNumber,
                bankIFSC,
                bankName,
                pfNumber,
                esiNumber,
                grossSalary,
                emergencyContactName,
                emergencyContactPhone,

                ...allowedSelfEdit
            } = safeData;

            return allowedSelfEdit
        }
        return safeData
    })()



    // ─────────────────────────────────────────
    // Status Update
    // ─────────────────────────────────────────

    // if (
    //     safeData.isActive !== undefined &&
    //     !isAdminRole
    // ) {
    //     throw new Error(
    //         "You cannot change employee status"
    //     );
    // }


    // ─────────────────────────────────────────
    // Branch Validation
    // ─────────────────────────────────────────

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


    // ─────────────────────────────────────────
    // Category Validation
    // ─────────────────────────────────────────

    if (updateData.categoryId) {
        const category =
            await prisma.category.findUnique({
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

        if (
            category.companyId !==
            requestingCompanyId
        ) {
            throw new Error(
                "Category does not belong to this company"
            );
        }
    }


    // ─────────────────────────────────────────
    // Date Conversion
    // ─────────────────────────────────────────

    const {
        dateOfBirth,
        joiningDate,
        ...rest
    } = updateData;


    // ─────────────────────────────────────────
    // Update Employee
    // ─────────────────────────────────────────

    const employee = await prisma.user.update({
        where: {
            id,
        },

        data: {
            ...rest,

            ...(dateOfBirth && {
                dateOfBirth: new Date(dateOfBirth),
            }),

            ...(joiningDate && {
                joiningDate: new Date(joiningDate),
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

    const { password, ...employeeWithoutPassword } = employee;

    return employeeWithoutPassword;
}


// ─────────────────────────────────────────────
// Delete Employee (Soft Delete)
// ─────────────────────────────────────────────

export const updateEmployeeStatus = async (
    id: string,
    isActive: boolean
) => {
    const existing = await prisma.user.findUnique({
        where: { id },
    });

    if (!existing) {
        throw new Error("Employee not found");
    }

    const employee = await prisma.user.update({
        where: { id },
        data: { isActive },
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
// Permanently delete employee
export const deleteEmployee = async (id: string) => {
    const existing = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
        },
    });

    if (!existing) {
        throw new Error("Employee not found");
    }

    await prisma.user.delete({
        where: { id },
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
    });

    if (!employee) {
        throw new Error("Employee not found");
    }

    const hashedPassword = await bcrypt.hash(
        password,
        10
    );

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