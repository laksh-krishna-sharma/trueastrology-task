import Redis from "ioredis";

let redis: Redis | null = null;

try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
    });
  }
} catch (error) {
  console.warn("Redis connection failed:", error);
}

export { redis };

export async function cacheGet(key: string) {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds = 3600) {
  if (!redis) return;
  try {
    await redis.set(key, value, "EX", ttlSeconds);
  } catch {
    // Silently fail if Redis is not available
  }
}
