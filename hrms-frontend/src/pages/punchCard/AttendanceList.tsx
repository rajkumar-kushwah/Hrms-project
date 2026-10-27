
// pages/attendance/MonthlySheet.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
    ChevronLeft,
    ChevronRight,
    Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { getMonthlyAttendanceSheet } from "@/services/attendance.service";
import { getCompanies } from "@/services/company.service";
import { useAuthStore } from "@/store/auth.store";

// --------------------------------------------------
// Types
// --------------------------------------------------

type DayStatus =
    | "Present"
    | "Late"
    | "Half-day"
    | "Absent"
    | "Week Off"
    | "Unpaid Week Off"
    | "Holiday"
    | "Paid Leave"
    | "Unpaid Leave"
    | "Future";

interface SheetEmployee {
    userId: string;
    name: string;
    employeeCode: string | null;
    branchName: string | null;
    days: DayStatus[];
}

interface MyAttendanceRecord {
    id: string;
    userId: string;
    date: string;
    status: string;
    holidayName?: string;
}

interface SheetResponse {
    month: number;
    year: number;
    employees: SheetEmployee[];
}

interface CompanyOption {
    id: string;
    name: string;
}

interface ApiError {
    response?: {
        data?: {
            message?: string;
        };
    };
    message?: string;
}

// --------------------------------------------------
// Constants
// --------------------------------------------------

const CELL: Record<DayStatus, { code: string; cls: string }> = {
    Present: {
        code: "P",
        cls: "bg-green-100 text-green-700",
    },
    Late: {
        code: "LT",
        cls: "bg-yellow-100 text-yellow-700",
    },
    "Half-day": {
        code: "HD",
        cls: "bg-orange-100 text-orange-700",
    },
    Absent: {
        code: "A",
        cls: "bg-red-100 text-red-700",
    },
    "Week Off": {
        code: "W",
        cls: "bg-gray-100 text-gray-600",
    },
    "Unpaid Week Off": {
        code: "WU",
        cls: "bg-red-50 text-red-600 border border-red-300",
    },
    Holiday: {
        code: "H",
        cls: "bg-purple-100 text-purple-700",
    },
    "Paid Leave": {
        code: "PL",
        cls: "bg-blue-100 text-blue-700",
    },
    "Unpaid Leave": {
        code: "UL",
        cls: "bg-rose-100 text-rose-700",
    },
    Future: {
        code: "–",
        cls: "text-muted-foreground",
    },
};

const LEGEND = (Object.keys(CELL) as DayStatus[]).filter(
    (status) => status !== "Future"
);

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const WEEKDAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const getErrorMessage = (
    error: unknown,
    fallback: string
): string => {
    const apiError = error as ApiError;

    return (
        apiError.response?.data?.message ??
        apiError.message ??
        fallback
    );
};

const summarize = (days: DayStatus[]) => {
    const count = (status: DayStatus) =>
        days.filter((day) => day === status).length;

    const halfDay = count("Half-day");
    const absent = count("Absent");
    const unpaidLeave = count("Unpaid Leave");
    const unpaidWeekOff = count("Unpaid Week Off");

    return {
        present: count("Present") + count("Late"),
        halfDay,
        absent,
        paidLeave: count("Paid Leave"),
        unpaidLeave,
        unpaidWeekOff,
        unpaidDays:
            absent +
            unpaidLeave +
            unpaidWeekOff +
            halfDay * 0.5,
    };
};

// --------------------------------------------------
// Component
// --------------------------------------------------

