import React from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getCompanyUsers, resetUserPassword, toggleUserStatus } from "@/services/companyUser.service";
import type { CompanyUser } from "@/types/companyuser.types";
import { useAuthStore } from "@/store/auth.store";



const Users = () => {
    const [users, setUsers] = React.useState<CompanyUser[]>([]);
    const [resetOpen, setResetOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<CompanyUser | null>(null);
    const [newPassword, setNewPassword] = React.useState("");
    const { user: currentUser } = useAuthStore();
    const [showPassword, setShowPassword] = React.useState(false);

    React.useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const res = await getCompanyUsers();
            setUsers(res.data.data);
        } catch (err: any) {
            const message =
                err?.message || "Failed to load users";
            toast.error(message);
        }
    };

    //  Toggle Active/Inactive
    const handleToggleStatus = async (user: CompanyUser) => {
        try {
            const res = await toggleUserStatus(user.id);
            toast.success(res.data.message);
            //  Local state update karo — dobara API call nahi
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === user.id ? { ...u, isActive: !u.isActive } : u
                )
            );
        } catch (err: any) {
            const message =
                err?.message || "Failed to toggle status";
            toast.error(message);
        }
    };

    //  Reset Password
    const handleResetPassword = async () => {
        if (!selectedUser) return;
        if (!newPassword || newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }
        try {
            await resetUserPassword(selectedUser.id, newPassword);
            toast.success("Password reset successfully!");
            setResetOpen(false);
            setNewPassword("");
            setSelectedUser(null);
        } catch (err: any) {
            const message =
                err?.message || "Failed to reset password";
            toast.error(message);
        }
    };

    const formatRole = (role: string) => {
        if (!role) return "User";

        return role
            .trim()
            .toLowerCase()
            .split("_")
            .map((r) => r.charAt(0).toUpperCase() + r.slice(1))
            .join(" ");
    };

    return (
        <div className="flex flex-col gap-4">

            {/* Reset Password Dialog */}
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reset Password — {selectedUser?.name}</DialogTitle>
                        <DialogDescription>Reset password for {selectedUser?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                        <Label htmlFor="newPassword">New Password</Label>

                        <div className="relative">
                            <Input
                                id="newPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="Min 6 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="pr-10"
                            />

                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>

                        <Button onClick={handleResetPassword} variant="add" className="cursor-pointer">
                            Reset Password
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Table */}
            <div className="bg-card p-2 grid grid-cols-1 rounded border w-full overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted">
                        <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user, index) => (
                            <TableRow key={user.id}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.company?.name ?? "—"}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        {user.role ? formatRole(user.role.name) : "—"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className={user.isActive
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"}>
                                        {user.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="sticky right-0 bg-card">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="p-2">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {/* Toggle Status */}
                                            <DropdownMenuItem variant="destructive"
                                                onClick={() => handleToggleStatus(user)}
                                                disabled={user.id === currentUser?.id}

                                            >
                                                {user.isActive ? "Deactivate" : "Activate"}
                                            </DropdownMenuItem>

                                            {/* Reset Password */}
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setResetOpen(true);
                                                }}
                                            >
                                                Reset Password
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                    No users found
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div >
    );
};

export default Users;