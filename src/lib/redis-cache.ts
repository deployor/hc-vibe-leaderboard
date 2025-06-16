import Redis from 'ioredis';

// User type definition
interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    display_name?: string;
    real_name?: string;
  };
}

// Create a Redis client
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Caching utility class
export class RedisCache {
  // Cache emojis for 24 hours
  private static EMOJI_CACHE_TTL = 24 * 60 * 60; // 24 hours in seconds
  private static EMOJI_CACHE_KEY = 'slack:custom_emojis';

  // Cache users for 1 hour
  private static USERS_CACHE_TTL = 60 * 60; // 1 hour in seconds
  private static USERS_CACHE_KEY = 'slack:users';

  // Cache custom emojis
  static async cacheEmojis(emojis: Record<string, string>): Promise<void> {
    await redis.set(
      this.EMOJI_CACHE_KEY, 
      JSON.stringify(emojis), 
      'EX', 
      this.EMOJI_CACHE_TTL
    );
  }

  // Retrieve cached emojis
  static async getCachedEmojis(): Promise<Record<string, string> | null> {
    const cachedEmojis = await redis.get(this.EMOJI_CACHE_KEY);
    return cachedEmojis ? JSON.parse(cachedEmojis) : null;
  }

  // Cache users
  static async cacheUsers(users: SlackUser[]): Promise<void> {
    await redis.set(
      this.USERS_CACHE_KEY, 
      JSON.stringify(users), 
      'EX', 
      this.USERS_CACHE_TTL
    );
  }

  // Retrieve cached users
  static async getCachedUsers(): Promise<SlackUser[] | null> {
    const cachedUsers = await redis.get(this.USERS_CACHE_KEY);
    return cachedUsers ? JSON.parse(cachedUsers) : null;
  }
}

// Export Redis client for potential direct use
export default redis; 