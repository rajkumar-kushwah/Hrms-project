export interface Employee {
    id: string;
    name: string;
    email: string;
    profilePhoto?: string | null;
    profilePhotoId?: string | null;
    phone?: string;
    employeeCode?: string;
    designation?: string;
    joiningDate?: string;
    isActive: boolean;
    createdAt: string;
    role?: { id: number; name: string };
    branch?: { id: string; name: string };
    category?: { id: string; name: string };
    company?: { id: string; name: string };
    grossSalary: number | null;
    onboarding: {
        status: "IN_PROGRESS" | "ON_HOLD" | "COMPLETED";
        currentStage:
        | "OFFER"
        | "JOINING"
        | "DOCUMENTS"
        | "TRAINING"
        | "ACTIVE";
        progressPercent: number;
        targetDate: string | null;
    } | null;
}

export interface EmployeeDetail extends Employee {
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    maritalStatus?: string;
    currentAddress?: string;
    permanentAddress?: string;
    employmentType?: string;
    workShift?: string;
    panNumber?: string;
    aadharNumber?: string;
    bankAccountNumber?: string;
    bankIFSC?: string;
    bankName?: string;
    pfNumber?: string;
    esiNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    reportingManager?: { id: string; name: string };
}

export interface CreateEmployeePayload {
    name: string;
    email: string;
    password: string;
    roleId: number;
    branchId?: string;
    categoryId?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    maritalStatus?: string;
    currentAddress?: string;
    permanentAddress?: string;
    designation?: string;
    joiningDate?: string;
    employmentType?: string;
    workShift?: string;
    reportingManagerId?: string;
    panNumber?: string;
    aadharNumber?: string;
    bankAccountNumber?: string;
    bankIFSC?: string;
    bankName?: string;
    pfNumber?: string;
    esiNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    grossSalary?: number;
}

export interface UpdateEmployeePayload
    extends Partial<CreateEmployeePayload> {
    isActive?: boolean;
}