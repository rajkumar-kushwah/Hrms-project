
import React from "react";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { uploadProfilePhoto } from "@/services/profile.service";
import { useAuthStore } from "@/store/auth.store";

interface UserAvatarProps {
    user: {
        id: string | number;
        name?: string | null;
        profilePhoto?: string | null;
        profilePhotoId?: string | null;
    };
    size?: "sm" | "md" | "lg" | "xl";
    editable?: boolean;
    className?: string;
}

const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
    xl: "h-20 w-20",
};

const getInitials = (name?: string | null) => {
    if (!name?.trim()) return "U";

    return name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
};

const UserAvatar: React.FC<UserAvatarProps> = ({
    user,
    size = "md",
    editable = false,
    className = "",
}) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [uploading, setUploading] = React.useState(false);
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const [displayPhoto, setDisplayPhoto] = React.useState(
        user.profilePhoto || undefined
    );

    const loggedInUser = useAuthStore((state) => state.user);
    const setUser = useAuthStore((state) => state.setUser);

    const isOwnProfile =
        String(loggedInUser?.id) === String(user.id);

    const canUpload = editable && isOwnProfile;
    const hasPhoto = Boolean(displayPhoto);

    React.useEffect(() => {
        setDisplayPhoto(user.profilePhoto || undefined);
    }, [user.profilePhoto]);

    React.useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const handleFileChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            toast.error("Only JPG, PNG and WEBP images are allowed");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5 MB");
            event.target.value = "";
            return;
        }

        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        event.target.value = "";
    };

    const handleRemoveSelected = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
    };

    const handleSavePhoto = async () => {
        if (!selectedFile) return;

        try {
            setUploading(true);

            const response = await uploadProfilePhoto(selectedFile);
            const updatedUser = response.data.data;

            setDisplayPhoto(updatedUser.profilePhoto);

            const currentUser = useAuthStore.getState().user;

            if (
                currentUser &&
                String(currentUser.id) === String(user.id)
            ) {
                setUser({
                    ...currentUser,
                    profilePhoto: updatedUser.profilePhoto,
                    profilePhotoId: updatedUser.profilePhotoId,
                });
            }

            toast.success(
                hasPhoto
                    ? "Profile photo updated successfully"
                    : "Profile photo saved successfully"
            );

            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                "Failed to upload profile photo"
            );
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={`flex flex-col items-center gap-3 ${className}`}>
            {/* Avatar */}
            <div className="relative shrink-0">
                <Avatar className={sizeClasses[size]}>
                    <AvatarImage
                        src={previewUrl || displayPhoto}
                        alt={user.name || "User"}
                    />

                    <AvatarFallback>
                        {getInitials(user.name)}
                    </AvatarFallback>
                </Avatar>

                {previewUrl && (
                    <button
                        type="button"
                        onClick={handleRemoveSelected}
                        disabled={uploading}
                        aria-label="Remove selected photo"
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* Upload Buttons */}
            {canUpload && (
                <>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button className="cursor-pointer"
                            type="button"
                            variant="add"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {selectedFile ? "Change File" : "Choose a File"}
                        </Button>

                        <Button className="cursor-pointer"
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSavePhoto}
                            disabled={!selectedFile || uploading}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit"
                            )}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default UserAvatar;
