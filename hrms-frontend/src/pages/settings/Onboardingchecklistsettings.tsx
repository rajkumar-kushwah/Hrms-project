import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  RefreshCw,
  Pencil,
  X,
  ClipboardList,
  CheckCircle2,
  CircleAlert,
  Upload,
  Hash,
  Layers3,
} from "lucide-react";

import { onboardingChecklistSchema } from "@/validation/onboardingChecklist.validation";
import type { OnboardingChecklistFormValues } from "@/validation/onboardingChecklist.validation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { CompanySelector } from "@/pages/common/CompanySelector";

import {
  getChecklistTemplates,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  reorderChecklistItems,
} from "@/services/Onboardingtemplate.service";

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
  requiresDocument: boolean;
  documentInputType?: DocumentInputType | null;
  order: number;
}

type GroupedTemplates = Record<Stage, ChecklistItem[]>;
type ItemForm = OnboardingChecklistFormValues;
type FormErrors = Partial<Record<keyof ItemForm, string>>;

const STAGES: { value: Stage; label: string }[] = [
  { value: "OFFER", label: "Offer" },
  { value: "JOINING", label: "Joining" },
  { value: "DOCUMENTS", label: "Documents" },
  { value: "TRAINING", label: "Training" },
  { value: "ACTIVE", label: "Active" },
];

const EMPTY_FORM: ItemForm = {
  title: "",
  description: "",
  isRequired: true,
  requiresDocument: false,
  documentInputType: "FILE_UPLOAD",
};

const DOCUMENT_TYPES: {
  value: DocumentInputType;
  label: string;
}[] = [
  {
    value: "FILE_UPLOAD",
    label: "File Upload",
  },
  {
    value: "DOCUMENT_NUMBER",
    label: "Document Number",
  },
  {
    value: "EITHER",
    label: "File or Number",
  },
];

const createEmptyGrouped = (): GroupedTemplates => ({
  OFFER: [],
  JOINING: [],
  DOCUMENTS: [],
  TRAINING: [],
  ACTIVE: [],
});

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = error.response;

    if (
      typeof response === "object" &&
      response !== null &&
      "data" in response
    ) {
      const data = response.data;

      if (
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string"
      ) {
        return data.message;
      }
    }
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function isStage(value: string): value is Stage {
  return STAGES.some((stage) => stage.value === value);
}

function getFormErrors(
  result: ReturnType<typeof onboardingChecklistSchema.safeParse>
): FormErrors {
  if (result.success) return {};

  const nextErrors: FormErrors = {};

  for (const issue of result.error.issues) {
    const field = issue.path[0];

    if (
      typeof field === "string" &&
      field in EMPTY_FORM &&
      !nextErrors[field as keyof ItemForm]
    ) {
      nextErrors[field as keyof ItemForm] = issue.message;
    }
  }

  return nextErrors;
}

function normalizeGroupedTemplates(data: unknown): GroupedTemplates {
  const grouped = createEmptyGrouped();

  if (typeof data !== "object" || data === null) {
    return grouped;
  }

  const record = data as Record<string, unknown>;

  for (const stage of STAGES) {
    const value = record[stage.value];

    if (!Array.isArray(value)) continue;

    grouped[stage.value] = value.filter(
      (item): item is ChecklistItem =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string" &&
        "title" in item &&
        typeof item.title === "string" &&
        "stage" in item &&
        item.stage === stage.value
    );
  }

  return grouped;
}

