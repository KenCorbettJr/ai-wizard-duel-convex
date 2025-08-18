import { User } from "@clerk/nextjs/server";

export type UserRole = "user" | "admin" | "super_admin";

/**
 * Check if a user has super admin privileges
 */
export function isSuperAdmin(user: User | null | undefined): boolean {
  if (!user) return false;

  // Allow super admin access in development mode
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  return user.publicMetadata?.role === "super_admin";
}

/**
 * Check if a user has admin privileges (admin or super_admin)
 */
export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;

  // Allow admin access in development mode
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const role = user.publicMetadata?.role as UserRole;
  return role === "admin" || role === "super_admin";
}

/**
 * Get the user's role
 */
export function getUserRole(user: User | null | undefined): UserRole {
  if (!user) return "user";

  return (user.publicMetadata?.role as UserRole) || "user";
}
