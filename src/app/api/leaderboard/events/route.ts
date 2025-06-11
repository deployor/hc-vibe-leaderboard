import { NextRequest } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

// This function is an SSE endpoint that keeps a connection open
// and sends a message to the client when the leaderboard data has changed.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Create a transform stream to pipe data through
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  let lastKnownUpdate = new Date(0); // Initialize with a very old date

  const sendUpdate = (data: string) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };
  
  // This function will run periodically to check for database updates
  const checkForUpdates = async () => {
    try {
      const latestUpdate = await db.select({
          max: sql<string>`max(${messages.updatedAt})` 
        }).from(messages).then(res => res[0]?.max ? new Date(res[0].max) : new Date(0));
        
      if (latestUpdate.getTime() > lastKnownUpdate.getTime()) {
        if (lastKnownUpdate.getTime() !== new Date(0).getTime()) {
            sendUpdate("refresh");
        }
        lastKnownUpdate = latestUpdate;
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
    }
  };

  // Run the check immediately on connection, then every 3 seconds
  checkForUpdates(); 
  const intervalId = setInterval(checkForUpdates, 3000);

  // Clean up when the client disconnects
  req.signal.addEventListener("abort", () => {
    clearInterval(intervalId);
    writer.close();
  });

  // Return a streaming response
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
} 