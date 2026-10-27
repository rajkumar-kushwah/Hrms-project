import React, { useState } from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertTriangle, MoreVertical, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import type { Category, CreateCategoryPayload, UpdateCategoryPayload } from "@/types/category.types";
import type { Branch } from "@/types/branch.types";
import { getCategories, createCategory, updateCategory, permanentDeleteCategory } from "@/services/category.service";
import { getBranches } from "@/services/branch.service";
import { isSuperAdminRole } from "@/utilis/roleUtils";

const CategoryList = () => {
    const { user } = useAuthStore();
    const isSuperAdmin = isSuperAdminRole(user?.role?.name);

    const [categories, setCategories] = React.useState<Category[]>([]);
    const [branches, setBranches] = React.useState<Branch[]>([]);
    const [open, setOpen] = React.useState(false);
    const [editOpen, setEditOpen] = React.useState(false);
    //   const [deleteOpen, setDeleteOpen] = React.useState(false);
    const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);

    const [dangerOpen, setDangerOpen] = React.useState(false);
    const [confirmText, setConfirmText] = React.useState("");

    const [searchQuery, setSearchQuery] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("all");
    const [branchFilter, setBranchFilter] = React.useState("all");

    const [form, setForm] = React.useState<CreateCategoryPayload>({
        name: "",
        description: "",
        branchId: "",
    });

    const [editForm, setEditForm] = React.useState<UpdateCategoryPayload>({});

    React.useEffect(() => {
        loadCategories();
        loadBranches();
    }, []);

    const loadCategories = async () => {
        try {
            const res = await getCategories();
            setCategories(res.data.data);
        } catch (err: any) {
            const message =
                err?.message || "Failed to load categories";
            toast.error(message);
        }

    };

    const loadBranches = async () => {
        try {
            const res = await getBranches();
            //  Sirf active branches
            setBranches(res.data.data.filter((b: Branch) => b.isActive));
        } catch (err: any) {
            const message =
                err?.message || "Failed to load branches";
            toast.error(message);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
    };

    //  Filtered categories
    const filteredCategories = categories.filter((category) => {
        const matchSearch = searchQuery
            ? category.name.toLowerCase().includes(searchQuery.toLowerCase())
            : true;

        const matchStatus = statusFilter !== "all"
            ? (statusFilter === "active" ? category.isActive : !category.isActive)
            : true;

        const matchBranch = branchFilter !== "all"
            ? category.branch?.id === branchFilter
            : true;

        return matchSearch && matchStatus && matchBranch;
    });

    //  Create
    const handleSubmit = async () => {
        if (!form.name) { toast.error("Category name is required"); return; }
        if (!form.branchId) { toast.error("Please select a branch"); return; }
        try {
            const res = await createCategory(form);
            toast.success("Category created successfully!");
            setCategories((prev) => [res.data.data, ...prev]);
            setForm({ name: "", description: "", branchId: "" });
            setOpen(false);
        } catch (err: any) {
            const message =
                err?.message || "Failed to create category";
            toast.error(message);
        }

    };

    //  Update
    const handleUpdate = async () => {
        if (!selectedCategory) return;
        try {
            await updateCategory(selectedCategory.id, editForm);
            toast.success("Category updated successfully!");
            setCategories((prev) =>
                prev.map((c) => c.id === selectedCategory.id ? { ...c, ...editForm } : c)
            );
            setEditOpen(false);
            setSelectedCategory(null);
        } catch (err: any) {
            const message =
                err?.message || "Failed to update category";
            toast.error(message);
        }

    };

    //  Toggle Status
    const handleToggleStatus = async () => {
        if (!selectedCategory) return
        try {
            await updateCategory(selectedCategory.id, { isActive: !selectedCategory.isActive });
            toast.success(`Category ${!selectedCategory.isActive ? "activated" : "deactivated"} successfully!`);
            setCategories((prev) =>
                prev.map((c) => c.id === selectedCategory.id ? { ...c, isActive: !c.isActive } : c)
            );
            setStatusDialogOpen(false);
        } catch (err: any) {
            const message =
                err?.message || "Failed to update category";
            toast.error(message);
        }

    };

    // permanent danger delete fn
    const handlePermanentDelete = async () => {
        if (confirmText !== selectedCategory?.name) {
            toast.error("Category name doesn't match");
            return;
        }
        try {
            await permanentDeleteCategory(selectedCategory.id);
            toast.success("Category permanently deleted!");
            setCategories((prev) => prev.filter((c) => c.id !== selectedCategory.id));
            setDangerOpen(false);
            setEditOpen(false);
            setConfirmText("");
        } catch (err: any) {
            const message =
                err?.message || "Failed to delete category";
            toast.error(message);
        }

    }

    return (
        <div className="flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                    <Input
                        type="search"
                        name="category-search"
                        autoComplete="off"
                        placeholder="Search category name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64"
                    />

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={branchFilter} onValueChange={setBranchFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="All Branches" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                            <SelectItem value="all">All Branches</SelectItem>
                            {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button size="sm" variant="add" className='cursor-pointer' onClick={() => setOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Category
                </Button>
            </div>

            {/* Create Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Category</DialogTitle>
                        <DialogDescription>Create a new department/category</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">

                        {/*  Branch Select */}
                        <div>
                            <Label>Branch *</Label>
                            <Select
                                value={form.branchId}
                                onValueChange={(val) => setForm({ ...form, branchId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Branch" />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                    {branches.map((branch) => (
                                        <SelectItem key={branch.id} value={branch.id}>
                                            {branch.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Category Name *</Label>
                            <Input
                                name="name"
                                placeholder="e.g. Sales Team"
                                value={form.name}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <Label>Description</Label>
                            <Input
                                name="description"
                                placeholder="Description (optional)"
                                value={form.description}
                                onChange={handleChange}
                            />
                        </div>

                        <Button variant="add" onClick={handleSubmit}>Create Category</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Category — {selectedCategory?.name}</DialogTitle>
                        <DialogDescription>Update category details</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                        <div>
                            <Label>Category Name</Label>
                            <Input
                                name="name"
                                value={editForm.name ?? ""}
                                onChange={handleEditChange}
                            />
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Input
                                name="description"
                                value={editForm.description ?? ""}
                                onChange={handleEditChange}
                            />
                        </div>
                        <Button variant="add" onClick={handleUpdate}>Update Category</Button>
                    </div>
                    {isSuperAdmin && (
                        <div className="border border-red-200 rounded-lg p-4 mt-4 bg-red-50">
                            <h4 className="text-red-700 font-semibold flex items-center gap-2 text-sm">
                                <AlertTriangle className="h-4 w-4" /> Danger Zone
                            </h4>
                            <p className="text-xs text-red-600 mt-1">
                                Permanent Delete this Category. Only Possible if no employee/user is assigned to this category
                            </p>
                            <Button variant="destructive" size="sm" className="sm cursor-pointer" onClick={() => setDangerOpen(true)}>Permanent Delete</Button>
                        </div>
                    )}
                    {/* Danger Dialog and confirm text */}
                    <Dialog open={dangerOpen} onOpenChange={setDangerOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="text-red-700">Permanent Delete Category</DialogTitle>
                                <DialogDescription>Are you sure you want to delete <strong className="font-semibold bg-muted">{selectedCategory?.name}</strong> This action cannot be undone. Type</DialogDescription>
                            </DialogHeader>
                            <div>
                                <Label>Type <strong>{selectedCategory?.name}</strong> To Confirm</Label>
                                <Input type="text" name="confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setDangerOpen(false)}>Cancel</Button>
                                <Button variant="destructive" disabled={confirmText !== selectedCategory?.name} onClick={handlePermanentDelete} className=" cursor-pointer"> I understand, delete permanently</Button>
                            </div>

                        </DialogContent>
                    </Dialog>
                </DialogContent>
            </Dialog>

            {/* Active Deactive dialog */}
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent className=" bg-card w-05">
                    <DialogHeader>
                        <DialogTitle>Update Status</DialogTitle>
                        <DialogDescription>
                            You are about to
                            <strong className="font-semibold ">
                                {" "}
                                {selectedCategory?.isActive ? "deactivate" : "activate"}
                            </strong>
                            <strong> {selectedCategory?.name}</strong>.
                            {selectedCategory?.isActive
                                ? " You can activate it again later."
                                : " You can deactivate it again later."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" className=" cursor-pointer" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" className=" cursor-pointer" onClick={handleToggleStatus}>
                            {selectedCategory?.isActive ? "Deactivate" : "Activate"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Table */}
            <div className="bg-card  grid grid-cols-1 rounded border w-full overflow-x-auto">
                <div className="h-full overflow-auto">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead className="min-w-37.5">Name</TableHead>
                                <TableHead className="min-w-37.5">Branch</TableHead>
                                {isSuperAdmin && <TableHead className="min-w-37.5">Company</TableHead>}
                                <TableHead className="min-w-50">Description</TableHead>
                                <TableHead className="min-w-20">Status</TableHead>
                                <TableHead className="sticky right-0 bg-muted">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCategories.map((category, index) => (
                                <TableRow key={category.id}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{category.name}</TableCell>
                                    <TableCell>{category.branch?.name ?? "—"}</TableCell>
                                    {isSuperAdmin && <TableCell>{category.company?.name ?? "—"}</TableCell>}
                                    <TableCell>{category.description ?? "—"}</TableCell>
                                    <TableCell>
                                        <Badge className={category.isActive
                                            ? "bg-green-100 text-green-700"
                                            : "bg-red-100 text-red-700"}>
                                            {category.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="sticky right-0 bg-card">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuGroup>
                                                    <DropdownMenuItem onClick={() => {
                                                        setSelectedCategory(category);
                                                        setEditForm({
                                                            name: category.name,
                                                            description: category.description ?? "",
                                                        });
                                                        setEditOpen(true);
                                                    }}>
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem variant="destructive" onClick={() => {
                                                        setSelectedCategory(category);
                                                        setStatusDialogOpen(true);
                                                    }}>
                                                        {category.isActive ? "Deactivate" : "Activate"}
                                                    </DropdownMenuItem>
                                                </DropdownMenuGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {categories.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        No categories found
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

export default CategoryList;