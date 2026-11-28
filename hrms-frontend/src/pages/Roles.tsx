
import { useCallback, useEffect, useState } from "react";

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
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MoreVertical, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/auth.store";
import { CompanySelector } from "@/pages/common/CompanySelector";

import {
    getRoles,
    getModules,
    createRole,
    updateRole,
    deleteRole,
} from "@/services/role.service";

import { roleSchema } from "@/validation/role.validation";

import {
    canCreateInModule,
    canDeleteInModule,
    canEditInModule,
    canModifyModule,
    canViewModule,
    formatRole,
    getRoleRawName,
} from "@/utilis/roleUtils";

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
    description?: string | null;
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
    _count: {
        user: number;
    };
}

const Roles = () => {
    const { user } = useAuthStore();

    // Super Admin check
    const roleName = user?.role?.name
        ?.trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");

    const isSuperAdmin =
        roleName === "super_admin" ||
        roleName === "superadmin";

    // Company selection
    const [selectedCompanyId, setSelectedCompanyId] =
        useState<string | null>(null);

    // PBAC permissions
    const canViewRoles = canViewModule(user, "roles");
    const canCreateRoles = canCreateInModule(user, "roles");
    const canEditRoles = canEditInModule(user, "roles");
    const canDeleteRoles = canDeleteInModule(user, "roles");

    // States
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

    const [permissions, setPermissions] = useState<Permission[]>([]);

    // Selected company ID for API requests
    const effectiveCompanyId = isSuperAdmin
        ? selectedCompanyId ?? undefined
        : undefined;

    // Initialize permissions
    const initPermissions = (
        existingPermissions?: Role["permissions"]
    ) => {
        setPermissions(
            modules.map((mod) => {
                const existing = existingPermissions?.find(
                    (permission) => permission.module.id === mod.id
                );

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

    // Load roles whenever selected company changes
    const loadRoles = useCallback(async () => {
        try {
            const res = await getRoles(effectiveCompanyId);
            setRoles(res.data.data ?? []);
        } catch (error: any) {
            setRoles([]);
            toast.error(error?.message || "Failed to load roles");
        }
    }, [effectiveCompanyId]);

    // Load modules
    const loadModules = async () => {
        try {
            const res = await getModules();
            const flat: Module[] = res.data.data ?? [];

            const sorted: Module[] = [];
            const parents = flat.filter((module) => !module.parentId);

            for (const parent of parents) {
                sorted.push(parent);

                const children = flat.filter(
                    (module) => module.parentId === parent.id
                );

                sorted.push(...children);
            }

            setModules(sorted);
        } catch (error: any) {
            toast.error(error?.message || "Failed to load modules");
        }
    };

    useEffect(() => {
        void loadRoles();
    }, [loadRoles]);

    useEffect(() => {
        void loadModules();
    }, []);

    useEffect(() => {
        if (modules.length > 0 && !editRole) {
            initPermissions();
        }
    }, [modules]);

    // Company selection change
    const handleCompanyChange = (companyId: string | null) => {
        setSelectedCompanyId(companyId);
        setRoles([]);
        handleClose();
    };

    // Toggle permissions
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

    // Submit role
    const handleSubmit = async () => {
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

                if (
                    field === "name" ||
                    field === "description" ||
                    field === "permissions"
                ) {
                    fieldErrors[field] = issue.message;
                }
            });

            setErrors(fieldErrors);
            return;
        }

        setErrors({});

        try {
            if (editRole) {
                await updateRole(
                    editRole.id,
                    {
                        ...form,
                        permissions,
                    },
                    effectiveCompanyId
                );

                toast.success("Role updated successfully!");
            } else {
                await createRole(
                    {
                        ...form,
                        permissions,
                    },
                    effectiveCompanyId
                );

                toast.success("Role created successfully!");
            }

            await loadRoles();
            handleClose();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                "Failed to save role"
            );
        }
    };

    // Form field change
    const handleChange = (
        field: "name" | "description",
        value: string
    ) => {
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

    // Edit role
    const handleEdit = (role: Role) => {
        setEditRole(role);

        setForm({
            name: getRoleRawName(role),
            description: role.description ?? "",
        });

        initPermissions(role.permissions);
        setOpen(true);
    };

    // Delete role
    const handleDelete = async (id: number) => {
        try {
            await deleteRole(id, effectiveCompanyId);

            toast.success("Role deleted successfully!");

            await loadRoles();
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                "Failed to delete role"
            );
        }
    };

    // Close dialog
    const handleClose = () => {
        setOpen(false);
        setEditRole(null);

        setForm({
            name: "",
            description: "",
        });

        setErrors({});
        initPermissions();
    };

    if (!canViewRoles) {
        return (
            <div>
                You don't have permission to view roles.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-center  justify-end gap-3">

                {isSuperAdmin && (
                    <div className="w-full max-w-xs">
                        <CompanySelector
                            selectedCompanyId={selectedCompanyId}
                            onCompanyChange={handleCompanyChange}
                        />
                    </div>
                )}

                {canCreateRoles && (
                    <Button className="cursor-pointer"
                        variant="add"
                        size="sm"
                        onClick={() => {
                            handleClose();
                            setOpen(true);
                        }}
                    >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Role
                    </Button>
                )}
            </div>

            {/* Create / Edit Dialog */}
            <Dialog
                open={open}
                onOpenChange={(value) => {
                    if (!value) {
                        handleClose();
                    } else {
                        setOpen(true);
                    }
                }}
            >
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">

                    <DialogHeader>
                        <DialogTitle>
                            {editRole ? "Edit Role" : "Create Role"}
                        </DialogTitle>

                        <DialogDescription>
                            Update role details
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-4">

                        {/* Name and Description */}
                        <div className="flex gap-3">

                            <div className="flex-1">
                                <Label htmlFor="name">
                                    Role Name{" "}
                                    <span className="text-destructive">*</span>
                                </Label>

                                <Input
                                    id="name"
                                    placeholder="e.g. HR Manager"
                                    value={form.name}
                                    onChange={(e) =>
                                        handleChange("name", e.target.value)
                                    }
                                />

                                {errors.name && (
                                    <p className="text-sm text-red-600 mt-1">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="flex-1">
                                <Label htmlFor="description">
                                    Description
                                </Label>

                                <Input
                                    id="description"
                                    placeholder="Role description"
                                    value={form.description}
                                    onChange={(e) =>
                                        handleChange(
                                            "description",
                                            e.target.value
                                        )
                                    }
                                />

                                {errors.description && (
                                    <p className="text-sm text-red-600 mt-1">
                                        {errors.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Permissions Table */}
                        <div className="border rounded-lg overflow-hidden">

                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead className="w-50">
                                            Module
                                        </TableHead>
                                        <TableHead className="text-center">
                                            View
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Create
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Edit
                                        </TableHead>
                                        <TableHead className="text-center">
                                            Delete
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {modules.map((mod) => {
                                        const perm = permissions.find(
                                            (permission) =>
                                                permission.moduleId === mod.id
                                        );

                                        return (
                                            <TableRow key={mod.id}>
                                                <TableCell className="font-medium">
                                                    {mod.parentId ? (
                                                        <span className="pl-4 text-muted-foreground">
                                                            ↳ {mod.displayName}
                                                        </span>
                                                    ) : (
                                                        mod.displayName
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={perm?.canView ?? false}
                                                        onCheckedChange={() =>
                                                            togglePermission(
                                                                mod.id,
                                                                "canView"
                                                            )
                                                        }
                                                    />
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={perm?.canCreate ?? false}
                                                        onCheckedChange={() =>
                                                            togglePermission(
                                                                mod.id,
                                                                "canCreate"
                                                            )
                                                        }
                                                    />
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={perm?.canEdit ?? false}
                                                        onCheckedChange={() =>
                                                            togglePermission(
                                                                mod.id,
                                                                "canEdit"
                                                            )
                                                        }
                                                    />
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={perm?.canDelete ?? false}
                                                        onCheckedChange={() =>
                                                            togglePermission(
                                                                mod.id,
                                                                "canDelete"
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {errors.permissions && (
                                <p className="text-sm text-red-500 p-2">
                                    {errors.permissions}
                                </p>
                            )}
                        </div>

                        <Button className="cursor-pointer"
                            variant="add"
                            onClick={handleSubmit}
                        >
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
                            <TableHead className="sticky right-0 bg-muted">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {roles.map((role, index) => (
                            <TableRow key={role.id}>
                                <TableCell>{index + 1}</TableCell>

                                <TableCell className="font-medium">
                                    {formatRole(role)}
                                </TableCell>

                                <TableCell>
                                    {role.description ?? "—"}
                                </TableCell>

                                <TableCell>
                                    <Badge variant="outline">
                                        {role._count?.user ?? 0} users
                                    </Badge>
                                </TableCell>

                                <TableCell>
                                    {role.company?.name ?? "Global"}
                                </TableCell>

                                <TableCell>
                                    <Badge
                                        className={
                                            role.isActive
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                        }
                                    >
                                        {role.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>

                                <TableCell className="sticky right-0 bg-card">
                                    {(canEditRoles || canDeleteRoles) && (
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
                                                {canEditRoles && (
                                                    <DropdownMenuItem className="cursor-pointer"
                                                        onClick={() =>
                                                            handleEdit(role)
                                                        }
                                                    >
                                                        Edit
                                                    </DropdownMenuItem>
                                                )}

                                                {canDeleteRoles && (
                                                    <DropdownMenuItem className="cursor-pointer"
                                                        variant="destructive"
                                                        onClick={() =>
                                                            handleDelete(role.id)
                                                        }
                                                    >
                                                        Delete
                                                    </DropdownMenuItem>
                                                )}

                                                {!canModifyModule(user, "roles") && (
                                                    <DropdownMenuItem disabled>
                                                        Cannot modify
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}

                        {roles.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="text-center text-muted-foreground py-8"
                                >
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
