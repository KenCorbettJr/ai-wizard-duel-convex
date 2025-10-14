import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Home, Search } from "lucide-react";

export default function UserNotFound() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Card className="text-center">
        <CardHeader className="pb-4">
          <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            <Users className="w-12 h-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">User Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-lg text-muted-foreground">
              The user you&apos;re looking for doesn&apos;t exist or hasn&apos;t
              completed their profile setup.
            </p>
            <p className="text-sm text-muted-foreground">
              They might have changed their username or the link might be
              incorrect.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/wizards" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Browse Wizards
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
