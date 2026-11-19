
import React from "react";
import {
    Building2,
    Clock,
    Calendar,
    Mail,
    User,
    ShieldCheck,
    UserCheck,
    Pencil,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { useAuthStore } from "@/store/auth.store";
import { updateProfile } from "@/services/profile.service";
import { updateProfileSchema } from "@/validation/profile.validation";
import { formatRole, getUserName } from "@/utilis/roleUtils";
import UserAvatar from "@/pages/common/UserAvatar";

const Profile = () => {
    const { user, setUser } = useAuthStore();

    const [editOpen, setEditOpen] = React.useState(false);
    const [name, setName] = React.useState(getUserName(user, ""));
    const [updating, setUpdating] = React.useState(false);
    const [profileError, setProfileError] = React.useState("");
    const [successOpen, setSuccessOpen] = React.useState(false);

    const handleNameChange = (value: string) => {
        setName(value);

        const result = updateProfileSchema.shape.name.safeParse(value);

        setProfileError(
            result.success ? "" : result.error.issues[0].message
        );
    };

    const handleUpdateProfile = async () => {
        const result = updateProfileSchema.safeParse({
            name: name.trim(),
        });

        if (!result.success) {
            setProfileError(result.error.issues[0].message);
            return;
        }

        if (!user) return;

        setProfileError("");
        setUpdating(true);

        try {
            const res = await updateProfile({
                name: name.trim(),
            });

            setUser({
                ...user,
                name: res.data.data.name,
            });

            setEditOpen(false);
            setSuccessOpen(true);
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                "Failed to update profile"
            );
        } finally {
            setUpdating(false);
        }
    };

    const handleEditOpen = () => {
        setName(getUserName(user, ""));
        setProfileError("");
        setEditOpen(true);
    };

    const accountFields = [
        {
            label: "User ID",
            value: user?.id ? String(user.id) : "",
            icon: User,
            className: "",
        },
        {
            label: "Full Name",
            value: getUserName(user, ""),
            icon: User,
            className: "",
        },
        {
            label: "Email Address",
            value: user?.email || "",
            icon: Mail,
            className: "sm:col-span-2",
        },
        ...(user?.createdByUser
            ? [
                {
                    label: "Created By",
                    value: getUserName(user.createdByUser, "—"),
                    icon: UserCheck,
                    className: "sm:col-span-2",
                },
            ]
            : []),
    ];

    const activityItems = [
        {
            label: "Last Login",
            value: user?.lastLogin
                ? new Date(user.lastLogin).toLocaleString()
                : "N/A",
            icon: Clock,
        },
        {
            label: "Member Since",
            value: user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "N/A",
            icon: Calendar,
        },
    ];

    return (
        <div className="mx-auto w-full max-w-2xl px-2 sm:px-4">
            <Card className="overflow-hidden rounded-xl border-border shadow-none">
                {/* Header */}
                <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
                    <div>
                        <CardTitle className="text-lg font-semibold">
                            My Profile
                        </CardTitle>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Manage your personal information
                        </p>
                    </div>

                    <Button
                        variant="add"
                        size="sm"
                        className="shrink-0"
                        onClick={handleEditOpen}
                    >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit Profile
                    </Button>
                </CardHeader>

                <CardContent className="space-y-5 p-4 sm:p-5">
                    {/* Profile Header */}
                    <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-4">
                        {user && (
                            <UserAvatar
                                user={user}
                                size="lg"
                                editable
                            />
                        )}

                        <div className="text-center">
                            <h2 className="text-base font-semibold">
                                {getUserName(user)}
                            </h2>

                            {user?.role && (
                                <Badge
                                    variant="secondary"
                                    className="mt-1 gap-1 text-xs"
                                >
                                    <ShieldCheck className="h-3 w-3" />
                                    {formatRole(user.role)}
                                </Badge>
                            )}

                            {user?.company && (
                                <p className="mt-1.5 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                    <Building2 className="h-3.5 w-3.5" />
                                    {user.company.name}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Account Information */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold">
                            Account Information
                        </h3>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {accountFields.map((field) => {
                                const Icon = field.icon;

                                return (
                                    <div
                                        key={field.label}
                                        className={`space-y-1.5 ${field.className}`}
                                    >
                                        <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                            <Icon className="h-3.5 w-3.5" />
                                            {field.label}
                                        </Label>

                                        <Input
                                            value={field.value}
                                            readOnly
                                            className="h-9 bg-muted/30 text-sm shadow-none"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Account Activity */}
                    <div className="space-y-3 border-t border-border pt-4">
                        <h3 className="text-sm font-semibold">
                            Account Activity
                        </h3>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {activityItems.map((item) => {
                                const Icon = item.icon;

                                return (
                                    <div
                                        key={item.label}
                                        className="flex items-start gap-2.5 rounded-lg border border-border p-3"
                                    >
                                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                                        <div className="min-w-0">
                                            <p className="text-xs text-muted-foreground">
                                                {item.label}
                                            </p>

                                            <p className="mt-1 break-words text-sm font-medium">
                                                {item.value}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Profile Dialog */}
            <Dialog
                open={editOpen}
                onOpenChange={(open) => {
                    if (!updating) {
                        setEditOpen(open);

                        if (!open) {
                            setName(getUserName(user, ""));
                            setProfileError("");
                        }
                    }
                }}
            >
                <DialogContent className="shadow-none sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg">
                            Edit Profile
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            Update your profile information.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="profile-name">
                                Full Name
                            </Label>

                            <Input
                                id="profile-name"
                                value={name}
                                onChange={(e) =>
                                    handleNameChange(e.target.value)
                                }
                                placeholder="Enter your name"
                                className="h-10"
                            />

                            {profileError && (
                                <p className="text-xs text-destructive">
                                    {profileError}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setEditOpen(false);
                                    setName(getUserName(user, ""));
                                    setProfileError("");
                                }}
                                disabled={updating}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="button"
                                variant="add"
                                onClick={handleUpdateProfile}
                                disabled={updating}
                            >
                                {updating ? "Updating..." : "Submit"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Profile Success Popup */}
            <Dialog
                open={successOpen}
                onOpenChange={setSuccessOpen}
            >
                <DialogContent className="shadow-none sm:max-w-sm">
                    <div className="flex flex-col items-center gap-4 py-4 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-100">
                            <CheckCircle2 className="h-9 w-9 text-green-500" />
                        </div>

                        <DialogHeader className="items-center gap-2">
                            <DialogTitle className="text-xl">
                                Profile Updated
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                Profile successfully updated.
                            </DialogDescription>
                        </DialogHeader>

                        <Button
                            variant="add"
                            className="min-w-24"
                            onClick={() => setSuccessOpen(false)}
                        >
                            OK
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Profile;
