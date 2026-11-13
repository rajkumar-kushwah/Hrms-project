import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import bcrypt from "bcrypt";

import {
    getRoleName,
    isSuperAdminRole,
    isCompanyAdminRole,
} from "../utilis/roleUtils.js";


// ─────────────────────────────────────────────
// Get All Users
// ─────────────────────────────────────────────

export const getUsers = async (req: Request, res: Response) => {
    try {
        const userRoleName = getRoleName(req.user);
        const companyId = req.user?.companyId;

        if (!userRoleName) {
            return res.status(403).json({
                success: false,
                message: "User role not found",
            });
        }

        // ─────────────────────────────────────
        // Find Company Admin Role
        // Role name can be:
        // company_admin
        // Company Admin
        // COMPANY ADMIN
        // etc.
        // ─────────────────────────────────────

        const roles = await prisma.role.findMany({
            select: {
                id: true,
                name: true,
            },
        });

        const companyAdminRoleIds = roles
            .filter((role) => isCompanyAdminRole(role))
            .map((role) => role.id);

        if (companyAdminRoleIds.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company admin role not found",
            });
        }

        // ─────────────────────────────────────
        // Where Condition
        // ─────────────────────────────────────

        const whereClause = {
            companyId:
                isSuperAdminRole(req.user)
                    ? { not: null }
                    : companyId,

            roleId: {
                in: companyAdminRoleIds,
            },
        };

        const users = await prisma.user.findMany({
            where: whereClause,

            select: {
                id: true,
                name: true,
                email: true,
                isActive: true,
                createdAt: true,

                company: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },

                role: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },

            orderBy: {
                createdAt: "desc",
            },
        });

        return res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        console.error("Get users error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ─────────────────────────────────────────────
// Toggle Active / Inactive
// ─────────────────────────────────────────────

export const toggleUserStatus = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;
        const requestingUser = req.user;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id",
            });
        }

        if (!requestingUser) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const requestingRoleName = getRoleName(requestingUser);

        if (!requestingRoleName) {
            return res.status(403).json({
                success: false,
                message: "User role not found",
            });
        }

        // ─────────────────────────────────────
        // Find User
        // ─────────────────────────────────────

        const user = await prisma.user.findUnique({
            where: {
                id,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // ─────────────────────────────────────
        // Khud ko deactivate mat karo
        // ─────────────────────────────────────

        if (id === requestingUser.id) {
            return res.status(400).json({
                success: false,
                message: "You cannot deactivate yourself",
            });
        }

        // ─────────────────────────────────────
        // Company Access Check
        // Super Admin → All companies
        // Other roles → Only own company
        // ─────────────────────────────────────

        if (
            !isSuperAdminRole(requestingUser) &&
            user.companyId !== requestingUser.companyId
        ) {
            return res.status(403).json({
                success: false,
                message: "Access Denied",
            });
        }

        // ─────────────────────────────────────
        // Toggle Status
        // ─────────────────────────────────────

        const updated = await prisma.user.update({
            where: {
                id,
            },

            data: {
                isActive: !user.isActive,
            },
        });

        return res.status(200).json({
            success: true,

            message: `User ${updated.isActive
                ? "activated"
                : "deactivated"
                } successfully`,

            data: {
                id: updated.id,
                isActive: updated.isActive,
            },
        });
    } catch (error) {
        console.error("Toggle user status error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ─────────────────────────────────────────────
// Reset Password
// ─────────────────────────────────────────────

export const resetUserPassword = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id as string;
        const { password } = req.body;

        // ─────────────────────────────────────
        // Validate ID
        // ─────────────────────────────────────

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id",
            });
        }

        // ─────────────────────────────────────
        // Validate Password
        // ─────────────────────────────────────

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
            });
        }

        // ─────────────────────────────────────
        // Find User
        // ─────────────────────────────────────

        const user = await prisma.user.findUnique({
            where: {
                id,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // ─────────────────────────────────────
        // Hash Password
        // ─────────────────────────────────────

        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // ─────────────────────────────────────
        // Update Password
        // ─────────────────────────────────────

        await prisma.user.update({
            where: {
                id,
            },

            data: {
                password: hashedPassword,
            },
        });

        return res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });
    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};