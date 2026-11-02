"use client";

/** One countdown unit: a dark rounded box with a thin green line along its top edge. */
function TimeBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="relative flex min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-xl bg-[#171a1f] px-1 py-2.5 sm:py-3">
      {/* Thin green line on the top edge */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-px w-3/5 -translate-x-1/2 bg-gradient-to-r from-transparent via-neon/60 to-transparent"
      />
      <span className="relative text-lg font-semibold text-white sm:text-xl">{value}</span>
      <span className="relative text-2xs text-muted">{label}</span>
    </div>
  );
}

/** Time pending: days / hrs / min / sec boxes counting down to a deadline. */
export function CountdownTimer({
  secondsRemaining,
  title,
  subtitle,
  showDays,
  showMonths = false,
}: {
  secondsRemaining: number;
  title?: string;
  subtitle?: string;
  /** Defaults to showing days only when there is at least one full day left. */
  showDays?: boolean;
  /** Adds a months box (30-day months) and shows only the days left over. */
  showMonths?: boolean;
}) {
  const total = Math.max(0, Math.floor(Number(secondsRemaining) || 0));
  const totalDays = Math.floor(total / 86400);
  const months = showMonths ? Math.floor(totalDays / 30) : 0;
  const days = showMonths ? totalDays % 30 : totalDays;
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const displayDays = showDays ?? (showMonths || days > 0);
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="flex w-full select-none flex-col items-center justify-center gap-2 py-2">
      {(title || subtitle) && (
        <div className="flex flex-col items-center gap-0.5 text-center">
          {title && <span className="text-sm font-medium text-white">{title}</span>}
          {subtitle && <span className="text-[11px] font-medium text-muted">{subtitle}</span>}
        </div>
      )}
      <div className="flex w-full items-stretch gap-2 sm:gap-3">
        {showMonths && <TimeBox value={pad(months)} label="Months" />}
        {displayDays && <TimeBox value={pad(days)} label="Days" />}
        <TimeBox value={pad(hours)} label="Hours" />
        <TimeBox value={pad(minutes)} label="Mins" />
        <TimeBox value={pad(seconds)} label="Secs" />
      </div>
    </div>
  );
}
