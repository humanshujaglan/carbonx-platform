"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Copy,
  ExportSquare,
  Notification,
  Setting2,
  Wallet3,
} from "iconsax-react";
import headerLogo from "@/public/header logo.png";
import { chain, explorerUrl } from "@/lib/config";
import { errorMessage, shortAddr } from "@/lib/format";
import { Toast, useToast } from "./ui";
import { useWallet } from "./wallet";

export type NavTab =
  | "dashboard"
  | "invest"
  | "incomes"
  | "withdraw"
  | "team"
  | "structure";

export function Header({
  activeTab,
  onTabChange,
  onExitDashboard,
}: {
  activeTab?: NavTab;
  onTabChange?: (tab: NavTab) => void;
  onExitDashboard?: () => void;
}) {
  const { account } = useWallet();

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-6 sm:py-4">
      {/* Left: User Profile greeting matching left screen in reference image */}
      <div className="flex items-center gap-3">
        <div className="relative flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1fe03a]/20 to-[#0a150c] border border-neon/40 shadow-[0_0_12px_rgba(31,224,58,0.2)]">
          <span className="text-sm font-bold text-neon">
            {account ? account.slice(2, 4).toUpperCase() : "CX"}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-neon border-2 border-[#050806]" />
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-muted">Welcome back!</span>
          <span className="font-sans text-xs sm:text-sm font-semibold text-white tracking-tight">
            {account ? shortAddr(account) : "Guest Member"}
          </span>
        </div>
      </div>

      {/* Right: Rounded square action buttons matching left screen */}
      <div className="flex items-center gap-2">
        {/* Network Badge */}
        <span className="hidden items-center gap-1.5 rounded-xl bg-[#121914] px-3 py-2 text-[11px] font-semibold text-muted border border-white/[0.06] md:inline-flex">
          <span className="size-1.5 rounded-full bg-neon shadow-[0_0_6px_#1fe03a]" />
          {chain.name}
        </span>

        {/* Notification bell square button with green dot */}
        <button
          type="button"
          title="Notifications"
          className="relative flex size-10 items-center justify-center rounded-2xl bg-[#121914] text-muted hover:text-white hover:border-neon/40 transition border border-white/[0.06] cursor-pointer"
        >
          <Notification size={18} color="currentColor" />
          <span className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-neon shadow-[0_0_6px_#1fe03a]" />
        </button>

        {/* Portal lock button */}
        {onExitDashboard && (
          <button
            type="button"
            onClick={onExitDashboard}
            className="hidden sm:inline-flex items-center rounded-2xl bg-[#121914] px-3 py-2 text-xs font-semibold text-neon hover:bg-[#162319] hover:border-neon/40 transition border border-white/[0.06] cursor-pointer"
            title="Lock dashboard and return to portal"
          >
            Portal
          </button>
        )}

        <WalletButton onExitDashboard={onExitDashboard} />
      </div>
    </header>
  );
}

function WalletButton({ onExitDashboard }: { onExitDashboard?: () => void } = {}) {
  const { account, wrongNetwork, hasWallet, connect, switchNetwork, openAccountModal } = useWallet();
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) =>
      menu.current && !menu.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const run = (fn: () => Promise<void>) => () => {
    setError(undefined);
    fn().catch((err) => setError(errorMessage(err)));
  };

  if (!hasWallet) {
    return (
      <button
        type="button"
        className="btn btn-primary !rounded-2xl !py-2 !px-3.5 text-xs"
        onClick={run(connect)}
      >
        Connect
      </button>
    );
  }
  if (!account) {
    return (
      <button
        type="button"
        className="btn btn-primary !rounded-2xl !py-2 !px-3.5 text-xs"
        onClick={run(connect)}
      >
        Connect
      </button>
    );
  }
  if (wrongNetwork) {
    return (
      <button
        type="button"
        className="rounded-2xl bg-danger/15 px-3 py-2 text-xs font-semibold text-danger border border-danger/30 cursor-pointer"
        onClick={run(switchNetwork)}
      >
        Switch Network
      </button>
    );
  }

  return (
    <div className="relative" ref={menu}>
      <button
        type="button"
        className="flex items-center gap-2 rounded-2xl bg-[#121914] px-3 py-2 text-xs font-semibold text-white border border-white/[0.08] hover:border-neon/40 transition cursor-pointer"
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
        <span className="size-2 rounded-full bg-neon shadow-[0_0_6px_#1fe03a]" />
        <span>{shortAddr(account)}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 flex w-48 flex-col rounded-2xl bg-[#0c120e] p-1.5 text-xs font-medium shadow-2xl border border-white/[0.1]">
          <button
            type="button"
            className="rounded-xl px-3 py-2 text-left hover:bg-[#162319] text-white flex items-center gap-2 cursor-pointer"
            onClick={() => {
              navigator.clipboard?.writeText(account).catch(() => {});
              toast.show("Address copied");
              setOpen(false);
            }}
          >
            <Copy size={16} />
            <span>Copy address</span>
          </button>
          {explorerUrl && (
            <a
              href={`${explorerUrl}/address/${account}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2 hover:bg-[#162319] text-white flex items-center gap-2"
            >
              <ExportSquare size={16} />
              <span>View on explorer</span>
            </a>
          )}
          {onExitDashboard && (
            <button
              type="button"
              className="rounded-xl px-3 py-2 text-left hover:bg-[#162319] text-neon cursor-pointer border-t border-white/[0.05] mt-1 pt-1.5"
              onClick={() => {
                onExitDashboard();
                setOpen(false);
              }}
            >
              Exit to Portal
            </button>
          )}
        </div>
      )}
      <Toast message={toast.message} />
    </div>
  );
}
