// payroll.types.ts
export interface PayrollSummary {
  userId: string;
  user: {
    id: string;
    name: string;
    profilePhoto?: string | null;
    profilePhotoId?: string | null;
    employeeCode?: string;
    designation?: string;
  };
  totalWorkingDays: number;
  holidayDays: number;
  presentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
  totalUnpaidDays: number;
  grossSalary: number;
  perDaySalary: number;
  deductionAmount: number;
  netSalary: number;
  status: "DRAFT" | "CONFIRMED" | "PAID";
}