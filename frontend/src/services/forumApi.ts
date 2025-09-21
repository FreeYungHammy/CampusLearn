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

export const voteOnPost = async (
  threadId: string,
  voteType: number,
  token: string,
) => {
  const response = await api.post(
    `/forum/threads/${threadId}/vote`,
    { voteType },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.data;
};

export const voteOnReply = async (
  replyId: string,
  voteType: number,
  token: string,
) => {
  const response = await api.post(
    `/forum/replies/${replyId}/vote`,
    { voteType },
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.data;
};

export const deleteForumPost = async (threadId: string, token: string) => {
  const response = await api.delete(`/forum/threads/${threadId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deleteForumReply = async (replyId: string, token: string) => {
  const response = await api.delete(`/forum/replies/${replyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateForumPost = async (
  threadId: string,
  updateData: any,
  token: string,
) => {
  const response = await api.patch(
    `/forum/threads/${threadId}`,
    updateData,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.data;
};

export const updateForumReply = async (
  replyId: string,
  updateData: any,
  token: string,
) => {
  const response = await api.patch(
    `/forum/replies/${replyId}`,
    updateData,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return response.data;
};
