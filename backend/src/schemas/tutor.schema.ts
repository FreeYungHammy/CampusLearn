import { Schema, model, type InferSchemaType } from "mongoose";
const TutorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, required: true },
    surname: { type: String, required: true },
    subjects: [{ type: String, required: true }],
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
  },
  { timestamps: true },
);

export type TutorDoc = InferSchemaType<typeof TutorSchema>;
export const TutorModel = model<TutorDoc>("Tutor", TutorSchema);
