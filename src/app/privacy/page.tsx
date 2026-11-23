import type { Metadata } from "next";
import {
  LegalDocument,
  isDraft,
  readLegalDoc,
} from "@/components/LegalDocument";

// Read at build time from docs/legal.
const markdown = readLegalDoc("privacy-policy.md");

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What AI Wizard Duel collects, what is public, and the choices you have.",
  // Keep drafts out of search results until they're final.
  robots: isDraft(markdown) ? { index: false, follow: false } : undefined,
};

export default function PrivacyPage() {
  return <LegalDocument markdown={markdown} />;
}
