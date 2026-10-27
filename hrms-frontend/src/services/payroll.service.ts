
// payroll.service.ts
import { api } from "../api/axios";

// const getCompanyConfig = (companyId?: string) => ({
//     params: companyId ? { companyId } : undefined,
// });

export const getPayrollSummary = (
    month: number,
    year: number,
    companyId?: string
) =>
    api.get("/payroll/summary", {
        params: {
            month,
            year,
            ...(companyId ? { companyId } : {}),
        },
    });

export const getEmployeePayrollDetail = (
    userId: string,
    month: number,
    year: number,
    companyId?: string
) =>
    api.get(`/payroll/employee/${userId}`, {
        params: {
            month,
            year,
            ...(companyId ? { companyId } : {}),
        },
    });

export const updateEmployeeSalary = (
    userId: string,
    grossSalary: number,
    companyId?: string
) =>
    api.patch(
        `/payroll/employee/${userId}/salary`,
        {
            grossSalary,
            ...(companyId ? { companyId } : {}),
        }
    );

export const downloadBulkSalarySlips = (
    userIds: string[],
    month: number,
    year: number,
    companyId?: string
) =>
    api.post(
        "/payroll/salary-slips/bulk",
        {
            userIds,
            month,
            year,
            ...(companyId ? { companyId } : {}),
        },
        { responseType: "blob" }
    );

export const confirmPayroll = (
    userIds: string[],
    month: number,
    year: number,
    companyId?: string
) =>
    api.post("/payroll/confirm", {
        userIds,
        month,
        year,
        ...(companyId ? { companyId } : {}),
    });

export const markPayrollAsPaid = (
    userIds: string[],
    month: number,
    year: number,
    paymentRef?: string,
    companyId?: string
) =>
    api.post("/payroll/mark-paid", {
        userIds,
        month,
        year,
        ...(paymentRef ? { paymentRef } : {}),
        ...(companyId ? { companyId } : {}),
    });

export const revertPayrollToDraft = (
    userId: string,
    month: number,
    year: number,
    companyId?: string
) =>
    api.post(
        `/payroll/employee/${userId}/revert-to-draft`,
        {
            month,
            year,
            ...(companyId ? { companyId } : {}),
        }
    );

export const downloadSalarySlip = (
    userId: string,
    month: number,
    year: number,
    companyId?: string
) =>
    api.get(`/payroll/employee/${userId}/salary-slip`, {
        params: {
            month,
            year,
            ...(companyId ? { companyId } : {}),
        },
        responseType: "blob",
    });
