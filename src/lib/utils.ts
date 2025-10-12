import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Id, TableNames } from "../../convex/_generated/dataModel";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validates if a string is a valid Convex ID format
 * Convex IDs are base64url encoded strings that start with a table prefix
 */
export function isValidConvexId(id: string): boolean {
  if (!id || typeof id !== "string") {
    return false;
  }

  // Convex IDs are typically base64url encoded and have a specific format
  // They should be at least 16 characters long and contain only valid base64url characters
  const base64urlPattern = /^[A-Za-z0-9_-]+$/;

  if (id.length < 16 || !base64urlPattern.test(id)) {
    return false;
  }

  // Additional validation could be added here if needed
  // For now, we'll do a basic format check
  return true;
}

/**
 * Safely casts a string to a Convex ID if it's valid, otherwise returns null
 */
export function safeConvexId<T extends TableNames>(id: string): Id<T> | null {
  if (!isValidConvexId(id)) {
    return null;
  }
  return id as Id<T>;
}
