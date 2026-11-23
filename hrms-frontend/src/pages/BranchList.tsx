
import React from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import PhoneInput, {
  isValidPhoneNumber,
} from "react-phone-number-input";

import "react-phone-number-input/style.css";

import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  MoreVertical,
  Plus,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";

import { useAuthStore } from "@/store/auth.store";
import {
  registerModuleRefresh,
  subscribeToCompanyData,
  unsubscribeFromCompanyData,
} from "@/lib/realtime";

import { socket } from "@/lib/socket";
import type {
  Branch,
  CreateBranchPayload,
  UpdateBranchPayload,
} from "@/types/branch.types";

import {
  getBranches,
  createBranch,
  updateBranch,
  permanentDeleteBranch,
} from "@/services/branch.service";

import {
  isSuperAdminRole,
  canViewModule,
  canCreateInModule,
  canEditInModule,
  canDeleteInModule,
} from "@/utilis/roleUtils";

import { branchSchema } from "@/validation/branch.validation";

import { CompanySelector } from "@/pages/common/CompanySelector";

const LocationPicker = React.lazy(
  () => import("@/pages/LocationPicker")
);

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type TextFieldKey =
  | "name"
  | "email"
  | "city"
  | "state"
  | "pincode"
  | "address"
  | "managerName";

type BranchErrors = Partial<
  Record<
    TextFieldKey | "phone" | "latitude" | "longitude",
    string
  >
>;

type FormFieldConfig = {
  name: TextFieldKey;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
};

type PhoneFieldProps = {
  value: string;
  error?: string;
  onChange: (value: string) => void;
};

// --------------------------------------------------
// INITIAL FORM
// --------------------------------------------------

const initialForm: CreateBranchPayload = {
  name: "",
  address: "",
  phone: "",
  email: "",
  city: "",
  state: "",
  pincode: "",
  managerName: "",
  latitude: undefined,
  longitude: undefined,
  geoRadius: undefined,
  locationName: "",
};

// --------------------------------------------------
// FORM CONFIGURATION
// --------------------------------------------------

const BASIC_FIELDS: FormFieldConfig[] = [
  {
    name: "name",
    label: "Branch Name",
    placeholder: "e.g. Delhi Branch",
    required: true,
  },
];

const ADDRESS_FIELDS: FormFieldConfig[] = [
  {
    name: "city",
    label: "City",
    placeholder: "City",
  },
  {
    name: "state",
    label: "State",
    placeholder: "State",
  },
  {
    name: "pincode",
    label: "Pincode",
    placeholder: "6 digit pincode",
    type: "text",
  },
];

const DETAILS_FIELDS: FormFieldConfig[] = [
  {
    name: "address",
    label: "Address",
    placeholder: "Full Address",
  },
  {
    name: "managerName",
    label: "Manager Name",
    placeholder: "Manager Name",
  },
];

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

// --------------------------------------------------
// PHONE INPUT CONFIGURATION
// --------------------------------------------------

const PHONE_COUNTRY_CLASS =
  "dark:[color-scheme:dark] dark:bg-background dark:text-foreground";

const PHONE_NUMBER_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground";

// --------------------------------------------------
// REUSABLE PHONE FIELD
// --------------------------------------------------

