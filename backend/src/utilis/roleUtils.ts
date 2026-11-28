
// import type { Request } from "express";

// // ============================================
// // 1. Centralized Role Constants
// // ============================================

// export const ROLES = {
//     SUPER_ADMIN: "super_admin",
//     COMPANY_ADMIN: "company_admin",
//     EMPLOYEE: "employee",
//     HR: "hr",
// } as const;

// // ============================================
// // 2. Role Input Types
// // ============================================

// type RoleInput =
//     | {
//         name?: string | null;
//     }
//     | {
//         role?: {
//             name?: string | null;
//         } | null;
//     }
//     | string
//     | null
//     | undefined;

// // ============================================
// // 3. Normalize Role Name
// // ============================================

// // ============================================
// // 3. Centralized Value Normalization
// // ============================================

// export const normalizeValue = (
//     value?: string | null
// ): string => {
//     return (
//         value
//             ?.trim()
//             .toLowerCase()
//             .replace(/[\s-]+/g, "_") ?? ""
//     );
// };


// // ============================================
// // 4. Normalize Role Name
// // ============================================

// export const normalizeRoleName = (
//     roleName?: string | null
// ): string => {
//     return normalizeValue(roleName);
// };


// // ============================================
// // 5. Get Role Name Centrally
// // ============================================

// export const getRoleName = (
//     input: RoleInput
// ): string => {
//     if (typeof input === "string") {
//         return normalizeRoleName(input);
//     }

//     if (!input) return "";

//     if ("role" in input) {
//         return normalizeRoleName(input.role?.name);
//     }

//     if ("name" in input) {
//         return normalizeRoleName(input.name);
//     }

//     return "";
// };

// export const getUserDisplayName = (
//     user: { name?: string | null } | null | undefined
// ): string => {
//     return user?.name?.trim() || "User";
// };

// // ============================================
// // 6. Centralized Role Checks
// // ============================================

// export const isSuperAdminRole = (
//     input: RoleInput
// ): boolean => {
//     return getRoleName(input) === ROLES.SUPER_ADMIN;
// };

// export const isCompanyAdminRole = (
//     input: RoleInput
// ): boolean => {
//     return getRoleName(input) === ROLES.COMPANY_ADMIN;
// };

// export const isEmployeeRole = (
//     input: RoleInput
// ): boolean => {
//     return getRoleName(input) === ROLES.EMPLOYEE;
// };

// export const isAdminRole = (
//     input: RoleInput
// ): boolean => {
//     return (
//         isSuperAdminRole(input) ||
//         isCompanyAdminRole(input)
//     );
// };

// export const isHRRole = (input: RoleInput): boolean =>
//     getRoleName(input) === ROLES.HR;

// // ============================================
// // 7. Get Company ID
// // ============================================

// export const getCompanyId = (
//     req: Request
// ): string | null => {
//     // Super Admin can access selected company
//     if (isSuperAdminRole(req.user)) {
//         const headerCompanyId = req.headers["x-company-id"];

//         if (
//             typeof headerCompanyId === "string" &&
//             headerCompanyId.trim()
//         ) {
//             return headerCompanyId.trim();
//         }

//         const queryCompanyId = req.query.companyId;

//         if (
//             typeof queryCompanyId === "string" &&
//             queryCompanyId.trim()
//         ) {
//             return queryCompanyId.trim();
//         }

//         return null;
//     }

//     // Other users use their own company
//     return req.user?.companyId ?? null;
// };




import type { Request } from "express";

// ============================================
// 1. Centralized System Constants & Permissions
// ============================================
// ============================================
// 1. Centralized System Constants & Permissions
// ============================================
export const ROLES = {
    SUPER_ADMIN: "super_admin",
    COMPANY_ADMIN: "company_admin",
    HR: "hr",
    EMPLOYEE: "employee",
} as const;

export const SYSTEM_PERMISSIONS = {
    ALL_ACCESS: "*",
    SWITCH_COMPANY: "company:switch",
    MANAGE_COMPANY: "company:manage",
    MANAGE_HR: "hr:manage",
} as const;

export const DEFAULT_ROLES = {
    SUPER_ADMIN: "super_admin",
    COMPANY_ADMIN: "company_admin",
    HR: "hr",
    EMPLOYEE: "employee",
} as const;

// ============================================
// 2. Dynamic Role & Permission Input Types
// ============================================
export interface ModulePermissionObject {
    canView?: boolean;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    module?: {
        name?: string | null;
        [key: string]: any;
    } | null;
}

export interface RoleObject {
    name?: string | null;
    isGlobalAdmin?: boolean;
    // Yeh array string ya aapke relational permission object dono ko support karega
    permissions?: string[] | ModulePermissionObject[] | null;
}

type RoleInput =
    | RoleObject
    | { role?: RoleObject | null }
    | string
    | null
    | undefined;

// ============================================
// 3. Centralized Value Normalization
// ============================================
export const normalizeValue = (value?: string | null): string => {
    return value?.trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "";
};

export const normalizeRoleName = (roleName?: string | null): string => {
    return normalizeValue(roleName);
};

