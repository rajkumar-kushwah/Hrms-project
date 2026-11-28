
export type EmployeeUpgradeType =
    | "PROMOTION"
    | "INCREMENT"
    | "TRANSFER"
    | "ROLE_CHANGE";

export type EmployeeUpgradeStatus =
    | "DRAFT"
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "SENT_BACK"
    | "APPLIED"
    | "CANCELLED";

export interface UpgradeEmployee {
    id: string;
    name: string;
    employeeCode?: string | null;
}

export interface EmployeeUpgrade {
    id: string;
    employeeId: string;
    upgradeType: EmployeeUpgradeType;
    status: EmployeeUpgradeStatus;
    effectiveDate: string;
    reason: string;
    createdAt: string;
    employee?: UpgradeEmployee;
    requestedBy?: {
        id: string;
        name: string;
    };
}

export interface UpgradePagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface UpgradeRequestsResponse {
    success: boolean;
    data: EmployeeUpgrade[];
    pagination: UpgradePagination;
}

// Employee career history
export interface EmployeeCareerHistory {
    id: string;
    companyId: string;
    employeeId: string;
    upgradeId: string;
    createdById: string;
    changeType: EmployeeUpgradeType;
    effectiveDate: string;
    createdAt: string;

    previousData: {
        designation?: string | null;
        categoryId?: string | null;
        grossSalary?: number | null;
    };

    newData: {
        designation?: string | null;
        categoryId?: string | null;
        grossSalary?: number | null;
    };

    employee: {
        id: string;
        name: string;
        employeeCode?: string | null;
        designation?: string | null;
    };

    createdBy: {
        id: string;
        name: string;
    };
    upgrade?: {
        status: EmployeeUpgradeStatus;
    } | null;
}

export interface EmployeeUpgradeHistoryResponse {
    success: boolean;
    data: EmployeeCareerHistory[];
    pagination: UpgradePagination;

}
