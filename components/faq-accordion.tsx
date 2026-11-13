"use client";

import { useState } from "react";
import { ArrowDown2 } from "iconsax-react";

export type FaqItem = { q: string; a: string };

/** Question list where one answer is open at a time. */
export function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <div className="flex flex-col">
      {items.map((item, i) => {
        const open = openIdx === i;
        return (
          <div key={item.q} className="border-t border-white/[0.08] first:border-t-0">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenIdx(open ? null : i)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left text-sm font-medium text-white"
            >
              <span>{item.q}</span>
              <ArrowDown2
                size={16}
                color="currentColor"
                className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
            {open && <p className="pb-3 text-xs text-muted">{item.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