// ============================================
// 4. Extract Role Object & Name Centrally
// ============================================
export const getRoleObject = (input: RoleInput): RoleObject | null => {
    if (!input) return null;
    if (typeof input === "string") return { name: input };
    if ("role" in input && input.role) return input.role;
    if ("name" in input || "permissions" in input || "isGlobalAdmin" in input) {
        return input as RoleObject;
    }
    return null;
};

export const getRoleName = (input: RoleInput): string => {
    if (typeof input === "string") return normalizeRoleName(input);
    const roleObj = getRoleObject(input);
    return normalizeRoleName(roleObj?.name);
};

export const getUserDisplayName = (
    user: { name?: string | null } | null | undefined
): string => {
    return user?.name?.trim() || "User";
};

// ============================================
// 5. Dynamic Permission & Role Checks
// ============================================

/**
 * Relational permissions check (Support both string array & Prisma module relation format)
 * @param input User or Role object
 * @param requiredModule E.g. "employees", "payroll", "attendance"
 * @param action E.g. "view", "create", "edit", "delete"
 */

export const hasModulePermission = (
    input: RoleInput,
    requiredModule: string,
    action: "view" | "create" | "edit" | "delete" = "view"
): boolean => {
    const roleObj = getRoleObject(input);

    if (!roleObj?.permissions || !Array.isArray(roleObj.permissions)) {
        return false;
    }

    const normalizedTargetModule = normalizeValue(requiredModule);

    return roleObj.permissions.some((permission) => {
        if (
            typeof permission !== "object" ||
            permission === null ||
            !permission.module
        ) {
            return false;
        }

        const moduleName = normalizeValue(permission.module.name);

        if (moduleName !== normalizedTargetModule) {
            return false;
        }

        switch (action) {
            case "view":
                return Boolean(permission.canView);
            case "create":
                return Boolean(permission.canCreate);
            case "edit":
                return Boolean(permission.canEdit);
            case "delete":
                return Boolean(permission.canDelete);
            default:
                return false;
        }
    });
};


// Legacy permission check wrapper for string-based checks

export const hasPermission = (
    input: RoleInput,
    requiredPermission: string
): boolean => {
    const roleObj = getRoleObject(input);

    if (!roleObj?.permissions || !Array.isArray(roleObj.permissions)) {
        return false;
    }

    return roleObj.permissions.some(
        (permission) =>
            typeof permission === "string" &&
            permission === requiredPermission
    );
};


// Super Admin Check
export const isSuperAdminRole = (input: RoleInput): boolean => {
    const roleObj = getRoleObject(input);
    if (roleObj?.isGlobalAdmin) return true;

    const roleName = getRoleName(input);
    return (
        roleName === DEFAULT_ROLES.SUPER_ADMIN ||
        roleName === "superadmin" ||
        roleName === "administrator"
    );
};

// Company Admin Check
export const isCompanyAdminRole = (input: RoleInput): boolean => {
    if (isSuperAdminRole(input)) return true;

    const roleName = getRoleName(input);

    return (
        roleName === DEFAULT_ROLES.COMPANY_ADMIN ||
        roleName === "companyadmin" ||
        roleName === "admin"
    );
};

// HR Role Check
export const isHRRole = (input: RoleInput): boolean => {
    if (isCompanyAdminRole(input)) return true;

    const roleName = getRoleName(input);
    return roleName === DEFAULT_ROLES.HR || roleName === "human_resources";
};

// Employee Role Check
export const isEmployeeRole = (input: RoleInput): boolean => {
    const roleName = getRoleName(input);
    return roleName === DEFAULT_ROLES.EMPLOYEE || roleName === "staff";
};

// General Admin Check
export const isAdminRole = (input: RoleInput): boolean => {
    return isSuperAdminRole(input) || isCompanyAdminRole(input);
};

// Dynamic Role Matcher
export const hasRole = (input: RoleInput, targetRole: string): boolean => {
    return getRoleName(input) === normalizeRoleName(targetRole);
};

// ============================================
// 6. Dynamic Get Company ID
// ============================================
// export const getCompanyId = (req: Request): string | null => {
//     const canSwitchCompany = isSuperAdminRole(req.user);

//     if (canSwitchCompany) {
//         const headerCompanyId = req.headers["x-company-id"];
//         if (typeof headerCompanyId === "string" && headerCompanyId.trim()) {
//             return headerCompanyId.trim();
//         }

//         const queryCompanyId = req.query.companyId;
//         if (typeof queryCompanyId === "string" && queryCompanyId.trim()) {
//             return queryCompanyId.trim();
//         }

//         return null;
//     }

//     return req.user?.companyId ?? null;
// };



export const getCompanyId = (req: Request): string | null => {
    // Super Admin can access the company selected in the frontend
    if (isSuperAdminRole(req.user)) {
        const headerCompanyId = req.headers["x-company-id"];

        if (typeof headerCompanyId === "string" && headerCompanyId.trim()) {
            return headerCompanyId.trim();
        }

        const queryCompanyId = req.query.companyId;

        if (typeof queryCompanyId === "string" && queryCompanyId.trim()) {
            return queryCompanyId.trim();
        }

        return null;
    }

    // Other users must use their assigned company
    return req.user?.companyId ?? null;
};
