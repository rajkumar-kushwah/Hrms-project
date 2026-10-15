// pages/onboarding/OnboardingChecklistSettings.tsx
import React from "react";
import { toast } from "sonner";

// import { Card } from "@/components/ui/card";
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
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    FileText,
    RefreshCw,
} from "lucide-react";

import {
    getChecklistTemplates,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems,
} from "@/services/Onboardingtemplate.service";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Stage = "OFFER" | "JOINING" | "DOCUMENTS" | "TRAINING" | "ACTIVE";

interface ChecklistItem {
    id: string;
    stage: Stage;
    title: string;
    description: string | null;
    isRequired: boolean;
    requiresDocument: boolean;
    order: number;
}

type GroupedTemplates = Record<Stage, ChecklistItem[]>;

const STAGES: { value: Stage; label: string }[] = [
    { value: "OFFER", label: "Offer" },
    { value: "JOINING", label: "Joining" },
    { value: "DOCUMENTS", label: "Documents" },
    { value: "TRAINING", label: "Training" },
    { value: "ACTIVE", label: "Active" },
];

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

const OnboardingChecklistSettings = () => {
    const [activeStage, setActiveStage] = React.useState<Stage>("OFFER");
    const [grouped, setGrouped] = React.useState<GroupedTemplates | null>(null);
    const [loading, setLoading] = React.useState(true);

    // new item form state
    const [newTitle, setNewTitle] = React.useState("");
    const [newDescription, setNewDescription] = React.useState("");
    const [newRequired, setNewRequired] = React.useState(true);
    const [newRequiresDoc, setNewRequiresDoc] = React.useState(false);
    const [adding, setAdding] = React.useState(false);

    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editTitle, setEditTitle] = React.useState("");
    const [editDescription, setEditDescription] = React.useState("");
    const [editRequired, setEditRequired] = React.useState(true);
    const [editRequiresDoc, setEditRequiresDoc] = React.useState(false);
    const [savingEdit, setSavingEdit] = React.useState(false);

    // ─────────────────────────────────────
    // Load
    // ─────────────────────────────────────

    const loadTemplates = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await getChecklistTemplates();
            setGrouped(response.data.data);
        } catch (error: any) {
            toast.error(error?.message || "Failed to load checklist templates");
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadTemplates();
    }, [loadTemplates]);

    const currentItems = grouped?.[activeStage] ?? [];

    // ─────────────────────────────────────
    // Add item
    // ─────────────────────────────────────

    const handleAddItem = async () => {
        if (!newTitle.trim()) {
            toast.error("Title is required");
            return;
        }

        setAdding(true);
        try {
            await createChecklistItem({
                stage: activeStage,
                title: newTitle,
                description: newDescription || undefined,
                isRequired: newRequired,
                requiresDocument: newRequiresDoc,
            });

            toast.success("Checklist item added");
            setNewTitle("");
            setNewDescription("");
            setNewRequired(true);
            setNewRequiresDoc(false);
            await loadTemplates();
        } catch (error: any) {
            toast.error(error?.message || "Could not add item");
        } finally {
            setAdding(false);
        }
    };

    // ─────────────────────────────────────
    // Toggle required / requiresDocument
    // ─────────────────────────────────────

    // const handleToggle = async (
    //     item: ChecklistItem,
    //     field: "isRequired" | "requiresDocument"
    // ) => {
    //     try {
    //         await updateChecklistItem(item.id, { [field]: !item[field] });
    //         await loadTemplates();
    //     } catch (error: any) {
    //         toast.error(error?.message || "Could not update item");
    //     }
    // };

    // update item 
    const handleEdit = (item: ChecklistItem) => {
        setEditingId(item.id);
        setEditTitle(item.title);
        setEditDescription(item.description ?? "");
        setEditRequired(item.isRequired);
        setEditRequiresDoc(item.requiresDocument);
    };

   const handleUpdate = async (item: ChecklistItem) => {
    if (!editTitle.trim()) {
        toast.error("Title is required");
        return;
    }

    setSavingEdit(true);

    try {
        await updateChecklistItem(item.id, {
            title: editTitle.trim(),
            description: editDescription.trim() || undefined,
            isRequired: editRequired,
            requiresDocument: editRequiresDoc,
        });

        toast.success("Checklist item updated");
        setEditingId(null);
        await loadTemplates();
    } catch (error: unknown) {
        toast.error(
            error instanceof Error
                ? error.message
                : "Could not update checklist item"
        );
    } finally {
        setSavingEdit(false);
    }
};
   

    // ─────────────────────────────────────
    // Delete
    // ─────────────────────────────────────

    const handleDelete = async (item: ChecklistItem) => {
        try {
            await deleteChecklistItem(item.id);
            toast.success("Item removed");
            await loadTemplates();
        } catch (error: any) {
            toast.error(error?.message || "Could not remove item");
        }
    };

    // ─────────────────────────────────────
    // Reorder (swap with neighbor, then push full order to backend)
    // ─────────────────────────────────────

    const handleMove = async (index: number, direction: "up" | "down") => {
        const items = [...currentItems];
        const targetIndex = direction === "up" ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= items.length) return;

        [items[index], items[targetIndex]] = [items[targetIndex], items[index]];

        // optimistic UI update
        setGrouped((prev) =>
            prev ? { ...prev, [activeStage]: items } : prev
        );

        try {
            await reorderChecklistItems(
                activeStage,
                items.map((i) => i.id)
            );
        } catch (error: any) {
            toast.error(error?.message || "Could not reorder items");
            await loadTemplates(); // revert to server truth on failure
        }
    };

    // ─────────────────────────────────────
    // UI
    // ─────────────────────────────────────

    return (
        <div className="p-1 space-y-6">
            <div>
                <h2 className="text-lg font-semibold">Onboarding Checklist Templates</h2>
                <p className="text-sm text-muted-foreground">
                    Define default checklist items for each onboarding stage. These will
                    be copied automatically whenever a new employee's onboarding starts.
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-12">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading...
                </div>
            ) : (
                <Tabs value={activeStage} onValueChange={(v) => setActiveStage(v as Stage)}>
                    <TabsList>
                        {STAGES.map((s) => (
                            <TabsTrigger key={s.value} value={s.value}>
                                {s.label}
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                    ({grouped?.[s.value]?.length ?? 0})
                                </span>
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {STAGES.map((s) => (
                        <TabsContent key={s.value} value={s.value} className="space-y-4">

                            {/* ADD NEW ITEM */}
                            <div className="p-4 space-y-3">
                                <p className="text-sm font-medium">Add checklist item</p>

                                <Input
                                    placeholder="Title (e.g. Offer letter signed)"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                />

                                <Textarea
                                    placeholder="Description (optional)"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    rows={2}
                                />

                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={newRequired}
                                            onCheckedChange={(v) => setNewRequired(!!v)}
                                        />
                                        Required
                                    </label>

                                    <label className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={newRequiresDoc}
                                            onCheckedChange={(v) => setNewRequiresDoc(!!v)}
                                        />
                                        Requires document upload
                                    </label>
                                </div>

                                <Button onClick={handleAddItem} disabled={adding}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    {adding ? "Adding..." : "Add Item"}
                                </Button>
                            </div>






                            {/* EXISTING ITEMS */}
                            <div className="space-y-2">
                                {currentItems.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-6 text-center">
                                        No checklist items for this stage yet.
                                    </p>
                                ) : (
                                    currentItems.map((item, index) => (

                                        <div
                                            key={item.id}
                                            className="p-3 flex items-start justify-between gap-3 border rounded-lg"
                                        >
                                            <div className="flex-1 space-y-3">
                                                {editingId === item.id ? (
                                                    <>
                                                        <Input
                                                            value={editTitle}
                                                            onChange={(e) => setEditTitle(e.target.value)}
                                                            placeholder="Checklist item title"
                                                        />

                                                        <Textarea
                                                            value={editDescription}
                                                            onChange={(e) => setEditDescription(e.target.value)}
                                                            placeholder="Description (optional)"
                                                            rows={2}
                                                        />

                                                        <div className="flex flex-wrap items-center gap-4">
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <Checkbox
                                                                    checked={editRequired}
                                                                    onCheckedChange={(v) => setEditRequired(v === true)}
                                                                />
                                                                Required
                                                            </label>

                                                            <label className="flex items-center gap-2 text-sm">
                                                                <Checkbox
                                                                    checked={editRequiresDoc}
                                                                    onCheckedChange={(v) => setEditRequiresDoc(v === true)}
                                                                />
                                                                Needs document
                                                            </label>
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <Button className="cursor-pointer"
                                                                size="sm"
                                                                disabled={savingEdit}
                                                                onClick={() => handleUpdate(item)}
                                                            >
                                                                {savingEdit ? "Saving..." : "Save Changes"}
                                                            </Button>

                                                            <Button className="cursor-pointer"
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={savingEdit}
                                                                onClick={() => setEditingId(null)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-medium text-sm">{item.title}</p>

                                                            {item.isRequired && (
                                                                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                                                    Required
                                                                </span>
                                                            )}

                                                            {item.requiresDocument && (
                                                                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                    <FileText className="h-3 w-3" />
                                                                    Document
                                                                </span>
                                                            )}
                                                        </div>

                                                        {item.description && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {editingId !== item.id && (
                                                    <>
                                                        <Button className="cursor-pointer"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(item)}
                                                        >
                                                            Edit
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={index === 0}
                                                            onClick={() => handleMove(index, "up")}
                                                        >
                                                            <ArrowUp className="h-4 w-4" />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={index === currentItems.length - 1}
                                                            onClick={() => handleMove(index, "down")}
                                                        >
                                                            <ArrowDown className="h-4 w-4" />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(item)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                    ))
                                )}
                            </div>

                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
};

export default OnboardingChecklistSettings;