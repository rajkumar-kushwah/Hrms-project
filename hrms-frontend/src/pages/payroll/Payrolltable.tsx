
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  FileDown,
  Loader2,
  CheckCircle2,
  Banknote,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import {
  downloadBulkSalarySlips,
  confirmPayroll,
  markPayrollAsPaid,
  revertPayrollToDraft,
} from "@/services/payroll.service";
import { downloadBlobAsFile } from "@/utilis/downloadFile";
import { useCompanyStore } from "@/store/company.store";
import { CompanySelector } from "@/pages/common/CompanySelector";


interface PayrollEmployee {
  userId: string;
  user: { name: string };
}

interface PayrollTableProps {
  selectedIds: Set<string>;
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  isSuperAdmin: boolean;
  selectedDraftEmployees: PayrollEmployee[];
  selectedConfirmedEmployees: PayrollEmployee[];
  selectedDraftIds: string[];
  selectedConfirmedIds: string[];
  onActionComplete: () => void;
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function PayrollTable({
  selectedIds,
  month,
  year,
  onMonthChange,
  onYearChange,
  isSuperAdmin,
  selectedDraftEmployees,
  selectedConfirmedEmployees,
  selectedDraftIds,
  selectedConfirmedIds,
  onActionComplete,
}: PayrollTableProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const selectedCompanyId = useCompanyStore(
    (state) => state.selectedCompanyId
  );

  const setSelectedCompanyId = useCompanyStore(
    (state) => state.setSelectedCompanyId
  );

  const companyRequired = isSuperAdmin && !selectedCompanyId;

  const actionDisabled =
    loadingAction !== null ||
    selectedIds.size === 0 ||
    companyRequired;


  const runAction = async (
    action: string,
    operation: (companyIdAtSubmit?: string) => Promise<unknown>,
    successMessage: string
  ) => {
    if (isSuperAdmin && !selectedCompanyId) {
      toast.error("Please select a company first.");
      return;
    }

    const companyIdAtSubmit = selectedCompanyId;

    setLoadingAction(action);

    try {
      await operation(companyIdAtSubmit || undefined);

      // Do not refresh or report success for a different selection.
      if (
        isSuperAdmin &&
        useCompanyStore.getState().selectedCompanyId !==
        companyIdAtSubmit
      ) {
        return;
      }

      toast.success(successMessage);
      onActionComplete();
    } catch (error: unknown) {
      if (
        isSuperAdmin &&
        useCompanyStore.getState().selectedCompanyId !==
        companyIdAtSubmit
      ) {
        return;
      }

      const message =
        typeof error === "object" &&
          error !== null &&
          "response" in error
          ? (
            error as {
              response?: {
                data?: { message?: string };
              };
            }
          ).response?.data?.message
          : undefined;

      toast.error(
        message ??
        (error instanceof Error
          ? error.message
          : "Something went wrong.")
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDownloadSlips = () =>
    runAction(
      "download",
      async (companyIdAtSubmit) => {
        const response = await downloadBulkSalarySlips(
          Array.from(selectedIds),
          month,
          year,
          companyIdAtSubmit
        );

        // Prevent downloading a response for a company no longer selected.
        if (
          isSuperAdmin &&
          useCompanyStore.getState().selectedCompanyId !==
          companyIdAtSubmit
        ) {
          return;
        }

        downloadBlobAsFile(
          response.data,
          `salary-slips-${months[month - 1]}-${year}.zip`
        );
      },
      "Salary slips downloaded successfully."
    );

  const handleConfirm = () =>
    runAction(
      "confirm",
      (companyIdAtSubmit) =>
        confirmPayroll(
          selectedDraftIds,
          month,
          year,
          isSuperAdmin ? companyIdAtSubmit : undefined
        ),
      "Payroll confirmed successfully."
    );

  const handleMarkPaid = () =>
    runAction(
      "paid",
      (companyIdAtSubmit) =>
        markPayrollAsPaid(
          selectedConfirmedIds,
          month,
          year,
          undefined,
          isSuperAdmin ? companyIdAtSubmit : undefined
        ),
      "Payroll marked as paid successfully."
    );

  const handleRevert = () =>
    runAction(
      "revert",
      async (companyIdAtSubmit) => {
        await Promise.all(
          selectedDraftEmployees.map((employee) =>
            revertPayrollToDraft(
              employee.userId,
              month,
              year,
              isSuperAdmin ? companyIdAtSubmit : undefined
            )
          )
        );
      },
      "Payroll reverted successfully."
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {isSuperAdmin && <CompanySelector selectedCompanyId={selectedCompanyId} onCompanyChange={setSelectedCompanyId} />}

        <Select
          value={String(month)}
          onValueChange={(value) => onMonthChange(Number(value))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent position="popper">
            {months.map((name, index) => (
              <SelectItem
                key={name}
                value={String(index + 1)}
              >
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={String(year)}
          onValueChange={(value) => onYearChange(Number(value))}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent position="popper">
            {Array.from(
              { length: 6 },
              (_, index) => year - 2 + index
            ).map((itemYear) => (
              <SelectItem
                key={itemYear}
                value={String(itemYear)}
              >
                {itemYear}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="add"
          onClick={handleDownloadSlips}
          disabled={actionDisabled}
        >
          {loadingAction === "download" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          Download Slips
        </Button>

        <Button
          variant="add"
          onClick={handleConfirm}
          disabled={
            loadingAction !== null ||
            selectedDraftIds.length === 0 ||
            companyRequired
          }
        >
          {loadingAction === "confirm" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Confirm Payroll
        </Button>

        <Button
          variant="add"
          onClick={handleMarkPaid}
          disabled={
            loadingAction !== null ||
            selectedConfirmedIds.length === 0 ||
            companyRequired
          }
        >
          {loadingAction === "paid" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Banknote className="mr-2 h-4 w-4" />
          )}
          Mark Paid
        </Button>

        <Button
          variant="add"
          onClick={handleRevert}
          disabled={
            loadingAction !== null ||
            selectedDraftEmployees.length === 0 ||
            companyRequired
          }
        >
          {loadingAction === "revert" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Undo2 className="mr-2 h-4 w-4" />
          )}
          Revert to Draft
        </Button>
      </div>

      {selectedConfirmedEmployees.length > 0 && (
        <span className="text-sm text-muted-foreground">
          {selectedConfirmedEmployees.length} confirmed employee(s)
          selected
        </span>
      )}
    </div>
  );
}
