
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ClipboardCheck,
    RefreshCw,
    Search,
    Eye,
    Clock,
    User,
    CalendarDays,
    AlertCircle,
    CheckCircle2,
    History,
} from "lucide-react";
import { toast } from "sonner";

import {
    getUpgradeRequests,
    actOnUpgradeRequest,
} from "@/services/employeeUpgrade.service";
import { getCompanies } from "@/services/company.service";
import { useAuthStore } from "@/store/auth.store";

import {
    isSuperAdminRole,
    canViewModule,
    canEditInModule,
} from "@/utilis/roleUtils";

import type { EmployeeUpgradeStatus } from "@/types/employeeUpgrade.types";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// --------------------------------------------------
// Types
// --------------------------------------------------

interface UpgradeApproval {
    id: string;
    sequence: number;
    status: string;
    comments?: string | null;
    approvedAt?: string | null;
    createdAt?: string;
    approverId?: string;
    approver?: {
        id: string;
        name: string;
    } | null;
}

interface UpgradeRequest {
    id: string;
    employeeId: string;
    upgradeType: string;
    status: EmployeeUpgradeStatus;

    currentData?: Record<string, unknown>;
    proposedData?: Record<string, unknown>;
    changedFields?: string[];

    effectiveDate: string;
    reason: string;
    remarks?: string | null;
    createdAt: string;

    employee?: {
        id: string;
        name: string;
        employeeCode?: string | null;
        designation?: string | null;
    };

    requestedBy?: {
        id: string;
        name: string;
    };

    approvals?: UpgradeApproval[];
    myApprovals?: UpgradeApproval[];
}

interface CompanyOption {
    id: string;
    name: string;
}

type ActionType = "APPROVE" | "REJECT" | "SEND_BACK";
type ApprovalView = "PENDING" | "COMPLETED";

const MODULE_NAME = "upgrade_approvals";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const getArray = (response: any): any[] => {
    const body = response?.data;

    if (Array.isArray(body)) return body;
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.companies)) return body.companies;

    return [];
};

const getRequestArray = (response: any): UpgradeRequest[] => {
    const body = response?.data;

    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.data?.data)) return body.data.data;
    if (Array.isArray(body)) return body;

    return [];
};

