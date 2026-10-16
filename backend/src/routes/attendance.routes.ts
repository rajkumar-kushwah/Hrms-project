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

const router = Router();

router.post("/punch-in", protect, authorize("attendance", "canCreate"), validate(attendanceLocationSchema), punchIn);
router.post("/punch-out", protect, authorize("attendance", "canCreate"), validate(attendanceLocationSchema), punchOut);
router.get("/today", protect, authorize("attendance", "canView"), getTodayAttendance);
router.get("/my-history", protect, authorize("attendance", "canView"), getMyAttendance);
router.get("/all", protect, authorize("attendance", "canView"), getAllAttendance);
router.get("/live", protect, authorize("attendance_live", "canView"), getLiveAttendance);
// monthly attendance
router.get("/employee/:userId", protect, authorize("attendance_list", "canView"), getEmployeeAttendance);

router.get("/monthly-sheet", protect,  getMonthlySheet);

export default router;

