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
import { toast } from "sonner";

import {
    getMyCompany,
    getCompanies,
    updateCompany,
} from "@/services/company.service";

import { useAuthStore } from "@/store/auth.store";
import { useCompanyStore } from "@/store/company.store";
import { CompanySelector } from "@/pages/common/CompanySelector";

import type { Company } from "@/types/company.types";

const GeneralSettings = () => {
    const { user } = useAuthStore();

    const [selectedCompanyId, setSelectedCompanyId] = React.useState("");

    const roleName = user?.role?.name
        ?.trim()
        .toLowerCase()
        .replace(/\s+/g, "_");

    const isSuperAdmin = roleName === "super_admin";

    const [company, setCompany] = React.useState<Company | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);

    const requestIdRef = React.useRef(0);

    // Load company details whenever the selected company changes.
    React.useEffect(() => {
        const requestId = ++requestIdRef.current;

        const loadCompany = async () => {
            if (!user) {
                setCompany(null);
                setLoading(false);
                return;
            }

            if (isSuperAdmin && !selectedCompanyId) {
                setCompany(null);
                setLoading(false);
                return;
            }

            setLoading(true);

            try {
                let companyData: Company | null = null;

                if (isSuperAdmin) {
                    const response = await getCompanies();

                    if (requestId !== requestIdRef.current) return;

                    const companies: Company[] = Array.isArray(
                        response.data?.data
                    )
                        ? response.data.data
                        : [];

                    companyData =
                        companies.find(
                            (item) => item.id === selectedCompanyId
                        ) ?? null;
                } else {
                    const response = await getMyCompany();

                    if (requestId !== requestIdRef.current) return;

                    companyData = response.data?.data ?? null;
                }

                if (requestId !== requestIdRef.current) return;

                setCompany(companyData);

                if (!companyData) {
                    toast.error("Company details not found.");
                }
            } catch (error: unknown) {
                if (requestId !== requestIdRef.current) return;

                setCompany(null);

                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to load company details";

                toast.error(message);
            } finally {
                if (requestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        };

        void loadCompany();

        return () => {
            requestIdRef.current += 1;
        };
    }, [user, isSuperAdmin, selectedCompanyId]);

    const handleSave = async () => {
        if (!company) {
            toast.error("Company details not found.");
            return;
        }

        const companyIdAtSubmit = company.id;

        if (isSuperAdmin && !selectedCompanyId) {
            toast.error("Please select a company first.");
            return;
        }

        if (
            isSuperAdmin &&
            selectedCompanyId !== companyIdAtSubmit
        ) {
            toast.error("The selected company has changed. Please try again.");
            return;
        }

        setSaving(true);

        try {
            await updateCompany(companyIdAtSubmit, {
                name: company.name,
                email: company.email,
                phone: company.phone,
                website: company.website,
                address: company.address,
            });

            // Avoid showing success for an outdated company selection.
            if (
                isSuperAdmin &&
                useCompanyStore.getState().selectedCompanyId !==
                companyIdAtSubmit
            ) {
                return;
            }

            toast.success("Company details updated successfully!");
        } catch (error: unknown) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to update company details";

            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    const updateCompanyField = <K extends keyof Company>(
        field: K,
        value: Company[K]
    ) => {
        setCompany((current) =>
            current ? { ...current, [field]: value } : current
        );
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                    Manage company information
                </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
                {isSuperAdmin && <CompanySelector
                    selectedCompanyId={selectedCompanyId}
                    onCompanyChange={setSelectedCompanyId} />}

                {loading ? (
                    <div className="py-8 text-center text-muted-foreground">
                        Loading company details...
                    </div>
                ) : !company ? (
                    <p className="py-4 text-sm text-muted-foreground">
                        {isSuperAdmin
                            ? "Select a company to manage its settings."
                            : "Company details not found."}
                    </p>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="company-name">
                                Company Name
                            </Label>
                            <Input
                                id="company-name"
                                value={company.name}
                                onChange={(event) =>
                                    updateCompanyField(
                                        "name",
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="min-w-0 flex-1 space-y-2">
                                <Label htmlFor="company-email">Email</Label>
                                <Input
                                    id="company-email"
                                    type="email"
                                    value={company.email ?? ""}
                                    onChange={(event) =>
                                        updateCompanyField(
                                            "email",
                                            event.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="min-w-0 flex-1 space-y-2">
                                <Label htmlFor="company-phone">Phone</Label>
                                <Input
                                    id="company-phone"
                                    value={company.phone ?? ""}
                                    onChange={(event) =>
                                        updateCompanyField(
                                            "phone",
                                            event.target.value
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company-website">Website</Label>
                            <Input
                                id="company-website"
                                value={company.website ?? ""}
                                onChange={(event) =>
                                    updateCompanyField(
                                        "website",
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company-address">Address</Label>
                            <Input
                                id="company-address"
                                value={company.address ?? ""}
                                onChange={(event) =>
                                    updateCompanyField(
                                        "address",
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={
                                saving ||
                                loading ||
                                (isSuperAdmin &&
                                    !selectedCompanyId)
                            }
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