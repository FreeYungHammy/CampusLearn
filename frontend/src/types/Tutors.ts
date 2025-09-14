export interface Tutor {
  id: string;
  userId: string;
  name: string;
  surname: string;
  subjects: string[];
  rating: {
    totalScore: number;
    count: number;
  };
  pfp: {
    data: {
      type: "Buffer";
      data: number[];
    };
    contentType: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}
