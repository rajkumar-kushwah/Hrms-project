
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getSettings, updateSettings } from "@/services/settings.service";
import { getCompanies } from "@/services/company.service";
import type { CompanySettings } from "@/types/settings.types";
import { useAuthStore } from "@/store/auth.store";
import { isSuperAdminRole } from "@/utilis/roleUtils";

type CompanyOption = {
    id: string;
    name: string;
};

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
    const isSuperAdmin = isSuperAdminRole(user?.role?.name);

    const [companies, setCompanies] = React.useState<CompanyOption[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = React.useState("");
    const [settings, setSettings] = React.useState<CompanySettings | null>(null);
    const [loadingCompanies, setLoadingCompanies] = React.useState(isSuperAdmin);
    const [loading, setLoading] = React.useState(!isSuperAdmin);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (isSuperAdmin) {
            void loadCompanies();
        } else {
            void loadSettings();
        }
    }, [isSuperAdmin]);

    const loadCompanies = async () => {
        setLoadingCompanies(true);
        try {
            const res = await getCompanies();
            const list: CompanyOption[] = Array.isArray(res.data.data)
                ? res.data.data
                    .filter(
                        (company: { id?: string; name?: string }) =>
                            typeof company.id === "string" &&
                            typeof company.name === "string"
                    )
                    .map((company: { id: string; name: string }) => ({
                        id: company.id,
                        name: company.name,
                    }))
                : [];

            setCompanies(list);

            if (list.length === 0) {
                toast.info("No companies found");
            }
        } catch {
            toast.error("Failed to load companies");
        } finally {
            setLoadingCompanies(false);
        }
    };

    const loadSettings = async (companyId?: string) => {
        setLoading(true);
        setSettings(null);

        try {
            const res = await getSettings(companyId);
            setSettings(res.data.data);
        } catch {
            toast.error("Failed to load attendance settings");
        } finally {
            setLoading(false);
        }
    };

    const handleCompanyChange = (companyId: string) => {
        setSelectedCompanyId(companyId);
        void loadSettings(companyId);
    };

    const handleSave = async () => {
        if (!settings) return;

        if (isSuperAdmin && !selectedCompanyId) {
            toast.error("Please select a company");
            return;
        }

        setSaving(true);

        try {
            const res = await updateSettings(
                {
                    lateMarkHour: settings.lateMarkHour,
                    lateMarkMinute: settings.lateMarkMinute,
                    halfDayHours: settings.halfDayHours,
                    defaultGeoRadius: settings.defaultGeoRadius,
                    weekOffDays: settings.weekOffDays,
                },
                isSuperAdmin ? selectedCompanyId : undefined
            );

            setSettings(res.data.data);
            toast.success("Attendance settings updated successfully");
        } catch {
            toast.error("Failed to update attendance settings");
        } finally {
            setSaving(false);
        }
    };

    const toggleWeekOff = (day: number) => {
        if (!settings) return;

        const updated = settings.weekOffDays.includes(day)
            ? settings.weekOffDays.filter((value) => value !== day)
            : [...settings.weekOffDays, day];

        setSettings({ ...settings, weekOffDays: updated });
    };

    if (loadingCompanies) {
        return (
            <div className="py-8 text-center text-muted-foreground">
                Loading companies...
            </div>
        );
    }

    return (
        <div className="flex max-w-2xl flex-col gap-4">
            {isSuperAdmin && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Company</CardTitle>
                        <CardDescription>
                            Choose the company whose attendance settings you want to manage.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select
                            value={selectedCompanyId}
                            onValueChange={handleCompanyChange}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a company" />
                            </SelectTrigger>
                            <SelectContent position="popper">
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
                            Configure how attendance is calculated for your company.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-col gap-5">
                        <div>
                            <Label>Late Mark Cutoff Time</Label>
                            <div className="mt-1 flex items-center gap-2">
                                <Input
                                    type="time"
                                    value={`${String(settings.lateMarkHour).padStart(2, "0")}:${String(settings.lateMarkMinute).padStart(2, "0")}`}
                                    onChange={(event) => {
                                        const [hour, minute] = event.target.value
                                            .split(":")
                                            .map(Number);

                                        setSettings({
                                            ...settings,
                                            lateMarkHour: hour,
                                            lateMarkMinute: minute,
                                        });
                                    }}
                                    className="w-35"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Employees punching in after this time will be marked late.
                                </p>
                            </div>
                        </div>

                        <div>
                            <Label>Half Day Threshold (Hours)</Label>
                            <Input
                                type="number"
                                step="0.5"
                                min={1}
                                value={settings.halfDayHours}
                                onChange={(event) =>
                                    setSettings({
                                        ...settings,
                                        halfDayHours: Number(event.target.value),
                                    })
                                }
                                className="mt-1 w-32"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Working hours below this threshold are marked half-day.
                            </p>
                        </div>

                        <div>
                            <Label>Default Geo Fence Radius (meters)</Label>
                            <Input
                                type="number"
                                min={10}
                                value={settings.defaultGeoRadius}
                                onChange={(event) =>
                                    setSettings({
                                        ...settings,
                                        defaultGeoRadius: Number(event.target.value),
                                    })
                                }
                                className="mt-1 w-32"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                                Default radius used when a branch has no custom geo fence.
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
                                            checked={settings.weekOffDays.includes(day.value)}
                                            onCheckedChange={() => toggleWeekOff(day.value)}
                                        />
                                        <Label
                                            className="cursor-pointer font-normal"
                                            onClick={() => toggleWeekOff(day.value)}
                                        >
                                            {day.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Selected days will automatically show as week off.
                            </p>
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={
                                saving ||
                                (isSuperAdmin && !selectedCompanyId)
                            }
                            className="w-fit cursor-pointer"
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
