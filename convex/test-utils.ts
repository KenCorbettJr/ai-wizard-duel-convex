import { Id, TableNames } from "./_generated/dataModel";

// Generate a proper Convex ID for testing
// Convex IDs follow the pattern: k{table_number}{random_string}
export function generateTestId<T extends TableNames>(table: T): Id<T> {
  // Generate a random string that looks like a real Convex ID
  // Real Convex IDs are base32-encoded and around 26 characters
  const chars = "0123456789abcdefghjkmnpqrstvwxyz"; // base32 alphabet
  let randomString = "";
  for (let i = 0; i < 25; i++) {
    randomString += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Use a consistent prefix that looks like real Convex IDs
  return `k${randomString}` as Id<T>;
}

// Generate multiple test IDs
export function generateTestIds<T extends TableNames>(
  table: T,
  count: number
): Id<T>[] {
  return Array.from({ length: count }, () => generateTestId(table));
}
