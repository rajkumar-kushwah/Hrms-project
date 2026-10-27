
import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { getEmployeeAttendance } from "@/services/attendance.service";
import type {
    Attendance,
    EmployeeBasicInfo,
} from "@/types/attendance.types";

const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
];

const statusBadge: Record<string, string> = {
    Present: "bg-green-100 text-green-700",
    Late: "bg-yellow-100 text-yellow-700",
    "Half-day": "bg-orange-100 text-orange-700",
    Absent: "bg-red-100 text-red-700",
    "Week Off": "bg-blue-100 text-blue-700",
    Holiday: "bg-purple-100 text-purple-700",
};

interface AttendanceRouteState {
    companyId?: string;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
}

const EmployeeAttendanceDetail = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const routeState =
        location.state as AttendanceRouteState | null;

    const companyId = routeState?.companyId;

    const [attendances, setAttendances] = React.useState<Attendance[]>([]);
    const [employee, setEmployee] =
        React.useState<EmployeeBasicInfo | null>(null);

    const [selectedMonth, setSelectedMonth] = React.useState(
        String(new Date().getMonth() + 1)
    );

    const [selectedYear, setSelectedYear] = React.useState(
        String(new Date().getFullYear())
    );

    const [statusFilter, setStatusFilter] = React.useState("all");
    const [tableLoading, setTableLoading] = React.useState(true);

    React.useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            if (!userId) {
                setAttendances([]);
                setEmployee(null);
                setTableLoading(false);
                return;
            }

            setTableLoading(true);

            try {
                const res = await getEmployeeAttendance(
                    userId,
                    Number(selectedMonth),
                    Number(selectedYear),
                    companyId
                );

                if (cancelled) return;

                setAttendances(res.data.data.attendance ?? []);
                setEmployee(res.data.data.employee ?? null);
            } catch (error: unknown) {
                if (cancelled) return;

                const apiError = error as ApiError;

                toast.error(
                    apiError.response?.data?.message ??
                    apiError.message ??
                    "Failed to load attendance"
                );

                setAttendances([]);
                setEmployee(null);
            } finally {
                if (!cancelled) {
                    setTableLoading(false);
                }
            }
        };

        void loadData();

        return () => {
            cancelled = true;
        };
    }, [userId, selectedMonth, selectedYear, companyId]);

    const filterAttendances = attendances.filter(
        (attendance) =>
            statusFilter === "all" ||
            attendance.status === statusFilter
    );

    const formatTime = (dateString?: string | null) => {
        if (!dateString) return "—";

        return new Date(dateString).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    const formatWorkingHours = (hours?: number | null) => {
        if (hours == null || !Number.isFinite(hours)) return "—";

        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);

        return `${h}h ${m}m`;
    };

    const totalPresent = attendances.filter(
        (attendance) => attendance.status === "Present"
    ).length;

    const totalLate = attendances.filter(
        (attendance) => attendance.status === "Late"
    ).length;

    const totalAbsent = attendances.filter(
        (attendance) => attendance.status === "Absent"
    ).length;

    const totalHours = attendances.reduce(
        (total, attendance) =>
            total + (attendance.workingHours ?? 0),
        0
    );

    const getInitials = (name?: string | null) =>
        name
            ?.split(" ")
            .map((part) => part[0])
            .join("")
            .toUpperCase() ?? "?";

    return (
        <div className="flex flex-col gap-4">
            <Button
                variant="add"
                size="sm"
                className="w-fit cursor-pointer"
                onClick={() => navigate(-1)}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Attendance List
            </Button>

            {employee && (
                <Card className="flex gap-4 border-border bg-card p-4 text-card-foreground transition-none duration-0 ease-none hover:scale-100 hover:opacity-100 active:scale-100">
                    <Avatar className="h-14 w-14">
                        <AvatarFallback>
                            {getInitials(employee.name)}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                        <p className="font-semibold">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">
                            {employee.employeeCode} •{" "}
                            {employee.designation ?? "—"} •{" "}
                            {employee.branch?.name ?? "—"}
                        </p>
                    </div>
                </Card>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                >
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>

                    <SelectContent position="popper">
                        {months.map((month) => (
                            <SelectItem
                                key={month.value}
                                value={month.value}
                            >
                                {month.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Input
                    type="number"
                    value={selectedYear}
                    onChange={(event) =>
                        setSelectedYear(event.target.value)
                    }
                    className="w-24"
                />

                <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                >
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>

                    <SelectContent position="popper">
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Present">Present</SelectItem>
                        <SelectItem value="Late">Late</SelectItem>
                        <SelectItem value="Half-day">Half-day</SelectItem>
                        <SelectItem value="Absent">Absent</SelectItem>
                        <SelectItem value="Week Off">Week Off</SelectItem>
                        <SelectItem value="Holiday">Holiday</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">
                        Present
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                        {totalPresent}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">
                        Late
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                        {totalLate}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">
                        Absent
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                        {totalAbsent}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">
                        Total Hours
                    </p>
                    <p className="text-2xl font-bold">
                        {totalHours.toFixed(1)}h
                    </p>
                </Card>
            </div>

            <div className="grid w-full grid-cols-1 overflow-x-auto rounded border bg-card">
                <div className="p-4">
                    <h3 className="text-lg font-semibold">
                        Monthly Attendance {selectedMonth}-{selectedYear}
                    </h3>
                </div>

                <Table className="table-auto">
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Punch In</TableHead>
                            <TableHead>Punch Out</TableHead>
                            <TableHead>Working Hours</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Geo Fence</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {tableLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="h-32 text-center"
                                >
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        Loading attendance...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filterAttendances.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="py-8 text-center text-muted-foreground"
                                >
                                    No records for this month
                                </TableCell>
                            </TableRow>
                        ) : (
                            filterAttendances.map((attendance, index) => (
                                <TableRow key={attendance.id}>
                                    <TableCell>{index + 1}</TableCell>

                                    <TableCell>
                                        {new Date(
                                            attendance.date
                                        ).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            weekday: "short",
                                        })}
                                    </TableCell>

                                    <TableCell>
                                        {formatTime(attendance.punchInTime)}
                                    </TableCell>

                                    <TableCell>
                                        {formatTime(attendance.punchOutTime)}
                                    </TableCell>

                                    <TableCell>
                                        {formatWorkingHours(
                                            attendance.workingHours
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <Badge
                                            className={
                                                statusBadge[attendance.status] ??
                                                "bg-gray-100 text-gray-700"
                                            }
                                        >
                                            {attendance.status}
                                        </Badge>
                                    </TableCell>

                                    <TableCell>
                                        {attendance.punchInTime ? (
                                            <Badge
                                                className={
                                                    attendance.isWithinGeoFence
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                }
                                            >
                                                {attendance.isWithinGeoFence
                                                    ? "Inside"
                                                    : "Outside"}
                                            </Badge>
                                        ) : (
                                            "—"
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default EmployeeAttendanceDetail;
