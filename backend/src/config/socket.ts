import type { Server } from "socket.io";

let io: Server | null = null;

export const setIO = (socketServer: Server) => {
    io = socketServer;
};

export const getIO = (): Server | null => {
    return io;
};