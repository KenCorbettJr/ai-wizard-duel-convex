"use client";

import { WizardForm } from './WizardForm';

interface CreateWizardFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateWizardForm({ onClose, onSuccess }: CreateWizardFormProps) {
  const handleSuccess = () => {
    onSuccess?.();
  };

  return (
    <WizardForm
      mode="create"
      onClose={onClose}
      onSuccess={handleSuccess}
    />
  );
}