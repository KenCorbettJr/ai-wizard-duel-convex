import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define protected routes that require waitlist approval
const isProtectedRoute = createRouteMatcher([
  "/wizards(.*)",
  "/duels(.*)",
  "/campaign(.*)",
  "/leaderboard(.*)",
  "/profile(.*)",
  "/admin(.*)",
  "/credits(.*)",
]);

// Define public routes that don't require authentication or waitlist approval
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/waitlist(.*)",
  "/api(.*)",
  "/join(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { userId, sessionClaims } = await auth();

  // Allow public routes without any checks
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // For protected routes, check authentication and waitlist approval
  if (isProtectedRoute(req)) {
    // If not authenticated, Clerk will handle the redirect to sign-in
    if (!userId) {
      return NextResponse.next();
    }

    // Bypass waitlist checks in development mode if not explicitly enabled
    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_WAITLIST_ENABLED !== "true"
    ) {
      return NextResponse.next();
    }

    // Get user metadata from session claims
    const publicMetadata = sessionClaims?.publicMetadata as
      | {
          role?: string;
          waitlistApproved?: boolean;
        }
      | undefined;

    // Admins and super admins are automatically approved
    if (
      publicMetadata?.role === "admin" ||
      publicMetadata?.role === "super_admin"
    ) {
      return NextResponse.next();
    }

    // Check if user is approved on the waitlist
    const isApproved = publicMetadata?.waitlistApproved === true;

    if (!isApproved) {
      // Redirect unapproved users to the waitlist page
      const waitlistUrl = new URL("/waitlist", req.url);
      return NextResponse.redirect(waitlistUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
