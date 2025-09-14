import { io } from "../../config/socket";
import { StudentModel } from "../../schemas/students.schema";
import { TutorModel } from "../../schemas/tutor.schema";
import { UserModel } from "../../schemas/user.schema";

interface RawChatMessage {
  chatId: string;
  content: string;
  senderId: string; // This will be the user's _id
  // Add other fields if necessary, e.g., senderRole: 'student' | 'tutor'
}

interface EnrichedChatMessage {
  chatId: string;
  content: string;
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
    console.warn("ChatService.send not fully implemented yet.");
    // In a real implementation, this would save the message to the DB
    // and then call processAndEmitChatMessage.
    throw new Error("ChatService.send not implemented.");
  },

  async list(query: any, limit: number, skip: number): Promise<any[]> {
    console.warn("ChatService.list not fully implemented yet.");
    return []; // Return an empty array for now
  },

  async get(id: string): Promise<any | null> {
    console.warn("ChatService.get not fully implemented yet.");
    return null; // Return null for now
  },

  async conversation(
    a: string,
    b: string,
    limit: number,
    skip: number,
  ): Promise<any[]> {
    console.warn("ChatService.conversation not fully implemented yet.");
    return []; // Return an empty array for now
  },

  async markSeen(id: string): Promise<any | null> {
    console.warn("ChatService.markSeen not fully implemented yet.");
    return null; // Return null for now
  },

  async markThreadSeen(from: string, to: string): Promise<any> {
    console.warn("ChatService.markThreadSeen not fully implemented yet.");
    return { modifiedCount: 0 }; // Return a default object for now
  },

  async remove(id: string): Promise<any | null> {
    console.warn("ChatService.remove not fully implemented yet.");
    return null; // Return null for now
  },
};
