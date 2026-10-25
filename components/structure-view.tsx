"use client";

import { useEffect, useState, useCallback } from "react";
import { type Address, isAddress, getAddress } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight2,
  ArrowUp2,
  CloseCircle,
  Copy,
  Hierarchy,
  InfoCircle,
  Refresh2,
  SearchNormal1,
  TickCircle,
  Wallet3,
} from "iconsax-react";
import analysisImage from "@/public/analysis.png";
import { shortAddr, usd } from "@/lib/format";
import { platformAbi } from "@/lib/abi";
import { viewAddress, platformAddress } from "@/lib/config";
import { publicClient, type PlatformAddresses, type PlatformUser } from "@/lib/platform";
import { CardHeader, Pill, Spinner, useToast } from "./ui";
import { useWallet } from "./wallet";

export const RANK_NAMES = [
  "Member",
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Ruby",
  "Emerald",
  "Sapphire",
  "Diamond",
  "Blue Diamond",
  "Black Diamond",
  "Crown Diamond",
  "Ambassador",
  "Royal Ambassador",
  "Crown Ambassador",
  "Daddy Legend",
];

export type DetailedUserNode = {
  address: Address;
  sponsor: Address;
  activePackagesCount: number;
  totalPackagesCount: number;
  totalInvestment: bigint;
  directCount: number;
  leaderCodeActive: boolean;
  leaderCode?: string;
  boosterActive: boolean;
  boosterTier: number;
  teamVolume: bigint;
  rank: string;
  leg: "power" | "weaker";
  directs: DetailedUserNode[];
};

