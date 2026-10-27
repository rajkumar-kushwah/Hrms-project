
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
} from "lucide-react";

import {
    getHolidays,
    createHoliday,
    updateHoliday,
    activateHoliday,
    deactivateHoliday,
} from "@/services/holiday.service";

import type { HolidayType } from "@/types/holiday.types";
import {
    createHolidaySchema,
    holidayNameSchema,
    holidayDateSchema,
} from "@/validation/holiday.validation";

import { useAuthStore } from "@/store/auth.store";
import { isEmployeeRole } from "@/utilis/roleUtils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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

    if (error instanceof Error) {
        return error.message;
    }

    return "Something went wrong. Please try again.";
};

const formatDate = (value: string): string => {
    if (!value) return "-";

    const date = new Date(`${value.slice(0, 10)}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const toDateInputValue = (value: string): string => {
    return value ? value.slice(0, 10) : "";
};

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
        field === "startDate" &&
        values.endDate &&
        values.endDate >= values.startDate
    ) {
        return undefined;
    }

    if (
        field === "startDate" &&
        values.endDate &&
        values.startDate > values.endDate
    ) {
        return "Start date cannot be after end date";
    }

    if (
        field === "endDate" &&
        values.startDate &&
        values.endDate < values.startDate
    ) {
        return "End date must be on or after start date";
    }

    return undefined;
};

export default function HolidayPage() {
    const user = useAuthStore((state) => state.user);
    const employeeView = isEmployeeRole(user?.role?.name ?? "");

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

    const loadHolidays = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            const response = await getHolidays();

            // API returns: { success: true, data: [...] }
            const result = response?.data?.data;

            setHolidays(Array.isArray(result) ? result : []);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadHolidays();
    }, [loadHolidays]);

    const resetForm = () => {
        setForm(EMPTY_FORM);
        setErrors({});
        setEditHoliday(null);
    };

    const openAddDialog = () => {
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

            // Both date fields depend on the selected date range.
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

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

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
            const payload = {
                name: result.data.name,
                startDate: result.data.startDate,
                endDate: result.data.endDate,
            };

            if (editHoliday) {
                await updateHoliday(editHoliday.id, payload);
                toast.success("Holiday updated successfully");
            } else {
                await createHoliday(payload);
                toast.success("Holiday created successfully");
            }

            setOpen(false);
            resetForm();

            await loadHolidays();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (holiday: HolidayType) => {
        try {
            setActionId(holiday.id);

            if (holiday.isActive) {
                await deactivateHoliday(holiday.id);
                toast.success("Holiday deactivated successfully");
            } else {
                await activateHoliday(holiday.id);
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
                <div>

                    <p className="text-sm text-muted-foreground">
                        Manage company holidays and their date ranges.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button className="cursor-pointer"
                        type="button"
                        variant="add"
                        size="sm"
                        onClick={() => void loadHolidays(true)}
                        disabled={refreshing || loading}
                        aria-label="Refresh holidays"
                    >
                        <RefreshCw className={` ${refreshing ? "animate-spin" : ""}`} />
                        <span className={` ${refreshing ? "" : ""}`}>
                            Refresh
                        </span>
                    </Button>

                    {!employeeView && (
                        <Button type="button" variant="add" className="cursor-pointer" onClick={openAddDialog}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Holiday
                        </Button>
                    )}
                </div>
            </div>

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
                <Dialog open={open} onOpenChange={handleOpenChange}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editHoliday ? "Edit Holiday" : "Add Holiday"}
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
                                        aria-describedby={
                                            errors.name
                                                ? "holiday-name-error"
                                                : undefined
                                        }
                                    />

                                    {errors.name && (
                                        <p
                                            id="holiday-name-error"
                                            className="text-sm text-destructive"
                                        >
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
                                        aria-describedby={
                                            errors.startDate
                                                ? "holiday-start-date-error"
                                                : undefined
                                        }
                                    />

                                    {errors.startDate && (
                                        <p
                                            id="holiday-start-date-error"
                                            className="text-sm text-destructive"
                                        >
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
                                        aria-describedby={
                                            errors.endDate
                                                ? "holiday-end-date-error"
                                                : undefined
                                        }
                                    />

                                    {errors.endDate && (
                                        <p
                                            id="holiday-end-date-error"
                                            className="text-sm text-destructive"
                                        >
                                            {errors.endDate}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0 ">
                                <Button className="cursor-pointer"
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleOpenChange(false)}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>

                                <Button type="submit" className="cursor-pointer" variant="add" disabled={saving}>
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