export default function OnboardingChecklistSettings() {
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const [activeStage, setActiveStage] = useState<Stage>("OFFER");

  const [grouped, setGrouped] =
    useState<GroupedTemplates>(createEmptyGrouped);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] =
    useState<ChecklistItem | null>(null);

  const [form, setForm] = useState<ItemForm>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasValidated, setHasValidated] = useState(false);
  const [saving, setSaving] = useState(false);

  const [movingId, setMovingId] = useState<string | null>(null);

  const [deleteItem, setDeleteItem] =
    useState<ChecklistItem | null>(null);

  const [deleting, setDeleting] = useState(false);

  const requestIdRef = useRef(0);
  const selectedCompanyIdRef = useRef(selectedCompanyId);

  // Keep the latest selected company available to async handlers.
  selectedCompanyIdRef.current = selectedCompanyId;

  const resetForm = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setHasValidated(false);
  }, []);

  const handleCompanyChange = (companyId: string) => {
    selectedCompanyIdRef.current = companyId;
    setSelectedCompanyId(companyId);
  };

  const closeDialog = useCallback(() => {
    if (saving) return;

    setDialogOpen(false);
    setEditingItem(null);
    resetForm();
  }, [saving, resetForm]);

  // Load checklist templates.
  const loadTemplates = useCallback(
    async (showRefresh = false) => {
      const requestId = ++requestIdRef.current;

      if (!selectedCompanyId) {
        setGrouped(createEmptyGrouped());
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await getChecklistTemplates(selectedCompanyId);

        if (requestId !== requestIdRef.current) return;

        setGrouped(normalizeGroupedTemplates(response.data.data));
      } catch (error: unknown) {
        if (requestId === requestIdRef.current) {
          toast.error(getErrorMessage(error));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [selectedCompanyId]
  );

  // Reload when company changes.
  useEffect(() => {
    setGrouped(createEmptyGrouped());
    setDeleteItem(null);
    setDialogOpen(false);
    setEditingItem(null);
    resetForm();

    if (!selectedCompanyId) {
      requestIdRef.current += 1;
      setLoading(false);
      setRefreshing(false);
      return;
    }

    void loadTemplates();

    return () => {
      requestIdRef.current += 1;
    };
  }, [selectedCompanyId, loadTemplates, resetForm]);

  const allItems = useMemo(
    () => STAGES.flatMap((stage) => grouped[stage.value]),
    [grouped]
  );

  const totalItems = allItems.length;

  const requiredItems = allItems.filter(
    (item) => item.isRequired
  ).length;

  const documentItems = allItems.filter(
    (item) => item.requiresDocument
  ).length;

  const currentItems = grouped[activeStage] ?? [];

  // Live form validation.
  const updateForm = <K extends keyof ItemForm>(
    key: K,
    value: ItemForm[K]
  ) => {
    const nextForm: ItemForm = {
      ...form,
      [key]: value,
    };

    setForm(nextForm);

    if (hasValidated) {
      setErrors(
        getFormErrors(onboardingChecklistSchema.safeParse(nextForm))
      );
    }
  };

  const openAddDialog = () => {
    setEditingItem(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: ChecklistItem) => {
    setEditingItem(item);

    setForm({
      title: item.title,
      description: item.description ?? "",
      isRequired: item.isRequired,
      requiresDocument: item.requiresDocument,
      documentInputType: item.documentInputType ?? "FILE_UPLOAD",
    });

    setErrors({});
    setHasValidated(false);
    setDialogOpen(true);
  };

  // Create / update checklist item.
  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (saving) return;

    if (!selectedCompanyId) {
      toast.error("Please select a company");
      return;
    }

    setHasValidated(true);

    const result = onboardingChecklistSchema.safeParse(form);

    if (!result.success) {
      setErrors(getFormErrors(result));
      toast.error("Please correct the highlighted fields");
      return;
    }

    const companyIdAtSubmit = selectedCompanyId;
    const stageAtSubmit = activeStage;
    const itemBeingEdited = editingItem;
    const data = result.data;

    setErrors({});
    setSaving(true);

    try {
      const payload = {
        title: data.title,
        description: data.description.trim() || undefined,
        isRequired: data.isRequired,
        requiresDocument: data.requiresDocument,
        documentInputType: data.requiresDocument
          ? data.documentInputType
          : null,
        companyId: companyIdAtSubmit,
      };

      if (itemBeingEdited) {
        await updateChecklistItem(itemBeingEdited.id, payload);
      } else {
        await createChecklistItem({
          ...payload,
          stage: stageAtSubmit,
        });
      }

      setDialogOpen(false);
      setEditingItem(null);
      resetForm();

      toast.success(
        itemBeingEdited
          ? "Checklist item updated successfully"
          : "Checklist item created successfully"
      );

      // Reload only if the same company is still selected.
      if (selectedCompanyIdRef.current === companyIdAtSubmit) {
        await loadTemplates(true);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // Permanently delete checklist item.
  const handleDelete = async () => {
    if (!deleteItem || deleting || !selectedCompanyId) return;

    const item = deleteItem;
    const companyIdAtSubmit = selectedCompanyId;

    setDeleting(true);

    try {
      await deleteChecklistItem(item.id, companyIdAtSubmit);

      // Remove item immediately from the UI.
      if (selectedCompanyIdRef.current === companyIdAtSubmit) {
        setGrouped((previous) => ({
          ...previous,
          [item.stage]: previous[item.stage].filter(
            (entry) => entry.id !== item.id
          ),
        }));
      }

      // Close confirmation dialog.
      setDeleteItem(null);

      toast.success("Checklist item deleted successfully");

      // Sync latest data from backend.
      if (selectedCompanyIdRef.current === companyIdAtSubmit) {
        await loadTemplates(true);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  // Reorder checklist items.
  const handleMove = async (
    index: number,
    direction: "up" | "down"
  ) => {
    if (!selectedCompanyId || movingId || saving || deleting) return;

    const items = [...currentItems];

    const targetIndex =
      direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= items.length) return;

    const originalItems = [...items];
    const companyIdAtSubmit = selectedCompanyId;
    const stageAtSubmit = activeStage;
    const itemId = items[index].id;

    [items[index], items[targetIndex]] = [
      items[targetIndex],
      items[index],
    ];

    setMovingId(itemId);

    setGrouped((previous) => ({
      ...previous,
      [stageAtSubmit]: items,
    }));

    try {
      await reorderChecklistItems(
        stageAtSubmit,
        items.map((item) => item.id),
        companyIdAtSubmit
      );

      if (selectedCompanyIdRef.current === companyIdAtSubmit) {
        toast.success("Checklist order updated");
      }
    } catch (error: unknown) {
      if (selectedCompanyIdRef.current === companyIdAtSubmit) {
        setGrouped((previous) => ({
          ...previous,
          [stageAtSubmit]: originalItems,
        }));

        toast.error(getErrorMessage(error));
      }
    } finally {
      setMovingId(null);
    }
  };

  const getDocumentLabel = (
    type?: DocumentInputType | null
  ) =>
    DOCUMENT_TYPES.find((option) => option.value === type)?.label ??
    "Not configured";

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />

            <h1 className="text-xl font-semibold tracking-tight">
              Onboarding Checklist
            </h1>
          </div>

          <p className="max-w-2xl text-sm text-muted-foreground">
            Configure the default tasks and document requirements for each
            onboarding stage.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="add"
            className="cursor-pointer"
            onClick={() => void loadTemplates(true)}
            disabled={!selectedCompanyId || loading || refreshing}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                loading || refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>

          <Button
            type="button"
            variant="add"
            className="cursor-pointer"
            onClick={openAddDialog}
            disabled={!selectedCompanyId || loading || saving}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Company selector */}
      <CompanySelector
        selectedCompanyId={selectedCompanyId}
        onCompanyChange={handleCompanyChange}
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Total checklist items
            </p>
            <Layers3 className="h-5 w-5 text-muted-foreground" />
          </div>

          <p className="mt-2 text-2xl font-semibold">{totalItems}</p>

          <p className="mt-1 text-xs text-muted-foreground">
            Across all onboarding stages
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Required items
            </p>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </div>

          <p className="mt-2 text-2xl font-semibold">{requiredItems}</p>

          <p className="mt-1 text-xs text-muted-foreground">
            Must be completed by employees
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Document requirements
            </p>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>

          <p className="mt-2 text-2xl font-semibold">{documentItems}</p>

          <p className="mt-1 text-xs text-muted-foreground">
            Items requiring document input
          </p>
        </div>
      </div>

      {/* Stage tabs */}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading checklist templates...
        </div>
      ) : !selectedCompanyId ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          Select a company to view its checklist.
        </div>
      ) : (
        <Tabs
          value={activeStage}
          onValueChange={(value) => {
            if (isStage(value)) setActiveStage(value);
          }}
          className="space-y-5"
        >
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex min-w-max">
              {STAGES.map((stage) => (
                <TabsTrigger
                  key={stage.value}
                  value={stage.value}
                  className="gap-2"
                >
                  {stage.label}

                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {grouped[stage.value].length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {STAGES.map((stage) => {
            const items = grouped[stage.value];

            return (
              <TabsContent
                key={stage.value}
                value={stage.value}
                className="space-y-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {stage.label} Checklist
                    </h2>

                    <p className="text-sm text-muted-foreground">
                      {items.length} item
                      {items.length === 1 ? "" : "s"} configured for this
                      stage.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="add"
                    className="cursor-pointer"
                    onClick={openAddDialog}
                    disabled={saving || deleting}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Checklist Item
                  </Button>
                </div>

                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-5 py-12 text-center">
                    <div className="mb-3 rounded-full bg-muted p-3">
                      <ClipboardList className="h-6 w-6 text-muted-foreground" />
                    </div>

                    <h3 className="font-medium">
                      No checklist items yet
                    </h3>

                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      Add the first item for the{" "}
                      {stage.label.toLowerCase()} stage.
                    </p>

                    <Button
                      type="button"
                      variant="add"
                      className="mt-4 cursor-pointer"
                      onClick={openAddDialog}
                      disabled={saving || deleting}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/30"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 flex-1 gap-3">
                            <div className="mt-0.5 rounded-lg bg-muted p-2">
                              {item.requiresDocument ? (
                                <FileText className="h-5 w-5 text-primary" />
                              ) : (
                                <ClipboardList className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-medium">
                                  {item.title}
                                </h3>

                                {item.isRequired ? (
                                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                                    Required
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    Optional
                                  </span>
                                )}
                              </div>

                              {item.description && (
                                <p className="break-words text-sm text-muted-foreground">
                                  {item.description}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {item.requiresDocument ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
                                    <FileText className="h-3.5 w-3.5" />
                                    {getDocumentLabel(item.documentInputType)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground">
                                    <CircleAlert className="h-3.5 w-3.5" />
                                    No document required
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="cursor-pointer"
                              onClick={() => openEditDialog(item)}
                              disabled={!!movingId || deleting || saving}
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Edit
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Move up"
                              aria-label="Move item up"
                              disabled={
                                index === 0 ||
                                !!movingId ||
                                deleting ||
                                saving
                              }
                              onClick={() => void handleMove(index, "up")}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Move down"
                              aria-label="Move item down"
                              disabled={
                                index === items.length - 1 ||
                                !!movingId ||
                                deleting ||
                                saving
                              }
                              onClick={() => void handleMove(index, "down")}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Delete item"
                              aria-label="Delete checklist item"
                              className="cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={!!movingId || deleting || saving}
                              onClick={() => setDeleteItem(item)}
                            >
                              {deleting && deleteItem?.id === item.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteItem(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Checklist Item?
            </AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteItem?.title}</strong> from the{" "}
              {STAGES.find((stage) => stage.value === deleteItem?.stage)
                ?.label ?? "selected"}{" "}
              template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setDialogOpen(true);
          } else {
            closeDialog();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form
            onSubmit={handleSave}
            className="space-y-5"
            noValidate
          >
            <DialogHeader>
              <DialogTitle>
                {editingItem
                  ? "Edit Checklist Item"
                  : "Add Checklist Item"}
              </DialogTitle>

              <DialogDescription>
                {editingItem
                  ? "Update the checklist requirement and document settings."
                  : `Create a default checklist item for the ${
                      STAGES.find((stage) => stage.value === activeStage)
                        ?.label
                    } stage.`}
              </DialogDescription>
            </DialogHeader>

            {!editingItem && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Onboarding Stage
                </label>

                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {STAGES.find((stage) => stage.value === activeStage)?.label}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="checklist-title"
                className="text-sm font-medium"
              >
                Checklist Title{" "}
                <span className="text-destructive">*</span>
              </label>

              <Input
                id="checklist-title"
                value={form.title}
                onChange={(event) =>
                  updateForm("title", event.target.value)
                }
                placeholder="e.g. Aadhaar Card"
                maxLength={150}
                aria-invalid={!!errors.title}
                aria-describedby={
                  errors.title ? "checklist-title-error" : undefined
                }
                autoFocus
              />

              {errors.title && (
                <p
                  id="checklist-title-error"
                  className="text-sm text-destructive"
                >
                  {errors.title}
                </p>
              )}

              <p className="text-right text-xs text-muted-foreground">
                {form.title.length}/150
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="checklist-description"
                className="text-sm font-medium"
              >
                Description
              </label>

              <Textarea
                id="checklist-description"
                value={form.description}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                placeholder="Explain what the employee needs to do..."
                rows={3}
                maxLength={1000}
                aria-invalid={!!errors.description}
                aria-describedby={
                  errors.description
                    ? "checklist-description-error"
                    : undefined
                }
              />

              {errors.description && (
                <p
                  id="checklist-description-error"
                  className="text-sm text-destructive"
                >
                  {errors.description}
                </p>
              )}

              <p className="text-right text-xs text-muted-foreground">
                {form.description.length}/1000
              </p>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={form.isRequired}
                  onCheckedChange={(checked) =>
                    updateForm("isRequired", checked === true)
                  }
                />

                <span className="space-y-1">
                  <span className="block text-sm font-medium">
                    Required item
                  </span>

                  <span className="block text-xs text-muted-foreground">
                    This item must be completed before onboarding can be
                    finalized.
                  </span>
                </span>
              </label>

              <div className="border-t" />

              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={form.requiresDocument}
                  onCheckedChange={(checked) =>
                    updateForm("requiresDocument", checked === true)
                  }
                />

                <span className="space-y-1">
                  <span className="block text-sm font-medium">
                    Requires document
                  </span>

                  <span className="block text-xs text-muted-foreground">
                    The employee must provide document information for this
                    item.
                  </span>
                </span>
              </label>
            </div>

            {form.requiresDocument && (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">
                    Document Input Type
                  </label>

                  <p className="text-xs text-muted-foreground">
                    Select how the employee will provide the document.
                  </p>
                </div>

                <Select
                  value={form.documentInputType}
                  onValueChange={(value) => {
                    if (
                      DOCUMENT_TYPES.some(
                        (option) => option.value === value
                      )
                    ) {
                      updateForm(
                        "documentInputType",
                        value as DocumentInputType
                      );
                    }
                  }}
                >
                  <SelectTrigger
                    aria-invalid={!!errors.documentInputType}
                  >
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>

                  <SelectContent>
                    {DOCUMENT_TYPES.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.documentInputType && (
                  <p className="text-sm text-destructive">
                    {errors.documentInputType}
                  </p>
                )}

                <div className="rounded-md bg-muted/50 p-3">
                  {form.documentInputType === "FILE_UPLOAD" ? (
                    <div className="flex items-start gap-2">
                      <Upload className="mt-0.5 h-4 w-4 shrink-0" />

                      <p className="text-xs text-muted-foreground">
                        Employee will upload a document file.
                      </p>
                    </div>
                  ) : form.documentInputType === "DOCUMENT_NUMBER" ? (
                    <div className="flex items-start gap-2">
                      <Hash className="mt-0.5 h-4 w-4 shrink-0" />

                      <p className="text-xs text-muted-foreground">
                        Employee will enter the document number.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0" />

                      <p className="text-xs text-muted-foreground">
                        Employee can upload a file or enter a document
                        number.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={closeDialog}
                disabled={saving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>

              <Button
                type="submit"
                variant="add"
                className="cursor-pointer"
                disabled={saving || !selectedCompanyId}
              >
                {saving && (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                )}

                {saving
                  ? "Saving..."
                  : editingItem
                    ? "Save Changes"
                    : "Create Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}