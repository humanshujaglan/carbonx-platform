import { PlatformDashboard } from "@/components/platform-dashboard";

export const metadata = {
  title: "Sell CARB | CarbonX",
  description: "Sell CARB for USDT on PancakeSwap V2.",
};

export default function SellPage() {
  return <PlatformDashboard initialTab="sell" />;
}
