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

const router = Router();

router.get("/", protect, authorize("employee", "canView"), getEmployees);
router.get("/:id", protect, authorize("employee", "canView"), validate(employeeIdSchema, "params"), getEmployeeById);
router.post("/", protect, authorize("employee", "canCreate"), validate(createEmployeeSchema), createEmployee);
router.put("/:id", protect, authorize("employee", "canEdit"), validate(employeeIdSchema, "params"), validate(updateEmployeeSchema), updateEmployee);
router.patch("/:id/status", protect, authorize("employee", "canDelete"), updateEmployeeStatus);
router.delete("/:id", protect, authorize("employee", "canDelete"), validate(employeeIdSchema, "params"), deleteEmployee);
router.patch("/:id/reset-password", protect, authorize("employee", "canEdit"), validate(employeeIdSchema, "params"), resetEmployeePassword);

export default router;