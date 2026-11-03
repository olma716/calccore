/* hr-data.js — пульсові зони: максимальний пульс за віком, зони за % від максимуму чи резерву пульсу (Карвонен), порогові зони (Френ, біг) */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const MAXF = [
    { id: "tanaka", uk: "Танака (208 − 0,7 × вік)", en: "Tanaka (208 − 0.7 × age)", f: (a) => 208 - 0.7 * a },
    { id: "fox", uk: "Фокса (220 − вік)", en: "Fox (220 − age)", f: (a) => 220 - a },
    { id: "hunt", uk: "HUNT (211 − 0,64 × вік)", en: "HUNT (211 − 0.64 × age)", f: (a) => 211 - 0.64 * a },
    { id: "gulati", uk: "Гулаті, жінки (206 − 0,88 × вік)", en: "Gulati, women (206 − 0.88 × age)", f: (a) => 206 - 0.88 * a, women: true }
  ];
  const find = (id) => MAXF.find((f) => f.id === id);
  const name = (id) => (id === "custom" ? L("Власне значення", "Your own value") : L(find(id).uk, find(id).en));
  // максимальний пульс; null — формула не застосовна (Гулаті лише для жінок)
  const maxHr = (id, age, sex) => { const f = find(id); if (!f || (f.women && sex !== "f")) return null; return f.f(age); };
  // зони: частки від максимуму (чи від резерву)
  const ZONES = [
    { lo: 0.5, hi: 0.6, rpe: "2–3", uk: "Відновлення", en: "Recovery", talkU: "розмова вільна", talkE: "talking is effortless" },
    { lo: 0.6, hi: 0.7, rpe: "3–4", uk: "Легка", en: "Easy", talkU: "можна говорити цілими реченнями", talkE: "full sentences are easy" },
    { lo: 0.7, hi: 0.8, rpe: "5–6", uk: "Помірна", en: "Moderate", talkU: "розмова короткими фразами", talkE: "short phrases only" },
    { lo: 0.8, hi: 0.9, rpe: "7–8", uk: "Інтенсивна", en: "Hard", talkU: "лише кілька слів", talkE: "only a few words" },
    { lo: 0.9, hi: 1.0, rpe: "9–10", uk: "Максимальна", en: "Maximum", talkU: "говорити майже неможливо", talkE: "talking is almost impossible" }
  ];
  // межі в уд/хв, без перекриття: нижня межа зони = верхня попередньої + 1
  function zones(max, rest, method) {
    const at = (p) => (method === "hrr" ? rest + (max - rest) * p : max * p);
    const out = []; let prev = null;
    ZONES.forEach((z, i) => { const hi = Math.round(at(z.hi)), lo = i === 0 ? Math.round(at(z.lo)) : prev + 1; out.push({ ...z, i, loBpm: lo, hiBpm: hi }); prev = hi; });
    return out;
  }
  // у якій зоні пульс (-1 — нижче першої, 5 — вище максимуму)
  function zoneOf(bpm, zs) { if (bpm < zs[0].loBpm) return -1; for (const z of zs) if (bpm <= z.hiBpm) return z.i; return zs.length; }
  // Френ, біг: зони за пульсом лактатного порогу (LTHR); нижні межі у % від LTHR: <85, 85–89, 90–94, 95–99, 100–102, 103–106, >106
  const FRIEL = [
    { z: "1", lo: null, uk: "Відновлення", en: "Recovery" },
    { z: "2", lo: 85, uk: "Аеробна", en: "Aerobic" },
    { z: "3", lo: 90, uk: "Темпова", en: "Tempo" },
    { z: "4", lo: 95, uk: "Субпорогова", en: "Sub-threshold" },
    { z: "5a", lo: 100, uk: "Суперпорогова", en: "Super-threshold" },
    { z: "5b", lo: 103, uk: "Аеробна потужність", en: "Aerobic capacity" },
    { z: "5c", lo: 107, uk: "Анаеробна потужність", en: "Anaerobic capacity" }
  ];
  // межі в уд/хв: нижня = округлений відсоток від LTHR, верхня = нижня наступної зони − 1
  function friel(lthr) {
    const lows = FRIEL.map((f) => (f.lo === null ? null : Math.round((lthr * f.lo) / 100)));
    return FRIEL.map((f, i) => ({ ...f, loBpm: lows[i], hiBpm: i < FRIEL.length - 1 ? lows[i + 1] - 1 : null, loPct: f.lo, hiPct: i < FRIEL.length - 1 ? FRIEL[i + 1].lo - 1 : null }));
  }
  root.Hr = { L, MAXF, find, name, maxHr, ZONES, zones, zoneOf, FRIEL, friel };
})();
