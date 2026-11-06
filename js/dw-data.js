/* dw-data.js — день тижня для дати: за григоріанським чи юліанським календарем (через юліанський день), день року, номер тижня ISO, N-й день тижня місяця, п'ятниці 13-го; спирається на chr-data.js (Chr) */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const C = root.Chr, fl = Math.floor;
  const wdOf = (cal, y, m, d) => C.weekday(C.jdn(cal, y, m, d)); // 0 — неділя
  const todayJ = () => { const t = new Date(); return C.jdn("g", t.getFullYear(), t.getMonth() + 1, t.getDate()); };
  const dayOfYear = (cal, y, m, d) => C.jdn(cal, y, m, d) - C.jdn(cal, y, 1, 1) + 1;
  const yearLen = (cal, y) => C.jdn(cal, y + 1, 1, 1) - C.jdn(cal, y, 1, 1);
  const quarter = (m) => fl((m - 1) / 3) + 1;
  // номер тижня за ISO 8601 для григоріанської дати: тиждень з понеділка, перший тиждень року містить 4 січня
  function isoWeek(y, m, d) {
    const J = C.jdn("g", y, m, d), wd = C.weekday(J), dow = ((wd + 6) % 7) + 1, Jt = J - (dow - 1) + 3, yt = C.fromJdn("g", Jt).y;
    return { year: yt, week: fl((Jt - C.jdn("g", yt, 1, 1)) / 7) + 1 };
  }
  // N-й (1…5) чи останній (n = "last") день тижня wd (0 — неділя) у місяці григоріанського календаря; null, якщо такого немає
  function nthWeekday(y, m, n, wd) {
    const dim = C.dim("g", y, m), w1 = wdOf("g", y, m, 1), first = 1 + (((wd - w1) % 7) + 7) % 7;
    if (n === "last") { let d = first; while (d + 7 <= dim) d += 7; return d; }
    const d = first + 7 * (n - 1); return d <= dim ? d : null;
  }
  const weekdaysInMonth = (y, m, wd) => { const out = []; const dim = C.dim("g", y, m); for (let d = 1; d <= dim; d++) if (wdOf("g", y, m, d) === wd) out.push(d); return out; };
  // п'ятниці, що припали на 13-те число, за роки y1…y2
  function friday13(y1, y2) { const out = []; for (let y = y1; y <= y2; y++) for (let m = 1; m <= 12; m++) if (wdOf("g", y, m, 13) === 5) out.push({ y, m }); return out; }
  // день тижня дати (день, місяць) за кожен рік y1…y2; null, якщо такої дати в році немає (29 лютого)
  function sameDateYears(cal, d, m, y1, y2) { const out = []; for (let y = y1; y <= y2; y++) out.push({ y, wd: C.validDate(cal, y, m, d) ? wdOf(cal, y, m, d) : null }); return out; }
  root.Dw = { wdOf, todayJ, dayOfYear, yearLen, quarter, isoWeek, nthWeekday, weekdaysInMonth, friday13, sameDateYears };
})();
