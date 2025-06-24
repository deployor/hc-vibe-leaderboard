import { LucideIcon, Popcorn, Clock, TrendingUp } from "lucide-react";

export const reactionMeta: { [key: string]: { icon: LucideIcon | string, name: string, emoji?: string } } = {
  upvotes: { icon: "/emojis/upvote.png", name: "Upvotes", emoji: "upvote" },
  downvotes: { icon: "/emojis/downvote.png", name: "Downvotes", emoji: "downvote" },
  yay: { icon: "/emojis/yay.gif", name: "Yay", emoji: "yay" },
  sob: { icon: "/emojis/heavysob.png", name: "Sob", emoji: "heavysob" },
  heart: { icon: "/emojis/ohneheart.png", name: "Heart", emoji: "ohneheart" },
  star: { icon: "/emojis/star.png", name: "Star", emoji: "star" },
  fire: { icon: "/emojis/fire.png", name: "Fire", emoji: "fire" },
  leek: { icon: "/emojis/leeks.png", name: "Leek", emoji: "leeks" },
  real: { icon: "/emojis/real.png", name: "Real", emoji: "real" },
  same: { icon: "/emojis/same.png", name: "Same", emoji: "same" },
  skull: { icon: "/emojis/skulk.png", name: "Skull", emoji: "skulk" },
  eyes: { icon: "/emojis/earthquakyeyes.gif", name: "Eyes", emoji: "earthquakyeyes" },
  yipee: { icon: "/emojis/yay.gif", name: "Yipee", emoji: "ultrafastparrot" },
  pingGood: { icon: "/emojis/happy_ping_sock.png", name: "Ping (Good)", emoji: "happy_ping_sock" },
  pingBad: { icon: "/emojis/mad_ping_sock.png", name: "Ping (Bad)", emoji: "mad_ping_sock" },
  totalReactions: { icon: Popcorn, name: "Total Reactions" },
  createdAt: { icon: Clock, name: "Most Recent" },
  net_score: { icon: TrendingUp, name: "Net Score" },
}; 