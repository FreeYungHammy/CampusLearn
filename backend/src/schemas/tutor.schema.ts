import { Schema, model, type InferSchemaType } from "mongoose";

// BASIC USER SCHEMA JUST TO GET FORMATTING IN SO THAT IT CAN BE ADJUSTED

const TutorSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    expertise: [{ type: String, index: true }], // e.g. module names
    availability: [{ type: String }], // could be slots/times in ISO format later
    rating: { type: Number, min: 0, max: 5, default: 0 },
    bio: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type TutorDoc = InferSchemaType<typeof TutorSchema>;
export const TutorModel = model<TutorDoc>("Tutor", TutorSchema);
