import { Schema, model, type InferSchemaType, type Model } from "mongoose";

// 1. Create an interface representing a document in MongoDB.
export type TutorDoc = InferSchemaType<typeof TutorSchema>;

// 2. Create a an interface for the Model with the custom static methods
interface TutorModel extends Model<TutorDoc> {
  findByUserId(userId: string): Promise<TutorDoc | null>;
  searchBySubject(q: string): Promise<TutorDoc[]>;
  updateById(id: string, patch: any): Promise<TutorDoc | null>;
  deleteById(id: string): Promise<TutorDoc | null>;
  applyRating(id: string, score: number): Promise<TutorDoc | null>;
}

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

// Custom static methods
TutorSchema.statics.findByUserId = function (userId: string) {
  return this.findOne({ userId });
};

TutorSchema.statics.searchBySubject = function (q: string) {
  return this.find({ subjects: { $regex: q, $options: "i" } });
};

TutorSchema.statics.updateById = function (id: string, patch: any) {
  return this.findByIdAndUpdate(id, patch, { new: true });
};

TutorSchema.statics.deleteById = function (id: string) {
  return this.findByIdAndDelete(id);
};

TutorSchema.statics.applyRating = async function (id: string, score: number) {
  const tutor = await this.findById(id);
  if (!tutor) return null;

  const currentRating = tutor.rating.average * tutor.rating.count;
  const newCount = tutor.rating.count + 1;
  const newAverage = (currentRating + score) / newCount;

  tutor.rating.average = newAverage;
  tutor.rating.count = newCount;

  return tutor.save();
};

TutorSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, ...rest } = ret;
    return rest;
  },
});
TutorSchema.set("toObject", { virtuals: true });

// 3. Pass the interface in the model
export const TutorModel = model<TutorDoc, TutorModel>("Tutor", TutorSchema);
