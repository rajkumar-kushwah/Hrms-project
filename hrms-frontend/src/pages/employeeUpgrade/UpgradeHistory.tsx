
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search, Building2, History } from "lucide-react";
import { toast } from "sonner";

import { getEmployeeUpgradeHistory } from "@/services/employeeUpgrade.service";
import { getCompanies } from "@/services/company.service";

import type {
    EmployeeCareerHistory,
    EmployeeUpgradeType,
    EmployeeUpgradeHistoryResponse,
    EmployeeUpgradeStatus,
} from "@/types/employeeUpgrade.types";
import type { Company } from "@/types/company.types";

import { useAuthStore } from "@/store/auth.store";
import { isSuperAdminRole } from "@/utilis/roleUtils";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const changeTypes: EmployeeUpgradeType[] = [
    "PROMOTION",
    "INCREMENT",
    "TRANSFER",
    "ROLE_CHANGE",
];

const getChangeTypeClass = (type: EmployeeUpgradeType) => {
    switch (type) {
        case "PROMOTION":
            return "bg-purple-100 text-purple-800 border-purple-300";

        case "INCREMENT":
            return "bg-green-100 text-green-800 border-green-300";

        case "TRANSFER":
            return "bg-blue-100 text-blue-800 border-blue-300";

        case "ROLE_CHANGE":
            return "bg-orange-100 text-orange-800 border-orange-300";

        default:
            return "bg-gray-100 text-gray-700 border-gray-300";
    }
};

const getHistoryStatusClass = (status: EmployeeUpgradeStatus) => {
    switch (status) {
        case "DRAFT":
            return "bg-gray-100 text-gray-700 border-gray-300";
        case "PENDING":
            return "bg-yellow-100 text-yellow-800 border-yellow-300";
        case "APPROVED":
            return "bg-green-100 text-green-800 border-green-300";
        case "APPLIED":
            return "bg-emerald-100 text-emerald-800 border-emerald-300";
        case "REJECTED":
            return "bg-red-100 text-red-800 border-red-300";
        case "SENT_BACK":
            return "bg-orange-100 text-orange-800 border-orange-300";
        case "CANCELLED":
            return "bg-slate-100 text-slate-700 border-slate-300";
        default:
            return "bg-gray-100 text-gray-700 border-gray-300";
    }
};

