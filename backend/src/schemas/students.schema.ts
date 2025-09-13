import {
  Schema,
  model,
  type InferSchemaType,
  Model,
  FilterQuery,
  UpdateQuery,
} from "mongoose";

interface StudentModel extends Model<StudentDoc> {
  update(
    filter: FilterQuery<StudentDoc>,
    update: UpdateQuery<StudentDoc>,
  ): Promise<any>;
}

const StudentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    name: { type: String, required: true }, // (typo fix)
    surname: { type: String, required: true },
    enrolledCourses: [{ type: String }],
    pfp: {
      data: Buffer,
      contentType: String,
    },
  },
  { timestamps: true },
);

StudentSchema.virtual("id").get(function () {
  // @ts-ignore
  return this._id?.toString();
});

StudentSchema.statics.update = function (
  filter: FilterQuery<StudentDoc>,
  update: UpdateQuery<StudentDoc>,
) {
  return this.updateOne(filter, update);
};

StudentSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const { _id, ...rest } = ret;
    return rest;
  },
});
StudentSchema.set("toObject", { virtuals: true });

export type StudentDoc = InferSchemaType<typeof StudentSchema>;
export const StudentModel = model<StudentDoc, StudentModel>(
  "Student",
  StudentSchema,
);
