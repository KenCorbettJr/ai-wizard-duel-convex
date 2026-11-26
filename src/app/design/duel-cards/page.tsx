import { notFound } from "next/navigation";
import { DuelCardGallery } from "./DuelCardGallery";

export const metadata = { title: "Duel cards" };

/** Development-only gallery of every duel card state, using real dev data. */
export default function DuelCardsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DuelCardGallery />;
}
