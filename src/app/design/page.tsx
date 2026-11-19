import { notFound } from "next/navigation";
import { Crown, Flame, Scroll, Sparkles, Wand2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { RuneSpinner } from "@/components/ui/rune-spinner";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";

export const metadata = { title: "Design system" };

/** Development-only gallery of the shared UI primitives. */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader
        title="Design System"
        description="Every shared primitive in one place, in the current theme."
        icon={<Wand2 className="h-6 w-6" aria-hidden="true" />}
        actions={<Button variant="gold">Primary action</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Variants and sizes</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="gold">Gold</Button>
            <Button variant="success">Success</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">
              <Flame aria-hidden="true" />
              Large
            </Button>
            <Button size="icon" aria-label="Spellbook">
              <Scroll aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status and rarity</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Victory</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="info">Spectating</Badge>
            <Badge variant="destructive">Defeat</Badge>
            <Badge variant="gold">Rare</Badge>
            <Badge variant="legendary">
              <Crown className="mr-1 size-3" aria-hidden="true" />
              Legendary
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert variant="success">
              <AlertDescription>Your spell landed perfectly.</AlertDescription>
            </Alert>
            <Alert variant="warning">
              <AlertDescription>Your tokens are running low.</AlertDescription>
            </Alert>
            <Alert variant="info">
              <AlertDescription>A new season has begun.</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertDescription>The spell fizzled. Try again.</AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Form and feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input aria-label="Wizard name" placeholder="Name your wizard" />
            <Progress value={65} aria-label="Hit points" />
            <RuneSpinner label="Brewing a potion…" />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <EmptyState
            icon={<Sparkles className="size-7" aria-hidden="true" />}
            title="No wizards yet"
            description="Every great archmage started with a single cantrip. Forge your first wizard."
            action={<Button>Create a wizard</Button>}
          />
        </div>
      </div>
    </div>
  );
}
