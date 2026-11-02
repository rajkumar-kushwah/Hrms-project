import { api } from "@/api/axios";
import type {
    LeaveReportResponse,
    LeaveReportFilters,
} from "@/types/leaveReport.types";

type ApiResponse<T> = {
    success: boolean;
    message: string;
    data: T;
};

export const getLeaveReport = async (
    filters: LeaveReportFilters,
    companyId?: string | null
): Promise<LeaveReportResponse> => {
    const response = await api.get<ApiResponse<LeaveReportResponse>>(
        "/leave-report",
        {
            params: {
                ...filters,
                ...(companyId ? { companyId } : {}),
            },
        }
    );

    return response.data.data;
};