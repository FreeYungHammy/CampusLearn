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

export const logout = async (token: string): Promise<void> => {
  await api.post(
    "/users/logout",
    {},
    {
      // Send empty object instead of null
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
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

export const checkEmailAvailability = async (
  email: string,
): Promise<boolean> => {
  try {
    console.log("Checking email availability for:", email);
    const response = await api.get(
      `/users/check-email?email=${encodeURIComponent(email)}`,
    );
    console.log("Email check response:", response.data);
    return response.data.available;
  } catch (error) {
    console.error("Email availability check failed:", error);
    throw error;
  }
};

export const submitTutorApplication = async (
  applicationData: FormData,
): Promise<void> => {
  await api.post("/applications/tutor", applicationData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
