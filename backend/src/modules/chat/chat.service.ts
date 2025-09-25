import { io } from "../../config/socket";
import { StudentModel } from "../../schemas/students.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { UserModel } from "../../schemas/user.schema";
import { ChatModel } from "../../schemas/chat.schema";
import { Types } from "mongoose";

interface RawChatMessage {
  chatId: string;
  content: string;
  senderId: string; // This will be the user's _id
  // Add other fields if necessary, e.g., senderRole: 'student' | 'tutor'
}

interface EnrichedChatMessage {
  chatId: string;
  content: string;
  senderId: string;
  sender: {
    _id: string;
    name: string;
  };
  createdAt: Date;
}

export const ChatService = {
  async processAndEmitChatMessage(rawMessage: RawChatMessage) {
    // 1. Fetch sender's role from UserModel
    const user = await UserModel.findById(rawMessage.senderId).lean();

    if (!user) {
      console.error("Sender not found for ID:", rawMessage.senderId);
      return;
    }

    let senderProfile: { _id: string; name: string } | null = null;

    // 2. Fetch sender's profile (Student or Tutor) to get the name
    if (user.role === "student") {
      const student = await StudentModel.findOne({ userId: user._id }).lean();
      if (student) {
        senderProfile = { _id: student._id.toString(), name: student.name };
      }
    } else if (user.role === "tutor") {
      const tutor = await TutorModel.findOne({ userId: user._id }).lean();
      if (tutor) {
        senderProfile = { _id: tutor._id.toString(), name: tutor.name };
      }
    }

    if (!senderProfile) {
      console.error(
        "Sender profile not found for user:",
        user._id,
        "with role:",
        user.role,
      );
      // Fallback: use user ID as name if profile not found
      senderProfile = { _id: user._id.toString(), name: user._id.toString() };
    }

    // 3. Construct enriched message
    const enrichedMessage: EnrichedChatMessage = {
      chatId: rawMessage.chatId,
      content: rawMessage.content,
      senderId: rawMessage.senderId,
      sender: senderProfile,
      createdAt: new Date(), // Set creation time on the backend
    };

    // 4. Emit the enriched message
    io.of("/chat")
      .to(enrichedMessage.chatId)
      .emit("new_message", enrichedMessage);
    console.log("Emitted enriched chat message:", enrichedMessage);
  },

  async send(body: any): Promise<any> {
    try {
      // Convert upload data from base64 string to Buffer if present
      let uploadBuffer = undefined;
      if (body.upload && typeof body.upload.data === 'string') {
        uploadBuffer = Buffer.from(body.upload.data, 'base64');
      }

      // Create the message in the database
      const message = new ChatModel({
        senderId: new Types.ObjectId(body.senderId),
        receiverId: new Types.ObjectId(body.receiverId),
        chatId: body.chatId,
        content: body.content,
        upload: uploadBuffer,
        seen: false,
      });

      const savedMessage = await message.save();
      
      // Process and emit the message via socket
      await this.processAndEmitChatMessage({
        chatId: body.chatId,
        content: body.content,
        senderId: body.senderId,
      });

      return savedMessage;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  async list(query: any, limit: number, skip: number): Promise<any[]> {
    try {
      const messages = await ChatModel.find(query)
        .populate('senderId', 'email role')
        .populate('receiverId', 'email role')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();
      
      return messages;
    } catch (error) {
      console.error("Error listing messages:", error);
      throw error;
    }
  },

  async get(id: string): Promise<any | null> {
    try {
      const message = await ChatModel.findById(id)
        .populate('senderId', 'email role')
        .populate('receiverId', 'email role')
        .lean();
      
      return message;
    } catch (error) {
      console.error("Error getting message:", error);
      throw error;
    }
  },

  async conversation(
    a: string,
    b: string,
    limit: number,
    skip: number,
  ): Promise<any[]> {
    try {
      // Convert string IDs to ObjectIds
      const userAObjectId = new Types.ObjectId(a);
      const userBObjectId = new Types.ObjectId(b);
      
      // Find messages between two users (bidirectional)
      const messages = await ChatModel.find({
        $or: [
          { senderId: userAObjectId, receiverId: userBObjectId },
          { senderId: userBObjectId, receiverId: userAObjectId }
        ]
      })
        .populate('senderId', 'email role')
        .populate('receiverId', 'email role')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();
      
      return messages;
    } catch (error) {
      console.error("Error getting conversation:", error);
      throw error;
    }
  },

  async markSeen(id: string): Promise<any | null> {
    try {
      const message = await ChatModel.findByIdAndUpdate(
        id,
        { seen: true },
        { new: true }
      ).lean();
      
      return message;
    } catch (error) {
      console.error("Error marking message as seen:", error);
      throw error;
    }
  },

  async markThreadSeen(chatId: string, userId: string): Promise<any> {
    try {
      const result = await ChatModel.updateMany(
        { chatId, receiverId: new Types.ObjectId(userId), seen: false },
        { $set: { seen: true } },
      );
      return result;
    } catch (error) {
      console.error("Error marking thread as seen:", error);
      throw error;
    }
  },

  async remove(id: string): Promise<any | null> {
    try {
      const message = await ChatModel.findByIdAndDelete(id).lean();
      return message;
    } catch (error) {
      console.error("Error removing message:", error);
      throw error;
    }
  },

  async getConversationThread(chatId: string): Promise<any[]> {
    try {
      const messages = await ChatModel.find({ chatId })
        .populate('senderId', 'email role')
        .populate('receiverId', 'email role')
        .sort({ createdAt: 'asc' })
        .lean();

      // Transform messages to match frontend expectations
      const transformedMessages = await Promise.all(
        messages.map(async (message) => {
          const senderUser = message.senderId as any;
          let senderProfile: { _id: string; name: string } | null = null;

          // Get sender's profile information
          if (senderUser.role === "student") {
            const student = await StudentModel.findOne({ userId: senderUser._id }).lean();
            if (student) {
              senderProfile = { _id: student._id.toString(), name: student.name };
            }
          } else if (senderUser.role === "tutor") {
            const tutor = await TutorModel.findOne({ userId: senderUser._id }).lean();
            if (tutor) {
              senderProfile = { _id: tutor._id.toString(), name: tutor.name };
            }
          }

          if (!senderProfile) {
            senderProfile = { _id: senderUser._id.toString(), name: senderUser._id.toString() };
          }

          return {
            _id: message._id,
            chatId: message.chatId,
            content: message.content,
            sender: senderProfile,
            senderId: senderUser._id.toString(),
            receiverId: (message.receiverId as any)?._id?.toString(),
            createdAt: message.createdAt,
            seen: message.seen,
            upload: message.upload ? {
              data: message.upload.toString('base64'),
              contentType: 'application/octet-stream', // Default content type
              filename: 'attachment'
            } : undefined
          };
        })
      );

      return transformedMessages;
    } catch (error) {
      console.error("Error getting conversation thread:", error);
      throw error;
    }
  },

  // New method to get conversations for a user
  async getConversations(userId: string): Promise<any[]> {
    try {
      // Convert userId to ObjectId
      const userObjectId = new Types.ObjectId(userId);
      
      // Get all unique conversations for a user
      const conversations = await ChatModel.aggregate([
        {
          $match: {
            $or: [
              { senderId: userObjectId },
              { receiverId: userObjectId }
            ]
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$senderId", userObjectId] },
                "$receiverId",
                "$senderId"
              ]
            },
            lastMessage: { $first: "$$ROOT" },
            unreadCount: {
              $sum: {
                $cond: [
                  { $and: [
                    { $ne: ["$senderId", userObjectId] },
                    { $eq: ["$seen", false] }
                  ]},
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "otherUser"
          }
        },
        {
          $unwind: "$otherUser"
        },
        {
          $lookup: {
            from: "students",
            localField: "_id",
            foreignField: "userId",
            as: "studentProfile"
          }
        },
        {
          $lookup: {
            from: "tutors",
            localField: "_id",
            foreignField: "userId",
            as: "tutorProfile"
          }
        },
        {
          $addFields: {
            otherUser: {
              $mergeObjects: [
                "$otherUser",
                {
                  profile: {
                    $cond: [
                      { $gt: [{ $size: "$studentProfile" }, 0] },
                      { $arrayElemAt: ["$studentProfile", 0] },
                      { $arrayElemAt: ["$tutorProfile", 0] }
                    ]
                  }
                }
              ]
            }
          }
        },
        {
          $project: {
            _id: 1,
            otherUser: 1,
            lastMessage: 1,
            unreadCount: 1
          }
        }
      ]);

      return conversations;
    } catch (error) {
      console.error("Error getting conversations:", error);
      throw error;
    }
  },

  // Create an empty conversation between two users
  async createConversation(studentId: string, tutorId: string): Promise<any> {
    try {
      // Check if conversation already exists
      const existingConversation = await ChatModel.findOne({
        $or: [
          { senderId: new Types.ObjectId(studentId), receiverId: new Types.ObjectId(tutorId) },
          { senderId: new Types.ObjectId(tutorId), receiverId: new Types.ObjectId(studentId) }
        ]
      });

      if (existingConversation) {
        return existingConversation;
      }

      // Create a welcome message to establish the conversation
      const welcomeMessage = new ChatModel({
        senderId: new Types.ObjectId(studentId),
        receiverId: new Types.ObjectId(tutorId),
        chatId: [studentId, tutorId].sort().join("-"),
        content: "Conversation started",
        seen: false,
      });

      const savedMessage = await welcomeMessage.save();
      return savedMessage;
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  },
};
