import { PlatformDashboard } from "@/components/platform-dashboard";

export const metadata = {
  title: "Downline Structure & Genealogy | CarbonX",
  description: "Explore the complete multi-level downline hierarchy, active volumes, and generation branches on BSC Testnet.",
};

export default function StructurePage() {
  return <PlatformDashboard initialTab="structure" />;
}
