// import type { Request } from "express";

// export const isSuperAdminRole = (
//     roleName?: string | null
// ): boolean => {
//     return roleName
//         ?.trim()
//         .toLowerCase()
//         .replace(/\s+/g, "_") === "super_admin";
// };

// export const isAdminRole = (
//     roleName?: string | null
// ): boolean => {
//     const normalizedRole = roleName
//         ?.trim()
//         .toLowerCase()
//         .replace(/\s+/g, "_");

//     return (
//         normalizedRole === "super_admin" ||
//         normalizedRole === "company_admin"
//     );
// };

// // export const getCompanyId = (req: Request): string | null => {
// //     return req.user?.companyId ?? null;
// // };

// export const normalizeRoleName = (role?: string | null): string => {
//     return role?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
// };


// export const getCompanyId = (req: Request): string | null => {
//     const roleName = normalizeRoleName(req.user?.role?.name);

//     if (roleName === "super_admin") {
//         const selectedCompanyId = req.headers["x-company-id"];

//         if (
//             typeof selectedCompanyId === "string" &&
//             selectedCompanyId.trim()
//         ) {
//             return selectedCompanyId.trim();
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

//     return req.user?.companyId ?? null;
// }; 






import type { Request } from "express";

// Centralized role constants
export const ROLES = {
    SUPER_ADMIN: "super_admin",
    COMPANY_ADMIN: "company_admin",
    EMPLOYEE: "employee",
} as const;

// Normalize role name
export const normalizeRoleName = (
    role?: string | null
): string => {
    return role
        ?.trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_") ?? "";
};

// Check Super Admin
export const isSuperAdminRole = (
    roleName?: string | null
): boolean => {
    return normalizeRoleName(roleName) === ROLES.SUPER_ADMIN;
};

// Check Company Admin
export const isCompanyAdminRole = (
    roleName?: string | null
): boolean => {
    return normalizeRoleName(roleName) === ROLES.COMPANY_ADMIN;
};

// Check Admin (Super Admin + Company Admin)
export const isAdminRole = (
    roleName?: string | null
): boolean => {
    const role = normalizeRoleName(roleName);

    return (
        role === ROLES.SUPER_ADMIN ||
        role === ROLES.COMPANY_ADMIN
    );
};

// Check Employee
export const isEmployeeRole = (
    roleName?: string | null
): boolean => {
    return normalizeRoleName(roleName) === ROLES.EMPLOYEE;
};

// Get company ID according to logged-in user's role
export const getCompanyId = (
    req: Request
): string | null => {
    const roleName = normalizeRoleName(req.user?.role?.name);

    // Super Admin can access selected company
    if (isSuperAdminRole(roleName)) {
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

    // Company Admin / Employee: use their own company
    return req.user?.companyId ?? null;
};
