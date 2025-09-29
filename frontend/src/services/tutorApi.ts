import api from "../lib/api";
import type { Tutor } from "../types/Tutors";

export const getTutors = async (): Promise<Tutor[]> => {
  const response = await api.get("/tutors");
  return response.data;
};

export const getTutorById = async (id: string): Promise<Tutor> => {
  const response = await api.get(`/tutors/${id}`);
  return response.data;
};

export const getTutorByUserId = async (userId: string): Promise<Tutor> => {
  const response = await api.get(`/tutors/by-user/${userId}`);
  return response.data;
};