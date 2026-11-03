import { api } from "@/api/axios";
import type { OvertimeFilters } from "@/types/overtimeReport.types";

export const getOvertimeReport = async (
    filters: OvertimeFilters,
    companyId?: string
) => {
    const response = await api.get("/overtime", {
        params: {
            ...filters,
            ...(companyId ? { companyId } : {}),
        },
    });

    return response.data;
};