/* =========================================================
   roi-calculator.js — CalcCore (i18n-ready) — FIXED + INPUT SPACING
   - Base currency selector near "Investment amount" (#baseCurrency)
   - ALL calculations are performed in selected base currency (UAH/USD/EUR)
   - Chart + yearly table can be switched to UAH/USD/EUR via NBU rates (UAH per 1 USD/EUR)
   - Input money formatting with spaces: 100 000 / 1 000 000
   - Fix: HTML id is #investAmount (not #investment)
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
            for (const [kk, vv] of Object.entries(vars)) {
              s = s.replaceAll(`{${kk}}`, String(vv));
            }
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

  // Inputs (FIXED IDs)
  const investment = el("investAmount"); // <-- FIX
  const annualReturn = el("annualReturn");
  const years = el("years");
  const monthlyContrib = el("monthlyContrib");
  const startDate = el("startDate");

  // Base currency
  const baseCurrency = el("baseCurrency");

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

  // Chart
  const chartCurrency = el("chartCurrency");
  const canvas = el("growthChart");
  const ctx = canvas?.getContext?.("2d");

  // Table
  const scheduleWrap = el("scheduleWrap");
  const scheduleCurrency = el("scheduleCurrency");
  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");
  const btnDownloadCSV = el("btnDownloadCSV");

  // State (rates: UAH per 1 USD/EUR)
  let rates = { loaded: false, date: "", USD: null, EUR: null };

  // Cache in BASE currency
  let lastBaseCode = "UAH";
  let chartPointsBASE = []; // [{label, yBase}]
  let yearRowsBASE = []; // {year, dateText, contributedBase, profitBase, balanceBase, roiPct}

  // ---------- helpers ----------
  function setToast(msg) {
    if (!toast) return;
    toast.textContent = msg || "";
  }

  function setResult(mainText, extraHtml = "") {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  }

  function onlyDigitsDot(s) {
    return String(s || "")
      .replace(/\s+/g, "")
      .replace(/,/g, ".")
      .replace(/[^\d.]/g, "");
  }

  function parseMoney(val) {
    const s = onlyDigitsDot(val);
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

  function formatMoney(amount, code) {
    if (!Number.isFinite(amount)) return "—";
    return `${formatNumber(amount, 2)} ${currencySymbol(code)}`;
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

  function needsRates(from, to) {
    return from !== to && (from !== "UAH" || to !== "UAH");
  }

  // ---- Currency conversions (through UAH pivot) ----
  function toUAH(amount, fromCode) {
    if (!Number.isFinite(amount)) return amount;
    if (fromCode === "UAH") return amount;
    if (!rates.loaded) return amount;
    const r = rates[fromCode];
    if (!Number.isFinite(r) || r <= 0) return amount;
    return amount * r;
  }

  function fromUAH(amountUAH, toCode) {
    if (!Number.isFinite(amountUAH)) return amountUAH;
    if (toCode === "UAH") return amountUAH;
    if (!rates.loaded) return amountUAH;
    const r = rates[toCode];
    if (!Number.isFinite(r) || r <= 0) return amountUAH;
    return amountUAH / r;
  }

  function convert(amount, fromCode, toCode) {
    if (!Number.isFinite(amount)) return amount;
    if (fromCode === toCode) return amount;
    if (!needsRates(fromCode, toCode)) return amount;
    if (!rates.loaded) return amount;
    const uah = toUAH(amount, fromCode);
    return fromUAH(uah, toCode);
  }

  // ---------- input formatting with spaces ----------
  // Keeps caret position while formatting thousands with spaces.
  function formatInputSpaces(inputEl) {
    if (!inputEl) return;

    const raw = String(inputEl.value || "");
    const selStart = inputEl.selectionStart ?? raw.length;

    // count digits before caret (ignore spaces and non-digits)
    const digitsBefore = raw.slice(0, selStart).replace(/[^\d]/g, "").length;

    const cleaned = onlyDigitsDot(raw);
    const [intPartRaw, fracRaw = ""] = cleaned.split(".");
    const intDigits = (intPartRaw || "").replace(/^0+(?=\d)/, "") || (intPartRaw ? "0" : "");
    const intFormatted = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    const frac = (fracRaw || "").slice(0, 6); // limit fractional length (safe)
    const formatted = frac.length ? `${intFormatted}.${frac}` : intFormatted;

    inputEl.value = formatted;

    // restore caret near same digit index
    if (typeof inputEl.setSelectionRange === "function") {
      let pos = 0;
      let seenDigits = 0;
      while (pos < formatted.length && seenDigits < digitsBefore) {
        if (/\d/.test(formatted[pos])) seenDigits++;
        pos++;
      }
      inputEl.setSelectionRange(pos, pos);
    }
  }

  function attachMoneyFormatter(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener("input", () => formatInputSpaces(inputEl));
    inputEl.addEventListener("blur", () => formatInputSpaces(inputEl));
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
            tt("roi.nbu_badge", { usd: formatNumber(rates.USD, 4), eur: formatNumber(rates.EUR, 4), datePart }) ||
            `Курс НБУ: USD ${formatNumber(rates.USD, 4)} / EUR ${formatNumber(rates.EUR, 4)}${datePart}`;
          nbuBadge.title = tt("roi.nbu_title") || "Курс НБУ (USD/EUR)";
        } else {
          nbuBadge.textContent = tt("roi.nbu_unavailable") || "Курс НБУ: недоступно";
          nbuBadge.title = tt("roi.nbu_title") || "Курс НБУ (USD/EUR)";
        }
      }

      renderAllFromCache();
    } catch {
      rates.loaded = false;
      if (nbuBadge) {
        nbuBadge.textContent = tt("roi.nbu_unavailable") || "Курс НБУ: недоступно";
        nbuBadge.title = tt("roi.nbu_title") || "Курс НБУ (USD/EUR)";
      }
    }
  }

  // ---------- UI ----------
  function buildResultUI({ finalAmount, totalContributed, netProfit, roiPct, baseCode }) {
    const main =
      `${tt("roi.main") || "ROI"}: ${formatNumber(roiPct, 2)}% • ` +
      `${tt("roi.final") || "Підсумкова сума"}: ${formatMoney(finalAmount, baseCode)}`;

    const earnedPct = totalContributed > 0 ? (netProfit / totalContributed) * 100 : 0;

    const extra = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("roi.kpi_roi") || "ROI"}</div>
          <div class="m-kpi__v">${formatNumber(roiPct, 2)}%</div>
          <div class="m-kpi__s">${tt("roi.kpi_roi_hint") || "Прибуток / внесли"}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("roi.kpi_profit") || "Чистий прибуток"}</div>
          <div class="m-kpi__v">${formatMoney(netProfit, baseCode)}</div>
          <div class="m-kpi__s">${tt("roi.kpi_profit_pct") || "% від внесеного"}: ${formatNumber(earnedPct, 2)}%</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("roi.kpi_contributed") || "Внесли"}</div>
          <div class="m-kpi__v">${formatMoney(totalContributed, baseCode)}</div>
          <div class="m-kpi__s">${tt("roi.kpi_contributed_hint") || "Початкова + внески"}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("roi.kpi_final") || "Підсумкова сума"}</div>
          <div class="m-kpi__v">${formatMoney(finalAmount, baseCode)}</div>
          <div class="m-kpi__s">${tt("roi.kpi_final_hint") || "Баланс наприкінці періоду"}</div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>${tt("roi.summary") || "Внесли та заробили"}</b>: ${formatMoney(totalContributed, baseCode)} / ${formatMoney(netProfit, baseCode)}</div>
        <div class="m-hintSmall">
          ${tt("roi.summary_hint") || "Графік і таблиця показують баланс наприкінці кожного року. Валюту можна перемкнути на USD/EUR (курс НБУ)."}
        </div>
      </div>
    `;
    return { main, extra };
  }

  // ---------- Table ----------
  function renderTableFromCache() {
    if (!scheduleTbody) return;

    const toCode = scheduleCurrency?.value || lastBaseCode;
    const fromCode = lastBaseCode;

    scheduleTbody.innerHTML = yearRowsBASE
      .map((r) => {
        const contributed = convert(r.contributedBase, fromCode, toCode);
        const profit = convert(r.profitBase, fromCode, toCode);
        const balance = convert(r.balanceBase, fromCode, toCode);

        return `
          <tr>
            <td>${r.year}</td>
            <td>${r.dateText}</td>
            <td>${formatMoney(contributed, toCode)}</td>
            <td>${formatMoney(profit, toCode)}</td>
            <td>${formatMoney(balance, toCode)}</td>
            <td>${formatNumber(r.roiPct, 2)}%</td>
          </tr>
        `;
      })
      .join("");
  }

  // ---------- Chart ----------
  function drawChart() {
    if (!ctx || !canvas) return;

    const toCode = chartCurrency?.value || lastBaseCode;
    const fromCode = lastBaseCode;

    const points = chartPointsBASE.map((p) => ({
      label: p.label,
      y: convert(p.yBase, fromCode, toCode),
    }));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length < 2) {
      ctx.font = "12px Arial";
      ctx.fillStyle = "#1f2f55";
      ctx.fillText(tt("roi.chart_need_data") || "Зроби розрахунок, щоб побачити графік.", 12, 24);
      return;
    }

    const W = canvas.width;
    const H = canvas.height;

    const padL = 44, padR = 16, padT = 16, padB = 34;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const ys = points.map((p) => (Number.isFinite(p.y) ? p.y : 0));
    const yMin = 0;
    const yMax = Math.max(...ys, 1);

    const xStep = innerW / (points.length - 1);
    const xAt = (i) => padL + i * xStep;
    const yAt = (val) => padT + innerH * (1 - (val - yMin) / (yMax - yMin));

    // grid
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
      ctx.fillText(`${formatNumber(v, 0)} ${currencySymbol(toCode)}`, 6, y + 4);
    }

    // line
    ctx.strokeStyle = "#1f2f55";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xAt(i);
      const y = yAt(p.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // dots
    ctx.fillStyle = "#1f2f55";
    points.forEach((p, i) => {
      const x = xAt(i);
      const y = yAt(p.y);
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
  }

  function renderAllFromCache() {
    renderTableFromCache();
    drawChart();
  }

  // ---------- Calculation (monthly model) ----------
  function calc({ silent = false } = {}) {
    const baseCode = baseCurrency?.value || "UAH";
    lastBaseCode = baseCode;

    const P0 = parseMoney(investment?.value);
    const rPct = parseMoney(annualReturn?.value);
    const Y = Number(years?.value || 0);
    const mCont = Math.max(0, parseMoney(monthlyContrib?.value));
    const start = startDate?.value ? new Date(startDate.value) : new Date();

    if (!(P0 > 0) || !(Y > 0)) {
      if (!silent) setToast(tt("roi.toast_enter_values") || "Введи суму інвестиції та період.");
      setResult(tt("roi.result_enter_values") || "Введи суму інвестиції, дохідність та період.", "");
      chartPointsBASE = [];
      yearRowsBASE = [];
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap) scheduleWrap.open = false;
      renderAllFromCache();
      return;
    }

    const monthsTotal = Y * 12;
    const rMonth = rPct > 0 ? rPct / 100 / 12 : 0;

    let balance = P0;
    let contributed = P0;

    chartPointsBASE = [];
    yearRowsBASE = [];

    for (let m = 1; m <= monthsTotal; m++) {
      // contribution at the beginning of each month
      if (mCont > 0) {
        balance += mCont;
        contributed += mCont;
      }

      // monthly growth
      if (rMonth > 0) balance *= 1 + rMonth;

      // end of year snapshot
      if (m % 12 === 0) {
        const y = m / 12;
        const date = addYears(start, y);

        const profit = balance - contributed;
        const roi = contributed > 0 ? (profit / contributed) * 100 : 0;

        chartPointsBASE.push({ label: `${y}`, yBase: balance });

        yearRowsBASE.push({
          year: y,
          dateText: formatDate(date),
          contributedBase: contributed,
          profitBase: profit,
          balanceBase: balance,
          roiPct: roi,
        });
      }
    }

    const finalAmount = balance;
    const netProfit = finalAmount - contributed;
    const roiPct = contributed > 0 ? (netProfit / contributed) * 100 : 0;

    const ui = buildResultUI({
      finalAmount,
      totalContributed: contributed,
      netProfit,
      roiPct,
      baseCode,
    });

    setToast("");
    setResult(ui.main, ui.extra);

    renderAllFromCache();
    if (scheduleWrap) scheduleWrap.open = false;
  }

  // ---------- reset ----------
  function reset() {
    if (investment) investment.value = "";
    if (annualReturn) annualReturn.value = "";
    if (years) years.value = "";
    if (monthlyContrib) monthlyContrib.value = "";

    if (baseCurrency) baseCurrency.value = "UAH";
    lastBaseCode = "UAH";

    if (chartCurrency) chartCurrency.value = "UAH";
    if (scheduleCurrency) scheduleCurrency.value = "UAH";

    if (startDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    setToast(tt("roi.toast_reset") || "Скинуто.");
    setResult(tt("roi.result_enter_values") || "Введи суму інвестиції, дохідність та період.", "");

    chartPointsBASE = [];
    yearRowsBASE = [];
    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;

    renderAllFromCache();
    setTimeout(() => setToast(""), 1200);
  }

  // ---------- copy result ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt || txt.includes(tt("roi.result_enter_values") || "Введи")) {
      setToast(tt("roi.toast_need_calc_first") || "Спочатку зроби розрахунок.");
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(tt("roi.copied_result") || "Скопійовано результат.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("roi.copy_failed") || "Не вдалося скопіювати.");
    }
  }

  // ---------- copy table / CSV ----------
  async function copySchedule() {
    if (!scheduleTable) return;
    const rows = Array.from(scheduleTable.querySelectorAll("tr"));
    const lines = rows.map((tr) =>
      Array.from(tr.children)
        .map((td) => td.innerText.replace(/\s+/g, " ").trim())
        .join("\t")
    );
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text.trim());
      setToast(tt("roi.copied_table") || "Скопійовано таблицю.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("roi.copy_table_failed") || "Не вдалося скопіювати таблицю.");
    }
  }

  function downloadCSV() {
    if (!scheduleTable) return;
    const rows = Array.from(scheduleTable.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.children)
        .map((td) => `"${td.innerText.replace(/"/g, '""').trim()}"`)
        .join(",")
    );
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "roi-years.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setToast(tt("roi.csv_downloaded") || "CSV завантажено.");
    setTimeout(() => setToast(""), 1500);
  }

  // ---------- Auto-calc debounce ----------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  function safeSetCurrencySelect(selectEl, targetCode) {
    if (!selectEl) return;
    if (selectEl.value === targetCode) return;
    selectEl.value = targetCode;
  }

  function handleDisplayCurrencyChange(selectEl) {
    const baseCode = baseCurrency?.value || lastBaseCode || "UAH";
    const chosen = selectEl?.value || baseCode;

    if (needsRates(baseCode, chosen) && !rates.loaded) {
      setToast(tt("roi.toast_nbu_not_loaded_fallback") || "Курс НБУ не завантажився — показую базову валюту.");
      safeSetCurrencySelect(selectEl, baseCode);
      setTimeout(() => setToast(""), 2000);
    }
  }

  // ---------- events ----------
  // money inputs: spacing
  attachMoneyFormatter(investment);
  attachMoneyFormatter(monthlyContrib);

  investment?.addEventListener("input", scheduleAuto);
  annualReturn?.addEventListener("input", scheduleAuto);
  years?.addEventListener("input", scheduleAuto);
  monthlyContrib?.addEventListener("input", scheduleAuto);
  startDate?.addEventListener("change", scheduleAuto);

  // base currency change syncs chart/table currency + recalculates
  baseCurrency?.addEventListener("change", () => {
    const baseCode = baseCurrency.value || "UAH";
    safeSetCurrencySelect(chartCurrency, baseCode);
    safeSetCurrencySelect(scheduleCurrency, baseCode);
    calc({ silent: true });
  });

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  scheduleCurrency?.addEventListener("change", () => {
    handleDisplayCurrencyChange(scheduleCurrency);
    renderTableFromCache();
  });

  chartCurrency?.addEventListener("change", () => {
    handleDisplayCurrencyChange(chartCurrency);
    drawChart();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    calc({ silent: false });
  });

  // ---------- init ----------
  reset();
  loadNbuRates(); // async
})();
