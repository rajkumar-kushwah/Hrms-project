import { prisma } from "../../src/config/db.ts";
import bcrypt from "bcrypt";
import { ROLES } from "../../src/utilis/roleUtils.js";

export const seedSuperAdmin = async () => {

    // Pahle role lo
    const superAdminRole = await prisma.role.findFirst({
        where: {
            name: ROLES.SUPER_ADMIN,
        },
    });

    if (!superAdminRole) {
        console.log(" Super Admin role not found! Pehle seedSuperAdminRole() chalao");
        return;
    }

    const existingAdmin = await prisma.user.findUnique({
        where: {
            email: process.env.SUPER_ADMIN_EMAIL ?? "admin@hrms.com",
        },
    });

    // Agar already exist karta hai to sirf role update karo
    if (existingAdmin) {
        await prisma.user.update({
            where: {
                email: process.env.SUPER_ADMIN_EMAIL ?? "admin@hrms.com"
            },
            data: {
                roleId: superAdminRole.id
            },
        });
        console.log(" Super Admin role updated!");
        return;
    }

    // Naya super admin banao
    const hashedPassword = await bcrypt.hash(
        process.env.SUPER_ADMIN_PASSWORD ?? "Admin@123",
        10
    );

    await prisma.user.create({
        data: {
            name: "Super Admin",
            email: process.env.SUPER_ADMIN_EMAIL ?? "admin@hrms.com",
            password: hashedPassword,
            isActive: true,
            roleId: superAdminRole.id,
            companyId: null,
        },
    });

    console.log(" Super Admin created successfully!");
};