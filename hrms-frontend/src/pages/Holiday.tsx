
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import {
    CalendarDays,
    MoreHorizontal,
    Pencil,
    Plus,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
    Trash2,
} from "lucide-react";

import { api } from "@/api/axios";
import type {
    HolidayType,
    CreateHolidayPayload,
    UpdateHolidayPayload,
} from "@/types/holiday.types";
import {
    createHolidaySchema,
    holidayNameSchema,
    holidayDateSchema,
} from "@/validation/holiday.validation";
import { useAuthStore } from "@/store/auth.store";
import {
    isEmployeeRole,
} from "@/utilis/roleUtils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type HolidayForm = {
    name: string;
    startDate: string;
    endDate: string;
};

type HolidayField = keyof HolidayForm;
type HolidayErrors = Partial<Record<HolidayField, string>>;

type CompanyOption = {
    id: string;
    name: string;
};

const EMPTY_FORM: HolidayForm = {
    name: "",
    startDate: "",
    endDate: "",
};

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

    return error instanceof Error
        ? error.message
        : "Something went wrong. Please try again.";
};

const formatDate = (value: string): string => {
    if (!value) return "-";

    const date = new Date(`${value.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const toDateInputValue = (value: string): string =>
    value ? value.slice(0, 10) : "";

const validateField = (
    field: HolidayField,
    value: string,
    values: HolidayForm,
): string | undefined => {
    if (field === "name") {
        const result = holidayNameSchema.safeParse(value);
        return result.success
            ? undefined
            : result.error.issues[0]?.message;
    }

    const result = holidayDateSchema.safeParse(value);

    if (!result.success) {
        return result.error.issues[0]?.message;
    }

    if (
        values.startDate &&
        values.endDate &&
        values.startDate > values.endDate
    ) {
        return field === "startDate"
            ? "Start date cannot be after end date"
            : "End date must be on or after start date";
    }

    return undefined;
};

export default function HolidayPage() {
    const user = useAuthStore((state) => state.user);
    const roleName = user?.role?.name
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    const isSuperAdmin = roleName === "super_admin";
    const employeeView = isEmployeeRole(user?.role?.name ?? "");

    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");

    const [holidays, setHolidays] = useState<HolidayType[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [actionId, setActionId] = useState<string | null>(null);

    const [open, setOpen] = useState(false);
    const [editHoliday, setEditHoliday] =
        useState<HolidayType | null>(null);

    const [form, setForm] = useState<HolidayForm>(EMPTY_FORM);
    const [errors, setErrors] = useState<HolidayErrors>({});

    const [deleteHolidayItem, setDeleteHolidayItem] =
        useState<HolidayType | null>(null);

    const [deleting, setDeleting] = useState(false);

    // Super Admin ke liye company list load karein.
    useEffect(() => {
        if (!isSuperAdmin) return;

        const loadCompanies = async () => {
            try {
                // Apne backend ke actual company-list endpoint ke
                // mutabik "/company" ko adjust karein, agar zaroori ho.
                const response = await api.get("/company");
                const result = response?.data?.data;

                if (!Array.isArray(result)) {
                    setCompanies([]);
                    toast.error("Company list ka response sahi nahi hai");
                    return;
                }

                const options: CompanyOption[] = result
                    .filter(
                        (company: unknown): company is Record<string, unknown> =>
                            typeof company === "object" &&
                            company !== null &&
                            "id" in company &&
                            typeof company.id === "string",
                    )
                    .map((company) => ({
                        id: company.id as string,
                        name:
                            (typeof company.name === "string"
                                ? company.name
                                : typeof company.companyName === "string"
                                    ? company.companyName
                                    : "Unnamed Company"),
                    }));

                setCompanies(options);

                if (options.length === 0) {
                    toast.error("Koi company nahi mili");
                }
            } catch (error: unknown) {
                toast.error(getErrorMessage(error));
            }
        };

        void loadCompanies();
    }, [isSuperAdmin]);

    const requestConfig = useCallback(() => {
        if (isSuperAdmin) {
            if (!selectedCompanyId) {
                throw new Error("Please select a company first");
            }

            return {
                headers: {
                    "x-company-id": selectedCompanyId,
                },
            };
        }

        return {};
    }, [isSuperAdmin, selectedCompanyId]);

    const loadHolidays = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            if (isSuperAdmin && !selectedCompanyId) {
                setHolidays([]);
                return;
            }

            const response = await api.get(
                "/holidays",
                requestConfig(),
            );

            const result = response?.data?.data;
            setHolidays(Array.isArray(result) ? result : []);
        } catch (error: unknown) {
            setHolidays([]);
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isSuperAdmin, selectedCompanyId, requestConfig]);

    useEffect(() => {
        void loadHolidays();
    }, [loadHolidays]);

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setErrors({});
        setEditHoliday(null);
    };

    const handleDelete = async () => {
        if (!deleteHolidayItem) return;

        if (isSuperAdmin && !selectedCompanyId) {
            toast.error("Please select a company first");
            return;
        }

        try {
            setDeleting(true);

            const config = requestConfig();

            await api.delete(
                `/holidays/${deleteHolidayItem.id}`,
                config,
            );

            toast.success("Holiday deleted successfully");

            setDeleteHolidayItem(null);

            await loadHolidays(true);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setDeleting(false);
        }
    };

    const openAddDialog = () => {
        if (isSuperAdmin && !selectedCompanyId) {
            toast.error("Please select a company first");
            return;
        }

        resetForm();
        setOpen(true);
    };

    const openEditDialog = (holiday: HolidayType) => {
        setEditHoliday(holiday);
        setForm({
            name: holiday.name,
            startDate: toDateInputValue(holiday.startDate),
            endDate: toDateInputValue(holiday.endDate),
        });
        setErrors({});
        setOpen(true);
    };

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (!nextOpen && !saving) {
            resetForm();
        }
    };

    const handleFieldChange = (
        field: HolidayField,
        value: string,
    ) => {
        const nextForm: HolidayForm = {
            ...form,
            [field]: value,
        };

        setForm(nextForm);

        setErrors((previous) => {
            const nextErrors: HolidayErrors = {
                ...previous,
                [field]: validateField(field, value, nextForm),
            };

            if (field === "startDate" || field === "endDate") {
                nextErrors.startDate = validateField(
                    "startDate",
                    nextForm.startDate,
                    nextForm,
                );
                nextErrors.endDate = validateField(
                    "endDate",
                    nextForm.endDate,
                    nextForm,
                );
            }

            return nextErrors;
        });
    };

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (isSuperAdmin && !selectedCompanyId) {
            toast.error("Please select a company first");
            return;
        }

        const result = createHolidaySchema.safeParse(form);

        if (!result.success) {
            const nextErrors: HolidayErrors = {};

            for (const issue of result.error.issues) {
                const field = issue.path[0];

                if (
                    (field === "name" ||
                        field === "startDate" ||
                        field === "endDate") &&
                    !nextErrors[field]
                ) {
                    nextErrors[field] = issue.message;
                }
            }

            setErrors(nextErrors);
            return;
        }

        setErrors({});
        setSaving(true);

        try {
            const config = requestConfig();

            const payload: CreateHolidayPayload = {
                name: result.data.name,
                startDate: result.data.startDate,
                endDate: result.data.endDate,
            };

            if (editHoliday) {
                const updatePayload: UpdateHolidayPayload = payload;

                await api.put(
                    `/holidays/${editHoliday.id}`,
                    updatePayload,
                    config,
                );

                toast.success("Holiday updated successfully");
            } else {
                await api.post("/holidays", payload, config);
                toast.success("Holiday created successfully");
            }

            setOpen(false);
            resetForm();
            await loadHolidays(true);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (holiday: HolidayType) => {
        try {
            setActionId(holiday.id);
            const config = requestConfig();

            if (holiday.isActive) {
                await api.patch(
                    `/holidays/${holiday.id}/deactivate`,
                    {},
                    config,
                );
                toast.success("Holiday deactivated successfully");
            } else {
                await api.patch(
                    `/holidays/${holiday.id}/activate`,
                    {},
                    config,
                );
                toast.success("Holiday activated successfully");
            }

            await loadHolidays(true);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Manage company holidays and their date ranges.
                    </p>

                    {isSuperAdmin && (
                        <div className="w-full max-w-sm space-y-1">
                            <Label htmlFor="holiday-company">
                                Select Company
                            </Label>

                            <Select
                                value={selectedCompanyId}
                                onValueChange={setSelectedCompanyId}
                            >
                                <SelectTrigger id="holiday-company">
                                    <SelectValue placeholder="Choose a company" />
                                </SelectTrigger>

                                <SelectContent position="popper" avoidCollisions={true}>
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
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="add"
                        size="sm"
                        onClick={() => void loadHolidays(true)}
                        disabled={
                            refreshing ||
                            loading ||
                            (isSuperAdmin && !selectedCompanyId)
                        }
                    >
                        <RefreshCw
                            className={
                                refreshing ? "animate-spin" : ""
                            }
                        />
                        Refresh
                    </Button>

                    {!employeeView && (
                        <Button
                            type="button"
                            variant="add"
                            onClick={openAddDialog}
                            disabled={isSuperAdmin && !selectedCompanyId}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Holiday
                        </Button>
                    )}
                </div>
            </div>

            {/* Delete holiday modal */}
            <Dialog
                open={Boolean(deleteHolidayItem)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen && !deleting) {
                        setDeleteHolidayItem(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Holiday</DialogTitle>

                        <DialogDescription>
                            Are you sure you want to delete{" "}
                            <span className="font-medium text-foreground">
                                {deleteHolidayItem?.name}
                            </span>
                            ? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeleteHolidayItem(null)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => void handleDelete()}
                            disabled={deleting}
                        >
                            {deleting ? "Deleting..." : "Delete Holiday"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Holiday</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Status</TableHead>
                            {!employeeView && (
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={employeeView ? 4 : 5}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    Loading holidays...
                                </TableCell>
                            </TableRow>
                        ) : isSuperAdmin && !selectedCompanyId ? (
                            <TableRow>
                                <TableCell
                                    colSpan={employeeView ? 4 : 5}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    Select a company to view its holidays.
                                </TableCell>
                            </TableRow>
                        ) : holidays.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={employeeView ? 4 : 5}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    <CalendarDays className="mx-auto mb-2 h-5 w-5" />
                                    No holidays found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            holidays.map((holiday) => (
                                <TableRow key={holiday.id}>
                                    <TableCell className="font-medium">
                                        {holiday.name}
                                    </TableCell>

                                    <TableCell>
                                        {formatDate(holiday.startDate)}
                                    </TableCell>

                                    <TableCell>
                                        {formatDate(holiday.endDate)}
                                    </TableCell>

                                    <TableCell>
                                        <Badge
                                            variant={
                                                holiday.isActive
                                                    ? "default"
                                                    : "secondary"
                                            }
                                        >
                                            {holiday.isActive
                                                ? "Active"
                                                : "Inactive"}
                                        </Badge>
                                    </TableCell>

                                    {!employeeView && (
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={`Actions for ${holiday.name}`}
                                                        disabled={
                                                            actionId === holiday.id
                                                        }
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>

                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            openEditDialog(holiday)
                                                        }
                                                    >
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            void handleToggleStatus(
                                                                holiday,
                                                            )
                                                        }
                                                    >
                                                        {holiday.isActive ? (
                                                            <ToggleLeft className="mr-2 h-4 w-4" />
                                                        ) : (
                                                            <ToggleRight className="mr-2 h-4 w-4" />
                                                        )}

                                                        {holiday.isActive
                                                            ? "Deactivate"
                                                            : "Activate"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onSelect={() => setDeleteHolidayItem(holiday)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
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

            {!employeeView && (
                <Dialog
                    open={open}
                    onOpenChange={handleOpenChange}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editHoliday
                                    ? "Edit Holiday"
                                    : "Add Holiday"}
                            </DialogTitle>

                            <DialogDescription>
                                Enter the holiday name and its start and end dates.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} noValidate>
                            <div className="space-y-4 py-3">
                                <div className="space-y-2">
                                    <Label htmlFor="holiday-name">
                                        Holiday Name
                                    </Label>
                                    <Input
                                        id="holiday-name"
                                        value={form.name}
                                        onChange={(event) =>
                                            handleFieldChange(
                                                "name",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Enter holiday name"
                                        aria-invalid={Boolean(errors.name)}
                                    />
                                    {errors.name && (
                                        <p className="text-sm text-destructive">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="holiday-start-date">
                                        Start Date
                                    </Label>
                                    <Input
                                        id="holiday-start-date"
                                        type="date"
                                        value={form.startDate}
                                        max={form.endDate || undefined}
                                        onChange={(event) =>
                                            handleFieldChange(
                                                "startDate",
                                                event.target.value,
                                            )
                                        }
                                        aria-invalid={Boolean(
                                            errors.startDate,
                                        )}
                                    />
                                    {errors.startDate && (
                                        <p className="text-sm text-destructive">
                                            {errors.startDate}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="holiday-end-date">
                                        End Date
                                    </Label>
                                    <Input
                                        id="holiday-end-date"
                                        type="date"
                                        value={form.endDate}
                                        min={form.startDate || undefined}
                                        onChange={(event) =>
                                            handleFieldChange(
                                                "endDate",
                                                event.target.value,
                                            )
                                        }
                                        aria-invalid={Boolean(
                                            errors.endDate,
                                        )}
                                    />
                                    {errors.endDate && (
                                        <p className="text-sm text-destructive">
                                            {errors.endDate}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-2">
                                <Button className="cursor-pointer"
                                    type="button"
                                    variant="add"
                                    onClick={() =>
                                        handleOpenChange(false)
                                    }
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>

                                <Button className="cursor-pointer"
                                    type="submit"
                                    variant="add"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editHoliday
                                            ? "Update Holiday"
                                            : "Create Holiday"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
