import "server-only";

const windows = new Map<string, { startedAt: number; count: number }>();

export function consumeAiRateLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    windows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
