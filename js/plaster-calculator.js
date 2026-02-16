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
      : LANG === "en" ? "en-US" : "uk-UA";

  const fmt = (n, maxFrac = 2) =>
    Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: maxFrac }) : "—";

  const parseNum = (val) => {
    if (val == null) return 0;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const safeText = (s) => String(s ?? "").replace(/[<>]/g, "");

  // ---------- units ----------
  const unitMm = LANG === "en" ? "mm" : "мм";
  const unitM2 = LANG === "en" ? "m2" : "м²";
  const unitM3 = LANG === "en" ? "m3" : "м³";
  const unitKg = LANG === "en" ? "kg" : "кг";
  const unitBags = LANG === "en" ? "bags" : "мішки";
  const unitL = LANG === "en" ? "L" : "л";
  const symUAH = () => "₴";
  const moneyUAH = (n) => (Number.isFinite(n) ? `${fmt(n, 2)} ${symUAH()}` : "—");

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");

  const mode = el("mode");
  const mixType = el("mixType");

  const length = el("length");
  const height = el("height");
  const area = el("area");
  const openingsArea = el("openingsArea");

  const lengthWrap = el("lengthWrap");
  const heightWrap = el("heightWrap");
  const areaWrap = el("areaWrap");

  const thicknessMm = el("thicknessMm");
  const wastePct = el("wastePct");

  // Bags fields
  const bagsFields = el("bagsFields");
  const consumptionKg10mm = el("consumptionKg10mm");
  const bagKg = el("bagKg");
  const waterLPerKg = el("waterLPerKg");

  // Cement-sand fields
  const csFields = el("csFields");
  const ratioC = el("ratioC");
  const ratioS = el("ratioS");
  const wcRatio = el("wcRatio");
  const cementDensity = el("cementDensity");
  const sandDensity = el("sandDensity");
  const cementBagKg = el("cementBagKg");

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
  const pricePerBag = el("pricePerBag");         // for bags: mix bag price; for cs: cement bag price
  const priceSandPerM3 = el("priceSandPerM3");   // only for cs
  const priceSandWrap = el("priceSandWrap");
  const priceWaterPerL = el("priceWaterPerL");
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
    thicknessMm: 15,
    wastePct: 8,

    // bags
    consumptionKg10mm: 9.0,
    bagKg: 25,
    waterLPerKg: 0,

    // cs
    ratioC: 1,
    ratioS: 3,
    wcRatio: 0.5,
    cementDensity: 1440,
    sandDensity: 1600,
    cementBagKg: 25,

    wastePctCost: 5,
  };

  const LS_KEY = "cc_plaster_prices_v2";

  // ---------- state ----------
  let tableRows = [];
  let chartBars = [];
  let lastCalc = null; // {type, ...}

  // ---------- helpers UI ----------
  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setCostToast = (msg) => { if (costToast) costToast.textContent = msg || ""; };

  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function applyModeUI() {
    const v = mode?.value || "wall";
    if (v === "area") {
      if (lengthWrap) lengthWrap.style.display = "none";
      if (heightWrap) heightWrap.style.display = "none";
      if (areaWrap) areaWrap.style.display = "";
    } else {
      if (lengthWrap) lengthWrap.style.display = "";
      if (heightWrap) heightWrap.style.display = "";
      if (areaWrap) areaWrap.style.display = "none";
    }
  }

  function getNetAreaM2() {
    const openings = Math.max(0, parseNum(openingsArea?.value));
    if ((mode?.value || "wall") === "area") {
      const A = parseNum(area?.value);
      return Math.max(0, A - openings);
    }
    const Lm = parseNum(length?.value);
    const Hm = parseNum(height?.value);
    if (!(Lm > 0) || !(Hm > 0)) return 0;
    return Math.max(0, Lm * Hm - openings);
  }

  function applyMixTypeUI() {
    const type = mixType?.value || "bags";

    if (bagsFields) bagsFields.style.display = type === "bags" ? "" : "none";
    if (csFields) csFields.style.display = type === "cs" ? "" : "none";

    // cost: show sand price only for cs
    if (priceSandWrap) priceSandWrap.style.display = type === "cs" ? "" : "none";

    // update label "pricePerBag" meaning
    const label = document.querySelector('label[for="pricePerBag"]');
    if (label) {
      label.textContent = type === "bags"
        ? (LANG === "en" ? "Mix: price per bag" : "Суміш: ціна за 1 мішок")
        : (LANG === "en" ? "Cement: price per bag" : "Цемент: ціна за 1 мішок");
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

  // ---------- chart (simple bars) ----------
  function drawChart() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!chartBars.length) {
      ctx.font = "12px Arial";
      ctx.fillStyle = "#1f2f55";
      ctx.fillText(LANG === "en" ? "Calculate to see the chart." : "Зроби розрахунок, щоб побачити графік.", 12, 24);
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
    try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); } catch {}
  }
  function collectPrices() {
    return {
      pricePerBag: parseNum(pricePerBag?.value),
      priceSandPerM3: parseNum(priceSandPerM3?.value),
      priceWaterPerL: parseNum(priceWaterPerL?.value),
      delivery: parseNum(delivery?.value),
      wastePctCost: parseNum(wastePctCost?.value),
    };
  }
  function applyPrices(p) {
    if (!p) return;
    if (pricePerBag) pricePerBag.value = p.pricePerBag ?? "";
    if (priceSandPerM3) priceSandPerM3.value = p.priceSandPerM3 ?? "";
    if (priceWaterPerL) priceWaterPerL.value = p.priceWaterPerL ?? "";
    if (delivery) delivery.value = p.delivery ?? "";
    if (wastePctCost) wastePctCost.value = (p.wastePctCost ?? DEFAULTS.wastePctCost).toString();
  }

  function recalcCost() {
    if (!costTotal || !costDetails) return;

    if (!lastCalc) {
      costTotal.textContent = LANG === "en" ? "Calculate first." : "Спочатку зроби розрахунок.";
      costDetails.innerHTML = "";
      return;
    }

    const p = collectPrices();
    const hasAny = (p.pricePerBag > 0) || (p.priceSandPerM3 > 0) || (p.priceWaterPerL > 0) || (p.delivery > 0) || ((p.wastePctCost || 0) > 0);

    if (!hasAny) {
      costTotal.textContent = LANG === "en" ? "Enter prices to see the total cost." : "Введи ціни, щоб побачити вартість.";
      costDetails.innerHTML = "";
      return;
    }

    const wasteK = 1 + Math.max(0, p.wastePctCost || 0) / 100;

    let mat1Name = "";
    let mat1Cost = 0;

    let sandCost = 0;
    let waterCost = 0;

    if (lastCalc.type === "bags") {
      mat1Name = LANG === "en" ? "Mix" : "Суміш";
      mat1Cost = (lastCalc.bagsNoWaste || 0) * (p.pricePerBag || 0) * wasteK;
      waterCost = (lastCalc.waterLNoWaste || 0) * (p.priceWaterPerL || 0) * wasteK;
    } else {
      mat1Name = LANG === "en" ? "Cement" : "Цемент";
      mat1Cost = (lastCalc.cementBagsNoWaste || 0) * (p.pricePerBag || 0) * wasteK;
      sandCost = (lastCalc.sandVolNoWaste || 0) * (p.priceSandPerM3 || 0) * wasteK;
      waterCost = (lastCalc.waterLNoWaste || 0) * (p.priceWaterPerL || 0) * wasteK;
    }

    const subtotal = mat1Cost + sandCost + waterCost;
    const total = subtotal + (p.delivery || 0);
    const perM2 = lastCalc.areaNet > 0 ? total / lastCalc.areaNet : NaN;

    costTotal.textContent = `${LANG === "en" ? "Total cost" : "Загальна вартість"}: ${moneyUAH(total)}`;

    costDetails.innerHTML = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${mat1Name}</div>
          <div class="m-kpi__v">${moneyUAH(mat1Cost)}</div>
          <div class="m-kpi__s">${LANG === "en" ? "Waste" : "Запас"}: ${fmt(p.wastePctCost || 0, 1)}%</div>
        </div>

        <div class="m-kpi" style="${lastCalc.type === "cs" ? "" : "display:none;"}">
          <div class="m-kpi__k">${LANG === "en" ? "Sand" : "Пісок"}</div>
          <div class="m-kpi__v">${moneyUAH(sandCost)}</div>
          <div class="m-kpi__s">${fmt(lastCalc.sandVolNoWaste || 0, 3)} ${unitM3}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${LANG === "en" ? "Water" : "Вода"}</div>
          <div class="m-kpi__v">${moneyUAH(waterCost)}</div>
          <div class="m-kpi__s">${fmt(lastCalc.waterLNoWaste || 0, 0)} ${unitL}</div>
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
    const type = mixType?.value || "bags";
    const A = getNetAreaM2();
    const thick = Math.max(0, parseNum(thicknessMm?.value) || DEFAULTS.thicknessMm);
    const waste = Math.max(0, parseNum(wastePct?.value) || DEFAULTS.wastePct);

    if (!(A > 0) || !(thick > 0)) {
      if (!silent) setToast(LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку.");
      setResult(LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку.", "");
      tableRows = [];
      chartBars = [];
      lastCalc = null;
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      drawChart();
      recalcCost();
      if (scheduleWrap) scheduleWrap.open = false;
      return;
    }

    if (type === "bags") {
      const cons = Math.max(0, parseNum(consumptionKg10mm?.value) || DEFAULTS.consumptionKg10mm);
      const bag = Math.max(0, parseNum(bagKg?.value) || DEFAULTS.bagKg);
      const wLkg = Math.max(0, parseNum(waterLPerKg?.value) || 0);

      if (!(cons > 0) || !(bag > 0)) {
        if (!silent) setToast(LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку.");
        return;
      }

      const kgNoWaste = A * cons * (thick / 10);
      const kgWithWaste = kgNoWaste * (1 + waste / 100);

      const bagsNoWaste = kgNoWaste / bag;
      const bagsWithWaste = kgWithWaste / bag;

      const waterLNoWaste = wLkg > 0 ? kgNoWaste * wLkg : 0;
      const waterLWithWaste = wLkg > 0 ? kgWithWaste * wLkg : 0;

      lastCalc = { type, areaNet: A, kgNoWaste, kgWithWaste, bagsNoWaste, bagsWithWaste, waterLNoWaste, waterLWithWaste };

      setToast("");
      setResult(
        `${LANG === "en" ? "Mix" : "Суміш"}: ${fmt(kgWithWaste, 1)} ${unitKg} (${fmt(bagsWithWaste, 2)} ${unitBags})`,
        `
          <div class="m-kpis">
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Net area" : "Площа (чиста)"}</div>
              <div class="m-kpi__v">${fmt(A, 2)} ${unitM2}</div>
              <div class="m-kpi__s">${LANG === "en" ? "After openings" : "З урахуванням отворів"}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Thickness" : "Товщина"}</div>
              <div class="m-kpi__v">${fmt(thick, 1)} ${unitMm}</div>
              <div class="m-kpi__s">${LANG === "en" ? "Average layer" : "Середній шар"}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Bags" : "Мішки"}</div>
              <div class="m-kpi__v">${fmt(bagsWithWaste, 2)} ${unitBags}</div>
              <div class="m-kpi__s">${LANG === "en" ? "Bag weight" : "Вага мішка"}: ${fmt(bag, 0)} ${unitKg}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Water" : "Вода"}</div>
              <div class="m-kpi__v">${wLkg > 0 ? `${fmt(waterLWithWaste, 0)} ${unitL}` : "—"}</div>
              <div class="m-kpi__s">${wLkg > 0 ? `${fmt(wLkg, 3)} ${unitL}/${unitKg}` : (LANG === "en" ? "Optional" : "Опційно")}</div>
            </div>
          </div>
        `
      );

      tableRows = [
        { item: LANG === "en" ? "Mix" : "Суміш", qty: fmt(kgWithWaste, 1), unit: unitKg, note: `${LANG === "en" ? "No waste" : "Без запасу"}: ${fmt(kgNoWaste, 1)} • ${LANG === "en" ? "Waste" : "Запас"} ${fmt(waste, 1)}%` },
        { item: LANG === "en" ? "Bags" : "Мішки", qty: fmt(bagsWithWaste, 2), unit: unitBags, note: `${LANG === "en" ? "Bag" : "Мішок"}: ${fmt(bag, 0)} ${unitKg}` },
        { item: LANG === "en" ? "Water" : "Вода", qty: wLkg > 0 ? fmt(waterLWithWaste, 0) : "—", unit: unitL, note: wLkg > 0 ? `${fmt(wLkg, 3)} ${unitL}/${unitKg}` : (LANG === "en" ? "Optional" : "Опційно") },
      ];

      chartBars = [
        { label: LANG === "en" ? "Mix (kg)" : "Суміш (кг)", value: kgWithWaste },
        { label: LANG === "en" ? "Bags" : "Мішки", value: bagsWithWaste },
        { label: LANG === "en" ? "Water (L)" : "Вода (л)", value: wLkg > 0 ? waterLWithWaste : 0 },
      ];
    }

    if (type === "cs") {
      const C = Math.max(0, parseNum(ratioC?.value) || DEFAULTS.ratioC);
      const S = Math.max(0, parseNum(ratioS?.value) || DEFAULTS.ratioS);
      const wc = Math.max(0, parseNum(wcRatio?.value) || DEFAULTS.wcRatio);

      const cd = Math.max(0, parseNum(cementDensity?.value) || DEFAULTS.cementDensity);
      const sd = Math.max(0, parseNum(sandDensity?.value) || DEFAULTS.sandDensity);
      const bag = Math.max(0, parseNum(cementBagKg?.value) || DEFAULTS.cementBagKg);

      if (!(C > 0) || !(S > 0) || !(cd > 0) || !(sd > 0) || !(bag > 0)) {
        if (!silent) setToast(LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку.");
        return;
      }

      const V = A * (thick / 1000);       // m3
      const Vw = V * (1 + waste / 100);

      const k = C + S;
      const cementVolNoWaste = V * (C / k);
      const sandVolNoWaste = V * (S / k);

      const cementVolWithWaste = Vw * (C / k);
      const sandVolWithWaste = Vw * (S / k);

      const cementKgNoWaste = cementVolNoWaste * cd;
      const cementKgWithWaste = cementVolWithWaste * cd;

      const sandKgNoWaste = sandVolNoWaste * sd;
      const sandKgWithWaste = sandVolWithWaste * sd;

      const cementBagsNoWaste = cementKgNoWaste / bag;
      const cementBagsWithWaste = cementKgWithWaste / bag;

      const waterLNoWaste = cementKgNoWaste * wc;      // ~ L
      const waterLWithWaste = cementKgWithWaste * wc;

      lastCalc = {
        type, areaNet: A,
        mortarVolNoWaste: V, mortarVolWithWaste: Vw,
        cementVolNoWaste, cementVolWithWaste,
        sandVolNoWaste, sandVolWithWaste,
        cementKgNoWaste, cementKgWithWaste,
        sandKgNoWaste, sandKgWithWaste,
        cementBagsNoWaste, cementBagsWithWaste,
        waterLNoWaste, waterLWithWaste,
      };

      setToast("");
      setResult(
        `${LANG === "en" ? "Cement" : "Цемент"}: ${fmt(cementKgWithWaste, 0)} ${unitKg} (${fmt(cementBagsWithWaste, 2)} ${unitBags}) • ${LANG === "en" ? "Sand" : "Пісок"}: ${fmt(sandVolWithWaste, 3)} ${unitM3}`,
        `
          <div class="m-kpis">
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Mortar volume" : "Об’єм розчину"}</div>
              <div class="m-kpi__v">${fmt(Vw, 3)} ${unitM3}</div>
              <div class="m-kpi__s">${LANG === "en" ? "Area × thickness" : "Площа × товщина"}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Ratio" : "Пропорція"}</div>
              <div class="m-kpi__v">${fmt(C,0)}:${fmt(S,0)}</div>
              <div class="m-kpi__s">W/C: ${fmt(wc, 2)}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Cement bags" : "Мішки цементу"}</div>
              <div class="m-kpi__v">${fmt(cementBagsWithWaste, 2)} ${unitBags}</div>
              <div class="m-kpi__s">${LANG === "en" ? "Bag weight" : "Вага мішка"}: ${fmt(bag, 0)} ${unitKg}</div>
            </div>
            <div class="m-kpi">
              <div class="m-kpi__k">${LANG === "en" ? "Water" : "Вода"}</div>
              <div class="m-kpi__v">${fmt(waterLWithWaste, 0)} ${unitL}</div>
              <div class="m-kpi__s">W/C: ${fmt(wc, 2)} (≈)</div>
            </div>
          </div>
        `
      );

      tableRows = [
        { item: LANG === "en" ? "Cement" : "Цемент", qty: fmt(cementKgWithWaste, 0), unit: unitKg, note: `${LANG === "en" ? "Bags" : "Мішки"}: ${fmt(cementBagsWithWaste, 2)} • ${LANG === "en" ? "No waste" : "Без запасу"}: ${fmt(cementKgNoWaste, 0)}` },
        { item: LANG === "en" ? "Sand" : "Пісок", qty: fmt(sandVolWithWaste, 3), unit: unitM3, note: `${fmt(sandKgWithWaste, 0)} ${unitKg} • ${LANG === "en" ? "No waste" : "Без запасу"}: ${fmt(sandVolNoWaste, 3)} ${unitM3}` },
        { item: LANG === "en" ? "Water" : "Вода", qty: fmt(waterLWithWaste, 0), unit: unitL, note: `W/C: ${fmt(wc, 2)} • ${LANG === "en" ? "No waste" : "Без запасу"}: ${fmt(waterLNoWaste, 0)} ${unitL}` },
      ];

      chartBars = [
        { label: LANG === "en" ? "Mortar (m3)" : "Розчин (м³)", value: Vw },
        { label: LANG === "en" ? "Sand (m3)" : "Пісок (м³)", value: sandVolWithWaste },
        { label: LANG === "en" ? "Cement (m3)" : "Цемент (м³)", value: cementVolWithWaste },
      ];
    }

    renderAll();
    recalcCost();
    if (scheduleWrap) scheduleWrap.open = false;
  }

  // ---------- reset ----------
  function reset() {
    if (mode) mode.value = "wall";
    if (mixType) mixType.value = "bags";

    if (length) length.value = "";
    if (height) height.value = "";
    if (area) area.value = "";
    if (openingsArea) openingsArea.value = "";

    if (thicknessMm) thicknessMm.value = String(DEFAULTS.thicknessMm);
    if (wastePct) wastePct.value = String(DEFAULTS.wastePct);

    // bags defaults
    if (consumptionKg10mm) consumptionKg10mm.value = String(DEFAULTS.consumptionKg10mm);
    if (bagKg) bagKg.value = String(DEFAULTS.bagKg);
    if (waterLPerKg) waterLPerKg.value = "";

    // cs defaults
    if (ratioC) ratioC.value = String(DEFAULTS.ratioC);
    if (ratioS) ratioS.value = String(DEFAULTS.ratioS);
    if (wcRatio) wcRatio.value = String(DEFAULTS.wcRatio);
    if (cementDensity) cementDensity.value = String(DEFAULTS.cementDensity);
    if (sandDensity) sandDensity.value = String(DEFAULTS.sandDensity);
    if (cementBagKg) cementBagKg.value = String(DEFAULTS.cementBagKg);

    applyModeUI();
    applyMixTypeUI();

    setToast(LANG === "en" ? "Reset done." : "Скинуто.");
    setResult(LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку.", "");

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
    a.download = "plaster-materials.csv";
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
    try { localStorage.removeItem(LS_KEY); } catch {}
    if (pricePerBag) pricePerBag.value = "";
    if (priceSandPerM3) priceSandPerM3.value = "";
    if (priceWaterPerL) priceWaterPerL.value = "";
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
  mixType?.addEventListener("change", applyMixTypeUI);

  [
    length, height, area, openingsArea, thicknessMm, wastePct,
    consumptionKg10mm, bagKg, waterLPerKg,
    ratioC, ratioS, wcRatio, cementDensity, sandDensity, cementBagKg,
  ].forEach((x) => x?.addEventListener("input", scheduleAuto));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  [pricePerBag, priceSandPerM3, priceWaterPerL, delivery, wastePctCost].forEach((x) =>
    x?.addEventListener("input", recalcCost)
  );
  btnSavePrices?.addEventListener("click", savePrices);
  btnResetPrices?.addEventListener("click", resetPrices);
  btnCopyCost?.addEventListener("click", copyCost);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  // ---------- init ----------
  function init() {
    applyModeUI();

    if (thicknessMm && !thicknessMm.value) thicknessMm.value = String(DEFAULTS.thicknessMm);
    if (wastePct && !wastePct.value) wastePct.value = String(DEFAULTS.wastePct);
    if (wastePctCost && !wastePctCost.value) wastePctCost.value = String(DEFAULTS.wastePctCost);

    if (consumptionKg10mm && !consumptionKg10mm.value) consumptionKg10mm.value = String(DEFAULTS.consumptionKg10mm);
    if (bagKg && !bagKg.value) bagKg.value = String(DEFAULTS.bagKg);

    if (ratioC && !ratioC.value) ratioC.value = String(DEFAULTS.ratioC);
    if (ratioS && !ratioS.value) ratioS.value = String(DEFAULTS.ratioS);
    if (wcRatio && !wcRatio.value) wcRatio.value = String(DEFAULTS.wcRatio);
    if (cementDensity && !cementDensity.value) cementDensity.value = String(DEFAULTS.cementDensity);
    if (sandDensity && !sandDensity.value) sandDensity.value = String(DEFAULTS.sandDensity);
    if (cementBagKg && !cementBagKg.value) cementBagKg.value = String(DEFAULTS.cementBagKg);

    const saved = readPrices();
    if (saved) applyPrices(saved);

    applyMixTypeUI();

    setResult(LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку.", "");
    drawChart();
    recalcCost();

    if (costWrap) costWrap.open = false;
  }

  init();
})();
