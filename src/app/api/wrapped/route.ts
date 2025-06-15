import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, userStats } from "@/db/schema";
import { desc, sql, and, gt, lt } from "drizzle-orm";
import { getSession } from "@/lib/session";

interface WrappedResponse {
  month: string; // YYYY-MM
  totalReactions?: number;
  reactionBreakdown?: {
    yay: number;
    sob: number;
    heart: number;
    star: number;
    fire: number;
    leek: number;
    real: number;
    same: number;
    skull: number;
    eyes: number;
    yipee: number;
    pingGood: number;
    pingBad: number;
  };
  topUpvotedMessage?: {
    id: number;
    userName: string;
    avatarUrl?: string | null;
    content: string;
    upvotes: number;
    downvotes: number;
    createdAt: string;
  };
  topUpvotedUser?: {
    userId: string;
    userName: string;
    avatarUrl?: string | null;
    totalUpvotes: number;
    netScore: number;
  };
  topSupporter?: {
    userId: string;
    userName: string;
    avatarUrl?: string | null;
    givenUpvotes: number;
  };
  topStarredMessage?: {
    id: number;
    userName: string;
    avatarUrl?: string | null;
    content: string;
    stars: number;
    createdAt: string;
  };
  mostLovedMessage?: {
    id: number;
    userName: string;
    avatarUrl?: string | null;
    content: string;
    netScore: number;
    createdAt: string;
  };
  mostHatedMessage?: {
    id: number;
    userName: string;
    avatarUrl?: string | null;
    content: string;
    downvotes: number;
    createdAt: string;
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // expecting YYYY-MM

  // Determine date range for target month (default current month UTC)
  const now = new Date();
  let targetYear = now.getUTCFullYear();
  let targetMonth = now.getUTCMonth(); // 0-indexed

  if (monthParam) {
    const [y, m] = monthParam.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      targetYear = y;
      targetMonth = m - 1; // convert to 0-indexed
    }
  }

