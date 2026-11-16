/* tp-data.js — чайові й поділ рахунку: розрахунок у копійках (цілі числа), округлення суми на людину, нерівний поділ за методом найбільших залишків, розбір рядків «ім'я сума», формат грошей; залежить від km-data.js (мова) */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis, K = root.Km, L = K.L, IS_EN = L(false, true), DEC = IS_EN ? "." : ",", SEP = IS_EN ? "," : " ";
  const cents = (x) => Math.round(x * 100 + 1e-9);
  // дробове число з рядка: кома чи крапка, без знака; null, якщо не число
  function num(str) {
    const s = String(str == null ? "" : str).trim().replace(/[\s ]/g, "").replace(",", ".");
    if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null;
    const v = Number(s); return Number.isFinite(v) ? v : null;
  }
  // крок округлення суми на людину (у копійках): режим none — без округлення
  const ROUND = { none: null, near1: { step: 100, mode: "near" }, up1: { step: 100, mode: "up" }, up5: { step: 500, mode: "up" }, up10: { step: 1000, mode: "up" } };
  const roundTo = (c, key) => { const r = ROUND[key]; if (!r) return Math.round(c); return (r.mode === "up" ? Math.ceil(c / r.step - 1e-9) : Math.round(c / r.step)) * r.step; };
  // чайові: bill, pct або fixed, tax (%), base ("before" чи "after" податку), people, round
  function tip(o) {
    const B = cents(o.bill), taxC = o.tax ? Math.round(B * o.tax / 100) : 0, baseC = o.base === "after" ? B + taxC : B;
    const tipC = o.fixed !== undefined && o.fixed !== null ? cents(o.fixed) : Math.round(baseC * o.pct / 100);
    const totalC = B + taxC + tipC, N = o.people, exact = totalC / N;
    let pp, finalTotal;
    if (ROUND[o.round]) { pp = roundTo(exact, o.round); finalTotal = pp * N; } else { pp = Math.round(exact); finalTotal = totalC; }
    const extra = finalTotal - totalC, finalTip = tipC + extra;
    return { B, taxC, baseC, tipC, totalC, pp, finalTotal, extra, finalTip, effPct: baseC ? (finalTip / baseC) * 100 : 0, exactPP: exact };
  }
  // розподіл суми total (копійки) за вагами методом найбільших залишків
  function alloc(total, weights) {
    const sum = weights.reduce((a, b) => a + b, 0); if (!sum) return weights.map(() => 0);
    const raw = weights.map((w) => (total * w) / sum), base = raw.map(Math.floor); let left = total - base.reduce((a, b) => a + b, 0);
    const order = raw.map((r, i) => [r - base[i], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let k = 0; left > 0 && k < order.length; k++, left--) base[order[k][1]]++;
    return base;
  }
  // нерівний поділ: shares — частки людей (грн), shared — спільні страви (ділимо порівну)
  function split(o) {
    const n = o.shares.length, own = o.shares.map(cents), sharedC = cents(o.shared || 0), sh = alloc(sharedC, own.map(() => 1));
    const s = own.map((c, i) => c + sh[i]), B = s.reduce((a, b) => a + b, 0), taxC = o.tax ? Math.round(B * o.tax / 100) : 0, baseC = o.base === "after" ? B + taxC : B;
    const tipC = o.fixed !== undefined && o.fixed !== null ? cents(o.fixed) : Math.round(baseC * o.pct / 100);
    const taxA = alloc(taxC, s), tipA = alloc(tipC, s), t0 = s.map((c, i) => c + taxA[i] + tipA[i]);
    const tot = t0.map((c) => (ROUND[o.round] ? roundTo(c, o.round) : c)), extra = tot.map((c, i) => c - t0[i]);
    const sum = tot.reduce((a, b) => a + b, 0), finalTip = tipC + (sum - t0.reduce((a, b) => a + b, 0));
    return { n, own, sh, s, B, taxC, baseC, tipC, taxA, tipA, tot, extra, sum, finalTip, effPct: baseC ? (finalTip / baseC) * 100 : 0 };
  }
  // рядки «Оля 300» або «Оля: 300,50» або «300»; ім'я необов'язкове
  function parseLines(text, max) {
    const out = [], lines = String(text || "").split("\n");
    for (const raw of lines) {
      const line = raw.trim(); if (!line) continue;
      const m = /^(.*?)[\s:=–—-]*(\d+(?:[.,]\d+)?)\s*$/.exec(line);
      if (!m) return { err: line };
      const v = num(m[2]); if (v === null) return { err: line };
      out.push({ name: m[1].trim().replace(/[:=–—-]+$/, "").trim(), v });
      if (out.length > (max || 30)) return { err: "max" };
    }
    return { rows: out };
  }
  const SYMS = [["", L("без символу", "no symbol")], ["₴", "₴"], ["$", "$"], ["€", "€"], ["£", "£"], ["zł", "zł"]];
  // гроші: c — копійки; sym — символ
  function money(c, sym) {
    const neg = c < 0, a = Math.abs(Math.round(c)), whole = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, SEP), frac = String(a % 100).padStart(2, "0"), s = whole + DEC + frac;
    const pre = IS_EN && ["$", "€", "£"].includes(sym) ? sym : "", suf = !pre && sym ? " " + sym : "";
    return (neg ? "−" : "") + pre + s + suf;
  }
  const pct = (x) => String(Math.round(x * 10) / 10).replace(".", DEC) + "%";
  root.Tp = { cents, num, ROUND, roundTo, tip, alloc, split, parseLines, SYMS, money, pct, DEC };
})();
