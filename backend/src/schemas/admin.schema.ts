import { Schema, model, type InferSchemaType } from "mongoose";

const AdminSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true },
    surname: { type: String, required: true },
    pfp: {
      contentType: String,
      data: Buffer,
    },
  },
  { timestamps: true },
);

export type AdminDoc = InferSchemaType<typeof AdminSchema>;
export const AdminModel = model<AdminDoc>("Admin", AdminSchema);
