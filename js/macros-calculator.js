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

  const fmt = (n) => Number.isFinite(n) ? Math.round(n) : "—";

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    yourMacros: "Your daily macros",
    protein: "Protein",
    carbs: "Carbs",
    fat: "Fat",
    perDay: "g/day",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    yourMacros: "Твоя денна норма БЖУ",
    protein: "Білки",
    carbs: "Вуглеводи",
    fat: "Жири",
    perDay: "г/день",
  };

  // Protein g/kg and fat % by goal
  const GOAL_PARAMS = {
    loss: { proteinPerKg: 2.0, fatPct: 0.30 },
    maintain: { proteinPerKg: 1.8, fatPct: 0.30 },
    gain: { proteinPerKg: 1.8, fatPct: 0.25 },
  };

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const calories = el("calories");
  const weight = el("weight");
  const goal = el("goal");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const macrosBar = el("macrosBar");
  const macrosLegend = el("macrosLegend");
  const barProtein = el("barProtein");
  const barCarbs = el("barCarbs");
  const barFat = el("barFat");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function calc({ silent = false } = {}) {
    const cal = parseNum(calories?.value);
    const w = parseNum(weight?.value);
    const g = goal?.value || "maintain";

    if (!(cal > 0) || !(w > 0)) {
      setResult(T.enterInputs, "");
      if (macrosBar) macrosBar.style.display = "none";
      if (macrosLegend) macrosLegend.style.display = "none";
      return;
    }

    const params = GOAL_PARAMS[g];

    // Protein: g/kg * weight
    const proteinG = params.proteinPerKg * w;
    const proteinKcal = proteinG * 4;

    // Fat: % of total calories
    const fatKcal = cal * params.fatPct;
    const fatG = fatKcal / 9;

    // Carbs: remainder
    const carbsKcal = Math.max(0, cal - proteinKcal - fatKcal);
    const carbsG = carbsKcal / 4;

    const proteinPct = (proteinKcal / cal) * 100;
    const fatPct = (fatKcal / cal) * 100;
    const carbsPct = (carbsKcal / cal) * 100;

    setResult(
      `${T.yourMacros}: ${fmt(cal)} kcal`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.protein}</div>
            <div class="m-kpi__v">${fmt(proteinG)} ${T.perDay}</div>
            <div class="m-kpi__s">${fmt(proteinPct)}%</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.carbs}</div>
            <div class="m-kpi__v">${fmt(carbsG)} ${T.perDay}</div>
            <div class="m-kpi__s">${fmt(carbsPct)}%</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.fat}</div>
            <div class="m-kpi__v">${fmt(fatG)} ${T.perDay}</div>
            <div class="m-kpi__s">${fmt(fatPct)}%</div>
          </div>
        </div>
      `
    );

    if (macrosBar) {
      macrosBar.style.display = "flex";
      if (barProtein) barProtein.style.flexBasis = proteinPct + "%";
      if (barCarbs) barCarbs.style.flexBasis = carbsPct + "%";
      if (barFat) barFat.style.flexBasis = fatPct + "%";
    }
    if (macrosLegend) macrosLegend.style.display = "flex";
  }

  function reset() {
    if (calories) calories.value = "";
    if (weight) weight.value = "";
    if (goal) goal.value = "maintain";

    setToast(T.resetDone);
    setResult(T.enterInputs, "");
    if (macrosBar) macrosBar.style.display = "none";
    if (macrosLegend) macrosLegend.style.display = "none";

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

  [calories, weight].forEach((x) => x?.addEventListener("input", scheduleAuto));
  goal?.addEventListener("change", scheduleAuto);

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  setResult(T.enterInputs, "");
})();