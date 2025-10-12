import { useEffect } from "react";
import { useAuthStore } from "../../store/authStore";

const botpressInjectScript =
  "https://cdn.botpress.cloud/webchat/v3.3/inject.js";
const botpressConfigScript =
  "https://files.bpcontent.cloud/2025/09/26/10/20250926102744-81Z5CE5Y.js";

const BotpressChat = () => {
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      console.log("[BotpressChat] Effect triggered for user:", user.email);
      // Prevent duplicate script injection on hot-reloads
      if (document.getElementById("botpress-inject-script")) {
        return;
      }

      const injectScript = document.createElement("script");
      injectScript.src = botpressInjectScript;
      injectScript.id = "botpress-inject-script";
      injectScript.defer = true;

      // Chain the config script to load only after the inject script is ready
      injectScript.onload = () => {
        const configScript = document.createElement("script");
        configScript.src = botpressConfigScript;
        configScript.id = "botpress-config-script";
        configScript.defer = true;
        document.head.appendChild(configScript);

        configScript.onload = () => {
          // After the config has loaded, configure the webchat with the logged-in user's details.
          // This identifies the user to botpress and starts a new session for them.
          setTimeout(() => {
            if (
              window.botpress &&
              typeof window.botpress.configure === "function"
            ) {
              const botUser = {
                id: user.id,
                role: user.role,
              };
              console.log("[BotpressChat] Configuring bot with user:", botUser);
              window.botpress.configure({ user: botUser });
            }
          }, 500); // A small delay to ensure the bot is ready to receive the config
        };
      };

      document.head.appendChild(injectScript);
    }
  }, [user]); // Re-run effect if user state changes

  return null; // This component does not render anything itself
};

export default BotpressChat;
