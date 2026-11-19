// src/types/onboardingList.types.ts
export type OnboardingStatus = "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";

export type OnboardingEmployee = {
    id: string;
    userId: string;
    user: {
        id: string;
        name: string;
        profilePhoto?: string | null;
        profilePhotoId?: string | null;
        employeeCode: string | null;
        designation: string | null;
    };
    currentStage: string;
    status: OnboardingStatus;
    startDate: string;
    targetDate: string | null;
    completedAt: string | null;
    progressPercent: number;
};
