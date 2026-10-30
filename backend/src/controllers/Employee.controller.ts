
import type { Request, Response } from "express";
import * as EmployeeService from "../services/employee.service.js";
import {
    getCompanyId,
    isAdminRole,
    normalizeRoleName,
} from "../utilis/roleUtils.js";

// Create employee
export const createEmployee = async (req: Request, res: Response) => {
    try {
        const companyId = getCompanyId(req);
        const createdBy = req.user?.id;
        const roleName = normalizeRoleName(req.user?.role?.name);

        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company before creating an employee.",
            });
        }

        if (!createdBy || !roleName) {
            return res.status(401).json({
                success: false,
                message: "User authentication is required.",
            });
        }

        const employee = await EmployeeService.createEmployee(
            companyId,
            createdBy,
            roleName,
            req.body
        );

        return res.status(201).json({
            success: true,
            message: "Employee created successfully",
            data: employee,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to create employee";

        return res.status(400).json({
            success: false,
            message,
        });
    }
};

// Get all employees
export const getEmployees = async (req: Request, res: Response) => {
    try {
        const companyId = getCompanyId(req);
        const requestingUserId = req.user?.id;
        const requestingUserRole = normalizeRoleName(req.user?.role?.name);

        if (!requestingUserId || !requestingUserRole) {
            return res.status(401).json({
                success: false,
                message: "User authentication is required.",
            });
        }
        if (!companyId) {
            if (normalizeRoleName(requestingUserRole) === "super_admin") {
                return res.status(200).json({
                    success: true,
                    data: [],
                });
            }

            return res.status(400).json({
                success: false,
                message: "Company not found.",
            });
        }

        const employees = await EmployeeService.getEmployees(
            companyId,
            requestingUserId,
            requestingUserRole
        );

        return res.status(200).json({
            success: true,
            data: employees,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch employees";

        return res.status(500).json({
            success: false,
            message,
        });
    }
};

// Get single employee
export const getEmployeeById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const requestingUserId = req.user?.id;
        const requestingUserRole = normalizeRoleName(req.user?.role?.name);
        const requestingCompanyId = getCompanyId(req);

        if (typeof id !== "string" || !id) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee id",
            });
        }

        if (!requestingUserId || !requestingUserRole) {
            return res.status(401).json({
                success: false,
                message: "User authentication is required.",
            });
        }

        if (!requestingCompanyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company.",
            });
        }

        const employee = await EmployeeService.getEmployeeById(
            id,
            requestingUserId,
            requestingUserRole,
            requestingCompanyId
        );

        return res.status(200).json({
            success: true,
            data: employee,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Internal server error";

        if (message === "Employee not found") {
            return res.status(404).json({
                success: false,
                message,
            });
        }

        if (message === "Access denied") {
            return res.status(403).json({
                success: false,
                message,
            });
        }

        console.error("Get employee error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Update employee
export const updateEmployee = async (req: Request, res: Response) => {
    try {
        const id = req.params.id;
        const requestingUserId = req.user?.id;
        const requestingUserRole = normalizeRoleName(req.user?.role?.name);
        const requestingCompanyId = getCompanyId(req);

        if (typeof id !== "string" || !id) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee id",
            });
        }

        if (!requestingUserId || !requestingUserRole) {
            return res.status(401).json({
                success: false,
                message: "User authentication is required.",
            });
        }

        if (!requestingCompanyId) {
            return res.status(400).json({
                success: false,
                message: "Please select a company.",
            });
        }

        const employee = await EmployeeService.updateEmployee(
            id,
            requestingUserId,
            requestingUserRole,
            requestingCompanyId,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: "Employee updated successfully",
            data: employee,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to update employee";

        return res.status(400).json({
            success: false,
            message,
        });
    }
};

// Delete employee
export const updateEmployeeStatus = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id;
        const isActive: unknown = req.body?.isActive;

        if (typeof id !== "string" || !id) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee id",
            });
        }

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isActive must be true or false",
            });
        }

        const employee = await EmployeeService.updateEmployeeStatus(
            id,
            isActive
        );

        return res.status(200).json({
            success: true,
            message: employee.message,
            data: employee.employee,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to update employee status";

        return res.status(400).json({
            success: false,
            message,
        });
    }
};
// Delete employee
export const deleteEmployee = async (
    req: Request,
    res: Response
) => {
    try {
        const id = req.params.id;

        if (typeof id !== "string" || !id) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee id",
            });
        }

        const result = await EmployeeService.deleteEmployee(id);

        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to delete employee";

        return res.status(400).json({
            success: false,
            message,
        });
    }
};

// Reset employee password
export const resetEmployeePassword = async (
    req: Request,
    res: Response
) => {
    try {
        // Admin authorization check
        const roleName = req.user?.role?.name;

        if (!isAdminRole(roleName)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only administrators can reset employee passwords.",
            });
        }

        const id = req.params.id;
        const password: unknown = req.body?.password;

        if (typeof id !== "string" || !id) {
            return res.status(400).json({
                success: false,
                message: "Invalid employee id",
            });
        }

        if (typeof password !== "string" || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
            });
        }

        const employee = await EmployeeService.resetEmployeePassword(
            id,
            password
        );

        return res.status(200).json({
            success: true,
            message: employee.message,
        });
    } catch (error: unknown) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to reset employee password";

        return res.status(400).json({
            success: false,
            message,
        });
    }
};
