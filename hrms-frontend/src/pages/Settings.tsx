
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

import AttendanceSettings from "./settings/AttendanceSettings";
import GeneralSettings from "./settings/GeneralSettings";
import OnboardingSettings from "./settings/Onboardingchecklistsettings";

function Settings() {
    const location = useLocation();
    const navigate = useNavigate();

    const currentPath = location.pathname.replace(/\/+$/, "");

    const activeTab =
        currentPath === "/settings/attendance"
            ? "attendance"
            : currentPath === "/settings/onboarding-checklist"
              ? "onboardingchecklist"
              : "general";

    useEffect(() => {
        const validPaths = [
            "/settings/general",
            "/settings/attendance",
            "/settings/onboarding-checklist",
        ];

        if (!validPaths.includes(currentPath)) {
            navigate("/settings/general", { replace: true });
        }
    }, [currentPath, navigate]);

    const handleTabChange = (value: string) => {
        const routes: Record<string, string> = {
            general: "/settings/general",
            attendance: "/settings/attendance",
            onboardingchecklist: "/settings/onboarding-checklist",
        };

        const route = routes[value];

        if (route) {
            navigate(route);
        }
    };

    return (
        <div>
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="onboardingchecklist">
                        Onboarding Checklist
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                    <GeneralSettings />
                </TabsContent>

                <TabsContent value="attendance">
                    <AttendanceSettings />
                </TabsContent>

                <TabsContent value="onboardingchecklist">
                    <OnboardingSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default Settings;
