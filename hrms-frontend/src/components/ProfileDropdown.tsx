
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
    ChevronDown,
    LogOut,
    Settings,
    UserRound,
    LockKeyhole,
} from "lucide-react";

// Apne existing auth store ka import path check kar lena.
import { useAuthStore } from "@/store/auth.store";
import { normalizeRole } from "@/utilis/roleUtils";
import { LogoutUser } from "@/services/auth.service";
import { toast } from "sonner";
import React from "react";

// type AuthUser = {
//     id: string;
//     name?: string | null;
//     firstName?: string | null;
//     lastName?: string | null;
//     email?: string | null;
//     profileImage?: string | null;
//     avatar?: string | null;
//     role?: {
//         name?: string | null;
//     } | null;
// };

function getInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) return "U";

    return words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join("");
}

function formatRole(role: string): string {
    return role
        .split("_")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export function ProfileDropdown() {
    const navigate = useNavigate();

    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);
    const [isOpen, setIsOpen] = React.useState(false);

    const profile = useMemo(() => {
        const name = user?.name?.trim() || "User";
        const role = normalizeRole(user?.role?.name ?? "");

        return {
            name,
            email: user?.email ?? "",
            role,
            roleLabel: role ? formatRole(role) : "User",
            image: "",
            initials: getInitials(name),
        };
    }, [user]);

    const handleLogout = async () => {
        try {
            await LogoutUser();
            logout();
            navigate("/", { replace: true });
        } catch (error) {
            console.error("Logout failed:", error);
            toast.error("Unable to logout. Please try again.");
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex h-auto items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent"
                >
                    <Avatar className="h-9 w-9">
                        {/* <AvatarImage src={profile.image} alt={profile.name} /> */}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {profile.initials}
                        </AvatarFallback>
                    </Avatar>

                    <span className="hidden text-left sm:block">
                        <span className="block max-w-36 truncate text-sm font-medium">
                            {profile.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                            {profile.roleLabel}
                        </span>
                    </span>

                    <ChevronDown
                        className={`hidden h-4 w-4 text-muted-foreground transition-transform duration-200 sm:block ${isOpen ? "rotate-180" : "rotate-0"
                            }`}
                    />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={profile.image} alt={profile.name} />
                            <AvatarFallback>{profile.initials}</AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                            {/* <p className="truncate text-sm font-medium">{profile.name}</p> */}
                            <p className="truncate text-xs text-muted-foreground">
                                {profile.email || profile.roleLabel}
                            </p>
                            <p className="mt-0.5 text-xs font-medium text-primary">
                                {profile.roleLabel}
                            </p>
                        </div>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => navigate("/profile")}>
                        <UserRound className="mr-2 h-4 w-4" />
                        My Profile
                    </DropdownMenuItem>

                    <DropdownMenuItem onSelect={() => navigate("/settings")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Account Settings
                    </DropdownMenuItem>

                    <DropdownMenuItem onSelect={() => navigate("/change-password")}>
                        <LockKeyhole className="mr-2 h-4 w-4" />
                        Change Password
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onSelect={() => void handleLogout()}
                    className="text-destructive focus:text-destructive"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
