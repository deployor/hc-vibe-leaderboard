"use client";

import { Slack } from "lucide-react";

interface LoginButtonProps {
  clientId?: string;
}

export function LoginButton({ clientId }: LoginButtonProps) {
  const handleLogin = () => {
    if (!clientId) {
      console.error("Slack Client ID is not configured.");
      alert("Login is not configured correctly. Please contact an administrator.");
      return;
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    const redirectUri = `${baseUrl}/api/slack/oauth`;
    const scope =
      "reactions:read,channels:history,groups:history,im:history,mpim:history,users:read,team:read";
    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}`;
    window.location.href = authUrl;
  };

  return (
    <button
      onClick={handleLogin}
      className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 shadow transition-colors hover:bg-slate-900/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90 dark:focus-visible:ring-slate-300"
    >
      <Slack className="mr-2 h-4 w-4" /> Login with Slack
    </button>
  );
} 