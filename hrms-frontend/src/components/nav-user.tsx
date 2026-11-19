import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon, SparklesIcon, BadgeCheckIcon, CreditCardIcon, BellIcon, LogOutIcon, Sun, Moon, BadgeCheck } from "lucide-react"
import { useAuthStore } from "@/store/auth.store"
import { LogoutUser } from "@/services/auth.service"
import { useNavigate } from "react-router-dom"
import { useTheme } from "@/providers/ThemeContext"
import { getUserName } from "@/utilis/roleUtils"


export function NavUser() {
  //   user,
  // }: {
  //   user: {
  //     name: string
  //     email: string
  //     avatar: string
  //   }
  // }) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);


  const handleLogout = async () => {
    try {
      await LogoutUser()
      logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error(error);
    }
  }

  const { user } = useAuthStore((state) => state);
  if (!user) return null

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Theme toggle
  const { dark, toggleTheme } = useTheme();

  // const { dark, setDark } = useTheme();

  // const handleThemeToggle = (
  //   e: React.MouseEvent<HTMLDivElement>
  // ) => {

  //   const x = e.clientX;
  //   const y = e.clientY;

  //   const circle = document.createElement("div");

  //   circle.style.position = "fixed";
  //   circle.style.left = `${x}px`;
  //   circle.style.top = `${y}px`;

  //   circle.style.width = "20px";
  //   circle.style.height = "20px";

  //   circle.style.borderRadius = "9999px";

  //   circle.style.background = dark ? "#fff" : "#000";
  //   circle.style.border = dark ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(0,0,0,0.15)";

  //   circle.style.opacity = "1";
  //   circle.style.transform = "translate(-50%, -50%) scale(0)";

  //   circle.style.transition = "transform 1200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 1200ms ease";

  //   circle.style.zIndex = "9999";
  //   circle.style.pointerEvents = "none";

  //   document.body.appendChild(circle);

  //   // requestAnimationFrame is used to ensure that the animation is smooth
  //   requestAnimationFrame(() => {
  //     circle.style.transform =
  //       "translate(-50%, -50%) scale(90)";

  //     circle.style.opacity = "0";
  //   });

  //   setTimeout(() => {
  //     setDark(!dark);
  //   }, 350);

  //   setTimeout(() => {
  //     circle.remove();
  //   }, 1200);
  // };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border border-transparent hover:border-[var(--logo-green)]"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.profilePhoto ?? undefined} alt={getUserName(user)} />
                <AvatarFallback className="rounded-lg"> {getInitials(getUserName(user))}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium"> {getUserName(user)}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-fit 
            [&_[data-slot=dropdown-menu-item]:hover]:bg-[var(--logo-green)] border border-transparent
            [&_[data-slot=dropdown-menu-item]:hover]:text-[#000]"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.profilePhoto ?? undefined} alt={getUserName(user)} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(getUserName(user))}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{getUserName(user)}  </span>
                  {/* {user?.company?.name ?? ""} */}
                  <span className="truncate text-xs text-muted-foreground">

                  </span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile")}>
              <BadgeCheck className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={toggleTheme}
              // onClick={() => {
              //   console.log("before:", dark); setDark(!dark); console.log("after click");
              // }}
              >

                {dark ? <Sun /> : <Moon />}
                {dark ? "Light Mode" : "Dark Mode"}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <SparklesIcon
                />
                Upgrade to Pro
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheckIcon
                />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCardIcon
                />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <BellIcon
                />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOutIcon
              />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
