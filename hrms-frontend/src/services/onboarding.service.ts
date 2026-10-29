
import { api } from "../api/axios";

export const getOnboardingList = async (
    companyId?: string,
    status?: string
) => {
    const response = await api.get("/onboarding", {
        params: {
            ...(companyId ? { companyId } : {}),
            ...(status && status !== "all" ? { status } : {}),
        },
    });

    return response.data;
};


export const getOnboardingDetail = async (
    userId: string,
    companyId?: string
) => {
    const response = await api.get(`/onboarding/${userId}`, {
        params: companyId ? { companyId } : undefined,
    });

    return response.data;
};

interface StartOnboardingPayload {
    targetDate?: string;
    notes?: string;
}


export const startOnboarding = async (
    userId: string,
    companyId?: string,
    data?: StartOnboardingPayload
) => {
    const response = await api.post(
        `/onboarding/start/${userId}`,
        data ?? {},
        companyId ? { params: { companyId } } : undefined
    );
    return response.data;
};

export const toggleChecklistItem = async (itemId: string, companyId?: string) => {
    const response = await api.patch(`/onboarding/item/${itemId}/toggle`, {
        params: companyId ? { companyId } : undefined,
    });
    return response.data;
};

export const setOnboardingStage = async (
    userId: string,
    stage: string,
    companyId?: string
) => {
    const response = await api.patch(`/onboarding/${userId}/stage`, { stage },
        companyId ? { params: { companyId } } : undefined);
    return response.data;
};

export const setOnboardingStatus = async (
    userId: string,
    status: "IN_PROGRESS" | "ON_HOLD",
    companyId?: string
) => {
    const response = await api.patch(`/onboarding/${userId}/status`, {
        status,
    }, companyId ? { params: { companyId } } : undefined);
    return response.data;
};

export const resetOnboarding = async (userId: string, companyId?: string) => {
    const response = await api.delete(`/onboarding/${userId}/reset`, {
        params: companyId ? { companyId } : undefined,
    });
    return response.data;
};

export const submitChecklistDocument = async (
    itemId: string,
    data: {
        documentUrl?: string;
        documentNumber?: string;
    },
    companyId?: string,
) => {
    const response = await api.post(
        `/onboarding/checklist/${itemId}/submit-document`,
        data,
        companyId ? { params: { companyId } } : undefined
    );
    return response.data;
};

export const uploadOnboardingDocument = async (
    file: File,
    itemId: string,
    companyId?: string
) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(
        `/onboarding/${itemId}/upload-document`,
        formData,
        companyId ? { params: { companyId } } : undefined
    );

    return response.data;
};
