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

  const fmt = (n, digits = 2) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: digits }) : "—";

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    sheetsNeeded: "Sheets needed",
    sheetArea: "Single sheet area",
    approxScrews: "Approx. screws needed",
    sheets: "sheets",
    pcs: "pcs",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    sheetsNeeded: "Потрібно листів",
    sheetArea: "Площа одного листа",
    approxScrews: "Орієнтовно саморізів",
    sheets: "лист.",
    pcs: "шт",
  };

  const SCREWS_PER_SHEET = 45;

  // ---------- DOM ----------
  const area = el("area");
  const sheetLength = el("sheetLength");
  const sheetWidth = el("sheetWidth");
  const layers = el("layers");
  const wastage = el("wastage");

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
    const surfaceArea = parseNum(area?.value);
    const sLen = parseNum(sheetLength?.value) || 2.5;
    const sWid = parseNum(sheetWidth?.value) || 1.2;
    const numLayers = parseNum(layers?.value) || 1;
    const waste = parseNum(wastage?.value) || 10;

    if (!(surfaceArea > 0)) {
      setResult(T.enterInputs, "");
      return;
    }

    const sheetArea = sLen * sWid;
    const totalAreaNeeded = surfaceArea * numLayers * (1 + waste / 100);
    const sheetsNeeded = Math.ceil(totalAreaNeeded / sheetArea);
    const screwsNeeded = sheetsNeeded * SCREWS_PER_SHEET;

    setResult(
      `${T.sheetsNeeded}: ${sheetsNeeded} ${T.sheets}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.sheetArea}</div>
            <div class="m-kpi__v">${fmt(sheetArea)} m²</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.approxScrews}</div>
            <div class="m-kpi__v">${screwsNeeded} ${T.pcs}</div>
          </div>
        </div>
      `
    );
  }

  function reset() {
    if (area) area.value = "";
    if (sheetLength) sheetLength.value = "2.5";
    if (sheetWidth) sheetWidth.value = "1.2";
    if (layers) layers.value = "1";
    if (wastage) wastage.value = "10";
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
  [area, sheetLength, sheetWidth, wastage].forEach(x => x?.addEventListener("input", calc));
  layers?.addEventListener("change", calc);

  btnCalc?.addEventListener("click", calc);
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();