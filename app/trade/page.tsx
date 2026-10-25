import { PlatformDashboard } from "@/components/platform-dashboard";

export const metadata = {
  title: "Wallet Balances & Decentralized Token Selling | CarbonX",
  description: "Check your on-chain USDT and CARB token balances, mint testnet USDT, and execute token swaps via PancakeSwap on BSC Testnet.",
};

export default function TradePage() {
  return <PlatformDashboard initialTab="trade" />;
}
