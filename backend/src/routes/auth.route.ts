import { signin, logout } from "../controllers/auth.controller.js";
import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { changePassword, getProfile, updateProfile } from "../controllers/profile.controller.js";
import { validate } from "../middleware/validation.middleware.js";
import { signinSchema } from "../validations/auth.validator.js";
import { updateProfileSchema, changePasswordSchema } from "../validations/profile.validator.js";

// signup, deleteUser, logout, UpdateUser

const router = express.Router();

// const authRouter = express.Router();

// authRouter.post('/signup', signup)
router.post('/signin', validate(signinSchema), signin)
// authRouter.delete('/users/:id', deleteUser)
router.post('/logout', protect, logout)
router.get('/profile', protect, getProfile)
router.put("/profile", protect, validate(updateProfileSchema), updateProfile);
router.patch("/profile/change-password", protect, validate(changePasswordSchema), changePassword);

// authRouter.put('/users/:id', protect, UpdateUser)

export default router

