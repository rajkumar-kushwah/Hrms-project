import type { Request, Response } from "express";
import * as RoleService from "../services/role.service.js";
import { prisma } from "../config/db.js";
import {
    isSuperAdminRole,
    getCompanyId,
} from "../utilis/roleUtils.js";
import {
    isDatabaseUnavailable,
    sendDatabaseUnavailable,
} from "../utilis/dbErrors.js";

// Sabhi roles
export const getCompanyRoles = async (req: Request, res: Response) => {
    try {
        const superAdmin = isSuperAdminRole(req.user?.role?.name);
        const companyId = getCompanyId(req);

        const roles = await RoleService.getCompanyRoles(
            companyId,
            superAdmin
        );

        return res.status(200).json({
            success: true,
            data: roles,
        });
    } catch (error: unknown) {
        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to create role",
        });
    }
};

// Role create
export const createRole = async (req: Request, res: Response) => {
    try {
        const companyId = getCompanyId(req);
        const superAdmin = isSuperAdminRole(req.user?.role?.name);

        if (!companyId && !superAdmin) {
            return res.status(400).json({
                success: false,
                message: "Company not found in session",
            });
        }

        const role = await RoleService.createRole(companyId, req.body);

        return res.status(201).json({
            success: true,
            message: "Role created successfully",
            data: role,
        });
    } catch (error: unknown) {
        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to create role",
        });
    }
};

// Role permissions dekho
export const getRolePermissions = async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId!;
        const id = (req.params.id as string);
        const roleId = parseInt(id);
        const role = await RoleService.getRolePermissions(roleId, companyId);
        res.status(200).json({ success: true, data: role });
    } catch (error: any) {
        res.status(404).json({ success: false, message: error.message });
    }
};

// Permissions update
export const updateRolePermissions = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const roleId = parseInt(id, 10);

        if (Number.isNaN(roleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role ID",
            });
        }

        const { permissions, name, description } = req.body;

        const superAdmin = isSuperAdminRole(req.user?.role?.name);
        const companyId = superAdmin ? null : getCompanyId(req);

        if (!superAdmin && !companyId) {
            return res.status(400).json({
                success: false,
                message: "Company not found in session",
            });
        }

        const role = await RoleService.updateRolePermissions(
            roleId,
            companyId,
            name,
            permissions,
            description
        );

        return res.status(200).json({
            success: true,
            message: "Permissions updated successfully",
            data: role,
        });
    } catch (error: unknown) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to update role permissions",
        });
    }
};

// Role delete
export const deleteRole = async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.companyId!;
        const id = (req.params.id as string);
        const roleId = parseInt(id);
        const result = await RoleService.deleteRole(roleId, companyId);
        res.status(200).json({ success: true, message: result.message });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// GET /api/modules — Saare modules lo
export const getModules = async (req: Request, res: Response) => {
    try {
        const modules = await prisma.module.findMany({
            where: { isActive: true }, // Sirf parent nahi — sab
            select: {
                id: true,
                name: true,
                displayName: true,
                parentId: true,  // parentId include
                order: true,
                icon: true,
                url: true,
            },
            orderBy: { order: "asc" }
        });

        return res.status(200).json({
            success: true,
            data: modules,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};