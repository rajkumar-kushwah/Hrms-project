

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ChevronDown,
    LogOut,
    Settings,
    UserRound,
    LockKeyhole,
} from "lucide-react";
import { toast } from "sonner";

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

import UserAvatar from "@/pages/common/UserAvatar";
import { useAuthStore } from "@/store/auth.store";
import {
    formatRole,
    getUserName,
    getUserRole,
} from "@/utilis/roleUtils";
import { LogoutUser } from "@/services/auth.service";

export function ProfileDropdown() {
    const navigate = useNavigate();

    const user = useAuthStore((state) => state.user);
    const logout = useAuthStore((state) => state.logout);

    const [isOpen, setIsOpen] = useState(false);

    const profile = useMemo(() => ({
        name: getUserName(user),
        email: user?.email ?? "",
        role: getUserRole(user),
        roleLabel: formatRole(user, "User"),
    }), [user]);

    const handleNavigate = (path: string) => {
        setIsOpen(false);
        navigate(path);
    };

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

    if (!user) return null;

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex h-auto items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-accent"
                >
                    <UserAvatar user={user} size="sm" />

                    <span className="hidden min-w-0 text-left sm:block">
                        <span className="block max-w-36 truncate text-sm font-semibold">
                            {profile.name}
                        </span>

                        <span className="block max-w-36 truncate text-xs text-muted-foreground">
                            {profile.roleLabel}
                        </span>
                    </span>

                    <ChevronDown
                        className={`hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 sm:block ${isOpen ? "rotate-180" : ""
                            }`}
                    />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-64 rounded-xl p-1.5 shadow-lg"
            >
                {/* User Information */}
                <DropdownMenuLabel className="px-3 py-3 font-normal">
                    <div className="flex items-center gap-3">
                        <UserAvatar user={user} size="md" />

                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                                {profile.name}
                            </p>

                            <p className="truncate text-xs text-muted-foreground">
                                {profile.email}
                            </p>

                            {/* <p className="mt-1 text-xs font-medium text-primary">
                                {profile.roleLabel}
                            </p> */}
                        </div>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* Navigation */}
                <DropdownMenuGroup>
                    <DropdownMenuItem
                        className="cursor-pointer gap-3 rounded-lg py-2.5"
                        onSelect={() => handleNavigate("/profile")}
                    >
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                        <span>My Profile</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        className="cursor-pointer gap-3 rounded-lg py-2.5"
                        onSelect={() => handleNavigate("/settings")}
                    >
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span>Account Settings</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                        className="cursor-pointer gap-3 rounded-lg py-2.5"
                        onSelect={() => handleNavigate("/change-password")}
                    >
                        <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                        <span>Change Password</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {/* Logout */}
                <DropdownMenuItem
                    variant="destructive"
                    className="cursor-pointer gap-3 rounded-lg py-2.5"
                    onSelect={() => void handleLogout()}
                >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
