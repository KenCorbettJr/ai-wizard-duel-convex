import { SignUp } from "@clerk/nextjs";
import { ClientOnly } from "@/components/ClientOnly";
import { PendingWizardNotice } from "@/components/PendingWizardNotice";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your AI Wizard Duel account to start creating magical wizards and battling other players.",
};

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <ClientOnly>
        <div className="flex w-full flex-col items-center gap-4">
          <PendingWizardNotice mode="sign-up" />
          {/* New players go straight to creating their first wizard. A
              redirect_url in the query still takes precedence. */}
          <SignUp fallbackRedirectUrl="/wizards/create" />
        </div>
      </ClientOnly>
    </div>
  );
}
