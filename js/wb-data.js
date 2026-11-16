/* wb-data.js — весільний бюджет: усі суми в копійках (цілі числа), статті, резерв, розподіл за відсотками методом найбільших залишків, частки з точністю до десятої відсотка, максимум гостей за бюджетом, розбір рядків «назва сума», формат грошей; залежить від km-data.js (мова) */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis, K = root.Km, L = K.L, IS_EN = L(false, true), DEC = IS_EN ? "." : ",", SEP = IS_EN ? "," : " ";
  const cents = (x) => Math.round(x * 100 + 1e-9);
  // додатне число з рядка: кома чи крапка, пробіли як розділювач тисяч; порожнє → 0, помилка → null
  function num(str) {
    const t = String(str == null ? "" : str).trim().replace(/[\s  ]/g, ""), s = IS_EN ? t.replace(/,/g, "") : t.replace(",", ".");
    if (!s) return 0;
    if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null;
    const v = Number(s); return Number.isFinite(v) ? v : null;
  }
  // статті бюджету: ключ, назва, початковий відсоток у розподілі (орієнтир зі статей порад, не норма)
  const CATS = [
    { k: "banquet", uk: "Банкет (їжа й напої)", en: "Banquet (food and drinks)", pct: 30 },
    { k: "venue", uk: "Локація й оренда", en: "Venue and rental", pct: 15 },
    { k: "photo", uk: "Фото й відео", en: "Photo and video", pct: 10 },
    { k: "decor", uk: "Декор і квіти", en: "Decor and flowers", pct: 9 },
    { k: "music", uk: "Музика й ведучий", en: "Music and host", pct: 8 },
    { k: "attire", uk: "Наряди (сукня, костюм)", en: "Attire (dress, suit)", pct: 6 },
    { k: "beauty", uk: "Краса (зачіски, макіяж)", en: "Beauty (hair, makeup)", pct: 2 },
    { k: "cake", uk: "Торт і солодощі", en: "Cake and sweets", pct: 3 },
    { k: "rings", uk: "Обручки", en: "Rings", pct: 3 },
    { k: "ceremony", uk: "Церемонія й розпис", en: "Ceremony and registration", pct: 1 },
    { k: "invites", uk: "Запрошення й поліграфія", en: "Invitations and stationery", pct: 2 },
    { k: "transport", uk: "Транспорт і трансфер", en: "Transport and transfer", pct: 2 },
    { k: "other", uk: "Інше", en: "Other", pct: 1 }
  ];
  const RESERVE_PCT = 8;
  const PRESETS = {
    std: CATS.map((c) => c.pct).concat([RESERVE_PCT]),
    food: [36, 14, 8, 7, 7, 5, 2, 3, 3, 1, 2, 2, 1, 9],
    visual: [26, 14, 14, 13, 8, 7, 3, 3, 3, 1, 2, 1, 1, 4]
  };
  // розподіл суми total (копійки) за цілими вагами методом найбільших залишків
  function alloc(total, weights) {
    const sum = weights.reduce((a, b) => a + b, 0); if (!sum) return weights.map(() => 0);
    const raw = weights.map((w) => (total * w) / sum), base = raw.map(Math.floor); let left = total - base.reduce((a, b) => a + b, 0);
    const order = raw.map((r, i) => [r - base[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let k = 0; left > 0 && k < order.length; k++, left--) base[order[k][1]]++;
    return base;
  }
  // частки в десятих відсотка, сума рівно 1000 (якщо total > 0)
  const shares = (vals) => { const t = vals.reduce((a, b) => a + b, 0); return t > 0 ? alloc(1000, vals) : vals.map(() => 0); };
  const reserveOf = (sub, pct) => Math.round((sub * pct) / 100);
  // витрати: o = {adults, children, childPct, banquet, extra, items:{key:копійки}, lines:[{name,c}], reserve, paid}
  function total(o) {
    const A = o.adults, Ch = o.children, guests = A + Ch;
    const banquetC = A * o.banquet + Math.round((Ch * o.banquet * o.childPct) / 100), extraC = guests * o.extra, rows = [];
    CATS.forEach((c) => { rows.push({ k: c.k, c: c.k === "banquet" ? banquetC : (o.items[c.k] || 0) }); });
    rows.push({ k: "extra", c: extraC });
    (o.lines || []).forEach((l, i) => rows.push({ k: "line" + i, name: l.name, c: l.c }));
    const sub = rows.reduce((a, r) => a + r.c, 0), res = reserveOf(sub, o.reserve), tot = sub + res;
    return { rows, sub, res, tot, guests, perGuest: guests > 0 ? Math.round(tot / guests) : 0, paid: o.paid || 0, left: tot - (o.paid || 0), banquetC, extraC };
  }
  // найбільше число гостей, для якого (фіксовані + N × на гостя) із резервом не перевищує бюджет
  function maxGuests(budget, fixed, perGuest, reservePct) {
    const T = (n) => { const sub = fixed + n * perGuest; return sub + reserveOf(sub, reservePct); };
    if (perGuest <= 0) return { err: "per" };
    if (T(0) > budget) return { n: 0, short: T(0) - budget, T };
    let n = Math.max(0, Math.floor((budget / (1 + reservePct / 100) - fixed) / perGuest));
    while (T(n + 1) <= budget) n++; while (n > 0 && T(n) > budget) n--;
    return { n, T };
  }
  // рядки «назва сума»
  function parseLines(text, max) {
    const out = [];
    for (const raw of String(text || "").split("\n")) {
      const line = raw.trim(); if (!line) continue;
      const m = /^(.*?)[\s:=–—-]*(\d+(?:[.,]\d+)?)\s*$/.exec(line); if (!m) return { err: line };
      const v = num(m[2]); if (v === null) return { err: line };
      out.push({ name: m[1].trim().replace(/[:=–—-]+$/, "").trim(), c: cents(v) });
      if (out.length > (max || 30)) return { err: "max" };
    }
    return { rows: out };
  }
  const SYMS = [["", L("без символу", "no symbol")], ["₴", "₴"], ["$", "$"], ["€", "€"], ["£", "£"], ["zł", "zł"]];
  // гроші: цілі без копійок, інакше з двома знаками
  function money(c, sym) {
    const neg = c < 0, a = Math.abs(Math.round(c)), whole = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, SEP), fr = a % 100, s = fr ? whole + DEC + String(fr).padStart(2, "0") : whole;
    const pre = IS_EN && ["$", "€", "£"].includes(sym) ? sym : "", suf = !pre && sym ? " " + sym : "";
    return (neg ? "−" : "") + pre + s + suf;
  }
  const pct = (t) => String(t / 10).replace(".", DEC) + (IS_EN ? "%" : " %");
  const pct1 = (x) => String(Math.round(x * 10) / 10).replace(".", DEC) + (IS_EN ? "%" : " %");
  root.Wb = { cents, num, CATS, RESERVE_PCT, PRESETS, alloc, shares, reserveOf, total, maxGuests, parseLines, SYMS, money, pct, pct1, DEC };
})();
