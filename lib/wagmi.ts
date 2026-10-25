import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  binanceWallet,
  trustWallet,
  rabbyWallet,
  okxWallet,
  safepalWallet,
  coinbaseWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { bsc, bscTestnet, anvil } from "wagmi/chains";
import { chain, rpcUrl } from "./config";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "3a8170812b534d0ff9d794f19a901d64";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular Extensions",
      wallets: [
        injectedWallet,
        metaMaskWallet,
        binanceWallet,
        trustWallet,
        rabbyWallet,
        okxWallet,
        safepalWallet,
        coinbaseWallet,
        rainbowWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    appName: "CarbonX Platform",
    projectId,
  }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: chain.id === bsc.id ? [bsc, bscTestnet, anvil] : [bscTestnet, bsc, anvil],
  // The active chain (NEXT_PUBLIC_CHAIN_ID) uses NEXT_PUBLIC_RPC_URL; the others use public defaults.
  transports: {
    [bscTestnet.id]: http(
      chain.id === bscTestnet.id ? rpcUrl : "https://data-seed-prebsc-1-s1.bnbchain.org:8545"
    ),
    [bsc.id]: http(chain.id === bsc.id ? rpcUrl : "https://bsc-dataseed.binance.org/"),
    [anvil.id]: http(chain.id === anvil.id ? rpcUrl : "http://127.0.0.1:8545"),
  },
  ssr: true,
});
