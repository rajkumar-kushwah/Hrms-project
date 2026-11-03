
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
    CalendarDays,
    CheckCircle2,
    Clock,
    Download,
    RefreshCw,
    XCircle,
    X,
} from "lucide-react";

import { useAuthStore } from "@/store/auth.store";
import { getCompanies } from "@/services/company.service";
import { getLeaveReport } from "@/services/leaveReport.service";
import { isSuperAdminRole } from "@/utilis/roleUtils";

import type {
    LeaveReportItem,
    LeaveReportResponse,
    LeaveReportFilters,
} from "@/types/leaveReport.types";

import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

interface Company {
    id: string;
    name: string;
}

const PAGE_LIMIT = 10;

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const getStatusVariant = (
    status: string
): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
        case "approved":
            return "default";
        case "pending":
            return "secondary";
        case "rejected":
        case "cancelled":
            return "destructive";
        default:
            return "outline";
    }
};

// CSV Export
const downloadCSV = (items: LeaveReportItem[]) => {
    if (!items.length) {
        toast.error("No data available to export.");
        return;
    }

    const headers = [
        "Employee Name",
        "Employee Code",
        "Email",
        "Branch",
        "Category",
        "Leave Type",
        "Start Date",
        "End Date",
        "Total Days",
        "Status",
        "Applied Date",
    ];

    const rows = items.map((item) => [
        item.user.name ?? "",
        item.user.employeeCode ?? "",
        item.user.email,
        item.user.branch?.name ?? "",
        item.user.category?.name ?? "",
        item.leaveType.name,
        formatDate(item.startDate),
        formatDate(item.endDate),
        item.totalDays,
        item.status,
        formatDate(item.createdAt),
    ]);

    const csvContent = [headers, ...rows]
        .map((row) =>
            row
                .map((value) =>
                    `"${String(value).replace(/"/g, '""')}"`
                )
                .join(",")
        )
        .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "leave-report.csv";
    link.click();

    URL.revokeObjectURL(url);
};

