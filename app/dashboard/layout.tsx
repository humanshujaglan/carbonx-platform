import { BonanzaPopup } from "@/components/bonanza-popup";

// Bonanza poster (and the winner's congratulations) only on dashboard routes
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <BonanzaPopup />
    </>
  );
}
