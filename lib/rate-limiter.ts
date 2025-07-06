import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";
import "server-only";

export function getRateLimiter() {
  let ratelimit: Ratelimit | undefined;

  // Add rate limiting if Upstash API keys are set, otherwise skip
  if (process.env.UPSTASH_REDIS_REST_URL) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      // Allow 5 requests per day
      limiter: Ratelimit.fixedWindow(5, "1 d"),
      analytics: true,
      prefix: "easyedit",
    });
  }
  return ratelimit;
}
export async function getIPAddress() {
  const FALLBACK_IP_ADDRESS = "0.0.0.0";
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0] ?? FALLBACK_IP_ADDRESS;
  }

  return headersList.get("x-real-ip") ?? FALLBACK_IP_ADDRESS;
}
