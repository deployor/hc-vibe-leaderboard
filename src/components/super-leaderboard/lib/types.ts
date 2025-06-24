export interface Message {
    id: number;
    messageTs: string;
    channelId: string;
    channelName?: string | null;
    userId: string;
    userName: string;
    avatarUrl?: string | null;
    content: string;
    createdAt: string;
    threadTs?: string | null;
    isThreadReply?: boolean;
    parentContent?: string | null;
    parentUserName?: string | null;
    upvotes: number;
    downvotes: number;
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
    totalReactions: number;
    otherReactions: Record<string, number>;
    isPlaceholder: boolean;
}

export interface User {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  netScore: number;
  messageCount: number;
  lastMessageAt: string;
  totalUpvotes: number; totalDownvotes: number; totalYay: number; totalSob: number; totalHeart: number; totalStar: number;
  totalFire: number; totalLeek: number; totalReal: number; totalSame: number; totalSkull: number; totalEyes: number;
  totalYipee: number; totalPingGood: number; totalPingBad: number;
  givenUpvotes: number; givenDownvotes: number; givenYay: number; givenSob: number; givenHeart: number; givenStar: number;
  givenFire: number; givenLeek: number; givenReal: number; givenSame: number; givenSkull: number; givenEyes: number;
  givenYipee: number; givenPingGood: number; givenPingBad: number;
}