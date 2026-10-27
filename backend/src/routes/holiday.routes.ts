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

const router = express.Router();


// Get all holidays
router.get(
    "/",
    protect,
    authorize("holiday", "canView"),
    getHolidaysController
);


// Get active holidays
router.get(
    "/active",
    protect,
    authorize("holiday", "canView"),
    getActiveHolidaysController
);


// Create holiday
router.post(
    "/",
    protect,
    authorize("holiday", "canCreate"),
    validate(createHolidaySchema),
    createHolidayController
);


// Update holiday
router.put(
    "/:id",
    protect,
    authorize("holiday", "canEdit"),
    validate(updateHolidaySchema),
    updateHolidayController
);


// Deactivate holiday
// Deactivate holiday
router.patch(
    "/:id/deactivate",
    protect,
    authorize("holiday", "canEdit"),
    deactivateHolidayController
);

// Activate holiday
router.patch(
    "/:id/activate",
    protect,
    authorize("holiday", "canEdit"),
    activateHolidayController
);


// Delete holiday
router.delete(
    "/:id",
    protect,
    authorize("holiday", "canDelete"),
    deleteHolidayController
);


export default router;