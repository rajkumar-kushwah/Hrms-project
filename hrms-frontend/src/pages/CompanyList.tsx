
import React from "react";
import type {
  Company,
  CreateCompanyPayload,
  UpdateCompanyPayload,
} from "@/types/company.types";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  MoreVertical,
  PlusIcon,
  RefreshCw,
  X,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getCompanies,
  createCompany,
  getMyCompany,
  assignCompanyAdmin,
  updateCompany,
  deactivateCompany,
  activateCompany,
  permanentDeleteCompany,
} from "@/services/company.service";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth.store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isCompanyAdminRole,
  isSuperAdminRole,
} from "@/utilis/roleUtils";
import PhoneInput, {
  isValidPhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  companySchema,
  assignAdminSchema,
} from "@/validation/company.validation";


// Types


type CompanyErrors = {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  gstNumber?: string;
};

type AdminErrors = {
  name?: string;
  email?: string;
  password?: string;
};

type CompanyFieldName =
  | "name"
  | "email"
  | "gstNumber"
  | "website"
  | "address";

type CompanyFieldConfig = {
  name: CompanyFieldName;
  label: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
};

type AdminFieldConfig = {
  name: "name" | "email" | "password";
  label: string;
  placeholder: string;
  type: string;
};


// Constants / Config


const initialForm: CreateCompanyPayload = {
  name: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  gstNumber: "",
  maxBranches: 1,
  maxEmployees: 10,
};

const initialAdminForm = {
  name: "",
  email: "",
  password: "",
};

const initialEditForm: UpdateCompanyPayload = {
  name: "",
  email: "",
  phone: "",
  website: "",
  address: "",
  gstNumber: "",
};

const COMPANY_FIELDS: CompanyFieldConfig[] = [
  {
    name: "name",
    label: "Company Name",
    placeholder: "Company Name",
    required: true,
  },
  {
    name: "email",
    label: "Email",
    placeholder: "name@example.com",
    type: "email",
  },
  {
    name: "gstNumber",
    label: "GST Number",
    placeholder: "e.g. 07AABCS1234A1Z5",
    maxLength: 15,
  },
  {
    name: "website",
    label: "Website",
    placeholder: "https://example.com",
    type: "url",
  },
  {
    name: "address",
    label: "Address",
    placeholder: "Company Address",
  },
];

const ADMIN_FIELDS: AdminFieldConfig[] = [
  {
    name: "name",
    label: "Name",
    placeholder: "Enter admin name",
    type: "text",
  },
  {
    name: "email",
    label: "Email",
    placeholder: "admin@company.com",
    type: "email",
  },
  {
    name: "password",
    label: "Password",
    placeholder: "Password",
    type: "password",
  },
];

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const TABLE_COLUMNS = [
  "Logo",
  "Name",
  "Code",
  "Email",
  "Phone",
  "GST Number",
  "Website",
  "Address",
  "Status",
  "Actions",
];


// Component


