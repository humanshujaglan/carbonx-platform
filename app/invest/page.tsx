import { PlatformDashboard } from "@/components/platform-dashboard";

export const metadata = {
  title: "Investment Packages & Capital Allocation | CarbonX",
  description: "Invest USDT across yield-generating packages and manage your active principal deposits on BSC Testnet.",
};

export default function InvestPage() {
  return <PlatformDashboard initialTab="invest" />;
}
