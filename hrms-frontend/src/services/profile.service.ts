import { api } from "@/api/axios";



export const getprofile = () => api.get("/auth/profile");

export const updateProfile = (data: { name?: string }) => api.put("/auth/profile", data);
export const changePassword = (data: { oldPassword: string; newPassword: string }) =>
    api.patch("/auth/profile/change-password", data);

// Upload profile photo
export const uploadProfilePhoto = (file: File) => {
    const formData = new FormData();
    formData.append("profilePhoto", file);

    return api.post("/auth/profile/photo", formData);
};

// Remove profile photo
export const removeProfilePhoto = () =>
    api.delete("/auth/profile/photo");