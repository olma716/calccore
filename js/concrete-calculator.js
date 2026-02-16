/* =========================================================
   concrete-calculator.js — CalcCore (UK)
   Cement / Concrete Calculator + Materials + Cost (optional, details closed)

   Works with the UK HTML you approved (IDs must match):
   Inputs:
     - autoCalc, shape, length, width, height, diameter
     - grade, dryFactor, wcrPreset, wcr (custom), bagSize
   Actions:
     - btnCalc, btnReset, btnCopy
     - btnCopySchedule, btnDownloadCSV  (button text says Excel, file is CSV)
   Outputs:
     - mToast, mResult, mDetails
     - growthChart (canvas)
     - scheduleWrap, scheduleTable (tbody)
   Cost block (details#costWrap, closed by default in HTML):
     - priceCementBag, priceSandM3, priceGravelM3, priceWaterM3, delivery, wastePct
     - btnSavePrices, btnResetPrices, btnCopyCost, costToast
     - costTotal, costDetails

   Notes:
     - Cement density ≈ 1440 kg/m³
     - Water (L) ≈ cement(kg) × W/C
     - Dry volume factor default 1.54
========================================================= */

(() => {
  const el = (id) => document.getElementById(id);

  // ---------- Locale / i18n fallback (we keep UI mostly static in HTML) ----------
  const LOCALE =
    typeof window.i18nLocale === "function"
      ? window.i18nLocale()
      : String(document.documentElement.lang || "")
          .toLowerCase()
          .startsWith("en")
        ? "en-US"
        : "uk-UA";

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");

  const shape = el("shape");
  const length = el("length");
  const width = el("width");
  const height = el("height");
  const diameter = el("diameter");

  const grade = el("grade");
  const dryFactor = el("dryFactor");
  const bagSize = el("bagSize");

  const wcrPreset = el("wcrPreset");
  const wcrCustomWrap = el("wcrCustomWrap");
  const wcr = el("wcr");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  // wrappers for shape fields
  const widthWrap = el("widthWrap");
  const heightWrap = el("heightWrap");
  const diameterWrap = el("diameterWrap");

  // chart
  const canvas = el("growthChart");
  const ctx = canvas?.getContext?.("2d");

  // schedule table
  const scheduleWrap = el("scheduleWrap");
  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");
  const btnDownloadCSV = el("btnDownloadCSV");

  // cost block
  const costWrap = el("costWrap"); // details (closed by default in HTML)
  const priceCementBag = el("priceCementBag");
  const priceSandM3 = el("priceSandM3");
  const priceGravelM3 = el("priceGravelM3");
  const priceWaterM3 = el("priceWaterM3");
  const delivery = el("delivery");
  const wastePct = el("wastePct");

  const btnSavePrices = el("btnSavePrices");
  const btnResetPrices = el("btnResetPrices");
  const btnCopyCost = el("btnCopyCost");
  const costToast = el("costToast");

  const costTotal = el("costTotal");
  const costDetails = el("costDetails");

  // ---------- Constants ----------
  const CEMENT_DENSITY = 1440; // kg / m³ (bulk)
  const DEFAULTS = {
    dryFactor: 1.54,
    bagSize: 50,
    wcr: 0.5,
    wastePct: 5,
  };

  const LS_KEY = "cc_concrete_cost_prices_v1";

  // ---------- State caches ----------
  let tableRows = []; // { item, volM3, kg, note }
  let chartBars = []; // { label, valueM3 }
  let lastCalc = null; // for cost: { wetM3, cementBags, sandM3, gravelM3, waterL }

  // ---------- Helpers ----------
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

  function symUAH() {
    return "₴";
  }

  function moneyUAH(n) {
    if (!Number.isFinite(n)) return "—";
    return `${fmt(n, 2)} ${symUAH()}`;
  }

  function setResult(mainText, extraHtml = "") {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  }

  function safeText(s) {
    return String(s || "").replace(/[<>]/g, "");
  }

  function parseRatio(str) {
    // "1:2:4" or "1:1.5:3"
    const parts = String(str || "")
      .split(":")
      .map((x) => parseNum(x));
    if (parts.length !== 3 || parts.some((x) => !(x > 0))) return null;
    const sum = parts[0] + parts[1] + parts[2];
    return { c: parts[0], s: parts[1], g: parts[2], sum };
  }

  // ---------- Shape UI ----------
  function setHeightLabel(text) {
    const lbl = heightWrap?.querySelector?.("label");
    if (lbl) lbl.textContent = text;
  }
  function setWidthLabel(text) {
    const lbl = widthWrap?.querySelector?.("label");
    if (lbl) lbl.textContent = text;
  }
  function setLengthLabel(text) {
    const lbl = length?.closest(".mcalc__field")?.querySelector?.("label");
    if (lbl) lbl.textContent = text;
  }

  function showFieldsByShape() {
    const v = shape?.value || "slab";

    // defaults visible
    if (widthWrap) widthWrap.style.display = "";
    if (heightWrap) heightWrap.style.display = "";
    if (diameterWrap) diameterWrap.style.display = "none";

    // default labels
    setLengthLabel("Довжина (м)");
    setWidthLabel("Ширина (м)");
    setHeightLabel("Висота / товщина (м)");

    if (v === "slab" || v === "footing") {
      setHeightLabel("Товщина (м)");
      setWidthLabel("Ширина (м)");
      setLengthLabel("Довжина (м)");
    } else if (v === "beam") {
      setHeightLabel("Висота (м)");
      setWidthLabel("Ширина (м)");
      setLengthLabel("Довжина (м)");
    } else if (v === "wall") {
      // wall: length × height × thickness (we reuse width input as thickness)
      setLengthLabel("Довжина (м)");
      setHeightLabel("Висота (м)");
      setWidthLabel("Товщина (м)");
    } else if (v === "columnRect") {
      setLengthLabel("Довжина (м)");
      setWidthLabel("Ширина (м)");
      setHeightLabel("Висота (м)");
    } else if (v === "columnRound") {
      // Use LENGTH as Height to avoid extra fields; hide heightWrap and widthWrap; show diameterWrap
      if (widthWrap) widthWrap.style.display = "none";
      if (heightWrap) heightWrap.style.display = "none";
      if (diameterWrap) diameterWrap.style.display = "";

      setLengthLabel("Висота (м)");
      // diameter has its own label in diameterWrap
    }
  }

  // ---------- W/C preset UX ----------
  function initWcrPreset() {
    if (!wcrPreset) return;

    const apply = () => {
      const v = wcrPreset.value;

      if (v === "custom") {
        if (wcrCustomWrap) wcrCustomWrap.style.display = "block";
        // keep wcr as user input; if empty put default
        if (wcr && !(parseNum(wcr.value) > 0)) wcr.value = String(DEFAULTS.wcr);
      } else {
        if (wcrCustomWrap) wcrCustomWrap.style.display = "none";
        if (wcr) wcr.value = v;
      }
    };

    wcrPreset.addEventListener("change", () => {
      apply();
      scheduleAuto();
    });

    // initial
    if (wcr && !wcr.value) wcr.value = String(DEFAULTS.wcr);
    apply();
  }

  function getWcrValue() {
    const v = parseNum(wcr?.value);
    return v > 0 ? v : DEFAULTS.wcr;
  }

  // ---------- Volume calc ----------
  function calcWetVolumeM3() {
    const v = shape?.value || "slab";
    const L = parseNum(length?.value);

    if (v === "columnRound") {
      const H = L; // length field is "Height" for round column
      const D = parseNum(diameter?.value);
      if (!(H > 0) || !(D > 0)) return 0;
      const r = D / 2;
      return Math.PI * r * r * H;
    }

    const W = parseNum(width?.value);
    const H = parseNum(height?.value);

    if (v === "wall") {
      // length × height × thickness (width = thickness)
      if (!(L > 0) || !(H > 0) || !(W > 0)) return 0;
      return L * H * W;
    }

    // rectangular: length × width × height/thickness
    if (!(L > 0) || !(W > 0) || !(H > 0)) return 0;
    return L * W * H;
  }

  // ---------- Render table ----------
  function renderTable() {
    if (!scheduleTbody) return;

    scheduleTbody.innerHTML = tableRows
      .map(
        (r) => `
        <tr>
          <td>${safeText(r.item)}</td>
          <td>${Number.isFinite(r.volM3) ? `${fmt(r.volM3, 3)} м³` : "—"}</td>
          <td>${Number.isFinite(r.kg) ? `${fmt(r.kg, 1)} кг` : "—"}</td>
          <td>${safeText(r.note)}</td>
        </tr>
      `
      )
      .join("");
  }

  // ---------- Render chart (simple bars) ----------
  function drawChart() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!chartBars.length) {
      ctx.font = "12px Arial";
      ctx.fillStyle = "#1f2f55";
      ctx.fillText("Зроби розрахунок, щоб побачити графік.", 12, 24);
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
    const maxV = Math.max(...values, 1);

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
      ctx.fillText(`${fmt(v, 2)} м³`, 6, y + 4);
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
      const t = b.label;
      const tw = ctx.measureText(t).width;
      ctx.fillText(t, x + barW / 2 - tw / 2, H - 12);
    });
  }

  function renderAll() {
    renderTable();
    drawChart();
  }

  // ---------- Cost (optional) ----------
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
      priceCementBag: parseNum(priceCementBag?.value),
      priceSandM3: parseNum(priceSandM3?.value),
      priceGravelM3: parseNum(priceGravelM3?.value),
      priceWaterM3: parseNum(priceWaterM3?.value),
      delivery: parseNum(delivery?.value),
      wastePct: parseNum(wastePct?.value),
    };
  }

  function applyPrices(p) {
    if (!p) return;
    if (priceCementBag) priceCementBag.value = p.priceCementBag ?? "";
    if (priceSandM3) priceSandM3.value = p.priceSandM3 ?? "";
    if (priceGravelM3) priceGravelM3.value = p.priceGravelM3 ?? "";
    if (priceWaterM3) priceWaterM3.value = p.priceWaterM3 ?? "";
    if (delivery) delivery.value = p.delivery ?? "";
    if (wastePct) wastePct.value = (p.wastePct ?? DEFAULTS.wastePct).toString();
  }

  function recalcCost() {
    if (!costTotal || !costDetails) return;

    if (!lastCalc) {
      costTotal.textContent = "Спочатку зроби розрахунок бетону.";
      costDetails.innerHTML = "";
      return;
    }

    const p = collectPrices();
    const hasAny =
      p.priceCementBag > 0 ||
      p.priceSandM3 > 0 ||
      p.priceGravelM3 > 0 ||
      p.priceWaterM3 > 0 ||
      p.delivery > 0 ||
      p.wastePct > 0;

    if (!hasAny) {
      costTotal.textContent = "Введи ціни, щоб побачити вартість.";
      costDetails.innerHTML = "";
      return;
    }

    const cementCost = (lastCalc.cementBags || 0) * (p.priceCementBag || 0);
    const sandCost = (lastCalc.sandM3 || 0) * (p.priceSandM3 || 0);
    const gravelCost = (lastCalc.gravelM3 || 0) * (p.priceGravelM3 || 0);

    const waterM3 = (lastCalc.waterL || 0) / 1000;
    const waterCost = waterM3 * (p.priceWaterM3 || 0);

    const subtotal = cementCost + sandCost + gravelCost + waterCost;
    const waste = subtotal * ((p.wastePct || 0) / 100);
    const total = subtotal + waste + (p.delivery || 0);

    const perM3 = lastCalc.wetM3 > 0 ? total / lastCalc.wetM3 : NaN;

    costTotal.textContent = `Загальна вартість: ${moneyUAH(total)}`;

    costDetails.innerHTML = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">Цемент</div>
          <div class="m-kpi__v">${moneyUAH(cementCost)}</div>
          <div class="m-kpi__s">${fmt(lastCalc.cementBags, 1)} мішків</div>
        </div>
        <div class="m-kpi">
          <div class="m-kpi__k">Пісок</div>
          <div class="m-kpi__v">${moneyUAH(sandCost)}</div>
          <div class="m-kpi__s">${fmt(lastCalc.sandM3, 3)} м³</div>
        </div>
        <div class="m-kpi">
          <div class="m-kpi__k">Щебінь</div>
          <div class="m-kpi__v">${moneyUAH(gravelCost)}</div>
          <div class="m-kpi__s">${fmt(lastCalc.gravelM3, 3)} м³</div>
        </div>
        <div class="m-kpi">
          <div class="m-kpi__k">Вода</div>
          <div class="m-kpi__v">${moneyUAH(waterCost)}</div>
          <div class="m-kpi__s">${fmt(lastCalc.waterL, 0)} л</div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>Проміжний підсумок</b>: ${moneyUAH(subtotal)}</div>
        <div><b>Запас/втрати (${fmt(p.wastePct || 0, 1)}%)</b>: ${moneyUAH(waste)}</div>
        <div><b>Доставка</b>: ${moneyUAH(p.delivery || 0)}</div>
        <div class="m-hintSmall"><b>Ціна за 1 м³ бетону</b>: ${Number.isFinite(perM3) ? moneyUAH(perM3) : "—"}</div>
      </div>
    `;
  }

  // ---------- Core calculation ----------
  function calc({ silent = false } = {}) {
    const wetM3 = calcWetVolumeM3();
    const r = parseRatio(grade?.value);
    const df = parseNum(dryFactor?.value) || DEFAULTS.dryFactor;
    const bag = parseNum(bagSize?.value) || DEFAULTS.bagSize;
    const wc = getWcrValue();

    if (!(wetM3 > 0) || !r) {
      if (!silent) setToast("Введи коректні розміри.");
      setResult("Введи розміри для розрахунку.", "");
      tableRows = [];
      chartBars = [];
      lastCalc = null;
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      drawChart();
      recalcCost();
      if (scheduleWrap) scheduleWrap.open = false;
      return;
    }

    const dryM3 = wetM3 * df;

    const cementVolM3 = dryM3 * (r.c / r.sum);
    const sandVolM3 = dryM3 * (r.s / r.sum);
    const gravelVolM3 = dryM3 * (r.g / r.sum);

    const cementKg = cementVolM3 * CEMENT_DENSITY;
    const cementBags = bag > 0 ? cementKg / bag : NaN;

    const waterL = cementKg * wc; // 1 kg ≈ 1 L
    const waterKg = waterL;

    // cache for cost
    lastCalc = {
      wetM3,
      cementBags,
      sandM3: sandVolM3,
      gravelM3: gravelVolM3,
      waterL,
    };

    // UI result
    setToast("");
    setResult(
      `Об’єм бетону: ${fmt(wetM3, 3)} м³`,
      `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">Мокрий об’єм</div>
          <div class="m-kpi__v">${fmt(wetM3, 3)} м³</div>
          <div class="m-kpi__s">За розмірами</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">Сухий об’єм</div>
          <div class="m-kpi__v">${fmt(dryM3, 3)} м³</div>
          <div class="m-kpi__s">Мокрий × ${fmt(df, 2)}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">Цемент</div>
          <div class="m-kpi__v">${fmt(cementBags, 1)} мішків</div>
          <div class="m-kpi__s">${fmt(cementKg, 0)} кг • ${fmt(cementVolM3, 3)} м³</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">Вода</div>
          <div class="m-kpi__v">${fmt(waterL, 0)} л</div>
          <div class="m-kpi__s">В/Ц ${fmt(wc, 2)} (розрахунок автоматично)</div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>Суміш</b>: ${fmt(r.c, 2)}:${fmt(r.s, 2)}:${fmt(r.g, 2)}</div>
        <div><b>Матеріали (за сухим об’ємом)</b>:
          цемент ${fmt(cementVolM3, 3)} м³,
          пісок ${fmt(sandVolM3, 3)} м³,
          щебінь ${fmt(gravelVolM3, 3)} м³
        </div>
        <div class="m-hintSmall">
          Примітка: густина цементу ≈ 1440 кг/м³. Вода ≈ цемент(кг) × В/Ц.
        </div>
      </div>
      `
    );

    // table
    tableRows = [
      {
        item: "Цемент",
        volM3: cementVolM3,
        kg: cementKg,
        note: `${fmt(cementBags, 1)} мішків @ ${fmt(bag, 0)} кг`,
      },
      { item: "Пісок", volM3: sandVolM3, kg: NaN, note: "Оцінка за об’ємом" },
      { item: "Щебінь", volM3: gravelVolM3, kg: NaN, note: "Оцінка за об’ємом" },
      { item: "Вода", volM3: NaN, kg: waterKg, note: `${fmt(waterL, 0)} л` },
    ];

    // chart bars
    chartBars = [
      { label: "Цемент", valueM3: cementVolM3 },
      { label: "Пісок", valueM3: sandVolM3 },
      { label: "Щебінь", valueM3: gravelVolM3 },
    ];

    renderAll();
    recalcCost();
    if (scheduleWrap) scheduleWrap.open = false;
  }

  // ---------- Reset ----------
  function reset() {
    if (shape) shape.value = "slab";
    if (length) length.value = "";
    if (width) width.value = "";
    if (height) height.value = "";
    if (diameter) diameter.value = "";

    if (grade) grade.value = "1:2:4";
    if (dryFactor) dryFactor.value = String(DEFAULTS.dryFactor);
    if (bagSize) bagSize.value = String(DEFAULTS.bagSize);

    if (wcrPreset) wcrPreset.value = "0.50";
    if (wcr) wcr.value = "0.50";
    if (wcrCustomWrap) wcrCustomWrap.style.display = "none";

    showFieldsByShape();

    setToast("Скинуто.");
    setResult("Введи розміри для розрахунку.", "");

    tableRows = [];
    chartBars = [];
    lastCalc = null;

    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;

    drawChart();
    recalcCost();

    setTimeout(() => setToast(""), 1200);
  }

  // ---------- Copy result ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt || txt.includes("Введи")) {
      setToast("Спочатку зроби розрахунок.");
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast("Скопійовано результат.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast("Не вдалося скопіювати.");
    }
  }

  // ---------- Copy table / Download CSV ----------
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
      setToast("Скопійовано таблицю.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast("Не вдалося скопіювати таблицю.");
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
    a.download = "concrete-materials.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setToast("Таблицю завантажено (Excel).");
    setTimeout(() => setToast(""), 1500);
  }

  // ---------- Cost buttons ----------
  async function copyCost() {
    const txt = (costTotal?.textContent || "").trim();
    if (!txt || txt.includes("Введи") || txt.includes("Спочатку")) {
      setCostToast("Немає що копіювати.");
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setCostToast("Скопійовано.");
      setTimeout(() => setCostToast(""), 1200);
    } catch {
      setCostToast("Не вдалося скопіювати.");
    }
  }

  function savePrices() {
    const p = collectPrices();
    writePrices(p);
    setCostToast("Ціни збережено.");
    setTimeout(() => setCostToast(""), 1200);
  }

  function resetPrices() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}

    if (priceCementBag) priceCementBag.value = "";
    if (priceSandM3) priceSandM3.value = "";
    if (priceGravelM3) priceGravelM3.value = "";
    if (priceWaterM3) priceWaterM3.value = "";
    if (delivery) delivery.value = "";
    if (wastePct) wastePct.value = String(DEFAULTS.wastePct);

    setCostToast("Ціни скинуто.");
    recalcCost();
    setTimeout(() => setCostToast(""), 1200);
  }

  // ---------- Auto-calc debounce ----------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  // ---------- Events ----------
  shape?.addEventListener("change", () => {
    showFieldsByShape();
    scheduleAuto();
  });

  [length, width, height, diameter, grade, dryFactor, bagSize, wcr].forEach((x) =>
    x?.addEventListener("input", scheduleAuto)
  );

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  // cost input live recalc (even if details closed)
  [priceCementBag, priceSandM3, priceGravelM3, priceWaterM3, delivery, wastePct].forEach((x) =>
    x?.addEventListener("input", () => {
      recalcCost();
    })
  );

  btnSavePrices?.addEventListener("click", savePrices);
  btnResetPrices?.addEventListener("click", resetPrices);
  btnCopyCost?.addEventListener("click", copyCost);

  // Enter = calculate
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    calc({ silent: false });
  });

  // ---------- Init ----------
  function init() {
    // set defaults if empty
    if (dryFactor && !dryFactor.value) dryFactor.value = String(DEFAULTS.dryFactor);
    if (bagSize && !bagSize.value) bagSize.value = String(DEFAULTS.bagSize);
    if (wastePct && !wastePct.value) wastePct.value = String(DEFAULTS.wastePct);

    showFieldsByShape();
    initWcrPreset();

    // load saved prices
    const saved = readPrices();
    if (saved) applyPrices(saved);
    if (!wastePct?.value) wastePct.value = String(DEFAULTS.wastePct);

    // initial UI
    setResult("Введи розміри для розрахунку.", "");
    drawChart();
    recalcCost();

    // ensure costWrap stays closed unless user opens it
    if (costWrap) costWrap.open = false;
  }

  init();
})();
