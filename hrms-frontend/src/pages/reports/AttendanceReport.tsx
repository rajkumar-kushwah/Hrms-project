
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
import { getCompanies } from "@/services/company.service";
import { useAuthStore } from "@/store/auth.store";
import { isSuperAdminRole } from "@/utilis/roleUtils";


// Types

interface Company {
  id: string;
  name: string;
}

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

const BRANCH_COLUMNS: {
  label: string;
  get: (row: BranchRow) => number;
}[] = [
    { label: "Employees", get: (row) => row.employeeCount },
    { label: "Present", get: (row) => row.present },
    { label: "Late", get: (row) => row.late },
    { label: "Half-day", get: (row) => row.halfDay },
    { label: "Absent", get: (row) => row.absent },
    { label: "Leave", get: (row) => row.leave },
    { label: "Avg attendance %", get: (row) => row.avgAttendancePercent },
  ];

const EMPLOYEE_COLUMNS: {
  label: string;
  get: (row: EmployeeRow) => number;
}[] = [
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

const AttendanceReport = () => {
  const today = new Date();

  const [month, setMonth] = React.useState(today.getMonth() + 1);
  const [year, setYear] = React.useState(today.getFullYear());
  const [report, setReport] = React.useState<Report | null>(null);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = React.useState("");
  const [companiesLoading, setCompaniesLoading] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [isSpinning, setIsSpinning] = React.useState(false);

  // Adjust these selectors to match your existing auth store.
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = isSuperAdminRole(user?.role?.name);

  // Load company list only for Super Admin.
  React.useEffect(() => {
    if (!isSuperAdmin) return;

    let cancelled = false;

    const loadCompanies = async () => {
      setCompaniesLoading(true);

      try {
        const response = await getCompanies();
        const payload = response.data.data;

        const list: Company[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.companies)
            ? payload.companies
            : [];

        if (cancelled) return;

        setCompanies(list);

        if (list.length === 1) {
          setSelectedCompanyId(list[0].id);
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load companies.");
        }
      } finally {
        if (!cancelled) setCompaniesLoading(false);
      }
    };

    void loadCompanies();

    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin]);

  const loadReport = React.useCallback(async () => {
    if (isSuperAdmin && !selectedCompanyId) {
      setReport(null);
      return;
    }

    setLoading(true);

    try {
      const response = await getAttendanceReport({
        month,
        year,
        ...(isSuperAdmin ? { companyId: selectedCompanyId } : {}),
      });

      setReport(response.data.data ?? null);
    } catch (error: unknown) {
      setReport(null);

      const message =
        typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof error.response === "object" &&
          error.response !== null &&
          "data" in error.response &&
          typeof error.response.data === "object" &&
          error.response.data !== null &&
          "message" in error.response.data &&
          typeof error.response.data.message === "string"
          ? error.response.data.message
          : "Failed to load attendance report.";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [month, year, isSuperAdmin, selectedCompanyId]);

  React.useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = () => {
    if (!report) return;

    const toSheet = (rows: Record<string, string | number>[]) => {
      const sheet = XLSX.utils.json_to_sheet(rows);
      sheet["!cols"] = Object.keys(rows[0] ?? {}).map((key) => ({
        wch:
          Math.max(
            key.length,
            ...rows.map((row) => String(row[key] ?? "").length)
          ) + 2,
      }));
      return sheet;
    };

    const employeeRows = report.employees.map((employee) => ({
      Code: employee.employeeCode ?? "",
      Name: employee.name,
      Branch: employee.branchName,
      ...Object.fromEntries(
        EMPLOYEE_COLUMNS.map((column) => [
          column.label,
          column.get(employee),
        ])
      ),
      "Attendance %": employee.attendancePercent,
    }));

    const branchRows = report.byBranch.map((branch) => ({
      Branch: branch.name,
      ...Object.fromEntries(
        BRANCH_COLUMNS.map((column) => [
          column.label,
          column.get(branch),
        ])
      ),
    }));

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      toSheet(employeeRows),
      "Employees"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      toSheet(branchRows),
      "By Branch"
    );

    XLSX.writeFile(
      workbook,
      `attendance-report-${month}-${year}.xlsx`
    );
  };

  const handleRefresh = async () => {
    setIsSpinning(true);

    try {
      await Promise.all([
        loadReport(),
        new Promise((resolve) => setTimeout(resolve, 700)),
      ]);
    } finally {
      setIsSpinning(false);
    }
  };

  const cards = report
    ? [
      { label: "Employees", value: report.totals.employeeCount },
      {
        label: "Avg attendance",
        value: `${report.totals.avgAttendancePercent}%`,
      },
      { label: "Present days", value: report.totals.present },
      { label: "Late marks", value: report.totals.late },
      { label: "Absent days", value: report.totals.absent },
      { label: "Total hours", value: `${report.totals.totalHours}h` },
    ]
    : [];

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Monthly attendance summary, same rules as payroll
        </p>

        <Button className="cursor-pointer"
          variant="add"
          size="sm"
          onClick={handleRefresh}
          disabled={isSpinning || loading || (isSuperAdmin && !selectedCompanyId)}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isSpinning ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {isSuperAdmin && (
          <Select
            value={selectedCompanyId}
            onValueChange={setSelectedCompanyId}
            disabled={companiesLoading}
          >
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue
                placeholder={
                  companiesLoading ? "Loading companies..." : "Select company"
                }
              />
            </SelectTrigger>

            <SelectContent position="popper">
              {companies.map((company) => (
                <SelectItem className="cursor-pointer" key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={String(month)}
          onValueChange={(value) => setMonth(Number(value))}
        >
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

        <Select
          value={String(year)}
          onValueChange={(value) => setYear(Number(value))}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent position="popper">
            {getYearOptions().map((value) => (
              <SelectItem key={value} value={String(value)}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button className="cursor-pointer"
          variant="add"
          onClick={handleExport}
          disabled={!report || loading}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      {isSuperAdmin && !selectedCompanyId ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Select a company to view its attendance report.
        </div>
      ) : loading && !report ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading report...
        </div>
      ) : !report ? (
        <div className="py-12 text-center text-muted-foreground">
          No data available for this period.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            {cards.map((card) => (
              <Card key={card.label} className="p-3">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </Card>
            ))}
          </div>

          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/60 pt-16 backdrop-blur-[1px]">
                <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Refreshing report...
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="mb-2 text-sm font-medium">
                Branch-wise Summary
              </h3>

              <div className="overflow-x-auto rounded border bg-card">
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
                          className="py-6 text-center text-muted-foreground"
                        >
                          No data
                        </TableCell>
                      </TableRow>
                    ) : (
                      report.byBranch.map((branch) => (
                        <TableRow key={branch.name}>
                          <TableCell className="font-medium">
                            {branch.name}
                          </TableCell>
                          {BRANCH_COLUMNS.map((column) => (
                            <TableCell
                              key={column.label}
                              className="text-right"
                            >
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

            <div>
              <h3 className="mb-2 text-sm font-medium">
                Employee-wise Detail
              </h3>

              <div className="overflow-x-auto rounded border bg-card">
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
                          className="py-6 text-center text-muted-foreground"
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
                            <TableCell
                              key={column.label}
                              className="text-right"
                            >
                              {column.get(employee)}
                            </TableCell>
                          ))}

                          <TableCell className="text-right">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${percentClass(
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
