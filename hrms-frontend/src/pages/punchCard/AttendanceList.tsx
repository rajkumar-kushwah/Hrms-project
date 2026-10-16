// pages/attendance/MonthlySheet.tsx
//
// Backend contract (GET /attendance/monthly-sheet?month=9&year=2026):
// {
//   month: number,
//   year: number,
//   employees: [
//     {
//       userId: string,
//       name: string,
//       employeeCode: string | null,
//       branchName: string | null,
//       days: DayStatus[]   // index 0 = day 1, length = days in that month
//     }
//   ]
// }
//
// Day statuses must come from the SAME rules payroll uses, otherwise this
// sheet and the Payroll page will show different numbers for the same month.

import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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
  [key: string]: unknown;
}
interface SheetResponse {
    month: number;
    year: number;
    employees: SheetEmployee[];
}

// ─────────────────────────────────────────────
// Cell look
// ─────────────────────────────────────────────

const CELL: Record<DayStatus, { code: string; cls: string }> = {
    Present: { code: "P", cls: "bg-green-100 text-green-700" },
    Late: { code: "LT", cls: "bg-yellow-100 text-yellow-700" },
    "Half-day": { code: "HD", cls: "bg-orange-100 text-orange-700" },
    Absent: { code: "A", cls: "bg-red-100 text-red-700" },
    "Week Off": { code: "W", cls: "bg-gray-100 text-gray-600" },
    "Unpaid Week Off": { code: "WU", cls: "bg-red-50 text-red-600 border border-red-300" },
    Holiday: { code: "H", cls: "bg-purple-100 text-purple-700" },
    "Paid Leave": { code: "PL", cls: "bg-blue-100 text-blue-700" },
    "Unpaid Leave": { code: "UL", cls: "bg-rose-100 text-rose-700" },
    Future: { code: "–", cls: "text-muted-foreground" },
};

const LEGEND = (Object.keys(CELL) as DayStatus[]).filter((s) => s !== "Future");

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const WEEKDAY_LETTER = ["S", "M", "T", "W", "T", "F", "S"];

// ─────────────────────────────────────────────
// Totals — same components payroll adds up as "unpaid days":
// absent + unpaid leave + unpaid week off + half-day * 0.5
// ─────────────────────────────────────────────

const summarize = (days: DayStatus[]) => {
    const count = (status: DayStatus) => days.filter((d) => d === status).length;

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
        unpaidDays: absent + unpaidLeave + unpaidWeekOff + halfDay * 0.5,
    };
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

