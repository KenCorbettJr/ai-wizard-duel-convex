"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ConvexError } from "convex/values";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

/** Permanently delete the signed-in player's account, after confirming. */
export function DeleteAccountCard() {
  const profileStatus = useQuery(api.userProfiles.getCurrentUserProfileStatus);
  const deleteAccount = useAction(api.accountDeletion.deleteMyAccount);
  const { signOut } = useClerk();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (profileStatus === undefined) return null;
  // Must match confirmationPhrase() in convex/accountDeletion.ts.
  const phrase = profileStatus?.userId ?? "DELETE";
  const confirmed = confirmation.trim().toLowerCase() === phrase.toLowerCase();

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount({ confirmation });
    } catch (e) {
      setError(
        e instanceof ConvexError
          ? String(e.data)
          : "Something went wrong. Nothing was deleted. Please try again.",
      );
      setDeleting(false);
      return;
    }
    // The sign-in account is already gone; clear the local session.
    try {
      await signOut();
    } catch {
      // Ignore: the session no longer exists on Clerk's side.
    }
    router.push("/");
  };

  return (
    <Card className="mx-auto mt-10 w-full max-w-md border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Delete account</CardTitle>
        <CardDescription>
          Permanently delete your account. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Your profile, username, email and tokens are deleted.</li>
          <li>Duels you&apos;re playing now end as a forfeit.</li>
          <li>
            Campaign battles and wizards that never faced another player are
            deleted.
          </li>
          <li>
            Duels against other players stay for them, with your wizard shown as
            departed and your chat messages removed.
          </li>
        </ul>
        <AlertDialog
          onOpenChange={(open) => {
            if (!open && !deleting) {
              setConfirmation("");
              setError(null);
            }
          }}
        >
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full border-destructive/60 text-destructive hover:bg-destructive/10"
            >
              Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account for good?</AlertDialogTitle>
              <AlertDialogDescription>
                Your unused tokens are lost and won&apos;t be refunded. To
                confirm, type{" "}
                <strong className="text-foreground">{phrase}</strong> below.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation" className="sr-only">
                Type {phrase} to confirm
              </Label>
              <Input
                id="delete-confirmation"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
                disabled={deleting}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <Button
                onClick={handleDelete}
                disabled={!confirmed || deleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleting ? "Deleting…" : "Delete account"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
