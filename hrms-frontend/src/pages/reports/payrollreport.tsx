
import React from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

import {
    RefreshCw,
    FileSpreadsheet,
    Search,
    X,
} from "lucide-react";

import { toast } from "sonner";

import { getMonthlyPayrollReport } from "@/services/payrollreport.service";
import { getCompanies } from "@/services/company.service";

import { useAuthStore } from "@/store/auth.store";

import {
    isSuperAdminRole,
    canViewModule,
} from "@/utilis/roleUtils";


// TYPES


type PayrollStatus = "DRAFT" | "CONFIRMED" | "PAID";

interface GroupTotals {
    id: string | null;
    name: string;
    employeeCount: number;
    totalGross: number;
    totalEarned: number;
    totalDeduction: number;
    totalperDaySalary: number;
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
    perDaySalary: number;
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
        totalperDaySalary: number;
        totalNet: number;
        draftCount: number;
        confirmedCount: number;
        paidCount: number;
    };

    byBranch: GroupTotals[];
    byCategory: GroupTotals[];
    employees: EmployeeRow[];
}

interface CompanyOption {
    id: string;
    name: string;
}

interface SummaryCard {
    title: string;
    value: string | number;
    className?: string;
}


// CONSTANTS


const MODULE_NAME = "payroll_report";

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

    return Array.from(
        { length: 5 },
        (_, index) => currentYear - index
    );
};

const inr = (value: number) =>
    `₹${Math.round(value).toLocaleString("en-IN")}`;


// STATUS CONFIGURATION


const STATUS_CLASSES: Record<PayrollStatus, string> = {
    DRAFT: "bg-gray-200 text-gray-700",
    CONFIRMED: "bg-yellow-100 text-yellow-700",
    PAID: "bg-green-100 text-green-700",
};

const StatusBadge = ({ status }: { status: PayrollStatus }) => (
    <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
        {status}
    </span>
);


// TABLE CONFIGURATION


const BRANCH_COLUMNS = [
    {
        label: "Name",
        headerClass: "font-semibold",
        cellClass: "font-medium",
        render: (row: GroupTotals) => row.name,
    },
    {
        label: "Employees",
        headerClass: "text-right font-semibold",
        cellClass: "text-right",
        render: (row: GroupTotals) => row.employeeCount,
    },
    {
        label: "Gross",
        headerClass: "text-right font-semibold",
        cellClass: "text-right",
        render: (row: GroupTotals) => inr(row.totalGross),
    },
    {
        label: "Earned",
        headerClass: "text-right font-semibold",
        cellClass: "text-right",
        render: (row: GroupTotals) => inr(row.totalEarned),
    },
    {
        label: "Deduction",
        headerClass: "text-right font-semibold",
        cellClass: "text-right text-red-600",
        render: (row: GroupTotals) => inr(row.totalDeduction),
    },
    {
        label: "Net Payable",
        headerClass: "text-right font-semibold",
        cellClass: "text-right font-semibold text-green-600",
        render: (row: GroupTotals) => inr(row.totalNet),
    },
];

