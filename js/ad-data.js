/* ad-data.js — додати/відняти дні до дати: роки, місяці, тижні, дні (кінець місяця обмежується), N-й робочий день з вихідними й святами, номер тижня ISO; спирається на ag-data.js (Ag) і df-data.js (Df) */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const A = root.Ag, F = root.Df;
  const MIN = A.dnOf(1000, 1, 1), MAX = A.dnOf(2999, 12, 31);
  const inRange = (n) => n >= MIN && n <= MAX;
  // зсув на роки, місяці, тижні, дні; sign = +1 (додати) чи −1 (відняти). Спочатку роки й місяці (з обмеженням дня кінцем місяця), потім тижні й дні.
  // incl — початкова дата вважається першим днем: результат на день ближче до початку
  function shift(start, a, sign, incl) {
    const months = sign * (a.y * 12 + a.mo), afterM = months ? A.addMonths(start, months) : start;
    const days = sign * (a.w * 7 + a.d), afterD = afterM + days;
    const nonzero = months !== 0 || days !== 0, adj = incl && nonzero ? -sign : 0;
    const clamped = months !== 0 && A.parts(afterM).d !== A.parts(start).d;
    return { afterM, afterD, date: afterD + adj, adj, clamped, nonzero, months, days };
  }
  // N-й робочий день після початкової дати (n ≥ 1). incl — початкова дата теж рахується, якщо вона робоча.
  function workday(start, n, sign, weekend, holidays, incl) {
    const wk = new Set(weekend), isWork = (x) => !wk.has(F.wdOf(x)) && !(holidays && holidays.has(x));
    let d = start, cnt = incl && isWork(start) ? 1 : 0, skipW = 0, skipH = 0;
    while (cnt < n) {
      d += sign;
      if (d < MIN || d > MAX) return { out: true };
      if (wk.has(F.wdOf(d))) skipW++; else if (holidays && holidays.has(d)) skipH++; else cnt++;
    }
    return { out: false, date: d, calendar: Math.abs(d - start), skipW, skipH };
  }
  // номер тижня за ISO 8601 (тиждень з понеділка, перший тиждень містить 4 січня)
  function isoWeek(n) {
    const wd = A.parts(n).wd, mi = (wd + 6) % 7, thu = n - mi + 3, y = A.parts(thu).y;
    return { year: y, week: Math.floor((thu - A.dnOf(y, 1, 1)) / 7) + 1 };
  }
  root.Ad = { MIN, MAX, inRange, shift, workday, isoWeek };
})();
