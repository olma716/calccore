// Проксі до Minfin API: ключ лишається на сервері (env.MINFIN_API_KEY), клієнт отримує нормалізований JSON.
// Кеш 30 хв (економимо ліміт запитів) + "останній вдалий" на 24 год на випадок збою або вичерпаного ліміту.

const UPSTREAM = { avg: "summary", mb: "mb" };
const TTL_FRESH = 30 * 60;
const TTL_LAST = 24 * 60 * 60;

const kyivFmt = new Intl.DateTimeFormat("uk-UA", {
  timeZone: "Europe/Kyiv",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

// Причина без чутливих даних: лише код відповіді джерела або "empty"/"fetch_error".
// 5xx не віддаємо — Cloudflare підміняє їх власною сторінкою "error code: 502", і причини не видно.
function safeReason(err) {
  const m = String((err && err.message) || "");
  return /^upstream \d{3}$/.test(m) || m === "empty" ? m : "fetch_error";
}

function json(body, status, maxAge) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": maxAge ? `public, max-age=${maxAge}` : "no-store"
    }
  });
}

function positive(v) {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : null;
}

// summary: { usd: { bid, ask }, ... } — середній курс банків; bid = банк купує, ask = банк продає
function normalizeAvg(data) {
  const rates = {};
  for (const [cur, v] of Object.entries(data || {})) {
    const buy = positive(v?.bid);
    const sell = positive(v?.ask);
    if (buy && sell) rates[cur.toUpperCase()] = { buy, sell };
  }
  return { rates, updatedText: kyivFmt.format(new Date()) };
}

// mb: [{ pointDate, bid, ask, currency }, ...] — береться найсвіжіша точка по кожній валюті
function normalizeMb(data) {
  const latest = {};
  for (const row of Array.isArray(data) ? data : []) {
    const cur = String(row?.currency || "").toUpperCase();
    if (!cur) continue;
    if (!latest[cur] || String(row.pointDate) > String(latest[cur].pointDate)) latest[cur] = row;
  }

  const rates = {};
  let newest = "";
  for (const [cur, row] of Object.entries(latest)) {
    const buy = positive(row.bid);
    const sell = positive(row.ask);
    if (buy && sell) {
      rates[cur] = { buy, sell };
      if (String(row.pointDate) > newest) newest = String(row.pointDate);
    }
  }

  // "2026-10-14 10:45:03" -> "14.10, 10:45"
  const m = newest.match(/^\d{4}-(\d{2})-(\d{2}) (\d{2}:\d{2})/);
  return { rates, updatedText: m ? `${m[2]}.${m[1]}, ${m[3]}` : "" };
}

export async function onRequestGet({ request, env }) {
  const type = new URL(request.url).searchParams.get("type");
  const endpoint = UPSTREAM[type];
  if (!endpoint) return json({ error: "bad_type" }, 400, 0);

  const apiKey = env.MINFIN_API_KEY;
  if (!apiKey) return json({ error: "not_configured" }, 424, 0);

  const cache = caches.default;
  const freshKey = new Request(`https://cache.internal/minfin/${type}/fresh`);
  const lastKey = new Request(`https://cache.internal/minfin/${type}/last`);

  const hit = await cache.match(freshKey);
  if (hit) return hit;

  try {
    const res = await fetch(`https://api.minfin.com.ua/${endpoint}/${apiKey}/`, {
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const data = await res.json();
    const body = type === "avg" ? normalizeAvg(data) : normalizeMb(data);
    if (!Object.keys(body.rates).length) throw new Error("empty");

    await cache.put(freshKey, json(body, 200, TTL_FRESH));
    await cache.put(lastKey, json(body, 200, TTL_LAST));
    return json(body, 200, 300);
  } catch (err) {
    const last = await cache.match(lastKey);
    if (last) {
      const stale = new Response(last.body, last);
      stale.headers.set("Cache-Control", "no-store");
      stale.headers.set("X-Stale", "1");
      return stale;
    }
    return json({ error: "upstream", reason: safeReason(err) }, 424, 0);
  }
}
