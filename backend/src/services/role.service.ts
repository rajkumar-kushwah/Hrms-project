import { prisma } from "../config/db.js";

// Company ke sabhi roles
export const getCompanyRoles = async (companyId: string | null, isSuperAdmin: boolean) => {
    return await prisma.role.findMany({
        where: isSuperAdmin ? {} : { companyId },
        include: {
            permissions: { include: { module: true, } },
            _count: { select: { user: true } },
            company: { select: { id: true, name: true } }
        },
        orderBy: { id: "asc" },
    });
};

// Naya role banao



export const createRole = async (
    companyId: string | null,
    data: {
        name: string;
        description?: string;
    }
) => {
    const name = data.name?.trim();

    if (!name) {
        throw new Error("Role name is required");
    }

    if (name.length > 100) {
        throw new Error("Role name cannot exceed 100 characters");
    }

    const existing = await prisma.role.findFirst({
        where: {
            name: {
                equals: name,
                mode: "insensitive",
            },
            companyId,
        },
        select: { id: true, name: true },
    });

    if (existing) {
        throw new Error(
            `Role "${existing.name}" already exists${companyId ? " in this company" : " globally"
            }`
        );
    }

    const allModules = await prisma.module.findMany({
        where: { isActive: true },
        select: { id: true },
    });

    try {
        return await prisma.$transaction(async (tx) => {
            const role = await tx.role.create({
                data: {
                    name,
                    description: data.description?.trim() || null,
                    isActive: true,
                    companyId,
                },
            });

            await tx.permission.createMany({
                data: allModules.map((module) => ({
                    roleId: role.id,
                    moduleId: module.id,
                    companyId,
                    canView: false,
                    canCreate: false,
                    canEdit: false,
                    canDelete: false,
                })),
                skipDuplicates: true,
            });

            return role;
        });
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            "code" in error &&
            error.code === "P2002"
        ) {
            throw new Error(
                `Role "${name}" already exists in this scope`
            );
        }

        throw error;
    }
};

// Role ki permissions dekho
export const getRolePermissions = async (
    roleId: number,
    companyId: string | null
) => {
    const role = await prisma.role.findFirst({
        where: {
            id: roleId,
            companyId,
        },
        include: {
            permissions: {
                include: {
                    module: {
                        include: {
                            children: true, // Sub modules bhi
                        },
                    },
                },
                orderBy: {
                    moduleId: "asc",
                },
            },
        },
    });

    if (!role) throw new Error("Role not found");

    return role;
};

// Permissions update karo
export const updateRolePermissions = async (
    roleId: number,
    companyId: string | null,
    roleName: string,
    permissions: {
        moduleId: number;
        canView: boolean;
        canCreate: boolean;
        canEdit: boolean;
        canDelete: boolean;
    }[],
    description?: string
) => {
    // ─────────────────────────────────────────
    // Find Role
    // ─────────────────────────────────────────

    const role = await prisma.role.findFirst({
        where: {
            id: roleId,
        },
    });

    if (!role) {
        throw new Error("Role not found");
    }


    // ─────────────────────────────────────────
    // Company Admin can only edit
    // its own company's role
    // ─────────────────────────────────────────

    if (
        companyId !== null &&
        role.companyId !== companyId
    ) {
        throw new Error(
            "Access denied - this role doesn't belong to your company"
        );
    }


    const targetCompanyId =
        role.companyId;


    // ─────────────────────────────────────────
    // Update Role Name
    // ─────────────────────────────────────────

    const trimmedRoleName =
        roleName.trim();

    if (!trimmedRoleName) {
        throw new Error(
            "Role name is required"
        );
    }


    await prisma.role.update({
        where: {
            id: roleId,
        },
        data: {
            name: trimmedRoleName,
            ...(description !== undefined && {
                description: description.trim(),
            }),
        },
    });


    // ─────────────────────────────────────────
    // Update Permissions
    // ─────────────────────────────────────────

    for (const mod of permissions) {
        await prisma.permission.upsert({
            where: {
                roleId_moduleId_companyId: {
                    roleId,
                    moduleId: mod.moduleId,
                    companyId: targetCompanyId!,
                },
            },

            update: {
                canView: mod.canView,
                canCreate: mod.canCreate,
                canEdit: mod.canEdit,
                canDelete: mod.canDelete,
            },

            create: {
                roleId,
                moduleId: mod.moduleId,
                companyId: targetCompanyId,

                canView: mod.canView,
                canCreate: mod.canCreate,
                canEdit: mod.canEdit,
                canDelete: mod.canDelete,
            },
        });
    }


    // ─────────────────────────────────────────
    // Return Updated Role Permissions
    // ─────────────────────────────────────────

    return await getRolePermissions(
        roleId,
        targetCompanyId
    );
};

// Role delete karo
// export const deleteRole = async (roleId: number, companyId: string) => {
//     const role = await prisma.role.findFirst({
//         where: { id: roleId, companyId },
//     });

//     if (!role) throw new Error("Role not found");

//     // Pehle permissions delete karo
//     await prisma.permission.deleteMany({
//         where: { roleId, companyId },
//     });

//     // Phir role delete karo
//     await prisma.role.delete({
//         where: { id: roleId },
//     });

//     return { message: "Role deleted successfully" };
// };

export const deleteRole = async (
    roleId: number,
    companyId: string
) => {
    const role = await prisma.role.findFirst({
        where: {
            id: roleId,
            companyId,
        },
    });

    if (!role) {
        throw new Error("Role not found");
    }

    if (role.isSystemRole) {
        throw new Error("System roles cannot be deleted");
    }

    await prisma.permission.deleteMany({
        where: {
            roleId,
            companyId,
        },
    });

    await prisma.role.delete({
        where: {
            id: roleId,
        },
    });

    return {
        message: "Role deleted successfully",
    };
};