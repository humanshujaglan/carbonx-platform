import { PlatformDashboard } from "@/components/platform-dashboard";

export const metadata = {
  title: "Sell & Swap CARB Tokens | CarbonX",
  description: "Sell CARB for USDT or buy CARB tokens with dynamic fee-on-transfer tax telemetry on PancakeSwap V2.",
};

export default function SwapPage() {
  return <PlatformDashboard initialTab="trade" />;
}
