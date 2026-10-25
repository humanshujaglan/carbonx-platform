"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import headerLogo from "@/public/header logo.png";
import { type Address, isAddress, parseUnits } from "viem";
import { useConnect } from "wagmi";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  MagicStar,
  TickCircle,
} from "iconsax-react";
import { erc20Abi, platformAbi } from "@/lib/abi";
import {
  chain,
  explorerUrl,
  LOCK_DETAILS,
  LockType,
  MIN_DEPOSIT_USDT,
  MAX_DEPOSIT_USDT,
} from "@/lib/config";
import { shortAddr, usd } from "@/lib/format";
import type { PlatformAddresses, PlatformMarket, PlatformUser } from "@/lib/platform";
import { Notice, Pill, Spinner, useTx } from "./ui";
import { useWallet } from "./wallet";

const PRESET_AMOUNTS = [100, 500, 1000, 2500, 5000];
const GENESIS_TOP_ID = "0x98528F6bF0d2E8497e6827096538E885Fce88029" as Address;

export function AuthPortal({
  addresses,
  user,
  market,
  loadingUser = false,
  onEnterDashboard,
  onRefresh,
}: {
  addresses?: PlatformAddresses;
  user?: PlatformUser;
  market?: PlatformMarket;
  loadingUser?: boolean;
  onEnterDashboard: () => void;
  onRefresh: () => void;
}) {
  const {
    account,
    hasWallet,
    wrongNetwork,
    connect,
    disconnect,
    switchNetwork,
    write,
  } = useWallet();

  const { connectors, connect: connectConnector } = useConnect();
  const tx = useTx(onRefresh);

  // View state: 'starter' (matching reference image) | 'register_form' | 'login_wallets'
  const [viewStep, setViewStep] = useState<"starter" | "register_form" | "login_wallets">("starter");
  const [sponsorInput, setSponsorInput] = useState<string>("");
  const [leaderCodeInput, setLeaderCodeInput] = useState<string>("0");
  const [amountStr, setAmountStr] = useState<string>("1000");
  const [selectedLock, setSelectedLock] = useState<LockType>(LockType.LOCKED_100);
  const [copiedAddr, setCopiedAddr] = useState(false);

  // Auto-detect referral sponsor from URL query param ?ref=0x...
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get("ref");
      if (ref && isAddress(ref)) {
        setSponsorInput(ref);
      }
    }
  }, []);

  const isRegistered = user?.isRegistered ?? false;

  // Deposit USDT calculations
  const depositUsdt = (() => {
    try {
      const parsed = parseFloat(amountStr || "0");
      if (isNaN(parsed) || parsed <= 0) return 0n;
      return parseUnits(amountStr, 18);
    } catch {
      return 0n;
    }
  })();

  const isBelowMin = depositUsdt < MIN_DEPOSIT_USDT;
  const isAboveMax = depositUsdt > MAX_DEPOSIT_USDT;
  const lockInfo = LOCK_DETAILS[selectedLock];
  const estDailyUsd = (Number(depositUsdt) / 1e18) * lockInfo.dailyRate;
  const maxCapUsd = (Number(depositUsdt) / 1e18) * lockInfo.capMultiplier;

  const resolvedSponsor: Address =
    sponsorInput && isAddress(sponsorInput)
      ? (sponsorInput as Address)
      : (addresses?.topId ?? GENESIS_TOP_ID);

  const needsApproval =
    !!addresses && !!user && user.usdtAllowance < depositUsdt && depositUsdt > 0n;

  const hasInsufficientBalance = !!user && user.usdtBalance < depositUsdt && depositUsdt > 0n;

  async function handleApprove() {
    if (!addresses || !account) return;
    await tx.run(
      "Approving USDT...",
      async () => {
        return write({
          address: addresses.usdt,
          abi: erc20Abi,
          functionName: "approve",
          args: [addresses.platform, 2n ** 256n - 1n],
        });
      },
      () => <span>USDT approved successfully. You can now complete registration.</span>
    );
  }

  async function handleRegister() {
    if (!addresses || !account || isBelowMin || isAboveMax) return;
    const leaderCodeNum = BigInt(leaderCodeInput.trim() || "0");

    await tx.run(
      "Registering on platform...",
      async () => {
        return write({
          address: addresses.platform,
          abi: platformAbi,
          functionName: "register",
          args: [resolvedSponsor, leaderCodeNum, depositUsdt, selectedLock],
        });
      },
      () => {
        setViewStep("starter");
        return <span>Registration successful! Welcome to CarbonX Platform.</span>;
      }
    );
  }

  function handleConnectWallet(walletName?: string) {
    if (!walletName) {
      connect().catch(() => {});
      return;
    }

    const lower = walletName.toLowerCase();
    const found = connectors.find((c) => {
      const id = c.id.toLowerCase();
      const name = c.name.toLowerCase();
      if (lower === "metamask") return id.includes("meta") || name.includes("meta");
      if (lower === "binance") return id.includes("binance") || name.includes("binance");
      if (lower === "trust") return id.includes("trust") || name.includes("trust");
      if (lower === "rabby") return id.includes("rabby") || name.includes("rabby");
      if (lower === "coinbase") return id.includes("coinbase") || name.includes("coinbase");
      if (lower === "walletconnect") return id.includes("walletconnect");
      return id.includes(lower) || name.includes(lower);
    });

    if (found) {
      connectConnector({ connector: found });
    } else {
      connect().catch(() => {});
    }
  }

  function copyAddress(addr: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(addr).then(() => {
        setCopiedAddr(true);
        setTimeout(() => setCopiedAddr(false), 2000);
      });
    }
  }

  // Handle Main Button Click (Register / Login / Connect)
  const handleMainAction = () => {
    if (!account) {
      connect().catch(() => {});
      return;
    }
    if (isRegistered) {
      // User is already registered -> Login directly to dashboard!
      onEnterDashboard();
    } else {
      // User is not registered -> Go to register form!
      setViewStep("register_form");
    }
  };

  return (
    <div className={viewStep === "starter" ? "fixed inset-0 z-30 flex flex-col justify-between items-center overflow-hidden bg-[#040705] p-0 select-none w-full" : "relative mx-auto flex w-full max-w-sm sm:max-w-md flex-col items-center px-3 pt-3 pb-24 sm:pt-6 sm:pb-28"}>
      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: THE STARTER PAGE                                      */}
      {/* Non-scrollable viewport, FULL WIDTH sticky bottom card        */}
      {/* 45° and 125° corner lighting beams, pitch black center        */}
      {/* Plus Jakarta Sans, low weight, no tracking, capitalize        */}
      {/* Official CarbonX logo + greeny.png graphic                    */}
      {/* ------------------------------------------------------------- */}
      {viewStep === "starter" && (
        <div className="relative flex w-full h-full flex-col justify-between items-center">
          {/* ========================================================= */}
          {/* TOP-LEFT 45° LIGHTING BEAM                                */}
          {/* Originates at screen corner (0,0), shoots along 45° ray  */}
          {/* Maximum strength in corner, progressively low in middle   */}
          {/* ========================================================= */}
          <div className="pointer-events-none fixed top-0 left-0 z-0">
            {/* 45° Rotated Beam Container */}
            <div
              className="relative"
              style={{
                transformOrigin: "0 0",
                transform: "rotate(45deg)",
              }}
            >
              {/* Central high-intensity beam core */}
              <div
                className="absolute top-[-30px] left-0 w-[65vw] max-w-[560px] h-[60px]"
                style={{
                  background:
                    "linear-gradient(to right, rgba(46, 240, 75, 1) 0%, rgba(35, 230, 65, 0.85) 22%, rgba(31, 224, 58, 0.3) 55%, transparent 95%)",
                  filter: "blur(16px)",
                }}
              />
              {/* Broad volumetric lighting cone */}
              <div
                className="absolute top-[-110px] left-0 w-[78vw] max-w-[680px] h-[220px]"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 50% at 0% 50%, rgba(35, 240, 65, 0.9) 0%, rgba(31, 224, 58, 0.5) 28%, rgba(31, 224, 58, 0.12) 60%, transparent 80%)",
                  filter: "blur(32px)",
                }}
              />
              {/* Secondary bright ray shaft */}
              <div
                className="absolute top-[-50px] left-0 w-[55vw] max-w-[480px] h-[100px]"
                style={{
                  background:
                    "linear-gradient(to right, rgba(80, 255, 110, 0.95) 0%, rgba(31, 224, 58, 0.55) 35%, transparent 80%)",
                  filter: "blur(22px)",
                }}
              />
            </div>

            {/* Corner Apex Glow (Top-Left) */}
            <div
              className="absolute -top-14 -left-14 w-52 h-52 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 35% 35%, rgba(65, 255, 100, 0.95) 0%, rgba(31, 224, 58, 0.65) 40%, transparent 72%)",
                filter: "blur(24px)",
              }}
            />
          </div>

          {/* ========================================================= */}
          {/* TOP-RIGHT 125° LIGHTING BEAM                               */}
          {/* Originates at screen corner (100%,0), shoots into screen */}
          {/* Maximum strength in corner, progressively low in middle   */}
          {/* ========================================================= */}
          <div className="pointer-events-none fixed top-0 right-0 z-0">
            {/* 135°/125° Rotated Beam Container */}
            <div
              className="relative"
              style={{
                transformOrigin: "0 0",
                transform: "rotate(135deg)",
              }}
            >
              {/* Central high-intensity beam core */}
              <div
                className="absolute top-[-30px] left-0 w-[65vw] max-w-[560px] h-[60px]"
                style={{
                  background:
                    "linear-gradient(to right, rgba(46, 240, 75, 1) 0%, rgba(35, 230, 65, 0.85) 22%, rgba(31, 224, 58, 0.3) 55%, transparent 95%)",
                  filter: "blur(16px)",
                }}
              />
              {/* Broad volumetric lighting cone */}
              <div
                className="absolute top-[-110px] left-0 w-[78vw] max-w-[680px] h-[220px]"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 50% at 0% 50%, rgba(35, 240, 65, 0.9) 0%, rgba(31, 224, 58, 0.5) 28%, rgba(31, 224, 58, 0.12) 60%, transparent 80%)",
                  filter: "blur(32px)",
                }}
              />
              {/* Secondary bright ray shaft */}
              <div
                className="absolute top-[-50px] left-0 w-[55vw] max-w-[480px] h-[100px]"
                style={{
                  background:
                    "linear-gradient(to right, rgba(80, 255, 110, 0.95) 0%, rgba(31, 224, 58, 0.55) 35%, transparent 80%)",
                  filter: "blur(22px)",
                }}
              />
            </div>

            {/* Corner Apex Glow (Top-Right) */}
            <div
              className="absolute -top-14 -right-14 w-52 h-52 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 65% 35%, rgba(65, 255, 100, 0.95) 0%, rgba(31, 224, 58, 0.65) 40%, transparent 72%)",
                filter: "blur(24px)",
              }}
            />
          </div>

          {/* 1. TOP HEADER GROUP */}
          <div className="relative z-10 flex w-full max-w-sm sm:max-w-md mx-auto flex-col items-center pt-3 sm:pt-4 px-4 shrink-0">
            {/* Official CarbonX Logo */}
            <div className="flex items-center justify-center my-1.5">
              <Image
                src={headerLogo}
                alt="CarbonX"
                priority
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </div>

            {/* Pill Badge: 'Trade Crypto Anytime' (font-light, tracking-normal, capitalize) */}
            <div className="my-1.5 inline-flex items-center gap-2 rounded-full bg-[#0c1610] px-4 py-1.5 text-xs font-light text-neon-soft border border-neon/30 tracking-normal capitalize shadow-[0_0_12px_rgba(31,224,58,0.15)]">
              <MagicStar size={13} color="#1fe03a" variant="Bold" />
              <span>Trade Crypto Anytime</span>
            </div>

            {/* Hero Typography (Plus Jakarta Sans, font-light, tracking-normal, capitalize) */}
            <div className="mt-1 text-center">
              <h1 className="text-3xl sm:text-4xl font-light text-white leading-[1.18] tracking-normal capitalize">
                Power Up Your <br />
                <span className="font-normal text-neon">
                  Crypto Journey
                </span>
              </h1>
              <p className="mt-1 text-xs font-light text-muted tracking-normal capitalize">
                Empowering The Future Of Finance
              </p>
            </div>
          </div>

          {/* 2. MIDDLE GRAPHIC (Brought down directly into the curve scoop) */}
          <div className="relative w-full max-w-sm sm:max-w-md mx-auto -mb-16 sm:-mb-20 z-0 pointer-events-none select-none flex-1 flex flex-col justify-end items-center">
            <div
              className="relative w-full aspect-[1672/941] overflow-hidden scale-[1.18] origin-bottom"
              style={{
                maskImage:
                  "linear-gradient(to bottom, black 65%, transparent 100%), linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                maskComposite: "intersect",
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 65%, transparent 100%), linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
                WebkitMaskComposite: "source-in",
              }}
            >
              <Image
                src="/greeny.png"
                alt="CarbonX Eco-Tech CO2 Graphic"
                fill
                priority
                className="object-contain transform-gpu mix-blend-screen drop-shadow-[0_0_40px_rgba(31,224,58,0.5)]"
              />
            </div>
          </div>

          {/* 3. 100% FULL WIDTH STICKY BOTTOM CARD: MORE CURVY SCOOP + DUAL EASED-OUT GREEN BORDER */}
          <div className="w-full relative z-20 flex flex-col sticky bottom-0 shrink-0">
            {/* SVG Curved Top Cap with Diminishing & Eased-Out Green Border (Flushed 100% to screen edges) */}
            <div className="relative w-full overflow-hidden -mb-px">
              <svg
                viewBox="0 0 1000 85"
                preserveAspectRatio="none"
                className="w-full h-14 sm:h-16 block"
              >
                <defs>
                  {/* Green border gradient easing out on both left & right ends AND center scoop */}
                  <linearGradient id="diminishingBorder" x1="0%" y1="0%" x2="100%" y2="0%">
                    {/* Left end ease-out */}
                    <stop offset="0%" stopColor="#2eed4c" stopOpacity="0.0" />
                    <stop offset="5%" stopColor="#2eed4c" stopOpacity="0.3" />
                    <stop offset="10%" stopColor="#2eed4c" stopOpacity="0.85" />
                    <stop offset="18%" stopColor="#2eed4c" stopOpacity="1.0" />

                    {/* Middle scoop ease-out */}
                    <stop offset="28%" stopColor="#2eed4c" stopOpacity="0.75" />
                    <stop offset="36%" stopColor="#2eed4c" stopOpacity="0.15" />
                    <stop offset="42%" stopColor="#2eed4c" stopOpacity="0.0" />
                    <stop offset="58%" stopColor="#2eed4c" stopOpacity="0.0" />
                    <stop offset="64%" stopColor="#2eed4c" stopOpacity="0.15" />
                    <stop offset="72%" stopColor="#2eed4c" stopOpacity="0.75" />

                    {/* Right shoulder & Right end ease-out */}
                    <stop offset="82%" stopColor="#2eed4c" stopOpacity="1.0" />
                    <stop offset="90%" stopColor="#2eed4c" stopOpacity="0.85" />
                    <stop offset="95%" stopColor="#2eed4c" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#2eed4c" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Soft ambient green backlight inside the scoop from the glowing horizon */}
                  <radialGradient id="scoopAura" cx="50%" cy="15%" r="65%">
                    <stop offset="0%" stopColor="#1fe03a" stopOpacity="0.28" />
                    <stop offset="60%" stopColor="#1fe03a" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#1fe03a" stopOpacity="0.0" />
                  </radialGradient>

                  {/* Filter for subtle neon line glow */}
                  <filter id="neonBlur" x="-10%" y="-30%" width="120%" height="160%">
                    <feGaussianBlur stdDeviation="3" />
                  </filter>
                </defs>

                {/* Card Fill: Full-width Flat shoulders (flushed to x=0 and x=1000) + Deep Curvaceous Concave Scoop in middle (depth 58px) */}
                <path
                  d="M 0,85 L 0,10 L 280,10 C 370,10 410,68 500,68 C 590,68 630,10 720,10 L 1000,10 L 1000,85 Z"
                  fill="#0b110d"
                />

                {/* Ambient glow inside the scoop matching image.png */}
                <path
                  d="M 0,85 L 0,10 L 280,10 C 370,10 410,68 500,68 C 590,68 630,10 720,10 L 1000,10 L 1000,85 Z"
                  fill="url(#scoopAura)"
                />

                {/* Blurred outer neon glow on the border line (fades in the scoop and at both ends) */}
                <path
                  d="M 0,10 L 280,10 C 370,10 410,68 500,68 C 590,68 630,10 720,10 L 1000,10"
                  fill="none"
                  stroke="url(#diminishingBorder)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter="url(#neonBlur)"
                  opacity="0.85"
                />

                {/* Crisp Core Top Border with Eased Out Green Glow */}
                <path
                  d="M 0,10 L 280,10 C 370,10 410,68 500,68 C 590,68 630,10 720,10 L 1000,10"
                  fill="none"
                  stroke="url(#diminishingBorder)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Card Body seamlessly joined to the curved top, 100% FULL WIDTH across the entire screen */}
            <div className="w-full bg-[#0b110d] px-4 sm:px-6 pt-2 pb-6 sm:pb-8 shadow-[0_-12px_40px_rgba(0,0,0,0.85)] flex flex-col items-center">
              <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col gap-3.5">
                {/* Header inside the curved card (font-light, tracking-normal, capitalize) */}
                <div className="text-center pt-0.5">
                  <span className="text-xs sm:text-sm font-light text-white tracking-normal capitalize">
                    {account && isRegistered
                      ? "Welcome Back To CarbonX!"
                      : "Don't Have An Account Yet?"}
                  </span>
                </div>

                {/* WALLET ADDRESS INPUT BOX (Replacing phone number field) */}
                <div className="flex items-center rounded-2xl bg-[#121914] p-1.5 border border-white/[0.08] focus-within:border-neon/50 transition">
                  {/* Left Selector Pill (styled like the country code dropdown +1 v) */}
                  <button
                    type="button"
                    onClick={() => connect().catch(() => {})}
                    className="flex items-center gap-1.5 rounded-xl bg-[#19241c] px-3 py-2.5 text-xs font-normal text-white border border-white/[0.06] hover:bg-[#202e24] transition cursor-pointer shrink-0 tracking-normal"
                  >
                    <span className="text-sm">⚡</span>
                    <span>BSC</span>
                    <span className="text-[10px] text-muted">▼</span>
                  </button>

                  {/* Right Address Display */}
                  <div className="flex-1 px-3 text-left min-w-0">
                    {account ? (
                      <div className="font-mono text-xs sm:text-sm font-normal text-white truncate tracking-normal">
                        {shortAddr(account)}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => connect().catch(() => {})}
                        className="text-left text-xs sm:text-sm font-light text-muted hover:text-neon transition cursor-pointer w-full truncate tracking-normal capitalize"
                      >
                        Connect Your Web3 Wallet
                      </button>
                    )}
                  </div>

                  {account ? (
                    <button
                      type="button"
                      onClick={() => copyAddress(account)}
                      className="p-2 text-muted hover:text-neon transition cursor-pointer shrink-0"
                      title="Copy Address"
                    >
                      {copiedAddr ? (
                        <TickCircle size={18} color="#1fe03a" variant="Bold" />
                      ) : (
                        <Copy size={18} variant="Linear" />
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setViewStep("login_wallets")}
                      className="rounded-lg bg-neon/15 px-2.5 py-1 text-[11px] font-normal text-neon border border-neon/30 hover:bg-neon/25 transition cursor-pointer shrink-0 tracking-normal capitalize"
                    >
                      Wallets
                    </button>
                  )}
                </div>

                {/* DYNAMIC ACTION BUTTON: "Register" if not registered, "Login" if already registered */}
                <button
                  type="button"
                  onClick={handleMainAction}
                  className="btn btn-primary w-full py-3.5 sm:py-4 text-base font-normal tracking-normal capitalize shadow-[0_8px_25px_-4px_rgba(31,224,58,0.65)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {!account ? (
                    <span>Connect Wallet</span>
                  ) : isRegistered ? (
                    <>
                      <span>Login</span>
                      <ArrowRight size={18} color="#03140a" />
                    </>
                  ) : (
                    <>
                      <span>Register</span>
                      <ArrowRight size={18} color="#03140a" />
                    </>
                  )}
                </button>

                {/* Subtext: font-light, tracking-normal, capitalize */}
                <div className="text-center text-xs font-light text-muted tracking-normal capitalize pt-0.5">
                  {!account ? (
                    <span>Connect Your Web3 Wallet To Start</span>
                  ) : isRegistered ? (
                    <span>
                      Detected Active Registered Member ·{" "}
                      <button
                        type="button"
                        onClick={() => disconnect()}
                        className="text-danger hover:underline font-normal cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </span>
                  ) : (
                    <span>
                      Already Have An Account?{" "}
                      <button
                        type="button"
                        onClick={() => setViewStep("login_wallets")}
                        className="text-neon font-normal hover:underline cursor-pointer"
                      >
                        Log In
                      </button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: REGISTRATION FORM (WHEN CLICKING REGISTER)           */}
      {/* Referral, Leaderboard, Amount, Strategy                      */}
      {/* ------------------------------------------------------------- */}
      {viewStep === "register_form" && (
        <div className="w-full flex flex-col gap-5">
          {/* Header with Back button */}
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <button
              type="button"
              onClick={() => setViewStep("starter")}
              className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-white transition cursor-pointer"
            >
              <div className="flex size-8 items-center justify-center rounded-xl bg-[#121914] border border-white/[0.08]">
                <ArrowLeft size={16} />
              </div>
              <span>Back</span>
            </button>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Account Registration
            </h2>
            <Pill tone="green">BSC Chain</Pill>
          </div>

          {wrongNetwork && (
            <Notice tone="warn">
              <div className="flex items-center justify-between gap-2">
                <span>Switch wallet network to {chain.name}</span>
                <button
                  type="button"
                  onClick={() => switchNetwork().catch(() => {})}
                  className="btn btn-primary text-xs !py-1 !px-2.5 shrink-0"
                >
                  Switch
                </button>
              </div>
            </Notice>
          )}

          {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}
          {isBelowMin && <Notice tone="warn">Minimum registration deposit is 100 USDT.</Notice>}
          {isAboveMax && <Notice tone="error">Maximum registration deposit is 5,000 USDT.</Notice>}
          {hasInsufficientBalance && (
            <Notice tone="warn">
              Insufficient USDT balance ({usd(user?.usdtBalance ?? 0n)} available).
            </Notice>
          )}

          {/* Connected Wallet Indicator */}
          <div className="rounded-2xl bg-[#121914] p-3 border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-neon animate-pulse" />
              <span className="font-mono text-xs font-bold text-white">
                {account ? shortAddr(account) : "No wallet"}
              </span>
            </div>
            <span className="text-[11px] text-neon-soft font-semibold">Ready to Register</span>
          </div>

          {/* 1. Referral Sponsor Input */}
          <div className="flex flex-col gap-1 text-left">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-muted">1. Referral / Sponsor</span>
              <span className="text-neon-soft">
                {sponsorInput && isAddress(sponsorInput) ? "✓ Valid" : "Genesis Top ID default"}
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="0x... (leave blank for Genesis Top ID)"
                value={sponsorInput}
                onChange={(e) => setSponsorInput(e.target.value.trim())}
                className="w-full rounded-2xl bg-[#121914] py-3 pl-3.5 pr-14 text-xs font-mono text-white outline-none border border-white/[0.08] focus:border-neon/50"
              />
              <button
                type="button"
                onClick={async () => {
                  if (typeof navigator !== "undefined" && navigator.clipboard) {
                    try {
                      const t = await navigator.clipboard.readText();
                      if (t) setSponsorInput(t.trim());
                    } catch {}
                  }
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-white/[0.08] px-2.5 py-1 text-[10px] text-muted hover:text-white"
              >
                Paste
              </button>
            </div>
          </div>

          {/* 2. Leaderboard Code Input */}
          <div className="flex flex-col gap-1 text-left">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-muted">2. Leaderboard Code</span>
              <span className="text-muted text-[10px]">Optional (0 for standard)</span>
            </div>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={leaderCodeInput}
              onChange={(e) => setLeaderCodeInput(e.target.value)}
              className="w-full rounded-2xl bg-[#121914] px-3.5 py-3 text-xs text-white outline-none border border-white/[0.08] focus:border-neon/50"
            />
          </div>

          {/* 3. Deposit Amount (USDT) */}
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-muted">3. Deposit Amount (USDT)</span>
              {user && (
                <span className="text-muted text-[10px]">
                  Balance: <strong className="text-white">{usd(user.usdtBalance)}</strong>
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                min="100"
                max="5000"
                step="50"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full rounded-2xl bg-[#121914] py-3.5 pl-4 pr-16 text-lg font-bold text-white outline-none border border-white/[0.08] focus:border-neon/50"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-lg bg-white/[0.08] px-2 py-1 text-xs font-bold text-white">
                USDT
              </span>
            </div>

            {/* Preset chips matching FluxChain pills */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmountStr(String(amt))}
                  className={`rounded-xl py-2 text-xs font-bold transition cursor-pointer ${
                    amountStr === String(amt)
                      ? "bg-neon text-[#03140a] shadow-[0_0_12px_rgba(31,224,58,0.4)]"
                      : "bg-[#121914] text-muted hover:text-white border border-white/[0.05]"
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy selection */}
          <div className="grid grid-cols-3 gap-1.5 text-left pt-1">
            {(
              [
                LockType.FLEXIBLE,
                LockType.LOCKED_100,
                LockType.LOCKED_50,
              ] as const
            ).map((type) => {
              const item = LOCK_DETAILS[type];
              const isSelected = selectedLock === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedLock(type)}
                  className={`rounded-2xl p-2.5 transition cursor-pointer text-left ${
                    isSelected
                      ? "bg-[#162319] border border-neon/50 shadow-[0_0_14px_rgba(31,224,58,0.2)]"
                      : "bg-[#121914] border border-white/[0.06] hover:border-white/15"
                  }`}
                >
                  <div className="text-xs font-bold text-white">{item.name}</div>
                  <div className="text-[10px] text-neon-soft mt-0.5">
                    {item.monthlyRatePercent}% / mo
                  </div>
                </button>
              );
            })}
          </div>

          {/* Projections */}
          <div className="rounded-2xl bg-[#121914] p-3.5 text-xs text-left flex flex-col gap-1.5 border border-white/[0.06]">
            <div className="flex justify-between">
              <span className="text-muted">Estimated Base ROI:</span>
              <span className="font-bold text-neon-soft">
                ~${estDailyUsd.toFixed(2)}/day ({lockInfo.monthlyRatePercent}%/mo)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Maximum Total Cap (2.5x):</span>
              <span className="font-bold text-white">${maxCapUsd.toLocaleString()} USDT</span>
            </div>
          </div>

          {/* Action Button: Approve / Register */}
          {needsApproval ? (
            <button
              type="button"
              disabled={Boolean(tx.busy) || isBelowMin || isAboveMax}
              onClick={handleApprove}
              className="btn btn-primary w-full py-4 text-base font-bold cursor-pointer"
            >
              {tx.busy === "Approving USDT..." ? <Spinner /> : "Step 1: Approve USDT"}
            </button>
          ) : (
            <button
              type="button"
              disabled={Boolean(tx.busy) || isBelowMin || isAboveMax || hasInsufficientBalance}
              onClick={handleRegister}
              className="btn btn-primary w-full py-4 text-base font-bold cursor-pointer"
            >
              {tx.busy === "Registering on platform..." ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Processing Registration...
                </span>
              ) : hasInsufficientBalance ? (
                "Insufficient USDT in Wallet"
              ) : (
                `Register & Deposit $${Number(depositUsdt / 10n ** 18n).toLocaleString()} USDT`
              )}
            </button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 3: FLEXIBLE WALLET LOGIN OPTIONS                         */}
      {/* ------------------------------------------------------------- */}
      {viewStep === "login_wallets" && (
        <div className="w-full flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <button
              type="button"
              onClick={() => setViewStep("starter")}
              className="flex items-center gap-2 text-xs font-semibold text-muted hover:text-white transition cursor-pointer"
            >
              <div className="flex size-8 items-center justify-center rounded-xl bg-[#121914] border border-white/[0.08]">
                <ArrowLeft size={16} />
              </div>
              <span>Back</span>
            </button>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Connect Web3 Wallet
            </h2>
            <Pill tone="gold">Multi-Wallet</Pill>
          </div>

          <div className="flex flex-col gap-2.5">
            {[
              { id: "metamask", name: "MetaMask", sub: "Extension & Mobile" },
              { id: "binance", name: "Binance Web3 Wallet", sub: "Native BSC Integration" },
              { id: "trust", name: "Trust Wallet", sub: "Official Web3 App" },
              { id: "rabby", name: "Rabby Wallet", sub: "DeFi Multi-Chain" },
              { id: "walletconnect", name: "WalletConnect", sub: "Scan QR Code" },
            ].map((wallet) => (
              <button
                key={wallet.id}
                type="button"
                onClick={() => {
                  handleConnectWallet(wallet.id);
                  setViewStep("starter");
                }}
                className="flex items-center justify-between rounded-2xl bg-[#121914] p-3 border border-white/[0.06] hover:border-neon/40 hover:bg-[#162319] transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-neon/10 text-neon border border-neon/20 font-bold text-xs">
                    {wallet.name[0]}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">{wallet.name}</div>
                    <div className="text-[10px] text-muted">{wallet.sub}</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-neon">Connect →</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                connect().catch(() => {});
                setViewStep("starter");
              }}
              className="btn btn-secondary w-full py-3 text-xs mt-1"
            >
              Browse All Supported Wallets (RainbowKit)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
