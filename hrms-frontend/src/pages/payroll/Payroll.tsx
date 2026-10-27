
import { useCallback, useEffect, useMemo, useState } from "react";

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
import { getCompanies } from "@/services/company.service";
import { getPayrollSummary } from "@/services/payroll.service";
import { useAuthStore } from "@/store/auth.store";

import PayrollTable, {
    type PayrollCompany,
} from "./Payrolltable";

// Currency formatter
const formatCurrency = (amount: number) =>
    `₹${Math.round(amount).toLocaleString("en-IN")}`;

// Status badge
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

type CompanyApiResponse = {
    id: string;
    name: string;
};

const Payroll = () => {
    const { user } = useAuthStore();

    const isSuperAdmin =
        user?.role?.name?.trim().toLowerCase().replace(/\s+/g, "_") ===
        "super_admin";

    const currentDate = new Date();

    const [search, setSearch] = useState("");

    const [month, setMonth] = useState(currentDate.getMonth() + 1);
    const [year, setYear] = useState(currentDate.getFullYear());

    const [payrollData, setPayrollData] = useState<PayrollSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [companies, setCompanies] = useState<PayrollCompany[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState("");
    const [companiesLoading, setCompaniesLoading] = useState(false);

    // Load companies for Super Admin
    useEffect(() => {
        if (!isSuperAdmin) {
            setCompanies([]);
            setSelectedCompanyId("");
            return;
        }

        let cancelled = false;

        const fetchCompanies = async () => {
            setCompaniesLoading(true);

            try {
                const response = await getCompanies();

                const result = response.data as
                    | CompanyApiResponse[]
                    | {
                          data?: CompanyApiResponse[];
                      };

                const companyList = Array.isArray(result)
                    ? result
                    : Array.isArray(result.data)
                      ? result.data
                      : [];

                if (!cancelled) {
                    setCompanies(
                        companyList.filter(
                            (company) =>
                                typeof company.id === "string" &&
                                typeof company.name === "string",
                        ),
                    );
                }
            } catch (error: unknown) {
                if (!cancelled) {
                    const message =
                        error instanceof Error
                            ? error.message
                            : "Unable to load companies.";

                    toast.error(message);
                    setCompanies([]);
                }
            } finally {
                if (!cancelled) {
                    setCompaniesLoading(false);
                }
            }
        };

        void fetchCompanies();

        return () => {
            cancelled = true;
        };
    }, [isSuperAdmin]);

    // Load payroll whenever company, month, or year changes
    const fetchPayroll = useCallback(async () => {
        if (isSuperAdmin && !selectedCompanyId) {
            setPayrollData([]);
            setSelectedIds(new Set());
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);

        try {
            const response = await getPayrollSummary(
                month,
                year,
                isSuperAdmin ? selectedCompanyId : undefined,
            );

            if (!cancelled) {
                setPayrollData(response.data.data ?? []);
                setSelectedIds(new Set());
            }
        } catch (error: unknown) {
            if (!cancelled) {
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

                const message =
                    responseMessage ??
                    (error instanceof Error
                        ? error.message
                        : "Failed to load payroll.");

                toast.error(message);
                setPayrollData([]);
                setSelectedIds(new Set());
            }
        } finally {
            if (!cancelled) {
                setLoading(false);
            }
        }

        return () => {
            cancelled = true;
        };
    }, [month, year, isSuperAdmin, selectedCompanyId]);

    useEffect(() => {
        let cancelled = false;

        const loadPayroll = async () => {
            if (isSuperAdmin && !selectedCompanyId) {
                setPayrollData([]);
                setSelectedIds(new Set());
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const response = await getPayrollSummary(
                    month,
                    year,
                    isSuperAdmin ? selectedCompanyId : undefined,
                );

                if (!cancelled) {
                    setPayrollData(response.data.data ?? []);
                    setSelectedIds(new Set());
                }
            } catch (error: unknown) {
                if (!cancelled) {
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
                                : "Failed to load payroll."),
                    );

                    setPayrollData([]);
                    setSelectedIds(new Set());
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadPayroll();

        return () => {
            cancelled = true;
        };
    }, [month, year, isSuperAdmin, selectedCompanyId]);

    // Filter employees
    const filteredEmployees = useMemo(() => {
        const searchValue = search.toLowerCase().trim();

        if (!searchValue) {
            return payrollData;
        }

        return payrollData.filter((emp) =>
            emp.user.name.toLowerCase().includes(searchValue) ||
            (emp.user.employeeCode ?? "")
                .toLowerCase()
                .includes(searchValue) ||
            (emp.user.designation ?? "")
                .toLowerCase()
                .includes(searchValue),
        );
    }, [payrollData, search]);

    // Employee selection
    const filteredEmployeeIds = useMemo(
        () => filteredEmployees.map((employee) => employee.userId),
        [filteredEmployees],
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

    // Selected employees by payroll status
    const selectedDraftEmployees = useMemo(
        () =>
            payrollData.filter(
                (emp) =>
                    selectedIds.has(emp.userId) && emp.status === "DRAFT",
            ),
        [payrollData, selectedIds],
    );

    const selectedConfirmedEmployees = useMemo(
        () =>
            payrollData.filter(
                (emp) =>
                    selectedIds.has(emp.userId) &&
                    emp.status === "CONFIRMED",
            ),
        [payrollData, selectedIds],
    );

    const selectedDraftIds = useMemo(
        () => selectedDraftEmployees.map((emp) => emp.userId),
        [selectedDraftEmployees],
    );

    const selectedConfirmedIds = useMemo(
        () => selectedConfirmedEmployees.map((emp) => emp.userId),
        [selectedConfirmedEmployees],
    );

    // Payroll summary cards
    const payrollSummary = useMemo(
        () =>
            payrollData.reduce(
                (acc, emp) => {
                    acc.totalEmployees += 1;
                    acc.totalGrossSalary += emp.grossSalary;
                    acc.totalHolidayDays += emp.holidayDays;
                    acc.totalUnpaidLeaveDays += emp.unpaidLeaveDays;
                    acc.totalDeduction += emp.deductionAmount;
                    acc.totalNetSalary += emp.netSalary;
                    acc.absentDays += emp.absentDays;

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
                },
            ),
        [payrollData],
    );

    // UI
    return (
        <div className="space-y-6 p-1">
            {/* Header */}
            <div>
                <p className="text-sm text-muted-foreground">
                    Manage employee salary and payroll
                </p>
            </div>

            {/* Summary cards */}
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
                    <p className="text-xs text-muted-foreground">
                        Holiday
                    </p>
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

            {/* Search */}
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

            {/* Company selection and payroll actions */}
            <PayrollTable
                selectedIds={selectedIds}
                month={month}
                year={year}
                onMonthChange={setMonth}
                onYearChange={setYear}
                companies={companies}
                selectedCompanyId={selectedCompanyId}
                onCompanyChange={(companyId) => {
                    setSelectedCompanyId(companyId);
                    setSelectedIds(new Set());
                }}
                isSuperAdmin={isSuperAdmin}
                selectedDraftEmployees={selectedDraftEmployees}
                selectedConfirmedEmployees={selectedConfirmedEmployees}
                selectedDraftIds={selectedDraftIds}
                selectedConfirmedIds={selectedConfirmedIds}
                onActionComplete={() => {
                    // The effect reloads payroll when its filters change.
                    // This callback also needs to refresh after payroll actions.
                    void fetchPayroll();
                }}
            />

            {isSuperAdmin && !selectedCompanyId && (
                <p className="text-sm text-muted-foreground">
                    {companiesLoading
                        ? "Loading companies..."
                        : "Please select a company to view payroll."}
                </p>
            )}

            {/* Payroll table */}
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
                                        ? "Select a company to view payroll"
                                        : "No employees found"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredEmployees.map((emp) => {
                                const isSelected = selectedIds.has(emp.userId);

                                return (
                                    <TableRow
                                        key={emp.userId}
                                        className={
                                            isSelected ? "bg-muted/50" : ""
                                        }
                                    >
                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleEmployee(emp.userId)
                                                }
                                                className={`flex h-4 w-4 items-center justify-center rounded-sm border transition-colors ${
                                                    isSelected
                                                        ? "border-[var(--themePrimary)] bg-[var(--themePrimary)] text-white"
                                                        : "border-input bg-background"
                                                }`}
                                                aria-label={`Select ${emp.user.name}`}
                                            >
                                                {isSelected && (
                                                    <Check className="h-3 w-3" />
                                                )}
                                            </button>
                                        </TableCell>

                                        <TableCell>
                                            <p className="font-medium">
                                                {emp.user.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {emp.user.employeeCode}
                                            </p>
                                        </TableCell>

                                        <TableCell>
                                            {emp.user.designation ?? "—"}
                                        </TableCell>

                                        <TableCell>
                                            {formatCurrency(emp.grossSalary)}
                                        </TableCell>

                                        <TableCell>
                                            {emp.totalWorkingDays}
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="secondary">
                                                {emp.holidayDays || 0}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            {emp.presentDays} /{" "}
                                            {emp.totalWorkingDays}
                                        </TableCell>

                                        <TableCell>
                                            {emp.paidLeaveDays}
                                        </TableCell>

                                        <TableCell>
                                            <Badge
                                                variant={
                                                    emp.unpaidLeaveDays > 0
                                                        ? "destructive"
                                                        : "secondary"
                                                }
                                            >
                                                {emp.unpaidLeaveDays} days
                                            </Badge>
                                        </TableCell>

                                        <TableCell>{emp.absentDays}</TableCell>

                                        <TableCell>
                                            {formatCurrency(
                                                emp.deductionAmount,
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <span className="font-semibold">
                                                {formatCurrency(emp.netSalary)}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge status={emp.status} />
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
