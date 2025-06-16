"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ArrowRight,
  ThumbsUp,
  Users,
  Gift,
  MessageSquare,
  Star,
  Heart,
  ThumbsDown,
  User as UserIcon,
  Share,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import type { Variants } from "framer-motion";

interface WrappedData {
  month: string;
  totalReactions?: number;
  reactionBreakdown?: {
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
  };
  topUpvotedMessage?: {
    id: number;
    userName: string;
    avatarUrl?: string | null;
    content: string;
    upvotes: number;
    downvotes: number;
    createdAt: string;
  };
  topUpvotedUser?: {
    userId: string;
    userName: string;
    avatarUrl?: string | null;
    totalUpvotes: number;
    netScore: number;
  };
  topSupporter?: {
    userId: string;
    userName: string;
    avatarUrl?: string | null;
    givenUpvotes: number;
  };
  topStarredMessage?: {
    id: number;
    userName: string;
    avatarUrl?: string | null;
    content: string;
    stars: number;
    createdAt: string;
  };
  mostLovedMessage?: {
    id: number;
    userName: string;
    avatarUrl?: string | null;
    content: string;
    netScore: number;
    createdAt: string;
  };
  mostHatedMessage?: {
    id: number;
    userName: string;
    avatarUrl?: string | null;
    content: string;
    downvotes: number;
    createdAt: string;
  };
}

const AvatarImage = ({
  src,
  alt,
  fallbackInitial,
}: {
  src?: string | null;
  alt: string;
  fallbackInitial: string;
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src) {
    return (
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-4xl shadow-lg">
        {fallbackInitial}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 ring-2 ring-slate-600/50">
        <UserIcon size={48} />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={96}
      height={96}
      className="rounded-full ring-2 ring-slate-600/50"
      onError={() => setHasError(true)}
      unoptimized
    />
  );
};

const slideVariants = {
  enter: {
    x: "100%",
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
  },
  exit: {
    x: "-100%",
    opacity: 0,
  },
};

const revealContainer: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const slideInFromTop: Variants = {
  hidden: { y: "-100vh", opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 80, damping: 15, duration: 1 } },
};

const slideInFromBottom: Variants = {
  hidden: { y: "100vh", opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 80, damping: 15, duration: 1 } },
};

const popInBig: Variants = {
    hidden: { scale: 0.2, opacity: 0, rotate: -15 },
    show: { scale: 1, opacity: 1, rotate: 0, transition: { type: "spring", stiffness: 150, damping: 10 } },
}

const contentFadeIn: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.8 } },
}

const CountUp = ({ value, duration = 1.4, className }: { value: number; duration?: number; className?: string }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      setDisplay(Math.floor(progress * value));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{display.toLocaleString()}</span>;
};

const FloatingEmojis = () => {
  const emojis = useMemo(() => ["👍", "🔥", "💖", "⭐️", "🎉", "✨"], []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {emojis.map((emoji, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 5;
        const duration = 10 + Math.random() * 10;
        const size = 24 + Math.random() * 24;
        return (
          <motion.div
            key={i}
            style={{ left: `${left}%`, fontSize: size }}
            className="absolute bottom-[-3rem] select-none opacity-0"
            animate={{ y: "-120vh", opacity: [0, 0.8, 0] }}
            transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
          >
            {emoji}
          </motion.div>
        );
      })}
    </div>
  );
};

const TypewriterText = ({ text, speed = 40, className }: { text: string; speed?: number; className?: string }) => {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    setDisplay("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplay(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <span className={className}>{display}</span>;
};

const randomId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11));

