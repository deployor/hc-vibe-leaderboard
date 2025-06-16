import { NextResponse } from 'next/server';
import { getSlackClient } from '@/lib/slack-client';
import { getSession } from '@/lib/session';
import { RedisCache } from '@/lib/redis-cache';

export async function GET() {
  // Check if user is authenticated
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First, try to get cached emojis
    const cachedEmojis = await RedisCache.getCachedEmojis();
    if (cachedEmojis) {
      return NextResponse.json(cachedEmojis);
    }

    const slack = await getSlackClient();
    
    // Fetch custom emojis
    const response = await slack.emoji.list();
    
    // Return only the custom emojis (excluding default ones)
    const customEmojis: Record<string, string> = {};
    
    if (response.ok && response.emoji) {
      for (const [name, url] of Object.entries(response.emoji)) {
        // Only include custom emojis (those with URLs)
        if (typeof url === 'string' && url.startsWith('http')) {
          customEmojis[name] = url;
        }
      }
      
      // Cache the emojis
      await RedisCache.cacheEmojis(customEmojis);
      
      console.log(`Fetched ${Object.keys(customEmojis).length} custom emojis`);
    } else {
      console.warn('Failed to fetch emojis:', response);
    }
    
    return NextResponse.json(customEmojis);
  } catch (error) {
    console.error('Failed to fetch Slack emojis:', error);
    return NextResponse.json({ error: 'Failed to fetch emojis' }, { status: 500 });
  }
}

// Ensure this route can only be accessed by authenticated users
export const dynamic = 'force-dynamic'; 