import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { WalletProvider } from "@/components/wallet";
import { Backdrop } from "@/components/backdrop";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CarbonX Platform · Invest & Yield Ecosystem",
  description: "Register, invest USDT across high-yield packages, and track all 6 decentralized income streams.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans font-light bg-ink text-text">
        <Backdrop />
        <WalletProvider>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-36 sm:pb-40 sm:px-6">
            {children}
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}
