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

  const fmt = (n, digits = 1) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: digits }) : "—";

  // Weight per meter (kg/m) by diameter (mm) - standard reference values
  const WEIGHT_PER_M = {
    6: 0.222,
    8: 0.395,
    10: 0.617,
    12: 0.888,
    14: 1.21,
    16: 1.58,
  };

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    totalLength: "Total rebar length",
    totalWeight: "Total weight",
    totalBars: "Total number of bars",
    m: "m",
    kg: "kg",
    pcs: "pcs",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    totalLength: "Загальна довжина арматури",
    totalWeight: "Загальна вага",
    totalBars: "Загальна кількість прутків",
    m: "м",
    kg: "кг",
    pcs: "шт",
  };

  // ---------- DOM ----------
  const areaLength = el("areaLength");
  const areaWidth = el("areaWidth");
  const spacing = el("spacing");
  const diameter = el("diameter");
  const layers = el("layers");

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
    const len = parseNum(areaLength?.value);
    const wid = parseNum(areaWidth?.value);
    const spacingCm = parseNum(spacing?.value) || 20;
    const dia = Number(diameter?.value) || 8;
    const numLayers = Number(layers?.value) || 1;

    if (!(len > 0) || !(wid > 0)) {
      setResult(T.enterInputs, "");
      return;
    }

    const spacingM = spacingCm / 100;

    // Number of bars running along width (spaced along length) and vice versa
    const barsAlongLength = Math.floor(len / spacingM) + 1;
    const barsAlongWidth = Math.floor(wid / spacingM) + 1;

    // Bars along length run parallel to length (their count is barsAlongWidth), each has length = len
    // Bars along width run parallel to width (their count is barsAlongLength), each has length = wid
    const totalLengthOneLayer = (barsAlongWidth * len) + (barsAlongLength * wid);
    const totalBarsOneLayer = barsAlongWidth + barsAlongLength;

    const totalLength = totalLengthOneLayer * numLayers;
    const totalBars = totalBarsOneLayer * numLayers;

    const weightPerM = WEIGHT_PER_M[dia] || 0.395;
    const totalWeight = totalLength * weightPerM;

    setResult(
      `${T.totalWeight}: ${fmt(totalWeight)} ${T.kg}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.totalLength}</div>
            <div class="m-kpi__v">${fmt(totalLength)} ${T.m}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.totalBars}</div>
            <div class="m-kpi__v">${totalBars} ${T.pcs}</div>
          </div>
        </div>
      `
    );
  }

  function reset() {
    [areaLength, areaWidth].forEach(x => { if (x) x.value = ""; });
    if (spacing) spacing.value = "20";
    if (diameter) diameter.value = "8";
    if (layers) layers.value = "1";
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

  // ---------- events ----------
  [areaLength, areaWidth, spacing].forEach(x => x?.addEventListener("input", calc));
  [diameter, layers].forEach(x => x?.addEventListener("change", calc));

  btnCalc?.addEventListener("click", calc);
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();