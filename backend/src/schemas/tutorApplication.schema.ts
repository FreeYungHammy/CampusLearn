import { Schema, model, type InferSchemaType } from "mongoose";

const TutorApplicationSchema = new Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    subjects: [{ type: String, required: true }],
    qualificationFile: {
      data: { type: Buffer, required: true },
      contentType: { type: String, required: true },
    },
  },
  { timestamps: true },
);

export type TutorApplicationDoc = InferSchemaType<typeof TutorApplicationSchema>;
export const TutorApplicationModel = model<TutorApplicationDoc>(
  "TutorApplication",
  TutorApplicationSchema,
);
