import React from "react";
import {
  MoreVertical,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useAuthStore } from "@/store/auth.store";
import type {
  Employee,
  EmployeeDetail,
} from "@/types/employee.types";

import {
  getEmployees,
  resetEmployeePassword,
  updateEmployee,
} from "@/services/employee.service";

import AddEmployeeDialog from "@/pages/AddEmployeeDialog";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { isAdminRole } from "@/utilis/roleUtils";
import { startOnboarding } from "@/services/onboarding.service";
import { Textarea } from "@/components/ui/textarea";

const EmployeeList = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Super Admin / Company Admin can activate/deactivate
  const canChangeStatus = isAdminRole(user?.role?.name);

  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [open, setOpen] = React.useState(false);

  // Selected employee is only used for status dialog
  const [selectedEmployee, setSelectedEmployee] =
    React.useState<EmployeeDetail | null>(null);

  const [statusDialogOpen, setStatusDialogOpen] =
    React.useState(false);

  const [editEmployee, setEditEmployee] =
    React.useState<EmployeeDetail | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);

  const [resetOpen, setResetOpen] = React.useState(false);

  const [selectedForReset, setSelectedForReset] =
    React.useState<Employee | null>(null);

  const [newPassword, setNewPassword] =
    React.useState("");

  const [searchQuery, setSearchQuery] =
    React.useState("");

  const [statusFilter, setStatusFilter] =
    React.useState("all");

  const [branchFilter, setBranchFilter] =
    React.useState("all");

  const [roleFilter, setRoleFilter] =
    React.useState("all");

  const [startDialogOpen, setStartDialogOpen] =
    React.useState(false);

  const [selectedOnboardingEmployee, setSelectedOnboardingEmployee] =
    React.useState<EmployeeDetail | null>(null);

  const [targetDate, setTargetDate] =
    React.useState("");

  const [notes, setNotes] =
    React.useState("");

  React.useEffect(() => {
    loadEmployees();
  }, []);

  // --------------------------------------------------
  // Load Employees
  // --------------------------------------------------

  const loadEmployees = async () => {
    try {
      const res = await getEmployees();

      setEmployees(res.data.data);
    } catch (err: any) {
      const message = err?.message ||
        "Failed to load employees";

      toast.error(message);
    }
  };

  // --------------------------------------------------
  // Reset Employee Password
  // --------------------------------------------------

  const handleResetPassword = async () => {
    if (!selectedForReset) return;

    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      await resetEmployeePassword(
        selectedForReset.id,
        newPassword
      );

      toast.success("Password reset successfully!");

      setResetOpen(false);
      setNewPassword("");
      setSelectedForReset(null);
    } catch (err: any) {
      const message = err?.message || "Failed to reset password";

      toast.error(message);
    }
  };

  // --------------------------------------------------
  // Start Onboarding
  // --------------------------------------------------

  const handleStartOnboarding = async () => {
    if (!selectedOnboardingEmployee) return;

    try {
      await startOnboarding(
        selectedOnboardingEmployee.id,
        {
          targetDate: targetDate || undefined,
          notes: notes.trim() || undefined,
        }
      );

      toast.success("Onboarding started successfully");

      // Update employee list immediately
      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === selectedOnboardingEmployee.id
            ? {
              ...employee,
              onboarding: {
                status: "IN_PROGRESS",
                currentStage: "OFFER",
                progressPercent: 0,
                targetDate: targetDate || null,
              },
            }
            : employee
        )
      );

      setStartDialogOpen(false);
      setSelectedOnboardingEmployee(null);
      setTargetDate("");
      setNotes("");
    } catch (err: any) {
      const message = err?.message || "Failed to start onboarding";

      toast.error(message);
    }
  };

  // --------------------------------------------------
  // Activate / Deactivate Employee
  // --------------------------------------------------

  const handleToggleStatus = async () => {
    if (!selectedEmployee) return;

    try {
      await updateEmployee(
        selectedEmployee.id,
        {
          isActive: !selectedEmployee.isActive,
        }
      );

      toast.success(
        `Employee ${!selectedEmployee.isActive
          ? "activated"
          : "deactivated"
        } successfully!`
      );

      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === selectedEmployee.id
            ? {
              ...employee,
              isActive: !employee.isActive,
            }
            : employee
        )
      );

      setStatusDialogOpen(false);
      setSelectedEmployee(null);
    } catch (err: any) {
      const message = err?.message || "Failed to update employee";

      toast.error(message);
    }
  };

  // --------------------------------------------------
  // Edit Employee
  // --------------------------------------------------

  const handleEditClick = async (id: string) => {
    try {
      const res = await import("@/services/employee.service").then(
        (module) => module.getEmployeeById(id)
      );

      setEditEmployee(res.data.data);
      setEditOpen(true);
    } catch (err: any) {
      const message = err?.message || "Failed to load employee details";

      toast.error(message);
    }
  };

  // --------------------------------------------------
  // View Employee Details
  // --------------------------------------------------

  const handleViewDetails = (id: string) => {
    navigate(`/employee/${id}`);
  };

  // --------------------------------------------------
  // Filter Employees
  // --------------------------------------------------

  const filteredEmployees = employees.filter((emp) => {
    const matchSearch = searchQuery
      ? emp.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (emp.employeeCode ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      emp.email
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
      : true;

    const matchStatus =
      statusFilter !== "all"
        ? statusFilter === "active"
          ? emp.isActive
          : !emp.isActive
        : true;

    const matchBranch =
      branchFilter !== "all"
        ? emp.branch?.id === branchFilter
        : true;

    const matchRole =
      roleFilter !== "all"
        ? emp.role?.id === Number(roleFilter)
        : true;

    return (
      matchSearch &&
      matchStatus &&
      matchBranch &&
      matchRole
    );
  });

  // --------------------------------------------------
  // Employee Created
  // --------------------------------------------------

  const handleEmployeeCreated = (
    newEmployee: Employee
  ) => {
    setEmployees((prev) => [
      newEmployee,
      ...prev,
    ]);

    setOpen(false);
  };

  // --------------------------------------------------
  // LIST VIEW
  // --------------------------------------------------

  return (
    <div className="flex flex-col gap-4">

      {/* Filters + Add Employee */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">

          {/* Search */}
          <Input
            type="search"
            name="employee-search"
            placeholder="Search name, code or email..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            autoComplete="off"
            className="w-64"
          />

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent position="popper">
              <SelectItem value="all">
                All Status
              </SelectItem>

              <SelectItem value="active">
                Active
              </SelectItem>

              <SelectItem value="inactive">
                Inactive
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Branch Filter */}
          <Select
            value={branchFilter}
            onValueChange={setBranchFilter}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>

            <SelectContent position="popper">
              <SelectItem value="all">
                All Branches
              </SelectItem>

              {[
                ...new Map(
                  employees
                    .filter((employee) => employee.branch)
                    .map((employee) => [
                      employee.branch!.id,
                      employee.branch,
                    ])
                ).values(),
              ].map((branch) => (
                <SelectItem
                  key={branch!.id}
                  value={branch!.id}
                >
                  {branch!.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Role Filter */}
          <Select
            value={roleFilter}
            onValueChange={setRoleFilter}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>

            <SelectContent position="popper">
              <SelectItem value="all">
                All Roles
              </SelectItem>

              {[
                ...new Map(
                  employees
                    .filter((employee) => employee.role)
                    .map((employee) => [
                      employee.role!.id,
                      employee.role,
                    ])
                ).values(),
              ].map((role) => (
                <SelectItem
                  key={role!.id}
                  value={String(role!.id)}
                >
                  {role!.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Add Employee */}
        {canChangeStatus && (
          <Button
            size="sm"
            variant="add"
            onClick={() => setOpen(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        )}
      </div>

      {/* Add Employee Dialog */}
      <AddEmployeeDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleEmployeeCreated}
      />

      {/* Edit Employee Dialog */}
      <AddEmployeeDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={(updated) => {
          setEmployees((prev) =>
            prev.map((employee) =>
              employee.id === updated.id
                ? updated
                : employee
            )
          );

          setEditOpen(false);
          setEditEmployee(null);
        }}
        editEmployee={editEmployee}
      />

      {/* Activate / Deactivate Dialog */}
      <Dialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Update Employee
            </DialogTitle>

            <DialogDescription>
              You are about to{" "}
              <strong className="font-semibold">
                {selectedEmployee?.isActive
                  ? "deactivate"
                  : "activate"}
              </strong>{" "}
              <strong>
                {selectedEmployee?.name}
              </strong>
              {selectedEmployee?.isActive
                ? " You can activate it again later."
                : " You can deactivate it again later."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() =>
                setStatusDialogOpen(false)
              }
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleToggleStatus}
            >
              {selectedEmployee?.isActive
                ? "Deactivate"
                : "Activate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Start Onboarding Dialog */}
      <Dialog
        open={startDialogOpen}
        onOpenChange={setStartDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Start Onboarding
            </DialogTitle>

            <DialogDescription>
              Set the expected completion date and add
              onboarding notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">

            {/* Target Date */}
            <div className="space-y-2">
              <Label>
                Target Date
              </Label>

              <Input
                type="date"
                value={targetDate}
                onChange={(e) =>
                  setTargetDate(e.target.value)
                }
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>
                Notes
              </Label>

              <Textarea
                placeholder="Enter onboarding notes..."
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setStartDialogOpen(false)
              }
            >
              Cancel
            </Button>

            <Button
              onClick={handleStartOnboarding}
            >
              Start Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={resetOpen}
        onOpenChange={setResetOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reset Password —{" "}
              {selectedForReset?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Label>
              New Password
            </Label>

            <Input
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(e.target.value)
              }
            />

            <Button
              variant="add"
              onClick={handleResetPassword}
            >
              Reset Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Table */}
      <div className="bg-card grid grid-cols-1 rounded border w-full overflow-hidden">
        <div className="h-full overflow-auto">
          <Table>

            <TableHeader className="bg-muted sticky top-0 z-10">
              <TableRow>

                <TableHead>
                  #
                </TableHead>

                <TableHead className="min-w-25">
                  Code
                </TableHead>

                <TableHead className="min-w-37.5">
                  Name
                </TableHead>

                <TableHead className="min-w-45">
                  Email
                </TableHead>

                <TableHead className="min-w-30">
                  Designation
                </TableHead>

                <TableHead className="min-w-30">
                  Branch
                </TableHead>

                <TableHead className="min-w-30">
                  Category
                </TableHead>

                <TableHead className="min-w-25">
                  Role
                </TableHead>

                {canChangeStatus && (
                  <TableHead className="min-w-37.5">
                    Company
                  </TableHead>
                )}

                <TableHead className="min-w-20">
                  Status
                </TableHead>

                <TableHead>
                  Onboarding
                </TableHead>

                <TableHead className="sticky right-0 bg-muted">
                  Actions
                </TableHead>

              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredEmployees.map(
                (emp, index) => (
                  <TableRow key={emp.id}>

                    <TableCell>
                      {index + 1}
                    </TableCell>

                    <TableCell>
                      {emp.employeeCode ?? "—"}
                    </TableCell>

                    <TableCell>
                      {emp.name}
                    </TableCell>

                    <TableCell>
                      {emp.email}
                    </TableCell>

                    <TableCell>
                      {emp.designation ?? "—"}
                    </TableCell>

                    <TableCell>
                      {emp.branch?.name ?? "—"}
                    </TableCell>

                    <TableCell>
                      {emp.category?.name ?? "—"}
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline">
                        {emp.role?.name ?? "—"}
                      </Badge>
                    </TableCell>

                    {canChangeStatus && (
                      <TableCell>
                        {emp.company?.name ?? "—"}
                      </TableCell>
                    )}

                    {/* Status */}
                    <TableCell>
                      <Badge
                        className={
                          emp.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {emp.isActive
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </TableCell>

                    {/* Onboarding */}
                    <TableCell>
                      {!emp.onboarding ? (
                        <Badge variant="outline">
                          Not Started
                        </Badge>
                      ) : (
                        <Badge
                          variant={
                            emp.onboarding.status ===
                              "COMPLETED"
                              ? "green"
                              : emp.onboarding.status ===
                                "ON_HOLD"
                                ? "destructive"
                                : "blue"
                          }
                        >
                          {emp.onboarding.status ===
                            "IN_PROGRESS"
                            ? "In Progress"
                            : emp.onboarding.status ===
                              "ON_HOLD"
                              ? "On Hold"
                              : "Completed"}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="sticky right-0 bg-card">
                      <DropdownMenu>

                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>

                            {/* View Details */}
                            <DropdownMenuItem
                              onClick={() =>
                                handleViewDetails(
                                  emp.id
                                )
                              }
                            >
                              View Details
                            </DropdownMenuItem>

                            {/* Edit */}
                            <DropdownMenuItem
                              onClick={() =>
                                handleEditClick(
                                  emp.id
                                )
                              }
                            >
                              Edit
                            </DropdownMenuItem>

                            {/* Start Onboarding */}
                            {!emp.onboarding && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedOnboardingEmployee(
                                    emp
                                  );
                                  setTargetDate("");
                                  setNotes("");
                                  setStartDialogOpen(
                                    true
                                  );
                                }}
                              >
                                Start Onboarding
                              </DropdownMenuItem>
                            )}

                            {/* View Onboarding - In Progress */}
                            {emp.onboarding?.status ===
                              "IN_PROGRESS" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigate(
                                      `/onboarding/${emp.id}`
                                    );
                                  }}
                                >
                                  View Onboarding
                                </DropdownMenuItem>
                              )}

                            {/* On Hold */}
                            {emp.onboarding?.status ===
                              "ON_HOLD" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      navigate(`/onboarding/${emp.id}`);
                                    }}
                                  >
                                    Resume Onboarding
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => {
                                      navigate(
                                        `/onboarding/${emp.id}`
                                      );
                                    }}
                                  >
                                    View Onboarding
                                  </DropdownMenuItem>
                                </>
                              )}

                            {/* Completed */}
                            {emp.onboarding?.status ===
                              "COMPLETED" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigate(
                                      `/onboarding/${emp.id}`
                                    );
                                  }}
                                >
                                  View Onboarding
                                </DropdownMenuItem>
                              )}

                            {/* Activate / Deactivate */}
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                setSelectedEmployee(
                                  emp
                                );

                                setStatusDialogOpen(
                                  true
                                );
                              }}
                              disabled={!canChangeStatus}
                            >
                              {emp.isActive
                                ? "Deactivate"
                                : "Activate"}
                            </DropdownMenuItem>

                            {/* Reset Password */}
                            {canChangeStatus && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedForReset(
                                    emp
                                  );

                                  setResetOpen(true);
                                }}
                              >
                                Reset Password
                              </DropdownMenuItem>
                            )}

                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>

                  </TableRow>
                )
              )}

              {/* No Employees */}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={
                      canChangeStatus ? 12 : 11
                    }
                    className="text-center text-muted-foreground py-8"
                  >
                    No employees found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>

          </Table>
        </div>
      </div>

    </div >
  );
};

export default EmployeeList;