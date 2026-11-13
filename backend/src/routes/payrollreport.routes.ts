import { Router } from "express";
import { monthlyPayrollReport } from "../controllers/payrollReport.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { MODULES } from "../utilis/moduleUtils.js";

const router = Router();

// report route
router.get("/", protect, authorize(MODULES.PAYROLL, "canView"), monthlyPayrollReport);

export default router;