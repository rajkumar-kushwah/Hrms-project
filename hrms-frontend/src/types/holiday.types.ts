export interface HolidayType {
    id: string;
    companyId: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateHolidayPayload {
    name: string;
    startDate: string;
    endDate: string;
    isActive?: boolean;
}

export interface UpdateHolidayPayload {
    name?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
}