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
    isAdminRole,
    isSuperAdminRole,
} from "@/utilis/roleUtils";
import { createLeaveRequestSchema } from "@/validation/leaveRequest.validation";
import { CompanySelector } from "@/pages/common/CompanySelector.tsx";

const LeaveRequestPage = () => {
    const { user } = useAuthStore();

    const isSuperAdmin = isSuperAdminRole(user?.role?.name);
    const canChangeStatus = !isAdminRole(user?.role?.name);

    const [selectedCompanyId, setSelectedCompanyId] =
        React.useState("");

    const [leaves, setLeaves] = React.useState<LeaveRequest[]>([]);
    const [leaveTypes, setLeaveTypes] = React.useState<LeaveType[]>([]);
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    const [form, setForm] = React.useState({
        leaveTypeId: "",
        startDate: "",
        endDate: "",
        reason: "",
    });

    const [errors, setErrors] = React.useState<Record<string, string>>({});

    const loadLeaves = React.useCallback(async () => {
        if (isSuperAdmin && !selectedCompanyId) {
            setLeaves([]);
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
    }, [isSuperAdmin, selectedCompanyId]);

    const loadLeaveTypes = React.useCallback(async () => {
        if (isSuperAdmin && !selectedCompanyId) {
            setLeaveTypes([]);
            return;
        }

        try {
            const res = await getLeaveTypes(
                isSuperAdmin ? selectedCompanyId : undefined
            );

            setLeaveTypes(
                (res.data.data as LeaveType[]).filter(
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
    }, [isSuperAdmin, selectedCompanyId]);

    React.useEffect(() => {
        void loadLeaves();
        void loadLeaveTypes();
    }, [loadLeaves, loadLeaveTypes]);

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
            await createLeaveRequest(
                form,
                isSuperAdmin ? selectedCompanyId : undefined
            );

            toast.success("Leave request submitted successfully!");

            await loadLeaves();

            setOpen(false);
            setForm({
                leaveTypeId: "",
                startDate: "",
                endDate: "",
                reason: "",
            });
            setErrors({});
        } catch (err: unknown) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to submit leave request"
            );
        }
    };

    const handleCancel = async (id: string) => {
        try {
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

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                {isSuperAdmin && (
                    <div className="w-full max-w-60">
                        <CompanySelector
                            selectedCompanyId={selectedCompanyId}
                            onCompanyChange={(companyId) => {
                                setSelectedCompanyId(companyId);
                                setLeaves([]);
                                setLeaveTypes([]);
                            }}
                        />
                    </div>
                )}

                {canChangeStatus && (
                    <Button
                        size="sm"
                        variant="add"
                        onClick={() => setOpen(true)}
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

            <Dialog open={open} onOpenChange={setOpen}>
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

                        <Button variant="add" onClick={handleSubmit}>
                            Submit Request
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
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {leaves.map((leave, index) => (
                            <TableRow key={leave.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{leave.leaveType?.name}</TableCell>
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

                                <TableCell>
                                    {leave.status === "Pending" && canChangeStatus && (
                                        <Button
                                            className="cursor-pointer"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleCancel(leave.id)}
                                        >
                                            <X className="h-4 w-4" />
                                            Cancel
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}

                        {loading && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="text-center text-muted-foreground py-8"
                                >
                                    Loading leave requests...
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading && leaves.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
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