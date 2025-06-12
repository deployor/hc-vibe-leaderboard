export interface EmojiCategory {
  id: string;
  name: string;
  displayName: string;
  icon: string; // Unicode emoji or icon name
  emojis: string[];
  color: string; // Tailwind color class
  description?: string;
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "hearts",
    name: "hearts",
    displayName: "Hearts",
    icon: "💖",
    emojis: ["ohneheart", "ohnelove", "blahaj-heart", "heart", "sparkling_heart"],
    color: "pink",
    description: "Love and affection"
  },
  {
    id: "ping_bad",
    name: "ping_bad", 
    displayName: "Ping Bad",
    icon: "😡",
    emojis: ["mad_ping_sock"],
    color: "red",
    description: "Angry ping reactions"
  },
  {
    id: "ping_good",
    name: "ping_good",
    displayName: "Ping Good", 
    icon: "😊",
    emojis: ["happy_ping_sock"],
    color: "green",
    description: "Happy ping reactions"
  },
  {
    id: "yipee_parrot",
    name: "yipee_parrot",
    displayName: "Yipee Parrot",
    icon: "🦜",
    emojis: ["ultrafastparrot", "yippeee"],
    color: "yellow",
    description: "Excited celebrations"
  },
  {
    id: "nooo",
    name: "nooo", 
    displayName: "Nooo",
    icon: "😱",
    emojis: ["noooo", "noo", "noooovanish"],
    color: "orange",
    description: "Expressions of dismay"
  },
  {
    id: "eyes",
    name: "eyes",
    displayName: "Eyes",
    icon: "👀",
    emojis: ["earthquakyeyes", "eyes_wtf", "eyes", "Eyes"],
    color: "blue",
    description: "Looking and watching"
  },
  {
    id: "skull",
    name: "skull",
    displayName: "Skull",
    icon: "💀",
    emojis: ["skulk", "skull", "skull-ios"],
    color: "gray",
    description: "Death and doom"
  },
  {
    id: "leek",
    name: "leek",
    displayName: "Leek",
    icon: "🥬",
    emojis: ["leeks", "leek"],
    color: "emerald",
    description: "Leek appreciation"
  },
  {
    id: "real",
    name: "real",
    displayName: "Real",
    icon: "💯",
    emojis: ["real"],
    color: "purple",
    description: "Authenticity"
  },
  {
    id: "same",
    name: "same",
    displayName: "Same",
    icon: "🤝",
    emojis: ["same"],
    color: "indigo",
    description: "Agreement and solidarity"
  },
  // Legacy categories for existing tracking
  {
    id: "upvotes",
    name: "upvotes",
    displayName: "Upvotes",
    icon: "⬆️",
    emojis: ["upvote", "this"],
    color: "green",
    description: "Positive votes"
  },
  {
    id: "downvotes", 
    name: "downvotes",
    displayName: "Downvotes",
    icon: "⬇️",
    emojis: ["downvote"],
    color: "red",
    description: "Negative votes"
  },
  {
    id: "yay",
    name: "yay",
    displayName: "Yay",
    icon: "🎉",
    emojis: ["yay"],
    color: "yellow",
    description: "Celebrations"
  },
  {
    id: "sob",
    name: "sob",
    displayName: "Sob",
    icon: "😭",
    emojis: ["sob", "heavysob", "pf"],
    color: "blue",
    description: "Sadness"
  },
  {
    id: "star",
    name: "star",
    displayName: "Star",
    icon: "⭐",
    emojis: ["star"],
    color: "yellow",
    description: "Excellence"
  },
  {
    id: "fire",
    name: "fire",
    displayName: "Fire",
    icon: "🔥",
    emojis: ["fire"],
    color: "orange",
    description: "Hot content"
  }
];

// Helper functions
export function getAllTrackedEmojis(): string[] {
  return EMOJI_CATEGORIES.flatMap(category => category.emojis);
}

export function getEmojiCategory(emoji: string): EmojiCategory | undefined {
  return EMOJI_CATEGORIES.find(category => category.emojis.includes(emoji));
}

export function getCategoryEmojis(categoryId: string): string[] {
  const category = EMOJI_CATEGORIES.find(c => c.id === categoryId);
  return category ? category.emojis : [];
}

export function isTrackedEmoji(emoji: string): boolean {
  return getAllTrackedEmojis().includes(emoji);
}

// Color mapping for Tailwind classes
export const COLOR_CLASSES = {
  pink: {
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    text: "text-pink-400",
    hover: "hover:bg-pink-500/20",
    gradient: "from-pink-500 to-rose-500"
  },
  red: {
    bg: "bg-red-500/10", 
    border: "border-red-500/20",
    text: "text-red-400",
    hover: "hover:bg-red-500/20",
    gradient: "from-red-500 to-pink-500"
  },
  green: {
    bg: "bg-green-500/10",
    border: "border-green-500/20", 
    text: "text-green-400",
    hover: "hover:bg-green-500/20",
    gradient: "from-green-500 to-emerald-500"
  },
  yellow: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    text: "text-yellow-400", 
    hover: "hover:bg-yellow-500/20",
    gradient: "from-yellow-500 to-orange-500"
  },
  orange: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    text: "text-orange-400",
    hover: "hover:bg-orange-500/20", 
    gradient: "from-orange-500 to-red-500"
  },
  blue: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-400",
    hover: "hover:bg-blue-500/20",
    gradient: "from-blue-500 to-cyan-500"
  },
  gray: {
    bg: "bg-gray-500/10",
    border: "border-gray-500/20",
    text: "text-gray-400", 
    hover: "hover:bg-gray-500/20",
    gradient: "from-gray-500 to-slate-500"
  },
  emerald: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-400",
    hover: "hover:bg-emerald-500/20",
    gradient: "from-emerald-500 to-green-500"
  },
  purple: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/20", 
    text: "text-purple-400",
    hover: "hover:bg-purple-500/20",
    gradient: "from-purple-500 to-pink-500"
  },
  indigo: {
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    text: "text-indigo-400",
    hover: "hover:bg-indigo-500/20",
    gradient: "from-indigo-500 to-purple-500"
  }
}; 