const ConfettiBurst = ({ trigger }: { trigger: boolean }) => {
  const [pieces, setPieces] = useState<string[]>([]);
  useEffect(() => {
    if (trigger) {
      const ids = Array.from({ length: 40 }, () => randomId());
      setPieces(ids);
      const timer = setTimeout(() => setPieces([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <>
      {pieces.map((id) => {
        const angle = Math.random() * 360;
        const distance = 200 + Math.random() * 200;
        const size = 6 + Math.random() * 6;
        const bg = `hsl(${Math.random() * 360}, 80%, 60%)`;
        return (
          <motion.div
            key={id}
            className="fixed top-1/2 left-1/2 z-50 pointer-events-none"
            style={{ width: size, height: size, backgroundColor: bg, borderRadius: 2 }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: distance * Math.cos((angle * Math.PI) / 180),
              y: distance * Math.sin((angle * Math.PI) / 180),
              opacity: 0,
              rotate: Math.random() * 720,
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
};

const PulsingDots = ({ className }: { className?: string }) => (
    <div className="flex gap-2.5 mt-8">
        <motion.div className={`w-3.5 h-3.5 rounded-full ${className}`} animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className={`w-3.5 h-3.5 rounded-full ${className}`} animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.25 }} />
        <motion.div className={`w-3.5 h-3.5 rounded-full ${className}`} animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} />
    </div>
);

export default function WrappedPage() {
  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const TOTAL_SLIDES = 18;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/wrapped");
      if (!res.ok) {
        throw new Error(`Failed to fetch wrapped data: ${res.status} ${res.statusText}`);
      }
      const json: WrappedData = await res.json();
      setData(json);
    } catch (error) {
      console.error("Wrapped data fetch error:", error);
      // Provide a more informative error state
      setData({
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        totalReactions: 0,
        reactionBreakdown: {
          yay: 0, sob: 0, heart: 0, star: 0, fire: 0, 
          leek: 0, real: 0, same: 0, skull: 0, 
          eyes: 0, yipee: 0, pingGood: 0, pingBad: 0
        }
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const nextSlide = () => {
    setSlide((prev) => Math.min(prev + 1, TOTAL_SLIDES - 1));
  };

  const prevSlide = () => {
    setSlide((prev) => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        nextSlide();
      } else if (e.key === "ArrowLeft") {
        prevSlide();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white relative flex items-center justify-center">
         <div className="relative flex flex-col items-center justify-center h-full text-center px-6 animate-pulse w-full max-w-2xl">
            <div className="w-3/4 h-16 bg-slate-700/50 rounded-lg mb-6"></div>
            <div className="w-1/4 h-8 bg-slate-700/50 rounded-lg mb-10"></div>
            <div className="w-1/2 h-6 bg-slate-700/50 rounded-lg"></div>
        </div>
      </div>
    );
  }
  
  if (!data) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white p-4 text-center">
              <h2 className="text-2xl font-bold mb-2">Could not load Wrapped data.</h2>
              <p className="text-slate-400">Please try again later.</p>
          </div>
      )
  }

  const slides = [
    // 0 New Slide: Secret Reactions Suspense
    (
      <motion.div key="secret-reactions-suspense" className="flex flex-col items-center justify-center h-full text-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <TypewriterText
          text="I have something to tell you... I&apos;ve been keeping a secret from you..."
          className="text-3xl md:text-4xl text-slate-300 font-medium"
        />
        <PulsingDots className="bg-purple-400" />
      </motion.div>
    ),
    // 1 New Slide: Reactions Tracking Reveal
    (
      <motion.div key="reactions-tracking" className="flex flex-col items-center justify-center h-full text-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <TypewriterText
          text="I&apos;ve been tracking... A LOT of other reactions!"
          className="text-3xl md:text-4xl text-slate-300 font-medium"
        />
        <PulsingDots className="bg-green-400" />
      </motion.div>
    ),
    // 2 Total Reactions Count
    (
      <div key="total-reactions" className="flex items-center justify-center h-full w-full p-4">
        <motion.div variants={revealContainer} initial="hidden" animate="show" className="relative w-full max-w-4xl flex flex-col items-center justify-center bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-2xl">
          <motion.div variants={popInBig}>
            <motion.div 
              className="text-8xl font-black bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 150, damping: 10 }}
            >
              <CountUp 
                value={data.totalReactions || 0} 
                duration={7} 
                className="font-black bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent"
              />
            </motion.div>
          </motion.div>
          <motion.h2 variants={slideInFromBottom} className="text-4xl md:text-5xl font-bold mb-6 mt-4">Reactions Tracked</motion.h2>
          <motion.p variants={contentFadeIn} className="text-slate-300 text-lg max-w-xl text-center">
            Wow! That&apos;s a lot of vibes captured this month! 🎉
          </motion.p>
          <ConfettiBurst trigger={true} />
        </motion.div>
      </div>
    ),
    // 3 Reactions Breakdown Intro
    (
      <motion.div key="reactions-breakdown-intro" className="flex flex-col items-center justify-center h-full text-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <TypewriterText
          text="And here&apos;s a breakdown of all the reactions I tracked!"
          className="text-3xl md:text-4xl text-slate-300 font-medium"
        />
        <div className="mt-8 flex gap-4 text-6xl">
          {[
            "yay.gif", 
            "heavysob.png", 
            "ohneheart.png", 
            "star.png", 
            "fire.png", 
            "leeks.png", 
            "real.png", 
            "same.png", 
            "skulk.png", 
            "earthquakyeyes.gif", 
            "ultrafastparrot.gif", 
            "upvote.png"
          ].map((emojiFile) => (
            <motion.div 
              key={emojiFile} 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: 1, 
                opacity: 1
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 10 
              }}
              className="w-16 h-16"
            >
              <Image 
                src={`/emojis/${emojiFile}`} 
                alt="Reaction emoji" 
                width={64} 
                height={64} 
                className="object-contain"
              />
            </motion.div>
          ))}
        </div>
      </motion.div>
    ),
    // 4 Reactions Breakdown
    (
      <div key="reactions-breakdown" className="flex items-center justify-center h-full w-full p-4">
        <motion.div variants={revealContainer} initial="hidden" animate="show" className="relative w-full max-w-4xl flex flex-col items-center justify-center bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-2xl">
          <motion.h2 variants={slideInFromTop} className="text-4xl md:text-5xl font-bold mb-8">Reaction Breakdown</motion.h2>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-6 w-full">
            {data.reactionBreakdown ? Object.entries(data.reactionBreakdown).map(([reaction]) => {
              const reactionCount = (data.reactionBreakdown as Record<string, number>)[reaction] || 0;
              return (
                <motion.div 
                  key={reaction} 
                  variants={popInBig} 
                  className="flex flex-col items-center justify-center bg-slate-900/50 p-4 rounded-xl border border-slate-700/50"
                >
                  <div className="text-4xl mb-2">
                    <Image 
                      src={`/emojis/${
                        {
                          yay: "yay.gif",
                          sob: "heavysob.png",
                          heart: "ohneheart.png",
                          star: "star.png",
                          fire: "fire.png",
                          leek: "leeks.png",
                          real: "real.png",
                          same: "same.png",
                          skull: "skulk.png",
                          eyes: "earthquakyeyes.gif",
                          yipee: "ultrafastparrot.gif",
                          pingGood: "upvote.png",
                          pingBad: "downvote.png"
                        }[reaction]
                      }`}
                      alt={`${reaction} reaction`}
                      width={64}
                      height={64}
                      className="object-contain"
                    />
                  </div>
                  <div className="text-2xl font-bold text-blue-400">
                    <CountUp value={reactionCount} />
                  </div>
                  <div className="text-sm text-slate-400 uppercase tracking-wider mt-1">
                    {reaction}
                  </div>
                </motion.div>
              );
            }) : (
              <motion.p variants={contentFadeIn} className="text-slate-400 text-lg col-span-full text-center">
                No reaction data available this month.
              </motion.p>
            )}
          </div>
        </motion.div>
      </div>
    ),
    // 5 Intro slide
    (
      <div key="intro" className="relative flex flex-col items-center justify-center h-full text-center px-6">
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.05, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="text-5xl md:text-6xl font-black bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-4"
        >
          Vibe Check Wrapped
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-slate-400 text-xl mb-8">
          {data.month}
        </motion.p>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="text-slate-300 max-w-xl text-lg">
          Relive the vibes of the past month. Tap or press the right arrow to begin.
        </motion.p>
      </div>
    ),
    // 6 Suspense before message
    (
      <motion.div key="suspense-message" className="flex flex-col items-center justify-center h-full text-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <TypewriterText
          text="Let&apos;s start with the message that stole everyone&apos;s hearts…"
          className="text-3xl md:text-4xl text-slate-300 font-medium"
        />
        <PulsingDots className="bg-blue-400" />
      </motion.div>
    ),
    // 7 Most loved message
    (
        <div key="top-message" className="flex items-center justify-center h-full w-full p-4">
            <motion.div variants={revealContainer} initial="hidden" animate="show" className="relative w-full max-w-4xl flex flex-col items-center justify-center bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-2xl">
                <motion.div variants={popInBig}>
                <MessageSquare size={64} className="text-emerald-400 mb-8" />
                </motion.div>
                <motion.h2 variants={slideInFromBottom} className="text-4xl md:text-5xl font-bold mb-6">Most Upvoted Message</motion.h2>
                {data.topUpvotedMessage ? (
                <>
                    <motion.p variants={contentFadeIn} className="text-slate-300 mb-8 max-w-2xl whitespace-pre-wrap leading-relaxed text-lg">
                    &quot;{data.topUpvotedMessage.content}&quot;
                    </motion.p>
                    <motion.div variants={slideInFromBottom} className="flex items-center gap-4">
                    <AvatarImage
                        src={data.topUpvotedMessage.avatarUrl}
                        alt={data.topUpvotedMessage.userName}
                        fallbackInitial={data.topUpvotedMessage.userName.charAt(0).toUpperCase()}
                    />
                    <div className="text-left">
                        <p className="font-semibold text-white text-xl">
                        {data.topUpvotedMessage.userName}
                        </p>
                        <p className="text-emerald-400 font-medium flex items-center gap-2 text-lg">
                        <ThumbsUp size={20} />
                        <CountUp value={data.topUpvotedMessage.upvotes} /> upvotes
                        </p>
                    </div>
                    </motion.div>
                </>
                ) : (
                <motion.p variants={contentFadeIn} className="text-slate-400 text-lg">No data for this month yet!</motion.p>
                )}
            </motion.div>
        </div>
    ),
    // 8 Suspense before star message
    (
      <motion.div key="suspense-star" className="flex flex-col items-center justify-center h-full text-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <TypewriterText
          text="And which message shone the brightest with the most ⭐ stars?"
          className="text-3xl md:text-4xl text-slate-300 font-medium"
        />
        <PulsingDots className="bg-yellow-400" />
      </motion.div>
    ),
    // 9 Top starred message reveal
    (
      <div key="star-message" className="flex items-center justify-center h-full w-full p-4">
        <motion.div variants={revealContainer} initial="hidden" animate="show" className="relative w-full max-w-4xl flex flex-col items-center justify-center bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-2xl">
          <ConfettiBurst trigger={slide === 9} />
          <motion.div variants={popInBig}>
            <Star size={64} className="text-yellow-400 mb-8" />
          </motion.div>
          <motion.h2 variants={slideInFromBottom} className="text-4xl md:text-5xl font-bold mb-6">Most Starred Message</motion.h2>
          {data.topStarredMessage ? (
            <>
              <motion.p variants={contentFadeIn} className="text-slate-300 mb-8 max-w-2xl whitespace-pre-wrap leading-relaxed text-lg">
                &quot;{data.topStarredMessage.content}&quot;
              </motion.p>
              <motion.div variants={slideInFromBottom} className="flex items-center gap-4">
                <AvatarImage
                  src={data.topStarredMessage.avatarUrl}
                  alt={data.topStarredMessage.userName}
                  fallbackInitial={data.topStarredMessage.userName.charAt(0).toUpperCase()}
                />
                <div className="text-left">
                  <p className="font-semibold text-white text-xl">
                    {data.topStarredMessage.userName}
                  </p>
                  <p className="text-yellow-400 font-medium flex items-center gap-2 text-lg">
                    <Star size={20} /> <CountUp value={data.topStarredMessage.stars} /> stars
                  </p>
                </div>
              </motion.div>
            </>
          ) : (
            <motion.p variants={contentFadeIn} className="text-slate-400 text-lg">No starred messages this month!</motion.p>
          )}
        </motion.div>
      </div>
    ),
    // 10 Suspense before most loved
    (
      <motion.div key="suspense-loved" className="flex flex-col items-center justify-center h-full text-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <TypewriterText
          text="Which message was the most loved of all?"
          className="text-3xl md:text-4xl text-slate-300 font-medium"
        />
        <PulsingDots className="bg-red-400" />
      </motion.div>
    ),
    // 11 Top loved message reveal
    (
      <div key="loved-message" className="flex items-center justify-center h-full w-full p-4">
        <motion.div variants={revealContainer} initial="hidden" animate="show" className="relative w-full max-w-4xl flex flex-col items-center justify-center bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-2xl">
          <ConfettiBurst trigger={slide === 11} />
          <motion.div variants={popInBig}>
            <Heart size={64} className="text-red-400 mb-8" />
          </motion.div>
          <motion.h2 variants={slideInFromBottom} className="text-4xl md:text-5xl font-bold mb-6">Most Loved Message</motion.h2>
          {data.mostLovedMessage ? (
            <>
              <motion.p variants={contentFadeIn} className="text-slate-300 mb-8 max-w-2xl whitespace-pre-wrap leading-relaxed text-lg">
                &quot;{data.mostLovedMessage.content}&quot;
              </motion.p>
              <motion.div variants={slideInFromBottom} className="flex items-center gap-4">
                <AvatarImage
                  src={data.mostLovedMessage.avatarUrl}
                  alt={data.mostLovedMessage.userName}
                  fallbackInitial={data.mostLovedMessage.userName.charAt(0).toUpperCase()}
                />
                <div className="text-left">
                  <p className="font-semibold text-white text-xl">
                    {data.mostLovedMessage.userName}
                  </p>
                  <p className="text-red-400 font-medium flex items-center gap-2 text-lg">
                    <Heart size={20} /> <CountUp value={data.mostLovedMessage.netScore} /> net score
                  </p>
                </div>
              </motion.div>
            </>
          ) : (
            <motion.p variants={contentFadeIn} className="text-slate-400 text-lg">No especially loved messages this month!</motion.p>
          )}
        </motion.div>
      </div>
    ),
    // 12 Suspense before most hated
    (
      <motion.div key="suspense-hated" className="flex flex-col items-center justify-center h-full text-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <TypewriterText
          text="On the flip side... which message was the most... controversial?"
          className="text-3xl md:text-4xl text-slate-300 font-medium"
        />
        <PulsingDots className="bg-gray-500" />
      </motion.div>
    ),
    // 13 Most Hated Message Reveal
    (
      <div key="hated-message" className="flex items-center justify-center h-full w-full p-4">
        <motion.div variants={revealContainer} initial="hidden" animate="show" className="relative w-full max-w-4xl flex flex-col items-center justify-center bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-2xl">
          <motion.div variants={popInBig}>
            <ThumbsDown size={64} className="text-gray-400 mb-8" />
          </motion.div>
          <motion.h2 variants={slideInFromBottom} className="text-4xl md:text-5xl font-bold mb-6">Most... Controversial Message</motion.h2>
          {data.mostHatedMessage ? (
            <>
              <motion.p variants={contentFadeIn} className="text-slate-300 mb-8 max-w-2xl whitespace-pre-wrap leading-relaxed text-lg">
                &quot;{data.mostHatedMessage.content}&quot;
              </motion.p>
              <motion.div variants={slideInFromBottom} className="flex items-center gap-4">
                <AvatarImage
                  src={data.mostHatedMessage.avatarUrl}
                  alt={data.mostHatedMessage.userName}
                  fallbackInitial={data.mostHatedMessage.userName.charAt(0).toUpperCase()}
                />
                <div className="text-left">
                  <p className="font-semibold text-white text-xl">
                    {data.mostHatedMessage.userName}
                  </p>
                  <p className="text-gray-400 font-medium flex items-center gap-2 text-lg">
                    <ThumbsDown size={20} /> <CountUp value={data.mostHatedMessage.downvotes} /> downvotes
                  </p>
                </div>
              </motion.div>
            </>
          ) : (
            <motion.p variants={contentFadeIn} className="text-slate-400 text-lg">No controversial messages this month. Good vibes only!</motion.p>
          )}
        </motion.div>
      </div>
    ),
    // 14 Suspense before top user
    (
      <motion.div key="suspense-user" className="flex flex-col items-center justify-center h-full text-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <TypewriterText
          text="But who was the vibe king/queen of the month?"
          className="text-3xl md:text-4xl text-slate-300 font-medium"
        />
        <PulsingDots className="bg-pink-400" />
      </motion.div>
    ),
    // 15 Top user by upvotes
    (
      <div key="top-user" className="flex items-center justify-center h-full w-full p-4">
        <motion.div variants={revealContainer} initial="hidden" animate="show" className="relative w-full max-w-4xl flex flex-col items-center justify-center bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-2xl">
          <motion.div variants={slideInFromTop}>
              <Users size={64} className="text-pink-400 mb-8" />
          </motion.div>
          <motion.h2 variants={slideInFromTop} className="text-4xl md:text-5xl font-bold mb-6">Top Vibe</motion.h2>
          {data.topUpvotedUser ? (
            <>
              <motion.div variants={popInBig}>
                  <AvatarImage
                    src={data.topUpvotedUser.avatarUrl}
                    alt={data.topUpvotedUser.userName}
                    fallbackInitial={data.topUpvotedUser.userName.charAt(0).toUpperCase()}
                  />
              </motion.div>
              <motion.p variants={slideInFromBottom} className="font-semibold text-white text-4xl mt-6">
                {data.topUpvotedUser.userName}
              </motion.p>
              <motion.p variants={slideInFromBottom} className="text-slate-400 mt-2 text-lg">
                <CountUp value={data.topUpvotedUser.totalUpvotes} /> upvotes earned
              </motion.p>
            </>
          ) : (
            <motion.p variants={contentFadeIn} className="text-slate-400 text-lg">No data for this month yet!</motion.p>
          )}
        </motion.div>
      </div>
    ),
    // 16 Suspense before supporter
    (
      <motion.div key="suspense-supporter" className="flex flex-col items-center justify-center h-full text-center px-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <TypewriterText
          text="And who spread the most love?"
          className="text-3xl md:text-4xl text-slate-300 font-medium"
        />
        <PulsingDots className="bg-yellow-400" />
      </motion.div>
    ),
    // 17 Biggest supporter
    (
        <div key="supporter" className="flex items-center justify-center h-full w-full p-4">
            <motion.div variants={revealContainer} initial="hidden" animate="show" className="relative w-full max-w-4xl flex flex-col items-center justify-center bg-slate-800/60 backdrop-blur-md border border-slate-700/50 rounded-3xl p-8 md:p-12 shadow-2xl">
            <motion.div variants={slideInFromTop}>
                <Gift size={64} className="text-yellow-400 mb-8" />
            </motion.div>
            <motion.h2 variants={slideInFromTop} className="text-4xl md:text-5xl font-bold mb-6">Biggest Supporter</motion.h2>
            {data.topSupporter ? (
            <>
                <motion.div variants={popInBig}>
                    <AvatarImage
                    src={data.topSupporter.avatarUrl}
                    alt={data.topSupporter.userName}
                    fallbackInitial={data.topSupporter.userName.charAt(0).toUpperCase()}
                    />
                </motion.div>
                <motion.p variants={slideInFromBottom} className="font-semibold text-white text-4xl mt-6">
                {data.topSupporter.userName}
                </motion.p>
                <motion.p variants={slideInFromBottom} className="text-slate-400 mt-2 text-lg">
                <CountUp value={data.topSupporter.givenUpvotes} /> upvotes given
                </motion.p>
            </>
            ) : (
            <motion.p variants={contentFadeIn} className="text-slate-400 text-lg">No data yet!</motion.p>
            )}
            </motion.div>
        </div>
    ),
    // 18 Outro
    (
      <motion.div 
        key="outro" 
        className="flex flex-col items-center justify-center h-full text-center px-6 relative" 
        initial={{ opacity: 0, rotate: -5 }} 
        animate={{ opacity: 1, rotate: 0 }} 
        transition={{ type: "spring", stiffness: 150 }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 5;
            const duration = 10 + Math.random() * 10;
            const size = 24 + Math.random() * 24;
            return (
              <motion.div
                key={i}
                style={{ 
                  left: `${left}%`, 
                  fontSize: size,
                  position: 'absolute',
                  top: '-10%'
                }}
                animate={{ 
                  y: '120vh', 
                  rotate: [0, Math.random() * 360, Math.random() * 360],
                  opacity: [0.2, 1, 0]
                }}
                transition={{ 
                  duration, 
                  delay, 
                  repeat: Infinity, 
                  repeatType: 'loop',
                  ease: "easeInOut" 
                }}
              >
                ❤️
              </motion.div>
            );
          })}
        </div>

        <motion.h2 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="text-5xl md:text-6xl font-black bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 bg-clip-text text-transparent mb-6"
        >
          Thanks for Vibing, Hack Clubbers! 💖
        </motion.h2>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-slate-300 max-w-2xl text-xl mb-8 leading-relaxed"
        >
          You&apos;ve created countless moments of joy, support, and connection this month. 
          Every reaction, every message, every vibe – they all matter. 
          Keep spreading love, creativity, and community! 🚀
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 260 }}
          className="flex gap-4"
        >
          <a
            href="/leaderboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 transition-all duration-200 text-white font-semibold"
          >
            Back to Leaderboard <ArrowRight size={16} />
          </a>
          <button
            onClick={(e) => { e.stopPropagation(); setSlide(0); }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-all duration-200 text-slate-300 font-semibold"
          >
            Replay Wrapped <RefreshCw size={16} />
          </button>
        </motion.div>
      </motion.div>
    ),
  ];

  return (
    <div
      className="min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white relative"
      onClick={nextSlide}
    >
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "20px 20px",
          }}
        ></div>
      </div>

      <FloatingEmojis />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={slide}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="flex items-center justify-center h-screen relative z-10"
        >
          {slides[slide]}
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {slide < slides.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); nextSlide(); }}
          className="absolute bottom-6 right-6 bg-blue-500/20 hover:bg-blue-500/40 backdrop-blur-lg rounded-full p-3 text-blue-400 hover:text-white transition-colors z-20"
          aria-label="Next slide"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {slide > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); prevSlide(); }}
          className="absolute bottom-6 left-6 bg-blue-500/20 hover:bg-blue-500/40 backdrop-blur-lg rounded-full p-3 text-blue-400 hover:text-white transition-colors z-20"
          aria-label="Previous slide"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* Progress dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {Array.from({ length: slides.length }).map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => { e.stopPropagation(); setSlide(idx); }}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${idx === slide ? "bg-blue-500 scale-110" : "bg-slate-600 hover:bg-slate-500"}`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Replay / Share buttons visible on outro */}
      {slide === slides.length - 1 && (
        <div className="absolute top-6 right-6 flex gap-3 z-20">
          <button
            onClick={(e) => { e.stopPropagation(); setSlide(0); }}
            className="bg-purple-500/20 hover:bg-purple-500/40 backdrop-blur-lg rounded-full p-3 text-purple-400 hover:text-white transition-colors"
            title="Replay"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(window.location.href).then(() => {
                alert("Link copied to clipboard!");
              });
            }}
            className="bg-blue-500/20 hover:bg-blue-500/40 backdrop-blur-lg rounded-full p-3 text-blue-400 hover:text-white transition-colors"
            title="Share"
          >
            <Share size={20} />
          </button>
        </div>
      )}
    </div>
  );
} 