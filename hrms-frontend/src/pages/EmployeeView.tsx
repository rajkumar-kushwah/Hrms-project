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
import {
    CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";


const EmployeeView = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();


    const [searchParams] = useSearchParams();

    const companyId = searchParams.get("companyId") ?? undefined;
    const [employee, setEmployee] = React.useState<EmployeeDetail | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!id) return;

        const loadEmployee = async () => {
            try {
                setLoading(true);

                const res = await getEmployeeById(id,companyId);
                setEmployee(res.data.data);
            } catch (err: any) {
                const message = err?.message ||
                    "Failed to load employee details";

                toast.error(message);
            } finally {
                setLoading(false);
            }
        };

        loadEmployee();
    }, [id]);

    const getInitials = (name?: string | null) => {
        if (!name) return "NA";

        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase();
    };

    const formatDate = (date?: string | null) => {
        if (!date) return "—";

        return new Date(date).toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <p className="text-sm text-muted-foreground">
                    Loading employee details...
                </p>
            </div>
        );
    }

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
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Employee List
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Back Button */}
            <Button
                variant="add"
                size="sm"
                className="w-fit cursor-pointer hover:bg-muted hover:text-muted-foreground"
                onClick={() => navigate("/employee")}
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Employee List
            </Button>

            {/* Employee Header */}
            <div className="border border-1 rounded-lg">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarFallback className="text-sm">
                                {getInitials(employee.name)}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                            <h2 className="text-xl font-semibold">
                                {employee.name}
                            </h2>

                            <p className="text-muted-foreground text-sm">
                                {employee.designation ?? employee.role?.name}{" "}
                                • {employee.employeeCode ?? "—"}
                            </p>

                            <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
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
                    <TabsTrigger value="overview">
                        Overview
                    </TabsTrigger>

                    <TabsTrigger value="personal">
                        Personal
                    </TabsTrigger>

                    <TabsTrigger value="employment">
                        Employment
                    </TabsTrigger>

                    <TabsTrigger value="bank">
                        Bank & ID
                    </TabsTrigger>

                </TabsList>

                {/* Overview */}
                <TabsContent
                    value="overview"
                    className="bg-card border rounded-xl p-6 mt-3"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoItem
                            icon={<Briefcase className="h-4 w-4" />}
                            label="Branch"
                            value={employee.branch?.name}
                        />

                        <InfoItem
                            icon={<Briefcase className="h-4 w-4" />}
                            label="Category"
                            value={employee.category?.name}
                        />

                        <InfoItem
                            icon={<Briefcase className="h-4 w-4" />}
                            label="Role"
                            value={employee.role?.name}
                        />

                        <InfoItem
                            icon={<Calendar className="h-4 w-4" />}
                            label="Joining Date"
                            value={formatDate(employee.joiningDate)}
                        />
                    </div>
                </TabsContent>

                {/* Personal */}
                <TabsContent
                    value="personal"
                    className="bg-card border rounded-xl p-6 mt-3"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoItem
                            label="Date of Birth"
                            value={formatDate(employee.dateOfBirth)}
                        />

                        <InfoItem
                            label="Gender"
                            value={employee.gender}
                        />

                        <InfoItem
                            label="Blood Group"
                            value={employee.bloodGroup}
                        />

                        <InfoItem
                            label="Marital Status"
                            value={employee.maritalStatus}
                        />

                        <InfoItem
                            className="md:col-span-2"
                            icon={<MapPin className="h-4 w-4" />}
                            label="Current Address"
                            value={employee.currentAddress}
                        />

                        <InfoItem
                            className="md:col-span-2"
                            icon={<MapPin className="h-4 w-4" />}
                            label="Permanent Address"
                            value={employee.permanentAddress}
                        />

                        <InfoItem
                            label="Emergency Contact Name"
                            value={employee.emergencyContactName}
                        />

                        <InfoItem
                            label="Emergency Contact Phone"
                            value={employee.emergencyContactPhone}
                        />
                    </div>
                </TabsContent>

                {/* Employment */}
                <TabsContent
                    value="employment"
                    className="bg-card border rounded-xl p-6 mt-3"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoItem
                            label="Employment Type"
                            value={employee.employmentType}
                        />

                        <InfoItem
                            label="Work Shift"
                            value={employee.workShift}
                        />

                        <InfoItem
                            label="Reporting Manager"
                            value={employee.reportingManager?.name}
                        />

                        <InfoItem
                            label="Gross Monthly Salary"
                            value={
                                employee.grossSalary !== null &&
                                    employee.grossSalary !== undefined
                                    ? `₹${employee.grossSalary.toLocaleString("en-IN")}`
                                    : "—"
                            }
                        />
                    </div>
                </TabsContent>

                {/* Bank & ID */}
                <TabsContent
                    value="bank"
                    className="bg-card border rounded-xl p-6 mt-3"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoItem
                            label="PAN Number"
                            value={employee.panNumber}
                        />

                        <InfoItem
                            label="Aadhar Number"
                            value={employee.aadharNumber}
                        />

                        <InfoItem
                            label="Bank Name"
                            value={employee.bankName}
                        />

                        <InfoItem
                            label="Bank Account"
                            value={employee.bankAccountNumber}
                        />

                        <InfoItem
                            label="IFSC Code"
                            value={employee.bankIFSC}
                        />

                        <InfoItem
                            label="PF Number"
                            value={employee.pfNumber}
                        />

                        <InfoItem
                            label="ESI Number"
                            value={employee.esiNumber}
                        />
                    </div>
                </TabsContent>

            </Tabs>
        </div>
    );
};

interface InfoItemProps {
    icon?: React.ReactNode;
    label: string;
    value?: string | null;
    className?: string;
}

const InfoItem = ({
    icon,
    label,
    value,
    className,
}: InfoItemProps) => (
    <div className={className}>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
            {icon}
            {label}
        </p>

        <p className="font-medium mt-0.5">
            {value ?? "—"}
        </p>
    </div>
);

export default EmployeeView;