(() => {
  const el = (id) => document.getElementById(id);

  // ---------- locale ----------
  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE =
    typeof window.i18nLocale === "function"
      ? window.i18nLocale()
      : (LANG === "en" ? "en-US" : "uk-UA");

  // ---------- i18n helper (uses /js/i18n.js DICT via window.t) ----------
  const hasGlobalT = typeof window.t === "function";
  const tr = (key, fallback = "") => {
    if (hasGlobalT) {
      const v = window.t(`flooring.${key}`);
      if (typeof v === "string" && v.trim() && v !== `flooring.${key}`) return v;
    }
    return fallback || key;
  };

  const fmt = (n, maxFrac = 2) =>
    Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: maxFrac }) : "—";

  const parseNum = (val) => {
    if (val == null) return NaN;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    if (s === "") return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };

  const safeText = (s) => String(s ?? "").replace(/[<>]/g, "");

  // ✅ IMPORTANT: treat "" as "use default", but allow 0
  const numOrDefault = (inputEl, def) => {
    const raw = (inputEl?.value ?? "").trim();
    if (raw === "") return def;
    const n = parseNum(raw);
    return Number.isFinite(n) ? n : def;
  };

  // ---------- units ----------
  const unitM2 = LANG === "en" ? "m²" : "м²";
  const unitMm = LANG === "en" ? "mm" : "мм";
  const unitPcs = LANG === "en" ? "pcs" : "шт";
  const unitM = LANG === "en" ? "m" : "м";

  const symUAH = () => "₴";
  const moneyUAH = (n) => (Number.isFinite(n) ? `${fmt(n, 2)} ${symUAH()}` : "—");

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");

  const mode = el("mode");
  const floorType = el("floorType");

  const len = el("len");
  const wid = el("wid");
  const area = el("area");
  const cutouts = el("cutouts");

  const lenWrap = el("lenWrap");
  const widWrap = el("widWrap");
  const areaWrap = el("areaWrap");

  const wastePct = el("wastePct");

  // laminate/vinyl fields
  const packFields = el("packFields");
  const coverPerPack = el("coverPerPack");
  const unitsName = el("unitsName");

  // tile fields
  const tileFields = el("tileFields");
  const tileLenMm = el("tileLenMm");
  const tileWidMm = el("tileWidMm");
  const tilesPerPack = el("tilesPerPack");
  const unitsNameTile = el("unitsNameTile");
  const rounding = el("rounding");

  // carpet fields
  const carpetFields = el("carpetFields");
  const rollWidthM = el("rollWidthM");
  const carpetUnitName = el("carpetUnitName");

  // Buttons/result
  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  // Table
  const scheduleWrap = el("scheduleWrap");
  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");
  const btnDownloadCSV = el("btnDownloadCSV");

  // Chart
  const canvas = el("growthChart");
  const ctx = canvas?.getContext?.("2d");

  // Cost
  const costWrap = el("costWrap");
  const pricePerUnit = el("pricePerUnit"); // packs OR m² (carpet)
  const delivery = el("delivery");
  const wastePctCost = el("wastePctCost");

  const btnSavePrices = el("btnSavePrices");
  const btnResetPrices = el("btnResetPrices");
  const btnCopyCost = el("btnCopyCost");
  const costToast = el("costToast");
  const costTotal = el("costTotal");
  const costDetails = el("costDetails");

  // ---------- defaults ----------
  const DEFAULTS = {
    wastePct: 10,

    coverPerPack: 2.22,
    unitsName: LANG === "en" ? "packs" : "упаковки",

    tileLenMm: 600,
    tileWidMm: 600,
    tilesPerPack: 4,
    unitsNameTile: LANG === "en" ? "packs" : "упаковки",

    rollWidthM: 4,
    carpetUnitName: LANG === "en" ? "lm" : "пог. м",

    wastePctCost: 5,
  };

  const LS_KEY = "cc_floor_prices_simple_v1";

  // ---------- state ----------
  let tableRows = [];
  let chartBars = [];
  let lastCalc = null;

  // ---------- helpers UI ----------
  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setCostToast = (msg) => { if (costToast) costToast.textContent = msg || ""; };

  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function applyModeUI() {
    const v = mode?.value || "room";
    if (v === "area") {
      if (lenWrap) lenWrap.style.display = "none";
      if (widWrap) widWrap.style.display = "none";
      if (areaWrap) areaWrap.style.display = "";
    } else {
      if (lenWrap) lenWrap.style.display = "";
      if (widWrap) widWrap.style.display = "";
      if (areaWrap) areaWrap.style.display = "none";
    }
  }

  function getNetAreaM2() {
    const c = Math.max(0, numOrDefault(cutouts, 0));
    if ((mode?.value || "room") === "area") {
      const A = numOrDefault(area, NaN);
      if (!Number.isFinite(A) || !(A > 0)) return 0;
      return Math.max(0, A - c);
    }
    const L = numOrDefault(len, NaN);
    const W = numOrDefault(wid, NaN);
    if (!(L > 0) || !(W > 0)) return 0;
    return Math.max(0, L * W - c);
  }

  function applyFloorTypeUI() {
    const ttype = floorType?.value || "laminate";

    if (packFields) packFields.style.display = (ttype === "laminate" || ttype === "vinyl") ? "" : "none";
    if (tileFields) tileFields.style.display = (ttype === "tile") ? "" : "none";
    if (carpetFields) carpetFields.style.display = (ttype === "carpet") ? "" : "none";

    // cost label
    const costLabel = document.querySelector('label[for="pricePerUnit"]');
    if (costLabel) {
      costLabel.textContent = (ttype === "carpet")
        ? tr("priceHint", LANG === "en" ? "For carpet — price per m²." : "Для килима — ціна за м².")
        : tr("priceLabel", LANG === "en" ? "Price per pack" : "Ціна за 1 упаковку");
    }

    scheduleAuto();
  }

  // ---------- table ----------
  function renderTable() {
    if (!scheduleTbody) return;
    scheduleTbody.innerHTML = tableRows.map(r => `
      <tr>
        <td>${safeText(r.item)}</td>
        <td>${safeText(r.qty)}</td>
        <td>${safeText(r.unit)}</td>
        <td>${safeText(r.note)}</td>
      </tr>
    `).join("");
  }

  // ---------- chart ----------
  function drawChart() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!chartBars.length) {
      ctx.font = "12px Arial";
      ctx.fillStyle = "#1f2f55";
      ctx.fillText(tr("resultPlaceholder", LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку."), 12, 24);
      return;
    }

    const W = canvas.width, H = canvas.height;
    const padL = 52, padR = 16, padT = 16, padB = 34;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const values = chartBars.map(b => Number.isFinite(b.value) ? b.value : 0);
    const maxV = Math.max(...values, 1e-9);

    ctx.strokeStyle = "rgba(40,59,105,.18)";
    ctx.lineWidth = 1;

    const gridN = 4;
    for (let g = 0; g <= gridN; g++) {
      const y = padT + (innerH * g) / gridN;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();

      const v = maxV * (1 - g / gridN);
      ctx.fillStyle = "rgba(31,47,85,.85)";
      ctx.font = "11px Arial";
      ctx.fillText(fmt(v, 2), 6, y + 4);
    }

    const n = chartBars.length;
    const gap = 14;
    const barW = Math.max(18, (innerW - gap * (n - 1)) / n);

    chartBars.forEach((b, i) => {
      const x = padL + i * (barW + gap);
      const h = innerH * (b.value / maxV);
      const y = padT + (innerH - h);

      ctx.fillStyle = "rgba(31,47,85,.90)";
      ctx.fillRect(x, y, barW, h);

      ctx.fillStyle = "rgba(31,47,85,.95)";
      ctx.font = "11px Arial";
      const label = b.label || "";
      const tw = ctx.measureText(label).width;
      ctx.fillText(label, x + barW / 2 - tw / 2, H - 12);
    });
  }

  function renderAll() {
    renderTable();
    drawChart();
  }

  // ---------- cost storage ----------
  function readPrices() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function writePrices(obj) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch { }
  }
  function collectPrices() {
    return {
      pricePerUnit: numOrDefault(pricePerUnit, 0),
      delivery: numOrDefault(delivery, 0),
      wastePctCost: numOrDefault(wastePctCost, DEFAULTS.wastePctCost),
    };
  }
  function applyPrices(p) {
    if (!p) return;
    if (pricePerUnit) pricePerUnit.value = p.pricePerUnit ?? "";
    if (delivery) delivery.value = p.delivery ?? "";
    if (wastePctCost) wastePctCost.value = (p.wastePctCost ?? DEFAULTS.wastePctCost).toString();
  }

  function recalcCost() {
    if (!costTotal || !costDetails) return;

    if (!lastCalc) {
      costTotal.textContent = tr("costPlaceholder", LANG === "en" ? "Calculate first." : "Спочатку зроби розрахунок.");
      costDetails.innerHTML = "";
      return;
    }

    const p = collectPrices();
    const hasAny = (p.pricePerUnit > 0) || (p.delivery > 0) || ((p.wastePctCost || 0) > 0);

    if (!hasAny) {
      costTotal.textContent = tr("costPlaceholder", LANG === "en" ? "Enter prices to see the total cost." : "Введи ціни, щоб побачити загальну вартість.");
      costDetails.innerHTML = "";
      return;
    }

    const wasteK = 1 + Math.max(0, p.wastePctCost || 0) / 100;

    let materialCost = 0;
    let baseLine = "";

    if (lastCalc.type === "carpet") {
      const baseArea = lastCalc.areaNet || 0;
      materialCost = baseArea * (p.pricePerUnit || 0) * wasteK;
      baseLine = `${LANG === "en" ? "Area (no waste)" : "Площа (без запасу)"}: ${fmt(baseArea, 2)} ${unitM2}`;
    } else {
      const basePacks = lastCalc.packsNoWaste || 0;
      materialCost = basePacks * (p.pricePerUnit || 0) * wasteK;
      baseLine = `${LANG === "en" ? "Packs (no waste)" : "Упаковки (без запасу)"}: ${fmt(basePacks, 3)} ${safeText(lastCalc.unitName || "")}`;
    }

    const subtotal = materialCost;
    const total = subtotal + (p.delivery || 0);
    const perM2 = lastCalc.areaNet > 0 ? total / lastCalc.areaNet : NaN;

    costTotal.textContent = `${LANG === "en" ? "Total cost" : "Загальна вартість"}: ${moneyUAH(total)}`;
    costDetails.innerHTML = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${LANG === "en" ? "Material" : "Матеріал"}</div>
          <div class="m-kpi__v">${moneyUAH(materialCost)}</div>
          <div class="m-kpi__s">${LANG === "en" ? "Waste" : "Запас"}: ${fmt(p.wastePctCost || 0, 1)}%</div>
        </div>
        <div class="m-kpi">
          <div class="m-kpi__k">${LANG === "en" ? "Base" : "База"}</div>
          <div class="m-kpi__v">${baseLine}</div>
          <div class="m-kpi__s">${LANG === "en" ? "Entered price" : "Введена ціна"}: ${moneyUAH(p.pricePerUnit || 0)}</div>
        </div>
      </div>
      <div class="m-summary">
        <div><b>${LANG === "en" ? "Subtotal" : "Проміжний підсумок"}</b>: ${moneyUAH(subtotal)}</div>
        <div><b>${LANG === "en" ? "Delivery" : "Доставка"}</b>: ${moneyUAH(p.delivery || 0)}</div>
        <div class="m-hintSmall"><b>${LANG === "en" ? "Price per 1 m²" : "Ціна за 1 м²"}</b>: ${Number.isFinite(perM2) ? moneyUAH(perM2) : "—"}</div>
      </div>
    `;
  }

  // ---------- calc core ----------
  function calc({ silent = false } = {}) {
    const ttype = floorType?.value || "laminate";
    const A = getNetAreaM2();
    const waste = Math.max(0, numOrDefault(wastePct, DEFAULTS.wastePct));

    if (!(A > 0)) {
      if (!silent) setToast(tr("resultPlaceholder", LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку."));
      setResult(tr("resultPlaceholder", LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку."), "");
      tableRows = [];
      chartBars = [];
      lastCalc = null;
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      drawChart();
      recalcCost();
      if (scheduleWrap) scheduleWrap.open = false;
      return;
    }

    const areaWithWaste = A * (1 + waste / 100);
    setToast("");

    // ---- Carpet ----
    if (ttype === "carpet") {
      const width = Math.max(0, numOrDefault(rollWidthM, DEFAULTS.rollWidthM));
      const unitName = (carpetUnitName?.value || DEFAULTS.carpetUnitName).trim();
      if (!(width > 0)) return;

      const linearExact = areaWithWaste / width;
      const linearToBuy = Math.ceil(linearExact * 100) / 100;

      lastCalc = { type: "carpet", areaNet: A, areaWithWaste, unitName };

      setResult(
        `${tr("typeCarpet", LANG === "en" ? "Carpet" : "Килим")}: ${fmt(linearToBuy, 2)} ${unitName}`,
        `
          <div class="m-kpis">
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Net area" : "Площа (чиста)"}</div>
              <div class="m-kpi__v">${fmt(A, 2)} ${unitM2}</div>
              <div class="m-kpi__s">${LANG === "en" ? "After cutouts" : "З урахуванням віднімання"}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Waste" : "Запас"}</div>
              <div class="m-kpi__v">${fmt(waste, 1)}%</div>
              <div class="m-kpi__s">${LANG === "en" ? "For cutting" : "На підрізку"}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Roll width" : "Ширина рулону"}</div>
              <div class="m-kpi__v">${fmt(width, 2)} ${unitM}</div>
              <div class="m-kpi__s">${LANG === "en" ? "Linear = area/width" : "Пог. м = площа/ширина"}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Linear meters" : "Погонні метри"}</div>
              <div class="m-kpi__v">${fmt(linearToBuy, 2)} ${unitName}</div>
              <div class="m-kpi__s">${LANG === "en" ? "Exact" : "Точно"}: ${fmt(linearExact, 2)}</div>
            </div>
          </div>
        `
      );

      tableRows = [
        { item: LANG === "en" ? "Net area" : "Площа (чиста)", qty: fmt(A, 2), unit: unitM2, note: "" },
        { item: LANG === "en" ? "Area with waste" : "Площа з запасом", qty: fmt(areaWithWaste, 2), unit: unitM2, note: `${fmt(waste, 1)}%` },
        { item: LANG === "en" ? "Roll width" : "Ширина рулону", qty: fmt(width, 2), unit: unitM, note: "" },
        { item: tr("typeCarpet", LANG === "en" ? "Carpet" : "Килим"), qty: fmt(linearToBuy, 2), unit: unitName, note: `${LANG === "en" ? "Exact" : "Точно"}: ${fmt(linearExact, 2)}` },
      ];

      chartBars = [
        { label: LANG === "en" ? "Net (m²)" : "Чиста (м²)", value: A },
        { label: LANG === "en" ? "With waste" : "З запасом", value: areaWithWaste },
        { label: LANG === "en" ? "Linear m" : "Пог. м", value: linearToBuy },
      ];

      renderAll();
      recalcCost();
      if (scheduleWrap) scheduleWrap.open = false;
      return;
    }

    // ---- Tile ----
    if (ttype === "tile") {
      const Lmm = Math.max(0, numOrDefault(tileLenMm, DEFAULTS.tileLenMm));
      const Wmm = Math.max(0, numOrDefault(tileWidMm, DEFAULTS.tileWidMm));
      const ppp = Math.max(0, numOrDefault(tilesPerPack, DEFAULTS.tilesPerPack));
      const unitName = (unitsNameTile?.value || DEFAULTS.unitsNameTile).trim();
      const roundMode = rounding?.value || "packs";

      if (!(Lmm > 0) || !(Wmm > 0) || !(ppp > 0)) return;

      const pieceArea = (Lmm / 1000) * (Wmm / 1000);
      const pcsExact = areaWithWaste / pieceArea;
      const pcsRounded = Math.ceil(pcsExact);

      const packsExact = pcsRounded / ppp;
      let packsToBuy = 0;
      let pcsToBuy = 0;

      if (roundMode === "pieces") {
        pcsToBuy = pcsRounded;
        packsToBuy = Math.ceil(pcsToBuy / ppp);
      } else {
        packsToBuy = Math.ceil(packsExact);
        pcsToBuy = packsToBuy * ppp;
      }

      const packsNoWaste = (A / pieceArea) / ppp;
      lastCalc = { type: "tile", areaNet: A, areaWithWaste, packsNoWaste, unitName };

      setResult(
        `${LANG === "en" ? "Packs" : "Упаковки"}: ${fmt(packsToBuy, 0)} ${unitName} • ${LANG === "en" ? "Pieces" : "Штук"}: ${fmt(pcsToBuy, 0)} ${unitPcs}`,
        `
          <div class="m-kpis">
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Net area" : "Площа (чиста)"}</div>
              <div class="m-kpi__v">${fmt(A, 2)} ${unitM2}</div>
              <div class="m-kpi__s">${LANG === "en" ? "After cutouts" : "З урахуванням віднімання"}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Waste" : "Запас"}</div>
              <div class="m-kpi__v">${fmt(waste, 1)}%</div>
              <div class="m-kpi__s">${LANG === "en" ? "For cutting" : "На підрізку"}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Tile size" : "Розмір плитки"}</div>
              <div class="m-kpi__v">${fmt(Lmm, 0)}×${fmt(Wmm, 0)} ${unitMm}</div>
              <div class="m-kpi__s">${LANG === "en" ? "Area per piece" : "Площа 1 шт"}: ${fmt(pieceArea, 4)} ${unitM2}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Per pack" : "В упаковці"}</div>
              <div class="m-kpi__v">${fmt(ppp, 0)} ${unitPcs}</div>
              <div class="m-kpi__s">${LANG === "en" ? "Rounding" : "Округлення"}: ${roundMode}</div>
            </div>
          </div>
        `
      );

      tableRows = [
        { item: LANG === "en" ? "Net area" : "Площа (чиста)", qty: fmt(A, 2), unit: unitM2, note: "" },
        { item: LANG === "en" ? "Area with waste" : "Площа з запасом", qty: fmt(areaWithWaste, 2), unit: unitM2, note: `${fmt(waste, 1)}%` },
        { item: LANG === "en" ? "Pieces to buy" : "Штук купити", qty: fmt(pcsToBuy, 0), unit: unitPcs, note: `${LANG === "en" ? "Exact" : "Точно"}: ${fmt(pcsExact, 2)}` },
        { item: LANG === "en" ? "Packs to buy" : "Упаковок купити", qty: fmt(packsToBuy, 0), unit: unitName, note: `${ppp} шт/упак` },
      ];

      chartBars = [
        { label: LANG === "en" ? "Net (m²)" : "Чиста (м²)", value: A },
        { label: LANG === "en" ? "With waste" : "З запасом", value: areaWithWaste },
        { label: LANG === "en" ? "Packs" : "Упак", value: packsToBuy },
      ];

      renderAll();
      recalcCost();
      if (scheduleWrap) scheduleWrap.open = false;
      return;
    }

    // ---- Laminate / Vinyl (packs) ----
    {
      const cover = Math.max(0, numOrDefault(coverPerPack, DEFAULTS.coverPerPack));
      const unitName = (unitsName?.value || DEFAULTS.unitsName).trim();
      if (!(cover > 0)) return;

      const packsExact = areaWithWaste / cover;
      const packsToBuy = Math.ceil(packsExact);

      const packsNoWaste = A / cover;
      lastCalc = { type: "packs", areaNet: A, areaWithWaste, packsNoWaste, unitName };

      setResult(
        `${LANG === "en" ? "Packs" : "Упаковки"}: ${fmt(packsToBuy, 0)} ${unitName}`,
        `
          <div class="m-kpis">
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Net area" : "Площа (чиста)"}</div>
              <div class="m-kpi__v">${fmt(A, 2)} ${unitM2}</div>
              <div class="m-kpi__s">${LANG === "en" ? "After cutouts" : "З урахуванням віднімання"}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Waste" : "Запас"}</div>
              <div class="m-kpi__v">${fmt(waste, 1)}%</div>
              <div class="m-kpi__s">${LANG === "en" ? "For cutting" : "На підрізку"}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Area with waste" : "Площа з запасом"}</div>
              <div class="m-kpi__v">${fmt(areaWithWaste, 2)} ${unitM2}</div>
              <div class="m-kpi__s">${LANG === "en" ? "Target coverage" : "План закупівлі"}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Cover per pack" : "Покриття 1 упак"}</div>
              <div class="m-kpi__v">${fmt(cover, 3)} ${unitM2}</div>
              <div class="m-kpi__s">${LANG === "en" ? "From package" : "З упаковки"}</div>
            </div>
          </div>
        `
      );

      tableRows = [
        { item: LANG === "en" ? "Net area" : "Площа (чиста)", qty: fmt(A, 2), unit: unitM2, note: "" },
        { item: LANG === "en" ? "Area with waste" : "Площа з запасом", qty: fmt(areaWithWaste, 2), unit: unitM2, note: `${fmt(waste, 1)}%` },
        { item: LANG === "en" ? "Packs to buy" : "Упаковок купити", qty: fmt(packsToBuy, 0), unit: unitName, note: `${LANG === "en" ? "Exact" : "Точно"}: ${fmt(packsExact, 3)}` },
      ];

      chartBars = [
        { label: LANG === "en" ? "Net (m²)" : "Чиста (м²)", value: A },
        { label: LANG === "en" ? "With waste" : "З запасом", value: areaWithWaste },
        { label: LANG === "en" ? "Packs" : "Упак", value: packsToBuy },
      ];

      renderAll();
      recalcCost();
      if (scheduleWrap) scheduleWrap.open = false;
    }
  }

  // ---------- reset ----------
  function reset() {
    if (mode) mode.value = "room";
    if (floorType) floorType.value = "laminate";

    if (len) len.value = "";
    if (wid) wid.value = "";
    if (area) area.value = "";
    if (cutouts) cutouts.value = "0";

    if (wastePct) wastePct.value = String(DEFAULTS.wastePct);

    if (coverPerPack) coverPerPack.value = String(DEFAULTS.coverPerPack);
    if (unitsName) unitsName.value = DEFAULTS.unitsName;

    if (tileLenMm) tileLenMm.value = String(DEFAULTS.tileLenMm);
    if (tileWidMm) tileWidMm.value = String(DEFAULTS.tileWidMm);
    if (tilesPerPack) tilesPerPack.value = String(DEFAULTS.tilesPerPack);
    if (unitsNameTile) unitsNameTile.value = DEFAULTS.unitsNameTile;
    if (rounding) rounding.value = "packs";

    if (rollWidthM) rollWidthM.value = String(DEFAULTS.rollWidthM);
    if (carpetUnitName) carpetUnitName.value = DEFAULTS.carpetUnitName;

    applyModeUI();
    applyFloorTypeUI();

    setToast(LANG === "en" ? "Reset done." : "Скинуто.");
    setResult(tr("resultPlaceholder", LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку."), "");

    tableRows = [];
    chartBars = [];
    lastCalc = null;

    if (scheduleTbody) scheduleTbody.innerHTML = "";
    drawChart();
    recalcCost();

    setTimeout(() => setToast(""), 1200);
  }

  // ---------- copy / csv ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      setToast(LANG === "en" ? "Result copied." : "Скопійовано результат.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(LANG === "en" ? "Copy failed." : "Не вдалося скопіювати.");
    }
  }

  async function copySchedule() {
    if (!scheduleTable) return;
    const trs = Array.from(scheduleTable.querySelectorAll("tr"));
    const lines = trs.map((tr) =>
      Array.from(tr.children).map((td) => td.innerText.replace(/\s+/g, " ").trim()).join("\t")
    );
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      setToast(LANG === "en" ? "Table copied." : "Скопійовано таблицю.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(LANG === "en" ? "Failed to copy table." : "Не вдалося скопіювати таблицю.");
    }
  }

  function downloadCSV() {
    if (!scheduleTable) return;
    const rowsCSV = Array.from(scheduleTable.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.children).map((td) => `"${td.innerText.replace(/"/g, '""').trim()}"`).join(",")
    );
    const csv = rowsCSV.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "flooring-materials.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setToast(LANG === "en" ? "CSV downloaded." : "CSV завантажено.");
    setTimeout(() => setToast(""), 1500);
  }

  // ---------- cost buttons ----------
  function savePrices() {
    writePrices(collectPrices());
    setCostToast(LANG === "en" ? "Prices saved." : "Ціни збережено.");
    setTimeout(() => setCostToast(""), 1200);
  }
  function resetPrices() {
    try { localStorage.removeItem(LS_KEY); } catch { }
    if (pricePerUnit) pricePerUnit.value = "";
    if (delivery) delivery.value = "";
    if (wastePctCost) wastePctCost.value = String(DEFAULTS.wastePctCost);
    setCostToast(LANG === "en" ? "Prices reset." : "Ціни скинуто.");
    recalcCost();
    setTimeout(() => setCostToast(""), 1200);
  }
  async function copyCost() {
    const txt = (costTotal?.textContent || "").trim();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      setCostToast(LANG === "en" ? "Copied." : "Скопійовано.");
      setTimeout(() => setCostToast(""), 1200);
    } catch {
      setCostToast(LANG === "en" ? "Copy failed." : "Не вдалося скопіювати.");
    }
  }

  // ---------- auto calc ----------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  // ---------- events ----------
  mode?.addEventListener("change", () => { applyModeUI(); scheduleAuto(); });
  floorType?.addEventListener("change", () => { applyFloorTypeUI(); scheduleAuto(); });

  [
    len, wid, area, cutouts, wastePct,
    coverPerPack, unitsName,
    tileLenMm, tileWidMm, tilesPerPack, unitsNameTile, rounding,
    rollWidthM, carpetUnitName
  ].forEach((x) => x?.addEventListener("input", scheduleAuto));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  [pricePerUnit, delivery, wastePctCost].forEach((x) => x?.addEventListener("input", recalcCost));
  btnSavePrices?.addEventListener("click", savePrices);
  btnResetPrices?.addEventListener("click", resetPrices);
  btnCopyCost?.addEventListener("click", copyCost);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  // ---------- init ----------
  function init() {
    applyModeUI();

    if (wastePct && (wastePct.value ?? "").trim() === "") wastePct.value = String(DEFAULTS.wastePct);
    if (cutouts && (cutouts.value ?? "").trim() === "") cutouts.value = "0";

    if (coverPerPack && (coverPerPack.value ?? "").trim() === "") coverPerPack.value = String(DEFAULTS.coverPerPack);
    if (unitsName && (unitsName.value ?? "").trim() === "") unitsName.value = DEFAULTS.unitsName;

    if (tileLenMm && (tileLenMm.value ?? "").trim() === "") tileLenMm.value = String(DEFAULTS.tileLenMm);
    if (tileWidMm && (tileWidMm.value ?? "").trim() === "") tileWidMm.value = String(DEFAULTS.tileWidMm);
    if (tilesPerPack && (tilesPerPack.value ?? "").trim() === "") tilesPerPack.value = String(DEFAULTS.tilesPerPack);
    if (unitsNameTile && (unitsNameTile.value ?? "").trim() === "") unitsNameTile.value = DEFAULTS.unitsNameTile;

    if (rollWidthM && (rollWidthM.value ?? "").trim() === "") rollWidthM.value = String(DEFAULTS.rollWidthM);
    if (carpetUnitName && (carpetUnitName.value ?? "").trim() === "") carpetUnitName.value = DEFAULTS.carpetUnitName;

    if (wastePctCost && (wastePctCost.value ?? "").trim() === "") wastePctCost.value = String(DEFAULTS.wastePctCost);

    const saved = readPrices();
    if (saved) applyPrices(saved);

    applyFloorTypeUI();

    setResult(tr("resultPlaceholder", LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку."), "");
    drawChart();
    recalcCost();

    if (costWrap) costWrap.open = false;
  }

  init();
})();
