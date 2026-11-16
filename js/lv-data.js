/* lv-data.js — калькулятор сумісності (розважальний): нормалізація імен, симетричний відсоток із хешу пари імен (FNV-1a + фінальне перемішування), спільні літери, гра FLAMES з покроковим викреслюванням; залежить від km-data.js (мова) */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  // ім'я → лише літери, нижній регістр; ё→е, «ы» не чіпаємо
  const norm = (s) => String(s == null ? "" : s).normalize("NFC").toLocaleLowerCase("uk").replace(/ё/g, "е").replace(/[^\p{L}]/gu, "");
  // 32-бітний FNV-1a по кодових одиницях і фінальне перемішування біт (murmur fmix32)
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16;
    return h >>> 0;
  }
  // відсоток від 1 до 100; порядок імен не має значення (пару впорядковано)
  function percent(a, b) {
    const x = norm(a), y = norm(b); if (!x || !y) return null;
    const pair = x <= y ? [x, y] : [y, x], key = pair[0] + "|" + pair[1], h = hash(key);
    return { pct: (h % 100) + 1, key, h, a: x, b: y };
  }
  // спільні літери: мультимножинний перетин, у порядку першого імені
  function common(a, b) {
    const cnt = {}; for (const ch of norm(b)) cnt[ch] = (cnt[ch] || 0) + 1;
    const out = []; for (const ch of norm(a)) if (cnt[ch] > 0) { cnt[ch]--; out.push(ch); }
    return out;
  }
  // рівні відсотка: індекс 0–4
  const level = (p) => (p < 20 ? 0 : p < 40 ? 1 : p < 60 ? 2 : p < 80 ? 3 : 4);
  // FLAMES: викреслюємо збіжні літери, рахуємо залишок n і викреслюємо n-ту літеру з кола F L A M E S, поки не лишиться одна
  const FL = ["F", "L", "A", "M", "E", "S"];
  function flames(a, b) {
    const x = Array.from(norm(a)), y = Array.from(norm(b)); if (!x.length || !y.length) return null;
    const left = y.slice(), restA = [], cancelled = [];
    for (const ch of x) { const i = left.indexOf(ch); if (i >= 0) { left.splice(i, 1); cancelled.push(ch); } else restA.push(ch); }
    const n = restA.length + left.length;
    if (n === 0) return { n, cancelled, restA, rest: [], rounds: [], result: null };
    let ring = FL.slice(), pos = 0; const rounds = [];
    while (ring.length > 1) { const idx = (pos + n - 1) % ring.length, removed = ring[idx]; rounds.push({ ring: ring.slice(), removed }); ring.splice(idx, 1); pos = idx % ring.length; }
    return { n, cancelled, restA, rest: left, rounds, result: ring[0] };
  }
  root.Lv = { norm, hash, percent, common, level, flames, FL };
})();
