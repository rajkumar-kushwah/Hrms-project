
import { api } from "../api/axios";
import type { UpdateSettingsPayload } from "@/types/settings.types";

export const getSettings = (companyId?: string) =>
    api.get("/settings", {
        params: companyId ? { companyId } : undefined,
    });

export const updateSettings = (
    data: UpdateSettingsPayload,
    companyId?: string
) =>
    api.put(
        "/settings",
        data,
        {
            params: companyId ? { companyId } : undefined,
        }
    );
