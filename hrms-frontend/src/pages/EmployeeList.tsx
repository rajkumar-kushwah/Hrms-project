
import React, { useCallback } from "react";
import {
  Eye,
  EyeOff,
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
  deleteEmployee,
  getEmployeeById,
  getEmployees,
  resetEmployeePassword,
  updateEmployeeStatus,
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

import {
  formatRole,
  isSuperAdminRole,
  canViewModule,
  canCreateInModule,
  canEditInModule,
  canDeleteInModule,
} from "@/utilis/roleUtils";

import { startOnboarding } from "@/services/onboarding.service";
import { Textarea } from "@/components/ui/textarea";
import { CompanySelector } from "@/pages/common/CompanySelector";
import { passwordSchema } from "@/validation/employee.validation";

const EmployeeList = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // --------------------------------------------------
  // Role & Permission Checks
  // --------------------------------------------------

  const isSuperAdmin = isSuperAdminRole(user);

  // Employee permissions
  const canViewEmployee = canViewModule(user, "employee");
  const canCreateEmployee = canCreateInModule(user, "employee");
  const canEditEmployee = canEditInModule(user, "employee");
  const canDeleteEmployee = canDeleteInModule(user, "employee");

  // Onboarding permissions
  const canViewOnboarding = canViewModule(user, "onboarding");
  const canCreateOnboarding = canCreateInModule(user, "onboarding");
  const canEditOnboarding = canEditInModule(user, "onboarding");

  // --------------------------------------------------
  // States
  // --------------------------------------------------

  const [selectedCompanyId, setSelectedCompanyId] =
    React.useState<string>("");

  const [employees, setEmployees] = React.useState<Employee[]>([]);

  const [open, setOpen] = React.useState(false);

  const [editEmployee, setEditEmployee] =
    React.useState<EmployeeDetail | null>(null);

  const [editOpen, setEditOpen] = React.useState(false);

  const [selectedEmployee, setSelectedEmployee] =
    React.useState<Employee | null>(null);

  const [statusDialogOpen, setStatusDialogOpen] =
    React.useState(false);

  const [passwordError, setPasswordError] = React.useState("");

  const [showPassword, setShowPassword] = React.useState(false);

  const [resetOpen, setResetOpen] = React.useState(false);

  const [selectedForReset, setSelectedForReset] =
    React.useState<Employee | null>(null);

  const [newPassword, setNewPassword] = React.useState("");

  const [searchQuery, setSearchQuery] = React.useState("");

  const [statusFilter, setStatusFilter] = React.useState("all");

  const [branchFilter, setBranchFilter] = React.useState("all");

  const [roleFilter, setRoleFilter] = React.useState("all");

  const [startDialogOpen, setStartDialogOpen] =
    React.useState(false);

  const [selectedOnboardingEmployee, setSelectedOnboardingEmployee] =
    React.useState<Employee | null>(null);

  const [targetDate, setTargetDate] = React.useState("");

  const [notes, setNotes] = React.useState("");

  const [deleteDialogOpen, setDeleteDialogOpen] =
    React.useState(false);

  const [selectedForDelete, setSelectedForDelete] =
    React.useState<Employee | null>(null);

  const [isDeleting, setIsDeleting] = React.useState(false);

  const [deleteConfirmed, setDeleteConfirmed] =
    React.useState(false);

  // --------------------------------------------------
  // Load Employees
  // --------------------------------------------------

  const loadEmployees = useCallback(async () => {
    if (!canViewEmployee) {
      setEmployees([]);
      return;
    }

    if (isSuperAdmin && !selectedCompanyId) {
      setEmployees([]);
      return;
    }

    try {
      const res = await getEmployees(
        isSuperAdmin ? selectedCompanyId : undefined
      );

      setEmployees(res.data.data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load employees");
    }
  }, [canViewEmployee, isSuperAdmin, selectedCompanyId]);

  React.useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // --------------------------------------------------
  // Reset Employee Password
  // --------------------------------------------------

  const validatePassword = (value: string) => {
    const result = passwordSchema.safeParse(value);

    if (!result.success) {
      setPasswordError(
        result.error.issues[0]?.message ?? "Invalid password"
      );
      return false;
    }

    setPasswordError("");
    return true;
  };

  const handleClose = () => {
    setResetOpen(false);
    setNewPassword("");
    setSelectedForReset(null);
    setPasswordError("");
    setShowPassword(false);
  };

  const handleResetPassword = async () => {
    if (!canEditEmployee) {
      toast.error("You don't have permission to reset employee password.");
      return;
    }

    if (!validatePassword(newPassword)) return;
    if (!selectedForReset) return;

    try {
      await resetEmployeePassword(
        selectedForReset.id,
        newPassword
      );

      toast.success("Password reset successfully!");
      handleClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reset password");
    }
  };

  // --------------------------------------------------
  // Start Onboarding
  // --------------------------------------------------

  const handleStartOnboarding = async () => {
    if (!canCreateOnboarding) {
      toast.error("You don't have permission to start onboarding.");
      return;
    }

    if (!selectedOnboardingEmployee) return;

    if (isSuperAdmin && !selectedCompanyId) {
      toast.error("Please select a company first.");
      return;
    }

    try {
      await startOnboarding(
        selectedOnboardingEmployee.id,
        isSuperAdmin ? selectedCompanyId : undefined,
        {
          targetDate: targetDate || undefined,
          notes: notes.trim() || undefined,
        }
      );

      toast.success("Onboarding started successfully");

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
      toast.error(err?.message || "Failed to start onboarding");
    }
  };

  // --------------------------------------------------
  // Activate / Deactivate Employee
  // --------------------------------------------------

  const handleToggleStatus = async () => {
    if (!canEditEmployee) {
      toast.error("You don't have permission to update employee status.");
      return;
    }

    if (!selectedEmployee) return;

    const isActive = !selectedEmployee.isActive;

    try {
      await updateEmployeeStatus(
        selectedEmployee.id,
        isActive
      );

      toast.success(
        `Employee ${isActive ? "activated" : "deactivated"} successfully!`
      );

      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id === selectedEmployee.id
            ? { ...employee, isActive }
            : employee
        )
      );

      setStatusDialogOpen(false);
      setSelectedEmployee(null);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update employee status"
      );
    }
  };

  // --------------------------------------------------
  // Delete Employee
  // --------------------------------------------------

  const handleDeleteEmployee = async () => {
    if (!canDeleteEmployee) {
      toast.error("You don't have permission to delete employees.");
      return;
    }

    if (!selectedForDelete || isDeleting || !deleteConfirmed) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteEmployee(selectedForDelete.id);

      setEmployees((prev) =>
        prev.filter(
          (employee) => employee.id !== selectedForDelete.id
        )
      );

      toast.success("Employee deleted successfully");

      setDeleteDialogOpen(false);
      setSelectedForDelete(null);
      setDeleteConfirmed(false);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete employee"
      );
    } finally {
      setIsDeleting(false);
      setDeleteConfirmed(false);
    }
  };

  // --------------------------------------------------
  // Edit Employee
  // --------------------------------------------------

  const handleEditClick = async (id: string) => {
    if (!canEditEmployee) {
      toast.error("You don't have permission to edit employees.");
      return;
    }

    if (isSuperAdmin && !selectedCompanyId) {
      toast.error("Please select a company first.");
      return;
    }

    try {
      const res = await getEmployeeById(
        id,
        isSuperAdmin ? selectedCompanyId : undefined
      );

      setEditEmployee(res.data.data);
      setEditOpen(true);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to load employee details"
      );
    }
  };

  // --------------------------------------------------
  // View Employee Details
  // --------------------------------------------------

  const handleViewDetails = (id: string) => {
    if (!canViewEmployee) {
      toast.error("You don't have permission to view employees.");
      return;
    }

    if (isSuperAdmin && !selectedCompanyId) {
      toast.error("Please select a company first.");
      return;
    }

    const url = isSuperAdmin
      ? `/employee/${id}?companyId=${encodeURIComponent(selectedCompanyId)}`
      : `/employee/${id}`;

    navigate(url);
  };

  // --------------------------------------------------
  // Navigate to Onboarding
  // --------------------------------------------------

  const navigateToOnboarding = (employeeId: string) => {
    if (!canViewOnboarding) {
      toast.error("You don't have permission to view onboarding.");
      return;
    }

    if (isSuperAdmin && !selectedCompanyId) {
      toast.error("Please select a company first.");
      return;
    }

    const url = isSuperAdmin
      ? `/onboarding/${employeeId}?companyId=${encodeURIComponent(selectedCompanyId)}`
      : `/onboarding/${employeeId}`;

    navigate(url);
  };

  // --------------------------------------------------
  // Filter Employees
  // --------------------------------------------------

  const filteredEmployees = employees.filter((emp) => {
    const matchSearch = searchQuery
      ? emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.employeeCode ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleEmployeeCreated = (newEmployee: Employee) => {
    setEmployees((prev) => [
      newEmployee,
      ...prev,
    ]);

    setOpen(false);
  };

  // --------------------------------------------------
  // Permission Guard
  // --------------------------------------------------

  if (!canViewEmployee) {
    return null;
  }

  // --------------------------------------------------
  // LIST VIEW
  // --------------------------------------------------

  return (
    <div className="flex flex-col gap-4">

      {/* Header + Filters */}
      <div className="flex flex-col gap-3">

        {/* Company Selector + Add Employee */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isSuperAdmin && (
              <div className="w-full max-w-60">
                <CompanySelector
                  selectedCompanyId={selectedCompanyId}
                  onCompanyChange={(companyId) => {
                    setSelectedCompanyId(companyId);
                    setEmployees([]);
                    setBranchFilter("all");
                    setRoleFilter("all");
                    setStatusFilter("all");
                    setSearchQuery("");
                  }}
                />
              </div>
            )}
          </div>

          {canCreateEmployee && (
            <Button
              size="sm"
              variant="add"
              className="h-9 w-auto shrink-0 cursor-pointer px-3"
              disabled={isSuperAdmin && !selectedCompanyId}
              onClick={() => setOpen(true)}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          )}
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            type="search"
            name="employee-search"
            placeholder="Search name, code or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            className="h-9 w-full sm:w-60"
          />

          <div className="flex flex-wrap gap-2">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="h-9 sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>

              <SelectContent position="popper">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={branchFilter}
              onValueChange={setBranchFilter}
            >
              <SelectTrigger className="h-9 sm:w-40">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>

              <SelectContent position="popper">
                <SelectItem value="all">All Branches</SelectItem>

                {[
                  ...new Map(
                    employees
                      .filter((employee) => employee.branch)
                      .map((employee) => [
                        employee.branch!.id,
                        employee.branch!,
                      ])
                  ).values(),
                ].map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={roleFilter}
              onValueChange={setRoleFilter}
            >
              <SelectTrigger className="h-9 sm:w-36">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>

              <SelectContent position="popper">
                <SelectItem value="all">All Roles</SelectItem>

                {[
                  ...new Map(
                    employees
                      .filter((employee) => employee.role)
                      .map((employee) => [
                        employee.role!.id,
                        employee.role!,
                      ])
                  ).values(),
                ].map((role) => (
                  <SelectItem
                    key={role.id}
                    value={String(role.id)}
                  >
                    {formatRole(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Add Employee Dialog */}
      {canCreateEmployee && (
        <AddEmployeeDialog
          open={open}
          onOpenChange={setOpen}
          onSuccess={handleEmployeeCreated}
          selectedCompanyId={selectedCompanyId}
        />
      )}

      {/* Edit Employee Dialog */}
      {canEditEmployee && (
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
          selectedCompanyId={selectedCompanyId}
        />
      )}

      {/* Delete Employee Dialog */}
      {canDeleteEmployee && (
        <Dialog
          open={deleteDialogOpen}
          onOpenChange={(value) => {
            if (!isDeleting) {
              setDeleteDialogOpen(value);

              if (!value) {
                setSelectedForDelete(null);
                setDeleteConfirmed(false);
              }
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Employee</DialogTitle>

              <DialogDescription>
                Are you sure you want to permanently delete{" "}
                <strong>{selectedForDelete?.name}</strong>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-start gap-2 py-2">
              <input
                id="confirm-delete"
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) =>
                  setDeleteConfirmed(e.target.checked)
                }
                className="mt-1 h-4 w-4 cursor-pointer accent-destructive"
              />

              <Label
                htmlFor="confirm-delete"
                className="cursor-pointer text-sm leading-5"
              >
                I understand that this employee will be permanently deleted.
              </Label>
            </div>

            <DialogFooter>
              <Button
                className="cursor-pointer"
                variant="add"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setSelectedForDelete(null);
                  setDeleteConfirmed(false);
                }}
              >
                Cancel
              </Button>

              <Button
                className="cursor-pointer"
                variant="destructive"
                disabled={!deleteConfirmed || isDeleting}
                onClick={handleDeleteEmployee}
              >
                {isDeleting ? "Deleting..." : "Delete Employee"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Activate / Deactivate Dialog */}
      {canEditEmployee && (
        <Dialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Employee</DialogTitle>

              <DialogDescription>
                You are about to{" "}
                <strong className="font-semibold">
                  {selectedEmployee?.isActive
                    ? "deactivate"
                    : "activate"}
                </strong>{" "}
                <strong>{selectedEmployee?.name}</strong>
                {selectedEmployee?.isActive
                  ? " You can activate it again later."
                  : " You can deactivate it again later."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setStatusDialogOpen(false)}
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
      )}

      {/* Start Onboarding Dialog */}
      {canCreateOnboarding && (
        <Dialog
          open={startDialogOpen}
          onOpenChange={setStartDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Onboarding</DialogTitle>

              <DialogDescription>
                Set the expected completion date and add onboarding notes.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Target Date</Label>

                <Input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>

                <Textarea
                  placeholder="Enter onboarding notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setStartDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button onClick={handleStartOnboarding}>
                Start Onboarding
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reset Password Dialog */}
      {canEditEmployee && (
        <Dialog
          open={resetOpen}
          onOpenChange={(value) => {
            if (value) {
              setResetOpen(true);
              setPasswordError("");
            } else {
              handleClose();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Reset Password — {selectedForReset?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <Label>New Password</Label>

              <div className="relative mt-2">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  autoComplete="new-password"
                  aria-invalid={!!passwordError}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewPassword(value);
                    validatePassword(value);
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {passwordError && (
                <p className="text-xs text-red-500">
                  {passwordError}
                </p>
              )}

              <Button
                variant="add"
                onClick={handleResetPassword}
                disabled={!newPassword.trim() || !!passwordError}
              >
                Reset Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Employee Table */}
      <div className="grid w-full grid-cols-1 overflow-hidden rounded border bg-card">
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead className="min-w-25">Code</TableHead>
                <TableHead className="min-w-37.5">Name</TableHead>
                <TableHead className="min-w-45">Email</TableHead>
                <TableHead className="min-w-30">Designation</TableHead>
                <TableHead className="min-w-30">Branch</TableHead>
                <TableHead className="min-w-30">Category</TableHead>
                <TableHead className="min-w-25">Role</TableHead>

                {isSuperAdmin && (
                  <TableHead className="min-w-37.5">
                    Company
                  </TableHead>
                )}

                <TableHead className="min-w-20">Status</TableHead>
                <TableHead>Onboarding</TableHead>

                <TableHead className="sticky right-0 bg-muted">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredEmployees.map((emp, index) => {
                const hasOnboarding =
                  Boolean(emp.onboarding);

                const canStartThisOnboarding =
                  canCreateOnboarding && !hasOnboarding;

                const canViewThisOnboarding =
                  canViewOnboarding &&
                  (emp.onboarding?.status === "IN_PROGRESS" ||
                    emp.onboarding?.status === "COMPLETED");

                const canResumeOnboarding =
                  canEditOnboarding &&
                  emp.onboarding?.status === "ON_HOLD";

                const hasActions =
                  canViewEmployee ||
                  canEditEmployee ||
                  canDeleteEmployee ||
                  canStartThisOnboarding ||
                  canViewThisOnboarding ||
                  canResumeOnboarding;

                return (
                  <TableRow key={emp.id}>
                    <TableCell>{index + 1}</TableCell>

                    <TableCell>
                      {emp.employeeCode ?? "—"}
                    </TableCell>

                    <TableCell>{emp.name}</TableCell>

                    <TableCell>{emp.email}</TableCell>

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
                        {formatRole(emp.role)}
                      </Badge>
                    </TableCell>

                    {isSuperAdmin && (
                      <TableCell>
                        {emp.company?.name ?? "—"}
                      </TableCell>
                    )}

                    <TableCell>
                      <Badge
                        className={
                          emp.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {emp.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {!emp.onboarding ? (
                        <Badge variant="outline">
                          Not Started
                        </Badge>
                      ) : (
                        <Badge
                          variant={
                            emp.onboarding.status === "COMPLETED"
                              ? "green"
                              : emp.onboarding.status === "ON_HOLD"
                                ? "destructive"
                                : "blue"
                          }
                        >
                          {emp.onboarding.status === "IN_PROGRESS"
                            ? "In Progress"
                            : emp.onboarding.status === "ON_HOLD"
                              ? "On Hold"
                              : "Completed"}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="sticky right-0 bg-card">
                      {hasActions && (
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
                              {canViewEmployee && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleViewDetails(emp.id)
                                  }
                                >
                                  View Details
                                </DropdownMenuItem>
                              )}

                              {/* Edit */}
                              {canEditEmployee && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleEditClick(emp.id)
                                  }
                                >
                                  Edit
                                </DropdownMenuItem>
                              )}

                              {/* Start Onboarding */}
                              {canStartThisOnboarding && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedOnboardingEmployee(emp);
                                    setTargetDate("");
                                    setNotes("");
                                    setStartDialogOpen(true);
                                  }}
                                >
                                  Start Onboarding
                                </DropdownMenuItem>
                              )}

                              {/* View Onboarding */}
                              {canViewThisOnboarding && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigateToOnboarding(emp.id)
                                  }
                                >
                                  View Onboarding
                                </DropdownMenuItem>
                              )}

                              {/* Resume Onboarding */}
                              {canResumeOnboarding && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    navigateToOnboarding(emp.id)
                                  }
                                >
                                  Resume Onboarding
                                </DropdownMenuItem>
                              )}

                              {/* Activate / Deactivate */}
                              {canEditEmployee && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedEmployee(emp);
                                    setStatusDialogOpen(true);
                                  }}
                                >
                                  {emp.isActive
                                    ? "Deactivate"
                                    : "Activate"}
                                </DropdownMenuItem>
                              )}

                              {/* Reset Password */}
                              {canEditEmployee && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedForReset(emp);
                                    setNewPassword("");
                                    setPasswordError("");
                                    setShowPassword(false);
                                    setResetOpen(true);
                                  }}
                                >
                                  Reset Password
                                </DropdownMenuItem>
                              )}

                              {/* Delete */}
                              {canDeleteEmployee && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedForDelete(emp);
                                    setDeleteConfirmed(false);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Empty State */}
              {filteredEmployees.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 12 : 11}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {isSuperAdmin && !selectedCompanyId ? (
                      <p className="text-sm">
                        Select a company to view and manage employees.
                      </p>
                    ) : employees.length === 0 ? (
                      <p className="text-sm">
                        No employees found
                      </p>
                    ) : (
                      <p className="text-sm">
                        No matching employees found
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeList;
