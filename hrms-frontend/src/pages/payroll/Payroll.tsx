
import { useEffect, useMemo, useRef, useState } from "react";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";

import type { PayrollSummary } from "@/types/payroll.types";
import { getPayrollSummary } from "@/services/payroll.service";
import { useAuthStore } from "@/store/auth.store";
import { useCompanyStore } from "@/store/company.store";

import PayrollTable from "./Payrolltable";

const formatCurrency = (amount: number) =>
    `₹${Math.round(amount).toLocaleString("en-IN")}`;

const STATUS_STYLES: Record<string, string> = {
    DRAFT: "bg-gray-200 text-gray-700",
    CONFIRMED: "bg-yellow-100 text-yellow-700",
    PAID: "bg-green-100 text-green-700",
};

const StatusBadge = ({ status }: { status: string }) => (
    <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            STATUS_STYLES[status] ?? "bg-gray-200 text-gray-700"
        }`}
    >
        {status}
    </span>
);

const Payroll = () => {
    const { user } = useAuthStore();

    const selectedCompanyId = useCompanyStore(
        (state) => state.selectedCompanyId
    );

    const roleName = user?.role?.name
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    const isSuperAdmin = roleName === "super_admin";

    const currentDate = new Date();

    const [search, setSearch] = useState("");
    const [month, setMonth] = useState(currentDate.getMonth() + 1);
    const [year, setYear] = useState(currentDate.getFullYear());

    const [payrollData, setPayrollData] = useState<PayrollSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [reloadKey, setReloadKey] = useState(0);

    const requestIdRef = useRef(0);

    // Fetch payroll for the current company and period.
    useEffect(() => {
        const requestId = ++requestIdRef.current;

        const loadPayroll = async () => {
            if (!user || (isSuperAdmin && !selectedCompanyId)) {
                setPayrollData([]);
                setSelectedIds(new Set());
                setLoading(false);
                return;
            }

            setLoading(true);
            setPayrollData([]);
            setSelectedIds(new Set());

            try {
                const response = await getPayrollSummary(
                    month,
                    year,
                    isSuperAdmin ? selectedCompanyId : undefined
                );

                if (requestId !== requestIdRef.current) return;

                // Ignore results if the Super Admin changed companies.
                if (
                    isSuperAdmin &&
                    useCompanyStore.getState().selectedCompanyId !==
                        selectedCompanyId
                ) {
                    return;
                }

                setPayrollData(response.data.data ?? []);
            } catch (error: unknown) {
                if (requestId !== requestIdRef.current) return;

                if (
                    isSuperAdmin &&
                    useCompanyStore.getState().selectedCompanyId !==
                        selectedCompanyId
                ) {
                    return;
                }

                const responseMessage =
                    typeof error === "object" &&
                    error !== null &&
                    "response" in error
                        ? (
                              error as {
                                  response?: {
                                      data?: { message?: string };
                                  };
                              }
                          ).response?.data?.message
                        : undefined;

                toast.error(
                    responseMessage ??
                        (error instanceof Error
                            ? error.message
                            : "Failed to load payroll.")
                );

                setPayrollData([]);
                setSelectedIds(new Set());
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        };

        void loadPayroll();

        return () => {
            requestIdRef.current += 1;
        };
    }, [
        user,
        month,
        year,
        isSuperAdmin,
        selectedCompanyId,
        reloadKey,
    ]);

    const filteredEmployees = useMemo(() => {
        const searchValue = search.toLowerCase().trim();

        if (!searchValue) return payrollData;

        return payrollData.filter(
            (employee) =>
                employee.user.name.toLowerCase().includes(searchValue) ||
                (employee.user.employeeCode ?? "")
                    .toLowerCase()
                    .includes(searchValue) ||
                (employee.user.designation ?? "")
                    .toLowerCase()
                    .includes(searchValue)
        );
    }, [payrollData, search]);

    const filteredEmployeeIds = useMemo(
        () => filteredEmployees.map((employee) => employee.userId),
        [filteredEmployees]
    );

    const allFilteredSelected =
        filteredEmployeeIds.length > 0 &&
        filteredEmployeeIds.every((id) => selectedIds.has(id));

    const toggleSelectAll = () => {
        setSelectedIds((previous) => {
            const next = new Set(previous);

            if (allFilteredSelected) {
                filteredEmployeeIds.forEach((id) => next.delete(id));
            } else {
                filteredEmployeeIds.forEach((id) => next.add(id));
            }

            return next;
        });
    };

    const toggleEmployee = (userId: string) => {
        setSelectedIds((previous) => {
            const next = new Set(previous);

            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }

            return next;
        });
    };

    const selectedDraftEmployees = useMemo(
        () =>
            payrollData.filter(
                (employee) =>
                    selectedIds.has(employee.userId) &&
                    employee.status === "DRAFT"
            ),
        [payrollData, selectedIds]
    );

    const selectedConfirmedEmployees = useMemo(
        () =>
            payrollData.filter(
                (employee) =>
                    selectedIds.has(employee.userId) &&
                    employee.status === "CONFIRMED"
            ),
        [payrollData, selectedIds]
    );

    const selectedDraftIds = useMemo(
        () => selectedDraftEmployees.map((employee) => employee.userId),
        [selectedDraftEmployees]
    );

    const selectedConfirmedIds = useMemo(
        () =>
            selectedConfirmedEmployees.map((employee) => employee.userId),
        [selectedConfirmedEmployees]
    );

    const payrollSummary = useMemo(
        () =>
            payrollData.reduce(
                (acc, employee) => {
                    acc.totalEmployees += 1;
                    acc.totalGrossSalary += employee.grossSalary;
                    acc.totalHolidayDays += employee.holidayDays;
                    acc.totalUnpaidLeaveDays += employee.unpaidLeaveDays;
                    acc.totalDeduction += employee.deductionAmount;
                    acc.totalNetSalary += employee.netSalary;
                    acc.absentDays += employee.absentDays;

                    return acc;
                },
                {
                    totalEmployees: 0,
                    totalGrossSalary: 0,
                    totalHolidayDays: 0,
                    totalUnpaidLeaveDays: 0,
                    totalDeduction: 0,
                    totalNetSalary: 0,
                    absentDays: 0,
                }
            ),
        [payrollData]
    );

    return (
        <div className="space-y-6 p-1">
            <div>
                <p className="text-sm text-muted-foreground">
                    Manage employee salary and payroll
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">
                        Total Employees
                    </p>
                    <p className="text-2xl font-bold">
                        {payrollSummary.totalEmployees}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">
                        Gross Salary
                    </p>
                    <p className="text-2xl font-bold">
                        {formatCurrency(payrollSummary.totalGrossSalary)}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Holiday</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {payrollSummary.totalHolidayDays}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">
                        Unpaid Leave
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                        {payrollSummary.totalUnpaidLeaveDays}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">
                        Absent Days
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                        {payrollSummary.absentDays}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">
                        Total Deduction
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(payrollSummary.totalDeduction)}
                    </p>
                </Card>

                <Card className="p-3">
                    <p className="text-xs text-muted-foreground">
                        Net Payable
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(payrollSummary.totalNetSalary)}
                    </p>
                </Card>
            </div>

            <div className="flex items-center justify-between gap-3">
                <div className="relative w-full max-w-sm">
                    <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        type="search"
                        name="payroll-search"
                        autoComplete="off"
                        placeholder="Search employee..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <PayrollTable
                selectedIds={selectedIds}
                month={month}
                year={year}
                onMonthChange={setMonth}
                onYearChange={setYear}
                isSuperAdmin={isSuperAdmin}
                selectedDraftEmployees={selectedDraftEmployees}
                selectedConfirmedEmployees={selectedConfirmedEmployees}
                selectedDraftIds={selectedDraftIds}
                selectedConfirmedIds={selectedConfirmedIds}
                onActionComplete={() =>
                    setReloadKey((previous) => previous + 1)
                }
            />

            {isSuperAdmin && !selectedCompanyId && (
                <p className="text-sm text-muted-foreground">
                    Please select a company to view payroll.
                </p>
            )}

            <div className="grid w-full grid-cols-1 overflow-x-auto rounded border bg-card">
                <Table className="table-auto">
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <button
                                    type="button"
                                    onClick={toggleSelectAll}
                                    disabled={
                                        loading ||
                                        filteredEmployeeIds.length === 0
                                    }
                                    className={`flex h-4 w-4 items-center justify-center rounded-sm border transition-colors ${
                                        allFilteredSelected
                                            ? "border-[var(--themePrimary)] bg-[var(--themePrimary)] text-white"
                                            : "border-input bg-background"
                                    }`}
                                    aria-label="Select all employees"
                                >
                                    {allFilteredSelected && (
                                        <Check className="h-3 w-3" />
                                    )}
                                </button>
                            </TableHead>
                            <TableHead>Employee</TableHead>
                            <TableHead>Designation</TableHead>
                            <TableHead>Gross Salary</TableHead>
                            <TableHead>Working Days</TableHead>
                            <TableHead>Holiday Days</TableHead>
                            <TableHead>Present Days</TableHead>
                            <TableHead>Paid Leave</TableHead>
                            <TableHead>Unpaid Leave</TableHead>
                            <TableHead>Absent Days</TableHead>
                            <TableHead>Deduction</TableHead>
                            <TableHead>Net Salary</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={13}
                                    className="py-8 text-center text-muted-foreground"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        Loading payroll...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredEmployees.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={13}
                                    className="py-8 text-center text-muted-foreground"
                                >
                                    {isSuperAdmin && !selectedCompanyId
                                        ? "Select a company to view payroll."
                                        : "No employees found."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEmployees.map((employee) => {
                                const isSelected = selectedIds.has(
                                    employee.userId
                                );

                                return (
                                    <TableRow
                                        key={employee.userId}
                                        className={
                                            isSelected ? "bg-muted/50" : ""
                                        }
                                    >
                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleEmployee(
                                                        employee.userId
                                                    )
                                                }
                                                className={`flex h-4 w-4 items-center justify-center rounded-sm border transition-colors ${
                                                    isSelected
                                                        ? "border-[var(--themePrimary)] bg-[var(--themePrimary)] text-white"
                                                        : "border-input bg-background"
                                                }`}
                                                aria-label={`Select ${employee.user.name}`}
                                            >
                                                {isSelected && (
                                                    <Check className="h-3 w-3" />
                                                )}
                                            </button>
                                        </TableCell>

                                        <TableCell>
                                            <p className="font-medium">
                                                {employee.user.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {employee.user.employeeCode}
                                            </p>
                                        </TableCell>

                                        <TableCell>
                                            {employee.user.designation ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency(employee.grossSalary)}
                                        </TableCell>
                                        <TableCell>
                                            {employee.totalWorkingDays}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">
                                                {employee.holidayDays || 0}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {employee.presentDays} /{" "}
                                            {employee.totalWorkingDays}
                                        </TableCell>
                                        <TableCell>
                                            {employee.paidLeaveDays}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    employee.unpaidLeaveDays > 0
                                                        ? "destructive"
                                                        : "secondary"
                                                }
                                            >
                                                {employee.unpaidLeaveDays} days
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {employee.absentDays}
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency(
                                                employee.deductionAmount
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-semibold">
                                                {formatCurrency(employee.netSalary)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={employee.status} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default Payroll;
