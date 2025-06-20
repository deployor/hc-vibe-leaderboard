import { LucideIcon } from "lucide-react";
import Image from "next/image";

interface ReactionIconProps {
  icon: LucideIcon | string;
  name: string;
  size?: number;
  className?: string;
}

export const ReactionIcon = ({ icon: Icon, name, size = 20, className }: ReactionIconProps) => {
  if (typeof Icon === 'string') {
    return <Image src={Icon} alt={name} width={size} height={size} className={className} unoptimized />;
  }
  return <Icon size={size} className={className} />;
}; 