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
  Profile2User,
  ShieldTick,
  TickCircle,
  TrendUp,
  Wallet3,
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
import { packageRates } from "@/lib/roi";
import { parseLeaderCodeInput, type PlatformAddresses, type PlatformMarket, type PlatformUser } from "@/lib/platform";
import { SocialLinks } from "./social-links";
import { Notice, Pill, Spinner, useTx } from "./ui";
import { useWallet } from "./wallet";

const PRESET_AMOUNTS = [10, 50, 100, 500, 1000, 2500, 5000];

export function AuthPortal({
  addresses,
  user,
  market,
  registration = "none",
  initialView,
  onLogin,
  onBackToLogin,
  onRetry,
  onRefresh,
}: {
  addresses?: PlatformAddresses;
  user?: PlatformUser;
  market?: PlatformMarket;
  /** Which screen to open first (used by the separate /login and /register pages). */
  initialView?: "starter" | "register_form" | "login_wallets";
  /** Whether the connected wallet is a member: decides between the Login and Register button. */
  registration?: "none" | "checking" | "registered" | "unregistered" | "error";
  /** Login click for a registered wallet: enter the dashboard. */
  onLogin: () => void;
  /** Register screen popup for an already registered wallet: back to the login page. */
  onBackToLogin: () => void;
  /** Re-run a failed registration check. */
  onRetry: () => void;
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
  const [viewStep, setViewStep] = useState<"starter" | "register_form" | "login_wallets">(() => {
    if (initialView) return initialView;
    if (typeof window !== "undefined") {
      const v = new URLSearchParams(window.location.search).get("view");
      if (v === "register") return "register_form";
      if (v === "wallets") return "login_wallets";
    }
    return "starter";
  });
  const [sponsorInput, setSponsorInput] = useState<string>("");
  const [leaderCodeInput, setLeaderCodeInput] = useState<string>("0");
  const [amountStr, setAmountStr] = useState<string>("1000");
  const [selectedLock, setSelectedLock] = useState<LockType>(LockType.LOCKED_100);
  const [copiedAddr, setCopiedAddr] = useState(false);

  // Auto-detect referral sponsor from URL query param ?ref=0x... or ?view=register
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get("ref");
      if (ref && isAddress(ref)) {
        setSponsorInput(ref);
      }
      const leader = urlParams.get("leader");
      if (leader && /^\d+$/.test(leader)) {
        setLeaderCodeInput(leader);
      }
      const v = urlParams.get("view");
      if (v === "register") setViewStep("register_form");
      if (v === "wallets") setViewStep("login_wallets");
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
  const lhrTier = market?.lhrTier ?? 0;
  const lockRates = packageRates(selectedLock, lhrTier);
  const estDailyUsd = ((Number(depositUsdt) / 1e18) * lockRates.avgDailyPct) / 100;
  const maxCapUsd = (Number(depositUsdt) / 1e18) * lockInfo.capMultiplier;

  const onChainTopId = addresses?.topId && addresses.topId !== "0x0000000000000000000000000000000000000000" ? addresses.topId : undefined;
  const resolvedSponsor: Address | undefined =
    sponsorInput && isAddress(sponsorInput) ? (sponsorInput as Address) : onChainTopId;

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
    if (!addresses || !account || !resolvedSponsor || isBelowMin || isAboveMax) return;
    const leaderCodeNum = parseLeaderCodeInput(leaderCodeInput);

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

  async function handleRegisterOneTap() {
    if (!addresses || !account || !resolvedSponsor || isBelowMin || isAboveMax) return;
    const leaderCodeNum = parseLeaderCodeInput(leaderCodeInput);

    // One tap: approve first when needed, then register
    await tx.run(
      "Registering on platform...",
      async () => {
        if (needsApproval) {
          await write({
            address: addresses.usdt,
            abi: erc20Abi,
            functionName: "approve",
            args: [addresses.platform, 2n ** 256n - 1n],
          });
        }
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

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center overflow-x-hidden overflow-y-auto bg-[#040705] p-0 select-none w-full">
      {/* ========================================================= */}
      {/* CORNER NEON LIGHTING BEAMS (UNIVERSAL TO ALL AUTH VIEWS)  */}
      {/* 45° (Top-Left) and 125° (Top-Right) intense beam lighting */}
      {/* ========================================================= */}
      {/* Top-Left 45° Beam */}
      <div className="pointer-events-none fixed top-0 left-0 z-0 opacity-70">
        <div
          className="relative"
          style={{
            transformOrigin: "0 0",
            transform: "rotate(45deg)",
          }}
        >
          <div
            className="absolute top-[-28px] left-0 w-[62vw] max-w-[540px] h-[56px]"
            style={{
              background:
                "linear-gradient(to right, rgba(50, 245, 80, 0.9) 0%, rgba(35, 230, 65, 0.55) 25%, rgba(31, 224, 58, 0.16) 55%, transparent 88%)",
              filter: "blur(18px)",
            }}
          />
          <div
            className="absolute top-[-100px] left-0 w-[76vw] max-w-[660px] h-[200px]"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 0% 50%, rgba(35, 240, 65, 0.65) 0%, rgba(31, 224, 58, 0.28) 30%, transparent 75%)",
              filter: "blur(36px)",
            }}
          />
        </div>
        <div
          className="absolute -top-14 -left-14 w-52 h-52 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, rgba(65, 255, 100, 0.7) 0%, rgba(31, 224, 58, 0.32) 40%, transparent 70%)",
            filter: "blur(26px)",
          }}
        />
      </div>

      {/* Top-Right 125° Beam */}
      <div className="pointer-events-none fixed top-0 right-0 z-0 opacity-70">
        <div
          className="relative"
          style={{
            transformOrigin: "0 0",
            transform: "rotate(135deg)",
          }}
        >
          <div
            className="absolute top-[-28px] left-0 w-[62vw] max-w-[540px] h-[56px]"
            style={{
              background:
                "linear-gradient(to right, rgba(50, 245, 80, 0.9) 0%, rgba(35, 230, 65, 0.55) 25%, rgba(31, 224, 58, 0.16) 55%, transparent 88%)",
              filter: "blur(18px)",
            }}
          />
          <div
            className="absolute top-[-100px] left-0 w-[76vw] max-w-[660px] h-[200px]"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 0% 50%, rgba(35, 240, 65, 0.65) 0%, rgba(31, 224, 58, 0.28) 30%, transparent 75%)",
              filter: "blur(36px)",
            }}
          />
        </div>
        <div
          className="absolute -top-14 -right-14 w-52 h-52 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 65% 35%, rgba(65, 255, 100, 0.7) 0%, rgba(31, 224, 58, 0.32) 40%, transparent 70%)",
            filter: "blur(26px)",
          }}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: THE STARTER PAGE                                      */}
      {/* Non-scrollable viewport, FULL WIDTH sticky bottom card        */}
      {/* Plus Jakarta Sans, low weight, no tracking,        */}
      {/* Official CarbonX logo + greeny.png graphic                    */}
      {/* ------------------------------------------------------------- */}
      {viewStep === "starter" && (
        <div className="relative flex w-full h-full flex-col justify-between items-center overflow-hidden z-10">
          {/* 1. TOP HEADER GROUP */}
          <div className="relative z-10 flex w-full max-w-sm sm:max-w-md mx-auto flex-col items-center pt-5 sm:pt-7 px-4 shrink-0">
            {/* Official CarbonX Logo (Bigger) */}
            <div className="flex items-center justify-center">
              <Image
                src={headerLogo}
                alt="CarbonX"
                priority
                className="h-12 sm:h-14 md:h-16 w-auto object-contain"
              />
            </div>

            {/* SPACER: CONTENT BELOW LOGO IS LOWER DOWN */}
            <div className="mt-6 sm:mt-8 flex flex-col items-center w-full">
              {/* Pill Badge: 'Trade Crypto Anytime' (font-normal, */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#0c1610] px-4 py-1.5 text-xs font-normal text-neon-soft shadow-[0_0_12px_rgba(31,224,58,0.15)]">
                <MagicStar size={13} color="#1fe03a" variant="Bold" />
                <span>Carbon Credit Ecosystem</span>
              </div>

              {/* Hero Typography (Plus Jakarta Sans, font-normal, - BIGGER TITLE */}
              <div className="mt-3.5 sm:mt-4 text-center">
                <h1 className="text-3xl font-normal text-white leading-[1.12]">
                  Powering Carbon <br />
                  <span className="font-normal text-neon">
                    Negative Future
                  </span>
                </h1>
                <p className="mt-2 text-xs font-normal text-muted">
                  Tokenizing nature into digital assets
                </p>
              </div>
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

          {/* 3. STICKY BOTTOM CARD: A LITTLE MORE WIDE WITH BORDER LIGHTENING EASING OUT ON CURVES */}
          <div className="w-full max-w-[480px] sm:max-w-[520px] mx-auto px-2 sm:px-3 relative z-20 flex flex-col sticky bottom-0 shrink-0">
            {/* SVG Curved Top Cap with Diminishing Green Border Active & Easing Out on Curves */}
            <div className="relative w-full overflow-hidden -mb-px">
              <svg
                viewBox="0 0 1000 95"
                preserveAspectRatio="none"
                className="w-full h-16 sm:h-[4.25rem] block"
              >
                <defs>
                  {/* Green border gradient active on outer curves and scoop curves, easing out smoothly */}
                  <linearGradient id="diminishingBorder" x1="0%" y1="0%" x2="100%" y2="0%">
                    {/* Left vertical side easing in */}
                    <stop offset="0%" stopColor="#2eed4c" stopOpacity="0.0" />
                    <stop offset="1.5%" stopColor="#2eed4c" stopOpacity="0.35" />
                    {/* Left corner curve (active green glow) */}
                    <stop offset="3.5%" stopColor="#2eed4c" stopOpacity="0.75" />
                    <stop offset="5.5%" stopColor="#2eed4c" stopOpacity="0.95" />
                    <stop offset="8%" stopColor="#2eed4c" stopOpacity="1.0" />

                    {/* Left flat shoulder */}
                    <stop offset="24%" stopColor="#2eed4c" stopOpacity="1.0" />

                    {/* Scoop entering curve (easing out down into trough) */}
                    <stop offset="30%" stopColor="#2eed4c" stopOpacity="0.85" />
                    <stop offset="36%" stopColor="#2eed4c" stopOpacity="0.55" />
                    <stop offset="42%" stopColor="#2eed4c" stopOpacity="0.2" />
                    <stop offset="47%" stopColor="#2eed4c" stopOpacity="0.0" />
                    <stop offset="53%" stopColor="#2eed4c" stopOpacity="0.0" />
                    {/* Scoop ascending curve (easing in up out of trough) */}
                    <stop offset="58%" stopColor="#2eed4c" stopOpacity="0.2" />
                    <stop offset="64%" stopColor="#2eed4c" stopOpacity="0.55" />
                    <stop offset="70%" stopColor="#2eed4c" stopOpacity="0.85" />

                    {/* Right flat shoulder */}
                    <stop offset="76%" stopColor="#2eed4c" stopOpacity="1.0" />
                    <stop offset="92%" stopColor="#2eed4c" stopOpacity="1.0" />

                    {/* Right corner curve (active green glow easing out down side) */}
                    <stop offset="94.5%" stopColor="#2eed4c" stopOpacity="0.95" />
                    <stop offset="96.5%" stopColor="#2eed4c" stopOpacity="0.75" />
                    <stop offset="98.5%" stopColor="#2eed4c" stopOpacity="0.35" />
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

                {/* Card Fill: Rounded Outer Corners (A 36,36) + Deep Concave Scoop in middle (depth 68px) */}
                <path
                  d="M 2,95 L 2,46 A 36,36 0 0 1 38,10 L 245,10 C 340,10 395,78 500,78 C 605,78 660,10 755,10 L 962,10 A 36,36 0 0 1 998,46 L 998,95 Z"
                  fill="#0b110d"
                />

                {/* Ambient glow inside the scoop matching image.png */}
                <path
                  d="M 2,95 L 2,46 A 36,36 0 0 1 38,10 L 245,10 C 340,10 395,78 500,78 C 605,78 660,10 755,10 L 962,10 A 36,36 0 0 1 998,46 L 998,95 Z"
                  fill="url(#scoopAura)"
                />

                {/* Blurred outer neon glow on the border line (extending down curves on both sides) */}
                <path
                  d="M 2,75 L 2,46 A 36,36 0 0 1 38,10 L 245,10 C 340,10 395,78 500,78 C 605,78 660,10 755,10 L 962,10 A 36,36 0 0 1 998,46 L 998,75"
                  fill="none"
                  stroke="url(#diminishingBorder)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  filter="url(#neonBlur)"
                  opacity="0.85"
                />

                {/* Crisp Core Top Border with Eased Out Green Glow (extending down curves on both sides) */}
                <path
                  d="M 2,75 L 2,46 A 36,36 0 0 1 38,10 L 245,10 C 340,10 395,78 500,78 C 605,78 660,10 755,10 L 962,10 A 36,36 0 0 1 998,46 L 998,75"
                  fill="none"
                  stroke="url(#diminishingBorder)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Card Body seamlessly joined to the curved top, with visible side borders and rounded base */}
            <div className="w-full bg-[#0b110d] px-4 sm:px-6 pt-1.5 pb-6 sm:pb-8 shadow-[0_-12px_40px_rgba(0,0,0,0.85)] flex flex-col items-center rounded-b-[2rem] sm:rounded-b-[2.5rem] border-x border-b border-white/[0.05]">
              <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col gap-3.5">
                {/* Header inside the curved card (font-normal, */}
                <div className="text-center pt-0.5">
                  <span className="text-xs font-normal text-white">
                    Welcome To CarbonX!
                  </span>
                </div>

                {/* WALLET ADDRESS INPUT BOX (Replacing phone number field) */}
                <div className="flex items-center rounded-2xl bg-[#121914] p-1.5 border border-white/[0.08] focus-within:border-neon/50 transition">
                  {/* Left Selector Pill (styled like the country code dropdown +1 v) */}
                  <button
                    type="button"
                    onClick={() => connect().catch(() => {})}
                    className="flex items-center gap-1.5 rounded-xl bg-[#19241c] px-3 py-2.5 text-xs font-normal text-white border border-white/[0.06] hover:bg-[#202e24] transition cursor-pointer shrink-0"
                  >
                    <span className="text-sm">⚡</span>
                    <span>BSC</span>
                    <span className="text-2xs text-muted">▼</span>
                  </button>

                  {/* Right Address Display */}
                  <div className="flex-1 px-3 text-left min-w-0">
                    {account ? (
                      <div
                        className="font-sans text-sm font-normal text-white truncate whitespace-nowrap"
                        title={account}
                      >
                        <span className="sm:hidden">
                          {account.length > 26 ? `${account.slice(0, 13)}...${account.slice(-9)}` : account}
                        </span>
                        <span className="hidden sm:inline">
                          {account.length > 32 ? `${account.slice(0, 17)}...${account.slice(-12)}` : account}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => connect().catch(() => {})}
                        className="text-left font-sans text-sm font-normal text-muted hover:text-neon transition cursor-pointer w-full truncate whitespace-nowrap"
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
                      className="rounded-lg bg-neon/15 px-2.5 py-1 text-2xs font-normal text-neon border border-neon/30 hover:bg-neon/25 transition cursor-pointer shrink-0"
                    >
                      Wallets
                    </button>
                  )}
                </div>

                {/* One action button: Connect, Login (member) or Register (new wallet) */}
                <button
                  type="button"
                  disabled={registration === "checking"}
                  onClick={() => {
                    if (registration === "registered") onLogin();
                    else if (registration === "unregistered") setViewStep("register_form");
                    else if (registration === "error") onRetry();
                    else connect().catch(() => {});
                  }}
                  className="btn btn-primary w-full rounded-2xl py-4 text-base font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {registration === "checking" ? (
                    <>
                      <Spinner />
                      <span>Checking account...</span>
                    </>
                  ) : registration === "registered" ? (
                    <>
                      <span>Login</span>
                      <ArrowRight size={18} color="#051207" />
                    </>
                  ) : registration === "unregistered" ? (
                    <span>Register</span>
                  ) : registration === "error" ? (
                    <span>Try again</span>
                  ) : (
                    <span>Connect Wallet</span>
                  )}
                </button>

                <div className="text-center text-xs font-normal text-muted pt-0.5">
                  {registration === "unregistered" ? (
                    <span>This wallet is not registered yet. Tap Register to join.</span>
                  ) : registration === "error" ? (
                    <span className="text-danger">Could not check your account. Please try again.</span>
                  ) : !account ? (
                    <span>Connect Your Web3 Wallet To Start</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => disconnect()}
                      className="text-danger hover:underline font-normal cursor-pointer"
                    >
                      Disconnect
                    </button>
                  )}
                </div>

                <SocialLinks />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 2: REGISTRATION FORM (WHEN CLICKING REGISTER)           */}
      {/* Cohesive CarbonX design language, atmospheric layout          */}
      {/* ------------------------------------------------------------- */}
      {viewStep === "register_form" && (
        <div className="relative z-10 flex min-h-full w-full flex-col items-center px-4 pb-14 pt-5 sm:pt-7">
          {/* Back, logo */}
          <div className="relative flex w-full max-w-[480px] items-center justify-center">
            <button
              type="button"
              onClick={() => setViewStep("starter")}
              aria-label="Back"
              className="absolute left-0 flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-panel text-white transition hover:border-white/20"
            >
              <ArrowLeft size={18} color="currentColor" />
            </button>
            <Image src={headerLogo} alt="CarbonX" priority className="h-8 w-auto object-contain sm:h-9" />
          </div>

          {registration === "registered" && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="already-registered-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
            >
              <div className="card flex w-full max-w-sm flex-col items-center gap-4 p-6 text-center">
                <TickCircle size={40} color="#1fe03a" variant="Bold" />
                <div>
                  <h2 id="already-registered-title" className="text-base font-medium text-white">
                    Already registered
                  </h2>
                  <p className="mt-1.5 text-xs text-muted">This wallet is already a CarbonX member. Log in to open your dashboard.</p>
                </div>
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="btn btn-primary w-full cursor-pointer py-3 text-sm font-semibold"
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 flex w-full max-w-[480px] flex-col gap-4">
            {wrongNetwork && (
              <Notice tone="warn">
                <div className="flex items-center justify-between gap-2">
                  <span>Switch wallet network to {chain.name}</span>
                  <button
                    type="button"
                    onClick={() => switchNetwork().catch(() => {})}
                    className="btn btn-primary shrink-0 !px-2.5 !py-1 text-xs"
                  >
                    Switch
                  </button>
                </div>
              </Notice>
            )}
            {tx.result && <Notice tone={tx.result.tone}>{tx.result.text}</Notice>}

            <section className="card flex flex-col gap-5 p-5 sm:p-6" aria-label="Register">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-sm font-medium text-text">Register</h1>
                {account ? (
                  <button
                    type="button"
                    onClick={() => copyAddress(account)}
                    className="flex cursor-pointer items-center gap-1.5 text-xs text-muted transition hover:text-white"
                    title="Copy address"
                  >
                    <span>
                      {account.slice(0, 6)}…{account.slice(-4)}
                    </span>
                    {copiedAddr ? <TickCircle size={14} color="#1fe03a" variant="Bold" /> : <Copy size={14} variant="Linear" />}
                  </button>
                ) : (
                  <span className="text-xs text-muted">No wallet connected</span>
                )}
              </div>

              {/* Amount */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-medium text-muted">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="10"
                    step="10"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    aria-label="Amount in USDT"
                    placeholder="0"
                    style={{ fontSize: 36, width: `${Math.max(2, amountStr.length + 1)}ch` }}
                    className="min-w-[2ch] max-w-full bg-transparent text-center font-medium text-white outline-none placeholder:text-muted/50"
                  />
                </div>
                <div
                  className={`text-xs ${
                    isBelowMin || isAboveMax || hasInsufficientBalance ? "text-danger" : "text-muted"
                  }`}
                >
                  {isBelowMin
                    ? "Minimum is $10"
                    : isAboveMax
                    ? "Maximum is $5,000"
                    : hasInsufficientBalance
                    ? `Not enough USDT (you have ${usd(user?.usdtBalance ?? 0n)})`
                    : account
                    ? `Balance ${usd(user?.usdtBalance ?? 0n)}`
                    : "USDT"}
                </div>
                <div className="grid w-full grid-cols-5 gap-2">
                  {[10, 100, 500, 1000, 5000].map((amt) => {
                    const active = amountStr === String(amt);
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountStr(String(amt))}
                        className={`cursor-pointer rounded-xl border py-2 text-xs font-medium transition ${
                          active
                            ? "border-[#22c55e] bg-[#0a1b0f] text-white"
                            : "border-white/10 bg-[#14171d] text-[#b9c2bc] hover:text-white"
                        }`}
                      >
                        {amt >= 1000 ? `${amt / 1000}K` : amt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plan */}
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    [LockType.FLEXIBLE, "Flexible"],
                    [LockType.LOCKED_100, "Locked"],
                    [LockType.LOCKED_50, "50/50"],
                  ] as const
                ).map(([type, label]) => {
                  const active = selectedLock === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedLock(type)}
                      className={`cursor-pointer rounded-2xl border py-3 text-sm font-medium transition ${
                        active
                          ? "border-[#22c55e] bg-[radial-gradient(120%_100%_at_50%_30%,rgba(34,197,94,0.3),rgba(8,38,16,0.7))] text-white"
                          : "border-white/10 bg-[#14171d] text-[#b9c2bc] hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* What you get */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted">Earns about</div>
                  <div className="mt-0.5 text-base text-white">
                    ${estDailyUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} / day
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Up to</div>
                  <div className="mt-0.5 text-base text-white">
                    ${maxCapUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>

              {/* Sponsor and leader code */}
              <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted">Sponsor address</span>
                  <input
                    type="text"
                    placeholder="0x... (blank for Top ID)"
                    value={sponsorInput}
                    onChange={(e) => setSponsorInput(e.target.value.trim())}
                    className="w-full rounded-xl border border-white/10 bg-[#14171d] px-3.5 py-3 text-[10px] sm:text-xs text-white outline-none placeholder:text-muted/60 focus:border-[#22c55e]"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted">Leader code (optional)</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1111 (optional)"
                    value={leaderCodeInput === "0" ? "" : leaderCodeInput}
                    onChange={(e) => setLeaderCodeInput(e.target.value || "0")}
                    className="w-full rounded-xl border border-white/10 bg-[#14171d] px-3.5 py-3 text-xs text-white outline-none placeholder:text-muted/60 focus:border-[#22c55e]"
                  />
                </label>
              </div>

              {/* One button: connect, then approve and register in one go */}
              {!account ? (
                <button
                  type="button"
                  onClick={() => connect().catch(() => {})}
                  className="btn btn-primary w-full cursor-pointer py-3 text-sm font-semibold"
                >
                  Connect wallet
                </button>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    disabled={Boolean(tx.busy) || isBelowMin || isAboveMax || hasInsufficientBalance || !resolvedSponsor}
                    onClick={handleRegisterOneTap}
                    className="btn btn-primary w-full cursor-pointer py-3 text-sm font-semibold"
                  >
                    {tx.busy ? <Spinner /> : `Register $${Number(depositUsdt / 10n ** 18n).toLocaleString()}`}
                  </button>
                  {needsApproval && !isBelowMin && !isAboveMax && !hasInsufficientBalance && (
                    <span className="text-2xs text-muted">First time: you confirm an approval, then the registration.</span>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VIEW 3: FLEXIBLE WALLET LOGIN OPTIONS                         */}
      {/* ------------------------------------------------------------- */}
      {viewStep === "login_wallets" && (
        <div className="relative flex w-full flex-col items-center px-4 py-6 sm:py-8 z-10 min-h-full">
          {/* Top Bar */}
          <div className="w-full max-w-[480px] flex items-center justify-between pb-3 sm:pb-4 border-b border-white/[0.08]">
            <button
              type="button"
              onClick={() => setViewStep("starter")}
              className="flex items-center gap-2 rounded-xl bg-[#121914] px-3 py-2 text-xs font-medium text-muted hover:text-white border border-white/[0.08] hover:border-white/20 transition cursor-pointer"
            >
              <ArrowLeft size={16} color="currentColor" />
              <span>Back</span>
            </button>
            <div className="flex items-center justify-center">
              <Image
                src={headerLogo}
                alt="CarbonX"
                priority
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-[#121914] px-3 py-1.5 text-xs text-neon-soft border border-neon/20">
              <span className="size-2 rounded-full bg-neon animate-pulse" />
              <span>Multi-Wallet</span>
            </div>
          </div>

          <div className="w-full max-w-[480px] text-center pt-5 pb-4">
            <h1 className="text-3xl font-normal text-white">
              Connect Your <span className="font-normal text-neon">Web3 Wallet</span>
            </h1>
            <p className="mt-1 text-xs font-normal text-muted">
              Select your preferred Binance Smart Chain provider
            </p>
          </div>

          <div className="w-full max-w-[480px] rounded-3xl bg-[#0b110d] p-5 sm:p-7 border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col gap-3">
            {[
              { id: "metamask", name: "MetaMask", sub: "Extension & Mobile App" },
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
                className="flex items-center justify-between rounded-2xl bg-[#121914] p-3.5 border border-white/[0.06] hover:border-neon/50 hover:bg-[#162319] hover:shadow-[0_0_16px_rgba(31,224,58,0.2)] transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-neon/10 text-neon border border-neon/20 font-semibold text-sm">
                    {wallet.name[0]}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white">{wallet.name}</div>
                    <div className="text-2xs text-muted">{wallet.sub}</div>
                  </div>
                </div>
                <span className="text-xs font-semibold text-neon flex items-center gap-1">
                  Connect <ArrowRight size={14} />
                </span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                connect().catch(() => {});
                setViewStep("starter");
              }}
              className="btn btn-secondary w-full py-3.5 text-xs mt-2 rounded-2xl cursor-pointer"
            >
              Browse All Supported Wallets (RainbowKit)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
