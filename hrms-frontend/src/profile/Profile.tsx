
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
    Trash2,
    Camera,
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

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAuthStore } from "@/store/auth.store";
import {
    removeProfilePhoto,
    updateProfile,
    uploadProfilePhoto,
} from "@/services/profile.service";
import { updateProfileSchema } from "@/validation/profile.validation";
import { formatRole, getCreatedByRole, getUserName } from "@/utilis/roleUtils";
import UserAvatar from "@/pages/common/UserAvatar";

const Profile = () => {
    const { user, setUser } = useAuthStore();

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [editOpen, setEditOpen] = React.useState(false);
    const [name, setName] = React.useState(getUserName(user, ""));
    const [updating, setUpdating] = React.useState(false);
    const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
    const [profileError, setProfileError] = React.useState("");
    const [successOpen, setSuccessOpen] = React.useState(false);

    const [removeOpen, setRemoveOpen] = React.useState(false);
    const [removingPhoto, setRemovingPhoto] = React.useState(false);

    const handleNameChange = (value: string) => {
        setName(value);

        const result = updateProfileSchema.shape.name.safeParse(value);

        setProfileError(
            result.success ? "" : result.error.issues[0].message
        );
    };

    // Open edit dialog
    const handleEditOpen = () => {
        setName(getUserName(user, ""));
        setProfileError("");
        setEditOpen(true);
    };

    // Upload profile photo
    const handlePhotoUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image");
            event.target.value = "";
            return;
        }

        if (!user) return;

        setUploadingPhoto(true);

        try {
            const res = await uploadProfilePhoto(file);
            const updatedUser = res.data.data;

            setUser({
                ...user,
                profilePhoto: updatedUser.profilePhoto,
                profilePhotoId: updatedUser.profilePhotoId,
            });

            toast.success("Profile photo updated successfully");
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                "Failed to upload profile photo"
            );
        } finally {
            setUploadingPhoto(false);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    // Remove profile photo
    const handleRemoveProfilePhoto = async () => {
        if (!user?.profilePhoto && !user?.profilePhotoId) {
            toast.error("No profile photo found");
            return;
        }

        setRemovingPhoto(true);

        try {
            const res = await removeProfilePhoto();

            setUser({
                ...user,
                profilePhoto: null,
                profilePhotoId: null,
            });

            setRemoveOpen(false);

            toast.success(
                res.data.message || "Profile photo removed successfully"
            );
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                "Failed to remove profile photo"
            );
        } finally {
            setRemovingPhoto(false);
        }
    };

    // Update profile name
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
                "Failed to update profile"
            );
        } finally {
            setUpdating(false);
        }
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

                {/* Profile Header */}
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

                    {/* Profile Information */}

                    {/* Profile Information */}
                    <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 px-4 py-4 sm:px-5">

                        {/* Profile Avatar */}
                        <div className="shrink-0">
                            {user && (
                                <UserAvatar user={user} size="lg" />
                            )}
                        </div>

                        {/* Employee Details */}
                        <div className="min-w-0 flex-1">
                            <h2 className="truncate text-base font-semibold text-foreground">
                                {getUserName(user)}
                            </h2>

                            {user?.role && (
                                <div className="mt-1">
                                    <Badge
                                        variant="secondary"
                                        className="gap-1 text-xs font-medium"
                                    >
                                        <ShieldCheck className="h-3 w-3" />
                                        {formatRole(user.role)}
                                    </Badge>
                                </div>
                            )}
                        </div>

                        {/* Company Details */}
                        {user?.company && (
                            <div className="hidden shrink-0 items-center gap-2 border-l border-border pl-4 sm:flex">
                                <Building2 className="h-4 w-4 text-muted-foreground" />

                                <div className="max-w-auto">
                                    <p className="text-[11px] text-muted-foreground">
                                        {getCreatedByRole(user)}
                                    </p>
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {user.company.name}
                                    </p>
                                </div>
                            </div>
                        )}
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
                    if (
                        !updating &&
                        !uploadingPhoto &&
                        !removingPhoto
                    ) {
                        setEditOpen(open);

                        if (!open) {
                            setName(getUserName(user, ""));
                            setProfileError("");
                        }
                    }
                }}
            >
                <DialogContent className="gap-0 overflow-hidden p-0 shadow-none sm:max-w-xl">

                    {/* Dialog Header */}
                    <DialogHeader className="border-b border-border px-5 py-4 sm:px-6">
                        <DialogTitle className="text-lg font-semibold">
                            Edit Profile
                        </DialogTitle>

                        <DialogDescription className="text-sm">
                            Update your profile information and photo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-5 sm:px-6">

                        {/* Profile Photo Section */}
                        <div className="flex items-center gap-4 border-b border-border py-6">
                            <div className="h-[86px] w-[86px] shrink-0 overflow-hidden rounded-full">
                                {user && (
                                    <UserAvatar
                                        user={user}
                                        size="lg"
                                    />
                                )}
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="text-base font-semibold">
                                    Profile Photo
                                </h3>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Upload or remove your photo
                                </p>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handlePhotoUpload}
                                />

                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-7 cursor-pointer rounded-full bg-sky-500/10 px-3 text-sky-500 shadow-none hover:bg-sky-500/20 hover:text-sky-500"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingPhoto}
                                    >
                                        <Camera className="mr-1.5 h-3.5 w-3.5" />
                                        {uploadingPhoto
                                            ? "Uploading..."
                                            : "Change Photo"}
                                    </Button>

                                    {(user?.profilePhoto || user?.profilePhotoId) && (
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="h-7 cursor-pointer rounded-full bg-red-500/10 px-3 text-red-500 shadow-none hover:bg-red-500/20 hover:text-red-500"
                                            onClick={() => setRemoveOpen(true)}
                                            disabled={removingPhoto || uploadingPhoto}
                                        >
                                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                            Remove Photo
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Full Name Section */}
                        <div className="space-y-3 border-b border-border py-7">
                            <Label
                                htmlFor="profile-name"
                                className="text-base font-semibold"
                            >
                                Full Name
                            </Label>

                            <Input
                                id="profile-name"
                                value={name}
                                onChange={(e) =>
                                    handleNameChange(e.target.value)
                                }
                                placeholder="Enter your name"
                                className="px-3 "
                            />

                            {profileError && (
                                <p className="text-xs text-destructive">
                                    {profileError}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Dialog Footer */}
                    <div className="flex justify-end gap-2 px-5 py-4 sm:px-6">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-full px-4 cursor-pointer"
                            onClick={() => {
                                setEditOpen(false);
                                setName(getUserName(user, ""));
                                setProfileError("");
                            }}
                            disabled={
                                updating ||
                                uploadingPhoto ||
                                removingPhoto
                            }
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            variant="add"
                            className="h-9 rounded-full px-4 cursor-pointer"
                            onClick={handleUpdateProfile}
                            disabled={
                                updating ||
                                uploadingPhoto ||
                                removingPhoto
                            }
                        >
                            {updating ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Remove Photo Confirmation */}
            <AlertDialog
                open={removeOpen}
                onOpenChange={(open) => {
                    if (!removingPhoto) {
                        setRemoveOpen(open);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2">
                            {user && (
                                <UserAvatar
                                    user={user}
                                    size="lg"
                                />
                            )}
                            <AlertDialogTitle>
                                Remove Profile Photo?
                            </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription>
                            Are you sure you want to remove your profile photo?
                            Your default avatar will be displayed instead.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer" disabled={removingPhoto}>
                            Cancel
                        </AlertDialogCancel>

                        <AlertDialogAction variant="destructive"
                            onClick={(e) => {
                                e.preventDefault();
                                void handleRemoveProfilePhoto();
                            }}
                            disabled={removingPhoto}
                            className="cursor-pointer"
                        >
                            {removingPhoto ? "Removing..." : "Remove Photo"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
