"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsRegistered, usePlatform } from "@/lib/platform";
import { AuthPortal } from "./auth-portal";
import { useWallet } from "./wallet";

/** Login and register pages: the same portal screens as before, as their own routes. */
export function AuthPage({ initialView }: { initialView: "starter" | "login_wallets" | "register_form" }) {
  const router = useRouter();
  const { account } = useWallet();
  const { registered, failed, recheck } = useIsRegistered(account);
  // Full user data loads in the background once a wallet is connected. It feeds the register form
  // and warms the cache so the dashboard opens right after Login.
  const { addresses, market, user, refresh } = usePlatform(account);

  const registration: "none" | "checking" | "registered" | "unregistered" | "error" = !account
    ? "none"
    : registered === undefined
    ? failed
      ? "error"
      : "checking"
    : registered
    ? "registered"
    : "unregistered";

  // Members are about to log in: have the dashboard code ready
  useEffect(() => {
    if (registration === "registered") router.prefetch("/dashboard");
  }, [registration, router]);

  const handleEnter = () => {
    if (account) sessionStorage.setItem(`cx_entered_${account.toLowerCase()}`, "true");
    router.push("/dashboard");
  };

  return (
    <AuthPortal
      addresses={addresses}
      user={user}
      market={market}
      registration={registration}
      onLogin={handleEnter}
      onRetry={recheck}
      initialView={initialView}
      onRefresh={() => {
        refresh();
        recheck();
      }}
    />
  );
}
