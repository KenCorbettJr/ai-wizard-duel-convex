import type { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/**
 * Returns the wizards with their duel display names: unchanged, except that
 * same-named wizards get their owner added ("Frostfire (Ken)"). Use before
 * building any narration or illustration prompt, so the AI can tell two
 * same-named wizards apart. Null entries stay null.
 */
export async function withDuelNames<
  T extends { _id: Id<"wizards">; name: string },
>(ctx: ActionCtx, wizards: Array<T | null>): Promise<Array<T | null>> {
  const present = wizards.filter((w): w is T => !!w);
  if (present.length < 2) return wizards;
  const names: string[] = await ctx.runQuery(
    internal.wizards.getDuelWizardNames,
    { wizardIds: present.map((w) => w._id) },
  );
  let i = 0;
  return wizards.map((w) => (w ? { ...w, name: names[i++] ?? w.name } : w));
}
