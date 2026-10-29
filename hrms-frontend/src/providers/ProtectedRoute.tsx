import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import FullScreenLoader from "@/pages/common/FullScreenLoader";


export const ProtectedRoute = () => {
    const { isAuthenticated, isInitialized, loading } = useAuthStore();

    // console.log("ProtectedRoute state:", { isAuthenticated, isInitialized, loading });

    if (!isInitialized || loading) {
        return <FullScreenLoader />
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}