import { Router } from "express";
import { getSettings, updateSettings } from "../controllers/settings.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { updateSettingsSchema } from "../validations/settings.validation.js";
import { MODULES } from "../utilis/moduleUtils.js";

const router = Router();
router.get(
    "/",
    protect,
    authorize(MODULES.SETTINGS, "canView"),
    getSettings
);

router.put(
    "/",
    protect,
    authorize(MODULES.SETTINGS, "canEdit"),
    validate(updateSettingsSchema),
    updateSettings
);

export default router;