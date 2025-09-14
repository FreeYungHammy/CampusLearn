import api from "../lib/api";
import type { Tutor } from "../types/Tutors";

export const getTutors = async (): Promise<Tutor[]> => {
  const response = await api.get("/tutors");
  return response.data;
};
