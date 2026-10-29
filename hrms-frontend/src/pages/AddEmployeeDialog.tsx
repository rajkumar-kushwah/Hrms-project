
import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type {
    CreateEmployeePayload,
    Employee,
    EmployeeDetail,
} from "@/types/employee.types";
import type { Branch } from "@/types/branch.types";
import type { Category } from "@/types/category.types";
import type { Role } from "@/types/role.types";
import { createEmployee, updateEmployee } from "@/services/employee.service";
import { getBranches } from "@/services/branch.service";
import { getCategories } from "@/services/category.service";
import { getRoles } from "@/services/role.service";
import { useAuthStore } from "@/store/auth.store";
import { employeeSchema, updateEmployeeSchema } from "@/validation/employee.validation";
import { isAdminRole, isSuperAdminRole } from "@/utilis/roleUtils";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { CheckCircle2, XCircle } from "lucide-react";
import { startOnboarding } from "@/services/onboarding.service";

const fieldTabMap: Record<string, string> = {
    name: "basic",
    email: "basic",
    password: "basic",
    roleId: "basic",
    branchId: "basic",
    categoryId: "basic",
    phone: "basic",
    dateOfBirth: "personal",
    gender: "personal",
    bloodGroup: "personal",
    maritalStatus: "personal",
    currentAddress: "personal",
    permanentAddress: "personal",
    emergencyContactName: "personal",
    emergencyContactPhone: "personal",
    designation: "employment",
    joiningDate: "employment",
    employmentType: "employment",
    workShift: "employment",
    reportingManagerId: "employment",
    panNumber: "bank",
    aadharNumber: "bank",
    bankName: "bank",
    bankAccountNumber: "bank",
    bankIFSC: "bank",
    pfNumber: "bank",
    esiNumber: "bank",
    grossSalary: "bank",
};

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: (employee: Employee) => void;
    editEmployee?: EmployeeDetail | null;
    selectedCompanyId?: string;
}

const initialForm: CreateEmployeePayload = {
    name: "",
    email: "",
    password: "",
    roleId: 0,
    branchId: "",
    categoryId: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    maritalStatus: "",
    currentAddress: "",
    permanentAddress: "",
    designation: "",
    grossSalary: undefined,
    joiningDate: "",
    employmentType: "",
    workShift: "",
    pfNumber: "",
    esiNumber: "",
    reportingManagerId: undefined,
    panNumber: "",
    aadharNumber: "",
    bankAccountNumber: "",
    bankIFSC: "",
    bankName: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
};

