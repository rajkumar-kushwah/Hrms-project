import { api } from "../api/axios";
import type { CreateBranchPayload, UpdateBranchPayload } from "@/types/branch.types";

// create branch
export const createBranch = (data: CreateBranchPayload, companyId?: string) => api.post("/branch", data, { params: { companyId } });


// get all branches
export const getBranches = (companyId?: string) => {
    return api.get("/branch", {
        params: companyId ? { companyId } : {},
    });
};

// get single branch
export const getBranchById = (id: string, companyId?: string) => api.get(`/branch/${id}`, { params: { companyId } });


// update branch
export const updateBranch = (id: string, data: UpdateBranchPayload, companyId?: string) => api.put(`/branch/${id}`, data, { params: { companyId } });

// delete branch
export const deleteBranch = (id: string, companyId?: string) => api.delete(`/branch/${id}`, { params: { companyId } });

// permanent delete branch
export const permanentDeleteBranch = (id: string, companyId?: string) => api.delete(`/branch/${id}/permanent`, { params: { companyId } });

// get geo fencing
export const getGeoFencingOverview = (companyId?: string) => api.get("/branch/geo-fencing/overview", { params: { companyId } });
