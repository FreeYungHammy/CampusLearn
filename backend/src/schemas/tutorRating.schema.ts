import { Schema, model, type InferSchemaType } from "mongoose";

const TutorRatingSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    tutorId: {
      type: Schema.Types.ObjectId,
      ref: "Tutor",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true },
);

// Ensure a student can only rate a tutor once
TutorRatingSchema.index(
  { studentId: 1, tutorId: 1 },
  { unique: true },
);

export type TutorRatingDoc = InferSchemaType<typeof TutorRatingSchema>;
export const TutorRatingModel = model<TutorRatingDoc>("TutorRating", TutorRatingSchema);
