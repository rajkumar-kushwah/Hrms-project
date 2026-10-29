// leaveRequest.service.ts
import { api } from "../api/axios";
import type { CreateLeaveRequestPayload } from "@/types/leave.types";

// Create Leave Request
export const createLeaveRequest = (
    data: CreateLeaveRequestPayload,
    companyId?: string | null
) =>
    api.post("/leave-request", data, {
        params: companyId ? { companyId } : {},
    });

// Get My Leave Requests
export const getMyLeaveRequests = (companyId?: string | null) =>
    api.get("/leave-request/my", {
        params: companyId ? { companyId } : {},
    });

// Get All Leave Requests
export const getAllLeaveRequests = (
    status?: string,
    companyId?: string | null
) =>
    api.get("/leave-request/all", {
        params: {
            ...(status && { status }),
            ...(companyId && { companyId }),
        },
    });

// Approve or Reject Leave
export const approveRejectLeave = (
    id: string,
    status: string,
    rejectReason?: string,
    companyId?: string | null
) =>
    api.patch(
        `/leave-request/${id}/status`,
        { status, rejectReason },
        {
            params: companyId ? { companyId } : {},
        }
    );

// Cancel Leave Request
export const cancelLeaveRequest = (
    id: string,
    companyId?: string | null
) =>
    api.delete(`/leave-request/${id}`, {
        params: companyId ? { companyId } : {},
    });

// Revoke Leave
export const revokeLeave = (
    id: string,
    companyId?: string | null
) =>
    api.delete(`/leave-request/${id}/revoke`, {
        params: companyId ? { companyId } : {},
    });