
import { api } from "../api/axios";
import type {
    EmployeeUpgradeStatus,
} from "@/types/employeeUpgrade.types";

const BASE_URL = "/employee-upgrades";

export const getUpgradeRequests = (
    companyId?: string,
    status?: EmployeeUpgradeStatus,
    approvalView?: "PENDING" | "COMPLETED"
) =>
    api.get(BASE_URL, {
        params: {
            ...(companyId ? { companyId } : {}),
            ...(status ? { status } : {}),
            ...(approvalView ? { approvalView } : {}),
        },
    });

export const getPendingUpgradeApprovals = (companyId?: string) =>
    api.get(BASE_URL, {
        params: companyId
            ? { companyId, status: "PENDING" }
            : { status: "PENDING" },
    });

export const getUpgradeRequestById = (id: string, companyId?: string) =>
    api.get(`${BASE_URL}/${id}`, {
        params: companyId ? { companyId } : {},
    });

export const actOnUpgradeRequest = (
    id: string,
    data: {
        action: "APPROVE" | "REJECT" | "SEND_BACK";
        comments?: string;
    },
    companyId?: string
) =>
    api.post(`${BASE_URL}/${id}/action`, data, {
        params: companyId ? { companyId } : {},
        headers: companyId ? { "x-company-id": companyId } : {},
    });

export const resubmitUpgradeRequest = (
    id: string,
    data: {
        proposedData: {
            designation?: string | null;
            categoryId?: string | null;
            grossSalary?: number | null;
        };
        effectiveDate: string;
        reason: string;
        remarks?: string | null;
    },
    companyId?: string,
) =>
    api.put(`${BASE_URL}/${id}/resubmit`, data, {
        params: companyId ? { companyId } : {},
        headers: companyId ? { "x-company-id": companyId } : {},
    });

// Get employee upgrade history
export const getEmployeeUpgradeHistory = (
    companyId?: string,
    params?: {
        employeeId?: string;
        search?: string;
        changeType?: string;
        page?: number;
        limit?: number;
    }
) =>
    api.get(`${BASE_URL}/history`, {
        params: {
            ...(companyId ? { companyId } : {}),
            ...params,
        },
    });
