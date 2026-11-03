/* rm-data.js — формули одноповторного максимуму (1ПМ / 1RM): оцінка за підходом, зворотні задачі, округлення до блінів
   Усі формули — множник k(r) = 1ПМ / вага для r повторень; для r = 1 за означенням 1ПМ = вага. */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const MAX_REPS = 30, WARN_REPS = 12, LB_PER_KG = 1 / 0.45359237;
  const F = [
    { id: "epley", uk: "Еплі", en: "Epley", txt: L("1ПМ = вага × (1 + r / 30)", "1RM = weight × (1 + r / 30)"), k: (r) => 1 + r / 30 },
    { id: "brzycki", uk: "Бжицького", en: "Brzycki", txt: L("1ПМ = вага × 36 / (37 − r)", "1RM = weight × 36 / (37 − r)"), k: (r) => 36 / (37 - r) },
    { id: "lander", uk: "Ландера", en: "Lander", txt: L("1ПМ = 100 × вага / (101,3 − 2,67123 × r)", "1RM = 100 × weight / (101.3 − 2.67123 × r)"), k: (r) => 100 / (101.3 - 2.67123 * r) },
    { id: "lombardi", uk: "Ломбарді", en: "Lombardi", txt: L("1ПМ = вага × r^0,10", "1RM = weight × r^0.10"), k: (r) => Math.pow(r, 0.1) },
    { id: "oconner", uk: "О'Коннера", en: "O'Conner", txt: L("1ПМ = вага × (1 + 0,025 × r)", "1RM = weight × (1 + 0.025 × r)"), k: (r) => 1 + 0.025 * r },
    { id: "mayhew", uk: "Мейхью", en: "Mayhew", txt: L("1ПМ = 100 × вага / (52,2 + 41,9 × e^(−0,055 × r))", "1RM = 100 × weight / (52.2 + 41.9 × e^(−0.055 × r))"), k: (r) => 100 / (52.2 + 41.9 * Math.exp(-0.055 * r)) },
    { id: "wathan", uk: "Вотена", en: "Wathen", txt: L("1ПМ = 100 × вага / (48,8 + 53,8 × e^(−0,075 × r))", "1RM = 100 × weight / (48.8 + 53.8 × e^(−0.075 × r))"), k: (r) => 100 / (48.8 + 53.8 * Math.exp(-0.075 * r)) }
  ];
  const find = (id) => F.find((f) => f.id === id);
  const name = (id) => (id === "avg" ? L("Середнє всіх формул", "Average of all formulas") : L(find(id).uk, find(id).en));
  // 1ПМ за підходом: вага × r повторень
  function est(id, w, r) {
    if (r <= 1) return w;
    if (id === "avg") return F.reduce((a, f) => a + w * f.k(r), 0) / F.length;
    return w * find(id).k(r);
  }
  // множник 1ПМ / вага
  const factor = (id, r) => (r <= 1 ? 1 : id === "avg" ? F.reduce((a, f) => a + f.k(r), 0) / F.length : find(id).k(r));
  // скільки повторень відповідає частці p (0 < p ≤ 1) від 1ПМ; null — формула цієї частки не описує (поза 1…MAX_REPS)
  function repsAt(id, p) {
    if (!(p > 0)) return null;
    if (p >= 1) return 1;
    const target = 1 / p, g = (r) => factor(id, r);
    if (g(MAX_REPS) < target) return null;
    let lo = 1, hi = MAX_REPS;
    if (g(1) >= target) return 1;
    for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (g(mid) < target) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  const zone = (pct) => (pct >= 85 ? "strength" : pct >= 65 ? "hypertrophy" : "endurance");
  const round = (x, step) => (step > 0 ? Math.round(x / step) * step : x);
  const toLb = (kg) => kg * LB_PER_KG, toKg = (lb) => lb / LB_PER_KG;
  root.Rm = { L, F, find, name, est, factor, repsAt, zone, round, toLb, toKg, MAX_REPS, WARN_REPS };
})();
