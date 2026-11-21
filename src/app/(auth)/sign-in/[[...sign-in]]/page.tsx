import { SignIn } from "@clerk/nextjs";
import { ClientOnly } from "@/components/ClientOnly";
import { PendingWizardNotice } from "@/components/PendingWizardNotice";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your AI Wizard Duel account to create wizards and participate in magical battles.",
};

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <ClientOnly>
        <div className="flex w-full flex-col items-center gap-4">
          <PendingWizardNotice mode="sign-in" />
          <SignIn />
        </div>
      </ClientOnly>
    </div>
  );
}
