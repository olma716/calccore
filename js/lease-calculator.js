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

  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: 0 }) : "—";

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    monthlyPayment: "Monthly lease payment",
    depreciation: "Depreciation part",
    financeCharge: "Finance part",
    residualAmount: "Residual value amount",
    totalCost: "Total lease cost",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    monthlyPayment: "Щомісячний платіж",
    depreciation: "Амортизаційна частина",
    financeCharge: "Фінансова частина",
    residualAmount: "Сума залишкової вартості",
    totalCost: "Загальна вартість лізингу",
  };

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const carPrice = el("carPrice");
  const downPayment = el("downPayment");
  const residualPct = el("residualPct");
  const termMonths = el("termMonths");
  const rate = el("rate");

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

  function calc() {
    const price = parseNum(carPrice?.value);
    const down = parseNum(downPayment?.value);
    const resPct = parseNum(residualPct?.value);
    const months = parseNum(termMonths?.value);
    const annualRate = parseNum(rate?.value);

    if (!(price > 0) || !(months > 0) || !(resPct >= 0 && resPct < 100)) {
      setResult(T.enterInputs, "");
      return;
    }

    const capCost = price - down; // capitalized cost
    const residualAmount = price * (resPct / 100);

    const depreciationTotal = capCost - residualAmount;
    const depreciationMonthly = depreciationTotal / months;

    // finance charge based on average value (cap cost + residual) / 2, monthly rate
    const monthlyRate = (annualRate / 100) / 12;
    const financeMonthly = (capCost + residualAmount) * monthlyRate;

    const monthlyPayment = depreciationMonthly + financeMonthly;
    const totalCost = down + monthlyPayment * months;

    setResult(
      `${T.monthlyPayment}: ${fmt(monthlyPayment)} / ${LANG === "en" ? "mo" : "міс"}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.depreciation}</div>
            <div class="m-kpi__v">${fmt(depreciationMonthly)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.financeCharge}</div>
            <div class="m-kpi__v">${fmt(financeMonthly)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.residualAmount}</div>
            <div class="m-kpi__v">${fmt(residualAmount)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.totalCost}</div>
            <div class="m-kpi__v">${fmt(totalCost)}</div>
          </div>
        </div>
      `
    );
  }

  function reset() {
    [carPrice, downPayment, residualPct, termMonths, rate].forEach(x => { if (x) x.value = ""; });
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
    autoTimer = setTimeout(calc, 180);
  }

  [carPrice, downPayment, residualPct, termMonths, rate].forEach(x => x?.addEventListener("input", scheduleAuto));

  btnCalc?.addEventListener("click", calc);
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();