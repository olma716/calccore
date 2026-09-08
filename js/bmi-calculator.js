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

  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: 1 }) : "—";

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    yourBmi: "Your BMI",
    category: "Category",
    categories: {
      under: "Underweight",
      normal: "Normal weight",
      over: "Overweight",
      obese: "Obese",
    },
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    yourBmi: "Твій ІМТ",
    category: "Категорія",
    categories: {
      under: "Недостатня вага",
      normal: "Норма",
      over: "Надлишкова вага",
      obese: "Ожиріння",
    },
  };

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const weight = el("weight");
  const height = el("height");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const bmiScale = el("bmiScale");
  const bmiMarker = el("bmiMarker");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function getCategory(bmi) {
    if (bmi < 18.5) return { key: "under", color: "#60a5fa" };
    if (bmi < 25) return { key: "normal", color: "#34d399" };
    if (bmi < 30) return { key: "over", color: "#fbbf24" };
    return { key: "obese", color: "#f87171" };
  }

  function updateMarker(bmi) {
    // scale range 16 to 40
    const min = 16, max = 40;
    const clamped = Math.max(min, Math.min(max, bmi));
    const pct = ((clamped - min) / (max - min)) * 100;
    if (bmiMarker) bmiMarker.style.left = pct + "%";
  }

  function calc({ silent = false } = {}) {
    const w = parseNum(weight?.value);
    const h = parseNum(height?.value);

    if (!(w > 0) || !(h > 0)) {
      setResult(T.enterInputs, "");
      if (bmiScale) bmiScale.style.display = "none";
      return;
    }

    const hM = h / 100;
    const bmi = w / (hM * hM);
    const cat = getCategory(bmi);
    const catLabel = T.categories[cat.key];

    setResult(
      `${T.yourBmi}: ${fmt(bmi)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.category}</div>
            <div class="m-kpi__v" style="color:${cat.color};">${catLabel}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">BMI</div>
            <div class="m-kpi__v">${fmt(bmi)}</div>
          </div>
        </div>
      `
    );

    if (bmiScale) bmiScale.style.display = "";
    updateMarker(bmi);
  }

  function reset() {
    if (weight) weight.value = "";
    if (height) height.value = "";

    setToast(T.resetDone);
    setResult(T.enterInputs, "");
    if (bmiScale) bmiScale.style.display = "none";

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

  [weight, height].forEach((x) => x?.addEventListener("input", scheduleAuto));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  setResult(T.enterInputs, "");
})();