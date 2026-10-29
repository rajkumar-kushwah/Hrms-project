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
import LocationPicker from "@/pages/LocationPicker";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { isSuperAdminRole } from "@/utilis/roleUtils";
import PhoneInput, {
    isValidPhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { branchSchema } from "@/validation/branch.validation";
import { CompanySelector } from "@/pages/common/CompanySelector";

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

const BranchList = () => {
    const { user } = useAuthStore();

    const isSuperAdmin = isSuperAdminRole(
        user?.role?.name
    );

    const [selectedCompanyId, setSelectedCompanyId] =
        React.useState("");

    const [branches, setBranches] = React.useState<
        Branch[]
    >([]);

    const [open, setOpen] = React.useState(false);
    const [editOpen, setEditOpen] =
        React.useState(false);

    const [selectedBranch, setSelectedBranch] =
        React.useState<Branch | null>(null);

    const [statusDialogOpen, setStatusDialogOpen] =
        React.useState(false);

    const [dangerOpen, setDangerOpen] =
        React.useState(false);

    const [confirmText, setConfirmText] =
        React.useState("");

    const [createMapOpen, setCreateMapOpen] =
        React.useState(false);

    const [editMapOpen, setEditMapOpen] =
        React.useState(false);

    const [searchQuery, setSearchQuery] =
        React.useState("");

    const [statusFilter, setStatusFilter] =
        React.useState("all");

    const [isPhoneValid, setIsPhoneValid] =
        React.useState(false);

    const [phoneError, setPhoneError] =
        React.useState("");

    const [isEditPhoneValid, setIsEditPhoneValid] =
        React.useState(false);

    const [editPhoneError, setEditPhoneError] =
        React.useState("");

    const [errors, setErrors] = React.useState<{
        name?: string;
        email?: string;
        phone?: string;
        city?: string;
        state?: string;
        pincode?: string;
        address?: string;
        managerName?: string;
    }>({});

    const [editErrors, setEditErrors] =
        React.useState<{
            name?: string;
            email?: string;
            phone?: string;
            city?: string;
            state?: string;
            pincode?: string;
            address?: string;
            managerName?: string;
        }>({});

    // CREATE FORM
    const [form, setForm] =
        React.useState<CreateBranchPayload>({ ...initialForm });

    // EDIT FORM
    const [editForm, setEditForm] =
        React.useState<EditForm>({});

    React.useEffect(() => {
        void loadBranches();
    }, [selectedCompanyId, isSuperAdmin]);

    // LOAD BRANCHES
    const loadBranches = async () => {
        if (isSuperAdmin && !selectedCompanyId) {
            setBranches([])
            return
        }
        try {
            const res = await getBranches(
                isSuperAdmin ? selectedCompanyId : undefined
            );

            setBranches(res.data.data);
        } catch (err: any) {
            toast.error(
                err?.message ||
                "Failed to load branches"
            );
        }
    };

    const handleClose = () => {
        setOpen(false);
        setForm({ ...initialForm });
        setErrors({});
        setIsPhoneValid(false);
        setPhoneError("");
        setCreateMapOpen(false);
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

        const schemaField =
            branchSchema.shape[
            name as keyof typeof branchSchema.shape
            ];

        if (!schemaField) return;

        const result = schemaField.safeParse(value);

        setErrors((prev) => ({
            ...prev,
            [name]: result.success
                ? undefined
                : result.error.issues[0]?.message,
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

        const schemaField =
            branchSchema.shape[
            name as keyof typeof branchSchema.shape
            ];

        if (!schemaField) return;

        const result = schemaField.safeParse(value);

        setEditErrors((prev) => ({
            ...prev,
            [name]: result.success
                ? undefined
                : result.error.issues[0]?.message,
        }));
    };

    // FILTER BRANCHES
    const filteredBranches = branches.filter(
        (branch) => {
            const search =
                searchQuery.toLowerCase();

            const matchSearch = searchQuery
                ? branch.name
                    .toLowerCase()
                    .includes(search) ||
                branch.code
                    .toLowerCase()
                    .includes(search)
                : true;

            const matchStatus =
                statusFilter !== "all"
                    ? statusFilter === "active"
                        ? branch.isActive
                        : !branch.isActive
                    : true;

            return matchSearch && matchStatus;
        }
    );

    // CREATE
    const handleSubmit = async () => {
        if (!form.name.trim()) {
            toast.error(
                "Branch name is required"
            );
            return;
        }

        const result =
            branchSchema.safeParse({
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
            const fieldErrors =
                result.error.flatten()
                    .fieldErrors;

            setErrors({
                name: fieldErrors.name?.[0],
                email: fieldErrors.email?.[0],
                phone: fieldErrors.phone?.[0],
                city: fieldErrors.city?.[0],
                state: fieldErrors.state?.[0],
                pincode: fieldErrors.pincode?.[0],
                address:
                    fieldErrors.address?.[0],
                managerName:
                    fieldErrors.managerName?.[0],
            });

            return;
        }

        setErrors({});

        try {
            const res = await createBranch(form);

            toast.success("Branch created successfully!");

            setBranches((prev) => [
                res.data.data,
                ...prev,
            ]);

            handleClose();
            void loadBranches();
        } catch (err: any) {
            toast.error(
                err?.message || "Failed to create branch"
            );
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
        locationName:
            editForm.locationName,
    };

    // UPDATE
    const handleUpdate = async () => {
        if (!selectedBranch) return;

        const result =
            branchSchema.safeParse({
                name: editForm.name,
                email: editForm.email,
                phone: editForm.phone,
                address: editForm.address,
                managerName:
                    editForm.managerName,
                latitude:
                    editForm.latitude,
                longitude:
                    editForm.longitude,
            });

        if (!result.success) {
            const fieldErrors =
                result.error.flatten()
                    .fieldErrors;

            setEditErrors({
                name: fieldErrors.name?.[0],
                email: fieldErrors.email?.[0],
                phone: fieldErrors.phone?.[0],
                address:
                    fieldErrors.address?.[0],
                managerName:
                    fieldErrors.managerName?.[0],
            });

            return;
        }

        setEditErrors({});

        try {
            const res =
                await updateBranch(
                    selectedBranch.id,
                    payload
                );

            setBranches((prev) =>
                prev.map((b) =>
                    b.id === selectedBranch.id
                        ? {
                            ...b,
                            ...res.data.data,
                        }
                        : b
                )
            );

            toast.success(
                "Branch updated successfully!"
            );

            setEditOpen(false);
            setSelectedBranch(null);
        } catch (err: any) {
            toast.error(
                err?.message ||
                "Failed to update branch"
            );
        }
    };

    // STATUS
    const handleToggleStatus = async () => {
        if (!selectedBranch) return;

        try {
            const res =
                await updateBranch(
                    selectedBranch.id,
                    {
                        isActive:
                            !selectedBranch.isActive,
                    }
                );

            toast.success(
                `Branch ${selectedBranch.isActive
                    ? "deactivated"
                    : "activated"
                } successfully!`
            );

            setBranches((prev) =>
                prev.map((b) =>
                    b.id === selectedBranch.id
                        ? {
                            ...b,
                            ...res.data.data,
                        }
                        : b
                )
            );

            setStatusDialogOpen(false);
            setSelectedBranch(null);
        } catch (err: any) {
            toast.error(
                err?.message ||
                "Failed to update branch"
            );
        }
    };

    // PERMANENT DELETE
    const handlePermanentDelete =
        async () => {
            if (!selectedBranch) return;

            if (
                confirmText !==
                selectedBranch.name
            ) {
                toast.error(
                    "Branch name doesn't match"
                );
                return;
            }

            try {
                await permanentDeleteBranch(
                    selectedBranch.id
                );

                toast.success(
                    "Branch permanently deleted!"
                );

                setBranches((prev) =>
                    prev.filter(
                        (b) =>
                            b.id !==
                            selectedBranch.id
                    )
                );

                setDangerOpen(false);
                setEditOpen(false);
                setSelectedBranch(null);
                setConfirmText("");
            } catch (err: any) {
                toast.error(
                    err?.message ||
                    "Failed to delete branch"
                );
            }
        };

    return (
        <div className="flex flex-col gap-4">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                    {isSuperAdmin && (
                        <CompanySelector
                            selectedCompanyId={selectedCompanyId}
                            onCompanyChange={setSelectedCompanyId}
                        />
                    )}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                            type="search"
                            name="branch-search"
                            autoComplete="off"
                            placeholder="Search branch name or code..."
                            value={searchQuery}
                            onChange={(e) =>
                                setSearchQuery(
                                    e.target.value
                                )
                            }
                            className="w-64"
                        />

                        <Select
                            value={statusFilter}
                            onValueChange={
                                setStatusFilter
                            }
                        >
                            <SelectTrigger className="w-36">
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
                    </div>
                </div>
                <Button
                    size="sm"
                    variant="add"
                    onClick={() =>
                        setOpen(true)
                    }
                >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Branch
                </Button>
            </div>

            {/* CREATE DIALOG */}
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
                        <DialogTitle>
                            Add Branch
                        </DialogTitle>

                        <DialogDescription>
                            Fill branch details
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3">
                        {/* NAME */}
                        <div>
                            <Label>
                                Branch Name *
                            </Label>

                            <Input
                                type="text"
                                name="name"
                                placeholder="e.g. Delhi Branch"
                                value={form.name}
                                onChange={
                                    handleChange
                                }
                            />

                            {errors.name && (
                                <p className="mt-1 text-sm text-red-500">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        {/* PHONE + EMAIL */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Label>
                                    Phone
                                </Label>

                                <PhoneInput
                                    value={
                                        form.phone
                                    }
                                    onChange={(
                                        value
                                    ) => {
                                        const phone =
                                            value ||
                                            "";

                                        setForm(
                                            (prev) => ({
                                                ...prev,
                                                phone,
                                            })
                                        );

                                        if (
                                            !phone
                                        ) {
                                            setPhoneError(
                                                ""
                                            );
                                            setIsPhoneValid(
                                                false
                                            );
                                            return;
                                        }

                                        const valid =
                                            isValidPhoneNumber(
                                                phone
                                            );

                                        setIsPhoneValid(
                                            valid
                                        );

                                        setPhoneError(
                                            valid
                                                ? ""
                                                : "Invalid phone number"
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
                                            "h-9 w-full bg-[var(--themePrimary)]/5 focus-visible:border-[var(--themePrimary)] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground",
                                    }}
                                />

                                {phoneError && (
                                    <p className="mt-1 text-sm text-red-500 flex gap-2 items-center">
                                        <XCircle className="h-4 w-4" />
                                        {
                                            phoneError
                                        }
                                    </p>
                                )}

                                {isPhoneValid &&
                                    !phoneError && (
                                        <p className="mt-1 text-sm text-green-600 flex gap-2 items-center">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Valid phone number
                                        </p>
                                    )}
                            </div>

                            <div className="flex-1">
                                <Label>
                                    Email
                                </Label>

                                <Input
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    value={
                                        form.email
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />

                                {errors.email && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {
                                            errors.email
                                        }
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* CITY + STATE + PINCODE */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Label>
                                    City
                                </Label>

                                <Input
                                    type="text"
                                    name="city"
                                    placeholder="City"
                                    value={
                                        form.city
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />

                                {errors.city && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {
                                            errors.city
                                        }
                                    </p>
                                )}
                            </div>

                            <div className="flex-1">
                                <Label>
                                    State
                                </Label>

                                <Input
                                    type="text"
                                    name="state"
                                    placeholder="State"
                                    value={
                                        form.state
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />

                                {errors.state && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {
                                            errors.state
                                        }
                                    </p>
                                )}
                            </div>

                            <div className="flex-1">
                                <Label>
                                    Pincode
                                </Label>

                                <Input
                                    type="number"
                                    name="pincode"
                                    placeholder="Pincode"
                                    value={
                                        form.pincode
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />

                                {errors.pincode && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {
                                            errors.pincode
                                        }
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* ADDRESS */}
                        <div>
                            <Label>
                                Address
                            </Label>

                            <Input
                                type="text"
                                name="address"
                                placeholder="Full Address"
                                value={
                                    form.address
                                }
                                onChange={
                                    handleChange
                                }
                            />

                            {errors.address && (
                                <span className="text-red-500 text-xs">
                                    {
                                        errors.address
                                    }
                                </span>
                            )}
                        </div>

                        {/* MANAGER */}
                        <div>
                            <Label>
                                Manager Name
                            </Label>

                            <Input
                                type="text"
                                name="managerName"
                                placeholder="Manager Name"
                                value={
                                    form.managerName
                                }
                                onChange={
                                    handleChange
                                }
                            />

                            {errors.managerName && (
                                <span className="text-red-500 text-xs">
                                    {
                                        errors.managerName
                                    }
                                </span>
                            )}
                        </div>

                        {/* LOCATION */}
                        <div>
                            <Label>
                                Branch Location
                            </Label>

                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    className="cursor-pointer"
                                    onClick={() =>
                                        setCreateMapOpen(
                                            true
                                        )
                                    }
                                    type="button"
                                >
                                    <MapPin className="h-4 w-4 mr-2" />

                                    {form.latitude !==
                                        undefined
                                        ? "Update Location"
                                        : "Set Location"}
                                </Button>

                                {form.latitude !==
                                    undefined &&
                                    form.longitude !==
                                    undefined && (
                                        <span className="text-xs text-muted-foreground">
                                            {form.latitude.toFixed(
                                                4
                                            )}
                                            ,{" "}
                                            {form.longitude.toFixed(
                                                4
                                            )}{" "}
                                            —{" "}
                                            {form.geoRadius ??
                                                0}{" "}
                                            m radius
                                        </span>
                                    )}
                            </div>
                        </div>

                        <Button
                            variant="add"
                            onClick={
                                handleSubmit
                            }
                        >
                            Create Branch
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* CREATE LOCATION PICKER */}
            <LocationPicker
                open={createMapOpen}
                onOpenChange={
                    setCreateMapOpen
                }
                initialLat={form.latitude}
                initialLng={form.longitude}
                initialRadius={
                    form.geoRadius
                }
                initialLocationName={
                    form.locationName
                }
                onConfirm={(
                    lat,
                    lng,
                    radius,
                    locationName
                ) => {
                    setForm((prev) => ({
                        ...prev,
                        latitude: lat,
                        longitude: lng,
                        geoRadius: radius,
                        locationName,
                    }));
                }}
            />

            {/* EDIT DIALOG */}
            <Dialog
                open={editOpen}
                onOpenChange={setEditOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Edit Branch —{" "}
                            {
                                selectedBranch?.name
                            }
                        </DialogTitle>

                        <DialogDescription>
                            Fill branch details
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3 overflow-y-auto pr-2">
                        {/* NAME */}
                        <div>
                            <Label>
                                Branch Name
                            </Label>

                            <Input
                                type="text"
                                name="name"
                                value={
                                    editForm.name ??
                                    ""
                                }
                                onChange={
                                    handleEditChange
                                }
                            />

                            {editErrors.name && (
                                <p className="mt-1 text-sm text-red-500">
                                    {
                                        editErrors.name
                                    }
                                </p>
                            )}
                        </div>

                        {/* PHONE + EMAIL */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Label>
                                    Phone
                                </Label>

                                <PhoneInput
                                    value={
                                        editForm.phone ??
                                        ""
                                    }
                                    onChange={(
                                        value
                                    ) => {
                                        const phone =
                                            value ||
                                            "";

                                        setEditForm(
                                            (prev) => ({
                                                ...prev,
                                                phone,
                                            })
                                        );

                                        if (
                                            !phone
                                        ) {
                                            setEditPhoneError(
                                                ""
                                            );
                                            setIsEditPhoneValid(
                                                false
                                            );
                                            return;
                                        }

                                        const valid =
                                            isValidPhoneNumber(
                                                phone
                                            );

                                        setIsEditPhoneValid(
                                            valid
                                        );

                                        setEditPhoneError(
                                            valid
                                                ? ""
                                                : "Invalid phone number"
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
                                            "h-9 w-full bg-[var(--themePrimary)]/5 focus-visible:border-[var(--themePrimary)] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground",
                                    }}
                                />

                                {editPhoneError && (
                                    <p className="mt-1 text-sm text-red-500 flex gap-2 items-center">
                                        <XCircle className="h-4 w-4" />
                                        {
                                            editPhoneError
                                        }
                                    </p>
                                )}

                                {isEditPhoneValid &&
                                    !editPhoneError && (
                                        <p className="mt-1 text-sm text-green-600 flex gap-2 items-center">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Valid phone number
                                        </p>
                                    )}
                            </div>

                            <div className="flex-1">
                                <Label>
                                    Email
                                </Label>

                                <Input
                                    type="email"
                                    name="email"
                                    value={
                                        editForm.email ??
                                        ""
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                />

                                {editErrors.email && (
                                    <p className="mt-1 text-sm text-red-500">
                                        {
                                            editErrors.email
                                        }
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* CITY + STATE + PINCODE */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <Label>
                                    City
                                </Label>

                                <Input
                                    type="text"
                                    name="city"
                                    value={
                                        editForm.city ??
                                        ""
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                />
                            </div>

                            <div className="flex-1">
                                <Label>
                                    State
                                </Label>

                                <Input
                                    type="text"
                                    name="state"
                                    value={
                                        editForm.state ??
                                        ""
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                />
                            </div>

                            <div className="flex-1">
                                <Label>
                                    Pincode
                                </Label>

                                <Input
                                    type="number"
                                    name="pincode"
                                    value={
                                        editForm.pincode ??
                                        ""
                                    }
                                    onChange={
                                        handleEditChange
                                    }
                                />
                            </div>
                        </div>

                        {/* ADDRESS */}
                        <div>
                            <Label>
                                Address
                            </Label>

                            <Input
                                type="text"
                                name="address"
                                value={
                                    editForm.address ??
                                    ""
                                }
                                onChange={
                                    handleEditChange
                                }
                            />

                            {editErrors.address && (
                                <p className="mt-1 text-sm text-red-500">
                                    {
                                        editErrors.address
                                    }
                                </p>
                            )}
                        </div>

                        {/* MANAGER */}
                        <div>
                            <Label>
                                Manager Name
                            </Label>

                            <Input
                                type="text"
                                name="managerName"
                                value={
                                    editForm.managerName ??
                                    ""
                                }
                                onChange={
                                    handleEditChange
                                }
                            />

                            {editErrors.managerName && (
                                <p className="mt-1 text-sm text-red-500">
                                    {
                                        editErrors.managerName
                                    }
                                </p>
                            )}
                        </div>

                        {/* LOCATION */}
                        <div>
                            <Label>
                                Branch Location
                            </Label>

                            <div className="flex items-center gap-3">
                                <Button
                                    variant="add"
                                    type="button"
                                    onClick={() =>
                                        setEditMapOpen(
                                            true
                                        )
                                    }
                                >
                                    <MapPin className="h-4 w-4 mr-2" />

                                    {editForm.latitude !==
                                        undefined
                                        ? "Update Location"
                                        : "Set Location"}
                                </Button>

                                {editForm.latitude !=
                                    null &&
                                    editForm.longitude !=
                                    null && (
                                        <span className="text-xs text-muted-foreground">
                                            {editForm.latitude.toFixed(
                                                4
                                            )}
                                            ,{" "}
                                            {editForm.longitude.toFixed(
                                                4
                                            )}{" "}
                                            —{" "}
                                            {editForm.geoRadius ??
                                                0}{" "}
                                            m radius
                                        </span>
                                    )}
                            </div>
                        </div>

                        <Button
                            variant="add"
                            onClick={
                                handleUpdate
                            }
                        >
                            Update Branch
                        </Button>
                    </div>

                    {/* EDIT LOCATION PICKER */}
                    <LocationPicker
                        open={editMapOpen}
                        onOpenChange={
                            setEditMapOpen
                        }
                        initialLat={
                            editForm.latitude
                        }
                        initialLng={
                            editForm.longitude
                        }
                        initialRadius={
                            editForm.geoRadius
                        }
                        initialLocationName={
                            editForm.locationName
                        }
                        onConfirm={(
                            lat,
                            lng,
                            radius,
                            locationName
                        ) => {
                            setEditForm(
                                (prev) => ({
                                    ...prev,
                                    latitude: lat,
                                    longitude: lng,
                                    geoRadius:
                                        radius,
                                    locationName,
                                })
                            );
                        }}
                    />

                    {/* DANGER ZONE */}
                    {isSuperAdmin && (
                        <div className="border border-red-200 rounded-lg p-4 mt-4 bg-red-50">
                            <h4 className="text-red-700 font-semibold flex items-center gap-2 text-sm">
                                <AlertTriangle className="h-4 w-4" />
                                Danger Zone
                            </h4>

                            <p className="text-xs text-red-600 mt-1">
                                Permanent Delete
                                this branch.
                                Only possible if
                                no employee/user
                                is assigned to this
                                branch.
                            </p>

                            <Button
                                variant="destructive"
                                size="sm"
                                className="sm cursor-pointer"
                                onClick={() =>
                                    setDangerOpen(
                                        true
                                    )
                                }
                            >
                                Delete Permanently
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* PERMANENT DELETE CONFIRM */}
            <Dialog
                open={dangerOpen}
                onOpenChange={
                    setDangerOpen
                }
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-700">
                            Permanent Delete
                            Branch
                        </DialogTitle>

                        <DialogDescription>
                            Are you sure you want
                            to delete{" "}
                            <strong className="font-semibold bg-muted">
                                {
                                    selectedBranch?.name
                                }
                            </strong>
                            ? This action cannot
                            be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <div>
                        <Label>
                            Type{" "}
                            <strong>
                                {
                                    selectedBranch?.name
                                }
                            </strong>{" "}
                            To Confirm
                        </Label>

                        <Input
                            type="text"
                            name="confirm"
                            value={confirmText}
                            onChange={(e) =>
                                setConfirmText(
                                    e.target.value
                                )
                            }
                            placeholder="Type branch name"
                        />
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="outline"
                            onClick={() =>
                                setDangerOpen(
                                    false
                                )
                            }
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="destructive"
                            disabled={
                                confirmText !==
                                selectedBranch?.name
                            }
                            onClick={
                                handlePermanentDelete
                            }
                        >
                            I understand, delete
                            permanently
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* STATUS DIALOG */}
            <Dialog
                open={statusDialogOpen}
                onOpenChange={
                    setStatusDialogOpen
                }
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Update Branch
                        </DialogTitle>

                        <DialogDescription>
                            You are about to{" "}
                            <strong>
                                {
                                    selectedBranch?.isActive
                                        ? "deactivate"
                                        : "activate"
                                }
                            </strong>{" "}
                            <strong>
                                {
                                    selectedBranch?.name
                                }
                            </strong>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="outline"
                            onClick={() =>
                                setStatusDialogOpen(
                                    false
                                )
                            }
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={
                                handleToggleStatus
                            }
                        >
                            {selectedBranch?.isActive
                                ? "Deactivate"
                                : "Activate"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* TABLE */}
            <div className="bg-card grid grid-cols-1 rounded border w-full overflow-x-auto">
                <div className="h-full overflow-auto">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                                <TableHead>
                                    #
                                </TableHead>

                                <TableHead className="min-w-37.5">
                                    Name
                                </TableHead>

                                <TableHead className="min-w-25">
                                    Code
                                </TableHead>

                                {isSuperAdmin && (
                                    <TableHead className="min-w-37.5">
                                        Company
                                    </TableHead>
                                )}

                                <TableHead className="min-w-25">
                                    Phone
                                </TableHead>

                                <TableHead className="min-w-37.5">
                                    Manager
                                </TableHead>

                                <TableHead className="min-w-40">
                                    Location
                                </TableHead>

                                <TableHead className="min-w-20">
                                    Status
                                </TableHead>

                                <TableHead className="sticky right-0 bg-muted">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {filteredBranches.map(
                                (
                                    branch,
                                    index
                                ) => (
                                    <TableRow
                                        key={
                                            branch.id
                                        }
                                    >
                                        <TableCell>
                                            {index +
                                                1}
                                        </TableCell>

                                        <TableCell>
                                            {
                                                branch.name
                                            }
                                        </TableCell>

                                        <TableCell>
                                            {
                                                branch.code
                                            }
                                        </TableCell>

                                        {isSuperAdmin && (
                                            <TableCell>
                                                {branch
                                                    .company
                                                    ?.name ??
                                                    "—"}
                                            </TableCell>
                                        )}

                                        <TableCell>
                                            {branch.phone ??
                                                "—"}
                                        </TableCell>

                                        <TableCell>
                                            {branch.managerName ??
                                                "—"}
                                        </TableCell>

                                        <TableCell>
                                            {branch.locationName ??
                                                "—"}
                                        </TableCell>

                                        <TableCell>
                                            <Badge
                                                className={
                                                    branch.isActive
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                }
                                            >
                                                {branch.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="sticky right-0 bg-card">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    asChild
                                                >
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>

                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuGroup>
                                                        {/* EDIT */}
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setSelectedBranch(
                                                                    branch
                                                                );

                                                                setEditForm(
                                                                    {
                                                                        name: branch.name,
                                                                        address:
                                                                            branch.address,
                                                                        phone:
                                                                            branch.phone,
                                                                        email:
                                                                            branch.email,
                                                                        city:
                                                                            branch.city,
                                                                        state:
                                                                            branch.state,
                                                                        pincode:
                                                                            branch.pincode,
                                                                        managerName:
                                                                            branch.managerName,

                                                                        latitude:
                                                                            branch.latitude,
                                                                        longitude:
                                                                            branch.longitude,
                                                                        geoRadius:
                                                                            branch.geoRadius,
                                                                        locationName:
                                                                            branch.locationName,
                                                                    }
                                                                );

                                                                const phone =
                                                                    branch.phone ||
                                                                    "";

                                                                setIsEditPhoneValid(
                                                                    !!phone &&
                                                                    isValidPhoneNumber(
                                                                        phone
                                                                    )
                                                                );

                                                                setEditPhoneError(
                                                                    phone &&
                                                                        !isValidPhoneNumber(
                                                                            phone
                                                                        )
                                                                        ? "Invalid phone number"
                                                                        : ""
                                                                );

                                                                setEditErrors(
                                                                    {}
                                                                );

                                                                setEditOpen(
                                                                    true
                                                                );
                                                            }}
                                                        >
                                                            Edit
                                                        </DropdownMenuItem>

                                                        {/* STATUS */}
                                                        <DropdownMenuItem
                                                            variant="destructive"
                                                            className="text-red-600"
                                                            onClick={() => {
                                                                setSelectedBranch(
                                                                    branch
                                                                );

                                                                setStatusDialogOpen(
                                                                    true
                                                                );
                                                            }}
                                                        >
                                                            {branch.isActive
                                                                ? "Deactivate"
                                                                : "Activate"}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuGroup>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            )}

                            {filteredBranches.length ===
                                0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={
                                                isSuperAdmin
                                                    ? 9
                                                    : 8
                                            }
                                            className="text-center text-muted-foreground py-8"
                                        >
                                            {isSuperAdmin && !selectedCompanyId ? (
                                                <p className="text-sm text-muted-foreground">
                                                    Select a company to view and manage employees.
                                                </p>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
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