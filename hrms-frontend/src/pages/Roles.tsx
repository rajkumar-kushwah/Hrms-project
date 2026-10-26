import { useState, useEffect } from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, PlusIcon } from "lucide-react";
import { toast } from "sonner";
// import { api } from "@/api/axios";
import { useAuthStore } from "@/store/auth.store";
import {
    getRoles,
    getModules,
    createRole,
    updateRole,
    deleteRole,
} from "@/services/role.service";
import { roleSchema } from "@/validation/role.validation";
import { isAdminRole } from "@/utilis/roleUtils";



interface Module {
    id: number;
    name: string;
    displayName: string;
    parentId?: number | null;
}

interface Permission {
    moduleId: number;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
}

interface Role {
    id: number;
    name: string;
    description?: string;
    isActive: boolean;
    company?: {
        id: string;
        name: string;
    } | null;
    permissions: {
        module: Module;
        canView: boolean;
        canCreate: boolean;
        canEdit: boolean;
        canDelete: boolean;
    }[];
    _count: { user: number };
}


const Roles = () => {
    const { user } = useAuthStore();
    const rolePermission = user?.role?.permissions?.find(
        (p) => p.module.name === "roles"
    );
    const canDelete = rolePermission?.canDelete;

    const isSuperAdmin = isAdminRole(user?.role?.name);

    const [roles, setRoles] = useState<Role[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [open, setOpen] = useState(false);
    const [editRole, setEditRole] = useState<Role | null>(null);

    const [form, setForm] = useState({
        name: "",
        description: "",
    });

    const [errors, setErrors] = useState<{
        name?: string;
        description?: string;
        permissions?: string;
    }>({});

    //  Permissions state — har module ke liye
    const [permissions, setPermissions] = useState<Permission[]>([]);

    useEffect(() => {
        loadRoles();
        loadModules();
    }, []);

    //  Modules load hone ke baad permissions initialize karo
    useEffect(() => {
        if (modules.length > 0 && !editRole) {
            initPermissions();
        }
    }, [modules]);

    const initPermissions = (existingPermissions?: Role["permissions"]) => {
        setPermissions(
            modules.map((mod) => {
                const existing = existingPermissions?.find(p => p.module.id === mod.id);
                return {
                    moduleId: mod.id,
                    canView: existing?.canView ?? false,
                    canCreate: existing?.canCreate ?? false,
                    canEdit: existing?.canEdit ?? false,
                    canDelete: existing?.canDelete ?? false,
                };
            })
        );
    };

    const loadRoles = async () => {
        try {
            const res = await getRoles();
            setRoles(res.data.data);
        } catch (err: any) {
            const message =
                err?.message || "Failed to load roles";
            toast.error(message);
        }
    };



    const loadModules = async () => {
        try {
            const res = await getModules();
            const flat = res.data.data;

            //  Pehle parents, phir unke children — order maintain karo
            const sorted: Module[] = [];
            const parents = flat.filter((m: Module) => !m.parentId);

            for (const parent of parents) {
                sorted.push(parent);
                const children = flat.filter((m: Module) => m.parentId === parent.id);
                sorted.push(...children);
            }

            setModules(sorted);
        } catch (err: any) {
            const message =
                err?.message || "Failed to load modules";
            toast.error(message);
        }

    };




    // const togglePermission = (
    //     moduleId: number,
    //     field: "canView" | "canCreate" | "canEdit" | "canDelete"
    // ) => {
    //     setPermissions((prev) => {
    //         const currentModule = modules.find((m) => m.id === moduleId);
    //         const isParent = currentModule?.parentId == null;

    //         let updated = prev.map((p) => {
    //             if (p.moduleId !== moduleId) return p;

    //             const value = !p[field];

    //             // View OFF => sab OFF
    //             if (field === "canView" && !value) {
    //                 return {
    //                     ...p,
    //                     canView: false,
    //                     canCreate: false,
    //                     canEdit: false,
    //                     canDelete: false,
    //                 };
    //             }

    //             // Create/Edit/Delete ON => View bhi ON
    //             if (field !== "canView" && value) {
    //                 return {
    //                     ...p,
    //                     [field]: true,
    //                     canView: true,
    //                 };
    //             }

    //             return {
    //                 ...p,
    //                 [field]: value,
    //             };
    //         });

    //         // Parent ka View change hua
    //         if (field === "canView" && isParent) {
    //             const parent = updated.find((p) => p.moduleId === moduleId);
    //             const isNowOn = parent?.canView ?? false;

    //             updated = updated.map((p) => {
    //                 const module = modules.find((m) => m.id === p.moduleId);

    //                 if (module?.parentId === moduleId) {
    //                     return {
    //                         ...p,
    //                         canView: isNowOn,
    //                         canCreate: isNowOn ? p.canCreate : false,
    //                         canEdit: isNowOn ? p.canEdit : false,
    //                         canDelete: isNowOn ? p.canDelete : false,
    //                     };
    //                 }

    //                 return p;
    //             });
    //         }

    //         return updated;
    //     });
    // };
    //  Create Role

    // const togglePermission = (
    //     moduleId: number,
    //     action: "canView" | "canCreate" | "canEdit" | "canDelete"
    // ) => {
    //     setForm((prev) => {
    //         const updatedPermissions = permissions.map((permission) => {
    //             if (permission.moduleId !== moduleId) {
    //                 return permission;
    //             }

    //             const updatedPermission = {
    //                 ...permission,
    //                 [action]: !permission[action],
    //             };

    //             // View off => all actions off
    //             if (action === "canView" && !updatedPermission.canView) {
    //                 updatedPermission.canCreate = false;
    //                 updatedPermission.canEdit = false;
    //                 updatedPermission.canDelete = false;
    //             }

    //             // Any action on => View on
    //             if (
    //                 action !== "canView" &&
    //                 updatedPermission[action]
    //             ) {
    //                 updatedPermission.canView = true;
    //             }

    //             return updatedPermission;
    //         });

    //         // Permission validation
    //         const hasPermission = updatedPermissions.some(
    //             (permission) =>
    //                 permission.canView ||
    //                 permission.canCreate ||
    //                 permission.canEdit ||
    //                 permission.canDelete
    //         );
    //         if (!hasPermission) {
    //             toast.error("At least one permission must be selected");
    //         }

    //         setErrors((prevErrors) => ({
    //             ...prevErrors,
    //             permissions: hasPermission
    //                 ? undefined
    //                 : "At least one permission must be selected",
    //         }));

    //         return {
    //             ...prev,
    //             permissions: updatedPermissions,
    //         };
    //     });
    // };

    const togglePermission = (
        moduleId: number,
        action: "canView" | "canCreate" | "canEdit" | "canDelete"
    ) => {
        setPermissions((prev) => {
            const updatedPermissions = prev.map((permission) => {
                if (permission.moduleId !== moduleId) {
                    return permission;
                }

                const updatedPermission = {
                    ...permission,
                    [action]: !permission[action],
                };

                // View OFF => all actions OFF
                if (action === "canView" && !updatedPermission.canView) {
                    updatedPermission.canCreate = false;
                    updatedPermission.canEdit = false;
                    updatedPermission.canDelete = false;
                }

                // Create/Edit/Delete ON => View ON
                if (
                    action !== "canView" &&
                    updatedPermission[action]
                ) {
                    updatedPermission.canView = true;
                }

                return updatedPermission;
            });

            // Permission validation
            const hasPermission = updatedPermissions.some(
                (permission) =>
                    permission.canView ||
                    permission.canCreate ||
                    permission.canEdit ||
                    permission.canDelete
            );

            setErrors((prevErrors) => ({
                ...prevErrors,
                permissions: hasPermission
                    ? undefined
                    : "At least one permission must be selected",
            }));

            return updatedPermissions;
        });
    };

    const handleSubmit = async () => {
        // if (!form.name) { toast.error("Role name is required"); return; }
        const result = roleSchema.safeParse({
            ...form,
            permissions,
        });

        if (!result.success) {
            const fieldErrors: {
                name?: string;
                description?: string;
                permissions?: string;
            } = {};

            result.error.issues.forEach((issue) => {
                const field = issue.path[0];

                if (field === "name" || field === "description" || field === "permissions") {
                    fieldErrors[field as "name" | "description" | "permissions"] = issue.message;
                }
            });

            setErrors(fieldErrors);
            return;
        }

        setErrors({});

        try {
            if (editRole) {
                // Update
                await updateRole(editRole.id, {
                    ...form,
                    permissions,
                });
                toast.success("Role updated successfully!");
            } else {
                // Create
                await createRole({
                    ...form,
                    permissions,
                });

                toast.success("Role created successfully!");
            }
            loadRoles();
            handleClose();
        } catch (err: any) {
            const message =
                err?.message || "Failed to create role";
            toast.error(message);
        }

    };
    const handleChange = (field: "name" | "description", value: string) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));

        const schema = roleSchema.shape[field];
        const result = schema.safeParse(value);

        setErrors((prev) => ({
            ...prev,
            [field]: result.success
                ? undefined
                : result.error.issues[0].message,
        }));
    };

    //  Edit Role
    const handleEdit = (role: Role) => {
        setEditRole(role);
        setForm({ name: role.name, description: role.description ?? "" });
        initPermissions(role.permissions);
        setOpen(true);
    };

    //  Delete Role
    const handleDelete = async (id: number) => {
        console.log("DELETE CLICKED", id);
        try {
            await deleteRole(id);
            toast.success("Role deleted successfully!");
            loadRoles();
        } catch (err: any) {
            const message =
                err?.message || "Failed to delete role";
            toast.error(message);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setEditRole(null);
        setForm({ name: "", description: "" });
        setErrors({})
        initPermissions();
    };

    return (
        <div className="flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-center justify-end">
                <Button variant="add" size="sm" onClick={() => {
                    handleClose();
                    setOpen(true);
                }}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Role
                </Button>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editRole ? "Edit Role" : "Create Role"}</DialogTitle>
                        <DialogDescription>Update role details</DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">
                        {/* Name + Description */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Label htmlFor="name">
                                    Role Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. HR Manager"
                                    value={form.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-600 mt-1">{errors.name}</p>
                                )}
                            </div>
                            <div className="flex-1">
                                <Label htmlFor="description">
                                    Description <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="description"
                                    placeholder="Role description"
                                    value={form.description}
                                    onChange={(e) => handleChange("description", e.target.value)}
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-600 mt-1">{errors.description}</p>
                                )}
                            </div>
                        </div>

                        {/*  Permissions Table */}
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead className="w-50">Module</TableHead>
                                        <TableHead className="text-center">View</TableHead>
                                        <TableHead className="text-center">Create</TableHead>
                                        <TableHead className="text-center">Edit</TableHead>
                                        <TableHead className="text-center">Delete</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {modules.map((mod) => {
                                        const perm = permissions.find(p => p.moduleId === mod.id);
                                        return (
                                            <TableRow key={mod.id}>
                                                <TableCell className="font-medium">
                                                    {mod.parentId ? (
                                                        <span className="pl-4 text-muted-foreground">↳ {mod.displayName}</span>
                                                    ) : (
                                                        mod.displayName
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={perm?.canView ?? false}
                                                        onCheckedChange={() => togglePermission(mod.id, "canView")}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={perm?.canCreate ?? false}
                                                        onCheckedChange={() => togglePermission(mod.id, "canCreate")}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={perm?.canEdit ?? false}
                                                        onCheckedChange={() => togglePermission(mod.id, "canEdit")}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={perm?.canDelete ?? false}
                                                        onCheckedChange={() => togglePermission(mod.id, "canDelete")}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            {errors.permissions && (
                                <p className="text-sm text-red-500">
                                    {errors.permissions}
                                </p>
                            )}
                        </div>

                        <Button variant="add" onClick={handleSubmit}>
                            {editRole ? "Update Role" : "Create Role"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Roles Table */}
            <div className="bg-card grid grid-cols-1 rounded border w-full overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Role Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Users</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="sticky right-0 bg-muted">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.map((role, index) => (
                            <TableRow key={role.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell className="font-medium">{role.name}</TableCell>
                                <TableCell>{role.description ?? "—"}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{role._count?.user ?? 0} users</Badge>
                                </TableCell>
                                {/*  ← Super Admin = Global */}
                                <TableCell> {role.company?.name ?? "Global"}</TableCell>
                                <TableCell>
                                    <Badge className={role.isActive
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"}>
                                        {role.isActive ? "Active" : "Inactive"}
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
                                            {isSuperAdmin && (
                                                <>
                                                    <DropdownMenuItem onClick={() => handleEdit(role)}>
                                                        Edit
                                                    </DropdownMenuItem>
                                                    {canDelete && (

                                                        <DropdownMenuItem variant="destructive"
                                                            className="text-red-600"
                                                            onClick={() => handleDelete(role.id)}
                                                        >
                                                            Delete
                                                        </DropdownMenuItem>
                                                    )}
                                                </>
                                            )}
                                            {!isSuperAdmin && (
                                                <DropdownMenuItem disabled>
                                                    Cannot modify
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {roles.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                    No roles found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default Roles;