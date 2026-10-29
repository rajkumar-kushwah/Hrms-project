// pages/payroll/PayrollReport.tsx
import React from "react";
import * as XLSX from "xlsx";

import { Card } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { RefreshCw, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";




import { getMonthlyPayrollReport } from "@/services/payrollreport.service";
import { getCompanies } from "@/services/company.service";
import { useAuthStore } from "@/store/auth.store";
import { isSuperAdminRole } from "@/utilis/roleUtils";
// Types


type PayrollStatus = "DRAFT" | "CONFIRMED" | "PAID";

interface GroupTotals {
    id: string | null;
    name: string;
    employeeCount: number;
    totalGross: number;
    totalEarned: number;
    totalDeduction: number;
    totalNet: number;
}

interface EmployeeRow {
    userId: string;
    name: string;
    employeeCode: string | null;
    branchName: string;
    categoryName: string;
    gross: number;
    earned: number;
    deduction: number;
    net: number;
    status: PayrollStatus;
}

interface Report {
    month: number;
    year: number;
    totals: {
        employeeCount: number;
        totalGross: number;
        totalEarned: number;
        totalDeduction: number;
        totalNet: number;
        draftCount: number;
        confirmedCount: number;
        paidCount: number;
    };
    byBranch: GroupTotals[];
    byCategory: GroupTotals[];
    employees: EmployeeRow[];
}


// Constants / helpers


const MONTHS = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
];

const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// const STATUS_BADGE_VARIANT: Record<PayrollStatus, "secondary" | "default" | "destructive"> = {
//     DRAFT: "secondary",
//     CONFIRMED: "default",
//     PAID: "default",
// };

const StatusBadge = ({ status }: { status: PayrollStatus }) => {
    const colorClass =
        status === "PAID"
            ? "bg-green-100 text-green-700"
            : status === "CONFIRMED"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-gray-200 text-gray-700";

    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
            {status}
        </span>
    );
};

interface CompanyOption {
    id: string;
    name: string;
}

// Page


