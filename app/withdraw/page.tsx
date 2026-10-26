import { PlatformDashboard } from "@/components/platform-dashboard";

export const metadata = {
  title: "Withdrawals & Yield Payout Portal | CarbonX",
  description: "Withdraw daily ROI, booster income, working balance, rank salaries, and contest rewards on BSC Testnet.",
};

export default function WithdrawPage() {
  return <PlatformDashboard initialTab="withdraw" />;
}
