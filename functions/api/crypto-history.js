// Проксі до історії цін CoinGecko (ціна в UAH). Кеш на сервері економить ліміт публічного API,
// а "останній вдалий" результат рятує графік, якщо CoinGecko віддає 429.
// Відповідь: { id, days, pts: [[unixMs, priceUah], ...] } — не більше ~500 точок.

const UPSTREAM = "https://api.coingecko.com/api/v3/coins";
const IDS = new Set([
  "bitcoin", "ethereum", "tether", "binancecoin", "solana", "ripple", "usd-coin", "dogecoin",
  "the-open-network", "tron", "cardano", "litecoin", "avalanche-2", "chainlink", "polkadot", "bitcoin-cash"
]);
// днів -> час життя свіжого кешу (сек)
const FRESH_TTL = { 7: 10 * 60, 30: 30 * 60, 90: 60 * 60, 365: 3 * 60 * 60 };
const TTL_LAST = 24 * 60 * 60;
const MAX_POINTS = 500;

function json(body, status, maxAge) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": maxAge ? `public, max-age=${maxAge}` : "no-store"
    }
  });
}

export async function onRequestGet({ request }) {
  const params = new URL(request.url).searchParams;
  const id = String(params.get("id") || "");
  const days = Number(params.get("days"));
  if (!IDS.has(id)) return json({ error: "bad_id" }, 400, 0);
  if (!FRESH_TTL[days]) return json({ error: "bad_days" }, 400, 0);

  const cache = caches.default;
  const freshKey = new Request(`https://cache.internal/crypto-history/${id}/${days}/fresh`);
  const lastKey = new Request(`https://cache.internal/crypto-history/${id}/${days}/last`);

  const hit = await cache.match(freshKey);
  if (hit) return hit;

  try {
    const res = await fetch(`${UPSTREAM}/${id}/market_chart?vs_currency=uah&days=${days}`, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; CalcCore/1.0; +https://calccore.net)" }
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const data = await res.json();
    let pts = (Array.isArray(data?.prices) ? data.prices : [])
      .map((p) => [Number(p[0]), Number(p[1])])
      .filter((p) => Number.isFinite(p[0]) && p[1] > 0);
    if (pts.length < 2) throw new Error("empty");

    if (pts.length > MAX_POINTS) {
      const step = Math.ceil(pts.length / MAX_POINTS);
      const last = pts[pts.length - 1];
      pts = pts.filter((_, i) => i % step === 0);
      if (pts[pts.length - 1][0] !== last[0]) pts.push(last);
    }

    const body = { id, days, pts };
    await cache.put(freshKey, json(body, 200, FRESH_TTL[days]));
    await cache.put(lastKey, json(body, 200, TTL_LAST));
    return json(body, 200, 120);
  } catch {
    const last = await cache.match(lastKey);
    if (last) {
      const stale = new Response(last.body, last);
      stale.headers.set("Cache-Control", "no-store");
      stale.headers.set("X-Stale", "1");
      return stale;
    }
    return json({ error: "upstream" }, 502, 0);
  }
}
