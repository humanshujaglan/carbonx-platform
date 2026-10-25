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
  chains: [bscTestnet, bsc, anvil],
  transports: {
    [bscTestnet.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL ||
        "https://data-seed-prebsc-1-s1.bnbchain.org:8545"
    ),
    [bsc.id]: http("https://bsc-dataseed.binance.org/"),
    [anvil.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});
