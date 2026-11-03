"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlatform } from "@/lib/platform";
import { AuthPortal } from "./auth-portal";
import { useWallet } from "./wallet";

/** Login and register pages: the same portal screens as before, as their own routes. */
export function AuthPage({ initialView }: { initialView: "starter" | "login_wallets" | "register_form" }) {
  const router = useRouter();
  const { account } = useWallet();
  // User details are only fetched once the visitor asks for them (Login or Register click)
  const [userRequested, setUserRequested] = useState(initialView !== "starter");
  const [loginPending, setLoginPending] = useState(false);
  const { addresses, market, user, error, refresh, loading } = usePlatform(userRequested ? account : undefined);

  const handleEnter = () => {
    if (account) sessionStorage.setItem(`cx_entered_${account.toLowerCase()}`, "true");
    router.push("/dashboard");
  };

  // Login click: fetch the user, then enter the dashboard if they are a member
  useEffect(() => {
    if (loginPending && account && user?.isRegistered) {
      handleEnter();
    }
  }, [loginPending, account, user?.isRegistered]);

  const fetching = userRequested && !!account && !user && !error;
  const loginStatus: "idle" | "loading" | "unregistered" | "error" = !loginPending
    ? "idle"
    : !account || fetching || user?.isRegistered
    ? "loading"
    : error && !user
    ? "error"
    : "unregistered";

  const handleLogin = () => {
    setUserRequested(true);
    setLoginPending(true);
  };

  return (
    <AuthPortal
      addresses={addresses}
      user={user}
      market={market}
      loadingUser={loading}
      loginStatus={loginStatus}
      onLogin={handleLogin}
      onRequestUser={() => setUserRequested(true)}
      initialView={initialView}
      onEnterDashboard={handleEnter}
      onRefresh={refresh}
    />
  );
}