const MonthlySheet = () => {
    const navigate = useNavigate();
    const today = new Date();

    const user = useAuthStore((state) => state.user);

    const roleName = String(user?.role?.name ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    const isSuperAdmin = roleName === "super_admin";

    const [month, setMonth] = React.useState(
        today.getMonth() + 1
    );
    const [year, setYear] = React.useState(
        today.getFullYear()
    );
    const [search, setSearch] = React.useState("");

    const [companies, setCompanies] = React.useState<CompanyOption[]>(
        []
    );
    const [selectedCompanyId, setSelectedCompanyId] =
        React.useState("");

    const [companiesLoading, setCompaniesLoading] =
        React.useState(false);

    const [data, setData] = React.useState<
        SheetResponse | MyAttendanceRecord[] | null
    >(null);

    const [loading, setLoading] = React.useState(true);

    // ----------------------------------------------
    // Fetch companies for Super Admin
    // ----------------------------------------------

    React.useEffect(() => {
        if (!isSuperAdmin) {
            setCompanies([]);
            setSelectedCompanyId("");
            return;
        }

        let cancelled = false;

        const loadCompanies = async () => {
            setCompaniesLoading(true);

            try {
                const response = await getCompanies();

                // Expected response: { success, data: [...] }
                const companyList: CompanyOption[] =
                    response.data.data ?? [];

                if (cancelled) return;

                setCompanies(companyList);
                setSelectedCompanyId("");
                // Select the first company by default.

            } catch (error: unknown) {
                if (!cancelled) {
                    setCompanies([]);
                    setSelectedCompanyId("");

                    toast.error(
                        getErrorMessage(
                            error,
                            "Failed to load companies"
                        )
                    );
                }
            } finally {
                if (!cancelled) {
                    setCompaniesLoading(false);
                }
            }
        };

        void loadCompanies();

        return () => {
            cancelled = true;
        };
    }, [isSuperAdmin]);

    // ----------------------------------------------
    // Fetch monthly attendance
    // ----------------------------------------------

    React.useEffect(() => {
        let cancelled = false;

        const loadAttendance = async () => {
            // Super Admin must select a company first.
            if (isSuperAdmin && !selectedCompanyId) {
                setData(null);
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const response = await getMonthlyAttendanceSheet(
                    month,
                    year,
                    isSuperAdmin ? selectedCompanyId : undefined
                );

                if (!cancelled) {
                    setData(response.data.data);
                }
            } catch (error: unknown) {
                if (!cancelled) {
                    setData(null);

                    toast.error(
                        getErrorMessage(
                            error,
                            "Failed to load monthly sheet"
                        )
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        // Wait until company loading finishes.
        if (isSuperAdmin && companiesLoading) {
            setLoading(true);
            return () => {
                cancelled = true;
            };
        }

        void loadAttendance();

        return () => {
            cancelled = true;
        };
    }, [
        month,
        year,
        isSuperAdmin,
        selectedCompanyId,
        companiesLoading,
    ]);

    // ----------------------------------------------
    // Month navigation
    // ----------------------------------------------

    const shiftMonth = (delta: number) => {
        const next = new Date(year, month - 1 + delta, 1);

        setMonth(next.getMonth() + 1);
        setYear(next.getFullYear());
    };

    const daysInMonth = new Date(year, month, 0).getDate();

    const dayNumbers = Array.from(
        { length: daysInMonth },
        (_, index) => index + 1
    );

    // ----------------------------------------------
    // Prepare employee rows
    // ----------------------------------------------

    const employees = React.useMemo<SheetEmployee[]>(() => {
        const query = search.trim().toLowerCase();

        let list: SheetEmployee[] = [];

        if (Array.isArray(data)) {
            // Personal attendance response for employees.
            const records = data as MyAttendanceRecord[];

            const days: DayStatus[] = Array.from(
                { length: daysInMonth },
                (_, index) => {
                    const currentDate = new Date(
                        year,
                        month - 1,
                        index + 1
                    );

                    const currentDay = new Date();
                    currentDay.setHours(0, 0, 0, 0);

                    return currentDate > currentDay
                        ? "Future"
                        : "Absent";
                }
            );

            const statusMap: Record<string, DayStatus> = {
                Present: "Present",
                Late: "Late",
                "Half-day": "Half-day",
                Absent: "Absent",
                "Week Off": "Week Off",
                "Unpaid Week Off": "Unpaid Week Off",
                Holiday: "Holiday",
                "Paid Leave": "Paid Leave",
                "Unpaid Leave": "Unpaid Leave",
            };

            for (const record of records) {
                const recordDate = new Date(record.date);

                if (
                    recordDate.getMonth() !== month - 1 ||
                    recordDate.getFullYear() !== year
                ) {
                    continue;
                }

                const dayIndex = recordDate.getDate() - 1;

                if (dayIndex >= 0 && dayIndex < days.length) {
                    days[dayIndex] =
                        statusMap[record.status] ?? "Absent";
                }
            }

            const firstRecord = records[0];

            if (firstRecord) {
                list = [
                    {
                        userId: firstRecord.userId,
                        name: "My Attendance",
                        employeeCode: null,
                        branchName: null,
                        days,
                    },
                ];
            }
        } else {
            list = data?.employees ?? [];
        }

        if (!query) return list;

        return list.filter(
            (employee) =>
                employee.name.toLowerCase().includes(query) ||
                (employee.employeeCode ?? "")
                    .toLowerCase()
                    .includes(query)
        );
    }, [data, search, daysInMonth, month, year]);

    // ----------------------------------------------
    // Render
    // ----------------------------------------------

    return (
        <div className="flex flex-col gap-4">
            {/* TOOLBAR */}
            <div className="flex flex-wrap items-center gap-3">
                {isSuperAdmin && (
                    <Select
                        value={selectedCompanyId}
                        onValueChange={setSelectedCompanyId}
                        disabled={
                            companiesLoading ||
                            companies.length === 0
                        }
                    >
                        <SelectTrigger className="w-56">
                            <SelectValue
                                placeholder={
                                    companiesLoading
                                        ? "Loading companies..."
                                        : "Select company"
                                }
                            />
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
                )}

                <Button
                    variant="add"
                    size="icon"
                    onClick={() => shiftMonth(-1)}
                    aria-label="Previous month"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <Select
                    value={String(month)}
                    onValueChange={(value) =>
                        setMonth(Number(value))
                    }
                >
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>

                    <SelectContent position="popper">
                        {MONTHS.map((label, index) => (
                            <SelectItem
                                key={label}
                                value={String(index + 1)}
                            >
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Input
                    type="number"
                    value={year}
                    onChange={(event) =>
                        setYear(
                            Number(event.target.value) ||
                            today.getFullYear()
                        )
                    }
                    className="w-24"
                />

                <Button
                    variant="add"
                    size="icon"
                    onClick={() => shiftMonth(1)}
                    aria-label="Next month"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                <Input
                    type="search"
                    name="employee-search"
                    autoComplete="off"
                    placeholder="Search employee name or code..."
                    value={search}
                    onChange={(event) =>
                        setSearch(event.target.value)
                    }
                    className="w-64"
                />

                <span className="text-sm text-muted-foreground">
                    {employees.length} employees
                </span>
            </div>

            {/* LEGEND */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {LEGEND.map((status) => (
                    <span
                        key={status}
                        className="flex items-center gap-1.5"
                    >
                        <span
                            className={`inline-flex h-5 min-w-6 items-center justify-center rounded px-1 text-[10px] font-medium ${CELL[status].cls}`}
                        >
                            {CELL[status].code}
                        </span>

                        {status}
                    </span>
                ))}
            </div>

            {/* MONTHLY SHEET */}
            <div className="w-full overflow-x-auto rounded border bg-card">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading monthly sheet...
                    </div>
                ) : isSuperAdmin && !selectedCompanyId ? (
                    <div className="py-12 text-center text-muted-foreground">
                        {companies.length === 0
                            ? "No companies available"
                            : "Please select a company"}
                    </div>
                ) : employees.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        No employees found
                    </div>
                ) : (
                    <table className="border-separate border-spacing-1 text-sm">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-10 min-w-52 bg-card px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                                    Employee
                                </th>

                                {dayNumbers.map((day) => (
                                    <th
                                        key={day}
                                        className="min-w-8 text-center text-xs font-medium text-muted-foreground"
                                    >
                                        <div>{day}</div>
                                        <div className="text-[10px] font-normal">
                                            {
                                                WEEKDAY_LETTER[
                                                new Date(
                                                    year,
                                                    month - 1,
                                                    day
                                                ).getDay()
                                                ]
                                            }
                                        </div>
                                    </th>
                                ))}

                                <th
                                    className="px-2 text-center text-xs font-medium text-muted-foreground"
                                    title="Present including late"
                                >
                                    P
                                </th>
                                <th
                                    className="px-2 text-center text-xs font-medium text-muted-foreground"
                                    title="Half-day"
                                >
                                    HD
                                </th>
                                <th
                                    className="px-2 text-center text-xs font-medium text-muted-foreground"
                                    title="Absent"
                                >
                                    A
                                </th>
                                <th
                                    className="px-2 text-center text-xs font-medium text-muted-foreground"
                                    title="Paid leave"
                                >
                                    PL
                                </th>
                                <th
                                    className="px-2 text-center text-xs font-medium text-muted-foreground"
                                    title="Unpaid leave"
                                >
                                    UL
                                </th>
                                <th
                                    className="px-2 text-center text-xs font-medium text-muted-foreground"
                                    title="Unpaid week off"
                                >
                                    WU
                                </th>
                                <th
                                    className="px-2 text-center text-xs font-medium text-muted-foreground"
                                    title="Absent + unpaid leave + unpaid week off + half-day x 0.5"
                                >
                                    Unpaid
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {employees.map((employee) => {
                                const totals = summarize(employee.days);

                                return (
                                    <tr
                                        key={employee.userId}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() =>
                                            navigate(`/attendance/employee/${employee.userId}`, {
                                                state: {
                                                    companyId: isSuperAdmin
                                                        ? selectedCompanyId
                                                        : undefined,
                                                },
                                            })
                                        }
                                    >
                                        <td className="sticky left-0 z-10 bg-card px-3 py-2">
                                            <p className="font-medium">
                                                {employee.name}
                                            </p>

                                            <p className="text-xs text-muted-foreground">
                                                {employee.employeeCode ?? "—"}
                                                {employee.branchName
                                                    ? ` · ${employee.branchName}`
                                                    : ""}
                                            </p>
                                        </td>

                                        {dayNumbers.map((day) => {
                                            const status =
                                                employee.days[day - 1] ??
                                                "Future";

                                            const cell = CELL[status];

                                            return (
                                                <td
                                                    key={day}
                                                    className="text-center"
                                                >
                                                    <div
                                                        title={`${day} ${MONTHS[month - 1]} · ${status}`}
                                                        className={`mx-auto flex h-7 w-7 items-center justify-center rounded text-[11px] font-medium ${cell.cls}`}
                                                    >
                                                        {cell.code}
                                                    </div>
                                                </td>
                                            );
                                        })}

                                        <td className="px-2 text-center">
                                            {totals.present}
                                        </td>
                                        <td className="px-2 text-center">
                                            {totals.halfDay}
                                        </td>
                                        <td className="px-2 text-center">
                                            {totals.absent}
                                        </td>
                                        <td className="px-2 text-center">
                                            {totals.paidLeave}
                                        </td>
                                        <td className="px-2 text-center">
                                            {totals.unpaidLeave}
                                        </td>
                                        <td className="px-2 text-center">
                                            {totals.unpaidWeekOff}
                                        </td>
                                        <td className="px-2 text-center font-semibold text-red-600">
                                            {totals.unpaidDays}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default MonthlySheet;
