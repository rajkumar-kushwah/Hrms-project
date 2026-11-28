
import {
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";
import {
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, Lock } from "lucide-react";

import { api } from "@/api/axios";
import { getEmployees } from "@/services/employee.service";
import { getCompanies } from "@/services/company.service";
import { getCategories } from "@/services/category.service";
import {
    getUpgradeRequestById,
    resubmitUpgradeRequest,
} from "@/services/employeeUpgrade.service";

import { useAuthStore } from "@/store/auth.store";
import {
    isSuperAdminRole,
    isEmployeeRole,
} from "@/utilis/roleUtils";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";

// ======================================================
// TYPES
// ======================================================

interface Employee {
    id: string;
    name: string;
    employeeCode?: string | null;
    designation?: string | null;
    grossSalary?: number | null;
    categoryId?: string | null;
    branchId?: string | null;
    employmentStatus?: string | null;
}

interface Option {
    id: string;
    name: string;
    branchId?: string;
}

type FieldKey =
    | "designation"
    | "grossSalary"
    | "categoryId";

type FieldKind = "text" | "money" | "category";

interface ProposedData {
    designation: string;
    grossSalary: string;
    categoryId: string;
}

type Changes = Partial<Record<FieldKey, string | number>>;

interface Approval {
    id: string;
    status: string;
    comments?: string | null;
    sequence?: number;
    approver?: {
        id?: string;
        name?: string;
    };
}

interface UpgradeRequest {
    id: string;
    companyId: string;
    employeeId: string;
    requestedById: string;
    upgradeType: string;
    status: string;
    currentData: Record<string, unknown>;
    proposedData: Record<string, unknown>;
    effectiveDate: string;
    reason: string;
    remarks?: string | null;
    employee?: Partial<Employee>;
    approvals?: Approval[];
}

// ======================================================
// CONSTANTS
// ======================================================

const initialProposedData: ProposedData = {
    designation: "",
    grossSalary: "",
    categoryId: "",
};

const UPGRADE_TYPES = [
    { value: "PROMOTION", label: "Promotion" },
    { value: "INCREMENT", label: "Increment" },
    { value: "TRANSFER", label: "Department transfer" },
];

const FIELDS: {
    key: FieldKey;
    label: string;
    kind: FieldKind;
}[] = [
        {
            key: "designation",
            label: "Designation",
            kind: "text",
        },
        {
            key: "grossSalary",
            label: "Gross salary",
            kind: "money",
        },
        {
            key: "categoryId",
            label: "Department",
            kind: "category",
        },
    ];

const cardClass = "w-full min-w-0 gap-0 overflow-hidden py-0";
const triggerClass = "w-full min-w-0";
const contentClass = "max-h-72";

// ======================================================
// HELPERS
// ======================================================

const getResponseData = <T,>(response: unknown): T[] => {
    const body = (
        response as { data?: unknown }
    )?.data;

    if (Array.isArray(body)) {
        return body as T[];
    }

    if (body && typeof body === "object") {
        const result = body as Record<string, unknown>;

        for (const key of [
            "data",
            "employees",
            "categories",
            "companies",
        ]) {
            if (Array.isArray(result[key])) {
                return result[key] as T[];
            }
        }
    }

    return [];
};

const getResponseRecord = <T,>(response: unknown): T | null => {
    const body = (
        response as { data?: unknown }
    )?.data;

    if (!body || typeof body !== "object") {
        return null;
    }

    const result = body as Record<string, unknown>;

    if (
        result.data &&
        typeof result.data === "object" &&
        !Array.isArray(result.data)
    ) {
        return result.data as T;
    }

    if (
        result.upgrade &&
        typeof result.upgrade === "object"
    ) {
        return result.upgrade as T;
    }

    return result as T;
};

const toOptions = (
    rows: Record<string, unknown>[],
): Option[] =>
    rows
        .map((item) => ({
            id: String(item.id ?? ""),
            name: String(
                item.name ??
                item.categoryName ??
                item.displayName ??
                item.title ??
                "",
            ),
            branchId: item.branchId
                ? String(item.branchId)
                : undefined,
        }))
        .filter((item) => item.id && item.name);

const nameOf = (
    list: Option[],
    id?: string | null,
): string => {
    if (!id) return "—";

    return (
        list.find((item) => item.id === id)?.name ??
        "—"
    );
};

const inr = (value: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(value);

const toDateInput = (value?: string | Date | null) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

// ======================================================
// PAGE
// ======================================================

const InitiateUpgrade = () => {
    const navigate = useNavigate();
    const { id: upgradeId } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();

    const { user } = useAuthStore();

    const isSuperAdmin = isSuperAdminRole(user);
    const isEmployee = isEmployeeRole(user);
    const isEditMode = Boolean(upgradeId);

    // --------------------------------------------------
    // STATE
    // --------------------------------------------------

    const [companies, setCompanies] = useState<Option[]>([]);

    const [selectedCompanyId, setSelectedCompanyId] =
        useState(
            searchParams.get("companyId") ?? "",
        );

    const [employees, setEmployees] = useState<Employee[]>([]);
    const [categories, setCategories] = useState<Option[]>([]);

    const [selectedEmployeeId, setSelectedEmployeeId] =
        useState("");

    const [selectedEmployee, setSelectedEmployee] =
        useState<Employee | null>(null);

    const [upgradeType, setUpgradeType] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");

    const [reason, setReason] = useState("");
    const [remarks, setRemarks] = useState("");

    const [proposedData, setProposedData] =
        useState<ProposedData>(initialProposedData);

    const [upgradeRequest, setUpgradeRequest] =
        useState<UpgradeRequest | null>(null);

    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // --------------------------------------------------
    // COMPANY
    // --------------------------------------------------

    const companyId = String(
        isSuperAdmin
            ? selectedCompanyId
            : user?.companyId ?? "",
    );

    // --------------------------------------------------
    // COMPANIES - SUPER ADMIN
    // --------------------------------------------------

    useEffect(() => {
        if (!isSuperAdmin) return;

        let active = true;

        const loadCompanies = async () => {
            try {
                const response = await getCompanies();

                if (!active) return;

                setCompanies(
                    toOptions(
                        getResponseData<Record<string, unknown>>(
                            response,
                        ),
                    ),
                );
            } catch {
                if (active) {
                    toast.error("Unable to load companies");
                }
            }
        };

        loadCompanies();

        return () => {
            active = false;
        };
    }, [isSuperAdmin]);

    // --------------------------------------------------
    // COMPANY DATA
    // --------------------------------------------------

    useEffect(() => {
        let active = true;

        if (!companyId) {
            setEmployees([]);
            setCategories([]);
            setLoading(false);

            return () => {
                active = false;
            };
        }

        const loadCompanyData = async () => {
            setLoading(true);

            try {
                // Edit mode gets employee details from the request.
                // Avoid loading the employee list unnecessarily.
                if (!isEditMode) {
                    try {
                        const employeeRes = await getEmployees(companyId);

                        if (!active) return;

                        setEmployees(
                            getResponseData<Employee>(employeeRes),
                        );
                    } catch {
                        if (active) {
                            toast.error("Unable to load employees");
                        }
                    }
                }

                // Employees should not need broad Category module access.
                // A restricted department-list endpoint can be added later.
                if (!isEmployee) {
                    try {
                        const categoryRes = await getCategories(companyId);

                        if (!active) return;

                        setCategories(
                            toOptions(
                                getResponseData<Record<string, unknown>>(
                                    categoryRes,
                                ),
                            ),
                        );
                    } catch {
                        if (active) {
                            toast.error("Unable to load departments");
                        }
                    }
                } else {
                    setCategories([]);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadCompanyData();

        return () => {
            active = false;
        };
    }, [companyId, isEditMode, isEmployee]);

    // --------------------------------------------------
    // LOAD EXISTING REQUEST - EDIT MODE
    // --------------------------------------------------

    useEffect(() => {
        if (!isEditMode || !upgradeId || !companyId) {
            return;
        }

        let active = true;

        const loadUpgradeRequest = async () => {
            setDetailLoading(true);

            try {
                const response = await getUpgradeRequestById(
                    upgradeId,
                    companyId,
                );

                if (!active) return;

                const request = getResponseRecord<UpgradeRequest>(
                    response,
                );

                if (!request) {
                    throw new Error("Upgrade request not found");
                }

                if (request.status !== "SENT_BACK") {
                    toast.error(
                        "Only sent-back requests can be edited",
                    );
                    navigate("/employee-upgrade/dashboard");
                    return;
                }

                if (request.requestedById !== String(user?.id ?? "")) {
                    toast.error(
                        "You are not allowed to edit this request",
                    );
                    navigate("/employee-upgrade/dashboard");
                    return;
                }

                if (
                    request.companyId &&
                    request.companyId !== companyId
                ) {
                    toast.error(
                        "This request belongs to another company",
                    );
                    navigate("/employee-upgrade/dashboard");
                    return;
                }

                setUpgradeRequest(request);

                const currentData = request.currentData ?? {};
                const employeeData = request.employee ?? {};

                const employee: Employee = {
                    id: request.employeeId,
                    name: employeeData.name ?? "Employee",
                    employeeCode: employeeData.employeeCode ?? null,
                    designation:
                        employeeData.designation ??
                        (currentData.designation as string | null) ??
                        null,
                    grossSalary:
                        employeeData.grossSalary ??
                        (currentData.grossSalary as number | null) ??
                        null,
                    categoryId:
                        employeeData.categoryId ??
                        (currentData.categoryId as string | null) ??
                        null,
                    branchId: employeeData.branchId ?? null,
                    employmentStatus:
                        employeeData.employmentStatus ?? null,
                };

                setSelectedEmployee(employee);
                setSelectedEmployeeId(request.employeeId);

                setUpgradeType(request.upgradeType);

                setEffectiveDate(
                    toDateInput(request.effectiveDate),
                );

                setReason(request.reason ?? "");
                setRemarks(request.remarks ?? "");

                const proposed = request.proposedData ?? {};

                setProposedData({
                    designation:
                        proposed.designation !== null &&
                            proposed.designation !== undefined
                            ? String(proposed.designation)
                            : "",

                    grossSalary:
                        proposed.grossSalary !== null &&
                            proposed.grossSalary !== undefined
                            ? String(proposed.grossSalary)
                            : "",

                    categoryId:
                        proposed.categoryId !== null &&
                            proposed.categoryId !== undefined
                            ? String(proposed.categoryId)
                            : "",
                });
            } catch (error) {
                if (!active) return;

                const message = (
                    error as {
                        response?: {
                            data?: { message?: string };
                        };
                        message?: string;
                    }
                )?.response?.data?.message;

                toast.error(
                    message ||
                    "Unable to load upgrade request",
                );
            } finally {
                if (active) {
                    setDetailLoading(false);
                }
            }
        };

        loadUpgradeRequest();

        return () => {
            active = false;
        };
    }, [
        isEditMode,
        upgradeId,
        companyId,
        user?.id,
        navigate,
    ]);

    // --------------------------------------------------
    // SELECTED EMPLOYEE - CREATE MODE
    // --------------------------------------------------

    const currentEmployee = useMemo(() => {
        if (isEditMode) {
            return selectedEmployee;
        }

        return (
            employees.find(
                (employee) =>
                    employee.id === selectedEmployeeId,
            ) ?? null
        );
    }, [
        isEditMode,
        selectedEmployee,
        employees,
        selectedEmployeeId,
    ]);

    // --------------------------------------------------
    // DEPARTMENT OPTIONS
    // --------------------------------------------------

    const departmentOptions = useMemo(() => {
        if (!currentEmployee?.branchId) {
            return [];
        }

        return categories.filter(
            (category) =>
                category.branchId === currentEmployee.branchId,
        );
    }, [categories, currentEmployee]);

    // --------------------------------------------------
    // UPDATE PROPOSED DATA
    // --------------------------------------------------

    const updateProposedData = (
        field: FieldKey,
        value: string,
    ) => {
        setProposedData((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    // --------------------------------------------------
    // EMPLOYEE CHANGE
    // --------------------------------------------------

    const handleEmployeeChange = (employeeId: string) => {
        setSelectedEmployeeId(employeeId);
        setProposedData(initialProposedData);
    };

    // --------------------------------------------------
    // DISPLAY VALUES
    // --------------------------------------------------

    const display = (
        kind: FieldKind,
        value: unknown,
    ): string => {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "—";
        }

        switch (kind) {
            case "money":
                return Number.isFinite(Number(value))
                    ? inr(Number(value))
                    : "—";

            case "category":
                return nameOf(categories, String(value));

            default:
                return String(value);
        }
    };

    // --------------------------------------------------
    // CHANGE DETECTION
    // --------------------------------------------------

    const changes = useMemo<Changes>(() => {
        const result: Changes = {};

        if (!currentEmployee) {
            return result;
        }

        FIELDS.forEach((field) => {
            const raw = proposedData[field.key].trim();

            if (!raw) return;

            const current = currentEmployee[field.key];

            if (field.kind === "money") {
                const salary = Number(raw);

                if (
                    Number.isFinite(salary) &&
                    salary >= 0 &&
                    salary !== Number(current ?? 0)
                ) {
                    result[field.key] = salary;
                }

                return;
            }

            if (raw !== String(current ?? "")) {
                result[field.key] = raw;
            }
        });

        return result;
    }, [currentEmployee, proposedData]);

    // --------------------------------------------------
    // SALARY HIKE
    // --------------------------------------------------

    const hikePercent = useMemo(() => {
        const oldSalary = Number(currentEmployee?.grossSalary);

        if (
            !("grossSalary" in changes) ||
            !(oldSalary > 0)
        ) {
            return null;
        }

        return (
            Math.round(
                (
                    (
                        Number(changes.grossSalary) -
                        oldSalary
                    ) /
                    oldSalary
                ) * 1000,
            ) / 10
        );
    }, [currentEmployee, changes]);

    // --------------------------------------------------
    // SUBMIT
    // --------------------------------------------------

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (!companyId) {
            return toast.error("Please select a company");
        }

        if (!currentEmployee) {
            return toast.error("Please select an employee");
        }

        if (!effectiveDate || !reason.trim()) {
            return toast.error(
                "Please fill all required fields",
            );
        }

        if (!isEditMode && !upgradeType) {
            return toast.error("Please select upgrade type");
        }

        if (proposedData.grossSalary !== "") {
            const salary = Number(proposedData.grossSalary);

            if (
                !Number.isFinite(salary) ||
                salary < 0
            ) {
                return toast.error(
                    "Please enter a valid gross salary",
                );
            }
        }

        if (!Object.keys(changes).length) {
            return toast.error(
                "Nothing is different from the current details. Change at least one field.",
            );
        }

        const updatedProposedData = {
            ...(changes.designation !== undefined
                ? { designation: String(changes.designation) }
                : {}),

            ...(changes.categoryId !== undefined
                ? { categoryId: String(changes.categoryId) }
                : {}),

            ...(changes.grossSalary !== undefined
                ? { grossSalary: Number(changes.grossSalary) }
                : {}),
        };

        try {
            setSubmitting(true);

            if (isEditMode && upgradeId) {
                await resubmitUpgradeRequest(
                    upgradeId,
                    {
                        proposedData: updatedProposedData,
                        effectiveDate,
                        reason: reason.trim(),
                        remarks: remarks.trim() || null,
                    },
                    companyId,
                );

                toast.success(
                    "Upgrade request resubmitted successfully",
                );
            } else {
                const payload = {
                    employeeId: currentEmployee.id,
                    upgradeType,
                    proposedData: updatedProposedData,
                    effectiveDate,
                    reason: reason.trim(),
                    remarks: remarks.trim() || undefined,
                };

                await api.post(
                    "/employee-upgrades",
                    payload,
                    {
                        params: { companyId },
                    },
                );

                toast.success(
                    "Upgrade request created successfully",
                );
            }

            navigate("/employee-upgrade/dashboard");
        } catch (error) {
            const message = (
                error as {
                    response?: {
                        data?: {
                            message?: string;
                        };
                    };
                }
            )?.response?.data?.message;

            toast.error(
                message ||
                (
                    isEditMode
                        ? "Unable to resubmit upgrade request"
                        : "Unable to create upgrade request"
                ),
            );
        } finally {
            setSubmitting(false);
        }
    };

    // --------------------------------------------------
    // NAVIGATION
    // --------------------------------------------------

    const goBack = () => {
        navigate("/employee-upgrade/dashboard");
    };

    // --------------------------------------------------
    // APPROVER COMMENTS
    // --------------------------------------------------

    const approverComments = useMemo(
        () =>
            (upgradeRequest?.approvals ?? []).filter(
                (approval) =>
                    Boolean(approval.comments?.trim()),
            ),
        [upgradeRequest],
    );

    // ==================================================
    // JSX
    // ==================================================

    return (
        <div className="flex w-full min-w-0 flex-col gap-4">

            {/* HEADER */}

            <div className="flex min-w-0 items-center gap-3">
                <Button 
                    type="button"
                    variant="add"
                    size="icon"
                    className="shrink-0 cursor-pointer"
                    aria-label="Back to dashboard"
                    onClick={goBack}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-0">
                    <h2 className="text-base font-semibold">
                        {isEditMode
                            ? "Edit upgrade request"
                            : "Initiate upgrade"}
                    </h2>

                    <p className="text-sm text-muted-foreground">
                        {isEditMode
                            ? "Update the sent-back request and resubmit it for approval."
                            : "Create a promotion, increment or department transfer request."}
                    </p>
                </div>
            </div>

            {/* LOADING */}

            {(loading || detailLoading) && (
                <p className="text-sm text-muted-foreground">
                    Loading request details...
                </p>
            )}

            <form
                onSubmit={handleSubmit}
                className="flex w-full min-w-0 flex-col gap-4"
            >

                {/* EMPLOYEE SELECTION */}

                <Card className={cardClass}>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">
                            Employee selection
                        </CardTitle>

                        <CardDescription>
                            {isEditMode
                                ? "Employee details cannot be changed while resubmitting."
                                : "Select company and employee."}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="grid min-w-0 grid-cols-1 gap-4 p-4 pt-2 md:grid-cols-2">

                        {isSuperAdmin && (
                            <div className="min-w-0 space-y-2">
                                <Label>Company *</Label>

                                <Select
                                    value={selectedCompanyId}
                                    onValueChange={setSelectedCompanyId}
                                    disabled={isEditMode}
                                >
                                    <SelectTrigger className={triggerClass}>
                                        <SelectValue placeholder="Select company" />
                                    </SelectTrigger>

                                    <SelectContent
                                        position="popper"
                                        className={contentClass}
                                    >
                                        {companies.map((company) => (
                                            <SelectItem
                                                key={company.id}
                                                value={company.id}
                                            >
                                                {company.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="min-w-0 space-y-2">
                            <Label>Employee *</Label>

                            {isEditMode ? (
                                <div className="flex min-h-10 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm">
                                    <Lock className="h-4 w-4 text-muted-foreground" />

                                    <span>
                                        {currentEmployee?.name ?? "Loading employee..."}
                                        {currentEmployee?.employeeCode
                                            ? ` (${currentEmployee.employeeCode})`
                                            : ""}
                                    </span>
                                </div>
                            ) : (
                                <Select
                                    value={selectedEmployeeId}
                                    onValueChange={handleEmployeeChange}
                                    disabled={!companyId || loading}
                                >
                                    <SelectTrigger className={triggerClass}>
                                        <SelectValue
                                            placeholder={
                                                !companyId
                                                    ? "Select a company first"
                                                    : loading
                                                        ? "Loading employees..."
                                                        : "Select employee"
                                            }
                                        />
                                    </SelectTrigger>

                                    <SelectContent
                                        position="popper"
                                        className={contentClass}
                                    >
                                        {employees.map((employee) => (
                                            <SelectItem
                                                key={employee.id}
                                                value={employee.id}
                                            >
                                                {employee.name}
                                                {employee.employeeCode
                                                    ? ` (${employee.employeeCode})`
                                                    : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* UPGRADE INFORMATION */}

                <Card className={cardClass}>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">
                            Upgrade information
                        </CardTitle>

                        <CardDescription>
                            Enter upgrade type and effective date.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="grid min-w-0 grid-cols-1 gap-4 p-4 pt-2 md:grid-cols-2">

                        <div className="min-w-0 space-y-2">
                            <Label>Upgrade type *</Label>

                            {isEditMode ? (
                                <div className="flex min-h-10 items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm">
                                    <Lock className="h-4 w-4 text-muted-foreground" />

                                    {UPGRADE_TYPES.find(
                                        (type) => type.value === upgradeType,
                                    )?.label ?? upgradeType}
                                </div>
                            ) : (
                                <Select
                                    value={upgradeType}
                                    onValueChange={setUpgradeType}
                                >
                                    <SelectTrigger className={triggerClass}>
                                        <SelectValue placeholder="Select upgrade type" />
                                    </SelectTrigger>

                                    <SelectContent position="popper">
                                        {UPGRADE_TYPES.map((type) => (
                                            <SelectItem
                                                key={type.value}
                                                value={type.value}
                                            >
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="min-w-0 space-y-2">
                            <Label>Effective date *</Label>

                            <Input
                                type="date"
                                className="w-full min-w-0"
                                value={effectiveDate}
                                onChange={(event) =>
                                    setEffectiveDate(event.target.value)
                                }
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* APPROVER COMMENTS */}

                {isEditMode && approverComments.length > 0 && (
                    <Card className={cardClass}>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base">
                                Approval feedback
                            </CardTitle>

                            <CardDescription>
                                Review the comments before resubmitting.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="flex flex-col gap-3 p-4 pt-2">
                            {approverComments.map((approval) => (
                                <div
                                    key={approval.id}
                                    className="rounded-md border bg-muted/30 p-3"
                                >
                                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-medium">
                                            {approval.approver?.name ??
                                                "Approver"}
                                        </p>

                                        <span className="text-xs text-muted-foreground">
                                            {approval.status.replaceAll("_", " ")}
                                        </span>
                                    </div>

                                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                        {approval.comments}
                                    </p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* PROPOSED DETAILS */}

                <Card className={cardClass}>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">
                            Proposed employee details
                        </CardTitle>

                        <CardDescription>
                            Fill only the fields that need to change.
                            Empty fields will remain unchanged.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="grid min-w-0 grid-cols-1 gap-4 p-4 pt-2 md:grid-cols-2">

                        {FIELDS.map((field) => (
                            <div
                                key={field.key}
                                className="min-w-0 space-y-2"
                            >
                                <Label>
                                    New {field.label.toLowerCase()}
                                </Label>

                                {field.kind === "text" ||
                                    field.kind === "money" ? (
                                    <Input
                                        type={
                                            field.kind === "money"
                                                ? "number"
                                                : "text"
                                        }
                                        min={
                                            field.kind === "money"
                                                ? "0"
                                                : undefined
                                        }
                                        step={
                                            field.kind === "money"
                                                ? "0.01"
                                                : undefined
                                        }
                                        placeholder={`Enter new ${field.label.toLowerCase()}`}
                                        disabled={
                                            !currentEmployee ||
                                            detailLoading
                                        }
                                        className="w-full min-w-0"
                                        value={proposedData[field.key]}
                                        onChange={(event) =>
                                            updateProposedData(
                                                field.key,
                                                event.target.value,
                                            )
                                        }
                                    />
                                ) : (
                                    <Select
                                        value={proposedData.categoryId}
                                        onValueChange={(value) =>
                                            updateProposedData(
                                                "categoryId",
                                                value,
                                            )
                                        }
                                        disabled={
                                            !currentEmployee ||
                                            !currentEmployee.branchId ||
                                            categories.length === 0 ||
                                            detailLoading
                                        }
                                    >
                                        <SelectTrigger className={triggerClass}>
                                            <SelectValue
                                                placeholder={
                                                    !currentEmployee?.branchId
                                                        ? "Employee branch not assigned"
                                                        : categories.length === 0
                                                            ? "Department options unavailable"
                                                            : "Select department"
                                                }
                                            />
                                        </SelectTrigger>

                                        <SelectContent
                                            position="popper"
                                            className={contentClass}
                                        >
                                            {departmentOptions.map((option) => (
                                                <SelectItem
                                                    key={option.id}
                                                    value={option.id}
                                                >
                                                    {option.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}

                                {field.kind === "category" &&
                                    isEmployee &&
                                    !isEditMode && (
                                        <p className="text-xs text-muted-foreground">
                                            Department selection requires an authorized department-list endpoint.
                                        </p>
                                    )}
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* CURRENT VS PROPOSED */}

                {currentEmployee && (
                    <Card className={cardClass}>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-base">
                                Current vs proposed
                            </CardTitle>

                            <CardDescription>
                                Review the employee details before submitting.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="min-w-0 p-4 pt-2">
                            <div className="w-full min-w-0 overflow-x-auto rounded-lg border">
                                <table className="w-full min-w-[420px] text-sm">
                                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">
                                                Field
                                            </th>

                                            <th className="px-3 py-2 font-medium">
                                                Current
                                            </th>

                                            <th className="px-3 py-2 font-medium">
                                                Proposed
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {FIELDS.map((field) => {
                                            const changed =
                                                field.key in changes;

                                            return (
                                                <tr
                                                    key={field.key}
                                                    className={
                                                        changed
                                                            ? "border-t bg-amber-50 dark:bg-amber-950/30"
                                                            : "border-t"
                                                    }
                                                >
                                                    <td className="px-3 py-2 text-muted-foreground">
                                                        {field.label}
                                                    </td>

                                                    <td
                                                        className={
                                                            changed
                                                                ? "px-3 py-2 text-muted-foreground line-through"
                                                                : "px-3 py-2"
                                                        }
                                                    >
                                                        {display(
                                                            field.kind,
                                                            currentEmployee[field.key],
                                                        )}
                                                    </td>

                                                    <td className="px-3 py-2 font-medium">
                                                        {changed ? (
                                                            display(
                                                                field.kind,
                                                                changes[field.key],
                                                            )
                                                        ) : (
                                                            <span className="font-normal text-muted-foreground">
                                                                No change
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {hikePercent !== null && (
                                <p className="mt-3 text-sm">
                                    Salary change:{" "}
                                    <span className="font-semibold">
                                        {hikePercent >= 0 ? "+" : ""}
                                        {hikePercent}%
                                    </span>
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* REASON AND REMARKS */}

                <Card className={cardClass}>
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">
                            Reason and remarks
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="grid min-w-0 grid-cols-1 gap-4 p-4 pt-2">

                        <div className="min-w-0 space-y-2">
                            <Label>Reason *</Label>

                            <Textarea
                                placeholder="Example: Promotion due to excellent performance"
                                value={reason}
                                onChange={(event) =>
                                    setReason(event.target.value)
                                }
                                rows={3}
                                className="w-full min-w-0 resize-y"
                            />
                        </div>

                        <div className="min-w-0 space-y-2">
                            <Label>Remarks</Label>

                            <Textarea
                                placeholder="Additional remarks (optional)"
                                value={remarks}
                                onChange={(event) =>
                                    setRemarks(event.target.value)
                                }
                                rows={2}
                                className="w-full min-w-0 resize-y"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* ACTIONS */}

                <div className="flex w-full flex-wrap justify-end gap-2 pb-2">
                    <Button className="cursor-pointer"
                        type="button"
                        variant="add"
                        onClick={goBack}
                    >
                        Cancel
                    </Button>

                    <Button className="cursor-pointer"
                        variant="add"
                        type="submit"
                        disabled={
                            submitting ||
                            loading ||
                            detailLoading ||
                            !currentEmployee
                        }
                    >
                        <Save className="mr-2 h-4 w-4" />

                        {submitting
                            ? "Submitting..."
                            : isEditMode
                                ? "Resubmit upgrade request"
                                : "Submit upgrade request"}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default InitiateUpgrade;
