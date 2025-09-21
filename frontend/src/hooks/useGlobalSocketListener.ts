import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useAuthStore } from '../store/authStore';

export const useGlobalSocketListener = () => {
  const { user } = useAuthStore();
  const { socket } = useSocket(user?.id || ""); // Pass user.id to useSocket
  const refreshPfpForUser = useAuthStore((s) => s.refreshPfpForUser);

  useEffect(() => {
    if (socket) {
      socket.on('pfp_updated', ({ userId }) => {
        console.log(`PFP updated for user: ${userId}`);
        refreshPfpForUser(userId);
      });

      return () => {
        socket.off('pfp_updated');
      };
    }
  }, [socket, refreshPfpForUser]);
};
