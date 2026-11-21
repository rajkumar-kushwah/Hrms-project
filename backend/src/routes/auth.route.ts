
import { signin, logout } from "../controllers/auth.controller.js";
import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { uploadProfilePhoto } from "../middleware/upload.middleware.js";

import {
    changePassword,
    getProfile,
    removeProfilePhoto,
    updateProfile,
    uploadProfilePhoto as uploadProfilePhotoController,
} from "../controllers/profile.controller.js";

import { validate } from "../middleware/validation.middleware.js";
import { signinSchema } from "../validations/auth.validator.js";
import {
    updateProfileSchema,
    changePasswordSchema,
} from "../validations/profile.validator.js";

const router = express.Router();

router.post("/signin", validate(signinSchema), signin);
router.post("/logout", protect, logout);

router.get("/profile", protect, getProfile);
router.put("/profile", protect, validate(updateProfileSchema), updateProfile);

router.patch("/profile/change-password", protect, validate(changePasswordSchema), changePassword);

// Upload profile photo
router.post("/profile/photo", protect, uploadProfilePhoto.single("profilePhoto"), uploadProfilePhotoController);

router.delete("/profile/photo", protect, removeProfilePhoto);

export default router;
