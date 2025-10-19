import { create } from 'zustand';

interface CallStore {
  activeCallId: string | null;
  setActiveCallId: (id: string) => void;
  clearActiveCallId: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  activeCallId: null,
  setActiveCallId: (id) => set({ activeCallId: id }),
  clearActiveCallId: () => set({ activeCallId: null }),
}));
