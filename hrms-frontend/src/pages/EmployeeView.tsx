
import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    ArrowLeft,
    Mail,
    Phone,
    Briefcase,
    MapPin,
    Calendar,
} from "lucide-react";
import { toast } from "sonner";

import { getEmployeeById } from "@/services/employee.service";
import type { EmployeeDetail } from "@/types/employee.types";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

import { formatRole, getRoleName } from "@/utilis/roleUtils";
import UserAvatar from "./common/UserAvatar";

// --------------------------------------------------
// Constants & Configurations
// --------------------------------------------------

const EMPLOYEE_TABS = [
    { value: "overview", label: "Overview" },
    { value: "personal", label: "Personal" },
    { value: "employment", label: "Employment" },
    { value: "bank", label: "Bank & ID" },
];

const TAB_CONTENT_CLASS = "bg-card border rounded-xl p-6 mt-3";

// const getInitials = (name?: string | null) => {
//     if (!name) return "NA";

//     return name
//         .trim()
//         .split(/\s+/)
//         .map((part) => part[0])
//         .join("")
//         .toUpperCase();
// };

const formatDate = (date?: string | null) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleDateString();
};

const formatSalary = (salary?: number | null) => {
    if (salary === null || salary === undefined) return "—";

    return `₹${salary.toLocaleString("en-IN")}`;
};

// --------------------------------------------------
// Types
// --------------------------------------------------

interface InfoItemProps {
    icon?: React.ReactNode;
    label: string;
    value?: string | number | null;
    className?: string;
}

// --------------------------------------------------
// Info Item Component
// --------------------------------------------------

const InfoItem = ({
    icon,
    label,
    value,
    className,
}: InfoItemProps) => (
    <div className={className}>
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {icon}
            {label}
        </p>

        <p className="mt-0.5 font-medium">
            {value ?? "—"}
        </p>
    </div>
);

// --------------------------------------------------
// Employee View
// --------------------------------------------------

