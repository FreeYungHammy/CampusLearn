import { Schema, model, type InferSchemaType } from "mongoose";

// BASIC USER SCHEMA JUST TO GET FORMATTING IN SO THAT IT CAN BE ADJUSTED

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "tutor", "admin"],
      default: "student",
      index: true,
    },
    bio: { type: String },
    avatarUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const UserModel = model<UserDoc>("User", UserSchema);
