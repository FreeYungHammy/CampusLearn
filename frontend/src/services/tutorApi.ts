import api from "../lib/api";
import type { Tutor } from "../types/Tutors";

export const getTutors = async (
  limit: number,
  offset: number,
  filters: { [key: string]: any },
): Promise<{ tutors: Tutor[]; totalCount: number }> => {
  const response = await api.get("/tutors", {
    params: { limit, offset, ...filters },
  });
  return response.data;
};

export const getTutorById = async (id: string): Promise<Tutor> => {
  const response = await api.get(`/tutors/${id}`);
  return response.data;
};
