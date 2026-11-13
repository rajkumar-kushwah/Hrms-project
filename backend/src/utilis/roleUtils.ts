

// import type { Request } from "express";

// // Centralized role constants
// export const ROLES = {
//     SUPER_ADMIN: "super_admin",
//     COMPANY_ADMIN: "company_admin",
//     EMPLOYEE: "employee",
// } as const;

// // Normalize role name
// export const normalizeRoleName = (
//     role?: string | null
// ): string => {
//     return role
//         ?.trim()
//         .toLowerCase()
//         .replace(/[\s-]+/g, "_") ?? "";
// };

// // Check Super Admin
// export const isSuperAdminRole = (
//     roleName?: string | null
// ): boolean => {
//     return normalizeRoleName(roleName) === ROLES.SUPER_ADMIN;
// };

// // Check Company Admin
// export const isCompanyAdminRole = (
//     roleName?: string | null
// ): boolean => {
//     return normalizeRoleName(roleName) === ROLES.COMPANY_ADMIN;
// };

// // Check Admin (Super Admin + Company Admin)
// export const isAdminRole = (
//     roleName?: string | null
// ): boolean => {
//     const role = normalizeRoleName(roleName);

//     return (
//         role === ROLES.SUPER_ADMIN ||
//         role === ROLES.COMPANY_ADMIN
//     );
// };

// // Check Employee
// export const isEmployeeRole = (
//     roleName?: string | null
// ): boolean => {
//     return normalizeRoleName(roleName) === ROLES.EMPLOYEE;
// };

// // Get company ID according to logged-in user's role
// export const getCompanyId = (
//     req: Request
// ): string | null => {
//     const roleName = normalizeRoleName(req.user?.role?.name);

//     // Super Admin can access selected company
//     if (isSuperAdminRole(roleName)) {
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

//     // Company Admin / Employee: use their own company
//     return req.user?.companyId ?? null;
// };





import type { Request } from "express";

// ============================================
// 1. Centralized Role Constants
// ============================================

export const ROLES = {
    SUPER_ADMIN: "super_admin",
    COMPANY_ADMIN: "company_admin",
    EMPLOYEE: "employee",
    HR: "hr",
} as const;

// ============================================
// 2. Role Input Types
// ============================================

type RoleInput =
    | {
        name?: string | null;
    }
    | {
        role?: {
            name?: string | null;
        } | null;
    }
    | string
    | null
    | undefined;

// ============================================
// 3. Normalize Role Name
// ============================================

// ============================================
// 3. Centralized Value Normalization
// ============================================

export const normalizeValue = (
    value?: string | null
): string => {
    return (
        value
            ?.trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_") ?? ""
    );
};


// ============================================
// 4. Normalize Role Name
// ============================================

export const normalizeRoleName = (
    roleName?: string | null
): string => {
    return normalizeValue(roleName);
};


// ============================================
// 5. Get Role Name Centrally
// ============================================

export const getRoleName = (
    input: RoleInput
): string => {
    if (typeof input === "string") {
        return normalizeRoleName(input);
    }

    if (!input) return "";

    if ("role" in input) {
        return normalizeRoleName(input.role?.name);
    }

    if ("name" in input) {
        return normalizeRoleName(input.name);
    }

    return "";
};

export const getUserDisplayName = (
    user: { name?: string | null } | null | undefined
): string => {
    return user?.name?.trim() || "User";
};

// ============================================
// 6. Centralized Role Checks
// ============================================

export const isSuperAdminRole = (
    input: RoleInput
): boolean => {
    return getRoleName(input) === ROLES.SUPER_ADMIN;
};

export const isCompanyAdminRole = (
    input: RoleInput
): boolean => {
    return getRoleName(input) === ROLES.COMPANY_ADMIN;
};

export const isEmployeeRole = (
    input: RoleInput
): boolean => {
    return getRoleName(input) === ROLES.EMPLOYEE;
};

export const isAdminRole = (
    input: RoleInput
): boolean => {
    return (
        isSuperAdminRole(input) ||
        isCompanyAdminRole(input)
    );
};

export const isHRRole = (input: RoleInput): boolean =>
    getRoleName(input) === ROLES.HR;

// ============================================
// 7. Get Company ID
// ============================================

export const getCompanyId = (
    req: Request
): string | null => {
    // Super Admin can access selected company
    if (isSuperAdminRole(req.user)) {
        const headerCompanyId = req.headers["x-company-id"];

        if (
            typeof headerCompanyId === "string" &&
            headerCompanyId.trim()
        ) {
            return headerCompanyId.trim();
        }

        const queryCompanyId = req.query.companyId;

        if (
            typeof queryCompanyId === "string" &&
            queryCompanyId.trim()
        ) {
            return queryCompanyId.trim();
        }

        return null;
    }

    // Other users use their own company
    return req.user?.companyId ?? null;
};



// import type { Request, Response, NextFunction } from "express";
// import { SystemRoleKey } from "@prisma/client";

// export type PermissionAction =
//     | "canView"
//     | "canCreate"
//     | "canEdit"
//     | "canDelete";

// type Permission = {
//     module: {
//         name: string;
//     };
//     canView: boolean;
//     canCreate: boolean;
//     canEdit: boolean;
//     canDelete: boolean;
// };

// type UserLike = {
//     companyId?: string | null;
//     role?: {
//         systemKey?: SystemRoleKey | null;
//         permissions?: Permission[];
//     } | null;
// } | null | undefined;

// const getSystemKey = (user: UserLike) =>
//     user?.role?.systemKey ?? null;

// export const isSuperAdmin = (user: UserLike): boolean =>
//     getSystemKey(user) === SystemRoleKey.SUPER_ADMIN;

// export const isCompanyAdmin = (user: UserLike): boolean =>
//     getSystemKey(user) === SystemRoleKey.COMPANY_ADMIN;

// export const isAdmin = (user: UserLike): boolean =>
//     isSuperAdmin(user) || isCompanyAdmin(user);

// export const hasPermission = (
//     user: UserLike,
//     moduleName: string,
//     action: PermissionAction
// ): boolean => {
//     if (!user) return false;

//     // Company Admin gets full access within their company.
//     if (isCompanyAdmin(user)) return true;

//     return (
//         user.role?.permissions?.some(
//             (permission) =>
//                 permission.module.name === moduleName &&
//                 permission[action]
//         ) ?? false
//     );
// };

// export const getTenantId = (req: Request): string | null =>
//     req.user?.companyId ?? null;

// export const requireTenant = (
//     req: Request,
//     res: Response,
//     next: NextFunction
// ) => {
//     if (!req.user?.companyId) {
//         return res.status(403).json({
//             success: false,
//             message: "Company access is not available for this account.",
//         });
//     }

//     next();
// };
