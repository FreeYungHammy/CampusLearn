import { create } from 'zustand';

interface CallStore {
  activeCallId: string | null;
  setActiveCallId: (id: string) => void;
  clearActiveCallId: () => void;
  isCallInProgress: boolean;
  setCallInProgress: (inProgress: boolean) => void;
}

export const useCallStore = create<CallStore>((set) => ({
  activeCallId: null,
  setActiveCallId: (id) => set({ activeCallId: id }),
  clearActiveCallId: () => set({ activeCallId: null }),
  isCallInProgress: false,
  setCallInProgress: (inProgress) => set({ isCallInProgress: inProgress }),
}));
