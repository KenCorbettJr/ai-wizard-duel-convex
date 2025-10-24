import { useQuery } from "convex/react";
import { FunctionReference, OptionalRestArgs } from "convex/server";
import { transformConvexImageUrl } from "@/lib/convex-image-proxy";

/**
 * Custom hook that wraps useQuery for Convex image URLs and automatically
 * transforms them to use our proxy in emulation mode
 */
export function useConvexImage<T extends FunctionReference<"query">>(
  query: T,
  ...args: OptionalRestArgs<T>
): string | null | undefined {
  const rawUrl = useQuery(query, ...args);
  return transformConvexImageUrl(rawUrl);
}
