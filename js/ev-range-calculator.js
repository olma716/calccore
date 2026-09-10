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
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    estimatedRange: "Estimated range",
    baseRange: "Base range (no adjustment)",
    conditionFactor: "Condition adjustment",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    estimatedRange: "Орієнтовний запас ходу",
    baseRange: "Базовий запас ходу (без коригування)",
    conditionFactor: "Коригування за умовами",
  };

  // Adjustment factors for driving conditions
  const CONDITION_FACTORS = {
    mixed: 1.0,
    city: 1.05,     // slightly better in city due to regen braking
    highway: 0.85,  // worse on highway due to aero drag at speed
    winter: 0.65,   // significant reduction due to cold + heating
  };

  // ---------- DOM ----------
  const batteryCapacity = el("batteryCapacity");
  const consumption = el("consumption");
  const chargeLevel = el("chargeLevel");
  const conditions = el("conditions");

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

  function calc() {
    const capacity = parseNum(batteryCapacity?.value);
    const cons = parseNum(consumption?.value);
    const charge = parseNum(chargeLevel?.value) || 100;
    const cond = conditions?.value || "mixed";

    if (!(capacity > 0) || !(cons > 0)) {
      setResult(T.enterInputs, "");
      return;
    }

    const usableEnergy = capacity * (charge / 100);
    const baseRange = (usableEnergy / cons) * 100;
    const factor = CONDITION_FACTORS[cond];
    const adjustedRange = baseRange * factor;

    setResult(
      `${T.estimatedRange}: ${fmt(adjustedRange)} km`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.baseRange}</div>
            <div class="m-kpi__v">${fmt(baseRange)} km</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.conditionFactor}</div>
            <div class="m-kpi__v">×${factor.toFixed(2)}</div>
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
  [batteryCapacity, consumption, chargeLevel].forEach(x => x?.addEventListener("input", calc));
  conditions?.addEventListener("change", calc);

  btnCalc?.addEventListener("click", calc);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();