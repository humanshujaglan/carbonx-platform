"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlatform } from "@/lib/platform";
import { AuthPortal } from "./auth-portal";
import { useWallet } from "./wallet";

/** Login and register pages: the same portal screens as before, as their own routes. */
export function AuthPage({ initialView }: { initialView: "starter" | "login_wallets" | "register_form" }) {
  const router = useRouter();
  const { account } = useWallet();
  const { addresses, market, user, refresh, loading } = usePlatform(account);

  // Someone who is already signed in goes straight to the dashboard
  useEffect(() => {
    if (account && user?.isRegistered && sessionStorage.getItem(`cx_entered_${account.toLowerCase()}`) === "true") {
      router.replace("/dashboard");
    }
  }, [account, user?.isRegistered, router]);

  const handleEnter = () => {
    if (account) sessionStorage.setItem(`cx_entered_${account.toLowerCase()}`, "true");
    router.push("/dashboard");
  };

  return (
    <AuthPortal
      addresses={addresses}
      user={user}
      market={market}
      loadingUser={loading}
      initialView={initialView}
      onEnterDashboard={handleEnter}
      onRefresh={refresh}
    />
  );
}
