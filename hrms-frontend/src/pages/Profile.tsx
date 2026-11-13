import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth.store";
import { Building2, Clock, Calendar, Mail, User, ShieldCheck, UserCheck, KeyRound, Pencil } from "lucide-react";
import React from "react";
import { toast } from "sonner";
import { updateProfile, changePassword } from "@/services/profile.service";
import {
    updateProfileSchema,
    changePasswordSchema,
} from "@/validation/profile.validation";
import { Eye, EyeOff } from "lucide-react";
import { formatRole, getUserName } from "@/utilis/roleUtils";

const Profile = () => {
    const { user, setUser } = useAuthStore();

    //  Edit Profile Popup
    const [editOpen, setEditOpen] = React.useState(false);
    const [name, setName] = React.useState(getUserName(user, ""));
    const [updating, setUpdating] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showNewPassword, setShowNewPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    //  Change Password Popup
    const [pwOpen, setPwOpen] = React.useState(false);
    const [oldPassword, setOldPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");

    const [profileErrors, setProfileErrors] = React.useState<{
        name?: string;
    }>({});

    const [passwordErrors, setPasswordErrors] = React.useState<{
        oldPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>({});

    const getInitials = (name: string) =>
        name.split(" ").map((n) => n[0]).join("").toUpperCase();


    //  Update Profile
    const handleUpdateProfile = async () => {
        if (!name.trim()) {
            toast.error("Name cannot be empty");
            return;
        }
        setUpdating(true);
        try {
            const res = await updateProfile({ name });
            toast.success("Profile updated successfully!");
            setUser({ ...user!, name: res.data.data.name });
            setEditOpen(false);
        } catch (err: any) {
            const message =
                err?.message || "Failed to update profile";
            toast.error(message);
        }
        finally {
            setUpdating(false);
        }
    };

    //  Change Password
    const handleChangePassword = async () => {
        const result = changePasswordSchema.safeParse({
            oldPassword,
            newPassword,
            confirmPassword,
        });

        if (!result.success) {
            const fieldErrors: {
                oldPassword?: string;
                newPassword?: string;
                confirmPassword?: string;
            } = {};

            result.error.issues.forEach((issue) => {
                const field = issue.path[0];

                if (
                    field === "oldPassword" ||
                    field === "newPassword" ||
                    field === "confirmPassword"
                ) {
                    fieldErrors[field] = issue.message;
                }
            });

            setPasswordErrors(fieldErrors);
            return;
        }

        setPasswordErrors({});

        try {
            await changePassword({ oldPassword, newPassword });
            toast.success("Password changed successfully!");
            setPwOpen(false);
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            const message =
                err?.message || "Failed to change password";
            toast.error(message);
        }

    };

    const handleNameChange = (value: string) => {
        setName(value);

        const result = updateProfileSchema.shape.name.safeParse(value);

        setProfileErrors((prev) => ({
            ...prev,
            name: result.success
                ? undefined
                : result.error.issues[0].message,
        }));
    };
    const handleOldPasswordChange = (value: string) => {
        setOldPassword(value);

        const result =
            changePasswordSchema.shape.oldPassword.safeParse(value);

        setPasswordErrors((prev) => ({
            ...prev,
            oldPassword: result.success
                ? undefined
                : result.error.issues[0].message,
        }));
    };
    const handleNewPasswordChange = (value: string) => {
        setNewPassword(value);

        const result =
            changePasswordSchema.shape.newPassword.safeParse(value);

        setPasswordErrors((prev) => ({
            ...prev,
            newPassword: result.success
                ? undefined
                : result.error.issues[0].message,
        }));
    };
    const handleConfirmPasswordChange = (value: string) => {
        setConfirmPassword(value);

        setPasswordErrors((prev) => ({
            ...prev,
            confirmPassword:
                value !== newPassword
                    ? "Passwords do not match"
                    : undefined,
        }));
    };
    return (
        <div className='flex justify-center'>
            <Card className='bg-card text-card-foreground border-border max-w-md w-full rounded-xl transition-none duration-0 ease-none hover:opacity-100 hover:scale-100 active:scale-100'>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Profile</CardTitle>
                    {/*  Edit Icon Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            setName(getUserName(user, ""));
                            setEditOpen(true);
                        }}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className='grid gap-6'>

                    {/* Avatar + Name + Role */}
                    <div className="flex flex-col items-center gap-2">
                        <Avatar className='h-20 w-20'>
                            <AvatarImage src={user?.avatar} alt="avatar" />
                            <AvatarFallback className="text-lg">
                                {getInitials(getUserName(user))}
                            </AvatarFallback>
                        </Avatar>
                        <h2 className="text-lg font-semibold">{getUserName(user)}</h2>

                        {user?.role && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" />
                                {formatRole(user.role)}
                            </Badge>
                        )}

                        {user?.company && (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                {user.company.name}
                            </span>
                        )}
                    </div>

                    {/* Created By */}
                    {user?.createdByUser && (
                        <div className="flex flex-col gap-1">
                            <Label className="text-sm text-muted-foreground flex items-center gap-1">
                                <UserCheck className="h-3 w-3" /> Created By
                            </Label>
                            <Input
                                type="text"
                                defaultValue={getUserName(user.createdByUser, "—")}
                                readOnly
                                className="opacity-60 cursor-not-allowed"
                            />
                        </div>
                    )}

                    {/* Info Fields — Read Only */}
                    <div className='flex flex-col gap-4'>

                        <div className="flex flex-col gap-1">
                            <Label className='text-sm text-muted-foreground flex items-center gap-1'>
                                <User className="h-3 w-3" /> Name
                            </Label>
                            <Input type='text' defaultValue={getUserName(user, "")} readOnly className="opacity-60 cursor-not-allowed" />
                        </div>

                        <div className="flex flex-col gap-1">
                            <Label className='text-sm text-muted-foreground flex items-center gap-1'>
                                <Mail className="h-3 w-3" /> Email
                            </Label>
                            <Input type='email' defaultValue={user?.email} readOnly className="opacity-60 cursor-not-allowed" />
                        </div>

                        {/*  Change Password Button */}
                        <Button variant="add" onClick={() => setPwOpen(true)}>
                            <KeyRound className="h-4 w-4 mr-2" />
                            Change Password
                        </Button>

                        {/* Dates */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-border">
                            <p className='text-sm text-muted-foreground flex items-center gap-1'>
                                <Clock className="h-3 w-3" />
                                Last Login: {user?.lastLogin
                                    ? new Date(user.lastLogin).toLocaleString()
                                    : "N/A"}
                            </p>
                            <p className='text-sm text-muted-foreground flex items-center gap-1'>
                                <Calendar className="h-3 w-3" />
                                Member Since: {user?.createdAt
                                    ? new Date(user.createdAt).toLocaleString()
                                    : "N/A"}
                            </p>
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/*  Edit Profile Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>Edite your profile information</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                        <div>
                            <Label>Name</Label>
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                            />
                            {profileErrors.name && (
                                <p className="text-xs text-destructive mt-1">
                                    {profileErrors.name}
                                </p>
                            )}
                        </div>
                        <Button variant="add" onClick={handleUpdateProfile} disabled={updating}>
                            {updating ? "Updating..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Change Password Dialog */}
            <Dialog open={pwOpen} onOpenChange={setPwOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                        <div className="relative">
                            <Label>Current Password</Label>
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                value={oldPassword}
                                onChange={(e) => handleOldPasswordChange(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute right-3 border-logo-green hover:border-logo-green/80 top-8 -translate-y-1/2"
                                onClick={() => setShowPassword((prev) => !prev)}
                            >
                                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}

                            </button>
                            {passwordErrors.oldPassword && (
                                <p className="text-xs text-destructive mt-1">
                                    {passwordErrors.oldPassword}
                                </p>
                            )}
                        </div>
                        <div className="relative">
                            <Label>New Password</Label>
                            <Input
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder="Min 8 characters"
                                value={newPassword}
                                onChange={(e) => handleNewPasswordChange(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute right-3 border-logo-green hover:border-logo-green/80 top-8 -translate-y-1/2"
                                onClick={() => setShowNewPassword((prev) => !prev)}
                            >
                                {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}

                            </button>
                            {passwordErrors.newPassword && (
                                <p className="text-xs text-destructive mt-1">
                                    {passwordErrors.newPassword}
                                </p>
                            )}
                        </div>
                        <div className="relative">
                            <Label>Confirm New Password</Label>
                            <Input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    handleConfirmPasswordChange(e.target.value)
                                }
                            />
                            <button
                                type="button"
                                className="absolute right-3 border-logo-green hover:border-logo-green/80 top-8 -translate-y-1/2"
                                onClick={() => setShowConfirmPassword((prev) => !prev)}
                            >
                                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}

                            </button>
                            {passwordErrors.confirmPassword && (
                                <p className="text-xs text-destructive mt-1">
                                    {passwordErrors.confirmPassword}
                                </p>
                            )}
                        </div>
                        <Button variant="add" onClick={handleChangePassword}>Change Password</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Profile;