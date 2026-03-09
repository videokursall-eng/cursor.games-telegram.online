import { Request, Response, NextFunction } from "express";

type Bucket = {
  tokens: number;
  lastRefill: number;
};

const buckets = new Map<string, Bucket>();

const MAX_TOKENS = 60;
const REFILL_INTERVAL_MS = 1000;
const REFILL_AMOUNT = 10;

function getKey(req: Request): string {
  const ip = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
  return ip;
}

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = getKey(req);
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    buckets.set(key, bucket);
  }

  const delta = now - bucket.lastRefill;
  if (delta > REFILL_INTERVAL_MS) {
    const refill = Math.floor(delta / REFILL_INTERVAL_MS) * REFILL_AMOUNT;
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + refill);
    bucket.lastRefill = now;
  }

  if (bucket.tokens <= 0) {
    res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests" } });
    return;
  }

  bucket.tokens -= 1;
  next();
}

