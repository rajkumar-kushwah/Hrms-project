
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

import { useAuthStore } from "@/store/auth.store";
import { canViewModule } from "@/utilis/roleUtils";

import AttendanceSettings from "./settings/AttendanceSettings";
import GeneralSettings from "./settings/GeneralSettings";
import OnboardingSettings from "./settings/Onboardingchecklistsettings";

function Settings() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const currentPath = location.pathname.replace(/\/+$/, "");

    const canViewGeneral = canViewModule(user, "settings");
    const canViewAttendance = canViewModule(user, "attendance");
    const canViewOnboarding = canViewModule(user, "onboarding");

    const allowedRoutes: Record<string, boolean> = {
        "/settings/general": canViewGeneral,
        "/settings/attendance": canViewAttendance,
        "/settings/onboarding-checklist": canViewOnboarding,
    };

    const firstAllowedRoute =
        canViewGeneral
            ? "/settings/general"
            : canViewAttendance
              ? "/settings/attendance"
              : canViewOnboarding
                ? "/settings/onboarding-checklist"
                : null;

    const activeTab =
        currentPath === "/settings/attendance"
            ? "attendance"
            : currentPath === "/settings/onboarding-checklist"
              ? "onboardingchecklist"
              : "general";

    useEffect(() => {
        if (!firstAllowedRoute) return;

        if (!allowedRoutes[currentPath]) {
            navigate(firstAllowedRoute, { replace: true });
        }
    }, [
        currentPath,
        firstAllowedRoute,
        canViewGeneral,
        canViewAttendance,
        canViewOnboarding,
        navigate,
    ]);

    const handleTabChange = (value: string) => {
        const routes: Record<string, string> = {
            general: "/settings/general",
            attendance: "/settings/attendance",
            onboardingchecklist: "/settings/onboarding-checklist",
        };

        const route = routes[value];

        if (route && allowedRoutes[route]) {
            navigate(route);
        }
    };

    if (!firstAllowedRoute) return null;

    if (!allowedRoutes[currentPath]) return null;

    return (
        <div>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList>
                    {canViewGeneral && (
                        <TabsTrigger value="general">
                            General
                        </TabsTrigger>
                    )}

                    {canViewAttendance && (
                        <TabsTrigger value="attendance">
                            Attendance
                        </TabsTrigger>
                    )}

                    {canViewOnboarding && (
                        <TabsTrigger value="onboardingchecklist">
                            Onboarding Checklist
                        </TabsTrigger>
                    )}
                </TabsList>

                {canViewGeneral && (
                    <TabsContent value="general">
                        <GeneralSettings />
                    </TabsContent>
                )}

                {canViewAttendance && (
                    <TabsContent value="attendance">
                        <AttendanceSettings />
                    </TabsContent>
                )}

                {canViewOnboarding && (
                    <TabsContent value="onboardingchecklist">
                        <OnboardingSettings />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

export default Settings;