const formatLabel = (value?: string | null) => {
    if (!value) return "—";

    return value
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDate = (value?: string) => {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatSalary = (value?: number | null) => {
    if (value === null || value === undefined) return "—";

    return `₹${value.toLocaleString("en-IN")}`;
};

const getChangeSummary = (
    item: EmployeeCareerHistory,
    field: "designation" | "categoryId" | "grossSalary",
) => {
    const previous = item.previousData?.[field];
    const next = item.newData?.[field];

    if (previous === next) return null;

    if (field === "grossSalary") {
        return {
            previous: formatSalary(previous as number | null | undefined),
            next: formatSalary(next as number | null | undefined),
        };
    }

    return {
        previous: previous || "—",
        next: next || "—",
    };
};

const UpgradeHistory = () => {
    const { user } = useAuthStore();
    const isSuperAdmin = isSuperAdminRole(user);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");

    const [history, setHistory] = useState<EmployeeCareerHistory[]>([]);
    const [search, setSearch] = useState("");
    const [changeType, setChangeType] = useState("");

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [loading, setLoading] = useState(true);

    const companyId = isSuperAdmin
        ? selectedCompanyId
        : String(user?.companyId ?? "");

    // Load companies for Super Admin
    useEffect(() => {
        if (!isSuperAdmin) return;

        let active = true;

        const fetchCompanies = async () => {
            try {
                const response = await getCompanies();

                if (active) {
                    setCompanies(response.data.data ?? []);
                }
            } catch {
                if (active) {
                    toast.error("Failed to load companies");
                }
            }
        };

        void fetchCompanies();

        return () => {
            active = false;
        };
    }, [isSuperAdmin]);

    // Fetch history
    const fetchHistory = useCallback(async () => {
        if (!companyId) {
            setHistory([]);
            setTotal(0);
            setTotalPages(1);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const response = await getEmployeeUpgradeHistory(companyId, {
                ...(search.trim() ? { search: search.trim() } : {}),
                ...(changeType ? { changeType } : {}),
                page,
                limit: 10,
            });

            const result =
                response.data as EmployeeUpgradeHistoryResponse;

            setHistory(result.data ?? []);
            setTotal(result.pagination?.total ?? 0);
            setTotalPages(result.pagination?.totalPages ?? 1);
        } catch (error: unknown) {
            const message = (
                error as {
                    response?: {
                        data?: {
                            message?: string;
                        };
                    };
                }
            )?.response?.data?.message;

            toast.error(message || "Failed to load upgrade history");

            setHistory([]);
            setTotal(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [companyId, search, changeType, page]);

    useEffect(() => {
        void fetchHistory();
    }, [fetchHistory]);

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    const handleChangeType = (value: string) => {
        setChangeType(value);
        setPage(1);
    };

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">
            {/* HEADER */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Upgrade History
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Track employee promotions, increments and department transfers.
                    </p>
                </div>

                <Button className="cursor-pointer"
                    variant="add"
                    size="sm"
                    onClick={() => void fetchHistory()}
                    disabled={loading || !companyId}
                >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* COMPANY SELECTOR */}
            {isSuperAdmin && (
                <div className="flex flex-col gap-2 sm:max-w-sm">
                    <label className="text-sm font-medium">
                        Select Company
                    </label>

                    <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                        <select
                            value={selectedCompanyId}
                            onChange={(event) => {
                                setSelectedCompanyId(event.target.value);
                                setPage(1);
                            }}
                            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
                        >
                            <option value="">Select Company</option>

                            {companies.map((company) => (
                                <option key={company.id} value={company.id}>
                                    {company.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* SUMMARY */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Card>
                    <CardContent className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Total History Records
                            </p>

                            <p className="mt-1 text-2xl font-bold">
                                {loading ? "—" : total}
                            </p>
                        </div>

                        <History className="h-6 w-6 text-blue-600" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center justify-between p-4">
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                Current Page
                            </p>

                            <p className="mt-1 text-2xl font-bold">
                                {loading ? "—" : `${page} / ${totalPages}`}
                            </p>
                        </div>

                        <Badge variant="secondary">
                            Page
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            {/* HISTORY TABLE */}
            <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-base">
                            Employee Career History
                        </CardTitle>

                        <p className="text-sm text-muted-foreground">
                            Previous and updated employee details.
                        </p>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                            <Input
                                placeholder="Search employee..."
                                value={search}
                                onChange={(event) =>
                                    handleSearch(event.target.value)
                                }
                                className="pl-9"
                            />
                        </div>

                        <select
                            value={changeType}
                            onChange={(event) =>
                                handleChangeType(event.target.value)
                            }
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="">All Types</option>

                            {changeTypes.map((type) => (
                                <option key={type} value={type}>
                                    {formatLabel(type)}
                                </option>
                            ))}
                        </select>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Change Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Previous Details</TableHead>
                                    <TableHead>Updated Details</TableHead>
                                    <TableHead>Effective Date</TableHead>
                                    <TableHead>Updated By</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {isSuperAdmin && !companyId ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            Please select a company.
                                        </TableCell>
                                    </TableRow>
                                ) : loading ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            Loading upgrade history...
                                        </TableCell>
                                    </TableRow>
                                ) : history.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            No upgrade history found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    history.map((item) => {
                                        const designation = getChangeSummary(
                                            item,
                                            "designation",
                                        );

                                        const salary = getChangeSummary(
                                            item,
                                            "grossSalary",
                                        );

                                        const category = getChangeSummary(
                                            item,
                                            "categoryId",
                                        );

                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {item.employee?.name ?? "—"}
                                                    </div>

                                                    <div className="text-xs text-muted-foreground">
                                                        {item.employee?.employeeCode ?? "—"}
                                                    </div>
                                                </TableCell>



                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={getChangeTypeClass(item.changeType)}
                                                    >
                                                        {formatLabel(item.changeType)}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    {item.upgrade?.status ? (
                                                        <Badge
                                                            variant="outline"
                                                            className={getHistoryStatusClass(item.upgrade.status)}
                                                        >
                                                            {formatLabel(item.upgrade.status)}
                                                        </Badge>
                                                    ) : (
                                                        "—"
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-1 text-xs">
                                                        {designation && (
                                                            <p>
                                                                <span className="text-muted-foreground">
                                                                    Designation:{" "}
                                                                </span>
                                                                {designation.previous}
                                                            </p>
                                                        )}

                                                        {salary && (
                                                            <p>
                                                                <span className="text-muted-foreground">
                                                                    Salary:{" "}
                                                                </span>
                                                                {salary.previous}
                                                            </p>
                                                        )}

                                                        {category && (
                                                            <p className="max-w-40 truncate">
                                                                <span className="text-muted-foreground">
                                                                    Category:{" "}
                                                                </span>
                                                                {category.previous}
                                                            </p>
                                                        )}

                                                        {!designation && !salary && !category && "—"}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="space-y-1 text-xs">
                                                        {designation && (
                                                            <p>
                                                                <span className="text-muted-foreground">
                                                                    Designation:{" "}
                                                                </span>
                                                                <span className="font-medium">
                                                                    {designation.next}
                                                                </span>
                                                            </p>
                                                        )}

                                                        {salary && (
                                                            <p>
                                                                <span className="text-muted-foreground">
                                                                    Salary:{" "}
                                                                </span>
                                                                <span className="font-medium">
                                                                    {salary.next}
                                                                </span>
                                                            </p>
                                                        )}

                                                        {category && (
                                                            <p className="max-w-40 truncate">
                                                                <span className="text-muted-foreground">
                                                                    Category:{" "}
                                                                </span>
                                                                <span className="font-medium">
                                                                    {category.next}
                                                                </span>
                                                            </p>
                                                        )}

                                                        {!designation && !salary && !category && "—"}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    {formatDate(item.effectiveDate)}
                                                </TableCell>

                                                <TableCell>
                                                    {item.createdBy?.name ?? "—"}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* PAGINATION */}
                    <div className="mt-4 flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground">
                            Showing {history.length} of {total} records
                        </p>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={loading || page <= 1}
                                onClick={() => setPage((current) => current - 1)}
                            >
                                Previous
                            </Button>

                            <span className="text-xs text-muted-foreground">
                                {page} / {totalPages}
                            </span>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={loading || page >= totalPages}
                                onClick={() => setPage((current) => current + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default UpgradeHistory;
