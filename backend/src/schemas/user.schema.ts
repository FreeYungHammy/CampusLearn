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

UserSchema.virtual("id").get(function () {
  // @ts-ignore
  return this._id?.toString();
});
UserSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, passwordHash, ...rest } = ret;
    return rest;
  },
});
UserSchema.set("toObject", { virtuals: true });

export type UserDoc = InferSchemaType<typeof UserSchema>;
export const UserModel = model<UserDoc>("User", UserSchema);