export function StructureView({
  user,
  addresses,
  onDone,
}: {
  user?: PlatformUser;
  addresses?: PlatformAddresses;
  onDone: () => void;
}) {
  const { account } = useWallet();
  const toast = useToast();

  const defaultRoot = account ?? addresses?.topId ?? ("0x9C886a403c88D95F45753c4312d10F3D9343590c" as Address);
  const [activeRoot, setActiveRoot] = useState<Address>(defaultRoot);
  const [searchInput, setSearchInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [rootNode, setRootNode] = useState<DetailedUserNode | null>(null);

  // History path to navigate down and up the tree hierarchy
  const [navPath, setNavPath] = useState<DetailedUserNode[]>([]);

  // Selected member for the user details modal
  const [modalUser, setModalUser] = useState<DetailedUserNode | null>(null);

  // Sync activeRoot when account connects
  useEffect(() => {
    if (account && activeRoot !== account && navPath.length === 0) {
      setActiveRoot(account);
    }
  }, [account, activeRoot, navPath.length]);

  // Recursively or iteratively fetch real node data from smart contract
  const fetchNode = useCallback(
    async (
      targetAddress: Address,
      parentLeg: "power" | "weaker" = "power",
      depth = 0
    ): Promise<DetailedUserNode> => {
      const vAddr = viewAddress;

      const [u, directsList, leaderCode] = (await Promise.all([
        publicClient
          .readContract({
            address: vAddr,
            abi: platformAbi,
            functionName: "getUser",
            args: [targetAddress],
          })
          .catch(() => null),
        publicClient
          .readContract({
            address: vAddr,
            abi: platformAbi,
            functionName: "getDirectDownlines",
            args: [targetAddress],
          })
          .catch(() => [] as Address[]),
        publicClient
          .readContract({
            address: vAddr,
            abi: platformAbi,
            functionName: "leaderCodeOf",
            args: [targetAddress],
          })
          .catch(() => 0n),
      ])) as [any, Address[], bigint];

      const posIds = u?.positionIds ?? [];
      const totalPackagesCount = posIds.length;
      const rankIdx = Number(u?.currentRank ?? 0n);
      const rankName = RANK_NAMES[rankIdx] ?? "Member";

      // If depth < 1 and there are directs, fetch real direct children
      let childNodes: DetailedUserNode[] = [];
      if (depth < 1 && directsList.length > 0) {
        childNodes = await Promise.all(
          directsList.map((childAddr) =>
            fetchNode(childAddr as Address, "power", depth + 1)
          )
        );
      }

      return {
        address: targetAddress,
        sponsor: (u?.sponsor ?? "0x0000000000000000000000000000000000000000") as Address,
        activePackagesCount: totalPackagesCount,
        totalPackagesCount,
        totalInvestment: u?.totalActiveDeposit ?? 0n,
        directCount: directsList.length,
        leaderCodeActive: leaderCode > 0n,
        leaderCode: leaderCode > 0n ? `#${leaderCode.toString()}` : undefined,
        boosterActive: Number(u?.boosterTier ?? 0n) > 0,
        boosterTier: Number(u?.boosterTier ?? 0n),
        teamVolume: u?.totalTeamBusiness ?? 0n,
        rank: rankName,
        leg: parentLeg,
        directs: childNodes,
      };
    },
    []
  );

  // Load tree on root change
  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const node = await fetchNode(activeRoot, "power", 0);
      setRootNode(node);
      setNavPath([node]);
    } catch {
      // Create minimal empty node
      const emptyNode: DetailedUserNode = {
        address: activeRoot,
        sponsor: "0x0000000000000000000000000000000000000000" as Address,
        activePackagesCount: 0,
        totalPackagesCount: 0,
        totalInvestment: 0n,
        directCount: 0,
        leaderCodeActive: false,
        boosterActive: false,
        boosterTier: 0,
        teamVolume: 0n,
        rank: "Member",
        leg: "power",
        directs: [],
      };
      setRootNode(emptyNode);
      setNavPath([emptyNode]);
    } finally {
      setLoading(false);
    }
  }, [activeRoot, fetchNode]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Current focused user in the graph
  const currentFocus = navPath[navPath.length - 1] ?? rootNode;
  const isAtRoot = navPath.length <= 1;
  const uplineUser = navPath.length > 1 ? navPath[navPath.length - 2] : null;

  async function handleViewMore(directUser: DetailedUserNode) {
    setLoading(true);
    try {
      // Fetch full children for the clicked user
      const fullNode = await fetchNode(directUser.address, directUser.leg, 0);
      setNavPath((prev) => [...prev, fullNode]);
    } catch {
      setNavPath((prev) => [...prev, directUser]);
    } finally {
      setLoading(false);
    }
  }

  function handleGoToPrevious() {
    if (navPath.length > 1) {
      setNavPath((prev) => prev.slice(0, prev.length - 1));
    }
  }

  function handleJumpToBreadcrumb(index: number) {
    setNavPath((prev) => prev.slice(0, index + 1));
  }

  function copyAddr(addr: string) {
    navigator.clipboard?.writeText(addr);
    toast.show("Address copied!");
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q) return;
    if (isAddress(q)) {
      setActiveRoot(getAddress(q));
      setSearchInput("");
    } else {
      toast.show("Please enter a valid BSC address (0x...)");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Network Overview Summary */}
      <section className="card p-5 sm:p-6" aria-label="Structure summary">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.04]">
          <CardHeader
            image={analysisImage}
            title="Real Multi-Generation Network Tree"
            sub="Live 100% on-chain downlines, personal deposits, power/weaker leg business, and rank telemetry."
            right={
              <button
                type="button"
                onClick={loadTree}
                disabled={loading}
                className="btn btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Refresh2 size={14} className={loading ? "animate-spin" : ""} />
                Refresh On-Chain
              </button>
            }
          />
        </div>

        {/* Address Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search any BSC Testnet address to inspect their live tree (0x...)"
              className="well w-full py-2.5 pl-10 pr-4 text-xs font-mono text-text outline-none focus:border-neon/50"
            />
            <SearchNormal1 size={16} className="absolute left-3.5 top-3 text-muted" />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" className="btn btn-primary text-xs !py-2.5 !px-4">
              Inspect Tree
            </button>
            {account && activeRoot !== account && (
              <button
                type="button"
                onClick={() => setActiveRoot(account)}
                className="btn btn-secondary text-xs !py-2.5 !px-3.5"
              >
                My Wallet
              </button>
            )}
            {activeRoot !== ("0x9C886a403c88D95F45753c4312d10F3D9343590c" as Address) && (
              <button
                type="button"
                onClick={() => setActiveRoot("0x9C886a403c88D95F45753c4312d10F3D9343590c" as Address)}
                className="btn btn-secondary text-xs !py-2.5 !px-3.5"
              >
                Top ID Tree
              </button>
            )}
          </div>
        </form>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="well p-4">
            <div className="label">Inspected Account Deposit</div>
            <div className="mt-1 text-xl font-bold text-gradient text-neon-soft">
              {currentFocus ? usd(currentFocus.totalInvestment) : "—"}
            </div>
          </div>
          <div className="well p-4">
            <div className="label">Direct Team Partners</div>
            <div className="mt-1 text-xl font-bold text-text">
              {currentFocus?.directCount ?? 0} members
            </div>
          </div>
          <div className="well p-4">
            <div className="label">Total Team Business</div>
            <div className="mt-1 text-xl font-bold text-text">
              {currentFocus ? usd(currentFocus.teamVolume) : "—"}
            </div>
          </div>
          <div className="well p-4">
            <div className="label">Rank Progression</div>
            <div className="mt-1 text-xl font-bold text-gold">
              {currentFocus?.rank ?? "Member"}
            </div>
          </div>
        </div>
      </section>

      {/* Prominent Back to Upline & Breadcrumbs Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#101114] border border-white/[0.06]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Dedicated Back / Upline Button */}
          {!isAtRoot ? (
            <button
              type="button"
              onClick={handleGoToPrevious}
              className="btn btn-primary !py-2 !px-4 text-xs flex items-center gap-2 shadow-[0_0_12px_rgba(31,224,58,0.3)] cursor-pointer"
            >
              <ArrowLeft size={16} color="currentColor" />
              <span>Back to Previous User ({shortAddr(uplineUser?.address ?? "")})</span>
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-xs text-muted border border-white/[0.05]">
              Viewing Root Node: <strong className="text-neon-soft">{shortAddr(activeRoot)}</strong>
            </div>
          )}

          {/* Breadcrumb Trail */}
          <div className="flex flex-wrap items-center gap-1.5 ml-1">
            {navPath.map((node, index) => {
              const isLast = index === navPath.length - 1;
              const isRootNode = index === 0;

              return (
                <div key={node.address + index} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleJumpToBreadcrumb(index)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition cursor-pointer ${
                      isLast
                        ? "bg-neon/15 text-neon border border-neon/40 font-semibold"
                        : "text-muted hover:text-text hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>{isRootNode ? "Root" : shortAddr(node.address)}</span>
                    {isLast && (
                      <span className="size-1.5 rounded-full bg-neon animate-pulse" />
                    )}
                  </button>
                  {!isLast && <ArrowRight2 size={12} color="#5b616b" className="shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-muted flex items-center gap-1">
          <span>Active Focus:</span>
          <strong className="text-neon-soft">{currentFocus ? shortAddr(currentFocus.address) : "—"}</strong>
        </div>
      </div>

      {/* Visual Downline Tree Canvas */}
      <section className="card p-5 sm:p-6" aria-label="Visual downline tree">
        <CardHeader
          image={analysisImage}
          title="On-Chain Tree View"
          right={
            currentFocus && (
              <button
                type="button"
                onClick={() => setModalUser(currentFocus)}
                className="btn btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <InfoCircle size={15} color="currentColor" />
                View User Details
              </button>
            )
          }
        />

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Spinner />
            <span className="text-xs text-muted">Reading on-chain network hierarchy from BSC Testnet...</span>
          </div>
        ) : !currentFocus ? (
          <div className="well p-10 text-center text-xs text-muted">
            No on-chain user found at this address.
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center w-full">
            {/* Upline Node (Visible if navigated below root) */}
            {uplineUser && (
              <div className="flex flex-col items-center mb-1">
                <button
                  type="button"
                  onClick={handleGoToPrevious}
                  title="Click to go back to this upline user"
                  className="well px-4 py-2 rounded-2xl border border-white/[0.1] hover:border-neon/50 bg-panel-2/70 hover:bg-panel-2 transition flex items-center gap-3 cursor-pointer group"
                >
                  <div className="size-7 rounded-xl bg-white/[0.08] group-hover:bg-neon/20 flex items-center justify-center text-muted group-hover:text-neon">
                    <ArrowUp2 size={15} color="currentColor" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-wider text-muted group-hover:text-neon-soft">
                      Upline User (Click to Go Back)
                    </div>
                    <div className="text-xs font-semibold text-text">
                      {shortAddr(uplineUser.address)}
                    </div>
                  </div>
                </button>

                <div className="w-0.5 h-6 bg-white/20" />
              </div>
            )}

            {/* Current Focused User (Parent Node) */}
            <div className="relative flex flex-col items-center z-10">
              <div className="w-72 sm:w-80 rounded-2xl p-4 bg-gradient-to-b from-[#1b221d] to-[#121613] border-2 border-neon shadow-[0_0_24px_rgba(31,224,58,0.25)] flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-xl bg-neon/20 flex items-center justify-center text-neon font-bold text-xs">
                      {currentFocus.rank.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-text flex items-center gap-1.5">
                        <span>{shortAddr(currentFocus.address)}</span>
                        <button
                          type="button"
                          onClick={() => copyAddr(currentFocus.address)}
                          className="text-muted hover:text-text cursor-pointer"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                      <div className="text-[10px] text-muted">
                        Sponsor: {shortAddr(currentFocus.sponsor)}
                      </div>
                    </div>
                  </div>
                  <Pill tone="gold">{currentFocus.rank}</Pill>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="well p-2">
                    <div className="text-[10px] text-muted">Personal Active</div>
                    <div className="font-semibold text-text">{usd(currentFocus.totalInvestment)}</div>
                  </div>
                  <div className="well p-2">
                    <div className="text-[10px] text-muted">Team Volume</div>
                    <div className="font-semibold text-neon-soft">{usd(currentFocus.teamVolume)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                  <span>Direct Partners: <strong className="text-text">{currentFocus.directCount}</strong></span>
                  {currentFocus.boosterActive && (
                    <span className="text-gold font-medium">Booster Tier {currentFocus.boosterTier}</span>
                  )}
                </div>
              </div>

              {/* Trunk line going down to children */}
              {currentFocus.directs.length > 0 && <div className="w-0.5 h-8 bg-neon/50" />}
            </div>

            {/* Direct Children Row */}
            {currentFocus.directs.length > 0 ? (
              <div className="w-full overflow-x-auto pb-6 pt-2">
                <div className="flex justify-center items-start gap-4 min-w-max px-4">
                  {currentFocus.directs.map((direct) => (
                    <div key={direct.address} className="flex flex-col items-center">
                      <div className="w-64 rounded-2xl p-3.5 bg-panel-2 border border-white/[0.08] hover:border-neon/40 transition flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-text">{shortAddr(direct.address)}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-muted">
                            {direct.rank}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                          <div className="well p-1.5">
                            <span className="text-muted block text-[9px]">Deposit</span>
                            <span className="font-semibold text-text">{usd(direct.totalInvestment)}</span>
                          </div>
                          <div className="well p-1.5">
                            <span className="text-muted block text-[9px]">Team</span>
                            <span className="font-semibold text-neon-soft">{usd(direct.teamVolume)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleViewMore(direct)}
                          className="btn btn-secondary w-full py-1.5 text-xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Explore Branch</span>
                          <ArrowRight2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 well p-6 text-center max-w-md w-full">
                <div className="size-10 rounded-full bg-white/[0.05] flex items-center justify-center mx-auto mb-2 text-muted">
                  <Hierarchy size={20} />
                </div>
                <div className="text-xs font-semibold text-text mb-1">No Direct Downlines on Chain</div>
                <div className="text-[11px] text-muted mb-3 font-light">
                  This wallet has 0 direct partners registered under it on BSC Testnet. Share your referral link to build your multi-level network!
                </div>
                {account && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(`${window.location.origin}/?ref=${account}`);
                      toast.show("Referral link copied!");
                    }}
                    className="btn btn-primary text-xs py-2 px-4 mx-auto"
                  >
                    Copy Referral Link
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* User Details Modal */}
      <AnimatePresence>
        {modalUser && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg rounded-3xl bg-[#14161a] p-6 border border-white/[0.1] shadow-2xl flex flex-col gap-4 text-text"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <Wallet3 size={20} className="text-neon" />
                  <h3 className="text-base font-semibold text-text">On-Chain User Profile</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalUser(null)}
                  className="text-muted hover:text-text cursor-pointer"
                >
                  <CloseCircle size={20} />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="well p-3 flex justify-between items-center">
                  <span className="text-muted">Wallet Address:</span>
                  <div className="flex items-center gap-1 font-mono font-medium text-text">
                    <span>{modalUser.address}</span>
                    <button
                      type="button"
                      onClick={() => copyAddr(modalUser.address)}
                      className="text-muted hover:text-text cursor-pointer"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div className="well p-3 flex justify-between">
                  <span className="text-muted">Sponsor (Upline):</span>
                  <span className="font-mono text-text">{shortAddr(modalUser.sponsor)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="well p-3">
                    <span className="text-muted block">Personal Active Deposit</span>
                    <span className="text-base font-bold text-text">{usd(modalUser.totalInvestment)}</span>
                  </div>
                  <div className="well p-3">
                    <span className="text-muted block">Team Volume</span>
                    <span className="text-base font-bold text-neon-soft">{usd(modalUser.teamVolume)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="well p-2.5">
                    <span className="text-muted block text-[10px]">Rank</span>
                    <span className="font-semibold text-gold">{modalUser.rank}</span>
                  </div>
                  <div className="well p-2.5">
                    <span className="text-muted block text-[10px]">Direct Partners</span>
                    <span className="font-semibold text-text">{modalUser.directCount}</span>
                  </div>
                  <div className="well p-2.5">
                    <span className="text-muted block text-[10px]">Booster Tier</span>
                    <span className="font-semibold text-text">{modalUser.boosterTier}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalUser(null)}
                className="btn btn-secondary w-full py-2.5 text-xs cursor-pointer"
              >
                Close Details
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
