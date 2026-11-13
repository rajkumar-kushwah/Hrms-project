import { Router } from "express";
import {
    punchIn,
    punchOut,
    getTodayAttendance,
    getMyAttendance,
    getAllAttendance,
    getLiveAttendance,
    getEmployeeAttendance,
    getMonthlySheet,
} from "../controllers/attendance.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import { attendanceLocationSchema } from "../validations/attendance.validation.js";
import { MODULES } from "../utilis/moduleUtils.js";

const router = Router();
router.post(
    "/punch-in",
    protect,
    authorize(MODULES.ATTENDANCE, "canCreate"),
    validate(attendanceLocationSchema),
    punchIn
);

router.post(
    "/punch-out",
    protect,
    authorize(MODULES.ATTENDANCE, "canCreate"),
    validate(attendanceLocationSchema),
    punchOut
);

router.get(
    "/today",
    protect,
    authorize(MODULES.ATTENDANCE, "canView"),
    getTodayAttendance
);

router.get(
    "/my-history",
    protect,
    authorize(MODULES.ATTENDANCE, "canView"),
    getMyAttendance
);

router.get(
    "/all",
    protect,
    authorize(MODULES.ATTENDANCE, "canView"),
    getAllAttendance
);

router.get(
    "/live",
    protect,
    authorize(MODULES.ATTENDANCE_LIVE, "canView"),
    getLiveAttendance
);

// Monthly attendance
router.get(
    "/employee/:userId",
    protect,
    authorize(MODULES.ATTENDANCE_LIST, "canView"),
    getEmployeeAttendance
);

router.get(
    "/monthly-sheet",
    protect,
    authorize(MODULES.ATTENDANCE_LIST, "canView"),
    getMonthlySheet
);

export default router;

