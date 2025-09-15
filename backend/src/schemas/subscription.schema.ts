import { Schema, model, Document, Types } from "mongoose";

export interface ISubscription extends Document {
  studentId: Types.ObjectId;
  tutorId: Types.ObjectId;
}

const SubscriptionSchema = new Schema(
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
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// Add a unique compound index to prevent duplicate subscriptions
SubscriptionSchema.index({ studentId: 1, tutorId: 1 }, { unique: true });

export const SubscriptionModel = model<ISubscription>(
  "Subscription",
  SubscriptionSchema,
);
