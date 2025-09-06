export type TutorRating = {
  average: number; // 0..5
  count: number; // >=0
};

export type Tutor = {
  id: string;
  userId: string; // references User._id
  name: string;
  surname: string;
  subjects: string[]; // module codes / topics
  rating: TutorRating;
  createdAt?: string;
  updatedAt?: string;
};