const EmployeeView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [searchParams] = useSearchParams();

    const companyId = searchParams.get("companyId") ?? undefined;

    const [employee, setEmployee] =
        React.useState<EmployeeDetail | null>(null);

    const [loading, setLoading] = React.useState(true);

    // --------------------------------------------------
    // Load Employee
    // --------------------------------------------------

    React.useEffect(() => {
        let isMounted = true;

        if (!id) {
            setEmployee(null);
            setLoading(false);
            return;
        }

        const loadEmployee = async () => {
            try {
                setLoading(true);

                const response = await getEmployeeById(id, companyId);

                if (isMounted) {
                    setEmployee(response.data.data);
                }
            } catch (error: unknown) {
                if (!isMounted) return;

                setEmployee(null);

                const responseMessage = (
                    error as {
                        response?: { data?: { message?: string } };
                    }
                )?.response?.data?.message;

                toast.error(
                    responseMessage ||
                    (error instanceof Error
                        ? error.message
                        : "Failed to load employee details")
                );
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        void loadEmployee();

        return () => {
            isMounted = false;
        };
    }, [id, companyId]);

    // --------------------------------------------------
    // Loading State
    // --------------------------------------------------

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <p className="text-sm text-muted-foreground">
                    Loading employee details...
                </p>
            </div>
        );
    }

    // --------------------------------------------------
    // Not Found State
    // --------------------------------------------------

    if (!employee) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-10">
                <p className="text-muted-foreground">
                    Employee details not found.
                </p>

                <Button
                    variant="add"
                    onClick={() => navigate("/employee")}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Employee List
                </Button>
            </div>
        );
    }

    // --------------------------------------------------
    // Employee Information Configurations
    // --------------------------------------------------

    const overviewDetails = [
        {
            label: "Branch",
            value: employee.branch?.name,
            icon: <Briefcase className="h-4 w-4" />,
        },
        {
            label: "Category",
            value: employee.category?.name,
            icon: <Briefcase className="h-4 w-4" />,
        },
        {
            label: "Role",
            value: getRoleName(employee.role),
            icon: <Briefcase className="h-4 w-4" />,
        },
        {
            label: "Joining Date",
            value: formatDate(employee.joiningDate),
            icon: <Calendar className="h-4 w-4" />,
        },
    ];

    const personalDetails = [
        {
            label: "Date of Birth",
            value: formatDate(employee.dateOfBirth),
        },
        {
            label: "Gender",
            value: employee.gender,
        },
        {
            label: "Blood Group",
            value: employee.bloodGroup,
        },
        {
            label: "Marital Status",
            value: employee.maritalStatus,
        },
        {
            label: "Current Address",
            value: employee.currentAddress,
            icon: <MapPin className="h-4 w-4" />,
            className: "md:col-span-2",
        },
        {
            label: "Permanent Address",
            value: employee.permanentAddress,
            icon: <MapPin className="h-4 w-4" />,
            className: "md:col-span-2",
        },
        {
            label: "Emergency Contact Name",
            value: employee.emergencyContactName,
        },
        {
            label: "Emergency Contact Phone",
            value: employee.emergencyContactPhone,
        },
    ];

    const employmentDetails = [
        {
            label: "Employment Type",
            value: employee.employmentType,
        },
        {
            label: "Work Shift",
            value: employee.workShift,
        },
        {
            label: "Reporting Manager",
            value: employee.reportingManager?.name,
        },
        {
            label: "Gross Monthly Salary",
            value: formatSalary(employee.grossSalary),
        },
    ];

    const bankDetails = [
        {
            label: "PAN Number",
            value: employee.panNumber,
        },
        {
            label: "Aadhar Number",
            value: employee.aadharNumber,
        },
        {
            label: "Bank Name",
            value: employee.bankName,
        },
        {
            label: "Bank Account",
            value: employee.bankAccountNumber,
        },
        {
            label: "IFSC Code",
            value: employee.bankIFSC,
        },
        {
            label: "PF Number",
            value: employee.pfNumber,
        },
        {
            label: "ESI Number",
            value: employee.esiNumber,
        },
    ];

    // --------------------------------------------------
    // Render
    // --------------------------------------------------

    return (
        <div className="flex flex-col gap-4">
            {/* Back Button */}
            <Button
                variant="add"
                size="sm"
                className="w-fit cursor-pointer hover:bg-muted hover:text-muted-foreground"
                onClick={() => navigate("/employee")}
            >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Employee List
            </Button>

            {/* Employee Header */}
            <div className="rounded-lg border">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <UserAvatar user={employee} size="xl" />

                        <div className="flex-1">
                            <h2 className="text-xl font-semibold">
                                {employee.name}
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                {employee.designation || formatRole(employee.role)}
                                {" • "}
                                {employee.employeeCode ?? "—"}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {employee.email}
                                </span>

                                {employee.phone && (
                                    <span className="flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {employee.phone}
                                    </span>
                                )}
                            </div>
                        </div>

                        <Badge
                            className={
                                employee.isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                            }
                        >
                            {employee.isActive ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                </CardContent>
            </div>

            {/* Employee Details */}
            <Tabs defaultValue="overview">
                <TabsList>
                    {EMPLOYEE_TABS.map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* Overview */}
                <TabsContent
                    value="overview"
                    className={TAB_CONTENT_CLASS}
                >
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {overviewDetails.map((item) => (
                            <InfoItem
                                key={item.label}
                                icon={item.icon}
                                label={item.label}
                                value={item.value}
                            />
                        ))}
                    </div>
                </TabsContent>

                {/* Personal */}
                <TabsContent
                    value="personal"
                    className={TAB_CONTENT_CLASS}
                >
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {personalDetails.map((item) => (
                            <InfoItem
                                key={item.label}
                                icon={item.icon}
                                label={item.label}
                                value={item.value}
                                className={item.className}
                            />
                        ))}
                    </div>
                </TabsContent>

                {/* Employment */}
                <TabsContent
                    value="employment"
                    className={TAB_CONTENT_CLASS}
                >
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {employmentDetails.map((item) => (
                            <InfoItem
                                key={item.label}
                                label={item.label}
                                value={item.value}
                            />
                        ))}
                    </div>
                </TabsContent>

                {/* Bank & ID */}
                <TabsContent
                    value="bank"
                    className={TAB_CONTENT_CLASS}
                >
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {bankDetails.map((item) => (
                            <InfoItem
                                key={item.label}
                                label={item.label}
                                value={item.value}
                            />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default EmployeeView;
