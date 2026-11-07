import { keccak256, toHex } from "viem";

/**
 * Human-readable text for the platform contracts' custom errors, keyed by error name.
 * Errors missing here fall back to their name split into words ("BelowMinDeposit" -> "Below min deposit").
 */
const MESSAGES: Record<string, string> = {
  AlreadyClaimed: "Already claimed.",
  AlreadyClaimedPartnerPool: "Partner pool reward already claimed.",
  AlreadyClaimedPool: "Pool reward already claimed.",
  AlreadyInitialized: "Already initialized.",
  AlreadyRegistered: "This wallet is already registered.",
  AlreadyRequested: "Already requested.",
  BelowMinDeposit: "Amount is below the minimum deposit.",
  BelowMinWithdrawal: "Amount is below the minimum withdrawal.",
  CarbonTokenNotSet: "CARB token is not configured yet.",
  ContestAlreadyClaimed: "Contest reward already claimed.",
  ContractCallsForbidden: "Smart contract wallets are not allowed. Use a regular wallet.",
  DayNotEnded: "This day has not ended yet.",
  DeploymentCooldown: "Please wait for the deployment cooldown to finish.",
  DexNotConfigured: "DEX is not configured yet.",
  EmptyPool: "The pool is empty.",
  ExcessiveBps: "Percentage value is too high.",
  GenesisNotRegistered: "Genesis user is not registered.",
  GlobalCapExceeded: "Platform global cap reached.",
  HourlyLimitExceeded: "Hourly withdrawal limit reached. Try again later.",
  InsufficientWorkingIncome: "Not enough working income available.",
  InvalidAddress: "Invalid address.",
  InvalidAmount: "Invalid amount.",
  InvalidDecimals: "Invalid token decimals.",
  InvalidLeaderCode: "Invalid leader code.",
  InvalidLeaderContestPoolBps: "Invalid leader contest pool percentage.",
  InvalidOracleConfig: "Invalid oracle configuration.",
  InvalidPair: "Invalid trading pair.",
  InvalidPositionId: "Invalid position.",
  InvalidPrice: "Invalid price.",
  InvalidRank: "Invalid rank.",
  InvalidSponsor: "Invalid sponsor. The sponsor must be a registered member.",
  InvalidThreshold: "Invalid threshold.",
  InvalidTokenDecimals: "Invalid token decimals.",
  InvalidVestingSchedule: "Invalid vesting schedule.",
  LeaderDownlineOnly: "Leader code can only be used by the leader's downline.",
  LhrEngineNotReady: "LHR engine is not ready yet.",
  LockWindowExpired: "The lock window has expired.",
  MaxActivePositionsExceeded: "Maximum number of active packages reached.",
  MaxFirstPackageDepositExceeded: "First package is above the maximum allowed amount.",
  MaxPackageDepositExceeded: "Package is above the maximum allowed amount.",
  MaxPartners: "Maximum number of partners reached.",
  MaxPositionsExceeded: "Maximum number of packages reached.",
  MaxVestingSchedules: "Maximum number of vesting schedules reached.",
  MonthNotEnded: "This month has not ended yet.",
  MustBeDirectOfTopId: "Must be a direct referral of the Top ID.",
  NoBonusAvailable: "No bonus available to claim.",
  NoLpToLiquidate: "No LP tokens to liquidate.",
  NoPendingRequest: "No pending request.",
  NoRankAchieved: "No rank achieved yet.",
  NotActivePartner: "Only active partners can do this.",
  NotAdmin: "Admin only.",
  NotAdminOrOwner: "Admin or owner only.",
  NotAuthorized: "You are not authorized to do this.",
  NotContestWinner: "You are not a winner of this contest.",
  NotPlatformOrOwner: "Platform or owner only.",
  NotPositionOwner: "This package belongs to another wallet.",
  NotVestingOwner: "This vesting belongs to another wallet.",
  NotWinner: "You are not a winner of this cycle.",
  OnlyAuthorizedSatellite: "Only authorized platform modules can do this.",
  OnlyPlatform: "Only the platform contract can do this.",
  OnlyTopId: "Only the Top ID can do this.",
  OnlyTopIdApprove: "Only the Top ID can approve this.",
  OnlyTopIdRevoke: "Only the Top ID can revoke this.",
  OracleHealthy: "Price oracle is healthy, so this action is not available.",
  OracleNotInitialized: "Price oracle is not initialized yet.",
  OutOfBounds: "Value is out of range.",
  PartnerAlreadyActive: "Partner is already active.",
  PartnerNotActive: "Partner is not active.",
  PlatformContractPermanentlyLocked: "Platform contract is permanently locked.",
  PositionAlreadyLocked: "Package is already locked.",
  PositionNotActive: "Package is not active.",
  RankAlreadyClaimed: "Rank reward already claimed.",
  RegistrationCooldown: "Please wait a moment before registering again.",
  RescueTierSelfOnly: "Rescue tier can only be used by the account itself.",
  SameBlockActionForbidden: "Please wait for the next block and try again.",
  SatellitesAlreadyInitialized: "Platform modules are already initialized.",
  SelfReferralForbidden: "You cannot use your own address as sponsor.",
  SponsorDirectLimitReached: "This sponsor has reached the direct referral limit. Use another sponsor.",
  StopLossNotTriggered: "Stop loss has not been triggered.",
  TeamEngineNotSet: "Team engine is not configured yet.",
  TopIdDirectLimitReached: "Top ID has reached the direct referral limit. Use another sponsor.",
  TreasuryFeeExceedsCeiling: "Treasury fee is above the allowed maximum.",
  TwapStale: "Price oracle is out of date. Try again shortly.",
  Unauthorized: "You are not authorized to do this.",
  UserNotRegistered: "This wallet is not registered yet.",
  VestingAlreadyClaimed: "Vesting already claimed.",
  VestingNotStarted: "Vesting has not started yet.",
  ZeroAddress: "Address cannot be empty.",
  ZeroAmount: "Amount must be greater than zero.",
  ZeroClaimable: "Nothing to claim right now.",
  ZeroMaintenance: "Maintenance amount is zero.",
  ZeroPartnerBusiness: "No partner business yet.",
  ZeroPlatform: "Platform address is not set.",
  ZeroPoolBalance: "The pool balance is zero.",
  ZeroUserShare: "Your share is zero.",
  // OpenZeppelin
  ERC20InsufficientBalance: "Not enough token balance.",
  ERC20InsufficientAllowance: "Token allowance is too low. Approve first.",
  EnforcedPause: "The platform is paused right now.",
  ReentrancyGuardReentrantCall: "Another action is in progress. Please try again.",
  OwnableUnauthorizedAccount: "Only the owner can do this.",
  SafeERC20FailedOperation: "Token transfer failed.",
};

