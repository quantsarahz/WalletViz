const DATA_API = "https://data-api.polymarket.com";
const GAMMA_API = "https://gamma-api.polymarket.com";

// --- Types ---

export interface RawTrade {
  proxyWallet: string;
  side: "BUY" | "SELL";
  size: string;
  price: string;
  timestamp: number;
  title: string;
  conditionId: string;
}

// --- Fetchers ---

async function fetchEventIds(
  limit: number,
  offset: number
): Promise<number[]> {
  const url = `${GAMMA_API}/events?limit=${limit}&active=true&closed=false&order=volume&ascending=false&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const events = await res.json();
  return events.map((e: any) => e.id);
}

async function fetchTradesByEvent(
  eventId: number,
  limit = 1000
): Promise<RawTrade[]> {
  const url = `${DATA_API}/trades?eventId=${eventId}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

/**
 * Fetch trades using a tiered sampling strategy for uniform 30-day coverage.
 *
 * - Tier 1 (high volume, offset 0-49): ~1 day span each, captures today's active wallets
 * - Tier 2 (medium volume, offset 100-149): ~5-15 day span each
 * - Tier 3 (low volume, offset 300-349): ~30-75 day span each, fills in older data
 *
 * This avoids the recency bias of only fetching from top events.
 */
export async function fetchTradesTiered(concurrency = 10): Promise<RawTrade[]> {
  const tiers = [
    { offset: 0, count: 50 },   // high volume
    { offset: 100, count: 50 }, // medium volume
    { offset: 300, count: 50 }, // low volume (long time span)
  ];

  // Fetch all event IDs
  const allEventIds: number[] = [];
  for (const tier of tiers) {
    const ids = await fetchEventIds(tier.count, tier.offset);
    allEventIds.push(...ids);
  }

  // Fetch trades in parallel batches
  const allTrades: RawTrade[] = [];
  for (let i = 0; i < allEventIds.length; i += concurrency) {
    const batch = allEventIds.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((eid) => fetchTradesByEvent(eid, 1000).catch(() => []))
    );
    for (const trades of results) {
      allTrades.push(...trades);
    }
  }

  return allTrades;
}
