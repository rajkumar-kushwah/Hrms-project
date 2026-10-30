


//  check Permissions


import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db.js";
import { normalizeRoleName } from "../utilis/roleUtils.js";





// -- Role + Permission chek ek sath 
export const authorize = (moduleName: string, action: "canView" | "canCreate" | "canEdit" | "canDelete") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {

      const user = req.user;
      const roleId = user?.role?.id;
      const roleName = normalizeRoleName(req?.user?.role?.name);

      if (!roleId || !roleName) {
        return res.status(403).json({
          success: false,
          message: "No role assigned"
        });
      }

      // Super Admin ko direct allow karo — permission check ki zaroorat nahi
      if (roleName === "super_admin") {
        return next();
      }

      //  Baaki sabke liye permission check this
      const permission = await prisma.permission.findFirst({
        where: {
          roleId,
          module: { name: moduleName },
        }
      });

      if (!permission || !permission[action]) {
        return res.status(403).json({
          success: false,
          message: `Access denied for ${moduleName} ${action}`
        });
      }

      next();


    } catch (err) {
      return res.status(500).json({ success: false, message: 'Permission error' });
    }
  }


}

// role.middleware.ts mein add karo
export const checkSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (normalizeRoleName(req.user?.role?.name) !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Only Super Admin can perform this action"
    });
  }
  next();
};