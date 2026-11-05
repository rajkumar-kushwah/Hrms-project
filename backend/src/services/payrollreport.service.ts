import { prisma } from "../config/db.js";
import { getPayrollSummary } from "../services/payroll.service.js"; // adjust path

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface GroupTotals {
    id: string | null;
    name: string;
    employeeCount: number;
    totalGross: number;
    totalEarned: number;
    totalDeduction: number;
    totalNet: number;
}

const round2 = (n: number) => Number(n.toFixed(2));

// ─────────────────────────────────────────────────────────────
// Group Helper
// ─────────────────────────────────────────────────────────────

const groupBy = (
    rows: {
        groupId: string | null;
        groupName: string;
        gross: number;
        earned: number;
        deduction: number;
        net: number;
    }[]
): GroupTotals[] => {
    const map = new Map<string, GroupTotals>();

    for (const row of rows) {
        const key = row.groupId ?? "unassigned";

        if (!map.has(key)) {
            map.set(key, {
                id: row.groupId,
                name: row.groupName,
                employeeCount: 0,
                totalGross: 0,
                totalEarned: 0,
                totalDeduction: 0,
                totalNet: 0,
            });
        }

        const group = map.get(key)!;
        group.employeeCount += 1;
        group.totalGross += row.gross;
        group.totalEarned += row.earned;
        group.totalDeduction += row.deduction;
        group.totalNet += row.net;
    }

    return Array.from(map.values()).map((g) => ({
        ...g,
        totalGross: round2(g.totalGross),
        totalEarned: round2(g.totalEarned),
        totalDeduction: round2(g.totalDeduction),
        totalNet: round2(g.totalNet),
    }));
};

// ─────────────────────────────────────────────────────────────
// Monthly Payroll Report
// ─────────────────────────────────────────────────────────────
// ASSUMPTIONS (adjust to your schema):
//  - User has `branchId` and `categoryId`
//  - Branch and Category models have a `name` field
// ─────────────────────────────────────────────────────────────

export const getMonthlyPayrollReport = async (
    companyId: string,
    month: number,
    year: number,
    userId: string
) => {

    const user = await prisma.user.findFirst({
        where: {
            id: userId,
            companyId,
        }
    })

    if (!user) {
        throw new Error("You are not authorized to perform this action");
    }
    // 1. Reuse existing calculation for all employees
    const payrollData = await getPayrollSummary(companyId, month, year, userId);

    if (payrollData.length === 0) {
        return {
            month,
            year,
            totals: {
                employeeCount: 0,
                totalGross: 0,
                totalEarned: 0,
                totalDeduction: 0,
                totalNet: 0,
                draftCount: 0,
                confirmedCount: 0,
                paidCount: 0,
            },
            byBranch: [],
            byCategory: [],
            employees: [],
        };
    }

    // 2. Fetch branch/category info for these employees
    const users = await prisma.user.findMany({
        where: {
            id: { in: payrollData.map((p) => p.userId) },
        },
        select: {
            id: true,
            branchId: true,
            categoryId: true,
            branch: { select: { name: true } },
            category: {
                select: {
                    name: true,
                    branch: { select: { name: true } },
                },
            },
        },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Same naam ki alag-alag categories (alag branches ki) ho to hi branch ka naam jodenge
    const idsByCategoryName = new Map<string, Set<string>>();
    for (const u of users) {
        if (u.category && u.categoryId) {
            if (!idsByCategoryName.has(u.category.name)) {
                idsByCategoryName.set(u.category.name, new Set());
            }
            idsByCategoryName.get(u.category.name)!.add(u.categoryId);
        }
    }
    const duplicateCategoryNames = new Set(
        Array.from(idsByCategoryName.entries())
            .filter(([, ids]) => ids.size > 1)
            .map(([name]) => name)
    );

    // 3. Flatten into rows
    const rows = payrollData.map((p) => {
        const u = userMap.get(p.userId);

        return {
            userId: p.userId,
            name: p.user.name,
            employeeCode: p.user.employeeCode,
            perDaySalary: round2(p.perDaySalary ?? 0),
            branchId: u?.branchId ?? null,
            branchName: u?.branch?.name ?? "Unassigned",
            categoryId: u?.categoryId ?? null,
            categoryName: u?.category
                ? duplicateCategoryNames.has(u.category.name)
                    ? `${u.category.name} (${u.category.branch?.name ?? "No Branch"})`
                    : u.category.name
                : "Unassigned",
            gross: p.grossSalary,
            earned: p.earnedSalary,
            deduction: p.deductionAmount,
            net: p.netSalary,
            status: p.status as "DRAFT" | "CONFIRMED" | "PAID",
        };
    });

    // 4. Overall totals
    const totals = {
        employeeCount: rows.length,
        totalGross: round2(rows.reduce((s, r) => s + r.gross, 0)),
        totalEarned: round2(rows.reduce((s, r) => s + r.earned, 0)),
        totalDeduction: round2(rows.reduce((s, r) => s + r.deduction, 0)),
        totalNet: round2(rows.reduce((s, r) => s + r.net, 0)),
        draftCount: rows.filter((r) => r.status === "DRAFT").length,
        confirmedCount: rows.filter((r) => r.status === "CONFIRMED").length,
        paidCount: rows.filter((r) => r.status === "PAID").length,
    };

    // 5. Groupings
    const byBranch = groupBy(
        rows.map((r) => ({
            groupId: r.branchId,
            groupName: r.branchName,
            gross: r.gross,
            earned: r.earned,
            deduction: r.deduction,
            net: r.net,
        }))
    );

    const byCategory = groupBy(
        rows.map((r) => ({
            groupId: r.categoryId,
            groupName: r.categoryName,
            gross: r.gross,
            earned: r.earned,
            deduction: r.deduction,
            net: r.net,
        }))
    );

    return {
        month,
        year,
        totals,
        byBranch,
        byCategory,
        employees: rows,
    };
};