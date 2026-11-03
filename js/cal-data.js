/* cal-data.js — калорії: базовий обмін (BMR) за п'ятьма формулами, коефіцієнти активності, MET, темп зміни ваги
   Усі ваги в кг, зріст у см всередині; одиниці користувача (lb, ft/in) переводяться на вході. */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const KG_PER_LB = 0.45359237, CM_PER_IN = 2.54, KCAL_PER_KG = 7700;
  const FORMS = [
    { id: "mifflin", uk: "Міффліна — Сент-Джеора", en: "Mifflin–St Jeor", bf: false, txtU: "Ч: 10·вага + 6,25·зріст − 5·вік + 5; Ж: … − 161", txtE: "M: 10·weight + 6.25·height − 5·age + 5; F: … − 161" },
    { id: "hb", uk: "Харріса — Бенедикта (1984)", en: "Harris–Benedict (1984)", bf: false, txtU: "Ч: 88,362 + 13,397·вага + 4,799·зріст − 5,677·вік; Ж: 447,593 + 9,247·вага + 3,098·зріст − 4,330·вік", txtE: "M: 88.362 + 13.397·weight + 4.799·height − 5.677·age; F: 447.593 + 9.247·weight + 3.098·height − 4.330·age" },
    { id: "schofield", uk: "Скофілда (ВООЗ)", en: "Schofield (WHO)", bf: false, txtU: "лінійна за вагою, окремо для віку 18–29, 30–59 і 60+", txtE: "linear in weight, separately for ages 18–29, 30–59 and 60+" },
    { id: "katch", uk: "Кетча — Макардла", en: "Katch–McArdle", bf: true, txtU: "370 + 21,6·(суха маса, кг)", txtE: "370 + 21.6·(lean mass, kg)" },
    { id: "cunningham", uk: "Каннінгема", en: "Cunningham", bf: true, txtU: "500 + 22·(суха маса, кг)", txtE: "500 + 22·(lean mass, kg)" }
  ];
  // Скофілд (FAO/WHO/UNU 1985), ккал/добу = a·вага + b; діапазони 18–29, 30–59, 60+
  const SCH = { m: [[15.057, 692.2], [11.472, 873.1], [11.711, 587.7]], f: [[14.818, 486.6], [8.126, 845.6], [9.082, 658.5]] };
  const find = (id) => FORMS.find((f) => f.id === id);
  const name = (id) => L(find(id).uk, find(id).en);
  // BMR, ккал/добу; null — формула не застосовна (немає % жиру або вік < 18 для Скофілда)
  function bmr(id, p) {
    const { sex, age, w, h, bf } = p, m = sex === "m";
    if (id === "mifflin") return 10 * w + 6.25 * h - 5 * age + (m ? 5 : -161);
    if (id === "hb") return m ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * age : 447.593 + 9.247 * w + 3.098 * h - 4.33 * age;
    if (id === "schofield") { if (age < 18) return null; const band = age < 30 ? 0 : age < 60 ? 1 : 2, c = SCH[sex][band]; return c[0] * w + c[1]; }
    if (id === "katch" || id === "cunningham") { if (bf === null || bf === undefined) return null; const lbm = w * (1 - bf / 100); return id === "katch" ? 370 + 21.6 * lbm : 500 + 22 * lbm; }
    return null;
  }
  const PAL = [
    { v: 1.2, uk: "Мінімальний (сидяча робота, без спорту)", en: "Sedentary (desk job, no exercise)" },
    { v: 1.375, uk: "Легкий (тренування 1–3 рази на тиждень)", en: "Light (exercise 1–3 times a week)" },
    { v: 1.55, uk: "Помірний (тренування 3–5 разів на тиждень)", en: "Moderate (exercise 3–5 times a week)" },
    { v: 1.725, uk: "Високий (тренування 6–7 разів на тиждень)", en: "High (exercise 6–7 times a week)" },
    { v: 1.9, uk: "Дуже високий (фізична робота й тренування)", en: "Very high (physical job and training)" }
  ];
  // MET (Compendium of Physical Activities, 2011/2024); ккал = MET × вага(кг) × години
  const MET = [
    { id: "walk5", v: 3.5, uk: "Ходьба 5 км/год", en: "Walking 5 km/h" },
    { id: "walk6", v: 4.3, uk: "Швидка ходьба 6 км/год", en: "Brisk walking 6 km/h" },
    { id: "hike", v: 6.0, uk: "Похід, піший туризм", en: "Hiking" },
    { id: "run8", v: 8.3, uk: "Біг 8 км/год", en: "Running 8 km/h" },
    { id: "run10", v: 9.8, uk: "Біг 10 км/год", en: "Running 10 km/h" },
    { id: "run12", v: 11.8, uk: "Біг 12 км/год", en: "Running 12 km/h" },
    { id: "bikeL", v: 4.0, uk: "Велосипед, прогулянка (до 16 км/год)", en: "Cycling, leisure (under 16 km/h)" },
    { id: "bikeM", v: 6.8, uk: "Велосипед, помірно (16–19 км/год)", en: "Cycling, moderate (16–19 km/h)" },
    { id: "bikeF", v: 8.0, uk: "Велосипед, швидко (19–22 км/год)", en: "Cycling, fast (19–22 km/h)" },
    { id: "swimM", v: 5.8, uk: "Плавання, помірно", en: "Swimming, moderate" },
    { id: "swimV", v: 9.8, uk: "Плавання, інтенсивно", en: "Swimming, vigorous" },
    { id: "strL", v: 3.5, uk: "Силове тренування, помірно", en: "Strength training, moderate" },
    { id: "strV", v: 6.0, uk: "Силове тренування, інтенсивно", en: "Strength training, vigorous" },
    { id: "circ", v: 8.0, uk: "Колове тренування, HIIT", en: "Circuit training, HIIT" },
    { id: "yoga", v: 2.5, uk: "Йога (хатха)", en: "Yoga (Hatha)" },
    { id: "pilates", v: 3.0, uk: "Пілатес", en: "Pilates" },
    { id: "aero", v: 7.3, uk: "Аеробіка", en: "Aerobics" },
    { id: "ellip", v: 5.0, uk: "Еліптичний тренажер", en: "Elliptical trainer" },
    { id: "rope", v: 11.8, uk: "Скакалка (помірно)", en: "Jumping rope (moderate)" },
    { id: "soccer", v: 7.0, uk: "Футбол (аматорський)", en: "Football (casual)" },
    { id: "basket", v: 8.0, uk: "Баскетбол (гра)", en: "Basketball (game)" },
    { id: "tennis", v: 8.0, uk: "Теніс (одиночна гра)", en: "Tennis (singles)" },
    { id: "volley", v: 3.0, uk: "Волейбол (аматорський)", en: "Volleyball (recreational)" }
  ];
  const kcalMet = (met, kg, hours) => met * kg * hours;
  const GOALS = [
    { id: "loss20", pct: -20, uk: "Схуднення (швидке)", en: "Weight loss (fast)" },
    { id: "loss10", pct: -10, uk: "Схуднення (помірне)", en: "Weight loss (moderate)" },
    { id: "keep", pct: 0, uk: "Підтримка ваги", en: "Maintenance" },
    { id: "gain10", pct: 10, uk: "Набір маси (чистий)", en: "Muscle gain (lean)" },
    { id: "gain15", pct: 15, uk: "Набір маси (швидкий)", en: "Muscle gain (fast)" }
  ];
  const floorKcal = (sex) => (sex === "m" ? 1500 : 1200);
  const dailyDelta = (kgPerWeek) => (kgPerWeek * KCAL_PER_KG) / 7;
  const weeklyKg = (kcalDelta) => (kcalDelta * 7) / KCAL_PER_KG;
  root.Cal = { L, FORMS, find, name, bmr, PAL, MET, kcalMet, GOALS, floorKcal, dailyDelta, weeklyKg, KG_PER_LB, CM_PER_IN, KCAL_PER_KG };
})();
