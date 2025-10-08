import { Request, Response, NextFunction } from "express";

export const BotpressWebhookController = {
  /**
   * Receive messages from Botpress webhook
   * This endpoint will be called by Botpress when the bot responds
   */
  receiveMessage: async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("Botpress webhook received:", req.body);
      
      // Botpress webhook payload structure
      const { type, payload } = req.body;
      
      if (type === 'message') {
        const { conversationId, message } = payload;
        
        console.log(`Botpress response for conversation ${conversationId}:`, message);
        
        // Here you can:
        // 1. Store the message in database
        // 2. Send real-time update to frontend via WebSocket
        // 3. Process the message further
        
        // For now, just acknowledge receipt
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
