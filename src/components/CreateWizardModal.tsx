"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { WizardForm } from './WizardForm';

interface CreateWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateWizardModal({ open, onOpenChange, onSuccess }: CreateWizardModalProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Create New Wizard</DialogTitle>
          <DialogDescription>
            Design your magical companion for battle
          </DialogDescription>
        </DialogHeader>
        <div className="mt-0">
          <WizardForm
            mode="create"
            onClose={handleClose}
            onSuccess={handleSuccess}
            inModal={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}