/* ct-data.js — відлік і таймер: момент події в обраному часовому поясі (Intl), розбиття різниці на дні, години, хвилини, секунди */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  // [ключ, назва UK, назва EN]; «local» — часовий пояс пристрою
  const ZONES = [["local", "Мій часовий пояс", "My time zone"], ["Europe/Kyiv", "Київ", "Kyiv"], ["Europe/London", "Лондон", "London"], ["Europe/Berlin", "Берлін, Париж", "Berlin, Paris"], ["America/New_York", "Нью-Йорк", "New York"], ["America/Los_Angeles", "Лос-Анджелес", "Los Angeles"], ["Asia/Tokyo", "Токіо", "Tokyo"], ["UTC", "UTC", "UTC"]];
  const fmtCache = {};
  // зсув зони відносно UTC (мс) у момент ts: настінний час зони мінус UTC
  function offsetMs(tz, ts) {
    const f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    const p = {}; f.formatToParts(new Date(ts)).forEach((x) => { p[x.type] = x.value; });
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(ts / 1000) * 1000;
  }
  // момент (мс) для настінного часу події (рік, місяць 1–12, день, секунди від півночі) у зоні tz; «local» — часовий пояс пристрою
  function instant(y, mo, d, sec, tz) {
    const h = Math.floor(sec / 3600), mi = Math.floor((sec % 3600) / 60);
    if (!tz || tz === "local") { const t = new Date(2000, mo - 1, d, h, mi, 0); t.setFullYear(y); return t.getTime(); }
    const guess = Date.UTC(2000, mo - 1, d, h, mi, 0), g = new Date(guess); g.setUTCFullYear(y);
    const gt = g.getTime(), o1 = offsetMs(tz, gt - offsetMs(tz, gt)), t1 = gt - o1, o2 = offsetMs(tz, t1);
    return o2 === o1 ? t1 : gt - o2;
  }
  // різниця в мс → знак і складові
  function split(diffMs) {
    const past = diffMs < 0, tot = Math.floor(Math.abs(diffMs) / 1000);
    return { past, tot, d: Math.floor(tot / 86400), h: Math.floor((tot % 86400) / 3600), m: Math.floor((tot % 3600) / 60), s: tot % 60 };
  }
  const p2 = (n) => String(n).padStart(2, "0");
  const hhmmss = (tot) => p2(Math.floor(tot / 3600)) + ":" + p2(Math.floor((tot % 3600) / 60)) + ":" + p2(tot % 60);
  root.Ct = { L, ZONES, offsetMs, instant, split, p2, hhmmss };
})();
