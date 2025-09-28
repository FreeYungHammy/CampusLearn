export type Role = "tutor" | "student";

export type User = {
  id: string; // stringified _id
  email: string;
  role: "student" | "tutor" | "admin";
  name?: string;
  surname?: string;
  pfp?: {
    data: string; // base64 string
    contentType: string;
  };
  createdAt?: string; // ISO
  updatedAt?: string; // ISO
};
