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

  const app = process.env.METERED_APP_NAME;
  const secret = process.env.METERED_SECRET_KEY;
  const expirySeconds = Number(process.env.METERED_TURN_EXPIRY_SECONDS || 3600);

  if (!app || !secret) {
    // Fallback: no TURN if not configured (still return STUN)
    return stunServers;
  }

  try {
    const endpoint = `https://${app}.metered.live/api/v1/turn/credential?secretKey=${encodeURIComponent(secret)}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiryInSeconds: expirySeconds, label: "campuslearn" }),
    });

    if (!res.ok) {
      // On failure, return STUN-only to avoid total failure
      return stunServers;
    }

    const data = (await res.json()) as { username: string; password: string };

    const turnUrls = [
      "turn:relay1.metered.ca:80",
      "turns:relay1.metered.ca:443?transport=tcp",
    ];

    const turnServers: IceServer[] = turnUrls.map((u) => ({
      urls: u,
      username: data.username,
      credential: data.password,
    }));

    return [...stunServers, ...turnServers];
  } catch {
    return stunServers;
  }
}


