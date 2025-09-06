// TODO: replace with real backend fields once forum API exists
export type ForumPost = {
  id: string;
  title: string;
  body: string;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
};