const PayrollReport = () => {
    const currentDate = new Date();

    const user = useAuthStore((state) => state.user);
    const isSuperAdmin = isSuperAdminRole(user?.role?.name);

    const [month, setMonth] = React.useState(
        currentDate.getMonth() + 1
    );
    const [year, setYear] = React.useState(
        currentDate.getFullYear()
    );

    const [report, setReport] = React.useState<Report | null>(null);
    const [loading, setLoading] = React.useState(true);

    const [companies, setCompanies] = React.useState<CompanyOption[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = React.useState("");
    const [companiesLoading, setCompaniesLoading] = React.useState(false);

    // Load companies for Super Admin
    React.useEffect(() => {
        if (!isSuperAdmin) {
            setCompanies([]);
            setSelectedCompanyId("");
            return;
        }

        let cancelled = false;

        const loadCompanies = async () => {
            setCompaniesLoading(true);

            try {
                const response = await getCompanies();
                const companyList: CompanyOption[] = response.data.data ?? [];

                if (!cancelled) {
                    setCompanies(companyList);

                    setSelectedCompanyId((current) => {
                        if (
                            current &&
                            companyList.some((company) => company.id === current)
                        ) {
                            return current;
                        }

                        return "";
                    });
                }
            } catch {
                if (!cancelled) {
                    toast.error("Failed to load companies");
                    setCompanies([]);
                    setSelectedCompanyId("");
                }
            } finally {
                if (!cancelled) {
                    setCompaniesLoading(false);
                }
            }
        };

        void loadCompanies();

        return () => {
            cancelled = true;
        };
    }, [isSuperAdmin]);

    // Load payroll report
    const loadReport = React.useCallback(async () => {
        if (isSuperAdmin && !selectedCompanyId) {
            setReport(null);
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const response = await getMonthlyPayrollReport(
                month,
                year,
                isSuperAdmin ? selectedCompanyId : undefined
            );

            setReport(response.data.data ?? response.data);
        } catch {
            toast.error("Failed to load payroll report");
            setReport(null);
        } finally {
            setLoading(false);
        }
    }, [month, year, isSuperAdmin, selectedCompanyId]);

    React.useEffect(() => {
        void loadReport();
    }, [loadReport]);

    // Yahan apna existing handleExport function rakho.

    // Excel export

    const handleExport = () => {
        if (!report) return;

        const wb = XLSX.utils.book_new();

        const sum = <T,>(items: T[], pick: (i: T) => number) =>
            Number(items.reduce((s, i) => s + pick(i), 0).toFixed(2));

        const fitColumns = (rows: Record<string, string | number>[]) => {
            if (rows.length === 0) return [];
            return Object.keys(rows[0]).map((key) => ({
                wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length)) + 2,
            }));
        };

        const makeSheet = (rows: Record<string, string | number>[]) => {
            const ws = XLSX.utils.json_to_sheet(rows);
            ws["!cols"] = fitColumns(rows);
            return ws;
        };

        const groupRows = (rows: GroupTotals[]) => [
            ...rows.map((r) => ({
                Name: r.name,
                Employees: r.employeeCount,
                Gross: r.totalGross,
                Earned: r.totalEarned,
                Deduction: r.totalDeduction,
                "Net Payable": r.totalNet,
            })),
            {
                Name: "TOTAL",
                Employees: sum(rows, (r) => r.employeeCount),
                Gross: sum(rows, (r) => r.totalGross),
                Earned: sum(rows, (r) => r.totalEarned),
                Deduction: sum(rows, (r) => r.totalDeduction),
                "Net Payable": sum(rows, (r) => r.totalNet),
            },
        ];

        const sortedEmployees = [...report.employees].sort(
            (a, b) =>
                a.branchName.localeCompare(b.branchName) ||
                a.categoryName.localeCompare(b.categoryName) ||
                a.name.localeCompare(b.name)
        );

        const employeeRows = [
            ...sortedEmployees.map((e) => ({
                Code: e.employeeCode ?? "",
                Name: e.name,
                Branch: e.branchName,
                Category: e.categoryName,
                Gross: e.gross,
                Earned: e.earned,
                Deduction: e.deduction,
                "Net Payable": e.net,
                Status: e.status,
            })),
            {
                Code: "",
                Name: "TOTAL",
                Branch: "",
                Category: "",
                Gross: sum(sortedEmployees, (e) => e.gross),
                Earned: sum(sortedEmployees, (e) => e.earned),
                Deduction: sum(sortedEmployees, (e) => e.deduction),
                "Net Payable": sum(sortedEmployees, (e) => e.net),
                Status: "",
            },
        ];

        // Branch-wise Detail sheet: employees grouped under their branch
        const detailHeader = ["Branch / Employee", "Code", "Category", "Gross", "Earned", "Deduction", "Net Payable"];
        const detailRows: (string | number)[][] = [detailHeader];
        const branchNames = Array.from(new Set(sortedEmployees.map((e) => e.branchName)));

        for (const branchName of branchNames) {
            const members = sortedEmployees.filter((e) => e.branchName === branchName);
            detailRows.push([branchName.toUpperCase(), "", "", "", "", "", ""]);
            for (const e of members) {
                detailRows.push([`   ${e.name}`, e.employeeCode ?? "", e.categoryName, e.gross, e.earned, e.deduction, e.net]);
            }
            detailRows.push([
                `Branch Total (${members.length} employees)`, "", "",
                sum(members, (e) => e.gross), sum(members, (e) => e.earned),
                sum(members, (e) => e.deduction), sum(members, (e) => e.net),
            ]);
            detailRows.push(["", "", "", "", "", "", ""]);
        }
        detailRows.push([
            `GRAND TOTAL (${sortedEmployees.length} employees)`, "", "",
            sum(sortedEmployees, (e) => e.gross), sum(sortedEmployees, (e) => e.earned),
            sum(sortedEmployees, (e) => e.deduction), sum(sortedEmployees, (e) => e.net),
        ]);

        const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);
        detailSheet["!cols"] = detailHeader.map((h, i) => ({
            wch: Math.max(h.length, ...detailRows.map((r) => String(r[i] ?? "").length)) + 2,
        }));

        XLSX.utils.book_append_sheet(wb, detailSheet, "Branch-wise Detail");
        XLSX.utils.book_append_sheet(wb, makeSheet(groupRows(report.byBranch)), "By Branch");
        XLSX.utils.book_append_sheet(wb, makeSheet(groupRows(report.byCategory)), "By Category");
        XLSX.utils.book_append_sheet(wb, makeSheet(employeeRows), "Employees");

        XLSX.writeFile(wb, `payroll-report-${month}-${year}.xlsx`);
    };


    // UI


    return (
        <div className="w-full space-y-5">

            {/* HEADER */}
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">
                        Payroll Report
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Monthly payroll summary — view and export only
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {isSuperAdmin && (
                        <Select
                            value={selectedCompanyId}
                            onValueChange={setSelectedCompanyId}
                            disabled={companiesLoading || companies.length === 0}
                        >
                            <SelectTrigger className="h-9 w-[190px]">
                                <SelectValue
                                    placeholder={
                                        companiesLoading
                                            ? "Loading companies..."
                                            : companies.length === 0
                                                ? "No companies available"
                                                : "Select company"
                                    }
                                />
                            </SelectTrigger>

                            <SelectContent position="popper">
                                {companies.map((company) => (
                                    <SelectItem key={company.id} value={company.id}>
                                        {company.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Select
                        value={String(month)}
                        onValueChange={(v) => setMonth(Number(v))}
                    >
                        <SelectTrigger className="h-9 w-[135px]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>

                        <SelectContent position="popper">
                            {MONTHS.map((m) => (
                                <SelectItem
                                    key={m.value}
                                    value={String(m.value)}
                                >
                                    {m.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select
                        value={String(year)}
                        onValueChange={(v) => setYear(Number(v))}
                    >
                        <SelectTrigger className="h-9 w-[100px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>

                        <SelectContent position="popper">
                            {getYearOptions().map((y) => (
                                <SelectItem key={y} value={String(y)}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="add"
                        className="h-9 "
                        onClick={handleExport}
                        disabled={!report || loading}
                    >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export Excel
                    </Button>
                </div>
            </div>
            {isSuperAdmin && !selectedCompanyId ? (
                <div className="flex min-h-[300px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
                    Please select a company to view the payroll report.
                </div>
            ) : loading ? (
                <div className="flex min-h-[300px] items-center justify-center rounded-lg border bg-card">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Loading report...
                    </div>
                </div>
            ) : !report ? (
                <div className="flex min-h-[300px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
                    No data available for this period.
                </div>
            ) : (
                <>
                    {/* SUMMARY CARDS */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        <Card className="p-4">
                            <p className="text-xs font-medium text-muted-foreground">
                                Employees
                            </p>
                            <p className="mt-1 text-xl font-bold tracking-tight">
                                {report.totals.employeeCount}
                            </p>
                        </Card>

                        <Card className="p-4">
                            <p className="text-xs font-medium text-muted-foreground">
                                Total Gross
                            </p>
                            <p className="mt-1 text-xl font-bold tracking-tight">
                                {inr(report.totals.totalGross)}
                            </p>
                        </Card>

                        <Card className="p-4">
                            <p className="text-xs font-medium text-muted-foreground">
                                Total Earned
                            </p>
                            <p className="mt-1 text-xl font-bold tracking-tight">
                                {inr(report.totals.totalEarned)}
                            </p>
                        </Card>

                        <Card className="p-4">
                            <p className="text-xs font-medium text-muted-foreground">
                                Total Deduction
                            </p>
                            <p className="mt-1 text-xl font-bold tracking-tight text-red-600">
                                {inr(report.totals.totalDeduction)}
                            </p>
                        </Card>

                        <Card className="p-4">
                            <p className="text-xs font-medium text-muted-foreground">
                                Total Disbursed
                            </p>
                            <p className="mt-1 text-xl font-bold tracking-tight text-green-600">
                                {inr(report.totals.totalNet)}
                            </p>
                        </Card>
                    </div>

                    {/* STATUS SUMMARY */}
                    <div className="p-3 transition-none duration-0 ease-none hover:opacity-100 hover:scale-100 active:scale-100">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Payroll Status
                            </span>

                            <span className="flex items-center gap-2 text-sm">
                                <StatusBadge status="DRAFT" />
                                <span className="font-medium">
                                    {report.totals.draftCount}
                                </span>
                            </span>

                            <span className="flex items-center gap-2 text-sm">
                                <StatusBadge status="CONFIRMED" />
                                <span className="font-medium">
                                    {report.totals.confirmedCount}
                                </span>
                            </span>

                            <span className="flex items-center gap-2 text-sm">
                                <StatusBadge status="PAID" />
                                <span className="font-medium">
                                    {report.totals.paidCount}
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* BRANCH-WISE SUMMARY */}
                    <section>
                        <div className="mb-2">
                            <h3 className="text-sm font-semibold">
                                Branch-wise Summary
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Payroll totals grouped by branch
                            </p>
                        </div>

                        <div className="overflow-hidden rounded-lg border bg-card">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/60">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="font-semibold">
                                                Name
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Employees
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Gross
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Earned
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Deduction
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Net Payable
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {report.byBranch.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={6}
                                                    className="py-8 text-center text-sm text-muted-foreground"
                                                >
                                                    No data
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            report.byBranch.map((b) => (
                                                <TableRow
                                                    key={b.id ?? b.name}
                                                    className="hover:bg-muted/30"
                                                >
                                                    <TableCell className="font-medium">
                                                        {b.name}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        {b.employeeCount}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        {inr(b.totalGross)}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        {inr(b.totalEarned)}
                                                    </TableCell>

                                                    <TableCell className="text-right text-red-600">
                                                        {inr(b.totalDeduction)}
                                                    </TableCell>

                                                    <TableCell className="text-right font-semibold text-green-600">
                                                        {inr(b.totalNet)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </section>

                    {/* CATEGORY-WISE SUMMARY */}
                    <section>
                        <div className="mb-2">
                            <h3 className="text-sm font-semibold">
                                Category-wise Summary
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Payroll totals grouped by category
                            </p>
                        </div>

                        <div className="overflow-hidden rounded-lg border bg-card">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/60">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="font-semibold">
                                                Name
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Employees
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Gross
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Earned
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Deduction
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Net Payable
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {report.byCategory.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={6}
                                                    className="py-8 text-center text-sm text-muted-foreground"
                                                >
                                                    No data
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            report.byCategory.map((c) => (
                                                <TableRow
                                                    key={c.id ?? c.name}
                                                    className="hover:bg-muted/30"
                                                >
                                                    <TableCell className="font-medium">
                                                        {c.name}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        {c.employeeCount}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        {inr(c.totalGross)}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        {inr(c.totalEarned)}
                                                    </TableCell>

                                                    <TableCell className="text-right text-red-600">
                                                        {inr(c.totalDeduction)}
                                                    </TableCell>

                                                    <TableCell className="text-right font-semibold text-green-600">
                                                        {inr(c.totalNet)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </section>

                    {/* EMPLOYEE-WISE DETAIL */}
                    <section>
                        <div className="mb-2">
                            <h3 className="text-sm font-semibold">
                                Employee-wise Detail
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Individual employee payroll details
                            </p>
                        </div>

                        <div className="overflow-hidden rounded-lg border bg-card">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/60">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="font-semibold">
                                                Employee
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Code
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Branch
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Category
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Gross
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Earned
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Deduction
                                            </TableHead>
                                            <TableHead className="text-right font-semibold">
                                                Net
                                            </TableHead>
                                            <TableHead className="font-semibold">
                                                Status
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {report.employees.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={9}
                                                    className="py-8 text-center text-sm text-muted-foreground"
                                                >
                                                    No employees found
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            report.employees.map((e) => (
                                                <TableRow
                                                    key={e.userId}
                                                    className="hover:bg-muted/30"
                                                >
                                                    <TableCell className="font-medium whitespace-nowrap">
                                                        {e.name}
                                                    </TableCell>

                                                    <TableCell className="text-muted-foreground">
                                                        {e.employeeCode ?? "-"}
                                                    </TableCell>

                                                    <TableCell className="text-muted-foreground">
                                                        {e.branchName}
                                                    </TableCell>

                                                    <TableCell className="text-muted-foreground">
                                                        {e.categoryName}
                                                    </TableCell>

                                                    <TableCell className="text-right whitespace-nowrap">
                                                        {inr(e.gross)}
                                                    </TableCell>

                                                    <TableCell className="text-right whitespace-nowrap">
                                                        {inr(e.earned)}
                                                    </TableCell>

                                                    <TableCell className="text-right whitespace-nowrap text-red-600">
                                                        {inr(e.deduction)}
                                                    </TableCell>

                                                    <TableCell className="text-right whitespace-nowrap font-semibold text-green-600">
                                                        {inr(e.net)}
                                                    </TableCell>

                                                    <TableCell>
                                                        <StatusBadge status={e.status} />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default PayrollReport;