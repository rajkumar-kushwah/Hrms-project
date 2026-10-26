import type { Request } from "express";

export const isSuperAdminRole = (
    roleName?: string | null
): boolean => {
    return roleName
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "_") === "super_admin";
};

export const isAdminRole = (
    roleName?: string | null
): boolean => {
    const normalizedRole = roleName
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    return (
        normalizedRole === "super_admin" ||
        normalizedRole === "company_admin"
    );
};

export const getCompanyId = (req: Request): string | null => {
    return req.user?.companyId ?? null;
};

export const normalizeRoleName = (role?: string | null): string => {
    return role?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
};
