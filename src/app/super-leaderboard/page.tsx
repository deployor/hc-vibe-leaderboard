"use client";

import { useEffect, useState, useCallback } from "react";
import { LogOut, Loader, ArrowBigUp, ArrowBigDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useDebounce } from 'use-debounce';

import { Controls } from "@/components/super-leaderboard/controls";
import { MessageCard } from "@/components/super-leaderboard/message-card";
import { UserCard } from "@/components/super-leaderboard/user-card";
import { UserProfileModal } from "@/components/super-leaderboard/user-profile-modal";
import { User, Message } from "@/components/super-leaderboard/lib/types";

const PAGE_SIZE = 20;

function LogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (res.ok) router.push("/");
  };
  return (
    <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">
      <LogOut className="mr-2 h-4 w-4 inline" /> Logout
    </button>
  );
}

export default function SuperLeaderboardPage() {
  const [view, setView] = useState("posts");
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState("day");
  const [sort, setSort] = useState("net_score");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchData = useCallback(async (isInitialLoad = false, newSearchQuery = "") => {
    if (isInitialLoad) {
      setLoading(true);
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
        limit: String(PAGE_SIZE),
        offset: String(currentOffset),
      });
      if (view === 'users' && newSearchQuery) {
        params.set('search', newSearchQuery);
      }
      
      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (res.status === 401) { window.location.href = "/"; return; }
      if (!res.ok) throw new Error(`Failed to fetch ${view}`);
      
      const newData = await res.json();
      
      if (view === 'posts') {
        setMessages(prev => isInitialLoad ? newData : [...prev, ...newData]);
      } else {
        setUsers(prev => isInitialLoad ? newData : [...prev, ...newData]);
      }
      
      setHasMore(newData.length === PAGE_SIZE);
      setOffset(currentOffset + PAGE_SIZE);
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, sort, view, offset]);

  useEffect(() => {
    fetchData(true, debouncedSearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, view, debouncedSearch]);
  
  const refreshData = useCallback(() => {
    console.log("Refreshing data...");
    fetchData(true, debouncedSearch);
  }, [fetchData, debouncedSearch]);

  useEffect(() => {
    const eventSource = new EventSource("/api/leaderboard/events");
    eventSource.onmessage = (event) => {
      if (JSON.parse(event.data) === "refresh") {
        refreshData();
      }
    };
    eventSource.onerror = (err) => { console.error("EventSource failed:", err); eventSource.close(); };
    return () => eventSource.close();
  }, [refreshData]);
  
  const currentData = view === 'posts' ? messages : users;
  
  return (
     <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-5" style={{backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '24px 24px'}} />
      
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        <header className="mb-12 relative">
          <div className="absolute top-0 right-0 z-20"><LogoutButton /></div>
          
          <div className="text-center pt-4 mb-8">
            <div className="flex items-center justify-center text-5xl font-black text-white mb-2" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
              <motion.div animate={{ y: [-2, 2, -2] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                <ArrowBigUp className="text-emerald-500" size={48} strokeWidth={2.5} />
              </motion.div>
              <span className="mx-4 tracking-tight">Vibe Check</span>
              <motion.div animate={{ y: [2, -2, 2] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
                <ArrowBigDown className="text-red-500" size={48} strokeWidth={2.5} />
              </motion.div>
            </div>
            <p className="text-slate-400 text-lg">The Reddit of Hack Club.</p>
          </div>
          
          <Controls 
            view={view} setView={setView}
            filter={filter} setFilter={setFilter}
            sort={sort} setSort={setSort}
            search={search} setSearch={setSearch}
          />
        </header>

        <main>
          {loading ? (
            <div className="text-center text-slate-400 py-20">
              <Loader className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
              <p className="text-xl">Loading the best vibes...</p>
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div key={view}>
                  {currentData.length > 0 ? (
                    <div className="space-y-6">
                      {view === "posts" ? (
                        messages.map((item) => (
                          <MessageCard key={item.id} msg={item} sort={sort} />
                        ))
                      ) : (
                        users.map((item) => (
                          <UserCard key={item.userId} user={item} onClick={() => setSelectedUser(item)} />
                        ))
                      )}
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center text-slate-400 py-20">
                      <p className="text-4xl mb-4">😢</p>
                      <p className="text-2xl mb-4 font-semibold">No reactions found</p>
                      <p className="text-lg">Try adjusting your filters or try a different category!</p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
              
              {hasMore && currentData.length > 0 && (
                <div className="mt-8 text-center">
                  <button onClick={() => fetchData(false)} disabled={loadingMore} className="px-6 py-3 rounded-lg text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-500 disabled:opacity-50">
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {selectedUser && <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
      </AnimatePresence>
    </div>
  )
} 