const MonthlySheet = () => {
    const navigate = useNavigate();
    const today = new Date();

    const [month, setMonth] = React.useState(today.getMonth() + 1);
    const [year, setYear] = React.useState(today.getFullYear());
    const [search, setSearch] = React.useState("");

    const [data, setData] = React.useState<SheetResponse | null>(null);
    const [loading, setLoading] = React.useState(true);


    React.useEffect(() => {
        // cancelled flag: month jaldi badalne par purana response naye ko overwrite na kare
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            try {
                const response = await getMonthlyAttendanceSheet(month, year);
                if (!cancelled) setData(response.data.data);
            } catch (error: any) {
                if (!cancelled) {
                    setData(null);
                    toast.error(error?.message || "Failed to load monthly sheet");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [month, year]);

    const shiftMonth = (delta: number) => {
        const next = new Date(year, month - 1 + delta, 1);
        setMonth(next.getMonth() + 1);
        setYear(next.getFullYear());
    };

    const daysInMonth = new Date(year, month, 0).getDate();
    const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

   const employees = React.useMemo<SheetEmployee[]>(() => {
  const query = search.trim().toLowerCase();

  let list: SheetEmployee[] = [];

  if (Array.isArray(data)) {
    // Employee ki personal attendance ko monthly row mein convert karo
    const records = data as MyAttendanceRecord[];

    const days: DayStatus[] = Array.from(
      { length: daysInMonth },
      (_, index) => {
        const day = index + 1;
        const currentDate = new Date(year, month - 1, day);
        const today = new Date();

        today.setHours(0, 0, 0, 0);

        if (currentDate > today) return "Future";

        return "Absent";
      }
    );

    for (const record of records) {
      const recordDate = new Date(record.date);

      if (
        recordDate.getMonth() !== month - 1 ||
        recordDate.getFullYear() !== year
      ) {
        continue;
      }

      const dayIndex = recordDate.getDate() - 1;

      const statusMap: Record<string, DayStatus> = {
        Present: "Present",
        Late: "Late",
        "Half-day": "Half-day",
        Absent: "Absent",
        "Week Off": "Week Off",
        Holiday: "Holiday",
        "Paid Leave": "Paid Leave",
        "Unpaid Leave": "Unpaid Leave",
      };

      days[dayIndex] = statusMap[record.status] ?? "Absent";
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
      (employee.employeeCode ?? "").toLowerCase().includes(query)
  );
}, [data, search, daysInMonth, month, year]);

    return (
        <div className="flex flex-col gap-4">

            {/* TOOLBAR */}
            <div className="flex items-center gap-3 flex-wrap">
                <Button variant="outline" size="icon" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                    <SelectTrigger className="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                        {MONTHS.map((label, index) => (
                            <SelectItem key={label} value={String(index + 1)}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value) || today.getFullYear())}
                    className="w-24"
                />

                <Button variant="outline" size="icon" onClick={() => shiftMonth(1)} aria-label="Next month">
                    <ChevronRight className="h-4 w-4" />
                </Button>

                <Input
                    placeholder="Search employee name or code..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64"
                />

                <span className="text-sm text-muted-foreground">
                    {employees.length} employees
                </span>
            </div>

            {/* LEGEND */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                {LEGEND.map((status) => (
                    <span key={status} className="flex items-center gap-1.5">
                        <span
                            className={`inline-flex h-5 min-w-6 items-center justify-center rounded px-1 text-[10px] font-medium ${CELL[status].cls}`}
                        >
                            {CELL[status].code}
                        </span>
                        {status}
                    </span>
                ))}
            </div>

            {/* SHEET */}
            <div className="bg-card rounded border w-full overflow-x-auto">
                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading monthly sheet...
                    </div>
                ) : employees.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                        No employees found
                    </div>
                ) : (
                    <table className="border-separate border-spacing-1 text-sm">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-10 bg-card min-w-52 px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                                    Employee
                                </th>

                                {dayNumbers.map((day) => (
                                    <th
                                        key={day}
                                        className="min-w-8 text-center text-xs font-medium text-muted-foreground"
                                    >
                                        <div>{day}</div>
                                        <div className="text-[10px] font-normal">
                                            {WEEKDAY_LETTER[new Date(year, month - 1, day).getDay()]}
                                        </div>
                                    </th>
                                ))}

                                <th className="px-2 text-center text-xs font-medium text-muted-foreground" title="Present (incl. late)">P</th>
                                <th className="px-2 text-center text-xs font-medium text-muted-foreground" title="Half-day">HD</th>
                                <th className="px-2 text-center text-xs font-medium text-muted-foreground" title="Absent">A</th>
                                <th className="px-2 text-center text-xs font-medium text-muted-foreground" title="Paid leave">PL</th>
                                <th className="px-2 text-center text-xs font-medium text-muted-foreground" title="Unpaid leave">UL</th>
                                <th className="px-2 text-center text-xs font-medium text-muted-foreground" title="Unpaid week off">WU</th>
                                <th
                                    className="px-2 text-center text-xs font-medium"
                                    title="Absent + unpaid leave + unpaid week off + half-day x 0.5 (same as payroll)"
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
                                        onClick={() => navigate(`/attendance/employee/${employee.userId}`)}
                                    >
                                        <td className="sticky left-0 z-10 bg-card px-3 py-2">
                                            <p className="font-medium">{employee.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {employee.employeeCode ?? "—"}
                                                {employee.branchName ? ` · ${employee.branchName}` : ""}
                                            </p>
                                        </td>

                                        {dayNumbers.map((day) => {
                                            const status = employee.days[day - 1] ?? "Future";
                                            const cell = CELL[status];

                                            return (
                                                <td key={day} className="text-center">
                                                    <div
                                                        title={`${day} ${MONTHS[month - 1]} · ${status}`}
                                                        className={`mx-auto flex h-7 w-7 items-center justify-center rounded text-[11px] font-medium ${cell.cls}`}
                                                    >
                                                        {cell.code}
                                                    </div>
                                                </td>
                                            );
                                        })}

                                        <td className="px-2 text-center">{totals.present}</td>
                                        <td className="px-2 text-center">{totals.halfDay}</td>
                                        <td className="px-2 text-center">{totals.absent}</td>
                                        <td className="px-2 text-center">{totals.paidLeave}</td>
                                        <td className="px-2 text-center">{totals.unpaidLeave}</td>
                                        <td className="px-2 text-center">{totals.unpaidWeekOff}</td>
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