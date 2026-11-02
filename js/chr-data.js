/* chr-data.js — хронологічні функції (UK/EN): юліанський і григоріанський календарі через юліанський день, Великдень (пасхалії), століття, римські цифри, ери
   Роки — астрономічне числення (1 до н.е. = 0, 2 до н.е. = −1); для користувача рік до н.е. вводиться як звичайне натуральне число. */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const fl = Math.floor;
  const MONTHS = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
  const MONTHS_N = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
  const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["неділя", "понеділок", "вівторок", "середа", "четвер", "п'ятниця", "субота"], DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const isLeapG = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const isLeapJ = (y) => ((y % 4) + 4) % 4 === 0;
  const dim = (cal, y, m) => (m === 2 ? ((cal === "g" ? isLeapG(((y % 400) + 400) % 400) : isLeapJ(y)) ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31);
  // юліанський день (опівдні) за датою в календарі cal: "g" або "j"; рік астрономічний
  function jdn(cal, y, m, d) {
    const a = fl((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3, base = d + fl((153 * mm + 2) / 5) + 365 * yy + fl(yy / 4);
    return cal === "g" ? base - fl(yy / 100) + fl(yy / 400) - 32045 : base - 32083;
  }
  function fromJdn(cal, J) {
    const f = cal === "g" ? J + 1401 + fl((fl((4 * J + 274277) / 146097) * 3) / 4) - 38 : J + 1401, e = 4 * f + 3, g = fl((e % 1461) / 4), h = 5 * g + 2;
    const d = fl((h % 153) / 5) + 1, m = ((fl(h / 153) + 2) % 12) + 1, y = fl(e / 1461) - 4716 + fl((12 + 2 - m) / 12);
    return { y, m, d };
  }
  const weekday = (J) => (((J + 1) % 7) + 7) % 7; // 0 = неділя
  // користувацький рік (з ерою) ↔ астрономічний
  const toAstro = (y, bc) => (bc ? 1 - y : y);
  const fromAstro = (y) => (y <= 0 ? { y: 1 - y, bc: true } : { y, bc: false });
  const validDate = (cal, y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= dim(cal, y, m);

  // ===== Великдень =====
  function easterGregorian(y) {
    const a = y % 19, b = fl(y / 100), c = y % 100, d = fl(b / 4), e = b % 4, f = fl((b + 8) / 25), g = fl((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = fl(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = fl((a + 11 * h + 22 * l) / 451);
    return { y, m: fl((h + l - 7 * m + 114) / 31), d: ((h + l - 7 * m + 114) % 31) + 1 };
  }
  function easterJulian(y) { // дата за юліанським календарем
    const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
    return { y, m: fl((d + e + 114) / 31), d: ((d + e + 114) % 31) + 1 };
  }
  const easterOrthodoxGreg = (y) => { const j = easterJulian(y); return fromJdn("g", jdn("j", y, j.m, j.d)); };
  const addDays = (dt, n) => fromJdn("g", jdn("g", dt.y, dt.m, dt.d) + n);

  // ===== століття, римські цифри, ери =====
  const ROMAN = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  const toRoman = (n) => { let s = ""; for (const [v, r] of ROMAN) while (n >= v) { s += r; n -= v; } return s; };
  function fromRoman(str) {
    const s = String(str).trim().toUpperCase().replace(/Х/g, "X").replace(/І/g, "I").replace(/С/g, "C").replace(/М/g, "M").replace(/Д/g, "D").replace(/Л/g, "L").replace(/В/g, "V");
    if (!/^[IVXLCDM]+$/.test(s)) return null;
    const val = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }; let n = 0;
    for (let i = 0; i < s.length; i++) { const v = val[s[i]], nx = val[s[i + 1]] || 0; n += v < nx ? -v : v; }
    return n >= 1 && n <= 3999 && toRoman(n) === s ? n : null;
  }
  const century = (y) => fl((y + 99) / 100), millennium = (y) => fl((y + 999) / 1000);
  // тривалість між двома роками н.е./до н.е. (без нульового року)
  const spanYears = (a, aBc, b, bBc) => Math.abs(toAstro(b, bBc) - toAstro(a, aBc));

  root.Chr = { L, MONTHS, MONTHS_N, MONTHS_EN, DAYS, DAYS_EN, isLeapG, isLeapJ, dim, jdn, fromJdn, weekday, toAstro, fromAstro, validDate, easterGregorian, easterJulian, easterOrthodoxGreg, addDays, toRoman, fromRoman, century, millennium, spanYears };
})();
