
// ─────────────────────────────────────────────
// Role Constants - Single Source of Truth
// ─────────────────────────────────────────────

export const ROLES = {
    SUPER_ADMIN: "super_admin",
    COMPANY_ADMIN: "company_admin",
    EMPLOYEE: "employee",
} as const;


// ─────────────────────────────────────────────
// Role Input Type
// ─────────────────────────────────────────────

type RoleInput =
    | string
    | { name?: string | null }
    | { role?: { name?: string | null } | null }
    | null
    | undefined;


// ─────────────────────────────────────────────
// Normalize Role Name
// ─────────────────────────────────────────────

export const normalizeRole = (role?: string | null): string => {
    return (
        role
            ?.trim()
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/_+/g, "_") ?? ""
    );
};


// ─────────────────────────────────────────────
// Get Role Name - Single Source of Truth
// ─────────────────────────────────────────────

export const getRoleName = (input: RoleInput): string => {
    if (typeof input === "string") {
        return normalizeRole(input);
    }

    if (!input) {
        return "";
    }

    if ("role" in input) {
        return normalizeRole(input.role?.name);
    }

    if ("name" in input) {
        return normalizeRole(input.name);
    }

    return "";
};


// ─────────────────────────────────────────────
// Role Comparisons
// ─────────────────────────────────────────────

export const isSuperAdminRole = (input: RoleInput): boolean => {
    return getRoleName(input) === ROLES.SUPER_ADMIN;
};

export const isCompanyAdminRole = (input: RoleInput): boolean => {
    return getRoleName(input) === ROLES.COMPANY_ADMIN;
};

export const isAdminRole = (input: RoleInput): boolean => {
    return (
        isSuperAdminRole(input) ||
        isCompanyAdminRole(input)
    );
};

// Existing behavior preserved:
// Every non-empty non-admin role is treated as employee category.

export const isEmployeeRole = (input: RoleInput): boolean => {
    const roleName = getRoleName(input);

    return !!roleName && !isAdminRole(roleName);
};

export const formatRole = (
    input: RoleInput,
    fallback = "—"
): string => {
    const roleName = getRoleName(input);

    if (!roleName) return fallback;

    switch (normalizeRole(roleName)) {
        case "superadmin":
        case ROLES.SUPER_ADMIN:
            return "Super Admin";

        case "admin":
        case "companyadmin":
        case ROLES.COMPANY_ADMIN:
            return "Admin";

        case ROLES.EMPLOYEE:
            return "Employee";

        default:
            return roleName
                .split("_")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
    }
};

export const getRoleRawName = (input: RoleInput): string => {
    if (typeof input === "string") return input.trim();

    if (!input) return "";

    if ("role" in input) return input.role?.name?.trim() ?? "";

    if ("name" in input) return input.name?.trim() ?? "";

    return "";
};

export const getUserName = (
    user: {
        name?: string | null;
    } | null | undefined,
    fallback = "User"
): string => {
    return user?.name?.trim() || fallback;
};

export const getUserRole = (
    user: {
        role?: { name?: string | null } | null;
    } | null | undefined
): string => {
    return normalizeRole(user?.role?.name);
};

export const getUserModulePermission = (
    user: {
        role?: {
            permissions?: {
                module: {
                    name: string;
                };
                canView: boolean;
                canCreate: boolean;
                canEdit: boolean;
                canDelete: boolean;
            }[];
        } | null;
    } | null | undefined,
    moduleName: string
) => {
    return user?.role?.permissions?.find(
        (permission) => permission.module.name === moduleName
    );
};