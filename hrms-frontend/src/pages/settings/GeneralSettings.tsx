
import React from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getMyCompany, getCompanies, updateCompany } from "@/services/company.service";
import { useAuthStore } from "@/store/auth.store";
import type { Company } from "@/types/company.types";

const GeneralSettings = () => {
    const { user } = useAuthStore();
    const isSuperAdmin = user?.role?.name === "super_admin";

    const [company, setCompany] = React.useState<Company | null>(null);
    const [companies, setCompanies] = React.useState<Company[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        const load = async () => {
            setLoading(true);

            try {
                if (isSuperAdmin) {
                    const res = await getCompanies();
                    const list = res.data.data;
                    setCompanies(list);

                    if (list.length === 1) {
                        setSelectedCompanyId(list[0].id);
                        setCompany(list[0]);
                    }
                } else {
                    const res = await getMyCompany();
                    setCompany(res.data.data);
                }
            } catch (error: unknown) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to load company details";
                toast.error(message);
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, [isSuperAdmin]);

    const handleCompanySelect = (companyId: string) => {
        const selected = companies.find((item) => item.id === companyId);

        setSelectedCompanyId(companyId);
        setCompany(selected ?? null);
    };

    const handleSave = async () => {
        if (!company) return;

        setSaving(true);

        try {
            await updateCompany(company.id, {
                name: company.name,
                email: company.email,
                phone: company.phone,
                website: company.website,
                address: company.address,
            });

            toast.success("Company details updated successfully!");
        } catch (error: any) {
            const message = (error?.message || "Failed to update company details") as string;
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="py-8 text-center text-muted-foreground">
                Loading...
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                    Manage company information
                </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
                {isSuperAdmin && (
                    <div className="space-y-2">
                        <Label>Select Company</Label>
                        <Select
                            value={selectedCompanyId}
                            onValueChange={handleCompanySelect}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a company" />
                            </SelectTrigger>
                            <SelectContent position="popper">
                                {companies.map((item) => (
                                    <SelectItem
                                        key={item.id}
                                        value={item.id}
                                    >
                                        {item.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {!company ? (
                    <p className="py-4 text-sm text-muted-foreground">
                        {isSuperAdmin
                            ? "Select a company to manage its settings."
                            : "Company details not found."}
                    </p>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label>Company Name</Label>
                            <Input
                                value={company.name}
                                onChange={(e) =>
                                    setCompany({
                                        ...company,
                                        name: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-1 space-y-2">
                                <Label>Email</Label>
                                <Input
                                    value={company.email ?? ""}
                                    onChange={(e) =>
                                        setCompany({
                                            ...company,
                                            email: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="flex-1 space-y-2">
                                <Label>Phone</Label>
                                <Input
                                    value={company.phone ?? ""}
                                    onChange={(e) =>
                                        setCompany({
                                            ...company,
                                            phone: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Website</Label>
                            <Input
                                value={company.website ?? ""}
                                onChange={(e) =>
                                    setCompany({
                                        ...company,
                                        website: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Input
                                value={company.address ?? ""}
                                onChange={(e) =>
                                    setCompany({
                                        ...company,
                                        address: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-fit"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default GeneralSettings;
