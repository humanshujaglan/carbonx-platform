"use client";

import { useEffect, useState, useCallback } from "react";
import { type Address, isAddress, getAddress } from "viem";
import { motion, AnimatePresence } from "framer-motion";
import {
  Profile2User,
  ArrowLeft,
  ArrowUp2,
  CloseCircle,
  Copy,
  Hierarchy,
  InfoCircle,
  SearchNormal1,
  TickCircle,
  Wallet3,
} from "iconsax-react";
import { rankLabel, shortAddr, usd } from "@/lib/format";
import { platformAbi } from "@/lib/abi";
import { viewAddress, platformAddress } from "@/lib/config";
import { publicClient, formatLeaderCode, type PlatformAddresses, type PlatformUser } from "@/lib/platform";
import { Pill, Spinner, useToast } from "./ui";
import { useWallet } from "./wallet";

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

export type TeamView = "tree" | "list";

const MAX_LEVEL = 20;
// The Top ID's deep match reaches level 50.
const TOP_ID_MAX_LEVEL = 50;
const MAX_ROWS = 200;

export function StructureView({
  user,
  addresses,
  onDone,
  view,
}: {
  user?: PlatformUser;
  addresses?: PlatformAddresses;
  onDone: () => void;
  view: TeamView;
}) {
  const { account } = useWallet();
  const toast = useToast();

  const topIdRoot = addresses?.topId && addresses.topId !== "0x0000000000000000000000000000000000000000" ? addresses.topId : undefined;
  const defaultRoot = account ?? topIdRoot ?? ("0x0000000000000000000000000000000000000000" as Address);
  const [activeRoot, setActiveRoot] = useState<Address>(defaultRoot);
  const [searchInput, setSearchInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [rootNode, setRootNode] = useState<DetailedUserNode | null>(null);

  // History path to navigate down and up the tree hierarchy
  // Previously viewed roots, so "Back" can return to them
  const [rootHistory, setRootHistory] = useState<Address[]>([]);
  const [navPath, setNavPath] = useState<DetailedUserNode[]>([]);

  // Level inspected in list view
  const maxLevel = user?.isTopId ? TOP_ID_MAX_LEVEL : MAX_LEVEL;
  const [level, setLevel] = useState<number>(1);
  const [levelInput, setLevelInput] = useState<string>("1");
  const [levelNodes, setLevelNodes] = useState<DetailedUserNode[]>([]);
  const [levelLoading, setLevelLoading] = useState<boolean>(false);

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
      const rankName = rankLabel(rankIdx);

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
        leaderCode: leaderCode > 0n ? `#${formatLeaderCode(leaderCode).toString()}` : undefined,
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
        rank: rankLabel(0),
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

  // List view: members exactly `level` levels below the focused user
  useEffect(() => {
    if (view !== "list" || !currentFocus) return;
    if (level === 1) {
      setLevelNodes(currentFocus.directs);
      return;
    }
    let cancelled = false;
    setLevelLoading(true);
    (async () => {
      try {
        let addrs: Address[] = currentFocus.directs.map((d) => d.address);
        for (let l = 2; l <= level && addrs.length > 0; l++) {
          const next = await Promise.all(
            addrs.map((a) =>
              publicClient
                .readContract({ address: viewAddress, abi: platformAbi, functionName: "getDirectDownlines", args: [a] })
                .catch(() => [] as Address[])
            )
          );
          addrs = (next as Address[][]).flat();
        }
        const nodes = await Promise.all(addrs.slice(0, MAX_ROWS).map((a) => fetchNode(a, "power", 1)));
        if (!cancelled) setLevelNodes(nodes);
      } catch {
        if (!cancelled) setLevelNodes([]);
      } finally {
        if (!cancelled) setLevelLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [view, level, currentFocus, fetchNode]);

  function applyLevel(raw: string) {
    setLevelInput(raw);
    const n = Math.floor(Number(raw));
    if (Number.isFinite(n) && n >= 1) setLevel(Math.min(n, maxLevel));
  }
  const uplineUser = navPath.length > 1 ? navPath[navPath.length - 2] : null;

  function changeRoot(addr: Address) {
    if (addr === activeRoot) return;
    setRootHistory((prev) => [...prev, activeRoot]);
    setActiveRoot(addr);
  }

  function goBackRoot() {
    const prev = rootHistory[rootHistory.length - 1];
    if (!prev) return;
    setRootHistory((h) => h.slice(0, -1));
    setActiveRoot(prev);
  }

  function handleGoToPrevious() {
    if (navPath.length > 1) {
      setNavPath((prev) => prev.slice(0, prev.length - 1));
    }
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
      changeRoot(getAddress(q));
      setSearchInput("");
    } else {
      toast.show("Please enter a valid BSC address (0x...)");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Network tree: search any wallet and see its numbers */}
      <section className="card p-5 sm:p-6 flex flex-col gap-5" aria-label="Structure summary">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-text">Network tree</h3>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search a wallet address (0x...)"
              className="w-full rounded-xl border border-white/10 bg-[#14171d] py-3 pl-10 pr-4 text-xs text-white outline-none placeholder:text-muted/60 focus:border-[#22c55e]"
            />
            <SearchNormal1 size={16} className="absolute left-3.5 top-3.5 text-muted" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="btn btn-primary !rounded-lg px-4 py-2 text-xs font-semibold">
              Search
            </button>
            {account && activeRoot !== account && (
              <button
                type="button"
                onClick={() => changeRoot(account)}
                className="btn btn-secondary !rounded-lg px-4 py-2 text-xs font-semibold"
              >
                My wallet
              </button>
            )}
          </div>
        </form>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-white/[0.06] pt-4">
          {(
            [
              ["Deposit", currentFocus ? usd(currentFocus.totalInvestment) : "—"],
              ["Directs", `${currentFocus?.directCount ?? 0}`],
              ["Team business", currentFocus ? usd(currentFocus.teamVolume) : "—"],
              ["Rank", `${currentFocus?.rank ?? "Member"}`],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-0.5 text-base text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Visual Downline Tree Canvas */}
      <section className="card p-5 sm:p-6" aria-label="Visual downline tree">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {rootHistory.length > 0 && (
              <button
                type="button"
                onClick={goBackRoot}
                aria-label="Back"
                className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/[0.08] bg-panel text-white transition hover:border-white/20"
              >
                <ArrowLeft size={18} color="currentColor" />
              </button>
            )}
            <h3 className="text-sm font-medium text-text">Downline Team</h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted">
            <span>Selected ID:</span>
            <strong className="text-neon-soft">{currentFocus ? shortAddr(currentFocus.address) : "—"}</strong>
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <Spinner />
            <span className="text-xs text-muted">Reading on-chain network hierarchy from BSC Testnet...</span>
          </div>
        ) : !currentFocus ? (
          <div className="well p-10 text-center text-xs text-muted">
            No on-chain user found at this address.
          </div>
        ) : view === "list" ? (
          <div className="mt-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-muted">
                Level
                <input
                  type="number"
                  min={1}
                  max={maxLevel}
                  value={levelInput}
                  onChange={(e) => applyLevel(e.target.value)}
                  onBlur={() => setLevelInput(String(level))}
                  className="w-20 rounded-lg border border-white/10 bg-[#14171d] px-3 py-1.5 text-xs text-white outline-none focus:border-[#22c55e]"
                />
              </label>
              <span className="text-xs text-muted">
                {levelLoading ? "Loading…" : `${levelNodes.length} member${levelNodes.length === 1 ? "" : "s"}`}
                {levelNodes.length >= MAX_ROWS && ` (first ${MAX_ROWS})`}
              </span>
            </div>

            {levelLoading ? (
              <div className="flex justify-center p-10">
                <Spinner />
              </div>
            ) : levelNodes.length === 0 ? (
              <div className="well p-8 text-center text-xs text-muted">No members at level {level}.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-max border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-muted">
                      {["#", "Address", "Sponsor", "Rank", "Deposit", "Team business", "Directs", "Booster", "Leader code", ""].map(
                        (h, i) => (
                          <th key={h + i} className="whitespace-nowrap px-3 py-2 font-normal">
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {levelNodes.map((n, idx) => (
                      <tr
                        key={n.address}
                        onClick={() => changeRoot(n.address)}
                        className="cursor-pointer border-b border-white/[0.05] text-white transition hover:bg-white/[0.03]"
                      >
                        <td className="px-3 py-2.5 text-muted">{idx + 1}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5">
                            {shortAddr(n.address)}
                            <button
                              type="button"
                              aria-label="Copy address"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyAddr(n.address);
                              }}
                              className="cursor-pointer text-muted transition hover:text-neon"
                            >
                              <Copy size={13} />
                            </button>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">{shortAddr(n.sponsor)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-neon-soft">{n.rank}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{usd(n.totalInvestment)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{usd(n.teamVolume)}</td>
                        <td className="px-3 py-2.5">{n.directCount}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{n.boosterActive ? `Tier ${n.boosterTier}` : "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">{n.leaderCode ?? "—"}</td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalUser(n);
                            }}
                            className="btn btn-primary !rounded-lg px-3 py-1 text-xs font-semibold cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center w-full">
            {/* Upline Node (Visible if navigated below root) */}
            {uplineUser && (
              <div className="mb-1 flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleGoToPrevious}
                  title="Go back to this upline"
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/[0.08] bg-panel-2 px-4 py-2.5 text-left transition hover:border-white/20"
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-white/[0.06] text-muted">
                    <ArrowUp2 size={15} color="currentColor" />
                  </span>
                  <span>
                    <span className="block text-xs text-muted">Upline</span>
                    <span className="block text-sm text-white">{shortAddr(uplineUser.address)}</span>
                  </span>
                </button>
                <div className="h-6 w-px bg-white/20" />
              </div>
            )}

            {/* Current Focused User (Parent Node) */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex w-36 flex-col items-center gap-2 rounded-2xl border border-[#22c55e] bg-panel-2 px-4 py-4 shadow-[0_0_18px_rgba(34,197,94,0.18)]">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-neon/10 text-neon">
                  <Profile2User size={26} color="currentColor" variant="Bulk" />
                </span>
                <span className="text-sm text-white">{shortAddr(currentFocus.address)}</span>
                <button
                  type="button"
                  onClick={() => setModalUser(currentFocus)}
                  className="btn btn-primary !rounded-lg w-full px-3 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  View
                </button>
              </div>

              {/* Trunk line going down to children */}
              {currentFocus.directs.length > 0 && <div className="h-8 w-px bg-[#22c55e]/60" />}
            </div>

            {/* Direct Children Row */}
            {currentFocus.directs.length > 0 ? (
              <div className="w-full overflow-x-auto pb-6 pt-2">
                <div className="flex min-w-max items-start justify-center gap-3 px-4">
                  {currentFocus.directs.map((direct) => (
                    <div
                      key={direct.address}
                      role="button"
                      tabIndex={0}
                      onClick={() => changeRoot(direct.address)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") changeRoot(direct.address);
                      }}
                      className="flex w-32 cursor-pointer flex-col items-center gap-2 rounded-2xl border border-white/[0.08] bg-panel-2 px-3 py-3.5 transition hover:border-white/20 active:scale-[0.98]"
                    >
                      <span className="flex size-10 items-center justify-center rounded-2xl bg-white/[0.06] text-neon">
                        <Profile2User size={22} color="currentColor" variant="Bulk" />
                      </span>
                      <span className="text-sm text-white">{shortAddr(direct.address)}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalUser(direct);
                        }}
                        className="btn btn-primary !rounded-lg w-full px-3 py-1.5 text-xs font-semibold cursor-pointer"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex w-full max-w-md flex-col items-center gap-3 text-center">
                <p className="text-xs text-muted">No direct members under this wallet yet.</p>
                {account && (
                  <button
                    type="button"
                    onClick={() => {
                      const displayLeaderCode = formatLeaderCode(user?.leaderCode);
                      const leaderParam = displayLeaderCode > 0n ? `&leader=${displayLeaderCode.toString()}` : "";
                      navigator.clipboard?.writeText(`${window.location.origin}/register?ref=${account}${leaderParam}`);
                      toast.show("Referral link copied!");
                    }}
                    className="btn btn-primary !rounded-lg px-4 py-2 text-xs font-semibold"
                  >
                    Copy referral link
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
                  <div className="flex items-center gap-1 font-medium text-text">
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
                  <span className="text-text">{shortAddr(modalUser.sponsor)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="well p-3">
                    <span className="text-muted block">Personal Active Deposit</span>
                    <span className="text-base font-semibold text-text">{usd(modalUser.totalInvestment)}</span>
                  </div>
                  <div className="well p-3">
                    <span className="text-muted block">Team Volume</span>
                    <span className="text-base font-semibold text-neon-soft">{usd(modalUser.teamVolume)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="well p-2.5">
                    <span className="text-muted block text-2xs">Rank</span>
                    <span className="font-semibold text-gold">{modalUser.rank}</span>
                  </div>
                  <div className="well p-2.5">
                    <span className="text-muted block text-2xs">Direct Partners</span>
                    <span className="font-semibold text-text">{modalUser.directCount}</span>
                  </div>
                  <div className="well p-2.5">
                    <span className="text-muted block text-2xs">Booster Tier</span>
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
