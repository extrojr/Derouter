import { Suspense } from "react";
import { CardSkeleton } from "@/shared/components/Loading";
import ProviderLimits from "../usage/components/ProviderLimits";
import ProviderCreditPool from "../usage/components/ProviderCreditPool";

export default function QuotaPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <div className="flex flex-col gap-6">
        <ProviderCreditPool />
        <ProviderLimits />
      </div>
    </Suspense>
  );
}
