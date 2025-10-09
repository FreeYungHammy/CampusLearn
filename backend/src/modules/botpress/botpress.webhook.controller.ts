import { Request, Response, NextFunction } from "express";
import { io } from "../../config/socket";

export const BotpressWebhookController = {
  /**
   * Receive messages from Botpress webhook
   * This endpoint will be called by Botpress when the bot responds
   */
  receiveMessage: async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("Botpress webhook received:", req.body);
      
      // Botpress webhook payload structure
      const { type, payload, conversationId } = req.body;
      
      if (type === 'message' || type === 'choice' || type === 'text') {
        const { text } = payload;
        
        console.log(`✅ Botpress response for user ${conversationId}: ${text?.substring(0, 50)}...`);
        
        // Send the bot response to the frontend via Socket.IO
        // The conversationId from Botpress webhook is the userId from our system
        if (io && conversationId) {
          io.emit('botpress_response', {
            userId: conversationId,
            message: text,
            timestamp: new Date().toISOString()
          });
          console.log(`✅ Sent bot response to user ${conversationId} via Socket.IO`);
        } else {
          console.error('❌ Socket.IO emission failed:', { io: !!io, conversationId });
        }
        
        res.json({ 
          success: true, 
          message: "Webhook received successfully" 
        });
      } else {
        console.log("Unknown webhook type:", type);
        res.json({ 
          success: true, 
          message: "Webhook received but type not handled" 
        });
      }
      
    } catch (error) {
      console.error("Botpress webhook error:", error);
      next(error);
    }
  },

  /**
   * Health check for webhook
   */
  webhookHealth: async (req: Request, res: Response, next: NextFunction) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      service: "botpress-webhook" 
    });
  },
};
