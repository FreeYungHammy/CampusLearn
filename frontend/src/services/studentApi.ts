import http from './http';

export interface SubscribedStudent {
  _id: string;
  userId: string;
  name: string;
  surname: string;
  email?: string;
  pfp?: {
    data: string;
    contentType: string;
  };
}

export const studentApi = {
  async getSubscribedStudents(tutorId: string, token: string): Promise<SubscribedStudent[]> {
    const response = await http.get(`/subscriptions/tutor/${tutorId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};
