import { redirect } from "next/navigation";

/**
 * Legacy route. Battles are now started from the hub or the per-wizard map,
 * so send anyone with an old link to the campaign hub.
 */
export default function WizardSelectionRedirect() {
  redirect("/campaign");
}
