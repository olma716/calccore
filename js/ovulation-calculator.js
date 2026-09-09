(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const parseNum = (val) => {
    if (val == null) return 0;
    const n = Number(String(val).replace(/[^\d]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    ovulationDay: "Estimated ovulation day",
    fertileWindow: "Fertile window",
    nextPeriod: "Next expected period",
    to: "to",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    legendPeriod: "Period",
    legendFertile: "Fertile window",
    legendOvulation: "Ovulation",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    ovulationDay: "Орієнтовний день овуляції",
    fertileWindow: "Фертильне вікно",
    nextPeriod: "Наступна очікувана менструація",
    to: "по",
    months: ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"],
    weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"],
    legendPeriod: "Менструація",
    legendFertile: "Фертильне вікно",
    legendOvulation: "Овуляція",
  };

  // ---------- DOM ----------
  const lastPeriod = el("lastPeriod");
  const cycleLength = el("cycleLength");
  const btnCalc = el("btnCalc");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");
  const calendarEl = el("ovulCalendar");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function formatDate(d) {
    return `${d.getDate()} ${T.months[d.getMonth()]}`;
  }

  function dateKey(d) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function buildMonthGrid(year, month, dayClasses) {
    const firstDay = new Date(year, month, 1);
    // convert Sunday=0 to Monday-first index
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let cells = "";
    for (let i = 0; i < startOffset; i++) {
      cells += `<div class="ovul-day ovul-day--empty"></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${month}-${day}`;
      const cls = dayClasses[key] ? ` ${dayClasses[key]}` : "";
      cells += `<div class="ovul-day${cls}">${day}</div>`;
    }

    const weekdayHtml = T.weekdays.map(w => `<div class="ovul-weekday">${w}</div>`).join("");

    return `
      <div class="ovul-month">
        <div class="ovul-month__title">${T.months[month]} ${year}</div>
        <div class="ovul-grid">
          ${weekdayHtml}
          ${cells}
        </div>
      </div>
    `;
  }

  function renderCalendar(lmp, periodDays, fertileStart, fertileEnd, ovulationDay, nextPeriod) {
    if (!calendarEl) return;

    const dayClasses = {};

    // mark last period (assume ~5 days)
    for (let i = 0; i < 5; i++) {
      const d = new Date(lmp);
      d.setDate(d.getDate() + i);
      dayClasses[dateKey(d)] = "ovul-day--period";
    }

    // mark fertile window
    let cur = new Date(fertileStart);
    while (cur <= fertileEnd) {
      dayClasses[dateKey(cur)] = "ovul-day--fertile";
      cur = new Date(cur);
      cur.setDate(cur.getDate() + 1);
    }

    // mark ovulation day (overrides fertile styling)
    dayClasses[dateKey(ovulationDay)] = "ovul-day--ovulation";

    // mark next period start (~5 days)
    for (let i = 0; i < 5; i++) {
      const d = new Date(nextPeriod);
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      if (!dayClasses[key]) dayClasses[key] = "ovul-day--period";
    }

    // determine which months to render (from lmp month to nextPeriod month)
    const months = [];
    const startM = new Date(lmp.getFullYear(), lmp.getMonth(), 1);
    const endM = new Date(nextPeriod.getFullYear(), nextPeriod.getMonth(), 1);
    let cursor = new Date(startM);
    while (cursor <= endM) {
      months.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    const monthsHtml = months.map(m => buildMonthGrid(m.year, m.month, dayClasses)).join("");

    calendarEl.innerHTML = `
      ${monthsHtml}
      <div class="ovul-legend">
        <span class="ovul-legend__item"><span class="ovul-legend__dot ovul-legend__dot--period"></span>${T.legendPeriod}</span>
        <span class="ovul-legend__item"><span class="ovul-legend__dot ovul-legend__dot--fertile"></span>${T.legendFertile}</span>
        <span class="ovul-legend__item"><span class="ovul-legend__dot ovul-legend__dot--ovulation"></span>${T.legendOvulation}</span>
      </div>
    `;
  }

  function calc() {
    const val = lastPeriod?.value;
    const cycle = parseNum(cycleLength?.value) || 28;

    if (!val) {
      setResult(T.enterInputs, "");
      if (calendarEl) calendarEl.innerHTML = "";
      return;
    }

    const lmp = new Date(val + "T00:00:00");
    const nextPeriod = new Date(lmp);
    nextPeriod.setDate(nextPeriod.getDate() + cycle);

    const ovulationDay = new Date(nextPeriod);
    ovulationDay.setDate(ovulationDay.getDate() - 14);

    const fertileStart = new Date(ovulationDay);
    fertileStart.setDate(fertileStart.getDate() - 5);

    const fertileEnd = new Date(ovulationDay);
    fertileEnd.setDate(fertileEnd.getDate() + 1);

    setResult(
      `${T.ovulationDay}: ${formatDate(ovulationDay)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.fertileWindow}</div>
            <div class="m-kpi__v" style="font-size:15px;">${formatDate(fertileStart)} ${T.to} ${formatDate(fertileEnd)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.nextPeriod}</div>
            <div class="m-kpi__v" style="font-size:15px;">${formatDate(nextPeriod)}</div>
          </div>
        </div>
      `
    );

    renderCalendar(lmp, 5, fertileStart, fertileEnd, ovulationDay, nextPeriod);
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
  [lastPeriod, cycleLength].forEach(x => {
    x?.addEventListener("input", calc);
    x?.addEventListener("change", calc);
  });

  btnCalc?.addEventListener("click", calc);
  btnCopy?.addEventListener("click", copyResult);

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();