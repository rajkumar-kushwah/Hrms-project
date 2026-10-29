import { api } from "@/api/axios";

// payrollreport.service.ts

export const getMonthlyPayrollReport = (
    month: number,
    year: number,
    companyId?: string
) =>
    api.get("/payroll-report", {
        params: {
            month,
            year,
            ...(companyId ? { companyId } : {}),
        },
    });