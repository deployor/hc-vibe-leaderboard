import { NextResponse } from 'next/server';
import { getSlackClient } from '@/lib/slack-client';

export async function GET() {
  try {
    const slack = await getSlackClient();
    
    // Fetch all users
    const response = await slack.users.list({
      limit: 1000  // Adjust as needed for your workspace size
    });
    
    // Transform user data to include only necessary fields
    const users = response.members?.map(user => ({
      id: user.id,
      name: user.name,
      real_name: user.real_name,
      profile: {
        display_name: user.profile?.display_name,
        real_name: user.profile?.real_name
      }
    })) || [];
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch Slack users:', error);
    return NextResponse.json([], { status: 500 });
  }
}

// Ensure this route can only be accessed by authenticated users
export const dynamic = 'force-dynamic'; 