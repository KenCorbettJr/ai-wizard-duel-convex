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
    <nav className="flex items-center justify-between p-6 bg-background/80 backdrop-blur-sm">
      <Link href="/">
        <span className="text-2xl font-bold font-display">AI Wizard Duel</span>
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
            <Button asChild variant="outline">
              <Link href="/">Dashboard</Link>
            </Button>
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
