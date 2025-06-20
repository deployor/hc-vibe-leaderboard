import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, ArrowBigUp, ArrowBigDown } from "lucide-react";
import { PureMrkdwnText as MrkdwnText } from '@/lib/slack-mrkdwn';
import QuickLRU from 'quick-lru';
import { useState, useEffect } from "react";
import { ReactionIcon } from "./reaction-icon";
import { reactionMeta } from "./lib/reaction-meta";
import { Message } from "./lib/types";

const AvatarImage = ({ src, alt, fallbackInitial }: { src?: string | null; alt: string; fallbackInitial: string }) => {
    const [hasError, setHasError] = useState(false);
    useEffect(() => { setHasError(false); }, [src]);
  
    if (!src || hasError) {
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
          {fallbackInitial}
        </div>
      );
    }
    return <Image src={src} alt={alt} width={48} height={48} className="rounded-full ring-2 ring-slate-600/50" onError={() => setHasError(true)} unoptimized />;
};

function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return "just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
}

const channelCache = new QuickLRU<string, { name: string }>({ maxSize: 500, maxAge: 1000 * 60 * 60 });
const ChannelName = ({ id }: { id: string }) => {
    const [name, setName] = useState<string | null>(channelCache.has(id) ? channelCache.get(id)!.name : null);
    useEffect(() => {
        let mounted = true;
        if (!name) {
            fetch(`/api/slack/channels/${id}`).then(r => r.ok ? r.json() : null).then(data => {
                if (data && mounted) { channelCache.set(id, { name: data.name }); setName(data.name); }
            });
        }
        return () => { mounted = false; };
    }, [id, name]);
    return <p className="text-sm text-slate-400">#{name ? name : '...'}</p>;
};

export const MessageCard = ({ msg, sort }: { msg: Message, sort: string }) => {
    const score = msg.upvotes - msg.downvotes;
    const isSpecificSort = sort !== 'net_score' && sort !== 'createdAt';
    const sortMeta = reactionMeta[sort];

    return (
        <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex gap-5">
                <div className="flex flex-col items-center w-20 flex-shrink-0">
                    <div className="font-bold text-xl text-center group relative text-slate-400">
                        {isSpecificSort && sortMeta ? (
                            <div className="p-2 rounded-lg bg-slate-500/10 transition-all duration-200 w-20 h-24 flex flex-col justify-center items-center">
                                <ReactionIcon icon={sortMeta.icon} name={sortMeta.name} size={32} />
                                <div className="text-3xl font-black py-1 text-white">
                                    {msg[sort as keyof Message]}
                                </div>
                            </div>
                        ) : (
                            <div className={`p-2 rounded-lg transition-all duration-200 ${
                                score > 0 ? "bg-emerald-500/10" : score < 0 ? "bg-red-500/10" : "bg-slate-500/10"
                            }`}>
                                <ArrowBigUp size={24} className={score > 0 ? "text-emerald-400" : "text-slate-600"} />
                                <div className={`text-3xl font-black py-1 ${
                                    score > 0 ? "text-emerald-400" : score < 0 ? "text-red-400" : "text-white"
                                }`}>{score}</div>
                                <ArrowBigDown size={24} className={score < 0 ? "text-red-400" : "text-slate-600"} />
                            </div>
                        )}
                        
                        <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-48 p-4 bg-slate-900/95 border border-slate-600/50 rounded-xl text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20 backdrop-blur-md shadow-xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-emerald-400 font-medium">Upvotes:</span>
                                <span className="text-white font-bold text-lg">{msg.upvotes}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-red-400 font-medium">Downvotes:</span>
                                <span className="text-white font-bold text-lg">{msg.downvotes}</span>
                            </div>
                            <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 bg-slate-900/95 border-b border-l border-slate-600/50 rotate-45"></div>
                        </div>
                    </div>
                </div>
                <div className="flex-grow">
                    <div className="flex items-center gap-4 mb-2">
                        <AvatarImage src={msg.avatarUrl} alt={msg.userName} fallbackInitial={msg.userName.charAt(0).toUpperCase()} />
                        <div>
                            <p className="font-semibold text-white text-lg">{msg.userName}</p>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <div className="relative group">
                                    <span className="cursor-help">{getRelativeTime(new Date(msg.createdAt))}</span>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 bg-slate-900/95 border border-slate-700/50 rounded-lg text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        {new Date(msg.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                    </div>
                                </div>
                                <span className="text-slate-600">&middot;</span>
                                <ChannelName id={msg.channelId} />
                            </div>
                        </div>
                    </div>
                    <div className="text-slate-300 my-4"><MrkdwnText>{msg.content}</MrkdwnText></div>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {Object.entries(msg).map(([key, value]) => {
                            const meta = reactionMeta[key];
                            if (meta && typeof value === 'number' && value > 0 && key !== 'totalReactions') {
                                return (
                                    <div key={key} className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <ReactionIcon icon={meta.icon} name={meta.name} size={14} />
                                        <span className="font-medium text-slate-300">{value}</span>
                                    </div>
                                )
                            }
                            return null;
                        })}
                    </div>
                </div>
                <a href={`https://slack.com/archives/${msg.channelId}/p${msg.messageTs.replace(".", "")}${msg.isThreadReply && msg.threadTs ? `?thread_ts=${msg.threadTs}` : ""}`}
                    target="_blank" rel="noopener noreferrer" className="self-start text-slate-500 hover:text-blue-400 p-2 rounded-lg hover:bg-blue-500/10">
                    <ArrowRight size={20} />
                </a>
            </div>
        </motion.div>
    );
} 