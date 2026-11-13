// leaveType.routes.ts
import { Router } from "express";
import { createLeaveType, getLeaveTypes, updateLeaveType, deleteLeaveType } from "../controllers/leaveType.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createLeaveTypeSchema, updateLeaveTypeSchema } from "../validations/leavetype.validation.js";
import { MODULES } from "../utilis/moduleUtils.js";
const router = Router();

router.get(
    "/",
    protect,
    authorize(MODULES.LEAVE_POLICY, "canView"),
    getLeaveTypes
);

router.post(
    "/",
    protect,
    authorize(MODULES.LEAVE_POLICY, "canCreate"),
    validate(createLeaveTypeSchema),
    createLeaveType
);

router.put(
    "/:id",
    protect,
    authorize(MODULES.LEAVE_POLICY, "canEdit"),
    validate(updateLeaveTypeSchema),
    updateLeaveType
);

router.delete(
    "/:id",
    protect,
    authorize(MODULES.LEAVE_POLICY, "canDelete"),
    deleteLeaveType
);

export default router;