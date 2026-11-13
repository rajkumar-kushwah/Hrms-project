import { Router } from "express";
import {
    createEmployee,
    getEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee,
    resetEmployeePassword,
    updateEmployeeStatus,
} from "../controllers/Employee.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createEmployeeSchema, updateEmployeeSchema, employeeIdSchema } from "../validations/employee.validator.js";
import { MODULES } from "../utilis/moduleUtils.js";

const router = Router();

router.get("/", protect, authorize(MODULES.EMPLOYEE, "canView"), getEmployees);
router.get("/:id", protect, authorize(MODULES.EMPLOYEE, "canView"), validate(employeeIdSchema, "params"), getEmployeeById);
router.post("/", protect, authorize(MODULES.EMPLOYEE, "canCreate"), validate(createEmployeeSchema), createEmployee);
router.put("/:id", protect, authorize(MODULES.EMPLOYEE, "canEdit"), validate(employeeIdSchema, "params"), validate(updateEmployeeSchema), updateEmployee);
router.patch("/:id/status", protect, authorize(MODULES.EMPLOYEE, "canDelete"), updateEmployeeStatus);
router.delete("/:id", protect, authorize(MODULES.EMPLOYEE, "canDelete"), validate(employeeIdSchema, "params"), deleteEmployee);
router.patch("/:id/reset-password", protect, authorize(MODULES.EMPLOYEE, "canEdit"), validate(employeeIdSchema, "params"), resetEmployeePassword);

export default router;