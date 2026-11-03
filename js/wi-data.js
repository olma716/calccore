/* wi-data.js — норма води: вагова формула з поправками, довідкові норми EFSA та Національних академій США, потовиділення, розклад на день */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const KG_LB = 0.45359237, ML_OZ = 29.5735295625;
  const ML_PER_KG = 33;
  // поправки (мл на день): активність і клімат — орієнтири без джерела; вагітність і годування — EFSA
  const ACT = { low: 0, walk: 200, mod: 350, high: 700 }, CLIMATE = { normal: 0, hot: 500 }, SPECIAL = { none: 0, preg: 300, lact: 700 };
  // довідкові норми для дорослих (мл на день): EFSA (загалом, лише напої) і Національні академії США (19–30 років)
  const REF = {
    efsaTotal: { m: 2500, f: 2000 }, efsaDrinks: { m: 2000, f: 1600 },
    namTotal: { m: 3700, f: 2700 }, namDrinks: { m: 3000, f: 2200 }
  };
  function need(kg, perKg, act, climate, special) {
    const base = kg * perKg, a = ACT[act] || 0, c = CLIMATE[climate] || 0, s = SPECIAL[special] || 0;
    return { base, act: a, climate: c, special: s, total: base + a + c + s };
  }
  // потовиділення за зміною маси: w0, w1 — кг до й після, drunk — мл випитого, min — хвилини, urine — мл сечі за час тренування
  function sweat(w0, w1, drunk, min, urine) {
    const diffKg = w0 - w1, loss = diffKg * 1000 + drunk - (urine || 0);
    return { loss, rate: (loss / min) * 60, pct: (diffKg / w0) * 100, diffKg, replace: diffKg > 0 ? 1500 * diffKg : 0 };
  }
  // розклад: n прийомів рівномірно від підйому до години до сну
  function schedule(total, wakeMin, sleepMin, glass) {
    const n = Math.max(1, Math.min(40, Math.round(total / glass))), last = sleepMin - 60, step = n > 1 ? (last - wakeMin) / (n - 1) : 0, each = total / n, rows = [];
    for (let i = 0; i < n; i++) rows.push({ i: i + 1, t: wakeMin + i * step, ml: each, cum: each * (i + 1) });
    return { n, step, each, rows, last };
  }
  // «7», «7:30», «07:05» → хвилини від півночі, або null
  function parseTime(s) {
    const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(String(s).trim());
    if (!m) return null;
    const h = Number(m[1]), mm = m[2] === undefined ? 0 : Number(m[2]);
    return h > 23 || mm > 59 ? null : h * 60 + mm;
  }
  const fmtTime = (min) => { const r = Math.round(min) % 1440; return String(Math.floor(r / 60)).padStart(2, "0") + ":" + String(r % 60).padStart(2, "0"); };
  root.Wi = { L, KG_LB, ML_OZ, ML_PER_KG, ACT, CLIMATE, SPECIAL, REF, need, sweat, schedule, parseTime, fmtTime };
})();