const PhoneField = ({
  value,
  error,
  onChange,
}: PhoneFieldProps) => {
  const isValid = !!value && isValidPhoneNumber(value);

  return (
    <div className="min-w-0 flex-1">
      <Label>Phone</Label>

      <PhoneInput
        value={value || undefined}
        onChange={(phone) => onChange(phone || "")}
        placeholder="Enter phone number"
        defaultCountry="IN"
        international
        withCountryCallingCode
        countrySelectProps={{
          className: PHONE_COUNTRY_CLASS,
        }}
        numberInputProps={{
          className: PHONE_NUMBER_CLASS,
        }}
      />

      {error ? (
        <p className="mt-1 flex items-center gap-2 text-sm text-red-500">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : isValid ? (
        <p className="mt-1 flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Valid phone number
        </p>
      ) : null}
    </div>
  );
};

// --------------------------------------------------
// REUSABLE ERROR MESSAGE
// --------------------------------------------------

const FieldError = ({ error }: { error?: string }) => {
  if (!error) return null;

  return (
    <p className="mt-1 text-sm text-red-500">
      {error}
    </p>
  );
};

// --------------------------------------------------
// REUSABLE TEXT FIELD
// --------------------------------------------------

type TextFieldProps = {
  field: FormFieldConfig;
  value: string;
  error?: string;
  onChange: (name: TextFieldKey, value: string) => void;
};

const TextField = ({
  field,
  value,
  error,
  onChange,
}: TextFieldProps) => (
  <div className="min-w-0">
    <Label>
      {field.label}
      {field.required ? " *" : ""}
    </Label>

    <Input
      type={field.type || "text"}
      name={field.name}
      placeholder={field.placeholder}
      value={value}
      onChange={(e) =>
        onChange(field.name, e.target.value)
      }
      required={field.required}
      autoComplete="off"
    />

    <FieldError error={error} />
  </div>
);

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

const BranchList = () => {
  const { user } = useAuthStore();

  // ----------------------------------------------
  // PERMISSIONS
  // ----------------------------------------------

  const isSuperAdmin = isSuperAdminRole(user);

  const canViewBranch = canViewModule(user, "branch");
  const canCreateBranch = canCreateInModule(user, "branch");
  const canEditBranch = canEditInModule(user, "branch");
  const canDeleteBranch = canDeleteInModule(user, "branch");

  // ----------------------------------------------
  // COMPANY SCOPE
  // ----------------------------------------------

  const [selectedCompanyId, setSelectedCompanyId] =
    React.useState("");

  const companyScopeId = isSuperAdmin
    ? selectedCompanyId || undefined
    : undefined;

  // ----------------------------------------------
  // STATES
  // ----------------------------------------------

  const [branches, setBranches] = React.useState<Branch[]>([]);

  const [open, setOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  const [statusDialogOpen, setStatusDialogOpen] =
    React.useState(false);

  const [dangerOpen, setDangerOpen] = React.useState(false);

  const [createMapOpen, setCreateMapOpen] =
    React.useState(false);

  const [editMapOpen, setEditMapOpen] =
    React.useState(false);

  const [selectedBranch, setSelectedBranch] =
    React.useState<Branch | null>(null);

  const [confirmText, setConfirmText] = React.useState("");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const [errors, setErrors] = React.useState<BranchErrors>({});
  const [editErrors, setEditErrors] =
    React.useState<BranchErrors>({});

  const [form, setForm] = React.useState<CreateBranchPayload>(
    { ...initialForm }
  );

  const [editForm, setEditForm] =
    React.useState<UpdateBranchPayload>({});

  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // ----------------------------------------------
  // LOAD BRANCHES
  // ----------------------------------------------

  const loadBranches = React.useCallback(async () => {
    if (!canViewBranch) {
      setBranches([]);
      return;
    }

    if (isSuperAdmin && !companyScopeId) {
      setBranches([]);
      return;
    }

    setIsLoading(true);

    try {
      const res = await getBranches(companyScopeId);
      setBranches(res.data.data || []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load branches"
      );
    } finally {
      setIsLoading(false);
    }
  }, [canViewBranch, isSuperAdmin, companyScopeId]);


  React.useEffect(() => {
    const unregister = registerModuleRefresh("branch", () => {
      void loadBranches();
    });

    return () => {
      unregister();
    };
  }, [loadBranches]);

  React.useEffect(() => {
    void loadBranches();
  }, [loadBranches]);
  

  React.useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  React.useEffect(() => {
    if (!isSuperAdmin) return;

    const handleConnect = () => {
      if (selectedCompanyId) {
        subscribeToCompanyData(selectedCompanyId);
      }
    };

    if (selectedCompanyId) {
      if (socket.connected) {
        subscribeToCompanyData(selectedCompanyId);
      }

      socket.on("connect", handleConnect);
    } else {
      unsubscribeFromCompanyData();
    }

    return () => {
      socket.off("connect", handleConnect);
      unsubscribeFromCompanyData();
    };
  }, [isSuperAdmin, selectedCompanyId]);
  // ----------------------------------------------
  // FORM RESET
  // ----------------------------------------------

  const resetCreateForm = () => {
    setForm({ ...initialForm });
    setErrors({});
    setCreateMapOpen(false);
  };

  const closeCreateDialog = () => {
    setOpen(false);
    resetCreateForm();
  };

  const closeEditDialog = () => {
    setEditOpen(false);
    setEditMapOpen(false);
    setDangerOpen(false);
    setConfirmText("");
    setEditErrors({});
    setSelectedBranch(null);
    setEditForm({});
  };

  // ----------------------------------------------
  // VALIDATION HELPER
  // ----------------------------------------------

  const validateField = (
    name: keyof typeof branchSchema.shape,
    value: unknown
  ): string | undefined => {
    const fieldSchema = branchSchema.shape[name];

    const result = fieldSchema.safeParse(value);

    return result.success
      ? undefined
      : result.error.issues[0]?.message;
  };

  const getFormErrors = (
    values: CreateBranchPayload
  ): BranchErrors => {
    const result = branchSchema.safeParse(values);

    if (result.success) return {};

    const nextErrors: BranchErrors = {};

    result.error.issues.forEach((issue) => {
      const key = issue.path[0] as keyof BranchErrors;

      if (key && !nextErrors[key]) {
        nextErrors[key] = issue.message;
      }
    });

    return nextErrors;
  };

  // ----------------------------------------------
  // CREATE FIELD CHANGE
  // ----------------------------------------------

  const handleCreateChange = (
    name: TextFieldKey,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  const handleCreatePhoneChange = (phone: string) => {
    setForm((prev) => ({
      ...prev,
      phone,
    }));

    setErrors((prev) => ({
      ...prev,
      phone: validateField("phone", phone),
    }));
  };

  // ----------------------------------------------
  // EDIT FIELD CHANGE
  // ----------------------------------------------

  const handleEditChange = (
    name: TextFieldKey,
    value: string
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setEditErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  const handleEditPhoneChange = (phone: string) => {
    setEditForm((prev) => ({
      ...prev,
      phone,
    }));

    setEditErrors((prev) => ({
      ...prev,
      phone: validateField("phone", phone),
    }));
  };

  // ----------------------------------------------
  // FILTER BRANCHES
  // ----------------------------------------------

  const filteredBranches = React.useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return branches.filter((branch) => {
      const matchSearch =
        !search ||
        branch.name.toLowerCase().includes(search) ||
        branch.code.toLowerCase().includes(search);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? branch.isActive
          : !branch.isActive);

      return matchSearch && matchStatus;
    });
  }, [branches, searchQuery, statusFilter]);

  // ----------------------------------------------
  // CREATE BRANCH
  // ----------------------------------------------

  const handleSubmit = async () => {
    if (!canCreateBranch) {
      toast.error("You don't have permission to create branches.");
      return;
    }

    if (isSuperAdmin && !companyScopeId) {
      toast.error("Please select a company first.");
      return;
    }

    const result = branchSchema.safeParse(form);

    if (!result.success) {
      setErrors(getFormErrors(form));
      toast.error("Please correct the highlighted fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = result.data as CreateBranchPayload;

      const res = await createBranch(
        payload,
        companyScopeId
      );

      toast.success("Branch created successfully!");

      setBranches((prev) => [
        res.data.data,
        ...prev,
      ]);

      closeCreateDialog();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create branch"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------
  // OPEN EDIT DIALOG
  // ----------------------------------------------

  const handleOpenEdit = (branch: Branch) => {
    if (!canEditBranch) {
      toast.error("You don't have permission to edit branches.");
      return;
    }

    setSelectedBranch(branch);

    setEditForm({
      name: branch.name,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      email: branch.email ?? "",
      city: branch.city ?? "",
      state: branch.state ?? "",
      pincode: branch.pincode ?? "",
      managerName: branch.managerName ?? "",
      latitude: branch.latitude,
      longitude: branch.longitude,
      geoRadius: branch.geoRadius,
      locationName: branch.locationName ?? "",
    });

    setEditErrors({});
    setEditMapOpen(false);
    setEditOpen(true);
  };

  // ----------------------------------------------
  // UPDATE BRANCH
  // ----------------------------------------------

  const handleUpdate = async () => {
    if (!canEditBranch) {
      toast.error("You don't have permission to edit branches.");
      return;
    }

    if (!selectedBranch) return;

    if (isSuperAdmin && !companyScopeId) {
      toast.error("Please select a company first.");
      return;
    }

    const result = branchSchema.safeParse(editForm);

    if (!result.success) {
      setEditErrors(
        getFormErrors(editForm as CreateBranchPayload)
      );

      toast.error("Please correct the highlighted fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = result.data as UpdateBranchPayload;

      const res = await updateBranch(
        selectedBranch.id,
        payload,
        companyScopeId
      );

      const updatedBranch: Branch = {
        ...selectedBranch,
        ...res.data.data,
      };

      setBranches((prev) =>
        prev.map((branch) =>
          branch.id === selectedBranch.id
            ? updatedBranch
            : branch
        )
      );

      toast.success("Branch updated successfully!");

      closeEditDialog();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update branch"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------
  // ACTIVATE / DEACTIVATE BRANCH
  // ----------------------------------------------

  const handleToggleStatus = async () => {
    if (!canEditBranch) {
      toast.error("You don't have permission to update branches.");
      return;
    }

    if (!selectedBranch) return;

    if (isSuperAdmin && !companyScopeId) {
      toast.error("Please select a company first.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updateBranch(
        selectedBranch.id,
        {
          isActive: !selectedBranch.isActive,
        },
        companyScopeId
      );

      setBranches((prev) =>
        prev.map((branch) =>
          branch.id === selectedBranch.id
            ? { ...branch, ...res.data.data }
            : branch
        )
      );

      toast.success(
        `Branch ${selectedBranch.isActive
          ? "deactivated"
          : "activated"
        } successfully!`
      );

      setStatusDialogOpen(false);
      setSelectedBranch(null);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update branch"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------
  // PERMANENT DELETE BRANCH
  // ----------------------------------------------

  const handlePermanentDelete = async () => {
    if (!canDeleteBranch) {
      toast.error("You don't have permission to delete branches.");
      return;
    }

    if (!selectedBranch) return;

    if (isSuperAdmin && !companyScopeId) {
      toast.error("Please select a company first.");
      return;
    }

    if (confirmText.trim() !== selectedBranch.name) {
      toast.error("Branch name doesn't match");
      return;
    }

    setIsSubmitting(true);

    try {
      await permanentDeleteBranch(
        selectedBranch.id,
        companyScopeId
      );

      setBranches((prev) =>
        prev.filter(
          (branch) => branch.id !== selectedBranch.id
        )
      );

      toast.success("Branch deleted successfully!");

      closeEditDialog();
      setStatusDialogOpen(false);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete branch"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------
  // TABLE COLUMNS
  // ----------------------------------------------

  const tableColumns = [
    { key: "index", label: "#" },
    { key: "name", label: "Name", className: "min-w-37.5" },
    { key: "code", label: "Code", className: "min-w-25" },

    ...(isSuperAdmin
      ? [{
        key: "company",
        label: "Company",
        className: "min-w-37.5",
      }]
      : []),

    { key: "phone", label: "Phone", className: "min-w-32" },
    { key: "manager", label: "Manager", className: "min-w-37.5" },
    { key: "location", label: "Location", className: "min-w-40" },
    { key: "status", label: "Status", className: "min-w-24" },
    {
      key: "actions",
      label: "Actions",
      className: "sticky right-0 bg-muted",
    },
  ];

  // ----------------------------------------------
  // PERMISSION GUARD
  // ----------------------------------------------

  if (!canViewBranch) return null;

  // ----------------------------------------------
  // UI
  // ----------------------------------------------

  return (
    <div className="flex flex-col gap-4">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">

          {isSuperAdmin && (
            <CompanySelector
              selectedCompanyId={selectedCompanyId}
              onCompanyChange={(companyId) => {
                setSelectedCompanyId(companyId);
                setBranches([]);
                setSearchQuery("");
              }}
            />
          )}

          <Input
            type="search"
            placeholder="Search branch name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64"
            autoComplete="off"
          />

          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent position="popper">
              {STATUS_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {canCreateBranch && (
          <Button
            size="sm"
            variant="add"
            className="cursor-pointer"
            disabled={isSuperAdmin && !companyScopeId}
            onClick={() => setOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
        )}
      </div>

      {/* CREATE DIALOG */}

      {canCreateBranch && (
        <Dialog
          open={open}
          onOpenChange={(value) => {
            if (!value) {
              closeCreateDialog();
            } else {
              setOpen(true);
            }
          }}
        >
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">

            <DialogHeader>
              <DialogTitle>Add Branch</DialogTitle>
              <DialogDescription>
                Fill in the branch details below.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">

              {/* BASIC FIELDS */}

              {BASIC_FIELDS.map((field) => (
                <TextField
                  key={field.name}
                  field={field}
                  value={form[field.name] ?? ""}
                  error={errors[field.name]}
                  onChange={handleCreateChange}
                />
              ))}

              {/* PHONE + EMAIL */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <PhoneField
                  value={form.phone ?? ""}
                  error={errors.phone}
                  onChange={handleCreatePhoneChange}
                />

                <TextField
                  field={{
                    name: "email",
                    label: "Email",
                    placeholder: "Email address",
                    type: "email",
                  }}
                  value={form.email ?? ""}
                  error={errors.email}
                  onChange={handleCreateChange}
                />
              </div>

              {/* ADDRESS FIELDS */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {ADDRESS_FIELDS.map((field) => (
                  <TextField
                    key={field.name}
                    field={field}
                    value={form[field.name] ?? ""}
                    error={errors[field.name]}
                    onChange={handleCreateChange}
                  />
                ))}
              </div>

              {/* DETAILS */}

              {DETAILS_FIELDS.map((field) => (
                <TextField
                  key={field.name}
                  field={field}
                  value={form[field.name] ?? ""}
                  error={errors[field.name]}
                  onChange={handleCreateChange}
                />
              ))}

              {/* LOCATION */}

              <div className="space-y-2">
                <Label>Branch Location</Label>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateMapOpen(true)}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {form.latitude != null
                      ? "Update Location"
                      : "Set Location"}
                  </Button>

                  {form.latitude != null &&
                    form.longitude != null && (
                      <span className="text-xs text-muted-foreground">
                        {form.latitude.toFixed(4)},{" "}
                        {form.longitude.toFixed(4)}
                        {" — "}
                        {form.geoRadius ?? 0} m radius
                      </span>
                    )}
                </div>

                <FieldError
                  error={errors.latitude || errors.longitude}
                />
              </div>

              <Button
                variant="add"
                className="w-full"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Creating..." : "Create Branch"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* CREATE LOCATION PICKER */}

      {canCreateBranch && createMapOpen && (
        <React.Suspense fallback={null}>
          <LocationPicker
            open={createMapOpen}
            onOpenChange={setCreateMapOpen}
            initialLat={form.latitude}
            initialLng={form.longitude}
            initialRadius={form.geoRadius}
            initialLocationName={form.locationName}
            onConfirm={(lat, lng, radius, locationName) => {
              setForm((prev) => ({
                ...prev,
                latitude: lat,
                longitude: lng,
                geoRadius: radius,
                locationName,
              }));

              setErrors((prev) => ({
                ...prev,
                latitude: undefined,
                longitude: undefined,
              }));
            }}
          />
        </React.Suspense>
      )}

      {/* EDIT DIALOG */}

      {canEditBranch && (
        <Dialog
          open={editOpen}
          onOpenChange={(value) => {
            if (!value) {
              closeEditDialog();
            } else {
              setEditOpen(true);
            }
          }}
        >
          <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-full">

            <DialogHeader className="shrink-0 border-b px-5 py-4">
              <DialogTitle>
                Edit Branch — {selectedBranch?.name}
              </DialogTitle>

              <DialogDescription>
                Update branch details.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">

              {/* BASIC FIELDS */}

              {BASIC_FIELDS.map((field) => (
                <TextField
                  key={field.name}
                  field={field}
                  value={editForm[field.name] ?? ""}
                  error={editErrors[field.name]}
                  onChange={handleEditChange}
                />
              ))}

              {/* PHONE + EMAIL */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <PhoneField
                  value={editForm.phone ?? ""}
                  error={editErrors.phone}
                  onChange={handleEditPhoneChange}
                />

                <TextField
                  field={{
                    name: "email",
                    label: "Email",
                    placeholder: "Email address",
                    type: "email",
                  }}
                  value={editForm.email ?? ""}
                  error={editErrors.email}
                  onChange={handleEditChange}
                />
              </div>

              {/* ADDRESS */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {ADDRESS_FIELDS.map((field) => (
                  <TextField
                    key={field.name}
                    field={field}
                    value={editForm[field.name] ?? ""}
                    error={editErrors[field.name]}
                    onChange={handleEditChange}
                  />
                ))}
              </div>

              {/* DETAILS */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {DETAILS_FIELDS.map((field) => (
                  <TextField
                    key={field.name}
                    field={field}
                    value={editForm[field.name] ?? ""}
                    error={editErrors[field.name]}
                    onChange={handleEditChange}
                  />
                ))}
              </div>

              {/* LOCATION */}

              <div className="space-y-2">
                <Label>Branch Location</Label>

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setEditMapOpen(true)}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {editForm.latitude != null
                      ? "Update Location"
                      : "Set Location"}
                  </Button>

                  {editForm.latitude != null &&
                    editForm.longitude != null && (
                      <span className="text-xs text-muted-foreground">
                        {editForm.latitude.toFixed(4)},{" "}
                        {editForm.longitude.toFixed(4)}
                        {" — "}
                        {editForm.geoRadius ?? 0} m radius
                      </span>
                    )}
                </div>

                <FieldError
                  error={
                    editErrors.latitude ||
                    editErrors.longitude
                  }
                />
              </div>

              {/* DANGER ZONE */}

              {canDeleteBranch && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">

                  <h4 className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    Danger Zone
                  </h4>

                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Permanently delete this branch. This action
                    cannot be undone. Branches with assigned
                    employees or categories cannot be deleted.
                  </p>

                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setConfirmText("");
                      setDangerOpen(true);
                    }}
                  >
                    Delete Branch
                  </Button>
                </div>
              )}
            </div>

            {/* EDIT FOOTER */}

            <div className="flex shrink-0 justify-end border-t bg-background px-5 py-3">
              <Button
                variant="add"
                className="w-full sm:w-auto"
                disabled={isSubmitting}
                onClick={handleUpdate}
              >
                {isSubmitting ? "Updating..." : "Update Branch"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT LOCATION PICKER */}

      {canEditBranch && editMapOpen && (
        <React.Suspense fallback={null}>
          <LocationPicker
            open={editMapOpen}
            onOpenChange={setEditMapOpen}
            initialLat={editForm.latitude}
            initialLng={editForm.longitude}
            initialRadius={editForm.geoRadius}
            initialLocationName={editForm.locationName}
            onConfirm={(lat, lng, radius, locationName) => {
              setEditForm((prev) => ({
                ...prev,
                latitude: lat,
                longitude: lng,
                geoRadius: radius,
                locationName,
              }));

              setEditErrors((prev) => ({
                ...prev,
                latitude: undefined,
                longitude: undefined,
              }));
            }}
          />
        </React.Suspense>
      )}

      {/* DELETE BRANCH CONFIRMATION DIALOG */}

      {canDeleteBranch && (
        <Dialog
          open={dangerOpen}
          onOpenChange={(value) => {
            setDangerOpen(value);

            if (!value) {
              setConfirmText("");
            }
          }}
        >
          <DialogContent className="w-[calc(100vw-1rem)] max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Delete Branch
              </DialogTitle>

              <DialogDescription>
                Are you sure you want to permanently delete{" "}
                <strong>{selectedBranch?.name}</strong>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label>
                Type <strong>{selectedBranch?.name}</strong>{" "}
                to confirm.
              </Label>

              <Input
                value={confirmText}
                onChange={(e) =>
                  setConfirmText(e.target.value)
                }
                placeholder="Type branch name"
                autoComplete="off"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => {
                  setDangerOpen(false);
                  setConfirmText("");
                }}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="destructive"
                disabled={
                  confirmText !== selectedBranch?.name ||
                  isSubmitting
                }
                onClick={handlePermanentDelete}
              >
                {isSubmitting ? "Deleting..." : "Delete Branch"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* STATUS DIALOG */}

      {canEditBranch && (
        <Dialog
          open={statusDialogOpen}
          onOpenChange={(value) => {
            setStatusDialogOpen(value);

            if (!value) {
              setSelectedBranch(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Branch Status</DialogTitle>

              <DialogDescription>
                You are about to{" "}
                <strong>
                  {selectedBranch?.isActive
                    ? "deactivate"
                    : "activate"}
                </strong>{" "}
                <strong>{selectedBranch?.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => {
                  setStatusDialogOpen(false);
                  setSelectedBranch(null);
                }}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                disabled={isSubmitting}
                onClick={handleToggleStatus}
              >
                {isSubmitting
                  ? "Updating..."
                  : selectedBranch?.isActive
                    ? "Deactivate"
                    : "Activate"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* BRANCH TABLE */}

      <div className="grid w-full grid-cols-1 overflow-x-auto rounded-lg border bg-card">
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow>
                {tableColumns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={column.className}
                  >
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredBranches.map((branch, index) => {
                const hasActions =
                  canEditBranch || canDeleteBranch;

                const cells: React.ReactNode[] = [
                  index + 1,
                  branch.name,
                  branch.code,

                  ...(isSuperAdmin
                    ? [branch.company?.name ?? "—"]
                    : []),

                  branch.phone ?? "—",
                  branch.managerName ?? "—",
                  branch.locationName ?? "—",

                  <Badge
                    className={
                      branch.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                    }
                  >
                    {branch.isActive
                      ? "Active"
                      : "Inactive"}
                  </Badge>,
                ];

                return (
                  <TableRow key={branch.id}>
                    {cells.map((cell, cellIndex) => (
                      <TableCell
                        key={tableColumns[cellIndex].key}
                      >
                        {cell}
                      </TableCell>
                    ))}

                    <TableCell className="sticky right-0 bg-card">
                      {hasActions && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Branch actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              {canEditBranch && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleOpenEdit(branch)
                                    }
                                  >
                                    Edit
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => {
                                      setSelectedBranch(branch);
                                      setStatusDialogOpen(true);
                                    }}
                                  >
                                    {branch.isActive
                                      ? "Deactivate"
                                      : "Activate"}
                                  </DropdownMenuItem>
                                </>
                              )}

                              {canDeleteBranch && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedBranch(branch);
                                    setConfirmText("");
                                    setDangerOpen(true);
                                  }}
                                >
                                  Delete Branch
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

              {/* EMPTY / LOADING STATE */}

              {filteredBranches.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={tableColumns.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {isLoading
                      ? "Loading branches..."
                      : isSuperAdmin && !companyScopeId
                        ? "Select a company to view branches."
                        : "No branches found."}
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

export default BranchList;
