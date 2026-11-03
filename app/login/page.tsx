import { AuthPage } from "@/components/auth-page";

export const metadata = {
  title: "Login | CarbonX",
  description: "Connect your wallet to open your CarbonX dashboard.",
};

export default function LoginPage() {
  return <AuthPage initialView="starter" />;
}
