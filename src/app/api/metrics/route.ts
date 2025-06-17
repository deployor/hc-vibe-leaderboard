import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

const TOKEN = process.env.METRICS_BEARER_TOKEN || "beans";

export async function GET(req: NextRequest) {
  // Simple Bearer-token auth
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${TOKEN}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Total users
  const totalUsersRes = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM users`
  );
  const totalUsers = totalUsersRes[0]?.count ?? 0;

  // New users in last 24h
  const newUsersRes = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM users WHERE created_at >= NOW() - INTERVAL '24 hours'`
  );
  const newUsers24h = newUsersRes[0]?.count ?? 0;

  // Total reactions tracked (sum of every reaction column)
  const sumExpr = sql`upvotes + downvotes + yay + sob + heart + star + fire + leek + real + same + skull + eyes + yipee + ping_good + ping_bad`;

  const totalReactionsRes = await db.execute<{ sum: number }>(
    sql`SELECT COALESCE(SUM(${sumExpr}),0)::int AS sum FROM messages`
  );
  const totalReactions = totalReactionsRes[0]?.sum ?? 0;

  // New reactions in last 24h
  const newReactionsRes = await db.execute<{ sum: number }>(
    sql`SELECT COALESCE(SUM(${sumExpr}),0)::int AS sum FROM messages WHERE created_at >= NOW() - INTERVAL '24 hours'`
  );
  const newReactions24h = newReactionsRes[0]?.sum ?? 0;

  // Total messages
  const totalMessagesRes = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM messages`
  );
  const totalMessages = totalMessagesRes[0]?.count ?? 0;

  // Priority channels count
  const priorityChannelsRes = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM priority_channels`
  );
  const priorityChannels = priorityChannelsRes[0]?.count ?? 0;

  // Build Prometheus exposition
  const lines: string[] = [
    '# HELP leaderboard_total_users Total users known to the leaderboard',
    '# TYPE leaderboard_total_users gauge',
    `leaderboard_total_users ${totalUsers}`,

    '# HELP leaderboard_new_users_24h New users in the last 24 hours',
    '# TYPE leaderboard_new_users_24h gauge',
    `leaderboard_new_users_24h ${newUsers24h}`,

    '# HELP leaderboard_total_messages Total Slack messages tracked',
    '# TYPE leaderboard_total_messages gauge',
    `leaderboard_total_messages ${totalMessages}`,

    '# HELP leaderboard_total_reactions Total reactions counted across all messages',
    '# TYPE leaderboard_total_reactions counter',
    `leaderboard_total_reactions ${totalReactions}`,

    '# HELP leaderboard_new_reactions_24h Reactions counted in the last 24 hours',
    '# TYPE leaderboard_new_reactions_24h gauge',
    `leaderboard_new_reactions_24h ${newReactions24h}`,

    '# HELP leaderboard_priority_channels Channels configured for priority token',
    '# TYPE leaderboard_priority_channels gauge',
    `leaderboard_priority_channels ${priorityChannels}`,
  ];

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
    },
  });
} 