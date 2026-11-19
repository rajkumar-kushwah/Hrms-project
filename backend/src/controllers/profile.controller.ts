
import { type Request, type Response } from "express";

import {
  updateProfileService,
  changePasswordService,
  uploadProfilePhotoService,
} from "../services/profile.service.js";

// Get profile
export const getProfile = async (req: Request, res: Response) => {
  const user = req.user;

  return res.status(200).json({
    success: true,
    message: "User profile",
    data: user,
  });
};

// Update profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;

    const updated = await updateProfileService(userId, req.body);

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updated,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// Upload profile photo
export const uploadProfilePhoto = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a profile photo",
      });
    }

    const updatedUser = await uploadProfilePhotoService(
      userId,
      req.file
    );

    return res.status(200).json({
      success: true,
      message: "Profile photo updated successfully",
      data: updatedUser,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Profile photo upload failed",
    });
  }
};

// Change password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const result = await changePasswordService(
      userId,
      oldPassword,
      newPassword
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
