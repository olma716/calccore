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
    dueDate: "Estimated due date",
    currentWeek: "Current week",
    trimester: "Trimester",
    daysLeft: "Days remaining",
    weeksShort: "wk",
    daysShort: "d",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    trimesters: ["1st trimester", "2nd trimester", "3rd trimester", "Past due date"],
    notPregnantYet: "Not pregnant yet based on this date",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    dueDate: "Орієнтовна дата пологів",
    currentWeek: "Поточний тиждень",
    trimester: "Триместр",
    daysLeft: "Днів залишилось",
    weeksShort: "тиж",
    daysShort: "дн",
    months: ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"],
    trimesters: ["1-й триместр", "2-й триместр", "3-й триместр", "Термін пройшов"],
    notPregnantYet: "Дата ще не настала за цими даними",
  };

  // ---------- DOM ----------
  const method = el("method");
  const lmpWrap = el("lmpWrap");
  const conceptionWrap = el("conceptionWrap");
  const usDateWrap = el("usDateWrap");
  const usWeeksWrap = el("usWeeksWrap");
  const usDaysWrap = el("usDaysWrap");

  const lmpDate = el("lmpDate");
  const conceptionDate = el("conceptionDate");
  const usDate = el("usDate");
  const usWeeks = el("usWeeks");
  const usDays = el("usDays");

  const btnCalc = el("btnCalc");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function applyMethodUI() {
    const m = method?.value || "lmp";
    lmpWrap.style.display = m === "lmp" ? "" : "none";
    conceptionWrap.style.display = m === "conception" ? "" : "none";
    usDateWrap.style.display = m === "ultrasound" ? "" : "none";
    usWeeksWrap.style.display = m === "ultrasound" ? "" : "none";
    usDaysWrap.style.display = m === "ultrasound" ? "" : "none";
  }

  function formatDate(d) {
    return `${d.getDate()} ${T.months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function calc() {
    const m = method?.value || "lmp";
    let dueDate = null;
    let conceptionAt = null; // date representing conception for week calc

    if (m === "lmp") {
      const val = lmpDate?.value;
      if (!val) { setResult(T.enterInputs, ""); return; }
      const lmp = new Date(val + "T00:00:00");
      dueDate = new Date(lmp);
      dueDate.setDate(dueDate.getDate() + 280);
      conceptionAt = lmp; // week counting starts from LMP (gestational age)
    }

    if (m === "conception") {
      const val = conceptionDate?.value;
      if (!val) { setResult(T.enterInputs, ""); return; }
      const conc = new Date(val + "T00:00:00");
      dueDate = new Date(conc);
      dueDate.setDate(dueDate.getDate() + 266);
      // gestational age counts from 2 weeks before conception
      conceptionAt = new Date(conc);
      conceptionAt.setDate(conceptionAt.getDate() - 14);
    }

    if (m === "ultrasound") {
      const val = usDate?.value;
      const wks = parseNum(usWeeks?.value);
      const dys = parseNum(usDays?.value);
      if (!val || !(wks > 0)) { setResult(T.enterInputs, ""); return; }
      const scanDate = new Date(val + "T00:00:00");
      const gestDaysAtScan = wks * 7 + dys;
      // LMP-equivalent = scanDate - gestDaysAtScan
      const lmpEquivalent = new Date(scanDate);
      lmpEquivalent.setDate(lmpEquivalent.getDate() - gestDaysAtScan);
      dueDate = new Date(lmpEquivalent);
      dueDate.setDate(dueDate.getDate() + 280);
      conceptionAt = lmpEquivalent;
    }

    if (!dueDate) { setResult(T.enterInputs, ""); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const gestDays = Math.floor((today - conceptionAt) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    let weekLabel = "—";
    let trimesterLabel = T.trimesters[3];

    if (gestDays >= 0) {
      const weeks = Math.floor(gestDays / 7);
      const days = gestDays % 7;
      weekLabel = `${weeks} ${T.weeksShort} ${days} ${T.daysShort}`;
      if (weeks < 13) trimesterLabel = T.trimesters[0];
      else if (weeks < 27) trimesterLabel = T.trimesters[1];
      else if (weeks <= 42) trimesterLabel = T.trimesters[2];
    } else {
      weekLabel = T.notPregnantYet;
    }

    setResult(
      `${T.dueDate}: ${formatDate(dueDate)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.currentWeek}</div>
            <div class="m-kpi__v" style="font-size:15px;">${weekLabel}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.trimester}</div>
            <div class="m-kpi__v" style="font-size:15px;">${trimesterLabel}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.daysLeft}</div>
            <div class="m-kpi__v">${daysLeft > 0 ? daysLeft : 0}</div>
          </div>
        </div>
      `
    );
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
  method?.addEventListener("change", () => { applyMethodUI(); calc(); });
  [lmpDate, conceptionDate, usDate, usWeeks, usDays].forEach(x => {
    x?.addEventListener("input", calc);
    x?.addEventListener("change", calc);
  });

  btnCalc?.addEventListener("click", calc);
  btnCopy?.addEventListener("click", copyResult);

  // ---------- init ----------
  applyMethodUI();
  setResult(T.enterInputs, "");
})();