function CompanyList() {
  const { user } = useAuthStore();

  const isSuperAdmin = isSuperAdminRole(user);
  const isCompanyAdmin =
    !isSuperAdmin && isCompanyAdminRole(user);

  // Main data
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSpinning, setIsSpinning] = React.useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  // Dialog states
  const [open, setOpen] = React.useState(false);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] =
    React.useState(false);
  const [dangerOpen, setDangerOpen] = React.useState(false);

  // Selected company
  const [selectedCompany, setSelectedCompany] =
    React.useState<Company | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] =
    React.useState("");

  // Forms
  const [form, setForm] =
    React.useState<CreateCompanyPayload>(initialForm);
  const [editForm, setEditForm] =
    React.useState<UpdateCompanyPayload>(initialEditForm);
  const [adminForm, setAdminForm] =
    React.useState(initialAdminForm);

  // Validation
  const [errors, setErrors] =
    React.useState<CompanyErrors>({});
  const [editErrors, setEditErrors] =
    React.useState<CompanyErrors>({});
  const [adminErrors, setAdminErrors] =
    React.useState<AdminErrors>({});

  // Phone validation
  const [isPhoneValid, setIsPhoneValid] = React.useState(false);
  const [isEditPhoneValid, setIsEditPhoneValid] =
    React.useState(false);

  // Other states
  const [showAdminPassword, setShowAdminPassword] =
    React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");


  // Load Companies


  const loadCompanies = async () => {
    setIsLoading(true);

    try {
      if (isSuperAdmin) {
        const res = await getCompanies();
        setCompanies(res.data.data);
      } else if (isCompanyAdmin) {
        const res = await getMyCompany();
        setCompanies([res.data.data]);
      } else {
        setCompanies([]);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to load companies");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadCompanies();
  }, [isSuperAdmin, isCompanyAdmin]);

  const handleRefresh = async () => {
    setIsSpinning(true);

    const minSpin = new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );

    await Promise.all([loadCompanies(), minSpin]);
    setIsSpinning(false);
  };


  // Validation Helpers


  const validateGST = (gst: string): boolean => {
    const gstRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    return gstRegex.test(gst);
  };

  const getCompanyFieldError = (
    name: CompanyFieldName,
    value: string
  ) => {
    const fieldSchema =
      companySchema.shape[name];

    const result = fieldSchema.safeParse(value);

    return result.success
      ? undefined
      : result.error.issues[0]?.message;
  };


  // Create Company


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (
      COMPANY_FIELDS.some((field) => field.name === name)
    ) {
      const error = getCompanyFieldError(
        name as CompanyFieldName,
        value
      );

      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const result = companySchema.safeParse({
      name: form.name,
      email: form.email,
      phone: form.phone,
      website: form.website,
      address: form.address,
      gstNumber: form.gstNumber,
    });

    if (!result.success) {
      const fieldErrors =
        result.error.flatten().fieldErrors;

      setErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        phone: fieldErrors.phone?.[0],
        website: fieldErrors.website?.[0],
        address: fieldErrors.address?.[0],
        gstNumber: fieldErrors.gstNumber?.[0],
      });

      return;
    }

    setErrors({});

    try {
      const res = await createCompany(form);

      toast.success("Company created successfully");

      setCompanies((prev) => [
        ...prev,
        res.data.data,
      ]);

      setForm({ ...initialForm });
      setIsPhoneValid(false);
      setOpen(false);
    } catch (err: any) {
      toast.error(
        err?.message || "Failed to create company"
      );
    }
  };

  const handleClose = () => {
    setOpen(false);
    setForm({ ...initialForm });
    setErrors({});
    setIsPhoneValid(false);
  };


  // Assign Company Admin


  const handleAdminChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setAdminForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    const fieldSchema =
      assignAdminSchema.shape[
      name as keyof typeof assignAdminSchema.shape
      ];

    const result = fieldSchema.safeParse(value);

    setAdminErrors((prev) => ({
      ...prev,
      [name]: result.success
        ? undefined
        : result.error.issues[0]?.message,
    }));
  };

  const handleAssignAdmin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const result =
      assignAdminSchema.safeParse(adminForm);

    if (!result.success) {
      const fieldErrors =
        result.error.flatten().fieldErrors;

      setAdminErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });

      return;
    }

    setAdminErrors({});

    try {
      await assignCompanyAdmin(
        selectedCompanyId,
        adminForm
      );

      toast.success(
        "Company Admin assigned successfully!"
      );

      handleAssignClose();
    } catch (err: any) {
      toast.error(
        err?.message || "Failed to assign admin"
      );
    }
  };

  const handleAssignClose = () => {
    setAssignOpen(false);
    setAdminForm({ ...initialAdminForm });
    setAdminErrors({});
    setShowAdminPassword(false);
  };


  // Edit Company


  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (
      COMPANY_FIELDS.some((field) => field.name === name)
    ) {
      const error = getCompanyFieldError(
        name as CompanyFieldName,
        value
      );

      setEditErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleEdit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!selectedCompany) return;

    const result = companySchema.safeParse({
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      website: editForm.website,
      address: editForm.address,
      gstNumber: editForm.gstNumber,
    });

    if (!result.success) {
      const fieldErrors =
        result.error.flatten().fieldErrors;

      setEditErrors({
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        phone: fieldErrors.phone?.[0],
        website: fieldErrors.website?.[0],
        address: fieldErrors.address?.[0],
        gstNumber: fieldErrors.gstNumber?.[0],
      });

      return;
    }

    setEditErrors({});

    try {
      await updateCompany(
        selectedCompany.id,
        editForm
      );

      toast.success("Company updated successfully");

      setCompanies((prev) =>
        prev.map((company) =>
          company.id === selectedCompany.id
            ? { ...company, ...editForm }
            : company
        )
      );

      setEditOpen(false);
      setSelectedCompany(null);
      setIsEditPhoneValid(false);
    } catch (err: any) {
      toast.error(
        err?.message || "Failed to update company"
      );
    }
  };

  const openEditDialog = (company: Company) => {
    setSelectedCompany(company);

    setEditForm({
      name: company.name || "",
      email: company.email || "",
      phone: company.phone || "",
      website: company.website || "",
      address: company.address || "",
      gstNumber: company.gstNumber || "",
    });

    setEditErrors({});

    setIsEditPhoneValid(
      !!company.phone &&
      isValidPhoneNumber(company.phone)
    );

    setEditOpen(true);
  };


  // Activate / Deactivate Company


  const handleToggleStatus = async () => {
    if (!selectedCompany) return;

    const willActivate = !selectedCompany.isActive;

    try {
      if (willActivate) {
        await activateCompany(selectedCompany.id);
      } else {
        await deactivateCompany(selectedCompany.id);
      }

      toast.success(
        `Company ${willActivate ? "activated" : "deactivated"
        } successfully!`
      );

      setDeleteConfirmOpen(false);
      setSelectedCompany(null);

      await loadCompanies();
    } catch (err: any) {
      toast.error(
        err?.message || "Failed to update company status"
      );
    }
  };


  // Permanent Delete


  const handlePermanentDelete = async () => {
    if (!selectedCompany) return;

    if (confirmText !== selectedCompany.name) {
      toast.error("Company name doesn't match");
      return;
    }

    try {
      await permanentDeleteCompany(selectedCompany.id);

      toast.success("Company permanently deleted!");

      setCompanies((prev) =>
        prev.filter(
          (company) => company.id !== selectedCompany.id
        )
      );

      setDangerOpen(false);
      setEditOpen(false);
      setConfirmText("");
      setSelectedCompany(null);
    } catch (err: any) {
      toast.error(
        err?.message || "Failed to delete company"
      );
    }
  };


  // Filter Companies


  const filteredCompanies = companies.filter((company) => {
    const query = searchQuery.trim().toLowerCase();

    const matchSearch = query
      ? company.name.toLowerCase().includes(query) ||
      company.code.toLowerCase().includes(query) ||
      (company.email ?? "").toLowerCase().includes(query)
      : true;

    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? company.isActive
          : !company.isActive;

    return matchSearch && matchStatus;
  });


  // Reusable Form Field


  const renderCompanyField = (
    field: CompanyFieldConfig,
    values: CreateCompanyPayload | UpdateCompanyPayload,
    fieldErrors: CompanyErrors,
    onChange: (
      e: React.ChangeEvent<HTMLInputElement>
    ) => void,
    isEdit = false
  ) => (
    <div key={field.name} className="min-w-0 space-y-1.5">
      <Label>
        {field.label}
        {field.required && " *"}
      </Label>

      <Input
        type={field.type || "text"}
        name={field.name}
        value={values[field.name] || ""}
        onChange={onChange}
        placeholder={field.placeholder}
        maxLength={field.maxLength}
      />

      {fieldErrors[field.name] && (
        <p className="text-sm text-red-500">
          {fieldErrors[field.name]}
        </p>
      )}

      {!isEdit &&
        field.name === "gstNumber" &&
        !!values.gstNumber &&
        !validateGST(values.gstNumber) && (
          <p className="text-xs text-red-500">
            Please enter a valid GST number
          </p>
        )}
    </div>
  );


  // Render


  return (
    <div className="flex w-full min-w-0 flex-col gap-4">

      {/* Header / Filters */}
      <div className="flex flex-wrap gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex justify-between items-center mb-2 gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-64">
            <Input
              placeholder="Search by company name, code or email..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              className="pr-8"
              autoComplete="off"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger className="">
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

        <div className="flex w-full items-center gap-2 sm:w-auto justify-between">
          <Button
            variant="add"
            size="sm"
            onClick={handleRefresh}
            disabled={isSpinning}
            className=" cursor-pointer sm:flex-none"
            aria-label="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${isSpinning ? "animate-spin" : ""
                }`}
            />
            <span className="ml-2">Refresh</span>
          </Button>

          {!isCompanyAdmin && (
            <Dialog
              open={open}
              onOpenChange={(value) => {
                if (value) {
                  setOpen(true);
                  setErrors({});
                } else {
                  handleClose();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="flex flex-1 cursor-pointer items-center gap-2 sm:flex-none"
                  size="sm"
                  variant="add"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Company
                </Button>
              </DialogTrigger>

              <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
                <DialogHeader className="shrink-0 border-b px-5 py-4">
                  <DialogTitle>Add Company</DialogTitle>
                  <DialogDescription>
                    Enter company details below.
                  </DialogDescription>
                </DialogHeader>

                <form
                  onSubmit={handleSubmit}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
                >
                  {renderCompanyField(
                    COMPANY_FIELDS[0],
                    form,
                    errors,
                    handleChange
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {renderCompanyField(
                      COMPANY_FIELDS[1],
                      form,
                      errors,
                      handleChange
                    )}

                    <div className="min-w-0 space-y-1.5">
                      <Label>Phone</Label>

                      <PhoneInput
                        value={form.phone}
                        onChange={(value) => {
                          const phone = value || "";

                          setForm((prev) => ({
                            ...prev,
                            phone,
                          }));

                          setIsPhoneValid(
                            !!phone &&
                            isValidPhoneNumber(phone)
                          );
                        }}
                        placeholder="Enter phone number"
                        defaultCountry="IN"
                        international
                        withCountryCallingCode
                        numberInputProps={{
                          className:
                            "h-9 w-full rounded-md border border-input bg-[var(--themePrimary)]/5 px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-[var(--themePrimary)]",
                        }}
                      />

                      {form.phone && !isPhoneValid && (
                        <p className="flex items-center gap-2 text-sm text-red-500">
                          <XCircle className="h-4 w-4" />
                          Invalid phone number
                        </p>
                      )}

                      {isPhoneValid && (
                        <p className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Valid phone number
                        </p>
                      )}
                    </div>
                  </div>

                  {renderCompanyField(
                    COMPANY_FIELDS[2],
                    form,
                    errors,
                    handleChange
                  )}

                  {renderCompanyField(
                    COMPANY_FIELDS[3],
                    form,
                    errors,
                    handleChange
                  )}

                  {renderCompanyField(
                    COMPANY_FIELDS[4],
                    form,
                    errors,
                    handleChange
                  )}

                  <div className="flex justify-end border-t pt-4">
                    <Button
                      type="submit"
                      variant="add"
                      className="w-full cursor-pointer sm:w-auto"
                    >
                      Submit
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Assign Admin Dialog */}
      <Dialog
        open={assignOpen}
        onOpenChange={(value) => {
          if (value) {
            setAssignOpen(true);
          } else {
            handleAssignClose();
          }
        }}
      >
        <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:w-full">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>
              Assign Company Admin
            </DialogTitle>
            <DialogDescription>
              Create admin account for{" "}
              <strong>{selectedCompany?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleAssignAdmin}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4"
          >
            {ADMIN_FIELDS.map((field) => (
              <div
                key={field.name}
                className="space-y-1.5"
              >
                <Label>{field.label}</Label>

                {field.name === "password" ? (
                  <div className="relative">
                    <Input
                      type={
                        showAdminPassword
                          ? "text"
                          : "password"
                      }
                      name={field.name}
                      placeholder={field.placeholder}
                      value={adminForm.password}
                      onChange={handleAdminChange}
                      className="pr-10"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowAdminPassword(
                          (prev) => !prev
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={
                        showAdminPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showAdminPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ) : (
                  <Input
                    type={field.type}
                    name={field.name}
                    placeholder={field.placeholder}
                    value={adminForm[field.name]}
                    onChange={handleAdminChange}
                    autoComplete={
                      field.name === "name"
                        ? "off"
                        : "new-password"
                    }
                  />
                )}

                {adminErrors[field.name] && (
                  <p className="text-sm text-red-500">
                    {adminErrors[field.name]}
                  </p>
                )}
              </div>
            ))}

            <div className="flex justify-end border-t pt-4">
              <Button
                type="submit"
                variant="add"
                className="w-full sm:w-auto"
              >
                Assign Admin
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(value) => {
          setEditOpen(value);

          if (!value) {
            setEditErrors({});
            setIsEditPhoneValid(false);
          }
        }}
      >
        <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
          <DialogHeader className="shrink-0 border-b px-5 py-4">
            <DialogTitle>
              Edit Company
            </DialogTitle>
            <DialogDescription>
              Update details for{" "}
              <strong>{selectedCompany?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <form
              id="edit-company-form"
              onSubmit={handleEdit}
              className="space-y-4"
            >
              {renderCompanyField(
                COMPANY_FIELDS[0],
                editForm,
                editErrors,
                handleEditChange,
                true
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {renderCompanyField(
                  COMPANY_FIELDS[1],
                  editForm,
                  editErrors,
                  handleEditChange,
                  true
                )}

                <div className="min-w-0 space-y-1.5">
                  <Label>Phone</Label>

                  <PhoneInput
                    value={editForm.phone || ""}
                    onChange={(value) => {
                      const phone = value || "";

                      setEditForm((prev) => ({
                        ...prev,
                        phone,
                      }));

                      setIsEditPhoneValid(
                        !!phone &&
                        isValidPhoneNumber(phone)
                      );
                    }}
                    placeholder="Enter phone number"
                    defaultCountry="IN"
                    international
                    withCountryCallingCode
                    numberInputProps={{
                      className:
                        "h-9 w-full rounded-md border border-input bg-[var(--themePrimary)]/5 px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:border-[var(--themePrimary)]",
                    }}
                  />

                  {editForm.phone &&
                    !isEditPhoneValid && (
                      <p className="flex items-center gap-2 text-sm text-red-500">
                        <XCircle className="h-4 w-4" />
                        Invalid phone number
                      </p>
                    )}

                  {isEditPhoneValid && (
                    <p className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Valid phone number
                    </p>
                  )}
                </div>
              </div>

              {COMPANY_FIELDS.slice(2).map((field) =>
                renderCompanyField(
                  field,
                  editForm,
                  editErrors,
                  handleEditChange,
                  true
                )
              )}
            </form>

            {isSuperAdmin && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  Danger Zone
                </h4>

                <p className="mt-1 text-xs text-red-600">
                  Permanently delete this company and all
                  its data. This cannot be undone.
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
                  Delete Permanently
                </Button>
              </div>
            )}
          </div>

          <div className="shrink-0 border-t px-5 py-3">
            <Button
              type="submit"
              form="edit-company-form"
              variant="add"
              className="w-full sm:ml-auto sm:w-auto cursor-pointer"
            >
              Update Company
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activate / Deactivate Confirmation */}
      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedCompany?.isActive
                ? "Deactivate Company"
                : "Activate Company"}
            </DialogTitle>

            <DialogDescription>
              Are you sure you want to{" "}
              <strong>
                {selectedCompany?.isActive
                  ? "deactivate"
                  : "activate"}
              </strong>{" "}
              <strong className="text-card-foreground">
                {selectedCompany?.name}
              </strong>
              ?
              {selectedCompany?.isActive
                ? " You can activate it again later."
                : " You can deactivate it again later."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() =>
                setDeleteConfirmOpen(false)
              }
            >
              Cancel
            </Button>

            <Button
              variant={
                selectedCompany?.isActive
                  ? "destructive"
                  : "default"
              }
              className="cursor-pointer"
              onClick={handleToggleStatus}
            >
              {selectedCompany?.isActive
                ? "Deactivate"
                : "Activate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation */}
      <Dialog
        open={dangerOpen}
        onOpenChange={setDangerOpen}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-700">
              Are you sure? Permanent Delete
            </DialogTitle>

            <DialogDescription>
              This will permanently delete{" "}
              <strong className="bg-muted font-bold">
                {selectedCompany?.name}
              </strong>{" "}
              and ALL related data (users, branches,
              categories, roles). This CANNOT be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label>
              Type{" "}
              <strong>{selectedCompany?.name}</strong>{" "}
              to confirm
            </Label>

            <Input
              value={confirmText}
              onChange={(e) =>
                setConfirmText(e.target.value)
              }
              placeholder="Type company name"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setDangerOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              disabled={
                confirmText !== selectedCompany?.name
              }
              onClick={handlePermanentDelete}
            >
              I understand, delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Companies Table */}
      <div className="grid w-full min-w-0 grid-cols-1 overflow-x-auto rounded border bg-card">
        <Table className="min-w-[1000px] table-auto">
          <TableHeader className="rounded-lg bg-muted">
            <TableRow>
              {TABLE_COLUMNS.map((column) => (
                <TableHead
                  key={column}
                  className={
                    column === "Actions"
                      ? "sticky right-0 z-10 bg-muted"
                      : ""
                  }
                >
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={TABLE_COLUMNS.length}
                  className="py-8 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading companies...
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={`${company.name} logo`}
                          className="h-8 w-8 rounded object-cover"
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell>{company.name}</TableCell>
                    <TableCell>{company.code}</TableCell>
                    <TableCell>
                      {company.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      {company.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      {company.gstNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      {company.website ?? "—"}
                    </TableCell>
                    <TableCell>
                      {company.address ?? "—"}
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={
                          company.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {company.isActive
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </TableCell>

                    <TableCell className="sticky right-0 bg-card">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="shrink-0 p-2 hover:bg-[var(--themePrimary)]/5 hover:text-white"
                          >
                            <MoreVertical className="h-4 w-4 text-[var(--themePrimary)]" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() =>
                                openEditDialog(company)
                              }
                            >
                              Edit
                            </DropdownMenuItem>

                            {!isCompanyAdmin && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCompanyId(
                                    company.id
                                  );
                                  setSelectedCompany(company);
                                  setAdminForm({
                                    ...initialAdminForm,
                                  });
                                  setAdminErrors({});
                                  setShowAdminPassword(false);
                                  setAssignOpen(true);
                                }}
                              >
                                Assign Admin
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              variant={
                                company.isActive
                                  ? "destructive"
                                  : "default"
                              }
                              onClick={() => {
                                setSelectedCompany(company);
                                setDeleteConfirmOpen(true);
                              }}
                              disabled={!isSuperAdmin}
                            >
                              {company.isActive
                                ? "Deactivate"
                                : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}

                {filteredCompanies.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={TABLE_COLUMNS.length}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {searchQuery.trim() || statusFilter !== "all"
                        ? "No matching records found"
                        : "No company records found"}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default CompanyList;
