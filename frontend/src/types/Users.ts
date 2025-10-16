export type Role = "tutor" | "student";

export type User = {
  id: string; // stringified _id
  _id?: string; // MongoDB _id
  email: string;
  role: "student" | "tutor" | "admin";
  name?: string;
  firstName?: string; // Alternative to name
  lastName?: string; // Alternative to surname
  surname?: string;
  pfp?: {
    data: string; // base64 string
    contentType: string;
  };
  pfpTimestamp?: number; // For cache busting
  subjects?: string[]; // For tutors
  enrolledCourses?: string[]; // For students
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
