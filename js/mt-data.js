/* mt-data.js — температура м'яса: безпечні мінімуми USDA (FSIS), ступені прожарки яловичини (ThermoWorks, Thermapen) і температура зняття з вогню з урахуванням carryover */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis, K = root.Km, L = K.L, IS_EN = L(false, true), DEC = IS_EN ? "." : ",";
  const SRC = {
    USDA: ["USDA FSIS: Safe Minimum Internal Temperature Chart", "https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart"],
    FDA: ["FDA: Safe Minimum Internal Temperatures", "https://www.fda.gov/media/107000/download"],
    TW: ["ThermoWorks: Steak Temperature: Getting It Right", "https://blog.thermoworks.com/steak-temps-getting-it-right"],
    TP: ["Thermapen: Steak Cooking Chart", "https://thermapen.co.uk/pages/steak-temperature-guide"]
  };
  const cToF = (c) => (c * 9) / 5 + 32, fToC = (f) => ((f - 32) * 5) / 9;
  const GROUPS = [["poultry", "Птиця", "Poultry"], ["meat", "М'ясо: яловичина, свинина, телятина, баранина", "Meat: beef, pork, veal, lamb"], ["ham", "Шинка", "Ham"], ["fish", "Риба й морепродукти", "Fish and shellfish"], ["other", "Яйця, залишки, запіканки", "Eggs, leftovers, casseroles"]].map(([id, uk, en]) => ({ id, label: L(uk, en) }));
  // USDA: f — мінімум °F, rest — хвилини відпочинку за USDA, sign — ознаки готовності без температури
  const RAW = [
    ["poultry", "poultry", "Вся птиця: грудка, ціла тушка, стегна, гомілки, крильця, фарш з птиці, потрухи, начинка", "All poultry: breasts, whole bird, legs, thighs, wings, ground poultry, giblets, stuffing", { f: 165 }, "Міряйте в найтовщій частині грудки, у внутрішній частині стегна й крила, не торкаючись кістки.", "Measure in the thickest part of the breast and the innermost part of the thigh and wing, away from the bone.", "USDA"],
    ["ground", "meat", "Фарш: яловичина, свинина, телятина, баранина", "Ground meat: beef, pork, veal, lamb", { f: 160 }, "Бактерії можуть бути по всьому об'єму, тому фарш готують до повної готовності.", "Bacteria can be throughout ground meat, so it is cooked all the way through.", "USDA"],
    ["whole", "meat", "Стейки, відбивні й шматки для запікання: яловичина, свинина, телятина, баранина", "Steaks, chops and roasts: beef, pork, veal, lamb", { f: 145, rest: 3 }, "Після зняття з вогню дайте постояти щонайменше 3 хв.", "After taking it off the heat let it rest for at least 3 minutes.", "USDA"],
    ["ham_raw", "ham", "Свіжа чи копчена (сира) шинка", "Fresh or smoked (uncooked) ham", { f: 145, rest: 3 }, "Після зняття з вогню дайте постояти щонайменше 3 хв.", "After taking it off the heat let it rest for at least 3 minutes.", "USDA"],
    ["ham_plant", "ham", "Готова шинка, розігрів: упакована на підприємстві під наглядом USDA", "Fully cooked ham, reheating: packaged in a USDA-inspected plant", { f: 140 }, "Для готової шинки з інших джерел див. наступний рядок.", "For fully cooked ham from other sources see the next row.", "USDA"],
    ["ham_other", "ham", "Готова шинка, розігрів: уся інша", "Fully cooked ham, reheating: all others", { f: 165 }, "", "", "USDA"],
    ["fish", "fish", "Риба з плавцями", "Fin fish", { f: 145 }, "Або доки м'якуш непрозорий і легко розділяється виделкою.", "Or until the flesh is opaque and separates easily with a fork.", "USDA", "FDA"],
    ["shrimp", "fish", "Креветки, лобстер, краб", "Shrimp, lobster, crab", { sign: 1 }, "Готові, коли м'якуш перламутровий і непрозорий.", "Done when the flesh is pearly and opaque.", "USDA"],
    ["scallops", "fish", "Гребінці", "Scallops", { sign: 1 }, "Готові, коли м'якуш молочно-білий або непрозорий і пружний.", "Done when the flesh is milky white or opaque and firm.", "USDA"],
    ["mollusks", "fish", "Мушлі, устриці, мідії", "Clams, oysters, mussels", { sign: 1 }, "Готові, коли стулки відкрилися під час готування.", "Done when the shells open during cooking.", "USDA"],
    ["egg_dishes", "other", "Страви з яєць", "Egg dishes", { f: 160 }, "", "", "USDA", "FDA"],
    ["eggs", "other", "Яйця (цілі)", "Eggs (whole)", { sign: 1 }, "Готуйте, доки жовток і білок не стануть щільними.", "Cook until the yolk and white are firm.", "FDA"],
    ["leftovers", "other", "Залишки їжі: розігрів", "Leftovers: reheating", { f: 165 }, "", "", "USDA", "FDA"],
    ["casseroles", "other", "Запіканки", "Casseroles", { f: 165 }, "", "", "USDA", "FDA"]
  ];
  const FOODS = RAW.map(([id, g, uk, en, v, nUk, nEn, ...src]) => ({ id, g, name: L(uk, en), f: v.f, rest: v.rest || 0, sign: !!v.sign, note: L(nUk, nEn), src }));
  const food = (id) => FOODS.find((x) => x.id === id) || null;
  // ступені прожарки яловичини: діапазон подачі °F (hi: null — «і вище»)
  const RAWD = [["rare", "З кров'ю (rare)", "Rare", 120, 130], ["mr", "Слабка (medium rare)", "Medium rare", 130, 135], ["med", "Середня (medium)", "Medium", 135, 145], ["mw", "Середньо-добра (medium well)", "Medium well", 145, 155], ["wd", "Добра (well done)", "Well done", 155, null]];
  const DONE = RAWD.map(([id, uk, en, lo, hi]) => ({ id, name: L(uk, en), lo, hi }));
  const done = (id) => DONE.find((x) => x.id === id) || null;
  // carryover °F: тонкий стейк 3–5, великий шматок 10–15 (ThermoWorks); середина діапазону
  const CARRY = { thin: [3, 5], large: [10, 15] };
  const carryMid = (k) => (CARRY[k][0] + CARRY[k][1]) / 2;
  function pull(d, k) { const c = carryMid(k); return { lo: d.lo - c, hi: d.hi === null ? null : d.hi - c, carry: c }; }
  const USDA_MIN = 145; // °F: цілі шматки яловичини
  const belowUsda = (d) => d.lo < USDA_MIN;
  const fmtC = (f) => String(Math.round(fToC(f) * 10) / 10).replace(".", DEC);
  const fmtF = (f) => String(Math.round(f * 10) / 10).replace(".", DEC);
  const both = (f) => fmtC(f) + " °C / " + fmtF(f) + " °F";
  root.Mt = { SRC, GROUPS, FOODS, food, DONE, done, CARRY, carryMid, pull, belowUsda, USDA_MIN, cToF, fToC, fmtC, fmtF, both };
})();
