import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Ensure this route is always executed dynamically
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (session) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.slackUserId),
    });

    return NextResponse.json({
      isLoggedIn: true,
      user: {
        id: user?.id,
        name: user?.name,
        avatarUrl: user?.avatarUrl,
      },
    });
  }
  return NextResponse.json({ isLoggedIn: false });
} 