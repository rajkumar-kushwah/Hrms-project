import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { getprofile } from "@/services/profile.service";
import { socket } from "@/lib/socket";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setUser, logout, setInitialized } = useAuthStore();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await getprofile();
        const user = res.data.data;

        setUser(user);

        // Connect socket only after successful profile authentication
        if (!socket.connected) {
          socket.connect();
        }
      } catch (err) {
        console.log("PROFILE ERROR:", err);

        if (socket.connected) {
          socket.disconnect();
        }

        logout();
      } finally {
        setInitialized(true);
      }
    };

    loadUser();

    return () => {
      // Don't disconnect here; AuthProvider may remount in React StrictMode.
    };
  }, [setUser, logout, setInitialized]);

  return <>{children}</>;
};

export default AuthProvider;