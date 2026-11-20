
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.DEV
    ? "http://localhost:5000"
    : window.location.origin;

export const socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ["websocket"],
});
