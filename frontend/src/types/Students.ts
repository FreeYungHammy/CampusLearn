export type Student = {
  id: string;
  userId: string; // references User._id
  name: string;
  surname: string;
  enrolledCourses: string[];
  createdAt?: string;
  updatedAt?: string;
};
