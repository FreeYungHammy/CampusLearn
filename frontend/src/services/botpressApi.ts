import http from "./http";

export interface BotpressConfig {
  clientId: string;
  botId?: string;
}

export interface BotpressMessage {
  message: string;
  userId: string;
}

export interface BotpressResponse {
  response: string;
  success: boolean;
}

export const botpressApi = {
  /**
   * Fetch Botpress configuration from the backend
   */
  async getConfig(): Promise<BotpressConfig> {
    const response = await http.get("/botpress/config");
    return response.data;
  },

  /**
   * Send a message to Botpress and get response
   */
  async sendMessage(message: string, userId: string): Promise<BotpressResponse> {
    const response = await http.post("/botpress/message", {
      message,
      userId,
    });
    return response.data;
  },
};
