type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const DEFAULT_STUN = "stun:stun.l.google.com:19302";

function parseCsv(value?: string): string[] {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getIceServers(): Promise<IceServer[]> {
  const stunUrls = parseCsv(process.env.STUN_URLS);
  const stunServers: IceServer[] = (stunUrls.length ? stunUrls : [DEFAULT_STUN]).map((u) => ({ urls: u }));

  // Check for static credentials first (simpler approach)
  const staticUsername = process.env.METERED_TURN_USERNAME;
  const staticPassword = process.env.METERED_TURN_PASSWORD;
  
  // Check for API key approach
  const app = process.env.METERED_APP_NAME;
  const apiKey = process.env.METERED_API_KEY;

  // Enhanced logging for debugging
  console.log('[iceConfig] Environment check:', {
    hasStaticCreds: !!(staticUsername && staticPassword),
    hasApiKey: !!apiKey,
    hasApp: !!app,
    appName: app ? `${app.substring(0, 5)}...` : 'undefined',
    stunUrls: stunUrls.length ? stunUrls : [DEFAULT_STUN]
  });

  // Option 1: Use static credentials (from your dashboard)
  if (staticUsername && staticPassword) {
    console.log('[iceConfig] Using static TURN credentials');
    
    const turnServers: IceServer[] = [
      {
        urls: "turn:standard.relay.metered.ca:80",
        username: staticUsername,
        credential: staticPassword,
      },
      {
        urls: "turn:standard.relay.metered.ca:80?transport=tcp",
        username: staticUsername,
        credential: staticPassword,
      },
      {
        urls: "turn:standard.relay.metered.ca:443",
        username: staticUsername,
        credential: staticPassword,
      },
      {
        urls: "turns:standard.relay.metered.ca:443?transport=tcp",
        username: staticUsername,
        credential: staticPassword,
      },
    ];

    console.log('[iceConfig] Returning static ICE servers:', {
      stunCount: stunServers.length,
      turnCount: turnServers.length,
      total: stunServers.length + turnServers.length
    });

    return [...stunServers, ...turnServers];
  }

  // Option 2: Use API key to fetch dynamic credentials
  if (apiKey && app) {
    console.log('[iceConfig] Using API key to fetch dynamic credentials');
    
    try {
      const endpoint = `https://${app}.metered.live/api/v1/turn/credentials?apiKey=${encodeURIComponent(apiKey)}`;
      console.log('[iceConfig] Requesting TURN credentials from:', endpoint.replace(apiKey, '[REDACTED]'));

      const res = await fetch(endpoint, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      console.log('[iceConfig] TURN credential response status:', res.status, res.statusText);

      if (!res.ok) {
        console.error('[iceConfig] TURN credential request failed:', {
          status: res.status,
          statusText: res.statusText,
          url: endpoint.replace(apiKey, '[REDACTED]')
        });
        return stunServers;
      }

      const data = await res.json() as IceServer[];
      console.log('[iceConfig] Successfully obtained dynamic TURN credentials');

      console.log('[iceConfig] Returning dynamic ICE servers:', {
        stunCount: stunServers.length,
        turnCount: data.length,
        total: stunServers.length + data.length
      });

      return [...stunServers, ...data];
    } catch (error) {
      console.error('[iceConfig] Error requesting dynamic TURN credentials:', error);
      return stunServers;
    }
  }

  console.warn('[iceConfig] No Metered credentials configured - using STUN-only mode. Set either METERED_TURN_USERNAME/METERED_TURN_PASSWORD or METERED_API_KEY for TURN servers.');
  return stunServers;
}


