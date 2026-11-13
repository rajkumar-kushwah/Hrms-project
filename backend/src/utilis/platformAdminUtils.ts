
type PlatformAdminUser = {
    id?: string | null;
} | null | undefined;

export const isTrustedPlatformAdmin = (
    user: PlatformAdminUser
): boolean => {
    const trustedAdminId =
        process.env.TRUSTED_PLATFORM_ADMIN_USER_ID?.trim();

    if (!trustedAdminId || !user?.id) {
        return false;
    }

    return user.id === trustedAdminId;
};
