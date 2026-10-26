
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  getOnboardingDetail,
  toggleChecklistItem,
  setOnboardingStatus,
  submitChecklistDocument,
  uploadOnboardingDocument,
} from "@/services/onboarding.service";

import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Stage = "OFFER" | "JOINING" | "DOCUMENTS" | "TRAINING" | "ACTIVE";
type DocumentInputType = "FILE_UPLOAD" | "DOCUMENT_NUMBER" | "EITHER";

interface ChecklistItem {
  id: string;
  stage: Stage;
  title: string;
  description: string | null;
  isRequired: boolean;
  order: number;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: string | null;
  requiresDocument: boolean;
  documentUrl: string | null;
  documentNumber: string | null;
  documentInputType: DocumentInputType | null;
}

interface OnboardingDetailData {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    employeeCode: string | null;
    designation: string | null;
  };
  currentStage: Stage;
  status: "IN_PROGRESS" | "COMPLETED" | "ON_HOLD";
  startDate: string;
  targetDate: string | null;
  notes: string | null;
  completedAt: string | null;
  itemsByStage: Record<Stage, ChecklistItem[]>;
}

interface DocumentForm {
  file: File | null;
  documentNumber: string;
}

const stages: Stage[] = [
  "OFFER",
  "JOINING",
  "DOCUMENTS",
  "TRAINING",
  "ACTIVE",
];

const stageLabels: Record<Stage, string> = {
  OFFER: "Offer",
  JOINING: "Joining",
  DOCUMENTS: "Documents",
  TRAINING: "Training",
  ACTIVE: "Active",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) return response.data.message;
  }

  return error instanceof Error ? error.message : fallback;
};

const getDocumentInputType = (
  item: ChecklistItem
): DocumentInputType => item.documentInputType ?? "FILE_UPLOAD";

const getProgress = (data: OnboardingDetailData) => {
  const items = stages.flatMap((stage) => data.itemsByStage[stage] ?? []);
  const requiredItems = items.filter((item) => item.isRequired);

  if (requiredItems.length === 0) return 0;

  const completed = requiredItems.filter((item) => item.isCompleted).length;
  return Math.round((completed / requiredItems.length) * 100);
};

const isStageCompleted = (data: OnboardingDetailData, stage: Stage) => {
  const requiredItems = (data.itemsByStage[stage] ?? []).filter(
    (item) => item.isRequired
  );

  return (
    requiredItems.length > 0 &&
    requiredItems.every((item) => item.isCompleted)
  );
};

const getStatusBadge = (status: OnboardingDetailData["status"]) => {
  switch (status) {
    case "IN_PROGRESS":
      return (
        <Badge className="border-none bg-blue-100 text-blue-700 hover:bg-blue-100">
          In Progress
        </Badge>
      );
    case "ON_HOLD":
      return (
        <Badge className="border-none bg-amber-100 text-amber-700 hover:bg-amber-100">
          On Hold
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge className="border-none bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
          Completed
        </Badge>
      );
  }
};

