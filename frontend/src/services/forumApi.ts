import api from "../lib/api";

export const createForumPost = async (postData: any, token: string) => {
  const response = await api.post("/forum/threads", postData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getForumThreads = async (token: string) => {
  const response = await api.get("/forum/threads", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getForumThreadById = async (threadId: string, token: string) => {
  const response = await api.get(`/forum/threads/${threadId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createForumReply = async (
  threadId: string,
  replyData: any,
  token: string,
) => {
  const response = await api.post(
    `/forum/threads/${threadId}/replies`,
    replyData,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.data;
};
