import { sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";
import { SessionOptions } from "iron-session";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { WebClient } from "@slack/web-api";

export interface SessionData {
  slackUserId: string;
  teamId: string;
  accessToken: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.JWT_SECRET!,
  cookieName: "global-vibe-leaderboard-session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // one week
    path: "/",
  },
};

export async function getSession(): Promise<SessionData | null> {
  const cookie = (await cookies()).get(sessionOptions.cookieName)?.value;

  if (!cookie) return null;

  try {
    const session = await unsealData<SessionData>(cookie, {
      password: sessionOptions.password,
    });

    if (!session || !session.slackUserId) {
      console.error("Invalid session data found after unsealing. Deleting cookie.", session);
      await deleteSession();
      return null;
    }

    const userExists = await db.query.users.findFirst({
        where: eq(users.id, session.slackUserId),
    });

    if (!userExists) {
        console.log(`Back-filling user ${session.slackUserId} into the database.`);
        const botSlack = new WebClient(process.env.SLACK_BOT_TOKEN);
        const userInfo = await botSlack.users.info({ user: session.slackUserId });

        if (userInfo.ok && userInfo.user) {
            const { user } = userInfo;
            await db.insert(users).values({
                id: session.slackUserId,
                teamId: session.teamId,
                name: user.profile?.display_name || user.name || "Unknown",
                avatarUrl: user.profile?.image_72,
                updatedAt: new Date(),
            }).onConflictDoUpdate({
                target: users.id,
                set: {
                    name: user.profile?.display_name || user.name || "Unknown",
                    avatarUrl: user.profile?.image_72,
                    teamId: session.teamId,
                    updatedAt: new Date(),
                }
            });
        }
    }

    return session;
  } catch (error) {
    console.error("Failed to unseal session", error);
    return null;
  }
}

export async function createSession(data: SessionData) {
  const sealedData = await sealData(data, {
    password: sessionOptions.password,
  });

  (await cookies()).set(sessionOptions.cookieName, sealedData, sessionOptions.cookieOptions);
}

export async function deleteSession() {
  (await cookies()).delete(sessionOptions.cookieName);
}
