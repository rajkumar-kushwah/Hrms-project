import { prisma } from "../config/db.js";
import { isWithinGeoFence, calculateDistance } from "../utilis/geoFencing.js";

const normalizeName = (value?: string | null) => {
    return value
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_");
};

//  Helper — Settings lo (default fallback ke saath)
const getCompanySettings = async (companyId: string) => {
    let settings = await prisma.companySettings.findUnique({
        where: { companyId },
    });

    if (!settings) {
        // Agar settings nahi bani, default create karo
        settings = await prisma.companySettings.create({
            data: { companyId },
        });
    }

    return settings;
};

// ─── Punch In ─────────────────────────────
export const punchIn = async (
    userId: string,
    companyId: string,
    data: { latitude: number; longitude: number; }
) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { branch: true }
    });

    if (!user) throw new Error("Employee not found");
    if (!user.branchId || !user.branch) throw new Error("No branch assigned to you");

    const branch = user.branch;

    //  Settings lo
    const settings = await getCompanySettings(companyId);

    let isWithinFence = true;
    if (branch.latitude && branch.longitude && branch.geoRadius) {
        isWithinFence = isWithinGeoFence(
            data.latitude, data.longitude,
            branch.latitude, branch.longitude,
            branch.geoRadius
        );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findUnique({
        where: { userId_date: { userId, date: today } }
    });

    if (existing && existing.punchInTime) {
        throw new Error("You have already punched in today");
    }

    //  Proper timezone conversion — DST safe, reliable
    const getISTTime = (date: Date) => {
        const istString = date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
        return new Date(istString);
    };

    const now = new Date();
    const nowIST = getISTTime(now);

    //  Settings se cutoff lo
    const cutoffHour = settings.lateMarkHour;
    const cutoffMinute = settings.lateMarkMinute;
    const isLate = nowIST.getHours() > cutoffHour ||
        (nowIST.getHours() === cutoffHour && nowIST.getMinutes() > cutoffMinute);

    const attendance = await prisma.attendance.upsert({
        where: { userId_date: { userId, date: today } },
        update: {
            punchInTime: now,
            punchInLat: data.latitude,
            punchInLng: data.longitude,
            isWithinGeoFence: isWithinFence,
            status: isLate ? "Late" : "Present",
        },
        create: {
            userId, companyId, branchId: user.branchId, date: today,
            punchInTime: now,
            punchInLat: data.latitude,
            punchInLng: data.longitude,
            isWithinGeoFence: isWithinFence,
            status: isLate ? "Late" : "Present",
        }
    });

    return {
        attendance,
        isWithinFence,
        message: isWithinFence
            ? "Punched in successfully"
            : "Punched in — but you are outside the branch location",
    };
};

// ─── Punch Out ────────────────────────────
export const punchOut = async (
    userId: string,
    companyId: string, //  Naya parameter add kiya
    data: { latitude: number; longitude: number; }
) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
        where: { userId_date: { userId, date: today } }
    });

    if (!attendance || !attendance.punchInTime) {
        throw new Error("You haven't punched in today");
    }

    if (attendance.punchOutTime) {
        throw new Error("You have already punched out today");
    }

    //  Settings lo
    const settings = await getCompanySettings(companyId);

    const now = new Date();
    const workingHours =
        (now.getTime() - attendance.punchInTime.getTime()) / (1000 * 60 * 60);

    //  Settings se half-day threshold lo
    let status = attendance.status;
    if (workingHours < settings.halfDayHours) {
        status = "Half-day";
    }

    const updated = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
            punchOutTime: now,
            punchOutLat: data.latitude,
            punchOutLng: data.longitude,
            workingHours: parseFloat(workingHours.toFixed(2)),
            status,
        }
    });

    return { attendance: updated, message: "Punched out successfully" };
};

// ─── Today's Attendance Status ───────────
export const getTodayAttendance = async (userId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await prisma.attendance.findUnique({
        where: { userId_date: { userId, date: today } }
    });
};

// ─── Get My Attendance History ───────────
// export const getMyAttendance = async (
//     userId: string,
//     companyId: string,
//     month?: number,
//     year?: number
// ) => {
//     const settings = await getCompanySettings(companyId);
//     const weekOffDays = settings.weekOffDays;

//     const targetMonth = month ?? new Date().getMonth() + 1;
//     const targetYear = year ?? new Date().getFullYear();

//     const startDate = new Date(targetYear, targetMonth - 1, 1);
//     startDate.setHours(0, 0, 0, 0);

