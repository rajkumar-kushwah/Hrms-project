import express from "express";
import {
    getUsers,
    toggleUserStatus,
    resetUserPassword,
} from "../controllers/companyUser.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { MODULES } from "../utilis/moduleUtils.js";
const router = express.Router();

router.get("/", protect, authorize(MODULES.COMPANY_USERS, "canView"), getUsers);

router.patch(
    "/:id/toggle-status",
    protect,
    authorize(MODULES.COMPANY_USERS, "canEdit"),
    toggleUserStatus
);

router.patch(
    "/:id/reset-password",
    protect,
    authorize(MODULES.COMPANY_USERS, "canEdit"),
    resetUserPassword
);

export default router;