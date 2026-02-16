/* =========================================================
   deposit-calculator.js — CalcCore (i18n-ready)
   - Principal, annual rate, term months
   - Interest accrual: monthly / daily(365)
   - Capitalization: on/off
   - Monthly top-up optional (added at start of each month starting from 2nd)
   - Taxes: standard (19.5%), none, custom
   - Schedule currency: UAH / USD / EUR (NBU)
   - UI: big result + KPI blocks + toast + CSV/copy
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
  const annualRate = el("annualRate");
  const termMonths = el("termMonths");
  const interestPeriod = el("interestPeriod"); // monthly / daily
  const capitalization = el("capitalization"); // on / off
  const monthlyTopUp = el("monthlyTopUp");
  const taxMode = el("taxMode"); // standard / none / custom
  const taxRate = el("taxRate");
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

  // NBU badge + schedule currency
  const nbuBadge = el("nbuBadge");
  const scheduleCurrency = el("scheduleCurrency");

  // Schedule
  const scheduleWrap = el("scheduleWrap");
  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");
  const btnDownloadCSV = el("btnDownloadCSV");

  // ---------- state ----------
  let rates = {
    loaded: false,
    date: "",
    USD: null, // UAH per 1 USD
    EUR: null, // UAH per 1 EUR
  };

  // cache schedule values in UAH so we can re-render in selected currency
  let scheduleRowsUAH = [];

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

  function getEffectiveTaxRate() {
    const mode = taxMode?.value || "standard";
    if (mode === "none") return 0;

    if (mode === "custom") {
      const r = parseMoney(taxRate?.value);
      return Math.max(0, r) / 100;
    }

    // standard: 19.5%
    return 0.195;
  }

  function updateTaxFieldState() {
    const mode = taxMode?.value || "standard";
    if (!taxRate) return;

    if (mode === "custom") {
      taxRate.disabled = false;
      if (!taxRate.value) taxRate.value = "19.5";
    } else {
      taxRate.disabled = true;
      taxRate.value = mode === "none" ? "0" : "19.5";
    }
  }

  // ---------- NBU rates (USD/EUR) ----------
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
          nbuBadge.textContent = tt("deposit.nbu_badge", {
            usd: formatNumber(rates.USD, 4),
            eur: formatNumber(rates.EUR, 4),
            datePart,
          }) || `Курс НБУ: USD ${formatNumber(rates.USD, 4)} / EUR ${formatNumber(rates.EUR, 4)}${datePart}`;
          nbuBadge.title = tt("deposit.nbu_title") || "Курс НБУ (USD/EUR)";
        } else {
          nbuBadge.textContent = tt("deposit.nbu_unavailable") || "Курс НБУ: недоступно";
          nbuBadge.title = tt("deposit.nbu_title") || "Курс НБУ (USD/EUR)";
        }
      }

      renderScheduleFromCache();
    } catch {
      rates.loaded = false;
      if (nbuBadge) {
        nbuBadge.textContent = tt("deposit.nbu_unavailable") || "Курс НБУ: недоступно";
        nbuBadge.title = tt("deposit.nbu_title") || "Курс НБУ (USD/EUR)";
      }
    }
  }

  // ---------- UI builder ----------
  function buildResultUI(data) {
    const {
      grossInterest,
      taxAmount,
      netInterest,
      finalBalance,
      totalTopUps,
      effTaxRatePct,
      capOn,
      periodLabel,
    } = data;

    const main = `${tt("deposit.per_income_net") || "Дохід (нетто)"}: ${formatMoneyUAH(netInterest)}`;

    const extra = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("deposit.kpi_interest_gross") || "Відсотки (брутто)"}</div>
          <div class="m-kpi__v">${formatMoneyUAH(grossInterest)}</div>
          <div class="m-kpi__s">${tt("deposit.kpi_period") || "Періодичність"}: ${periodLabel}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("deposit.kpi_tax") || "Податки"}</div>
          <div class="m-kpi__v">${formatMoneyUAH(taxAmount)}</div>
          <div class="m-kpi__s">${tt("deposit.kpi_tax_rate") || "Ставка"}: ${formatNumber(effTaxRatePct, 2)}%</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("deposit.kpi_interest_net") || "Відсотки (нетто)"}</div>
          <div class="m-kpi__v">${formatMoneyUAH(netInterest)}</div>
          <div class="m-kpi__s">${tt("deposit.kpi_after_tax") || "Після податків"}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("deposit.kpi_final_balance") || "Підсумковий баланс"}</div>
          <div class="m-kpi__v">${formatMoneyUAH(finalBalance)}</div>
          <div class="m-kpi__s">${capOn ? (tt("deposit.cap_on") || "З капіталізацією") : (tt("deposit.cap_off") || "Без капіталізації")}</div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>${tt("deposit.summary_topups") || "Поповнення"}</b>: ${formatMoneyUAH(totalTopUps)}</div>
        <div class="m-hintSmall">
          ${tt("deposit.summary_hint") || "У графіку: баланс відображається в ₴ та може бути конвертований у USD/EUR за курсом НБУ."}
        </div>
      </div>
    `;
    return { main, extra };
  }

  // ---------- schedule render ----------
  function renderScheduleFromCache() {
    if (!scheduleTbody) return;
    const code = scheduleCurrency?.value || "UAH";

    scheduleTbody.innerHTML = scheduleRowsUAH
      .map(
        (r) => `
        <tr>
          <td>${r.i}</td>
          <td>${r.dateText}</td>
          <td>${formatMoneyByCurrency(r.topUpUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.interestUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.taxUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.netUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.balanceUAH, code)}</td>
        </tr>
      `
      )
      .join("");
  }

  // ---------- calc ----------
  function calc({ silent = false } = {}) {
    const P0 = parseMoney(principal?.value);
    const rYear = parseMoney(annualRate?.value);
    const n = Number(termMonths?.value || 0);
    const topUp = parseMoney(monthlyTopUp?.value);
    const capOn = (capitalization?.value || "on") === "on";
    const period = interestPeriod?.value || "monthly";
    const taxR = getEffectiveTaxRate();
    const start = startDate?.value ? new Date(startDate.value) : new Date();

    if (!(P0 > 0) || !(n > 0)) {
      if (!silent) setToast(tt("deposit.toast_enter_values") || "Введи суму та термін.");
      setResult(tt("deposit.result_enter_values") || "Введи суму, ставку та термін.", "");
      scheduleRowsUAH = [];
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap) scheduleWrap.open = false;
      return;
    }

    // monthly nominal rate:
    const rMonth = rYear > 0 ? (rYear / 100) / 12 : 0;
    // daily nominal rate (simple 365):
    const rDay = rYear > 0 ? (rYear / 100) / 365 : 0;

    let balance = P0;
    let grossInterestTotal = 0;
    let taxTotal = 0;
    let netInterestTotal = 0;
    let totalTopUps = 0;

    scheduleRowsUAH = [];

    for (let i = 1; i <= n; i++) {
      // Top-up: from 2nd month at "start of month"
      const thisTopUp = i >= 2 ? Math.max(0, topUp) : 0;
      if (thisTopUp > 0) {
        balance += thisTopUp;
        totalTopUps += thisTopUp;
      }

      // interest for the month
      let interest = 0;
      if (period === "daily") {
        const d0 = addMonths(start, i - 1);
        const d1 = addMonths(start, i);
        const days = Math.max(1, Math.round((d1 - d0) / (1000 * 60 * 60 * 24)));
        interest = balance * rDay * days;
      } else {
        interest = balance * rMonth;
      }

      const tax = interest * taxR;
      const net = interest - tax;

      grossInterestTotal += interest;
      taxTotal += tax;
      netInterestTotal += net;

      // capitalization: add net (simple model)
      if (capOn) balance += net;

      const date = addMonths(start, i);
      scheduleRowsUAH.push({
        i,
        dateText: formatDate(date),
        topUpUAH: thisTopUp,
        interestUAH: interest,
        taxUAH: tax,
        netUAH: net,
        balanceUAH: balance,
      });
    }

    const finalBalance = capOn ? balance : P0 + totalTopUps; // without cap, principal doesn't grow by interest
    const periodLabel = period === "daily" ? (tt("deposit.period_daily") || "щоденно (365)") : (tt("deposit.period_monthly") || "щомісячно");

    const ui = buildResultUI({
      grossInterest: grossInterestTotal,
      taxAmount: taxTotal,
      netInterest: netInterestTotal,
      finalBalance,
      totalTopUps,
      effTaxRatePct: taxR * 100,
      capOn,
      periodLabel,
    });

    setToast("");
    setResult(ui.main, ui.extra);

    renderScheduleFromCache();
    if (scheduleWrap) scheduleWrap.open = false;
  }

  // ---------- reset ----------
  function reset() {
    if (principal) principal.value = "";
    if (annualRate) annualRate.value = "";
    if (termMonths) termMonths.value = "";
    if (interestPeriod) interestPeriod.value = "monthly";
    if (capitalization) capitalization.value = "on";
    if (monthlyTopUp) monthlyTopUp.value = "";
    if (taxMode) taxMode.value = "standard";
    if (taxRate) taxRate.value = "19.5";

    if (scheduleCurrency) scheduleCurrency.value = "UAH";

    if (startDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    updateTaxFieldState();

    setToast(tt("deposit.toast_reset") || "Скинуто.");
    setResult(tt("deposit.result_enter_values") || "Введи суму, ставку та термін.", "");
    scheduleRowsUAH = [];
    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;
    setTimeout(() => setToast(""), 1200);
  }

  // ---------- copy / CSV ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt || txt.includes(tt("deposit.result_enter_values") || "Введи")) {
      setToast(tt("deposit.toast_need_calc_first") || "Спочатку зроби розрахунок.");
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(tt("deposit.copied_result") || "Скопійовано результат.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("deposit.copy_failed") || "Не вдалося скопіювати.");
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
      setToast(tt("deposit.copied_table") || "Скопійовано таблицю.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("deposit.copy_table_failed") || "Не вдалося скопіювати таблицю.");
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
    a.download = "deposit-schedule.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setToast(tt("deposit.csv_downloaded") || "CSV завантажено.");
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
  annualRate?.addEventListener("input", scheduleAuto);
  termMonths?.addEventListener("input", scheduleAuto);
  interestPeriod?.addEventListener("change", scheduleAuto);
  capitalization?.addEventListener("change", scheduleAuto);
  monthlyTopUp?.addEventListener("input", scheduleAuto);

  taxMode?.addEventListener("change", () => {
    updateTaxFieldState();
    scheduleAuto();
  });

  taxRate?.addEventListener("input", scheduleAuto);
  startDate?.addEventListener("change", scheduleAuto);

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  scheduleCurrency?.addEventListener("change", () => {
    if ((scheduleCurrency.value === "USD" || scheduleCurrency.value === "EUR") && !rates.loaded) {
      setToast(tt("deposit.toast_nbu_not_loaded_fallback") || "Курс НБУ не завантажився — показую UAH.");
      scheduleCurrency.value = "UAH";
      setTimeout(() => setToast(""), 2000);
    }
    renderScheduleFromCache();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    calc({ silent: false });
  });

  // ---------- init ----------
  reset();
  loadNbuRates(); // async
})();
