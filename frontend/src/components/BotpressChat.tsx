import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type UserMeta = {
  id: string;
  role: "student" | "tutor" | "admin";
  fullName?: string;
  jwt?: string; // your app JWT if you want user-specific API calls
};

declare global {
  interface Window {
    botpressWebChat?: any;
    __bp_initialized?: boolean;
  }
}

const BOTPRESS_CLIENT_ID =
  import.meta.env.VITE_BOTPRESS_CLIENT_ID || "<YOUR_CLIENT_ID>";
const BOTPRESS_BOT_ID = import.meta.env.VITE_BOTPRESS_BOT_ID || "<YOUR_BOT_ID>";

/** Mount once after login; it auto-updates when user changes */
export default function BotpressChat({ user }: { user: UserMeta | null }) {
  const { pathname } = useLocation();

  // Hide on auth/public routes
  const hiddenRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];
  const shouldHide = !user || hiddenRoutes.includes(pathname.toLowerCase());

  useEffect(() => {
    if (!user?.id) return;

    // 1) Ensure SDK
    const ensureScript = () =>
      new Promise<void>((resolve) => {
        if ((window as any).botpress) return resolve();
        const s = document.createElement("script");
        s.src = "https://cdn.botpress.cloud/webchat/v1/inject.js";
        s.async = true;
        s.onload = () => resolve();
        document.body.appendChild(s);
      });

    (async () => {
      await ensureScript();
      const bp = (window as any).botpress;
      if (!bp) return;

      // 2) Register "initialized" listener BEFORE init (per docs)
      // When initialized, attach the user data and open the chat
      const onInitialized = () => {
        bp.updateUser?.({
          data: {
            appUserId: user.id, // your app's user id
            role: user.role, // "student" | "tutor"
            fullName: user.fullName, // optional
            jwt: user.jwt || "", // optional, only if you want it
          },
        });
        // Open the widget once ready
        setTimeout(() => bp.open?.(), 300);
      };
      bp.on?.("webchat:initialized", onInitialized);

      // 3) Init with your Client ID
      bp.init({
        clientId: import.meta.env.VITE_BOTPRESS_CLIENT_ID as string,
        botName: "CampusLearn Assistant",
        composerPlaceholder: "Ask CampusLearn…",
      });

      // Cleanup on unmount/re-login
      return () => {
        try {
          bp.off?.("webchat:initialized", onInitialized);
        } catch {}
      };
    })();
  }, [user?.id, user?.role, user?.fullName, user?.jwt]);

  return null;
}
