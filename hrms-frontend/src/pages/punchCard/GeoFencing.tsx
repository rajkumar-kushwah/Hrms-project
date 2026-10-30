
import React from "react";
import {
    MapPin,
    Users,
    CheckCircle,
    XCircle,
    Search,
    RefreshCw,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { getGeoFencingOverview } from "@/services/branch.service";
import { useAuthStore } from "@/store/auth.store";
import { isSuperAdminRole } from "@/utilis/roleUtils";
import { CompanySelector } from "@/pages/common/CompanySelector";
import { Button } from "@/components/ui/button";

interface GeoFenceEmployee {
    id: string;
    name: string;
    employeeCode?: string;
    isWithinGeoFence: boolean;
    punchInTime: string;
}

interface GeoFenceBranch {
    id: string;
    name: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    geoRadius?: number;
    locationName?: string;
    totalEmployees: number;
    insideFence: number;
    outsideFence: number;
    totalPunchedInToday: number;
    employees: GeoFenceEmployee[];
}

const GeoFencing = () => {
    const { user } = useAuthStore();
    const isSuperAdmin = isSuperAdminRole(user?.role?.name);

    const [branches, setBranches] = React.useState<GeoFenceBranch[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = React.useState("");
    const [search, setSearch] = React.useState("");

    const loadData = React.useCallback(async () => {
        if (isSuperAdmin && !selectedCompanyId) {
            setBranches([]);
            return;
        }

        setLoading(true);

        try {
            const res = await getGeoFencingOverview(
                isSuperAdmin ? selectedCompanyId : undefined
            );

            setBranches(res.data.data);
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to load geo fencing data";

            toast.error(message);
            setBranches([]);
        } finally {
            setLoading(false);
        }
    }, [isSuperAdmin, selectedCompanyId]);

    React.useEffect(() => {
        void loadData();
    }, [loadData]);

    const filteredBranches = React.useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return branches;

        return branches.filter((branch) =>
            [
                branch.name,
                branch.city,
                branch.locationName,
            ].some((value) => value?.toLowerCase().includes(query))
        );
    }, [branches, search]);

    const totalEmployees = branches.reduce(
        (total, branch) => total + branch.totalEmployees,
        0
    );

    const totalInside = branches.reduce(
        (total, branch) => total + branch.insideFence,
        0
    );

    const totalOutside = branches.reduce(
        (total, branch) => total + branch.outsideFence,
        0
    );

    const totalPunchedIn = branches.reduce(
        (total, branch) => total + branch.totalPunchedInToday,
        0
    );

    return (
        <div className="flex flex-col gap-4">
            {isSuperAdmin && (
                <CompanySelector
                    selectedCompanyId={selectedCompanyId || null}
                    onCompanyChange={(companyId) => {
                        setSelectedCompanyId(companyId);
                        setBranches([]);
                    }}
                />
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold">
                        Geo Fencing Overview
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Branch-wise location settings and today's attendance validation
                    </p>
                </div>

                <Button variant="add"
                    type="button"
                    onClick={() => void loadData()}
                    disabled={loading || (isSuperAdmin && !selectedCompanyId)}
                    className="cursor-pointer"
                >
                    <RefreshCw
                        className={` ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                </Button>
            </div>

            {isSuperAdmin && !selectedCompanyId ? (
                <Card className="p-8 text-center text-sm text-muted-foreground">
                    Please select a company to view geo fencing details.
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <Card className="p-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Total Employees
                                </p>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-xl font-semibold mt-2">
                                {totalEmployees}
                            </p>
                        </Card>

                        <Card className="p-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Inside Fence
                                </p>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="text-xl font-semibold text-green-600 mt-2">
                                {totalInside}
                            </p>
                        </Card>

                        <Card className="p-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Outside Fence
                                </p>
                                <XCircle className="h-4 w-4 text-red-600" />
                            </div>
                            <p className="text-xl font-semibold text-red-600 mt-2">
                                {totalOutside}
                            </p>
                        </Card>

                        <Card className="p-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                    Punched In Today
                                </p>
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-xl font-semibold mt-2">
                                {totalPunchedIn}
                            </p>
                        </Card>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search branch, city or location..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>

                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {filteredBranches.length} branches
                        </p>
                    </div>

                    <Card className="overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Branch</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Radius</TableHead>
                                    <TableHead className="text-center">
                                        Employees
                                    </TableHead>
                                    <TableHead className="text-center">
                                        Inside
                                    </TableHead>
                                    <TableHead className="text-center">
                                        Outside
                                    </TableHead>
                                    <TableHead className="text-center">
                                        Punched In
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">
                                                Loading geo fencing data...
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredBranches.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                                            {branches.length === 0
                                                ? "No branches with location set."
                                                : "No matching branches found."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBranches.map((branch) => {
                                        const hasLocation =
                                            branch.latitude != null &&
                                            branch.longitude != null;

                                        return (
                                            <React.Fragment key={branch.id}>
                                                <TableRow>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium text-sm">
                                                                {branch.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {branch.city ?? "—"}
                                                            </p>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center gap-1.5 max-w-52">
                                                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                            <span className="text-xs truncate">
                                                                {hasLocation
                                                                    ? branch.locationName ??
                                                                      `${branch.latitude!.toFixed(4)}, ${branch.longitude!.toFixed(4)}`
                                                                    : "Not configured"}
                                                            </span>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        {hasLocation ? (
                                                            <Badge variant="outline">
                                                                {branch.geoRadius ?? 0}m
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="destructive">
                                                                Disabled
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-center font-medium">
                                                        {branch.totalEmployees}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <span className="text-green-600 font-medium">
                                                            {branch.insideFence}
                                                        </span>
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <span className="text-red-600 font-medium">
                                                            {branch.outsideFence}
                                                        </span>
                                                    </TableCell>

                                                    <TableCell className="text-center font-medium">
                                                        {branch.totalPunchedInToday}
                                                    </TableCell>
                                                </TableRow>

                                                {branch.employees.length > 0 && (
                                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                        <TableCell colSpan={7} className="py-3">
                                                            <div className="flex flex-col gap-2 pl-2">
                                                                <p className="text-xs font-semibold text-muted-foreground">
                                                                    PUNCHED-IN EMPLOYEES
                                                                </p>

                                                                <div className="flex flex-wrap gap-2">
                                                                    {branch.employees.map((emp) => (
                                                                        <div
                                                                            key={emp.id}
                                                                            className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5"
                                                                        >
                                                                            <div>
                                                                                <p className="text-xs font-medium">
                                                                                    {emp.name}
                                                                                </p>
                                                                                <p className="text-[10px] text-muted-foreground">
                                                                                    {emp.employeeCode ?? "—"}
                                                                                </p>
                                                                            </div>

                                                                            <Badge
                                                                                className={
                                                                                    emp.isWithinGeoFence
                                                                                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                                                                                        : "bg-red-100 text-red-700 hover:bg-red-100"
                                                                                }
                                                                            >
                                                                                {emp.isWithinGeoFence
                                                                                    ? "Inside"
                                                                                    : "Outside"}
                                                                            </Badge>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </>
            )}
        </div>
    );
};

export default GeoFencing;
