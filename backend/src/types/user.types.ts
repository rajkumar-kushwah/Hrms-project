export interface AuthenticatedUser {
    id: string;
    companyId: string | null;
    role?: {
        name: string;
    } | null;
}