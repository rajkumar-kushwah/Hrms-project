import express from "express";

import {
    createHolidayController,
    getHolidaysController,
    getActiveHolidaysController,
    updateHolidayController,
    deactivateHolidayController,
    activateHolidayController,
    deleteHolidayController,
} from "../controllers/holiday.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { createHolidaySchema, updateHolidaySchema } from "../validations/holiday.validation.js";
import { MODULES } from "../utilis/moduleUtils.js";

const router = express.Router();
// Get all holidays
router.get(
    "/",
    protect,
    authorize(MODULES.HOLIDAY, "canView"),
    getHolidaysController
);

// Get active holidays
router.get(
    "/active",
    protect,
    authorize(MODULES.HOLIDAY, "canView"),
    getActiveHolidaysController
);

// Create holiday
router.post(
    "/",
    protect,
    authorize(MODULES.HOLIDAY, "canCreate"),
    validate(createHolidaySchema),
    createHolidayController
);

// Update holiday
router.put(
    "/:id",
    protect,
    authorize(MODULES.HOLIDAY, "canEdit"),
    validate(updateHolidaySchema),
    updateHolidayController
);

// Deactivate holiday
router.patch(
    "/:id/deactivate",
    protect,
    authorize(MODULES.HOLIDAY, "canEdit"),
    deactivateHolidayController
);

// Activate holiday
router.patch(
    "/:id/activate",
    protect,
    authorize(MODULES.HOLIDAY, "canEdit"),
    activateHolidayController
);

// Delete holiday
router.delete(
    "/:id",
    protect,
    authorize(MODULES.HOLIDAY, "canDelete"),
    deleteHolidayController
);

export default router;