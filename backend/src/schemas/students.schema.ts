import {
  Schema,
  model,
  type InferSchemaType,
  Model,
  FilterQuery,
  UpdateQuery,
  Types,
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
    // Explicitly add the 'id' property from _id
    if (_doc._id) {
      (rest as any).id = _doc._id.toString();
    }
    return rest;
  },
});
StudentSchema.set("toObject", { virtuals: true });

// Manually add the _id property to the type, as InferSchemaType doesn't always include it reliably.
export type StudentDoc = InferSchemaType<typeof StudentSchema> & {
  _id: Types.ObjectId;
};

export const StudentModel = model<StudentDoc, StudentModel>(
  "Student",
  StudentSchema,
);
