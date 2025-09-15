import {
  Schema,
  model,
  type InferSchemaType,
  type Model,
  FilterQuery,
  UpdateQuery,
} from "mongoose";

// 1. Create an interface representing a document in MongoDB.
export type TutorDoc = InferSchemaType<typeof TutorSchema>;

// 2. Create a an interface for the Model with the custom static methods
interface TutorModel extends Model<TutorDoc> {
  findByUserId(userId: string): Promise<TutorDoc | null>;
  searchBySubject(q: string): Promise<TutorDoc[]>;
  updateById(id: string, patch: any): Promise<TutorDoc | null>;
  deleteById(id: string): Promise<TutorDoc | null>;
  applyRating(id: string, score: number): Promise<TutorDoc | null>;
  update(
    filter: FilterQuery<TutorDoc>,
    update: UpdateQuery<TutorDoc>,
  ): Promise<any>;
  findAllWithStudentCount(): Promise<any[]>;
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
      totalScore: { type: Number, default: 0, min: 0 },
      count: { type: Number, default: 0, min: 0 },
    },
    pfp: {
      data: Buffer,
      contentType: String,
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

  tutor.rating.totalScore += score;
  tutor.rating.count += 1;

  return tutor.save();
};

TutorSchema.statics.update = function (
  filter: FilterQuery<TutorDoc>,
  update: UpdateQuery<TutorDoc>,
) {
  return this.updateOne(filter, update);
};

TutorSchema.statics.findAllWithStudentCount = function () {
  return this.aggregate([
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "tutorId",
        as: "subscriptions",
      },
    },
    {
      $addFields: {
        studentCount: { $size: "$subscriptions" },
      },
    },
    {
      $project: {
        _id: 0, // Exclude _id
        id: "$_id", // Add id field
        userId: 1,
        name: 1,
        surname: 1,
        subjects: 1,
        rating: 1,
        pfp: {
          contentType: "$pfp.contentType",
          data: { $toString: "$pfp.data" }, // Convert Buffer to string (base64)
        },
        studentCount: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
};

TutorSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, ...rest } = ret;
    // Explicitly add the 'id' property from _id
    if (_doc._id) {
      (rest as any).id = _doc._id.toString();
    }
    return rest;
  },
});
TutorSchema.set("toObject", { virtuals: true });

// 3. Pass the interface in the model
export const TutorModel = model<TutorDoc, TutorModel>("Tutor", TutorSchema);
