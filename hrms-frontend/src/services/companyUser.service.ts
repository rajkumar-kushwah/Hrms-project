import { api } from "../api/axios";



// getUsers company
// const res = await api.get("/api/users");

export const getCompanyUsers = (companyId?: string) => {
    return api.get("/companyusers", {
        params: companyId ? { companyId } : {},
    });
};

// fatch toggle 
// const res = await api.patch(`/api/users/${user.id}/toggle-status`);

export const toggleUserStatus = (id: number) => {
    return api.patch(`/companyusers/${id}/toggle-status`);
};

// reset password 
//  await api.patch(`/users/${selectedUser.id}/reset-password`, { password: newPassword, });

export const resetUserPassword = (id: number, password: string) => {
    return api.patch(`/companyusers/${id}/reset-password`, { password });
};