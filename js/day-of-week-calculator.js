(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    enterInputs: "Enter a date to calculate.",
    resetToast: "Set to today.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    itWasIs: "That date is a",
    weekend: "Weekend",
    weekday: "Weekday",
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  } : {
    enterInputs: "Введи дату для розрахунку.",
    resetToast: "Встановлено сьогодні.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    itWasIs: "Ця дата — це",
    weekend: "Вихідний",
    weekday: "Робочий день",
    weekdays: ["неділя", "понеділок", "вівторок", "середа", "четвер", "п'ятниця", "субота"],
    months: ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"],
  };

  // ---------- DOM ----------
  const checkDate = el("checkDate");
  const btnCalc = el("btnCalc");
  const btnToday = el("btnToday");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function calc() {
    const val = checkDate?.value;
    if (!val) {
      setResult(T.enterInputs, "");
      return;
    }

    const d = new Date(val + "T00:00:00");
    const dayIdx = d.getDay();
    const weekdayName = T.weekdays[dayIdx];
    const isWeekend = dayIdx === 0 || dayIdx === 6;

    const formattedDate = `${d.getDate()} ${T.months[d.getMonth()]} ${d.getFullYear()}`;

    setResult(
      `${formattedDate} — ${weekdayName}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.itWasIs}</div>
            <div class="m-kpi__v" style="font-size:18px; text-transform:capitalize;">${weekdayName}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${LANG === "en" ? "Type" : "Тип"}</div>
            <div class="m-kpi__v" style="font-size:15px;">${isWeekend ? T.weekend : T.weekday}</div>
          </div>
        </div>
      `
    );
  }

  function setToday() {
    const today = new Date().toISOString().split("T")[0];
    if (checkDate) checkDate.value = today;
    setToast(T.resetToast);
    calc();
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

  // ---------- events ----------
  checkDate?.addEventListener("input", calc);
  checkDate?.addEventListener("change", calc);

  btnCalc?.addEventListener("click", calc);
  btnToday?.addEventListener("click", setToday);
  btnCopy?.addEventListener("click", copyResult);

  // ---------- init ----------
  function init() {
    const today = new Date().toISOString().split("T")[0];
    if (checkDate) checkDate.value = today;
    calc();
  }

  init();
})();