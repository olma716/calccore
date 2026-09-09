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
  } : {
    enterInputs: "Введи дані для розрахунку.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    ovulationDay: "Орієнтовний день овуляції",
    fertileWindow: "Фертильне вікно",
    nextPeriod: "Наступна очікувана менструація",
    to: "по",
    months: ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"],
  };

  // ---------- DOM ----------
  const lastPeriod = el("lastPeriod");
  const cycleLength = el("cycleLength");
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

  function formatDate(d) {
    return `${d.getDate()} ${T.months[d.getMonth()]}`;
  }

  function calc() {
    const val = lastPeriod?.value;
    const cycle = parseNum(cycleLength?.value) || 28;

    if (!val) {
      setResult(T.enterInputs, "");
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