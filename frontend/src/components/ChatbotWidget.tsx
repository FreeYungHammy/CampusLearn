import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    botpressWebchat?: any;
    __bpReady?: boolean;
  }
}

export default function ChatbotWidget() {
  const { pathname } = useLocation();

  // Init once with live auth metadata
  useEffect(() => {
    const init = () => {
      const bp = window.botpressWebchat;
      if (!bp) return setTimeout(init, 200);

      const jwt = localStorage.getItem("access_token") || "";
      const userId =
        (window as any).currentUser?.id ||
        localStorage.getItem("user_id") ||
        "";

      bp.init({ metadata: { jwt, userId, page: pathname } });
      bp.sendEvent({ type: "show" });
      window.__bpReady = true;
    };
    if (!window.__bpReady) init();
  }, []);

  // Keep page context updated
  useEffect(() => {
    if (!window.__bpReady) return;
    window.botpressWebchat?.sendEvent({
      type: "custom",
      payload: { page: pathname },
    });
  }, [pathname]);

  return null;
}
