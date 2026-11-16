/* pw-data.js — паролі, парольні фрази, PIN і перевірка пароля: випадковість через crypto.getRandomValues з відхиленням (без зсуву за модулем), точна ентропія (включення-виключення для вимоги «кожного типу», DP для PIN), оцінка сили й часу підбору; залежить від km-data.js (мова) і pw-words.js */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis, K = root.Km, L = K.L, IS_EN = L(false, true), DEC = IS_EN ? "." : ",";
  let rngHook = null;
  // 32 випадкових біти; у тестах можна підставити свій генератор
  function rand32() {
    if (rngHook) return rngHook();
    let c = root.crypto;
    if ((!c || !c.getRandomValues) && typeof require === "function") { try { c = require("crypto").webcrypto; } catch (e) { c = null; } }
    if (!c || !c.getRandomValues) throw new Error(L("Цей браузер не підтримує безпечний генератор випадкових чисел (crypto.getRandomValues).", "This browser does not support a secure random number generator (crypto.getRandomValues)."));
    const a = new Uint32Array(1); c.getRandomValues(a); return a[0];
  }
  // рівномірне ціле від 0 до n−1: значення з «неповного хвоста» відкидаємо, щоб не було зсуву за модулем
  function randInt(n) {
    if (!(n > 1)) return 0;
    const lim = Math.floor(4294967296 / n) * n;
    for (;;) { const x = rand32(); if (x < lim) return x % n; }
  }
  const pick = (a) => a[randInt(a.length)];

  const LOWER = "abcdefghijklmnopqrstuvwxyz", UPPER = LOWER.toUpperCase(), DIGITS = "0123456789";
  const SYMSETS = { all: "!@#$%^&*()-_=+[]{};:,.<>?/", safe: "!@#$%&*?-_", mini: "-_." };
  const AMBIG = "0O1lI";
  // набори символів за вибраними типами, без двозначних і виключених знаків
  function classes(o) {
    const ex = new Set(Array.from(String(o.exclude || "") + (o.noAmbig ? AMBIG : "")));
    const out = [];
    const add = (on, s) => { if (on) out.push(Array.from(s).filter((c) => !ex.has(c)).join("")); };
    add(o.lower, LOWER); add(o.upper, UPPER); add(o.digits, DIGITS); add(o.syms, SYMSETS[o.symset] || SYMSETS.all);
    return out;
  }
  function log2Big(x) {
    if (x <= 0n) return -Infinity;
    const s = x.toString(2), n = s.length;
    if (n <= 53) return Math.log2(Number(x));
    return Math.log2(Number(BigInt("0b" + s.slice(0, 53)))) + (n - 53);
  }
  // кількість різних рядків довжини len над сумою класів, що містять хоча б по одному знаку кожного класу (класи не перетинаються)
  function validCount(sizes, len, each) {
    const pool = sizes.reduce((a, b) => a + b, 0);
    if (!each || sizes.length < 2) return BigInt(pool) ** BigInt(len);
    let total = 0n;
    for (let m = 0; m < 1 << sizes.length; m++) {
      let rem = pool, bits = 0;
      for (let i = 0; i < sizes.length; i++) if (m & (1 << i)) { rem -= sizes[i]; bits++; }
      const term = BigInt(rem) ** BigInt(len);
      total += bits % 2 ? -term : term;
    }
    return total;
  }
  const hasAny = (s, set) => { for (const ch of s) if (set.includes(ch)) return true; return false; };
  // один пароль; рядок, що не містить усіх типів, відкидаємо цілком, тож результат рівномірний серед допустимих
  function password(o) {
    const cl = classes(o);
    if (!cl.length) return { err: "noclass" };
    if (cl.some((c) => !c.length)) return { err: "emptyclass" };
    if (o.each && o.len < cl.length) return { err: "short" };
    const pool = cl.join("");
    for (let t = 0; t < 50000; t++) {
      let s = ""; for (let i = 0; i < o.len; i++) s += pool[randInt(pool.length)];
      if (!o.each || cl.every((c) => hasAny(s, c))) return { s };
    }
    return { err: "fail" };
  }
  function passwords(o, count) {
    const cl = classes(o);
    if (!cl.length) return { err: "noclass" };
    if (cl.some((c) => !c.length)) return { err: "emptyclass" };
    if (o.each && o.len < cl.length) return { err: "short" };
    const sizes = cl.map((c) => c.length), list = [];
    for (let i = 0; i < count; i++) { const r = password(o); if (r.err) return r; list.push(r.s); }
    const pool = sizes.reduce((a, b) => a + b, 0), bits = log2Big(validCount(sizes, o.len, o.each));
    return { list, pool, bits, sizes };
  }

  // парольна фраза: слова з EFF Short Wordlist #1 (1296 слів), ентропія N·log2(1296) і, за потреби, +log2(100) за двоцифрове число
  const SEPS = { dash: "-", space: " ", dot: ".", under: "_", none: "" };
  function phrase(o) {
    const W = root.PwWords, one = () => { const w = pick(W); return o.cap ? w.charAt(0).toUpperCase() + w.slice(1) : w; };
    const parts = []; for (let i = 0; i < o.words; i++) parts.push(one());
    const sep = SEPS[o.sep] !== undefined ? SEPS[o.sep] : "-";
    let s = parts.join(sep);
    if (o.num) s += sep + String(randInt(100)).padStart(2, "0");
    return s;
  }
  function phrases(o, count) {
    const list = []; for (let i = 0; i < count; i++) list.push(phrase(o));
    return { list, bits: o.words * Math.log2(root.PwWords.length) + (o.num ? Math.log2(100) : 0), size: root.PwWords.length };
  }

  // PIN: за потреби без трьох однакових цифр поспіль і без трьох цифр підряд за зростанням чи спаданням
  const pinValid = (s, filter) => {
    if (!filter) return true;
    for (let i = 0; i + 2 < s.length; i++) { const a = +s[i], b = +s[i + 1], c = +s[i + 2]; if ((a === b && b === c) || (b === a + 1 && c === b + 1) || (b === a - 1 && c === b - 1)) return false; }
    return true;
  };
  // точна кількість допустимих PIN динамікою за (остання цифра, тип останнього кроку)
  function pinCount(n, filter) {
    if (!filter || n < 3) return Math.pow(10, n);
    let cur = Array.from({ length: 10 }, () => [1, 0, 0, 0]);
    for (let k = 1; k < n; k++) {
      const nx = Array.from({ length: 10 }, () => [0, 0, 0, 0]);
      for (let l = 0; l < 10; l++) for (let r = 0; r < 4; r++) {
        const v = cur[l][r]; if (!v) continue;
        for (let d = 0; d < 10; d++) {
          if (d === l) { if (r === 1) continue; nx[d][1] += v; }
          else if (d === l + 1) { if (r === 2) continue; nx[d][2] += v; }
          else if (d === l - 1) { if (r === 3) continue; nx[d][3] += v; }
          else nx[d][0] += v;
        }
      }
      cur = nx;
    }
    return cur.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
  }
  function pins(o, count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      for (let t = 0; t < 100000; t++) { let s = ""; for (let k = 0; k < o.len; k++) s += DIGITS[randInt(10)]; if (pinValid(s, o.filter)) { list.push(s); break; } }
    }
    return { list, bits: Math.log2(pinCount(o.len, o.filter)), count: pinCount(o.len, o.filter) };
  }

  // ---------- перевірка власного пароля (лише формула, без мережі) ----------
  const COMMON = ["password", "passw0rd", "password1", "123456", "1234567", "12345678", "123456789", "1234567890", "12345", "1234", "123123", "12341234", "111111", "000000", "121212", "654321", "666666", "111222", "qwerty", "qwerty123", "qwertyuiop", "qwe123", "asdfgh", "asdfghjkl", "zxcvbn", "zxcvbnm", "1q2w3e4r", "1qaz2wsx", "zaq12wsx", "qazwsx", "abc123", "abcdef", "iloveyou", "admin", "admin123", "welcome", "login", "letmein", "monkey", "dragon", "football", "princess", "sunshine", "master", "batman", "superman", "trustno1", "starwars", "hello", "freedom", "whatever", "test", "guest", "root", "user", "pass", "ukraine", "slava", "parol", "пароль", "йцукен", "привіт", "україна", "слава", "пароль123", "я люблю тебе", "qwertyu", "1111", "0000", "7777777", "88888888", "aaaaaa", "asdasd", "654321", "987654321", "1q2w3e", "q1w2e3r4"];
  const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", "йцукенгшщзхї", "фівапролджє", "ячсмитьбю"];
  const isLetterCyr = (ch) => /[а-яґєіїьА-ЯҐЄІЇ']/.test(ch);
  function poolOf(p) {
    const c = { lower: false, upper: false, digit: false, sym: false, cyr: false, other: false };
    for (const ch of p) {
      if (/[a-z]/.test(ch)) c.lower = true; else if (/[A-Z]/.test(ch)) c.upper = true; else if (/[0-9]/.test(ch)) c.digit = true;
      else if (/[ -~]/.test(ch)) c.sym = true; else if (/[а-яґєіїА-ЯҐЄІЇ]/.test(ch)) c.cyr = true; else c.other = true;
    }
    return { c, pool: (c.lower ? 26 : 0) + (c.upper ? 26 : 0) + (c.digit ? 10 : 0) + (c.sym ? 33 : 0) + (c.cyr ? 66 : 0) + (c.other ? 100 : 0) };
  }
  // ефективна довжина: повтори трьох і більше однакових знаків = 1, послідовності й рядки клавіатури від 3–4 знаків = 2
  function effective(p) {
    const s = Array.from(p.toLowerCase()); let i = 0, eff = 0; const flags = { repeat: false, seq: false, kb: false };
    while (i < s.length) {
      let run = 1; while (i + run < s.length && s[i + run] === s[i]) run++;
      let seq = 1;
      for (const dir of [1, -1]) { let k = 1; while (i + k < s.length && s[i + k].codePointAt(0) - s[i + k - 1].codePointAt(0) === dir) k++; if (k > seq) seq = k; }
      let kb = 0;
      for (const row of ROWS) for (const r of [row, Array.from(row).reverse().join("")]) { let m = 0; while (i + m < s.length && r.includes(s.slice(i, i + m + 1).join(""))) m++; if (m > kb) kb = m; }
      if (run >= 3 && run >= seq && run >= kb) { flags.repeat = true; eff += 1; i += run; }
      else if (kb >= 4 && kb >= seq) { flags.kb = true; eff += 2; i += kb; }
      else if (seq >= 3) { flags.seq = true; eff += 2; i += seq; }
      else { eff += 1; i += 1; }
    }
    return { eff, flags };
  }
  function analyze(p) {
    const chars = Array.from(p), len = chars.length, { c, pool } = poolOf(p), lg = pool ? Math.log2(pool) : 0;
    const { eff, flags } = effective(p), lower = p.toLowerCase().trim();
    const stripped = lower.replace(/[0-9!@#$%^&*()\-_=+.,?]+$/, "");
    const common = COMMON.includes(lower) || (stripped.length >= 4 && COMMON.includes(stripped));
    const naive = len * lg; let cons = eff * lg;
    if (common) cons = Math.min(cons, 14);
    const warn = [];
    if (len < 8) warn.push("short");
    if (len && !/[^0-9]/.test(p)) warn.push("digits");
    else if (len && !/[^A-Za-zА-Яа-яҐґЄєІіЇї]/.test(p) && !(c.lower && c.upper && len >= 12)) warn.push("letters");
    if (common) warn.push("common");
    if (flags.repeat) warn.push("repeat");
    if (flags.seq) warn.push("seq");
    if (flags.kb) warn.push("kb");
    if (/(19|20)\d\d$/.test(p) && len > 4) warn.push("year");
    return { len, pool, classes: c, naive, eff, cons, warn, common };
  }

  // ---------- сила й час підбору ----------
  const LEVELS = [
    { max: 28, uk: "Дуже слабкий", en: "Very weak" }, { max: 36, uk: "Слабкий", en: "Weak" }, { max: 60, uk: "Середній", en: "Fair" },
    { max: 80, uk: "Добрий", en: "Good" }, { max: 100, uk: "Сильний", en: "Strong" }, { max: Infinity, uk: "Дуже сильний", en: "Very strong" }
  ];
  function strength(bits) { const i = LEVELS.findIndex((l) => bits < l.max); return { i, name: L(LEVELS[i].uk, LEVELS[i].en) }; }
  // сценарії підбору: спроб за секунду
  const SCEN = [
    { key: "online", rate: 100 / 3600, uk: "Онлайн-вхід (100 спроб на годину)", en: "Online sign-in (100 guesses an hour)" },
    { key: "offline", rate: 1e10, uk: "Злам викраденого хешу на швидкому ПК (10 млрд спроб/с)", en: "Cracking a stolen fast hash on a fast PC (10 billion guesses/s)" },
    { key: "farm", rate: 1e12, uk: "Велика ферма відеокарт (1 трлн спроб/с)", en: "A large GPU farm (1 trillion guesses/s)" }
  ];
  const num1 = (x, d) => { const f = Math.pow(10, d === undefined ? 1 : d); return String(Math.round(x * f) / f).replace(".", DEC); };
  const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, IS_EN ? "," : " ");
  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const sup = (n) => String(n).split("").map((d) => SUP[+d]).join("");
  function yearsWord(n) { if (IS_EN) return n === 1 ? "year" : "years"; return n % 10 === 1 && n % 100 !== 11 ? "рік" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "роки" : "років"; }
  // середній час підбору: половина простору / швидкість
  function seconds(bits, rate) { return Math.pow(2, bits - 1) / rate; }
  function fmtTime(sec) {
    if (!(sec >= 0.5)) return L("менше секунди", "under a second");
    const U = IS_EN ? { s: "s", m: "min", h: "h", d: "d", k: "thousand", M: "million", B: "billion", T: "trillion" } : { s: "с", m: "хв", h: "год", d: "дн.", k: "тис.", M: "млн", B: "млрд", T: "трлн" };
    if (sec < 60) return Math.round(sec) + " " + U.s;
    if (sec < 3600) return Math.round(sec / 60) + " " + U.m;
    if (sec < 86400) return Math.round(sec / 3600) + " " + U.h;
    if (sec < 31557600) return Math.round(sec / 86400) + " " + U.d;
    const y = sec / 31557600;
    if (y < 1000) { const n = Math.max(1, Math.round(y)); return n + " " + yearsWord(n); }
    const sc = (v, w) => { const t = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10; return String(t).replace(".", DEC) + " " + w + " " + yearsWord(5); };
    if (y < 1e6) return sc(y / 1e3, U.k);
    if (y < 1e9) return sc(y / 1e6, U.M);
    if (y < 1e12) return sc(y / 1e9, U.B);
    if (y < 1e15) return sc(y / 1e12, U.T);
    const e = Math.floor(Math.log10(y)); return "≈ " + num1(y / Math.pow(10, e), 1) + "·10" + sup(e) + " " + yearsWord(5);
  }
  // кількість варіантів словами: «≈ 1,2 млн»
  function fmtCount(n) {
    const U = IS_EN ? ["thousand", "million", "billion", "trillion"] : ["тис.", "млн", "млрд", "трлн"];
    if (n < 1000) return String(Math.round(n));
    const scales = [1e3, 1e6, 1e9, 1e12];
    for (let i = scales.length - 1; i >= 0; i--) if (n >= scales[i]) { const v = n / scales[i]; return (v >= 100 ? String(Math.round(v)) : num1(v, 1)) + " " + U[i]; }
    return String(n);
  }

  root.Pw = { randInt, pick, setRng(f) { rngHook = f; }, LOWER, UPPER, DIGITS, SYMSETS, AMBIG, classes, validCount, log2Big, password, passwords, SEPS, phrase, phrases, pinValid, pinCount, pins, analyze, effective, poolOf, COMMON, strength, LEVELS, SCEN, seconds, fmtTime, fmtCount, num1, grp, DEC };
})();
