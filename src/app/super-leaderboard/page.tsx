"use client";

import { useEffect, useState, useCallback } from "react";
import { LogOut, TrendingUp, Users, MessageSquare, X, Info, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Message } from "@/components/super-leaderboard/lib/types";
import { MessageCard } from "@/components/super-leaderboard/message-card";
import { UserCard } from "@/components/super-leaderboard/user-card";
import { UserProfileModal } from "@/components/super-leaderboard/user-profile-modal";
import { Controls } from "@/components/super-leaderboard/controls";

declare global {
  interface Window {
    umami?: {
      track: (event: string | Record<string, unknown>, data?: Record<string, unknown>) => void;
      identify: (id: string, data?: Record<string, unknown>) => void;
    };
  }
}

interface User {
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  totalUpvotes: number;
  totalDownvotes: number;
  totalYay: number;
  totalSob: number;
  totalHeart: number;
  totalStar: number;
  totalFire: number;
  totalLeek: number;
  totalReal: number;
  totalSame: number;
  totalSkull: number;
  totalEyes: number;
  totalYipee: number;
  totalPingGood: number;
  totalPingBad: number;
  netScore: number;
  messageCount: number;
  lastMessageAt: string;
  givenUpvotes: number;
  givenDownvotes: number;
  givenYay: number;
  givenSob: number;
  givenHeart: number;
  givenStar: number;
  givenFire: number;
  givenLeek: number;
  givenReal: number;
  givenSame: number;
  givenSkull: number;
  givenEyes: number;
  givenYipee: number;
  givenPingGood: number;
  givenPingBad: number;
  otherGivenReactions: Record<string, number>;
}

const PAGE_SIZE = 20;



function LogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (res.ok) {
      router.push("/");
    } else {
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
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-full">
            <TrendingUp size={28} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold">Super Leaderboard</h2>
        </div>
        <div className="space-y-4 text-slate-300 leading-relaxed">
          <p>
            The Super Leaderboard is your comprehensive analytics dashboard for Hack Club Slack reactions! 
            Track detailed statistics on all emoji reactions, not just upvotes and downvotes.
          </p>
          <p>
            <strong className="text-white">Posts View:</strong> See the most reacted messages with detailed breakdowns 
            of every reaction type. Sort by any reaction to find the funniest, most heartwarming, or most controversial content.
          </p>
          <p>
            <strong className="text-white">Users View:</strong> Explore comprehensive user profiles showing both reactions 
            received and given. Search for specific users and dive deep into their interaction patterns.
          </p>
          <p>
            <strong className="text-white">Real-time Updates:</strong> All data updates live as reactions happen in Slack. 
            Every emoji reaction is tracked and analyzed for rich insights into community engagement.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function SuperLeaderboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState("posts");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("net_score");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isInfoModalOpen, setInfoModalOpen] = useState(false);

  // [Identify user for analytics][[memory:6521632578398813937]]
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
      const endpoint = view === "posts" ? "/api/super-leaderboard/messages" : "/api/super-leaderboard/users";
      const params = new URLSearchParams({
        filter,
        sort,
        limit: PAGE_SIZE.toString(),
        offset: currentOffset.toString(),
      });
      
      if (view === "users" && searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const res = await fetch(`${endpoint}?${params}`);
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
  }, [filter, sort, offset, view, searchQuery]);

  const refreshData = useCallback(async () => {
    try {
      const currentLimit = view === "posts" ? 
        (messages.length > 0 ? messages.length : PAGE_SIZE) : 
        (users.length > 0 ? users.length : PAGE_SIZE);
      const endpoint = view === "posts" ? "/api/super-leaderboard/messages" : "/api/super-leaderboard/users";
      const params = new URLSearchParams({
        filter,
        sort,
        limit: currentLimit.toString(),
        offset: "0",
      });
      
      if (view === "users" && searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const res = await fetch(`${endpoint}?${params}`);
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
  }, [filter, sort, messages.length, users.length, view, searchQuery]);

  useEffect(() => {
    fetchData(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, view, searchQuery]);
  
  // Setup SSE connection
  useEffect(() => {
    const eventSource = new EventSource("/api/leaderboard/events");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data === "refresh") {
        console.log("Received refresh event, updating super leaderboard...");
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
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}></div>
      </div>
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-12 relative">
          <div className="absolute top-0 right-0 z-20">
            <LogoutButton />
          </div>
          
          <div className="text-center pt-4 mb-8">
            <div className="flex items-center justify-center text-5xl font-black text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
              <motion.div
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <TrendingUp className="text-blue-500 mr-4" size={52} strokeWidth={2.5} />
              </motion.div>
              <span className="mx-2 tracking-tight bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Super Leaderboard
              </span>
              <motion.div
                animate={{ 
                  rotate: [0, -5, 5, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <TrendingUp className="text-purple-500 ml-4" size={52} strokeWidth={2.5} />
              </motion.div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <p className="text-slate-400 text-lg">Advanced Analytics for Hack Club Reactions</p>
              <button onClick={() => setInfoModalOpen(true)} className="text-slate-500 hover:text-white transition-colors" title="Learn more">
                <Info size={18} />
              </button>
            </div>
          </div>
          
          <Controls 
            view={view} 
            setView={setView}
            filter={filter}
            setFilter={setFilter}
            sort={sort}
            setSort={setSort}
            search={searchQuery}
            setSearch={setSearchQuery}
          />
        </header>

        <main>
          {loading ? (
            <div className="text-center text-slate-400 py-20">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xl">Loading comprehensive analytics...</p>
            </div>
          ) : (
            <>
              <AnimatePresence>
                {view === "posts" ? (
                  messages.length > 0 ? (
                                         <div className="space-y-6">
                       {messages.map((msg) => (
                         <MessageCard key={msg.id} msg={msg} sort={sort} />
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
                      <p className="text-lg">Try adjusting your filters or go react to some messages in Slack!</p>
                    </motion.div>
                  )
                ) : (
                  users.filter(u => u.userName).length > 0 ? (
                    <div className="space-y-6">
                      {users.filter(u => u.userName).map((user) => (
                        <UserCard
                          key={user.userId}
                          user={user}
                          onClick={() => setSelectedUserId(user.userId)}
                        />
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
                      <p className="text-lg">
                        {searchQuery ? 
                          `No users found matching "${searchQuery}". Try a different search term.` :
                          "Try adjusting your filters or go react to some messages in Slack!"
                        }
                      </p>
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
                 {selectedUserId && users.find(u => u.userId === selectedUserId) && (
           <UserProfileModal 
             user={users.find(u => u.userId === selectedUserId)!} 
             onClose={() => setSelectedUserId(null)} 
           />
         )}
      </AnimatePresence>
    </div>
  );
}
