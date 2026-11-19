
import React from "react";
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

import {
    isSuperAdminRole,
    canViewModule,
} from "@/utilis/roleUtils";
import UserAvatar from "../common/UserAvatar";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface Company {
    id: string;
    name: string;
}

interface OvertimeRecord {
    id: string;
    userId: string;
    name: string;
    date: string;
    profilePhoto: string | null;
    profilePhotoId: string | null;
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

interface SummaryCard {
    label: string;
    value: string | number;
}

interface TableColumn {
    label: string;
    className?: string;
    render: (record: OvertimeRecord) => React.ReactNode;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const PAGE_LIMIT = 10;
const MODULE_NAME = "overtime_report";

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

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// Current month in YYYY-MM format

const getCurrentMonth = (): string => {
    const date = new Date();

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}`;
};

// Get selected month's date range

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

const formatHours = (hours: number) =>
    `${Number(hours || 0).toFixed(2)} hrs`;

// Format date

const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

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

// Excel column widths

const getColumnWidths = (
    rows: Record<string, string | number>[]
) => {
    if (!rows.length) return [];

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

// ─────────────────────────────────────────────
// TABLE CONFIGURATION
// ─────────────────────────────────────────────

const TABLE_COLUMNS: TableColumn[] = [
    {
        label: "Date",
        render: (record) => formatDate(record.date),
    },
  {
    label: "Employee",
    render: (record) => (
        <div className="flex items-center gap-2">
            <UserAvatar user={record} size="sm" />

            <div>
                <p className="font-medium">
                    {record.employeeName}
                </p>

                <p className="text-xs text-muted-foreground">
                    {record.email}
                </p>
            </div>
        </div>
    ),
},
    {
        label: "Employee Code",
        render: (record) => record.employeeCode ?? "—",
    },
    {
        label: "Branch",
        render: (record) => record.branch || "—",
    },
    {
        label: "Category",
        render: (record) => record.category || "—",
    },
    {
        label: "Working Hours",
        className: "text-right",
        render: (record) => formatHours(record.workingHours),
    },
    {
        label: "Overtime Hours",
        className: "text-right font-semibold text-primary",
        render: (record) => formatHours(record.overtimeHours),
    },
];

// ─────────────────────────────────────────────
// EXCEL CONFIGURATION
// ─────────────────────────────────────────────

const EXPORT_COLUMNS = [
    {
        label: "Date",
        getValue: (record: OvertimeRecord) => formatDate(record.date),
    },
    {
        label: "Employee Code",
        getValue: (record: OvertimeRecord) => record.employeeCode ?? "",
    },
    {
        label: "Employee Name",
        getValue: (record: OvertimeRecord) => record.employeeName,
    },
    {
        label: "Email",
        getValue: (record: OvertimeRecord) => record.email,
    },
    {
        label: "Branch",
        getValue: (record: OvertimeRecord) => record.branch,
    },
    {
        label: "Category",
        getValue: (record: OvertimeRecord) => record.category,
    },
    {
        label: "Working Hours",
        getValue: (record: OvertimeRecord) => record.workingHours,
    },
    {
        label: "Overtime Hours",
        getValue: (record: OvertimeRecord) => record.overtimeHours,
    },
];

// ─────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────

const OvertimeReport = () => {
    const user = useAuthStore((state) => state.user);

    // Permissions

    const canViewOvertimeReport = canViewModule(
        user,
        MODULE_NAME
    );

    const isSuperAdmin = isSuperAdminRole(user);

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

    // ─────────────────────────────────────────
    // SUMMARY CARDS
    // ─────────────────────────────────────────

    const summaryCards: SummaryCard[] = [
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

    // ─────────────────────────────────────────
    // LOAD COMPANIES
    // ─────────────────────────────────────────

    React.useEffect(() => {
        if (!canViewOvertimeReport || !isSuperAdmin) {
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
                const payload = response.data.data;

                const list: Company[] = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.companies)
                        ? payload.companies
                        : [];

                if (cancelled) return;

                setCompanies(list);

                setSelectedCompanyId((current) => {
                    if (
                        current &&
                        list.some((company) => company.id === current)
                    ) {
                        return current;
                    }

                    return list.length === 1 ? list[0].id : "";
                });
            } catch (error) {
                if (!cancelled) {
                    toast.error(getErrorMessage(error));
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
    }, [canViewOvertimeReport, isSuperAdmin]);

    // ─────────────────────────────────────────
    // LOAD OVERTIME REPORT
    // ─────────────────────────────────────────

    const loadReport = React.useCallback(async () => {
        if (!canViewOvertimeReport) {
            setRecords([]);
            setSummary(EMPTY_SUMMARY);
            setPagination(EMPTY_PAGINATION);
            setLoading(false);
            return;
        }

        if (isSuperAdmin && !selectedCompanyId) {
            setRecords([]);
            setSummary(EMPTY_SUMMARY);
            setPagination(EMPTY_PAGINATION);
            setLoading(false);
            return;
        }

        if (!selectedMonth) return;

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

            const result = response.data as Report;

            setRecords(
                Array.isArray(result?.data)
                    ? result.data
                    : []
            );

            setSummary(result?.summary ?? EMPTY_SUMMARY);

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
        canViewOvertimeReport,
        selectedMonth,
        search,
        isSuperAdmin,
        selectedCompanyId,
        page,
    ]);

    // ─────────────────────────────────────────
    // AUTOMATIC REPORT FETCH
    // ─────────────────────────────────────────

    React.useEffect(() => {
        if (!canViewOvertimeReport) return;

        const timeout = setTimeout(() => {
            void loadReport();
        }, 300);

        return () => clearTimeout(timeout);
    }, [canViewOvertimeReport, loadReport]);

    // ─────────────────────────────────────────
    // FILTER HANDLERS
    // ─────────────────────────────────────────

    const handleClear = () => {
        if (!canViewOvertimeReport) return;

        setSelectedMonth(getCurrentMonth());
        setSearch("");
        setPage(1);
    };

    const handleMonthChange = (value: string) => {
        setSelectedMonth(value);
        setPage(1);
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    const handleCompanyChange = (value: string) => {
        setSelectedCompanyId(value);
        setPage(1);
    };

    const hasActiveFilters =
        selectedMonth !== getCurrentMonth() || search.trim() !== "";

    // ─────────────────────────────────────────
    // REFRESH
    // ─────────────────────────────────────────

    const handleRefresh = async () => {
        if (!canViewOvertimeReport) return;

        setIsSpinning(true);

        try {
            await Promise.all([
                loadReport(),
                new Promise((resolve) => setTimeout(resolve, 700)),
            ]);
        } finally {
            setIsSpinning(false);
        }
    };

    // ─────────────────────────────────────────
    // EXCEL EXPORT
    // ─────────────────────────────────────────

    const handleExport = async () => {
        if (!canViewOvertimeReport) return;

        if (!records.length) {
            toast.error("No overtime records available to export.");
            return;
        }

        try {
            const XLSX = await import("xlsx");

            const rows = records.map((record) =>
                Object.fromEntries(
                    EXPORT_COLUMNS.map((column) => [
                        column.label,
                        column.getValue(record),
                    ])
                )
            ) as Record<string, string | number>[];

            const worksheet = XLSX.utils.json_to_sheet(rows);

            worksheet["!cols"] = getColumnWidths(rows);

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
        } catch {
            toast.error("Failed to export overtime report.");
        }
    };

    // ─────────────────────────────────────────
    // PERMISSION CHECK
    // ─────────────────────────────────────────

    if (!canViewOvertimeReport) {
        return null;
    }

    // ─────────────────────────────────────────
    // UI
    // ─────────────────────────────────────────

    return (
        <div className="space-y-4 p-1">

            {/* HEADER */}

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

            {/* FILTERS */}

            <div className="flex flex-wrap items-center justify-end gap-2">

                {/* COMPANY FILTER */}

                {isSuperAdmin && (
                    <Select
                        value={selectedCompanyId}
                        onValueChange={handleCompanyChange}
                        disabled={
                            companiesLoading ||
                            companies.length === 0
                        }
                    >
                        <SelectTrigger className="w-full sm:w-[220px]">
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
                                    className="cursor-pointer"
                                >
                                    {company.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}

                {/* MONTH FILTER */}

                <input
                    type="month"
                    value={selectedMonth}
                    max={getCurrentMonth()}
                    onChange={(event) =>
                        handleMonthChange(event.target.value)
                    }
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                />

                {/* EMPLOYEE SEARCH */}

                <div className="relative w-full sm:w-[220px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

                    <input
                        type="text"
                        placeholder="Search employee..."
                        value={search}
                        onChange={(event) =>
                            handleSearchChange(event.target.value)
                        }
                        className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>

                {/* CLEAR */}

                <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={handleClear}
                    disabled={!hasActiveFilters}
                >
                    Clear
                </Button>

                {/* EXPORT */}

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

            {/* COMPANY SELECTION */}

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
                    {/* SUMMARY CARDS */}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {summaryCards.map((card) => (
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

                    {/* REPORT TABLE */}

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
                                        {TABLE_COLUMNS.map((column) => (
                                            <TableHead
                                                key={column.label}
                                                className={column.className}
                                            >
                                                {column.label}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {records.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={TABLE_COLUMNS.length}
                                                className="py-8 text-center text-muted-foreground"
                                            >
                                                No overtime records found for this month.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        records.map((record) => (
                                            <TableRow key={record.id}>
                                                {TABLE_COLUMNS.map((column) => (
                                                    <TableCell
                                                        key={column.label}
                                                        className={column.className}
                                                    >
                                                        {column.render(record)}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* PAGINATION */}

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
                                    setPage((previous) => previous - 1)
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
                                    setPage((previous) => previous + 1)
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