const EMPLOYEE_COLUMNS = [
    {
        label: "Employee",
        headerClass: "font-semibold",
        cellClass: "whitespace-nowrap font-medium",
        render: (row: EmployeeRow) => row.name,
    },
    {
        label: "Code",
        headerClass: "font-semibold",
        cellClass: "text-muted-foreground",
        render: (row: EmployeeRow) => row.employeeCode ?? "-",
    },
    {
        label: "Branch",
        headerClass: "font-semibold",
        cellClass: "text-muted-foreground",
        render: (row: EmployeeRow) => row.branchName,
    },
    {
        label: "Category",
        headerClass: "font-semibold",
        cellClass: "text-muted-foreground",
        render: (row: EmployeeRow) => row.categoryName,
    },
    {
        label: "Gross",
        headerClass: "text-right font-semibold",
        cellClass: "whitespace-nowrap text-right",
        render: (row: EmployeeRow) => inr(row.gross),
    },
    {
        label: "Earned",
        headerClass: "text-right font-semibold",
        cellClass: "whitespace-nowrap text-right",
        render: (row: EmployeeRow) => inr(row.earned),
    },
    {
        label: "Per Day Salary",
        headerClass: "text-right font-semibold",
        cellClass: "whitespace-nowrap text-right text-green-600",
        render: (row: EmployeeRow) => inr(row.perDaySalary),
    },
    {
        label: "Deduction",
        headerClass: "text-right font-semibold",
        cellClass: "whitespace-nowrap text-right text-red-600",
        render: (row: EmployeeRow) => inr(row.deduction),
    },
    {
        label: "Net",
        headerClass: "text-right font-semibold",
        cellClass: "whitespace-nowrap text-right font-semibold text-green-600",
        render: (row: EmployeeRow) => inr(row.net),
    },
    {
        label: "Status",
        headerClass: "font-semibold",
        cellClass: "",
        render: (row: EmployeeRow) => <StatusBadge status={row.status} />,
    },
];


// HELPERS


const sumBy = <T,>(
    items: T[],
    pick: (item: T) => number
) =>
    Number(
        items.reduce((total, item) => total + pick(item), 0).toFixed(2)
    );

const fitColumns = (
    rows: Record<string, string | number>[]
) => {
    if (rows.length === 0) return [];

    return Object.keys(rows[0]).map((key) => ({
        wch:
            Math.max(
                key.length,
                ...rows.map((row) =>
                    String(row[key] ?? "").length
                )
            ) + 2,
    }));
};


// PAGE


