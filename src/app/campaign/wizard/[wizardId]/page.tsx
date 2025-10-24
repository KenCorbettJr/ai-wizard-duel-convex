import { Suspense } from "react";
import { CampaignLoadingState } from "@/components/CampaignLoadingState";
import WizardCampaignClient from "./WizardCampaignClient";

function LoadingFallback() {
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <CampaignLoadingState
          type="general"
          message="Loading wizard campaign..."
        />
      </div>
    </div>
  );
}

export default function WizardCampaignPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WizardCampaignClient />
    </Suspense>
  );
}
