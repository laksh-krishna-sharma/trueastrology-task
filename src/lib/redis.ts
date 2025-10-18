import Redis from "ioredis";

let redis: Redis | null = null;

// Check if Redis is explicitly disabled
const redisDisabled = !process.env.REDIS_URL || process.env.REDIS_URL.startsWith('#');

if (redisDisabled) {
  console.log('Redis is disabled. Caching will not be available.');
} else {
  try {
    redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 5000,
    });

    // Handle connection errors gracefully
    redis.on('error', (err) => {
      console.warn('Redis connection error:', err.message);
      if (err.message.includes('NOAUTH') || err.message.includes('WRONGPASS')) {
        console.warn('Redis authentication failed. Caching will be disabled.');
        redis?.disconnect();
        redis = null;
      }
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    // Test the connection immediately
    redis.connect().catch((err) => {
      console.warn('Redis initial connection failed:', err.message);
      if (err.message.includes('NOAUTH') || err.message.includes('WRONGPASS')) {
        console.warn('Redis authentication failed. Caching will be disabled.');
        redis = null;
      }
    });
  } catch (error) {
    console.warn("Redis initialization failed:", error);
    redis = null;
  }
}

export { redis };

export async function cacheGet(key: string) {
  if (!redis) {
    console.debug('Redis not available, skipping cache get for:', key);
    return null;
  }
  try {
    const value = await redis.get(key);
    console.debug('Cache hit for:', key);
    return value;
  } catch (error) {
    console.warn('Cache get failed:', error);
    return null;
  }
}

export async function cacheSet(key: string, value: string, ttlSeconds = 3600) {
  if (!redis) {
    console.debug('Redis not available, skipping cache set for:', key);
    return;
  }
  try {
    await redis.set(key, value, "EX", ttlSeconds);
    console.debug('Cache set for:', key);
  } catch (error) {
    console.warn('Cache set failed:', error);
    // Silently fail if Redis is not available
  }
}
