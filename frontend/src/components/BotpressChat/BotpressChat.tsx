// frontend/src/components/BotpressChat/BotpressChat.tsx
import { useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore";

const botpressInjectScript =
  "https://cdn.botpress.cloud/webchat/v3.3/inject.js";
const botpressConfigScript =
  "https://files.bpcontent.cloud/2025/10/14/21/20251014214803-97L9Z6U3.js";

//Cloudflare tunnel URL
const API_BASE = "https://exists-salary-shadows-barely.trycloudflare.com";

declare global {
  interface Window {
    botpress?: {
      conversationId?: string;
      configure?: (cfg: any) => void;
      sendEvent?: (evt: any) => void;
      close?: () => void;
      destroy?: () => void;
    };
  }
}

async function sendClaimMessage() {
  try {
    const conversationId = window.botpress?.conversationId;
    if (!conversationId) {
      console.error(
        "[BP] sendClaimMessage called, but conversationId is not available.",
      );
      return;
    }

    const token = useAuthStore.getState().token;
    if (!token) {
      console.warn("[BP] No auth token found, cannot mint claim.");
      return;
    }

    console.log(
      `[BP] Attaching session for REAL conversationId: ${conversationId}`,
    );

    const mintRes = await fetch(`${API_BASE}/api/botpress/mint-claim`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!mintRes.ok) throw new Error(`mint-claim failed: ${mintRes.status}`);
    const { token: claimToken } = await mintRes.json();

    const forwardRes = await fetch(`${API_BASE}/api/botpress/forward-claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ conversationId, token: claimToken }),
    });

    if (!forwardRes.ok)
      throw new Error(`forward-claim failed: ${forwardRes.status}`);

    console.log(
      "[BP] Successfully associated user with conversation via backend.",
    );
  } catch (e) {
    console.error("[BP] Failed to send claim message:", e);
  }
}

function pollForBotpressReady(retries = 60) {
  if (retries <= 0) {
    console.error("[BP] Timed out waiting for window.botpress.conversationId.");
    return;
  }

  if (window.botpress?.conversationId) {
    console.log(
      `[BP] Botpress is ready! Found conversationId after ${15 - retries} tries.`,
    );
    sendClaimMessage();
  } else {
    setTimeout(() => pollForBotpressReady(retries - 1), 1000); // Wait 1 second and try again
  }
}

const BotpressChat = () => {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) {
      // Cleanup logic when user logs out
      try {
        window.botpress?.destroy?.();
      } catch {}
      const s1 = document.getElementById("botpress-inject-script");
      const s2 = document.getElementById("botpress-config-script");
      s1?.parentElement?.removeChild(s1);
      s2?.parentElement?.removeChild(s2);
      console.log("[BP] User logged out. Chatbot destroyed.");
      return;
    }

    // --- Initialization logic when user logs in ---
    if (document.getElementById("botpress-inject-script")) {
      return; // Scripts are already injected, do nothing.
    }

    console.log("[BP] User logged in. Injecting chatbot scripts.");
    const injectScript = document.createElement("script");
    injectScript.src = botpressInjectScript;
    injectScript.id = "botpress-inject-script";
    injectScript.defer = true;

    injectScript.onload = () => {
      const configScript = document.createElement("script");
      configScript.src = botpressConfigScript;
      configScript.id = "botpress-config-script";
      configScript.defer = true;

      configScript.onload = () => {
        console.log(
          "[BP] Scripts loaded. Starting to poll for bot readiness...",
        );
        pollForBotpressReady();
      };
      document.head.appendChild(configScript);
    };
    document.head.appendChild(injectScript);
  }, [user]);

  return null;
};

export default BotpressChat;
