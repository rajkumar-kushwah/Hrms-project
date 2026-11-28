


// import type { NextFunction, Request, Response } from "express";
// import { 
//   isSuperAdminRole, 
//   hasModulePermission 
// } from "../utilis/roleUtils.js";

// // ─────────────────────────────────────────────────────────────
// // Role + Permission Check (Optimized - No Extra DB Hits)
// // ─────────────────────────────────────────────────────────────

// export const authorize = (
//   moduleName: string,
//   action: "canView" | "canCreate" | "canEdit" | "canDelete"
// ) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     try {
//       const user = req.user;

//       if (!user || !user.roleId) {
//         return res.status(403).json({
//           success: false,
//           message: "Unauthorized or no role assigned",
//         });
//       }

//       // 1. Super Admin bypasses all checks
//       if (isSuperAdminRole(user)) {
//         return next();
//       }

//       // 2. Map action ("canView" -> "view", "canCreate" -> "create", etc.)
//       const actionType = action.replace("can", "").toLowerCase() as "view" | "create" | "edit" | "delete";

//       // 3. Check permissions directly from pre-fetched req.user (In-Memory, Zero DB queries)
//       const allowed = hasModulePermission(user, moduleName, actionType);

//       if (!allowed) {
//         return res.status(403).json({
//           success: false,
//           message: `Access denied for ${moduleName} (${action})`,
//         });
//       }

//       return next();
//     } catch (err) {
//       console.error("Authorization Error:", err);
//       return res.status(500).json({
//         success: false,
//         message: "Permission check error",
//       });
//     }
//   };
// };

// // ─────────────────────────────────────────────────────────────
// // Only Super Admin
// // ─────────────────────────────────────────────────────────────

// export const checkSuperAdmin = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   if (!isSuperAdminRole(req.user)) {
//     return res.status(403).json({
//       success: false,
//       message: "Only Super Admin can perform this action",
//     });
//   }

//   return next();
// };




import type { NextFunction, Request, Response } from "express";
import {
  isSuperAdminRole,
  hasModulePermission,
} from "../utilis/roleUtils.js";

// Module permission check
export const authorize = (
  moduleName: string,
  action: "canView" | "canCreate" | "canEdit" | "canDelete"
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user || !user.roleId || !user.role) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized or no role assigned",
        });
      }

      const actionType = action.replace("can", "").toLowerCase() as
        | "view"
        | "create"
        | "edit"
        | "delete";

      // Every role, including Super Admin, must have module permission.
      const allowed = hasModulePermission(user, moduleName, actionType);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `Access denied for ${moduleName} (${action})`,
        });
      }

      return next();
    } catch (error) {
      console.error("Authorization Error:", error);

      return res.status(500).json({
        success: false,
        message: "Permission check error",
      });
    }
  };
};

// Identity-specific check.
// Use only for operations that must be restricted to Super Admin identity,
// not for ordinary module access.
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
