import { Router } from "express";
import { getLeaveReport } from "../controllers/leaveReport.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", protect, getLeaveReport);

export default router;