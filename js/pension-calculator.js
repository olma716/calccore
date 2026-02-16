/* =========================================================
   pension-calculator.js — CalcCore (i18n-ready)
   - Inputs: age now, retire age, current savings, monthly contrib, expected annual return %
   - Model: monthly contributions at start of month + monthly compounding
   - Results: final amount at retirement, contributed vs earned, KPI + chart (end-of-year)
   - Table: yearly rows (Year, Age, Date, Contributed, Earned, Balance, Earned%)
   - NBU: currency switch UAH/USD/EUR for chart + table
   - UI: toast + copy result + copy table + CSV
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
  const ageNow = el("ageNow");
  const ageRetire = el("ageRetire");
  const savingsNow = el("savingsNow");
  const monthlyContrib = el("monthlyContrib");
  const annualReturn = el("annualReturn");
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
  let rates = { loaded: false, date: "", USD: null, EUR: null };

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

  // State caches in UAH
  let chartPointsUAH = []; // [{label, yUAH}]
  let yearRowsUAH = []; // [{year, age, dateText, contributedUAH, earnedUAH, balanceUAH, earnedPct}]

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

  function formatMoneyUAH(n) {
    if (!Number.isFinite(n)) return "—";
    return `${formatNumber(n, 2)} ₴`;
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
            tt("pension.nbu_badge", { usd: formatNumber(rates.USD, 4), eur: formatNumber(rates.EUR, 4), datePart }) ||
            `Курс НБУ: USD ${formatNumber(rates.USD, 4)} / EUR ${formatNumber(rates.EUR, 4)}${datePart}`;
          nbuBadge.title = tt("pension.nbu_title") || "Курс НБУ (USD/EUR)";
        } else {
          nbuBadge.textContent = tt("pension.nbu_unavailable") || "Курс НБУ: недоступно";
          nbuBadge.title = tt("pension.nbu_title") || "Курс НБУ (USD/EUR)";
        }
      }

      renderAllFromCache();
    } catch {
      rates.loaded = false;
      if (nbuBadge) {
        nbuBadge.textContent = tt("pension.nbu_unavailable") || "Курс НБУ: недоступно";
        nbuBadge.title = tt("pension.nbu_title") || "Курс НБУ (USD/EUR)";
      }
    }
  }

  // ---------- UI builder ----------
  function buildResultUI({ finalAmount, contributed, earned, yearsToGo, monthsToGo, earnedPct }) {
    const main = `${tt("pension.main") || "Накопичення на пенсію"}: ${formatMoneyUAH(finalAmount)}`;

    const extra = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("pension.kpi_final") || "Підсумкова сума"}</div>
          <div class="m-kpi__v">${formatMoneyUAH(finalAmount)}</div>
          <div class="m-kpi__s">${tt("pension.kpi_horizon") || "Горизонт"}: ${yearsToGo} ${tt("pension.y") || "р."} (${monthsToGo} ${tt("pension.m") || "міс."})</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("pension.kpi_contrib") || "Внесли"}</div>
          <div class="m-kpi__v">${formatMoneyUAH(contributed)}</div>
          <div class="m-kpi__s">${tt("pension.kpi_contrib_hint") || "Накопичення зараз + внески"}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("pension.kpi_profit") || "Заробили"}</div>
          <div class="m-kpi__v">${formatMoneyUAH(earned)}</div>
          <div class="m-kpi__s">${tt("pension.kpi_profit_pct") || "У % до внесків"}: ${formatNumber(earnedPct, 2)}%</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("pension.kpi_monthly") || "Щомісячний внесок"}</div>
          <div class="m-kpi__v">${formatMoneyUAH(parseMoney(monthlyContrib?.value))}</div>
          <div class="m-kpi__s">${tt("pension.kpi_monthly_hint") || "Регулярні внески до пенсії"}</div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>${tt("pension.summary") || "Внесли та заробили"}</b>: ${formatMoneyUAH(contributed)} / ${formatMoneyUAH(earned)}</div>
        <div class="m-hintSmall">${tt("pension.summary_hint") || "Графік та таблиця показують баланс наприкінці кожного року. Валюту можна перемкнути на USD/EUR за курсом НБУ."}</div>
      </div>
    `;
    return { main, extra };
  }

  // ---------- Table render ----------
  function renderTableFromCache() {
    if (!scheduleTbody) return;
    const code = scheduleCurrency?.value || "UAH";

    scheduleTbody.innerHTML = yearRowsUAH
      .map(
        (r) => `
        <tr>
          <td>${r.year}</td>
          <td>${r.age}</td>
          <td>${r.dateText}</td>
          <td>${formatMoneyByCurrency(r.contributedUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.earnedUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.balanceUAH, code)}</td>
          <td>${formatNumber(r.earnedPct, 2)}%</td>
        </tr>
      `
      )
      .join("");
  }

  // ---------- Chart ----------
  function drawChart() {
    if (!ctx || !canvas) return;

    const code = chartCurrency?.value || "UAH";
    const points = chartPointsUAH.map((p) => ({ label: p.label, y: convertFromUAH(p.yUAH, code) }));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length < 2) {
      ctx.font = "12px Arial";
      ctx.fillStyle = "#1f2f55";
      ctx.fillText(tt("pension.chart_need_data") || "Зроби розрахунок, щоб побачити графік.", 12, 24);
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

  // ---------- Calculation ----------
  function calc({ silent = false } = {}) {
    const a0 = Number(ageNow?.value || 0);
    const aR = Number(ageRetire?.value || 0);
    const P0 = parseMoney(savingsNow?.value);
    const mCont = Math.max(0, parseMoney(monthlyContrib?.value));
    const rPct = parseMoney(annualReturn?.value);
    const start = startDate?.value ? new Date(startDate.value) : new Date();

    // validate ages
    if (!(a0 > 0) || !(aR > 0) || !(aR > a0)) {
      if (!silent) setToast(tt("pension.toast_bad_ages") || "Перевір вік і вік виходу на пенсію.");
      setResult(tt("pension.result_enter_values") || "Введи вік, вік виходу на пенсію, суму та дохідність.", "");
      chartPointsUAH = [];
      yearRowsUAH = [];
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap) scheduleWrap.open = false;
      renderAllFromCache();
      return;
    }

    const yearsToGo = aR - a0;
    const monthsToGo = yearsToGo * 12;

    // validate values
    if (!(P0 >= 0) || monthsToGo <= 0) {
      if (!silent) setToast(tt("pension.toast_enter_values") || "Введи значення для розрахунку.");
      setResult(tt("pension.result_enter_values") || "Введи вік, вік виходу на пенсію, суму та дохідність.", "");
      chartPointsUAH = [];
      yearRowsUAH = [];
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap) scheduleWrap.open = false;
      renderAllFromCache();
      return;
    }

    const rMonth = rPct > 0 ? (rPct / 100) / 12 : 0;

    let balance = P0;
    let contributed = P0;

    chartPointsUAH = [];
    yearRowsUAH = [];

    for (let m = 1; m <= monthsToGo; m++) {
      // contribution at start of month
      if (mCont > 0) {
        balance += mCont;
        contributed += mCont;
      }
      // monthly growth
      if (rMonth > 0) balance *= 1 + rMonth;

      // end of year snapshot
      if (m % 12 === 0) {
        const y = m / 12;
        const age = a0 + y;

        const earned = balance - contributed;
        const earnedPct = contributed > 0 ? (earned / contributed) * 100 : 0;

        chartPointsUAH.push({ label: `${y}`, yUAH: balance });

        yearRowsUAH.push({
          year: y,
          age,
          dateText: formatDate(addYears(start, y)),
          contributedUAH: contributed,
          earnedUAH: earned,
          balanceUAH: balance,
          earnedPct,
        });
      }
    }

    const finalAmount = balance;
    const earned = finalAmount - contributed;
    const earnedPct = contributed > 0 ? (earned / contributed) * 100 : 0;

    const ui = buildResultUI({ finalAmount, contributed, earned, yearsToGo, monthsToGo, earnedPct });

    setToast("");
    setResult(ui.main, ui.extra);

    renderAllFromCache();
    if (scheduleWrap) scheduleWrap.open = false;
  }

  // ---------- reset ----------
  function reset() {
    if (ageNow) ageNow.value = "";
    if (ageRetire) ageRetire.value = "";
    if (savingsNow) savingsNow.value = "";
    if (monthlyContrib) monthlyContrib.value = "";
    if (annualReturn) annualReturn.value = "";
    if (chartCurrency) chartCurrency.value = "UAH";
    if (scheduleCurrency) scheduleCurrency.value = "UAH";

    if (startDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    setToast(tt("pension.toast_reset") || "Скинуто.");
    setResult(tt("pension.result_enter_values") || "Введи вік, вік виходу на пенсію, суму та дохідність.", "");

    chartPointsUAH = [];
    yearRowsUAH = [];
    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;

    renderAllFromCache();
    setTimeout(() => setToast(""), 1200);
  }

  // ---------- copy result ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt || txt.includes(tt("pension.result_enter_values") || "Введи")) {
      setToast(tt("pension.toast_need_calc_first") || "Спочатку зроби розрахунок.");
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(tt("pension.copied_result") || "Скопійовано результат.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("pension.copy_failed") || "Не вдалося скопіювати.");
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
      setToast(tt("pension.copied_table") || "Скопійовано таблицю.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("pension.copy_table_failed") || "Не вдалося скопіювати таблицю.");
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
    a.download = "pension-years.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setToast(tt("pension.csv_downloaded") || "CSV завантажено.");
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
  ageNow?.addEventListener("input", scheduleAuto);
  ageRetire?.addEventListener("input", scheduleAuto);
  savingsNow?.addEventListener("input", scheduleAuto);
  monthlyContrib?.addEventListener("input", scheduleAuto);
  annualReturn?.addEventListener("input", scheduleAuto);
  startDate?.addEventListener("change", scheduleAuto);

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  scheduleCurrency?.addEventListener("change", () => {
    if ((scheduleCurrency.value === "USD" || scheduleCurrency.value === "EUR") && !rates.loaded) {
      setToast(tt("pension.toast_nbu_not_loaded_fallback") || "Курс НБУ не завантажився — показую UAH.");
      scheduleCurrency.value = "UAH";
      setTimeout(() => setToast(""), 2000);
    }
    renderTableFromCache();
  });

  chartCurrency?.addEventListener("change", () => {
    if ((chartCurrency.value === "USD" || chartCurrency.value === "EUR") && !rates.loaded) {
      setToast(tt("pension.toast_nbu_not_loaded_fallback") || "Курс НБУ не завантажився — показую UAH.");
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