const formatLabel = (value: string) =>
    value
        .replace(/([A-Z])/g, " $1")
        .replace(/Id$/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

const formatValue = (value: unknown): string => {
    if (value === null || value === undefined || value === "") {
        return "Not specified";
    }

    if (typeof value === "number") {
        return value.toLocaleString("en-IN");
    }

    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
};

const formatDate = (date?: string | null) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatDateTime = (date?: string | null) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const getUpgradeTypeLabel = (type: string) =>
    type.replace(/_/g, " ");

const getApprovalDecision = (status: string) => {
    switch (status) {
        case "APPROVED":
            return {
                label: "Approved",
                variant: "default" as const,
                className: "bg-green-600 hover:bg-green-700",
            };

        case "REJECTED":
            return {
                label: "Rejected",
                variant: "destructive" as const,
                className: "",
            };

        case "SENT_BACK":
            return {
                label: "Sent Back",
                variant: "secondary" as const,
                className: "",
            };

        case "PENDING":
            return {
                label: "Pending",
                variant: "outline" as const,
                className: "",
            };

        case "SKIPPED":
            return {
                label: "Skipped",
                variant: "outline" as const,
                className: "",
            };

        default:
            return {
                label: status,
                variant: "outline" as const,
                className: "",
            };
    }
};

// --------------------------------------------------
// Component
// --------------------------------------------------

const ApprovalRequests = () => {
    const { user } = useAuthStore();

    const isSuperAdmin = isSuperAdminRole(user);

    const canViewApproval = canViewModule(
        user,
        MODULE_NAME
    );

    const canEditApproval = canEditInModule(
        user,
        MODULE_NAME
    );

    // --------------------------------------------------
    // States
    // --------------------------------------------------

    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");

    const [requests, setRequests] = useState<UpgradeRequest[]>([]);

    const [selectedRequest, setSelectedRequest] =
        useState<UpgradeRequest | null>(null);

    const [activeView, setActiveView] =
        useState<ApprovalView>("PENDING");

    const [search, setSearch] = useState("");
    const [comments, setComments] = useState("");

    const [loading, setLoading] = useState(false);

    const [actionLoading, setActionLoading] =
        useState<ActionType | null>(null);

    const companyId = String(
        isSuperAdmin
            ? selectedCompanyId
            : user?.companyId ?? ""
    );

    // --------------------------------------------------
    // Load Companies
    // --------------------------------------------------

    useEffect(() => {
        if (!isSuperAdmin || !canViewApproval) return;

        let active = true;

        const loadCompanies = async () => {
            try {
                const response = await getCompanies();

                if (!active) return;

                const list = getArray(response);

                setCompanies(
                    list.map((company: any) => ({
                        id: String(company.id),
                        name:
                            company.name ??
                            company.companyName ??
                            "Company",
                    }))
                );
            } catch (error: any) {
                if (!active) return;

                toast.error(
                    error?.response?.data?.message ??
                    "Unable to load companies"
                );
            }
        };

        void loadCompanies();

        return () => {
            active = false;
        };
    }, [isSuperAdmin, canViewApproval]);

    // --------------------------------------------------
    // Fetch Approval Requests
    // --------------------------------------------------

    const fetchRequests = useCallback(async () => {
        if (!canViewApproval || !companyId) {
            setRequests([]);
            setSelectedRequest(null);
            return;
        }

        try {
            setLoading(true);

            const response = await getUpgradeRequests(
                companyId,
                undefined,
                activeView
            );

            const list = getRequestArray(response);

            setRequests(list);

            setSelectedRequest((previous) => {
                if (!previous) return null;

                return (
                    list.find(
                        (request) => request.id === previous.id
                    ) ?? null
                );
            });
        } catch (error: any) {
            setRequests([]);
            setSelectedRequest(null);

            toast.error(
                error?.response?.data?.message ??
                "Unable to load approval requests"
            );
        } finally {
            setLoading(false);
        }
    }, [companyId, canViewApproval, activeView]);

    useEffect(() => {
        void fetchRequests();
    }, [fetchRequests]);

    // --------------------------------------------------
    // Filter Requests
    // --------------------------------------------------

    const filteredRequests = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) return requests;

        return requests.filter((request) => {
            return (
                request.employee?.name?.toLowerCase().includes(value) ||
                request.employee?.employeeCode?.toLowerCase().includes(value) ||
                request.upgradeType.toLowerCase().includes(value) ||
                request.requestedBy?.name?.toLowerCase().includes(value) ||
                request.status.toLowerCase().includes(value)
            );
        });
    }, [requests, search]);

    // --------------------------------------------------
    // Current User Approval Records
    // --------------------------------------------------

    const getMyApprovals = (request: UpgradeRequest) => {
        return [...(request.myApprovals ?? [])].sort(
            (a, b) => b.sequence - a.sequence
        );
    };

    const getMyLatestApproval = (request: UpgradeRequest) => {
        return getMyApprovals(request)[0];
    };

    // --------------------------------------------------
    // Status Badges
    // --------------------------------------------------

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="secondary">Pending</Badge>;

            case "APPROVED":
                return (
                    <Badge className="bg-green-600 hover:bg-green-700">
                        Approved
                    </Badge>
                );

            case "REJECTED":
                return <Badge variant="destructive">Rejected</Badge>;

            case "SENT_BACK":
                return <Badge variant="outline">Sent Back</Badge>;

            case "APPLIED":
                return (
                    <Badge className="bg-blue-600 hover:bg-blue-700">
                        Applied
                    </Badge>
                );

            case "DRAFT":
                return <Badge variant="outline">Draft</Badge>;

            case "CANCELLED":
                return <Badge variant="outline">Cancelled</Badge>;

            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getDecisionBadge = (status: string) => {
        const decision = getApprovalDecision(status);

        return (
            <Badge
                variant={decision.variant}
                className={decision.className}
            >
                {decision.label}
            </Badge>
        );
    };

    // --------------------------------------------------
    // Comparison Table
    // --------------------------------------------------

    const renderComparison = (
        currentData: Record<string, unknown> = {},
        proposedData: Record<string, unknown> = {}
    ) => {
        const fields = Object.keys(proposedData);

        return (
            <div className="overflow-x-auto rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Field</TableHead>
                            <TableHead>Current Details</TableHead>
                            <TableHead>Proposed Details</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {fields.map((field) => (
                            <TableRow key={field}>
                                <TableCell className="font-medium">
                                    {formatLabel(field)}
                                </TableCell>

                                <TableCell className="text-muted-foreground">
                                    {formatValue(currentData[field])}
                                </TableCell>

                                <TableCell className="font-medium text-primary">
                                    {formatValue(proposedData[field])}
                                </TableCell>
                            </TableRow>
                        ))}

                        {!fields.length && (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
                                    className="h-20 text-center text-muted-foreground"
                                >
                                    No comparison details available
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        );
    };

    // --------------------------------------------------
    // Approval History
    // --------------------------------------------------

    const renderApprovalHistory = (request: UpgradeRequest) => {
        const approvals = getMyApprovals(request);

        if (!approvals.length) return null;

        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">
                        My Approval History
                    </h3>
                </div>

                <div className="space-y-2">
                    {approvals.map((approval) => (
                        <div
                            key={approval.id}
                            className="rounded-lg border p-3"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-medium">
                                        Approval Level {approval.sequence}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                        {approval.approver?.name ?? "Approver"}
                                    </p>
                                </div>

                                {getDecisionBadge(approval.status)}
                            </div>

                            {approval.comments && (
                                <p className="mt-2 rounded-md bg-muted p-2 text-sm">
                                    {approval.comments}
                                </p>
                            )}

                            <p className="mt-2 text-xs text-muted-foreground">
                                {formatDateTime(
                                    approval.approvedAt ?? approval.createdAt
                                )}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // --------------------------------------------------
    // Approval Actions
    // --------------------------------------------------

    const handleApprovalAction = async (action: ActionType) => {
        if (!canEditApproval) {
            toast.error(
                "You do not have permission to manage approval requests"
            );
            return;
        }

        if (activeView !== "PENDING") {
            return;
        }

        if (!selectedRequest || !companyId) {
            toast.error("Please select an upgrade request");
            return;
        }

        if (
            (action === "REJECT" || action === "SEND_BACK") &&
            !comments.trim()
        ) {
            toast.error("Comments are required for this action");
            return;
        }

        try {
            setActionLoading(action);

            await actOnUpgradeRequest(
                selectedRequest.id,
                {
                    action,
                    comments: comments.trim() || undefined,
                },
                companyId
            );

            if (action === "APPROVE") {
                toast.success("Upgrade request approved successfully");
            } else if (action === "REJECT") {
                toast.success("Upgrade request rejected successfully");
            } else {
                toast.success("Upgrade request sent back successfully");
            }

            setComments("");
            setSelectedRequest(null);

            await fetchRequests();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ??
                `Unable to ${action.toLowerCase().replace("_", " ")} request`
            );
        } finally {
            setActionLoading(null);
        }
    };

    const isProcessing = actionLoading !== null;

    // --------------------------------------------------
    // Permission Guard
    // --------------------------------------------------

    if (!canViewApproval) {
        return (
            <div className="p-4 md:p-6">
                <Card>
                    <CardContent className="py-10 text-center">
                        <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                        <p className="font-medium">Access Denied</p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            You do not have permission to view Approval Requests.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // --------------------------------------------------
    // Render
    // --------------------------------------------------

    return (
        <div className="space-y-5 p-4 md:p-6">

            {/* Header */}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-6 w-6" />

                    <div>
                        <p className="font-semibold">
                            Approval Requests
                        </p>

                        <p className="text-sm text-muted-foreground">
                            Review and track employee upgrade approvals
                        </p>
                    </div>
                </div>

                <Button
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
            </div>

            {/* Company Selector */}

            {isSuperAdmin && (
                <div className="max-w-sm">
                    <Select
                        value={selectedCompanyId}
                        onValueChange={(value) => {
                            setSelectedCompanyId(value);
                            setSelectedRequest(null);
                            setSearch("");
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select company" />
                        </SelectTrigger>

                        <SelectContent>
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
                </div>
            )}

            {/* Statistics */}

            <div className="grid gap-3 sm:grid-cols-2">
                <Card>
                    <CardContent className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {activeView === "PENDING"
                                    ? "My Pending Approvals"
                                    : "My Completed Approvals"}
                            </p>

                            <p className="mt-1 text-2xl font-semibold">
                                {requests.length}
                            </p>
                        </div>

                        <div className="rounded-lg bg-orange-100 p-3 text-orange-600 dark:bg-orange-950">
                            {activeView === "PENDING" ? (
                                <Clock className="h-4 w-4" />
                            ) : (
                                <CheckCircle2 className="h-4 w-4" />
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {activeView === "PENDING"
                                    ? "Pending Requests"
                                    : "Decision Records"}
                            </p>

                            <p className="mt-1 text-2xl font-semibold">
                                {filteredRequests.length}
                            </p>
                        </div>

                        <div className="rounded-lg bg-blue-100 p-3 text-blue-600 dark:bg-blue-950">
                            <ClipboardCheck className="h-4 w-4" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Requests Table */}

            <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button className="cursor-pointer"
                            size="sm"
                            variant={
                                activeView === "PENDING"
                                    ? "add"
                                    : "outline"
                            }
                            onClick={() => {
                                setActiveView("PENDING");
                                setSelectedRequest(null);
                                setComments("");
                            }}
                        >
                            <Clock className="mr-2 h-4 w-4" />
                            Pending
                        </Button>

                        <Button className="cursor-pointer"
                            size="sm"
                            variant={
                                activeView === "COMPLETED"
                                    ? "add"
                                    : "outline"
                            }
                            onClick={() => {
                                setActiveView("COMPLETED");
                                setSelectedRequest(null);
                                setComments("");
                            }}
                        >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Completed
                        </Button>
                    </div>

                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

                        <Input
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search employee..."
                            className="pl-9"
                        />
                    </div>
                </CardHeader>

                <CardContent>
                    {!companyId && isSuperAdmin ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                            Please select a company to view approval requests.
                        </div>
                    ) : loading ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                            Loading approval requests...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Upgrade Type</TableHead>
                                        <TableHead>Requested By</TableHead>
                                        <TableHead>Effective Date</TableHead>
                                        <TableHead>Status</TableHead>

                                        {activeView === "COMPLETED" && (
                                            <>
                                                <TableHead>My Decision</TableHead>
                                                <TableHead>Comments</TableHead>
                                            </>
                                        )}

                                        {activeView === "PENDING" && canEditApproval && (
                                            <TableHead className="text-right">
                                                Action
                                            </TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {filteredRequests.map((request) => {
                                        const latestApproval =
                                            getMyLatestApproval(request);

                                        return (
                                            <TableRow key={request.id}>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {request.employee?.name ?? "Employee"}
                                                    </div>

                                                    <div className="text-xs text-muted-foreground">
                                                        {request.employee?.employeeCode ?? "—"}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {getUpgradeTypeLabel(
                                                            request.upgradeType
                                                        )}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    {request.requestedBy?.name ?? "—"}
                                                </TableCell>

                                                <TableCell>
                                                    {formatDate(request.effectiveDate)}
                                                </TableCell>

                                                <TableCell>
                                                    {getStatusBadge(request.status)}
                                                </TableCell>

                                                {activeView === "COMPLETED" && (
                                                    <>
                                                        <TableCell>
                                                            {latestApproval
                                                                ? getDecisionBadge(
                                                                    latestApproval.status
                                                                )
                                                                : (
                                                                    <Badge variant="outline">
                                                                        No Decision
                                                                    </Badge>
                                                                )}
                                                        </TableCell>

                                                        <TableCell className="max-w-[220px]">
                                                            <span
                                                                className="block truncate text-sm text-muted-foreground"
                                                                title={
                                                                    latestApproval?.comments ??
                                                                    ""
                                                                }
                                                            >
                                                                {latestApproval?.comments || "—"}
                                                            </span>
                                                        </TableCell>
                                                    </>
                                                )}

                                                {activeView === "PENDING" && canEditApproval && (
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedRequest(request);
                                                                setComments("");
                                                            }}
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Review
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}

                                    {!filteredRequests.length && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={
                                                    5 +
                                                    (activeView === "COMPLETED" ? 2 : 0) +
                                                    (
                                                        activeView === "PENDING" &&
                                                            canEditApproval
                                                            ? 1
                                                            : 0
                                                    )
                                                }
                                                className="h-28 text-center"
                                            >
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <ClipboardCheck className="h-8 w-8 opacity-40" />

                                                    <p className="text-sm">
                                                        {activeView === "PENDING"
                                                            ? "No pending approval requests found"
                                                            : "No completed approval records found"}
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Selected Request Details */}

            {selectedRequest && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-2">
                        <div>
                            <CardTitle className="text-lg">
                                Upgrade Request Details
                            </CardTitle>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Request ID: {selectedRequest.id}
                            </p>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSelectedRequest(null);
                                setComments("");
                            }}
                        >
                            Close
                        </Button>
                    </CardHeader>

                    <CardContent className="space-y-5">

                        {/* Employee Information */}

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    Employee
                                </p>

                                <p className="flex items-center gap-2 font-medium">
                                    <User className="h-4 w-4" />
                                    {selectedRequest.employee?.name ?? "—"}
                                </p>

                                <p className="text-xs text-muted-foreground">
                                    {selectedRequest.employee?.employeeCode ?? "—"}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    Upgrade Type
                                </p>

                                <p className="font-medium">
                                    {getUpgradeTypeLabel(
                                        selectedRequest.upgradeType
                                    )}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    Effective Date
                                </p>

                                <p className="flex items-center gap-2 font-medium">
                                    <CalendarDays className="h-4 w-4" />
                                    {formatDate(selectedRequest.effectiveDate)}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">
                                    Requested By
                                </p>

                                <p className="font-medium">
                                    {selectedRequest.requestedBy?.name ?? "—"}
                                </p>
                            </div>
                        </div>

                        {/* Request Status */}

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                Request Status:
                            </span>

                            {getStatusBadge(selectedRequest.status)}
                        </div>

                        {/* Reason */}

                        <div className="space-y-2">
                            <h3 className="font-semibold">Reason</h3>

                            <p className="rounded-lg bg-muted p-3 text-sm">
                                {selectedRequest.reason || "No reason provided"}
                            </p>
                        </div>

                        {/* Remarks */}

                        {selectedRequest.remarks && (
                            <div className="space-y-2">
                                <h3 className="font-semibold">Remarks</h3>

                                <p className="rounded-lg bg-muted p-3 text-sm">
                                    {selectedRequest.remarks}
                                </p>
                            </div>
                        )}

                        {/* Comparison */}

                        <div className="space-y-3">
                            <div>
                                <h3 className="font-semibold">
                                    Current vs Proposed Details
                                </h3>

                                <p className="text-xs text-muted-foreground">
                                    Review the employee details and proposed changes.
                                </p>
                            </div>

                            {renderComparison(
                                selectedRequest.currentData,
                                selectedRequest.proposedData
                            )}
                        </div>

                        {/* Completed Approval History */}

                        {activeView === "COMPLETED" &&
                            renderApprovalHistory(selectedRequest)}

                        {/* Pending Approval Actions */}

                        {activeView === "PENDING" && canEditApproval && (
                            <div className="space-y-4 rounded-lg border p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="mt-0.5 h-5 w-5 text-muted-foreground" />

                                    <div>
                                        <p className="text-sm font-medium">
                                            Approval Decision
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Approve, reject or send this request back
                                            with comments.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Comments

                                        <span className="ml-1 text-muted-foreground">
                                            (Required for Reject / Send Back)
                                        </span>
                                    </label>

                                    <Textarea
                                        value={comments}
                                        onChange={(event) =>
                                            setComments(event.target.value)
                                        }
                                        placeholder="Enter your comments..."
                                        rows={3}
                                        disabled={isProcessing}
                                    />
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            void handleApprovalAction("APPROVE")
                                        }
                                        disabled={isProcessing}
                                    >
                                        {actionLoading === "APPROVE"
                                            ? "Approving..."
                                            : "Approve"}
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                            void handleApprovalAction("REJECT")
                                        }
                                        disabled={isProcessing}
                                    >
                                        {actionLoading === "REJECT"
                                            ? "Rejecting..."
                                            : "Reject"}
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            void handleApprovalAction("SEND_BACK")
                                        }
                                        disabled={isProcessing}
                                    >
                                        {actionLoading === "SEND_BACK"
                                            ? "Sending..."
                                            : "Send Back"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default ApprovalRequests;
