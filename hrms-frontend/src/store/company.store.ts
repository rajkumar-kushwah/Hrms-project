
import { create } from "zustand";

interface CompanyState {
    selectedCompanyId: string;
    setSelectedCompanyId: (companyId: string) => void;
    clearSelectedCompany: () => void;
}

export const useCompanyStore = create<CompanyState>((set) => ({
    selectedCompanyId: "",

    setSelectedCompanyId: (companyId) =>
        set({ selectedCompanyId: companyId }),

    clearSelectedCompany: () =>
        set({ selectedCompanyId: "" }),
}));
