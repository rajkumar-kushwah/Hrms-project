import type { Request, Response } from "express";
import * as AttendanceService from "../services/attendance.service.js";

import * as SheetService from "../services/attendance.service.js";
import { isDatabaseUnavailable, sendDatabaseUnavailable } from "../utilis/dbErrors.js";
import { isAdminRole } from "../utilis/roleUtils.js";



export const punchIn = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id!;
        const companyId = req.user?.companyId!;

        const result = await AttendanceService.punchIn(userId, companyId, req.body);

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result.attendance,
        });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const punchOut = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id!;
        const companyId = req.user?.companyId!;
        const result = await AttendanceService.punchOut(userId, companyId, req.body);

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result.attendance,
        });
    } catch (error: any) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

export const getTodayAttendance = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id!;
        const attendance = await AttendanceService.getTodayAttendance(userId);

        return res.status(200).json({ success: true, data: attendance });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getMyAttendance = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id!;
        const companyId = req.user?.companyId!;
        const month = req.query.month ? Number(req.query.month) : undefined;
        const year = req.query.year ? Number(req.query.year) : undefined;

        const attendance = await AttendanceService.getMyAttendance(userId, companyId, month, year);

        return res.status(200).json({ success: true, data: attendance });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getAllAttendance = async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.role?.name === "super_admin"
            ? null
            : req.user?.companyId!;
        const date = req.query.date as string | undefined;

        const attendance = await AttendanceService.getAllAttendance(companyId, date);

        return res.status(200).json({ success: true, data: attendance });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// get live attendance
export const getLiveAttendance = async (req: Request, res: Response) => {
    try {
        const companyId = req.user?.role?.name === "super_admin"
            ? null
            : req.user?.companyId!;

        const attendance = await AttendanceService.getLiveAttendance(companyId);

        return res.status(200).json({ success: true, data: attendance });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
}


// monthly attendance
export const getEmployeeAttendance = async (req: Request, res: Response) => {
    try {
        const userId = req.params.userId as string;
        const companyId = req.user?.companyId!;
        const month = req.query.month ? Number(req.query.month) : undefined;
        const year = req.query.year ? Number(req.query.year) : undefined;

        const [attendance, employee] = await Promise.all([
            AttendanceService.getEmployeeAttendance(userId, companyId, month, year),
            AttendanceService.getEmployeeBasicInfo(userId),
        ]);

        return res.status(200).json({
            success: true,
            data: { attendance, employee }
        });
    } catch (error: any) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


// GET /api/attendance/monthly-sheet?month=9&year=2026
export const getMonthlySheet = async (req: Request, res: Response) => {
  try {
    const roleName = req.user?.role?.name
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    const companyId = req.user?.companyId;
    const userId = req.user?.id;

    const month = Number(req.query.month) || new Date().getMonth() + 1;
    const year = Number(req.query.year) || new Date().getFullYear();

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: "Invalid month",
      });
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: "Invalid year",
      });
    }

    if (!companyId || !userId) {
      return res.status(400).json({
        success: false,
        message: "User or company information is missing",
      });
    }

    // Employee: sirf apni attendance
    if (roleName === "employee") {
      const data = await AttendanceService.getMyAttendance(
        userId,
        companyId,
        month,
        year
      );

      return res.status(200).json({
        success: true,
        data,
      });
    }

    // Admin: company ki monthly attendance sheet
    if (roleName !== "super_admin" && roleName !== "company_admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const data = await SheetService.getMonthlySheet(
      companyId,
      month,
      year
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("Monthly sheet failed:", error);

    if (isDatabaseUnavailable(error)) {
      return sendDatabaseUnavailable(res);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch monthly attendance",
    });
  }
};

// attendance routes file mein (dynamic /:something routes se pehle):
// router.get("/monthly-sheet", protect, getMonthlySheet);
