import api from "../lib/api";
import { type TutorUpload } from "../types/tutorUploads";

export async function getMyContent(token: string): Promise<TutorUpload[]> {
  const res = await api.get("/files/my-content", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data as TutorUpload[];
}
