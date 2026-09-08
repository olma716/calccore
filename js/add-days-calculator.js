(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const parseNum = (val) => {
    if (val == null) return 0;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const T = LANG === "en" ? {
    enterInputs: "Enter a date and amount to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    resultDate: "Resulting date",
    dayOfWeek: "Day of the week",
    daysFromToday: "Days from today",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  } : {
    enterInputs: "Введи дату та кількість для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    resultDate: "Результуюча дата",
    dayOfWeek: "День тижня",
    daysFromToday: "Днів від сьогодні",
    weekdays: ["неділя", "понеділок", "вівторок", "середа", "четвер", "п'ятниця", "субота"],
    months: ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"],
  };

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const startDate = el("startDate");
  const operation = el("operation");
  const amount = el("amount");
  const unit = el("unit");

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

  function formatDate(d) {
    return `${d.getDate()} ${T.months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function calc({ silent = false } = {}) {
    const startVal = startDate?.value;
    const amt = parseNum(amount?.value);
    const op = operation?.value || "add";
    const u = unit?.value || "days";

    if (!startVal || !(amt > 0)) {
      setResult(T.enterInputs, "");
      return;
    }

    const base = new Date(startVal + "T00:00:00");
    const sign = op === "subtract" ? -1 : 1;
    const result = new Date(base);

    if (u === "days") result.setDate(result.getDate() + sign * amt);
    if (u === "weeks") result.setDate(result.getDate() + sign * amt * 7);
    if (u === "months") result.setMonth(result.getMonth() + sign * amt);
    if (u === "years") result.setFullYear(result.getFullYear() + sign * amt);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resultMidnight = new Date(result);
    resultMidnight.setHours(0, 0, 0, 0);
    const daysFromToday = Math.round((resultMidnight - today) / (1000 * 60 * 60 * 24));

    const weekday = T.weekdays[result.getDay()];

    setResult(
      `${T.resultDate}: ${formatDate(result)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.dayOfWeek}</div>
            <div class="m-kpi__v" style="font-size:15px;">${weekday}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.daysFromToday}</div>
            <div class="m-kpi__v">${daysFromToday > 0 ? "+" : ""}${daysFromToday}</div>
          </div>
        </div>
      `
    );
  }

  function reset() {
    if (startDate) startDate.value = "";
    if (operation) operation.value = "add";
    if (amount) amount.value = "";
    if (unit) unit.value = "days";

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

  [startDate, amount].forEach((x) => x?.addEventListener("input", scheduleAuto));
  [startDate, operation, unit].forEach((x) => x?.addEventListener("change", scheduleAuto));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  // ---------- init ----------
  function init() {
    const today = new Date().toISOString().split("T")[0];
    if (startDate) startDate.value = today;
    setResult(T.enterInputs, "");
  }

  init();
})();