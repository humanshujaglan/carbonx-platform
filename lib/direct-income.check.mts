// Self-check for splitDirectSlips. Run: node lib/direct-income.check.mts
import assert from "node:assert/strict";
import { BONUS_UNLOCK_DELAY as D, splitDirectSlips } from "./direct-income.ts";

const usd = (cents: number) => BigInt(cents) * 10n ** 16n;

// Two locked $10 first packages on different days: 0.20 direct + 0.20 lock each
assert.deepEqual(
  splitDirectSlips(
    [
      { amount: usd(20), unlockTime: 100 + D },
      { amount: usd(20), unlockTime: 100 + D },
      { amount: usd(20), unlockTime: 900 + D },
      { amount: usd(20), unlockTime: 900 + D },
    ],
    [
      { createdAt: 100, locked: true },
      { createdAt: 900, locked: true },
    ]
  ),
  { direct: usd(40), lock: usd(40) }
);

// Flexible package: one slip, all direct. 50/50 package: lock slip is half the direct slip.
assert.deepEqual(
  splitDirectSlips(
    [
      { amount: usd(200), unlockTime: 100 + D },
      { amount: usd(200), unlockTime: 500 + D },
      { amount: usd(100), unlockTime: 500 + D },
    ],
    [
      { createdAt: 100, locked: false },
      { createdAt: 500, locked: true },
    ]
  ),
  { direct: usd(400), lock: usd(100) }
);

// Working cap ran out on the lock slip (no slip pushed), and a slip with no known package counts as direct
assert.deepEqual(
  splitDirectSlips(
    [
      { amount: usd(20), unlockTime: 100 + D },
      { amount: usd(5), unlockTime: 700 + D },
    ],
    [{ createdAt: 100, locked: true }]
  ),
  { direct: usd(25), lock: 0n }
);

console.log("direct-income checks pass");
