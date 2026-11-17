
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import React, { useState } from 'react';
import { getCompanies, getMyCompany } from '@/services/company.service';
import type { Company } from '@/types/company.types';
import { useAuthStore } from '@/store/auth.store';
import { getCompanyUsers } from '@/services/companyUser.service';
import type { CompanyUser } from '@/types/companyuser.types';
import type { Branch } from '@/types/branch.types';
import { toast } from 'sonner';
import { getBranches } from '@/services/branch.service';
import { getCategories } from '@/services/category.service';
import { getEmployees } from '@/services/employee.service';
import { getTodayAttendance } from '@/services/attendance.service';
import type { Attendance } from '@/types/attendance.types';
import type { Category } from '@/types/category.types';
import type { Employee } from '@/types/employee.types';
import {
    Building2,
    Users,
    UserCheck,
    UserX,
    GitBranch,
    Tags,
    UsersRound,
    CalendarCheck,
} from 'lucide-react';
import {
    isCompanyAdminRole,
    isSuperAdminRole,
    canViewModule,
} from '@/utilis/roleUtils';

const DashboardStats = () => {
    const { user } = useAuthStore();

    // Role checks: always pass the complete user object
    const isSuperAdmin = isSuperAdminRole(user);
    const isCompanyAdmin = !isSuperAdmin && isCompanyAdminRole(user);

    const isAdmin = isSuperAdmin || isCompanyAdmin;

    // Module view permissions
    const canViewCompanies = canViewModule(user, 'company');
    const canViewUsers = canViewModule(user, 'company-users');
    const canViewBranches = canViewModule(user, 'branch');
    const canViewCategories = canViewModule(user, 'category');
    const canViewEmployees = canViewModule(user, 'employee');
    const canViewAttendance = canViewModule(user, 'attendance');

    const [companies, setCompanies] = useState<Company[]>([]);
    const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendance, setAttendance] = useState<Attendance | null>(null);

    // Attendance data
    React.useEffect(() => {
        if (!user || !isAdmin || !canViewAttendance) return;

        const loadAttendance = async () => {
            try {
                const res = await getTodayAttendance();
                setAttendance(res.data.data);
            } catch (err) {
                console.log(err);
                toast.error("Failed to load today's attendance");
            }
        };

        void loadAttendance();
    }, [user, isAdmin, canViewAttendance]);

    // Dashboard data
    React.useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            try {
                if (isSuperAdmin) {
                    // Super Admin: fetch all companies
                    const companyRes = await getCompanies();
                    const allCompanies: Company[] = companyRes.data.data ?? [];

                    if (cancelled) return;

                    setCompanies(allCompanies);

                    // Fetch company data
                    const companyData = await Promise.all(
                        allCompanies.map(async (company) => {
                            const [
                                userRes,
                                branchRes,
                                categoryRes,
                                employeeRes,
                            ] = await Promise.all([
                                getCompanyUsers(company.id),
                                getBranches(company.id),
                                getCategories(company.id),
                                getEmployees(company.id),
                            ]);

                            return {
                                users: userRes.data.data ?? [],
                                branches: branchRes.data.data ?? [],
                                categories: categoryRes.data.data ?? [],
                                employees: employeeRes.data.data ?? [],
                            };
                        })
                    );

                    if (cancelled) return;

                    setCompanyUsers(companyData.flatMap((item) => item.users));
                    setBranches(companyData.flatMap((item) => item.branches));
                    setCategories(companyData.flatMap((item) => item.categories));
                    setEmployees(companyData.flatMap((item) => item.employees));
                } else if (isCompanyAdmin) {
                    // Company Admin: fetch only own company data
                    const [
                        companyRes,
                        branchRes,
                        userRes,
                        categoryRes,
                        employeeRes,
                    ] = await Promise.all([
                        getMyCompany(),
                        getBranches(),
                        getCompanyUsers(),
                        getCategories(),
                        getEmployees(),
                    ]);

                    if (cancelled) return;

                    setCompanies(companyRes.data.data ? [companyRes.data.data] : []);
                    setBranches(branchRes.data.data ?? []);
                    setCompanyUsers(userRes.data.data ?? []);
                    setCategories(categoryRes.data.data ?? []);
                    setEmployees(employeeRes.data.data ?? []);
                }
            } catch (error: unknown) {
                if (cancelled) return;

                const message =
                    error instanceof Error
                        ? error.message
                        : 'Failed to fetch dashboard data';

                toast.error(message);
            }
        };

        if (user && isAdmin) {
            void fetchData();
        }

        return () => {
            cancelled = true;
        };
    }, [user, isAdmin, isSuperAdmin, isCompanyAdmin]);

    // Statistics
    const totalCompanies = companies.length;
    const totalCompaniesUsers = companyUsers.length;
    const activeUsers = companyUsers.filter((item) => item.isActive).length;
    const inactiveUsers = companyUsers.filter((item) => !item.isActive).length;
    const totalBranches = branches.length;
    const totalCategories = categories.length;
    const totalEmployees = employees.length;

    // Employees and other non-admin roles should not see these stats
    if (!isAdmin) return null;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">

            {/* Total Companies: Super Admin only */}
            {isSuperAdmin && canViewCompanies && (
                <Card className="group p-4 border rounded-xl hover:shadow-lg transition-all duration-300 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                        <div className="flex bg-card-green-light text-card-green h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-card-green/80 group-active:bg-card-green/80">
                            <Building2 className="h-5 w-5 transition-colors duration-300 group-hover:text-white group-active:text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-medium group-hover:text-card-green transition-colors duration-300">
                                Total Companies
                            </CardTitle>
                            <CardDescription className="text-xl font-bold group-hover:text-card-green transition-colors duration-300">
                                {totalCompanies}
                            </CardDescription>
                        </div>
                    </div>
                </Card>
            )}

            {/* Total Company Users: Super Admin only */}
            {isSuperAdmin && canViewUsers && (
                <Card className="group p-4 border rounded-xl hover:shadow-lg transition-all duration-300 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                        <div className="flex bg-card-blue-light text-card-blue h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-card-blue/80 group-active:bg-card-blue/80">
                            <Users className="h-5 w-5 transition-colors duration-300 group-hover:text-white group-active:text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-medium group-hover:text-card-blue transition-colors duration-300">
                                Total Companies Users
                            </CardTitle>
                            <CardDescription className="text-xl font-bold group-hover:text-card-blue transition-colors duration-300">
                                {totalCompaniesUsers}
                            </CardDescription>
                        </div>
                    </div>
                </Card>
            )}

            {/* Active Users */}
            {canViewUsers && (
                <Card className="group p-4 border rounded-xl hover:shadow-lg transition-all duration-300 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--input-green)]/10 transition-all duration-300 group-hover:bg-[var(--input-green)]/80 group-active:bg-[var(--input-green)]/80">
                            <UserCheck className="h-5 w-5 text-[var(--input-green)] transition-colors duration-300 group-hover:text-white group-active:text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm md:text-sm group-hover:text-card-green transition-colors duration-300">
                                Active Users
                            </CardTitle>
                            <CardDescription className="text-xl font-bold text-green-600">
                                {activeUsers}
                            </CardDescription>
                        </div>
                    </div>
                </Card>
            )}

            {/* Inactive Users */}
            {canViewUsers && (
                <Card className="group p-4 border rounded-xl hover:shadow-lg transition-all duration-300 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                        <div className="flex bg-card-red-light text-card-red h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-card-red/80 group-active:bg-card-red/80">
                            <UserX className="h-5 w-5 transition-colors duration-300 group-hover:text-white group-active:text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm md:text-sm group-hover:text-card-red transition-colors duration-300">
                                Inactive Users
                            </CardTitle>
                            <CardDescription className="text-xl font-bold group-hover:text-card-red transition-colors duration-300">
                                {inactiveUsers}
                            </CardDescription>
                        </div>
                    </div>
                </Card>
            )}

            {/* Total Branches */}
            {canViewBranches && (
                <Card className="group p-4 border rounded-xl hover:shadow-lg transition-all duration-300 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                        <div className="flex bg-card-purple-light text-card-purple h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-card-purple/80 group-active:bg-card-purple/80">
                            <GitBranch className="h-5 w-5 transition-colors duration-300 group-hover:text-white group-active:text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm md:text-sm group-hover:text-card-purple transition-colors duration-300">
                                Total Branches
                            </CardTitle>
                            <CardDescription className="text-xl font-bold group-hover:text-card-purple transition-colors duration-300">
                                {totalBranches}
                            </CardDescription>
                        </div>
                    </div>
                </Card>
            )}

            {/* Total Categories */}
            {canViewCategories && (
                <Card className="group p-4 border rounded-xl hover:shadow-lg transition-all duration-300 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                        <div className="flex bg-card-orange-light text-card-orange h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-card-orange/80 group-active:bg-card-orange/80">
                            <Tags className="h-5 w-5 transition-colors duration-300 group-hover:text-white group-active:text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm md:text-sm group-hover:text-card-orange transition-colors duration-300">
                                Total Categories
                            </CardTitle>
                            <CardDescription className="text-xl font-bold group-hover:text-card-orange transition-colors duration-300">
                                {totalCategories}
                            </CardDescription>
                        </div>
                    </div>
                </Card>
            )}

            {/* Total Employees */}
            {canViewEmployees && (
                <Card className="group p-4 border rounded-xl hover:shadow-lg transition-all duration-300 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                        <div className="flex bg-card-cyan-light text-card-cyan h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-card-cyan/80 group-active:bg-card-cyan/80">
                            <UsersRound className="h-5 w-5 transition-colors duration-300 group-hover:text-white group-active:text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm md:text-sm group-hover:text-card-cyan transition-colors duration-300">
                                Total Employees
                            </CardTitle>
                            <CardDescription className="text-xl font-bold group-hover:text-card-cyan transition-colors duration-300">
                                {totalEmployees}
                            </CardDescription>
                        </div>
                    </div>
                </Card>
            )}

            {/* Attendance Today */}
            {canViewAttendance && (
                <Card className="group p-4 border rounded-xl hover:shadow-lg transition-all duration-300 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--input-green)]/10 transition-all duration-300 group-hover:bg-[var(--input-green)]/80 group-active:bg-[var(--input-green)]/80">
                            <CalendarCheck className="h-5 w-5 text-[var(--input-green)] transition-colors duration-300 group-hover:text-white group-active:text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm md:text-sm">
                                Attendance Today
                            </CardTitle>
                            <CardDescription className="text-xs font-bold">
                                {attendance?.status ?? 'Not Marked'}
                            </CardDescription>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default DashboardStats;
