import type { Metadata } from "next";
import {
  LegalDocument,
  isDraft,
  readLegalDoc,
} from "@/components/LegalDocument";

// Read at build time from docs/legal.
const markdown = readLegalDoc("terms-of-use.md");

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The rules for using AI Wizard Duel, a public platform run by Forthought Labs LLC.",
  // Keep drafts out of search results until they're final.
  robots: isDraft(markdown) ? { index: false, follow: false } : undefined,
};

export default function TermsPage() {
  return <LegalDocument markdown={markdown} />;
}
