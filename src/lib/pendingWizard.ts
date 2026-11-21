/**
 * A wizard description a signed-out visitor wrote on the homepage. It's kept
 * in this browser through sign-up and dropped into the create-wizard form.
 */
const KEY = "aiwd:pendingWizard";

/** Sign-up that lands on wizard creation afterwards. */
export const CREATE_WIZARD_SIGN_UP_URL = "/sign-up?redirect_url=/wizards/create";

export function savePendingWizard(description: string): void {
  try {
    localStorage.setItem(KEY, description.trim().slice(0, 1000));
  } catch {
    // Storage blocked: the visitor just retypes it later.
  }
}

/** The saved description, if any. Doesn't clear it. */
export function peekPendingWizard(): string | null {
  try {
    return localStorage.getItem(KEY)?.trim() || null;
  } catch {
    return null;
  }
}

export function clearPendingWizard(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
