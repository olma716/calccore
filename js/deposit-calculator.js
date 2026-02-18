/* =========================================================
   deposit-calculator.js — CalcCore (BASE CURRENCY: UAH/EUR/USD)
   - Base currency selector (UAH/EUR/USD) affects ALL inputs/outputs
   - NBU rates for USD/EUR (UAH per 1 unit)
   - Money inputs auto-format with spaces: 1 000 000
   - Schedule currency: UAH/EUR/USD
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
  const isEn = () =>
    String(document.documentElement.lang || "")
      .toLowerCase()
      .startsWith("en");

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

  // Base currency select (NEW in HTML)
  const calcCurrency = el("calcCurrency");

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
  // Rates: UAH per 1 unit (USD/EUR) — from NBU
  const ratesByCode = {
    UAH: { rate: 1 },
    USD: { rate: null },
    EUR: { rate: null },
  };
  let ratesLoaded = false;
  let ratesDate = "";

  // Base currency for ALL inputs/outputs
  let baseCur = "UAH";

  // Cache schedule values in UAH (so we can render any currency)
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

  function hasRate(code) {
    const c = String(code || "UAH").toUpperCase();
    if (c === "UAH") return true;
    const r = ratesByCode?.[c]?.rate;
    return Number.isFinite(r) && r > 0;
  }

  // CUR -> UAH
  function toUAH(code, amount) {
    const c = String(code || "UAH").toUpperCase();
    if (!Number.isFinite(amount)) return amount;
    if (c === "UAH") return amount;
    const r = ratesByCode?.[c]?.rate;
    if (!Number.isFinite(r) || r <= 0) return amount;
    return amount * r;
  }

  // UAH -> CUR
  function fromUAH(code, amountUAH) {
    const c = String(code || "UAH").toUpperCase();
    if (!Number.isFinite(amountUAH)) return amountUAH;
    if (c === "UAH") return amountUAH;
    const r = ratesByCode?.[c]?.rate;
    if (!Number.isFinite(r) || r <= 0) return amountUAH;
    return amountUAH / r;
  }

  // Format a UAH amount into chosen currency
  function formatMoney(amountUAH, code) {
    const v = fromUAH(code, amountUAH);
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

  // ---------- input auto-format with spaces ----------
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

  // ---------- NBU rates (USD/EUR) ----------
  async function loadNbuRates() {
    try {
      const res = await fetch(
        "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json",
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("NBU fetch failed");
      const data = await res.json();

      const usd = data.find((x) => String(x.cc || "").toUpperCase() === "USD");
      const eur = data.find((x) => String(x.cc || "").toUpperCase() === "EUR");

      ratesByCode.USD.rate = Number.isFinite(Number(usd?.rate)) ? Number(usd.rate) : null;
      ratesByCode.EUR.rate = Number.isFinite(Number(eur?.rate)) ? Number(eur.rate) : null;

      ratesDate = usd?.exchangedate || eur?.exchangedate || "";
      ratesLoaded = Number.isFinite(ratesByCode.USD.rate) && Number.isFinite(ratesByCode.EUR.rate);

      if (nbuBadge) {
        if (ratesLoaded) {
          const datePart = ratesDate ? ` • ${ratesDate}` : "";
          const s =
            tt("deposit.nbu_badge", {
              usd: formatNumber(ratesByCode.USD.rate, 4),
              eur: formatNumber(ratesByCode.EUR.rate, 4),
              datePart,
            }) ||
            `Курс НБУ: USD ${formatNumber(ratesByCode.USD.rate, 4)} / EUR ${formatNumber(
              ratesByCode.EUR.rate,
              4
            )}${datePart}`;

          nbuBadge.textContent = s;
          nbuBadge.title = tt("deposit.nbu_title") || "Курс НБУ (USD/EUR)";
        } else {
          nbuBadge.textContent = tt("deposit.nbu_unavailable") || "Курс НБУ: недоступно";
          nbuBadge.title = tt("deposit.nbu_title") || "Курс НБУ (USD/EUR)";
        }
      }

      // If baseCur requires rate but not available -> fallback to UAH
      if ((baseCur === "USD" || baseCur === "EUR") && !hasRate(baseCur)) {
        baseCur = "UAH";
        if (calcCurrency) calcCurrency.value = "UAH";
        if (scheduleCurrency) scheduleCurrency.value = "UAH";
      }

      renderScheduleFromCache();
    } catch {
      ratesLoaded = false;
      if (nbuBadge) {
        nbuBadge.textContent = tt("deposit.nbu_unavailable") || "Курс НБУ: недоступно";
        nbuBadge.title = tt("deposit.nbu_title") || "Курс НБУ (USD/EUR)";
      }
    }
  }

  // ---------- UI builder (outputs in baseCur) ----------
  function buildResultUI(data) {
    const {
      grossInterestUAH,
      taxAmountUAH,
      netInterestUAH,
      finalBalanceUAH,
      totalTopUpsUAH,
      effTaxRatePct,
      capOn,
      periodLabel,
    } = data;

    const main =
      `${tt("deposit.per_income_net") || (isEn() ? "Income (net)" : "Дохід (нетто)")}` +
      `: ${formatMoney(netInterestUAH, baseCur)}`;

    const extra = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("deposit.kpi_interest_gross") || (isEn() ? "Interest (gross)" : "Відсотки (брутто)")}</div>
          <div class="m-kpi__v">${formatMoney(grossInterestUAH, baseCur)}</div>
          <div class="m-kpi__s">${tt("deposit.kpi_period") || (isEn() ? "Period" : "Періодичність")}: ${periodLabel}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("deposit.kpi_tax") || (isEn() ? "Taxes" : "Податки")}</div>
          <div class="m-kpi__v">${formatMoney(taxAmountUAH, baseCur)}</div>
          <div class="m-kpi__s">${tt("deposit.kpi_tax_rate") || (isEn() ? "Rate" : "Ставка")}: ${formatNumber(effTaxRatePct, 2)}%</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("deposit.kpi_interest_net") || (isEn() ? "Interest (net)" : "Відсотки (нетто)")}</div>
          <div class="m-kpi__v">${formatMoney(netInterestUAH, baseCur)}</div>
          <div class="m-kpi__s">${tt("deposit.kpi_after_tax") || (isEn() ? "After tax" : "Після податків")}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("deposit.kpi_final_balance") || (isEn() ? "Final balance" : "Підсумковий баланс")}</div>
          <div class="m-kpi__v">${formatMoney(finalBalanceUAH, baseCur)}</div>
          <div class="m-kpi__s">${capOn ? (tt("deposit.cap_on") || (isEn() ? "With capitalization" : "З капіталізацією")) : (tt("deposit.cap_off") || (isEn() ? "Without capitalization" : "Без капіталізації"))}</div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>${tt("deposit.summary_topups") || (isEn() ? "Top-ups" : "Поповнення")}</b>: ${formatMoney(totalTopUpsUAH, baseCur)}</div>
        <div class="m-hintSmall">
          ${tt("deposit.summary_hint") || (isEn()
            ? "You can change the schedule currency (NBU rates)."
            : "У графіку можна перемикати валюту — конвертація за курсом НБУ.")}
        </div>
      </div>
    `;
    return { main, extra };
  }

  // ---------- schedule render ----------
  function renderScheduleFromCache() {
    if (!scheduleTbody) return;
    const code = String(scheduleCurrency?.value || baseCur || "UAH").toUpperCase();

    scheduleTbody.innerHTML = scheduleRowsUAH
      .map(
        (r) => `
        <tr>
          <td>${r.i}</td>
          <td>${r.dateText}</td>
          <td>${formatMoney(r.topUpUAH, code)}</td>
          <td>${formatMoney(r.interestUAH, code)}</td>
          <td>${formatMoney(r.taxUAH, code)}</td>
          <td>${formatMoney(r.netUAH, code)}</td>
          <td>${formatMoney(r.balanceUAH, code)}</td>
        </tr>
      `
      )
      .join("");
  }

  // ---------- calc (inputs in baseCur, internal math in UAH, outputs in baseCur) ----------
  function calc({ silent = false } = {}) {
    // read inputs in baseCur, convert to UAH for math
    const P0_base = parseMoney(principal?.value);
    const rYear = parseMoney(annualRate?.value);
    const n = Number(termMonths?.value || 0);
    const topUp_base = parseMoney(monthlyTopUp?.value);

    const capOn = (capitalization?.value || "on") === "on";
    const period = interestPeriod?.value || "monthly";
    const taxR = getEffectiveTaxRate();
    const start = startDate?.value ? new Date(startDate.value) : new Date();

    if (!(P0_base > 0) || !(n > 0)) {
      if (!silent) setToast(tt("deposit.toast_enter_values") || (isEn() ? "Enter amount and term." : "Введи суму та термін."));
      setResult(tt("deposit.result_enter_values") || (isEn() ? "Enter amount, rate and term." : "Введи суму, ставку та термін."), "");
      scheduleRowsUAH = [];
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap) scheduleWrap.open = false;
      return;
    }

    // if baseCur needs NBU and not loaded -> fallback to UAH
    if ((baseCur === "USD" || baseCur === "EUR") && !hasRate(baseCur)) {
      setToast(isEn() ? "NBU rates not loaded yet. Using UAH." : "Курс НБУ ще не завантажено. Використовую UAH.");
      baseCur = "UAH";
      if (calcCurrency) calcCurrency.value = "UAH";
      if (scheduleCurrency) scheduleCurrency.value = "UAH";
      setTimeout(() => setToast(""), 1800);
    }

    const P0 = toUAH(baseCur, P0_base);
    const topUp = toUAH(baseCur, topUp_base);

    // nominal rates
    const rMonth = rYear > 0 ? (rYear / 100) / 12 : 0;
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

      // capitalization: add net
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

    // without cap: principal doesn't grow by interest
    const finalBalance = capOn ? balance : (P0 + totalTopUps);

    const periodLabel =
      period === "daily"
        ? (tt("deposit.period_daily") || (isEn() ? "daily (365)" : "щоденно (365)"))
        : (tt("deposit.period_monthly") || (isEn() ? "monthly" : "щомісячно"));

    const ui = buildResultUI({
      grossInterestUAH: grossInterestTotal,
      taxAmountUAH: taxTotal,
      netInterestUAH: netInterestTotal,
      finalBalanceUAH: finalBalance,
      totalTopUpsUAH: totalTopUps,
      effTaxRatePct: taxR * 100,
      capOn,
      periodLabel,
    });

    setToast("");
    setResult(ui.main, ui.extra);

    // Nice default: schedule currency follows base currency
    if (scheduleCurrency) scheduleCurrency.value = scheduleCurrency.value || baseCur;
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

    baseCur = String(calcCurrency?.value || "UAH").toUpperCase();
    if (scheduleCurrency) scheduleCurrency.value = baseCur;

    if (startDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    updateTaxFieldState();

    setToast(tt("deposit.toast_reset") || (isEn() ? "Reset." : "Скинуто."));
    setResult(tt("deposit.result_enter_values") || (isEn() ? "Enter amount, rate and term." : "Введи суму, ставку та термін."), "");
    scheduleRowsUAH = [];
    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;
    setTimeout(() => setToast(""), 1200);
  }

  // ---------- copy / CSV ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt) {
      setToast(tt("deposit.toast_need_calc_first") || (isEn() ? "Calculate first." : "Спочатку зроби розрахунок."));
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(tt("deposit.copied_result") || (isEn() ? "Result copied." : "Скопійовано результат."));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("deposit.copy_failed") || (isEn() ? "Copy failed." : "Не вдалося скопіювати."));
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
      setToast(tt("deposit.copied_table") || (isEn() ? "Table copied." : "Скопійовано таблицю."));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("deposit.copy_table_failed") || (isEn() ? "Copy failed." : "Не вдалося скопіювати таблицю."));
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
    setToast(tt("deposit.csv_downloaded") || (isEn() ? "CSV downloaded." : "CSV завантажено."));
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
  // money formatters (spaces)
  [principal, monthlyTopUp].forEach(attachMoneyFormatter);

  annualRate?.addEventListener("input", scheduleAuto);
  termMonths?.addEventListener("input", scheduleAuto);
  interestPeriod?.addEventListener("change", scheduleAuto);
  capitalization?.addEventListener("change", scheduleAuto);

  taxMode?.addEventListener("change", () => {
    updateTaxFieldState();
    scheduleAuto();
  });
  taxRate?.addEventListener("input", scheduleAuto);
  startDate?.addEventListener("change", scheduleAuto);

  // base currency change (UAH/EUR/USD)
  calcCurrency?.addEventListener("change", () => {
    const next = String(calcCurrency.value || "UAH").toUpperCase();
    baseCur = next;

    // sync schedule currency to base by default
    if (scheduleCurrency) scheduleCurrency.value = baseCur;

    // if rate not loaded yet for USD/EUR -> fallback UAH
    if ((baseCur === "USD" || baseCur === "EUR") && !hasRate(baseCur)) {
      setToast(isEn() ? "NBU rates not loaded yet. Using UAH." : "Курс НБУ ще не завантажено. Використовую UAH.");
      baseCur = "UAH";
      calcCurrency.value = "UAH";
      if (scheduleCurrency) scheduleCurrency.value = "UAH";
      setTimeout(() => setToast(""), 1800);
    }

    calc({ silent: true });
  });

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  // schedule currency change
  scheduleCurrency?.addEventListener("change", () => {
    const cur = String(scheduleCurrency.value || "UAH").toUpperCase();
    if ((cur === "USD" || cur === "EUR") && !hasRate(cur)) {
      setToast(isEn() ? "NBU rates not loaded yet. Using base currency." : "Курс НБУ ще не завантажено. Показую базову валюту.");
      scheduleCurrency.value = baseCur || "UAH";
      setTimeout(() => setToast(""), 2000);
    }
    renderScheduleFromCache();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    calc({ silent: false });
  });

  // ---------- init ----------
  updateTaxFieldState();

  // default date
  if (startDate && !startDate.value) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    startDate.value = `${yyyy}-${mm}-${dd}`;
  }

  // default base currency
  baseCur = String(calcCurrency?.value || "UAH").toUpperCase();
  if (scheduleCurrency) scheduleCurrency.value = baseCur;

  reset();
  loadNbuRates(); // async
})();
