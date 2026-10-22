import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getAttendanceReport } from "../controllers/Attendancereport.controller.js";

const router = express.Router();

router.get("/", protect, getAttendanceReport);


export default router;