import { api } from "../api/axios";
import type { CreateEmployeePayload, UpdateEmployeePayload } from "@/types/employee.types";

export const getEmployees = (companyId?: string) => api.get("/employee", {
    params: companyId ? { companyId } : {},
});
export const getEmployeeById = (id: string, companyId?: string) => api.get(`/employee/${id}`, {
    params: companyId ? { companyId } : {},
});
export const createEmployee = (data: CreateEmployeePayload, companyId?: string) => api.post("/employee", data, {
    params: companyId ? { companyId } : {},
});
export const updateEmployee = (
    id: string,
    data: UpdateEmployeePayload,
    companyId?: string
) =>
    api.put(`/employee/${id}`, data, {
        params: companyId ? { companyId } : {},
        headers: companyId
            ? { "x-company-id": companyId }
            : {},
    });

export const deleteEmployee = (id: string) => api.delete(`/employee/${id}`);

export const resetEmployeePassword = (id: string, password: string) =>
    api.patch(`/employee/${id}/reset-password`, { password });