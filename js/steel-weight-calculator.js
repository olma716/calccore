(() => {
  const el = (id) => document.getElementById(id);

  // ---------- language / locale ----------
  const detectLang = () => {
    const htmlLang = (document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    if (htmlLang.startsWith("uk")) return "uk";
    // fallback by path
    if (location.pathname.startsWith("/en/")) return "en";
    return "uk";
  };

  const LANG = detectLang(); // "uk" | "en"
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const I18N = {
    uk: {
      // generic
      enterInputs: "Введи дані для розрахунку.",
      invalidInputs: "Введи коректні дані для розрахунку.",
      resetDone: "Скинуто.",
      copiedResult: "Скопійовано результат.",
      copyFail: "Не вдалося скопіювати.",
      copiedTable: "Скопійовано таблицю.",
      copyTableFail: "Не вдалося скопіювати таблицю.",
      csvDone: "CSV завантажено.",
      chartHint: "Зроби розрахунок, щоб побачити графік.",
      firstCalc: "Спочатку зроби розрахунок.",
      enterPrices: "Введи ціни, щоб побачити загальну вартість.",
      pricesSaved: "Ціни збережено.",
      pricesReset: "Ціни скинуто.",
      copied: "Скопійовано.",

      // units
      mm: "мм",
      m: "м",
      lm: "м.п.",
      m2: "м²",
      m3: "м³",
      kg: "кг",
      t: "т",

      // names
      name_round: "Арматура/пруток",
      name_wire: "Катанка",
      name_pipe: "Труба",
      name_rectPipe: "Профільна труба",
      name_flat: "Смуга",
      name_square: "Квадрат",
      name_plate_sheet: "Лист",
      name_plate_strip: "Смуга з листа",
      name_angle: "Кутник",
      name_channel: "Швеллер",
      name_ibeam: "Двотавр",

      // injected options/tabs
      tab_round: "Арматура/пруток",
      tab_wire: "Катанка",
      tab_channel: "Швеллер",
      tab_ibeam: "Балка двотаврова",

      opt_wire: "Катанка (Ø)",
      opt_channel: "Швелер (за масою 1 м або геометрією)",
      opt_ibeam: "Балка двотаврова (за масою 1 м або геометрією)",

      plateChoiceSheet: "Лист (Ш×В×т)",
      plateChoiceStrip: "Смуга з листа (Ш×т×Д)",

      // channel/ibeam UI
      ch_title: "Швелер: обери режим",
      ib_title: "Двотавр: обери режим",
      modeLabel: "Режим",
      mode_kgm: "За сортаментом: маса 1 м (кг/м)",
      mode_geo: "Приблизно: геометрія (h×b×s×t)",
      modeHint: "Рекомендовано: кг/м — точніше. Геометрія — оцінка без радіусів/уклонів.",
      kgmLabel: "Маса 1 м (кг/м)",
      hLabel: "Висота h (мм)",
      bLabel: "Ширина полиці b (мм)",
      sLabel: "Товщина стінки s (мм)",
      tLabel: "Товщина полиці t (мм)",
      geoHint: "Підказка: h—висота, b—ширина, s—товщина стінки, t—товщина полиці",

      // result blocks
      kpi_totalWeight: "Загальна вага",
      kpi_perLm: "На 1 м.п.",
      kpi_area: "Площа",
      kpi_volume: "Об’єм",
      kpi_qty: "Кількість",
      kpi_totalLen: "Довжина (разом)",
      noWaste: "Без запасу",
      waste: "Запас",
      params: "Параметри",
      extra: "Додатково",
      linearMass: "Лінійна маса",

      // sheet viz legend
      legend: "Позначення:",
      sheetLegend_w: "W — ширина (мм)",
      sheetLegend_h: "H — друга сторона (довжина) (мм)",
      sheetLegend_t: "t — товщина (мм)",

      // strip viz legend
      stripLegend_L: "L — довжина (м.п.)",
      stripLegend_b: "W — ширина (мм)",
      stripLegend_t: "t — товщина (мм)",

      // cost
      totalCost: "Загальна вартість",
      metal: "Метал",
      delivery: "Доставка",
      price: "Ціна",
      currencyNote: "Валюта довільна — ми просто множимо.",
      approxPerLm: "≈ / 1 м.п.",
      approxPerM2: "≈ / 1 м²",
    },

    en: {
      // generic
      enterInputs: "Enter inputs to calculate.",
      invalidInputs: "Please enter valid values to calculate.",
      resetDone: "Reset done.",
      copiedResult: "Result copied.",
      copyFail: "Copy failed.",
      copiedTable: "Table copied.",
      copyTableFail: "Failed to copy table.",
      csvDone: "CSV downloaded.",
      chartHint: "Run a calculation to see the chart.",
      firstCalc: "Run a calculation first.",
      enterPrices: "Enter prices to see the total cost.",
      pricesSaved: "Prices saved.",
      pricesReset: "Prices reset.",
      copied: "Copied.",

      // units
      mm: "mm",
      m: "m",
      lm: "lm", // linear meters
      m2: "m²",
      m3: "m³",
      kg: "kg",
      t: "t",

      // names
      name_round: "Round bar / rebar",
      name_wire: "Wire rod",
      name_pipe: "Pipe",
      name_rectPipe: "Rectangular tube",
      name_flat: "Strip",
      name_square: "Square bar",
      name_plate_sheet: "Sheet",
      name_plate_strip: "Strip from sheet",
      name_angle: "Angle",
      name_channel: "Channel",
      name_ibeam: "I-beam",

      // injected options/tabs
      tab_round: "Round bar / rebar",
      tab_wire: "Wire rod",
      tab_channel: "Channel",
      tab_ibeam: "I-beam",

      opt_wire: "Wire rod (Ø)",
      opt_channel: "Channel (kg/m or geometry)",
      opt_ibeam: "I-beam (kg/m or geometry)",

      plateChoiceSheet: "Sheet (W×H×t)",
      plateChoiceStrip: "Strip from sheet (W×t×L)",

      // channel/ibeam UI
      ch_title: "Channel: choose mode",
      ib_title: "I-beam: choose mode",
      modeLabel: "Mode",
      mode_kgm: "Standard tables: mass per 1 m (kg/m)",
      mode_geo: "Approx.: geometry (h×b×s×t)",
      modeHint: "Recommended: kg/m is more accurate. Geometry is an approximation (no radii/tapers).",
      kgmLabel: "Mass per 1 m (kg/m)",
      hLabel: "Height h (mm)",
      bLabel: "Flange width b (mm)",
      sLabel: "Web thickness s (mm)",
      tLabel: "Flange thickness t (mm)",
      geoHint: "Hint: h—height, b—flange width, s—web thickness, t—flange thickness",

      // result blocks
      kpi_totalWeight: "Total weight",
      kpi_perLm: "Per 1 lm",
      kpi_area: "Area",
      kpi_volume: "Volume",
      kpi_qty: "Quantity",
      kpi_totalLen: "Total length",
      noWaste: "No waste",
      waste: "Waste/extra",
      params: "Parameters",
      extra: "Extra",
      linearMass: "Linear mass",

      // sheet viz legend
      legend: "Legend:",
      sheetLegend_w: "W — width (mm)",
      sheetLegend_h: "H — sheet length (mm)",
      sheetLegend_t: "t — thickness (mm)",

      // strip viz legend
      stripLegend_L: "L — length (lm)",
      stripLegend_b: "W — width (mm)",
      stripLegend_t: "t — thickness (mm)",

      // cost
      totalCost: "Total cost",
      metal: "Metal",
      delivery: "Delivery",
      price: "Price",
      currencyNote: "Currency is arbitrary — we just multiply.",
      approxPerLm: "≈ / 1 lm",
      approxPerM2: "≈ / 1 m²",
    },
  };

  const t = (k) => (I18N[LANG] && I18N[LANG][k]) || I18N.en[k] || k;

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
  const unitMm = t("mm");
  const unitM = t("m");
  const unitMp = t("lm");
  const unitM2 = t("m2");
  const unitM3 = t("m3");
  const unitKg = t("kg");
  const unitT = t("t");

  // ---------- DOM (existing) ----------
  const autoCalc = el("autoCalc");

  const shapeSelect = el("shape");
  const shapeTabs = el("shapeTabs");

  const lengthM = el("lengthM");
  const qty = el("qty");
  const density = el("density");
  const wastePct = el("wastePct");
  const lengthHint = el("lengthHint");

  // Geometry blocks (existing)
  const roundFields = el("roundFields");
  const pipeFields = el("pipeFields");
  const rectPipeFields = el("rectPipeFields");
  const squareFields = el("squareFields");
  const flatFields = el("flatFields");
  const plateSheetFields = el("plateSheetFields");
  const plateStripFields = el("plateStripFields");
  const angleFields = el("angleFields");

  // Inputs (existing)
  const diameterMm = el("diameterMm");

  const odMm = el("odMm");
  const pipeTmm = el("thicknessMm");

  const aMm = el("aMm");
  const bMm = el("bMm");
  const rectTmm = el("thicknessMm2");

  const sideMm = el("sideMm");

  const flatWidthMm = el("flatWidthMm");
  const flatThicknessMm = el("flatThicknessMm");

  const plateWidthMm = el("plateWidthMm");
  const plateHeightMm = el("plateHeightMm");
  const plateThicknessMm = el("plateThicknessMm");

  const stripWidthMm = el("stripWidthMm");
  const stripThicknessMm = el("stripThicknessMm");

  const angleAmm = el("angleAmm");
  const angleBmm = el("angleBmm");
  const angleTmm = el("angleTmm");

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

  // Viz
  const shapeViz = el("shapeViz");

  // Cost
  const costWrap = el("costWrap");
  const priceMode = el("priceMode"); // kg | ton
  const pricePerUnit = el("pricePerUnit");
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
    density: 7850,
    qty: 1,
    lengthM: 6,
    wastePct: 0,
    wastePctCost: 5,
    kgPerM: 10,
  };

  // ---------- state ----------
  const LS_KEY = "cc_steel_prices_v3";
  let tableRows = [];
  let chartBars = [];
  let lastCalc = null;

  let plateSub = "plateSheet";
  let plateChoiceUI = null;

  // ---------- helpers UI ----------
  const setToast = (msg) => {
    if (toast) toast.textContent = msg || "";
  };
  const setCostToast = (msg) => {
    if (costToast) costToast.textContent = msg || "";
  };

  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  const mm2_to_m2 = (Amm2) => Amm2 * 1e-6;
  const mm_to_m = (xmm) => xmm / 1000;
  const clampPos = (n) => Math.max(0, n);

  // ---------- inject CSS for yellow highlight (mode blocks) ----------
  function injectModeHighlightCSS() {
    if (document.getElementById("ccModeHLStyles")) return;
    const st = document.createElement("style");
    st.id = "ccModeHLStyles";
    st.textContent = `
      .cc-modehl{
        background: rgba(255, 205, 0, .18);
        border: 1px solid rgba(255, 205, 0, .42);
        border-radius: 14px;
        padding: 10px;
      }
      .cc-modehl .mcalc__label{ font-weight: 700; }
    `;
    document.head.appendChild(st);
  }

  // ---------- inject new UI (options + tabs + fields) ----------
  function ensureOption(value, label) {
    if (!shapeSelect) return;
    const exists = Array.from(shapeSelect.options).some((o) => o.value === value);
    if (!exists) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      shapeSelect.appendChild(opt);
    }
  }

  function ensureTab(value, label) {
    if (!shapeTabs) return;
    const exists = shapeTabs.querySelector(`.m-shape[data-shape="${CSS.escape(value)}"]`);
    if (exists) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "m-shape";
    btn.setAttribute("data-shape", value);
    btn.innerHTML = `<span class="m-ico2" aria-hidden="true"></span><span>${safeText(label)}</span>`;
    shapeTabs.appendChild(btn);
  }

  function createFieldBlock(id, title, innerHTML) {
    const wrap = document.createElement("div");
    wrap.id = id;
    wrap.className = "m-full";
    wrap.style.display = "none";
    wrap.innerHTML = `
      <div class="mcalc__rows">
        <div class="mcalc__field m-full">
          <div class="mcalc__hint" style="margin-top:-4px;"><b>${safeText(title)}</b></div>
        </div>
        ${innerHTML}
      </div>
    `;
    return wrap;
  }

  // Channel / I-beam fields
  let channelFields = null;
  let ibeamFields = null;

  // Inputs inside injected blocks
  let channelMode = null,
    channelKgPerM = null,
    chH = null,
    chB = null,
    chS = null,
    chT = null;

  let ibeamMode = null,
    ibeamKgPerM = null,
    ibH = null,
    ibB = null,
    ibS = null,
    ibT = null;

  function injectNewBlocks() {
    injectModeHighlightCSS();

    // Options
    ensureOption("wire", t("opt_wire"));
    ensureOption("channel", t("opt_channel"));
    ensureOption("ibeam", t("opt_ibeam"));

    // Tabs (rename existing round)
    const roundTab = shapeTabs?.querySelector(`.m-shape[data-shape="round"] span:last-child`);
    if (roundTab) roundTab.textContent = t("tab_round");

    ensureTab("wire", t("tab_wire"));
    ensureTab("channel", t("tab_channel"));
    ensureTab("ibeam", t("tab_ibeam"));

    // Inject plate choice UI
    if (shapeTabs && !plateChoiceUI) {
      plateChoiceUI = document.createElement("div");
      plateChoiceUI.className = "m-shapes";
      plateChoiceUI.id = "plateChoice";
      plateChoiceUI.style.display = "none";
      plateChoiceUI.style.marginTop = "8px";
      plateChoiceUI.innerHTML = `
        <button type="button" class="m-shape is-active" data-plate="plateSheet">
          <span class="m-ico2" aria-hidden="true"></span><span>${safeText(t("plateChoiceSheet"))}</span>
        </button>
        <button type="button" class="m-shape" data-plate="plateStrip">
          <span class="m-ico2" aria-hidden="true"></span><span>${safeText(t("plateChoiceStrip"))}</span>
        </button>
      `;
      shapeTabs.parentNode?.insertBefore(plateChoiceUI, shapeTabs.nextSibling);
    }

    // Inject channelFields + ibeamFields inside LEFT rows, before actions block (btnCalc)
    const rowsRoot = btnCalc?.closest(".mcalc__rows");
    const actionsField = btnCalc?.closest(".mcalc__field");

    if (rowsRoot && actionsField && !channelFields) {
      channelFields = createFieldBlock(
        "channelFields",
        t("ch_title"),
        `
          <div class="mcalc__field m-full cc-modehl">
            <label class="mcalc__label" for="channelMode">${safeText(t("modeLabel"))}</label>
            <select id="channelMode" class="mcalc__select">
              <option value="kgm" selected>${safeText(t("mode_kgm"))}</option>
              <option value="geo">${safeText(t("mode_geo"))}</option>
            </select>
            <div class="mcalc__hint">${safeText(t("modeHint"))}</div>
          </div>

          <div class="mcalc__field" id="chKgWrap">
            <label class="mcalc__label" for="channelKgPerM">${safeText(t("kgmLabel"))}</label>
            <input id="channelKgPerM" class="mcalc__input" type="text" inputmode="decimal" placeholder="e.g.: 10.5" />
          </div>

          <div class="mcalc__field" id="chHWrap" style="display:none;">
            <label class="mcalc__label" for="chH">${safeText(t("hLabel"))}</label>
            <input id="chH" class="mcalc__input" type="text" inputmode="decimal" placeholder="e.g.: 100" />
          </div>

          <div class="mcalc__field" id="chBWrap" style="display:none;">
            <label class="mcalc__label" for="chB">${safeText(t("bLabel"))}</label>
            <input id="chB" class="mcalc__input" type="text" inputmode="decimal" placeholder="e.g.: 50" />
          </div>

          <div class="mcalc__field" id="chSWrap" style="display:none;">
            <label class="mcalc__label" for="chS">${safeText(t("sLabel"))}</label>
            <input id="chS" class="mcalc__input" type="text" inputmode="decimal" placeholder="e.g.: 5" />
          </div>

          <div class="mcalc__field" id="chTWrap" style="display:none;">
            <label class="mcalc__label" for="chT">${safeText(t("tLabel"))}</label>
            <input id="chT" class="mcalc__input" type="text" inputmode="decimal" placeholder="e.g.: 7" />
          </div>
        `
      );

      ibeamFields = createFieldBlock(
        "ibeamFields",
        t("ib_title"),
        `
          <div class="mcalc__field m-full cc-modehl">
            <label class="mcalc__label" for="ibeamMode">${safeText(t("modeLabel"))}</label>
            <select id="ibeamMode" class="mcalc__select">
              <option value="kgm" selected>${safeText(t("mode_kgm"))}</option>
              <option value="geo">${safeText(t("mode_geo"))}</option>
            </select>
            <div class="mcalc__hint">${safeText(t("modeHint"))}</div>
          </div>

          <div class="mcalc__field" id="ibKgWrap">
            <label class="mcalc__label" for="ibeamKgPerM">${safeText(t("kgmLabel"))}</label>
            <input id="ibeamKgPerM" class="mcalc__input" type="text" inputmode="decimal" placeholder="e.g.: 20.1" />
          </div>

          <div class="mcalc__field" id="ibHWrap" style="display:none;">
            <label class="mcalc__label" for="ibH">${safeText(t("hLabel"))}</label>
            <input id="ibH" class="mcalc__input" type="text" inputmode="decimal" placeholder="e.g.: 200" />
          </div>

          <div class="mcalc__field" id="ibBWrap" style="display:none;">
            <label class="mcalc__label" for="ibB">${safeText(t("bLabel"))}</label>
            <input id="ibB" class="mcalc__input" type="text" inputmode="decimal" placeholder="e.g.: 100" />
          </div>

          <div class="mcalc__field" id="ibSWrap" style="display:none;">
            <label class="mcalc__label" for="ibS">${safeText(t("sLabel"))}</label>
            <input id="ibS" class="mcalc__input" type="text" inputmode="decimal" placeholder="e.g.: 6" />
          </div>

          <div class="mcalc__field" id="ibTWrap" style="display:none;">
            <label class="mcalc__label" for="ibT">${safeText(t("tLabel"))}</label>
            <input id="ibT" class="mcalc__input" type="text" inputmode="decimal" placeholder="e.g.: 10" />
          </div>
        `
      );

      rowsRoot.insertBefore(channelFields, actionsField);
      rowsRoot.insertBefore(ibeamFields, actionsField);

      // grab injected inputs
      channelMode = el("channelMode");
      channelKgPerM = el("channelKgPerM");
      chH = el("chH");
      chB = el("chB");
      chS = el("chS");
      chT = el("chT");

      ibeamMode = el("ibeamMode");
      ibeamKgPerM = el("ibeamKgPerM");
      ibH = el("ibH");
      ibB = el("ibB");
      ibS = el("ibS");
      ibT = el("ibT");

      // defaults
      if (channelKgPerM && !channelKgPerM.value) channelKgPerM.value = String(DEFAULTS.kgPerM);
      if (ibeamKgPerM && !ibeamKgPerM.value) ibeamKgPerM.value = String(DEFAULTS.kgPerM);

      // mode switch handlers
      channelMode?.addEventListener("change", () => {
        const geo = channelMode.value === "geo";
        el("chKgWrap").style.display = geo ? "none" : "";
        el("chHWrap").style.display = geo ? "" : "none";
        el("chBWrap").style.display = geo ? "" : "none";
        el("chSWrap").style.display = geo ? "" : "none";
        el("chTWrap").style.display = geo ? "" : "none";
        scheduleAuto();
        renderViz();
      });

      ibeamMode?.addEventListener("change", () => {
        const geo = ibeamMode.value === "geo";
        el("ibKgWrap").style.display = geo ? "none" : "";
        el("ibHWrap").style.display = geo ? "" : "none";
        el("ibBWrap").style.display = geo ? "" : "none";
        el("ibSWrap").style.display = geo ? "" : "none";
        el("ibTWrap").style.display = geo ? "" : "none";
        scheduleAuto();
        renderViz();
      });

      [channelKgPerM, chH, chB, chS, chT, ibeamKgPerM, ibH, ibB, ibS, ibT].forEach((x) =>
        x?.addEventListener("input", () => {
          scheduleAuto();
          renderViz();
        })
      );
    }

    // Plate choice handlers
    plateChoiceUI?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button[data-plate]");
      if (!btn) return;
      plateSub = btn.getAttribute("data-plate") || "plateSheet";

      Array.from(plateChoiceUI.querySelectorAll("button[data-plate]")).forEach((b) =>
        b.classList.toggle("is-active", b === btn)
      );

      if (shapeSelect) {
        shapeSelect.value = plateSub;
        setActiveTab("plate");
      }

      applyShapeUI({ animate: true });
      scheduleAuto();
    });
  }

  // ---------- tabs <-> select sync ----------
  function setActiveTab(tabShape) {
    if (!shapeTabs) return;
    const btns = Array.from(shapeTabs.querySelectorAll(".m-shape[data-shape]"));
    btns.forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-shape") === tabShape));
  }

  function tabToSelectValue(tabShape) {
    if (tabShape === "plate") return plateSub || "plateSheet";
    if (tabShape === "wire") return "wire";
    if (tabShape === "channel") return "channel";
    if (tabShape === "ibeam") return "ibeam";
    return tabShape;
  }

  function selectToTabValue(selValue) {
    if (selValue === "plateSheet" || selValue === "plateStrip") return "plate";
    return selValue;
  }

  function normalizeShapeValue(v) {
    const s = String(v || "round");
    if (s === "plate" || s === "plateSheet") return "plateSheet";
    if (s === "plateStrip") return "plateStrip";
    if (s === "plateStripFields") return "plateStrip";
    if (s === "plateSheetFields") return "plateSheet";
    return s;
  }

  // ---------- show/hide fields + hints ----------
  function hideAllBlocks() {
    const all = [
      roundFields,
      pipeFields,
      rectPipeFields,
      squareFields,
      flatFields,
      plateSheetFields,
      plateStripFields,
      angleFields,
      channelFields,
      ibeamFields,
    ].filter(Boolean);

    all.forEach((b) => (b.style.display = "none"));
  }

  function applyShapeUI({ animate = false } = {}) {
    const rowsRoot = btnCalc?.closest(".mcalc__rows");
    if (animate && rowsRoot) {
      rowsRoot.classList.add("is-switching");
      setTimeout(() => rowsRoot.classList.remove("is-switching"), 180);
    }

    const v = normalizeShapeValue(shapeSelect?.value);
    const tab = selectToTabValue(v);

    if (plateChoiceUI) plateChoiceUI.style.display = tab === "plate" ? "" : "none";
    setActiveTab(tab);

    hideAllBlocks();

    if (lengthHint) {
      lengthHint.textContent =
        v === "plateSheet"
          ? (LANG === "en"
              ? "For “Sheet W×H×t”, length is not required (you can keep 1)."
              : "Для листа «Ш×В×т» довжина не потрібна (можеш залишити 1).")
          : v === "plateStrip"
          ? (LANG === "en"
              ? "For strip from sheet, length is required (m) — linear meters."
              : "Для смуги з листа довжина потрібна (м) — це погонні метри.")
          : (LANG === "en"
              ? "For most elements, length is required (m)."
              : "Для більшості елементів довжина потрібна (м).");
    }

    if (v === "round" || v === "wire") {
      if (roundFields) roundFields.style.display = "";
    } else if (v === "pipe") {
      if (pipeFields) pipeFields.style.display = "";
    } else if (v === "rectPipe") {
      if (rectPipeFields) rectPipeFields.style.display = "";
    } else if (v === "square") {
      if (squareFields) squareFields.style.display = "";
    } else if (v === "flat") {
      if (flatFields) flatFields.style.display = "";
    } else if (v === "plateSheet") {
      if (plateSheetFields) plateSheetFields.style.display = "";
    } else if (v === "plateStrip") {
      if (plateStripFields) plateStripFields.style.display = "";
    } else if (v === "angle") {
      if (angleFields) angleFields.style.display = "";
    } else if (v === "channel") {
      if (channelFields) channelFields.style.display = "";
      channelMode?.dispatchEvent(new Event("change"));
    } else if (v === "ibeam") {
      if (ibeamFields) ibeamFields.style.display = "";
      ibeamMode?.dispatchEvent(new Event("change"));
    }

    renderViz();
  }

  // ---------- table ----------
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
        </tr>`
      )
      .join("");
  }

  // ---------- chart ----------
  function drawChart() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!chartBars.length) {
      ctx.font = "12px Arial";
      ctx.fillStyle = "#1f2f55";
      ctx.fillText(t("chartHint"), 12, 24);
      return;
    }

    const W = canvas.width,
      H = canvas.height;
    const padL = 52,
      padR = 16,
      padT = 16,
      padB = 34;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const values = chartBars.map((b) => (Number.isFinite(b.value) ? b.value : 0));
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
      ctx.fillText(fmt(v, 3), 6, y + 4);
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

  // ---------- viz (SVG) ----------
  function svgWrap(inner, title = "") {
    return `
      <svg viewBox="0 0 520 220" role="img" aria-label="${safeText(title)}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="rgba(40,59,105,.18)"/>
            <stop offset="1" stop-color="rgba(40,59,105,.06)"/>
          </linearGradient>

          <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(31,47,85,.75)"/>
          </marker>

          <style>
            .shape { fill: url(#g1); stroke: rgba(31,47,85,.55); stroke-width: 3; }
            .dim   { stroke: rgba(31,47,85,.70); stroke-width: 2; marker-start: url(#arr); marker-end: url(#arr); }
            .txt   { fill: rgba(31,47,85,.92); font-size: 12px; font-family: Arial, sans-serif; }
            .ttl   { fill: rgba(31,47,85,.95); font-size: 16px; font-weight: 700; font-family: Arial, sans-serif; }
            .hint  { fill: rgba(31,47,85,.70); font-size: 11px; font-family: Arial, sans-serif; }
            .mono  { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
          </style>
        </defs>

        <rect x="12" y="12" width="496" height="196" rx="16" fill="rgba(40,59,105,.03)" stroke="rgba(40,59,105,.12)"/>
        ${inner}
      </svg>
    `;
  }

  function renderViz() {
    if (!shapeViz) return;
    const v = normalizeShapeValue(shapeSelect?.value);

    const dimH = (x1, x2, y, label, tx, ty) => `
      <line class="dim" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>
      <text class="txt mono" x="${tx ?? (x1 + x2) / 2}" y="${ty ?? y - 6}" text-anchor="middle">${safeText(label)}</text>
    `;

    const dimV = (x, y1, y2, label, tx, ty) => `
      <line class="dim" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>
      <text class="txt mono" x="${tx ?? x + 10}" y="${ty ?? (y1 + y2) / 2 + 4}" text-anchor="start">${safeText(label)}</text>
    `;

    let inner = "";

    if (v === "round" || v === "wire") {
      inner = `
        <text class="ttl" x="26" y="42">${safeText(v === "wire" ? t("name_wire") : t("name_round"))} (Ø)</text>
        <circle cx="200" cy="120" r="60" class="shape"/>
        <line class="dim" x1="140" y1="120" x2="260" y2="120"/>
        <text class="txt mono" x="200" y="110" text-anchor="middle">Ø (${unitMm})</text>
      `;
    }

    else if (v === "pipe") {
      inner = `
        <text class="ttl" x="26" y="42">${safeText(t("name_pipe"))}</text>
        <g transform="translate(220,120)">
          <circle r="75" fill="#e5e7ec" stroke="#2f3b52" stroke-width="2"/>
          <circle r="50" fill="#ffffff" stroke="#2f3b52" stroke-width="2"/>
          <line x1="-50" y1="50" x2="50" y2="-50" stroke="#2f3b52" stroke-width="1.5" marker-start="url(#arr)" marker-end="url(#arr)"/>
          <text x="0" y="10" text-anchor="middle" font-size="13" fill="#2f3b52">D</text>
          <line x1="50" y1="0" x2="75" y2="0" stroke="#2f3b52" stroke-width="1.5" marker-start="url(#arr)" marker-end="url(#arr)"/>
          <text x="85" y="4" font-size="13" fill="#2f3b52">t</text>
        </g>
      `;
    }

    else if (v === "rectPipe") {
      inner = `
        <text class="ttl" x="26" y="42">${safeText(t("name_rectPipe"))}</text>
        <g transform="translate(220,120)">
          <rect x="-85" y="-55" width="170" height="110" rx="14" ry="14" fill="#e5e7ec" stroke="#2f3b52" stroke-width="2"/>
          <rect x="-60" y="-35" width="120" height="70" rx="10" ry="10" fill="#ffffff" stroke="#2f3b52" stroke-width="2"/>
          <line x1="-85" y1="72" x2="85" y2="72" stroke="#2f3b52" stroke-width="1.5" marker-start="url(#arr)" marker-end="url(#arr)"/>
          <text x="0" y="90" text-anchor="middle" font-size="13" fill="#2f3b52">A</text>
          <line x1="-102" y1="-55" x2="-102" y2="55" stroke="#2f3b52" stroke-width="1.5" marker-start="url(#arr)" marker-end="url(#arr)"/>
          <text x="-112" y="5" text-anchor="end" font-size="13" fill="#2f3b52">B</text>
          <line x1="60" y1="0" x2="85" y2="0" stroke="#2f3b52" stroke-width="1.5" marker-start="url(#arr)" marker-end="url(#arr)"/>
          <text x="95" y="4" font-size="13" fill="#2f3b52">t</text>
        </g>
      `;
    }

    else if (v === "flat") {
      inner = `
        <text class="ttl" x="26" y="42">${safeText(t("name_flat"))}</text>
        <rect x="110" y="100" width="240" height="36" rx="8" class="shape"/>
        <line class="dim" x1="110" y1="160" x2="350" y2="160"/>
        <text class="txt mono" x="230" y="176" text-anchor="middle">W (${unitMm})</text>
        <line class="dim" x1="380" y1="100" x2="380" y2="136"/>
        <text class="txt mono" x="390" y="120">t (${unitMm})</text>
      `;
    }

    else if (v === "square") {
      inner = `
        <text class="ttl" x="26" y="42">${safeText(t("name_square"))}</text>
        <g transform="translate(220,110)">
          <rect x="-70" y="-70" width="140" height="140" rx="14" ry="14" fill="#e5e7ec" stroke="#2f3b52" stroke-width="2"/>
          <line x1="-70" y1="90" x2="70" y2="90" stroke="#2f3b52" stroke-width="1.5" marker-start="url(#arr)" marker-end="url(#arr)"/>
          <text x="0" y="108" text-anchor="middle" font-size="13" fill="#2f3b52">a</text>
          <line x1="-95" y1="-70" x2="-95" y2="70" stroke="#2f3b52" stroke-width="1.5" marker-start="url(#arr)" marker-end="url(#arr)"/>
          <text x="-105" y="5" text-anchor="end" font-size="13" fill="#2f3b52">a</text>
        </g>
      `;
    }

    else if (v === "plateSheet") {
      // NOTE: arrow t position you said you've already adjusted — keep this block flexible.
      inner = `
        <text class="ttl" x="26" y="42">${safeText(t("name_plate_sheet"))}</text>
        <g transform="translate(210,98)">
          <rect x="-90" y="-60" width="180" height="120" rx="18" ry="18" fill="#e5e7ec" stroke="#2f3b52" stroke-width="2"/>
          <line x1="-90" y1="80" x2="90" y2="80" stroke="#2f3b52" stroke-width="1.3" marker-start="url(#arr)" marker-end="url(#arr)"/>
          <text x="0" y="98" text-anchor="middle" font-size="13" fill="#2f3b52">W</text>

          <line x1="-115" y1="-60" x2="-115" y2="60" stroke="#2f3b52" stroke-width="1.3" marker-start="url(#arr)" marker-end="url(#arr)"/>
          <text x="-125" y="5" text-anchor="end" font-size="13" fill="#2f3b52">H</text>

          <!-- thickness arrow (you can tweak x/y if needed) -->
          <line x1="95" y1="-35" x2="125" y2="-35" stroke="#2f3b52" stroke-width="1.3" marker-start="url(#arr)" marker-end="url(#arr)"/>
          <text x="135" y="-30" font-size="13" fill="#2f3b52">t</text>
        </g>

        <foreignObject x="330" y="75" width="260" height="110">
          <div xmlns="http://www.w3.org/1999/xhtml"
              style="font: 13px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Arial; color:#2f3b52;">
            <div><b>${safeText(t("legend"))}</b></div>
            <div><span style="font-family:ui-monospace,monospace;">${safeText(t("sheetLegend_w"))}</span></div>
            <div><span style="font-family:ui-monospace,monospace;">${safeText(t("sheetLegend_h"))}</span></div>
            <div><span style="font-family:ui-monospace,monospace;">${safeText(t("sheetLegend_t"))}</span></div>
          </div>
        </foreignObject>
      `;
    }

    else if (v === "plateStrip") {
      inner = `
        <text class="ttl" x="26" y="42">${safeText(t("name_plate_strip"))}</text>

        <rect x="90" y="92" width="260" height="54" rx="14" class="shape"/>

        <line class="dim" x1="70" y1="92" x2="70" y2="146"/>
        <text class="txt mono" x="58" y="122" text-anchor="end">W (${unitMm})</text>

        <line class="dim" x1="90" y1="170" x2="350" y2="170"/>
        <text class="txt mono" x="220" y="194" text-anchor="middle">L (${unitMp})</text>

        <line class="dim" x1="260" y1="72" x2="330" y2="72"/>
        <text class="txt mono" x="295" y="60" text-anchor="middle">t (${unitMm})</text>

        <text class="hint" x="380" y="96">${safeText(t("legend"))}</text>
        <text class="hint" x="380" y="116">${safeText(t("stripLegend_L"))}</text>
        <text class="hint" x="380" y="136">${safeText(t("stripLegend_b"))}</text>
        <text class="hint" x="380" y="156">${safeText(t("stripLegend_t"))}</text>
      `;
    }

    else if (v === "angle") {
      inner = `
        <text class="ttl" x="26" y="42">${safeText(t("name_angle"))}</text>
        <path d="M170 70 H360 V100 H200 V200 H170 Z" class="shape"/>
        ${dimH(170, 360, 50, `A (${unitMm})`, 265, 42)}
        ${dimV(150, 70, 200, `B (${unitMm})`, 140, 138)}
        ${dimV(370, 70, 100, `t (${unitMm})`, 382, 88)}
        <text class="hint" x="490" y="206" text-anchor="end">
          ${safeText(LANG === "en" ? "Simplified: no inner/outer radii" : "Спрощено: без внутр./зовн. радіусів")}
        </text>
      `;
    }

    else if (v === "channel") {
      const mode = channelMode?.value || "kgm";
      inner = `<text class="ttl" x="26" y="42">${safeText(t("name_channel"))}</text>
        <path d="M175 70 H335 V95 H205 V145 H335 V170 H175 Z" class="shape"/>`;

      if (mode === "geo") {
        inner += `
          ${dimV(155, 70, 170, `h`, 145, 122)}
          ${dimH(174, 335, 58, `b`, 270, 48)}
          ${dimV(355, 70, 95, `t`, 365, 84)}
          ${dimH(180, 205, 120, `s`, 190, 110)}
          <text class="hint" x="490" y="206" text-anchor="end">${safeText(t("geoHint"))}</text>
        `;
      }
    }

    else if (v === "ibeam") {
      const mode = ibeamMode?.value || "kgm";
      inner = `<text class="ttl" x="26" y="42">${safeText(t("name_ibeam"))}</text>
        <path d="M180 55 H340 V85 H270 V155 H340 V185 H180 V155 H250 V85 H180 Z" class="shape"/>`;

      if (mode === "geo") {
        inner += `
          ${dimV(170, 55, 190, `h`, 160, 130)}
          ${dimH(186, 340, 45, `b`, 280, 35)}
          ${dimH(252, 267, 128, `s`, 280, 120)}
          ${dimV(356, 58, 88, `t`, 370, 76)}
          <text class="hint" x="26" y="206">${safeText(t("geoHint"))}</text>
        `;
      }
    }

    shapeViz.innerHTML = inner ? svgWrap(inner, LANG === "en" ? "Element visualization" : "Візуалізація елемента") : "";
  }

  // ---------- cost storage ----------
  function readPrices() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
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
      priceMode: priceMode?.value || "kg",
      pricePerUnit: parseNum(pricePerUnit?.value),
      delivery: parseNum(delivery?.value),
      wastePctCost: parseNum(wastePctCost?.value),
    };
  }
  function applyPrices(p) {
    if (!p) return;
    if (priceMode) priceMode.value = p.priceMode || "kg";
    if (pricePerUnit) pricePerUnit.value = p.pricePerUnit ?? "";
    if (delivery) delivery.value = p.delivery ?? "";
    if (wastePctCost) wastePctCost.value = (p.wastePctCost ?? DEFAULTS.wastePctCost).toString();
  }

  function recalcCost() {
    if (!costTotal || !costDetails) return;

    if (!lastCalc) {
      costTotal.textContent = t("firstCalc");
      costDetails.innerHTML = "";
      return;
    }

    const p = collectPrices();
    const hasAny = p.pricePerUnit > 0 || p.delivery > 0 || (p.wastePctCost || 0) > 0;

    if (!hasAny) {
      costTotal.textContent = t("enterPrices");
      costDetails.innerHTML = "";
      return;
    }

    const wasteK = 1 + clampPos(p.wastePctCost || 0) / 100;
    const pricePerKg = p.priceMode === "ton" ? (p.pricePerUnit || 0) / 1000 : p.pricePerUnit || 0;

    const matCost = (lastCalc.massKgNoWaste || 0) * pricePerKg * wasteK;
    const total = matCost + (p.delivery || 0);

    const perM = lastCalc.mpTotal > 0 ? total / lastCalc.mpTotal : NaN;
    const perM2 = lastCalc.areaM2Total > 0 ? total / lastCalc.areaM2Total : NaN;

    costTotal.textContent = `${t("totalCost")}: ${fmt(total, 2)}`;
    costDetails.innerHTML = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${safeText(t("metal"))}</div>
          <div class="m-kpi__v">${fmt(matCost, 2)}</div>
          <div class="m-kpi__s">${safeText(t("waste"))}: ${fmt(p.wastePctCost || 0, 1)}%</div>
        </div>
        <div class="m-kpi">
          <div class="m-kpi__k">${safeText(t("delivery"))}</div>
          <div class="m-kpi__v">${fmt(p.delivery || 0, 2)}</div>
          <div class="m-kpi__s">${
            Number.isFinite(perM)
              ? `${fmt(perM, 2)} ${safeText(t("approxPerLm"))}`
              : Number.isFinite(perM2)
              ? `${fmt(perM2, 2)} ${safeText(t("approxPerM2"))}`
              : "—"
          }</div>
        </div>
      </div>
      <div class="m-summary">
        <div><b>${safeText(t("price"))}</b>: ${fmt(p.pricePerUnit || 0, 2)} / ${p.priceMode === "ton" ? unitT : unitKg}</div>
        <div class="m-hintSmall">${safeText(t("currencyNote"))}</div>
      </div>
    `;
  }

  // ---------- calc core ----------
  function getCommon() {
    const L = clampPos(parseNum(lengthM?.value) || DEFAULTS.lengthM);
    const Q = clampPos(parseNum(qty?.value) || DEFAULTS.qty);
    const dens = clampPos(parseNum(density?.value) || DEFAULTS.density);
    const waste = clampPos(parseNum(wastePct?.value) || DEFAULTS.wastePct);
    return { L, Q, dens, waste };
  }

  function calcAreaM2ForShape(shape, common) {
    const v = normalizeShapeValue(shape);

    if (v === "round" || v === "wire") {
      const d = clampPos(parseNum(diameterMm?.value));
      if (!(d > 0)) return null;
      const r = mm_to_m(d) / 2;
      const A = Math.PI * r * r;
      return { areaM2: A, note: `Ø ${fmt(d, 1)} ${unitMm}` };
    }

    if (v === "pipe") {
      const od = clampPos(parseNum(odMm?.value));
      const tP = clampPos(parseNum(pipeTmm?.value));
      if (!(od > 0) || !(tP > 0) || !(od > 2 * tP)) return null;
      const Ro = mm_to_m(od) / 2;
      const Ri = mm_to_m(od - 2 * tP) / 2;
      const A = Math.PI * (Ro * Ro - Ri * Ri);
      return { areaM2: A, note: `Ø ${fmt(od, 1)} ${unitMm}, t ${fmt(tP, 1)} ${unitMm}` };
    }

    if (v === "rectPipe") {
      const A = clampPos(parseNum(aMm?.value));
      const B = clampPos(parseNum(bMm?.value));
      const tR = clampPos(parseNum(rectTmm?.value));
      if (!(A > 0) || !(B > 0) || !(tR > 0) || !(A > 2 * tR) || !(B > 2 * tR)) return null;
      const Ao = mm2_to_m2(A * B);
      const Ai = mm2_to_m2((A - 2 * tR) * (B - 2 * tR));
      const areaM2 = Ao - Ai;
      return { areaM2, note: `${fmt(A, 0)}×${fmt(B, 0)} ${unitMm}, t ${fmt(tR, 1)} ${unitMm}` };
    }

    if (v === "square") {
      const a = clampPos(parseNum(sideMm?.value));
      if (!(a > 0)) return null;
      const areaM2 = mm2_to_m2(a * a);
      return { areaM2, note: `a ${fmt(a, 0)} ${unitMm}` };
    }

    if (v === "flat") {
      const w = clampPos(parseNum(flatWidthMm?.value));
      const tt = clampPos(parseNum(flatThicknessMm?.value));
      if (!(w > 0) || !(tt > 0)) return null;
      const areaM2 = mm2_to_m2(w * tt);
      return { areaM2, note: `${fmt(w, 0)}×${fmt(tt, 1)} ${unitMm}` };
    }

    if (v === "plateSheet") {
      const w = clampPos(parseNum(plateWidthMm?.value));
      const h = clampPos(parseNum(plateHeightMm?.value));
      const tt = clampPos(parseNum(plateThicknessMm?.value));
      if (!(w > 0) || !(h > 0) || !(tt > 0)) return null;

      const volM3_perPiece = w * h * tt * 1e-9;
      const areaM2_perPiece = w * h * 1e-6;

      return {
        areaM2: NaN,
        note: `${t("name_plate_sheet")} ${fmt(w, 0)}×${fmt(h, 0)}×${fmt(tt, 1)} ${unitMm}`,
        extra: { volM3_perPiece, areaM2_perPiece },
      };
    }

    if (v === "plateStrip") {
      const w = clampPos(parseNum(stripWidthMm?.value));
      const tt = clampPos(parseNum(stripThicknessMm?.value));
      if (!(w > 0) || !(tt > 0)) return null;
      const areaM2 = mm2_to_m2(w * tt);
      return { areaM2, note: `W×t: ${fmt(w, 0)}×${fmt(tt, 1)} ${unitMm}`, extra: { stripWidthMm: w } };
    }

    if (v === "angle") {
      const A = clampPos(parseNum(angleAmm?.value));
      const B = clampPos(parseNum(angleBmm?.value));
      const tt = clampPos(parseNum(angleTmm?.value));
      if (!(A > 0) || !(B > 0) || !(tt > 0)) return null;
      const Amm2 = tt * (A + B - tt);
      const areaM2 = mm2_to_m2(Amm2);
      return { areaM2, note: `A ${fmt(A, 0)} ${unitMm}, B ${fmt(B, 0)} ${unitMm}, t ${fmt(tt, 1)} ${unitMm} (≈)` };
    }

    if (v === "channel") {
      const mode = channelMode?.value || "kgm";
      if (mode === "kgm") {
        const kgm = clampPos(parseNum(channelKgPerM?.value) || DEFAULTS.kgPerM);
        if (!(kgm > 0)) return null;
        const areaM2 = kgm / common.dens;
        return { areaM2, note: `${fmt(kgm, 3)} ${unitKg}/${unitM}`, extra: { kgm } };
      } else {
        const h = clampPos(parseNum(chH?.value));
        const b = clampPos(parseNum(chB?.value));
        const s = clampPos(parseNum(chS?.value));
        const tt = clampPos(parseNum(chT?.value));
        if (!(h > 0) || !(b > 0) || !(s > 0) || !(tt > 0) || !(h > 2 * tt)) return null;
        const Amm2 = (h - 2 * tt) * s + 2 * b * tt;
        const areaM2 = mm2_to_m2(Amm2);
        return { areaM2, note: `h ${fmt(h, 0)}, b ${fmt(b, 0)}, s ${fmt(s, 1)}, t ${fmt(tt, 1)} ${unitMm} (≈)` };
      }
    }

    if (v === "ibeam") {
      const mode = ibeamMode?.value || "kgm";
      if (mode === "kgm") {
        const kgm = clampPos(parseNum(ibeamKgPerM?.value) || DEFAULTS.kgPerM);
        if (!(kgm > 0)) return null;
        const areaM2 = kgm / common.dens;
        return { areaM2, note: `${fmt(kgm, 3)} ${unitKg}/${unitM}`, extra: { kgm } };
      } else {
        const h = clampPos(parseNum(ibH?.value));
        const b = clampPos(parseNum(ibB?.value));
        const s = clampPos(parseNum(ibS?.value));
        const tt = clampPos(parseNum(ibT?.value));
        if (!(h > 0) || !(b > 0) || !(s > 0) || !(tt > 0) || !(h > 2 * tt)) return null;
        const Amm2 = (h - 2 * tt) * s + 2 * b * tt;
        const areaM2 = mm2_to_m2(Amm2);
        return { areaM2, note: `h ${fmt(h, 0)}, b ${fmt(b, 0)}, s ${fmt(s, 1)}, t ${fmt(tt, 1)} ${unitMm} (≈)` };
      }
    }

    return null;
  }

  function calc({ silent = false } = {}) {
    const v = normalizeShapeValue(shapeSelect?.value);
    const tab = selectToTabValue(v);

    const common = getCommon();
    const { L, Q, dens, waste } = common;

    const Lfor = v === "plateSheet" ? 1 : L;

    const res = calcAreaM2ForShape(v, common);

    if (!res) {
      if (!silent) setToast(t("invalidInputs"));
      setResult(t("enterInputs"), "");
      tableRows = [];
      chartBars = [];
      lastCalc = null;
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      drawChart();
      renderViz();
      recalcCost();
      if (scheduleWrap) scheduleWrap.open = false;
      return;
    }

    const mpTotal = v === "plateSheet" ? 0 : Lfor * Q;

    let areaM2Total = 0;
    if (v === "plateSheet") {
      const areaPer = res.extra?.areaM2_perPiece || 0;
      areaM2Total = areaPer * Q;
    } else if (v === "plateStrip") {
      const wMm = res.extra?.stripWidthMm ?? clampPos(parseNum(stripWidthMm?.value));
      const wM = mm_to_m(wMm);
      areaM2Total = wM * mpTotal;
    }

    let volM3_noWaste = 0;
    let volM3_withWaste = 0;

    if (v === "plateSheet") {
      const per = res.extra?.volM3_perPiece || 0;
      volM3_noWaste = per * Q;
      volM3_withWaste = volM3_noWaste * (1 + waste / 100);
    } else {
      const areaM2 = res.areaM2;
      volM3_noWaste = areaM2 * mpTotal;
      volM3_withWaste = volM3_noWaste * (1 + waste / 100);
    }

    const massKg_noWaste = volM3_noWaste * dens;
    const massKg_withWaste = volM3_withWaste * dens;

    let kgPerM = NaN;
    if (v !== "plateSheet") {
      if (Number.isFinite(res.areaM2)) kgPerM = res.areaM2 * dens;
      else if (mpTotal > 0) kgPerM = massKg_noWaste / mpTotal;
    }

    const nameByTab = {
      round: t("name_round"),
      wire: t("name_wire"),
      pipe: t("name_pipe"),
      rectPipe: t("name_rectPipe"),
      flat: t("name_flat"),
      square: t("name_square"),
      plate: t("name_plate_sheet"),
      angle: t("name_angle"),
      channel: t("name_channel"),
      ibeam: t("name_ibeam"),
    };

    const displayName =
      tab === "plate" ? (v === "plateStrip" ? t("name_plate_strip") : t("name_plate_sheet")) : nameByTab[tab] || "—";

    lastCalc = {
      shape: v,
      tab,
      name: displayName,
      L: Lfor,
      qty: Q,
      density: dens,
      waste,
      mpTotal,
      areaM2Total,
      kgPerM,
      volM3NoWaste: volM3_noWaste,
      volM3WithWaste: volM3_withWaste,
      massKgNoWaste: massKg_noWaste,
      massKgWithWaste: massKg_withWaste,
      note: res.note || "",
    };

    setToast("");

    const main =
      v === "plateSheet"
        ? `${displayName}: ${fmt(massKg_withWaste, 2)} ${unitKg} • ${fmt(areaM2Total, 3)} ${unitM2}`
        : v === "plateStrip"
        ? `${displayName}: ${fmt(massKg_withWaste, 2)} ${unitKg} • ${fmt(kgPerM, 3)} ${unitKg}/${unitM} • ${fmt(areaM2Total, 3)} ${unitM2}`
        : `${displayName}: ${fmt(massKg_withWaste, 2)} ${unitKg} • ${fmt(kgPerM, 3)} ${unitKg}/${unitM}`;

    const kpiHtml = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${safeText(t("kpi_totalWeight"))}</div>
          <div class="m-kpi__v">${fmt(massKg_withWaste, 2)} ${unitKg}</div>
          <div class="m-kpi__s">${safeText(t("noWaste"))}: ${fmt(massKg_noWaste, 2)} ${unitKg} • ${safeText(t("waste"))}: ${fmt(waste, 1)}%</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${safeText(v === "plateSheet" ? t("kpi_area") : t("kpi_perLm"))}</div>
          <div class="m-kpi__v">${
            v === "plateSheet" ? `${fmt(areaM2Total, 3)} ${unitM2}` : `${fmt(kgPerM, 3)} ${unitKg}/${unitM}`
          }</div>
          <div class="m-kpi__s">${v === "plateSheet" ? "W×H" : `${fmt(mpTotal, 2)} ${unitMp}`}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${safeText(t("kpi_volume"))}</div>
          <div class="m-kpi__v">${fmt(volM3_withWaste, 6)} ${unitM3}</div>
          <div class="m-kpi__s">${safeText(t("noWaste"))}: ${fmt(volM3_noWaste, 6)} ${unitM3}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${safeText(v === "plateSheet" ? t("kpi_qty") : t("kpi_totalLen"))}</div>
          <div class="m-kpi__v">${v === "plateSheet" ? `${fmt(Q, 0)}` : `${fmt(mpTotal, 2)} ${unitMp}`}</div>
          <div class="m-kpi__s">${v === "plateSheet" ? safeText(res.note || "—") : `${fmt(L, 2)} ${unitM} × ${fmt(Q, 0)}`}</div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>${safeText(t("params"))}</b>: ${safeText(res.note || "—")}</div>
        ${
          v === "plateStrip"
            ? `<div><b>${safeText(t("extra"))}</b>: area = W(m) × L(${unitMp})</div>`
            : v === "plateSheet"
            ? `<div><b>${safeText(t("extra"))}</b>: area = W × H</div>`
            : `<div><b>${safeText(t("linearMass"))}</b>: ${fmt(kgPerM, 3)} ${unitKg}/${unitM}</div>`
        }
      </div>
    `;

    setResult(main, kpiHtml);

    tableRows = [
      {
        item: displayName,
        qty: fmt(massKg_withWaste, 2),
        unit: unitKg,
        note: `${t("noWaste")}: ${fmt(massKg_noWaste, 2)} ${unitKg} • ${t("waste")} ${fmt(waste, 1)}%`,
      },
      ...(Number.isFinite(kgPerM) && v !== "plateSheet"
        ? [{ item: t("linearMass"), qty: fmt(kgPerM, 3), unit: `${unitKg}/${unitM}`, note: LANG === "en" ? "kg/m (no waste)" : "кг/м (без запасу)" }]
        : []),
      ...(v === "plateSheet"
        ? [{ item: t("kpi_area"), qty: fmt(areaM2Total, 3), unit: unitM2, note: LANG === "en" ? "W×H × qty" : "Ш×В × к-сть" }]
        : []),
      ...(v === "plateStrip"
        ? [
            { item: LANG === "en" ? "Linear meters" : "Погонні метри", qty: fmt(mpTotal, 2), unit: unitMp, note: `${fmt(L, 2)} ${unitM} × ${fmt(Q, 0)}` },
            { item: t("kpi_area"), qty: fmt(areaM2Total, 3), unit: unitM2, note: LANG === "en" ? "W(m) × L(lm)" : "Ш(м) × Д(м.п.)" },
          ]
        : v !== "plateSheet"
        ? [{ item: t("kpi_totalLen"), qty: fmt(mpTotal, 2), unit: unitMp, note: `${fmt(L, 2)} ${unitM} × ${fmt(Q, 0)}` }]
        : []),
      { item: t("kpi_volume"), qty: fmt(volM3_withWaste, 6), unit: unitM3, note: `${t("noWaste")}: ${fmt(volM3_noWaste, 6)} ${unitM3}` },
      { item: LANG === "en" ? "Density" : "Густина", qty: fmt(dens, 0), unit: `${unitKg}/${unitM3}`, note: LANG === "en" ? "Change for other metals" : "Можна змінити для іншого металу" },
    ];

    chartBars = [
      { label: LANG === "en" ? "Weight (kg)" : "Вага (кг)", value: massKg_withWaste },
      { label: v === "plateSheet" ? (LANG === "en" ? "Area (m²)" : "Площа (м²)") : `${unitKg}/${unitM}`, value: v === "plateSheet" ? areaM2Total : kgPerM },
      { label: LANG === "en" ? `Volume (${unitM3})` : `Об’єм (${unitM3})`, value: volM3_withWaste },
    ];

    renderAll();
    renderViz();
    recalcCost();
    if (scheduleWrap) scheduleWrap.open = false;
  }

  // ---------- reset ----------
  function reset() {
    if (shapeSelect) shapeSelect.value = "round";
    plateSub = "plateSheet";

    if (lengthM) lengthM.value = "";
    if (qty) qty.value = String(DEFAULTS.qty);
    if (density) density.value = String(DEFAULTS.density);
    if (wastePct) wastePct.value = String(DEFAULTS.wastePct);

    [
      diameterMm,
      odMm,
      pipeTmm,
      aMm,
      bMm,
      rectTmm,
      sideMm,
      flatWidthMm,
      flatThicknessMm,
      plateWidthMm,
      plateHeightMm,
      plateThicknessMm,
      stripWidthMm,
      stripThicknessMm,
      angleAmm,
      angleBmm,
      angleTmm,
      channelKgPerM,
      chH,
      chB,
      chS,
      chT,
      ibeamKgPerM,
      ibH,
      ibB,
      ibS,
      ibT,
    ].forEach((x) => {
      if (x) x.value = "";
    });

    if (channelKgPerM) channelKgPerM.value = String(DEFAULTS.kgPerM);
    if (ibeamKgPerM) ibeamKgPerM.value = String(DEFAULTS.kgPerM);

    applyShapeUI({ animate: true });

    setToast(t("resetDone"));
    setResult(t("enterInputs"), "");

    tableRows = [];
    chartBars = [];
    lastCalc = null;

    if (scheduleTbody) scheduleTbody.innerHTML = "";
    drawChart();
    renderViz();
    recalcCost();

    setTimeout(() => setToast(""), 1200);
  }

  // ---------- copy / csv ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      setToast(t("copiedResult"));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(t("copyFail"));
    }
  }

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
      setToast(t("copiedTable"));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(t("copyTableFail"));
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
    a.download = "steel-weight.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setToast(t("csvDone"));
    setTimeout(() => setToast(""), 1500);
  }

  // ---------- cost buttons ----------
  function savePrices() {
    writePrices(collectPrices());
    setCostToast(t("pricesSaved"));
    setTimeout(() => setCostToast(""), 1200);
  }
  function resetPrices() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    if (priceMode) priceMode.value = "kg";
    if (pricePerUnit) pricePerUnit.value = "";
    if (delivery) delivery.value = "";
    if (wastePctCost) wastePctCost.value = String(DEFAULTS.wastePctCost);
    setCostToast(t("pricesReset"));
    recalcCost();
    setTimeout(() => setCostToast(""), 1200);
  }
  async function copyCost() {
    const txt = (costTotal?.textContent || "").trim();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      setCostToast(t("copied"));
      setTimeout(() => setCostToast(""), 1200);
    } catch {
      setCostToast(t("copyFail"));
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
  shapeTabs?.addEventListener("click", (e) => {
    const btn = e.target?.closest?.(".m-shape[data-shape]");
    if (!btn) return;
    const tabShape = btn.getAttribute("data-shape");
    if (!tabShape) return;

    setActiveTab(tabShape);

    const selValue = tabToSelectValue(tabShape);

    if (shapeSelect) {
      shapeSelect.value = selValue;

      if (tabShape === "plate") {
        if (plateChoiceUI) plateChoiceUI.style.display = "";
        const current = plateSub || "plateSheet";
        Array.from(plateChoiceUI?.querySelectorAll("button[data-plate]") || []).forEach((b) =>
          b.classList.toggle("is-active", b.getAttribute("data-plate") === current)
        );
      }
    }

    applyShapeUI({ animate: true });
    scheduleAuto();
  });

  shapeSelect?.addEventListener("change", () => {
    const v = normalizeShapeValue(shapeSelect.value);
    const tab = selectToTabValue(v);
    if (tab === "plate") plateSub = v;
    applyShapeUI({ animate: true });
    scheduleAuto();
  });

  [
    lengthM,
    qty,
    density,
    wastePct,
    diameterMm,
    odMm,
    pipeTmm,
    aMm,
    bMm,
    rectTmm,
    sideMm,
    flatWidthMm,
    flatThicknessMm,
    plateWidthMm,
    plateHeightMm,
    plateThicknessMm,
    stripWidthMm,
    stripThicknessMm,
    angleAmm,
    angleBmm,
    angleTmm,
  ].forEach((x) =>
    x?.addEventListener("input", () => {
      renderViz();
      scheduleAuto();
    })
  );

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  [priceMode, pricePerUnit, delivery, wastePctCost].forEach((x) => x?.addEventListener("input", recalcCost));
  btnSavePrices?.addEventListener("click", savePrices);
  btnResetPrices?.addEventListener("click", resetPrices);
  btnCopyCost?.addEventListener("click", copyCost);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") calc({ silent: false });
  });

  // ---------- init ----------
  function init() {
    injectNewBlocks();

    if (qty && !qty.value) qty.value = String(DEFAULTS.qty);
    if (density && !density.value) density.value = String(DEFAULTS.density);
    if (wastePct && !wastePct.value) wastePct.value = String(DEFAULTS.wastePct);
    if (wastePctCost && !wastePctCost.value) wastePctCost.value = String(DEFAULTS.wastePctCost);

    if (shapeSelect) {
      const v = normalizeShapeValue(shapeSelect.value || "round");
      if (v === "plate") shapeSelect.value = "plateSheet";
    }

    const saved = readPrices();
    if (saved) applyPrices(saved);

    applyShapeUI({ animate: false });
    setResult(t("enterInputs"), "");
    drawChart();
    renderViz();
    recalcCost();

    if (costWrap) costWrap.open = false;
  }

  init();
})();