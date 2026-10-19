
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  ExternalLink,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  getOnboardingDetail,
  toggleChecklistItem,
  setOnboardingStatus,
  submitChecklistDocument,
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

type Stage =
  | "OFFER"
  | "JOINING"
  | "DOCUMENTS"
  | "TRAINING"
  | "ACTIVE";

type DocumentInputType =
  | "FILE_UPLOAD"
  | "DOCUMENT_NUMBER"
  | "EITHER";

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
  documentUrl: string;
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

const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

const getStatusBadge = (
  status: OnboardingDetailData["status"]
) => {
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

const getProgress = (data: OnboardingDetailData) => {
  const allItems = stages.flatMap(
    (stage) => data.itemsByStage[stage] ?? []
  );

  const requiredItems = allItems.filter(
    (item) => item.isRequired
  );

  if (requiredItems.length === 0) return 100;

  const completedRequired = requiredItems.filter(
    (item) => item.isCompleted
  );

  return Math.round(
    (completedRequired.length / requiredItems.length) * 100
  );
};

const isStageCompleted = (
  data: OnboardingDetailData,
  stage: Stage
) => {
  const items = data.itemsByStage[stage] ?? [];

  if (items.length === 0) return false;

  const requiredItems = items.filter(
    (item) => item.isRequired
  );

  if (requiredItems.length > 0) {
    return requiredItems.every((item) => item.isCompleted);
  }

  return items.every((item) => item.isCompleted);
};

const getCalculatedCurrentStage = (
  data: OnboardingDetailData
): Stage => {
  const firstIncompleteStage = stages.find(
    (stage) => !isStageCompleted(data, stage)
  );

  return firstIncompleteStage ?? "ACTIVE";
};

const getDocumentInputType = (
  item: ChecklistItem
): DocumentInputType => {
  return item.documentInputType ?? "FILE_UPLOAD";
};

export default function OnboardingDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [data, setData] =
    useState<OnboardingDetailData | null>(null);

  const [loading, setLoading] = useState(true);

  const [togglingItemId, setTogglingItemId] =
    useState<string | null>(null);

  const [submittingItemId, setSubmittingItemId] =
    useState<string | null>(null);

  const [statusUpdating, setStatusUpdating] =
    useState(false);

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
        if (showLoader) {
          setLoading(true);
        }

        const response = await getOnboardingDetail(userId);
        setData(response.data);
      } catch (error: unknown) {
        toast.error(
          getErrorMessage(
            error,
            "Failed to load onboarding details."
          )
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

  const updateDocumentForm = (
    itemId: string,
    field: keyof DocumentForm,
    value: string
  ) => {
    setDocumentForms((previous) => ({
      ...previous,
      [itemId]: {
        documentUrl: previous[itemId]?.documentUrl ?? "",
        documentNumber: previous[itemId]?.documentNumber ?? "",
        [field]: value,
      },
    }));
  };

  const handleToggle = async (
    stage: Stage,
    item: ChecklistItem,
    checked: boolean
  ) => {
    if (!data || item.requiresDocument) return;

    if (data.status !== "IN_PROGRESS") {
      toast.error("Only active onboarding can be updated.");
      return;
    }

    const previousData = data;

    setTogglingItemId(item.id);

    // Optimistic update for ordinary checklist items.
    setData({
      ...data,
      itemsByStage: {
        ...data.itemsByStage,
        [stage]: (data.itemsByStage[stage] ?? []).map(
          (currentItem) =>
            currentItem.id === item.id
              ? {
                  ...currentItem,
                  isCompleted: checked,
                  completedAt: checked
                    ? new Date().toISOString()
                    : null,
                }
              : currentItem
        ),
      },
    });

    try {
      const response = await toggleChecklistItem(item.id);

      // Use server state as the final source of truth.
      await loadDetail(false);

      toast.success(
        response?.message ?? "Checklist updated successfully."
      );
    } catch (error: unknown) {
      setData(previousData);

      toast.error(
        getErrorMessage(
          error,
          "Failed to update checklist item."
        )
      );
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleDocumentSubmit = async (
    item: ChecklistItem
  ) => {
    if (!data || submittingItemId || togglingItemId) return;

    if (data.status !== "IN_PROGRESS") {
      toast.error("Only active onboarding can be updated.");
      return;
    }

    if (item.isCompleted) {
      toast.error("This checklist item is already completed.");
      return;
    }

    const form = documentForms[item.id] ?? {
      documentUrl: "",
      documentNumber: "",
    };

    const documentUrl = form.documentUrl.trim();
    const documentNumber = form.documentNumber.trim();
    const inputType = getDocumentInputType(item);

    if (
      inputType === "FILE_UPLOAD" &&
      !documentUrl
    ) {
      toast.error(
        "Please provide the URL of the uploaded document."
      );
      return;
    }

    if (
      inputType === "DOCUMENT_NUMBER" &&
      !documentNumber
    ) {
      toast.error("Please enter the document number.");
      return;
    }

    if (
      inputType === "EITHER" &&
      !documentUrl &&
      !documentNumber
    ) {
      toast.error(
        "Please provide a document URL or document number."
      );
      return;
    }

    setSubmittingItemId(item.id);

    try {
      await submitChecklistDocument(item.id, {
        ...(documentUrl ? { documentUrl } : {}),
        ...(documentNumber ? { documentNumber } : {}),
      });

      // Refresh from the server so progress, stages and status
      // reflect the actual backend result.
      await loadDetail(false);

      setDocumentForms((previous) => ({
        ...previous,
        [item.id]: {
          documentUrl: "",
          documentNumber: "",
        },
      }));

      toast.success("Document submitted successfully.");
    } catch (error: unknown) {
      // Do not optimistically complete a document-required item.
      toast.error(
        getErrorMessage(
          error,
          "Document submission failed."
        )
      );
    } finally {
      setSubmittingItemId(null);
    }
  };

  const handleStatusChange = async (
    status: "IN_PROGRESS" | "ON_HOLD"
  ) => {
    if (!userId || statusUpdating) return;

    setStatusUpdating(true);

    try {
      await setOnboardingStatus(userId, status);

      toast.success(
        status === "ON_HOLD"
          ? "Onboarding put on hold."
          : "Onboarding resumed."
      );

      await loadDetail(false);
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(error, "Failed to update status.")
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
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">
          Onboarding details not found.
        </p>

        <Button
          variant="outline"
          onClick={() => navigate("/onboarding")}
        >
          Back to Onboarding
        </Button>
      </div>
    );
  }

  const progress = getProgress(data);
  const calculatedCurrentStage = getCalculatedCurrentStage(data);
  const currentStageIndex = stages.indexOf(calculatedCurrentStage);

  const isReadOnly = data.status !== "IN_PROGRESS";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Top bar */}
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
              className="gap-2"
            >
              {statusUpdating && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Put On Hold
            </Button>
          )}

          {data.status === "ON_HOLD" && (
            <Button
              size="sm"
              disabled={statusUpdating}
              onClick={() => void handleStatusChange("IN_PROGRESS")}
              className="gap-2"
            >
              {statusUpdating && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Resume Onboarding
            </Button>
          )}

          {getStatusBadge(data.status)}
        </div>
      </div>

      {/* Employee header */}
      <div className="flex flex-col justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {data.user.name}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {data.user.designation || "Employee"}
            {" · "}
            {data.user.employeeCode || "N/A"}
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            Employee onboarding checklist and document verification
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="overflow-hidden rounded-xl border">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x divide-y md:grid-cols-4 md:divide-y-0">
            <div className="p-4 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current Stage
              </p>
              <p className="mt-2 text-lg font-semibold">
                {stageLabels[calculatedCurrentStage]}
              </p>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Start Date
              </p>
              <p className="mt-2 text-lg font-semibold">
                {new Date(data.startDate).toLocaleDateString()}
              </p>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Target Date
              </p>
              <p className="mt-2 text-lg font-semibold">
                {data.targetDate
                  ? new Date(data.targetDate).toLocaleDateString()
                  : "Not set"}
              </p>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Overall Progress
                </p>
                <span className="text-sm font-semibold tabular-nums">
                  {progress}%
                </span>
              </div>

              <Progress value={progress} className="mt-3 h-2" />

              <p className="mt-2 text-xs text-muted-foreground">
                Based on required checklist items
              </p>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Stage progression */}
      <div className="rounded-xl border p-4 sm:p-6">
        <CardHeader className="px-0 pb-4 pt-0">
          <CardTitle className="text-base">
            Stage Progression
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Track onboarding progress from offer to activation.
          </p>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {stages.map((stage, index) => {
              const stageCompleted = isStageCompleted(data, stage);
              const isCurrent =
                !stageCompleted && index === currentStageIndex;

              return (
                <div
                  key={stage}
                  className={`flex flex-col items-center justify-center rounded-lg border p-4 text-center transition-colors ${
                    stageCompleted
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : isCurrent
                        ? "border-primary bg-primary/5 text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {stageCompleted ? (
                    <CheckCircle2 className="mb-2 h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle
                      className={`mb-2 h-5 w-5 ${
                        isCurrent
                          ? "text-primary"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  )}

                  <span className="text-sm font-medium">
                    {stageLabels[stage]}
                  </span>

                  <span className="mt-1 text-xs text-muted-foreground">
                    {stageCompleted
                      ? "Completed"
                      : isCurrent
                        ? "In progress"
                        : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </div>

      {/* Checklist stages */}
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold">
            Onboarding Checklist
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete checklist items and submit required documents.
          </p>
        </div>

        {stages.map((stage) => {
          const items = data.itemsByStage[stage] ?? [];
          const completedCount = items.filter(
            (item) => item.isCompleted
          ).length;

          return (
            <section
              key={stage}
              className="overflow-hidden rounded-xl border"
            >
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b bg-muted/20 px-4 py-4 sm:px-6">
                <div>
                  <CardTitle className="text-base">
                    {stageLabels[stage]}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {items.length} checklist{" "}
                    {items.length === 1 ? "item" : "items"}
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
                      const inputType = getDocumentInputType(item);
                      const isBusy =
                        togglingItemId === item.id ||
                        submittingItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 transition-colors sm:px-6 ${
                            item.isCompleted
                              ? "bg-emerald-50/30"
                              : "hover:bg-muted/20"
                          }`}
                        >
                          {/* Checklist row */}
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={item.id}
                              checked={item.isCompleted}
                              disabled={
                                isBusy ||
                                isReadOnly ||
                                item.requiresDocument
                              }
                              onCheckedChange={(checked) => {
                                if (typeof checked === "boolean") {
                                  void handleToggle(
                                    stage,
                                    item,
                                    checked
                                  );
                                }
                              }}
                              className="mt-1"
                            />

                            <div className="min-w-0 flex-1">
                              <label
                                htmlFor={item.id}
                                className={`break-words text-sm font-medium ${
                                  item.isCompleted
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
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
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
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
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
                                  {new Date(
                                    item.completedAt
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              {item.documentUrl && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
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

                              {isBusy && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </div>

                          {/* Document submission form */}
                          {item.requiresDocument &&
                            !item.isCompleted && (
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
                                      Provide the information required
                                      to complete this checklist item.
                                    </p>
                                  </div>
                                </div>

                                {(inputType === "FILE_UPLOAD" ||
                                  inputType === "EITHER") && (
                                  <div className="space-y-2">
                                    <label
                                      htmlFor={`${item.id}-url`}
                                      className="text-sm font-medium"
                                    >
                                      Document URL
                                    </label>

                                    <Input
                                      id={`${item.id}-url`}
                                      type="url"
                                      placeholder="https://..."
                                      value={
                                        documentForms[item.id]
                                          ?.documentUrl ?? ""
                                      }
                                      disabled={isBusy || isReadOnly}
                                      onChange={(event) =>
                                        updateDocumentForm(
                                          item.id,
                                          "documentUrl",
                                          event.target.value
                                        )
                                      }
                                    />

                                    <p className="text-xs text-muted-foreground">
                                      Paste the URL returned by your
                                      authorized file-upload service.
                                    </p>
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
                                      value={
                                        documentForms[item.id]
                                          ?.documentNumber ?? ""
                                      }
                                      disabled={isBusy || isReadOnly}
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
                                      Avoid sharing it in screenshots or logs.
                                    </p>
                                  </div>
                                )}

                                <div className="flex justify-end border-t pt-3">
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={isBusy || isReadOnly}
                                    onClick={() =>
                                      void handleDocumentSubmit(item)
                                    }
                                    className="gap-2"
                                  >
                                    {submittingItemId === item.id ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Submitting...
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
