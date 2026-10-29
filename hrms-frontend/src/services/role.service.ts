import { api } from "../api/axios";
import type { CreateRolePayload, UpdateRolePayload } from "@/types/role.types";

// Get All Roles
export const getRoles = (companyId?: string) => {
  return api.get("/roles", {
    params: companyId ? { companyId } : {},
  });
};

// Get Modules
export const getModules = (companyId?: string) => {
  return api.get("/roles/modules", {
    params: companyId ? { companyId } : {},
  });
};

// Get Role By Id
export const getRoleById = (id: number, companyId?: string) => {
  return api.get(`/roles/${id}`, { params: companyId ? { companyId } : {} });
};

// Create Role
export const createRole = (data: CreateRolePayload) => {
  return api.post("/roles", data);
};

// Update Role
export const updateRole = (
  id: number,
  data: UpdateRolePayload
) => {
  return api.put(`/roles/${id}`, data);
};

// Delete Role
export const deleteRole = (id: number) => {
  return api.delete(`/roles/${id}`);
};