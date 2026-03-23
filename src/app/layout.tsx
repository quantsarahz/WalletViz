import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WalletViz - Polymarket Wallet Analytics",
  description: "Visual analytics dashboard for Polymarket wallet data",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
