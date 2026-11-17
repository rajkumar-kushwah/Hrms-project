
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  MoreVertical,
  PlusIcon,
  XCircle,
} from "lucide-react";

import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";

import type {
  Branch,
  CreateBranchPayload,
} from "@/types/branch.types";

import {
  getBranches,
  createBranch,
  updateBranch,
  permanentDeleteBranch,
} from "@/services/branch.service";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  isSuperAdminRole,
  canViewModule,
  canCreateInModule,
  canEditInModule,
  canDeleteInModule,
} from "@/utilis/roleUtils";

import PhoneInput, {
  isValidPhoneNumber,
} from "react-phone-number-input";

import "react-phone-number-input/style.css";

import { branchSchema } from "@/validation/branch.validation";
import { CompanySelector } from "@/pages/common/CompanySelector";

const LocationPicker = React.lazy(
  () => import("@/pages/LocationPicker")
);


// TYPES


type EditForm = {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  pincode?: string;
  managerName?: string;
  latitude?: number;
  longitude?: number;
  geoRadius?: number;
  locationName?: string;
};

type BranchTextField =
  | "name"
  | "email"
  | "city"
  | "state"
  | "pincode"
  | "address"
  | "managerName";

type BranchErrors = Partial<
  Record<BranchTextField | "phone", string>
>;


// INITIAL FORM


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


// FORM FIELD CONFIG


const CREATE_BASIC_FIELDS: {
  name: "name";
  label: string;
  placeholder: string;
  type: string;
}[] = [
    {
      name: "name",
      label: "Branch Name *",
      placeholder: "e.g. Delhi Branch",
      type: "text",
    },
  ];

const CREATE_ADDRESS_FIELDS: {
  name: BranchTextField;
  label: string;
  placeholder: string;
  type: string;
}[] = [
    {
      name: "city",
      label: "City",
      placeholder: "City",
      type: "text",
    },
    {
      name: "state",
      label: "State",
      placeholder: "State",
      type: "text",
    },
    {
      name: "pincode",
      label: "Pincode",
      placeholder: "Pincode",
      type: "number",
    },
  ];

const EDIT_ADDRESS_FIELDS = CREATE_ADDRESS_FIELDS;

const CREATE_DETAILS_FIELDS: {
  name: "address" | "managerName";
  label: string;
  placeholder: string;
}[] = [
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

const EDIT_DETAILS_FIELDS = CREATE_DETAILS_FIELDS;

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];


// PHONE INPUT CLASSES


const PHONE_COUNTRY_CLASS =
  "dark:[color-scheme:dark] dark:bg-background dark:text-foreground";

const PHONE_NUMBER_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground";


// COMPONENT


