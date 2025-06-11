import { sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";
import { SessionOptions } from "iron-session";

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