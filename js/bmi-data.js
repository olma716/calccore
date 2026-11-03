/* bmi-data.js — індекс маси тіла: ІМТ, категорії ВООЗ, діапазон нормальної ваги, цільова вага, BMI Prime, новий ІМТ (Трефетен) */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const KG_PER_LB = 0.45359237, CM_PER_IN = 2.54;
  // категорії ВООЗ для дорослих: нижня межа включно
  const CATS = [
    { id: "sev", lo: 0, uk: "Виражений дефіцит маси тіла", en: "Severe thinness", color: "#1d3a8a" },
    { id: "mod", lo: 16, uk: "Помірний дефіцит маси тіла", en: "Moderate thinness", color: "#3d63c9" },
    { id: "mild", lo: 17, uk: "Легкий дефіцит маси тіла", en: "Mild thinness", color: "#7aa3f0" },
    { id: "normal", lo: 18.5, uk: "Норма", en: "Normal weight", color: "#2faa73" },
    { id: "over", lo: 25, uk: "Надлишкова маса тіла", en: "Overweight (pre-obesity)", color: "#f2b705" },
    { id: "ob1", lo: 30, uk: "Ожиріння I ступеня", en: "Obesity class I", color: "#f08a24" },
    { id: "ob2", lo: 35, uk: "Ожиріння II ступеня", en: "Obesity class II", color: "#e5533d" },
    { id: "ob3", lo: 40, uk: "Ожиріння III ступеня", en: "Obesity class III", color: "#a12626" }
  ];
  const bmi = (kg, cm) => kg / ((cm / 100) * (cm / 100));
  const cat = (b) => { let c = CATS[0]; for (const x of CATS) if (b >= x.lo) c = x; return c; };
  const wAt = (b, cm) => b * (cm / 100) * (cm / 100); // вага (кг) для заданого ІМТ і зросту
  const normalRange = (cm) => [wAt(18.5, cm), wAt(25, cm)];
  const prime = (b) => b / 25;
  const newBmi = (kg, cm) => (1.3 * kg) / Math.pow(cm / 100, 2.5);
  // орієнтири ВООЗ-2004 для азійських популяцій (дії щодо громадського здоров'я): 23,0 і 27,5
  const ASIA = [23, 27.5];
  const asiaStatus = (b) => (b < ASIA[0] ? 0 : b < ASIA[1] ? 1 : 2);
  root.Bmi = { L, CATS, bmi, cat, wAt, normalRange, prime, newBmi, ASIA, asiaStatus, KG_PER_LB, CM_PER_IN };
})();
