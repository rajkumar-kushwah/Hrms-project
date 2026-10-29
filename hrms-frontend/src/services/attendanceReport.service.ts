
import { api } from "@/api/axios";

interface GetAttendanceReportParams {
    month: number;
    year: number;
    companyId?: string;
}

export const getAttendanceReport = async ({
    month,
    year,
    companyId,
}: GetAttendanceReportParams) => {
    return await api.get("/attendance-report", {
        params: {
            month,
            year,
            ...(companyId ? { companyId } : {}),
        },
    });
};
