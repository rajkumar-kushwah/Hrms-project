import { prisma } from "../../src/config/db.ts";
import { ROLES } from "../../src/utilis/roleUtils.js";

export const seedSuperAdminRole = async () => {
    let superAdminRole = await prisma.role.findFirst({
        where: {
            name: ROLES.SUPER_ADMIN,
            companyId: null,
        },
    });

    if (!superAdminRole) {
        superAdminRole = await prisma.role.create({
            data: {
                name: ROLES.SUPER_ADMIN,
                description: "Full access to everything",
                isActive: true,
                isSystemRole: true,
                companyId: null,
            },
        });

        console.log("Super Admin role created!");
    } else {
        await prisma.role.update({
            where: { id: superAdminRole.id },
            data: {
                isSystemRole: true,
            },
        });

        console.log("Super Admin role updated!");
    }

    const allModules = await prisma.module.findMany();

    for (const mod of allModules) {
        const existing = await prisma.permission.findFirst({
            where: {
                roleId: superAdminRole.id,
                moduleId: mod.id,
                companyId: null,
            },
        });

        if (!existing) {
            await prisma.permission.create({
                data: {
                    roleId: superAdminRole.id,
                    moduleId: mod.id,
                    companyId: null,
                    canView: true,
                    canCreate: true,
                    canEdit: true,
                    canDelete: true,
                },
            });
        }
    }

    console.log("Super Admin permissions seeded!");

    return superAdminRole;
};