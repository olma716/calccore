/* ag-data.js — вік: точна різниця дат (роки, місяці, дні), дні народження, різниця у віці, круглі дати; усе в днях за UTC, без літнього часу */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const DAY = 86400000;
  // номер дня (дні від 1970-01-01) за григоріанським календарем, у т. ч. умовно для давніх дат
  const dnOf = (y, m, d) => { const t = new Date(0); t.setUTCFullYear(y, m - 1, d); t.setUTCHours(0, 0, 0, 0); return Math.round(t.getTime() / DAY); };
  const parts = (n) => { const d = new Date(n * DAY); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay() }; };
  function parseISO(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3], n = dnOf(y, mo, d), p = parts(n);
    return p.y === y && p.m === mo && p.d === d ? n : null;
  }
  const iso = (n) => { const p = parts(n); return String(p.y).padStart(4, "0") + "-" + String(p.m).padStart(2, "0") + "-" + String(p.d).padStart(2, "0"); };
  const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dim = (y, m) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  // додати k місяців (k може бути від'ємним) з обмеженням дня кінцем місяця
  function addMonths(n, k) {
    const p = parts(n), tm = p.y * 12 + (p.m - 1) + k, y = Math.floor(tm / 12), m = (tm - y * 12) + 1;
    return dnOf(y, m, Math.min(p.d, dim(y, m)));
  }
  // k-та річниця дати народження; народжені 29 лютого у невисокосний рік — 28 лютого ("feb28") чи 1 березня ("mar1")
  function anniv(b, k, policy) {
    const p = parts(b), y = p.y + k;
    if (p.m === 2 && p.d === 29 && !isLeap(y)) return policy === "mar1" ? dnOf(y, 3, 1) : dnOf(y, 2, 28);
    return dnOf(y, p.m, p.d);
  }
  // різниця b → t (b ≤ t) у роках, місяцях, днях
  function ymd(b, t, policy) {
    let years = parts(t).y - parts(b).y;
    while (years > 0 && anniv(b, years, policy) > t) years--;
    const a = anniv(b, years, policy);
    let months = (parts(t).y - parts(a).y) * 12 + (parts(t).m - parts(a).m);
    while (months > 0 && addMonths(a, months) > t) months--;
    const anchor = addMonths(a, months);
    return { years, months, days: t - anchor, a, anchor };
  }
  // наступний день народження: сьогодні (0 днів), або найближча річниця після t
  function nextBirthday(b, t, policy) {
    const yrs = ymd(b, t, policy).years;
    if (anniv(b, yrs, policy) === t) return { date: t, age: yrs, left: 0, today: true };
    const d = anniv(b, yrs + 1, policy);
    return { date: d, age: yrs + 1, left: d - t, today: false };
  }
  // найближчі n днів народження після t (з урахуванням сьогоднішнього)
  function upcoming(b, t, n, policy) {
    const nb = nextBirthday(b, t, policy), out = [];
    for (let i = 0; i < n; i++) { const age = nb.age + i, d = anniv(b, age, policy); out.push({ age, date: d, wd: parts(d).wd, left: d - t }); }
    return out;
  }
  // українська множина: pl(n, "рік", "роки", "років")
  const pl = (n, one, few, many) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many; };
  const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, L(" ", ","));
  // круглі дати від народження: тип і величина → номер дня; t0 — час народження в секундах від півночі (якщо задано).
  // Дні, тижні, місяці, роки настають о тому самому часі доби; години й секунди без часу народження не рахуються (null).
  function milestone(b, kind, n, policy, t0) {
    const has = t0 !== undefined && t0 !== null, tm = has ? t0 : undefined;
    if (kind === "days") return { date: b + n, time: tm };
    if (kind === "weeks") return { date: b + n * 7, time: tm };
    if (kind === "months") return { date: addMonths(b, n), time: tm };
    if (kind === "years") return { date: anniv(b, n, policy), time: tm };
    if (kind === "hours" || kind === "seconds") {
      if (!has) return null;
      const total = t0 + (kind === "hours" ? n * 3600 : n), d = Math.floor(total / 86400);
      return { date: b + d, time: total - d * 86400 };
    }
    return null;
  }
  // «14:30», «1430», «9:05» → секунди від півночі, або null
  function parseTime(s) {
    const m = /^(\d{1,2}):?(\d{2})$/.exec(String(s || "").trim());
    if (!m) return null;
    const h = +m[1], mi = +m[2];
    return h > 23 || mi > 59 ? null : h * 3600 + mi * 60;
  }
  // секунд між моментами (день + секунди від півночі) за місцевим годинником, без поправки на літній час
  const secondsBetween = (b, bt, t, tt) => (t - b) * 86400 + (tt - bt);
  const nowSeconds = () => { const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); };
  const hms = (s) => String(Math.floor(s / 3600)).padStart(2, "0") + ":" + String(Math.floor((s % 3600) / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  const todayDn = () => { const t = new Date(); return dnOf(t.getFullYear(), t.getMonth() + 1, t.getDate()); };
  root.Ag = { L, DAY, dnOf, parts, parseISO, iso, isLeap, dim, addMonths, anniv, ymd, nextBirthday, upcoming, pl, grp, milestone, parseTime, secondsBetween, nowSeconds, hms, todayDn };
})();
