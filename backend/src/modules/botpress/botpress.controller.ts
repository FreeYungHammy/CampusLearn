import { Request, Response, NextFunction } from "express";
import { BotpressService } from "./botpress.service";

export const BotpressController = {
  getConfig: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = BotpressService.getConfig();
      res.json(config);
    } catch (error) {
      next(error);
    }
  },

  sendMessage: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, userId } = req.body;
      
      if (!message || !userId) {
        return res.status(400).json({ 
          error: "Message and userId are required" 
        });
      }

      console.log(`Botpress request - Message: "${message}", UserId: "${userId}"`);
      const response = await BotpressService.sendMessage(message, userId);
      console.log(`Botpress response:`, response);
      
      res.json(response);
    } catch (error) {
      console.error('Botpress controller error:', error);
      next(error);
    }
  },

  testConfig: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = BotpressService.getConfig();
      res.json({
        ...config,
        hasClientId: !!config.clientId,
        hasBotId: !!config.botId,
        clientIdLength: config.clientId?.length || 0,
        botIdLength: config.botId?.length || 0,
      });
    } catch (error) {
      next(error);
    }
  },
};
