import {
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";

import { AppSidebar } from "@/components/app-sidebar";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import {
    Outlet,
    Link,
    useLocation,
} from "react-router-dom";

import { useAuthStore } from "@/store/auth.store";
import { ProfileDropdown } from "./ProfileDropdown";

export default function Layout() {
    const location = useLocation();
    const { user } = useAuthStore();

    const getRoleName = () => {
        const role = user?.role?.name;

        if (!role) {
            return "User";
        }

        switch (role.toLowerCase()) {
            case "superadmin":
            case "super admin":
                return "Super Admin";

            case "admin":
            case "companyadmin":
            case "company admin":
                return "Admin";

            case "employee":
                return "Employee";

            default:
                return role;
        }
    };

    // ─────────────────────────────────────────
    // Page Title
    // ─────────────────────────────────────────

    const getPageTitle = () => {
        switch (location.pathname) {
            case "/dashboard":
                return "Dashboard";

            case "/attendance/live":
                return "Live Attendance";

            case "/attendance/list":
                return "Attendance List";

            case "/reports/attendance":
                return "Attendance Report";

            case "/company":
                return "Company";

            case "/branch":
                return "Branch";

            case "/category":
                return "Category";

            case "/check-in":
                return "Check-in/Out";

            case "/employee":
                return "Employee";

            case "/roles":
                return "Role";

            case "/profile":
                return "Profile";

            case "/companyusers":
                return "companyUsers";

            case "/settings":
                return "Settings";

            case "/attendance/geo-fencing":
                return "Geo Fencing";

            case "/leave/policy":
                return "Leave Policy";

            case "/holiday":
                return "Holiday";

            case "/leave/request":
                return "Leave Request";

            case "/leave/approval":
                return "Leave Approval";

            case "/payroll":
                return "Payroll";

            case "/reports/payroll":
                return "Payroll Report";

            case "/onboarding":
                return "OnboardingList";

            // case "/onboarding/:userId":
            //     return "OnboardingDetail";

            case "/settings/general":
                return "General Configuration";

            case "/settings/attendance":
                return "Attendance Configuration";

            case "/settings/onboarding-checklist":
                return "Onboarding Checklist Configuration";

            default:
                return "Dashboard";
        }
    };

    // ─────────────────────────────────────────
    // Dynamic Attendance Employee Page
    // ─────────────────────────────────────────

    const isEmployeeAttendance =
        location.pathname.startsWith("/attendance/employee/");

    const isOnboardingDetail =
        location.pathname.startsWith("/onboarding/") &&
        location.pathname !== "/onboarding";

    const isEmployeeDetail =
        location.pathname.startsWith("/employee/") &&
        location.pathname !== "/employee";

    // ─────────────────────────────────────────
    // Current Page Title
    // ─────────────────────────────────────────

    const pageTitle = isEmployeeAttendance
        ? "Employee Attendance"
        : isOnboardingDetail
            ? "Onboarding Detail"
            : isEmployeeDetail
                ? "Employee Detail"
                : getPageTitle();

    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full min-w-0 overflow-x-hidden p-2">

                {/* Sidebar */}
                <AppSidebar />

                {/* Main Content */}
                <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden px-4 py-3 space-y-4">

                    {/* Sidebar Trigger + Breadcrumb */}

                    <div className="flex min-h-10 w-full items-center justify-between gap-3">
                        {/* Left: Sidebar Trigger + Breadcrumb */}
                        <div className="flex min-w-0 items-center gap-2">
                            <SidebarTrigger className="-ml-1 shrink-0 cursor-pointer" />

                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink asChild>
                                            <Link to="/dashboard">{getRoleName()}</Link>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>

                                    <BreadcrumbSeparator />

                                    {isEmployeeAttendance ? (
                                        <>
                                            <BreadcrumbItem>
                                                <BreadcrumbLink asChild>
                                                    <Link to="/attendance/list">
                                                        Attendance List
                                                    </Link>
                                                </BreadcrumbLink>
                                            </BreadcrumbItem>
                                            <BreadcrumbSeparator />
                                            <BreadcrumbItem>
                                                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                                            </BreadcrumbItem>
                                        </>
                                    ) : isOnboardingDetail ? (
                                        <>
                                            <BreadcrumbItem>
                                                <BreadcrumbLink asChild>
                                                    <Link to="/onboarding">Onboarding</Link>
                                                </BreadcrumbLink>
                                            </BreadcrumbItem>
                                            <BreadcrumbSeparator />
                                            <BreadcrumbItem>
                                                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                                            </BreadcrumbItem>
                                        </>
                                    ) : isEmployeeDetail ? (
                                        <>
                                            <BreadcrumbItem>
                                                <BreadcrumbLink asChild>
                                                    <Link to="/employee">Employee List</Link>
                                                </BreadcrumbLink>
                                            </BreadcrumbItem>
                                            <BreadcrumbSeparator />
                                            <BreadcrumbItem>
                                                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                                            </BreadcrumbItem>
                                        </>
                                    ) : (
                                        <BreadcrumbItem>
                                            <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                                        </BreadcrumbItem>
                                    )}
                                </BreadcrumbList>
                            </Breadcrumb>
                        </div>

                        {/* Right: Profile Dropdown */}
                        <div className="shrink-0">
                            <ProfileDropdown />
                        </div>
                    </div>


                    <div className="w-full min-w-0 space-y-5 pt-4">

                        <h1 className="text-2xl font-medium">
                            {pageTitle}
                        </h1>

                        <div className="w-full min-w-0 max-w-full">
                            <Outlet />
                        </div>

                    </div>

                </main>

            </div>
        </SidebarProvider>
    );
}