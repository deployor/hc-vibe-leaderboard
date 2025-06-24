"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowBigUp, ArrowBigDown, ArrowRight, LogOut, Calendar, Clock, TrendingUp, Globe, ThumbsUp, ThumbsDown, Loader, Info, X, MessageSquare, Users, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { LucideIcon } from "lucide-react";
import { PureMrkdwnText as MrkdwnText } from '@/lib/slack-mrkdwn';
import QuickLRU from 'quick-lru';

declare global {
  interface Window {
    umami?: {
      track: (event: string | Record<string, unknown>, data?: Record<string, unknown>) => void;
      identify: (id: string, data?: Record<string, unknown>) => void;
    };
  }
}

interface Message {
  id: number;
  messageTs: string;
  channelId: string;
  channelName?: string | null;
  userName: string;
  avatarUrl?: string | null;
  content: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  // Thread support fields
  threadTs?: string | null;
  isThreadReply?: boolean;
  parentContent?: string | null;
  parentUserName?: string | null;
}

interface User {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  totalUpvotes: number;
  totalDownvotes: number;
  netScore: number;
  messageCount: number;
  lastMessageAt: string;
  givenUpvotes: number;
  givenDownvotes: number;
}

const PAGE_SIZE = 20;

const AvatarImage = ({ src, alt, fallbackInitial }: { src?: string | null; alt: string; fallbackInitial: string }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src) {
    return (
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
        {fallbackInitial}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 ring-2 ring-slate-600/50">
        <UserIcon size={24} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={48}
      height={48}
      className="rounded-full ring-2 ring-slate-600/50"
      onError={() => setHasError(true)}
      unoptimized
    />
  );
};

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return "just now";
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths === 1 ? '' : 's'} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears === 1 ? '' : 's'} ago`;
}

function LogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (res.ok) {
      router.push("/");
    } else {
      // Handle logout error if needed
      console.error("Logout failed");
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-200 backdrop-blur-sm"
    >
      <LogOut className="mr-2 h-4 w-4 inline" /> Logout
    </button>
  );
}

const ControlButton = ({
  label,
  icon: Icon,
  isActive,
  onClick,
  activeGradient,
}: {
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: () => void;
  activeGradient: string;
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05, rotate: -2 }}
      whileTap={{ scale: 0.95 }}
      className="relative"
      style={{ rotate: -1 }}
    >
      <button
        onClick={onClick}
        className={`relative p-0.5 rounded-lg overflow-hidden transition-all duration-300 ${isActive ? activeGradient : "bg-slate-700"}`}
      >
        <div className="relative bg-slate-800/90 hover:bg-slate-800/80 backdrop-blur-sm px-5 py-2.5 rounded-[5px] transition-all duration-300">
          <span className={`flex items-center justify-center font-semibold transition-colors duration-300 ${isActive ? "text-white" : "text-slate-300"}`}>
            <Icon size={16} className="mr-2" />
            {label}
          </span>
        </div>
      </button>
    </motion.div>
  );
};

const FilterButton = ({
  label,
  icon: Icon,
  filter,
  setFilter,
}: {
  label: string;
  icon: LucideIcon;
  filter: string;
  setFilter: (filter: string) => void;
}) => {
  const filterKey = label.toLowerCase().replace(" ", "");
  const isActive = filter === filterKey;
  
  return (
    <ControlButton
      label={label}
      icon={Icon}
      isActive={isActive}
      onClick={() => setFilter(filterKey)}
      activeGradient="bg-gradient-to-r from-blue-500 to-purple-500"
    />
  );
};

const SortButton = ({
  label,
  icon: Icon,
  sort,
  setSort,
}: {
  label: string;
  icon: LucideIcon;
  sort: string;
  setSort: (sort: string) => void;
}) => {
  const sortKey = label.toLowerCase().replace("most ", "");
  const isActive = sort === sortKey;
  
  return (
    <ControlButton
      label={label}
      icon={Icon}
      isActive={isActive}
      onClick={() => setSort(sortKey)}
      activeGradient="bg-gradient-to-r from-emerald-500 to-blue-500"
    />
  );
};

const ViewButton = ({
  label,
  icon: Icon,
  view,
  setView,
}: {
  label: string;
  icon: LucideIcon;
  view: string;
  setView: (view: string) => void;
}) => {
  const viewKey = label.toLowerCase();
  const isActive = view === viewKey;
  
  return (
    <ControlButton
      label={label}
      icon={Icon}
      isActive={isActive}
      onClick={() => setView(viewKey)}
      activeGradient="bg-gradient-to-r from-purple-500 to-pink-500"
    />
  );
};

const UserCard = ({ user, index }: { user: User; index: number }) => {
  const scoreColor =
    user.netScore > 0 ? "text-emerald-400" : user.netScore < 0 ? "text-red-400" : "text-slate-400";

  return (
    <motion.div
      layout
      layoutId={`user-${user.userId}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ 
        layout: { duration: 0.5, ease: "easeInOut" },
        opacity: { duration: 0.3 },
        y: { duration: 0.3, delay: index * 0.02 }
      }}
      className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 hover:border-slate-600/50 rounded-xl p-6 shadow-xl backdrop-blur-sm transition-all duration-200 hover:shadow-2xl hover:scale-[1.02]"
    >
      <div className="flex gap-5">
        <div className="flex flex-col items-center w-20 flex-shrink-0">
          <div className={`font-bold text-xl ${scoreColor} text-center group relative`}>
            <div className={`p-2 rounded-lg transition-all duration-200 ${
              user.netScore > 0 ? "bg-emerald-500/10" : user.netScore < 0 ? "bg-red-500/10" : "bg-slate-500/10"
            }`}>
              <ArrowBigUp size={24} className={user.netScore > 0 ? "text-emerald-400" : "text-slate-600"} />
              <div className="text-3xl font-black py-1">{user.netScore}</div>
              <ArrowBigDown size={24} className={user.netScore < 0 ? "text-red-400" : "text-slate-600"} />
            </div>
            
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-44 p-4 bg-slate-900/95 border border-slate-600/50 rounded-xl text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20 backdrop-blur-md shadow-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Image src="/api/slack/emoji/upvote" alt="upvote" width={16} height={16} unoptimized />
                  Total Upvotes:
                </span>
                <span className="text-white font-bold text-lg">{user.totalUpvotes}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-red-400 font-medium flex items-center gap-1">
                  <Image src="/api/slack/emoji/downvote" alt="downvote" width={16} height={16} unoptimized />
                  Total Downvotes:
                </span>
                <span className="text-white font-bold text-lg">{user.totalDownvotes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-400 font-medium">Messages:</span>
                <span className="text-white font-bold text-lg">{user.messageCount}</span>
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 bg-slate-900/95 border-b border-l border-slate-600/50 rotate-45"></div>
            </div>
          </div>
        </div>

        <div className="flex-grow">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-12 h-12">
              <AvatarImage
                src={user.avatarUrl}
                alt={user.userName}
                fallbackInitial={user.userName.charAt(0).toUpperCase()}
              />
            </div>
            <div>
              <p className="font-semibold text-white text-lg">{user.userName}</p>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <p className="text-sm text-slate-400 flex items-center gap-1 cursor-help">
                    <Clock size={12} />
                    Last message {getRelativeTime(new Date(user.lastMessageAt))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
              <h4 className="text-xs text-slate-400 uppercase tracking-wide mb-3 text-center font-semibold">Reactions Received</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{user.totalUpvotes}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Total Upvotes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{user.totalDownvotes}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Total Downvotes</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-400">{user.messageCount}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Messages</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/30">
              <h4 className="text-xs text-slate-400 uppercase tracking-wide mb-3 text-center font-semibold">Reactions Given</h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{user.givenUpvotes}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Upvotes Given</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{user.givenDownvotes}</div>
                  <div className="text-xs text-slate-400 uppercase tracking-wide">Downvotes Given</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const MessageCard = ({ msg, index }: { msg: Message; index: number }) => {
  const score = msg.upvotes - msg.downvotes;
  const scoreColor =
    score > 0 ? "text-emerald-400" : score < 0 ? "text-red-400" : "text-slate-400";

  return (
    <motion.div
      layout
      layoutId={`message-${msg.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ 
        layout: { duration: 0.5, ease: "easeInOut" },
        opacity: { duration: 0.3 },
        y: { duration: 0.3, delay: index * 0.02 }
      }}
      className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 hover:border-slate-600/50 rounded-xl p-6 shadow-xl backdrop-blur-sm transition-all duration-200 hover:shadow-2xl hover:scale-[1.02]"
    >
      <div className="flex gap-5">
        <div className="flex flex-col items-center w-20 flex-shrink-0">
          <div className={`font-bold text-xl ${scoreColor} text-center group relative`}>
            <div className={`p-2 rounded-lg transition-all duration-200 ${
              score > 0 ? "bg-emerald-500/10" : score < 0 ? "bg-red-500/10" : "bg-slate-500/10"
            }`}>
              <ArrowBigUp size={24} className={score > 0 ? "text-emerald-400" : "text-slate-600"} />
              <div className="text-3xl font-black py-1">{score}</div>
              <ArrowBigDown size={24} className={score < 0 ? "text-red-400" : "text-slate-600"} />
            </div>
            
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 w-44 p-4 bg-slate-900/95 border border-slate-600/50 rounded-xl text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20 backdrop-blur-md shadow-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Image src="/api/slack/emoji/upvote" alt="upvote" width={16} height={16} unoptimized />
                  Upvotes:
                </span>
                <span className="text-white font-bold text-lg">{msg.upvotes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-400 font-medium flex items-center gap-1">
                  <Image src="/api/slack/emoji/downvote" alt="downvote" width={16} height={16} unoptimized />
                  Downvotes:
                </span>
                <span className="text-white font-bold text-lg">{msg.downvotes}</span>
              </div>
              <div className="absolute top-1/2 -translate-y-1/2 -left-2 w-4 h-4 bg-slate-900/95 border-b border-l border-slate-600/50 rotate-45"></div>
            </div>
          </div>
        </div>

        <div className="flex-grow">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative w-12 h-12">
              <AvatarImage
                src={msg.avatarUrl}
                alt={msg.userName}
                fallbackInitial={msg.userName.charAt(0).toUpperCase()}
              />
            </div>
            <div>
              <p className="font-semibold text-white text-lg">{msg.userName}</p>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <p className="text-sm text-slate-400 flex items-center gap-1 cursor-help">
                    <Clock size={12} />
                    {getRelativeTime(new Date(msg.createdAt))}
                  </p>
                  
                  <div className="absolute left-0 top-full mt-2 w-max p-3 bg-slate-900/95 border border-slate-600/50 rounded-xl text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-20 backdrop-blur-md shadow-xl">
                    <div className="text-white font-medium">
                      {new Date(msg.createdAt).toLocaleString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short'
                      })}
                    </div>
                    <div className="absolute top-0 left-4 -translate-y-1/2 w-3 h-3 bg-slate-900/95 border-t border-l border-slate-600/50 rotate-45"></div>
                  </div>
                </div>
                {msg.channelName ? (
                  <> 
                    <span className="text-slate-600">&middot;</span>
                    <p className="text-sm text-slate-400">#{msg.channelName}</p>
                  </>
                ) : (
                  <> 
                    <span className="text-slate-600">&middot;</span>
                    <ChannelName id={msg.channelId} />
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Thread context */}
          {msg.isThreadReply && msg.parentContent && msg.parentUserName && (
            <div className="mb-4 p-4 bg-slate-800/50 border-l-4 border-blue-500 rounded-r-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={14} className="text-blue-400/80"/> 
                <span className="text-xs text-blue-400/80 font-semibold uppercase tracking-wider">
                  In reply to {msg.parentUserName}
                </span>
              </div>
              <p className="text-slate-400 text-sm italic line-clamp-2">
                <MrkdwnText>{`"${msg.parentContent}"`}</MrkdwnText>
              </p>
            </div>
          )}
          
          <div className="relative">
            <MrkdwnText>{msg.content}</MrkdwnText>
          </div>
        </div>
        
        <a
          href={`https://slack.com/archives/${msg.channelId}/p${msg.messageTs.replace(
            ".",
            ""
          )}${msg.isThreadReply && msg.threadTs ? `?thread_ts=${msg.threadTs}` : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-slate-500 hover:text-blue-400 transition-all duration-200 p-3 rounded-lg hover:bg-blue-500/10 hover:scale-110"
          title={msg.isThreadReply ? "View thread on Slack" : "View on Slack"}
        >
          <ArrowRight size={20} />
        </a>
      </div>
    </motion.div>
  );
};

const InfoModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -30, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8 max-w-2xl w-full relative shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-blue-500/10 p-3 rounded-full border border-blue-500/20">
            <Info size={28} className="text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold">What is Vibe Check?</h2>
        </div>
        <div className="space-y-4 text-slate-300 leading-relaxed">
          <MrkdwnText>
            For years, the [Hack Club Slack](https://hackclub.com/slack) has had a fun, unofficial tradition: reacting to messages with `:upvote:` and `:downvote:` to show how you feel.
          </MrkdwnText>
          <MrkdwnText>
            It was a simple way to give feedback, share appreciation, or just have fun. But the votes were scattered, their stories lost in the endless scroll.
          </MrkdwnText>
          <p className="font-medium text-white">
            This leaderboard changes that.
          </p>
          <MrkdwnText>
            Vibe Check brings that beloved tradition to life, turning those ephemeral reactions into a friendly competition. It&apos;s a place to celebrate the most helpful, hilarious, and heartwarming moments from our community.
          </MrkdwnText>
          <MrkdwnText>
            Keep the vibes going! React to any message in Slack (including replies in threads) and see it pop up here.
          </MrkdwnText>
        </div>
      </motion.div>
    </motion.div>
  );
}

const channelCache = new QuickLRU<string, { name: string }>({ maxSize: 500, maxAge: 1000*60*60});

const ChannelName = ({ id }: { id: string }) => {
  const [name, setName] = useState<string | null>(channelCache.has(id) ? channelCache.get(id)!.name : null);

  useEffect(() => {
    let mounted = true;
    if (!name) {
      fetch(`/api/slack/channels/${id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && mounted) {
            channelCache.set(id, { name: data.name });
            setName(data.name);
          }
        });
    }
    return () => { mounted = false; };
  }, [id, name]);

  return (
    <p className="text-sm text-slate-400 flex items-center gap-1">
      {name ? `#${name}` : <span className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />}
    </p>
  );
};

export default function LeaderboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState("posts");
  const [filter, setFilter] = useState("day");
  const [sort, setSort] = useState("upvotes");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [isInfoModalOpen, setInfoModalOpen] = useState(false);

  // Identify user for analytics (sorry)
  useEffect(() => {
    const identifyUser = async () => {
      try {
        const res = await fetch("/api/auth/session");
        if (!res.ok) return;
        const data = await res.json();
        if (data.isLoggedIn && data.user?.id && window.umami) {
          window.umami.identify(data.user.id, {
            name: data.user.name,
          });
        }
      } catch (error) {
        console.error("Failed to identify user for analytics:", error);
      }
    };
    identifyUser();
  }, []);

  // Show modal on first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem("hasVisitedVibeCheck");
    if (!hasVisited) {
      setInfoModalOpen(true);
      localStorage.setItem("hasVisitedVibeCheck", "true");
    }
  }, []);

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (isInitialLoad) {
      setLoading(true);
      setMessages([]);
      setUsers([]);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentOffset = isInitialLoad ? 0 : offset;
      const endpoint = view === "posts" ? "/api/leaderboard" : "/api/leaderboard/users";
      const res = await fetch(`${endpoint}?filter=${filter}&sort=${sort}&limit=${PAGE_SIZE}&offset=${currentOffset}`);
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (!res.ok) {
        throw new Error(`Failed to fetch ${view}`);
      }
      
      if (view === "posts") {
        const newMessages: Message[] = await res.json();
        setMessages(prev => isInitialLoad ? newMessages : [...prev, ...newMessages]);
        setHasMore(newMessages.length === PAGE_SIZE);
      } else {
        const newUsers: User[] = await res.json();
        setUsers(prev => isInitialLoad ? newUsers : [...prev, ...newUsers]);
        setHasMore(newUsers.length === PAGE_SIZE);
      }
      
      if (!isInitialLoad) {
        setOffset(currentOffset + PAGE_SIZE);
      } else {
        setOffset(PAGE_SIZE);
      }
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, sort, offset, view]);

  const refreshData = useCallback(async () => {
    try {
      // Only fetch the number of items currently visible
      const currentLimit = view === "posts" ? 
        (messages.length > 0 ? messages.length : PAGE_SIZE) : 
        (users.length > 0 ? users.length : PAGE_SIZE);
      const endpoint = view === "posts" ? "/api/leaderboard" : "/api/leaderboard/users";
      const res = await fetch(`${endpoint}?filter=${filter}&sort=${sort}&limit=${currentLimit}&offset=0`);
      if (!res.ok) return;
      
      if (view === "posts") {
        const refreshedMessages: Message[] = await res.json();
        setMessages(refreshedMessages);
        setHasMore(refreshedMessages.length === currentLimit);
      } else {
        const refreshedUsers: User[] = await res.json();
        setUsers(refreshedUsers);
        setHasMore(refreshedUsers.length === currentLimit);
      }
    } catch (error) {
      console.error(`Failed to refresh ${view}`, error);
    }
  }, [filter, sort, messages.length, users.length, view]);

  useEffect(() => {
    fetchData(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, view]);
  
  // Setup SSE connection
  useEffect(() => {
    const eventSource = new EventSource("/api/leaderboard/events");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data === "refresh") {
        console.log("Received refresh event, updating leaderboard...");
        refreshData();
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource failed:", err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [refreshData]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        <header className="mb-12 relative">
          <div className="absolute top-0 right-0 z-20">
            <LogoutButton />
          </div>
          
          <div className="text-center pt-4 mb-8">
            <div className="flex items-center justify-center text-5xl font-black text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
              <motion.div
                animate={{ y: [-2, 2, -2] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowBigUp className="text-emerald-500" size={48} strokeWidth={2.5} />
              </motion.div>
              <span className="mx-4 tracking-tight">Vibe Check</span>
              <motion.div
                animate={{ y: [2, -2, 2] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowBigDown className="text-red-500" size={48} strokeWidth={2.5} />
              </motion.div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <p className="text-slate-400 text-lg">The Reddit of Hack Club.</p>
              <button onClick={() => setInfoModalOpen(true)} className="text-slate-500 hover:text-white transition-colors" title="What is this?">
                <Info size={18} />
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* View Toggle */}
            <div className="flex justify-center gap-4 flex-wrap">
              <ViewButton label="Posts" icon={MessageSquare} view={view} setView={setView} />
              <ViewButton label="Users" icon={Users} view={view} setView={setView} />
            </div>
            
            {/* Sort Controls */}
            <div className="flex justify-center gap-4 flex-wrap">
              <SortButton label="Most Upvotes" icon={ThumbsUp} sort={sort} setSort={setSort} />
              <SortButton label="Most Downvotes" icon={ThumbsDown} sort={sort} setSort={setSort} />
            </div>
            
            {/* Time Filters */}
            <div className="flex justify-center gap-4 flex-wrap">
              <FilterButton label="Day" icon={Calendar} filter={filter} setFilter={setFilter} />
              <FilterButton label="Week" icon={Calendar} filter={filter} setFilter={setFilter} />
              <FilterButton label="Month" icon={Calendar} filter={filter} setFilter={setFilter} />
              <FilterButton label="Year" icon={TrendingUp} filter={filter} setFilter={setFilter} />
              <FilterButton label="All Time" icon={Globe} filter={filter} setFilter={setFilter} />
            </div>
          </div>
        </header>

        <main>
          {loading ? (
            <div className="text-center text-slate-400 py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xl">Loading the best vibes...</p>
            </div>
          ) : (
            <>
              <AnimatePresence>
                {view === "posts" ? (
                  messages.length > 0 ? (
                    <div className="space-y-6">
                      {messages.map((msg, index) => (
                        <MessageCard key={msg.id} msg={msg} index={index} />
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-slate-400 py-20"
                    >
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <MessageSquare size={32} className="text-white" />
                      </div>
                      <p className="text-2xl mb-4 font-semibold">No messages found</p>
                      <p className="text-lg">Go spread some :upvote: and :downvote: in Slack and come back!</p>
                    </motion.div>
                  )
                ) : (
                  users.length > 0 ? (
                    <div className="space-y-6">
                      {users.map((user, index) => (
                        <UserCard key={user.userId} user={user} index={index} />
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-slate-400 py-20"
                    >
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Users size={32} className="text-white" />
                      </div>
                      <p className="text-2xl mb-4 font-semibold">No users found</p>
                      <p className="text-lg">Go spread some :upvote: and :downvote: in Slack and come back!</p>
                    </motion.div>
                  )
                )}
              </AnimatePresence>
              
              {hasMore && ((view === "posts" && messages.length > 0) || (view === "users" && users.length > 0)) && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => fetchData(false)}
                    disabled={loadingMore}
                    className="px-6 py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto shadow-lg hover:shadow-xl"
                  >
                    {loadingMore ? (
                      <>
                        <Loader className="animate-spin mr-2" size={20} />
                        Loading...
                      </>
                    ) : (
                      "Load More"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {isInfoModalOpen && <InfoModal onClose={() => setInfoModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
} 