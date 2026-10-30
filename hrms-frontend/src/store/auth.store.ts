import { create } from "zustand";
import type { User } from "../types/auth.types";
// import { persist } from "zustand/middleware";

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    isInitialized: boolean;

    setUser: (user: User) => void;
    setLoading: (val: boolean) => void;
    setInitialized: (val: boolean) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({

    user: null,
    isAuthenticated: false,
    loading: false,
    isInitialized: false,


    setUser: (user) => { if (import.meta.env.DEV) { console.log(" SETTING USER (FULL DATA):", user); } set({ user, isAuthenticated: true, loading: false, isInitialized: true }) },

    setLoading: (val: boolean) => set({ loading: val }),

    setInitialized: (val: boolean) => set({ isInitialized: val }),

    logout: () => set({ user: null, isAuthenticated: false, loading: false, isInitialized: true }),


}))



// export const useAuthStore = create<AuthState>()(
//     persist(
//         (set) => ({
//             user: null,
//             isAuthenticated: false,
//             loading: false,
//             isInitialized: true,

//             setUser: (user) => {
//                 console.log("SETTING USER (FULL DATA):", user);
//                 set({ user, isAuthenticated: true, loading: false, isInitialized: true });
//             },

//             setLoading: (val: boolean) => set({ loading: val }),

//             setInitialized: (val: boolean) => set({ isInitialized: val }),

//             //  Fixed: reset all state on logout
//             logout: () => set({
//                 user: null,
//                 isAuthenticated: false,
//                 loading: false,
//                 isInitialized: false, //  yeh missing tha
//             }),
//         }),
//         {
//             name: "auth-storage", // localStorage key
//             partialize: (state) => ({
//                 user: state.user,
//                 isAuthenticated: state.isAuthenticated,
//                 // loading & isInitialized persist nahi karna — runtime values hain
//             }),
//         }
//     )
// );

