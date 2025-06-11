"use client";

import { motion } from "framer-motion";
import { ArrowBigDown, ArrowBigUp, ExternalLink } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const LoginButton = ({ clientId }: { clientId?: string }) => {
  if (!clientId) return null;
  const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/slack/oauth`;
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=reactions:read,channels:history,groups:history,im:history,mpim:history,users:read&user_scope=&redirect_uri=${redirectUri}`;

  return (
    <motion.a
      href={slackAuthUrl}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-300 bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl shadow-lg hover:shadow-2xl"
    >
      Sign In with Slack
      <ExternalLink className="ml-2" size={20} />
    </motion.a>
  );
};

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // This is a client component, but we need to check session status
    // A quick fetch to a session API endpoint is a common pattern for this
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.isLoggedIn) {
          router.replace("/leaderboard");
        }
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white relative overflow-hidden flex flex-col items-center justify-center">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}></div>
      </div>
      
      <main className="relative z-10 text-center px-4">
        <div className="flex items-center justify-center text-6xl font-black text-white mb-4" style={{ textShadow: '0 2px 15px rgba(0,0,0,0.4)' }}>
          <motion.div
            animate={{ y: [-3, 3, -3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowBigUp className="text-emerald-500" size={60} strokeWidth={2.5} />
          </motion.div>
          <h1 className="mx-5 tracking-tight">Vibe Check</h1>
          <motion.div
            animate={{ y: [3, -3, 3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowBigDown className="text-red-500" size={60} strokeWidth={2.5} />
          </motion.div>
        </div>
        <p className="text-slate-400 text-xl mb-12">The pulse of your Slack workspace.</p>
        
        <LoginButton clientId={process.env.NEXT_PUBLIC_SLACK_CLIENT_ID} />
      </main>
    </div>
  );
}
