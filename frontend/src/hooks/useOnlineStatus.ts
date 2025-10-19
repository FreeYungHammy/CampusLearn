import { useEffect, useState } from "react";
import { SocketManager, type UserOnlineStatus } from "../services/socketManager";

export const useOnlineStatus = () => {
  const [onlineStatus, setOnlineStatus] = useState<Map<string, UserOnlineStatus>>(new Map());

  useEffect(() => {
    // Subscribe to online status changes from SocketManager
    const unsubscribe = SocketManager.subscribeToOnlineStatus((status) => {
      console.log("🟢 [useOnlineStatus] Online status updated:", Array.from(status.entries()));
      setOnlineStatus(new Map(status));
    });

    // Get initial status
    const initialStatus = SocketManager.getOnlineStatus();
    setOnlineStatus(new Map(initialStatus));

    return unsubscribe;
  }, []);

  const getStatus = (userId: string): UserOnlineStatus | undefined => {
    return onlineStatus.get(userId);
  };

  const isOnline = (userId: string): boolean => {
    return onlineStatus.get(userId)?.isOnline ?? false;
  };

  const getLastSeen = (userId: string): Date | undefined => {
    return onlineStatus.get(userId)?.lastSeen;
  };

  return {
    onlineStatus,
    getStatus,
    isOnline,
    getLastSeen,
  };
};
