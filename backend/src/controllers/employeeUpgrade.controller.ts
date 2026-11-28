
import type { Request, Response } from "express";
import * as EmployeeUpgradeService from "../services/employeeUpgrade.service.js";

import {
    getCompanyId,
    isCompanyAdminRole,
    isHRRole,
    isSuperAdminRole,
} from "../utilis/roleUtils.js";

import {
    EmployeeUpgradeStatus,
    EmployeeUpgradeType,
} from "@prisma/client";

import type { ApprovalAction } from "../services/employeeUpgrade.service.js";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const getParamId = (
    value: string | string[] | undefined
): string | null => {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    return value.trim();
};

const getStringQuery = (
    value: unknown
): string | undefined => {
    return typeof value === "string" && value.trim()
        ? value.trim()
        : undefined;
};

const isApprovalAction = (
    value: unknown
): value is ApprovalAction => {
    return (
        value === "APPROVE" ||
        value === "REJECT" ||
        value === "SEND_BACK"
    );
};

// --------------------------------------------------
// Create Employee Upgrade Request
// --------------------------------------------------

export const createUpgradeRequest = async (
    req: Request,
    res: Response
) => {
    try {
        const requestedById = req.user?.id;

        const rawCompanyId = getCompanyId(req);
        const companyId =
            typeof rawCompanyId === "string"
                ? rawCompanyId
                : null;

        if (!requestedById) {
            return res.status(401).json({
                success: false,
                message: "User authentication is required.",
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: isSuperAdminRole(req.user)
                    ? "Please select a company before creating an upgrade request."
                    : "Company not found.",
            });
        }

        const {
            employeeId,
            upgradeType,
            proposedData,
            effectiveDate,
            reason,
            remarks,
        } = req.body;

        if (
            typeof employeeId !== "string" ||
            !employeeId.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid employee ID is required.",
            });
        }

        if (
            typeof upgradeType !== "string" ||
            !Object.values(EmployeeUpgradeType).includes(
                upgradeType as EmployeeUpgradeType
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee upgrade type.",
            });
        }

        if (
            !proposedData ||
            typeof proposedData !== "object" ||
            Array.isArray(proposedData)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid proposed employee details are required.",
            });
        }

        if (
            typeof effectiveDate !== "string" ||
            Number.isNaN(Date.parse(effectiveDate))
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid effective date is required.",
            });
        }

        if (
            typeof reason !== "string" ||
            !reason.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Upgrade reason is required.",
            });
        }

        if (
            remarks !== undefined &&
            remarks !== null &&
            typeof remarks !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Remarks must be a string.",
            });
        }

        const upgrade =
            await EmployeeUpgradeService.createUpgradeRequest({
                companyId,
                employeeId: employeeId.trim(),
                requestedById,
                upgradeType: upgradeType as EmployeeUpgradeType,
                proposedData,
                effectiveDate: new Date(effectiveDate),
                reason: reason.trim(),
                remarks:
                    typeof remarks === "string"
                        ? remarks.trim() || null
                        : null,
            });

        return res.status(201).json({
            success: true,
            message: "Employee upgrade request created successfully.",
            data: upgrade,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to create employee upgrade request";

        return res.status(400).json({
            success: false,
            message,
        });
    }
};

// --------------------------------------------------
// Get All Employee Upgrade Requests
// --------------------------------------------------


