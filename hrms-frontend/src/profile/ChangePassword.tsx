
import React from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Eye,
    EyeOff,
    KeyRound,
    CheckCircle2,
    Mail,
} from "lucide-react";
import { toast } from "sonner";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { useAuthStore } from "@/store/auth.store";
import { changePassword } from "@/services/profile.service";
import { changePasswordSchema } from "@/validation/profile.validation";

type PasswordErrors = {
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
};

const ChangePassword = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [oldPassword, setOldPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");

    const [showOldPassword, setShowOldPassword] = React.useState(false);
    const [showNewPassword, setShowNewPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    const [errors, setErrors] = React.useState<PasswordErrors>({});
    const [loading, setLoading] = React.useState(false);
    const [successOpen, setSuccessOpen] = React.useState(false);

    const resetForm = () => {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setErrors({});
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    const handleSubmit = async () => {
        const result = changePasswordSchema.safeParse({
            oldPassword,
            newPassword,
            confirmPassword,
        });

        if (!result.success) {
            const fieldErrors: PasswordErrors = {};

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

            setErrors(fieldErrors);
            return;
        }

        setErrors({});
        setLoading(true);

        try {
            await changePassword({
                oldPassword,
                newPassword,
            });

            resetForm();
            setSuccessOpen(true);
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                "Failed to change password"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleNewPasswordChange = (value: string) => {
        setNewPassword(value);

        const result =
            changePasswordSchema.shape.newPassword.safeParse(value);

        setErrors((prev) => ({
            ...prev,
            newPassword: result.success
                ? undefined
                : result.error.issues[0].message,
            confirmPassword:
                confirmPassword && value !== confirmPassword
                    ? "Passwords do not match"
                    : undefined,
        }));
    };

    const handleConfirmPasswordChange = (value: string) => {
        setConfirmPassword(value);

        setErrors((prev) => ({
            ...prev,
            confirmPassword:
                value !== newPassword
                    ? "Passwords do not match"
                    : undefined,
        }));
    };

    const passwordFields = [
        {
            label: "Current Password",
            name: "current-password",
            value: oldPassword,
            setValue: setOldPassword,
            visible: showOldPassword,
            setVisible: setShowOldPassword,
            error: errors.oldPassword,
            placeholder: "Enter current password",
            autoComplete: "current-password",
        },
        {
            label: "New Password",
            name: "new-password",
            value: newPassword,
            setValue: handleNewPasswordChange,
            visible: showNewPassword,
            setVisible: setShowNewPassword,
            error: errors.newPassword,
            placeholder: "Enter new password",
            autoComplete: "new-password",
        },
        {
            label: "Confirm New Password",
            name: "confirm-password",
            value: confirmPassword,
            setValue: handleConfirmPasswordChange,
            visible: showConfirmPassword,
            setVisible: setShowConfirmPassword,
            error: errors.confirmPassword,
            placeholder: "Confirm new password",
            autoComplete: "new-password",
        },
    ];

    return (
        <div className="mx-auto w-full max-w-lg px-2 sm:px-4">
            <Card className="overflow-hidden rounded-lg ">

                {/* Header */}
                <CardHeader className="space-y-3 px-4 py-3 sm:px-5">
                    <Button
                        type="button"
                        variant="add"
                        size="sm"
                        className="-ml-2 w-fit cursor-pointer"
                        onClick={() => navigate("/profile")}
                    >
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Back to Profile
                    </Button>

                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <KeyRound className="h-5 w-5 text-primary" />
                        </div>

                        <div>
                            <CardTitle className="text-lg font-semibold">
                                Change Password
                            </CardTitle>

                            <CardDescription className="mt-0.5 text-xs">
                                Update your account password securely.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                {/* Form */}
                <CardContent className="p-4 sm:p-5">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSubmit();
                        }}
                        autoComplete="on"
                        className="space-y-4"
                    >
                        {/* Account */}
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="account-email"
                                className="text-xs font-medium"
                            >
                                Account
                            </Label>

                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                                <Input
                                    id="account-email"
                                    type="email"
                                    name="username"
                                    autoComplete="username"
                                    value={user?.email ?? ""}
                                    readOnly
                                    className="h-9 bg-muted/30 pl-9 text-sm shadow-none"
                                />
                            </div>
                        </div>

                        {/* Password Fields */}
                        {passwordFields.map((field) => (
                            <div
                                className="space-y-1.5"
                                key={field.name}
                            >
                                <Label
                                    htmlFor={field.name}
                                    className="text-xs font-medium"
                                >
                                    {field.label}
                                </Label>

                                <div className="relative">
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type={
                                            field.visible
                                                ? "text"
                                                : "password"
                                        }
                                        autoComplete={field.autoComplete}
                                        value={field.value}
                                        onChange={(e) =>
                                            field.setValue(e.target.value)
                                        }
                                        placeholder={field.placeholder}
                                        className="h-9 pr-10 text-sm shadow-none"
                                    />

                                    <button
                                        type="button"
                                        aria-label={
                                            field.visible
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        onClick={() =>
                                            field.setVisible((prev) => !prev)
                                        }
                                    >
                                        {field.visible ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>

                                {field.error && (
                                    <p className="text-xs text-destructive">
                                        {field.error}
                                    </p>
                                )}
                            </div>
                        ))}

                        {/* Actions */}
                        <div className="flex flex-col-reverse gap-2 pt-3 sm:flex-row sm:justify-end">
                            <Button className="cursor-pointer"
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => navigate("/profile")}
                                disabled={loading}
                            >
                                Cancel
                            </Button>

                            <Button className="cursor-pointer"
                                type="submit"
                                variant="add"
                                size="sm"
                                disabled={loading}
                            >
                                {loading
                                    ? "Updating..."
                                    : "Update Password"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Success Popup */}
            <Dialog
                open={successOpen}
                onOpenChange={setSuccessOpen}
            >
                <DialogContent className="border-0 shadow-none sm:max-w-sm">
                    <div className="flex flex-col items-center gap-4 py-3 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-100">
                            <CheckCircle2 className="h-9 w-9 text-green-500" />
                        </div>

                        <DialogHeader className="items-center gap-1.5">
                            <DialogTitle className="text-xl">
                                Password Changed
                            </DialogTitle>

                            <DialogDescription className="text-sm">
                                Your password has been changed successfully.
                            </DialogDescription>
                        </DialogHeader>

                        <Button
                            variant="add"
                            size="sm"
                            className="min-w-20"
                            onClick={() => {
                                setSuccessOpen(false);
                                navigate("/profile");
                            }}
                        >
                            OK
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ChangePassword;
