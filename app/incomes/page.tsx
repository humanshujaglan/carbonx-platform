import { PlatformDashboard } from "@/components/platform-dashboard";

export const metadata = {
  title: "All Income Streams & Yield Overview | CarbonX",
  description: "Track all 6 decentralized income streams including Daily ROI, Booster, Level Harvest, and Pools on BSC Testnet.",
};

export default function IncomesPage() {
  return <PlatformDashboard initialTab="dashboard" />;
}
