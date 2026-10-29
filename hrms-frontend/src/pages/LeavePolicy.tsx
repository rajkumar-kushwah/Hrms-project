
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
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, MoreVertical, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { LeaveType } from "@/types/leave.types";
import {
    getLeaveTypes,
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
} from "@/services/leaveType.service";
import { useAuthStore } from "@/store/auth.store";
import {
    isEmployeeRole,
    isSuperAdminRole,
} from "@/utilis/roleUtils";
import { CompanySelector } from "@/pages/common/CompanySelector";
import {
    createLeaveTypeSchema,
    updateLeaveTypeSchema,
} from "@/validation/leavepolicy.validation";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const initialForm = {
    name: "",
    description: "",
    daysPerYear: 0,
    isPaid: false,
};

const LeavePolicy = () => {
    const { user } = useAuthStore();

    const isSuperAdmin = isSuperAdminRole(user?.role?.name);
    const canChangeStatus = !isEmployeeRole(user?.role?.name);

    const [leaveTypes, setLeaveTypes] = React.useState<LeaveType[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] =
        React.useState<string | null>(null);

    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);

    const [open, setOpen] = React.useState(false);
    const [editType, setEditType] = React.useState<LeaveType | null>(null);

    const [form, setForm] = React.useState(initialForm);
    const [errors, setErrors] = React.useState<Record<string, string>>({});
    const [deactivateDialogOpen, setDeactivateDialogOpen] =
        React.useState(false);

    const [selectedLeaveType, setSelectedLeaveType] =
        React.useState<LeaveType | null>(null);

    const [deactivating, setDeactivating] = React.useState(false);

    const loadLeaveTypes = React.useCallback(async () => {
        if (isSuperAdmin && !selectedCompanyId) {
            setLeaveTypes([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setLeaveTypes([]);

        try {
            const res = await getLeaveTypes(
                isSuperAdmin ? selectedCompanyId : undefined
            );

            setLeaveTypes(res.data.data ?? []);
        } catch (err: unknown) {
            const message =
                err instanceof Error
                    ? err.message
                    : "Failed to load leave types";

            toast.error(message);
            setLeaveTypes([]);
        } finally {
            setLoading(false);
        }
    }, [isSuperAdmin, selectedCompanyId]);

    React.useEffect(() => {
        void loadLeaveTypes();
    }, [loadLeaveTypes]);

    const handleClose = () => {
        setOpen(false);
        setEditType(null);
        setErrors({});
        setForm(initialForm);
    };

    const handleCompanyChange = (companyId: string | null) => {
        setSelectedCompanyId(companyId);
        setLeaveTypes([]);
        handleClose();
    };

    const handleChange = (
        field: keyof typeof form,
        value: string | number | boolean
    ) => {
        const updatedForm = { ...form, [field]: value };
        setForm(updatedForm);

        const schema = editType
            ? updateLeaveTypeSchema
            : createLeaveTypeSchema;

        const result = schema.safeParse(updatedForm);

        if (result.success) {
            setErrors({});
            return;
        }

        const fieldError = result.error.issues.find(
            (issue) => issue.path[0] === field
        );

        setErrors((previous) => ({
            ...previous,
            [field]: fieldError?.message ?? "",
        }));
    };


    const handleSubmit = async () => {
        if (isSuperAdmin && !selectedCompanyId) {
            toast.error("Please select a company first");
            return;
        }

        const schema = editType
            ? updateLeaveTypeSchema
            : createLeaveTypeSchema;

        const result = schema.safeParse(form);

        if (!result.success) {
            const fieldErrors: Record<string, string> = {};

            result.error.issues.forEach((issue) => {
                const field = issue.path[0];

                if (typeof field === "string") {
                    fieldErrors[field] = issue.message;
                }
            });

            setErrors(fieldErrors);
            return;
        }

        setErrors({});
        setSaving(true);

        try {
            if (editType) {
                await updateLeaveType(
                    editType.id,
                    form,
                    isSuperAdmin ? selectedCompanyId : undefined
                );

                toast.success("Leave type updated successfully");
            } else {
                await createLeaveType(
                    form,
                    isSuperAdmin ? selectedCompanyId : undefined
                );

                toast.success("Leave type created successfully");
            }

            handleClose();
            await loadLeaveTypes();
        } catch (err: unknown) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to save leave type"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedLeaveType) return;

        setDeactivating(true);

        try {
            await deleteLeaveType(
                selectedLeaveType.id,
                isSuperAdmin ? selectedCompanyId : undefined
            );

            toast.success("Leave type deactivated successfully");
            setDeactivateDialogOpen(false);
            setSelectedLeaveType(null);

            await loadLeaveTypes();
        } catch (err: unknown) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to deactivate leave type"
            );
        } finally {
            setDeactivating(false);
        }
    };

    const handleActivate = async (id: string) => {
        try {
            await updateLeaveType(
                id,
                { isActive: true },
                isSuperAdmin ? selectedCompanyId : undefined
            );

            toast.success("Leave type activated successfully");
            await loadLeaveTypes();
        } catch (err: unknown) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Failed to activate leave type"
            );
        }
    };

    const handleEdit = (leaveType: LeaveType) => {
        setEditType(leaveType);

        setForm({
            name: leaveType.name,
            description: leaveType.description ?? "",
            daysPerYear: leaveType.daysPerYear,
            isPaid: leaveType.isPaid,
        });

        setErrors({});
        setOpen(true);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                {isSuperAdmin && (
                    <CompanySelector
                        selectedCompanyId={selectedCompanyId}
                        onCompanyChange={handleCompanyChange}
                    />
                )}

                {canChangeStatus && (
                    <Button
                        size="sm"
                        className="cursor-pointer"
                        variant="add"
                        disabled={isSuperAdmin && !selectedCompanyId}
                        onClick={() => setOpen(true)}
                    >
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Add Leave Type
                    </Button>
                )}
            </div>

            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        handleClose();
                    } else {
                        setOpen(true);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editType ? "Edit Leave Type" : "Add Leave Type"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col gap-3">
                        {isSuperAdmin && selectedCompanyId && (
                            <p className="text-sm text-muted-foreground">
                                This leave type will belong to the selected company.
                            </p>
                        )}

                        <div>
                            <Label>Name *</Label>
                            <Input
                                placeholder="e.g. Sick Leave"
                                value={form.name}
                                onChange={(e) =>
                                    handleChange("name", e.target.value)
                                }
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label>Description</Label>
                            <Input
                                value={form.description}
                                onChange={(e) =>
                                    handleChange("description", e.target.value)
                                }
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.description}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label>Days Per Year</Label>
                            <Input
                                type="number"
                                min={0}
                                value={form.daysPerYear}
                                onChange={(e) =>
                                    handleChange(
                                        "daysPerYear",
                                        Number(e.target.value)
                                    )
                                }
                            />
                            {errors.daysPerYear && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.daysPerYear}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                id="isPaid"
                                type="checkbox"
                                checked={form.isPaid}
                                onChange={(e) =>
                                    handleChange("isPaid", e.target.checked)
                                }
                                className="h-4 w-4 cursor-pointer"
                            />
                            <Label htmlFor="isPaid">Paid Leave</Label>
                        </div>

                        <Button
                            variant="add"
                            className="cursor-pointer"
                            disabled={saving}
                            onClick={handleSubmit}
                        >
                            {saving && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {editType ? "Update" : "Create"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            <AlertDialog
                open={deactivateDialogOpen}
                onOpenChange={(open) => {
                    if (!deactivating) {
                        setDeactivateDialogOpen(open);

                        if (!open) {
                            setSelectedLeaveType(null);
                        }
                    }
                }}
            >
                {/* confirm dialogue box for deactivating leave type */}

                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Deactivate Leave Type?
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            Are you sure you want to deactivate{" "}
                            <span className="font-medium text-foreground">
                                {selectedLeaveType?.name}
                            </span>
                            ? It will no longer be available for new leave requests.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deactivating}>
                            Cancel
                        </AlertDialogCancel>

                        <AlertDialogAction
                            disabled={deactivating}
                            onClick={(event) => {
                                event.preventDefault();
                                void handleDelete();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deactivating && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Deactivate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <div className="w-full overflow-hidden rounded border bg-card">
                <div className="h-full overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted">
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Days/Year</TableHead>
                                <TableHead>Status</TableHead>
                                {canChangeStatus && (
                                    <TableHead className="sticky right-0 bg-muted">
                                        Actions
                                    </TableHead>
                                )}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={canChangeStatus ? 6 : 5}
                                        className="h-32 text-center"
                                    >
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Loading leave types...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : leaveTypes.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={canChangeStatus ? 6 : 5}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        {isSuperAdmin && !selectedCompanyId
                                            ? "Select a company first"
                                            : "No leave types found"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                leaveTypes.map((leaveType, index) => (
                                    <TableRow key={leaveType.id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell>{leaveType.name}</TableCell>
                                        <TableCell>
                                            {leaveType.description ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {leaveType.daysPerYear}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                className={
                                                    leaveType.isActive
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                }
                                            >
                                                {leaveType.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </Badge>
                                        </TableCell>

                                        {canChangeStatus && (
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
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                handleEdit(leaveType)
                                                            }
                                                        >
                                                            Edit
                                                        </DropdownMenuItem>

                                                        {leaveType.isActive ? (
                                                            <DropdownMenuItem
                                                                variant="destructive"
                                                                onClick={() => {
                                                                    setSelectedLeaveType(leaveType);
                                                                    setDeactivateDialogOpen(true);
                                                                }}
                                                            >
                                                                Deactivate
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                className="text-[var(--theme-primary)]"
                                                                onClick={() =>
                                                                    handleActivate(
                                                                        leaveType.id
                                                                    )
                                                                }
                                                            >
                                                                Activate
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default LeavePolicy;
