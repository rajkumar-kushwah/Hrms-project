// auth.types.ts

export interface SigninRequest {
    email: string;
    password: string;
}

export interface SigninResponse {
    success: boolean;
    message: string;
    data: User;
}

export interface User {

    id: number;
    name: string;
    email: string;
    profilePhoto?: string | null;
    profilePhotoId?: string | null;
    role?: Role;
    avatar?: string;
    companyId?: number | null;
    company?: {
        id: number;
        name: string
        permissions: Permission[]
    } | null;
    createdByUser?: {   // Add karo
        id: string;
        name: string;
    } | null;

    lastLogin?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}


// store/auth.store.ts
interface Permission {
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    module: {
        id: number;
        name: string;
        displayName: string;
        icon: string;
        url: string;
        parentId: number | null;
        order: number;
    };
}

interface Role {
    id: number;
    name: string;
    isSystemRole: boolean;
    permissions: Permission[];
}