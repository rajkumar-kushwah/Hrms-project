import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import React, { useState } from 'react';
import { getCompanies, getMyCompany } from '@/services/company.service';
import type { Company } from '@/types/company.types';
import { useAuthStore } from '@/store/auth.store';
import { getCompanyUsers } from '@/services/companyUser.service';
import type { CompanyUser } from '@/types/companyuser.types';
import type { Branch } from '@/types/branch.types';
import { toast } from 'sonner';
import { getBranches } from "@/services/branch.service";
import { getCategories } from '@/services/category.service';
import { getEmployees } from '@/services/employee.service';
import { getTodayAttendance } from '@/services/attendance.service';
import type { Attendance } from '@/types/attendance.types';
import type { Category } from "@/types/category.types";
import type { Employee } from "@/types/employee.types";
import {
    Building2,
    Users,
    UserCheck,
    UserX,
    GitBranch,
    Tags,
    UsersRound,
    CalendarCheck,
} from "lucide-react";
import { isCompanyAdminRole, isSuperAdminRole, isEmployeeRole, } from "@/utilis/roleUtils";

const DashboardStats = () => {
    const { user } = useAuthStore();


    const isCompanyAdmin = isCompanyAdminRole(user?.role?.name);
    const isSuperAdmin = isSuperAdminRole(user?.role?.name);
    const isEmployee = isEmployeeRole(user?.role?.name);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendance, setAttendance] = useState<Attendance | null>(null);

    // React.useEffect(() => {
    //     const fetchCompanies = async () => {
    //         try {
    //             if (isSuperAdmin) {
    //                 // Super Admin - sabhi companies
    //                 const res = await getCompanies();
    //                 setCompanies(res.data.data);
    //             } else if (isCompanyAdmin) {
    //                 // Company Admin - sirf apni company
    //                 const res = await getMyCompany();
    //                 setCompanies([res.data.data]);
    //             }else if(isCompanyAdmin) {
    //                 const res = await getCompanyUsers();
    //                 setCompanies([res.data.data]);
    //             }
    //             // Baaki roles ke liye company stats nahi
    //         } catch (err) {
    //             console.log(err);
    //         }
    //     }
    //     fetchCompanies();
    // }, [])

    React.useEffect(() => {
        const loadAttendance = async () => {
            try {
                const res = await getTodayAttendance();
                setAttendance(res.data.data);
            } catch (err) {
                console.log(err);
                toast.error("Failed to load today's attendance");
            }
        }
        if (user) {
            loadAttendance();
        }
    }, [user])

    React.useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            try {
                if (isSuperAdmin) {
                    // Super Admin: first fetch all companies
                    const companyRes = await getCompanies();
                    const allCompanies: Company[] = companyRes.data.data ?? [];

                    if (cancelled) return;

                    setCompanies(allCompanies);

                    // Fetch each company's data using its company ID
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
                    // Company Admin: only their own company
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

                    setCompanies([companyRes.data.data]);
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
                        : "Failed to fetch dashboard data";

                toast.error(message);
            }
        };

        if (user) {
            void fetchData();
        }

        return () => {
            cancelled = true;
        };
    }, [user, isSuperAdmin, isCompanyAdmin]);

    const totalCompanies = companies.length;
    const activeUsers = companyUsers.filter((user) => user.isActive).length;

    const totalCompaniesUsers = companyUsers.length;
    // const totalUsers = companyUsers.length;
    const inactiveUsers = companyUsers.filter((user) => !user.isActive).length;
    const totalBranches = branches.length;
    const totalCategories = categories.length;
    const totalEmployees = employees.length;


    return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {/* Sirf Super Admin ko Total Companies dikhao */}
            {isSuperAdmin && (
                <>

                    {/* total company statistics */}
                    <Card className="group p-4 border rounded-xl hover:shadow-lg transition-all duration-300 ease-in-out hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] ">

                        <div className="flex items-center gap-3">

                            <div className="flex bg-card-green-light text-card-green transition-colors h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-card-green/80 group-active:bg-card-green/80">
                                <Building2 className="h-5 w-5  transition-colors duration-300 group-hover:text-white group-active:text-white" />
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

                    {/* total company user statistics */}
                    <Card className=" group p-4 border rounded-xl hover:shadow-lg transition-all duration-300 ease-in-out hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] ">
                        <div className="flex items-center gap-3">

                            <div className="flex bg-card-blue-light text-card-blue transition-colors h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-card-blue/80 group-active:bg-card-blue/80">
                                <Users className="h-5 w-5 transition-colors duration-300 group-hover:text-white group-active:text-white" />
                            </div>

                            <div>
                                <CardTitle className="text-sm font-medium group-hover:text-card-blue transition-colors duration-300">
                                    Total CompaniesUsers
                                </CardTitle>

                                <CardDescription className="text-xl font-bold group-hover:text-card-blue transition-colors duration-300">
                                    {totalCompaniesUsers}
                                </CardDescription>
                            </div>

                        </div>
                    </Card>
                </>
            )}

            {(isSuperAdmin || isCompanyAdmin) && (
                <>
                    {/* <Card className="p-4 border rounded-xl">
                        <CardTitle className="text-sm md:text-sm">Total Users</CardTitle>
                        <CardDescription className="text-xl font-bold text-foreground">
                            {totalUsers}
                        </CardDescription>
                    </Card> */}

                    <Card className=" group p-4 border rounded-xl  hover:shadow-lg transition-all duration-300 ease-in-out hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] ">

                        <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--input-green)]/10 transition-all duration-300 group-hover:bg-[var(--input-green)]/80 group-active:bg-[var(--input-green)]/80">
                                <UserCheck className="h-5 w-5 text-[var(--input-green)] transition-colors duration-300 group-hover:text-white group-active:text-white" />
                            </div>

                            <div>
                                <CardTitle className="text-sm md:text-sm group-hover:text-card-green transition-colors duration-300 ">Active Users</CardTitle>
                                <CardDescription className="text-xl font-bold text-green-600">
                                    {activeUsers}
                                </CardDescription>
                            </div>
                        </div>
                    </Card>

                    <Card className="group p-4 border rounded-xl  hover:shadow-lg transition-all duration-300 ease-in-out hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]">
                        <div className="flex items-center gap-3">

                            <div className="flex bg-card-red-light text-card-red transition-colors h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-card-red/80 group-active:bg-card-red/80">
                                <UserX className="h-5 w-5 transition-colors duration-300 group-hover:text-white group-active:text-white" />
                            </div>

                            <div>
                                <CardTitle className="text-sm md:text-sm group-hover:text-card-red transition-colors duration-300">Inactive Users</CardTitle>
                                <CardDescription className="text-xl font-bold group-hover:text-card-red transition-colors duration-300">
                                    {inactiveUsers}
                                </CardDescription>
                            </div>
                        </div>
                    </Card>

                    <Card className="group p-4 border rounded-xl  hover:shadow-lg transition-all duration-300 ease-in-out hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]">
                        <div className="flex items-center gap-3">

                            <div className="flex bg-card-purple-light text-card-purple hover:bg-card-purple hover:text-white transition-colors h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-card-purple/80 group-active:bg-card-purple/80">
                                <GitBranch className="h-5 w-5 transition-colors duration-300 group-hover:text-white group-active:text-white" />
                            </div>

                            <div>
                                <CardTitle className="text-sm md:text-sm group-hover:text-card-purple transition-colors duration-300">Total Branches</CardTitle>
                                <CardDescription className="text-xl font-bold group-hover:text-card-purple transition-colors duration-300">
                                    {totalBranches}
                                </CardDescription>
                            </div>
                        </div>
                    </Card>

                    <Card className="group p-4 border rounded-xl  hover:shadow-lg transition-all duration-300 ease-in-out hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] ">
                        <div className="flex items-center gap-3">

                            <div className="flex bg-card-orange-light text-card-orange hover:bg-card-orange hover:text-white transition-colors h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-card-orange/80 group-active:bg-card-orange/80">
                                <Tags className="h-5 w-5 transition-colors duration-300 group-hover:text-white group-active:text-white" />
                            </div>

                            <div>
                                <CardTitle className="text-sm md:text-sm group-hover:text-card-orange transition-colors duration-300">Total Categories</CardTitle>
                                <CardDescription className="text-xl font-bold group-hover:text-card-orange transition-colors duration-300">
                                    {totalCategories}
                                </CardDescription>
                            </div>
                        </div>
                    </Card>

                    <Card className="group p-4 border rounded-xl  hover:shadow-lg transition-all duration-300 ease-in-out hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] ">
                        <div className="flex items-center gap-3">

                            <div className="flex bg-card-cyan-light text-card-cyan hover:bg-card-cyan hover:text-white transition-colors h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-300 group-hover:bg-card-cyan/80 group-active:bg-card-cyan/80">
                                <UsersRound className="h-5 w-5 transition-colors duration-300 group-hover:text-white group-active:text-white" />
                            </div>

                            <div>
                                <CardTitle className="text-sm md:text-sm group-hover:text-card-cyan transition-colors duration-300">Total Employees</CardTitle>
                                <CardDescription className="text-xl font-bold group-hover:text-card-cyan transition-colors duration-300">{totalEmployees}</CardDescription>
                            </div>
                        </div>
                    </Card>


                </>
            )}



            {(isEmployee || isCompanyAdmin || isSuperAdmin) && (
                <>
                    {/* <Card className="p-4 border rounded-xl">
                        <CardTitle className="text-sm md:text-sm" >Status</CardTitle>
                        <CardDescription className={user?.isActive ? "text-green-600" : "text-red-600"}>
                            {user?.isActive ? "Active" : "Inactive"}
                        </CardDescription>
                    </Card> */}



                    {/* <Card className="p-4 border rounded-xl">
                        <CardTitle className="text-sm md:text-sm">Leave Balance</CardTitle>
                        <CardDescription className="text-xl font-bold">0</CardDescription>
                    </Card> */}
                </>
            )}
            {(isEmployee || isCompanyAdmin) && (
                <Card className="group p-4 border rounded-xl hover:shadow-lg transition-all duration-300 ease-in-out hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] active:scale-[0.98] ">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--input-green)]/10 transition-all duration-300 group-hover:bg-[var(--input-green)]/80 group-active:bg-[var(--input-green)]/80">
                            <CalendarCheck className="h-5 w-5 text-[var(--input-green)] transition-colors duration-300 group-hover:text-white group-active:text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm md:text-sm">
                                Attendance Today
                            </CardTitle>
                            <CardDescription className="text-xs font-bold">
                                {attendance?.status ?? "Not Marked"}
                            </CardDescription>
                        </div>
                    </div>
                </Card>
            )}

        </div>
    );
};

export default DashboardStats;