/* =========================================================
   compound-interest.js — CalcCore (i18n-ready) [BASE CURRENCY]
   - Base currency selector near "principal" (UAH/USD/EUR)
   - All inputs + outputs in base currency
   - NBU rates for conversion (UAH per 1 unit)
   - Money input formatting with spaces: 100 000 / 1 000 000
   - Chart + table render in base currency (chartCurrency/scheduleCurrency synced)
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
  const isEn = () => String(document.documentElement.lang || "").toLowerCase().startsWith("en");

  // ---------- Inputs ----------
  const principal = el("principal");
  const monthlyTopUp = el("monthlyTopUp");
  const annualRate = el("annualRate");
  const years = el("years");
  const frequency = el("frequency"); // monthly / quarterly / yearly
  const startDate = el("startDate");

  // Base currency select (NEW in HTML)
  const baseCurrencyEl = el("baseCurrency");

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

  // Chart + currency (we will sync with base currency)
  const chartCurrency = el("chartCurrency");
  const canvas = el("growthChart");
  const ctx = canvas?.getContext?.("2d");

  // Table + currency (sync with base)
  const scheduleWrap = el("scheduleWrap");
  const scheduleCurrency = el("scheduleCurrency");
  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");
  const btnDownloadCSV = el("btnDownloadCSV");

  // ---------- NBU rates cache ----------
  const NBU_URL = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";
  const CACHE_KEY = "cc_compound_nbu_rates_v1";
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

  // Rates are "UAH per 1 unit"
  let ratesByCode = { UAH: { rate: 1, txt: "UAH", exchangedate: "" } };
  let lastRateDate = ""; // dd.mm.yyyy
  let baseCur = (String(baseCurrencyEl?.value || "UAH") || "UAH").toUpperCase();

  // yearly rows in UAH for table + chart points
  let yearRowsUAH = []; // {year, dateText, contributedUAH, earnedUAH, balanceUAH}
  let chartPointsUAH = []; // [{label, yUAH}]

  // ---------- helpers ----------
  function setToast(msg) {
    if (!toast) return;
    toast.textContent = msg || "";
  }

  function setResult(mainText, extraHtml = "") {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  }

  function saveCache(payload) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {}
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data === "object" ? data : null;
    } catch {
      return null;
    }
  }

  function cacheIsFresh(cache) {
    if (!cache?.ts) return false;
    return Date.now() - cache.ts < CACHE_TTL_MS;
  }

  function normalizeRates(apiArr) {
    const map = { UAH: { rate: 1, txt: "UAH", exchangedate: "" } };

    for (const row of apiArr || []) {
      const cc = String(row?.cc || "").toUpperCase();
      const rate = Number(row?.rate);
      if (!cc || !Number.isFinite(rate)) continue;

      map[cc] = {
        rate,
        txt: row?.txt || cc,
        exchangedate: row?.exchangedate || "",
      };
    }

    lastRateDate = apiArr?.find?.((x) => x?.exchangedate)?.exchangedate || "";
    return map;
  }

  function hasRate(code) {
    const c = String(code || "UAH").toUpperCase();
    if (c === "UAH") return true;
    const r = ratesByCode?.[c]?.rate;
    return Number.isFinite(r) && r > 0;
  }

  async function loadNbuRates() {
    const cache = readCache();

    // 1) fresh cache
    if (cache?.rates && cacheIsFresh(cache)) {
      ratesByCode = cache.rates;
      lastRateDate = cache.lastRateDate || "";
      updateNbuBadge();
      return true;
    }

    // 2) fetch
    try {
      const res = await fetch(NBU_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("NBU not ok");
      const data = await res.json();

      ratesByCode = normalizeRates(data);
      updateNbuBadge();

      saveCache({ ts: Date.now(), rates: ratesByCode, lastRateDate });
      return true;
    } catch {
      // 3) fallback to old cache
      if (cache?.rates) {
        ratesByCode = cache.rates;
        lastRateDate = cache.lastRateDate || "";
        updateNbuBadge();
        setToast(isEn() ? "NBU rates unavailable — using cached." : "Курс НБУ недоступний — використовую кеш.");
        return true;
      }
      updateNbuBadge();
      return false;
    }
  }

  function updateNbuBadge() {
    if (!nbuBadge) return;

    const usd = ratesByCode?.USD?.rate;
    const eur = ratesByCode?.EUR?.rate;

    const usdOk = Number.isFinite(usd) && usd > 0;
    const eurOk = Number.isFinite(eur) && eur > 0;

    if (usdOk || eurOk) {
      const datePart = lastRateDate ? ` • ${lastRateDate}` : "";
      const usdTxt = usdOk ? `USD ${formatNumber(usd, 4)}` : `USD —`;
      const eurTxt = eurOk ? `EUR ${formatNumber(eur, 4)}` : `EUR —`;
      nbuBadge.textContent =
        tt("comp.nbu_badge", { usd: usdOk ? formatNumber(usd, 4) : "—", eur: eurOk ? formatNumber(eur, 4) : "—", datePart }) ||
        `${isEn() ? "NBU:" : "Курс НБУ:"} ${usdTxt} / ${eurTxt}${datePart}`;
      nbuBadge.title = tt("comp.nbu_title") || "Курс НБУ (USD/EUR)";
    } else {
      nbuBadge.textContent = tt("comp.nbu_unavailable") || (isEn() ? "NBU: unavailable" : "Курс НБУ: недоступно");
      nbuBadge.title = tt("comp.nbu_title") || "Курс НБУ (USD/EUR)";
    }
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

  function currencySymbol(code) {
    const c = String(code || "UAH").toUpperCase();
    if (c === "USD") return "$";
    if (c === "EUR") return "€";
    return "₴";
  }

  function formatMoney(amount, code) {
    if (!Number.isFinite(amount)) return "—";
    return `${formatNumber(amount, 2)} ${currencySymbol(code)}`;
  }

  // convert CUR -> UAH
  function toUAH(code, amount) {
    const c = String(code || "UAH").toUpperCase();
    if (!Number.isFinite(amount)) return amount;
    if (c === "UAH") return amount;
    const r = ratesByCode?.[c]?.rate;
    if (!Number.isFinite(r) || r <= 0) return amount;
    return amount * r;
  }

  // convert UAH -> CUR
  function fromUAH(code, uahAmount) {
    const c = String(code || "UAH").toUpperCase();
    if (!Number.isFinite(uahAmount)) return uahAmount;
    if (c === "UAH") return uahAmount;
    const r = ratesByCode?.[c]?.rate;
    if (!Number.isFinite(r) || r <= 0) return uahAmount;
    return uahAmount / r;
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

  // ---------- table head currency ----------
  function updateTableHeadCurrency(outCur) {
    if (!scheduleTable) return;
    const sym = currencySymbol(outCur);

    const ths = scheduleTable.querySelectorAll("thead th");
    if (!ths?.length) return;

    // expected columns: Year, Date, Contributed, Earned, Balance, Earned %
    const labels = [
      tt("comp.th_year") || (isEn() ? "Year" : "Рік"),
      tt("comp.th_date") || (isEn() ? "Date" : "Дата"),
      tt("comp.th_contrib") || (isEn() ? "Contributed" : "Внесли"),
      tt("comp.th_earned") || (isEn() ? "Earned" : "Заробили"),
      tt("comp.th_balance") || (isEn() ? "Balance" : "Баланс"),
      tt("comp.th_earned_pct") || (isEn() ? "Earned, %" : "Заробили, %"),
    ];

    ths.forEach((th, idx) => {
      if (idx === 2 || idx === 3 || idx === 4) th.textContent = `${labels[idx]} (${sym})`;
      else th.textContent = labels[idx] || th.textContent;
    });
  }

  // ---------- money input autoformat (spaces) ----------
  function formatWithSpacesRaw(input) {
    const s0 = String(input ?? "");
    const s = s0.replace(/[^\d.,]/g, "").replace(/,/g, ".");
    if (!s) return "";

    const firstDot = s.indexOf(".");
    let intPart = firstDot >= 0 ? s.slice(0, firstDot) : s;
    let fracPart = firstDot >= 0 ? s.slice(firstDot + 1) : "";

    fracPart = fracPart.replace(/\./g, "");
    intPart = intPart.replace(/^0+(?=\d)/, "");

    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return firstDot >= 0 ? `${grouped}.${fracPart}` : grouped;
  }

  function countDigitsLeft(str) {
    return (str.match(/\d/g) || []).length;
  }

  function caretPosForDigits(str, digitsCount) {
    if (digitsCount <= 0) return 0;
    let digits = 0;
    for (let i = 0; i < str.length; i++) {
      if (/\d/.test(str[i])) digits++;
      if (digits >= digitsCount) return i + 1;
    }
    return str.length;
  }

  function attachMoneyFormatter(inputEl) {
    if (!inputEl) return;

    inputEl.addEventListener("input", () => {
      const oldVal = inputEl.value;
      const caret = inputEl.selectionStart ?? oldVal.length;

      const left = oldVal.slice(0, caret);
      const digitsLeft = countDigitsLeft(left);

      const formatted = formatWithSpacesRaw(oldVal);
      inputEl.value = formatted;

      const newPos = caretPosForDigits(formatted, digitsLeft);
      try {
        inputEl.setSelectionRange(newPos, newPos);
      } catch {}

      scheduleAuto();
    });

    inputEl.addEventListener("blur", () => {
      inputEl.value = formatWithSpacesRaw(inputEl.value);
    });
  }

  // ---------- UI builders ----------
  function buildResultUI({ finalUAH, contributedUAH, earnedUAH, earnedPct, freqLabel }) {
    const outCur = baseCur;

    const main =
      `${tt("comp.final") || (isEn() ? "Final amount" : "Підсумкова сума")}: ` +
      `${formatMoney(fromUAH(outCur, finalUAH), outCur)}`;

    const extra = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("comp.kpi_contributed") || (isEn() ? "Contributed" : "Внесли")}</div>
          <div class="m-kpi__v">${formatMoney(fromUAH(outCur, contributedUAH), outCur)}</div>
          <div class="m-kpi__s">${tt("comp.kpi_freq") || (isEn() ? "Frequency" : "Частота")}: ${freqLabel}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("comp.kpi_earned") || (isEn() ? "Earned" : "Заробили")}</div>
          <div class="m-kpi__v">${formatMoney(fromUAH(outCur, earnedUAH), outCur)}</div>
          <div class="m-kpi__s">${tt("comp.kpi_earned_pct") || (isEn() ? "Profit" : "Прибуток")}: ${formatNumber(earnedPct, 2)}%</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("comp.kpi_ratio") || (isEn() ? "Earned vs contributed" : "Внесли vs заробили")}</div>
          <div class="m-kpi__v">${formatNumber(contributedUAH > 0 ? (earnedUAH / contributedUAH) * 100 : 0, 2)}%</div>
          <div class="m-kpi__s">${tt("comp.kpi_ratio_hint") || (isEn() ? "Earned / contributed" : "Заробили / внесли")}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("comp.kpi_final") || (isEn() ? "Final balance" : "Фінальний баланс")}</div>
          <div class="m-kpi__v">${formatMoney(fromUAH(outCur, finalUAH), outCur)}</div>
          <div class="m-kpi__s">${tt("comp.kpi_years") || (isEn() ? "Years" : "По роках")}: ${yearRowsUAH.length}</div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>${tt("comp.summary") || (isEn() ? "Contributed and earned" : "Внесли та заробили")}</b>:
          ${formatMoney(fromUAH(outCur, contributedUAH), outCur)} / ${formatMoney(fromUAH(outCur, earnedUAH), outCur)}
        </div>
        <div class="m-hintSmall">
          ${tt("comp.summary_hint_base") || (isEn()
            ? "All calculations are shown in the selected currency. Rates conversion uses NBU."
            : "Усі розрахунки показуються у вибраній валюті. Конвертація — за курсом НБУ.")}
        </div>
      </div>
    `;
    return { main, extra };
  }

  // ---------- render table ----------
  function renderTableFromCache() {
    if (!scheduleTbody) return;

    const outCur = baseCur;
    updateTableHeadCurrency(outCur);

    scheduleTbody.innerHTML = yearRowsUAH
      .map((r) => {
        const earnedPct = r.contributedUAH > 0 ? (r.earnedUAH / r.contributedUAH) * 100 : 0;
        return `
          <tr>
            <td>${r.year}</td>
            <td>${r.dateText}</td>
            <td>${formatMoney(fromUAH(outCur, r.contributedUAH), outCur)}</td>
            <td>${formatMoney(fromUAH(outCur, r.earnedUAH), outCur)}</td>
            <td>${formatMoney(fromUAH(outCur, r.balanceUAH), outCur)}</td>
            <td>${formatNumber(earnedPct, 2)}%</td>
          </tr>
        `;
      })
      .join("");
  }

  // ---------- chart ----------
  function drawChart() {
    if (!ctx || !canvas) return;

    const outCur = baseCur;
    const points = chartPointsUAH.map((p) => ({
      label: p.label,
      y: fromUAH(outCur, p.yUAH),
    }));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (points.length < 2) {
      ctx.font = "12px Arial";
      ctx.fillStyle = "#1f2f55";
      ctx.fillText(tt("comp.chart_need_data") || (isEn() ? "Calculate to see the chart." : "Зроби розрахунок, щоб побачити графік."), 12, 24);
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
      ctx.fillText(`${formatNumber(v, 0)} ${currencySymbol(outCur)}`, 6, y + 4);
    }

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

    ctx.fillStyle = "#1f2f55";
    points.forEach((p, i) => {
      const x = xAt(i);
      const y = yAt(p.y);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

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
    // base currency for inputs
    const outCur = baseCur;

    // if USD/EUR but rates not loaded -> fallback to UAH
    if ((outCur === "USD" || outCur === "EUR") && !hasRate(outCur)) {
      setToast(isEn() ? "NBU rates not loaded yet. Using UAH." : "Курс НБУ ще не завантажено. Використовую UAH.");
      baseCur = "UAH";
      if (baseCurrencyEl) baseCurrencyEl.value = "UAH";
    }

    const P0_base = parseMoney(principal?.value);
    const topUp_base = Math.max(0, parseMoney(monthlyTopUp?.value));
    const rYearPct = parseMoney(annualRate?.value);
    const Y = Number(years?.value || 0);
    const freq = frequency?.value || "monthly";
    const start = startDate?.value ? new Date(startDate.value) : new Date();

    if (!(P0_base > 0) || !(Y > 0)) {
      if (!silent) setToast(tt("comp.toast_enter_values") || (isEn() ? "Enter initial amount and years." : "Введи початкову суму та період."));
      setResult(tt("comp.result_enter_values") || (isEn() ? "Enter amount, rate and period." : "Введи початкову суму, ставку та період."), "");
      yearRowsUAH = [];
      chartPointsUAH = [];
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap) scheduleWrap.open = false;
      drawChart();
      return;
    }

    // convert inputs to UAH for internal math
    const P0 = toUAH(outCur, P0_base);
    const topUp = toUAH(outCur, topUp_base);

    const totalMonths = Math.round(Y * 12);
    const rYear = rYearPct > 0 ? rYearPct / 100 : 0;

    const periodMonths = freq === "yearly" ? 12 : freq === "quarterly" ? 3 : 1;
    const periodsPerYear = 12 / periodMonths;
    const rPerPeriod = periodsPerYear > 0 ? rYear / periodsPerYear : 0;

    let balance = P0;
    let contributed = P0;

    yearRowsUAH = [];
    chartPointsUAH = [];

    for (let m = 1; m <= totalMonths; m++) {
      // monthly top-up at the beginning of each month (including month 1)
      if (topUp > 0) {
        balance += topUp;
        contributed += topUp;
      }

      // apply interest at compounding boundary
      if (rPerPeriod > 0 && m % periodMonths === 0) {
        const interest = balance * rPerPeriod;
        balance += interest;
      }

      // end of year snapshot
      if (m % 12 === 0) {
        const yearIndex = m / 12;
        const date = addYears(start, yearIndex);
        const earnedNow = balance - contributed;

        yearRowsUAH.push({
          year: yearIndex,
          dateText: formatDate(date),
          contributedUAH: contributed,
          earnedUAH: earnedNow,
          balanceUAH: balance,
        });

        chartPointsUAH.push({
          label: `${yearIndex}`,
          yUAH: balance,
        });
      }
    }

    const finalUAH = balance;
    const contributedUAH = contributed;
    const earnedUAH = finalUAH - contributedUAH;
    const earnedPct = contributedUAH > 0 ? (earnedUAH / contributedUAH) * 100 : 0;

    const freqLabel =
      freq === "yearly"
        ? (tt("comp.freq_yearly") || (isEn() ? "yearly" : "щороку"))
        : freq === "quarterly"
          ? (tt("comp.freq_quarterly") || (isEn() ? "quarterly" : "щокварталу"))
          : (tt("comp.freq_monthly") || (isEn() ? "monthly" : "щомісяця"));

    const ui = buildResultUI({ finalUAH, contributedUAH, earnedUAH, earnedPct, freqLabel });

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

    // base currency default
    baseCur = "UAH";
    if (baseCurrencyEl) baseCurrencyEl.value = "UAH";

    // sync old selectors if they exist
    if (chartCurrency) chartCurrency.value = baseCur;
    if (scheduleCurrency) scheduleCurrency.value = baseCur;

    if (startDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    setToast(tt("comp.toast_reset") || (isEn() ? "Reset." : "Скинуто."));
    setResult(tt("comp.result_enter_values") || (isEn() ? "Enter amount, rate and period." : "Введи початкову суму, ставку та період."), "");
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
    if (!txt || txt.includes(tt("comp.result_enter_values") || "Введи") || txt.toLowerCase().includes("enter")) {
      setToast(tt("comp.toast_need_calc_first") || (isEn() ? "Calculate first." : "Спочатку зроби розрахунок."));
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(tt("comp.copied_result") || (isEn() ? "Copied." : "Скопійовано результат."));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("comp.copy_failed") || (isEn() ? "Copy failed." : "Не вдалося скопіювати."));
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
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      setToast(tt("comp.copied_table") || (isEn() ? "Table copied." : "Скопійовано таблицю."));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("comp.copy_table_failed") || (isEn() ? "Copy failed." : "Не вдалося скопіювати таблицю."));
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
    setToast(tt("comp.csv_downloaded") || (isEn() ? "CSV downloaded." : "CSV завантажено."));
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

  // base currency change (main)
  baseCurrencyEl?.addEventListener("change", () => {
    const next = String(baseCurrencyEl.value || "UAH").toUpperCase();

    if ((next === "USD" || next === "EUR") && !hasRate(next)) {
      setToast(isEn() ? "NBU rates not loaded yet. Using UAH." : "Курс НБУ ще не завантажено. Використовую UAH.");
      baseCurrencyEl.value = "UAH";
      baseCur = "UAH";
      setTimeout(() => setToast(""), 1800);
    } else {
      baseCur = next;
    }

    // sync chart/table selects to base
    if (chartCurrency) chartCurrency.value = baseCur;
    if (scheduleCurrency) scheduleCurrency.value = baseCur;

    renderAllFromCache();
    calc({ silent: true });
  });

  // chart/table currency selectors -> keep synced to base (optional UI)
  chartCurrency?.addEventListener("change", () => {
    // force back to base (so "all calculations shown in selected currency")
    chartCurrency.value = baseCur;
    drawChart();
  });

  scheduleCurrency?.addEventListener("change", () => {
    scheduleCurrency.value = baseCur;
    renderTableFromCache();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    calc({ silent: false });
  });

  // ---------- init ----------
  function init() {
    // default date
    if (startDate && !startDate.value) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    // money input formatting with spaces
    [principal, monthlyTopUp].forEach(attachMoneyFormatter);

    reset();
    loadNbuRates().then((ok) => {
      if (!ok) {
        setToast(isEn() ? "NBU rates unavailable right now." : "Курс НБУ зараз недоступний.");
        setTimeout(() => setToast(""), 1800);
      }
    });
  }

  init();
})();