export const getUpgradeRequests = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = req.user?.id;

        const rawCompanyId = getCompanyId(req);
        const companyId =
            typeof rawCompanyId === "string"
                ? rawCompanyId
                : null;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication is required.",
            });
        }

        if (!companyId) {
            if (isSuperAdminRole(req.user)) {
                return res.status(200).json({
                    success: true,
                    data: [],
                    pagination: {
                        total: 0,
                        page: 1,
                        limit: 10,
                        totalPages: 0,
                    },
                });
            }

            return res.status(400).json({
                success: false,
                message: "Please select a company.",
            });
        }

        const statusValue = getStringQuery(req.query.status);
        const employeeId = getStringQuery(req.query.employeeId);
        const search = getStringQuery(req.query.search);

        // Validate and narrow approvalView type
        const approvalViewValue = getStringQuery(
            req.query.approvalView
        );

        if (
            approvalViewValue &&
            approvalViewValue !== "PENDING" &&
            approvalViewValue !== "COMPLETED"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid approval view. Use PENDING or COMPLETED.",
            });
        }

        const approvalView:
            | "PENDING"
            | "COMPLETED"
            | undefined =
            approvalViewValue === "PENDING" ||
            approvalViewValue === "COMPLETED"
                ? approvalViewValue
                : undefined;

        const pageValue = getStringQuery(req.query.page);
        const limitValue = getStringQuery(req.query.limit);

        const page = pageValue ? Number(pageValue) : 1;
        const limit = limitValue ? Number(limitValue) : 10;

        if (
            statusValue &&
            !Object.values(EmployeeUpgradeStatus).includes(
                statusValue as EmployeeUpgradeStatus
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid upgrade status.",
            });
        }

        if (
            !Number.isInteger(page) ||
            !Number.isInteger(limit) ||
            page < 1 ||
            limit < 1 ||
            limit > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination parameters.",
            });
        }

        const status =
            approvalView === "PENDING"
                ? EmployeeUpgradeStatus.PENDING
                : statusValue
                    ? statusValue as EmployeeUpgradeStatus
                    : undefined;

        const filters: EmployeeUpgradeService.UpgradeListFilters = {
            ...(status !== undefined ? { status } : {}),
            ...(employeeId ? { employeeId } : {}),
            ...(search ? { search } : {}),

            ...(approvalView
                ? {
                    approvalView,
                    approverId: userId,
                }
                : {}),

            page,
            limit,
        };

        const result =
            await EmployeeUpgradeService.getUpgradeRequests(
                companyId,
                filters
            );

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch employee upgrade requests";

        return res.status(500).json({
            success: false,
            message,
        });
    }
};


// --------------------------------------------------
// Get Employee Upgrade Request By ID
// --------------------------------------------------

export const getUpgradeRequestById = async (
    req: Request,
    res: Response
) => {
    try {
        const userId = req.user?.id;

        const rawCompanyId = getCompanyId(req);
        const companyId =
            typeof rawCompanyId === "string"
                ? rawCompanyId
                : null;

        const id = getParamId(req.params.id);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication is required.",
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: isSuperAdminRole(req.user)
                    ? "Please select a company."
                    : "Company not found.",
            });
        }

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Upgrade request ID is required.",
            });
        }

        const upgrade =
            await EmployeeUpgradeService.getUpgradeRequestById(
                id,
                companyId,
                userId
            );

        return res.status(200).json({
            success: true,
            data: upgrade,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch employee upgrade request";

        const statusCode =
            message.toLowerCase().includes("not found")
                ? 404
                : 500;

        return res.status(statusCode).json({
            success: false,
            message,
        });
    }
};

// --------------------------------------------------
// Resubmit Sent-Back Employee Upgrade Request
// --------------------------------------------------

export const resubmitUpgradeRequest = async (
    req: Request,
    res: Response,
) => {
    try {
        const requestedById = req.user?.id;

        const rawCompanyId = getCompanyId(req);
        const companyId =
            typeof rawCompanyId === "string"
                ? rawCompanyId
                : null;

        const id = getParamId(req.params.id);

        if (!requestedById) {
            return res.status(401).json({
                success: false,
                message: "User authentication is required.",
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: isSuperAdminRole(req.user)
                    ? "Please select a company."
                    : "Company not found.",
            });
        }

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Upgrade request ID is required.",
            });
        }

        const {
            proposedData,
            effectiveDate,
            reason,
            remarks,
        } = req.body;

        if (
            !proposedData ||
            typeof proposedData !== "object" ||
            Array.isArray(proposedData)
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid proposed employee details are required.",
            });
        }

        if (
            typeof effectiveDate !== "string" ||
            Number.isNaN(Date.parse(effectiveDate))
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid effective date is required.",
            });
        }

        if (
            typeof reason !== "string" ||
            !reason.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Upgrade reason is required.",
            });
        }

        if (
            remarks !== undefined &&
            remarks !== null &&
            typeof remarks !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Remarks must be a string.",
            });
        }

        const upgrade =
            await EmployeeUpgradeService.resubmitUpgradeRequest({
                upgradeId: id,
                companyId,
                requestedById,
                proposedData,
                effectiveDate: new Date(effectiveDate),
                reason: reason.trim(),
                remarks:
                    typeof remarks === "string"
                        ? remarks.trim() || null
                        : null,
            });

        return res.status(200).json({
            success: true,
            message: "Upgrade request resubmitted successfully.",
            data: upgrade,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to resubmit upgrade request";

        const lowerMessage = message.toLowerCase();

        const statusCode =
            lowerMessage.includes("not found")
                ? 404
                : lowerMessage.includes("not authorized") ||
                    lowerMessage.includes("cannot resubmit") ||
                    lowerMessage.includes("another company")
                    ? 403
                    : 400;

        return res.status(statusCode).json({
            success: false,
            message,
        });
    }
};

