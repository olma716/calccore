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
    tilesNeeded: "Tiles needed",
    roomArea: "Room area",
    tileArea: "Single tile area",
    boxesNeeded: "Boxes needed",
    pcs: "pcs",
    boxes: "boxes",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    tilesNeeded: "Потрібно плиток",
    roomArea: "Площа приміщення",
    tileArea: "Площа однієї плитки",
    boxesNeeded: "Потрібно упаковок",
    pcs: "шт",
    boxes: "уп.",
  };

  // ---------- DOM ----------
  const roomLength = el("roomLength");
  const roomWidth = el("roomWidth");
  const tileLength = el("tileLength");
  const tileWidth = el("tileWidth");
  const wastage = el("wastage");
  const tilesPerBox = el("tilesPerBox");

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
    const tLen = parseNum(tileLength?.value);
    const tWid = parseNum(tileWidth?.value);
    const waste = parseNum(wastage?.value) || 10;
    const perBox = parseNum(tilesPerBox?.value);

    if (!(rLen > 0) || !(rWid > 0) || !(tLen > 0) || !(tWid > 0)) {
      setResult(T.enterInputs, "");
      return;
    }

    const roomArea = rLen * rWid;
    const tileAreaM2 = (tLen / 100) * (tWid / 100);

    const rawTiles = roomArea / tileAreaM2;
    const tilesWithWaste = Math.ceil(rawTiles * (1 + waste / 100));

    let boxesHtml = "";
    if (perBox > 0) {
      const boxesNeeded = Math.ceil(tilesWithWaste / perBox);
      boxesHtml = `
        <div class="m-kpi">
          <div class="m-kpi__k">${T.boxesNeeded}</div>
          <div class="m-kpi__v">${boxesNeeded} ${T.boxes}</div>
        </div>
      `;
    }

    setResult(
      `${T.tilesNeeded}: ${tilesWithWaste} ${T.pcs}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.roomArea}</div>
            <div class="m-kpi__v">${fmt(roomArea, 2)} m²</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.tileArea}</div>
            <div class="m-kpi__v">${fmt(tileAreaM2, 3)} m²</div>
          </div>
          ${boxesHtml}
        </div>
      `
    );
  }

  function reset() {
    [roomLength, roomWidth, tileLength, tileWidth, tilesPerBox].forEach(x => { if (x) x.value = ""; });
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
  [roomLength, roomWidth, tileLength, tileWidth, wastage, tilesPerBox].forEach(x => x?.addEventListener("input", calc));

  btnCalc?.addEventListener("click", calc);
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();