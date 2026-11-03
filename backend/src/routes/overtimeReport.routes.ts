import { Router } from "express";
import { getOvertimeReport } from "../controllers/overtimeReport.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", protect, getOvertimeReport);

export default router;