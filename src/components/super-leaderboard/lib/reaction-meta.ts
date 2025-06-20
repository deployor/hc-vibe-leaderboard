import { LucideIcon, Popcorn, Clock, TrendingUp } from "lucide-react";

export const reactionMeta: { [key: string]: { icon: LucideIcon | string, name: string } } = {
  upvotes: { icon: "/emojis/upvote.png", name: "Upvotes" },
  downvotes: { icon: "/emojis/downvote.png", name: "Downvotes" },
  yay: { icon: "/emojis/yay.gif", name: "Yay" },
  sob: { icon: "/emojis/heavysob.png", name: "Sob" },
  heart: { icon: "/emojis/ohneheart.png", name: "Heart" },
  star: { icon: "/emojis/star.png", name: "Star" },
  fire: { icon: "/emojis/fire.png", name: "Fire" },
  leek: { icon: "/emojis/leeks.png", name: "Leek" },
  real: { icon: "/emojis/real.png", name: "Real" },
  same: { icon: "/emojis/same.png", name: "Same" },
  skull: { icon: "/emojis/skulk.png", name: "Skull" },
  eyes: { icon: "/emojis/earthquakyeyes.gif", name: "Eyes" },
  yipee: { icon: "/emojis/yay.gif", name: "Yipee" },
  pingGood: { icon: "/emojis/happy_ping_sock.png", name: "Ping (Good)" },
  pingBad: { icon: "/emojis/mad_ping_sock.png", name: "Ping (Bad)" },
  totalReactions: { icon: Popcorn, name: "Total Reactions" },
  createdAt: { icon: Clock, name: "Most Recent" },
  net_score: { icon: TrendingUp, name: "Net Score" },
}; 