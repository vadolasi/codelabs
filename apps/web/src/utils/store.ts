import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  id: string;
}

interface Store {
  user: User | null;
  theme: "dark" | "light" | "auto";
  setUser: (user: User) => void;
  setTheme: (theme: "dark" | "light" | "auto") => void;
}

const useStore = create<Store>()(
  persist(
    immer((set) => ({
      user: null,
      setUser: (user: User) => {
        set((state) => {
          state.user = user;
        });
      },
      theme: "auto",
      setTheme: (theme: "dark" | "light" | "auto") => {
        set((state) => {
          state.theme = theme;
        });
      },
    })),
    {
      name: "store",
    },
  ),
);

export default useStore;
