/* =========================================================
   construction-cost-calculator.js — CalcCore (i18n-ready)
   Construction Cost Calculator:
   - Inputs: area, base cost per m², scenario, stage weights, contingency %, VAT %, extras
   - Outputs:
       * Total base cost
       * Total with contingency + VAT + extras
       * Cost per m²
       * Stage breakdown table + cumulative chart
       * Copy result + copy table + CSV
       * Currency switch (UAH/USD/EUR via NBU)
========================================================= */

(() => {
  const el = (id) => document.getElementById(id);

  // ---------- i18n helpers ----------
  const tt =
    typeof window.t === "function"
      ? window.t
      : (k, vars) => {
          let s = String(k || "");
          if (vars && typeof vars === "object") {
            for (const [kk, vv] of Object.entries(vars)) s = s.replaceAll(`{${kk}}`, String(vv));
          }
          return s;
        };

  const getLocale =
    typeof window.i18nLocale === "function"
      ? window.i18nLocale
      : () =>
          String(document.documentElement.lang || "")
            .toLowerCase()
            .startsWith("en")
            ? "en-US"
            : "uk-UA";

  const LOCALE = getLocale();

  // ---------- Inputs ----------
  const area = el("area");
  const baseCost = el("baseCost");
  const scenario = el("scenario");
  const contingency = el("contingency");
  const taxVat = el("taxVat");
  const extras = el("extras");

  // stage weights
  const wFoundation = el("wFoundation");
  const wWalls = el("wWalls");
  const wRoof = el("wRoof");
  const wWindows = el("wWindows");
  const wEngineering = el("wEngineering");
  const wInterior = el("wInterior");

  // Controls
  const autoCalc = el("autoCalc");
  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  // UI
  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  // NBU
  const nbuBadge = el("nbuBadge");
  let rates = { loaded: false, date: "", USD: null, EUR: null };

  // Chart
  const canvas = el("growthChart");
  const ctx = canvas?.getContext?.("2d");

  // Table
  const scheduleWrap = el("scheduleWrap");
  const scheduleCurrency = el("scheduleCurrency");
  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");
  const btnDownloadCSV = el("btnDownloadCSV");

  // ---------- caches (UAH base) ----------
  let rowsUAH = [];   // [{stage, weightPct, amountUAH, cumulativeUAH}]
  let pointsUAH = []; // [{label, cumulativeUAH}]

  // ---------- helpers ----------
  function setToast(msg) {
    if (!toast) return;
    toast.textContent = msg || "";
  }

  function setResult(mainText, extraHtml = "") {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  }

  function parseMoney(val) {
    if (val == null) return 0;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function formatNumber(n, maxFrac = 2) {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString(LOCALE, { maximumFractionDigits: maxFrac });
  }

  function currencySymbol(code) {
    if (code === "USD") return "$";
    if (code === "EUR") return "€";
    return "₴";
  }

  function convertFromUAH(amountUAH, code) {
    if (!Number.isFinite(amountUAH)) return amountUAH;
    if (code === "UAH") return amountUAH;
    if (!rates.loaded) return amountUAH;
    const r = rates[code];
    if (!Number.isFinite(r) || r <= 0) return amountUAH;
    return amountUAH / r;
  }

  function formatMoneyByCurrency(amountUAH, code) {
    const v = convertFromUAH(amountUAH, code);
    if (!Number.isFinite(v)) return "—";
    return `${formatNumber(v, 2)} ${currencySymbol(code)}`;
  }

  function ensureCurrencyLoadedOrFallback(selectEl) {
    if (!selectEl) return true;
    const v = selectEl.value;
    if ((v === "USD" || v === "EUR") && !rates.loaded) {
      setToast(tt("cc.toast_nbu_not_loaded_fallback") || "Курс НБУ не завантажився — показую UAH.");
      selectEl.value = "UAH";
      setTimeout(() => setToast(""), 2000);
      return false;
    }
    return true;
  }

  function clampPct(x) {
    if (!Number.isFinite(x)) return 0;
    return Math.max(0, Math.min(100, x));
  }

  // ---------- NBU rates ----------
  async function loadNbuRates() {
    try {
      const res = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("NBU fetch failed");
      const data = await res.json();

      const usd = data.find((x) => String(x.cc || "").toUpperCase() === "USD");
      const eur = data.find((x) => String(x.cc || "").toUpperCase() === "EUR");

      rates.USD = Number.isFinite(Number(usd?.rate)) ? Number(usd.rate) : null;
      rates.EUR = Number.isFinite(Number(eur?.rate)) ? Number(eur.rate) : null;
      rates.date = usd?.exchangedate || eur?.exchangedate || "";
      rates.loaded = Number.isFinite(rates.USD) && Number.isFinite(rates.EUR);

      if (nbuBadge) {
        if (rates.loaded) {
          const datePart = rates.date ? ` • ${rates.date}` : "";
          nbuBadge.textContent =
            tt("cc.nbu_badge", {
              usd: formatNumber(rates.USD, 4),
              eur: formatNumber(rates.EUR, 4),
              datePart,
            }) ||
            `Курс НБУ: USD ${formatNumber(rates.USD, 4)} / EUR ${formatNumber(rates.EUR, 4)}${datePart}`;
          nbuBadge.title = tt("cc.nbu_title") || "Курс НБУ (USD/EUR)";
        } else {
          nbuBadge.textContent = tt("cc.nbu_unavailable") || "Курс НБУ: недоступно";
          nbuBadge.title = tt("cc.nbu_title") || "Курс НБУ (USD/EUR)";
        }
      }

      renderAllFromCache();
    } catch {
      rates.loaded = false;
      if (nbuBadge) {
        nbuBadge.textContent = tt("cc.nbu_unavailable") || "Курс НБУ: недоступно";
        nbuBadge.title = tt("cc.nbu_title") || "Курс НБУ (USD/EUR)";
      }
    }
  }

  // ---------- scenarios ----------
  const PRESETS = {
    shell: {
      foundation: 25,
      walls: 45,
      roof: 20,
      windows: 10,
      engineering: 0,
      interior: 0,
    },
    turnkey: {
      foundation: 15,
      walls: 30,
      roof: 10,
      windows: 10,
      engineering: 15,
      interior: 20,
    },
  };

  function applyPreset(kind) {
    const p = PRESETS[kind];
    if (!p) return;
    if (wFoundation) wFoundation.value = String(p.foundation);
    if (wWalls) wWalls.value = String(p.walls);
    if (wRoof) wRoof.value = String(p.roof);
    if (wWindows) wWindows.value = String(p.windows);
    if (wEngineering) wEngineering.value = String(p.engineering);
    if (wInterior) wInterior.value = String(p.interior);
  }

  function setWeightsDisabled(disabled) {
    const list = [wFoundation, wWalls, wRoof, wWindows, wEngineering, wInterior];
    list.forEach((x) => {
      if (!x) return;
      x.disabled = disabled;
      x.style.opacity = disabled ? "0.85" : "1";
    });
  }

  // ---------- table/chart render ----------
  function renderTableFromCache() {
    if (!scheduleTbody) return;
    const code = scheduleCurrency?.value || "UAH";

    scheduleTbody.innerHTML = rowsUAH
      .map(
        (r) => `
        <tr>
          <td>${r.stage}</td>
          <td>${formatNumber(r.weightPct, 2)}%</td>
          <td>${formatMoneyByCurrency(r.amountUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.cumulativeUAH, code)}</td>
        </tr>
      `
      )
      .join("");
  }

  function drawChartFromCache() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pointsUAH.length < 2) {
      ctx.font = "12px Arial";
      ctx.fillStyle = "#1f2f55";
      ctx.fillText(tt("cc.chart_need_data") || "Зроби розрахунок, щоб побачити графік.", 12, 24);
      return;
    }

    const code = scheduleCurrency?.value || "UAH";
    const sym = currencySymbol(code);

    const points = pointsUAH.map((p) => ({
      label: p.label,
      v: convertFromUAH(p.cumulativeUAH, code),
    }));

    const W = canvas.width;
    const H = canvas.height;
    const padL = 52,
      padR = 16,
      padT = 16,
      padB = 34;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const ys = points.map((p) => (Number.isFinite(p.v) ? p.v : 0));
    const yMin = 0;
    const yMax = Math.max(...ys, 1);

    const xStep = innerW / (points.length - 1);
    const xAt = (i) => padL + i * xStep;
    const yAt = (val) => padT + innerH * (1 - (val - yMin) / (yMax - yMin));

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

      const v = yMax * (1 - g / gridN);
      ctx.fillStyle = "rgba(31,47,85,.85)";
      ctx.font = "11px Arial";
      ctx.fillText(`${formatNumber(v, 0)} ${sym}`, 6, y + 4);
    }

    // line
    ctx.strokeStyle = "#1f2f55";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xAt(i);
      const y = yAt(p.v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // dots
    ctx.fillStyle = "#1f2f55";
    points.forEach((p, i) => {
      const x = xAt(i);
      const y = yAt(p.v);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // x labels
    ctx.fillStyle = "rgba(31,47,85,.9)";
    ctx.font = "11px Arial";
    points.forEach((p, i) => {
      const x = xAt(i);
      const y = H - 12;
      const text = p.label;
      const tw = ctx.measureText(text).width;
      ctx.fillText(text, x - tw / 2, y);
    });

    // legend
    ctx.font = "12px Arial";
    ctx.fillStyle = "#1f2f55";
    ctx.fillText(tt("cc.legend") || "Накопичення", padL, padT + 10);
  }

  function renderAllFromCache() {
    renderTableFromCache();
    drawChartFromCache();
  }

  // ---------- Calculation ----------
  function getWeights() {
    const ws = {
      foundation: clampPct(parseMoney(wFoundation?.value)),
      walls: clampPct(parseMoney(wWalls?.value)),
      roof: clampPct(parseMoney(wRoof?.value)),
      windows: clampPct(parseMoney(wWindows?.value)),
      engineering: clampPct(parseMoney(wEngineering?.value)),
      interior: clampPct(parseMoney(wInterior?.value)),
    };
    const sum = ws.foundation + ws.walls + ws.roof + ws.windows + ws.engineering + ws.interior;
    return { ws, sum };
  }

  function calc({ silent = false } = {}) {
    const A = parseMoney(area?.value);
    const costPerM2 = parseMoney(baseCost?.value);
    const contPct = clampPct(parseMoney(contingency?.value));
    const vatPct = clampPct(parseMoney(taxVat?.value));
    const extraUAH = Math.max(0, parseMoney(extras?.value));

    if (!(A > 0) || !(costPerM2 > 0)) {
      if (!silent) setToast(tt("cc.toast_enter_values") || "Введи площу та ціну за м².");
      setResult(tt("cc.result_enter_values") || "Введи площу та ціну за м².", "");
      rowsUAH = [];
      pointsUAH = [];
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap) scheduleWrap.open = false;
      drawChartFromCache();
      return;
    }

    // base
    const baseUAH = A * costPerM2;

    // weights validation
    const { ws, sum } = getWeights();
    if (Math.abs(sum - 100) > 0.001) {
      // do not break calc; just warn and normalize to 100
      if (!silent) setToast(tt("cc.toast_weights_normalized") || "Увага: сума відсотків ≠ 100%. Нормалізую автоматично.");
    } else if (!silent) {
      setToast("");
    }

    const norm = sum > 0 ? 100 / sum : 0;

    const stages = [
      { key: "foundation", name: tt("cc.stage_foundation") || "Фундамент", w: ws.foundation * norm },
      { key: "walls", name: tt("cc.stage_walls") || "Стіни/коробка", w: ws.walls * norm },
      { key: "roof", name: tt("cc.stage_roof") || "Дах", w: ws.roof * norm },
      { key: "windows", name: tt("cc.stage_windows") || "Вікна/фасад", w: ws.windows * norm },
      { key: "engineering", name: tt("cc.stage_engineering") || "Інженерія", w: ws.engineering * norm },
      { key: "interior", name: tt("cc.stage_interior") || "Оздоблення", w: ws.interior * norm },
    ];

    // build rows
    rowsUAH = [];
    pointsUAH = [];
    let cumulative = 0;

    stages.forEach((s) => {
      const stageAmount = (baseUAH * s.w) / 100;
      cumulative += stageAmount;

      rowsUAH.push({
        stage: s.name,
        weightPct: s.w,
        amountUAH: stageAmount,
        cumulativeUAH: cumulative,
      });

      // short labels for chart
      pointsUAH.push({
        label: s.name.split("/")[0].slice(0, 8),
        cumulativeUAH: cumulative,
      });
    });

    // add contingency + vat + extras as “after base”
    const contingencyUAH = (baseUAH * contPct) / 100;
    const vatUAH = ((baseUAH + contingencyUAH) * vatPct) / 100;

    const totalUAH = baseUAH + contingencyUAH + vatUAH + extraUAH;
    const perM2UAH = totalUAH / A;

    const main = `${tt("cc.main_total") || "Загальна вартість"}: ${formatMoneyByCurrency(totalUAH, "UAH")}`;

    const extraHtml = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("cc.kpi_base") || "Базова сума"}</div>
          <div class="m-kpi__v">${formatMoneyByCurrency(baseUAH, "UAH")}</div>
          <div class="m-kpi__s">${tt("cc.kpi_base_hint") || "Площа × ціна за м²"}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("cc.kpi_total") || "Підсумок"}</div>
          <div class="m-kpi__v">${formatMoneyByCurrency(totalUAH, "UAH")}</div>
          <div class="m-kpi__s">${tt("cc.kpi_total_hint") || "База + резерв + податки + додаткові"}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("cc.kpi_per_m2") || "Ціна за м² (факт)"}</div>
          <div class="m-kpi__v">${formatMoneyByCurrency(perM2UAH, "UAH")}</div>
          <div class="m-kpi__s">${tt("cc.kpi_per_m2_hint") || "З урахуванням надбавок"}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("cc.kpi_additions") || "Надбавки"}</div>
          <div class="m-kpi__v">${formatMoneyByCurrency(contingencyUAH + vatUAH + extraUAH, "UAH")}</div>
          <div class="m-kpi__s">
            ${tt("cc.kpi_additions_hint") || "Резерв + податки + додаткові"}
          </div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>${tt("cc.summary") || "Пояснення"}</b>:</div>
        <div>База: ${formatMoneyByCurrency(baseUAH, "UAH")} (${formatNumber(A, 2)} м² × ${formatMoneyByCurrency(costPerM2, "UAH")}/м²)</div>
        <div>Резерв (${formatNumber(contPct, 2)}%): ${formatMoneyByCurrency(contingencyUAH, "UAH")}</div>
        <div>Податки (${formatNumber(vatPct, 2)}%): ${formatMoneyByCurrency(vatUAH, "UAH")}</div>
        <div>Додаткові: ${formatMoneyByCurrency(extraUAH, "UAH")}</div>
        <div class="m-hintSmall">${tt("cc.summary_hint") || "Етапи розподіляють базову суму; резерв/податки/додаткові додаються зверху."}</div>
      </div>
    `;

    setResult(main, extraHtml);
    renderAllFromCache();
    if (scheduleWrap) scheduleWrap.open = false;
  }

  // ---------- Reset ----------
  function reset() {
    if (area) area.value = "";
    if (baseCost) baseCost.value = "";
    if (contingency) contingency.value = "10";
    if (taxVat) taxVat.value = "0";
    if (extras) extras.value = "";
    if (scenario) scenario.value = "shell";

    applyPreset("shell");
    setWeightsDisabled(true);

    if (scheduleCurrency) scheduleCurrency.value = "UAH";

    setToast(tt("cc.toast_reset") || "Скинуто.");
    setResult(tt("cc.result_enter_values") || "Введи площу та ціну за м².", "");

    rowsUAH = [];
    pointsUAH = [];
    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;

    drawChartFromCache();
    setTimeout(() => setToast(""), 1200);
  }

  // ---------- Copy result ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    const emptyMarker = tt("cc.result_enter_values") || "Введи";
    if (!txt || txt.includes(emptyMarker)) {
      setToast(tt("cc.toast_need_calc_first") || "Спочатку зроби розрахунок.");
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(tt("cc.copied_result") || "Скопійовано результат.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("cc.copy_failed") || "Не вдалося скопіювати.");
    }
  }

  // ---------- Copy table / CSV ----------
  async function copySchedule() {
    if (!scheduleTable) return;
    const trs = Array.from(scheduleTable.querySelectorAll("tr"));
    const lines = trs.map((tr) =>
      Array.from(tr.children)
        .map((td) => td.innerText.replace(/\s+/g, " ").trim())
        .join("\t")
    );
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text.trim());
      setToast(tt("cc.copied_table") || "Скопійовано таблицю.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("cc.copy_table_failed") || "Не вдалося скопіювати таблицю.");
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
    a.download = "construction-cost-stages.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setToast(tt("cc.csv_downloaded") || "CSV завантажено.");
    setTimeout(() => setToast(""), 1500);
  }

  // ---------- Auto-calc debounce ----------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  // ---------- Events ----------
  [area, baseCost, contingency, taxVat, extras].forEach((x) => x?.addEventListener("input", scheduleAuto));
  [wFoundation, wWalls, wRoof, wWindows, wEngineering, wInterior].forEach((x) => x?.addEventListener("input", scheduleAuto));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  scheduleCurrency?.addEventListener("change", () => {
    if (!ensureCurrencyLoadedOrFallback(scheduleCurrency)) return;
    renderAllFromCache();
  });

  scenario?.addEventListener("change", () => {
    const v = scenario.value;
    if (v === "custom") {
      setWeightsDisabled(false);
    } else {
      applyPreset(v);
      setWeightsDisabled(true);
    }
    scheduleAuto();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    calc({ silent: false });
  });

  // ---------- Init ----------
  reset();
  loadNbuRates(); // async
})();
