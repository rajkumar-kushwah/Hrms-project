
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
    ClipboardList,
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    RefreshCw,
    Plus,
    History,
    Pencil,
    MoreVertical,
} from "lucide-react";

import { getUpgradeRequests } from "@/services/employeeUpgrade.service";
import { getCompanies } from "@/services/company.service";

import type {
    EmployeeUpgrade,
    EmployeeUpgradeStatus,
} from "@/types/employeeUpgrade.types";

import type { Company } from "@/types/company.types";

import { useAuthStore } from "@/store/auth.store";

import {
    canViewModule,
    canCreateInModule,
    canEditInModule,
} from "@/utilis/roleUtils";

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

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ======================================================
// CONSTANTS
// ======================================================

const MODULE_NAME = "upgrade_dashboard";

// ======================================================
// STATUS STYLES
// ======================================================

const getStatusClass = (status: EmployeeUpgradeStatus) => {
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

// ======================================================
// HELPERS
// ======================================================

const formatLabel = (value: string) =>
    value
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

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

// ======================================================
// PAGE
// ======================================================

const UpgradeDashboard = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    // --------------------------------------------------
    // PERMISSIONS
    // --------------------------------------------------

    const canViewUpgrade = canViewModule(user, MODULE_NAME);
    const canCreateUpgrade = canCreateInModule(user, MODULE_NAME);
    const canEditUpgrade = canEditInModule(user, MODULE_NAME);

    // Company-less account requires a company selection.
    // Backend must separately validate company access.
    const needsCompanySelection = !user?.companyId;

    // --------------------------------------------------
    // STATE
    // --------------------------------------------------

    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");

    const [requests, setRequests] = useState<EmployeeUpgrade[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // --------------------------------------------------
    // COMPANY ID
    // --------------------------------------------------

    const companyId = String(
        needsCompanySelection
            ? selectedCompanyId
            : user?.companyId ?? ""
    );

    // --------------------------------------------------
    // LOAD COMPANIES
    // --------------------------------------------------

    useEffect(() => {
        if (!needsCompanySelection || !canViewUpgrade) return;

        let active = true;

        const fetchCompanies = async () => {
            try {
                const response = await getCompanies();

                if (!active) return;

                setCompanies(response.data.data ?? []);
            } catch (error: any) {
                if (active) {
                    toast.error(
                        error?.response?.data?.message ??
                        "Failed to load companies"
                    );
                }
            }
        };

        void fetchCompanies();

        return () => {
            active = false;
        };
    }, [needsCompanySelection, canViewUpgrade]);

    // --------------------------------------------------
    // LOAD UPGRADE REQUESTS
    // --------------------------------------------------

    const fetchRequests = useCallback(async () => {
        if (!canViewUpgrade || !companyId) {
            setRequests([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const response = await getUpgradeRequests(companyId);

            setRequests(response.data.data ?? []);
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

            toast.error(message || "Failed to load upgrade requests");
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, [companyId, canViewUpgrade]);

    useEffect(() => {
        void fetchRequests();
    }, [fetchRequests]);

    // --------------------------------------------------
    // DASHBOARD STATISTICS
    // --------------------------------------------------

    const stats = useMemo(() => ({
        total: requests.length,

        draft: requests.filter(
            (item) => item.status === "DRAFT"
        ).length,

        pending: requests.filter(
            (item) => item.status === "PENDING"
        ).length,

        approved: requests.filter(
            (item) =>
                item.status === "APPROVED" ||
                item.status === "APPLIED"
        ).length,

        rejected: requests.filter(
            (item) => item.status === "REJECTED"
        ).length,
    }), [requests]);

    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------

    const filteredRequests = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) return requests;

        return requests.filter((item) =>
            [
                item.employee?.name,
                item.employee?.employeeCode,
                item.upgradeType,
                item.status,
                item.requestedBy?.name,
            ]
                .filter(Boolean)
                .some((field) =>
                    String(field).toLowerCase().includes(value)
                )
        );
    }, [requests, search]);

    // --------------------------------------------------
    // STATISTIC CARDS
    // --------------------------------------------------

    const statCards = [
        {
            title: "Total Requests",
            value: stats.total,
            icon: ClipboardList,
            color: "text-blue-600",
        },
        {
            title: "Draft Requests",
            value: stats.draft,
            icon: Clock,
            color: "text-orange-600",
        },
        {
            title: "Pending Requests",
            value: stats.pending,
            icon: Clock,
            color: "text-yellow-600",
        },
        {
            title: "Approved Requests",
            value: stats.approved,
            icon: CheckCircle2,
            color: "text-green-600",
        },
        {
            title: "Rejected Requests",
            value: stats.rejected,
            icon: XCircle,
            color: "text-red-600",
        },
    ];

    // --------------------------------------------------
    // EDIT & RESUBMIT
    // --------------------------------------------------

    const handleEditRequest = (item: EmployeeUpgrade) => {
        if (!canEditUpgrade) {
            toast.error(
                "You do not have permission to edit upgrade requests"
            );
            return;
        }

        const requestedById = String(item.requestedBy?.id ?? "");
        const currentUserId = String(user?.id ?? "");

        if (item.status !== "SENT_BACK") {
            toast.error("Only sent-back requests can be edited");
            return;
        }

        if (!requestedById || requestedById !== currentUserId) {
            toast.error("You are not allowed to edit this request");
            return;
        }

        const query = needsCompanySelection
            ? `?companyId=${encodeURIComponent(companyId)}`
            : "";

        navigate(`/employee-upgrade/${item.id}/edit${query}`);
    };

    // ==================================================
    // PAGE PERMISSION
    // ==================================================

    if (!canViewUpgrade) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="py-10 text-center">
                        <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                        <p className="font-medium">
                            Access Denied
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            You do not have permission to view Employee Upgrade.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ==================================================
    // JSX
    // ==================================================

    return (
        <div className="w-full min-w-0 space-y-5 p-4 md:p-6">

            {/* HEADER */}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Employee Upgrade
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Monitor employee promotion, increment and transfer requests.
                    </p>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                    <Button
                        className="cursor-pointer"
                        variant="add"
                        size="sm"
                        onClick={() => void fetchRequests()}
                        disabled={loading || !companyId}
                    >
                        <RefreshCw
                            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""
                                }`}
                        />
                        Refresh
                    </Button>

                    {canCreateUpgrade && (
                        <Button
                            className="cursor-pointer"
                            variant="add"
                            size="sm"
                            asChild
                        >
                            <Link to="/employee-upgrade/initiate">
                                <Plus className="mr-2 h-4 w-4" />
                                Initiate Upgrade
                            </Link>
                        </Button>
                    )}

                    <Button
                        className="cursor-pointer"
                        variant="add"
                        size="sm"
                        asChild
                    >
                        <Link to="/employee-upgrade/history">
                            <History className="mr-2 h-4 w-4" />
                            View History
                        </Link>
                    </Button>
                </div>
            </div>

            {/* COMPANY SELECTOR */}

            {needsCompanySelection && (
                <div className="flex flex-col gap-2 sm:max-w-sm">
                    <label className="text-sm font-medium">
                        Select Company
                    </label>

                    <select
                        value={selectedCompanyId}
                        onChange={(event) =>
                            setSelectedCompanyId(event.target.value)
                        }
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                        <option value="">
                            Select Company
                        </option>

                        {companies.map((company) => (
                            <option
                                key={company.id}
                                value={company.id}
                            >
                                {company.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* STATISTICS */}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {statCards.map((item) => {
                    const Icon = item.icon;

                    return (
                        <Card key={item.title}>
                            <CardContent className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">
                                        {item.title}
                                    </p>

                                    <p className="mt-1 text-2xl font-bold">
                                        {loading ? "—" : item.value}
                                    </p>
                                </div>

                                <Icon className={`h-6 w-6 ${item.color}`} />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* REQUESTS TABLE */}

            <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="text-base">
                            Recent Upgrade Requests
                        </CardTitle>

                        <p className="text-sm text-muted-foreground">
                            View and track employee upgrade requests.
                        </p>
                    </div>

                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

                        <Input
                            placeholder="Search employee or type..."
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            className="pl-9"
                        />
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="w-full overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Upgrade Type</TableHead>
                                    <TableHead>Effective Date</TableHead>
                                    <TableHead>Requested By</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created At</TableHead>

                                    {canEditUpgrade && (
                                        <TableHead className="text-right">
                                            Action
                                        </TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {needsCompanySelection && !companyId ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            Please select a company.
                                        </TableCell>
                                    </TableRow>
                                ) : loading ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            Loading upgrade requests...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRequests.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            No upgrade requests found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRequests.map((item) => {
                                        const canEdit =
                                            canEditUpgrade &&
                                            item.status === "SENT_BACK" &&
                                            Boolean(item.requestedBy?.id) &&
                                            String(item.requestedBy?.id) ===
                                            String(user?.id ?? "");

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
                                                    {formatLabel(item.upgradeType)}
                                                </TableCell>

                                                <TableCell>
                                                    {formatDate(item.effectiveDate)}
                                                </TableCell>

                                                <TableCell>
                                                    {item.requestedBy?.name ?? "—"}
                                                </TableCell>

                                                <TableCell>
                                                    <Badge variant="outline"
                                                        className={getStatusClass(item.status)}
                                                    >
                                                        {formatLabel(item.status)}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    {formatDate(item.createdAt)}
                                                </TableCell>

                                                {canEditUpgrade && (
                                                    <TableCell className="sticky right-0 bg-card text-right">
                                                        {canEdit && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                    >
                                                                        <MoreVertical className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>

                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuGroup>
                                                                        <DropdownMenuItem
                                                                            onClick={() =>
                                                                                handleEditRequest(item)
                                                                            }
                                                                        >
                                                                            <Pencil className="mr-2 h-4 w-4" />
                                                                            Edit & Resubmit
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuGroup>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">
                        Showing {filteredRequests.length} of {requests.length} loaded requests
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default UpgradeDashboard;