const PayrollReport = () => {
    const currentDate = new Date();

    const user = useAuthStore((state) => state.user);

    // Permissions

    const canViewPayrollReport = canViewModule(user, MODULE_NAME);
    const isSuperAdmin = isSuperAdminRole(user);

    // Month / Year

    const [month, setMonth] = React.useState(
        currentDate.getMonth() + 1
    );

    const [year, setYear] = React.useState(
        currentDate.getFullYear()
    );

    // Report

    const [report, setReport] = React.useState<Report | null>(null);
    const [loading, setLoading] = React.useState(true);

    // Companies

    const [companies, setCompanies] = React.useState<CompanyOption[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = React.useState("");
    const [companiesLoading, setCompaniesLoading] = React.useState(false);

    // Employee filters

    const [search, setSearch] = React.useState("");

  
    // LOAD COMPANIES
  

    React.useEffect(() => {
        if (!canViewPayrollReport || !isSuperAdmin) {
            setCompanies([]);
            setSelectedCompanyId("");
            setCompaniesLoading(false);
            return;
        }

        let cancelled = false;

        const loadCompanies = async () => {
            setCompaniesLoading(true);

            try {
                const response = await getCompanies();

                const companyList: CompanyOption[] =
                    response.data.data ?? [];

                if (!cancelled) {
                    setCompanies(companyList);

                    setSelectedCompanyId((current) => {
                        if (
                            current &&
                            companyList.some(
                                (company) => company.id === current
                            )
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
    }, [canViewPayrollReport, isSuperAdmin]);

  
    // LOAD PAYROLL REPORT
  

    const loadReport = React.useCallback(async () => {
        if (!canViewPayrollReport) {
            setReport(null);
            setLoading(false);
            return;
        }

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
    }, [
        canViewPayrollReport,
        month,
        year,
        isSuperAdmin,
        selectedCompanyId,
    ]);

    // Automatically load report

    React.useEffect(() => {
        if (!canViewPayrollReport) return;

        void loadReport();
    }, [canViewPayrollReport, loadReport]);

  
    // SUMMARY CARD DATA
  

    const summaryCards: SummaryCard[] = report
        ? [
            {
                title: "Employees",
                value: report.totals.employeeCount,
            },
            {
                title: "Total Gross",
                value: inr(report.totals.totalGross),
            },
            {
                title: "Total Earned",
                value: inr(report.totals.totalEarned),
            },
            {
                title: "Total Deduction",
                value: inr(report.totals.totalDeduction),
                className: "text-red-600",
            },
            {
                title: "Total Disbursed",
                value: inr(report.totals.totalNet),
                className: "text-green-600",
            },
        ]
        : [];

  
    // PAYROLL STATUS DATA
  

    const payrollStatuses: {
        status: PayrollStatus;
        count: number;
    }[] = report
            ? [
                {
                    status: "DRAFT",
                    count: report.totals.draftCount,
                },
                {
                    status: "CONFIRMED",
                    count: report.totals.confirmedCount,
                },
                {
                    status: "PAID",
                    count: report.totals.paidCount,
                },
            ]
            : [];

  
    // FILTER EMPLOYEES
  

    const filteredEmployees = React.useMemo(() => {
        if (!report) return [];

        const searchValue = search.trim().toLowerCase();

        if (!searchValue) return report.employees;

        return report.employees.filter((employee) =>
            employee.name.toLowerCase().includes(searchValue) ||
            (employee.employeeCode ?? "")
                .toLowerCase()
                .includes(searchValue)
        );
    }, [report, search]);

    // Clear filters

    const clearFilters = () => {
        setSearch("");
    };

    const hasActiveFilters = search.trim() !== "";

  
    // EXCEL EXPORT
  

    const handleExport = async () => {
        if (!canViewPayrollReport || !report) return;

        try {
            const XLSX = await import("xlsx");

            const workbook = XLSX.utils.book_new();

            // Create JSON sheet

            const makeSheet = (
                rows: Record<string, string | number>[]
            ) => {
                const worksheet = XLSX.utils.json_to_sheet(rows);

                worksheet["!cols"] = fitColumns(rows);

                return worksheet;
            };

            // Group-wise rows

            const groupRows = (rows: GroupTotals[]) => [
                ...rows.map((row) => ({
                    Name: row.name,
                    Employees: row.employeeCount,
                    Gross: row.totalGross,
                    Earned: row.totalEarned,
                    Deduction: row.totalDeduction,
                    perDaySalary: row.totalperDaySalary,
                    "Net Payable": row.totalNet,
                })),

                {
                    Name: "TOTAL",
                    Employees: sumBy(rows, (row) => row.employeeCount),
                    Gross: sumBy(rows, (row) => row.totalGross),
                    Earned: sumBy(rows, (row) => row.totalEarned),
                    Deduction: sumBy(rows, (row) => row.totalDeduction),
                    perDaySalary: sumBy(
                        rows,
                        (row) => row.totalperDaySalary
                    ),
                    "Net Payable": sumBy(rows, (row) => row.totalNet),
                },
            ];

            // Sort employees

            const sortedEmployees = [...report.employees].sort(
                (a, b) =>
                    a.branchName.localeCompare(b.branchName) ||
                    a.categoryName.localeCompare(b.categoryName) ||
                    a.name.localeCompare(b.name)
            );

            // Employees sheet

            const employeeRows = [
                ...sortedEmployees.map((employee) => ({
                    Code: employee.employeeCode ?? "",
                    Name: employee.name,
                    Branch: employee.branchName,
                    Category: employee.categoryName,
                    Gross: employee.gross,
                    Earned: employee.earned,
                    Deduction: employee.deduction,
                    perDaySalary: employee.perDaySalary,
                    "Net Payable": employee.net,
                    Status: employee.status,
                })),

                {
                    Code: "",
                    Name: "TOTAL",
                    Branch: "",
                    Category: "",
                    Gross: sumBy(sortedEmployees, (e) => e.gross),
                    Earned: sumBy(sortedEmployees, (e) => e.earned),
                    Deduction: sumBy(sortedEmployees, (e) => e.deduction),
                    perDaySalary: sumBy(
                        sortedEmployees,
                        (e) => e.perDaySalary
                    ),
                    "Net Payable": sumBy(sortedEmployees, (e) => e.net),
                    Status: "",
                },
            ];

            // Branch-wise Detail sheet

            const detailHeader = [
                "Branch / Employee",
                "Code",
                "Category",
                "Gross",
                "Earned",
                "Deduction",
                "PerDaySalary",
                "Net Payable",
            ];

            const detailRows: (string | number)[][] = [detailHeader];

            const branchNames = Array.from(
                new Set(
                    sortedEmployees.map((employee) => employee.branchName)
                )
            );

            for (const branchName of branchNames) {
                const members = sortedEmployees.filter(
                    (employee) => employee.branchName === branchName
                );

                detailRows.push([
                    branchName.toUpperCase(),
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                ]);

                for (const employee of members) {
                    detailRows.push([
                        `   ${employee.name}`,
                        employee.employeeCode ?? "",
                        employee.categoryName,
                        employee.gross,
                        employee.earned,
                        employee.deduction,
                        employee.perDaySalary,
                        employee.net,
                    ]);
                }

                detailRows.push([
                    `Branch Total (${members.length} employees)`,
                    "",
                    "",
                    sumBy(members, (e) => e.gross),
                    sumBy(members, (e) => e.earned),
                    sumBy(members, (e) => e.deduction),
                    sumBy(members, (e) => e.perDaySalary),
                    sumBy(members, (e) => e.net),
                ]);

                detailRows.push(["", "", "", "", "", "", "", ""]);
            }

            detailRows.push([
                `GRAND TOTAL (${sortedEmployees.length} employees)`,
                "",
                "",
                sumBy(sortedEmployees, (e) => e.gross),
                sumBy(sortedEmployees, (e) => e.earned),
                sumBy(sortedEmployees, (e) => e.deduction),
                sumBy(sortedEmployees, (e) => e.perDaySalary),
                sumBy(sortedEmployees, (e) => e.net),
            ]);

            const detailSheet = XLSX.utils.aoa_to_sheet(detailRows);

            detailSheet["!cols"] = detailHeader.map((header, index) => ({
                wch:
                    Math.max(
                        header.length,
                        ...detailRows.map((row) =>
                            String(row[index] ?? "").length
                        )
                    ) + 2,
            }));

            // Append sheets

            XLSX.utils.book_append_sheet(
                workbook,
                detailSheet,
                "Branch-wise Detail"
            );

            XLSX.utils.book_append_sheet(
                workbook,
                makeSheet(groupRows(report.byBranch)),
                "By Branch"
            );

            XLSX.utils.book_append_sheet(
                workbook,
                makeSheet(employeeRows),
                "Employees"
            );

            // Download

            XLSX.writeFile(
                workbook,
                `payroll-report-${month}-${year}.xlsx`
            );

            toast.success("Payroll report exported successfully.");
        } catch {
            toast.error("Failed to export payroll report.");
        }
    };

  
    // PERMISSION CHECK
  

    if (!canViewPayrollReport) {
        return null;
    }

  
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

                    {/* COMPANY SELECT */}

                    {isSuperAdmin && (
                        <Select
                            value={selectedCompanyId}
                            onValueChange={setSelectedCompanyId}
                            disabled={
                                companiesLoading ||
                                companies.length === 0
                            }
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
                                    <SelectItem
                                        key={company.id}
                                        value={company.id}
                                    >
                                        {company.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* MONTH SELECT */}

                    <Select
                        value={String(month)}
                        onValueChange={(value) => setMonth(Number(value))}
                    >
                        <SelectTrigger className="h-9 w-[135px]">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>

                        <SelectContent position="popper">
                            {MONTHS.map((item) => (
                                <SelectItem
                                    key={item.value}
                                    value={String(item.value)}
                                >
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* YEAR SELECT */}

                    <Select
                        value={String(year)}
                        onValueChange={(value) => setYear(Number(value))}
                    >
                        <SelectTrigger className="h-9 w-[100px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>

                        <SelectContent position="popper">
                            {getYearOptions().map((item) => (
                                <SelectItem
                                    key={item}
                                    value={String(item)}
                                >
                                    {item}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* EXPORT BUTTON */}

                    <Button
                        variant="add"
                        className="h-9"
                        onClick={handleExport}
                        disabled={!report || loading}
                    >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export Excel
                    </Button>
                </div>
            </div>

            {/* REPORT STATES */}

            {isSuperAdmin && !selectedCompanyId ? (
                <div className="flex min-h-[300px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
                    Please select a company to view the payroll report.
                </div>
            ) : !report && loading ? (
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
                        {summaryCards.map((item) => (
                            <Card
                                key={item.title}
                                className="p-4"
                            >
                                <p className="text-xs font-medium text-muted-foreground">
                                    {item.title}
                                </p>

                                <p
                                    className={`mt-1 text-xl font-bold tracking-tight ${item.className ?? ""}`}
                                >
                                    {item.value}
                                </p>
                            </Card>
                        ))}
                    </div>

                    {/* PAYROLL STATUS */}

                    <div className="p-3">
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Payroll Status
                            </span>

                            {payrollStatuses.map((item) => (
                                <span
                                    key={item.status}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <StatusBadge status={item.status} />

                                    <span className="font-medium">
                                        {item.count}
                                    </span>
                                </span>
                            ))}
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
                                            {BRANCH_COLUMNS.map((column) => (
                                                <TableHead
                                                    key={column.label}
                                                    className={column.headerClass}
                                                >
                                                    {column.label}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {report.byBranch.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={BRANCH_COLUMNS.length}
                                                    className="py-8 text-center text-sm text-muted-foreground"
                                                >
                                                    No data
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            report.byBranch.map((branch) => (
                                                <TableRow
                                                    key={branch.id ?? branch.name}
                                                    className="hover:bg-muted/30"
                                                >
                                                    {BRANCH_COLUMNS.map((column) => (
                                                        <TableCell
                                                            key={column.label}
                                                            className={column.cellClass}
                                                        >
                                                            {column.render(branch)}
                                                        </TableCell>
                                                    ))}
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

                        {/* SEARCH */}

                        <div className="mb-3 flex flex-wrap gap-2 rounded-lg border bg-card p-3 sm:items-center">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                <Input
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Search employee name or code..."
                                    className="h-9 w-auto pl-9"
                                />
                            </div>

                            <Button
                                type="button"
                                variant="add"
                                className="h-9"
                                onClick={clearFilters}
                                disabled={!hasActiveFilters}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Clear
                            </Button>
                        </div>

                        {/* FILTER RESULT COUNT */}

                        <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                Showing {filteredEmployees.length} of{" "}
                                {report.employees.length} employees
                            </p>
                        </div>

                        {/* EMPLOYEE TABLE */}

                        <div className="overflow-hidden rounded-lg border bg-card">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/60">
                                        <TableRow className="hover:bg-transparent">
                                            {EMPLOYEE_COLUMNS.map((column) => (
                                                <TableHead
                                                    key={column.label}
                                                    className={column.headerClass}
                                                >
                                                    {column.label}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {filteredEmployees.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={EMPLOYEE_COLUMNS.length}
                                                    className="py-8 text-center text-sm text-muted-foreground"
                                                >
                                                    {report.employees.length === 0
                                                        ? "No employees found"
                                                        : "No employees match your search or filters"}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredEmployees.map((employee) => (
                                                <TableRow
                                                    key={employee.userId}
                                                    className="hover:bg-muted/30"
                                                >
                                                    {EMPLOYEE_COLUMNS.map((column) => (
                                                        <TableCell
                                                            key={column.label}
                                                            className={column.cellClass}
                                                        >
                                                            {column.render(employee)}
                                                        </TableCell>
                                                    ))}
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
