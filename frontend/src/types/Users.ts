export type Role = "tutor" | "student";

export type User = {
  id: string; // stringified _id
  email: string;
  role: Role;
  name?: string;
  surname?: string;
  pfp?: {
    data: string; // base64 string
    contentType: string;
  };
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
};

// Auth DTOs used by /users/login
export type LoginCredentials = {
  email: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};
