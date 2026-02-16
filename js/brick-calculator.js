/* =========================================================
   brick-calculator.js — CalcCore
   Brick Calculator: bricks + mortar + cost (optional)
   i18n structure: brick:{...} (same style as your conc:{...})

   Expected DOM IDs:
     - autoCalc
     - mode (wall|area)
     - length, height, area, openingsArea
     - thicknessPreset, thicknessCustomWrap, thickness
     - brickPreset, brickCustomWrap, brickL, brickW, brickH
     - joint, wastePct
     - btnCalc, btnReset, btnCopy
     - btnCopySchedule, btnDownloadCSV
     - mToast, mResult, mDetails
     - growthChart
     - scheduleWrap, scheduleTable (tbody)

   Cost (optional, if present in HTML):
     - costWrap (details)
     - priceBrick, priceMortarM3, delivery, wastePctCost
     - btnSavePrices, btnResetPrices, btnCopyCost, costToast
     - costTotal, costDetails

   Math:
     A = wallArea - openings
     V_wall = A * thickness
     V_mod = (L+joint)*(W+joint)*(H+joint)  [meters]
     N = V_wall / V_mod
     V_brick_solid = N * (L*W*H)
     V_mortar ≈ V_wall - V_brick_solid
========================================================= */

(() => {
  const el = (id) => document.getElementById(id);

  // ---------------- i18n ----------------
  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    if (htmlLang.startsWith("uk")) return "uk";
    return "uk";
  };

  const LANG = detectLang(); // "uk" | "en"
  const LOCALE =
    typeof window.i18nLocale === "function"
      ? window.i18nLocale()
      : LANG === "en"
      ? "en-US"
      : "uk-UA";

  function getBrickDict() {
    const roots = [window.i18n, window.translations, window.I18N].filter(Boolean);

    for (const root of roots) {
      if (root?.brick && typeof root.brick === "object") return root.brick;

      const bucket =
        root?.[LOCALE] ||
        root?.[String(LOCALE).toLowerCase()] ||
        root?.[LANG] ||
        root?.[LANG.toUpperCase()] ||
        null;

      if (bucket?.brick && typeof bucket.brick === "object") return bucket.brick;
    }
    return null;
  }

  const brickDict = getBrickDict() || {};
  const t = (key, fallback = "") => {
    const v = brickDict?.[key];
    if (typeof v === "string" && v.trim()) return v;
    return fallback || key;
  };

  const unitMm = t("unit_mm", LANG === "en" ? "mm" : "мм");
  const unitM = t("unit_m", LANG === "en" ? "m" : "м"); // ✅ FIX: м -> m for EN
  const unitPcs = t("unit_pcs", LANG === "en" ? "pcs" : "шт");
  const unitM2 = t("unit_m2", LANG === "en" ? "m2" :"м²");
  const unitM3 = t("unit_m3", LANG === "en" ? "m3" :"м³");
  const unitL = t("unit_liters", LANG === "en" ? "L" : "л");

  // ---------------- DOM ----------------
  const autoCalc = el("autoCalc");

  const mode = el("mode");
  const length = el("length");
  const height = el("height");
  const area = el("area");
  const openingsArea = el("openingsArea");

  const lengthWrap = el("lengthWrap");
  const heightWrap = el("heightWrap");
  const areaWrap = el("areaWrap");

  const thicknessPreset = el("thicknessPreset");
  const thicknessCustomWrap = el("thicknessCustomWrap");
  const thickness = el("thickness");

  const brickPreset = el("brickPreset");
  const brickCustomWrap = el("brickCustomWrap");
  const brickL = el("brickL");
  const brickW = el("brickW");
  const brickH = el("brickH");

  const joint = el("joint");
  const wastePct = el("wastePct");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const canvas = el("growthChart");
  const ctx = canvas?.getContext?.("2d");

  const scheduleWrap = el("scheduleWrap");
  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");
  const btnDownloadCSV = el("btnDownloadCSV");

  // Cost block (optional)
  const costWrap = el("costWrap");
  const priceBrick = el("priceBrick");
  const priceMortarM3 = el("priceMortarM3");
  const delivery = el("delivery");
  const wastePctCost = el("wastePctCost");

  const btnSavePrices = el("btnSavePrices");
  const btnResetPrices = el("btnResetPrices");
  const btnCopyCost = el("btnCopyCost");
  const costToast = el("costToast");
  const costTotal = el("costTotal");
  const costDetails = el("costDetails");

  // ---------------- Defaults ----------------
  const DEFAULTS = {
    jointMm: 10,
    wastePct: 5,
    thicknessM: 0.25,
    brick: { L: 250, W: 120, H: 65 },
    wastePctCost: 5,
  };

  const LS_KEY = "cc_brick_cost_prices_v1";

  // ---------------- State ----------------
  let tableRows = []; // {item, qty, unit, note}
  let chartBars = []; // {label, valueM3}
  let lastCalc = null; // for cost

  // ---------------- Helpers ----------------
  function setToast(msg) {
    if (!toast) return;
    toast.textContent = msg || "";
  }
  function setCostToast(msg) {
    if (!costToast) return;
    costToast.textContent = msg || "";
  }

  function parseNum(val) {
    if (val == null) return 0;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function fmt(n, maxFrac = 2) {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString(LOCALE, { maximumFractionDigits: maxFrac });
  }

  function safeText(s) {
    return String(s ?? "").replace(/[<>]/g, "");
  }

  function setResult(mainText, extraHtml = "") {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  }

  function symUAH() {
    return "₴";
  }
  function moneyUAH(n) {
    if (!Number.isFinite(n)) return "—";
    return `${fmt(n, 2)} ${symUAH()}`;
  }

  // ---------------- UI: Mode ----------------
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

  // ---------------- UI: Thickness preset ----------------
  function applyThicknessPreset() {
    const v = thicknessPreset?.value || String(DEFAULTS.thicknessM);
    if (v === "custom") {
      if (thicknessCustomWrap) thicknessCustomWrap.style.display = "block";
      if (thickness && !(parseNum(thickness.value) > 0)) thickness.value = String(DEFAULTS.thicknessM);
    } else {
      if (thicknessCustomWrap) thicknessCustomWrap.style.display = "none";
      if (thickness) thickness.value = v;
    }
  }

  function getThicknessM() {
    const n = parseNum(thickness?.value);
    return n > 0 ? n : DEFAULTS.thicknessM;
  }

  // ---------------- UI: Brick preset ----------------
  function parseBrickPreset(value) {
    const parts = String(value || "")
      .split("x")
      .map((x) => parseNum(x));
    if (parts.length !== 3 || parts.some((x) => !(x > 0))) return null;
    return { L: parts[0], W: parts[1], H: parts[2] };
  }

  function applyBrickPreset() {
    const v = brickPreset?.value || "250x120x65";
    if (v === "custom") {
      if (brickCustomWrap) brickCustomWrap.style.display = "block";
      if (brickL && !(parseNum(brickL.value) > 0)) brickL.value = String(DEFAULTS.brick.L);
      if (brickW && !(parseNum(brickW.value) > 0)) brickW.value = String(DEFAULTS.brick.W);
      if (brickH && !(parseNum(brickH.value) > 0)) brickH.value = String(DEFAULTS.brick.H);
    } else {
      if (brickCustomWrap) brickCustomWrap.style.display = "none";
      const b = parseBrickPreset(v) || DEFAULTS.brick;
      if (brickL) brickL.value = String(b.L);
      if (brickW) brickW.value = String(b.W);
      if (brickH) brickH.value = String(b.H);
    }
  }

  function getBrickMm() {
    const Lmm = parseNum(brickL?.value) || DEFAULTS.brick.L;
    const Wmm = parseNum(brickW?.value) || DEFAULTS.brick.W;
    const Hmm = parseNum(brickH?.value) || DEFAULTS.brick.H;
    return { L: Lmm, W: Wmm, H: Hmm };
  }

  function getJointMm() {
    const j = parseNum(joint?.value);
    return j >= 0 ? j : DEFAULTS.jointMm;
  }

  // ---------------- Area ----------------
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

  // ---------------- Table render ----------------
  function renderTable() {
    if (!scheduleTbody) return;

    scheduleTbody.innerHTML = tableRows
      .map(
        (r) => `
        <tr>
          <td>${safeText(r.item)}</td>
          <td>${safeText(r.qty)}</td>
          <td>${safeText(r.unit)}</td>
          <td>${safeText(r.note)}</td>
        </tr>
      `
      )
      .join("");
  }

  // ---------------- Chart render ----------------
  function drawChart() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!chartBars.length) {
      ctx.font = "12px Arial";
      ctx.fillStyle = "#1f2f55";
      ctx.fillText(
        t("chart_need_data", LANG === "en" ? "Calculate to see the chart." : "Зроби розрахунок, щоб побачити графік."),
        12,
        24
      );
      return;
    }

    const W = canvas.width;
    const H = canvas.height;

    const padL = 52,
      padR = 16,
      padT = 16,
      padB = 34;

    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const values = chartBars.map((b) => (Number.isFinite(b.valueM3) ? b.valueM3 : 0));
    const maxV = Math.max(...values, 1e-9);

    // grid + y labels
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
      ctx.fillText(`${fmt(v, 3)} ${unitM3}`, 6, y + 4);
    }

    const n = chartBars.length;
    const gap = 14;
    const barW = Math.max(18, (innerW - gap * (n - 1)) / n);

    chartBars.forEach((b, i) => {
      const x = padL + i * (barW + gap);
      const h = innerH * (b.valueM3 / maxV);
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

  // ---------------- Cost storage ----------------
  function readPrices() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writePrices(obj) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
    } catch {}
  }

  function collectPrices() {
    return {
      priceBrick: parseNum(priceBrick?.value),
      priceMortarM3: parseNum(priceMortarM3?.value),
      delivery: parseNum(delivery?.value),
      wastePctCost: parseNum(wastePctCost?.value),
    };
  }

  function applyPrices(p) {
    if (!p) return;
    if (priceBrick) priceBrick.value = p.priceBrick ?? "";
    if (priceMortarM3) priceMortarM3.value = p.priceMortarM3 ?? "";
    if (delivery) delivery.value = p.delivery ?? "";
    if (wastePctCost) wastePctCost.value = (p.wastePctCost ?? DEFAULTS.wastePctCost).toString();
  }

  function recalcCost() {
    if (!costTotal || !costDetails) return;

    if (!lastCalc) {
      costTotal.textContent = t("cost_need_calc_first", LANG === "en" ? "Calculate first." : "Спочатку зроби розрахунок.");
      costDetails.innerHTML = "";
      return;
    }

    const p = collectPrices();
    const hasAny =
      p.priceBrick > 0 || p.priceMortarM3 > 0 || p.delivery > 0 || (p.wastePctCost || 0) > 0;

    if (!hasAny) {
      costTotal.textContent = t("cost_enter_prices", LANG === "en" ? "Enter prices to see the total cost." : "Введи ціни, щоб побачити вартість.");
      costDetails.innerHTML = "";
      return;
    }

    const wasteK = 1 + Math.max(0, p.wastePctCost || 0) / 100;

    const bricksCost = (lastCalc.bricksNoWaste || 0) * (p.priceBrick || 0) * wasteK;
    const mortarCost = (lastCalc.mortarVolNoWaste || 0) * (p.priceMortarM3 || 0) * wasteK;

    const subtotal = bricksCost + mortarCost;
    const total = subtotal + (p.delivery || 0);
    const perM2 = lastCalc.areaNet > 0 ? total / lastCalc.areaNet : NaN;

    const lblTotal = t("common_total_cost", LANG === "en" ? "Total cost" : "Загальна вартість");
    const lblSubtotal = t("common_subtotal", LANG === "en" ? "Subtotal" : "Проміжний підсумок");
    const lblDelivery = t("common_delivery", LANG === "en" ? "Delivery" : "Доставка");
    const lblPerM2 = t("common_price_per_m2", LANG === "en" ? "Price per 1 m²" : "Ціна за 1 м²");

    costTotal.textContent = `${lblTotal}: ${moneyUAH(total)}`;

    costDetails.innerHTML = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${t("item_bricks", LANG === "en" ? "Bricks" : "Цегла")}</div>
          <div class="m-kpi__v">${moneyUAH(bricksCost)}</div>
          <div class="m-kpi__s">${fmt(lastCalc.bricksNoWaste, 0)} ${unitPcs} • <b>${t("note_waste", LANG === "en" ? "waste" : "запас")}</b> ${fmt(p.wastePctCost || 0, 1)}%</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${t("item_mortar", LANG === "en" ? "Mortar" : "Розчин")}</div>
          <div class="m-kpi__v">${moneyUAH(mortarCost)}</div>
          <div class="m-kpi__s">${fmt(lastCalc.mortarVolNoWaste, 3)} ${unitM3} • <b>${t("note_waste", LANG === "en" ? "waste" : "запас")}</b> ${fmt(p.wastePctCost || 0, 1)}%</div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>${lblSubtotal}</b>: ${moneyUAH(subtotal)}</div>
        <div><b>${lblDelivery}</b>: ${moneyUAH(p.delivery || 0)}</div>
        <div class="m-hintSmall"><b>${lblPerM2}</b>: ${Number.isFinite(perM2) ? moneyUAH(perM2) : "—"}</div>
      </div>
    `;
  }

  // ---------------- Core calculation ----------------
  function calc({ silent = false } = {}) {
    const A = getNetAreaM2();
    const thickM = getThicknessM();
    const brick = getBrickMm();
    const jMm = getJointMm();
    const waste = Math.max(0, parseNum(wastePct?.value) || DEFAULTS.wastePct);

    if (!(A > 0) || !(thickM > 0) || !(brick.L > 0) || !(brick.W > 0) || !(brick.H > 0)) {
      if (!silent) setToast(t("toast_enter_values", LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку."));
      setResult(t("result_enter_values", LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку."), "");
      tableRows = [];
      chartBars = [];
      lastCalc = null;
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      drawChart();
      recalcCost();
      if (scheduleWrap) scheduleWrap.open = false;
      return;
    }

    const wallVol = A * thickM;

    // mm -> m
    const Lm = brick.L / 1000;
    const Wm = brick.W / 1000;
    const Hm = brick.H / 1000;
    const jm = jMm / 1000;

    const modVol = (Lm + jm) * (Wm + jm) * (Hm + jm);
    if (!(modVol > 0)) {
      if (!silent) setToast(t("toast_enter_values", LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку."));
      return;
    }

    const bricksNoWaste = wallVol / modVol;
    const bricksWithWaste = bricksNoWaste * (1 + waste / 100);

    const brickVolSingle = Lm * Wm * Hm;
    const bricksSolidVol = bricksNoWaste * brickVolSingle;

    const mortarVolNoWaste = Math.max(0, wallVol - bricksSolidVol);
    const mortarVolWithWaste = mortarVolNoWaste * (1 + waste / 100);

    lastCalc = {
      areaNet: A,
      wallVol,
      bricksNoWaste,
      bricksWithWaste,
      mortarVolNoWaste,
      mortarVolWithWaste,
    };

    setToast("");

    // Main result line
    const mainLine = `${t("main", LANG === "en" ? "Bricks quantity" : "Кількість цегли")}: ${fmt(
      bricksWithWaste,
      0
    )} ${unitPcs}`;

    const labelJoint = t("label_joint", LANG === "en" ? "Joint" : "Шов");
    const labelWaste = t("note_waste", LANG === "en" ? "waste" : "запас");

    setResult(
      mainLine,
      `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${t("kpi_area", LANG === "en" ? "Net area" : "Площа (чиста)")}</div>
          <div class="m-kpi__v">${fmt(A, 2)} ${unitM2}</div>
          <div class="m-kpi__s">${t("kpi_area_hint", LANG === "en" ? "After openings" : "З урахуванням отворів")}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${t("kpi_wall_volume", LANG === "en" ? "Wall volume" : "Об’єм стіни")}</div>
          <div class="m-kpi__v">${fmt(wallVol, 3)} ${unitM3}</div>
          <div class="m-kpi__s">${t("kpi_wall_volume_hint", LANG === "en" ? "Area × thickness" : "Площа × товщина")} (${fmt(thickM, 3)} ${unitM})</div>
          <!-- ✅ FIX: was "м", now unitM -> "m" in EN -->
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${t("kpi_bricks_no_waste", LANG === "en" ? "Bricks (no waste)" : "Цегла (без запасу)")}</div>
          <div class="m-kpi__v">${fmt(bricksNoWaste, 0)} ${unitPcs}</div>
          <div class="m-kpi__s">${t("kpi_bricks_no_waste_hint", LANG === "en" ? "By module with joint" : "За модулем з швом")}: ${fmt(modVol, 6)} ${unitM3}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${t("kpi_mortar", LANG === "en" ? "Mortar" : "Розчин")}</div>
          <div class="m-kpi__v">${fmt(mortarVolWithWaste, 3)} ${unitM3}</div>
          <div class="m-kpi__s">${fmt(mortarVolWithWaste * 1000, 0)} ${unitL} (${t("note_liters_approx", "≈")})</div>
        </div>
      </div>

      <div class="m-summary">
        <div>
          <b>${t("summary", LANG === "en" ? "Parameters" : "Параметри")}</b>:
          ${fmt(brick.L,0)}×${fmt(brick.W,0)}×${fmt(brick.H,0)} ${unitMm}
        </div>

        <div>
          <b>${labelJoint}</b>: ${fmt(jMm, 1)} ${unitMm} •
          <b>${labelWaste}</b>: ${fmt(waste, 1)}%
        </div>

        <div class="m-hintSmall">
          ${t("summary_hint", LANG === "en"
            ? "Mortar ≈ (wall volume − solid brick volume). Add 5–10% extra for real-world waste."
            : "Розчин ≈ (об’єм стіни − об’єм цегли без швів). Для реального об’єкта закладай запас 5–10%.")}
        </div>
      </div>
      `
    );

    // Table
    tableRows = [
      {
        item: t("item_bricks", LANG === "en" ? "Bricks" : "Цегла"),
        qty: fmt(bricksWithWaste, 0),
        unit: unitPcs,
        note: `${t("note_no_waste", LANG === "en" ? "no waste" : "без запасу")}: ${fmt(bricksNoWaste, 0)} • ${labelWaste} ${fmt(waste, 1)}%`,
      },
      {
        item: t("item_mortar", LANG === "en" ? "Mortar" : "Розчин"),
        qty: fmt(mortarVolWithWaste, 3),
        unit: unitM3,
        note: `${t("note_liters_approx", "≈")} ${fmt(mortarVolWithWaste * 1000, 0)} ${unitL} • ${t("note_no_waste", LANG === "en" ? "no waste" : "без запасу")}: ${fmt(mortarVolNoWaste, 3)} ${unitM3}`,
      },
      {
        item: t("item_area", LANG === "en" ? "Net masonry area" : "Площа кладки (чиста)"),
        qty: fmt(A, 2),
        unit: unitM2,
        note: t("note_openings", LANG === "en" ? "Area after subtracting openings" : "Площа після віднімання отворів"),
      },
      {
        item: t("item_wall_volume", LANG === "en" ? "Wall volume" : "Об’єм стіни"),
        qty: fmt(wallVol, 3),
        unit: unitM3,
        note: t("note_area_times_thickness", LANG === "en" ? "Area × thickness" : "Площа × товщина"),
      },
    ];

    // Chart
    chartBars = [
      { label: t("chart_wall", LANG === "en" ? "Wall" : "Стіна"), valueM3: wallVol },
      { label: t("chart_mortar", LANG === "en" ? "Mortar" : "Розчин"), valueM3: mortarVolNoWaste },
      { label: t("chart_mortar_waste", LANG === "en" ? "Mortar+waste" : "Розчин+запас"), valueM3: mortarVolWithWaste },
    ];

    renderAll();
    recalcCost();
    if (scheduleWrap) scheduleWrap.open = false;
  }

  // ---------------- Reset ----------------
  function reset() {
    if (mode) mode.value = "wall";
    if (length) length.value = "";
    if (height) height.value = "";
    if (area) area.value = "";
    if (openingsArea) openingsArea.value = "";

    if (thicknessPreset) thicknessPreset.value = String(DEFAULTS.thicknessM);
    if (thickness) thickness.value = String(DEFAULTS.thicknessM);
    if (thicknessCustomWrap) thicknessCustomWrap.style.display = "none";

    if (brickPreset) brickPreset.value = "250x120x65";
    applyBrickPreset();

    if (joint) joint.value = String(DEFAULTS.jointMm);
    if (wastePct) wastePct.value = String(DEFAULTS.wastePct);

    applyModeUI();
    applyThicknessPreset();

    setToast(t("toast_reset", LANG === "en" ? "Reset done." : "Скинуто."));
    setResult(t("result_enter_values", LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку."), "");

    tableRows = [];
    chartBars = [];
    lastCalc = null;

    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;

    drawChart();
    recalcCost();

    setTimeout(() => setToast(""), 1200);
  }

  // ---------------- Copy result ----------------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt || txt === t("result_enter_values", "")) {
      setToast(t("toast_need_calc_first", LANG === "en" ? "Calculate first." : "Спочатку зроби розрахунок."));
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(t("copied_result", LANG === "en" ? "Result copied." : "Скопійовано результат."));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(t("copy_failed", LANG === "en" ? "Copy failed." : "Не вдалося скопіювати."));
    }
  }

  // ---------------- Copy table / Download CSV ----------------
  async function copySchedule() {
    if (!scheduleTable) return;
    const trs = Array.from(scheduleTable.querySelectorAll("tr"));
    const lines = trs.map((tr) =>
      Array.from(tr.children)
        .map((td) => td.innerText.replace(/\s+/g, " ").trim())
        .join("\t")
    );
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      setToast(t("copied_table", LANG === "en" ? "Table copied." : "Скопійовано таблицю."));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(t("copy_table_failed", LANG === "en" ? "Failed to copy table." : "Не вдалося скопіювати таблицю."));
    }
  }

  function downloadCSV() {
    if (!scheduleTable) return;

    const rowsCSV = Array.from(scheduleTable.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.children)
        .map((td) => `"${td.innerText.replace(/"/g, '""').trim()}"`)
        .join(",")
    );

    const csv = rowsCSV.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "brick-materials.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    setToast(t("csv_downloaded", LANG === "en" ? "CSV downloaded." : "CSV завантажено."));
    setTimeout(() => setToast(""), 1500);
  }

  // ---------------- Cost buttons (optional) ----------------
  async function copyCost() {
    const txt = (costTotal?.textContent || "").trim();
    if (!txt) {
      setCostToast(t("cost_nothing_to_copy", LANG === "en" ? "Nothing to copy." : "Немає що копіювати."));
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setCostToast(t("cost_copied", LANG === "en" ? "Copied." : "Скопійовано."));
      setTimeout(() => setCostToast(""), 1200);
    } catch {
      setCostToast(t("copy_failed", LANG === "en" ? "Copy failed." : "Не вдалося скопіювати."));
    }
  }

  function savePrices() {
    const p = collectPrices();
    writePrices(p);
    setCostToast(t("cost_saved", LANG === "en" ? "Prices saved." : "Ціни збережено."));
    setTimeout(() => setCostToast(""), 1200);
  }

  function resetPrices() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}

    if (priceBrick) priceBrick.value = "";
    if (priceMortarM3) priceMortarM3.value = "";
    if (delivery) delivery.value = "";
    if (wastePctCost) wastePctCost.value = String(DEFAULTS.wastePctCost);

    setCostToast(t("cost_reset", LANG === "en" ? "Prices reset." : "Ціни скинуто."));
    recalcCost();
    setTimeout(() => setCostToast(""), 1200);
  }

  // ---------------- Auto-calc debounce ----------------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  // ---------------- Events ----------------
  mode?.addEventListener("change", () => {
    applyModeUI();
    scheduleAuto();
  });

  thicknessPreset?.addEventListener("change", () => {
    applyThicknessPreset();
    scheduleAuto();
  });

  brickPreset?.addEventListener("change", () => {
    applyBrickPreset();
    scheduleAuto();
  });

  [length, height, area, openingsArea, thickness, brickL, brickW, brickH, joint, wastePct].forEach((x) =>
    x?.addEventListener("input", scheduleAuto)
  );

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  [priceBrick, priceMortarM3, delivery, wastePctCost].forEach((x) =>
    x?.addEventListener("input", () => recalcCost())
  );

  btnSavePrices?.addEventListener("click", savePrices);
  btnResetPrices?.addEventListener("click", resetPrices);
  btnCopyCost?.addEventListener("click", copyCost);

  // Enter = calculate
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    calc({ silent: false });
  });

  // ---------------- Init ----------------
  function init() {
    if (joint && !joint.value) joint.value = String(DEFAULTS.jointMm);
    if (wastePct && !wastePct.value) wastePct.value = String(DEFAULTS.wastePct);
    if (wastePctCost && !wastePctCost.value) wastePctCost.value = String(DEFAULTS.wastePctCost);

    applyModeUI();
    applyThicknessPreset();
    applyBrickPreset();

    const saved = readPrices();
    if (saved) applyPrices(saved);

    setResult(t("result_enter_values", LANG === "en" ? "Enter inputs to calculate." : "Введи дані для розрахунку."), "");
    drawChart();
    recalcCost();

    if (costWrap) costWrap.open = false;
  }

  init();
})();
