# Efficient Reaction Tracking System Refactor

## Overview

This refactor implements a new efficient reaction tracking system that:

1. **Tracks ALL emoji reactions** (not just the predefined important ones)
2. **Minimizes Slack API calls** by creating placeholder records immediately
3. **Only fetches full message details** when important reactions are added
4. **Uses JSON fields** to store unlimited other emoji reactions flexibly

## Key Changes

### 1. Database Schema Updates (`src/db/schema.ts`)

#### New Fields Added to `messages` table:
- `otherReactions: json` - Stores all non-important reactions as `{emoji: count}` 
- `isPlaceholder: boolean` - Indicates if record has partial data from reaction event only

#### New Fields Added to `userStats` table:
- `otherGivenReactions: json` - Stores all non-important reactions given by user

#### New Table: `reactionEvents`
- Logs every single reaction event for analytics and debugging
- Fields: `messageTs`, `channelId`, `userId`, `reactionName`, `eventType`, `createdAt`

### 2. Reaction Categories (`src/app/api/slack/events/route.ts`)

#### Important Reactions (trigger API calls):
- **upvotes**: `["upvote", "this"]`
- **downvotes**: `["downvote"]` 
- **yay**: `["yay"]`
- **sob**: `["sob", "heavysob", "pf", "noooo", "noo", "noooovanish"]`
- **heart**: `["ohneheart", "ohnelove", "blahaj-heart", "heart", "sparkling_heart"]`
- **star**: `["star"]`
- **fire**: `["fire"]`
- **leek**: `["leeks", "leek"]`
- **real**: `["real"]`
- **same**: `["same"]`
- **skull**: `["skulk", "skull", "skull-ios"]`
- **eyes**: `["earthquakyeyes", "eyes_wtf", "eyes", "Eyes"]`
- **yipee**: `["ultrafastparrot", "yipee"]`
- **pingGood**: `["happy_ping_sock"]`
- **pingBad**: `["mad_ping_sock"]`

#### Other Reactions:
- All other emojis are tracked in the `otherReactions` JSON field
- Count stored as `{emoji_name: reaction_count}`

### 3. New Efficient Event Flow

#### When ANY reaction is added to a message:

1. **Log Event**: Insert into `reactionEvents` table for analytics
2. **Check Message Exists**: Query if message already in database
3. **Create Placeholder** (if message doesn't exist):
   ```sql
   INSERT INTO messages (
     messageTs, channelId, userId="unknown", 
     userName="Unknown User", content="Loading...",
     isPlaceholder=true, ...
   )
   ```
4. **Fill Placeholder** (if important reaction):
   - Make API call to get full message details
   - Update placeholder with real content, author, etc.
   - Set `isPlaceholder=false`
5. **Sync Reactions**: Always re-sync all reaction counts from Slack
6. **Update User Stats**: Track what reactions the user has given

### 4. API Updates

#### Messages API (`src/app/api/super-leaderboard/messages/route.ts`)
- Added filter: `eq(messages.isPlaceholder, false)` 
- Excludes incomplete placeholder records from results

#### Users API (`src/app/api/super-leaderboard/users/route.ts`)  
- Added filter: `eq(messages.isPlaceholder, false)`
- Includes `otherGivenReactions` data in user stats
- Simplified with raw SQL to avoid complex Drizzle typing issues

#### User Messages API (`src/app/api/super-leaderboard/users/[userId]/messages/route.ts`)
- Excludes placeholder records from user's top messages

### 5. Frontend Type Updates (`src/components/super-leaderboard/lib/types.ts`)

Added new fields to `Message` interface:
```typescript
interface Message {
  // ... existing fields ...
  otherReactions: Record<string, number>;
  isPlaceholder: boolean;
}
```

## Benefits

### ✅ Efficiency Gains
- **Instant Response**: Placeholder records created immediately without API calls
- **Reduced API Calls**: Only call Slack API for important reactions that matter for leaderboards
- **All Reactions Tracked**: Every emoji is now tracked in the system

### ✅ Scalability  
- **Unlimited Emojis**: JSON fields can store any new emoji without schema changes
- **Future-Proof**: New reaction types can be added to important list without migration
- **Analytics Ready**: Full event log for reaction analytics

### ✅ Data Integrity
- **No Missing Reactions**: Every reaction event is logged
- **Placeholder Handling**: Incomplete records are clearly marked and excluded from results
- **Opt-out Respect**: Still respects user opt-out preferences

## Migration Applied

Database migration `0005_first_hannibal_king.sql` was generated and applied with:
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

This adds the new JSON fields and boolean flags to existing tables.

## Next Steps

The refactored system is now ready to:
1. Handle any emoji reactions efficiently 
2. Scale to track unlimited reaction types
3. Provide rich analytics on reaction patterns
4. Support the Super Leaderboard with complete reaction data

The placeholder system ensures immediate responsiveness while the lazy-loading of full message details optimizes API usage for the reactions that matter most to the leaderboard functionality. 