import api from "../lib/api";

export const getMyContent = async (token: string) => {
  const response = await api.get("/files/my-content", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getTutorContent = async (tutorId: string) => {
  const response = await api.get(`/files/by-tutor/${tutorId}`);
  return response.data;
};

export const deleteFile = async (token: string, fileId: string) => {
  await api.delete(`/files/${fileId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};
