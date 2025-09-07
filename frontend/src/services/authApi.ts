import api from "../lib/api";
import { type User } from "../types/Users";

export const login = async (
  credentials: any,
): Promise<{ token: string; user: User }> => {
  const response = await api.post("/users/login", credentials);
  return response.data;
};

export const register = async (details: any): Promise<User> => {
  const response = await api.post("/users/register", details);
  return response.data;
};
