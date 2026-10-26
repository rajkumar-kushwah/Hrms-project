
import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import bcrypt from "bcrypt";
import {
    isAdminRole,
    isSuperAdminRole,
    normalizeRoleName,
} from "../utilis/roleUtils.js";
import {
    isDatabaseUnavailable,
    sendDatabaseUnavailable,
} from "../utilis/dbErrors.js";

export const signin = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body ?? {};

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.trim() },
            include: {
                role: {
                    include: {
                        permissions: {
                            include: { module: true },
                        },
                    },
                },
                company: true,
            },
        });

        // Do not reveal whether the email exists.
        const passwordMatches = user
            ? await bcrypt.compare(password, user.password)
            : false;

        if (!user || !passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const roleName = normalizeRoleName(user.role?.name);
        const isAdmin = isAdminRole(roleName);
        const superAdmin = isSuperAdminRole(roleName);

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "User is inactive",
            });
        }

        if (!superAdmin && user.company && !user.company.isActive) {
            return res.status(403).json({
                success: false,
                message: "Company account is inactive",
            });
        }

        if (
            !isAdmin &&
            normalizeRoleName(user.employmentStatus) !== "active"
        ) {
            return res.status(403).json({
                success: false,
                message: "Onboarding is not completed. Login is not allowed.",
            });
        }

        req.session.userId = user.id;

        const loggedInAt = new Date();

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: loggedInAt },
        });

        const { password: _, ...userWithoutPassword } = user;

        req.session.save((err) => {
            if (err) {
                console.error("SESSION SAVE ERROR:", err);

                if (isDatabaseUnavailable(err)) {
                    return sendDatabaseUnavailable(res);
                }

                return res.status(500).json({
                    success: false,
                    message: "Session save failed",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Login successful",
                data: {
                    ...userWithoutPassword,
                    lastLogin: loggedInAt,
                },
            });
        });
    } catch (error: unknown) {
        console.error("Login Error:", error);

        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

export const logout = async (req: Request, res: Response) => {
    try {
        req.session.destroy((err: Error | null) => {
            if (err) {
                console.error("Logout Error:", err);

                if (isDatabaseUnavailable(err)) {
                    return sendDatabaseUnavailable(res);
                }

                return res.status(500).json({
                    success: false,
                    message: "Logout failed",
                });
            }

            res.clearCookie("sid", {
                path: "/",
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite:
                    process.env.NODE_ENV === "production" ? "none" : "lax",
            });

            return res.status(200).json({
                success: true,
                message: "Logged out successfully",
            });
        });
    } catch (error: unknown) {
        console.error("Logout Error:", error);

        if (isDatabaseUnavailable(error)) {
            return sendDatabaseUnavailable(res);
        }

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};
