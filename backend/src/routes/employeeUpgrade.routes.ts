
import { Router } from "express";

import {
    createUpgradeRequest,
    getUpgradeRequests,
    getUpgradeRequestById,
    actOnUpgradeRequest,
    resubmitUpgradeRequest,
    getEmployeeUpgradeHistory,
} from "../controllers/employeeUpgrade.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { MODULES } from "../utilis/moduleUtils.js";

const router = Router();

// Get all upgrade requests
router.get(
    "/",
    protect,
    authorize(MODULES.EMPLOYEE_UPGRADE, "canView"),
    getUpgradeRequests
);

// Create upgrade request
router.post(
    "/",
    protect,
    authorize(MODULES.EMPLOYEE_UPGRADE, "canCreate"),
    createUpgradeRequest
);

// Get employee upgrade history
// Controller restricts employees to their own history.
router.get(
    "/history",
    protect,
    getEmployeeUpgradeHistory
);

// Get upgrade request by ID
router.get(
    "/:id",
    protect,
    authorize(MODULES.EMPLOYEE_UPGRADE, "canView"),
    getUpgradeRequestById
);

// Approve / Reject / Send Back Employee Upgrade Request
router.post(
    "/:id/action",
    protect,
    authorize(MODULES.EMPLOYEE_UPGRADE, "canEdit"),
    actOnUpgradeRequest
);

// Resubmit Sent-Back Employee Upgrade Request
router.put(
    "/:id/resubmit",
    protect,
    authorize(MODULES.EMPLOYEE_UPGRADE, "canEdit"),
    resubmitUpgradeRequest
);

export default router;
