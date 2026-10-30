
import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    MapPin,
    RefreshCw,
    Users,
    Clock,
    LogIn,
    LogOut,
    Loader2,
    Search,
    Radio,
} from "lucide-react";
import { toast } from "sonner";

import type { Attendance } from "@/types/attendance.types";
import { getLiveAttendance } from "@/services/attendance.service";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/store/auth.store";
import { isSuperAdminRole } from "@/utilis/roleUtils";
import { CompanySelector } from "@/pages/common/CompanySelector";

const AttendanceLive = () => {
    const { user } = useAuthStore();

    const isSuperAdmin = isSuperAdminRole(user?.role?.name);

    const [attendances, setAttendances] = React.useState<Attendance[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);
    const [selectedCompanyId, setSelectedCompanyId] = React.useState("");
    const [search, setSearch] = React.useState("");

    const loadLiveAttendance = React.useCallback(async () => {
        if (isSuperAdmin && !selectedCompanyId) {
            setAttendances([]);
            setLastUpdated(null);
            return;
        }

        setLoading(true);

        try {
            const res = await getLiveAttendance(
                isSuperAdmin ? selectedCompanyId : undefined
            );

            setAttendances(res.data.data);
            setLastUpdated(new Date());
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to load live attendance";

            toast.error(message);
            setAttendances([]);
        } finally {
            setLoading(false);
        }
    }, [isSuperAdmin, selectedCompanyId]);

    // Initial load and automatic refresh every 60 seconds.
    React.useEffect(() => {
        if (isSuperAdmin && !selectedCompanyId) {
            setAttendances([]);
            setLastUpdated(null);
            return;
        }

        void loadLiveAttendance();

        const interval = window.setInterval(() => {
            void loadLiveAttendance();
        }, 60000);

        return () => window.clearInterval(interval);
    }, [loadLiveAttendance, isSuperAdmin, selectedCompanyId]);

    const formatTime = (dateString?: string) => {
        if (!dateString) return "—";

        return new Date(dateString).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    const getStatusColor = (status: string) => {
        if (status.startsWith("On Leave")) {
            return "bg-blue-100 text-blue-700 border-blue-200";
        }

        switch (status) {
            case "Present":
                return "bg-green-100 text-green-700 border-green-200";
            case "Late":
                return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "Half-day":
                return "bg-orange-100 text-orange-700 border-orange-200";
            case "Absent":
                return "bg-red-100 text-red-700 border-red-200";
            case "Week off":
                return "bg-gray-100 text-gray-700 border-gray-200";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const formatWorkingHours = (hours?: number | null) => {
        if (hours == null) return "—";

        return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m`;
    };

    // Attendance statistics
    const totalPunchedIn = attendances.length;

    const presentCount = attendances.filter(
        (a) => a.status === "Present"
    ).length;

    const lateCount = attendances.filter(
        (a) => a.status === "Late"
    ).length;

    const stillInCount = attendances.filter(
        (a) => a.punchInTime && !a.punchOutTime
    ).length;

    const punchedOutCount = attendances.filter(
        (a) => a.punchOutTime
    ).length;

    const noCompanySelected = isSuperAdmin && !selectedCompanyId;

    // Employee search
    const filteredAttendances = attendances.filter((att) => {
        const searchValue = search.trim().toLowerCase();

        if (!searchValue) return true;

        return (
            att.user?.name?.toLowerCase().includes(searchValue) ||
            att.user?.employeeCode?.toLowerCase().includes(searchValue) ||
            att.user?.designation?.toLowerCase().includes(searchValue) ||
            att.branch?.name?.toLowerCase().includes(searchValue) ||
            att.status?.toLowerCase().includes(searchValue)
        );
    });

    return (
        <div className="flex flex-col gap-4">

            {/* Company Selector */}
            {isSuperAdmin && (
                <CompanySelector
                    selectedCompanyId={selectedCompanyId || null}
                    onCompanyChange={(companyId) => {
                        setSelectedCompanyId(companyId);
                        setAttendances([]);
                        setLastUpdated(null);
                        setSearch("");
                    }}
                />
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Radio className="h-4 w-4 text-green-600" />
                        Live Attendance Tracking

                        <Badge className="bg-green-100 text-green-700 border-green-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse mr-1.5" />
                            LIVE
                        </Badge>
                    </h2>

                    <p className="text-xs text-muted-foreground mt-1">
                        {lastUpdated
                            ? `Last updated: ${lastUpdated.toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: true,
                            })} · Auto refreshes every 60 seconds`
                            : "Attendance updates automatically every 60 seconds"}
                    </p>
                </div>

                <Button
                    size="sm"
                    variant="add"
                    onClick={() => void loadLiveAttendance()}
                    disabled={loading || noCompanySelected}
                >
                    <RefreshCw
                        className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                </Button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                <Card className="p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Total Punched In
                    </p>
                    <p className="text-2xl font-semibold mt-1 tabular-nums">
                        {totalPunchedIn}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Present</p>
                    <p className="text-2xl font-semibold text-green-600 mt-1 tabular-nums">
                        {presentCount}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Late</p>
                    <p className="text-2xl font-semibold text-yellow-600 mt-1 tabular-nums">
                        {lateCount}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <LogIn className="h-3.5 w-3.5" />
                        Still In Office
                    </p>
                    <p className="text-2xl font-semibold text-blue-600 mt-1 tabular-nums">
                        {stillInCount}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <LogOut className="h-3.5 w-3.5" />
                        Punched Out
                    </p>
                    <p className="text-2xl font-semibold mt-1 tabular-nums">
                        {punchedOutCount}
                    </p>
                </Card>
            </div>

            {/* Attendance Table */}
            <Card className="overflow-hidden">

                {/* Table Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b">
                    <div>
                        <h3 className="text-sm font-semibold">
                            Employee Attendance
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Real-time employee punch activity
                        </p>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search employee..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9"
                            disabled={noCompanySelected}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[190px]">
                                    Employee
                                </TableHead>
                                <TableHead className="min-w-[130px]">
                                    Branch
                                </TableHead>
                                <TableHead className="min-w-[110px]">
                                    Punch In
                                </TableHead>
                                <TableHead className="min-w-[110px]">
                                    Punch Out
                                </TableHead>
                                <TableHead className="min-w-[120px]">
                                    Working Hours
                                </TableHead>
                                <TableHead className="min-w-[110px]">
                                    Status
                                </TableHead>
                                <TableHead className="min-w-[140px]">
                                    Geo Fence
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {noCompanySelected ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="text-center text-muted-foreground py-10"
                                    >
                                        <p className="text-sm">
                                            Select a company to view live attendance.
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : loading && attendances.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="text-center py-10"
                                    >
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm">
                                                Loading live attendance...
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredAttendances.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="text-center text-muted-foreground py-10"
                                    >
                                        <p className="text-sm">
                                            {attendances.length === 0
                                                ? "No attendance records for today yet."
                                                : "No matching employees found."}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAttendances.map((att) => (
                                    <TableRow key={att.id}>

                                        {/* Employee */}
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">
                                                    {att.user?.name ?? "—"}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {att.user?.employeeCode ?? "—"}
                                                    {att.user?.designation
                                                        ? ` · ${att.user.designation}`
                                                        : ""}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Branch */}
                                        <TableCell>
                                            <span className="text-sm">
                                                {att.branch?.name ?? "—"}
                                            </span>
                                        </TableCell>

                                        {/* Punch In */}
                                        <TableCell>
                                            <span className="text-sm font-medium tabular-nums">
                                                {formatTime(att.punchInTime)}
                                            </span>
                                        </TableCell>

                                        {/* Punch Out */}
                                        <TableCell>
                                            <span className="text-sm font-medium tabular-nums">
                                                {formatTime(att.punchOutTime)}
                                            </span>
                                        </TableCell>

                                        {/* Working Hours */}
                                        <TableCell>
                                            <span className="text-sm tabular-nums">
                                                {formatWorkingHours(att.workingHours)}
                                            </span>
                                        </TableCell>

                                        {/* Attendance Status */}
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={getStatusColor(att.status)}
                                            >
                                                {att.status}
                                            </Badge>
                                        </TableCell>

                                        {/* Geo Fence */}
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    att.isWithinGeoFence
                                                        ? "bg-green-100 text-green-700 border-green-200"
                                                        : "bg-red-100 text-red-700 border-red-200"
                                                }
                                            >
                                                <MapPin className="h-3 w-3 mr-1" />
                                                {att.isWithinGeoFence
                                                    ? "Inside"
                                                    : "Outside"}
                                            </Badge>
                                        </TableCell>

                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Table Footer */}
                {!noCompanySelected && !loading && attendances.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-t">
                        <p className="text-xs text-muted-foreground">
                            Showing {filteredAttendances.length} of{" "}
                            {attendances.length} attendance records
                        </p>

                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Next automatic refresh in 60 seconds
                        </p>
                    </div>
                )}

                {loading && attendances.length > 0 && (
                    <div className="flex items-center justify-center gap-2 border-t py-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Updating attendance...
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AttendanceLive;
