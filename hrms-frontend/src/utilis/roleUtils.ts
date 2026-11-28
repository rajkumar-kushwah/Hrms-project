// ─────────────────────────────────────────────────────────────
// 1. Interfaces & Types (Single Source of Truth)
// ─────────────────────────────────────────────────────────────

export interface ModulePermission {
    module: {
        name: string;
    };
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

export interface RoleObject {
    name?: string | null;
    isGlobalAdmin?: boolean;
    permissions?: ModulePermission[];
}

export interface UserObject {
    name?: string | null;
    role?: RoleObject | null;
    companyId?: string | number | null;

    createdByUser?: {
        name?: string | null;
        role?: RoleObject | null;
    } | null;

    [key: string]: any;
}

export type RoleInput =
    | string
    | RoleObject
    | UserObject
    | { role?: RoleObject | null }
    | null
    | undefined;

// ─────────────────────────────────────────────
// Normalize Name / String Helper
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
// Get Role Object & Name Helpers
// ─────────────────────────────────────────────

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
    if (typeof input === "string") {
        return normalizeRole(input);
    }
    const roleObj = getRoleObject(input);
    return normalizeRole(roleObj?.name);
};

// ─────────────────────────────────────────────
// Dynamic Role Checks (Purely Based on Flags & Scope)
// ─────────────────────────────────────────────

// Global Super Admin check: Jo system level par hai (jiska companyId null/undefined hai ya isGlobalAdmin true hai)
export const isSuperAdminRole = (input: RoleInput): boolean => {
    if (!input) return false;

    // 1. Agar input seedha string hai (jaise "super_admin")
    if (typeof input === "string") {
        const norm = normalizeRole(input);
        return norm === "super_admin" || norm === "superadmin" || norm === "administrator";
    }

    const roleObj = getRoleObject(input);

    // 2. Agar explicit flag true hai
    if (roleObj?.isGlobalAdmin) return true;

    // 3. Agar companyId null, undefined, ya empty string hai aur role maujood hai
    if ("companyId" in input && (input.companyId === null || input.companyId === undefined || input.companyId === "")) {
        if (roleObj) return true;
    }

    // 4. Role name ke base par check karein (Database se aaye hue naam ke liye)
    const roleName = getRoleName(input);
    return (
        roleName === "super_admin" ||
        roleName === "superadmin" ||
        roleName === "administrator"
    );
};

// Company Admin check: Jo kisi company ke andar admin hai (jiske paas companyId hai aur roles ya company modules ki permissions hain)
export const isCompanyAdminRole = (input: RoleInput): boolean => {
    if (isSuperAdminRole(input)) return true;

    // Hardcoded naam check karne ke bajaye, permissions ke base par company management check kar lo
    return (
        getUserModulePermission(input, "roles", "canView") ||
        getUserModulePermission(input, "company", "canView")
    );
};

export const isAdminRole = (input: RoleInput): boolean => {
    return isSuperAdminRole(input) || isCompanyAdminRole(input);
};

export const isEmployeeRole = (input: RoleInput): boolean => {
    return !isAdminRole(input);
};

// get company name profile me 
export const getCreatedByRole = (
    user: UserObject | null | undefined
): string => {
    return formatRole(user?.createdByUser?.role);
};

// ─────────────────────────────────────────────
// Formatting & User Info Helpers (Purely Dynamic)
// ─────────────────────────────────────────────

export const formatRole = (
    input: RoleInput,
    fallback = "—"
): string => {
    const roleObj = getRoleObject(input);
    const rawName = roleObj?.name?.trim();

    if (!rawName) return fallback;

    // Database se jo bhi naam aaye (jaise "Admin", "HR Manager", "Custom Role"),
    // use automatically clean karke Capitalize kar dega bina kisi switch case ke.
    return rawName
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
};

export const getRoleRawName = (input: RoleInput): string => {
    const roleObj = getRoleObject(input);
    return roleObj?.name?.trim() ?? "";
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

// ─────────────────────────────────────────────────────────────
// Universal Dynamic Module Permission Check
// ─────────────────────────────────────────────────────────────

// export const getUserModulePermission = (
//     user: RoleInput,
//     moduleName: string,
//     action: "canView" | "canCreate" | "canEdit" | "canDelete" = "canView"
// ): boolean => {
//     // 1. Agar user Super Admin hai, toh sab kuch allow karo
//     if (isSuperAdminRole(user)) {
//         return true;
//     }

//     const roleObj = getRoleObject(user);
//     const permissions = roleObj?.permissions;

//     if (!permissions || !Array.isArray(permissions)) {
//         return false;
//     }

//     // 2. Database ke module name ke sath dynamic match karein (Case-insensitive)
//     const targetModule = moduleName.trim().toLowerCase();
//     const modulePermission = permissions.find(
//         (permission) => permission?.module?.name?.trim().toLowerCase() === targetModule
//     );

//     if (!modulePermission) {
//         return false;
//     }

//     // 3. Action boolean return karein
//     return Boolean(modulePermission[action]);
// };


export const getUserModulePermission = (
    user: RoleInput,
    moduleName: string,
    action: "canView" | "canCreate" | "canEdit" | "canDelete"
): boolean => {
    const roleObj = getRoleObject(user);
    const permissions = roleObj?.permissions;

    if (!Array.isArray(permissions)) {
        return false;
    }

    const targetModule = moduleName.trim().toLowerCase();

    const modulePermission = permissions.find(
        (permission) =>
            permission?.module?.name?.trim().toLowerCase() === targetModule
    );

    return modulePermission?.[action] === true;
};

// ============================================
// Universal Page / Module Permission Helpers
// ============================================

export const canViewModule = (user: RoleInput, moduleName: string): boolean => {
    return getUserModulePermission(user, moduleName, "canView");
};

export const canCreateInModule = (user: RoleInput, moduleName: string): boolean => {
    return getUserModulePermission(user, moduleName, "canCreate");
};

export const canEditInModule = (user: RoleInput, moduleName: string): boolean => {
    return getUserModulePermission(user, moduleName, "canEdit");
};

export const canDeleteInModule = (user: RoleInput, moduleName: string): boolean => {
    return getUserModulePermission(user, moduleName, "canDelete");
};

export const canModifyModule = (user: RoleInput, moduleName: string): boolean => {
    return (
        getUserModulePermission(user, moduleName, "canCreate") ||
        getUserModulePermission(user, moduleName, "canEdit") ||
        getUserModulePermission(user, moduleName, "canDelete")
    );
};