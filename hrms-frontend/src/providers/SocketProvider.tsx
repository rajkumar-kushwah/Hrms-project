import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth.store";

const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const isAuthenticated = useAuthStore(
        (state) => state.isAuthenticated
    );

    const isInitialized = useAuthStore(
        (state) => state.isInitialized
    );

    useEffect(() => {
        if (!isInitialized) return;

        if (!isAuthenticated) {
            socket.disconnect();
            return;
        }

        const handleConnect = () => {
            console.log("Socket connected:", socket.id);
        };

        const handleDisconnect = (reason: string) => {
            console.log("Socket disconnected:", reason);
        };

        const handleConnectError = (error: Error) => {
            console.error("Socket connection error:", error.message);
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleConnectError);

        if (!socket.connected) {
            socket.connect();
        }

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleConnectError);

            // Yahan socket.disconnect() nahi lagana.
        };
    }, [isAuthenticated, isInitialized]);

    return <>{children}</>;
};

export default SocketProvider;