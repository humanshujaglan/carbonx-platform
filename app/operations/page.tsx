import { PlatformDashboard } from "@/components/platform-dashboard";

export const metadata = {
  title: "Protocol Operations & Actuarial Telemetry | CarbonX",
  description: "Live LHR coefficient, dynamic panic sell tax, capital routing breakdown, and smart contract telemetry on BSC Testnet.",
};

export default function OperationsPage() {
  return <PlatformDashboard initialTab="operations" />;
}
