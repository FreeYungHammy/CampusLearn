import {
  SubscriptionModel,
  ISubscription,
} from "../../schemas/subscription.schema";
import { FilterQuery, Types } from "mongoose";

export const SubscriptionRepo = {
  create(data: Partial<ISubscription>) {
    return SubscriptionModel.create(data);
  },

  findOne(query: FilterQuery<ISubscription>) {
    return SubscriptionModel.findOne(query).exec();
  },

  deleteOne(query: FilterQuery<ISubscription>) {
    return SubscriptionModel.deleteOne(query).exec();
  },

  findByStudentId(studentId: string) {
    return SubscriptionModel.aggregate([
      { $match: { studentId: new Types.ObjectId(studentId) } },
      {
        $lookup: {
          from: "tutors",
          localField: "tutorId",
          foreignField: "_id",
          as: "tutorDetails",
        },
      },
      { $unwind: "$tutorDetails" },
      {
        $lookup: {
          from: "subscriptions",
          localField: "tutorDetails._id",
          foreignField: "tutorId",
          as: "tutorSubscriptions",
        },
      },
      {
        $addFields: {
          "tutorDetails.studentCount": { $size: "$tutorSubscriptions" },
        },
      },
      {
        $replaceRoot: { newRoot: "$tutorDetails" },
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
  },

  findByTutorId(tutorId: string) {
    return SubscriptionModel.find({ tutorId }).populate("studentId").exec();
  },
};
