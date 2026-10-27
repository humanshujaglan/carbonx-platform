"use client";

import { VESTING_OPTIONS } from "@/lib/roi";

/**
 * Working income withdrawal options, mirroring `DaddyFormulae.getVestingParams`.
 * Every option creates a vesting schedule; the deduction already includes the 5% protocol fee
 * and the net amount is released in CARB at spot price over the option's duration.
 */
export function VestingOptions({
  value,
  onChange,
  amountUsd,
}: {
  value: number;
  onChange: (option: number) => void;
  amountUsd: number;
}) {
  const selected = VESTING_OPTIONS.find((o) => o.id === value) ?? VESTING_OPTIONS[0];
  const netUsd = (amountUsd * (100 - selected.deductionPct)) / 100;

  return (
    <div className="flex flex-col gap-2 pt-1">
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {VESTING_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`rounded-xl p-2 text-center text-2xs font-medium transition cursor-pointer ${
              value === o.id
                ? "bg-neon/15 text-neon border border-neon/40 font-semibold"
                : "well text-muted hover:text-text"
            }`}
          >
            <div>{o.duration}</div>
            <div className="text-2xs opacity-80">−{o.deductionPct}%</div>
          </button>
        ))}
      </div>
      <div className="text-2xs text-muted">
        You receive{" "}
        <span className="font-semibold text-neon-soft">
          ${netUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>{" "}
        ({100 - selected.deductionPct}%) in CARB at spot price, released over {selected.duration}. Max 3 active vesting schedules.
      </div>
    </div>
  );
}
