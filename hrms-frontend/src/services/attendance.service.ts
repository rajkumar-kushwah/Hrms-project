import { api } from "@/api/axios";


// punch-in
export const punchIn = (data: { latitude: number; longitude: number }) => api.post("/attendance/punch-in", data);

// punch-out
export const punchOut = (data: { latitude: number; longitude: number }) => api.post("/attendance/punch-out", data);

// get today attendance
export const getTodayAttendance = (companyId?: string) => api.get("/attendance/today", { params: { companyId } });

// get my attendance history
export const getMyAttendance = (month?: number, year?: number, companyId?: string) => api.get("/attendance/my-history", { params: { month, year, companyId } });

// get all attendance history
export const getAllAttendance = (date?: string, companyId?: string) => api.get("/attendance/all", { params: { date, companyId } });

// get live attendance
export const getLiveAttendance = (companyId?: string) => api.get("/attendance/live", { params: { companyId } });

//  monthly attendance
export const getEmployeeAttendance = (
    userId: string,
    month?: number,
    year?: number,
    companyId?: string
) =>
    api.get(`/attendance/employee/${userId}`, {
        params: {
            month,
            year,
            ...(companyId ? { companyId } : {}),
        },
    });

// Monthly attendance sheet
export const getMonthlyAttendanceSheet = (
    month: number,
    year: number,
    companyId?: string
) =>
    api.get("/attendance/monthly-sheet", {
        params: {
            month,
            year,
            ...(companyId ? { companyId } : {}),
        },
    });

export const getEmployeeBasicInfo = (userId: string, companyId?: string) =>
    api.get(`/employees/${userId}/basic-info`, { params: { companyId } });