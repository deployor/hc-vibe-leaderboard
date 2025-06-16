import { NextResponse } from 'next/server';
import { getSlackClient } from '@/lib/slack-client';
import { getSession } from '@/lib/session';
import { RedisCache } from '@/lib/redis-cache';

// Define the type for Slack user
interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  profile?: {
    display_name?: string;
    real_name?: string;
  };
}

export async function GET() {
  // Check if user is authenticated
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First, try to get cached users
    const cachedUsers = await RedisCache.getCachedUsers();
    if (cachedUsers) {
      return NextResponse.json(cachedUsers);
    }

    const slack = await getSlackClient();
    
    // Fetch all users
    const response = await slack.users.list({
      limit: 1000  // Adjust as needed for your workspace size
    });
    
    // Transform user data to include only necessary fields
    const users: SlackUser[] = response.members?.filter(user => 
      user.id && user.name
    ).map(user => ({
      id: user.id!,
      name: user.name!,
      real_name: user.real_name,
      profile: {
        display_name: user.profile?.display_name,
        real_name: user.profile?.real_name
      }
    })) || [];
    
    // Cache the users
    await RedisCache.cacheUsers(users);
    
    console.log(`Fetched ${users.length} users`);
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch Slack users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// Ensure this route can only be accessed by authenticated users
export const dynamic = 'force-dynamic'; 