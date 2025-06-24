import { LucideIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ReactionIconProps {
  icon: LucideIcon | string;
  name: string;
  size?: number;
  className?: string;
  emoji?: string;
}

export const ReactionIcon = ({ icon: Icon, name, size = 20, className, emoji }: ReactionIconProps) => {
  const [emojiError, setEmojiError] = useState(false);

  if (emoji && !emojiError) {
    return (
      <Image 
        src={`/api/slack/emoji/${emoji}`} 
        alt={name} 
        width={size} 
        height={size} 
        className={className}
        onError={() => setEmojiError(true)}
        unoptimized 
      />
    );
  }

  if (typeof Icon === 'string') {
    return <Image src={Icon} alt={name} width={size} height={size} className={className} unoptimized />;
  }
  return <Icon size={size} className={className} />;
}; 