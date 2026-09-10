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
    rollsNeeded: "Rolls needed",
    perimeter: "Room perimeter",
    stripsPerRoll: "Strips per roll",
    stripsNeeded: "Strips needed total",
    rolls: "rolls",
    strips: "strips",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    rollsNeeded: "Потрібно рулонів",
    perimeter: "Периметр кімнати",
    stripsPerRoll: "Смуг з одного рулону",
    stripsNeeded: "Всього потрібно смуг",
    rolls: "рул.",
    strips: "смуг",
  };

  // ---------- DOM ----------
  const roomLength = el("roomLength");
  const roomWidth = el("roomWidth");
  const roomHeight = el("roomHeight");
  const rollWidth = el("rollWidth");
  const rollLength = el("rollLength");
  const rapport = el("rapport");

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
    const rLen = parseNum(roomLength?.value);
    const rWid = parseNum(roomWidth?.value);
    const rHei = parseNum(roomHeight?.value);
    const rollW = parseNum(rollWidth?.value) || 0.53;
    const rollL = parseNum(rollLength?.value) || 10.05;
    const rapportCm = parseNum(rapport?.value);

    if (!(rLen > 0) || !(rWid > 0) || !(rHei > 0)) {
      setResult(T.enterInputs, "");
      return;
    }

    const perimeter = 2 * (rLen + rWid);
    const numStrips = Math.ceil(perimeter / rollW);

    // effective strip length with pattern repeat waste
    const rapportM = rapportCm / 100;
    let effectiveStripLength = rHei;
    if (rapportM > 0) {
      // round up ceiling height to nearest multiple of rapport, to account for pattern matching
      effectiveStripLength = Math.ceil(rHei / rapportM) * rapportM;
    }

    const stripsPerRoll = Math.floor(rollL / effectiveStripLength);
    const rollsNeeded = Math.ceil(numStrips / Math.max(1, stripsPerRoll));

    setResult(
      `${T.rollsNeeded}: ${rollsNeeded} ${T.rolls}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.perimeter}</div>
            <div class="m-kpi__v">${fmt(perimeter, 2)} m</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.stripsPerRoll}</div>
            <div class="m-kpi__v">${stripsPerRoll} ${T.strips}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.stripsNeeded}</div>
            <div class="m-kpi__v">${numStrips} ${T.strips}</div>
          </div>
        </div>
      `
    );
  }

  function reset() {
    [roomLength, roomWidth, roomHeight].forEach(x => { if (x) x.value = ""; });
    if (rollWidth) rollWidth.value = "0.53";
    if (rollLength) rollLength.value = "10.05";
    if (rapport) rapport.value = "0";
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
  [roomLength, roomWidth, roomHeight, rollWidth, rollLength, rapport].forEach(x => x?.addEventListener("input", calc));

  btnCalc?.addEventListener("click", calc);
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();