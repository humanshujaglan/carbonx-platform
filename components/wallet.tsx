"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type Abi,
  type Address,
  type Hash,
  type WriteContractParameters,
  getAddress,
} from "viem";
import {
  WagmiProvider,
  useAccount,
  useChainId,
  useSwitchChain,
  useWalletClient,
  useDisconnect,
} from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  darkTheme,
  useConnectModal,
  useAccountModal,
  useChainModal,
} from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmi";
import { chain } from "@/lib/config";
import { publicClient } from "@/lib/platform";

export type WalletState = {
  account: Address | undefined;
  wrongNetwork: boolean;
  hasWallet: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  openAccountModal?: () => void;
  openChainModal?: () => void;
  /** Sends a contract call from the connected wallet and waits until it is mined */
  write: (request: WriteRequest) => Promise<Hash>;
};

export type WriteRequest = {
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
};

const WalletContext = createContext<WalletState | null>(null);

function InnerWalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();
  const { disconnect } = useDisconnect();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const account: Address | undefined =
    mounted && isConnected && address ? getAddress(address) : undefined;

  const wrongNetwork = !!account && currentChainId !== chain.id;

  const connect = useCallback(async () => {
    if (openConnectModal) {
      openConnectModal();
    }
  }, [openConnectModal]);

  const switchNetwork = useCallback(async () => {
    if (openChainModal) {
      openChainModal();
      return;
    }
    if (switchChainAsync) {
      await switchChainAsync({ chainId: chain.id });
    }
  }, [openChainModal, switchChainAsync]);

  const write = useCallback<WalletState["write"]>(
    async (request) => {
      if (!account) {
        if (openConnectModal) openConnectModal();
        throw new Error("Connect your wallet first.");
      }
      if (currentChainId !== chain.id) {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: chain.id });
        } else if (openChainModal) {
          openChainModal();
          throw new Error(`Please switch to ${chain.name} in your wallet.`);
        }
      }

      if (!walletClient) {
        throw new Error("Wallet client not ready. Please re-connect your wallet.");
      }

      const call = { ...request, account, chain } as WriteContractParameters;

      // Simulate first to catch revert reasons early
      const pending = { ...call, blockTag: "pending" } as Parameters<
        typeof publicClient.simulateContract
      >[0];
      await publicClient.simulateContract(pending);

      // Gas estimate with 25% headroom for state shifts
      const estimate = await publicClient.estimateContractGas(
        pending as Parameters<typeof publicClient.estimateContractGas>[0]
      );

      const hash = await walletClient.writeContract({
        ...call,
        gas: (estimate * 125n) / 100n,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        throw new Error("Transaction failed on chain. Please try again.");
      }
      return hash;
    },
    [account, currentChainId, walletClient, switchChainAsync, openChainModal, openConnectModal]
  );

  const value: WalletState = {
    account,
    wrongNetwork,
    hasWallet: true,
    connect,
    disconnect: () => disconnect(),
    switchNetwork,
    openAccountModal,
    openChainModal,
    write,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#1fe03a",
            accentColorForeground: "#0a0d0b",
            borderRadius: "medium",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          <InnerWalletProvider>{children}</InnerWalletProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