const AddEmployeeDialog = ({
    open,
    onOpenChange,
    onSuccess,
    editEmployee,
    selectedCompanyId,
}: Props) => {
    const { user } = useAuthStore();

    const isSuperAdmin = isSuperAdminRole(user?.role?.name);
    const isCompanyAdmin = isAdminRole(user?.role?.name);
    const isEditMode = Boolean(editEmployee);

    // Edit mode: employee ki apni company ko priority do.
    // Add mode: parent se aayi selected company use karo.
    const companyId = (
        editEmployee?.company?.id || selectedCompanyId || ""
    ).trim();

    const [form, setForm] =
        React.useState<CreateEmployeePayload>(initialForm);
    const [branches, setBranches] = React.useState<Branch[]>([]);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [roles, setRoles] = React.useState<Role[]>([]);
    const [activeTab, setActiveTab] = React.useState("basic");
    const [errors, setErrors] = React.useState<
        Partial<Record<keyof CreateEmployeePayload, string>>
    >({});
    const [isPhoneValid, setIsPhoneValid] = React.useState(false);
    const [isEmergencyPhoneValid, setIsEmergencyPhoneValid] =
        React.useState(false);
    const [onboardingConfirmOpen, setOnboardingConfirmOpen] =
        React.useState(false);
    const [startOnboardingOpen, setStartOnboardingOpen] =
        React.useState(false);
    const [createdEmployee, setCreatedEmployee] =
        React.useState<Employee | null>(null);
    const [targetDate, setTargetDate] = React.useState("");
    const [onboardingNotes, setOnboardingNotes] = React.useState("");

    const filteredRoles = isCompanyAdmin
        ? roles.filter((role) => !role.isSystemRole)
        : roles;

    const loadDropdownData = React.useCallback(async () => {
        if (isSuperAdmin && !companyId) {
            setBranches([]);
            setCategories([]);
            setRoles([]);
            toast.error("Please select a company.");
            return;
        }

        try {
            const [branchRes, categoryRes, roleRes] = await Promise.all([
                getBranches(isSuperAdmin ? companyId : undefined),
                getCategories(isSuperAdmin ? companyId : undefined),
                getRoles(isSuperAdmin ? companyId : undefined),
            ]);

            const branchData = branchRes.data.data as Branch[];
            const categoryData = categoryRes.data.data as Category[];
            const roleData = roleRes.data.data as Role[];

            // Active records + current employee ki existing assignment.
            const currentBranchId = editEmployee?.branch?.id;
            const currentCategoryId = editEmployee?.category?.id;

            setBranches(
                branchData.filter(
                    (branch) =>
                        branch.isActive || branch.id === currentBranchId
                )
            );

            setCategories(
                categoryData.filter(
                    (category) =>
                        category.isActive ||
                        category.id === currentCategoryId
                )
            );

            setRoles(roleData);
        } catch (error: unknown) {
            console.error("Failed to load employee dropdowns:", error);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load dropdown data"
            );
        }
    }, [
        isSuperAdmin,
        companyId,
        editEmployee?.branch?.id,
        editEmployee?.category?.id,
    ]);

    React.useEffect(() => {
        if (!open) return;

        setErrors({});
        setActiveTab("basic");

        if (editEmployee) {
            setForm({
                ...initialForm,
                ...editEmployee,
                password: "",
                roleId: Number(editEmployee.role?.id ?? 0),
                branchId: String(editEmployee.branch?.id ?? ""),
                categoryId: String(editEmployee.category?.id ?? ""),
                dateOfBirth: editEmployee.dateOfBirth?.split("T")[0] ?? "",
                joiningDate: editEmployee.joiningDate?.split("T")[0] ?? "",
                designation: editEmployee.designation ?? "",
                grossSalary: editEmployee.grossSalary ?? undefined,
                employmentType: editEmployee.employmentType ?? "",
                workShift: editEmployee.workShift ?? "",
                reportingManagerId: editEmployee.reportingManager?.id ?? "",
                phone: editEmployee.phone ?? "",
                gender: editEmployee.gender ?? "",
                bloodGroup: editEmployee.bloodGroup ?? "",
                maritalStatus: editEmployee.maritalStatus ?? "",
                currentAddress: editEmployee.currentAddress ?? "",
                permanentAddress: editEmployee.permanentAddress ?? "",
                panNumber: editEmployee.panNumber ?? "",
                aadharNumber: editEmployee.aadharNumber ?? "",
                bankAccountNumber: editEmployee.bankAccountNumber ?? "",
                bankIFSC: editEmployee.bankIFSC ?? "",
                bankName: editEmployee.bankName ?? "",
                pfNumber: editEmployee.pfNumber ?? "",
                esiNumber: editEmployee.esiNumber ?? "",
                emergencyContactName: editEmployee.emergencyContactName ?? "",
                emergencyContactPhone: editEmployee.emergencyContactPhone ?? "",
            });

            setIsPhoneValid(
                Boolean(
                    editEmployee.phone &&
                    isValidPhoneNumber(editEmployee.phone)
                )
            );
            setIsEmergencyPhoneValid(
                Boolean(
                    editEmployee.emergencyContactPhone &&
                    isValidPhoneNumber(editEmployee.emergencyContactPhone)
                )
            );
        } else {
            setForm(initialForm);
            setIsPhoneValid(false);
            setIsEmergencyPhoneValid(false);
        }

        void loadDropdownData();
    }, [open, editEmployee, companyId, loadDropdownData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const parsedValue =
            name === "grossSalary"
                ? value === ""
                    ? undefined
                    : Number(value)
                : value;

        setForm((previous) => ({
            ...previous,
            [name]: parsedValue,
        }));

        const schema =
            employeeSchema.shape[
            name as keyof typeof employeeSchema.shape
            ];

        if (schema) {
            const result = schema.safeParse(parsedValue);
            setErrors((previous) => ({
                ...previous,
                [name]: result.success
                    ? undefined
                    : result.error.issues[0]?.message,
            }));
        }
    };

    const handleSelectChange = (
        name: keyof CreateEmployeePayload,
        value: string | number
    ) => {
        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        const schema =
            employeeSchema.shape[
            name as keyof typeof employeeSchema.shape
            ];

        if (schema) {
            const result = schema.safeParse(value);
            setErrors((previous) => ({
                ...previous,
                [name]: result.success
                    ? undefined
                    : result.error.issues[0]?.message,
            }));
        }
    };

    const handleSubmit = async () => {
        if (isSuperAdmin && !companyId) {
            toast.error("Please select a company.");
            return;
        }

        const schema = isEditMode
            ? updateEmployeeSchema
            : employeeSchema;

        const result = schema.safeParse(form);

        if (!result.success) {
            const newErrors: Partial<
                Record<keyof CreateEmployeePayload, string>
            > = {};

            result.error.issues.forEach((issue) => {
                const field = issue.path[0] as keyof CreateEmployeePayload;
                if (!newErrors[field]) {
                    newErrors[field] = issue.message;
                }
            });

            setErrors(newErrors);

            const firstErrorField = Object.keys(newErrors)[0];
            if (firstErrorField) {
                setActiveTab(fieldTabMap[firstErrorField] ?? "basic");
            }
            return;
        }

        if (!form.name || !form.email || !form.roleId) {
            toast.error("Name, Email, and Role are required");
            setActiveTab("basic");
            return;
        }

        if (!isEditMode && !form.password) {
            toast.error("Password is required");
            setActiveTab("basic");
            return;
        }

        try {
            if (isEditMode && editEmployee) {
                const updateData = {
                    name: form.name,
                    email: form.email,
                    phone: form.phone,
                    roleId: form.roleId,
                    branchId: form.branchId,
                    categoryId: form.categoryId,
                    dateOfBirth: form.dateOfBirth,
                    gender: form.gender,
                    bloodGroup: form.bloodGroup,
                    maritalStatus: form.maritalStatus,
                    currentAddress: form.currentAddress,
                    permanentAddress: form.permanentAddress,
                    designation: form.designation,
                    grossSalary: form.grossSalary,
                    joiningDate: form.joiningDate,
                    employmentType: form.employmentType,
                    workShift: form.workShift,
                    reportingManagerId: form.reportingManagerId || undefined,
                    panNumber: form.panNumber,
                    aadharNumber: form.aadharNumber,
                    bankAccountNumber: form.bankAccountNumber,
                    bankIFSC: form.bankIFSC,
                    bankName: form.bankName,
                    pfNumber: form.pfNumber,
                    esiNumber: form.esiNumber,
                    emergencyContactName: form.emergencyContactName,
                    emergencyContactPhone: form.emergencyContactPhone,
                };

                const response = await updateEmployee(
                    editEmployee.id,
                    updateData,
                    isSuperAdmin ? companyId : undefined
                );

                toast.success("Employee updated successfully!");
                onSuccess(response.data.data);
                onOpenChange(false);
            } else {
                const response = await createEmployee(form);
                const newEmployee = response.data.data as Employee;

                toast.success("Employee created successfully!");
                setCreatedEmployee(newEmployee);
                onSuccess(newEmployee);
                setOnboardingConfirmOpen(true);
            }

            setForm(initialForm);
            setErrors({});
            setActiveTab("basic");
        } catch (error: unknown) {
            const responseMessage = (
                error as {
                    response?: { data?: { message?: string } };
                }
            )?.response?.data?.message;

            toast.error(
                responseMessage ||
                (error instanceof Error
                    ? error.message
                    : "Failed to process employee")
            );
        }
    };

    const handleStartOnboarding = async () => {
        if (!createdEmployee) {
            toast.error("Employee details not found.");
            return;
        }

        if (isSuperAdmin && !companyId) {
            toast.error("Please select a company first.");
            return;
        }

        try {
            await startOnboarding(
                createdEmployee.id,
                isSuperAdmin ? companyId : undefined,
                {
                    targetDate: targetDate || undefined,
                    notes: onboardingNotes.trim() || undefined,
                }
            );

            toast.success("Onboarding started successfully!");
            setStartOnboardingOpen(false);
            setCreatedEmployee(null);
            setTargetDate("");
            setOnboardingNotes("");
        } catch (error: unknown) {
            const responseMessage = (
                error as {
                    response?: { data?: { message?: string } };
                }
            )?.response?.data?.message;

            toast.error(
                responseMessage ||
                (error instanceof Error
                    ? error.message
                    : "Failed to start onboarding")
            );
        }
    };

    return (
        <div>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditMode ? "Edit Employee" : "Add Employee"}
                        </DialogTitle>
                        <DialogDescription>
                            Fill employee details across all tabs
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid grid-cols-4 w-full">
                            <TabsTrigger value="basic">Basic</TabsTrigger>
                            <TabsTrigger value="personal">Personal</TabsTrigger>
                            <TabsTrigger value="employment">Employment</TabsTrigger>
                            <TabsTrigger value="bank">Bank & ID</TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="flex flex-col gap-3 mt-4">
                            <div>
                                <Label>Name *</Label>
                                <Input
                                    name="name"
                                    autoComplete="off"
                                    value={form.name}
                                    onChange={handleChange}
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                                )}
                            </div>

                            <div className="flex gap-2 space-x-3">
                                <div className="flex-1">
                                    <Label>Email *</Label>
                                    <Input
                                        name="email"
                                        type="email"
                                        autoComplete="off"
                                        value={form.email}
                                        onChange={handleChange}
                                    />
                                    {errors.email && (
                                        <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                                    )}
                                </div>
                                <div className="flex-1">
                                    {!isEditMode && (
                                        <>
                                            <Label>Password *</Label>
                                            <Input
                                                name="password"
                                                type="password"
                                                autoComplete="new-password"
                                                value={form.password}
                                                onChange={handleChange}
                                            />
                                        </>
                                    )}
                                    {errors.password && (
                                        <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label>Role *</Label>
                                <Select
                                    value={form.roleId ? String(form.roleId) : ""}
                                    onValueChange={(value) =>
                                        handleSelectChange("roleId", Number(value))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Role" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" align="start">
                                        {filteredRoles.map((role) => (
                                            <SelectItem key={role.id} value={String(role.id)}>
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.roleId && (
                                    <p className="mt-1 text-sm text-red-500">{errors.roleId}</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Label>Branch</Label>
                                    <Select
                                        value={form.branchId ? String(form.branchId) : ""}
                                        onValueChange={(value) =>
                                            handleSelectChange("branchId", value)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Branch" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" align="start">
                                            {branches.map((branch) => (
                                                <SelectItem key={branch.id} value={branch.id}>
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.branchId && (
                                        <p className="mt-1 text-sm text-red-500">{errors.branchId}</p>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <Label>Category</Label>
                                    <Select
                                        value={form.categoryId ? String(form.categoryId) : ""}
                                        onValueChange={(value) =>
                                            handleSelectChange("categoryId", value)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" align="start">
                                            {categories.map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.categoryId && (
                                        <p className="mt-1 text-sm text-red-500">{errors.categoryId}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label>Phone</Label>
                                <PhoneInput
                                    value={form.phone}
                                    onChange={(value) => {
                                        const phone = value || "";
                                        handleSelectChange("phone", phone);
                                        setIsPhoneValid(
                                            Boolean(phone && isValidPhoneNumber(phone))
                                        );
                                    }}
                                    placeholder="Enter phone number"
                                    defaultCountry="IN"
                                    international
                                    withCountryCallingCode
                                    countrySelectProps={{
                                        className:
                                            "dark:[color-scheme:dark] dark:bg-background dark:text-foreground",
                                    }}
                                    numberInputProps={{
                                        className:
                                            "h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground",
                                    }}
                                />
                                {errors.phone && (
                                    <p className="mt-1 flex items-center gap-2 text-sm text-red-500">
                                        <XCircle className="h-4 w-4" />
                                        {errors.phone}
                                    </p>
                                )}
                                {isPhoneValid && (
                                    <p className="mt-1 flex items-center gap-2 text-sm text-green-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Valid phone number
                                    </p>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="personal" className="flex flex-col gap-3 mt-4">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Label>Date of Birth</Label>
                                    <Input
                                        name="dateOfBirth"
                                        type="date"
                                        value={form.dateOfBirth}
                                        onChange={handleChange}
                                    />
                                    {errors.dateOfBirth && (
                                        <p className="mt-1 text-sm text-red-500">{errors.dateOfBirth}</p>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Label>Gender</Label>
                                    <Select
                                        value={form.gender}
                                        onValueChange={(value) =>
                                            handleSelectChange("gender", value)
                                        }
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent position="popper" align="start">
                                            <SelectItem value="Male">Male</SelectItem>
                                            <SelectItem value="Female">Female</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Label>Blood Group</Label>
                                    <Select
                                        value={form.bloodGroup}
                                        onValueChange={(value) =>
                                            handleSelectChange("bloodGroup", value)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Blood Group" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" align="start">
                                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                                                (bloodGroup) => (
                                                    <SelectItem key={bloodGroup} value={bloodGroup}>
                                                        {bloodGroup}
                                                    </SelectItem>
                                                )
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {errors.bloodGroup && (
                                        <p className="mt-1 text-sm text-red-500">{errors.bloodGroup}</p>
                                    )}
                                </div>

                                <div className="flex-1">
                                    <Label>Marital Status</Label>
                                    <Select
                                        value={form.maritalStatus}
                                        onValueChange={(value) =>
                                            handleSelectChange("maritalStatus", value)
                                        }
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent position="popper" align="start">
                                            <SelectItem value="Single">Single</SelectItem>
                                            <SelectItem value="Married">Married</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label>Current Address</Label>
                                <Input name="currentAddress" value={form.currentAddress} onChange={handleChange} />
                                {errors.currentAddress && (
                                    <p className="mt-1 text-sm text-red-500">{errors.currentAddress}</p>
                                )}
                            </div>
                            <div>
                                <Label>Permanent Address</Label>
                                <Input name="permanentAddress" value={form.permanentAddress} onChange={handleChange} />
                                {errors.permanentAddress && (
                                    <p className="mt-1 text-sm text-red-500">{errors.permanentAddress}</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Label>Emergency Contact Name</Label>
                                    <Input
                                        name="emergencyContactName"
                                        value={form.emergencyContactName}
                                        onChange={handleChange}
                                    />
                                    {errors.emergencyContactName && (
                                        <p className="mt-1 text-sm text-red-500">{errors.emergencyContactName}</p>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Label>Emergency Contact Phone</Label>
                                    <PhoneInput
                                        value={form.emergencyContactPhone}
                                        onChange={(value) => {
                                            const phone = value || "";
                                            handleSelectChange("emergencyContactPhone", phone);
                                            setIsEmergencyPhoneValid(
                                                Boolean(phone && isValidPhoneNumber(phone))
                                            );
                                        }}
                                        placeholder="Enter emergency phone number"
                                        defaultCountry="IN"
                                        international
                                        withCountryCallingCode
                                        numberInputProps={{
                                            className:
                                                "h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground",
                                        }}
                                    />
                                    {errors.emergencyContactPhone && (
                                        <p className="mt-1 flex items-center gap-2 text-sm text-red-500">
                                            <XCircle className="h-4 w-4" />
                                            {errors.emergencyContactPhone}
                                        </p>
                                    )}
                                    {isEmergencyPhoneValid && !errors.emergencyContactPhone && (
                                        <p className="mt-1 flex items-center gap-2 text-sm text-green-600">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Valid phone number
                                        </p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="employment" className="flex flex-col gap-3 mt-4">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Label>Designation</Label>
                                    <Input name="designation" value={form.designation} onChange={handleChange} />
                                    {errors.designation && (
                                        <p className="mt-1 text-sm text-red-500">{errors.designation}</p>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Label>Gross Monthly Salary</Label>
                                    <Input
                                        name="grossSalary"
                                        type="number"
                                        value={form.grossSalary ?? ""}
                                        onChange={handleChange}
                                        placeholder="e.g. 25000"
                                    />
                                    {errors.grossSalary && (
                                        <p className="mt-1 text-sm text-red-500">{errors.grossSalary}</p>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Label>Joining Date</Label>
                                    <Input name="joiningDate" type="date" value={form.joiningDate} onChange={handleChange} />
                                    {errors.joiningDate && (
                                        <p className="mt-1 text-sm text-red-500">{errors.joiningDate}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Label>Employment Type</Label>
                                    <Select
                                        value={form.employmentType}
                                        onValueChange={(value) =>
                                            handleSelectChange("employmentType", value)
                                        }
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent position="popper" align="start">
                                            {["Full-time", "Part-time", "Contract", "Intern"].map((type) => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1">
                                    <Label>Work Shift</Label>
                                    <Select
                                        value={form.workShift}
                                        onValueChange={(value) =>
                                            handleSelectChange("workShift", value)
                                        }
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                                        <SelectContent position="popper" align="start">
                                            {["Morning", "Evening", "Night"].map((shift) => (
                                                <SelectItem key={shift} value={shift}>{shift}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="bank" className="flex flex-col gap-3 mt-4">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Label>PAN Number</Label>
                                    <Input name="panNumber" value={form.panNumber} onChange={handleChange} />
                                    {errors.panNumber && (
                                        <p className="mt-1 text-sm text-red-500">{errors.panNumber}</p>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Label>Aadhar Number</Label>
                                    <Input name="aadharNumber" value={form.aadharNumber} onChange={handleChange} />
                                    {errors.aadharNumber && (
                                        <p className="mt-1 text-sm text-red-500">{errors.aadharNumber}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label>Bank Name</Label>
                                <Input name="bankName" value={form.bankName} onChange={handleChange} />
                                {errors.bankName && (
                                    <p className="mt-1 text-sm text-red-500">{errors.bankName}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Label>Bank Account Number</Label>
                                    <Input name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} />
                                    {errors.bankAccountNumber && (
                                        <p className="mt-1 text-sm text-red-500">{errors.bankAccountNumber}</p>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Label>IFSC Code</Label>
                                    <Input name="bankIFSC" value={form.bankIFSC} onChange={handleChange} />
                                    {errors.bankIFSC && (
                                        <p className="mt-1 text-sm text-red-500">{errors.bankIFSC}</p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Label>PF Number</Label>
                                    <Input name="pfNumber" value={form.pfNumber} onChange={handleChange} />
                                    {errors.pfNumber && (
                                        <p className="mt-1 text-sm text-red-500">{errors.pfNumber}</p>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Label>ESI Number</Label>
                                    <Input name="esiNumber" value={form.esiNumber} onChange={handleChange} />
                                    {errors.esiNumber && (
                                        <p className="mt-1 text-sm text-red-500">{errors.esiNumber}</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Button
                        variant="add"
                        onClick={handleSubmit}
                        className="mt-4"
                    >
                        {isEditMode ? "Update Employee" : "Add Employee"}
                    </Button>
                </DialogContent>
            </Dialog>

            <Dialog
                open={onboardingConfirmOpen}
                onOpenChange={setOnboardingConfirmOpen}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Start Employee Onboarding</DialogTitle>
                        <DialogDescription>
                            Employee has been created successfully.
                            Do you want to start onboarding now?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setOnboardingConfirmOpen(false);
                                setCreatedEmployee(null);
                            }}
                        >
                            No, Later
                        </Button>
                        <Button
                            variant="add"
                            onClick={() => {
                                setOnboardingConfirmOpen(false);
                                setStartOnboardingOpen(true);
                            }}
                        >
                            Yes, Start Onboarding
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={startOnboardingOpen}
                onOpenChange={setStartOnboardingOpen}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Start Onboarding</DialogTitle>
                        <DialogDescription>
                            Set the target date and add notes for this employee's onboarding.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Employee</Label>
                            <Input value={createdEmployee?.name ?? ""} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Target Date</Label>
                            <Input
                                type="date"
                                value={targetDate}
                                onChange={(event) => setTargetDate(event.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <textarea
                                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                placeholder="Enter onboarding notes..."
                                value={onboardingNotes}
                                onChange={(event) => setOnboardingNotes(event.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setStartOnboardingOpen(false);
                                setCreatedEmployee(null);
                                setTargetDate("");
                                setOnboardingNotes("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="add" onClick={handleStartOnboarding}>
                            Start Onboarding
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AddEmployeeDialog;
