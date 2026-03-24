import { NextResponse } from "next/server";
import {
  querySnapshotOverview,
  querySizeDistribution,
  queryConcentration,
  queryFrequencyDistribution,
  queryMarketBreadth,
  queryBuySellStats,
} from "@/lib/db-queries";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { data: unknown; timestamp: number } | null = null;

function buildResponse() {
  return {
    overview: querySnapshotOverview(),
    sizeDistribution: querySizeDistribution(),
    concentration: queryConcentration(),
    frequencyDistribution: queryFrequencyDistribution(),
    marketBreadth: queryMarketBreadth(),
    buySell: queryBuySellStats(),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";

  if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cache.data, { headers: { "X-Cache": "HIT" } });
  }

  try {
    const data = buildResponse();
    cache = { data, timestamp: Date.now() };
    return NextResponse.json(data, { headers: { "X-Cache": "MISS" } });
  } catch (error) {
    console.error("API error:", error);
    if (cache) {
      return NextResponse.json(cache.data, { headers: { "X-Cache": "STALE" } });
    }
    return NextResponse.json({ error: "Failed to query data" }, { status: 500 });
  }
}
