import { PlatformDashboard } from "@/components/platform-dashboard";

export const metadata = {
  title: "Team & Network Tree | CarbonX",
  description: "View direct referrals, downline generation performance, and team volume metrics on BSC Testnet.",
};

export default function TeamPage() {
  return <PlatformDashboard initialTab="team" />;
}
