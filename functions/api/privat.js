// Проксі до публічного API ПриватБанку (готівковий курс, coursid=5): API не віддає CORS-заголовків,
// тому браузер не може звертатись до нього напряму. Ключ не потрібен.
// Відповідь: { rates: { USD: { buy, sell }, ... }, updatedText: "14.10, 10:45" }.
// Кеш 15 хв + "останній вдалий" на 24 год на випадок збою.

const UPSTREAM = "https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5";
const TTL_FRESH = 15 * 60;
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

export async function onRequestGet() {
  const cache = caches.default;
  const freshKey = new Request("https://cache.internal/privat/fresh");
  const lastKey = new Request("https://cache.internal/privat/last");

  const hit = await cache.match(freshKey);
  if (hit) return hit;

  try {
    const res = await fetch(UPSTREAM, {
      headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (compatible; CalcCore/1.0; +https://calccore.net)" }
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);

    const rows = await res.json();
    const rates = {};
    for (const r of Array.isArray(rows) ? rows : []) {
      const code = String(r?.ccy || "").toUpperCase();
      const buy = positive(r?.buy);
      const sell = positive(r?.sale);
      // лише курси до гривні; "BTC" та інші нестандартні пари пропускаємо
      if (code && String(r?.base_ccy || "").toUpperCase() === "UAH" && buy && sell && /^[A-Z]{3}$/.test(code)) {
        rates[code] = { buy, sell };
      }
    }
    if (!Object.keys(rates).length) throw new Error("empty");

    const body = { rates, updatedText: kyivFmt.format(new Date()) };
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
