import { env } from "../../config/env";

export const BotpressService = {
  /**
   * Get Botpress configuration for the client
   * @returns Botpress client configuration
   */
  getConfig() {
    if (!env.botpressClientId) {
      throw new Error("Botpress is not configured on the server");
    }
    return {
      clientId: env.botpressClientId,
      botId: env.botpressBotId,
    };
  },

  /**
   * Send a message to Botpress and get response
   * @param message - The user's message
   * @param userId - The user's ID for context
   * @returns Botpress response
   */
  async sendMessage(message: string, userId: string) {
    if (!env.botpressBotId || !env.botpressPat) {
      throw new Error("Botpress is not configured on the server. Need BOTPRESS_BOT_ID and BOTPRESS_PAT");
    }

    try {
      // Use the Botpress Messaging API webhook endpoint
      const botpressWebhookUrl = `https://webhook.botpress.cloud/e961b124-66a4-4a8f-9844-9d8670d73440`;
      
      const possibleEndpoints = [
        botpressWebhookUrl,
      ];

      let lastError: Error | null = null;

      for (const botpressUrl of possibleEndpoints) {
        try {
          console.log(`Trying Botpress endpoint: ${botpressUrl}`);
          
          // Generate a unique message ID
          const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const response = await fetch(botpressUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.botpressPat}`,
              'x-bot-id': env.botpressBotId,
            },
            body: JSON.stringify({
              userId: userId,
              messageId: messageId,
              conversationId: userId,
              type: 'text',
              text: message,
              payload: {
                user: {
                  userName: userId
                }
              }
            }),
          });

          console.log(`Botpress response status: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            console.log('Botpress response data:', data);
            
            // The Messaging API returns confirmation, not the bot's response
            // The actual bot response comes via webhook
            return {
              response: "Message sent to bot. Waiting for response...",
              success: true,
              pending: true,
            };
          } else {
            const errorText = await response.text();
            console.log(`Botpress error response: ${errorText}`);
            lastError = new Error(`Botpress API error: ${response.status} ${response.statusText} - ${errorText}`);
          }
        } catch (endpointError) {
          console.log(`Endpoint ${botpressUrl} failed:`, endpointError);
          lastError = endpointError as Error;
          continue;
        }
      }

      // If all endpoints failed, throw the last error
      throw lastError || new Error('All Botpress endpoints failed');
      
    } catch (error) {
      console.error('Botpress API error:', error);
      
      // Return a more helpful error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        response: `I'm having trouble connecting to my knowledge base. Error: ${errorMessage}. Please check the Botpress configuration.`,
        success: false,
      };
    }
  },
};
