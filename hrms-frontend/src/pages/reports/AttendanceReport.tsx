// pages/reports/AttendanceReport.tsx
import React from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { FileSpreadsheet, RefreshCw } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getAttendanceReport } from "@/services/attendanceReport.service";

// ─────────────────────────────────────────────
// Types (backend attendanceReport.service.ts ka response)
// ─────────────────────────────────────────────

interface Summary {
  employeeCount: number;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  leave: number;
  unpaidDays: number;
  totalHours: number;
  avgAttendancePercent: number;
}

interface BranchRow extends Summary {
  name: string;
}

interface EmployeeRow {
  userId: string;
  name: string;
  employeeCode: string | null;
  branchName: string;
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  paidLeave: number;
  unpaidLeave: number;
  weekOff: number;
  unpaidWeekOff: number;
  holiday: number;
  attendancePercent: number;
  unpaidDays: number;
  totalHours: number;
  avgHours: number;
}

interface Report {
  month: number;
  year: number;
  totals: Summary;
  byBranch: BranchRow[];
  employees: EmployeeRow[];
}

// ─────────────────────────────────────────────
// Columns (table aur Excel dono yahin se banate hain)
// ─────────────────────────────────────────────

const BRANCH_COLUMNS: { label: string; get: (row: BranchRow) => number }[] = [
  { label: "Employees", get: (row) => row.employeeCount },
  { label: "Present", get: (row) => row.present },
  { label: "Late", get: (row) => row.late },
  { label: "Half-day", get: (row) => row.halfDay },
  { label: "Absent", get: (row) => row.absent },
  { label: "Leave", get: (row) => row.leave },
  { label: "Avg attendance %", get: (row) => row.avgAttendancePercent },
];

const EMPLOYEE_COLUMNS: { label: string; get: (row: EmployeeRow) => number }[] = [
  { label: "Present", get: (row) => row.present },
  { label: "Late", get: (row) => row.late },
  { label: "Half-day", get: (row) => row.halfDay },
  { label: "Absent", get: (row) => row.absent },
  { label: "Leave", get: (row) => row.paidLeave + row.unpaidLeave },
  { label: "Week off", get: (row) => row.weekOff + row.unpaidWeekOff },
  { label: "Hours", get: (row) => row.totalHours },
  { label: "Avg hrs/day", get: (row) => row.avgHours },
  { label: "Unpaid days", get: (row) => row.unpaidDays },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, index) => currentYear - index);
};

const percentClass = (percent: number) =>
  percent >= 90
    ? "bg-green-100 text-green-700"
    : percent >= 75
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

