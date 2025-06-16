import { NextRequest, NextResponse } from "next/server";
import { WebClient } from "@slack/web-api";
import mfFetch from "make-fetch-happen";
import path from "path";

const slack = new WebClient(process.env.SLACK_MRKDWN_BOT_TOKEN || process.env.SLACK_BOT_TOKEN);

const CACHE_PATH = path.join(process.cwd(), ".emoji-cache");

// Cache for emoji list (reuse for this route)
let emojiList: Record<string, string> | null = null;
let emojiListFetchedAt = 0;
const LIST_TTL = 1000 * 60 * 60; // 1 hour

async function getEmojiList(): Promise<Record<string, string>> {
  const now = Date.now();
  if (emojiList && now - emojiListFetchedAt < LIST_TTL) return emojiList;
  const res = await slack.emoji.list();
  if (res.ok && res.emoji) {
    emojiList = res.emoji as Record<string, string>;
    emojiListFetchedAt = now;
    return emojiList;
  }
  return {};
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  // Ensure list
  const list = await getEmojiList();
  let url = list[name];
  // resolve aliases recursively max 5
  let attempts = 0;
  while (url && url.startsWith("alias:")) {
    attempts++;
    if (attempts > 5) break;
    const aliasTo = url.replace("alias:", "");
    url = list[aliasTo];
  }
  if (!url || !url.startsWith("http")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const imgRes = await mfFetch(url, { cachePath: CACHE_PATH, cache: "default" });
    if (!imgRes.ok) throw new Error("fetch failed");
    const arrayBuf = await imgRes.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuf);
    const type = imgRes.headers.get("Content-Type") || "image/png";

    return new NextResponse(uint8, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=172800", // 2 days for browsers
      },
    });
  } catch (e) {
    console.error("emoji image fetch error", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
} 