import "./globals.css";
import Providers from "@/context/Providers";
import { AppLayout } from "@/components/layout/app-layout";

export const metadata = {
  title: "SmartSupply AI — Autonomous Supply Chain & CRM OS",
  description: "Next-generation multi-tenant supply chain, inventory, CRM and autonomous AI agents",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen selection:bg-indigo-600 selection:text-white">
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}