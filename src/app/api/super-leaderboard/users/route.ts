import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "all";
  const sort = searchParams.get("sort") ?? "net_score";
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const search = searchParams.get("search");

  // Build query string manually to avoid complex Drizzle typing issues
  let queryText = `
    WITH agg AS (
      SELECT 
        user_id,
        user_name,
        avatar_url,
        SUM(upvotes) as total_upvotes,
        SUM(downvotes) as total_downvotes,
        SUM(yay) as total_yay,
        SUM(sob) as total_sob,
        SUM(heart) as total_heart,
        SUM(star) as total_star,
        SUM(fire) as total_fire,
        SUM(leek) as total_leek,
        SUM(real) as total_real,
        SUM(same) as total_same,
        SUM(skull) as total_skull,
        SUM(eyes) as total_eyes,
        SUM(yipee) as total_yipee,
        SUM(ping_good) as total_ping_good,
        SUM(ping_bad) as total_ping_bad,
        SUM(upvotes) - SUM(downvotes) as net_score,
        COUNT(*) as message_count,
        MAX(created_at) as last_message_at
      FROM messages 
      WHERE total_reactions > 0 
        AND channel_id != 'C0710J7F4U9' 
        AND user_id != 'U023L3A4UKX'
        AND is_placeholder = false
        AND user_id != 'unknown'
        AND user_name != 'Unknown User'
        AND user_name != 'Unknown'
        AND user_name IS NOT NULL
        AND user_name != ''
  `;

  // Add time filter
  if (filter === "day") {
    queryText += ` AND created_at > NOW() - INTERVAL '1 day'`;
  } else if (filter === "week") {
    queryText += ` AND created_at > NOW() - INTERVAL '7 days'`;
  } else if (filter === "month") {
    queryText += ` AND created_at > NOW() - INTERVAL '1 month'`;
  } else if (filter === "year") {
    queryText += ` AND created_at > NOW() - INTERVAL '1 year'`;
  }

  queryText += `
      GROUP BY user_id, user_name, avatar_url
    )
    SELECT 
      agg.user_id,
      COALESCE(u.name, us.user_name, agg.user_name) as user_name,
      COALESCE(u.avatar_url, us.avatar_url, agg.avatar_url) as avatar_url,
      agg.total_upvotes,
      agg.total_downvotes,
      agg.total_yay,
      agg.total_sob,
      agg.total_heart,
      agg.total_star,
      agg.total_fire,
      agg.total_leek,
      agg.total_real,
      agg.total_same,
      agg.total_skull,
      agg.total_eyes,
      agg.total_yipee,
      agg.total_ping_good,
      agg.total_ping_bad,
      agg.net_score,
      agg.message_count,
      agg.last_message_at,
      COALESCE(us.given_upvotes, 0) as given_upvotes,
      COALESCE(us.given_downvotes, 0) as given_downvotes,
      COALESCE(us.given_yay, 0) as given_yay,
      COALESCE(us.given_sob, 0) as given_sob,
      COALESCE(us.given_heart, 0) as given_heart,
      COALESCE(us.given_star, 0) as given_star,
      COALESCE(us.given_fire, 0) as given_fire,
      COALESCE(us.given_leek, 0) as given_leek,
      COALESCE(us.given_real, 0) as given_real,
      COALESCE(us.given_same, 0) as given_same,
      COALESCE(us.given_skull, 0) as given_skull,
      COALESCE(us.given_eyes, 0) as given_eyes,
      COALESCE(us.given_yipee, 0) as given_yipee,
      COALESCE(us.given_ping_good, 0) as given_ping_good,
      COALESCE(us.given_ping_bad, 0) as given_ping_bad,
      COALESCE(us.other_given_reactions, '{}') as other_given_reactions
    FROM agg
    LEFT JOIN user_stats us ON agg.user_id = us.user_id
    LEFT JOIN users u ON agg.user_id = u.id
  `;

  const conditions = ["agg.message_count > 0"];
  if (search) {
    conditions.push(`COALESCE(u.name, us.user_name, agg.user_name) ILIKE '%${search.replace(/'/g, "''")}%'`);
  }
  queryText += ` WHERE ${conditions.join(" AND ")}`;

  // Add sorting
  if (sort === "net_score") {
    queryText += ` ORDER BY net_score DESC`;
  } else if (sort === "totalUpvotes") {
    queryText += ` ORDER BY total_upvotes DESC`;
  } else if (sort === "totalDownvotes") {
    queryText += ` ORDER BY total_downvotes DESC`;
  } else if (sort === "messageCount") {
    queryText += ` ORDER BY message_count DESC`;
  } else if (sort === "lastMessageAt") {
    queryText += ` ORDER BY last_message_at DESC`;
  } else {
    queryText += ` ORDER BY net_score DESC`;
  }

  queryText += ` LIMIT ${limit} OFFSET ${offset}`;

  const result = await db.execute(sql.raw(queryText));

  return NextResponse.json(result);
}
