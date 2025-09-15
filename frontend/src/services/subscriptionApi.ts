import api from "../lib/api";

export const subscribeToTutor = (tutorId: string, token: string) => {
  return api.post(
    "/subscriptions",
    { tutorId },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
};

export const getMySubscribedTutors = (studentId: string, token: string) => {
  return api.get(`/subscriptions/student/${studentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const unsubscribeFromTutor = (tutorId: string, token: string) => {
  return api.delete(`/subscriptions/${tutorId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
