import { api } from "@/api/axios";

interface GetAttendanceReportParams {
    month: number;
    year: number;
}
export const getAttendanceReport = async ({month,year,}: GetAttendanceReportParams) => {
    return await api.get(`/attendance-report?month=${month}&year=${year}`);
}