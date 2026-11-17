import { SignIn } from "@clerk/nextjs";
import { ClientOnly } from "@/components/ClientOnly";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your AI Wizard Duel account to create wizards and participate in magical battles.",
};

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <ClientOnly>
        <SignIn />
      </ClientOnly>
    </div>
  );
}
