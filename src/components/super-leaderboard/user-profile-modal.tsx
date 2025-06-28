import { motion } from "framer-motion";
import { X, Loader } from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useMemo, useCallback } from "react";
import { MessageCard } from "./message-card";
import { ReactionIcon } from "./reaction-icon";
import { reactionMeta } from "./lib/reaction-meta";
import { Message } from "./lib/types";

interface User {
  userId: string;
  userName: string | null;
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
  otherGivenReactions: Record<string, number>;
}
import { SortSelector } from "./sort-selector";

const AvatarImage = ({ src, alt, fallbackInitial, size = 24 }: { src?: string | null; alt: string; fallbackInitial: string, size?: number }) => {
    const [hasError, setHasError] = useState(false);
    useEffect(() => { setHasError(false); }, [src]);
  
    if (!src || hasError) {
      return (
        <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
          {fallbackInitial}
        </div>
      );
    }
    return <Image src={src} alt={alt} width={size*4} height={size*4} className="rounded-full ring-2 ring-slate-600/50" onError={() => setHasError(true)} unoptimized />;
};

const StatGrid = ({ title, stats, otherReactions }: { title: string, stats: Record<string, number>, otherReactions?: Record<string, number> }) => (
    <div className="bg-slate-900/50 rounded-lg p-4">
        <h3 className="text-center font-semibold text-slate-300 mb-4">{title}</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {/* Important reactions */}
            {Object.entries(stats).map(([key, count]) => {
                const reactionName = key.replace(/^(total|given)/, '');
                const metaKey = reactionName.charAt(0).toLowerCase() + reactionName.slice(1);
                const meta = reactionMeta[metaKey];
                
                if (meta && typeof count === 'number' && count > 0) {
                    return (
                        <div key={key} className="text-center">
                            <div className="flex items-center justify-center h-8">
                                <ReactionIcon icon={meta.icon} name={meta.name} emoji={meta.emoji} size={20} className="text-slate-400" />
                            </div>
                            <div className="text-2xl font-bold text-white mt-1">{count}</div>
                            <div className="text-xs text-slate-500">{meta.name}</div>
                        </div>
                    );
                }
                return null;
            })}
            {/* Other reactions */}
            {otherReactions && Object.entries(otherReactions).map(([emojiName, count]) => {
                if (count > 0) {
                    return (
                        <div key={emojiName} className="text-center">
                            <div className="flex items-center justify-center h-8">
                                <ReactionIcon icon="" name={emojiName} emoji={emojiName} size={20} className="text-slate-400" />
                            </div>
                            <div className="text-2xl font-bold text-white mt-1">{count}</div>
                            <div className="text-xs text-slate-500 capitalize">{emojiName}</div>
                        </div>
                    );
                }
                return null;
            })}
        </div>
    </div>
);


const UserProfile = ({ user, onClose }: { user: User, onClose: () => void }) => {
    const [topMessages, setTopMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState('upvotes');

    const fetchTopMessages = useCallback(async (currentSort: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/super-leaderboard/users/${user.userId}/messages?sort=${currentSort}`);
            if (res.ok) {
                const data = await res.json();
                setTopMessages(data);
            } else {
                setTopMessages([]);
            }
        } catch (error) {
            console.error("Failed to fetch top messages", error);
            setTopMessages([]);
        } finally {
            setLoading(false);
        }
    }, [user.userId]);

    useEffect(() => {
        fetchTopMessages(sort);
    }, [sort, fetchTopMessages]);

    const receivedStats = useMemo(() => {
        return Object.fromEntries(Object.entries(user).filter(([key]) => key.startsWith('total')));
    }, [user]);

    const givenStats = useMemo(() => {
        return Object.fromEntries(Object.entries(user).filter(([key]) => key.startsWith('given')));
    }, [user]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full relative shadow-2xl text-white max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}>

                <div className="p-8 border-b border-slate-700 flex-shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24} /></button>
                    <div className="flex items-center gap-6">
                        <AvatarImage src={user.avatarUrl} alt={user.userName || ""} fallbackInitial={(user.userName || "?").charAt(0).toUpperCase()} size={24} />
                        <div>
                            <h2 className="text-3xl font-bold">{user.userName}</h2>
                            <p className="text-slate-400">Net Score: <span className={`font-bold ${user.netScore > 0 ? "text-emerald-400" : "text-red-400"}`}>{user.netScore > 0 ? '+' : ''}{user.netScore}</span></p>
                        </div>
                    </div>
                </div>

                <div className="p-8 overflow-y-auto space-y-6">
                    <StatGrid title="Reactions Received" stats={receivedStats} />
                    <StatGrid title="Reactions Given" stats={givenStats} otherReactions={user.otherGivenReactions as Record<string, number>} />

                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Top Messages</h3>
                            <SortSelector sort={sort} setSort={setSort} />
                        </div>
                        
                        {loading ? <Loader className="animate-spin mx-auto" /> : (
                            <div className="space-y-4">
                                {topMessages.length > 0 ? topMessages.map(msg => (
                                    <MessageCard key={msg.id} msg={msg} sort={sort} />
                                )) : <p className="text-slate-500 text-center py-8">No messages found for this category.</p>}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export const UserProfileModal = ({ user, onClose }: { user: User, onClose: () => void }) => {
    if (!user) {
        return null;
    }

    return <UserProfile user={user} onClose={onClose} />;
}
