
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PlusIcon, X } from "lucide-react";
import { toast } from "sonner";
import type { LeaveRequest, LeaveType } from "@/types/leave.types";
import {
    getMyLeaveRequests,
    createLeaveRequest,
    cancelLeaveRequest,
} from "@/services/leaveRequest.service";
import { getLeaveTypes } from "@/services/leaveType.service";
import { useAuthStore } from "@/store/auth.store";
import {
    canViewModule,
    canCreateInModule,
    canDeleteInModule,
    isSuperAdminRole,
} from "@/utilis/roleUtils";
import { createLeaveRequestSchema } from "@/validation/leaveRequest.validation";
import { CompanySelector } from "@/pages/common/CompanySelector";

const MODULE_NAME = "leave_request";

const initialForm = {
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
};

const LeaveRequestPage = () => {
    const { user } = useAuthStore();

    const isSuperAdmin = isSuperAdminRole(user);

    // Module permissions
    const canViewLeaveRequest = canViewModule(user, MODULE_NAME);
    const canCreateLeaveRequest = canCreateInModule(user, MODULE_NAME);
    const canCancelLeaveRequest = canDeleteInModule(user, MODULE_NAME);

    const [selectedCompanyId, setSelectedCompanyId] =
        React.useState("");

    const [leaves, setLeaves] = React.useState<LeaveRequest[]>([]);
    const [leaveTypes, setLeaveTypes] = React.useState<LeaveType[]>([]);
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [cancellingId, setCancellingId] = React.useState<string | null>(null);

    const [form, setForm] = React.useState(initialForm);
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    const loadLeaves = React.useCallback(async () => {
        if (!canViewLeaveRequest) {
            setLeaves([]);
            setLoading(false);
            return;
        }

        if (isSuperAdmin && !selectedCompanyId) {
            setLeaves([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const res = await getMyLeaveRequests(
                isSuperAdmin ? selectedCompanyId : undefined
            );

            setLeaves(res.data.data ?? []);
        } catch (err: unknown) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to load leaves"
            );
            setLeaves([]);
        } finally {
            setLoading(false);
        }
    }, [
        canViewLeaveRequest,
        isSuperAdmin,
        selectedCompanyId,
    ]);

    const loadLeaveTypes = React.useCallback(async () => {
        if (!canCreateLeaveRequest) {
            setLeaveTypes([]);
            return;
        }

        if (isSuperAdmin && !selectedCompanyId) {
            setLeaveTypes([]);
            return;
        }

        try {
            const res = await getLeaveTypes(
                isSuperAdmin ? selectedCompanyId : undefined
            );

            setLeaveTypes(
                ((res.data.data ?? []) as LeaveType[]).filter(
                    (leaveType) => leaveType.isActive
                )
            );
        } catch (err: unknown) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to load leave types"
            );
            setLeaveTypes([]);
        }
    }, [
        canCreateLeaveRequest,
        isSuperAdmin,
        selectedCompanyId,
    ]);

    React.useEffect(() => {
        void loadLeaves();
        void loadLeaveTypes();
    }, [loadLeaves, loadLeaveTypes]);

    const handleCompanyChange = (companyId: string | null) => {
        setSelectedCompanyId(companyId ?? "");
        setLeaves([]);
        setLeaveTypes([]);
        setOpen(false);
        setForm(initialForm);
        setErrors({});
    };

    const handleChange = (
        field: keyof typeof form,
        value: string
    ) => {
        const updatedForm = { ...form, [field]: value };

        setForm(updatedForm);

        const result = createLeaveRequestSchema.safeParse(updatedForm);
        const nextErrors = { ...errors };

        delete nextErrors[field];

        if (!result.success) {
            const fieldError = result.error.issues.find(
                (issue) => issue.path[0] === field
            );

            if (fieldError) {
                nextErrors[field] = fieldError.message;
            }
        }

        setErrors(nextErrors);
    };

    const handleSubmit = async () => {
        if (!canCreateLeaveRequest) {
            toast.error("You don't have permission to apply for leave");
            return;
        }

        if (isSuperAdmin && !selectedCompanyId) {
            toast.error("Please select a company first.");
            return;
        }

        const result = createLeaveRequestSchema.safeParse(form);

        if (!result.success) {
            const fieldErrors: Record<string, string> = {};

            result.error.issues.forEach((issue) => {
                const field = issue.path[0];

                if (typeof field === "string" && !fieldErrors[field]) {
                    fieldErrors[field] = issue.message;
                }
            });

            setErrors(fieldErrors);
            return;
        }

        try {
            setSubmitting(true);

            await createLeaveRequest(
                form,
                isSuperAdmin ? selectedCompanyId : undefined
            );

            toast.success("Leave request submitted successfully!");

            setOpen(false);
            setForm(initialForm);
            setErrors({});

            await loadLeaves();
        } catch (err: unknown) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to submit leave request"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async (id: string) => {
        if (!canCancelLeaveRequest) {
            toast.error("You don't have permission to cancel leave requests");
            return;
        }

        try {
            setCancellingId(id);

            await cancelLeaveRequest(
                id,
                isSuperAdmin ? selectedCompanyId : undefined
            );

            toast.success("Leave request cancelled");
            await loadLeaves();
        } catch (err: unknown) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to cancel leave request"
            );
        } finally {
            setCancellingId(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Approved":
                return "bg-green-100 text-green-700";
            case "Rejected":
                return "bg-red-100 text-red-700";
            default:
                return "bg-yellow-100 text-yellow-700";
        }
    };

    // Hide complete page when user has no view permission
    if (!canViewLeaveRequest) return null;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                {isSuperAdmin && (
                    <div className="w-full max-w-60">
                        <CompanySelector
                            selectedCompanyId={selectedCompanyId}
                            onCompanyChange={handleCompanyChange}
                        />
                    </div>
                )}

                {canCreateLeaveRequest && (
                    <Button
                        size="sm"
                        variant="add"
                        onClick={() => {
                            setForm(initialForm);
                            setErrors({});
                            setOpen(true);
                        }}
                        disabled={isSuperAdmin && !selectedCompanyId}
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Apply Leave
                    </Button>
                )}
            </div>

            {isSuperAdmin && !selectedCompanyId && (
                <p className="text-sm text-muted-foreground">
                    Select a company to view and manage leave requests.
                </p>
            )}

            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setOpen(false);
                        setForm(initialForm);
                        setErrors({});
                    } else if (canCreateLeaveRequest) {
                        setOpen(true);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Apply for Leave</DialogTitle>
                    </DialogHeader>

                    <DialogDescription>
                        Fill out the form below to apply for leave.
                    </DialogDescription>

                    <div className="flex flex-col gap-3">
                        <div>
                            <Label>Leave Type *</Label>

                            <Select
                                value={form.leaveTypeId}
                                onValueChange={(value) =>
                                    handleChange("leaveTypeId", value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Leave Type" />
                                </SelectTrigger>

                                <SelectContent position="popper">
                                    {leaveTypes.map((leaveType) => (
                                        <SelectItem
                                            key={leaveType.id}
                                            value={leaveType.id}
                                        >
                                            {leaveType.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {errors.leaveTypeId && (
                                <p className="text-sm text-red-500 mt-1">
                                    {errors.leaveTypeId}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Label>Start Date *</Label>

                                <Input
                                    type="date"
                                    value={form.startDate}
                                    onChange={(e) =>
                                        handleChange("startDate", e.target.value)
                                    }
                                />

                                {errors.startDate && (
                                    <p className="text-sm text-red-500 mt-1">
                                        {errors.startDate}
                                    </p>
                                )}
                            </div>

                            <div className="flex-1">
                                <Label>End Date *</Label>

                                <Input
                                    type="date"
                                    value={form.endDate}
                                    onChange={(e) =>
                                        handleChange("endDate", e.target.value)
                                    }
                                />

                                {errors.endDate && (
                                    <p className="text-sm text-red-500 mt-1">
                                        {errors.endDate}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label>Reason</Label>

                            <Input
                                value={form.reason}
                                onChange={(e) =>
                                    handleChange("reason", e.target.value)
                                }
                                placeholder="Optional"
                            />

                            {errors.reason && (
                                <p className="text-sm text-red-500 mt-1">
                                    {errors.reason}
                                </p>
                            )}
                        </div>

                        <Button
                            variant="add"
                            disabled={submitting}
                            onClick={handleSubmit}
                        >
                            {submitting && (
                                <span className="mr-2">
                                    Submitting...
                                </span>
                            )}
                            {!submitting && "Submit Request"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="bg-card grid grid-cols-1 rounded border w-full overflow-x-auto">
                <Table className="table-auto">
                    <TableHeader className="bg-muted rounded-lg">
                        <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Leave Type</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Days</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Status</TableHead>
                            {canCancelLeaveRequest && (
                                <TableHead>Actions</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {leaves.map((leave, index) => (
                            <TableRow key={leave.id}>
                                <TableCell>{index + 1}</TableCell>

                                <TableCell>
                                    {leave.leaveType?.name}
                                </TableCell>

                                <TableCell>
                                    {new Date(leave.startDate).toLocaleDateString("en-IN")}
                                </TableCell>

                                <TableCell>
                                    {new Date(leave.endDate).toLocaleDateString("en-IN")}
                                </TableCell>

                                <TableCell>{leave.totalDays}</TableCell>

                                <TableCell>{leave.reason ?? "—"}</TableCell>

                                <TableCell>
                                    <Badge className={getStatusColor(leave.status)}>
                                        {leave.status}
                                    </Badge>

                                    {leave.status === "Rejected" && leave.rejectReason && (
                                        <p className="text-xs text-red-500 mt-1">
                                            {leave.rejectReason}
                                        </p>
                                    )}
                                </TableCell>

                                {canCancelLeaveRequest && (
                                    <TableCell>
                                        {leave.status === "Pending" && (
                                            <Button
                                                className="cursor-pointer"
                                                variant="destructive"
                                                size="sm"
                                                disabled={cancellingId === leave.id}
                                                onClick={() => handleCancel(leave.id)}
                                            >
                                                <X className="h-4 w-4" />
                                                {cancellingId === leave.id
                                                    ? "Cancelling..."
                                                    : "Cancel"}
                                            </Button>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}

                        {loading && (
                            <TableRow>
                                <TableCell
                                    colSpan={canCancelLeaveRequest ? 8 : 7}
                                    className="text-center text-muted-foreground py-8"
                                >
                                    Loading leave requests...
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading && leaves.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={canCancelLeaveRequest ? 8 : 7}
                                    className="text-center text-muted-foreground py-8"
                                >
                                    {isSuperAdmin && !selectedCompanyId
                                        ? "Select a company first"
                                        : "No leave requests found"}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default LeaveRequestPage;
