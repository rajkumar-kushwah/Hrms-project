import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/auth.store";
import { getCompaniesForChecklist } from "@/services/Onboardingtemplate.service";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { isSuperAdminRole } from "@/utilis/roleUtils";

interface Company {
    id: string;
    name: string;
}

interface CompanySelectorProps {
    selectedCompanyId: string | null;
    onCompanyChange: (companyId: string) => void;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "Failed to load companies.";
}

export function CompanySelector({
    selectedCompanyId,
    onCompanyChange,
}: CompanySelectorProps) {
    const { user } = useAuthStore();

    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(false);
    const isSuperAdmin = isSuperAdminRole(user?.role?.name)

    useEffect(() => {
        if (!user || !isSuperAdmin) {
            setCompanies([]);
            setLoading(false);
            return;
        }

        let cancelled = false;

        const loadCompanies = async () => {
            setLoading(true);

            try {
                const response = await getCompaniesForChecklist();
                const data: unknown = response.data?.data;

                if (!Array.isArray(data)) {
                    throw new Error("Invalid company list response.");
                }

                const validCompanies = data.filter(
                    (company): company is Company =>
                        typeof company === "object" &&
                        company !== null &&
                        "id" in company &&
                        typeof company.id === "string" &&
                        "name" in company &&
                        typeof company.name === "string"
                );

                if (cancelled) return;

                setCompanies(validCompanies);

                // Clear only if the selected company no longer exists.
                if (
                    selectedCompanyId &&
                    !validCompanies.some(
                        (company) => company.id === selectedCompanyId
                    )
                ) {
                    onCompanyChange("");
                }
            } catch (error: unknown) {
                if (cancelled) return;

                setCompanies([]);
                onCompanyChange("");
                toast.error(getErrorMessage(error));
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadCompanies();

        return () => {
            cancelled = true;
        };
        // Load companies when the user or role changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isSuperAdmin]);

    // Non-Super Admin does not need the company selector.
    // Their company ID should be handled by the parent page/API logic.
    if (!user || !isSuperAdmin) {
        return null;
    }

    return (
        <div className="w-full max-w-sm space-y-1.5">
            <label className="text-sm font-medium">
                Select Company
            </label>

            <Select
                value={selectedCompanyId || ""}
                onValueChange={onCompanyChange}
                disabled={loading || companies.length === 0}
            >
                <SelectTrigger>
                    <SelectValue
                        placeholder={
                            loading
                                ? "Loading companies..."
                                : "Select company"
                        }
                    />
                </SelectTrigger>

                <SelectContent position="popper" align="start">
                    {companies.map((company) => (
                        <SelectItem
                            key={company.id}
                            value={company.id}
                        >
                            {company.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {!loading && companies.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    No companies available.
                </p>
            )}
        </div>
    );
}