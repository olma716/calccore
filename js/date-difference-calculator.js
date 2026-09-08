(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString(LOCALE) : "—";

  const T = LANG === "en" ? {
    enterInputs: "Enter two dates to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    totalDays: "Total days",
    breakdown: "Breakdown",
    years: "years",
    months: "months",
    days: "days",
    weeks: "Weeks",
    businessDays: "Business days",
    sameDate: "Same date — 0 days difference.",
  } : {
    enterInputs: "Введи дві дати для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    totalDays: "Всього днів",
    breakdown: "Розбивка",
    years: "років",
    months: "місяців",
    days: "днів",
    weeks: "Тижнів",
    businessDays: "Робочих днів",
    sameDate: "Однакова дата — різниця 0 днів.",
  };

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const dateFrom = el("dateFrom");
  const dateTo = el("dateTo");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function calcYMD(start, end) {
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = end.getMonth() - 1;
      const prevMonthYear = prevMonth < 0 ? end.getFullYear() - 1 : end.getFullYear();
      const prevMonthIdx = prevMonth < 0 ? 11 : prevMonth;
      days += daysInMonth(prevMonthYear, prevMonthIdx);
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return { years, months, days };
  }

  function countBusinessDays(start, end) {
    let count = 0;
    const cur = new Date(start);
    while (cur < end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  function calc({ silent = false } = {}) {
    const fromVal = dateFrom?.value;
    const toVal = dateTo?.value;

    if (!fromVal || !toVal) {
      setResult(T.enterInputs, "");
      return;
    }

    let d1 = new Date(fromVal + "T00:00:00");
    let d2 = new Date(toVal + "T00:00:00");

    if (d1.getTime() === d2.getTime()) {
      setResult(T.sameDate, "");
      return;
    }

    // ensure earlier date first
    const [start, end] = d1 <= d2 ? [d1, d2] : [d2, d1];

    const totalMs = end - start;
    const totalDays = Math.round(totalMs / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const businessDays = countBusinessDays(start, end);

    const { years, months, days } = calcYMD(start, end);

    setResult(
      `${T.totalDays}: ${fmt(totalDays)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.breakdown}</div>
            <div class="m-kpi__v" style="font-size:15px;">${years} ${T.years}, ${months} ${T.months}, ${days} ${T.days}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.weeks}</div>
            <div class="m-kpi__v">${fmt(totalWeeks)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.businessDays}</div>
            <div class="m-kpi__v">${fmt(businessDays)}</div>
          </div>
        </div>
      `
    );
  }

  function reset() {
    if (dateFrom) dateFrom.value = "";
    if (dateTo) dateTo.value = "";

    setToast(T.resetDone);
    setResult(T.enterInputs, "");

    setTimeout(() => setToast(""), 1200);
  }

  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      setToast(T.copied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.copyFailed);
    }
  }

  // ---------- auto calc ----------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  [dateFrom, dateTo].forEach((x) => x?.addEventListener("input", scheduleAuto));
  [dateFrom, dateTo].forEach((x) => x?.addEventListener("change", scheduleAuto));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();