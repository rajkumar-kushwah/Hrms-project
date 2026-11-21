import { api } from "@/api/axios";


import { type SigninRequest } from "@/types/auth.types";


// signin user
export const signinUser = async (data: SigninRequest) => { const response = await api.post("/auth/signin", data); return response.data }


// Get logged-in user profile
export const getprofile = async () => {
    const response = await api.get("/auth/profile");
    return response.data;
};

// logout user
export const LogoutUser = async () => { const response = await api.post("/auth/logout"); return response.data }