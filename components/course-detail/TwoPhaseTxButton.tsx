import { Check, Loader2 } from "lucide-react";
import type { PurchaseState } from "@/lib/purchase/usePurchaseFlow";

interface TwoPhaseTxButtonProps {
  state: PurchaseState;
  priceYD: number;
  onApprove: () => void;
  onBuy: () => void;
}

export function TwoPhaseTxButton({ state, priceYD, onApprove, onBuy }: TwoPhaseTxButtonProps) {
  const phase1Done = state === "ready-to-buy" || state === "buying";

  return (
    <div className="flex flex-col gap-stack-sm">
      <div
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-label-md font-mono transition-colors duration-300 ${
          phase1Done
            ? "bg-secondary-container text-on-secondary-container"
            : "bg-surface-container-high text-on-surface-variant"
        }`}
      >
        {phase1Done ? (
          <Check className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <span className="size-4 shrink-0 rounded-full border border-current" aria-hidden="true" />
        )}
        Phase 1: {phase1Done ? "已授权" : `授权 ${priceYD} YD`}
      </div>

      {!phase1Done ? (
        <button
          type="button"
          onClick={onApprove}
          disabled={state === "approving"}
          className="flex items-center justify-center gap-2 rounded-md bg-primary-container px-4 py-3 font-sans text-body-md font-medium text-on-primary-container transition-all duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {state === "approving" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              授权中...
            </>
          ) : (
            `授权 ${priceYD} YD`
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onBuy}
          disabled={state === "buying"}
          className="flex items-center justify-center gap-2 rounded-md bg-primary-container px-4 py-3 font-sans text-body-md font-medium text-on-primary-container transition-all duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {state === "buying" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              购买中...
            </>
          ) : (
            `Phase 2: 购买课程`
          )}
        </button>
      )}
    </div>
  );
}
