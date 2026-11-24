"use node";

/**
 * Uploads an approved teaser to the connected YouTube channel.
 *
 * Needs YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET and YOUTUBE_REFRESH_TOKEN
 * (an OAuth refresh token for the channel, with the youtube.upload scope).
 * Until Google audits the API project, YouTube makes every upload private;
 * set YOUTUBE_PRIVACY to "unlisted" or "private" to choose that yourself.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { captureServerEvent } from "./lib/posthog";

const GAMING_CATEGORY = "20";

async function accessToken(): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      refresh_token: process.env.YOUTUBE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Google sign-in ${response.status}: ${(await response.text()).slice(0, 300)}`,
    );
  }
  const { access_token } = (await response.json()) as { access_token?: string };
  if (!access_token) throw new Error("Google returned no access token");
  return access_token;
}

export function youtubeDescription(
  description: string,
  duelUrl: string,
): string {
  return [
    description.trim(),
    "",
    `See how it ended: ${duelUrl}`,
    "",
    "Every spell is written by a player, and the duel is narrated and illustrated by AI.",
    "#Shorts #AIWizardDuel #Wizards #AIArt",
  ]
    .join("\n")
    .slice(0, 4900);
}

export const uploadToYouTube = internalAction({
  args: { teaserId: v.id("duelTeasers") },
  returns: v.null(),
  handler: async (ctx, { teaserId }) => {
    const started = Date.now();
    try {
      const source = await ctx.runQuery(internal.teasers.getPublishSource, {
        teaserId,
      });
      if (!source) return null;
      const video = await ctx.storage.get(source.videoStorageId);
      if (!video) throw new Error("The rendered video is missing");

      const site = process.env.SITE_URL ?? "https://aiwizardduel.com";
      const token = await accessToken();
      const metadata = {
        snippet: {
          title: source.title.slice(0, 100),
          description: youtubeDescription(
            source.description,
            `${site}/duels/${source.duelId}`,
          ),
          categoryId: GAMING_CATEGORY,
          tags: [
            "AI Wizard Duel",
            "wizard duel",
            "AI game",
            "AI art",
            "Shorts",
          ],
        },
        status: {
          privacyStatus: process.env.YOUTUBE_PRIVACY ?? "public",
          selfDeclaredMadeForKids: false,
          containsSyntheticMedia: true,
        },
      };

      const start = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/mp4",
            "X-Upload-Content-Length": String(video.size),
          },
          body: JSON.stringify(metadata),
        },
      );
      const uploadUrl = start.headers.get("location");
      if (!start.ok || !uploadUrl) {
        throw new Error(
          `YouTube ${start.status}: ${(await start.text()).slice(0, 300)}`,
        );
      }

      const upload = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4" },
        body: video,
      });
      if (!upload.ok) {
        throw new Error(
          `YouTube upload ${upload.status}: ${(await upload.text()).slice(0, 300)}`,
        );
      }
      const { id } = (await upload.json()) as { id?: string };
      if (!id) throw new Error("YouTube returned no video ID");

      await ctx.runMutation(internal.teasers.finishPublish, {
        teaserId,
        youtubeVideoId: id,
      });
      await captureServerEvent("teaser_published", {
        durationMs: Date.now() - started,
      });
    } catch (error) {
      console.error("YouTube upload failed:", error);
      await ctx.runMutation(internal.teasers.finishPublish, {
        teaserId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  },
});
