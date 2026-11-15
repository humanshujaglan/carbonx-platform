"use client";

import { useState } from "react";
import { Copy, TickCircle } from "iconsax-react";
import { platformAbi } from "@/lib/abi";
import { usd } from "@/lib/format";
import { formatLeaderCode, type PlatformAddresses, type PlatformUser } from "@/lib/platform";
import { Notice, Row, Spinner, useTx } from "./ui";
import { FaqAccordion, type FaqItem } from "./faq-accordion";
import { InfoSheet, SheetBlock } from "./info-sheet";
import { useWallet } from "./wallet";

/**
 * Leader code unlocks once clean weaker-leg business reaches 3,000 USDT (TeamEngine `_checkLeaderCodeUnlock`).
 * Clean = all deposits (first package and re-top-ups) from downlines who registered without a leader code;
 * weaker = team clean − power leg clean.
 */
const LEADER_CODE_WEAKER_CLEAN_TARGET = 3_000n * 10n ** 18n;
const CHECK_LABEL = "Checking Leader Code Qualification...";

const FAQ: FaqItem[] = [
  {
    q: "Are re-top-ups considered in weaker leg clean business?",
    a: "Yes. Both the first package and every later re-top-up from a downline count towards your weaker leg clean business, as long as that downline registered without a leader code.",
  },
  {
    q: "Is business coming from a user already registered with a leader code considered?",
    a: "No. If a downline registered using a leader code, none of their business counts. Only members who joined without a leader code are counted.",
  },
];

export function LeaderCodeCard({
  user,
  addresses,
  onDone,
}: {
  user?: PlatformUser;
  addresses?: PlatformAddresses;
  onDone: () => void;
}) {
  const { account, write } = useWallet();
  const tx = useTx(onDone);

  const cleanWeaker = user?.cleanWeakerLegBusiness ?? 0n;
  const legCount = user?.directDownlines?.length ?? 0;
  const leaderCode = user?.leaderCode ?? 0n;
  const unlocked = leaderCode > 0n;
  // Criteria met but the code isn't minted yet: checkLeaderCode() assigns it on-chain
  const eligible = !unlocked && cleanWeaker >= LEADER_CODE_WEAKER_CLEAN_TARGET;
  const displayCode = formatLeaderCode(leaderCode);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    if (unlocked && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(displayCode.toString()).then(() => {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      });
    }
  };

  const progress = unlocked
    ? 1
    : Math.min(1, Number(cleanWeaker) / Number(LEADER_CODE_WEAKER_CLEAN_TARGET));
  const percent = Math.floor(progress * 100);

  async function handleCheckLeaderCode() {
    if (!addresses || !account) return;
    await tx.run(
      CHECK_LABEL,
      async () => {
        return write({
          address: addresses.platform,
          abi: platformAbi,
          functionName: "checkLeaderCode",
        });
      },
      () => <span>Leader Code check complete!</span>
    );
  }

  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-5" aria-label="Leader code activation">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-text">Leader code activation</h3>
        <div className="flex items-center gap-3">
          <InfoSheet title="Leader code activation">
            <p>
              You unlock your leader code once you have $3,000 of weaker leg business that did not come through a
              leader code. First packages and re-top-ups both count, and your power leg is left out.
            </p>
            <SheetBlock title="Requirement">
              <dl>
                <Row label="Needed" value="$3K weaker leg non leader code business" accent />
                <Row label="Your progress" value={`${usd(cleanWeaker)} / ${usd(LEADER_CODE_WEAKER_CLEAN_TARGET)}`} />
              </dl>
            </SheetBlock>
          </InfoSheet>
        </div>
      </div>

      {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-semibold text-white">{user ? usd(cleanWeaker) : "—"}</span>
      </div>

      {/* Progress towards the leader code */}
      <div className="h-12 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress * 100}%`,
            minWidth: progress > 0 ? 12 : 0,
            background: "linear-gradient(90deg, #17583a, #3ddc84)",
          }}
        />
      </div>

      <dl className="flex flex-col">
        <div className="flex items-center gap-3 border-t border-white/[0.08] py-3 text-sm first:border-t-0">
          <span className="size-3 shrink-0 rounded-full" style={{ background: "#3ddc84" }} />
          <dt className="min-w-0 flex-1 truncate text-white">Weaker leg</dt>
          <dd className="shrink-0 font-semibold text-white">
            {usd(cleanWeaker)}
            <span className="font-normal text-muted"> / {usd(LEADER_CODE_WEAKER_CLEAN_TARGET)}</span>
          </dd>
          <dd className="w-10 shrink-0 text-right text-muted">{percent}%</dd>
        </div>
      </dl>

      {!unlocked && legCount < 2 && (
        <Notice tone="warn">
          {legCount === 0
            ? "You have no legs yet. Sponsor at least two direct partners to start building weaker leg business."
            : "You have only one leg, so all its business counts as power leg. Build a second leg to grow weaker leg business."}
        </Notice>
      )}

      {/* Nothing is shown until the criteria is met; then the lock opens and Check reveals the code */}
      {unlocked && (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.06] py-4">
          <div className="text-xs text-muted">Your leader code</div>
          <span className="font-display text-[72px] font-bold leading-none tracking-tight text-white">
            {displayCode.toString()}
          </span>
          <button
            type="button"
            onClick={handleCopyCode}
            className="mt-1 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-2xs text-muted transition hover:border-white/20 hover:text-white cursor-pointer"
            aria-label="Copy leader code"
          >
            {copiedCode ? (
              <>
                <TickCircle size={14} color="#3ddc84" variant="Linear" />
                <span className="text-neon-soft">Copied #{displayCode.toString()}</span>
              </>
            ) : (
              <>
                <Copy size={14} color="currentColor" variant="Linear" />
                <span>Copy #{displayCode.toString()}</span>
              </>
            )}
          </button>
        </div>
      )}

      {eligible && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-neon/30 bg-neon/[0.04] py-5">
          <svg viewBox="0 0 48 60" className="h-16 w-14 overflow-visible" aria-hidden>
            <path
              className="animate-unlock origin-[34px_28px]"
              d="M14 28 V18 a10 10 0 0 1 20 0 V28"
              fill="none"
              stroke="#3ddc84"
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <rect x="5" y="27" width="38" height="30" rx="7" fill="#3ddc84" />
            <circle cx="24" cy="39" r="4" fill="#050806" />
            <rect x="22.25" y="40" width="3.5" height="8" rx="1.75" fill="#050806" />
          </svg>
          <div className="text-center">
            <div className="text-sm font-semibold text-white">Leader code unlocked</div>
            <div className="mt-0.5 text-xs text-muted">Tap Check to get your code</div>
          </div>
          <button
            type="button"
            disabled={!user || !!tx.busy}
            onClick={handleCheckLeaderCode}
            className="btn btn-primary !rounded-lg whitespace-nowrap px-6 py-2 text-xs font-semibold"
          >
            {tx.busy === CHECK_LABEL ? <Spinner /> : "Check"}
          </button>
        </div>
      )}

      <FaqAccordion items={FAQ} />
    </section>
  );
}
