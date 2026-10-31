import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavigationProps {
  showDashboard?: boolean;
  showUserInfo?: boolean;
  userName?: string;
}

export function Navigation({
  showDashboard = false,
  showUserInfo = false,
  userName,
}: NavigationProps) {
  return (
    <nav className="flex items-center justify-between p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <Link href="/">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-cinzel)]">
          AI Wizard Duel
        </h1>
      </Link>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {showUserInfo && (
          <span className="text-muted-foreground">
            Welcome, {userName || "Wizard"}!
          </span>
        )}
        <Show when="signed-in">
          {showDashboard && (
            <Link href="/">
              <Button variant="outline">Dashboard</Button>
            </Link>
          )}
          <UserButton />
        </Show>
        <Show when="signed-out">
          <SignInButton>
            <Button>Sign In</Button>
          </SignInButton>
        </Show>
      </div>
    </nav>
  );
}
