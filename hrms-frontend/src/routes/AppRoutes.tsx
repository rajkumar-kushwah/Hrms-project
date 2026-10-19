import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signin from "@/pages/Auth/Signin";
import Dashboard from "@/pages/dashboard/Dashboard";
import Layout from "@/components/layout";
import { ProtectedRoute } from "../providers/ProtectedRoute";
import Profile from "@/pages/Profile";
import { Toaster } from "sonner";
import Unauthorized from "@/Unauthorized/Unauthorized";
import ErrorPage from "@/ErrorHandling/ErrorPage";
import CompanyList from "@/pages/CompanyList";
import Users from "../pages/Users";
import Roles from "@/pages/Roles";
import BranchList from "@/pages/BranchList";
import CategoryList from "@/pages/CategoryList";
import EmployeeList from "@/pages/EmployeeList";
import AttendanceList from "@/pages/punchCard/AttendanceList";
import AttendanceLive from "@/pages/punchCard/AttendanceLive";
import EmployeeAttendanceDetail from "@/pages/punchCard/EmployeeAttendanceDetail";
import Settings from "@/pages/Settings";
import GeoFencing from "@/pages/punchCard/GeoFencing";
import LeavePolicy from "@/pages/LeavePolicy";
import LeaveRequestPage from "@/pages/LeaveRequestPage";
import LeaveApproval from "@/pages/LeaveApproval";
import PayrollPage from "@/pages/payroll/Payroll";
import HolidayPage from "@/pages/Holiday";
import LandingPage from "@/pages/LandingPage";
import PayrollReportPage from "@/pages/reports/PayrollReportPage";
import OnboardingChecklistSettings from "@/pages/settings/Onboardingchecklistsettings";
import OnboardingDetail from "@/pages/onboarding/OnboardingDetail";
import OnboardingList from "@/pages/onboarding/OnboardingList";
import EmployeeView from "@/pages/EmployeeView";


const AppRoutes = () => {
    return (
        <BrowserRouter>

            <Toaster position="top-right" />
            <Routes>

                {/* <Route path="/" element={<Navigate to="/signin" />} />
                <Route path="/signin" element={<Signin />} /> */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/signin" element={<Signin />} />

                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/company" element={<CompanyList />} />
                        <Route path="/companyusers" element={<Users />} />
                        <Route path="/roles" element={<Roles />} />
                        <Route path="/branch" element={<BranchList />} />
                        <Route path="/category" element={<CategoryList />} />
                        <Route path="/employee" element={<EmployeeList />} />
                        <Route path="/employee/:id" element={<EmployeeView />} />
                        <Route path="/attendance/list" element={<AttendanceList />} />
                        <Route path="/attendance/live" element={<AttendanceLive />} />
                        <Route path="/attendance/employee/:userId" element={<EmployeeAttendanceDetail />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/attendance/geo-fencing" element={<GeoFencing />} />
                        <Route path="/leave/request" element={<LeaveRequestPage />} />
                        <Route path="/leave/approval" element={<LeaveApproval />} />
                        <Route path="/leave/policy" element={<LeavePolicy />} />
                        <Route path="/payroll" element={<PayrollPage />} />
                        <Route path="/holiday" element={<HolidayPage />} />
                        <Route path="/reports/payroll" element={<PayrollReportPage />} />
                        <Route path="/onboardingchecklist" element={<OnboardingChecklistSettings />} />
                        <Route path="/onboarding" element={<OnboardingList />} />
                        <Route path="/onboarding/:userId" element={<OnboardingDetail />} />

                    </Route>
                </Route>
                {/* Error hanlding */}
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