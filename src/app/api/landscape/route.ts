import { NextResponse } from "next/server";
import {
  queryOverview,
  queryDailyActivity,
  querySizeDistribution,
  queryConcentration,
  queryFrequencyDistribution,
  queryMarketBreadth,
  queryBuySellStats,
} from "@/lib/db-queries";

export const dynamic = "force-dynamic";

// In-memory cache (5 minutes — DB queries are fast but no need to re-run every request)
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { data: unknown; timestamp: number } | null = null;

function buildResponse() {
  const overview = queryOverview();
  const dailyActivity = queryDailyActivity();
  const sizeDistribution = querySizeDistribution();
  const concentration = queryConcentration();
  const frequencyDistribution = queryFrequencyDistribution();
  const marketBreadth = queryMarketBreadth();
  const buySell = queryBuySellStats();

  return {
    overview,
    dailyActivity,
    sizeDistribution,
    concentration,
    frequencyDistribution,
    marketBreadth,
    buySell,
    meta: {
      dataSource: "SQLite (full scan)",
      lastSync: overview.lastSync,
      fetchedAt: new Date().toISOString(),
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";

  if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, {
      headers: { "X-Cache": "HIT" },
    });
  }

  try {
    const data = buildResponse();
    cache = { data, timestamp: Date.now() };
    return NextResponse.json(data, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("Landscape API error:", error);
    if (cache) {
      return NextResponse.json(cache.data, {
        headers: { "X-Cache": "STALE" },
      });
    }
    return NextResponse.json(
      { error: "Failed to query data" },
      { status: 500 }
    );
  }
}
