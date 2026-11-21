import type { Metadata } from "next";
import { NotificationsPageClient } from "./NotificationsPageClient";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false },
};

export default function NotificationsPage() {
  return <NotificationsPageClient />;
}
