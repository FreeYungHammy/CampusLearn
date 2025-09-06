import { Schema, model, type InferSchemaType } from "mongoose";

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /.+@.+\..+/,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["tutor", "student"], required: true },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const UserModel = model<UserDoc>("User", UserSchema);
