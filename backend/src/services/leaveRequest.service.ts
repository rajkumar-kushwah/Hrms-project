import { prisma } from "../config/db.js";



// Calculate total days between dates (inclusive)
const calculateDays = (start: Date, end: Date): number => {
    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
};

export const createLeaveRequest = async (
    userId: string, companyId: string,
    data: { startDate: Date; endDate: Date; leaveTypeId: string; reason?: string; }) => {

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
        throw new Error("End date cannot be before start date");
    }

    const totalDays = calculateDays(startDate, endDate);

    // overlapping leave check
    const overlapping = await prisma.leaveRequest.findFirst({
        where: {
            userId,
            status: { in: ['Pending', 'Approved'] },
            OR: [
                { startDate: { lte: endDate }, endDate: { gte: startDate } },
            ]
        }
    });
    if (overlapping) {
        throw new Error("You already have a leave request for these dates");
    }

    return await prisma.leaveRequest.create({
        data: {
            userId,
            companyId,
            leaveTypeId: data.leaveTypeId,
            startDate,
            endDate,
            totalDays,
            reason: data.reason ?? null,
            status: "Pending",
        },
        include: {
            leaveType: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    });

}


export const getMyLeaveRequests = async (userId: string) => {
    return await prisma.leaveRequest.findMany({
        where: { userId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    profilePhoto: true,
                    profilePhotoId: true,
                    employeeCode: true,
                    designation: true,
                },
            },
            leaveType: {
                select: {
                    id: true,
                    name: true,
                },
            },
            approvedByUser: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};



export const getAllLeaveRequests = async (companyId: string | null, status?: string) => {
    return await prisma.leaveRequest.findMany({
        where: {
            ...(companyId ? { companyId } : {}),
            ...(status && status !== "all" && { status }),
        },
        include: {
            user: { select: { id: true, name: true, profilePhoto: true, profilePhotoId: true, employeeCode: true, designation: true } },
            leaveType: { select: { id: true, name: true } },
            approvedByUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" }
    });
};


// approvedRejectLeave
export const approvedRejectLeave = async (
    id: string,
    approvedBy: string,
    status: "Approved" | "Rejected",
    rejectReason?: string
) => {
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) throw new Error("Leave request not found");
    if (leave.status !== "Pending") throw new Error("This Leave request has already been processed");

    return await prisma.leaveRequest.update({
        where: { id },
        data: {
            status,
            approvedBy,
            approvedAt: new Date(),
            ...(status === "Rejected" && { rejectReason: rejectReason ?? null }),
        },
        include: {
            leaveType: { select: { id: true, name: true } },
            user: {
                select: {
                    id: true, name: true, profilePhoto: true, profilePhotoId: true,
                }
            },
        }
    })
}


export const cancelLeaveRequest = async (id: string, userId: string) => {
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) throw new Error("Leave request not found");
    if (leave.userId !== userId) throw new Error("Access denied");
    if (leave.status !== "Pending") throw new Error("Cannot cancel a processed leave request");

    await prisma.leaveRequest.delete({ where: { id } });
    return { message: "Leave request cancelled successfully" };
};

export const revokeLeave = async (id: string, revokedBy: string) => {
    const leave = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) throw new Error("Leave request not found");

    if (leave.status !== "Approved") {
        throw new Error("Only approved leaves can be revoked");
    }

    //  Delete karo — attendance list se automatically hat jayegi
    await prisma.leaveRequest.delete({ where: { id } });

    return { message: "Leave revoked successfully" };
};