import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';

interface AppState {
  activeUser:    User | null;
  flipSpeed:     number;       // ms between image flips
  setActiveUser: (u: User) => void;
  setFlipSpeed:  (ms: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeUser:    null,
      flipSpeed:     800,
      setActiveUser: (u) => set({ activeUser: u }),
      setFlipSpeed:  (ms) => set({ flipSpeed: ms }),
    }),
    { name: 'pk-workouts-store' }
  )
);
