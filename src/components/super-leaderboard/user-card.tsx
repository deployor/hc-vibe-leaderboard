import { motion } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";

interface User {
    userId: string;
    userName: string | null;
    avatarUrl?: string | null;
    netScore: number;
    messageCount: number;
    lastMessageAt: string;
}

const AvatarImage = ({ src, alt, fallbackInitial, size = 16 }: { src?: string | null; alt: string; fallbackInitial: string, size?: number }) => {
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

export const UserCard = ({ user, onClick }: { user: User, onClick: () => void }) => {
    return (
        <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            onClick={onClick}
            className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-6 backdrop-blur-sm cursor-pointer hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-5">
                <div onClick={(e) => { e.stopPropagation(); onClick(); }} className="cursor-pointer">
                    <AvatarImage src={user.avatarUrl} alt={user.userName || ""} fallbackInitial={(user.userName || "?").charAt(0).toUpperCase()} size={16} />
                </div>
                <div className="flex-grow">
                    <p className="font-semibold text-white text-xl">{user.userName}</p>
                    <p className="text-sm text-slate-400">
                        Last active: {user.lastMessageAt ? getRelativeTime(new Date(user.lastMessageAt)) : "N/A"}
                    </p>
                </div>
                <div className="text-right flex-shrink-0 w-24">
                    <p className={`font-bold text-2xl ${user.netScore > 0 ? "text-emerald-400" : user.netScore < 0 ? "text-red-400" : "text-slate-300"}`}>{user.netScore > 0 ? '+' : ''}{user.netScore}</p>
                    <p className="text-xs text-slate-500">Net Score</p>
                </div>
                <div className="text-right flex-shrink-0 w-24">
                    <p className="font-bold text-2xl text-blue-400">{user.messageCount}</p>
                    <p className="text-xs text-slate-500">Messages</p>
                </div>
            </div>
        </motion.div>
    )
}
