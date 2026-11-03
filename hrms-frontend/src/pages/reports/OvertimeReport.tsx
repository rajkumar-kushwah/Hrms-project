
import React from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import {
    FileSpreadsheet,
    RefreshCw,
    Search,
} from "lucide-react";

import { Card } from "@/components/ui/card";
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

import { getOvertimeReport } from "@/services/overtimeReport.service";
import { getCompanies } from "@/services/company.service";
import { useAuthStore } from "@/store/auth.store";
import { isSuperAdminRole } from "@/utilis/roleUtils";

// Types

interface Company {
    id: string;
    name: string;
}

interface OvertimeRecord {
    id: string;
    date: string;
    userId: string;
    employeeCode: string | null;
    employeeName: string;
    email: string;
    branch: string;
    category: string;
    workingHours: number;
    overtimeHours: number;
}

interface Summary {
    totalOvertimeHours: number;
    employeesWithOvertime: number;
    totalOvertimeDays: number;
}

interface Pagination {
    page: number;
    limit: number;
    totalRecords: number;
    totalPages: number;
}

interface Report {
    summary: Summary;
    data: OvertimeRecord[];
    pagination: Pagination;
}

const PAGE_LIMIT = 10;

const EMPTY_SUMMARY: Summary = {
    totalOvertimeHours: 0,
    employeesWithOvertime: 0,
    totalOvertimeDays: 0,
};

const EMPTY_PAGINATION: Pagination = {
    page: 1,
    limit: PAGE_LIMIT,
    totalRecords: 0,
    totalPages: 0,
};

// Current month in YYYY-MM format

