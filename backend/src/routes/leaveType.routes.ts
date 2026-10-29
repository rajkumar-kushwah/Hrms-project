// leaveType.routes.ts
import { Router } from "express";
import { createLeaveType, getLeaveTypes, updateLeaveType, deleteLeaveType } from "../controllers/leaveType.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createLeaveTypeSchema, updateLeaveTypeSchema } from "../validations/leavetype.validation.js";

const router = Router();
router.get("/", protect, authorize("leave_policy", "canView"), getLeaveTypes);
router.post("/", protect, authorize("leave_policy", "canCreate"), validate(createLeaveTypeSchema), createLeaveType);
router.put("/:id", protect, authorize("leave_policy", "canEdit"), validate(updateLeaveTypeSchema), updateLeaveType);
router.delete("/:id", protect, authorize("leave_policy", "canDelete"), deleteLeaveType);


export default router;