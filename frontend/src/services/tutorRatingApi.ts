import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export interface TutorRatingResponse {
  success: boolean;
  rating: number;
  message: string;
}

export interface CanRateResponse {
  canRate: boolean;
  reason?: string;
}

export const tutorRatingApi = {
  // Rate a tutor
  async rateTutor(tutorId: string, rating: number, token: string): Promise<TutorRatingResponse> {
    const response = await axios.post(
      `${API_URL}/api/tutors/${tutorId}/rate`,
      { rating },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  },

  // Get current user's rating for a tutor
  async getMyRating(tutorId: string, token: string): Promise<{ rating: number | null }> {
    const response = await axios.get(
      `${API_URL}/api/tutors/${tutorId}/my-rating`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  // Get all ratings for a tutor
  async getTutorRatings(tutorId: string): Promise<{ ratings: any[] }> {
    const response = await axios.get(`${API_URL}/api/tutors/${tutorId}/ratings`);
    return response.data;
  },

  // Check if user can rate a tutor
  async canRateTutor(tutorId: string, token: string): Promise<CanRateResponse> {
    const response = await axios.get(
      `${API_URL}/api/tutors/${tutorId}/can-rate`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};