const getCurrentMonth = (): string => {
    const date = new Date();

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}`;
};

// Get selected month's start and end dates.
// Local date formatting avoids UTC timezone date shifts.

const getMonthDateRange = (monthValue: string) => {
    const [year, month] = monthValue.split("-").map(Number);

    const lastDay = new Date(year, month, 0).getDate();

    return {
        startDate: `${year}-${String(month).padStart(2, "0")}-01`,
        endDate: `${year}-${String(month).padStart(2, "0")}-${String(
            lastDay
        ).padStart(2, "0")}`,
    };
};

// Format hours

const formatHours = (hours: number) => {
    return `${Number(hours || 0).toFixed(2)} hrs`;
};

// Format date

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

// Error message

const getErrorMessage = (error: unknown): string => {
    if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
    ) {
        const response = error.response;

        if (
            typeof response === "object" &&
            response !== null &&
            "data" in response
        ) {
            const data = response.data;

            if (
                typeof data === "object" &&
                data !== null &&
                "message" in data &&
                typeof data.message === "string"
            ) {
                return data.message;
            }
        }
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Failed to load overtime report.";
};

const OvertimeReport = () => {
    const user = useAuthStore((state) => state.user);
    const isSuperAdmin = isSuperAdminRole(user?.role?.name);

    // Report states

    const [records, setRecords] = React.useState<OvertimeRecord[]>([]);
    const [summary, setSummary] = React.useState<Summary>(EMPTY_SUMMARY);
    const [pagination, setPagination] =
        React.useState<Pagination>(EMPTY_PAGINATION);

    // Company states

    const [companies, setCompanies] = React.useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = React.useState("");

    // Filters

    const [selectedMonth, setSelectedMonth] = React.useState(
        getCurrentMonth
    );
    const [search, setSearch] = React.useState("");

    // Loading states

    const [page, setPage] = React.useState(1);
    const [companiesLoading, setCompaniesLoading] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [isSpinning, setIsSpinning] = React.useState(false);

    // Load companies for Super Admin

    React.useEffect(() => {
        if (!isSuperAdmin) return;

        let cancelled = false;

        const loadCompanies = async () => {
            setCompaniesLoading(true);

            try {
                const response = await getCompanies();
                const payload = response.data.data;

                const list: Company[] = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.companies)
                        ? payload.companies
                        : [];

                if (cancelled) return;

                setCompanies(list);

                if (list.length === 1) {
                    setSelectedCompanyId(list[0].id);
                }
            } catch (error) {
                if (!cancelled) {
                    toast.error(getErrorMessage(error));
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

    // Fetch overtime report

    const loadReport = React.useCallback(async () => {
        if (isSuperAdmin && !selectedCompanyId) {
            setRecords([]);
            setSummary(EMPTY_SUMMARY);
            setPagination(EMPTY_PAGINATION);
            setLoading(false);
            return;
        }

        if (!selectedMonth) {
            return;
        }

        setLoading(true);

        try {
            const { startDate, endDate } =
                getMonthDateRange(selectedMonth);

            const response = await getOvertimeReport({
                startDate,
                endDate,
                ...(search.trim()
                    ? { search: search.trim() }
                    : {}),
                ...(isSuperAdmin
                    ? { companyId: selectedCompanyId }
                    : {}),
                page,
                limit: PAGE_LIMIT,
            });

            if (!response?.success) {
                throw new Error(
                    response?.message ||
                    "Failed to load overtime report."
                );
            }

            // Service returns response.data.
            // Backend report is inside response.data.

            const result = response.data as Report;

            setRecords(
                Array.isArray(result?.data)
                    ? result.data
                    : []
            );

            setSummary(
                result?.summary ?? EMPTY_SUMMARY
            );

            setPagination(
                result?.pagination ?? EMPTY_PAGINATION
            );

        } catch (error: unknown) {
            setRecords([]);
            setSummary(EMPTY_SUMMARY);
            setPagination(EMPTY_PAGINATION);

            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }, [
        selectedMonth,
        search,
        isSuperAdmin,
        selectedCompanyId,
        page,
    ]);

    // Automatically fetch report when filters change

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            void loadReport();
        }, 300);

        return () => clearTimeout(timeout);
    }, [loadReport]);

    // Clear filters

    const handleClear = () => {
        setSelectedMonth(getCurrentMonth());
        setSearch("");
        setPage(1);
    };

    // Refresh report

    const handleRefresh = async () => {
        setIsSpinning(true);

        try {
            await Promise.all([
                loadReport(),
                new Promise((resolve) =>
                    setTimeout(resolve, 700)
                ),
            ]);
        } finally {
            setIsSpinning(false);
        }
    };

    // Excel export

    const handleExport = () => {
        if (!records.length) {
            toast.error(
                "No overtime records available to export."
            );
            return;
        }

        const rows = records.map((record) => ({
            Date: formatDate(record.date),
            "Employee Code": record.employeeCode ?? "",
            "Employee Name": record.employeeName,
            Email: record.email,
            Branch: record.branch,
            Category: record.category,
            "Working Hours": record.workingHours,
            "Overtime Hours": record.overtimeHours,
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);

        worksheet["!cols"] = Object.keys(rows[0]).map((key) => ({
            wch:
                Math.max(
                    key.length,
                    ...rows.map((row) =>
                        String(
                            row[key as keyof typeof row] ?? ""
                        ).length
                    )
                ) + 2,
        }));

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Overtime Report"
        );

        XLSX.writeFile(
            workbook,
            `overtime-report-${selectedMonth}.xlsx`
        );

        toast.success("Overtime report exported successfully.");
    };

    // Summary cards

    const cards = [
        {
            label: "Total Overtime Hours",
            value: formatHours(summary.totalOvertimeHours),
        },
        {
            label: "Employees with Overtime",
            value: summary.employeesWithOvertime,
        },
        {
            label: "Total Overtime Days",
            value: summary.totalOvertimeDays,
        },
    ];

    return (
        <div className="space-y-4 p-1">

            {/* Header */}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    Employee overtime summary and working hours.
                </p>

                <Button
                    className="cursor-pointer"
                    variant="add"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={
                        isSpinning ||
                        loading ||
                        (isSuperAdmin && !selectedCompanyId)
                    }
                >
                    <RefreshCw
                        className={`mr-2 h-4 w-4 ${isSpinning ? "animate-spin" : ""
                            }`}
                    />
                    Refresh
                </Button>
            </div>

            {/* Filters */}

            <div className="flex flex-wrap items-center justify-end gap-2">

                {/* Company Filter */}

                {isSuperAdmin && (
                    <Select
                        value={selectedCompanyId}
                        onValueChange={(value) => {
                            setSelectedCompanyId(value);
                            setPage(1);
                        }}
                        disabled={companiesLoading}
                    >
                        <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue
                                placeholder={
                                    companiesLoading
                                        ? "Loading companies..."
                                        : "Select company"
                                }
                            />
                        </SelectTrigger>

                        <SelectContent position="popper">
                            {companies.map((company) => (
                                <SelectItem
                                    key={company.id}
                                    value={company.id}
                                    className="cursor-pointer"
                                >
                                    {company.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* Month Filter */}

                <input
                    type="month"
                    value={selectedMonth}
                    max={getCurrentMonth()}
                    onChange={(event) => {
                        setSelectedMonth(event.target.value);
                        setPage(1);
                    }}
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                />

                {/* Employee Search */}

                <div className="relative w-full sm:w-[220px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

                    <input
                        type="text"
                        placeholder="Search employee..."
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>

                {/* Clear */}

                <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={handleClear}
                    disabled={
                        selectedMonth === getCurrentMonth() &&
                        !search
                    }
                >
                    Clear
                </Button>

                {/* Export */}

                <Button
                    variant="add"
                    size="sm"
                    className="cursor-pointer"
                    onClick={handleExport}
                    disabled={!records.length || loading}
                >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Export Excel
                </Button>
            </div>

            {/* Company Selection Message */}

            {isSuperAdmin && !selectedCompanyId ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                    Select a company to view its overtime report.
                </div>
            ) : loading && !records.length ? (
                <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading overtime report...
                </div>
            ) : (
                <>
                    {/* Summary Cards */}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {cards.map((card) => (
                            <Card
                                key={card.label}
                                className="p-3"
                            >
                                <p className="text-xs text-muted-foreground">
                                    {card.label}
                                </p>

                                <p className="mt-1 text-2xl font-bold">
                                    {card.value}
                                </p>
                            </Card>
                        ))}
                    </div>

                    {/* Report Table */}

                    <div className="relative">
                        {loading && (
                            <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/60 pt-16 backdrop-blur-[1px]">
                                <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Refreshing report...
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto rounded border bg-card">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Employee Code</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">
                                            Working Hours
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Overtime Hours
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {records.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={7}
                                                className="py-8 text-center text-muted-foreground"
                                            >
                                                No overtime records found for this month.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        records.map((record) => (
                                            <TableRow key={record.id}>
                                                <TableCell>
                                                    {formatDate(record.date)}
                                                </TableCell>

                                                <TableCell>
                                                    <p className="font-medium">
                                                        {record.employeeName}
                                                    </p>

                                                    <p className="text-xs text-muted-foreground">
                                                        {record.email}
                                                    </p>
                                                </TableCell>

                                                <TableCell>
                                                    {record.employeeCode ?? "—"}
                                                </TableCell>

                                                <TableCell>
                                                    {record.branch || "—"}
                                                </TableCell>

                                                <TableCell>
                                                    {record.category || "—"}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    {formatHours(record.workingHours)}
                                                </TableCell>

                                                <TableCell className="text-right font-semibold text-primary">
                                                    {formatHours(record.overtimeHours)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Pagination */}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                            Total records: {pagination.totalRecords}
                        </p>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="cursor-pointer"
                                disabled={page <= 1 || loading}
                                onClick={() =>
                                    setPage((prev) => prev - 1)
                                }
                            >
                                Previous
                            </Button>

                            <span className="text-sm text-muted-foreground">
                                {page} / {Math.max(1, pagination.totalPages)}
                            </span>

                            <Button
                                variant="outline"
                                size="sm"
                                className="cursor-pointer"
                                disabled={
                                    page >= pagination.totalPages ||
                                    loading ||
                                    pagination.totalPages === 0
                                }
                                onClick={() =>
                                    setPage((prev) => prev + 1)
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default OvertimeReport;