// --------------------------------------------------
// Approve / Reject / Send Back Employee Upgrade Request
// --------------------------------------------------

export const actOnUpgradeRequest = async (
    req: Request,
    res: Response
) => {
    try {
        const approverId = req.user?.id;

        const rawCompanyId = getCompanyId(req);
        const companyId =
            typeof rawCompanyId === "string"
                ? rawCompanyId
                : null;

        const id = getParamId(req.params.id);

        if (!approverId) {
            return res.status(401).json({
                success: false,
                message: "User authentication is required.",
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: isSuperAdminRole(req.user)
                    ? "Please select a company."
                    : "Company not found.",
            });
        }

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Upgrade request ID is required.",
            });
        }

        const { action: actionValue, comments } = req.body;

        if (!isApprovalAction(actionValue)) {
            return res.status(400).json({
                success: false,
                message: "Invalid approval action.",
            });
        }

        const action: ApprovalAction = actionValue;

        if (
            comments !== undefined &&
            comments !== null &&
            typeof comments !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Comments must be a string.",
            });
        }

        if (
            (action === "REJECT" || action === "SEND_BACK") &&
            (
                typeof comments !== "string" ||
                !comments.trim()
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Comments are required for this action.",
            });
        }

        const upgrade =
            await EmployeeUpgradeService.actOnUpgradeRequest({
                upgradeId: id,
                companyId,
                approverId,
                action,
                comments:
                    typeof comments === "string"
                        ? comments.trim() || null
                        : null,
            });

        return res.status(200).json({
            success: true,
            message:
                action === "APPROVE"
                    ? "Upgrade request approved successfully."
                    : action === "REJECT"
                        ? "Upgrade request rejected successfully."
                        : "Upgrade request sent back successfully.",
            data: upgrade,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to process upgrade approval";

        const lowerMessage = message.toLowerCase();

        const statusCode =
            lowerMessage.includes("not found")
                ? 404
                : lowerMessage.includes("not authorized") ||
                    lowerMessage.includes("not assigned") ||
                    lowerMessage.includes("permission")
                    ? 403
                    : 400;

        return res.status(statusCode).json({
            success: false,
            message,
        });
    }
};


// --------------------------------------------------
// Get Employee Upgrade History
// --------------------------------------------------

export const getEmployeeUpgradeHistory = async (
    req: Request,
    res: Response,
) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication is required.",
            });
        }

        const rawCompanyId = getCompanyId(req);
        const companyId =
            typeof rawCompanyId === "string"
                ? rawCompanyId
                : null;

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: isSuperAdminRole(req.user)
                    ? "Please select a company."
                    : "Company not found.",
            });
        }

        const isAdmin =
            isSuperAdminRole(req.user) ||
            isCompanyAdminRole(req.user) ||
            isHRRole(req.user);

        // Employees and other non-admin roles can see only their own history.
        const employeeId = isAdmin
            ? getStringQuery(req.query.employeeId)
            : userId;

        const search = getStringQuery(req.query.search);
        const changeType = getStringQuery(req.query.changeType);
        const pageValue = getStringQuery(req.query.page);
        const limitValue = getStringQuery(req.query.limit);

        const page = pageValue ? Number(pageValue) : 1;
        const limit = limitValue ? Number(limitValue) : 10;

        if (
            !Number.isInteger(page) ||
            !Number.isInteger(limit) ||
            page < 1 ||
            limit < 1 ||
            limit > 100
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid pagination parameters.",
            });
        }

        if (
            changeType &&
            !Object.values(EmployeeUpgradeType).includes(
                changeType as EmployeeUpgradeType,
            )
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid upgrade type.",
            });
        }

        const result =
            await EmployeeUpgradeService.getEmployeeUpgradeHistory(
                companyId,
                {
                    ...(employeeId ? { employeeId } : {}),
                    ...(search ? { search } : {}),
                    page,
                    limit,
                    ...(changeType
                        ? { changeType: changeType as EmployeeUpgradeType }
                        : {}),
                },
            );

        return res.status(200).json({
            success: true,
            ...result,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch employee upgrade history";

        return res.status(500).json({
            success: false,
            message,
        });
    }
};