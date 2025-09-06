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

TutorSchema.virtual("id").get(function () {
  // @ts-ignore
  return this._id?.toString();
});
TutorSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: { _id?: unknown }) => {
    delete ret._id;
  },
});
TutorSchema.set("toObject", { virtuals: true });

export type TutorDoc = InferSchemaType<typeof TutorSchema>;
export const TutorModel = model<TutorDoc>("Tutor", TutorSchema);