const AttendanceReport = () => {
  const today = new Date();

  const [month, setMonth] = React.useState(today.getMonth() + 1);
  const [year, setYear] = React.useState(today.getFullYear());
  const [report, setReport] = React.useState<Report | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isSpinning, setIsSpinning] = React.useState(false);

  React.useEffect(() => {
    void loadReport();
  }, [month, year]);


  const loadReport = async () => {
    setLoading(true);

    try {
      const response = await getAttendanceReport({ month, year });
      setReport(response.data.data || null);
    } catch (error: any) {
      setReport(null);
      const message = error?.message || "Failed to load attendance report";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };



  const handleExport = () => {
    if (!report) return;

    const toSheet = (rows: Record<string, string | number>[]) => {
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = Object.keys(rows[0] ?? {}).map((key) => ({
        wch: Math.max(key.length, ...rows.map((row) => String(row[key] ?? "").length)) + 2,
      }));
      return sheet;
    };

    const employeeRows = report.employees.map((employee) => ({
      Code: employee.employeeCode ?? "",
      Name: employee.name,
      Branch: employee.branchName,
      ...Object.fromEntries(EMPLOYEE_COLUMNS.map((c) => [c.label, c.get(employee)])),
      "Attendance %": employee.attendancePercent,
    }));

    const branchRows = report.byBranch.map((branch) => ({
      Branch: branch.name,
      ...Object.fromEntries(BRANCH_COLUMNS.map((c) => [c.label, c.get(branch)])),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, toSheet(employeeRows), "Employees");
    XLSX.utils.book_append_sheet(workbook, toSheet(branchRows), "By Branch");
    XLSX.writeFile(workbook, `attendance-report-${month}-${year}.xlsx`);
  };

  const cards = report
    ? [
      { label: "Employees", value: report.totals.employeeCount },
      { label: "Avg attendance", value: `${report.totals.avgAttendancePercent}%` },
      { label: "Present days", value: report.totals.present },
      { label: "Late marks", value: report.totals.late },
      { label: "Absent days", value: report.totals.absent },
      { label: "Total hours", value: `${report.totals.totalHours}h` },
    ]
    : [];

  const handleRefresh = async () => {
    setIsSpinning(true);

    try {
      await Promise.all([
        loadReport(),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
    } finally {
      setIsSpinning(false);
    }
  };

  return (
    <div className="p-1 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">
          Monthly attendance summary, same rules as payroll
        </p>

        <div className="flex w-full justify-end">
          <Button
            variant="add"
            size="sm"
            onClick={handleRefresh}
            disabled={isSpinning}
            className="cursor-pointer"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isSpinning ? "animate-spin" : ""}`} />
            <span className={`ml-2 ${isSpinning ? "" : ""}`}>
              Refresh
            </span>
          </Button></div>
        <div className="flex flex-wrap items-center gap-2">

          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[145px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent position="popper">
              {MONTHS.map((label, index) => (
                <SelectItem key={label} value={String(index + 1)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent position="popper">
              {getYearOptions().map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="add" onClick={handleExport} disabled={!report || loading}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {!report && loading ? (
        <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading report...
        </div>
      ) : !report ? (
        <div className="text-center text-muted-foreground py-12">
          No data available for this period.
        </div>
      ) : (
        <>
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {cards.map((card) => (
              <Card key={card.label} className="p-3">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </Card>
            ))}
          </div>

          {/* TABLES */}
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/60 pt-16 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Refreshing report...
                </div>
              </div>
            )}

            {/* BRANCH-WISE */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Branch-wise Summary</h3>
              <div className="bg-card rounded border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Branch</TableHead>
                      {BRANCH_COLUMNS.map((column) => (
                        <TableHead key={column.label} className="text-right">
                          {column.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.byBranch.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={BRANCH_COLUMNS.length + 1}
                          className="text-center text-muted-foreground py-6"
                        >
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.byBranch.map((branch) => (
                        <TableRow key={branch.name}>
                          <TableCell className="font-medium">{branch.name}</TableCell>
                          {BRANCH_COLUMNS.map((column) => (
                            <TableCell key={column.label} className="text-right">
                              {column.get(branch)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* EMPLOYEE-WISE */}
            <div>
              <h3 className="text-sm font-medium mb-2">Employee-wise Detail</h3>
              <div className="bg-card rounded border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Branch</TableHead>
                      {EMPLOYEE_COLUMNS.map((column) => (
                        <TableHead key={column.label} className="text-right">
                          {column.label}
                        </TableHead>
                      ))}
                      <TableHead className="text-right">Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.employees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={EMPLOYEE_COLUMNS.length + 3}
                          className="text-center text-muted-foreground py-6"
                        >
                          No employees found
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.employees.map((employee) => (
                        <TableRow key={employee.userId}>
                          <TableCell>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {employee.employeeCode ?? "—"}
                            </p>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {employee.branchName}
                          </TableCell>
                          {EMPLOYEE_COLUMNS.map((column) => (
                            <TableCell key={column.label} className="text-right">
                              {column.get(employee)}
                            </TableCell>
                          ))}
                          <TableCell className="text-right">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${percentClass(
                                employee.attendancePercent
                              )}`}
                            >
                              {employee.attendancePercent}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceReport;