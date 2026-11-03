/* rp-data.js — темп бігу: час/темп/дистанція, спліти (рівні й негативні), прогноз Рігеля, VDOT і тренувальні темпи за Деніелсом */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const KM_MI = 1.609344;
  // стандартні дистанції в кілометрах
  const DISTS = [
    { id: "1500", km: 1.5, uk: "1500 м", en: "1500 m" },
    { id: "1mi", km: KM_MI, uk: "1 миля", en: "1 mile" },
    { id: "3k", km: 3, uk: "3 км", en: "3 km" },
    { id: "5k", km: 5, uk: "5 км", en: "5 km" },
    { id: "10k", km: 10, uk: "10 км", en: "10 km" },
    { id: "15k", km: 15, uk: "15 км", en: "15 km" },
    { id: "half", km: 21.0975, uk: "Півмарафон", en: "Half marathon" },
    { id: "full", km: 42.195, uk: "Марафон", en: "Marathon" }
  ];
  const findDist = (id) => DISTS.find((d) => d.id === id);
  const p2 = (n) => String(n).padStart(2, "0");
  // секунди → год:хв:сек або хв:сек; округлюємо ціле число секунд до розбиття (без «5:60»)
  function fmtT(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "—";
    const s = Math.round(sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return h > 0 ? h + ":" + p2(m) + ":" + p2(r) : m + ":" + p2(r);
  }
  // секунди → «55хв 00с», «1год 56хв 02с»
  function fmtLong(sec) {
    const s = Math.round(sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return (h > 0 ? h + L("год ", "h ") + p2(m) : String(m)) + L("хв ", "min ") + p2(r) + L("с", "s");
  }
  // підпис формату для значення часу: хв:сек або год:хв:сек
  const fmtHint = (sec) => (Math.round(sec) >= 3600 ? L("год:хв:сек", "h:min:s") : L("хв:сек", "min:s"));
  // Рігель: T2 = T1·(D2/D1)^k
  const riegel = (t1, d1, d2, k) => t1 * Math.pow(d2 / d1, k);
  // Деніелс: кисневі витрати на швидкості v (м/хв) і частка VO2max, яку можна втримувати t хвилин
  const vo2 = (v) => -4.6 + 0.182258 * v + 0.000104 * v * v;
  const pctMax = (tMin) => 0.8 + 0.1894393 * Math.exp(-0.012778 * tMin) + 0.2989558 * Math.exp(-0.1932605 * tMin);
  const vdot = (dKm, tSec) => { const tMin = tSec / 60; return vo2((dKm * 1000) / tMin) / pctMax(tMin); };
  // швидкість (м/хв) за кисневими витратами: розв'язок квадратного рівняння
  const velAt = (vo2v) => { const a = 0.000104, b = 0.182258, c = 4.6 + vo2v; return (-b + Math.sqrt(b * b + 4 * a * c)) / (2 * a); };
  const paceAtVo2 = (vo2v) => 60000 / velAt(vo2v); // сек/км
  // час (с) на дистанції dKm за заданого VDOT: бісекція
  function eqTime(dKm, vd) {
    let lo = 30, hi = 200000;
    for (let i = 0; i < 90; i++) { const mid = (lo + hi) / 2; if (vdot(dKm, mid) > vd) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }
  // тренувальні темпи (сек/км): легкий — діапазон 59–74 %, марафонський — темп марафону за цим VDOT, T 88 %, I 98 %, R 105 %
  function zones(vd) {
    return {
      e: { slow: paceAtVo2(0.59 * vd), fast: paceAtVo2(0.74 * vd) },
      m: { pace: eqTime(42.195, vd) / 42.195 },
      t: { pace: paceAtVo2(0.88 * vd) },
      i: { pace: paceAtVo2(0.98 * vd) },
      r: { pace: paceAtVo2(1.05 * vd) }
    };
  }
  // спліти: загальний час T на дистанцію D (км); друга половина швидша на ns % за першу
  function splits(D, T, ns, unitKm) {
    const k = 1 - ns / 100, p1 = (2 * T) / (D * (1 + k)), p2v = p1 * k, half = D / 2;
    const at = (x) => (x <= half ? p1 * x : p1 * half + p2v * (x - half));
    const rows = []; let prev = 0, i = 0;
    while (prev < D - 1e-9 && i < 1000) { i++; const x = Math.min(D, i * unitKm), seg = at(x) - at(prev), len = x - prev; rows.push({ i, to: x, len, segT: seg, pace: seg / (len / unitKm), cum: at(x) }); prev = x; }
    return { p1, p2: p2v, halfT: at(half), rows };
  }
  root.Rp = { L, KM_MI, DISTS, findDist, fmtT, fmtLong, fmtHint, riegel, vo2, pctMax, vdot, velAt, paceAtVo2, eqTime, zones, splits };
})();
