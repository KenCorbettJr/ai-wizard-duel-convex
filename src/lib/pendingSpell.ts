/**
 * A spell a signed-out visitor wrote in the homepage demo. It's kept in this
 * browser and dropped into the spell composer the first time they get to cast
 * in a real duel.
 */
const KEY = "aiwd:pendingSpell";

export function savePendingSpell(spell: string): void {
  try {
    localStorage.setItem(KEY, spell.trim().slice(0, 500));
  } catch {
    // Storage blocked: the visitor just retypes it later.
  }
}

/** Returns the saved spell once, then forgets it. */
export function consumePendingSpell(): string | null {
  try {
    const spell = localStorage.getItem(KEY);
    if (spell) localStorage.removeItem(KEY);
    return spell?.trim() || null;
  } catch {
    return null;
  }
}
