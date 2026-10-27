import { api } from "../api/axios";

import type {
    CreateHolidayPayload,
    UpdateHolidayPayload,
} from "@/types/holiday.types";

// Get all holidays
export const getHolidays = (companyId?: string) => {
    return api.get("/holidays", {
        headers: companyId
            ? { "x-company-id": companyId }
            : {},
    });
};

export const createHoliday = (
    data: CreateHolidayPayload,
    companyId?: string
) => {
    return api.post("/holidays", data, {
        headers: companyId
            ? { "x-company-id": companyId }
            : {},
    });
};

export const updateHoliday = (
    id: string,
    data: UpdateHolidayPayload,
    companyId?: string
) => {
    return api.put(`/holidays/${id}`, data, {
        headers: companyId
            ? { "x-company-id": companyId }
            : {},
    });
};

export const deactivateHoliday = (
    id: string,
    companyId?: string
) => {
    return api.patch(`/holidays/${id}/deactivate`, {}, {
        headers: companyId
            ? { "x-company-id": companyId }
            : {},
    });
};

export const activateHoliday = (
    id: string,
    companyId?: string
) => {
    return api.patch(`/holidays/${id}/activate`, {}, {
        headers: companyId
            ? { "x-company-id": companyId }
            : {},
    });
};