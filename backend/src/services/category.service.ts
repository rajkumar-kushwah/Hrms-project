
import { prisma } from "../config/db.js";

// Create category
export const createCategory = async (
    companyId: string,
    data: {
        name: string;
        description: string;
        branchId: string;
    }
) => {
    // Verify branch belongs to the selected company
    const branch = await prisma.branch.findFirst({
        where: {
            id: data.branchId,
            companyId,
        },
    });

    if (!branch) {
        throw new Error("Branch not found in this company");
    }

    const existing = await prisma.category.findFirst({
        where: {
            name: data.name,
            branchId: data.branchId,
            companyId,
        },
    });

    if (existing) {
        throw new Error("Category already exists");
    }

    return prisma.category.create({
        data: {
            ...data,
            companyId,
        },
        include: {
            company: { select: { id: true, name: true } },
            branch: { select: { id: true, name: true } },
        },
    });
};

// Get all categories
export const getCategories = async (companyId: string | null) => {
    return prisma.category.findMany({
        where: companyId ? { companyId } : {},
        include: {
            branch: { select: { id: true, name: true } },
            company: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
    });
};

// Get single category
export const getCategoryById = async (
    id: string,
    companyId: string | null
) => {
    const category = await prisma.category.findFirst({
        where: {
            id,
            ...(companyId ? { companyId } : {}),
        },
        include: {
            branch: { select: { id: true, name: true } },
            company: { select: { id: true, name: true } },
        },
    });

    if (!category) {
        throw new Error("Category not found");
    }

    return category;
};

// Update category
export const updateCategory = async (
    id: string,
    companyId: string | null,
    data: {
        name?: string;
        description?: string;
        isActive?: boolean;
    }
) => {
    const existing = await prisma.category.findFirst({
        where: {
            id,
            ...(companyId ? { companyId } : {}),
        },
    });

    if (!existing) {
        throw new Error("Category not found");
    }

    return prisma.category.update({
        where: { id: existing.id },
        data,
        include: {
            branch: { select: { id: true, name: true } },
            company: { select: { id: true, name: true } },
        },
    });
};

// Soft delete category
export const deleteCategory = async (
    id: string,
    companyId: string | null
) => {
    const existing = await prisma.category.findFirst({
        where: {
            id,
            ...(companyId ? { companyId } : {}),
        },
    });

    if (!existing) {
        throw new Error("Category not found");
    }

    await prisma.category.update({
        where: { id: existing.id },
        data: { isActive: false },
    });

    return { message: "Category deactivated successfully" };
};

// Permanently delete category
export const permanentDeleteCategory = async (
    id: string,
    companyId: string | null
) => {
    const category = await prisma.category.findFirst({
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

    if (!category) {
        throw new Error("Category not found");
    }

    if (category._count.users > 0) {
        throw new Error(
            `Cannot delete category: ${category._count.users} employees are assigned to this category`
        );
    }

    await prisma.category.delete({
        where: { id: category.id },
    });

    return { message: "Category permanently deleted" };
};
