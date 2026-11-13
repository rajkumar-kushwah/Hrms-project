// leaveRequest.routes.ts
import { Router } from "express";
import {
    createLeaveRequest, getMyLeaveRequests, getAllLeaveRequests,
    approveRejectLeave, cancelLeaveRequest,
    revokeLeave,
} from "../controllers/leaveRequest.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createLeaveRequestSchema, approveRejectLeaveSchema } from "../validations/leaveRequest.validation.js";
import { MODULES } from "../utilis/moduleUtils.js";


const router = Router();

router.post("/", protect, validate(createLeaveRequestSchema), createLeaveRequest);

router.get("/my", protect, getMyLeaveRequests);

router.get(
    "/all",
    protect,
    authorize(MODULES.LEAVE_APPROVAL, "canView"),
    getAllLeaveRequests
);

router.patch(
    "/:id/status",
    protect,
    authorize(MODULES.LEAVE_APPROVAL, "canEdit"),
    validate(approveRejectLeaveSchema),
    approveRejectLeave
);

router.delete("/:id", protect, cancelLeaveRequest);

router.delete(
    "/:id/revoke",
    protect,
    authorize(MODULES.LEAVE_APPROVAL, "canEdit"),
    revokeLeave
);

export default router;