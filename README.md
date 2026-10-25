# CarbonX Platform Frontend

A Next.js application built with the exact same design language, color theme, typography, and premium aesthetics as the CarbonX Liquidity Farming frontend.

## Features

- **Decentralized Registration**:
  - Auto-reads referral sponsors via URL parameter `?ref=0x...`
  - Validates sponsor addresses and accepts optional leader codes
  - USDT approval and single-transaction registration deposit
  - Choice of lock strategies: Flexible (0.4% daily, 200% cap), 100% Locked (0.6% daily, 300% cap), 50/50 Hybrid (0.5% daily, 250% cap)

- **Invest & Package Management**:
  - Stake additional USDT to grow deposit base and unlock higher cap headroom
  - Live ticking ROI accrual meters for active packages
  - Instant conversion from 100% Locked packages into 50/50 Hybrid

- **Complete 6 Income Streams Tracking & Withdrawal**:
  1. **Daily Package ROI**: Live accrued ROI, batch accrual (`accrueRange`), and token withdrawal (`withdrawROI`).
  2. **Daily Booster Income**: Unlocked via direct sponsor volume (Tier 1-3), with `withdrawBooster`.
  3. **Downline Level Harvest**: Settle downline yield checkpoints with `harvestLevelIncome`.
  4. **Working Income**: Affiliate balance & working cap headroom indicator, with options for Instant Payout or Linear Vesting schedules (`withdrawWorkingIncome`).
  5. **Rank Salary & Leader Overrides**: Career rank advancement (Rank 1-8), weekly salary claims (`claimWeeklySalaryBonus`), and leader bonuses (`withdrawLeaderIncome`).
  6. **Daily Contests & Sweeps**: Sponsor Price Contest & Leader Contest rewards with gas-safe pagination sweeps (`sweepContestRewards`, `sweepLeaderContestRewards`).

- **Team & Referral Network**:
  - 1-click Referral Link copy
  - Direct downlines list with active status and personal volume
  - Power Leg vs Weaker Leg business breakdown
  - Leader code self-check tool (`checkLeaderCode`)

- **Protocol Market Ribbon**:
  - Live CARB spot price & TWAP 12-hour oracle checkpoints
  - PancakeSwap pool reserves & liquidity status
  - Dynamic LHR risk tier indicator

## Running Locally

```bash
# Install dependencies
npm install

# Run development server (runs on port 3001 if 3000 is occupied by farming frontend)
npm run dev -- -p 3001
```

## Environment Configuration (`.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | Chain ID (56 for BSC Mainnet, 97 for BSC Testnet, 31337 for Anvil) |
| `NEXT_PUBLIC_RPC_URL` | EVM RPC endpoint |
| `NEXT_PUBLIC_PLATFORM_ADDRESS` | Deployed `PlatformContract` address |
| `NEXT_PUBLIC_WS_URL` | Optional WebSocket RPC endpoint |
