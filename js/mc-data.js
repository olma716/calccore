/* mc-data.js — БЖУ: розподіл калорій на білки, жири й вуглеводи (за ціллю, за співвідношенням, з грамів), клітковина, прийоми їжі */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const KCAL = { p: 4, f: 9, c: 4 }, KG_PER_LB = 0.45359237, FIBER_PER_1000 = 14;
  // типові значення за ціллю: білок г/кг ваги, жир % від калорій
  const GOALS = [
    { id: "loss", p: 2.0, f: 30, uk: "Схуднення (більше білка)", en: "Weight loss (more protein)" },
    { id: "maintain", p: 1.8, f: 30, uk: "Підтримка ваги", en: "Maintenance" },
    { id: "gain", p: 1.8, f: 25, uk: "Набір м'язової маси (більше вуглеводів)", en: "Muscle gain (more carbs)" }
  ];
  // готові схеми: частки білків / жирів / вуглеводів, %
  const PRESETS = [
    { id: "balanced", p: 20, f: 30, c: 50, uk: "Збалансована", en: "Balanced" },
    { id: "athletic", p: 30, f: 30, c: 40, uk: "Спортивна", en: "Athletic" },
    { id: "highprot", p: 40, f: 30, c: 30, uk: "Високобілкова", en: "High-protein" },
    { id: "lowcarb", p: 30, f: 40, c: 30, uk: "Низьковуглеводна", en: "Low-carb" },
    { id: "keto", p: 20, f: 70, c: 10, uk: "Кето", en: "Keto" }
  ];
  const findGoal = (id) => GOALS.find((g) => g.id === id);
  // розподіл за білком (г/кг) і жиром (% калорій): вуглеводи — залишок
  function byGoal(cal, kg, pPerKg, fatPct) {
    const pK = pPerKg * kg * KCAL.p, fK = (cal * fatPct) / 100, restK = cal - pK - fK, cK = Math.max(0, restK), over = restK < 0 ? -restK : 0;
    const total = pK + fK + cK;
    return { pG: pK / KCAL.p, fG: fK / KCAL.f, cG: cK / KCAL.c, pK, fK, cK, total, over, pPct: (pK / total) * 100, fPct: (fK / total) * 100, cPct: (cK / total) * 100 };
  }
  // розподіл за відсотками (сума 100)
  function byRatio(cal, pPct, fPct, cPct) {
    const pK = (cal * pPct) / 100, fK = (cal * fPct) / 100, cK = (cal * cPct) / 100;
    return { pG: pK / KCAL.p, fG: fK / KCAL.f, cG: cK / KCAL.c, pK, fK, cK, total: cal, pPct, fPct, cPct };
  }
  // калорії з грамів
  function fromGrams(pG, fG, cG) {
    const pK = pG * KCAL.p, fK = fG * KCAL.f, cK = cG * KCAL.c, total = pK + fK + cK;
    return { pG, fG, cG, pK, fK, cK, total, pPct: total ? (pK / total) * 100 : 0, fPct: total ? (fK / total) * 100 : 0, cPct: total ? (cK / total) * 100 : 0 };
  }
  const fiber = (cal) => (FIBER_PER_1000 * cal) / 1000;
  root.Mc = { L, KCAL, GOALS, PRESETS, findGoal, byGoal, byRatio, fromGrams, fiber, KG_PER_LB };
})();
