import Redis from 'ioredis';

// In-memory fallback cache
const memoryCache: {
  emojis?: { data: Record<string, string>, timestamp: number },
  users?: { data: SlackUser[], timestamp: number }
} = {};

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

// Create a Redis client with robust error handling
let redis: Redis | null = null;
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    connectTimeout: 5000,
    retryStrategy: (times) => {
      // Stop reconnecting after 5 attempts
      if (times > 5) {
        console.warn('Redis: Max reconnection attempts reached');
        return null;
      }
      // Exponential backoff
      return Math.min(times * 1000, 30000);
    }
  });

  redis.on('error', (err) => {
    console.error('Redis Error:', err);
    redis = null;
  });
} catch (error) {
  console.error('Failed to create Redis client:', error);
}

// Caching utility class
export class RedisCache {
  // Cache duration constants
  private static EMOJI_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private static USERS_CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

  // Cache custom emojis
  static async cacheEmojis(emojis: Record<string, string>): Promise<void> {
    // Memory cache fallback
    memoryCache.emojis = {
      data: emojis,
      timestamp: Date.now()
    };

    // Try Redis if available
    if (redis) {
      try {
        await redis.set('slack:custom_emojis', JSON.stringify(emojis));
        await redis.expire('slack:custom_emojis', 24 * 60 * 60); // 24 hours
      } catch (error) {
        console.error('Redis emoji caching failed:', error);
      }
    }
  }

  // Retrieve cached emojis
  static async getCachedEmojis(): Promise<Record<string, string> | null> {
    // Check memory cache first
    if (memoryCache.emojis && 
        (Date.now() - memoryCache.emojis.timestamp) < this.EMOJI_CACHE_TTL) {
      return memoryCache.emojis.data;
    }

    // Try Redis if available
    if (redis) {
      try {
        const cachedEmojis = await redis.get('slack:custom_emojis');
        if (cachedEmojis) {
          const parsedEmojis = JSON.parse(cachedEmojis);
          // Update memory cache
          memoryCache.emojis = {
            data: parsedEmojis,
            timestamp: Date.now()
          };
          return parsedEmojis;
        }
      } catch (error) {
        console.error('Redis emoji retrieval failed:', error);
      }
    }

    return null;
  }

  // Cache users
  static async cacheUsers(users: SlackUser[]): Promise<void> {
    // Memory cache fallback
    memoryCache.users = {
      data: users,
      timestamp: Date.now()
    };

    // Try Redis if available
    if (redis) {
      try {
        await redis.set('slack:users', JSON.stringify(users));
        await redis.expire('slack:users', 60 * 60); // 1 hour
      } catch (error) {
        console.error('Redis users caching failed:', error);
      }
    }
  }

  // Retrieve cached users
  static async getCachedUsers(): Promise<SlackUser[] | null> {
    // Check memory cache first
    if (memoryCache.users && 
        (Date.now() - memoryCache.users.timestamp) < this.USERS_CACHE_TTL) {
      return memoryCache.users.data;
    }

    // Try Redis if available
    if (redis) {
      try {
        const cachedUsers = await redis.get('slack:users');
        if (cachedUsers) {
          const parsedUsers = JSON.parse(cachedUsers);
          // Update memory cache
          memoryCache.users = {
            data: parsedUsers,
            timestamp: Date.now()
          };
          return parsedUsers;
        }
      } catch (error) {
        console.error('Redis users retrieval failed:', error);
      }
    }

    return null;
  }
}

// Export a fallback export to prevent import errors
export default {
  RedisCache,
  redis
}; 