  const startDate = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(targetYear, targetMonth + 1, 1, 0, 0, 0));

  const response: WrappedResponse = {
    month: `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`,
  };

  try {
    // Calculate total reactions and breakdown
    const reactionBreakdownResult = await db
      .select({
        yay: sql<number>`SUM(${messages.yay})`.as("yay"),
        sob: sql<number>`SUM(${messages.sob})`.as("sob"),
        heart: sql<number>`SUM(${messages.heart})`.as("heart"),
        star: sql<number>`SUM(${messages.star})`.as("star"),
        fire: sql<number>`SUM(${messages.fire})`.as("fire"),
        leek: sql<number>`SUM(${messages.leek})`.as("leek"),
        real: sql<number>`SUM(${messages.real})`.as("real"),
        same: sql<number>`SUM(${messages.same})`.as("same"),
        skull: sql<number>`SUM(${messages.skull})`.as("skull"),
        eyes: sql<number>`SUM(${messages.eyes})`.as("eyes"),
        yipee: sql<number>`SUM(${messages.yipee})`.as("yipee"),
        pingGood: sql<number>`SUM(${messages.pingGood})`.as("pingGood"),
        pingBad: sql<number>`SUM(${messages.pingBad})`.as("pingBad"),
      })
      .from(messages)
      .where(and(gt(messages.createdAt, startDate), lt(messages.createdAt, endDate)))
      .execute();

    const reactionBreakdown = reactionBreakdownResult[0] || {};

    response.reactionBreakdown = {
      yay: Number(reactionBreakdown.yay) || 0,
      sob: Number(reactionBreakdown.sob) || 0,
      heart: Number(reactionBreakdown.heart) || 0,
      star: Number(reactionBreakdown.star) || 0,
      fire: Number(reactionBreakdown.fire) || 0,
      leek: Number(reactionBreakdown.leek) || 0,
      real: Number(reactionBreakdown.real) || 0,
      same: Number(reactionBreakdown.same) || 0,
      skull: Number(reactionBreakdown.skull) || 0,
      eyes: Number(reactionBreakdown.eyes) || 0,
      yipee: Number(reactionBreakdown.yipee) || 0,
      pingGood: Number(reactionBreakdown.pingGood) || 0,
      pingBad: Number(reactionBreakdown.pingBad) || 0,
    };

    // Calculate total reactions
    response.totalReactions = Object.values(response.reactionBreakdown).reduce((a, b) => a + b, 0);

    // Top upvoted message in month
    const topMessage = await db
      .select()
      .from(messages)
      .where(and(gt(messages.createdAt, startDate), lt(messages.createdAt, endDate)))
      .orderBy(desc(messages.upvotes))
      .limit(1);

    if (topMessage.length > 0) {
      const m = topMessage[0];
      response.topUpvotedMessage = {
        id: m.id,
        userName: m.userName,
        avatarUrl: m.avatarUrl,
        content: m.content,
        upvotes: m.upvotes,
        downvotes: m.downvotes,
        createdAt: m.createdAt.toISOString(),
      };
    }

    // Top starred message in month
    const topStarMsg = await db
      .select()
      .from(messages)
      .where(and(gt(messages.createdAt, startDate), lt(messages.createdAt, endDate)))
      .orderBy(desc(messages.star))
      .limit(1);

    if (topStarMsg.length > 0 && topStarMsg[0].star > 0) {
      const s = topStarMsg[0];
      response.topStarredMessage = {
        id: s.id,
        userName: s.userName,
        avatarUrl: s.avatarUrl,
        content: s.content,
        stars: s.star,
        createdAt: s.createdAt.toISOString(),
      };
    }

    // Most Loved Message (highest net score)
    const mostLoved = await db
      .select({
        id: messages.id,
        userName: messages.userName,
        avatarUrl: messages.avatarUrl,
        content: messages.content,
        netScore: sql<number>`${messages.upvotes} - ${messages.downvotes}`,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(gt(messages.createdAt, startDate), lt(messages.createdAt, endDate)))
      .orderBy(desc(sql`${messages.upvotes} - ${messages.downvotes}`))
      .limit(1);

    if (mostLoved.length > 0 && mostLoved[0].netScore > 0) {
      const m = mostLoved[0];
      response.mostLovedMessage = {
        id: m.id,
        userName: m.userName,
        avatarUrl: m.avatarUrl,
        content: m.content,
        netScore: m.netScore,
        createdAt: m.createdAt.toISOString(),
      };
    }

    // Most Hated Message (most downvotes)
    const mostHated = await db
      .select()
      .from(messages)
      .where(and(gt(messages.createdAt, startDate), lt(messages.createdAt, endDate), gt(messages.downvotes, 0)))
      .orderBy(desc(messages.downvotes))
      .limit(1);

    if (mostHated.length > 0) {
      const m = mostHated[0];
      response.mostHatedMessage = {
        id: m.id,
        userName: m.userName,
        avatarUrl: m.avatarUrl,
        content: m.content,
        downvotes: m.downvotes,
        createdAt: m.createdAt.toISOString(),
      };
    }

    // Top upvoted user in month (aggregate by user)
    const topUserAgg = await db
      .select({
        userId: messages.userId,
        userName: messages.userName,
        avatarUrl: messages.avatarUrl,
        totalUpvotes: sql<number>`SUM(${messages.upvotes})`.as("totalUpvotes"),
        totalDownvotes: sql<number>`SUM(${messages.downvotes})`.as("totalDownvotes"),
      })
      .from(messages)
      .where(and(gt(messages.createdAt, startDate), lt(messages.createdAt, endDate)))
      .groupBy(messages.userId, messages.userName, messages.avatarUrl)
      .orderBy(desc(sql`SUM(${messages.upvotes}) - SUM(${messages.downvotes})`))
      .limit(1);

    if (topUserAgg.length > 0) {
      const u = topUserAgg[0];
      response.topUpvotedUser = {
        userId: u.userId,
        userName: u.userName,
        avatarUrl: u.avatarUrl,
        totalUpvotes: u.totalUpvotes,
        netScore: u.totalUpvotes - u.totalDownvotes,
      };
    }

    // Biggest supporter (most given upvotes overall; not filtered by month due to lack of timestamp)
    const topSupporter = await db
      .select()
      .from(userStats)
      .orderBy(desc(userStats.givenUpvotes))
      .limit(1);

    if (topSupporter.length > 0) {
      const s = topSupporter[0];
      response.topSupporter = {
        userId: s.userId,
        userName: s.userName,
        avatarUrl: s.avatarUrl,
        givenUpvotes: s.givenUpvotes,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to generate wrapped data", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
} 