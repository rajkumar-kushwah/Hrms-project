
import type { Request, Response } from "express";
import * as PayrollService from "../services/payroll.service.js";
import {
    normalizeRoleName,
    isAdminRole,
    getCompanyId,
} from "../utilis/roleUtils.js";
import { prisma } from "../config/db.js";

// ─────────────────────────────────────────────
// Global Helpers
// ─────────────────────────────────────────────

const getErrorMessage = (error: unknown): string => {
    return error instanceof Error
        ? error.message
        : "An unexpected error occurred";
};

const getPayrollAccess = (req: Request) => {
    const roleName = normalizeRoleName(req.user?.role?.name);

    return {
        isAdmin: isAdminRole(roleName),
        companyId: getCompanyId(req),
        userId: req.user?.id ?? null,
    };
};

const getMonthAndYear = (req: Request) => {
    const monthValue = req.query.month;
    const yearValue = req.query.year;

    const month =
        monthValue === undefined
            ? new Date().getMonth() + 1
            : Number(monthValue);

    const year =
        yearValue === undefined
            ? new Date().getFullYear()
            : Number(yearValue);

    if (
        !Number.isInteger(month) ||
        month < 1 ||
        month > 12 ||
        !Number.isInteger(year) ||
        year < 2000 ||
        year > 9999
    ) {
        return null;
    }

    return { month, year };
};

// ─────────────────────────────────────────────
// Get Payroll Summary
// ─────────────────────────────────────────────


export const getPayrollSummary = async (
    req: Request,
    res: Response
) => {
    try {
        const { isAdmin, companyId: loggedInCompanyId, userId } =
            getPayrollAccess(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const roleName = normalizeRoleName(req.user?.role?.name);
        const isSuperAdmin = roleName === "super_admin";

        // Super Admin can select a company; other roles cannot override it.
        const requestedCompanyId = req.query.companyId;

        if (
            isSuperAdmin &&
            requestedCompanyId !== undefined &&
            typeof requestedCompanyId !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID",
            });
        }

        const effectiveCompanyId = isSuperAdmin
            ? (typeof requestedCompanyId === "string"
                ? requestedCompanyId.trim()
                : "")
            : loggedInCompanyId;

        if (!effectiveCompanyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company to view payroll",
            });
        }

        // Verify that the selected company exists.
        const company = await prisma.company.findUnique({
            where: { id: effectiveCompanyId },
            select: { id: true },
        });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }

        const period = getMonthAndYear(req);

        if (!period) {
            return res.status(400).json({
                success: false,
                message: "Invalid month or year",
            });
        }

        const data = await PayrollService.getPayrollSummary(
            effectiveCompanyId,
            period.month,
            period.year,
            isAdmin ? undefined : userId
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error("Get Payroll Summary Error:", message);

        return res.status(500).json({
            success: false,
            message,
        });
    }
};

// ─────────────────────────────────────────────
// Get Employee Payroll Detail
// ─────────────────────────────────────────────

export const getEmployeePayrollDetail = async (
    req: Request,
    res: Response
) => {
    try {
        const { isAdmin, companyId, userId: loggedInUserId } =
            getPayrollAccess(req);

        if (!loggedInUserId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        if (isAdmin && !companyId) {
            return res.status(400).json({
                success: false,
                message:
                    "Please select a company context to view payroll",
            });
        }

        const requestedUserId = req.params.userId;

        if (isAdmin &&
            (typeof requestedUserId !== "string" ||
                requestedUserId.trim() === "")) {
            return res.status(400).json({
                success: false,
                message: "Valid employee ID is required",
            });
        }

        const targetUserId = isAdmin
            ? requestedUserId
            : loggedInUserId;

        const period = getMonthAndYear(req);

        if (!period) {
            return res.status(400).json({
                success: false,
                message: "Invalid month or year",
            });
        }

        const data = await PayrollService.getEmployeePayrollDetail(
            targetUserId,
            companyId,
            period.month,
            period.year
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error("Get Employee Payroll Detail Error:", message);

        return res.status(500).json({
            success: false,
            message,
        });
    }
};

// ─────────────────────────────────────────────
// Update Employee Salary
// ─────────────────────────────────────────────

export const updateEmployeeSalary = async (
    req: Request,
    res: Response
) => {
    try {
        const { isAdmin, companyId } = getPayrollAccess(req);

        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not authorized to update employee salary",
            });
        }

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company context",
            });
        }

        const userId = req.params.userId;

        if (typeof userId !== "string" || !userId.trim()) {
            return res.status(400).json({
                success: false,
                message: "Valid employee ID is required",
            });
        }

        const { grossSalary } = req.body;

        if (
            typeof grossSalary !== "number" ||
            !Number.isFinite(grossSalary) ||
            grossSalary < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Valid non-negative grossSalary is required",
            });
        }

        const result = await PayrollService.updateEmployeeSalary(
            userId,
            companyId,
            grossSalary
        );

        return res.status(200).json({
            success: true,
            message: "Salary updated successfully",
            data: result,
        });
    } catch (error: unknown) {
        const message = getErrorMessage(error);
        console.error("Update Employee Salary Error:", message);

        return res.status(400).json({
            success: false,
            message,
        });
    }
};