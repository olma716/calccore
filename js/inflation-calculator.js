/* =========================================================
   inflation-calculator.js — CalcCore (i18n-ready, full)
   - Inputs: amount now, annual inflation %, years, optional monthly top-up
   - Results:
       * Real value in today's money (inflation-adjusted)
       * Required nominal to keep same purchasing power
       * Purchasing power loss %
       * Chart: Nominal vs Real (end of each year)
       * Yearly table + currency switch (UAH/USD/EUR via NBU)
   - UI: toast + copy result + copy table + CSV
   - i18n: uses window.t(key, vars) from /js/i18n.js (fallback supported)
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
  const amount = el("amount");
  const inflationRate = el("inflationRate");
  const years = el("years");
  const monthlyTopUp = el("monthlyTopUp");
  const startDate = el("startDate");

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
  const nbuBadge = el("nbuBadge"); // optional in HTML
  let rates = { loaded: false, date: "", USD: null, EUR: null };

  // Chart
  const chartCurrency = el("chartCurrency"); // optional; if absent => UAH
  const canvas = el("growthChart");
  const ctx = canvas?.getContext?.("2d");

  // Table
  const scheduleWrap = el("scheduleWrap");
  const scheduleCurrency = el("scheduleCurrency"); // required for currency switch in table
  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");
  const btnDownloadCSV = el("btnDownloadCSV");

  // ---------- caches (UAH base) ----------
  let pointsUAH = []; // [{label, nominalUAH, realUAH}]
  let rowsUAH = []; // [{year, dateText, nominalUAH, realUAH, factor, lossPct}]

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

  function formatDate(d) {
    try {
      return d.toLocaleDateString(LOCALE);
    } catch {
      return "";
    }
  }

  function addYears(date, y) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + y);
    return d;
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
            tt("infl.nbu_badge", {
              usd: formatNumber(rates.USD, 4),
              eur: formatNumber(rates.EUR, 4),
              datePart,
            }) ||
            `Курс НБУ: USD ${formatNumber(rates.USD, 4)} / EUR ${formatNumber(rates.EUR, 4)}${datePart}`;
          nbuBadge.title = tt("infl.nbu_title") || "Курс НБУ (USD/EUR)";
        } else {
          nbuBadge.textContent = tt("infl.nbu_unavailable") || "Курс НБУ: недоступно";
          nbuBadge.title = tt("infl.nbu_title") || "Курс НБУ (USD/EUR)";
        }
      }

      renderAllFromCache();
    } catch {
      rates.loaded = false;
      if (nbuBadge) {
        nbuBadge.textContent = tt("infl.nbu_unavailable") || "Курс НБУ: недоступно";
        nbuBadge.title = tt("infl.nbu_title") || "Курс НБУ (USD/EUR)";
      }
    }
  }

  function ensureCurrencyLoadedOrFallback(selectEl) {
    if (!selectEl) return true;
    const v = selectEl.value;
    if ((v === "USD" || v === "EUR") && !rates.loaded) {
      setToast(tt("infl.toast_nbu_not_loaded_fallback") || "Курс НБУ не завантажився — показую UAH.");
      selectEl.value = "UAH";
      setTimeout(() => setToast(""), 2000);
      return false;
    }
    return true;
  }

  // ---------- Result UI ----------
  function buildResultUI({ finalNominal, finalReal, factor, lossPct, requiredNominal }) {
    const main = `${tt("infl.main") || "Реальна вартість"}: ${formatMoneyByCurrency(finalReal, "UAH")}`;

    const extra = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("infl.kpi_real") || "Реально (сьогоднішні гроші)"}</div>
          <div class="m-kpi__v">${formatMoneyByCurrency(finalReal, "UAH")}</div>
          <div class="m-kpi__s">${tt("infl.kpi_real_hint") || "Купівельна спроможність"}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("infl.kpi_required") || "Потрібно номінально"}</div>
          <div class="m-kpi__v">${formatMoneyByCurrency(requiredNominal, "UAH")}</div>
          <div class="m-kpi__s">${tt("infl.kpi_required_hint") || "Щоб мати ту ж купівельну спроможність"}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("infl.kpi_nominal") || "Номінал наприкінці"}</div>
          <div class="m-kpi__v">${formatMoneyByCurrency(finalNominal, "UAH")}</div>
          <div class="m-kpi__s">${tt("infl.kpi_factor") || "Множник інфляції"}: ${formatNumber(factor, 4)}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("infl.kpi_loss") || "Втрата купівельної спроможності"}</div>
          <div class="m-kpi__v">${formatNumber(lossPct, 2)}%</div>
          <div class="m-kpi__s">${tt("infl.kpi_loss_hint") || "Через інфляцію за період"}</div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>${tt("infl.summary") || "Підсумок"}</b>: ${formatMoneyByCurrency(finalNominal, "UAH")} → ${formatMoneyByCurrency(finalReal, "UAH")}</div>
        <div class="m-hintSmall">${tt("infl.summary_hint") || "“Реально” = номінал / (1+інфляція)^роки. Поповнення додаються щомісяця і також знецінюються з часом."}</div>
      </div>
    `;
    return { main, extra };
  }

  // ---------- Table render ----------
  function renderTableFromCache() {
    if (!scheduleTbody) return;
    const code = scheduleCurrency?.value || "UAH";

    scheduleTbody.innerHTML = rowsUAH
      .map(
        (r) => `
        <tr>
          <td>${r.year}</td>
          <td>${r.dateText}</td>
          <td>${formatMoneyByCurrency(r.nominalUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.realUAH, code)}</td>
          <td>${formatNumber(r.factor, 4)}</td>
          <td>${formatNumber(r.lossPct, 2)}%</td>
        </tr>
      `
      )
      .join("");
  }

  // ---------- Chart render ----------
  function drawChartFromCache() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pointsUAH.length < 2) {
      ctx.font = "12px Arial";
      ctx.fillStyle = "#1f2f55";
      ctx.fillText(tt("infl.chart_need_data") || "Зроби розрахунок, щоб побачити графік.", 12, 24);
      return;
    }

    const code = chartCurrency?.value || "UAH";
    const sym = currencySymbol(code);

    const points = pointsUAH.map((p) => ({
      label: p.label,
      nominal: convertFromUAH(p.nominalUAH, code),
      real: convertFromUAH(p.realUAH, code),
    }));

    const W = canvas.width;
    const H = canvas.height;
    const padL = 52,
      padR = 16,
      padT = 16,
      padB = 34;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const ys = [];
    points.forEach((p) => {
      if (Number.isFinite(p.nominal)) ys.push(p.nominal);
      if (Number.isFinite(p.real)) ys.push(p.real);
    });

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

    // nominal line
    ctx.strokeStyle = "#1f2f55";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xAt(i);
      const y = yAt(p.nominal);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // real line
    ctx.strokeStyle = "rgba(46,125,90,.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xAt(i);
      const y = yAt(p.real);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // dots
    ctx.fillStyle = "#1f2f55";
    points.forEach((p, i) => {
      const x = xAt(i);
      const y = yAt(p.nominal);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "rgba(46,125,90,.95)";
    points.forEach((p, i) => {
      const x = xAt(i);
      const y = yAt(p.real);
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
    ctx.fillText(tt("infl.legend_nominal") || "Номінал", padL, padT + 10);
    ctx.fillStyle = "rgba(46,125,90,.95)";
    ctx.fillText(tt("infl.legend_real") || "Реально", padL + 90, padT + 10);
  }

  function renderAllFromCache() {
    renderTableFromCache();
    drawChartFromCache();
  }

  // ---------- Calculation ----------
  function calc({ silent = false } = {}) {
    const A0 = parseMoney(amount?.value);
    const rPct = parseMoney(inflationRate?.value);
    const Y = Number(years?.value || 0);
    const topUp = Math.max(0, parseMoney(monthlyTopUp?.value));
    const start = startDate?.value ? new Date(startDate.value) : new Date();

    if (!(A0 > 0) || !(Y > 0)) {
      if (!silent) setToast(tt("infl.toast_enter_values") || "Введи суму та період.");
      setResult(tt("infl.result_enter_values") || "Введи суму, інфляцію та період.", "");
      pointsUAH = [];
      rowsUAH = [];
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap) scheduleWrap.open = false;
      drawChartFromCache();
      return;
    }

    const months = Y * 12;
    const rYear = rPct / 100;

    // monthly inflation from annual: (1+rY) = (1+rM)^12
    const inflMonth = rYear > -1 ? Math.pow(1 + rYear, 1 / 12) - 1 : 0;

    let nominal = A0;

    pointsUAH = [];
    rowsUAH = [];

    for (let m = 1; m <= months; m++) {
      // top-up at start of each month
      if (topUp > 0) nominal += topUp;

      // end-of-year snapshots
      if (m % 12 === 0) {
        const y = m / 12;

        // exact yearly factor
        const factorY = Math.pow(1 + rYear, y);

        // "real" in today's money
        const realY = factorY > 0 ? nominal / factorY : nominal;

        // loss of purchasing power over the period (for 1 unit of money)
        const lossPctY = factorY > 0 ? (1 - 1 / factorY) * 100 : 0;

        pointsUAH.push({ label: `${y}`, nominalUAH: nominal, realUAH: realY });

        rowsUAH.push({
          year: y,
          dateText: formatDate(addYears(start, y)),
          nominalUAH: nominal,
          realUAH: realY,
          factor: factorY,
          lossPct: lossPctY,
        });
      }
    }

    const factorFinal = Math.pow(1 + rYear, Y);
    const finalNominal = nominal;
    const finalReal = factorFinal > 0 ? finalNominal / factorFinal : finalNominal;
    const lossPct = factorFinal > 0 ? (1 - 1 / factorFinal) * 100 : 0;
    const requiredNominal = A0 * factorFinal;

    const ui = buildResultUI({
      finalNominal,
      finalReal,
      factor: factorFinal,
      lossPct,
      requiredNominal,
    });

    setToast("");
    setResult(ui.main, ui.extra);

    renderAllFromCache();
    if (scheduleWrap) scheduleWrap.open = false;
  }

  // ---------- Reset ----------
  function reset() {
    if (amount) amount.value = "";
    if (inflationRate) inflationRate.value = "";
    if (years) years.value = "";
    if (monthlyTopUp) monthlyTopUp.value = "";
    if (scheduleCurrency) scheduleCurrency.value = "UAH";
    if (chartCurrency) chartCurrency.value = "UAH";

    if (startDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    setToast(tt("infl.toast_reset") || "Скинуто.");
    setResult(tt("infl.result_enter_values") || "Введи суму, інфляцію та період.", "");

    pointsUAH = [];
    rowsUAH = [];
    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;

    drawChartFromCache();
    setTimeout(() => setToast(""), 1200);
  }

  // ---------- Copy result ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    const emptyMarker = tt("infl.result_enter_values") || "Введи";
    if (!txt || txt.includes(emptyMarker)) {
      setToast(tt("infl.toast_need_calc_first") || "Спочатку зроби розрахунок.");
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(tt("infl.copied_result") || "Скопійовано результат.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("infl.copy_failed") || "Не вдалося скопіювати.");
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
      setToast(tt("infl.copied_table") || "Скопійовано таблицю.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("infl.copy_table_failed") || "Не вдалося скопіювати таблицю.");
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
    a.download = "inflation-years.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setToast(tt("infl.csv_downloaded") || "CSV завантажено.");
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
  amount?.addEventListener("input", scheduleAuto);
  inflationRate?.addEventListener("input", scheduleAuto);
  years?.addEventListener("input", scheduleAuto);
  monthlyTopUp?.addEventListener("input", scheduleAuto);
  startDate?.addEventListener("change", scheduleAuto);

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  scheduleCurrency?.addEventListener("change", () => {
    if (!ensureCurrencyLoadedOrFallback(scheduleCurrency)) return;
    renderTableFromCache();
  });

  chartCurrency?.addEventListener("change", () => {
    if (!ensureCurrencyLoadedOrFallback(chartCurrency)) return;
    drawChartFromCache();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    calc({ silent: false });
  });

  // ---------- Init ----------
  reset();
  loadNbuRates(); // async
})();
