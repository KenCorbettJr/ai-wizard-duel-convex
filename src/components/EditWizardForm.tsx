"use client";

import { useUser } from "@clerk/nextjs";
import { Id } from "../../convex/_generated/dataModel";
import { WizardForm } from "./WizardForm";

interface EditWizardFormProps {
  wizard: {
    _id: Id<"wizards">;
    name: string;
    description: string;
    isAIPowered?: boolean;
    owner: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function EditWizardForm({
  wizard,
  onClose,
  onSuccess,
}: EditWizardFormProps) {
  const { user } = useUser();

  // Check if current user is the owner
  if (!user || user.id !== wizard.owner) {
    return null;
  }

  return (
    <WizardForm
      mode="edit"
      initialData={{
        name: wizard.name,
        description: wizard.description,
        isAIPowered: wizard.isAIPowered || false,
      }}
      wizardId={wizard._id}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}
