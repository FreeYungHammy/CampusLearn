import http from "./http";

export const subscribeToTutor = (tutorId: string) => {
  return http.post("/subscriptions", { tutorId });
};

export const getMySubscribedTutors = (studentId: string) => {
  return http.get(`/subscriptions/student/${studentId}`);
};

export const unsubscribeFromTutor = (tutorId: string) => {
  return http.delete(`/subscriptions/${tutorId}`);
};
