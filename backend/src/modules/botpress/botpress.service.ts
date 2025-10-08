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
      // Use the Botpress webhook endpoint for sending messages
      const botpressWebhookUrl = `https://webhook.botpress.cloud/e961b124-66a4-4a8f-9844-9d8670d73440`;
      
      const possibleEndpoints = [
        botpressWebhookUrl, // Your specific webhook URL
        `https://api.botpress.cloud/v1/bots/${env.botpressBotId}/conversations/${userId}/messages`,
        `https://api.botpress.cloud/v1/bots/${env.botpressBotId}/messages`,
        `https://api.botpress.cloud/v1/chat/${env.botpressBotId}/messages`,
        `https://api.botpress.cloud/v2/bots/${env.botpressBotId}/messages`,
      ];

      let lastError: Error | null = null;

      for (const botpressUrl of possibleEndpoints) {
        try {
          console.log(`Trying Botpress endpoint: ${botpressUrl}`);
          
          const response = await fetch(botpressUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.botpressPat}`, // Use Personal Access Token
              'x-bot-id': env.botpressBotId,
            },
            body: JSON.stringify({
              type: 'text',
              text: message,
              userId: userId,
              conversationId: userId, // Use userId as conversationId for simplicity
            }),
          });

          console.log(`Botpress response status: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            console.log('Botpress response data:', data);
            
            // Extract response from Botpress format
            let botResponse = "I received your message but couldn't process it properly.";
            
            if (data.responses && data.responses.length > 0) {
              // Botpress typically returns responses in this format
              botResponse = data.responses[0].text || data.responses[0].message || botResponse;
            } else if (data.text) {
              botResponse = data.text;
            } else if (data.message) {
              botResponse = data.message;
            }
            
            return {
              response: botResponse,
              success: true,
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
