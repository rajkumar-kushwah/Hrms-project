
import { prisma } from "../config/db.js";

// Create branch
export const createBranch = async (
    companyId: string,
    data: {
        name: string;
        code?: string;
        address?: string;
        phone?: string;
        email?: string;
        city?: string;
        state?: string;
        pincode?: string;
        managerName?: string;
        latitude?: number;
        longitude?: number;
        geoRadius?: number;
        locationName?: string;
    }
) => {
    const existingName = await prisma.branch.findFirst({
        where: {
            companyId,
            name: data.name.trim(),
        },
    });

    if (existingName) {
        throw new Error("Branch name already exists in this company.");
    }

    // Generate the next branch code for this company.
    const lastBranch = await prisma.branch.findFirst({
        where: { companyId },
        orderBy: { code: "desc" },
        select: { code: true },
    });

    const lastNumber = lastBranch?.code?.match(/^BR(\d+)$/);
    const nextNumber = lastNumber ? Number(lastNumber[1]) + 1 : 1;
    const code = `BR${String(nextNumber).padStart(3, "0")}`;

    const codeCheck = await prisma.branch.findFirst({
        where: { companyId, code },
    });

    if (codeCheck) {
        throw new Error("Branch code already exists in this company.");
    }

    return prisma.branch.create({
        data: {
            ...data,
            name: data.name.trim(),
            code,
            companyId,
        },
        include: {
            company: {
                select: { id: true, name: true },
            },
        },
    });
};

// Get all branches
export const getAllBranches = async (companyId: string | null) => {
    return prisma.branch.findMany({
        where: companyId ? { companyId } : {},
        include: {
            company: {
                select: { id: true, name: true },
            },
        },
        orderBy: { createdAt: "desc" },
    });
};

// Get single branch
export const getBranchById = async (
    id: string,
    companyId: string | null
) => {
    const branch = await prisma.branch.findFirst({
        where: {
            id,
            ...(companyId ? { companyId } : {}),
        },
        include: {
            company: {
                select: { id: true, name: true },
            },
        },
    });

    if (!branch) {
        throw new Error("Branch not found");
    }

    return branch;
};

// Update branch
export const updateBranch = async (
    id: string,
    companyId: string | null,
    data: {
        name?: string;
        address?: string;
        phone?: string;
        email?: string;
        city?: string;
        state?: string;
        pincode?: string;
        managerName?: string;
        latitude?: number;
        longitude?: number;
        geoRadius?: number;
        isActive?: boolean;
        locationName?: string;
    }
) => {
    const existing = await prisma.branch.findFirst({
        where: {
            id,
            ...(companyId ? { companyId } : {}),
        },
    });

    if (!existing) {
        throw new Error("Branch not found");
    }

    if (data.name !== undefined) {
        const duplicate = await prisma.branch.findFirst({
            where: {
                companyId: existing.companyId,
                name: data.name.trim(),
                id: { not: id },
            },
        });

        if (duplicate) {
            throw new Error("Branch name already exists in this company.");
        }

        data.name = data.name.trim();
    }

    return prisma.branch.update({
        where: { id: existing.id },
        data,
        include: {
            company: {
                select: { id: true, name: true },
            },
        },
    });
};

// Soft delete branch
export const deleteBranch = async (
    id: string,
    companyId: string | null
) => {
    const existing = await prisma.branch.findFirst({
        where: {
            id,
            ...(companyId ? { companyId } : {}),
        },
    });

    if (!existing) {
        throw new Error("Branch not found");
    }

    if (!existing.isActive) {
        throw new Error("Branch is already deactivated.");
    }

    await prisma.branch.update({
        where: { id: existing.id },
        data: { isActive: false },
    });

    return { message: "Branch deactivated successfully" };
};

// Permanently delete branch
export const permanentDeleteBranch = async (
    id: string,
    companyId: string | null
) => {
    const branch = await prisma.branch.findFirst({
        where: {
            id,
            ...(companyId ? { companyId } : {}),
        },
        include: {
            _count: {
                select: { users: true },
            },
        },
    });

    if (!branch) {
        throw new Error("Branch not found");
    }

    const employeeCount = branch._count.users;

    if (employeeCount > 0) {
        throw new Error(
            `Cannot delete branch: ${employeeCount} ${
                employeeCount === 1 ? "employee is" : "employees are"
            } assigned to this branch.`
        );
    }

    const categoryCount = await prisma.category.count({
        where: { branchId: id },
    });

    if (categoryCount > 0) {
        throw new Error(
            `Cannot delete branch: ${categoryCount} ${
                categoryCount === 1 ? "category exists" : "categories exist"
            } under this branch.`
        );
    }

    await prisma.branch.delete({
        where: { id: branch.id },
    });

    return { message: "Branch permanently deleted successfully" };
};

// Get geofencing overview
export const getGeoFencingOverview = async (
    companyId: string | null
) => {
    const branches = await prisma.branch.findMany({
        where: {
            ...(companyId ? { companyId } : {}),
            isActive: true,
        },
        select: {
            id: true,
            name: true,
            city: true,
            latitude: true,
            longitude: true,
            geoRadius: true,
            locationName: true,
            _count: {
                select: { users: true },
            },
        },
    });

    if (branches.length === 0) {
        return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await prisma.attendance.findMany({
        where: {
            branchId: {
                in: branches.map((branch) => branch.id),
            },
            date: {
                gte: today,
                lt: tomorrow,
            },
            punchInTime: { not: null },
        },
        select: {
            branchId: true,
            isWithinGeoFence: true,
            punchInTime: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    employeeCode: true,
                },
            },
        },
    });

    return branches.map((branch) => {
        const branchAttendance = todayAttendance.filter(
            (attendance) => attendance.branchId === branch.id
        );

        const insideFence = branchAttendance.filter(
            (attendance) => attendance.isWithinGeoFence === true
        ).length;

        const outsideFence = branchAttendance.filter(
            (attendance) => attendance.isWithinGeoFence === false
        ).length;

        return {
            id: branch.id,
            name: branch.name,
            city: branch.city,
            latitude: branch.latitude,
            longitude: branch.longitude,
            geoRadius: branch.geoRadius,
            locationName: branch.locationName,
            totalEmployees: branch._count.users,
            insideFence,
            outsideFence,
            totalPunchedInToday: branchAttendance.length,
            employees: branchAttendance.map((attendance) => ({
                id: attendance.user.id,
                name: attendance.user.name,
                employeeCode: attendance.user.employeeCode,
                isWithinGeoFence: attendance.isWithinGeoFence,
                punchInTime: attendance.punchInTime,
            })),
        };
    });
};
