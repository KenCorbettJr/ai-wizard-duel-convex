import { SignUp } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create your AI Wizard Duel account to start creating magical wizards and battling other players.",
};

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp />
    </div>
  );
}
