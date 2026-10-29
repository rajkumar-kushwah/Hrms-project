
import React from "react";
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
import { toast } from "sonner";

import { getSettings, updateSettings } from "@/services/settings.service";
import type { CompanySettings } from "@/types/settings.types";
import { useAuthStore } from "@/store/auth.store";
import { useCompanyStore } from "@/store/company.store";
import { CompanySelector } from "@/pages/common/CompanySelector";
import { isSuperAdminRole } from "@/utilis/roleUtils";

const weekDays = [
    { value: 0, label: "Sunday" },
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
];

const AttendanceSettings = () => {
    const { user } = useAuthStore();


    const [selectedCompanyId, setSelectedCompanyId] = React.useState("");

    const isSuperAdmin = isSuperAdminRole(user?.role?.name);

    const [settings, setSettings] =
        React.useState<CompanySettings | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    const requestIdRef = React.useRef(0);

    // Load settings whenever the company selection changes.
    React.useEffect(() => {
        const requestId = ++requestIdRef.current;

        const loadSettings = async () => {
            if (!user || (isSuperAdmin && !selectedCompanyId)) {
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
                toast.error("Failed to load attendance settings");
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
    }, [user, isSuperAdmin, selectedCompanyId]);

    const handleSave = async () => {
        if (!settings) return;

        if (isSuperAdmin && !selectedCompanyId) {
            toast.error("Please select a company");
            return;
        }

        const companyIdAtSubmit = selectedCompanyId;

        setSaving(true);

        try {
            const response = await updateSettings(
                {
                    lateMarkHour: settings.lateMarkHour,
                    lateMarkMinute: settings.lateMarkMinute,
                    halfDayHours: settings.halfDayHours,
                    defaultGeoRadius: settings.defaultGeoRadius,
                    weekOffDays: settings.weekOffDays,
                },
                isSuperAdmin ? companyIdAtSubmit : undefined
            );

            // Ignore a response belonging to a previous company selection.
            if (
                isSuperAdmin &&
                useCompanyStore.getState().selectedCompanyId !==
                companyIdAtSubmit
            ) {
                return;
            }

            setSettings(response.data.data);
            toast.success("Attendance settings updated successfully");
        } catch {
            if (
                isSuperAdmin &&
                useCompanyStore.getState().selectedCompanyId !==
                companyIdAtSubmit
            ) {
                return;
            }

            toast.error("Failed to update attendance settings");
        } finally {
            setSaving(false);
        }
    };

    const toggleWeekOff = (day: number) => {
        setSettings((current) => {
            if (!current) return current;

            const weekOffDays = current.weekOffDays.includes(day)
                ? current.weekOffDays.filter((value) => value !== day)
                : [...current.weekOffDays, day];

            return { ...current, weekOffDays };
        });
    };

    return (
        <div className="flex max-w-2xl flex-col gap-4">
            {isSuperAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Company</CardTitle>
                        <CardDescription>
                            Choose the company whose attendance settings you
                            want to manage.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <CompanySelector
                            selectedCompanyId={selectedCompanyId}
                            onCompanyChange={setSelectedCompanyId} />
                    </CardContent>
                </Card>
            )}

            {loading && (
                <div className="py-8 text-center text-muted-foreground">
                    Loading attendance settings...
                </div>
            )}

            {!loading && !settings && (
                <div className="py-8 text-center text-muted-foreground">
                    {isSuperAdmin && !selectedCompanyId
                        ? "Select a company to view its attendance settings."
                        : "No attendance settings available."}
                </div>
            )}

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
                        <div>
                            <Label htmlFor="late-mark-time">
                                Late Mark Cutoff Time
                            </Label>

                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                <Input
                                    id="late-mark-time"
                                    type="time"
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
                                    Employees punching in after this time will
                                    be marked late.
                                </p>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="half-day-hours">
                                Half Day Threshold (Hours)
                            </Label>
                            <Input
                                id="half-day-hours"
                                type="number"
                                step="0.5"
                                min={1}
                                value={settings.halfDayHours}
                                onChange={(event) =>
                                    setSettings((current) =>
                                        current
                                            ? {
                                                ...current,
                                                halfDayHours: Number(
                                                    event.target.value
                                                ),
                                            }
                                            : current
                                    )
                                }
                                className="mt-1 w-32"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Working hours below this threshold are marked
                                half-day.
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="geo-radius">
                                Default Geo Fence Radius (meters)
                            </Label>
                            <Input
                                id="geo-radius"
                                type="number"
                                min={10}
                                value={settings.defaultGeoRadius}
                                onChange={(event) =>
                                    setSettings((current) =>
                                        current
                                            ? {
                                                ...current,
                                                defaultGeoRadius: Number(
                                                    event.target.value
                                                ),
                                            }
                                            : current
                                    )
                                }
                                className="mt-1 w-32"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Default radius used when a branch has no
                                custom geo fence.
                            </p>
                        </div>

                        <div>
                            <Label>Week Off Days</Label>

                            <div className="mt-2 grid grid-cols-2 gap-2">
                                {weekDays.map((day) => (
                                    <div
                                        key={day.value}
                                        className="flex items-center gap-2"
                                    >
                                        <Checkbox
                                            id={`week-off-${day.value}`}
                                            checked={settings.weekOffDays.includes(
                                                day.value
                                            )}
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
                                Selected days will automatically show as week
                                off.
                            </p>
                        </div>

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
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AttendanceSettings;
