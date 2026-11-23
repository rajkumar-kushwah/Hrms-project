
import type { Server } from "socket.io";

let io: Server | null = null;

export const setIO = (socketServer: Server) => {
    io = socketServer;
};

export const getIO = (): Server | null => {
    return io;
};

export type RealtimeModule =
    | "branch"
    | "employee"
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

export type RealtimeAction =
    | "created"
    | "updated"
    | "deleted"
    | "statusChanged";

interface DataChangePayload {
    module: RealtimeModule;
    action: RealtimeAction;
    companyId: string;
    entityId?: string;
}

export const emitDataChange = ({
    module,
    action,
    companyId,
    entityId,
}: DataChangePayload) => {
    if (!io || !companyId) return;

    io.to(`company:${companyId}:data`).emit("data:changed", {
        module,
        action,
        companyId,
        entityId,
        timestamp: Date.now(),
    });
};
