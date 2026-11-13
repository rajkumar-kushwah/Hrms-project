// Check Permissions

import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db.js";
import {
  isSuperAdminRole,
} from "../utilis/roleUtils.js";

// ─────────────────────────────────────────────────────────────
// Role + Permission Check
// ─────────────────────────────────────────────────────────────

export const authorize = (
  moduleName: string,
  action: "canView" | "canCreate" | "canEdit" | "canDelete"
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      const roleId = user?.role?.id;

      if (!roleId) {
        return res.status(403).json({
          success: false,
          message: "No role assigned",
        });
      }

      // Super Admin ko direct allow karo
      if (isSuperAdminRole(user)) {
        return next();
      }

      // Baaki roles ke liye permission check
      const permission = await prisma.permission.findFirst({
        where: {
          roleId,
          module: {
            name: moduleName,
          },
        },
      });

      if (!permission || !permission[action]) {
        return res.status(403).json({
          success: false,
          message: `Access denied for ${moduleName} ${action}`,
        });
      }

      return next();
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Permission error",
      });
    }
  };
};

// ─────────────────────────────────────────────────────────────
// Only Super Admin
// ─────────────────────────────────────────────────────────────

export const checkSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!isSuperAdminRole(req.user)) {
    return res.status(403).json({
      success: false,
      message: "Only Super Admin can perform this action",
    });
  }

  return next();
};





// import type { NextFunction, Request, Response } from "express";
// import { prisma } from "../config/db.js";
// import { isTrustedPlatformAdmin } from "../utilis/platformAdminUtils.js";

// // Role + Permission Check
// export const authorize = (
//     moduleName: string,
//     action: "canView" | "canCreate" | "canEdit" | "canDelete" | "canPermanentDelete"
// ) => {
//     return async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             const roleId = req.user?.role?.id;

//             if (!roleId) {
//                 return res.status(403).json({
//                     success: false,
//                     message: "No role assigned",
//                 });
//             }

//             const permission = await prisma.permission.findFirst({
//                 where: {
//                     roleId,
//                     module: {
//                         name: moduleName,
//                         isActive: true,
//                     },
//                 },
//             });

//             if (!permission || permission[action] !== true) {
//                 return res.status(403).json({
//                     success: false,
//                     message: `Access denied for ${moduleName} ${action}`,
//                 });
//             }

//             return next();
//         } catch (err) {
//             console.error("Permission error:", err);

//             return res.status(500).json({
//                 success: false,
//                 message: "Permission error",
//             });
//         }
//     };
// };

// // Only trusted platform administrator
// export const requirePlatformAdmin = (
//     req: Request,
//     res: Response,
//     next: NextFunction
// ) => {
//     if (!isTrustedPlatformAdmin(req.user)) {
//         return res.status(403).json({
//             success: false,
//             message: "Platform administrator access required",
//         });
//     }

//     return next();
// };
