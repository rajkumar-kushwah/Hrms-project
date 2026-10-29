import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";

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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertTriangle, MoreVertical, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/auth.store";
import type {
    Category,
    CreateCategoryPayload,
    UpdateCategoryPayload,
} from "@/types/category.types";
import type { Branch } from "@/types/branch.types";

import {
    getCategories,
    createCategory,
    updateCategory,
    permanentDeleteCategory,
} from "@/services/category.service";
import { getBranches } from "@/services/branch.service";
import { isSuperAdminRole } from "@/utilis/roleUtils";
import { CompanySelector } from "@/pages/common/CompanySelector";

type CategoryField = "name" | "description" | "branchId";
type EditField = "name" | "description";

type FormErrors = Partial<Record<CategoryField, string>>;
type EditErrors = Partial<Record<EditField, string>>;

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (typeof error !== "object" || error === null) {
        return fallback;
    }

    const err = error as {
        message?: string;
        response?: {
            data?: {
                message?: string;
            };
        };
    };

    return err.response?.data?.message || err.message || fallback;
};

const validateName = (value: string): string => {
    const name = value.trim();

    if (!name) {
        return "Category name is required.";
    }

    if (name.length > NAME_MAX_LENGTH) {
        return `Category name cannot exceed ${NAME_MAX_LENGTH} characters.`;
    }

    return "";
};

const validateDescription = (value: string): string => {
    if (value.length > DESCRIPTION_MAX_LENGTH) {
        return `Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`;
    }

    return "";
};

