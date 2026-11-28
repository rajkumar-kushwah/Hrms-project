import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import Layout from "@/components/layout";
import { ProtectedRoute } from "../providers/ProtectedRoute";
import Unauthorized from "@/Unauthorized/Unauthorized";
import ErrorPage from "@/ErrorHandling/ErrorPage";

// Lazy-loaded pages
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const Signin = lazy(() => import("@/pages/Auth/Signin"));

const Dashboard = lazy(() => import("@/pages/dashboard/Dashboard"));
const Profile = lazy(() => import("@/profile/Profile"));

const CompanyList = lazy(() => import("@/pages/CompanyList"));
const Users = lazy(() => import("../pages/CompanyUsers"));
const Roles = lazy(() => import("@/pages/Roles"));
const BranchList = lazy(() => import("@/pages/BranchList"));
const CategoryList = lazy(() => import("@/pages/CategoryList"));

const EmployeeList = lazy(() => import("@/pages/EmployeeList"));
const EmployeeView = lazy(() => import("@/pages/EmployeeView"));

const AttendanceList = lazy(() => import("@/pages/punchCard/AttendanceList"));
const AttendanceLive = lazy(() => import("@/pages/punchCard/AttendanceLive"));
const EmployeeAttendanceDetail = lazy(() => import("@/pages/punchCard/EmployeeAttendanceDetail"));
const GeoFencing = lazy(() => import("@/pages/punchCard/GeoFencing"));

const Settings = lazy(() => import("@/pages/Settings"));

const LeavePolicy = lazy(() => import("@/pages/LeavePolicy"));
const LeaveRequestPage = lazy(() => import("@/pages/LeaveRequestPage"));
const LeaveApproval = lazy(() => import("@/pages/LeaveApproval"));

const PayrollPage = lazy(() => import("@/pages/payroll/Payroll"));
const HolidayPage = lazy(() => import("@/pages/Holiday"));

const PayrollReportPage = lazy(() => import("@/pages/reports/PayrollReportPage"));
const AttendanceReport = lazy(() => import("@/pages/reports/AttendanceReport"));
const LeaveReport = lazy(() => import("@/pages/reports/LeaveReport"));
const OvertimeReport = lazy(() => import("@/pages/reports/OvertimeReport"));

const OnboardingChecklistSettings = lazy(() => import("@/pages/settings/Onboardingchecklistsettings"));
const OnboardingDetail = lazy(() => import("@/pages/onboarding/OnboardingDetail"));
const OnboardingList = lazy(() => import("@/pages/onboarding/OnboardingList"));
const ChangePassword = lazy(() => import("@/profile/ChangePassword"));
const UpgradeDashboard = lazy(() => import("@/pages/employeeUpgrade/UpgradeDashboard"));
const InitiateUpgrade = lazy(() => import("@/pages/employeeUpgrade/InitiateUpgrade"));
const ApprovalRequests = lazy(() => import("@/pages/employeeUpgrade/ApprovalRequests"));
const UpgradeHistory = lazy(() => import("@/pages/employeeUpgrade/UpgradeHistory"));
// Reusable lazy page fallback
const PageLoader = ({ children }: { children: React.ReactNode }) => (
    <Suspense
        fallback={
            <div className="py-6 text-center text-sm text-muted-foreground">
                Loading...
            </div>
        }
    >
        {children}
    </Suspense>
);

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Toaster position="top-right" />

            <Routes>
                <Route path="/" element={<PageLoader>  <LandingPage /> </PageLoader>} />

                <Route path="/signin" element={<PageLoader> <Signin /> </PageLoader>} />

                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/dashboard" element={<PageLoader><Dashboard /></PageLoader>} />
                        <Route path="/profile" element={<PageLoader><Profile /></PageLoader>} />
                        <Route path="/company" element={<PageLoader><CompanyList /></PageLoader>} />
                        <Route path="/companyusers" element={<PageLoader><Users /></PageLoader>} />
                        <Route path="/roles" element={<PageLoader><Roles /></PageLoader>} />
                        <Route path="/branch" element={<PageLoader><BranchList /></PageLoader>} />
                        <Route path="/category" element={<PageLoader><CategoryList /></PageLoader>}
                        />
                        <Route path="/employee" element={<PageLoader><EmployeeList /></PageLoader>}
                        />
                        <Route path="/employee/:id" element={<PageLoader><EmployeeView /></PageLoader>}
                        />
                        <Route path="/attendance/list" element={<PageLoader><AttendanceList /></PageLoader>}
                        />
                        <Route path="/attendance/live" element={<PageLoader><AttendanceLive /></PageLoader>}
                        />
                        <Route path="/attendance/employee/:userId" element={<PageLoader><EmployeeAttendanceDetail /></PageLoader>}
                        />
                        <Route path="/settings/*" element={<PageLoader><Settings /></PageLoader>}
                        />
                        <Route path="/attendance/geo-fencing" element={<PageLoader><GeoFencing /></PageLoader>}
                        />
                        <Route path="/leave/request" element={<PageLoader><LeaveRequestPage /></PageLoader>}
                        />
                        <Route path="/leave/approval" element={<PageLoader><LeaveApproval /></PageLoader>}
                        />
                        <Route path="/leave/policy" element={<PageLoader><LeavePolicy /></PageLoader>}
                        />
                        <Route path="/payroll" element={<PageLoader><PayrollPage /></PageLoader>}
                        />
                        <Route path="/holiday" element={<PageLoader><HolidayPage /></PageLoader>}
                        />
                        <Route path="/reports/payroll" element={<PageLoader><PayrollReportPage /></PageLoader>}
                        />
                        <Route path="/onboardingchecklist" element={<PageLoader>         <OnboardingChecklistSettings />     </PageLoader>}
                        />
                        <Route path="/onboarding" element={<PageLoader><OnboardingList /></PageLoader>}
                        />
                        <Route path="/onboarding/:userId" element={<PageLoader><OnboardingDetail /></PageLoader>}
                        />
                        <Route path="/reports/attendance" element={<PageLoader><AttendanceReport /></PageLoader>}
                        />
                        <Route path="/reports/leave" element={<PageLoader><LeaveReport /></PageLoader>}
                        />
                        <Route path="/reports/overtime" element={<PageLoader><OvertimeReport /></PageLoader>}
                        />
                        <Route path="/change-password" element={<PageLoader><ChangePassword /></PageLoader>}
                        />
                        <Route path="/employee-upgrade/dashboard" element={<PageLoader><UpgradeDashboard /></PageLoader>}
                        />
                        <Route path="/employee-upgrade/initiate" element={<PageLoader> <InitiateUpgrade /></PageLoader>}
                        />
                        <Route path="/employee-upgrade/approvals" element={<PageLoader><ApprovalRequests /></PageLoader>}
                        />
                        <Route path="/employee-upgrade/:id/edit" element={<InitiateUpgrade />}
                        />
                        <Route path="/employee-upgrade/history" element={<PageLoader><UpgradeHistory /> </PageLoader>}
                        />
                    </Route>
                </Route>

                {/* Error handling */}
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route path="*" element={<ErrorPage status={404} />} />
                <Route path="/403" element={<ErrorPage status={403} />} />
                <Route path="/404" element={<ErrorPage status={404} />} />
                <Route path="/500" element={<ErrorPage status={500} />} />
            </Routes>
        </BrowserRouter>
    );
};

export default AppRoutes;