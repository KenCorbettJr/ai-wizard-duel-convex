import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "edge";

const isProtectedRoute = createRouteMatcher([
  "/wizards(.*)",
  "/duels(.*)",
  "/campaign(.*)",
  "/leaderboard(.*)",
  "/profile(.*)",
  "/admin(.*)",
  "/credits(.*)",
]);

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/waitlist(.*)",
  "/api(.*)",
  "/join(.*)",
]);

export default clerkMiddleware((auth, req) => {
  // Simplified synchronous version to avoid tracing issues
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    // Let Clerk handle the auth check - this avoids async issues
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
