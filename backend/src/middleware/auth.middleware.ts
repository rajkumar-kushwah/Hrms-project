
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db.js";
import { isDatabaseUnavailable, sendDatabaseUnavailable } from "../utilis/dbErrors.js";
import { normalizeRoleName } from "../utilis/roleUtils.js";

// export const protect = async (req: any, res: Response, next: NextFunction) => {
//   try {
//     const userId = req.session.userId;

//     if (!userId) {
//       return res.status(401).json({ message: "Not authorized" });
//     }

//     const user = await prisma.user.findUnique({
//       where: { id: userId },
//       include: {

//         roles: {
//           include: {
//             permissions: true
//           }
//         }

//     });

//     if (!user) {
//       return res.status(401).json({ message: "Invalid session" });
//     }

//     req.user = user;
//     req.company = user.company;

//     next();
//   } catch (error) {
//     return res.status(500).json({ message: "Auth error" });
//   }
// };




export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - Please login"
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        companyId: true, // agar hai to
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        roleId: true,
        role: {
          select: {
            id: true,
            name: true,   // "super_admin" etc.
            permissions: {
              select: {
                canView: true,
                canCreate: true,
                canDelete: true,
                canEdit: true,
                module: {
                  select: {
                    id: true,
                    name: true,
                    displayName: true,
                    icon: true,
                    url: true,
                    parentId: true,
                    order: true,
                  }
                }
              }
            }
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
            isActive: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        }

      },
    })

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    if (
      normalizeRoleName(user.role?.name) !== "super_admin" &&
      (!user.companyId || !user.company?.isActive)
    ) {
      return res.status(403).json({
        success: false,
        message: "Company is inactive or not assigned",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    console.log("Auth Protect Error: ", error);
    if (isDatabaseUnavailable(error)) {
      return sendDatabaseUnavailable(res);
    }
    return res.status(500).json({ message: "Auth error" });
  }
};


