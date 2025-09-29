import {
  Schema,
  model,
  type InferSchemaType,
  type Model,
  FilterQuery,
  UpdateQuery,
  HydratedDocument,
} from "mongoose";

// 1. Create an interface representing a document in MongoDB.
export type TutorDoc = InferSchemaType<typeof TutorSchema>;

// 2. Create a an interface for the Model with the custom static methods
interface TutorModel extends Model<TutorDoc> {
  findByUserId(userId: string): Promise<HydratedDocument<TutorDoc> | null>;
  searchBySubject(q: string): Promise<HydratedDocument<TutorDoc>[]>;
  updateById(
    id: string,
    patch: any,
  ): Promise<HydratedDocument<TutorDoc> | null>;
  deleteById(id: string): Promise<HydratedDocument<TutorDoc> | null>;
  applyRating(
    id: string,
    score: number,
  ): Promise<HydratedDocument<TutorDoc> | null>;
  update(
    filter: FilterQuery<TutorDoc>,
    update: UpdateQuery<TutorDoc>,
  ): Promise<any>;
  findAllWithStudentCount(
    limit: number,
    offset: number,
    filters: { [key: string]: any },
  ): Promise<{ tutors: any[]; totalCount: number }>;
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

TutorSchema.statics.findAllWithStudentCount = async function (
  limit: number,
  offset: number,
  filters: { [key: string]: any } = {},
) {
  const matchStage: any = {};

  if (filters.searchQuery) {
    matchStage.$or = [
      { name: { $regex: filters.searchQuery, $options: "i" } },
      { surname: { $regex: filters.searchQuery, $options: "i" } },
      { subjects: { $regex: filters.searchQuery, $options: "i" } },
    ];
  }

  if (filters.subjects && filters.subjects.length > 0) {
    matchStage.subjects = { $all: filters.subjects };
  }

  const ratingStage: any[] = [];
  if (filters.rating && filters.rating > 0) {
    ratingStage.push(
      {
        $addFields: {
          averageRating: {
            $cond: [
              { $eq: ["$rating.count", 0] },
              0,
              { $divide: ["$rating.totalScore", "$rating.count"] },
            ],
          },
        },
      },
      { $match: { averageRating: { $gte: filters.rating } } },
    );
  }

  const sortStage: any = {};
  if (filters.sortBy === "rating") {
    sortStage["rating.totalScore"] = -1; // Or averageRating, but need to calculate it first
  } else {
    sortStage.createdAt = -1; // Default to newest
  }

  const aggregationPipeline = [
    { $match: matchStage },
    ...ratingStage,
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
        id: "$_id",
        studentCount: { $size: "$subscriptions" },
      },
    },
    {
      $project: {
        _id: 0,
        pfp: 0,
        subscriptions: 0,
      },
    },
    { $sort: sortStage },
    { $skip: offset },
    { $limit: limit },
  ];

  const tutorsPromise = this.aggregate(aggregationPipeline);

  // For total count, we only need the initial match stages
  const countPipeline = [{ $match: matchStage }, ...ratingStage];
  const totalCountPromise = this.aggregate([
    ...countPipeline,
    { $count: "total" },
  ]);

  const [tutors, totalResult] = await Promise.all([
    tutorsPromise,
    totalCountPromise,
  ]);

  const totalCount = totalResult.length > 0 ? totalResult[0].total : 0;

  return { tutors, totalCount };
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
