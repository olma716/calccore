/* rn-data.js — генератор випадкових чисел: безпечна випадковість (crypto.getRandomValues, відхилення без зсуву за модулем) для будь-якого діапазону через BigInt, вибірка без повторів (алгоритм Флойда + перемішування), десяткові числа точно, кубики з точним розподілом сум, монета з точною ймовірністю, перемішування списку; залежить від km-data.js (мова) */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis, K = root.Km, L = K.L, IS_EN = L(false, true), DEC = IS_EN ? "." : ",", SEP = IS_EN ? "," : " ";
  let bytesHook = null;
  // n випадкових байтів; у тестах можна підставити свій генератор
  function fillBytes(n) {
    if (bytesHook) return bytesHook(n);
    let c = root.crypto;
    if ((!c || !c.getRandomValues) && typeof require === "function") { try { c = require("crypto").webcrypto; } catch (e) { c = null; } }
    if (!c || !c.getRandomValues) throw new Error(L("Цей браузер не підтримує безпечний генератор випадкових чисел (crypto.getRandomValues).", "This browser does not support a secure random number generator (crypto.getRandomValues)."));
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i += 65536) c.getRandomValues(out.subarray(i, Math.min(n, i + 65536)));
    return out;
  }
  // рівномірне BigInt від 0 до n−1: беремо k біт, де 2^k ≥ n, і відкидаємо значення ≥ n (шанс прийняття не менший за ½)
  function randBig(n) {
    if (n <= 1n) return 0n;
    const k = (n - 1n).toString(2).length, nb = Math.ceil(k / 8), mask = (1n << BigInt(k)) - 1n;
    for (;;) {
      const b = fillBytes(nb); let x = 0n;
      for (let i = 0; i < nb; i++) x = (x << 8n) | BigInt(b[i]);
      x &= mask;
      if (x < n) return x;
    }
  }
  const randInt = (n) => (n > 1 ? Number(randBig(BigInt(n))) : 0);
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // k різних чисел із 0…R−1 (алгоритм Флойда, без масиву всього діапазону), потім перемішування порядку
  function sampleUnique(R, k) {
    const set = new Set(), out = [];
    for (let j = R - BigInt(k); j < R; j++) {
      let t = randBig(j + 1n); const key = t.toString();
      if (set.has(key)) { t = j; set.add(j.toString()); } else set.add(key);
      out.push(t);
    }
    return shuffle(out);
  }

  // ---------- десяткові числа без похибок: значення = ціле × 10^−d ----------
  function parseDec(str, d) {
    const s = String(str == null ? "" : str).replace(/[\s  ]/g, "").replace(",", ".");
    const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(s);
    if (!m || (!m[2] && !m[3])) return { err: "fmt" };
    const ip = m[2] || "0", fp = m[3] || "";
    if (BigInt(ip) > 10n ** 15n) return { err: "big" };
    const tail = fp.replace(/0+$/, ""); if (tail.length > d) return { err: "digits" };
    let v = BigInt(ip + fp.padEnd(d, "0").slice(0, d)); if (m[1] === "-") v = -v;
    return { v };
  }
  const group = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, SEP);
  // BigInt (значення × 10^d) → рядок із d знаками після коми
  function fmtDec(v, d, grp) {
    const neg = v < 0n, a = (neg ? -v : v).toString().padStart(d + 1, "0"), ip = a.slice(0, a.length - d), fp = d ? a.slice(a.length - d) : "";
    return (neg ? "−" : "") + (grp ? group(ip) : ip) + (d ? DEC + fp : "");
  }
  // середнє зі зсувом на 2 знаки, округлення половини вгору за модулем
  function meanText(sum, k, d) {
    const neg = sum < 0n, a = neg ? -sum : sum, n = BigInt(k), sc = (a * 100n * 2n + n) / (2n * n);
    return fmtDec(neg && sc ? -sc : sc, d + 2, true);
  }
  // кількість варіантів для вибору k з N: C(N, k) точно (BigInt)
  function binom(N, k) {
    let kk = BigInt(k); if (kk > N - kk) kk = N - kk;
    let r = 1n; for (let i = 1n; i <= kk; i++) r = (r * (N - kk + i)) / i;
    return r;
  }
  function fmtBigCount(x) {
    const s = x.toString();
    if (s.length <= 15) return group(s);
    const m = (Number(s.slice(0, 4)) / 1000).toFixed(2).replace(".", DEC);
    return "≈ " + m + "·10" + String(s.length - 1).split("").map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+c]).join("");
  }

  // ---------- числа ----------
  // o = {lo, hi (BigInt, масштаб 10^d), d, count, unique, sort: none|asc|desc}
  function numbers(o) {
    if (o.lo > o.hi) return { err: "range" };
    const R = o.hi - o.lo + 1n;
    if (o.unique && BigInt(o.count) > R) return { err: "unique", R };
    let list;
    if (o.unique) list = sampleUnique(R, o.count).map((x) => x + o.lo);
    else { list = []; for (let i = 0; i < o.count; i++) list.push(o.lo + randBig(R)); }
    if (o.sort === "asc") list.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)); else if (o.sort === "desc") list.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    let sum = 0n, mn = list[0], mx = list[0];
    for (const x of list) { sum += x; if (x < mn) mn = x; if (x > mx) mx = x; }
    return { list, R, sum, min: mn, max: mx };
  }

  // ---------- кубики ----------
  const roll = (n, s) => { const a = []; for (let i = 0; i < n; i++) a.push(1 + randInt(s)); return a; };
  // розподіл суми n кубиків із s граней: probs[i] — імовірність суми n + i
  function diceDist(n, s) {
    let cur = [1];
    for (let k = 0; k < n; k++) {
      const nx = new Array(cur.length + s - 1).fill(0);
      for (let i = 0; i < cur.length; i++) { const v = cur[i]; if (!v) continue; for (let f = 0; f < s; f++) nx[i + f] += v / s; }
      cur = nx;
    }
    return cur;
  }
  const diceStats = (n, s) => ({ min: n, max: n * s, mean: (n * (s + 1)) / 2, sd: Math.sqrt((n * (s * s - 1)) / 12) });

  // ---------- монета ----------
  const flips = (n) => { const a = []; for (let i = 0; i < n; i++) a.push(randInt(2)); return a; };
  function longestStreak(a) { let best = 0, cur = 0, prev = -1; for (const x of a) { cur = x === prev ? cur + 1 : 1; prev = x; if (cur > best) best = cur; } return best; }
  // імовірність рівно k орлів із n кидків: C(n, k) / 2^n через логарифми факторіалів
  const LF = [0]; for (let i = 1; i <= 1100; i++) LF[i] = LF[i - 1] + Math.log(i);
  const probExact = (n, k) => Math.exp(LF[n] - LF[k] - LF[n - k] - n * Math.LN2);
  // шанс «такого чи більшого» відхилення від n/2: двосторонній
  function probAtLeastAsFar(n, k) { const d = Math.abs(k - n / 2); let p = 0; for (let i = 0; i <= n; i++) if (Math.abs(i - n / 2) >= d - 1e-9) p += probExact(n, i); return Math.min(1, p); }

  // ---------- перемішування й вибір зі списку ----------
  function pickItems(items, k) { const idx = sampleUnique(BigInt(items.length), k); return idx.map((i) => items[Number(i)]); }
  function parseItems(text, max) {
    const items = String(text || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    return items.length > max ? { err: "max", n: items.length } : { items };
  }
  function fmtP(p) {
    const pc = p * 100;
    if (pc >= 99.995) return "100 %";
    if (pc < 0.0001) return L("менше 0,0001 %", "under 0.0001%").replace(" %", IS_EN ? "%" : " %");
    const s = Number(pc.toPrecision(3)).toString();
    return s.replace(".", DEC) + (IS_EN ? "%" : " %");
  }

  root.Rn = { setBytes(f) { bytesHook = f; }, fillBytes, randBig, randInt, shuffle, sampleUnique, parseDec, fmtDec, group, meanText, binom, fmtBigCount, numbers, roll, diceDist, diceStats, flips, longestStreak, probExact, probAtLeastAsFar, pickItems, parseItems, fmtP, DEC, SEP };
})();
