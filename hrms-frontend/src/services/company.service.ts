import { api } from "../api/axios";
import type { CreateCompanyPayload, UpdateCompanyPayload, AssignAdminPayload } from "@/types/company.types";

export const getCompanies = (companyId?: string) => {
  return api.get("/company",{params:companyId && {companyId}});
};

export const createCompany = (data: CreateCompanyPayload,companyId?: string) => {
  return api.post("/company", data,{params:companyId && {companyId}});
};

export const updateCompany = (id: string, data: UpdateCompanyPayload,companyId?: string) => {
  return api.put(`/company/${id}`, data,{params:companyId && {companyId}});
};

export const getCompanyById = (id: string,companyId?: string) => {
  return api.get(`/company/${id}`,{params:companyId && {companyId}});
};

// delete company
export const deactivateCompany = (id: string,companyId?: string) => api.delete(`/company/${id}`,{params:companyId && {companyId}});

// permanent delete
export const permanentDeleteCompany = (id: string,companyId?: string) => api.delete(`/company/${id}/permanent`,{params:companyId && {companyId}});

// me company
export const getMyCompany = (companyId?: string) => {
  return api.get("/company/me",{params:companyId && {companyId}});
};

export const assignCompanyAdmin = ( companyId: string, data: AssignAdminPayload) => {
  return api.post(`/company/${companyId}/assign-admin`, data);
};

export const activateCompany = (id: string) => {
  return api.patch(`/company/${id}/activate`);
};