const LeaveReport = () => {
    const user = useAuthStore((state) => state.user);
    const isSuperAdmin = isSuperAdminRole(user?.role?.name);

    // Company
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");
    const [companiesLoading, setCompaniesLoading] = useState(false);

    // Report
    const [report, setReport] = useState<LeaveReportResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Filters
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Pagination
    const [page, setPage] = useState(1);

    // Load companies
    useEffect(() => {
        if (!isSuperAdmin) {
            setCompanies([]);
            setSelectedCompanyId("");
            return;
        }

        let cancelled = false;

        const fetchCompanies = async () => {
            setCompaniesLoading(true);

            try {
                const response = await getCompanies();
                const companyList: Company[] =
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
                    toast.error("Failed to load companies.");
                    setCompanies([]);
                    setSelectedCompanyId("");
                }
            } finally {
                if (!cancelled) {
                    setCompaniesLoading(false);
                }
            }
        };

        void fetchCompanies();

        return () => {
            cancelled = true;
        };
    }, [isSuperAdmin]);

    // Fetch report
    const fetchReport = useCallback(
        async (isRefresh = false) => {
            if (isSuperAdmin && !selectedCompanyId) {
                setReport(null);
                setLoading(false);
                setRefreshing(false);
                return;
            }

            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            try {
                const filters: LeaveReportFilters = {
                    ...(startDate ? { startDate } : {}),
                    ...(endDate ? { endDate } : {}),
                    ...(search.trim()
                        ? { search: search.trim() }
                        : {}),
                    ...(status !== "all" ? { status } : {}),
                    page,
                    limit: PAGE_LIMIT,
                };

                const result = await getLeaveReport(
                    filters,
                    isSuperAdmin
                        ? selectedCompanyId
                        : undefined
                );

                setReport(result);
            } catch {
                setReport(null);
                toast.error("Failed to fetch leave report.");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [
            isSuperAdmin,
            selectedCompanyId,
            startDate,
            endDate,
            search,
            status,
            page,
        ]
    );

    useEffect(() => {
        void fetchReport();
    }, [fetchReport]);

    // Company selection
    const handleCompanyChange = (value: string) => {
        setSelectedCompanyId(value);
        setPage(1);
        setReport(null);
    };

    // Clear filters
    const handleClearFilters = () => {
        setSearch("");
        setStatus("all");
        setStartDate("");
        setEndDate("");
        setPage(1);
    };

    const summary = report?.summary;

    const summaryCards = [
        {
            title: "Total Leaves",
            value: summary?.total ?? 0,
            icon: CalendarDays,
        },
        {
            title: "Approved",
            value: summary?.approved ?? 0,
            icon: CheckCircle2,
        },
        {
            title: "Pending",
            value: summary?.pending ?? 0,
            icon: Clock,
        },
        {
            title: "Rejected",
            value: summary?.rejected ?? 0,
            icon: XCircle,
        },
        {
            title: "Cancelled",
            value: summary?.cancelled ?? 0,
            icon: X,
        },
    ];

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold">
                        Leave Report
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        View and manage employee leave reports.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">

                    {/* Company Dropdown */}
                    {isSuperAdmin && (
                        <Select
                            value={selectedCompanyId}
                            onValueChange={handleCompanyChange}
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

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            downloadCSV(report?.data ?? [])
                        }
                        disabled={!report?.data.length || loading}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>

                    <Button
                        variant="add"
                        size="sm"
                        onClick={() => void fetchReport(true)}
                        disabled={
                            loading ||
                            refreshing ||
                            (isSuperAdmin && !selectedCompanyId)
                        }
                    >
                        <RefreshCw
                            className={` ${
                                refreshing ? "animate-spin" : ""
                            }`}
                        />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-2">

                        <Input
                            placeholder="Search employee..."
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            className="h-9 w-full sm:w-[200px]"
                        />

                        <Input
                            type="date"
                            value={startDate}
                            onChange={(event) => {
                                setStartDate(event.target.value);
                                setPage(1);
                            }}
                            className="h-9 w-full sm:w-[160px]"
                        />

                        <Input
                            type="date"
                            value={endDate}
                            onChange={(event) => {
                                setEndDate(event.target.value);
                                setPage(1);
                            }}
                            className="h-9 w-full sm:w-[160px]"
                        />

                        <Select
                            value={status}
                            onValueChange={(value) => {
                                setStatus(value);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="h-9 w-full sm:w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="all">
                                    All Status
                                </SelectItem>
                                <SelectItem value="Pending">
                                    Pending
                                </SelectItem>
                                <SelectItem value="Approved">
                                    Approved
                                </SelectItem>
                                <SelectItem value="Rejected">
                                    Rejected
                                </SelectItem>
                                <SelectItem value="Cancelled">
                                    Cancelled
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearFilters}
                        >
                            <X className="mr-2 h-4 w-4" />
                            Clear Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {summaryCards.map((item) => {
                    const Icon = item.icon;

                    return (
                        <Card key={item.title}>
                            <CardContent className="flex items-center justify-between p-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">
                                        {item.title}
                                    </p>

                                    <p className="mt-1 text-2xl font-semibold">
                                        {item.value}
                                    </p>
                                </div>

                                <Icon className="h-5 w-5 text-muted-foreground" />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Employee Leave Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Leave Type</TableHead>
                                    <TableHead>From</TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead>Days</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Applied On</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {isSuperAdmin && !selectedCompanyId ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={10}
                                            className="h-28 text-center text-muted-foreground"
                                        >
                                            Please select a company.
                                        </TableCell>
                                    </TableRow>
                                ) : loading ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={10}
                                            className="h-28 text-center text-muted-foreground"
                                        >
                                            <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
                                            Loading leave report...
                                        </TableCell>
                                    </TableRow>
                                ) : !report?.data.length ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={10}
                                            className="h-28 text-center text-muted-foreground"
                                        >
                                            No leave records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    report.data.map((item) => (
                                        <TableRow key={item.id}>

                                            {/* Employee */}
                                            <TableCell>
                                                <div className="font-medium">
                                                    {item.user.name ?? "N/A"}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {item.user.email}
                                                </div>
                                            </TableCell>

                                            {/* Employee Code */}
                                            <TableCell>
                                                {item.user.employeeCode ?? "—"}
                                            </TableCell>

                                            {/* Branch */}
                                            <TableCell>
                                                {item.user.branch?.name ?? "—"}
                                            </TableCell>

                                            {/* Category */}
                                            <TableCell>
                                                {item.user.category?.name ?? "—"}
                                            </TableCell>

                                            {/* Leave Type */}
                                            <TableCell>
                                                {item.leaveType.name}
                                            </TableCell>

                                            <TableCell>
                                                {formatDate(item.startDate)}
                                            </TableCell>

                                            <TableCell>
                                                {formatDate(item.endDate)}
                                            </TableCell>

                                            <TableCell>
                                                {item.totalDays}
                                            </TableCell>

                                            <TableCell>
                                                <Badge
                                                    variant={getStatusVariant(
                                                        item.status
                                                    )}
                                                >
                                                    {item.status}
                                                </Badge>
                                            </TableCell>

                                            <TableCell>
                                                {formatDate(item.createdAt)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {report &&
                        report.pagination.totalPages > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">

                                <p className="text-sm text-muted-foreground">
                                    Page {report.pagination.page} of{" "}
                                    {report.pagination.totalPages} (
                                    {report.pagination.total} records)
                                </p>

                                <Pagination className="mx-0 w-auto justify-end">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() =>
                                                    setPage((current) =>
                                                        Math.max(1, current - 1)
                                                    )
                                                }
                                                className={
                                                    page <= 1
                                                        ? "pointer-events-none opacity-50"
                                                        : "cursor-pointer"
                                                }
                                            />
                                        </PaginationItem>

                                        <PaginationItem>
                                            <PaginationLink isActive>
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>

                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() =>
                                                    setPage((current) =>
                                                        Math.min(
                                                            report.pagination.totalPages,
                                                            current + 1
                                                        )
                                                    )
                                                }
                                                className={
                                                    page >=
                                                    report.pagination.totalPages
                                                        ? "pointer-events-none opacity-50"
                                                        : "cursor-pointer"
                                                }
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                </CardContent>
            </Card>
        </div>
    );
};

export default LeaveReport;
