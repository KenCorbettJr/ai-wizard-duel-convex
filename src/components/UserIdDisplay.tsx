"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface UserIdDisplayProps {
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  showAvatar?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  clickable?: boolean;
}

const sizeClasses = {
  sm: {
    avatar: "h-6 w-6",
    text: "text-sm",
    icon: "h-3 w-3",
  },
  md: {
    avatar: "h-8 w-8",
    text: "text-base",
    icon: "h-4 w-4",
  },
  lg: {
    avatar: "h-10 w-10",
    text: "text-lg",
    icon: "h-5 w-5",
  },
};

export function UserIdDisplay({
  userId,
  displayName,
  avatarUrl,
  showAvatar = false,
  size = "md",
  className,
  clickable = true,
}: UserIdDisplayProps) {
  const sizeConfig = sizeClasses[size];

  // Fallback for users without handles
  if (!userId) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-muted-foreground",
          className
        )}
      >
        {showAvatar && (
          <Avatar className={sizeConfig.avatar}>
            <AvatarFallback className="bg-muted">
              <User className={sizeConfig.icon} />
            </AvatarFallback>
          </Avatar>
        )}
        <span className={cn(sizeConfig.text, "italic")}>
          {displayName || "Anonymous User"}
        </span>
      </div>
    );
  }

  const usernameContent = (
    <div
      className={cn(
        "flex items-center gap-2",
        clickable && "hover:text-primary transition-colors cursor-pointer",
        className
      )}
    >
      {showAvatar && (
        <Avatar className={sizeConfig.avatar}>
          {avatarUrl && (
            <AvatarImage src={avatarUrl} alt={displayName || userId} />
          )}
          <AvatarFallback className="bg-primary/10 text-primary">
            {(displayName || userId).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <span className={cn(sizeConfig.text, "text-foreground font-mono")}>
        @{userId}
      </span>
    </div>
  );

  const content = displayName ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{usernameContent}</TooltipTrigger>
        <TooltipContent>
          <p>{displayName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    usernameContent
  );

  if (!clickable) {
    return content;
  }

  return (
    <Link href={`/users/${userId}`} className="inline-block">
      {content}
    </Link>
  );
}
