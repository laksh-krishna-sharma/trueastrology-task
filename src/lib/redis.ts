import Redis from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!);

export async function cacheGet(key: string) {
  return redis.get(key);
}

export async function cacheSet(key: string, value: string, ttlSeconds = 3600) {
  await redis.set(key, value, "EX", ttlSeconds);
}
