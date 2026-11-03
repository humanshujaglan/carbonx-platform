import { AuthPage } from "@/components/auth-page";

export const metadata = {
  title: "Register | CarbonX",
  description: "Create your CarbonX account with your first investment package.",
};

export default function RegisterPage() {
  return <AuthPage initialView="register_form" />;
}
