
import { socket } from "@/lib/socket";

export type RealtimeModule =
    | "branch"
    | "employee"
    | "department"
    | "category"
    | "company"
    | "role"
    | "attendance"
    | "leave"
    | "leaveType"
    | "payroll"
    | "holiday"
    | "onboarding"
    | "settings";

export interface DataChangeEvent {
    module: RealtimeModule;
    action: "created" | "updated" | "deleted" | "statusChanged";
    companyId: string;
    entityId?: string;
}

type RefreshHandler = () => void;

const refreshRegistry = new Map<
    RealtimeModule,
    Set<RefreshHandler>
>();

export const registerModuleRefresh = (
    module: RealtimeModule,
    handler: RefreshHandler
) => {
    if (!refreshRegistry.has(module)) {
        refreshRegistry.set(module, new Set());
    }

    refreshRegistry.get(module)!.add(handler);

    return () => {
        refreshRegistry.get(module)?.delete(handler);

        if (refreshRegistry.get(module)?.size === 0) {
            refreshRegistry.delete(module);
        }
    };
};

export const handleDataChange = (data: DataChangeEvent) => {
    if (!data?.module || !data?.companyId) return;

    refreshRegistry.get(data.module)?.forEach((handler) => {
        handler();
    });
};

// Listen for realtime data changes
socket.on("data:changed", (data: DataChangeEvent) => {
    handleDataChange(data);
});

export const subscribeToCompanyData = (
    companyId?: string | number | null
) => {
    if (!socket.connected || !companyId) return;

    socket.emit("data:subscribe", String(companyId));
};

export const unsubscribeFromCompanyData = () => {
    if (!socket.connected) return;

    socket.emit("data:unsubscribe");
};
