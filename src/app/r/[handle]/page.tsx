import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import {
  REFERRAL_BONUS_TOKENS,
  STARTING_TOKENS,
} from "../../../../convex/lib/pricing";
import { InviteLanding } from "./InviteLanding";

interface Props {
  params: Promise<{ handle: string }>;
}

async function getInviter(handle: string) {
  try {
    return await fetchQuery(api.referrals.getInviter, { handle });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const inviter = await getInviter(handle);
  const name = inviter?.displayName || inviter?.handle;
  const title = name
    ? `${name} invited you to AI Wizard Duel`
    : "You're invited to AI Wizard Duel";
  const description = inviter
    ? `Create a wizard, cast spells in your own words, and duel. Join through this invite to get ${REFERRAL_BONUS_TOKENS} bonus tokens after your first duel, ${STARTING_TOKENS + REFERRAL_BONUS_TOKENS} in all.`
    : "Create a wizard, cast spells in your own words, and duel other players.";
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description },
    twitter: { card: "summary", title, description },
  };
}

export default async function InvitePage({ params }: Props) {
  const { handle } = await params;
  const inviter = await getInviter(handle);
  return <InviteLanding inviter={inviter} />;
}
