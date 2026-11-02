
export interface LeaveReportItem {
    id: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    status: string;
    createdAt: string;

    user: {
        id: string;
        name: string | null;
        email: string;
        employeeCode: string | null;
        companyId: string;

        branch: {
            name: string;
        } | null;

        category: {
            name: string;
        } | null;
    };

    leaveType: {
        name: string;
        isPaid: boolean;
    };

    approvedByUser?: {
        name: string;
    } | null;
}

export interface LeaveReportResponse {
    summary: {
        total: number;
        approved: number;
        pending: number;
        rejected: number;
        cancelled: number;
    };

    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };

    data: LeaveReportItem[];
}

export interface LeaveReportFilters {
    startDate?: string;
    endDate?: string;
    search?: string;
    status?: string;
    page: number;
    limit: number;
}
