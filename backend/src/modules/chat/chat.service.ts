import { io } from "../../config/socket";
import { StudentModel } from "../../schemas/students.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { UserModel } from "../../schemas/user.schema";
import { ChatModel } from "../../schemas/chat.schema";
import { Types } from "mongoose";
import { Binary } from "mongodb";

interface RawChatMessage {
  chatId: string;
  content: string;
  senderId: string; // This will be the user's _id
  upload?: {
    content?: Buffer | null;
    filename?: string;
    contentType?: string;
  } | null;
}

interface EnrichedChatMessage {
  _id: Types.ObjectId;
  chatId: string;
  content: string;
  senderId: string;
  sender: {
    _id: string;
    name: string;
    pfp?: {
      data: string;
      contentType: string;
    };
  };
  createdAt: Date;
  upload?: {
    data?: string; // base64
    filename?: string;
    contentType?: string;
  };
}

// Interface to represent the raw data returned by Mongoose .lean()
interface LeanChatMessage {
  _id: Types.ObjectId;
  chatId: string;
  content: string;
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  createdAt: Date;
  seen: boolean;
  upload?: {
    content?: Binary | null;
    filename?: string | null;
    contentType?: string | null;
  } | null;
  __v: number; // Mongoose adds this
}

export const ChatService = {
  async processAndEmitChatMessage(
    rawMessage: RawChatMessage & {
      _id: Types.ObjectId;
      createdAt: Date;
      upload?: any;
    },
  ) {
    // 1. Fetch sender's role from UserModel
    const user = await UserModel.findById(rawMessage.senderId).lean();

    if (!user) {
      console.error("Sender not found for ID:", rawMessage.senderId);
      return;
    }

    let senderProfile: { _id: string; name: string; pfp?: any } | null = null;

    // 2. Fetch sender's profile (Student or Tutor) to get the name
    if (user.role === "student") {
      const student = await StudentModel.findOne({ userId: user._id }).lean();
      if (student) {
        senderProfile = {
          _id: student._id.toString(),
          name: student.name,
          pfp: student.pfp,
        };
      }
    } else if (user.role === "tutor") {
      const tutor = await TutorModel.findOne({ userId: user._id }).lean();
      if (tutor) {
        senderProfile = {
          _id: tutor._id.toString(),
          name: tutor.name,
          pfp: tutor.pfp,
        };
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
    const enrichedMessage = {
      _id: rawMessage._id,
      chatId: rawMessage.chatId,
      content: rawMessage.content,
      senderId: rawMessage.senderId,
      sender: senderProfile,
      createdAt: rawMessage.createdAt,
      upload: rawMessage.upload
        ? {
            filename: rawMessage.upload.filename,
            contentType: rawMessage.upload.contentType,
            // Convert buffer to base64 for socket transmission
            data: rawMessage.upload.content?.toString("base64"),
          }
        : undefined,
    };

    // 4. Emit the enriched message
    io.of("/chat")
      .to(enrichedMessage.chatId)
      .emit("new_message", enrichedMessage);
    console.log(
      "Emitted enriched chat message for chatId:",
      enrichedMessage.chatId,
    );
  },

  async send(body: any): Promise<any> {
    try {
      let uploadData = undefined;
      if (body.upload && typeof body.upload.data === "string") {
        uploadData = {
          content: Buffer.from(body.upload.data, "base64"),
          filename: body.upload.filename,
          contentType: body.upload.contentType,
        };
      }

      // Create the message in the database
      const message = new ChatModel({
        senderId: new Types.ObjectId(body.senderId),
        receiverId: new Types.ObjectId(body.receiverId),
        chatId: body.chatId,
        content: body.content,
        upload: uploadData,
        seen: false,
      });

      const savedMessage = await message.save();

      // Fetch the full message to get the upload content for the socket event
      const fullMessageForEmit = await ChatModel.findById(savedMessage._id)
        .select("+upload.content")
        .lean();

      
      if (fullMessageForEmit) {
        // Explicitly construct RawChatMessage from LeanChatMessage, performing type conversions
        const rawMessageForEmit: RawChatMessage & { _id: Types.ObjectId; createdAt: Date; } = {
          _id: fullMessageForEmit._id,
          createdAt: fullMessageForEmit.createdAt,
          chatId: fullMessageForEmit.chatId,
          content: fullMessageForEmit.content,
          senderId: fullMessageForEmit.senderId.toString(), // Convert ObjectId to string
          upload: fullMessageForEmit.upload ? {
            filename: fullMessageForEmit.upload.filename ?? undefined, // Handle null to undefined
            contentType: fullMessageForEmit.upload.contentType ?? undefined, // Handle null to undefined
            content: fullMessageForEmit.upload.content instanceof Binary
                     ? Buffer.from(fullMessageForEmit.upload.content.buffer) // Explicitly create Buffer
                     : (fullMessageForEmit.upload.content ?? undefined), // Handle null to undefined
          } : undefined, // If upload is null, make it undefined
        };
        await this.processAndEmitChatMessage(rawMessageForEmit);
      }

      // Return a transformed message that matches the frontend's expectations, similar to getConversationThread
      const transformedMessage = await this.transformMessage(fullMessageForEmit);
      return transformedMessage;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  },

  async list(query: any, limit: number, skip: number): Promise<any[]> {
    try {
      const messages = await ChatModel.find(query)
        .populate("senderId", "email role")
        .populate("receiverId", "email role")
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
        .populate("senderId", "email role")
        .populate("receiverId", "email role")
        .select("+upload.content") // Also include content when fetching a single message
        .lean();

      return this.transformMessage(message);
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

      console.log("Looking for conversation between:", { userA: a, userB: b });
      console.log("Converted ObjectIds:", { userAObjectId, userBObjectId });

      // Find messages between two users (bidirectional)
      const messages = await ChatModel.find({
        $or: [
          { senderId: userAObjectId, receiverId: userBObjectId },
          { senderId: userBObjectId, receiverId: userAObjectId },
        ],
      })
        .populate("senderId", "email role")
        .populate("receiverId", "email role")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      console.log("Found messages:", messages.length);
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
        { new: true },
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

  // Helper to transform a single message
  async transformMessage(message: any) {
    if (!message) return null;

    const senderUser = message.senderId as any;
    let senderProfile: { _id: string; name: string } | null = null;

    // Get sender's profile information
    if (senderUser?.role === "student") {
      const student = await StudentModel.findOne({
        userId: senderUser._id,
      }).lean();
      if (student) {
        senderProfile = { _id: student._id.toString(), name: student.name };
      }
    } else if (senderUser?.role === "tutor") {
      const tutor = await TutorModel.findOne({ userId: senderUser._id }).lean();
      if (tutor) {
        senderProfile = { _id: tutor._id.toString(), name: tutor.name };
      }
    }

    if (!senderProfile && senderUser) {
      senderProfile = {
        _id: senderUser._id.toString(),
        name: senderUser._id.toString(),
      };
    }

    return {
      _id: message._id,
      chatId: message.chatId,
      content: message.content,
      sender: senderProfile,
      senderId: senderUser?._id?.toString(),
      receiverId: (message.receiverId as any)?._id?.toString(),
      createdAt: message.createdAt,
      seen: message.seen,
      upload: message.upload
        ? {
            // Note: data is only included if '+upload.content' was selected
            data: message.upload.content?.toString("base64"),
            contentType: message.upload.contentType,
            filename: message.upload.filename,
          }
        : undefined,
    };
  },

  async getConversationThread(chatId: string): Promise<any[]> {
    try {
      const messages = await ChatModel.find({ chatId })
        // We need to populate the user to get the role for the profile lookup
        .populate({ path: "senderId", model: "User" })
        .populate({ path: "receiverId", model: "User" })
        .sort({ createdAt: "asc" })
        // Eagerly load upload content for all messages in the thread
        .select("+upload.content")
        .lean();

      // Transform messages to match frontend expectations
      const transformedMessages = await Promise.all(
        messages.map((message) => this.transformMessage(message)),
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
      console.log("Getting conversations for user:", userId, "ObjectId:", userObjectId);

      // Simple approach: get all messages for this user and group them manually
      const messages = await ChatModel.find({
        $or: [{ senderId: userObjectId }, { receiverId: userObjectId }],
      })
        .populate("senderId", "email role")
        .populate("receiverId", "email role")
        .sort({ createdAt: -1 })
        .lean();

      console.log("Found messages:", messages.length);

      if (messages.length === 0) {
        return [];
      }

      // Group messages by the other user
      const conversationMap = new Map();
      
      for (const message of messages) {
        const senderId = message.senderId._id.toString();
        const receiverId = message.receiverId._id.toString();
        const otherUserId = senderId === userId ? receiverId : senderId;
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            _id: otherUserId,
            lastMessage: message,
            unreadCount: 0,
            messages: []
          });
        }
        
        conversationMap.get(otherUserId).messages.push(message);
        
        // Count unread messages from the other user
        if (senderId !== userId && !message.seen) {
          conversationMap.get(otherUserId).unreadCount++;
        }
      }

      // Convert to array and get user profiles
      const conversations = [];
      for (const [otherUserId, conv] of conversationMap) {
        try {
          // Get the other user's profile
          const otherUser = await UserModel.findById(otherUserId).lean();
          if (!otherUser) continue;

          let profile = null;
          if (otherUser.role === "student") {
            profile = await StudentModel.findOne({ userId: otherUserId }).lean();
          } else if (otherUser.role === "tutor") {
            profile = await TutorModel.findOne({ userId: otherUserId }).lean();
          }

          conversations.push({
            _id: otherUserId,
            otherUser: {
              _id: otherUser._id.toString(),
              email: otherUser.email,
              role: otherUser.role,
              profile: profile ? {
                _id: profile._id.toString(),
                name: profile.name,
                surname: profile.surname || "",
                subjects: (profile as any).subjects || [],
                pfp: profile.pfp
              } : null
            },
            lastMessage: {
              content: conv.lastMessage.content,
              createdAt: conv.lastMessage.createdAt,
              senderId: conv.lastMessage.senderId._id.toString()
            },
            unreadCount: conv.unreadCount
          });
        } catch (error) {
          console.error(`Error processing conversation with user ${otherUserId}:`, error);
        }
      }

      console.log("Found conversations:", conversations.length);
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
          {
            senderId: new Types.ObjectId(studentId),
            receiverId: new Types.ObjectId(tutorId),
          },
          {
            senderId: new Types.ObjectId(tutorId),
            receiverId: new Types.ObjectId(studentId),
          },
        ],
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
