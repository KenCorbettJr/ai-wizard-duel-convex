"use client";

import { Button } from "@/components/ui/button";
import { Share2, Twitter, Facebook, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  className?: string;
}

export function SocialShareButtons({
  url,
  title,
  description,
  className = "",
}: SocialShareButtonsProps) {
  const [isSharing, setIsSharing] = useState(false);

  const shareData = {
    title,
    text: description || title,
    url,
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        setIsSharing(true);
        await navigator.share(shareData);
      } catch (error) {
        // User cancelled or error occurred
        console.log("Share cancelled or failed:", error);
      } finally {
        setIsSharing(false);
      }
    }
  };

  const isShareSupported =
    typeof navigator !== "undefined" && "share" in navigator;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy link:", error);
      toast.error("Failed to copy link");
    }
  };

  const handleTwitterShare = () => {
    const twitterUrl = new URL("https://twitter.com/intent/tweet");
    twitterUrl.searchParams.set("text", `${title} ${url}`);
    if (description) {
      twitterUrl.searchParams.set(
        "text",
        `${title}\n\n${description}\n\n${url}`
      );
    }
    window.open(twitterUrl.toString(), "_blank", "noopener,noreferrer");
  };

  const handleFacebookShare = () => {
    const facebookUrl = new URL("https://www.facebook.com/sharer/sharer.php");
    facebookUrl.searchParams.set("u", url);
    window.open(facebookUrl.toString(), "_blank", "noopener,noreferrer");
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Native share button (mobile) */}
      {isShareSupported && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleNativeShare}
          disabled={isSharing}
          className="flex items-center gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      )}

      {/* Desktop share buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTwitterShare}
          className="flex items-center gap-2"
          title="Share on Twitter"
        >
          <Twitter className="w-4 h-4" />
          <span className="hidden sm:inline">Twitter</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleFacebookShare}
          className="flex items-center gap-2"
          title="Share on Facebook"
        >
          <Facebook className="w-4 h-4" />
          <span className="hidden sm:inline">Facebook</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyLink}
          className="flex items-center gap-2"
          title="Copy link"
        >
          <Copy className="w-4 h-4" />
          <span className="hidden sm:inline">Copy Link</span>
        </Button>
      </div>
    </div>
  );
}
