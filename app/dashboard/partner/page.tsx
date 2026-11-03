import { PlatformDashboard } from "@/components/platform-dashboard";

export const metadata = {
  title: "Top ID Partner Pool | CarbonX",
  description: "Claim your monthly share of the Top ID partner pool.",
};

export default function PartnerPage() {
  return <PlatformDashboard initialTab="partner" />;
}
