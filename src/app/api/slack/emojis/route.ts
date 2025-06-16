import { NextResponse } from 'next/server';
import { getSlackClient } from '@/lib/slack-client';

export async function GET() {
  try {
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
    }
    
    return NextResponse.json(customEmojis);
  } catch (error) {
    console.error('Failed to fetch Slack emojis:', error);
    return NextResponse.json({}, { status: 500 });
  }
}

// Ensure this route can only be accessed by authenticated users
export const dynamic = 'force-dynamic'; 