const CategoryList = () => {
    const { user } = useAuthStore();
    const isSuperAdmin = isSuperAdminRole(user?.role?.name);

    const [selectedCompanyId, setSelectedCompanyId] = useState("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [open, setOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [dangerOpen, setDangerOpen] = useState(false);

    const [selectedCategory, setSelectedCategory] =
        useState<Category | null>(null);

    const [confirmText, setConfirmText] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [branchFilter, setBranchFilter] = useState("all");

    const [form, setForm] = useState<CreateCategoryPayload>({
        name: "",
        description: "",
        branchId: "",
    });

    const [editForm, setEditForm] = useState<UpdateCategoryPayload>({});
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [editErrors, setEditErrors] = useState<EditErrors>({});

    const [touched, setTouched] = useState<
        Partial<Record<CategoryField, boolean>>
    >({});

    const [editTouched, setEditTouched] = useState<
        Partial<Record<EditField, boolean>>
    >({});

    const companyReady = !isSuperAdmin || Boolean(selectedCompanyId);

    const resetCreateForm = () => {
        setForm({
            name: "",
            description: "",
            branchId: "",
        });
        setFormErrors({});
        setTouched({});
    };

    const handleCompanyChange = (companyId: string) => {
        setSelectedCompanyId(companyId);

        // Do not keep data from the previous company.
        setCategories([]);
        setBranches([]);
        setBranchFilter("all");

        resetCreateForm();
        setEditForm({});
        setEditErrors({});
        setEditTouched({});

        setOpen(false);
        setEditOpen(false);
        setDangerOpen(false);
        setStatusDialogOpen(false);
        setSelectedCategory(null);
        setConfirmText("");
    };

    // Load categories and branches for the currently selected company.
    useEffect(() => {
        let cancelled = false;

        const loadData = async () => {
            if (!companyReady) {
                setCategories([]);
                setBranches([]);
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                const [categoryResponse, branchResponse] = await Promise.all([
                    getCategories(
                        isSuperAdmin ? selectedCompanyId : undefined,
                    ),
                    getBranches(
                        isSuperAdmin ? selectedCompanyId : undefined,
                    ),
                ]);

                if (cancelled) return;

                setCategories(categoryResponse.data.data ?? []);

                const activeBranches: Branch[] = (
                    branchResponse.data.data ?? []
                ).filter((branch: Branch) => branch.isActive);

                setBranches(activeBranches);
            } catch (error: unknown) {
                if (cancelled) return;

                setCategories([]);
                setBranches([]);
                toast.error(
                    getErrorMessage(error, "Failed to load categories and branches."),
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadData();

        return () => {
            cancelled = true;
        };
    }, [selectedCompanyId, isSuperAdmin, companyReady]);

    const handleCreateChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;

        if (name === "name") {
            setForm((prev) => ({ ...prev, name: value }));

            if (touched.name) {
                setFormErrors((prev) => ({
                    ...prev,
                    name: validateName(value) || undefined,
                }));
            }

            return;
        }

        if (name === "description") {
            setForm((prev) => ({ ...prev, description: value }));

            if (touched.description) {
                setFormErrors((prev) => ({
                    ...prev,
                    description: validateDescription(value) || undefined,
                }));
            }
        }
    };

    const handleBranchChange = (branchId: string) => {
        setForm((prev) => ({ ...prev, branchId }));

        if (touched.branchId) {
            setFormErrors((prev) => ({
                ...prev,
                branchId: branchId ? undefined : "Please select a branch.",
            }));
        }
    };

    const handleCreateBlur = (field: CategoryField) => {
        setTouched((prev) => ({ ...prev, [field]: true }));

        const error =
            field === "name"
                ? validateName(form.name)
                : field === "description"
                    ? validateDescription(form.description ?? "")
                    : form.branchId
                        ? ""
                        : "Please select a branch.";

        setFormErrors((prev) => ({
            ...prev,
            [field]: error || undefined,
        }));
    };

    const validateCreateForm = (): boolean => {
        const errors: FormErrors = {
            name: validateName(form.name) || undefined,
            description:
                validateDescription(form.description ?? "") || undefined,
            branchId: form.branchId ? undefined : "Please select a branch.",
        };

        setFormErrors(errors);
        setTouched({
            name: true,
            description: true,
            branchId: true,
        });

        return !Object.values(errors).some(Boolean);
    };

    const handleEditChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;

        if (name === "name") {
            setEditForm((prev) => ({ ...prev, name: value }));

            if (editTouched.name) {
                setEditErrors((prev) => ({
                    ...prev,
                    name: validateName(value) || undefined,
                }));
            }

            return;
        }

        if (name === "description") {
            setEditForm((prev) => ({ ...prev, description: value }));

            if (editTouched.description) {
                setEditErrors((prev) => ({
                    ...prev,
                    description: validateDescription(value) || undefined,
                }));
            }
        }
    };

    const handleEditBlur = (field: EditField) => {
        setEditTouched((prev) => ({ ...prev, [field]: true }));

        const value =
            field === "name"
                ? String(editForm.name ?? "")
                : String(editForm.description ?? "");

        const error =
            field === "name"
                ? validateName(value)
                : validateDescription(value);

        setEditErrors((prev) => ({
            ...prev,
            [field]: error || undefined,
        }));
    };

    const validateEditForm = (): boolean => {
        const errors: EditErrors = {
            name: validateName(String(editForm.name ?? "")) || undefined,
            description:
                validateDescription(String(editForm.description ?? "")) ||
                undefined,
        };

        setEditErrors(errors);
        setEditTouched({ name: true, description: true });

        return !Object.values(errors).some(Boolean);
    };

    const handleCreate = async () => {
        if (!companyReady) {
            toast.error("Please select a company first.");
            return;
        }

        if (!validateCreateForm()) {
            toast.error("Please fix the validation errors.");
            return;
        }

        setSubmitting(true);

        try {
            const payload: CreateCategoryPayload = {
                name: form.name.trim(),
                description: (form.description ?? "").trim(),
                branchId: form.branchId,
            };

            const response = await createCategory(payload);

            setCategories((prev) => [response.data.data, ...prev]);
            toast.success("Category created successfully.");

            setOpen(false);
            resetCreateForm();
        } catch (error: unknown) {
            toast.error(
                getErrorMessage(error, "Failed to create category."),
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedCategory) return;

        if (!validateEditForm()) {
            toast.error("Please fix the validation errors.");
            return;
        }

        setUpdating(true);

        try {
            const payload: UpdateCategoryPayload = {
                name: String(editForm.name ?? "").trim(),
                description: String(editForm.description ?? "").trim(),
            };

            const response = await updateCategory(
                selectedCategory.id,
                payload,
            );

            const updatedCategory: Category | undefined =
                response.data?.data;

            setCategories((prev) =>
                prev.map((category) =>
                    category.id === selectedCategory.id
                        ? updatedCategory
                            ? { ...category, ...updatedCategory }
                            : {
                                ...category,
                                ...payload,
                            }
                        : category,
                ),
            );

            toast.success("Category updated successfully.");
            setEditOpen(false);
            setSelectedCategory(null);
            setEditForm({});
            setEditErrors({});
            setEditTouched({});
        } catch (error: unknown) {
            toast.error(
                getErrorMessage(error, "Failed to update category."),
            );
        } finally {
            setUpdating(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!selectedCategory) return;

        const nextStatus = !selectedCategory.isActive;

        setUpdating(true);

        try {
            await updateCategory(selectedCategory.id, {
                isActive: nextStatus,
            });

            setCategories((prev) =>
                prev.map((category) =>
                    category.id === selectedCategory.id
                        ? { ...category, isActive: nextStatus }
                        : category,
                ),
            );

            toast.success(
                `Category ${nextStatus ? "activated" : "deactivated"} successfully.`,
            );

            setStatusDialogOpen(false);
            setSelectedCategory(null);
        } catch (error: unknown) {
            toast.error(
                getErrorMessage(error, "Failed to update category status."),
            );
        } finally {
            setUpdating(false);
        }
    };

    const handlePermanentDelete = async () => {
        if (!selectedCategory) return;

        if (confirmText !== selectedCategory.name) {
            toast.error("Category name doesn't match.");
            return;
        }

        setDeleting(true);

        try {
            await permanentDeleteCategory(selectedCategory.id);

            setCategories((prev) =>
                prev.filter((category) => category.id !== selectedCategory.id),
            );

            toast.success("Category permanently deleted.");
            setDangerOpen(false);
            setEditOpen(false);
            setSelectedCategory(null);
            setConfirmText("");
        } catch (error: unknown) {
            toast.error(
                getErrorMessage(error, "Failed to permanently delete category."),
            );
        } finally {
            setDeleting(false);
        }
    };

    const openEditDialog = (category: Category) => {
        setSelectedCategory(category);
        setEditForm({
            name: category.name,
            description: category.description ?? "",
        });
        setEditErrors({});
        setEditTouched({});
        setEditOpen(true);
    };

    const filteredCategories = categories.filter((category) => {
        const matchSearch = category.name
            .toLowerCase()
            .includes(searchQuery.trim().toLowerCase());

        const matchStatus =
            statusFilter === "all" ||
            (statusFilter === "active"
                ? category.isActive
                : !category.isActive);

        const matchBranch =
            branchFilter === "all" ||
            category.branch?.id === branchFilter;

        return matchSearch && matchStatus && matchBranch;
    });

    const fieldClass = (hasError: boolean) =>
        `h-10 w-full ${hasError ? "border-destructive focus-visible:ring-destructive" : ""}`;

    return (
        <div className="flex min-w-0 flex-col gap-4">
            {/* Header and filters */}
            {/* Header and Filters */}
            <div className="flex flex-col gap-3">
                {/* Company + Add Button */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    {isSuperAdmin && (
                        <div className="w-full min-w-0 sm:max-w-60">
                            <CompanySelector
                                selectedCompanyId={selectedCompanyId}
                                onCompanyChange={handleCompanyChange}
                            />
                        </div>
                    )}

                    <Button
                        size="sm"
                        variant="add"
                        className="h-9 w-fit shrink-0 cursor-pointer self-end px-3"
                        disabled={!companyReady || loading}
                        onClick={() => {
                            resetCreateForm();
                            setOpen(true);
                        }}
                    >
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Add Category
                    </Button>
                </div>

                {/* Search + Filters */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                        type="search"
                        name="category-search"
                        autoComplete="off"
                        placeholder="Search category name..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-9 w-full sm:max-w-60"
                    />
                    <div className="flex gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-9 sm:w-36 sm:shrink-0">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent position="popper">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={branchFilter} onValueChange={setBranchFilter}>
                            <SelectTrigger className="h-9 sm:w-44 sm:shrink-0">
                                <SelectValue placeholder="All Branches" />
                            </SelectTrigger>
                            <SelectContent position="popper">
                                <SelectItem value="all">All Branches</SelectItem>
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {isSuperAdmin && !selectedCompanyId && (
                    <p className="text-sm text-muted-foreground">
                        Select a company to view and manage its categories.
                    </p>
                )}
            </div>

            {/* Create Category Dialog */}
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    setOpen(nextOpen);
                    if (!nextOpen) resetCreateForm();
                }}
            >
                <DialogContent className="w-[calc(100%-2rem)] max-w-lg rounded-lg">
                    <DialogHeader>
                        <DialogTitle>Add Category</DialogTitle>
                        <DialogDescription>
                            Enter the category details below.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="category-branch">
                                Branch <span className="text-destructive">*</span>
                            </Label>

                            <Select
                                value={form.branchId}
                                onValueChange={handleBranchChange}
                                disabled={!companyReady || branches.length === 0}
                            >
                                <SelectTrigger
                                    id="category-branch"
                                    className={`h-10 w-full ${formErrors.branchId
                                        ? "border-destructive focus:ring-destructive"
                                        : ""
                                        }`}
                                    onBlur={() => handleCreateBlur("branchId")}
                                >
                                    <SelectValue
                                        placeholder={
                                            !companyReady
                                                ? "Select a company first"
                                                : branches.length === 0
                                                    ? "No active branches available"
                                                    : "Select branch"
                                        }
                                    />
                                </SelectTrigger>

                                <SelectContent position="popper" className="max-h-60">
                                    {branches.map((branch) => (
                                        <SelectItem
                                            key={branch.id}
                                            value={branch.id}
                                        >
                                            {branch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {formErrors.branchId && (
                                <p className="text-xs text-destructive">
                                    {formErrors.branchId}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <Label htmlFor="category-name">
                                    Category Name{" "}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                    {form.name.length}/{NAME_MAX_LENGTH}
                                </span>
                            </div>

                            <Input
                                id="category-name"
                                name="name"
                                placeholder="e.g. Sales Team"
                                value={form.name}
                                maxLength={NAME_MAX_LENGTH + 1}
                                onChange={handleCreateChange}
                                onBlur={() => handleCreateBlur("name")}
                                aria-invalid={Boolean(formErrors.name)}
                                className={fieldClass(Boolean(formErrors.name))}
                            />

                            {formErrors.name && (
                                <p className="text-xs text-destructive">
                                    {formErrors.name}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <Label htmlFor="category-description">
                                    Description
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                    {(form.description ?? "").length}/
                                    {DESCRIPTION_MAX_LENGTH}
                                </span>
                            </div>

                            <Input
                                id="category-description"
                                name="description"
                                placeholder="Description (optional)"
                                value={form.description ?? ""}
                                maxLength={DESCRIPTION_MAX_LENGTH + 1}
                                onChange={handleCreateChange}
                                onBlur={() =>
                                    handleCreateBlur("description")
                                }
                                aria-invalid={Boolean(formErrors.description)}
                                className={fieldClass(
                                    Boolean(formErrors.description),
                                )}
                            />

                            {formErrors.description && (
                                <p className="text-xs text-destructive">
                                    {formErrors.description}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="add"
                                onClick={handleCreate}
                                disabled={submitting || !companyReady}
                            >
                                {submitting ? "Creating..." : "Create Category"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Category Dialog */}
            <Dialog
                open={editOpen}
                onOpenChange={(nextOpen) => {
                    setEditOpen(nextOpen);

                    if (!nextOpen) {
                        setDangerOpen(false);
                        setConfirmText("");
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Edit Category
                            {selectedCategory ? ` — ${selectedCategory.name}` : ""}
                        </DialogTitle>
                        <DialogDescription>
                            Update the category details below.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <Label htmlFor="edit-category-name">
                                    Category Name{" "}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                    {String(editForm.name ?? "").length}/
                                    {NAME_MAX_LENGTH}
                                </span>
                            </div>

                            <Input
                                id="edit-category-name"
                                name="name"
                                value={String(editForm.name ?? "")}
                                maxLength={NAME_MAX_LENGTH + 1}
                                onChange={handleEditChange}
                                onBlur={() => handleEditBlur("name")}
                                aria-invalid={Boolean(editErrors.name)}
                                className={fieldClass(Boolean(editErrors.name))}
                            />

                            {editErrors.name && (
                                <p className="text-xs text-destructive">
                                    {editErrors.name}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <Label htmlFor="edit-category-description">
                                    Description
                                </Label>
                                <span className="text-xs text-muted-foreground">
                                    {String(editForm.description ?? "").length}/
                                    {DESCRIPTION_MAX_LENGTH}
                                </span>
                            </div>

                            <Input
                                id="edit-category-description"
                                name="description"
                                value={String(editForm.description ?? "")}
                                maxLength={DESCRIPTION_MAX_LENGTH + 1}
                                onChange={handleEditChange}
                                onBlur={() =>
                                    handleEditBlur("description")
                                }
                                aria-invalid={Boolean(editErrors.description)}
                                className={fieldClass(
                                    Boolean(editErrors.description),
                                )}
                            />

                            {editErrors.description && (
                                <p className="text-xs text-destructive">
                                    {editErrors.description}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setEditOpen(false)}
                                disabled={updating}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="add"
                                onClick={handleUpdate}
                                disabled={updating}
                            >
                                {updating ? "Updating..." : "Update Category"}
                            </Button>
                        </div>
                    </div>

                    {isSuperAdmin && (
                        <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                                <AlertTriangle className="h-4 w-4" />
                                Danger Zone
                            </h4>

                            <p className="mt-1 text-xs text-muted-foreground">
                                Permanently delete this category. This may fail
                                if employees or users are assigned to it.
                            </p>

                            <Button
                                variant="destructive"
                                size="sm"
                                className="mt-3 cursor-pointer"
                                onClick={() => {
                                    setConfirmText("");
                                    setDangerOpen(true);
                                }}
                            >
                                Permanent Delete
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Permanent Delete Confirmation */}
            <Dialog
                open={dangerOpen}
                onOpenChange={setDangerOpen}
            >
                <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
                    <DialogHeader>
                        <DialogTitle className="text-destructive">
                            Permanently Delete Category
                        </DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. Type the category
                            name exactly to confirm deletion.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-2">
                        <Label htmlFor="confirm-category-delete">
                            Type{" "}
                            <span className="font-semibold text-foreground">
                                {selectedCategory?.name}
                            </span>{" "}
                            to confirm
                        </Label>

                        <Input
                            id="confirm-category-delete"
                            name="confirm"
                            autoComplete="off"
                            value={confirmText}
                            onChange={(event) =>
                                setConfirmText(event.target.value)
                            }
                            className="h-10 w-full"
                        />
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDangerOpen(false)}
                            disabled={deleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={
                                deleting ||
                                confirmText !== selectedCategory?.name
                            }
                            onClick={handlePermanentDelete}
                        >
                            {deleting ? "Deleting..." : "Delete Permanently"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Activate / Deactivate Confirmation */}
            <Dialog
                open={statusDialogOpen}
                onOpenChange={setStatusDialogOpen}
            >
                <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
                    <DialogHeader>
                        <DialogTitle>Update Category Status</DialogTitle>
                        <DialogDescription>
                            You are about to{" "}
                            <strong>
                                {selectedCategory?.isActive
                                    ? "deactivate"
                                    : "activate"}
                            </strong>{" "}
                            <strong>{selectedCategory?.name}</strong>.
                            {selectedCategory?.isActive
                                ? " You can activate it again later."
                                : " You can deactivate it again later."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setStatusDialogOpen(false)}
                            disabled={updating}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={
                                selectedCategory?.isActive
                                    ? "destructive"
                                    : "add"
                            }
                            onClick={handleToggleStatus}
                            disabled={updating}
                        >
                            {updating
                                ? "Updating..."
                                : selectedCategory?.isActive
                                    ? "Deactivate"
                                    : "Activate"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Categories Table */}
            <div className="w-full overflow-hidden rounded-md border bg-card">
                <div className="w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-muted">
                            <TableRow>
                                <TableHead className="w-14">#</TableHead>
                                <TableHead className="min-w-36">
                                    Name
                                </TableHead>
                                <TableHead className="min-w-36">
                                    Branch
                                </TableHead>
                                {isSuperAdmin && (
                                    <TableHead className="min-w-36">
                                        Company
                                    </TableHead>
                                )}
                                <TableHead className="min-w-48">
                                    Description
                                </TableHead>
                                <TableHead className="min-w-24">
                                    Status
                                </TableHead>
                                <TableHead className="sticky right-0 z-10 min-w-20 bg-muted text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={isSuperAdmin ? 7 : 6}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        Loading categories...
                                    </TableCell>
                                </TableRow>
                            ) : !companyReady ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={isSuperAdmin ? 7 : 6}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        Select a company to view categories.
                                    </TableCell>
                                </TableRow>
                            ) : filteredCategories.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={isSuperAdmin ? 7 : 6}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        {categories.length === 0
                                            ? "No categories found."
                                            : "No categories match your filters."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCategories.map((category, index) => (
                                    <TableRow key={category.id}>
                                        <TableCell>{index + 1}</TableCell>
                                        <TableCell className="font-medium">
                                            {category.name}
                                        </TableCell>
                                        <TableCell>
                                            {category.branch?.name ?? "—"}
                                        </TableCell>

                                        {isSuperAdmin && (
                                            <TableCell>
                                                {category.company?.name ?? "—"}
                                            </TableCell>
                                        )}

                                        <TableCell className="max-w-64 whitespace-normal break-words">
                                            {category.description || "—"}
                                        </TableCell>

                                        <TableCell>
                                            <Badge
                                                className={
                                                    category.isActive
                                                        ? "border border-green-200 bg-green-100 text-green-700 hover:bg-green-100"
                                                        : "border border-red-200 bg-red-100 text-red-700 hover:bg-red-100"
                                                }
                                            >
                                                {category.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="sticky right-0 bg-card text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={`Actions for ${category.name}`}
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>

                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuGroup>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                openEditDialog(
                                                                    category,
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </DropdownMenuItem>

                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setSelectedCategory(
                                                                    category,
                                                                );
                                                                setStatusDialogOpen(
                                                                    true,
                                                                );
                                                            }}
                                                        >
                                                            {category.isActive
                                                                ? "Deactivate"
                                                                : "Activate"}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuGroup>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
};

export default CategoryList;