import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    if (!userId) {
      return NextResponse.next();
    }

    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_WAITLIST_ENABLED !== "true"
    ) {
      return NextResponse.next();
    }

    const publicMetadata = sessionClaims?.publicMetadata as
      | {
          role?: string;
          waitlistApproved?: boolean;
        }
      | undefined;

    if (
      publicMetadata?.role === "admin" ||
      publicMetadata?.role === "super_admin"
    ) {
      return NextResponse.next();
    }

    const isApproved = publicMetadata?.waitlistApproved === true;

    if (!isApproved) {
      const waitlistUrl = new URL("/waitlist", req.url);
      return NextResponse.redirect(waitlistUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
