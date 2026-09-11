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

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    roofArea: "Roof area (with overlap)",
    footprintArea: "House footprint area",
    netRoofArea: "Net roof area (no overlap)",
    m2: "m²",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    roofArea: "Площа даху (з запасом)",
    footprintArea: "Площа основи будинку",
    netRoofArea: "Чиста площа даху (без запасу)",
    m2: "m²",
  };

  // ---------- DOM ----------
  const houseLength = el("houseLength");
  const houseWidth = el("houseWidth");
  const pitch = el("pitch");
  const overhang = el("overhang");
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
    const length = parseNum(houseLength?.value);
    const width = parseNum(houseWidth?.value);
    const pitchDeg = parseNum(pitch?.value) || 30;
    const overhangM = parseNum(overhang?.value) || 0;
    const waste = parseNum(wastage?.value) || 10;

    if (!(length > 0) || !(width > 0)) {
      setResult(T.enterInputs, "");
      return;
    }

    const effLength = length + overhangM * 2;
    const effWidth = width + overhangM * 2;
    const footprintArea = effLength * effWidth;

    const pitchRad = (pitchDeg * Math.PI) / 180;
    const netRoofArea = footprintArea / Math.cos(pitchRad);

    const roofAreaWithWaste = netRoofArea * (1 + waste / 100);

    setResult(
      `${T.roofArea}: ${fmt(roofAreaWithWaste)} ${T.m2}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.footprintArea}</div>
            <div class="m-kpi__v">${fmt(footprintArea)} ${T.m2}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.netRoofArea}</div>
            <div class="m-kpi__v">${fmt(netRoofArea)} ${T.m2}</div>
          </div>
        </div>
      `
    );
  }

  function reset() {
    [houseLength, houseWidth].forEach(x => { if (x) x.value = ""; });
    if (pitch) pitch.value = "30";
    if (overhang) overhang.value = "0.5";
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
  [houseLength, houseWidth, pitch, overhang, wastage].forEach(x => x?.addEventListener("input", calc));

  btnCalc?.addEventListener("click", calc);
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();