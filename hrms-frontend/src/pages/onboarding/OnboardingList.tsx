
// src/pages/onboarding/OnboardingList.tsx
import React from "react";
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    getOnboardingList,
    startOnboarding,
    resetOnboarding,
} from "@/services/onboarding.service";
import { useNavigate } from "react-router-dom";
import type {
    OnboardingEmployee,
    OnboardingStatus,
} from "@/types/onboardingList.types";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthStore } from "@/store/auth.store";
import {
    getUserName,
    isSuperAdminRole,
    canViewModule,
    canCreateInModule,
    // canEditInModule,
    canDeleteInModule,
} from "@/utilis/roleUtils";
import { CompanySelector } from "../common/CompanySelector";
import UserAvatar from "../common/UserAvatar";

const MODULE_NAME = "onboarding";

const OnboardingList = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Role check only for company selection
    const isSuperAdmin = isSuperAdminRole(user);

    // Module permissions
    const canViewOnboarding = canViewModule(user, MODULE_NAME);
    const canCreateOnboarding = canCreateInModule(user, MODULE_NAME);
    // const canEditOnboarding = canEditInModule(user, MODULE_NAME);
    const canDeleteOnboarding = canDeleteInModule(user, MODULE_NAME);

    const [selectedCompanyId, setSelectedCompanyId] =
        React.useState("");

    const [onboardings, setOnboardings] = React.useState<
        OnboardingEmployee[]
    >([]);

    const [searchQuery, setSearchQuery] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("all");
    const [loading, setLoading] = React.useState(false);

    const [resetDialogOpen, setResetDialogOpen] =
        React.useState(false);

    const [selectedOnboarding, setSelectedOnboarding] =
        React.useState<OnboardingEmployee | null>(null);

    // Load onboarding records
    const loadOnboardings = React.useCallback(async () => {
        if (!canViewOnboarding) return;

        if (isSuperAdmin && !selectedCompanyId) {
            setOnboardings([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const res = await getOnboardingList(
                isSuperAdmin ? selectedCompanyId : undefined,
                statusFilter === "all" ? undefined : statusFilter
            );

            setOnboardings(res.data ?? []);
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Failed to load onboarding records";

            toast.error(message);
            setOnboardings([]);
        } finally {
            setLoading(false);
        }
    }, [
        canViewOnboarding,
        isSuperAdmin,
        selectedCompanyId,
        statusFilter,
    ]);

    React.useEffect(() => {
        void loadOnboardings();
    }, [loadOnboardings]);

    const handleStatusFilter = (value: string) => {
        setStatusFilter(value);
    };

    // Start / Restart onboarding
    const handleStartOnboarding = async (userId: string) => {
        if (!canCreateOnboarding) {
            toast.error("You don't have permission to start onboarding");
            return;
        }

        try {
            await startOnboarding(
                userId,
                isSuperAdmin ? selectedCompanyId : undefined
            );

            toast.success("Onboarding started successfully");

            await loadOnboardings();
        } catch (err: any) {
            toast.error(
                err?.message || "Failed to start onboarding"
            );
        }
    };

    // Reset onboarding
    const handleResetOnboarding = async () => {
        if (!canDeleteOnboarding) {
            toast.error("You don't have permission to reset onboarding");
            return;
        }

        if (!selectedOnboarding) return;

        try {
            await resetOnboarding(
                selectedOnboarding.userId,
                isSuperAdmin ? selectedCompanyId : undefined
            );

            toast.success("Onboarding reset successfully");

            setResetDialogOpen(false);
            setSelectedOnboarding(null);

            await loadOnboardings();
        } catch (err: any) {
            toast.error(
                err?.message || "Failed to reset onboarding"
            );
        }
    };

    const filteredOnboardings = onboardings.filter((item) => {
        const search = searchQuery.toLowerCase();

        return (
            getUserName(item.user).toLowerCase().includes(search) ||
            (item.user.employeeCode ?? "")
                .toLowerCase()
                .includes(search) ||
            (item.user.designation ?? "")
                .toLowerCase()
                .includes(search)
        );
    });

    const getStatusBadge = (status: OnboardingStatus) => {
        if (status === "COMPLETED") {
            return (
                <Badge className="bg-green-100 text-green-700">
                    Completed
                </Badge>
            );
        }

        if (status === "ON_HOLD") {
            return (
                <Badge className="bg-yellow-100 text-yellow-700">
                    On Hold
                </Badge>
            );
        }

        return (
            <Badge className="bg-blue-100 text-blue-700">
                In Progress
            </Badge>
        );
    };

    const getStageBadge = (stage: string) => {
        return (
            <Badge variant="outline">
                {stage.replace("_", " ")}
            </Badge>
        );
    };

    const formatDate = (date?: string | null) => {
        if (!date) return "—";

        return new Date(date).toLocaleDateString("en-IN");
    };

    // Hide page if user cannot view onboarding
    if (!canViewOnboarding) return null;

    const hasActions =
        canCreateOnboarding || canViewOnboarding || canDeleteOnboarding;

    return (
        <div className="flex flex-col gap-4">

            {/* Filters */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 flex-wrap">

                    {isSuperAdmin && (
                        <div className="w-full max-w-60">
                            <CompanySelector
                                selectedCompanyId={selectedCompanyId}
                                onCompanyChange={(companyId) => {
                                    setSelectedCompanyId(companyId);
                                    setOnboardings([]);
                                }}
                            />
                        </div>
                    )}

                    <Input
                        type="search"
                        placeholder="Search name, code or designation..."
                        value={searchQuery}
                        onChange={(e) =>
                            setSearchQuery(e.target.value)
                        }
                        autoComplete="off"
                        className="h-9 w-full sm:w-72"
                    />

                    <Select
                        value={statusFilter}
                        onValueChange={handleStatusFilter}
                    >
                        <SelectTrigger className="h-9 w-40">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>

                        <SelectContent position="popper">
                            <SelectItem value="all">
                                All Status
                            </SelectItem>
                            <SelectItem value="IN_PROGRESS">
                                In Progress
                            </SelectItem>
                            <SelectItem value="ON_HOLD">
                                On Hold
                            </SelectItem>
                            <SelectItem value="COMPLETED">
                                Completed
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {isSuperAdmin && !selectedCompanyId && (
                    <p className="text-sm text-muted-foreground">
                        Select a company to view and manage onboarding records.
                    </p>
                )}
            </div>

            {/* Reset Confirmation Dialog */}
            {canDeleteOnboarding && (
                <AlertDialog
                    open={resetDialogOpen}
                    onOpenChange={(open) => {
                        setResetDialogOpen(open);

                        if (!open) {
                            setSelectedOnboarding(null);
                        }
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Reset Onboarding?{" "}
                                {getUserName(selectedOnboarding?.user)}
                            </AlertDialogTitle>

                            <AlertDialogDescription>
                                This will delete{" "}
                                <span className="font-bold">
                                    {getUserName(selectedOnboarding?.user)}
                                </span>
                                's current onboarding checklist and reset
                                the onboarding process. The employee can
                                then be started again using the latest
                                configured checklist templates.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                            <AlertDialogCancel className="cursor-pointer">
                                Cancel
                            </AlertDialogCancel>

                            <Button
                                onClick={handleResetOnboarding}
                                className="bg-[var(--logo-green)] text-black hover:bg-[var(--logo-green)]/80 cursor-pointer"
                            >
                                Reset Onboarding
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* Table */}
            <div className="bg-card grid grid-cols-1 rounded border w-full overflow-hidden">
                <div className="h-full overflow-auto">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                                <TableHead>#</TableHead>


                                <TableHead className="min-w-37.5">
                                    Employee
                                </TableHead>

                                <TableHead className="min-w-25">
                                    Code
                                </TableHead>

                                <TableHead className="min-w-35">
                                    Designation
                                </TableHead>

                                <TableHead className="min-w-30">
                                    Current Stage
                                </TableHead>

                                <TableHead className="min-w-25">
                                    Progress
                                </TableHead>

                                <TableHead className="min-w-30">
                                    Status
                                </TableHead>

                                <TableHead className="min-w-30">
                                    Start Date
                                </TableHead>

                                <TableHead className="min-w-30">
                                    Target Date
                                </TableHead>

                                {hasActions && (
                                    <TableHead className="sticky right-0 bg-muted">
                                        Actions
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {filteredOnboardings.map((item, index) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {index + 1}
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-3 min-w-[160px]">
                                            <UserAvatar user={item.user} size="sm" />
                                            <span className="font-medium truncate">
                                                {getUserName(item.user)}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {item.user.employeeCode ?? "—"}
                                    </TableCell>

                                    <TableCell>
                                        {item.user.designation ?? "—"}
                                    </TableCell>

                                    <TableCell>
                                        {getStageBadge(item.currentStage)}
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">
                                                {item.progressPercent}%
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        {getStatusBadge(item.status)}
                                    </TableCell>

                                    <TableCell>
                                        {formatDate(item.startDate)}
                                    </TableCell>

                                    <TableCell>
                                        {formatDate(item.targetDate)}
                                    </TableCell>

                                    {hasActions && (
                                        <TableCell className="sticky right-0 bg-card">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>

                                                <DropdownMenuContent align="end">

                                                    {/* Continue Onboarding */}
                                                    {canViewOnboarding && (
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                const detailUrl = isSuperAdmin
                                                                    ? `/onboarding/${item.userId}?companyId=${encodeURIComponent(selectedCompanyId)}`
                                                                    : `/onboarding/${item.userId}`;

                                                                navigate(detailUrl);
                                                            }}
                                                        >
                                                            Continue Onboarding
                                                        </DropdownMenuItem>
                                                    )}

                                                    {/* Restart Onboarding */}
                                                    {canCreateOnboarding &&
                                                        item.status !== "COMPLETED" && (
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleStartOnboarding(
                                                                        item.userId
                                                                    )
                                                                }
                                                            >
                                                                Restart Onboarding
                                                            </DropdownMenuItem>
                                                        )}

                                                    {/* Reset Onboarding */}
                                                    {canDeleteOnboarding && (
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            onClick={() => {
                                                                setSelectedOnboarding(item);
                                                                setResetDialogOpen(true);
                                                            }}
                                                        >
                                                            Reset Onboarding
                                                        </DropdownMenuItem>
                                                    )}

                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}

                            {!loading &&
                                filteredOnboardings.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={hasActions ? 10 : 9}
                                            className="py-10 text-center"
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <p className="font-medium">
                                                    {isSuperAdmin && !selectedCompanyId
                                                        ? "Select a company first"
                                                        : "No onboarding records found"}
                                                </p>

                                                <p className="text-sm text-muted-foreground">
                                                    {isSuperAdmin && !selectedCompanyId
                                                        ? "Choose a company to view its onboarding records."
                                                        : "Configure onboarding checklist templates and start onboarding for an employee."}
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}

                            {loading && (
                                <TableRow>
                                    <TableCell
                                        colSpan={hasActions ? 10 : 9}
                                        className="text-center text-muted-foreground py-8"
                                    >
                                        Loading onboarding records...
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default OnboardingList;