const BranchList = () => {
  const { user } = useAuthStore();


  // ROLE & PERMISSIONS


  const isSuperAdmin = isSuperAdminRole(user);

  const canViewBranch = canViewModule(user, "branch");
  const canCreateBranch = canCreateInModule(user, "branch");
  const canEditBranch = canEditInModule(user, "branch");
  const canDeleteBranch = canDeleteInModule(user, "branch");


  // STATES


  const [selectedCompanyId, setSelectedCompanyId] =
    React.useState("");

  const [branches, setBranches] = React.useState<Branch[]>([]);

  const [open, setOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  const [selectedBranch, setSelectedBranch] =
    React.useState<Branch | null>(null);

  const [statusDialogOpen, setStatusDialogOpen] =
    React.useState(false);

  const [dangerOpen, setDangerOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");

  const [createMapOpen, setCreateMapOpen] = React.useState(false);
  const [editMapOpen, setEditMapOpen] = React.useState(false);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const [isPhoneValid, setIsPhoneValid] = React.useState(false);
  const [phoneError, setPhoneError] = React.useState("");

  const [isEditPhoneValid, setIsEditPhoneValid] =
    React.useState(false);
  const [editPhoneError, setEditPhoneError] = React.useState("");

  const [errors, setErrors] = React.useState<BranchErrors>({});
  const [editErrors, setEditErrors] = React.useState<BranchErrors>({});

  const [form, setForm] =
    React.useState<CreateBranchPayload>({ ...initialForm });

  const [editForm, setEditForm] =
    React.useState<EditForm>({});


  // LOAD BRANCHES


  const loadBranches = async () => {
    if (!canViewBranch) {
      setBranches([]);
      return;
    }

    if (isSuperAdmin && !selectedCompanyId) {
      setBranches([]);
      return;
    }

    try {
      const res = await getBranches(
        isSuperAdmin ? selectedCompanyId : undefined
      );

      setBranches(res.data.data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load branches");
    }
  };

  React.useEffect(() => {
    void loadBranches();
  }, [selectedCompanyId, isSuperAdmin, canViewBranch]);


  // CLOSE CREATE DIALOG


  const handleClose = () => {
    setOpen(false);
    setForm({ ...initialForm });
    setErrors({});
    setIsPhoneValid(false);
    setPhoneError("");
    setCreateMapOpen(false);
  };


  // VALIDATION HELPER


  const validateField = (name: string, value: string) => {
    const schemaField =
      branchSchema.shape[
      name as keyof typeof branchSchema.shape
      ];

    if (!schemaField) return;

    const result = schemaField.safeParse(value);

    const error = result.success
      ? undefined
      : result.error.issues[0]?.message;

    return error;
  };


  // CREATE INPUT CHANGE


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    const error = validateField(name, value);

    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };


  // EDIT INPUT CHANGE


  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    const error = validateField(name, value);

    setEditErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };


  // FILTER BRANCHES


  const filteredBranches = branches.filter((branch) => {
    const search = searchQuery.toLowerCase();

    const matchSearch = searchQuery
      ? branch.name.toLowerCase().includes(search) ||
      branch.code.toLowerCase().includes(search)
      : true;

    const matchStatus =
      statusFilter !== "all"
        ? statusFilter === "active"
          ? branch.isActive
          : !branch.isActive
        : true;

    return matchSearch && matchStatus;
  });


  // CREATE BRANCH


  const handleSubmit = async () => {
    if (!canCreateBranch) {
      toast.error("You don't have permission to create branches.");
      return;
    }

    if (isSuperAdmin && !selectedCompanyId) {
      toast.error("Please select a company first.");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Branch name is required");
      return;
    }

    const result = branchSchema.safeParse({
      name: form.name,
      email: form.email,
      phone: form.phone,
      city: form.city,
      state: form.state,
      pincode: form.pincode,
      address: form.address,
      managerName: form.managerName,
      latitude: form.latitude,
      longitude: form.longitude,
      locationName: form.locationName,
      geoRadius: form.geoRadius,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        phone: fieldErrors.phone?.[0],
        city: fieldErrors.city?.[0],
        state: fieldErrors.state?.[0],
        pincode: fieldErrors.pincode?.[0],
        address: fieldErrors.address?.[0],
        managerName: fieldErrors.managerName?.[0],
      });

      return;
    }

    setErrors({});

    try {
      // Super Admin ke selected company ke saath branch create hogi.
      const res = await createBranch(
        form,
        isSuperAdmin ? selectedCompanyId : undefined
      );

      toast.success("Branch created successfully!");

      setBranches((prev) => [
        res.data.data,
        ...prev,
      ]);

      handleClose();
      void loadBranches();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create branch");
    }
  };


  // UPDATE PAYLOAD


  const payload = {
    name: editForm.name,
    address: editForm.address,
    phone: editForm.phone,
    email: editForm.email,
    city: editForm.city,
    state: editForm.state,
    pincode: editForm.pincode,
    managerName: editForm.managerName,
    latitude: editForm.latitude,
    longitude: editForm.longitude,
    geoRadius: editForm.geoRadius,
    locationName: editForm.locationName,
  };


  // UPDATE BRANCH


  const handleUpdate = async () => {
    if (!canEditBranch) {
      toast.error("You don't have permission to edit branches.");
      return;
    }

    if (!selectedBranch) return;

    const result = branchSchema.safeParse({
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      address: editForm.address,
      managerName: editForm.managerName,
      latitude: editForm.latitude,
      longitude: editForm.longitude,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;

      setEditErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        phone: fieldErrors.phone?.[0],
        address: fieldErrors.address?.[0],
        managerName: fieldErrors.managerName?.[0],
      });

      return;
    }

    setEditErrors({});

    try {
      const res = await updateBranch(
        selectedBranch.id,
        payload,
        selectedCompanyId
      );

      setBranches((prev) =>
        prev.map((branch) =>
          branch.id === selectedBranch.id
            ? { ...branch, ...res.data.data }
            : branch
        )
      );

      toast.success("Branch updated successfully!");

      setEditOpen(false);
      setSelectedBranch(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update branch");
    }
  };


  // ACTIVATE / DEACTIVATE


  const handleToggleStatus = async () => {
    if (!canEditBranch) {
      toast.error("You don't have permission to update branches.");
      return;
    }

    if (!selectedBranch) return;

    try {
      const res = await updateBranch(
        selectedBranch.id,
        {
          isActive: !selectedBranch.isActive,
        },
        selectedCompanyId
      );

      toast.success(
        `Branch ${selectedBranch.isActive ? "deactivated" : "activated"
        } successfully!`
      );

      setBranches((prev) =>
        prev.map((branch) =>
          branch.id === selectedBranch.id
            ? { ...branch, ...res.data.data }
            : branch
        )
      );

      setStatusDialogOpen(false);
      setSelectedBranch(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update branch");
    }
  };


  // PERMANENT DELETE


  const handlePermanentDelete = async () => {
    if (!canDeleteBranch) {
      toast.error("You don't have permission to delete branches.");
      return;
    }

    if (!selectedBranch) return;

    if (confirmText !== selectedBranch.name) {
      toast.error("Branch name doesn't match");
      return;
    }

    try {
      await permanentDeleteBranch(selectedBranch.id);

      toast.success("Branch permanently deleted!");

      setBranches((prev) =>
        prev.filter((branch) => branch.id !== selectedBranch.id)
      );

      setDangerOpen(false);
      setEditOpen(false);
      setSelectedBranch(null);
      setConfirmText("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete branch");
    }
  };


  // OPEN EDIT DIALOG


  const handleOpenEdit = (branch: Branch) => {
    if (!canEditBranch) {
      toast.error("You don't have permission to edit branches.");
      return;
    }

    setSelectedBranch(branch);

    setEditForm({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      city: branch.city,
      state: branch.state,
      pincode: branch.pincode,
      managerName: branch.managerName,
      latitude: branch.latitude,
      longitude: branch.longitude,
      geoRadius: branch.geoRadius,
      locationName: branch.locationName,
    });

    const phone = branch.phone || "";

    setIsEditPhoneValid(
      !!phone && isValidPhoneNumber(phone)
    );

    setEditPhoneError(
      phone && !isValidPhoneNumber(phone)
        ? "Invalid phone number"
        : ""
    );

    setEditErrors({});
    setEditMapOpen(false);
    setEditOpen(true);
  };


  // TABLE CONFIG


  const tableColumns = [
    { key: "index", label: "#" },
    { key: "name", label: "Name", className: "min-w-37.5" },
    { key: "code", label: "Code", className: "min-w-25" },
    ...(isSuperAdmin
      ? [{ key: "company", label: "Company", className: "min-w-37.5" }]
      : []),
    { key: "phone", label: "Phone", className: "min-w-25" },
    { key: "manager", label: "Manager", className: "min-w-37.5" },
    { key: "location", label: "Location", className: "min-w-40" },
    { key: "status", label: "Status", className: "min-w-20" },
    { key: "actions", label: "Actions", className: "sticky right-0 bg-muted" },
  ];


  // PERMISSION GUARD


  if (!canViewBranch) {
    return null;
  }


  // UI


  return (
    <div className="flex flex-col gap-4">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">

          {isSuperAdmin && (
            <CompanySelector
              selectedCompanyId={selectedCompanyId}
              onCompanyChange={(companyId) => {
                setSelectedCompanyId(companyId);
                setBranches([]);
              }}
            />
          )}

          <div className="flex flex-wrap gap-3 sm:flex-row sm:items-center">
            <Input
              type="search"
              name="branch-search"
              autoComplete="off"
              placeholder="Search branch name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
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
        {canCreateBranch && (
          <Button className="cursor-pointer"
            size="sm"
            variant="add"
            disabled={isSuperAdmin && !selectedCompanyId}
            onClick={() => setOpen(true)}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
        )}
          </div>
        </div>

      </div>

      {/* CREATE DIALOG */}
      {canCreateBranch && (
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              handleClose();
            } else {
              setOpen(true);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Branch</DialogTitle>
              <DialogDescription>
                Fill branch details
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">

              {/* NAME */}
              {CREATE_BASIC_FIELDS.map((field) => (
                <div key={field.name}>
                  <Label>{field.label}</Label>
                  <Input
                    type={field.type}
                    name={field.name}
                    placeholder={field.placeholder}
                    value={form[field.name]}
                    onChange={handleChange}
                  />

                  {errors[field.name] && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              ))}

              {/* PHONE + EMAIL */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Phone</Label>

                  <PhoneInput
                    value={form.phone}
                    onChange={(value) => {
                      const phone = value || "";

                      setForm((prev) => ({
                        ...prev,
                        phone,
                      }));

                      if (!phone) {
                        setPhoneError("");
                        setIsPhoneValid(false);
                        return;
                      }

                      const valid = isValidPhoneNumber(phone);

                      setIsPhoneValid(valid);
                      setPhoneError(
                        valid ? "" : "Invalid phone number"
                      );
                    }}
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

                  {phoneError && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-red-500">
                      <XCircle className="h-4 w-4" />
                      {phoneError}
                    </p>
                  )}

                  {isPhoneValid && !phoneError && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Valid phone number
                    </p>
                  )}
                </div>

                <div className="flex-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={handleChange}
                  />

                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* CITY + STATE + PINCODE */}
              <div className="flex gap-2">
                {CREATE_ADDRESS_FIELDS.map((field) => (
                  <div className="flex-1" key={field.name}>
                    <Label>{field.label}</Label>
                    <Input
                      type={field.type}
                      name={field.name}
                      placeholder={field.placeholder}
                      value={form[field.name] ?? ""}
                      onChange={handleChange}
                    />

                    {errors[field.name] && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors[field.name]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* ADDRESS + MANAGER */}
              {CREATE_DETAILS_FIELDS.map((field) => (
                <div key={field.name}>
                  <Label>{field.label}</Label>
                  <Input
                    type="text"
                    name={field.name}
                    placeholder={field.placeholder}
                    value={form[field.name] ?? ""}
                    onChange={handleChange}
                  />

                  {errors[field.name] && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              ))}

              {/* LOCATION */}
              <div>
                <Label>Branch Location</Label>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    type="button"
                    onClick={() => setCreateMapOpen(true)}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {form.latitude !== undefined
                      ? "Update Location"
                      : "Set Location"}
                  </Button>

                  {form.latitude !== undefined &&
                    form.longitude !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {form.latitude.toFixed(4)},{" "}
                        {form.longitude.toFixed(4)} —{" "}
                        {form.geoRadius ?? 0} m radius
                      </span>
                    )}
                </div>
              </div>

              <Button variant="add" onClick={handleSubmit}>
                Create Branch
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
            }}
          />
        </React.Suspense>
      )}

      {/* EDIT DIALOG */}
      {canEditBranch && (
        <Dialog
          open={editOpen}
          onOpenChange={(value) => {
            setEditOpen(value);

            if (!value) {
              setEditMapOpen(false);
              setDangerOpen(false);
              setConfirmText("");
            }
          }}
        >
          <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:w-full">

            <DialogHeader className="shrink-0 border-b px-5 py-4">
              <DialogTitle>
                Edit Branch — {selectedBranch?.name}
              </DialogTitle>
              <DialogDescription>
                Update branch details
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">

              {/* NAME */}
              <div>
                <Label>Branch Name</Label>
                <Input
                  type="text"
                  name="name"
                  value={editForm.name ?? ""}
                  onChange={handleEditChange}
                />
                {editErrors.name && (
                  <p className="mt-1 text-sm text-red-500">
                    {editErrors.name}
                  </p>
                )}
              </div>

              {/* PHONE + EMAIL */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <Label>Phone</Label>

                  <PhoneInput
                    value={editForm.phone ?? ""}
                    onChange={(value) => {
                      const phone = value || "";

                      setEditForm((prev) => ({
                        ...prev,
                        phone,
                      }));

                      if (!phone) {
                        setEditPhoneError("");
                        setIsEditPhoneValid(false);
                        return;
                      }

                      const valid = isValidPhoneNumber(phone);

                      setIsEditPhoneValid(valid);
                      setEditPhoneError(
                        valid ? "" : "Invalid phone number"
                      );
                    }}
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

                  {editPhoneError && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-red-500">
                      <XCircle className="h-4 w-4 shrink-0" />
                      {editPhoneError}
                    </p>
                  )}

                  {isEditPhoneValid && !editPhoneError && (
                    <p className="mt-1 flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Valid phone number
                    </p>
                  )}
                </div>

                <div className="min-w-0">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    name="email"
                    value={editForm.email ?? ""}
                    onChange={handleEditChange}
                  />
                  {editErrors.email && (
                    <p className="mt-1 text-sm text-red-500">
                      {editErrors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* CITY + STATE + PINCODE */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {EDIT_ADDRESS_FIELDS.map((field) => (
                  <div className="min-w-0" key={field.name}>
                    <Label>{field.label}</Label>
                    <Input
                      type={field.type}
                      name={field.name}
                      value={editForm[field.name] ?? ""}
                      onChange={handleEditChange}
                    />
                  </div>
                ))}
              </div>

              {/* ADDRESS + MANAGER */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {EDIT_DETAILS_FIELDS.map((field) => (
                  <div className="min-w-0" key={field.name}>
                    <Label>{field.label}</Label>
                    <Input
                      type="text"
                      name={field.name}
                      value={editForm[field.name] ?? ""}
                      onChange={handleEditChange}
                    />

                    {editErrors[field.name] && (
                      <p className="mt-1 text-sm text-red-500">
                        {editErrors[field.name]}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* LOCATION */}
              <div>
                <Label>Branch Location</Label>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Button
                    variant="add"
                    type="button"
                    onClick={() => setEditMapOpen(true)}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {editForm.latitude !== undefined
                      ? "Update Location"
                      : "Set Location"}
                  </Button>

                  {editForm.latitude != null &&
                    editForm.longitude != null && (
                      <span className="text-xs text-muted-foreground">
                        {editForm.latitude.toFixed(4)},{" "}
                        {editForm.longitude.toFixed(4)} —{" "}
                        {editForm.geoRadius ?? 0} m radius
                      </span>
                    )}
                </div>
              </div>

              {/* DANGER ZONE */}
              {canDeleteBranch && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Danger Zone
                  </h4>

                  <p className="mt-1 text-xs text-red-600">
                    Permanently delete this branch. This action is
                    possible only if no employee/user is assigned
                    to this branch.
                  </p>

                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      setConfirmText("");
                      setDangerOpen(true);
                    }}
                  >
                    Delete Permanently
                  </Button>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="shrink-0 border-t bg-background px-5 py-3">
              <Button
                variant="add"
                className="w-full cursor-pointer sm:w-auto sm:ml-auto sm:flex"
                onClick={handleUpdate}
              >
                Update Branch
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
            }}
          />
        </React.Suspense>
      )}

      {/* PERMANENT DELETE CONFIRM */}
      {canDeleteBranch && (
        <Dialog
          open={dangerOpen}
          onOpenChange={setDangerOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-700">
                Permanent Delete Branch
              </DialogTitle>

              <DialogDescription>
                Are you sure you want to delete{" "}
                <strong className="bg-muted font-semibold">
                  {selectedBranch?.name}
                </strong>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div>
              <Label>
                Type <strong>{selectedBranch?.name}</strong> To
                Confirm
              </Label>

              <Input
                type="text"
                name="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type branch name"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDangerOpen(false)}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                disabled={confirmText !== selectedBranch?.name}
                onClick={handlePermanentDelete}
              >
                I understand, delete permanently
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* STATUS DIALOG */}
      {canEditBranch && (
        <Dialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Branch</DialogTitle>

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
                onClick={() => setStatusDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={handleToggleStatus}
              >
                {selectedBranch?.isActive
                  ? "Deactivate"
                  : "Activate"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* TABLE */}
      <div className="grid w-full grid-cols-1 overflow-x-auto rounded border bg-card">
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

                const branchCells: React.ReactNode[] = [
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
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }
                  >
                    {branch.isActive ? "Active" : "Inactive"}
                  </Badge>,
                ];

                return (
                  <TableRow key={branch.id}>
                    {branchCells.map((cell, cellIndex) => (
                      <TableCell key={tableColumns[cellIndex].key}>
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
                                    className="text-red-600"
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
                                    setEditForm({
                                      name: branch.name,
                                    });
                                    setConfirmText("");
                                    setDangerOpen(true);
                                  }}
                                >
                                  Delete Permanently
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

              {filteredBranches.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 9 : 8}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {isSuperAdmin && !selectedCompanyId ? (
                      <p className="text-sm">
                        Select a company to view branches.
                      </p>
                    ) : (
                      <p className="text-sm">
                        No branches found
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

export default BranchList;
