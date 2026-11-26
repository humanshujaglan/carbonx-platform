"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { CloseCircle, Cup } from "iconsax-react";
import { shortAddr, usd } from "@/lib/format";
import { useWallet } from "./wallet";

type Winner = { sponsor: string; direct: string; amount: string };

const congratsKey = (account: string) => `cx_bonanza_congrats_${account.toLowerCase()}`;
function congratsSeen(account: string) {
  try {
    return localStorage.getItem(congratsKey(account)) === "1";
  } catch {
    return false;
  }
}

/** Bonanza poster on every page load, then a one-time congratulations for sponsors who won the bonanza. */
export function BonanzaPopup() {
  const { account, ready } = useWallet();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [posterOpen, setPosterOpen] = useState(true);
  const [winner, setWinner] = useState<Winner>();

  useEffect(() => {
    if (!ready || !account || congratsSeen(account)) return;
    let cancelled = false;
    fetch(`/api/bonanza?address=${account}`)
      .then((r) => (r.ok ? r.json() : undefined))
      .then((d) => !cancelled && d?.eligible && setWinner(d.winner))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [account, ready]);

  const closeCongrats = () => {
    if (account) {
      try {
        localStorage.setItem(congratsKey(account), "1");
      } catch {}
    }
    setWinner(undefined);
  };

  const congratsOpen = !posterOpen && !!winner && !!account && winner.sponsor.toLowerCase() === account.toLowerCase();
  const open = posterOpen || congratsOpen;
  const close = posterOpen ? () => setPosterOpen(false) : closeCongrats;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            key={posterOpen ? "poster" : "congrats"}
            role="dialog"
            aria-modal="true"
            aria-label={posterOpen ? "Bonanza" : "You won the bonanza"}
            className="relative w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 24 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full bg-black/50 text-white/80 transition hover:text-white cursor-pointer"
            >
              <CloseCircle size={28} color="currentColor" variant="Linear" />
            </button>

            {posterOpen ? (
              <Image
                src="/bonanza.png"
                alt="CarbonX Business Achiever Rewards: Jim Corbett Reward"
                width={1092}
                height={1440}
                priority
                className="h-auto max-h-[88vh] w-full rounded-[2rem] object-contain"
              />
            ) : (
              winner && (
                <div className="rounded-[2rem] border border-neon/30 bg-[radial-gradient(120%_70%_at_50%_0%,rgba(31,224,58,0.18),transparent_60%),linear-gradient(180deg,#0f1712,#0a0f0c)] px-6 pb-6 pt-8 text-center text-text shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-neon/15">
                    <Cup size={34} color="var(--color-neon)" variant="Bold" />
                  </div>
                  <h3 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">
                    <span className="bg-gradient-to-r from-neon-bright to-neon bg-clip-text text-transparent">Congratulations!</span>
                  </h3>
                  <p className="mt-2 text-base font-semibold text-white">You won the Jim Corbett Reward 🎉</p>
                  <p className="mt-2 text-sm text-muted">
                    Your direct {shortAddr(winner.direct)} took a {usd(BigInt(winner.amount))} package, so you are
                    eligible for 2 nights / 3 days in Jim Corbett.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-5 w-full rounded-2xl bg-gradient-to-r from-neon-bright to-neon py-3.5 text-base font-bold text-ink shadow-[0_8px_32px_-6px_rgba(31,224,58,0.7)] transition hover:brightness-110 cursor-pointer"
                  >
                    Awesome
                  </button>
                </div>
              )
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