//     const endDate = new Date(targetYear, targetMonth, 0);
//     endDate.setHours(0, 0, 0, 0);

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const records = await prisma.attendance.findMany({
//         where: {
//             userId,
//             date: { gte: startDate, lte: endDate },
//         },
//         orderBy: { date: "asc" },
//     });

//     //  Naya — Approved leaves is month ke liye fetch karo
//     const approvedLeaves = await prisma.leaveRequest.findMany({
//         where: {
//             userId,
//             status: "Approved",
//             startDate: { lte: endDate },
//             endDate: { gte: startDate },
//         },
//         include: { leaveType: { select: { name: true } } }
//     });

//     const getDateKey = (d: Date) => {
//         return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
//     };

//     const attendanceMap = new Map(
//         records.map((record) => [getDateKey(new Date(record.date)), record])
//     );

//     //  Naya — Leave dates ka map banao
//     const leaveMap = new Map<string, string>();
//     for (const leave of approvedLeaves) {
//         const lStart = new Date(Math.max(leave.startDate.getTime(), startDate.getTime()));
//         const lEnd = new Date(Math.min(leave.endDate.getTime(), endDate.getTime()));
//         for (let d = new Date(lStart); d <= lEnd; d.setDate(d.getDate() + 1)) {
//             leaveMap.set(getDateKey(new Date(d)), leave.leaveType.name);
//         }
//     }

//     const result: any[] = [];
//     const todayKey = getDateKey(today);

//     for (
//         let d = new Date(startDate);
//         d <= endDate;
//         d.setDate(d.getDate() + 1)
//     ) {
//         const currentDate = new Date(d);
//         const key = getDateKey(currentDate);

//         if (key > todayKey) {
//             continue;
//         }

//         const isWeekOff = weekOffDays.includes(currentDate.getDay());
//         const attendance = attendanceMap.get(key);
//         const leaveTypeName = leaveMap.get(key); //  Naya

//         //  Priority 1 — Real punch-in record (agar employee aa gaya, chahe leave bhi ho)
//         if (attendance) {
//             result.push(attendance);
//             continue;
//         }

//         //  Priority 2 — Approved Leave (naya block)
//         if (leaveTypeName) {
//             result.push({
//                 id: `leave-${key}`,
//                 userId, companyId, branchId: null,
//                 date: new Date(currentDate),
//                 punchInTime: null, punchOutTime: null,
//                 punchInLat: null, punchInLng: null,
//                 punchOutLat: null, punchOutLng: null,
//                 workingHours: 0, isWithinGeoFence: false,
//                 status: `On Leave (${leaveTypeName})`,
//                 createdAt: new Date(), updatedAt: new Date(),
//             });
//             continue;
//         }

//         // Priority 3 — Week Off
//         if (isWeekOff) {
//             result.push({
//                 id: `weekoff-${key}`,
//                 userId, companyId, branchId: null,
//                 date: new Date(currentDate),
//                 punchInTime: null, punchOutTime: null,
//                 punchInLat: null, punchInLng: null,
//                 punchOutLat: null, punchOutLng: null,
//                 workingHours: 0, isWithinGeoFence: false,
//                 status: "Week Off",
//                 createdAt: new Date(), updatedAt: new Date(),
//             });
//             continue;
//         }

//         // Priority 4 — Absent
//         result.push({
//             id: `absent-${key}`,
//             userId, companyId, branchId: null,
//             date: new Date(currentDate),
//             punchInTime: null, punchOutTime: null,
//             punchInLat: null, punchInLng: null,
//             punchOutLat: null, punchOutLng: null,
//             workingHours: 0, isWithinGeoFence: false,
//             status: "Absent",
//             createdAt: new Date(), updatedAt: new Date(),
//         });
//     }

//     return result.reverse();
// };



export const getMyAttendance = async (
    userId: string,
    companyId: string,
    month?: number,
    year?: number
) => {
    const settings = await getCompanySettings(companyId);
    const weekOffDays = settings.weekOffDays;

    const targetMonth = month ?? new Date().getMonth() + 1;
    const targetYear = year ?? new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(targetYear, targetMonth, 0);
    endDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Date ko YYYY-MM-DD format mein convert karne ke liye
    const getDateKey = (d: Date) => {
        return `${d.getFullYear()}-${String(
            d.getMonth() + 1
        ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };

    // Attendance records
    const records = await prisma.attendance.findMany({
        where: {
            userId,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        orderBy: {
            date: "asc",
        },
    });

    // Holidays fetch
    const holidays = await prisma.holiday.findMany({
        where: {
            companyId,
            isActive: true,
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            name: true,
            date: true,
        },
    });

    // Holiday map
    const holidaySet = new Map<string, string>();

    for (const holiday of holidays) {
        holidaySet.set(
            getDateKey(new Date(holiday.date)),
            holiday.name
        );
    }

    // Attendance map
    const attendanceMap = new Map(
        records.map((record) => [
            getDateKey(new Date(record.date)),
            record,
        ])
    );

    // Approved leaves fetch
    const approvedLeaves = await prisma.leaveRequest.findMany({
        where: {
            userId,
            status: "Approved",
            startDate: {
                lte: endDate,
            },
            endDate: {
                gte: startDate,
            },
        },
        include: {
            leaveType: {
                select: {
                    name: true,
                },
            },
        },
    });

    // Leave dates map
    const leaveMap = new Map<string, string>();

    for (const leave of approvedLeaves) {
        const lStart = new Date(
            Math.max(
                leave.startDate.getTime(),
                startDate.getTime()
            )
        );

        const lEnd = new Date(
            Math.min(
                leave.endDate.getTime(),
                endDate.getTime()
            )
        );

        for (
            let d = new Date(lStart);
            d <= lEnd;
            d.setDate(d.getDate() + 1)
        ) {
            leaveMap.set(
                getDateKey(new Date(d)),
                leave.leaveType.name
            );
        }
    }

    const result: any[] = [];

    const todayKey = getDateKey(today);

    // Month ke har din ko check karo
    for (
        let d = new Date(startDate);
        d <= endDate;
        d.setDate(d.getDate() + 1)
    ) {
        const currentDate = new Date(d);

        const key = getDateKey(currentDate);

        // Future dates nahi dikhani
        if (key > todayKey) {
            continue;
        }

        // Existing attendance record
        const attendance = attendanceMap.get(key);

        // Approved leave
        const leaveTypeName = leaveMap.get(key);

        // Holiday
        const holidayName = holidaySet.get(key);

        // Week off
        const isWeekOff = weekOffDays.includes(
            currentDate.getDay()
        );

        // ------------------------------------------------
        // Priority 1 - Real attendance
        // ------------------------------------------------
        if (attendance) {
            result.push(attendance);
            continue;
        }

        // ------------------------------------------------
        // Priority 2 - Holiday
        // ------------------------------------------------
        if (holidayName) {
            result.push({
                id: `holiday-${key}`,
                userId,
                companyId,
                branchId: null,

                date: new Date(currentDate),

                punchInTime: null,
                punchOutTime: null,

                punchInLat: null,
                punchInLng: null,

                punchOutLat: null,
                punchOutLng: null,

                workingHours: 0,
                isWithinGeoFence: false,

                status: "Holiday",
                holidayName,

                createdAt: new Date(),
                updatedAt: new Date(),
            });

            continue;
        }

        // ------------------------------------------------
        // Priority 3 - Approved Leave
        // ------------------------------------------------
        if (leaveTypeName) {
            result.push({
                id: `leave-${key}`,
                userId,
                companyId,
                branchId: null,

                date: new Date(currentDate),

                punchInTime: null,
                punchOutTime: null,

                punchInLat: null,
                punchInLng: null,

                punchOutLat: null,
                punchOutLng: null,

                workingHours: 0,
                isWithinGeoFence: false,

                status: `On Leave (${leaveTypeName})`,

                createdAt: new Date(),
                updatedAt: new Date(),
            });

            continue;
        }

        // ------------------------------------------------
        // Priority 4 - Week Off
        // ------------------------------------------------
        if (isWeekOff) {
            result.push({
                id: `weekoff-${key}`,
                userId,
                companyId,
                branchId: null,

                date: new Date(currentDate),

                punchInTime: null,
                punchOutTime: null,

                punchInLat: null,
                punchInLng: null,

                punchOutLat: null,
                punchOutLng: null,

                workingHours: 0,
                isWithinGeoFence: false,

                status: "Week Off",

                createdAt: new Date(),
                updatedAt: new Date(),
            });

            continue;
        }

        // ------------------------------------------------
        // Priority 5 - Absent
        // ------------------------------------------------
        result.push({
            id: `absent-${key}`,
            userId,
            companyId,
            branchId: null,

            date: new Date(currentDate),

            punchInTime: null,
            punchOutTime: null,

            punchInLat: null,
            punchInLng: null,

            punchOutLat: null,
            punchOutLng: null,

            workingHours: 0,
            isWithinGeoFence: false,

            status: "Absent",

            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }

    return result.reverse();
};


// ─── Get All Employees Attendance (Admin) ──


// export const getAllAttendance = async (
//     companyId: string | null,
//     date?: string
// ) => {
//     // ─────────────────────────────────────────────
//     // Target Date
//     // ─────────────────────────────────────────────

//     const targetDate = date
//         ? new Date(date)
//         : new Date();

//     targetDate.setHours(0, 0, 0, 0);

//     // ─────────────────────────────────────────────
//     // Company Settings
//     // ─────────────────────────────────────────────

//     let weekOffDays = [0];

//     if (companyId) {
//         const settings = await getCompanySettings(companyId);
//         weekOffDays = settings.weekOffDays;
//     }

//     // ─────────────────────────────────────────────
//     // Employees
//     // ─────────────────────────────────────────────

//     const users = await prisma.user.findMany({
//         where: {
//             // Company Admin → only own company
//             // Super Admin → all companies
//             ...(companyId
//                 ? {
//                     companyId,
//                 }
//                 : {
//                     companyId: {
//                         not: null,
//                     },
//                 }),

//             isActive: true,

//             // Role relation
//             role: {
//                 isSystemRole: false,
//             },
//         },

//         select: {
//             id: true,
//             name: true,
//             email: true,
//             employeeCode: true,
//             designation: true,

//             role: {
//                 select: {
//                     name: true,
//                     isSystemRole: true,
//                 },
//             },

//             branch: {
//                 select: {
//                     id: true,
//                     name: true,
//                 },
//             },
//         },
//     });

//     // ─────────────────────────────────────────────
//     // Extra role filtering using normalized name
//     // ─────────────────────────────────────────────

//     const employees = users.filter((user) => {
//         const roleName = normalizeName(user.role?.name);

//         // System roles ko attendance employee list se remove karo
//         if (
//             roleName === normalizeName("company_admin") ||
//             roleName === normalizeName("super_admin")
//         ) {
//             return false;
//         }

//         return true;
//     });

//     // ─────────────────────────────────────────────
//     // Attendance Records
//     // ─────────────────────────────────────────────

//     const records = await prisma.attendance.findMany({
//         where: {
//             ...(companyId
//                 ? {
//                     companyId,
//                 }
//                 : {}),

//             date: targetDate,
//         },

//         include: {
//             user: {
//                 select: {
//                     id: true,
//                     name: true,
//                     employeeCode: true,
//                     designation: true,
//                 },
//             },

//             branch: {
//                 select: {
//                     id: true,
//                     name: true,
//                 },
//             },
//         },

//         orderBy: {
//             punchInTime: "desc",
//         },
//     });

//     // ─────────────────────────────────────────────
//     // Approved Leaves
//     // ─────────────────────────────────────────────

//     const approvedLeaves =
//         await prisma.leaveRequest.findMany({
//             where: {
//                 ...(companyId
//                     ? {
//                         companyId,
//                     }
//                     : {}),

//                 status: "Approved",

//                 startDate: {
//                     lte: targetDate,
//                 },

//                 endDate: {
//                     gte: targetDate,
//                 },
//             },

//             include: {
//                 leaveType: {
//                     select: {
//                         name: true,
//                     },
//                 },
//             },
//         });

//     // ─────────────────────────────────────────────
//     // Leave Map
//     // ─────────────────────────────────────────────

//     const leaveMap = new Map<string, string>();

//     for (const leave of approvedLeaves) {
//         leaveMap.set(
//             leave.userId,
//             leave.leaveType.name
//         );
//     }

//     // ─────────────────────────────────────────────
//     // Attendance Map
//     // ─────────────────────────────────────────────

//     const recordMap = new Map(
//         records.map((record) => [
//             record.userId,
//             record,
//         ])
//     );

//     // ─────────────────────────────────────────────
//     // Week Off
//     // ─────────────────────────────────────────────

//     const isWeekOff = weekOffDays.includes(
//         targetDate.getDay()
//     );

//     // ─────────────────────────────────────────────
//     // Date Key
//     // ─────────────────────────────────────────────

//     const dateKey = targetDate
//         .toISOString()
//         .split("T")[0];

//     // ─────────────────────────────────────────────
//     // Final Result
//     // ─────────────────────────────────────────────

//     const result = employees.map((employee) => {

//         // ─────────────────────────────────────────
//         // Priority 1 — Actual Attendance
//         // ─────────────────────────────────────────

//         const existing = recordMap.get(employee.id);

//         if (existing) {
//             // Agar punch-in + punch-out dono hain
//             // to wahi actual record return hoga.
//             return existing;
//         }

//         // ─────────────────────────────────────────
//         // Priority 2 — Approved Leave
//         // ─────────────────────────────────────────

//         const leaveTypeName =
//             leaveMap.get(employee.id);

//         if (leaveTypeName) {
//             return {
//                 id: `leave-${employee.id}-${dateKey}`,

//                 userId: employee.id,
//                 companyId,

//                 branchId:
//                     employee.branch?.id ?? null,

//                 date: targetDate,

//                 punchInTime: null,
//                 punchOutTime: null,

//                 punchInLat: null,
//                 punchInLng: null,

//                 punchOutLat: null,
//                 punchOutLng: null,

//                 workingHours: 0,
//                 isWithinGeoFence: false,

//                 status: `On Leave (${leaveTypeName})`,

//                 createdAt: new Date(),
//                 updatedAt: new Date(),

//                 user: {
//                     id: employee.id,
//                     name: employee.name,
//                     employeeCode:
//                         employee.employeeCode,
//                     designation:
//                         employee.designation,
//                 },

//                 branch: employee.branch,
//             };
//         }

//         // ─────────────────────────────────────────
//         // Priority 3 — Week Off
//         // ─────────────────────────────────────────

//         if (isWeekOff) {
//             return {
//                 id: `weekoff-${employee.id}-${dateKey}`,

//                 userId: employee.id,
//                 companyId,

//                 branchId:
//                     employee.branch?.id ?? null,

//                 date: targetDate,

//                 punchInTime: null,
//                 punchOutTime: null,

//                 punchInLat: null,
//                 punchInLng: null,

//                 punchOutLat: null,
//                 punchOutLng: null,

//                 workingHours: 0,
//                 isWithinGeoFence: false,

//                 status: "Week Off",

//                 createdAt: new Date(),
//                 updatedAt: new Date(),

//                 user: {
//                     id: employee.id,
//                     name: employee.name,
//                     employeeCode:
//                         employee.employeeCode,
//                     designation:
//                         employee.designation,
//                 },

//                 branch: employee.branch,
//             };
//         }

//         // ─────────────────────────────────────────
//         // Priority 4 — Absent
//         // ─────────────────────────────────────────

//         return {
//             id: `absent-${employee.id}-${dateKey}`,

//             userId: employee.id,
//             companyId,

//             branchId:
//                 employee.branch?.id ?? null,

//             date: targetDate,

//             punchInTime: null,
//             punchOutTime: null,

//             punchInLat: null,
//             punchInLng: null,

//             punchOutLat: null,
//             punchOutLng: null,

//             workingHours: 0,
//             isWithinGeoFence: false,

//             status: "Absent",

//             createdAt: new Date(),
//             updatedAt: new Date(),

//             user: {
//                 id: employee.id,
//                 name: employee.name,
//                 employeeCode:
//                     employee.employeeCode,
//                 designation:
//                     employee.designation,
//             },

//             branch: employee.branch,
//         };
//     });

//     return result;
// };


// ─── Get All Employees Attendance (Admin) ─────────────────────

export const getAllAttendance = async (
    companyId: string | null,
    date?: string
) => {
    // ─────────────────────────────────────────────
    // Target Date
    // ─────────────────────────────────────────────

    const targetDate = date
        ? new Date(date)
        : new Date();

    targetDate.setHours(0, 0, 0, 0);

    // ─────────────────────────────────────────────
    // Company Settings
    // ─────────────────────────────────────────────

    let weekOffDays = [0];

    if (companyId) {
        const settings = await getCompanySettings(companyId);
        weekOffDays = settings.weekOffDays;
    }

    // ─────────────────────────────────────────────
    // Users
    // ─────────────────────────────────────────────

    const users = await prisma.user.findMany({
        where: {
            ...(companyId
                ? {
                    companyId,
                }
                : {
                    companyId: {
                        not: null,
                    },
                }),

            isActive: true,
        },

        select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
            designation: true,
            companyId: true,

            role: {
                select: {
                    name: true,
                    isSystemRole: true,
                },
            },

            branch: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

    // ─────────────────────────────────────────────
    // ONLY EMPLOYEES
    // Role name comparison normalized
    // ─────────────────────────────────────────────

    const employees = users.filter((user) => {
        const roleName = normalizeName(user.role?.name);

        const companyAdminRole =
            normalizeName("company_admin");

        const superAdminRole =
            normalizeName("super_admin");

        if (
            roleName === companyAdminRole ||
            roleName === superAdminRole
        ) {
            return false;
        }

        return true;
    });

    // ─────────────────────────────────────────────
    // Attendance Records
    // ─────────────────────────────────────────────

    const records = await prisma.attendance.findMany({
        where: {
            ...(companyId
                ? {
                    companyId,
                }
                : {}),

            date: targetDate,
        },

        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    employeeCode: true,
                    designation: true,
                    role: {
                        select: {
                            name: true,
                        },
                    },
                },
            },

            branch: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },

        orderBy: {
            punchInTime: "desc",
        },
    });

    // ─────────────────────────────────────────────
    // Remove attendance of admin/system roles
    // ─────────────────────────────────────────────

    const employeeIds = new Set(
        employees.map((employee) => employee.id)
    );

    const employeeRecords = records.filter((record) =>
        employeeIds.has(record.userId)
    );

    // ─────────────────────────────────────────────
    // Approved Leaves
    // ─────────────────────────────────────────────

    const approvedLeaves =
        await prisma.leaveRequest.findMany({
            where: {
                ...(companyId
                    ? {
                        companyId,
                    }
                    : {}),

                status: "Approved",

                startDate: {
                    lte: targetDate,
                },

                endDate: {
                    gte: targetDate,
                },
            },

            include: {
                leaveType: {
                    select: {
                        name: true,
                    },
                },
            },
        });

    // ─────────────────────────────────────────────
    // Leave Map
    // ─────────────────────────────────────────────

    const leaveMap = new Map<string, string>();

    for (const leave of approvedLeaves) {
        leaveMap.set(
            leave.userId,
            leave.leaveType.name
        );
    }

    // ─────────────────────────────────────────────
    // Attendance Map
    // ─────────────────────────────────────────────

    const recordMap = new Map(
        employeeRecords.map((record) => [
            record.userId,
            record,
        ])
    );

    // ─────────────────────────────────────────────
    // Week Off
    // ─────────────────────────────────────────────

    const isWeekOff = weekOffDays.includes(
        targetDate.getDay()
    );

    // ─────────────────────────────────────────────
    // Date Key
    // ─────────────────────────────────────────────

    const dateKey = targetDate
        .toISOString()
        .split("T")[0];

    // ─────────────────────────────────────────────
    // Final Result
    // ─────────────────────────────────────────────

    const result = employees.map((employee) => {

        // ─────────────────────────────────────────
        // Priority 1 — ACTUAL ATTENDANCE
        // ─────────────────────────────────────────

        const existing = recordMap.get(employee.id);

        if (existing) {
            // IMPORTANT:
            // Punch-in only:
            // punchOutTime = null
            //
            // Punch-out done:
            // punchOutTime = actual checkout time
            //
            // workingHours = actual working hours

            return existing;
        }

        // ─────────────────────────────────────────
        // Priority 2 — Approved Leave
        // ─────────────────────────────────────────

        const leaveTypeName =
            leaveMap.get(employee.id);

        if (leaveTypeName) {
            return {
                id: `leave-${employee.id}-${dateKey}`,

                userId: employee.id,
                companyId,

                branchId:
                    employee.branch?.id ?? null,

                date: targetDate,

                punchInTime: null,
                punchOutTime: null,

                punchInLat: null,
                punchInLng: null,

                punchOutLat: null,
                punchOutLng: null,

                workingHours: 0,
                isWithinGeoFence: false,

                status: `On Leave (${leaveTypeName})`,

                createdAt: new Date(),
                updatedAt: new Date(),

                user: {
                    id: employee.id,
                    name: employee.name,
                    employeeCode:
                        employee.employeeCode,
                    designation:
                        employee.designation,
                },

                branch: employee.branch,
            };
        }

        // ─────────────────────────────────────────
        // Priority 3 — Week Off
        // ─────────────────────────────────────────

        if (isWeekOff) {
            return {
                id: `weekoff-${employee.id}-${dateKey}`,

                userId: employee.id,
                companyId,

                branchId:
                    employee.branch?.id ?? null,

                date: targetDate,

                punchInTime: null,
                punchOutTime: null,

                punchInLat: null,
                punchInLng: null,

                punchOutLat: null,
                punchOutLng: null,

                workingHours: 0,
                isWithinGeoFence: false,

                status: "Week Off",

                createdAt: new Date(),
                updatedAt: new Date(),

                user: {
                    id: employee.id,
                    name: employee.name,
                    employeeCode:
                        employee.employeeCode,
                    designation:
                        employee.designation,
                },

                branch: employee.branch,
            };
        }

        // ─────────────────────────────────────────
        // Priority 4 — Absent
        // ─────────────────────────────────────────

        return {
            id: `absent-${employee.id}-${dateKey}`,

            userId: employee.id,
            companyId,

            branchId:
                employee.branch?.id ?? null,

            date: targetDate,

            punchInTime: null,
            punchOutTime: null,

            punchInLat: null,
            punchInLng: null,

            punchOutLat: null,
            punchOutLng: null,

            workingHours: 0,
            isWithinGeoFence: false,

            status: "Absent",

            createdAt: new Date(),
            updatedAt: new Date(),

            user: {
                id: employee.id,
                name: employee.name,
                employeeCode:
                    employee.employeeCode,
                designation:
                    employee.designation,
            },

            branch: employee.branch,
        };
    });

    return result;
};
// get live attendance
export const getLiveAttendance = async (
    companyId: string | null
) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await prisma.attendance.findMany({
        where: {
            ...(companyId
                ? {
                    companyId,
                }
                : {}),

            date: today,
        },

        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    employeeCode: true,
                    designation: true,

                    role: {
                        select: {
                            name: true,
                        },
                    },
                },
            },

            branch: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },

        orderBy: {
            punchInTime: "desc",
        },
    });

    // Sirf actual employees
    const employeeRecords = records.filter((record) => {
        const roleName = normalizeName(
            record.user.role?.name
        );

        return (
            roleName !== normalizeName("company_admin") &&
            roleName !== normalizeName("super_admin")
        );
    });

    return employeeRecords;
};

export const getEmployeeAttendance = async (
    userId: string,
    companyId: string | null,
    month?: number,
    year?: number
) => {
    const employee = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            employeeCode: true,
            branch: {
                select: {
                    id: true,
                    name: true,
                },
            },
            companyId: true,
        },
    });

    if (!employee) {
        throw new Error("Employee not found");
    }

    if (companyId === null) {
        return await getMyAttendance(
            userId,
            employee.companyId!,
            month,
            year
        );
    }

    if (employee.companyId !== companyId) {
        throw new Error(
            "This employee does not belong to this company."
        );
    }

    return await getMyAttendance(
        userId,
        companyId,
        month,
        year
    );
};

export const getEmployeeBasicInfo = async (userId: string) => {
    const employee = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true, name: true, email: true,
            employeeCode: true, designation: true,
            branch: { select: { id: true, name: true } },
        }
    });
    if (!employee) throw new Error("Employee not found");
    return employee;
};



export type DayStatus =
    | "Present"
    | "Late"
    | "Half-day"
    | "Absent"
    | "Week Off"
    | "Unpaid Week Off"
    | "Holiday"
    | "Paid Leave"
    | "Unpaid Leave"
    | "Future";

const getDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
    ).padStart(2, "0")}`;

// const normalizeName = (value?: string | null) =>
//     value?.trim().toLowerCase().replace(/\s+/g, "_").replace(/_+/g, "_");

const isAdminRoleName = (value?: string | null) => {
    const name = normalizeName(value);
    return name === "company_admin" || name === "super_admin";
};

interface DayRules {
    year: number;
    month: number;
    weekOffDays: number[];
    holidayKeys: Set<string>;
    todayKey: string;
}

// ─────────────────────────────────────────────────────────────
// Resolve every day of the month for ONE employee.
//
// Order of checks is the same as calculateEmployeePayroll:
//   future -> week off (paid/unpaid) -> holiday -> attendance -> leave -> absent
//
// Week off is paid only if the employee attended at least one working day
// earlier in that Monday-based week (same rule payroll uses).
// ─────────────────────────────────────────────────────────────

export const resolveMonthDays = (
    rules: DayRules,
    attendanceByKey: Map<string, string>,
    leaveByKey: Map<string, boolean>
): DayStatus[] => {
    const { year, month, weekOffDays, holidayKeys, todayKey } = rules;
    const daysInMonth = new Date(year, month, 0).getDate();

    const hasAttendanceInWeek = (weekOffDate: Date) => {
        const dayOfWeek = weekOffDate.getDay();
        const daysBackToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const monday = new Date(weekOffDate);
        monday.setDate(monday.getDate() - daysBackToMonday);

        const lastCheckedDay = new Date(weekOffDate);
        lastCheckedDay.setDate(lastCheckedDay.getDate() - 1);

        for (
            let cursor = new Date(monday);
            cursor <= lastCheckedDay;
            cursor.setDate(cursor.getDate() + 1)
        ) {
            if (weekOffDays.includes(cursor.getDay())) continue;

            const key = getDateKey(cursor);
            if (holidayKeys.has(key)) continue;

            const status = attendanceByKey.get(key);
            if (status === "Present" || status === "Late" || status === "Half-day") {
                return true;
            }
        }

        return false;
    };

    const days: DayStatus[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const key = getDateKey(date);

        if (key > todayKey) {
            days.push("Future");
            continue;
        }

        if (weekOffDays.includes(date.getDay())) {
            days.push(hasAttendanceInWeek(date) ? "Week Off" : "Unpaid Week Off");
            continue;
        }

        if (holidayKeys.has(key)) {
            days.push("Holiday");
            continue;
        }

        const attendanceStatus = attendanceByKey.get(key);

        if (attendanceStatus !== undefined) {
            if (
                attendanceStatus === "Present" ||
                attendanceStatus === "Late" ||
                attendanceStatus === "Half-day"
            ) {
                days.push(attendanceStatus);
            } else {
                days.push("Absent");
            }
            continue;
        }

        const leaveIsPaid = leaveByKey.get(key);

        if (leaveIsPaid !== undefined) {
            days.push(leaveIsPaid ? "Paid Leave" : "Unpaid Leave");
            continue;
        }

        days.push("Absent");
    }

    return days;
};

// ─────────────────────────────────────────────────────────────
// Monthly sheet for the whole company.
// Everything is loaded in bulk (4 queries), not one query set per employee.
// ─────────────────────────────────────────────────────────────

export const getMonthlySheet = async (
    companyId: string,
    month: number,
    year: number
) => {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error("Invalid month");
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        throw new Error("Invalid year");
    }

    const monthStart = new Date(year, month - 1, 1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(year, month, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // Week-off paid/unpaid check looks back to the Monday of the week that
    // contains the 1st, so attendance is loaded from that Monday
    const firstDayIndex = monthStart.getDay();
    const lookbackStart = new Date(monthStart);
    lookbackStart.setDate(
        lookbackStart.getDate() - (firstDayIndex === 0 ? 6 : firstDayIndex - 1)
    );
    lookbackStart.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = getDateKey(today);

    const settings = await prisma.companySettings.findUnique({
        where: { companyId },
    });

    const weekOffDays = settings?.weekOffDays ?? [0];

    const users = await prisma.user.findMany({
        where: { companyId, isActive: true },
        select: {
            id: true,
            name: true,
            employeeCode: true,
            role: { select: { name: true } },
            branch: { select: { name: true } },
        },
        orderBy: { name: "asc" },
    });

    const employees = users.filter((user) => !isAdminRoleName(user.role?.name));

    if (employees.length === 0) {
        return { month, year, employees: [] };
    }

    const employeeIds = employees.map((employee) => employee.id);

    const [holidays, attendance, leaves] = await Promise.all([
        prisma.holiday.findMany({
            where: {
                companyId,
                isActive: true,
                date: { gte: monthStart, lte: monthEnd },
            },
            select: { date: true },
        }),

        prisma.attendance.findMany({
            where: {
                companyId,
                userId: { in: employeeIds },
                date: { gte: lookbackStart, lte: monthEnd },
                punchInTime: { not: null },
            },
            select: { userId: true, date: true, status: true },
        }),

        prisma.leaveRequest.findMany({
            where: {
                companyId,
                userId: { in: employeeIds },
                status: "Approved",
                startDate: { lte: monthEnd },
                endDate: { gte: monthStart },
            },
            include: { leaveType: { select: { isPaid: true } } },
        }),
    ]);

    const holidayKeys = new Set(
        holidays.map((holiday) => getDateKey(new Date(holiday.date)))
    );

    const attendanceByUser = new Map<string, Map<string, string>>();

    for (const record of attendance) {
        const key = getDateKey(new Date(record.date));
        const perUser = attendanceByUser.get(record.userId) ?? new Map<string, string>();

        if (!perUser.has(key)) {
            perUser.set(key, record.status);
        }

        attendanceByUser.set(record.userId, perUser);
    }

    const leavesByUser = new Map<string, Map<string, boolean>>();

    for (const leave of leaves) {
        const perUser = leavesByUser.get(leave.userId) ?? new Map<string, boolean>();

        const from = new Date(Math.max(leave.startDate.getTime(), monthStart.getTime()));
        const to = new Date(Math.min(leave.endDate.getTime(), monthEnd.getTime()));

        for (let cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
            perUser.set(getDateKey(cursor), leave.leaveType.isPaid);
        }

        leavesByUser.set(leave.userId, perUser);
    }

    const rules: DayRules = { year, month, weekOffDays, holidayKeys, todayKey };

    return {
        month,
        year,
        employees: employees.map((employee) => ({
            userId: employee.id,
            name: employee.name ?? "",
            employeeCode: employee.employeeCode,
            branchName: employee.branch?.name ?? null,
            days: resolveMonthDays(
                rules,
                attendanceByUser.get(employee.id) ?? new Map<string, string>(),
                leavesByUser.get(employee.id) ?? new Map<string, boolean>()
            ),
        })),
    };
};