export default function OnboardingDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<OnboardingDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [submittingItemId, setSubmittingItemId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [uploadDialogItemId, setUploadDialogItemId] = useState<string | null>(
    null
  );

  const [documentForms, setDocumentForms] = useState<
    Record<string, DocumentForm>
  >({});

  const loadDetail = useCallback(
    async (showLoader = true) => {
      if (!userId) {
        setData(null);
        setLoading(false);
        return;
      }

      try {
        if (showLoader) setLoading(true);
        const response = await getOnboardingDetail(userId);
        setData(response.data);
      } catch (error: unknown) {
        toast.error(
          getErrorMessage(error, "Failed to load onboarding details.")
        );
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const updateDocumentForm = <K extends keyof DocumentForm,>(
    itemId: string,
    field: K,
    value: DocumentForm[K]
  ) => {
    setDocumentForms((previous) => ({
      ...previous,
      [itemId]: {
        file: previous[itemId]?.file ?? null,
        documentNumber: previous[itemId]?.documentNumber ?? "",
        [field]: value,
      },
    }));
  };

  const handleFileChange = (
    itemId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Maximum file size is 5 MB.");
      event.target.value = "";
      updateDocumentForm(itemId, "file", null);
      return;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error("Only PDF, JPG and PNG files are allowed.");
      event.target.value = "";
      updateDocumentForm(itemId, "file", null);
      return;
    }

    updateDocumentForm(itemId, "file", file);
  };

  const handleToggle = async (item: ChecklistItem, checked: boolean) => {
    if (!data || togglingItemId || submittingItemId) return;

    if (item.stage !== data.currentStage) {
      toast.error("Only the current stage can be modified.");
      return;
    }

    if (item.requiresDocument) {
      toast.error("Submit the required document to complete this item.");
      return;
    }

    if (data.status !== "IN_PROGRESS") {
      toast.error("Only active onboarding can be updated.");
      return;
    }

    const previousData = data;
    setTogglingItemId(item.id);

    setData({
      ...data,
      itemsByStage: {
        ...data.itemsByStage,
        [item.stage]: (data.itemsByStage[item.stage] ?? []).map((current) =>
          current.id === item.id
            ? {
              ...current,
              isCompleted: checked,
              completedAt: checked ? new Date().toISOString() : null,
            }
            : current
        ),
      },
    });

    try {
      await toggleChecklistItem(item.id);
      await loadDetail(false);
      toast.success("Checklist updated successfully.");
    } catch (error: unknown) {
      setData(previousData);
      toast.error(
        getErrorMessage(error, "Failed to update checklist item.")
      );
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleDocumentSubmit = async (item: ChecklistItem) => {
    if (!data || togglingItemId || submittingItemId) return;

    if (item.stage !== data.currentStage) {
      toast.error("Only the current stage can be modified.");
      return;
    }

    if (data.status !== "IN_PROGRESS") {
      toast.error("Only active onboarding can be updated.");
      return;
    }

    if (item.isCompleted) {
      toast.error("This checklist item is already completed.");
      return;
    }

    if (!item.requiresDocument) {
      toast.error("This item does not require a document.");
      return;
    }


    const form = documentForms[item.id] ?? {
      file: null,
      documentNumber: "",
    };

    const inputType = getDocumentInputType(item);
    const documentNumber = form.documentNumber.trim();

    if (inputType === "FILE_UPLOAD" && !form.file) {
      toast.error("Please select a file to upload.");
      return;
    }

    if (inputType === "DOCUMENT_NUMBER" && !documentNumber) {
      toast.error("Please enter the document number.");
      return;
    }

    if (inputType === "EITHER" && !form.file && !documentNumber) {
      toast.error("Upload a file or enter a document number.");
      return;
    }

    setSubmittingItemId(item.id);

    try {
      let documentUrl: string | undefined;

      if (form.file) {
        const uploadResponse = await uploadOnboardingDocument(
          form.file,
          item.id
        );
        documentUrl = uploadResponse.data.url;
      }

      await submitChecklistDocument(item.id, {
        ...(documentUrl ? { documentUrl } : {}),
        ...(documentNumber ? { documentNumber } : {}),
      });
      console.log("Document submitted for item:", item.id);

      await loadDetail(false);
      console.log("Onboarding detail refreshed");

      setDocumentForms((previous) => ({
        ...previous,
        [item.id]: { file: null, documentNumber: "" },
      }));

      setUploadDialogItemId(null);
      toast.success("Document submitted successfully.");
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Document submission failed.")
      );
    } finally {
      setSubmittingItemId(null);
    }
  };

  const handleStatusChange = async (status: "IN_PROGRESS" | "ON_HOLD") => {
    if (!userId || statusUpdating) return;

    setStatusUpdating(true);

    try {
      await setOnboardingStatus(userId, status);
      await loadDetail(false);

      toast.success(
        status === "ON_HOLD"
          ? "Onboarding put on hold."
          : "Onboarding resumed."
      );
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Failed to update onboarding status.")
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Onboarding details not found.</p>
        <Button variant="outline" onClick={() => navigate("/onboarding")}>
          Back to Onboarding
        </Button>
      </div>
    );
  }

  const progress = getProgress(data);
  const currentStageIndex = stages.indexOf(data.currentStage);
  const isReadOnly = data.status !== "IN_PROGRESS";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/onboarding")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </Button>

        <div className="flex items-center gap-2">
          {data.status === "IN_PROGRESS" && (
            <Button
              variant="outline"
              size="sm"
              disabled={statusUpdating}
              onClick={() => void handleStatusChange("ON_HOLD")}
            >
              {statusUpdating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Put On Hold
            </Button>
          )}

          {data.status === "ON_HOLD" && (
            <Button
              size="sm"
              disabled={statusUpdating}
              onClick={() => void handleStatusChange("IN_PROGRESS")}
            >
              {statusUpdating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Resume Onboarding
            </Button>
          )}

          {getStatusBadge(data.status)}
        </div>
      </div>

      <div className="border-b pb-5">
        <h1 className="text-2xl font-bold tracking-tight">{data.user.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.user.designation || "Employee"}
          {" · "}
          {data.user.employeeCode || "N/A"}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Employee onboarding checklist and document verification
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <CardContent className="grid grid-cols-2 divide-x divide-y p-0 md:grid-cols-4 md:divide-y-0">
          <div className="p-4">
            <p className="text-xs uppercase text-muted-foreground">
              Current Stage
            </p>
            <p className="mt-2 text-lg font-semibold">
              {stageLabels[data.currentStage]}
            </p>
          </div>

          <div className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Start Date</p>
            <p className="mt-2 text-lg font-semibold">
              {new Date(data.startDate).toLocaleDateString()}
            </p>
          </div>

          <div className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Target Date</p>
            <p className="mt-2 text-lg font-semibold">
              {data.targetDate
                ? new Date(data.targetDate).toLocaleDateString()
                : "Not set"}
            </p>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase text-muted-foreground">
                Overall Progress
              </p>
              <span className="text-sm font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} className="mt-3 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              Based on required checklist items
            </p>
          </div>
        </CardContent>
      </div>

      <div className="rounded-xl border p-4 sm:p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-base">Stage Progression</CardTitle>
          <p className="text-sm text-muted-foreground">
            Track onboarding progress from offer to activation.
          </p>
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-3 px-0 pb-0 sm:grid-cols-3 md:grid-cols-5">
          {stages.map((stage, index) => {
            const completed = isStageCompleted(data, stage);
            const current = index === currentStageIndex;

            return (
              <div
                key={stage}
                className={`flex flex-col items-center justify-center rounded-lg border p-4 text-center ${completed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : current
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-muted-foreground"
                  }`}
              >
                {completed ? (
                  <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle
                    className={`mb-2 h-5 w-5 ${current ? "text-primary" : "text-muted-foreground/40"
                      }`}
                  />
                )}

                <span className="text-sm font-medium">{stageLabels[stage]}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  {completed
                    ? "Completed"
                    : current
                      ? "In progress"
                      : "Pending"}
                </span>
              </div>
            );
          })}
        </CardContent>
      </div>

      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Onboarding Checklist</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete checklist items and submit required documents.
          </p>
        </div>

        {stages.map((stage) => {
          const items = data.itemsByStage[stage] ?? [];
          const completedCount = items.filter((item) => item.isCompleted).length;

          return (
            <section key={stage} className="overflow-hidden rounded-xl border">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b bg-muted/20 px-4 py-4 sm:px-6">
                <div>
                  <CardTitle className="text-base">{stageLabels[stage]}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {items.length} checklist {items.length === 1 ? "item" : "items"}
                  </p>
                </div>

                <Badge variant="secondary" className="shrink-0">
                  {completedCount} / {items.length} Done
                </Badge>
              </CardHeader>

              <CardContent className="p-0">
                {items.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground sm:px-6">
                    No items configured for this stage.
                  </p>
                ) : (
                  <div className="divide-y">
                    {items.map((item) => {
                      console.log({
                        itemTitle: item.title,
                        requiresDocument: item.requiresDocument,
                        status: data.status,
                        currentStage: data.currentStage,
                        itemStage: stage,
                        isReadOnly,
                        // isCurrentStage,
                        // isBusy,
                      });
                      const inputType = getDocumentInputType(item);
                      const isCurrentStage = stage === data.currentStage;
                      const isBusy =
                        togglingItemId === item.id ||
                        submittingItemId === item.id;
                      const canEdit =
                        !isReadOnly && isCurrentStage && !item.isCompleted;
                      const form = documentForms[item.id] ?? {
                        file: null,
                        documentNumber: "",
                      };

                      return (
                        <div
                          key={item.id}
                          className={`p-4 sm:px-6 ${item.isCompleted ? "bg-emerald-50/30" : ""
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={item.id}
                              checked={item.isCompleted}
                              disabled={
                                isBusy ||
                                isReadOnly ||
                                !isCurrentStage ||
                                item.requiresDocument
                              }
                              onCheckedChange={(checked) => {
                                if (typeof checked === "boolean") {
                                  void handleToggle(item, checked);
                                }
                              }}
                              className="mt-1"
                            />

                            <div className="min-w-0 flex-1">
                              <label
                                htmlFor={item.id}
                                className={`break-words text-sm font-medium ${item.isCompleted
                                    ? "text-muted-foreground line-through"
                                    : ""
                                  }`}
                              >
                                {item.title}
                              </label>

                              {item.description && (
                                <p className="mt-1 break-words text-sm text-muted-foreground">
                                  {item.description}
                                </p>
                              )}

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {item.isRequired && (
                                  <Badge variant="outline" className="text-xs">
                                    Required
                                  </Badge>
                                )}

                                {item.requiresDocument && (
                                  <Badge
                                    variant="secondary"
                                    className="gap-1 text-xs"
                                  >
                                    <FileText className="h-3 w-3" />
                                    Document required
                                  </Badge>
                                )}

                                {item.requiresDocument && (
                                  <Badge variant="outline" className="text-xs">
                                    {inputType === "FILE_UPLOAD"
                                      ? "File upload"
                                      : inputType === "DOCUMENT_NUMBER"
                                        ? "Document number"
                                        : "File or number"}
                                  </Badge>
                                )}
                              </div>

                              {item.isCompleted && item.completedAt && (
                                <p className="mt-2 text-xs text-emerald-700">
                                  <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />
                                  Completed on{" "}
                                  {new Date(item.completedAt).toLocaleDateString()}
                                </p>
                              )}

                              {!isCurrentStage && !item.isCompleted && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {stages.indexOf(stage) < currentStageIndex
                                    ? "This stage is not editable."
                                    : "Complete the current stage first."}
                                </p>
                              )}
                            </div>

                            {item.documentUrl && (
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0"
                                title="Open document"
                                onClick={() => {
                                  window.open(
                                    item.documentUrl!,
                                    "_blank",
                                    "noopener,noreferrer"
                                  );
                                }}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          {item.requiresDocument && !item.isCompleted && (
                            <div className="ml-0 mt-4 space-y-4 rounded-lg border bg-background p-4 sm:ml-8">
                              <div className="flex items-start gap-3">
                                <div className="rounded-md bg-primary/10 p-2">
                                  <FileText className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    Submit required document
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {isCurrentStage
                                      ? "Upload the document or enter the required number."
                                      : "This form will be available when this stage becomes current."}
                                  </p>
                                </div>
                              </div>

                              {(inputType === "FILE_UPLOAD" ||
                                inputType === "EITHER") && (
                                  <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                                      <div className="flex min-w-0 items-center gap-3">
                                        <div className="rounded-md bg-primary/10 p-2">
                                          <FileText className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="break-all text-sm font-medium">
                                            {form.file
                                              ? form.file.name
                                              : "No file selected"}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {form.file
                                              ? `${(
                                                form.file.size /
                                                (1024 * 1024)
                                              ).toFixed(2)} MB · Ready to upload`
                                              : "PDF, JPG or PNG · Maximum 5 MB"}
                                          </p>
                                        </div>
                                      </div>

                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="gap-2"
                                        disabled={!canEdit || isBusy}
                                        onClick={() =>
                                          setUploadDialogItemId(item.id)
                                        }
                                      >
                                        <Upload className="h-4 w-4" />
                                        {form.file ? "Change File" : "Upload Document"}
                                      </Button>
                                    </div>

                                    <Dialog
                                      open={uploadDialogItemId === item.id}
                                      onOpenChange={(open) => {
                                        if (!open) setUploadDialogItemId(null);
                                      }}
                                    >
                                      <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                          <DialogTitle>Upload Document</DialogTitle>
                                          <DialogDescription>
                                            Select a PDF, JPG or PNG file for{" "}
                                            {item.title}. Maximum file size is 5 MB.
                                          </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-4 py-2">
                                          <input
                                            id={`${item.id}-file`}
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            className="hidden"
                                            disabled={!canEdit || isBusy}
                                            onChange={(event) =>
                                              handleFileChange(item.id, event)
                                            }
                                          />

                                          <label
                                            htmlFor={`${item.id}-file`}
                                            className={`flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center transition-colors ${canEdit && !isBusy
                                                ? "cursor-pointer hover:border-primary hover:bg-muted/30"
                                                : "cursor-not-allowed opacity-50"
                                              }`}
                                          >
                                            <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                                            <span className="text-sm font-semibold">
                                              Click to choose a file
                                            </span>
                                            <span className="mt-1 text-xs text-muted-foreground">
                                              PDF, JPG or PNG
                                            </span>
                                          </label>

                                          {form.file && (
                                            <div className="flex items-center gap-3 rounded-lg border p-3">
                                              <FileText className="h-5 w-5 shrink-0 text-primary" />
                                              <div className="min-w-0 flex-1">
                                                <p className="break-all text-sm font-medium">
                                                  {form.file.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {(
                                                    form.file.size /
                                                    (1024 * 1024)
                                                  ).toFixed(2)}{" "}
                                                  MB
                                                </p>
                                              </div>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                disabled={isBusy}
                                                aria-label="Remove selected file"
                                                onClick={() => {
                                                  updateDocumentForm(
                                                    item.id,
                                                    "file",
                                                    null
                                                  );
                                                  const fileInput =
                                                    document.getElementById(
                                                      `${item.id}-file`
                                                    ) as HTMLInputElement | null;
                                                  if (fileInput) {
                                                    fileInput.value = "";
                                                  }
                                                }}
                                              >
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>

                                        <DialogFooter>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                              setUploadDialogItemId(null)
                                            }
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            type="button"
                                            disabled={
                                              !form.file || !canEdit || isBusy
                                            }
                                            onClick={() =>
                                              setUploadDialogItemId(null)
                                            }
                                          >
                                            <CheckCircle2 className="mr-2 h-4 w-4" />
                                            Use This File
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                )}

                              {(inputType === "DOCUMENT_NUMBER" ||
                                inputType === "EITHER") && (
                                  <div className="space-y-2">
                                    <label
                                      htmlFor={`${item.id}-number`}
                                      className="text-sm font-medium"
                                    >
                                      Document number
                                    </label>
                                    <Input
                                      id={`${item.id}-number`}
                                      type="password"
                                      autoComplete="off"
                                      placeholder="Enter document number"
                                      value={form.documentNumber}
                                      disabled={!canEdit || isBusy}
                                      onChange={(event) =>
                                        updateDocumentForm(
                                          item.id,
                                          "documentNumber",
                                          event.target.value
                                        )
                                      }
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      The number is hidden while typing.
                                    </p>
                                  </div>
                                )}

                              <div className="flex justify-end border-t pt-3">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={!canEdit || isBusy}
                                  onClick={() => void handleDocumentSubmit(item)}
                                  className="gap-2"
                                >
                                  {submittingItemId === item.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Uploading / submitting...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4" />
                                      Submit Document
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </section>
          );
        })}
      </div>
    </div>
  );
}
