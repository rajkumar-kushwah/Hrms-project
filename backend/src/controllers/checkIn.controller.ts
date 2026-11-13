import type { Request, Response } from "express";
import { prisma } from "../config/db.js";
import {
    isEmployeeRole,
    isSuperAdminRole,
} from "../utilis/roleUtils.js";

// check in controller

export const checkIn = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).session?.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        //  check role 
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                companyId: true,
                branchId: true,
                role: {
                    select: { name: true }
                }
            }
        });

        if (!isEmployeeRole(user?.role)) {
            return res.status(403).json({
                message: "Only employees can check in"
            });
        }

        const now = new Date();

        // today range
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        //  check already checked in today
        const existing = await prisma.attendance.findFirst({
            where: {
                userId,
                punchInTime: {
                    gte: start,
                    lte: end,
                },
            },
        });

        if (existing) {
            return res.status(400).json({ message: "Already checked in today" });
        }



        //  office time logic
        const officeTime = new Date();
        officeTime.setHours(10, 0, 0, 0);

        const graceTime = new Date();
        graceTime.setHours(10, 15, 0, 0);

        const halfDayTime = new Date();
        halfDayTime.setHours(14, 0, 0, 0);

        let status;

        if (now <= officeTime) {
            status = "P";
        } else if (now <= graceTime) {
            status = "P";
        } else if (now <= halfDayTime) {
            status = "Late";
        } else {
            status = "Half Day";
        }

        const lateMinutes = Math.floor(
            (now.getTime() - officeTime.getTime()) / (1000 * 60)
        );
        if (!user?.companyId || !user?.branchId) {
            return res.status(400).json({
                message: "Company or Branch not assigned.",
            });
        }

        // const companyId = (req.session as any).companyId;
        // create entry
        const attendance = await prisma.attendance.create({
            data: {
                userId,
                companyId: user.companyId,
                branchId: user.branchId,
                date: now,       //  fix (no mismatch)
                punchInTime: now,
                status,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    },
                },
            },
        });
        console.log("WITH USER:", attendance);

        res.status(200).json({
            message: "Check in successful",
            data: attendance,
        });

    } catch (error) {
        console.error("CHECKIN ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// check out controller

export const checkOut = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).session?.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // check role
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                role: {
                    select: { name: true }
                }
            }
        });

        if (!isEmployeeRole(user?.role)) {
            return res.status(403).json({
                message: "Only employees can check out"
            })
        }

        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const now = new Date();

        const companyId = (req.session as any).companyId;
        //  find active check-in (no checkout yet)
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId,
                companyId,
                punchOutTime: null, //  important
                punchInTime: {
                    gte: start,
                    lte: end,
                },
            },
            orderBy: {
                punchInTime: "desc",
            },
        });

        if (!attendance || !attendance.punchInTime) {
            return res.status(400).json({ message: "Invalid check-in data" });
        }


        const diffMs = now.getTime() - attendance.punchInTime!.getTime();

        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        const totalHours = totalMinutes / 60;
        const workingHours = +totalHours.toFixed(2);

        const overtimeMinutes =
            totalMinutes > 480 ? totalMinutes - 480 : 0;

        let finalStatus = attendance.status;

        if (workingHours < 4) {
            finalStatus = "Absent";
        } else if (workingHours < 8) {
            finalStatus = "Half Day";
        }

        //  update
        const updated = await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                punchOutTime: now,
                workingHours,
                status: finalStatus
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,

                    }
                }
            }
        });

        res.status(200).json({
            message: "Check out successful",
            data: updated,
        });

    } catch (error) {
        console.error("CHECKOUT ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// get attendance
export const getAttendance = async (req: Request, res: Response) => {
    try {
        const session: any = req.session;
        const userId = session?.userId;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // USER WITH ROLE FETCH
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                role: {
                    select: { name: true }
                }
            }
        });


        // checkin / checkout data fetch and condition
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const end = new Date();
        end.setHours(23, 59, 59, 999);

        const activeAttendance = await prisma.attendance.findFirst({
            where: {
                userId,
                punchOutTime: null, //  important
                punchInTime: {
                    gte: start,
                    lte: end,
                },
            },
            orderBy: {
                punchInTime: "desc",
            },
        });

        const isCheckedIn = !!activeAttendance;

        let data;

        const companyId = (req.session as any).companyId;
        //  SUPER ADMIN → ALL DATA
        if (isSuperAdminRole(user?.role)) {
            data = await prisma.attendance.findMany({
                where: { companyId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { date: "desc" },
            });
        }
        //  NORMAL USER → OWN DATA
        else {
            data = await prisma.attendance.findMany({
                where: { userId, companyId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { date: "desc" },
            });
        }

        return res.status(200).json({
            message: "Attendance fetched successfully",
            data,
            isCheckedIn,
            activeAttendance,
        });

    } catch (error) {
        console.error("GET ATTENDANCE ERROR:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// filter attendance

// export const filterAttendance = async (req: Request, res: Response) => {
//     try {
//         const userId = (req as any).session?.userId;
//         const { search, date, status } = req.query;


//         const searchDate = new Date(req.query.date as string);

//             const start = new Date(searchDate);
//             start.setHours(0, 0, 0, 0);

//             const end = new Date(searchDate);   
//             end.setHours(23, 59, 59, 999);



//         const attendance = await prisma.attendance.findMany({
//             where: {
//                 userId,
//                 ...(search && {
//                     user: {
//                         name: {
//                             contains: String(search),
//                             mode: 'insensitive'
//                         },
//                     },
//                 }),


//                 ...(date && {
//                     date: {
//                         gte: start,
//                         lte: end,
//                     },
//                 }),

//                 ...(status && {
//                     status: String(status),
//                 }),
//             },

//             include: {
//                 user: true,
//             },
//         });


//         return res.status(200).json({
//             success: true,
//             message: "Attendance filtered successfully",
//             data: attendance,
//         })

//     } catch (error) {
//         return res.status(500).json({
//             success: false,
//             message: "Filter error",
//         })
//     }
// }


export const filterAttendance = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).session?.userId;
        const { search, date, status } = req.query;

        // get user + roles
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });


        // base where
        let where: any = { companyId: (req.session as any).companyId };

        //  NORMAL USER restriction
        if (isSuperAdminRole(user?.role)) {
            where.userId = userId;
        }

        //  SEARCH filter
        if (search) {
            where.user = {
                name: {
                    contains: String(search),
                    mode: "insensitive",
                },
            };
        }

        //  DATE filter
        if (date) {
            const searchDate = new Date(date as string);

            const start = new Date(searchDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(searchDate);
            end.setHours(23, 59, 59, 999);

            where.date = {
                gte: start,
                lte: end,
            };
        }

        //  STATUS filter
        if (status) {
            where.status = String(status);
        }

        // final query
        const attendance = await prisma.attendance.findMany({
            where,
            include: {
                user: true,
            },
            orderBy: {
                date: "desc",
            },
        });

        return res.status(200).json({
            success: true,
            message: "Attendance filtered successfully",
            data: attendance,
        });
    } catch (error) {
        console.error("FILTER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Filter error",
        });
    }
};

// delete attendance 

export const deleteAttendance = async (req: Request, res: Response) => {
    try {
        const { ids } = req.body;

        if (!ids || ids.length === 0) {
            return res.status(400).json({ message: "Invalid ID" });
        }

        // delete attendance find
        await prisma.attendance.deleteMany({
            where: {
                id: {
                    in: ids
                },
                companyId: (req.session as any).companyId
            },
        })

        res.status(200).json({ message: "Attendance deleted successfully" });

    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Server error" });
    }
}