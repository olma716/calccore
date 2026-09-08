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
    enterInputs: "Enter your date of birth to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    futureError: "Birth date must be before the calculation date.",
    yourAge: "Your age",
    years: "years",
    months: "months",
    days: "days",
    totalDays: "Total days lived",
    totalWeeks: "Weeks lived",
    nextBirthday: "Days until next birthday",
    bornOn: "Born on a",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  } : {
    enterInputs: "Введи дату народження для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    futureError: "Дата народження має бути раніше дати розрахунку.",
    yourAge: "Твій вік",
    years: "років",
    months: "місяців",
    days: "днів",
    totalDays: "Всього прожито днів",
    totalWeeks: "Прожито тижнів",
    nextBirthday: "Днів до наступного дня народження",
    bornOn: "Народився(лась) у",
    weekdays: ["неділю", "понеділок", "вівторок", "середу", "четвер", "п'ятницю", "суботу"],
  };

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const birthDate = el("birthDate");
  const toDate = el("toDate");

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

  function calcAgeDiff(birth, to) {
    let years = to.getFullYear() - birth.getFullYear();
    let months = to.getMonth() - birth.getMonth();
    let days = to.getDate() - birth.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = to.getMonth() - 1;
      const prevMonthYear = prevMonth < 0 ? to.getFullYear() - 1 : to.getFullYear();
      const prevMonthIdx = prevMonth < 0 ? 11 : prevMonth;
      days += daysInMonth(prevMonthYear, prevMonthIdx);
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return { years, months, days };
  }

  function calc({ silent = false } = {}) {
    const bdVal = birthDate?.value;
    if (!bdVal) {
      setResult(T.enterInputs, "");
      return;
    }

    const birth = new Date(bdVal + "T00:00:00");
    const to = toDate?.value ? new Date(toDate.value + "T00:00:00") : new Date();
    to.setHours(0, 0, 0, 0);

    if (birth > to) {
      setResult(T.futureError, "");
      return;
    }

    const { years, months, days } = calcAgeDiff(birth, to);

    const totalMs = to - birth;
    const totalDays = Math.floor(totalMs / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);

    // Next birthday
    let nextBday = new Date(to.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBday < to) nextBday = new Date(to.getFullYear() + 1, birth.getMonth(), birth.getDate());
    const daysToNextBday = Math.ceil((nextBday - to) / (1000 * 60 * 60 * 24));

    const weekday = T.weekdays[birth.getDay()];

    setResult(
      `${T.yourAge}: ${years} ${T.years}, ${months} ${T.months}, ${days} ${T.days}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.totalDays}</div>
            <div class="m-kpi__v">${fmt(totalDays)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.totalWeeks}</div>
            <div class="m-kpi__v">${fmt(totalWeeks)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.nextBirthday}</div>
            <div class="m-kpi__v">${fmt(daysToNextBday)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.bornOn}</div>
            <div class="m-kpi__v" style="font-size:15px;">${weekday}</div>
          </div>
        </div>
      `
    );
  }

  function reset() {
    if (birthDate) birthDate.value = "";
    if (toDate) toDate.value = "";

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

  [birthDate, toDate].forEach((x) => x?.addEventListener("input", scheduleAuto));
  [birthDate, toDate].forEach((x) => x?.addEventListener("change", scheduleAuto));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  // ---------- init ----------
  function init() {
    const today = new Date().toISOString().split("T")[0];
    if (toDate) toDate.value = today;
    setResult(T.enterInputs, "");
  }

  init();
})();