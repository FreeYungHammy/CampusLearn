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
    role: { type: String, enum: ["student", "tutor", "admin"], required: true },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
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
    // Explicitly add the 'id' property from _id, as 'id' virtual might be removed by destructuring
    if (_doc._id) {
      (rest as any).id = _doc._id.toString(); // Assert 'rest' as 'any' to allow adding 'id'
    }
    return rest;
  },
});
UserSchema.set("toObject", { virtuals: true });

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: any };
export const UserModel = model<UserDoc>("User", UserSchema);
