const WINDOW_MS = 1000; // 1s
const MAX_EVENTS = 20; // per socket per second

type Counter = { ts: number; count: number };
const counters = new Map<string, Counter>();

export function allowEvent(socketId: string, bucket: string): boolean {
  const key = `${bucket}:${socketId}`;
  const now = Date.now();
  const existing = counters.get(key);
  if (!existing || now - existing.ts > WINDOW_MS) {
    counters.set(key, { ts: now, count: 1 });
    return true;
  }
  if (existing.count < MAX_EVENTS) {
    existing.count += 1;
    return true;
  }
  return false;
}



