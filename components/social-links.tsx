import type { ReactNode } from "react";
import { Send2, Whatsapp, Youtube } from "iconsax-react";

const ICON_COLOR = "#8fe39b";

/** iconsax ships no X logo, so the brand mark is inlined. */
function XLogo() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill={ICON_COLOR} aria-hidden>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

/** Headset with mic for the AI support bot; iconsax has headphones only. */
function HeadsetLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke={ICON_COLOR}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" />
      <path d="M21 16v2a4 4 0 0 1-4 4h-5" />
    </svg>
  );
}

const SOCIAL_LINKS: { label: string; href: string; icon: ReactNode }[] = [
  {
    label: "YouTube",
    href: "https://youtube.com/channel/UCleypFvIzRy-XT56WWCctig",
    icon: <Youtube size={18} color={ICON_COLOR} variant="Bold" />,
  },
  {
    label: "Telegram",
    href: "https://t.me/CarbonXDeFi",
    icon: <Send2 size={18} color={ICON_COLOR} variant="Bold" />,
  },
  {
    label: "WhatsApp",
    href: "https://whatsapp.com/channel/0029Vb9hjbcDuMRnvErU9Z0Y",
    icon: <Whatsapp size={18} color={ICON_COLOR} variant="Bold" />,
  },
  { label: "X", href: "https://x.com/carbonxdefi", icon: <XLogo /> },
  {
    label: "CarbonX AI Support on Telegram",
    href: "https://t.me/CarbonXDefiAI",
    icon: <HeadsetLogo />,
  },
];

export function SocialLinks() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-2xs text-muted">Join the CarbonX community</div>
      <div className="flex items-center gap-2.5">
        {SOCIAL_LINKS.map(({ label, href, icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            title={label}
            className="flex size-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#121914] transition hover:border-neon/40 hover:bg-neon/10"
          >
            {icon}
          </a>
        ))}
      </div>
    </div>
  );
}
