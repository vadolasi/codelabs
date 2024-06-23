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
  setUser: (user: User) => void;
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
    })),
    {
      name: "store",
    },
  ),
);

export default useStore;
