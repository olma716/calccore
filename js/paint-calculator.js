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
    litersNeeded: "Paint needed",
    wallArea: "Wall area (net)",
    totalArea: "Total area to paint",
    liters: "L",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    litersNeeded: "Потрібно фарби",
    wallArea: "Площа стін (чиста)",
    totalArea: "Загальна площа до фарбування",
    liters: "л",
  };

  // ---------- DOM ----------
  const roomLength = el("roomLength");
  const roomWidth = el("roomWidth");
  const roomHeight = el("roomHeight");
  const openings = el("openings");
  const coats = el("coats");
  const coverage = el("coverage");
  const includeCeiling = el("includeCeiling");

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
    const length = parseNum(roomLength?.value);
    const width = parseNum(roomWidth?.value);
    const height = parseNum(roomHeight?.value);
    const openingsArea = parseNum(openings?.value);
    const numCoats = parseNum(coats?.value) || 2;
    const coveragePerM2 = parseNum(coverage?.value) || 0.12;
    const paintCeiling = includeCeiling?.checked;

    if (!(length > 0) || !(width > 0) || !(height > 0)) {
      setResult(T.enterInputs, "");
      return;
    }

    const perimeter = 2 * (length + width);
    const wallArea = Math.max(0, perimeter * height - openingsArea);
    const ceilingArea = paintCeiling ? length * width : 0;

    const totalArea = wallArea + ceilingArea;
    const litersNeeded = totalArea * numCoats * coveragePerM2;

    setResult(
      `${T.litersNeeded}: ${fmt(litersNeeded)} ${T.liters}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.wallArea}</div>
            <div class="m-kpi__v">${fmt(wallArea)} m²</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.totalArea}</div>
            <div class="m-kpi__v">${fmt(totalArea)} m²</div>
          </div>
        </div>
      `
    );
  }

  function reset() {
    [roomLength, roomWidth, roomHeight, openings].forEach(x => { if (x) x.value = ""; });
    if (coats) coats.value = "2";
    if (coverage) coverage.value = "0.12";
    if (includeCeiling) includeCeiling.checked = false;
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
  [roomLength, roomWidth, roomHeight, openings, coverage].forEach(x => x?.addEventListener("input", calc));
  [coats, includeCeiling].forEach(x => x?.addEventListener("change", calc));

  btnCalc?.addEventListener("click", calc);
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();