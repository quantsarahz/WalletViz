const DATA_API = "https://data-api.polymarket.com";

export interface LeaderboardEntry {
  rank: number;
  proxyWallet: string;
  userName: string;
  vol: number;
  pnl: number;
  profileImage: string;
}

export interface Trade {
  proxyWallet: string;
  side: "BUY" | "SELL";
  size: string;
  price: string;
  timestamp: string;
  title: string;
}

export interface WalletStats {
  totalWallets: number;
  inactiveWallets: number;
  botWallets: number;
  activeWallets: number;
  fetchedAt: string;
}

/**
 * Fetch leaderboard data with pagination.
 * Max offset=1000, max limit=50 per request.
 */
export async function fetchLeaderboard(
  timePeriod: "DAY" | "WEEK" | "MONTH" | "ALL" = "ALL",
  limit = 50,
  offset = 0
): Promise<LeaderboardEntry[]> {
  const url = `${DATA_API}/v1/leaderboard?timePeriod=${timePeriod}&limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Leaderboard API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch all available leaderboard entries (up to offset 1000).
 */
export async function fetchAllLeaderboardWallets(): Promise<LeaderboardEntry[]> {
  const allEntries: LeaderboardEntry[] = [];
  const batchSize = 50;

  for (let offset = 0; offset <= 1000; offset += batchSize) {
    const batch = await fetchLeaderboard("ALL", batchSize, offset);
    if (batch.length === 0) break;
    allEntries.push(...batch);
  }

  return allEntries;
}

/**
 * Fetch recent trades for a specific wallet.
 */
export async function fetchUserTrades(
  walletAddress: string,
  limit = 100
): Promise<Trade[]> {
  const url = `${DATA_API}/trades?user=${walletAddress}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Trades API error: ${res.status}`);
  return res.json();
}

/**
 * Analyze wallets: classify into inactive, bot, and active.
 * - Inactive: no trades in the last 30 days
 * - Bot: more than 100 trades per day on average
 * - Active: everyone else
 */
export function classifyWallets(
  wallets: LeaderboardEntry[],
  tradesByWallet: Map<string, Trade[]>
): WalletStats {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  let inactiveCount = 0;
  let botCount = 0;

  for (const wallet of wallets) {
    const trades = tradesByWallet.get(wallet.proxyWallet) || [];

    if (trades.length === 0) {
      inactiveCount++;
      continue;
    }

    const recentTrades = trades.filter(
      (t) => new Date(t.timestamp).getTime() > thirtyDaysAgo
    );

    if (recentTrades.length === 0) {
      inactiveCount++;
      continue;
    }

    // Calculate average daily trades
    const timestamps = recentTrades.map((t) =>
      new Date(t.timestamp).getTime()
    );
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const daySpan = Math.max((maxTime - minTime) / (24 * 60 * 60 * 1000), 1);
    const avgDailyTrades = recentTrades.length / daySpan;

    if (avgDailyTrades > 100) {
      botCount++;
    }
  }

  return {
    totalWallets: wallets.length,
    inactiveWallets: inactiveCount,
    botWallets: botCount,
    activeWallets: wallets.length - inactiveCount - botCount,
    fetchedAt: new Date().toISOString(),
  };
}
