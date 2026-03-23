import { NextResponse } from "next/server";
import {
  fetchAllLeaderboardWallets,
  fetchUserTrades,
  classifyWallets,
  type Trade,
} from "@/lib/polymarket";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Step 1: Fetch all leaderboard wallets
    const wallets = await fetchAllLeaderboardWallets();

    // Step 2: Fetch trades for a sample of wallets (rate limit: 60/min)
    // We sample to avoid hitting rate limits
    const sampleSize = Math.min(wallets.length, 50);
    const sampledWallets = wallets.slice(0, sampleSize);

    const tradesByWallet = new Map<string, Trade[]>();

    for (const wallet of sampledWallets) {
      try {
        const trades = await fetchUserTrades(wallet.proxyWallet, 200);
        tradesByWallet.set(wallet.proxyWallet, trades);
        // Small delay to respect rate limits
        await new Promise((r) => setTimeout(r, 100));
      } catch {
        tradesByWallet.set(wallet.proxyWallet, []);
      }
    }

    // Step 3: Classify wallets
    const stats = classifyWallets(sampledWallets, tradesByWallet);

    return NextResponse.json({
      ...stats,
      sampleSize,
      totalLeaderboardWallets: wallets.length,
    });
  } catch (error) {
    console.error("Failed to fetch wallet stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet data" },
      { status: 500 }
    );
  }
}
