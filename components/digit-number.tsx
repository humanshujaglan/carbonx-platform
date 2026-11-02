"use client";

import Image from "next/image";
import digit0 from "@/public/new-icons/digits/0.png";
import digit1 from "@/public/new-icons/digits/1.png";
import digit2 from "@/public/new-icons/digits/2.png";
import digit3 from "@/public/new-icons/digits/3.png";
import digit4 from "@/public/new-icons/digits/4.png";
import digit5 from "@/public/new-icons/digits/5.png";
import digit6 from "@/public/new-icons/digits/6.png";
import digit7 from "@/public/new-icons/digits/7.png";
import digit8 from "@/public/new-icons/digits/8.png";
import digit9 from "@/public/new-icons/digits/9.png";

const DIGITS = [digit0, digit1, digit2, digit3, digit4, digit5, digit6, digit7, digit8, digit9];

/** Shows a number using the 3D digit artwork (one image per digit). */
export function DigitNumber({ value, height = 56 }: { value: string | number | bigint; height?: number }) {
  const text = value.toString();
  return (
    <span className="inline-flex items-center justify-center" role="img" aria-label={text}>
      {text.split("").map((ch, i) => {
        const digit = DIGITS[Number(ch)];
        if (!digit || !/\d/.test(ch)) return null;
        return (
          <Image
            key={i}
            src={digit}
            alt=""
            height={height}
            width={Math.round((digit.width / digit.height) * height)}
            className="-mx-0.5 object-contain"
            style={{ height, width: "auto" }}
          />
        );
      })}
    </span>
  );
}
