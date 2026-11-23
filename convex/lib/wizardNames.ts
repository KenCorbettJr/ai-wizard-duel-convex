/**
 * Wizard names are unique within one player's roster, but different players
 * can share a name. These helpers keep a duel between two same-named wizards
 * readable. Pure functions, shared by the app and the narration prompts.
 */

/** Names compare without case, extra spaces or surrounding whitespace. */
export function normalizeWizardName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/**
 * Returns the wizards with any shared names made distinct by adding the
 * owner, e.g. "Frostfire (Ken)". Wizards with unique names, and null or
 * undefined entries, come back unchanged (same object), so loading checks
 * and memoization still work. Falls back to "Player 1", "Player 2" when owners
 * are unknown or share a label too.
 */
export function labelDuplicateNames<T extends { name: string }>(
  wizards: ReadonlyArray<T | null | undefined>,
  ownerLabel: (wizard: T) => string | undefined,
): Array<T | null | undefined> {
  const counts = new Map<string, number>();
  for (const w of wizards) {
    if (!w) continue;
    const key = normalizeWizardName(w.name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Owner labels within each group of duplicates, to spot clashes there too.
  const labelsByName = new Map<string, Array<string | undefined>>();
  for (const w of wizards) {
    if (!w || (counts.get(normalizeWizardName(w.name)) ?? 0) < 2) continue;
    const key = normalizeWizardName(w.name);
    const label = ownerLabel(w)?.trim() || undefined;
    labelsByName.set(key, [...(labelsByName.get(key) ?? []), label]);
  }

  return wizards.map((w, i) => {
    if (!w) return w;
    const key = normalizeWizardName(w.name);
    if ((counts.get(key) ?? 0) < 2) return w;
    const label = ownerLabel(w)?.trim() || undefined;
    const group = labelsByName.get(key) ?? [];
    const usable =
      label &&
      group.filter((l) => l?.toLowerCase() === label.toLowerCase()).length ===
        1;
    return { ...w, name: `${w.name} (${usable ? label : `Player ${i + 1}`})` };
  });
}

/** Owner label for a wizard as returned by wizards.getWizardWithOwner. */
export function ownerLabelOf(wizard: {
  owner?: string;
  ownerUserId?: string;
  ownerDisplayName?: string;
}): string | undefined {
  if (wizard.owner === "campaign") return "Campaign";
  return wizard.ownerDisplayName ?? wizard.ownerUserId;
}
