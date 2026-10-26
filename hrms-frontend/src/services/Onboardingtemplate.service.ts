// // services/onboardingTemplate.service.ts
// import { api } from "../api/axios";

// export const getChecklistTemplates = () =>
//     api.get("/onboarding-template");

// export const createChecklistItem = (data: {
//     stage: string;
//     title: string;
//     description?: string;
//     isRequired?: boolean;
//     requiresDocument?: boolean;
// }) => api.post("/onboarding-template", data);

// export const updateChecklistItem = (
//     id: string,
//     data: {
//         title?: string;
//         description?: string;
//         isRequired?: boolean;
//         requiresDocument?: boolean;
//     }
// ) => api.patch(`/onboarding-template/${id}`, data);

// export const deleteChecklistItem = (id: string) =>
//     api.delete(`/onboarding-template/${id}`);

// export const reorderChecklistItems = (stage: string, orderedIds: string[]) =>
//     api.post("/onboarding-template/reorder", { stage, orderedIds });


// services/Onboardingtemplate.service.ts
import { api } from "../api/axios";

export interface CompanyOption {
    id: string;
    name: string;
}

export interface ChecklistItemPayload {
    title?: string;
    description?: string;
    isRequired?: boolean;
    requiresDocument?: boolean;
    documentInputType?: "FILE_UPLOAD" | "DOCUMENT_NUMBER" | "EITHER" | null;
}

export const getCompaniesForChecklist = () =>
    api.get("/company");

export const getChecklistTemplates = (companyId?: string) =>
    api.get("/onboarding-template", {
        params: companyId ? { companyId } : {},
    });

export const createChecklistItem = (
    data: ChecklistItemPayload & {
        stage: string;
        companyId?: string;
    }
) => api.post("/onboarding-template", data);

export const updateChecklistItem = (
    id: string,
    data: ChecklistItemPayload & {
        companyId?: string;
    }
) => api.patch(`/onboarding-template/${id}`, data);

export const deleteChecklistItem = (
    id: string,
    companyId?: string
) =>
    api.delete(`/onboarding-template/${id}`, {
        params: companyId ? { companyId } : {},
    });

export const reorderChecklistItems = (
    stage: string,
    orderedIds: string[],
    companyId?: string
) =>
    api.post("/onboarding-template/reorder", {
        stage,
        orderedIds,
        ...(companyId ? { companyId } : {}),
    });