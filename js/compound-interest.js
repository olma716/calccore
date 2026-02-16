/* =========================================================
   compound-interest.js — CalcCore (i18n-ready)
   - Inputs: principal, monthly top-up, annual rate, years, compounding frequency
   - Results: final amount, contributed vs earned (%), growth chart, yearly table
   - NBU: optional currency conversion for chart/table
   - UI: KPI blocks + toast + CSV/copy
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

  // ---------- Inputs ----------
  const principal = el("principal");
  const monthlyTopUp = el("monthlyTopUp");
  const annualRate = el("annualRate");
  const years = el("years");
  const frequency = el("frequency"); // monthly / quarterly / yearly
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
  const nbuBadge = el("nbuBadge");

  // Chart + currency
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

  // ---------- state ----------
  let rates = { loaded: false, date: "", USD: null, EUR: null };

  // yearly rows in UAH for table + chart points
  let yearRowsUAH = []; // {year, dateText, contributedUAH, earnedUAH, balanceUAH, earnedPct}
  let chartPointsUAH = []; // [{xLabel, yUAH}]

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
    const s = String(val)
      .replace(/\s+/g, "")
      .replace(/,/g, ".")
      .replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function formatNumber(n, maxFrac = 2) {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString(LOCALE, { maximumFractionDigits: maxFrac });
  }

  function formatMoneyUAH(n) {
    if (!Number.isFinite(n)) return "—";
    return `${formatNumber(n, 2)} ₴`;
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

  function formatDate(d) {
    try {
      return d.toLocaleDateString(LOCALE);
    } catch {
      return "";
    }
  }

  function addMonths(date, m) {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + m);
    if (d.getDate() < day) d.setDate(0);
    return d;
  }

  function addYears(date, y) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + y);
    return d;
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
            tt("comp.nbu_badge", { usd: formatNumber(rates.USD, 4), eur: formatNumber(rates.EUR, 4), datePart }) ||
            `Курс НБУ: USD ${formatNumber(rates.USD, 4)} / EUR ${formatNumber(rates.EUR, 4)}${datePart}`;
          nbuBadge.title = tt("comp.nbu_title") || "Курс НБУ (USD/EUR)";
        } else {
          nbuBadge.textContent = tt("comp.nbu_unavailable") || "Курс НБУ: недоступно";
          nbuBadge.title = tt("comp.nbu_title") || "Курс НБУ (USD/EUR)";
        }
      }

      renderAllFromCache();
    } catch {
      rates.loaded = false;
      if (nbuBadge) {
        nbuBadge.textContent = tt("comp.nbu_unavailable") || "Курс НБУ: недоступно";
        nbuBadge.title = tt("comp.nbu_title") || "Курс НБУ (USD/EUR)";
      }
    }
  }

  // ---------- UI builders ----------
  function buildResultUI({ finalBalance, totalContributed, earned, earnedPct, freqLabel }) {
    const main = `${tt("comp.final") || "Підсумкова сума"}: ${formatMoneyUAH(finalBalance)}`;

    const extra = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("comp.kpi_contributed") || "Внесли"}</div>
          <div class="m-kpi__v">${formatMoneyUAH(totalContributed)}</div>
          <div class="m-kpi__s">${tt("comp.kpi_freq") || "Частота"}: ${freqLabel}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("comp.kpi_earned") || "Заробили"}</div>
          <div class="m-kpi__v">${formatMoneyUAH(earned)}</div>
          <div class="m-kpi__s">${tt("comp.kpi_earned_pct") || "Прибуток"}: ${formatNumber(earnedPct, 2)}%</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("comp.kpi_ratio") || "Внесли vs заробили"}</div>
          <div class="m-kpi__v">${formatNumber(totalContributed > 0 ? (earned / totalContributed) * 100 : 0, 2)}%</div>
          <div class="m-kpi__s">${tt("comp.kpi_ratio_hint") || "Заробили / внесли"}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("comp.kpi_final") || "Фінальний баланс"}</div>
          <div class="m-kpi__v">${formatMoneyUAH(finalBalance)}</div>
          <div class="m-kpi__s">${tt("comp.kpi_years") || "По роках"}: ${yearRowsUAH.length}</div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>${tt("comp.summary") || "Внесли та заробили"}</b>:
          ${formatMoneyUAH(totalContributed)} / ${formatMoneyUAH(earned)}
        </div>
        <div class="m-hintSmall">
          ${tt("comp.summary_hint") || "Графік і таблиця — за балансом наприкінці кожного року. Валюту можна перемкнути на USD/EUR (курс НБУ)."}
        </div>
      </div>
    `;
    return { main, extra };
  }

  // ---------- render table ----------
  function renderTableFromCache() {
    if (!scheduleTbody) return;
    const code = scheduleCurrency?.value || "UAH";

    scheduleTbody.innerHTML = yearRowsUAH
      .map((r) => {
        const earnedPct = r.contributedUAH > 0 ? (r.earnedUAH / r.contributedUAH) * 100 : 0;
        return `
          <tr>
            <td>${r.year}</td>
            <td>${r.dateText}</td>
            <td>${formatMoneyByCurrency(r.contributedUAH, code)}</td>
            <td>${formatMoneyByCurrency(r.earnedUAH, code)}</td>
            <td>${formatMoneyByCurrency(r.balanceUAH, code)}</td>
            <td>${formatNumber(earnedPct, 2)}%</td>
          </tr>
        `;
      })
      .join("");
  }

  // ---------- chart ----------
  function drawChart() {
    if (!ctx || !canvas) return;

    const code = chartCurrency?.value || "UAH";
    const points = chartPointsUAH.map((p) => ({
      label: p.label,
      y: convertFromUAH(p.yUAH, code),
    }));

    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // safe empty
    if (points.length < 2) {
      ctx.font = "12px Arial";
      ctx.fillStyle = "#1f2f55";
      ctx.fillText(tt("comp.chart_need_data") || "Зроби розрахунок, щоб побачити графік.", 12, 24);
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

    // grid + axes
    ctx.strokeStyle = "rgba(40,59,105,.18)";
    ctx.lineWidth = 1;

    // horizontal grid lines
    const gridN = 4;
    for (let g = 0; g <= gridN; g++) {
      const y = padT + (innerH * g) / gridN;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();

      // labels
      const v = yMax * (1 - g / gridN);
      ctx.fillStyle = "rgba(31,47,85,.85)";
      ctx.font = "11px Arial";
      ctx.fillText(`${formatNumber(v, 0)} ${currencySymbol(code)}`, 6, y + 4);
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

    // x labels (years)
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

  // ---------- calculation core ----------
  function calc({ silent = false } = {}) {
    const P0 = parseMoney(principal?.value);
    const topUp = Math.max(0, parseMoney(monthlyTopUp?.value));
    const rYearPct = parseMoney(annualRate?.value);
    const Y = Number(years?.value || 0);
    const freq = frequency?.value || "monthly";
    const start = startDate?.value ? new Date(startDate.value) : new Date();

    if (!(P0 > 0) || !(Y > 0)) {
      if (!silent) setToast(tt("comp.toast_enter_values") || "Введи початкову суму та період.");
      setResult(tt("comp.result_enter_values") || "Введи початкову суму, ставку та період.", "");
      yearRowsUAH = [];
      chartPointsUAH = [];
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap) scheduleWrap.open = false;
      drawChart();
      return;
    }

    const totalMonths = Math.round(Y * 12);
    const rYear = rYearPct > 0 ? (rYearPct / 100) : 0;

    const periodMonths = freq === "yearly" ? 12 : (freq === "quarterly" ? 3 : 1);
    const periodsPerYear = 12 / periodMonths;
    const rPerPeriod = periodsPerYear > 0 ? (rYear / periodsPerYear) : 0;

    let balance = P0;
    let contributed = P0;
    let earned = 0;

    yearRowsUAH = [];
    chartPointsUAH = [];

    for (let m = 1; m <= totalMonths; m++) {
      // monthly top-up at the beginning of each month (including month 1)
      if (topUp > 0) {
        balance += topUp;
        contributed += topUp;
      }

      // apply interest at compounding boundary
      if (rPerPeriod > 0 && (m % periodMonths === 0)) {
        const interest = balance * rPerPeriod;
        balance += interest;
        earned += interest;
      }

      // end of year snapshot
      if (m % 12 === 0) {
        const yearIndex = m / 12;
        const date = addYears(start, yearIndex);
        const earnedNow = balance - contributed; // should match earned but safer with rounding
        const earnedPct = contributed > 0 ? (earnedNow / contributed) * 100 : 0;

        yearRowsUAH.push({
          year: yearIndex,
          dateText: formatDate(date),
          contributedUAH: contributed,
          earnedUAH: earnedNow,
          balanceUAH: balance,
          earnedPct,
        });

        chartPointsUAH.push({
          label: `${yearIndex}`,
          yUAH: balance,
        });
      }
    }

    const finalBalance = balance;
    const totalContributed = contributed;
    const totalEarned = finalBalance - totalContributed;
    const totalEarnedPct = totalContributed > 0 ? (totalEarned / totalContributed) * 100 : 0;

    const freqLabel =
      freq === "yearly"
        ? (tt("comp.freq_yearly") || "щороку")
        : (freq === "quarterly"
            ? (tt("comp.freq_quarterly") || "щокварталу")
            : (tt("comp.freq_monthly") || "щомісяця"));

    const ui = buildResultUI({
      finalBalance,
      totalContributed,
      earned: totalEarned,
      earnedPct: totalEarnedPct,
      freqLabel,
    });

    setToast("");
    setResult(ui.main, ui.extra);

    renderAllFromCache();
    if (scheduleWrap) scheduleWrap.open = false;
  }

  // ---------- reset ----------
  function reset() {
    if (principal) principal.value = "";
    if (monthlyTopUp) monthlyTopUp.value = "";
    if (annualRate) annualRate.value = "";
    if (years) years.value = "";
    if (frequency) frequency.value = "monthly";

    if (chartCurrency) chartCurrency.value = "UAH";
    if (scheduleCurrency) scheduleCurrency.value = "UAH";

    if (startDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    setToast(tt("comp.toast_reset") || "Скинуто.");
    setResult(tt("comp.result_enter_values") || "Введи початкову суму, ставку та період.", "");
    yearRowsUAH = [];
    chartPointsUAH = [];
    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;
    drawChart();
    setTimeout(() => setToast(""), 1200);
  }

  // ---------- copy / CSV ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt || txt.includes(tt("comp.result_enter_values") || "Введи")) {
      setToast(tt("comp.toast_need_calc_first") || "Спочатку зроби розрахунок.");
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(tt("comp.copied_result") || "Скопійовано результат.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("comp.copy_failed") || "Не вдалося скопіювати.");
    }
  }

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
      setToast(tt("comp.copied_table") || "Скопійовано таблицю.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("comp.copy_table_failed") || "Не вдалося скопіювати таблицю.");
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
    a.download = "compound-interest-years.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setToast(tt("comp.csv_downloaded") || "CSV завантажено.");
    setTimeout(() => setToast(""), 1500);
  }

  // ---------- Auto-calc debounce ----------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  // ---------- events ----------
  principal?.addEventListener("input", scheduleAuto);
  monthlyTopUp?.addEventListener("input", scheduleAuto);
  annualRate?.addEventListener("input", scheduleAuto);
  years?.addEventListener("input", scheduleAuto);
  frequency?.addEventListener("change", scheduleAuto);
  startDate?.addEventListener("change", scheduleAuto);

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  scheduleCurrency?.addEventListener("change", () => {
    if ((scheduleCurrency.value === "USD" || scheduleCurrency.value === "EUR") && !rates.loaded) {
      setToast(tt("comp.toast_nbu_not_loaded_fallback") || "Курс НБУ не завантажився — показую UAH.");
      scheduleCurrency.value = "UAH";
      setTimeout(() => setToast(""), 2000);
    }
    renderTableFromCache();
  });

  chartCurrency?.addEventListener("change", () => {
    if ((chartCurrency.value === "USD" || chartCurrency.value === "EUR") && !rates.loaded) {
      setToast(tt("comp.toast_nbu_not_loaded_fallback") || "Курс НБУ не завантажився — показую UAH.");
      chartCurrency.value = "UAH";
      setTimeout(() => setToast(""), 2000);
    }
    drawChart();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    calc({ silent: false });
  });

  // ---------- init ----------
  reset();
  loadNbuRates();
})();
