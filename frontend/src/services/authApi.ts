import api from "../lib/api";
import { type User } from "../types/Common";

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

export const logout = async (): Promise<void> => {
  await api.post("/users/logout");
};

export const forgotPassword = async (email: string): Promise<void> => {
  await api.post("/users/forgot-password", { email });
};

export const resetPassword = async (
  token: string,
  password: string,
): Promise<void> => {
  await api.post(`/users/reset-password/${token}`, { password });
};
