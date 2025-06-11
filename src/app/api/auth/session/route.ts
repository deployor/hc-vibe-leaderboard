import { getSession } from "@/lib/session";
import { NextResponse } from "next/server";

// Ensure this route is always executed dynamically
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (session) {
    return NextResponse.json({ isLoggedIn: true });
  }
  return NextResponse.json({ isLoggedIn: false });
} 