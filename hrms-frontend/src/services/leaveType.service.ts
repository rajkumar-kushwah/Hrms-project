// leaveType.service.ts
import { api } from "../api/axios";
import type { UpdateLeaveTypePayload, CreateLeaveTypePayload } from "@/types/leave.types";

export const getLeaveTypes = (companyId?: string | null) => 
    api.get("/leave-type", {
        params: companyId ? { companyId } : {},
    });
    
export const createLeaveType = (data: CreateLeaveTypePayload, companyId?: string | null) => api.post("/leave-type", data, {
    params: companyId ? { companyId } : {},
});

export const updateLeaveType = (id: string, data: UpdateLeaveTypePayload, companyId?: string | null) => api.put(`/leave-type/${id}`, data, {
    params: companyId ? { companyId } : {},
});

export const deleteLeaveType = (id: string, companyId?: string | null) => api.delete(`/leave-type/${id}`, {
    params: companyId ? { companyId } : {},
});