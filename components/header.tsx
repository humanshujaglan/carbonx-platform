"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import headerLogo from "@/public/header logo.png";
import { chain, explorerUrl } from "@/lib/config";
import { errorMessage, shortAddr } from "@/lib/format";
import { Toast, useToast } from "./ui";
import { useWallet } from "./wallet";

export type NavTab = "dashboard" | "invest" | "incomes" | "team" | "structure" | "operations" | "trade";

export function Header({
  activeTab,
  onTabChange,
}: {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
}) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-6">
        <a href="/" className="flex items-center gap-2">
          <Image src={headerLogo} alt="CarbonX Platform" width={2172} height={724} priority className="h-9 w-auto sm:h-10" />
          <span className="hidden rounded-md bg-neon/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neon border border-neon/30 sm:inline-block">
            Platform
          </span>
        </a>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-2 text-[11px] font-light text-muted backdrop-blur sm:inline-flex border border-white/[0.05]">
          <span className="size-1.5 animate-pulse rounded-full bg-neon shadow-[0_0_8px_#1fe03a]" aria-hidden />
          {chain.name}
        </span>
        <WalletButton />
      </div>
    </header>
  );
}

function WalletButton() {
  const { account, wrongNetwork, hasWallet, connect, switchNetwork, openAccountModal } = useWallet();
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => menu.current && !menu.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const run = (fn: () => Promise<void>) => () => {
    setError(undefined);
    fn().catch((err) => setError(errorMessage(err)));
  };

  const pill = "rounded-full px-4 py-2 text-xs font-normal transition-colors cursor-pointer";

  if (!hasWallet) {
    return (
      <button type="button" className={`${pill} btn-primary !rounded-full`} onClick={run(connect)}>
        Connect wallet
      </button>
    );
  }
  if (!account) {
    return (
      <span className="flex items-center gap-2">
        {error && <span className="hidden text-[11px] text-danger md:inline">{error}</span>}
        <button type="button" className={`${pill} btn-primary !rounded-full`} onClick={run(connect)}>
          Connect wallet
        </button>
      </span>
    );
  }
  if (wrongNetwork) {
    return (
      <button type="button" className={`${pill} bg-danger/15 text-danger border border-danger/30`} onClick={run(switchNetwork)}>
        Switch to {chain.name}
      </button>
    );
  }
  return (
    <div className="relative" ref={menu}>
      <button
        type="button"
        className={`${pill} flex items-center gap-2 bg-white/[0.06] text-text backdrop-blur hover:bg-white/[0.1] border border-white/[0.08]`}
        onClick={() => {
          if (openAccountModal) {
            openAccountModal();
          } else {
            setOpen((v) => !v);
          }
        }}
        aria-expanded={open}
        title={account}
      >
        <span className="size-1.5 rounded-full bg-neon shadow-[0_0_6px_#1fe03a]" aria-hidden />
        <span>{shortAddr(account)}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 flex w-48 flex-col rounded-xl bg-panel-2 p-1 text-xs font-light shadow-2xl border border-white/[0.08]">
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-left hover:bg-panel-3 text-text cursor-pointer"
            onClick={() => {
              navigator.clipboard?.writeText(account).catch(() => {});
              toast.show("Address copied");
              setOpen(false);
            }}
          >
            Copy address
          </button>
          {explorerUrl && (
            <a
              href={`${explorerUrl}/address/${account}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-panel-3 text-text"
            >
              View on explorer
            </a>
          )}
        </div>
      )}
      <Toast message={toast.message} />
    </div>
  );
}
