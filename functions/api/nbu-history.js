// Проксі до архіву курсів НБУ: діапазонний ендпоїнт НБУ не віддає CORS-заголовків, тож браузер не може звернутись напряму.
// Повертає останні ~13 місяців офіційного курсу однієї валюти: { code, pts: [[unixMs, rate], ...] }.

const UPSTREAM = "https://bank.gov.ua/NBU_Exchange/exchange_site";
const CODES = new Set(["USD", "EUR", "GBP", "PLN", "CHF", "CZK", "CAD"]);
const TTL_FRESH = 3 * 60 * 60;
const TTL_LAST = 24 * 60 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function json(body, status, maxAge) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": maxAge ? `public, max-age=${maxAge}` : "no-store"
    }
  });
}

const ymd = (d) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;

export async function onRequestGet({ request }) {
  const code = String(new URL(request.url).searchParams.get("code") || "").toUpperCase();
  if (!CODES.has(code)) return json({ error: "bad_code" }, 400, 0);

  const cache = caches.default;
  const freshKey = new Request(`https://cache.internal/nbu-history/${code}/fresh`);
  const lastKey = new Request(`https://cache.internal/nbu-history/${code}/last`);

  const hit = await cache.match(freshKey);
  if (hit) return hit;

  try {
    const now = Date.now();
    const url =
      `${UPSTREAM}?start=${ymd(new Date(now - 395 * DAY_MS))}&end=${ymd(new Date(now))}` +
      `&valcode=${code.toLowerCase()}&sort=exchangedate&order=asc&json`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const rows = await res.json();
    const pts = (Array.isArray(rows) ? rows : [])
      .map((r) => {
        const [d, m, y] = String(r?.exchangedate || "").split(".").map(Number);
        const rate = Number(r?.rate_per_unit ?? r?.rate);
        return [Date.UTC(y, (m || 1) - 1, d || 1), rate];
      })
      .filter((p) => Number.isFinite(p[0]) && p[1] > 0);
    if (pts.length < 2) throw new Error("empty");

    const body = { code, pts };
    await cache.put(freshKey, json(body, 200, TTL_FRESH));
    await cache.put(lastKey, json(body, 200, TTL_LAST));
    return json(body, 200, 600);
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
