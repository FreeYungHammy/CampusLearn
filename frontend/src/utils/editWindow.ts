// Utility function to check if a message is within the 10-minute edit window
export const isWithinEditWindow = (createdAt: string | Date): boolean => {
  const now = new Date();
  const created = new Date(createdAt);
  const timeDifference = now.getTime() - created.getTime();
  const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds

  return timeDifference <= tenMinutesInMs;
};

// Utility function to get remaining edit time in minutes
export const getRemainingEditTime = (createdAt: string | Date): number => {
  const now = new Date();
  const created = new Date(createdAt);
  const timeDifference = now.getTime() - created.getTime();
  const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds

  const remainingMs = tenMinutesInMs - timeDifference;
  return Math.max(0, Math.ceil(remainingMs / (60 * 1000))); // Convert to minutes and round up
};
