/**
 * Portrait-job status shared by the backend and the UI.
 *
 * A wizard's `illustrationStatus` is "sketching" while the plain reference
 * image is generated, "painting" while the themed scene is generated, and
 * "failed" if the job errored. A job that crashed without reporting back would
 * leave the status stuck, so anything older than this is treated as finished.
 */
export const PORTRAIT_JOB_STALE_MS = 5 * 60 * 1000;

export type PortraitStage = "sketching" | "painting";

export interface PortraitStatusFields {
  illustrationStatus?: "sketching" | "painting" | "failed";
  illustrationRequestedAt?: number;
}

/** The stage of an in-flight portrait job, or null if none is running. */
export function activePortraitStage(
  wizard: PortraitStatusFields,
  now: number,
): PortraitStage | null {
  const { illustrationStatus: status, illustrationRequestedAt: at } = wizard;
  if (status !== "sketching" && status !== "painting") return null;
  if (at === undefined || now - at > PORTRAIT_JOB_STALE_MS) return null;
  return status;
}