// Errors that carry arguments hash with their types; all others take none
const WITH_ARGS: Record<string, string> = {
  InvalidLeaderContestPoolBps: "(uint256,uint256,uint256)",
  TreasuryFeeExceedsCeiling: "(uint256,uint256)",
  ERC20InsufficientBalance: "(address,uint256,uint256)",
  ERC20InsufficientAllowance: "(address,uint256,uint256)",
  OwnableUnauthorizedAccount: "(address)",
  SafeERC20FailedOperation: "(address)",
};

const BY_SELECTOR = new Map<string, string>(
  Object.keys(MESSAGES).map((name) => [keccak256(toHex(`${name}${WITH_ARGS[name] ?? "()"}`)).slice(0, 10), name])
);

/** Readable message for a 4-byte revert selector, or undefined when the error is unknown. */
export function customErrorMessage(selector: string | undefined): string | undefined {
  if (!selector) return undefined;
  const name = BY_SELECTOR.get(selector.slice(0, 10).toLowerCase());
  return name ? MESSAGES[name] : undefined;
}

/** Same lookup by decoded error name; unknown names become words ("BelowMinDeposit" -> "Below min deposit"). */
export function customErrorNameMessage(name: string): string {
  return MESSAGES[name] ?? name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase()) + ".";
}
