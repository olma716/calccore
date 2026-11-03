/* bf-data.js — жир у тілі: метод ВМФ США (обхвати), формула Дейренберга (ІМТ і вік), склад тіла й ціль, категорії ACE за статтю */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const CM_IN = 2.54, KG_LB = 0.45359237;
  // категорії ACE: нижні межі, % жиру (чоловіки / жінки); нижче першої межі — необхідний жир
  const CATS = [
    { id: "essential", uk: "Необхідний жир", en: "Essential fat", color: "#2563eb" },
    { id: "athletes", uk: "Спортивна форма", en: "Athletes", color: "#16a34a" },
    { id: "fitness", uk: "Фітнес", en: "Fitness", color: "#84cc16" },
    { id: "average", uk: "Середній рівень", en: "Average", color: "#f59e0b" },
    { id: "obese", uk: "Ожиріння", en: "Obese", color: "#dc2626" }
  ];
  const LOWS = { m: [2, 6, 14, 18, 25], f: [10, 14, 21, 25, 32] };
  const AXIS = { m: [2, 40], f: [8, 50] };
  function cat(bf, sex) {
    const lo = LOWS[sex]; let i = 0;
    for (let k = 1; k < lo.length; k++) if (bf >= lo[k]) i = k;
    const next = i + 1 < lo.length ? lo[i + 1] : null;
    return { i, id: CATS[i].id, lo: lo[i], hi: next, ...CATS[i] };
  }
  // метод ВМФ США, см: чоловіки — талія й шия; жінки — талія + стегна − шия
  function navy(sex, h, n, w, hp) {
    if (sex === "m") return 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
    return 495 / (1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.221 * Math.log10(h)) - 450;
  }
  // Дейренберг та ін. (1991), дорослі: 1,20·ІМТ + 0,23·вік − 10,8·стать − 5,4 (чоловіки 1, жінки 0)
  const bmi = (kg, cm) => kg / ((cm / 100) * (cm / 100));
  const deurenberg = (kg, cm, age, sex) => 1.2 * bmi(kg, cm) + 0.23 * age - 10.8 * (sex === "m" ? 1 : 0) - 5.4;
  // склад тіла: маси й індекси (кг/м²)
  function comp(kg, bf, cm) {
    const fat = (kg * bf) / 100, lean = kg - fat, o = { fat, lean };
    if (cm) { const m2 = (cm / 100) * (cm / 100); o.fmi = fat / m2; o.ffmi = lean / m2; }
    return o;
  }
  // ціль у відсотках жиру за незмінної сухої маси
  function target(kg, bf, tg) {
    const lean = kg * (1 - bf / 100), w2 = lean / (1 - tg / 100);
    return { lean, weight: w2, fatChange: kg - w2 };
  }
  root.Bf = { L, CM_IN, KG_LB, CATS, LOWS, AXIS, cat, navy, deurenberg, bmi, comp, target };
})();
