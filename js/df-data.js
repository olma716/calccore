/* df-data.js — різниця між датами: діапазон (з «включно» чи без), робочі дні з вихідними й власними святами, кількість днів тижня; спирається на ag-data.js (Ag) */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const A = root.Ag;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  // вихідні: індекси днів тижня (0 — неділя … 6 — субота)
  const WEEKENDS = { satsun: [6, 0], sun: [0], frisat: [5, 6], none: [] };
  const wdOf = (dn) => (((dn + 4) % 7) + 7) % 7;
  // діапазон дат: [start, endExcl); «включно» додає останній день
  function range(a, b, incl) { const s = Math.min(a, b), e = Math.max(a, b); return { start: s, last: e, endExcl: e + (incl ? 1 : 0), swapped: a > b }; }
  // скільки разів кожен день тижня (0 — неділя) трапляється в діапазоні
  function weekdayCounts(start, endExcl) {
    const c = [0, 0, 0, 0, 0, 0, 0], n = endExcl - start, full = Math.floor(n / 7), rem = n % 7;
    for (let i = 0; i < 7; i++) c[i] = full;
    for (let k = 0; k < rem; k++) c[wdOf(start + full * 7 + k)]++;
    return c;
  }
  // робочі дні: вихідні й свята (множина номерів днів) не рахуються; свято у вихідний не віднімається двічі
  function business(start, endExcl, weekend, holidays) {
    const wk = new Set(weekend);
    let work = 0, weekends = 0, hol = 0;
    for (let d = start; d < endExcl; d++) {
      if (wk.has(wdOf(d))) weekends++;
      else if (holidays && holidays.has(d)) hol++;
      else work++;
    }
    return { total: Math.max(0, endExcl - start), work, weekends, holidays: hol };
  }
  // список свят: дати через кому, крапку з комою, пробіл чи новий рядок. Формати: рррр-мм-дд, дд.мм.рррр, а також дд/мм/рррр (EN: мм/дд/рррр)
  function parseHolidays(text) {
    const out = new Set(), bad = [];
    String(text || "").split(/[\s,;]+/).filter(Boolean).forEach((tok) => {
      let m, n = null;
      if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(tok))) n = chk(+m[1], +m[2], +m[3]);
      else if ((m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(tok))) n = chk(+m[3], +m[2], +m[1]);
      else if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(tok))) n = IS_EN ? chk(+m[3], +m[1], +m[2]) : chk(+m[3], +m[2], +m[1]);
      if (n === null) bad.push(tok); else out.add(n);
    });
    return { set: out, bad };
  }
  function chk(y, mo, d) {
    if (mo < 1 || mo > 12 || d < 1 || y < 1000 || y > 2999) return null;
    const n = A.dnOf(y, mo, d), p = A.parts(n);
    return p.y === y && p.m === mo && p.d === d ? n : null;
  }
  root.Df = { L, WEEKENDS, wdOf, range, weekdayCounts, business, parseHolidays };
})();
