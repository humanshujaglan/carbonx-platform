"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image, { type StaticImageData } from "next/image";
import { explorerUrl } from "@/lib/config";
import { errorMessage } from "@/lib/format";

/** 3D icon image used as a card header mark */
export function CardHeader({
  image,
  title,
  sub,
  right,
}: {
  image: StaticImageData;
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src={image}
          alt=""
          width={72}
          height={72}
          className="-ml-1 -mt-2 size-12 sm:size-14 shrink-0 -rotate-[20deg] object-contain brightness-[0.85] saturate-[0.9]"
        />
        <div className="min-w-0">
          <h2 className="text-base font-medium text-text">{title}</h2>
          {sub && <div className="truncate text-2xs font-normal text-muted">{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "green" | "neutral" | "warn" | "gold" | "cyan";
  children: ReactNode;
}) {
  const styles = {
    green: "bg-neon/15 text-neon",
    neutral: "bg-panel-3 text-muted",
    warn: "bg-danger/15 text-danger",
    gold: "bg-neon-soft/15 text-neon-soft",
    cyan: "bg-emerald-500/15 text-emerald-400",
  }[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-normal uppercase tracking-wider ${styles}`}
    >
      {children}
    </span>
  );
}

/**
 * Days / hours / minutes / seconds countdown boxes
 */
export function Countdown({ seconds, compact = false }: { seconds: number; compact?: boolean }) {
  const s = Math.max(0, Math.floor(seconds));
  const parts = [
    { label: "Days", value: String(Math.floor(s / 86400)).padStart(2, "0") },
    { label: "Hours", value: String(Math.floor((s % 86400) / 3600)).padStart(2, "0") },
    { label: "Mins", value: String(Math.floor((s % 3600) / 60)).padStart(2, "0") },
    { label: "Secs", value: String(s % 60).padStart(2, "0") },
  ];
  return (
    <div
      className="grid grid-cols-4 gap-1.5 sm:gap-2"
      role="timer"
      aria-label={`${parts.map((p) => `${p.value} ${p.label}`).join(" ")}`}
    >
      {parts.map((p, i) => (
        <div
          key={p.label}
          className={`relative overflow-hidden rounded-xl text-center ${compact ? "px-1 py-1.5" : "px-2 py-2.5"} ${
            i === 3 ? "bg-panel-2 shadow-[0_0_12px_rgba(31,224,58,0.15)]" : "well"
          }`}
        >
          <span
            className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-neon-soft/50 to-transparent"
            aria-hidden
          />
          <div className={`font-semibold ${compact ? "text-sm" : "text-xl"} ${i === 3 ? "text-neon-soft" : "text-text"}`}>
            {p.value}
          </div>
          <div className="text-2xs font-normal uppercase tracking-wider text-muted">{p.label}</div>
        </div>
      ))}
    </div>
  );
}

export function Progress({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-neon-deep via-neon to-neon-soft shadow-[0_0_10px_rgba(31,224,58,0.6)] transition-[width] duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * Tall progress bar with its text inside. The fill is a second copy of the bar clipped to the
 * progress width, so text over the fill renders dark and text over the track stays light —
 * the colour switches exactly at the fill edge. Ends are slanted rather than rounded.
 */
export function LabeledProgress({
  value,
  label,
  valueText,
}: {
  value: number;
  label: string;
  valueText: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const shape = "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)";
  const content = (
    <div className="flex h-full items-center justify-between gap-3 px-5 text-2xs font-semibold uppercase tracking-wider">
      <span className="truncate">{label}</span>
      <span className="shrink-0 tabular-nums">{valueText}</span>
    </div>
  );
  return (
    <div
      className="relative h-8 w-full bg-white/[0.06] text-text"
      style={{ clipPath: shape }}
      role="progressbar"
      aria-label={label}
      aria-valuetext={valueText}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {content}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-neon-deep via-neon to-neon-soft text-ink transition-[clip-path] duration-700"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
      >
        {content}
      </div>
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warn" | "error";
  children: ReactNode;
}) {
  const styles = {
    info: "bg-neon/10 text-neon-soft",
    warn: "bg-amber-500/10 text-amber-300",
    error: "bg-danger/10 text-[#ff8f8f]",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl px-3.5 py-2.5 text-xs font-normal leading-relaxed ${styles}`}>
      {children}
    </div>
  );
}

/** Label / value row used in summary lists */
export function Row({ label, value, accent }: { label: ReactNode; value: ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/[0.03] last:border-0">
      <dt className="text-xs font-normal text-muted">{label}</dt>
      <dd className={`text-right text-xs font-medium ${accent ? "text-neon" : "text-text"}`}>{value}</dd>
    </div>
  );
}

export function TxLink({ hash }: { hash: string }) {
  if (!explorerUrl) return <span>{hash.slice(0, 10)}…</span>;
  return (
    <a
      className="underline decoration-dotted underline-offset-2 hover:text-neon"
      href={`${explorerUrl}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
    >
      {hash.slice(0, 10)}…
    </a>
  );
}

type TxResult = { tone: "info" | "error"; text: ReactNode };

/** Runs one wallet action at a time and manages status message */
export function useTx(onDone: () => void) {
  const [busy, setBusy] = useState<string>();
  const [result, setResult] = useState<TxResult>();

  async function run(
    label: string,
    action: () => Promise<string | void>,
    success?: (hash: string) => ReactNode
  ): Promise<boolean> {
    setBusy(label);
    setResult(undefined);
    try {
      const hash = await action();
      if (hash && success) setResult({ tone: "info", text: success(hash) });
      return true;
    } catch (err) {
      setResult({ tone: "error", text: errorMessage(err) });
      return false;
    } finally {
      setBusy(undefined);
      onDone();
    }
  }

  return { busy, result, run, clear: () => setResult(undefined) };
}

export function Spinner() {
  return (
    <span
      className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

/** Short-lived confirmation notification toast */
export function useToast() {
  const [message, setMessage] = useState<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return {
    message,
    show(text: string) {
      setMessage(text);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(undefined), 2200);
    },
  };
}

export function Toast({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="card fixed left-1/2 top-6 z-50 -translate-x-1/2 !rounded-full px-5 py-2.5 text-xs font-normal text-text shadow-2xl backdrop-blur border border-neon/40 flex items-center gap-2 animate-bounce"
    >
      <span className="size-2 rounded-full bg-neon animate-pulse" />
      <span>{message}</span>
    </div>
  );
}
