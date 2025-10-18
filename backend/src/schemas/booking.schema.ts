import { Schema, model, type InferSchemaType } from "mongoose";

const BookingSchema = new Schema(
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
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 15,
      max: 480, // 8 hours max
    },
    subject: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "rejected"],
      default: "pending",
    },
    initiatedBy: {
      type: String,
      enum: ["student", "tutor"],
      required: true,
    },
    // Additional fields for tracking
    confirmedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
  },
  { timestamps: true },
);

// Add indexes for efficient queries
BookingSchema.index({ studentId: 1, status: 1 });
BookingSchema.index({ tutorId: 1, status: 1 });
BookingSchema.index({ date: 1, time: 1 });
BookingSchema.index({ status: 1 });

// Virtual for formatted date/time
BookingSchema.virtual("formattedDateTime").get(function () {
  const date = new Date(this.date);
  return {
    date: date.toLocaleDateString(),
    time: this.time,
    datetime: `${date.toLocaleDateString()} at ${this.time}`,
  };
});

// Virtual for duration in hours
BookingSchema.virtual("durationHours").get(function () {
  return this.duration / 60;
});

BookingSchema.virtual("id").get(function () {
  // @ts-ignore
  return this._id?.toString();
});

BookingSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, ...rest } = ret;
    return rest;
  },
});

BookingSchema.set("toObject", { virtuals: true });

export type BookingDoc = InferSchemaType<typeof BookingSchema> & { 
  _id: Schema.Types.ObjectId;
  id: string;
  formattedDateTime: {
    date: string;
    time: string;
    datetime: string;
  };
  durationHours: number;
};

export const BookingModel = model<BookingDoc>("Booking", BookingSchema);
