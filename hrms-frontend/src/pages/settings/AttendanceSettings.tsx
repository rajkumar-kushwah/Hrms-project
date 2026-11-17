
import React from "react";
import { toast } from "sonner";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { getSettings, updateSettings } from "@/services/settings.service";
import type { CompanySettings } from "@/types/settings.types";

import { useAuthStore } from "@/store/auth.store";
import { useCompanyStore } from "@/store/company.store";
import { CompanySelector } from "@/pages/common/CompanySelector";

import {
    isSuperAdminRole,
    canViewModule,
    canEditInModule,
} from "@/utilis/roleUtils";

// ─────────────────────────────────────────────
// Constants & Types
// ─────────────────────────────────────────────

const MODULE_NAME = "settings_attendance";

const WEEK_DAYS = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
];

type AttendanceSettingField = {
    id: string;
    label: string;
    description: string;
    value: keyof Pick<
        CompanySettings,
        "halfDayHours" | "defaultGeoRadius"
    >;
    type: "number";
    min: number;
    step?: number;
    width: string;
};

const ATTENDANCE_FIELDS: AttendanceSettingField[] = [
    {
        id: "half-day-hours",
        label: "Half Day Threshold (Hours)",
        description:
            "Working hours below this threshold are marked half-day.",
        value: "halfDayHours",
        type: "number",
        min: 1,
        step: 0.5,
        width: "w-32",
    },
    {
        id: "geo-radius",
        label: "Default Geo Fence Radius (meters)",
        description:
            "Default radius used when a branch has no custom geo fence.",
        value: "defaultGeoRadius",
        type: "number",
        min: 10,
        width: "w-32",
    },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const AttendanceSettings = () => {
    const { user } = useAuthStore();

    const isSuperAdmin = isSuperAdminRole(user);

    const canViewAttendanceSettings = canViewModule(
        user,
        MODULE_NAME
    );

    const canEditAttendanceSettings = canEditInModule(
        user,
        MODULE_NAME
    );

    const [selectedCompanyId, setSelectedCompanyId] = React.useState("");

    const [settings, setSettings] =
        React.useState<CompanySettings | null>(null);

    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    const requestIdRef = React.useRef(0);
    const saveRequestIdRef = React.useRef(0);

    // ─────────────────────────────────────────
    // Load Settings
    // ─────────────────────────────────────────

    React.useEffect(() => {
        const requestId = ++requestIdRef.current;

        const loadSettings = async () => {
            if (!canViewAttendanceSettings || !user) {
                setSettings(null);
                setLoading(false);
                return;
            }

            if (isSuperAdmin && !selectedCompanyId) {
                setSettings(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setSettings(null);

            try {
                const response = await getSettings(
                    isSuperAdmin ? selectedCompanyId : undefined
                );

                if (requestId !== requestIdRef.current) return;

                setSettings(response.data.data ?? null);
            } catch {
                if (requestId !== requestIdRef.current) return;

                setSettings(null);
                toast.error("Failed to load attendance settings.");
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        };

        void loadSettings();

        return () => {
            requestIdRef.current += 1;
        };
    }, [
        user,
        isSuperAdmin,
        selectedCompanyId,
        canViewAttendanceSettings,
    ]);

    // ─────────────────────────────────────────
    // Company Change
    // ─────────────────────────────────────────

    const handleCompanyChange = (companyId: string) => {
        requestIdRef.current += 1;
        saveRequestIdRef.current += 1;

        setSettings(null);
        setLoading(true);
        setSaving(false);
        setSelectedCompanyId(companyId);
    };

    // ─────────────────────────────────────────
    // Update Setting Field
    // ─────────────────────────────────────────

    const updateSettingField = (
        field: keyof CompanySettings,
        value: number
    ) => {
        if (!canEditAttendanceSettings) return;

        setSettings((current) =>
            current
                ? {
                    ...current,
                    [field]: value,
                }
                : current
        );
    };

    // ─────────────────────────────────────────
    // Week Off Handler
    // ─────────────────────────────────────────

    const toggleWeekOff = (day: number) => {
        if (!canEditAttendanceSettings) return;

        setSettings((current) => {
            if (!current) return current;

            const weekOffDays = current.weekOffDays.includes(day)
                ? current.weekOffDays.filter((value) => value !== day)
                : [...current.weekOffDays, day];

            return {
                ...current,
                weekOffDays,
            };
        });
    };

    // ─────────────────────────────────────────
    // Save Settings
    // ─────────────────────────────────────────

    const handleSave = async () => {
        if (!canEditAttendanceSettings) {
            toast.error(
                "You don't have permission to edit attendance settings."
            );
            return;
        }

        if (!settings) return;

        if (isSuperAdmin && !selectedCompanyId) {
            toast.error("Please select a company.");
            return;
        }

        if (saving) return;

        const companyIdAtSubmit = selectedCompanyId;
        const saveRequestId = ++saveRequestIdRef.current;

        const settingsToSave = {
            lateMarkHour: settings.lateMarkHour,
            lateMarkMinute: settings.lateMarkMinute,
            halfDayHours: settings.halfDayHours,
            defaultGeoRadius: settings.defaultGeoRadius,
            weekOffDays: settings.weekOffDays,
        };

        setSaving(true);

        try {
            const response = await updateSettings(
                settingsToSave,
                isSuperAdmin ? companyIdAtSubmit : undefined
            );

            const companyChanged =
                isSuperAdmin &&
                useCompanyStore.getState().selectedCompanyId !==
                companyIdAtSubmit;

            if (
                companyChanged ||
                saveRequestId !== saveRequestIdRef.current
            ) {
                return;
            }

            setSettings(response.data.data);
            toast.success(
                "Attendance settings updated successfully."
            );
        } catch {
            const companyChanged =
                isSuperAdmin &&
                useCompanyStore.getState().selectedCompanyId !==
                companyIdAtSubmit;

            if (
                companyChanged ||
                saveRequestId !== saveRequestIdRef.current
            ) {
                return;
            }

            toast.error("Failed to update attendance settings.");
        } finally {
            if (saveRequestId === saveRequestIdRef.current) {
                setSaving(false);
            }
        }
    };

    // ─────────────────────────────────────────
    // UI
    // ─────────────────────────────────────────

    if (!canViewAttendanceSettings) return null;

    return (
        <div className="flex max-w-2xl flex-col gap-4">

            {/* COMPANY SELECTOR */}

            {isSuperAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Company</CardTitle>

                        <CardDescription>
                            Choose the company whose attendance settings
                            you want to manage.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <CompanySelector
                            selectedCompanyId={selectedCompanyId}
                            onCompanyChange={handleCompanyChange}
                        />
                    </CardContent>
                </Card>
            )}

            {/* LOADING */}

            {loading && (
                <div className="py-8 text-center text-muted-foreground">
                    Loading attendance settings...
                </div>
            )}

            {/* EMPTY STATE */}

            {!loading && !settings && (
                <div className="py-8 text-center text-muted-foreground">
                    {isSuperAdmin && !selectedCompanyId
                        ? "Select a company to view its attendance settings."
                        : "No attendance settings available."}
                </div>
            )}

            {/* ATTENDANCE SETTINGS */}

            {!loading && settings && (
                <Card className="transition-none duration-0 ease-none hover:opacity-100 hover:scale-100 active:scale-100">
                    <CardHeader>
                        <CardTitle>Attendance Settings</CardTitle>

                        <CardDescription>
                            Configure how attendance is calculated for your
                            company.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-5">

                        {/* LATE MARK TIME */}

                        <div>
                            <Label htmlFor="late-mark-time">
                                Late Mark Cutoff Time
                            </Label>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                <Input
                                    id="late-mark-time"
                                    type="time"
                                    disabled={!canEditAttendanceSettings}
                                    value={`${String(settings.lateMarkHour).padStart(2, "0")}:${String(settings.lateMarkMinute).padStart(2, "0")}`}
                                    onChange={(event) => {
                                        const [hour, minute] =
                                            event.target.value
                                                .split(":")
                                                .map(Number);

                                        if (
                                            !Number.isFinite(hour) ||
                                            !Number.isFinite(minute)
                                        ) {
                                            return;
                                        }

                                        setSettings((current) =>
                                            current
                                                ? {
                                                    ...current,
                                                    lateMarkHour: hour,
                                                    lateMarkMinute: minute,
                                                }
                                                : current
                                        );
                                    }}
                                    className="w-35"
                                />

                                <p className="text-xs text-muted-foreground">
                                    Employees punching in after this time
                                    will be marked late.
                                </p>
                            </div>
                        </div>

                        {/* DYNAMIC NUMBER FIELDS */}

                        {ATTENDANCE_FIELDS.map((field) => (
                            <div key={field.id}>
                                <Label htmlFor={field.id}>
                                    {field.label}
                                </Label>

                                <Input
                                    id={field.id}
                                    type={field.type}
                                    step={field.step}
                                    min={field.min}
                                    disabled={!canEditAttendanceSettings}
                                    value={settings[field.value]}
                                    onChange={(event) =>
                                        updateSettingField(
                                            field.value,
                                            Number(event.target.value)
                                        )
                                    }
                                    className={`mt-1 ${field.width}`}
                                />

                                <p className="mt-1 text-xs text-muted-foreground">
                                    {field.description}
                                </p>
                            </div>
                        ))}

                        {/* WEEK OFF DAYS */}

                        <div>
                            <Label>Week Off Days</Label>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                                {WEEK_DAYS.map((day) => (
                                    <div
                                        key={day.value}
                                        className="flex items-center gap-2"
                                    >
                                        <Checkbox
                                            id={`week-off-${day.value}`}
                                            checked={settings.weekOffDays.includes(
                                                day.value
                                            )}
                                            disabled={!canEditAttendanceSettings}
                                            onCheckedChange={() =>
                                                toggleWeekOff(day.value)
                                            }
                                        />

                                        <Label
                                            htmlFor={`week-off-${day.value}`}
                                            className="cursor-pointer font-normal"
                                        >
                                            {day.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Selected days will automatically show as
                                week off.
                            </p>
                        </div>

                        {/* SAVE BUTTON */}

                        {canEditAttendanceSettings && (
                            <Button
                                onClick={handleSave}
                                disabled={
                                    saving ||
                                    loading ||
                                    (isSuperAdmin && !selectedCompanyId)
                                }
                                className="w-fit"
                            >
                                {saving ? "Saving..." : "Save Settings"}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AttendanceSettings;
