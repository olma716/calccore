/* =========================================================
   ipoteca-calculator.js — CalcCore (i18n-ready) UPDATED
   ✅ Currency selector near property price (UAH / USD / EUR)
   ✅ All calculations in selected currency
   ✅ Money inputs auto-format with spaces: 1 000 000
   ✅ Hints under oneTimeFee & monthlyCosts (small text like Term)
   ✅ Schedule currency follows selected currency (and can switch if NBU loaded)
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
  const propertyPrice = el("propertyPrice");
  const downPayment = el("downPayment");
  const loanAmount = el("loanAmount"); // readonly auto
  const annualRate = el("annualRate");
  const termYears = el("termYears");
  const paymentType = el("paymentType");
  const startDate = el("startDate");
  const oneTimeFee = el("oneTimeFee");
  const monthlyCosts = el("monthlyCosts");

  // Down payment mode
  const dpModeUAH = el("dpModeUAH");
  const dpModePCT = el("dpModePCT");
  const dpHint = el("dpHint");

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

  // table thead labels
  const thPayment = el("thPayment");
  const thInterest = el("thInterest");
  const thPrincipal = el("thPrincipal");
  const thFees = el("thFees");
  const thBalance = el("thBalance");

  // ---------- state ----------
  let dpMode = "UAH"; // or "PCT"

  // Rates are in UAH per 1 unit
  let rates = {
    loaded: false,
    date: "",
    USD: null, // UAH per 1 USD
    EUR: null, // UAH per 1 EUR
  };

  // Base currency for the whole calculator
  let baseCurrency = "UAH"; // UAH | USD | EUR

  // Cache schedule values in BASE currency
  let scheduleRowsBASE = [];

  // ---------- helpers ----------
  function setToast(msg) {
    if (!toast) return;
    toast.textContent = msg || "";
  }

  function setResult(mainText, extraHtml = "") {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  }

  // parse money from input like "1 000 000.50"
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
    if (code === "USD") return "$";
    if (code === "EUR") return "€";
    return "₴";
  }

  function formatMoney(n, code = baseCurrency) {
    if (!Number.isFinite(n)) return "—";
    return `${formatNumber(n, 2)} ${currencySymbol(code)}`;
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

  function annuityPayment(P, rMonth, n) {
    if (n <= 0) return 0;
    if (rMonth <= 0) return P / n;
    const p = Math.pow(1 + rMonth, n);
    const k = (rMonth * p) / (p - 1);
    return P * k;
  }

  // ---------- currency conversion (for schedule view ONLY) ----------
  // all calculations are in baseCurrency, but schedule dropdown can show other currency if rates loaded
  function rateUAH(code) {
    if (code === "UAH") return 1;
    if (!rates.loaded) return null;
    const v = rates[code];
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  function convert(amount, fromCode, toCode) {
    if (!Number.isFinite(amount)) return amount;
    if (fromCode === toCode) return amount;

    const rFrom = rateUAH(fromCode);
    const rTo = rateUAH(toCode);
    if (!rFrom || !rTo) return amount; // fallback if no rates

    // amount(from) -> UAH -> to
    const uah = amount * rFrom;
    return uah / rTo;
  }

  function setTheadCurrency(code) {
    const s = currencySymbol(code);
    if (thPayment) thPayment.textContent = tt("ipoteca.th_payment", { sym: s });
    if (thInterest) thInterest.textContent = tt("ipoteca.th_interest", { sym: s });
    if (thPrincipal) thPrincipal.textContent = tt("ipoteca.th_principal", { sym: s });
    if (thFees) thFees.textContent = tt("ipoteca.th_costs", { sym: s });
    if (thBalance) thBalance.textContent = tt("ipoteca.th_balance", { sym: s });
  }

  // ---------- money input formatter (spaces) ----------
  function formatWithSpaces(raw) {
    const s0 = String(raw ?? "");
    const clean = s0.replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    if (!clean) return "";

    const parts = clean.split(".");
    const intPart = parts[0] || "";
    const decPart = parts.slice(1).join("").slice(0, 2); // max 2 digits

    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return decPart.length ? `${grouped}.${decPart}` : grouped;
  }

  function bindMoneyFormat(inputEl) {
    if (!inputEl) return;
    inputEl.addEventListener("input", () => {
      const before = inputEl.value;
      const after = formatWithSpaces(before);

      if (after === before) return;
      inputEl.value = after;

      // simple caret behavior (end)
      try {
        inputEl.setSelectionRange(after.length, after.length);
      } catch {}
    });

    // normalize on blur too
    inputEl.addEventListener("blur", () => {
      inputEl.value = formatWithSpaces(inputEl.value);
    });
  }

  // ---------- Inject currency selector near property price ----------
  function ensureCurrencySelector() {
    // If user already added select in HTML:
    let curSel = el("propertyCurrency");

    if (!propertyPrice) return null;

    // Create wrapper with input + select side-by-side
    const field = propertyPrice.closest(".mcalc__field");
    if (!field) return curSel;

    // If select doesn't exist, create it
    if (!curSel) {
      curSel = document.createElement("select");
      curSel.id = "propertyCurrency";
      curSel.className = "mcalc__select mcalc__select--mini";
      curSel.innerHTML = `
        <option value="UAH">UAH ₴</option>
        <option value="USD">USD $</option>
        <option value="EUR">EUR €</option>
      `;
    }

    // Create row container if not present
    let row = field.querySelector(".m-row-money");
    if (!row) {
      row = document.createElement("div");
      row.className = "m-row-money";
      row.style.display = "flex";
      row.style.gap = "10px";
      row.style.alignItems = "center";

      // Move input into row
      propertyPrice.insertAdjacentElement("beforebegin", row);
      row.appendChild(propertyPrice);
      propertyPrice.style.flex = "1 1 auto";
    }

    // Add select into row
    if (!row.contains(curSel)) {
      row.appendChild(curSel);
      curSel.style.flex = "0 0 120px";
      curSel.style.height = "44px";
    }

    return curSel;
  }

  // ---------- Add hints under fee/cost fields ----------
  function ensureHintAfterInput(inputEl, text) {
    if (!inputEl) return;
    const field = inputEl.closest(".mcalc__field");
    if (!field) return;

    // if already has hint after this input, do nothing
    const next = inputEl.nextElementSibling;
    if (next && next.classList.contains("mcalc__hint")) return;

    const hint = document.createElement("div");
    hint.className = "mcalc__hint";
    hint.textContent = text;
    inputEl.insertAdjacentElement("afterend", hint);
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
          nbuBadge.textContent = tt("ipoteca.nbu_badge", {
            usd: formatNumber(rates.USD, 4),
            eur: formatNumber(rates.EUR, 4),
            datePart,
          });
          nbuBadge.title = tt("ipoteca.nbu_title");
        } else {
          nbuBadge.textContent = tt("ipoteca.nbu_unavailable");
          nbuBadge.title = tt("ipoteca.nbu_title");
        }
      }

      // enable cross-currency schedule if loaded
      if (scheduleCurrency) {
        syncScheduleCurrencyOptions();
        setTheadCurrency(scheduleCurrency.value);
        renderScheduleFromCache();
      }
    } catch {
      rates.loaded = false;
      if (nbuBadge) {
        nbuBadge.textContent = tt("ipoteca.nbu_unavailable");
        nbuBadge.title = tt("ipoteca.nbu_title");
      }
      if (scheduleCurrency) {
        syncScheduleCurrencyOptions();
        setTheadCurrency(scheduleCurrency.value);
        renderScheduleFromCache();
      }
    }
  }

  // ---------- Down payment mode logic ----------
  function setDpMode(mode) {
    dpMode = mode === "PCT" ? "PCT" : "UAH";
    dpModeUAH?.classList.toggle("is-active", dpMode === "UAH");
    dpModePCT?.classList.toggle("is-active", dpMode === "PCT");

    if (dpHint) {
      dpHint.textContent =
        dpMode === "UAH"
          ? tt("ipoteca.dp_hint_uah")
          : tt("ipoteca.dp_hint_pct");
    }

    syncLoanFromInputs({ keepUserField: true });
    scheduleAuto();
  }

  function syncLoanFromInputs({ keepUserField } = { keepUserField: true }) {
    const price = parseMoney(propertyPrice?.value);
    let dp = parseMoney(downPayment?.value);

    if (!(price > 0)) {
      if (loanAmount) loanAmount.value = "";
      return;
    }

    if (dpMode === "PCT") {
      const pct = Math.max(0, Math.min(100, dp));
      if (!keepUserField && downPayment) downPayment.value = String(pct);
      const dpVAL = price * (pct / 100);
      const loan = Math.max(0, price - dpVAL);
      if (loanAmount) loanAmount.value = formatWithSpaces(formatNumber(loan, 2));
    } else {
      dp = Math.max(0, dp);
      const dpVAL = Math.min(dp, price);
      if (!keepUserField && downPayment) downPayment.value = formatWithSpaces(dpVAL);
      const loan = Math.max(0, price - dpVAL);
      if (loanAmount) loanAmount.value = formatWithSpaces(formatNumber(loan, 2));
    }
  }

  function getLoanPrincipal() {
    const price = parseMoney(propertyPrice?.value);
    const dpRaw = parseMoney(downPayment?.value);
    if (!(price > 0)) return 0;

    let dpVAL = 0;
    if (dpMode === "PCT") {
      const pct = Math.max(0, Math.min(100, dpRaw));
      dpVAL = price * (pct / 100);
    } else {
      dpVAL = Math.min(Math.max(0, dpRaw), price);
    }
    return Math.max(0, price - dpVAL);
  }

  // ---------- Schedule render ----------
  function renderScheduleFromCache() {
    if (!scheduleTbody) return;

    const viewCode = scheduleCurrency?.value || baseCurrency;
    setTheadCurrency(viewCode);

    scheduleTbody.innerHTML = scheduleRowsBASE
      .map((r) => {
        const pay = convert(r.payment, baseCurrency, viewCode);
        const intr = convert(r.interest, baseCurrency, viewCode);
        const princ = convert(r.principal, baseCurrency, viewCode);
        const costs = convert(r.costs, baseCurrency, viewCode);
        const bal = convert(r.balance, baseCurrency, viewCode);

        return `
          <tr>
            <td>${r.i}</td>
            <td>${r.dateText}</td>
            <td>${formatMoney(pay, viewCode)}</td>
            <td>${formatMoney(intr, viewCode)}</td>
            <td>${formatMoney(princ, viewCode)}</td>
            <td>${formatMoney(costs, viewCode)}</td>
            <td>${formatMoney(bal, viewCode)}</td>
          </tr>
        `;
      })
      .join("");
  }

  // ---------- Result UI ----------
  function buildResultUI(data) {
    const {
      monthlyPayment,
      monthlyPaymentWithCosts,
      totalPaid,
      overpay,
      totalCosts,
      typeLabel,
      avgPayment,
      avgPaymentWithCosts,
    } = data;

    const main = tt("ipoteca.per_month", { value: formatMoney(monthlyPayment, baseCurrency) });

    const extra = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("ipoteca.kpi_payment_no_fees")}</div>
          <div class="m-kpi__v">${formatMoney(monthlyPayment, baseCurrency)}</div>
          <div class="m-kpi__s">${tt("ipoteca.kpi_calc_type", { type: typeLabel })}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("ipoteca.kpi_payment_with_costs")}</div>
          <div class="m-kpi__v">${formatMoney(monthlyPaymentWithCosts, baseCurrency)}</div>
          <div class="m-kpi__s">${tt("ipoteca.kpi_with_costs_note")}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("ipoteca.kpi_overpay_interest")}</div>
          <div class="m-kpi__v">${formatMoney(overpay, baseCurrency)}</div>
          <div class="m-kpi__s">${tt("ipoteca.kpi_interest_note")}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("ipoteca.kpi_total_paid")}</div>
          <div class="m-kpi__v">${formatMoney(totalPaid, baseCurrency)}</div>
          <div class="m-kpi__s">${tt("ipoteca.kpi_total_note")}</div>
        </div>
      </div>

      <div class="m-summary">
        <div>${tt("ipoteca.summary_costs", { value: formatMoney(totalCosts, baseCurrency) })}</div>
        <div class="m-hintSmall">
          ${tt("ipoteca.hint_avg", {
            avg: formatMoney(avgPayment, baseCurrency),
            avg2: formatMoney(avgPaymentWithCosts, baseCurrency),
          })}
        </div>
      </div>
    `;

    return { main, extra };
  }

  // ---------- calc ----------
  function calc({ silent = false } = {}) {
    const P0 = getLoanPrincipal();
    const rateYear = parseMoney(annualRate?.value);
    const years = Number(termYears?.value || 0);
    const n = Math.round(years * 12);

    const feeOne = parseMoney(oneTimeFee?.value);
    const costsMonth = parseMoney(monthlyCosts?.value);

    if (!(P0 > 0) || !(n > 0)) {
      if (!silent) setToast(tt("ipoteca.toast_enter_values"));
      setResult(tt("ipoteca.result_enter_values"), "");
      scheduleRowsBASE = [];
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap) scheduleWrap.open = false;
      return;
    }

    const rMonth = rateYear > 0 ? rateYear / 100 / 12 : 0;
    const type = paymentType?.value || "annuity";
    const typeLabel = type === "annuity" ? tt("ipoteca.type_annuity") : tt("ipoteca.type_diff");
    const start = startDate?.value ? new Date(startDate.value) : new Date();

    let balance = P0;
    let totalInterest = 0;
    let totalPrincipal = 0;
    let totalCosts = feeOne;

    scheduleRowsBASE = [];
    let monthlyPayment = 0;

    if (type === "annuity") {
      monthlyPayment = annuityPayment(P0, rMonth, n);

      for (let i = 1; i <= n; i++) {
        const interest = balance * rMonth;
        let principal = monthlyPayment - interest;

        if (i === n) {
          principal = balance;
          monthlyPayment = principal + interest;
        }

        balance = Math.max(0, balance - principal);

        totalInterest += interest;
        totalPrincipal += principal;
        totalCosts += costsMonth;

        const date = addMonths(start, i);

        scheduleRowsBASE.push({
          i,
          dateText: formatDate(date),
          payment: monthlyPayment + costsMonth,
          interest,
          principal,
          costs: costsMonth,
          balance,
        });
      }
    } else {
      const principalFixed = P0 / n;

      for (let i = 1; i <= n; i++) {
        const interest = balance * rMonth;
        let principal = principalFixed;
        if (i === n) principal = balance;

        const basePayment = principal + interest;
        balance = Math.max(0, balance - principal);

        totalInterest += interest;
        totalPrincipal += principal;
        totalCosts += costsMonth;

        const date = addMonths(start, i);

        scheduleRowsBASE.push({
          i,
          dateText: formatDate(date),
          payment: basePayment + costsMonth,
          interest,
          principal,
          costs: costsMonth,
          balance,
        });
      }

      monthlyPayment = scheduleRowsBASE.length ? scheduleRowsBASE[0].payment - scheduleRowsBASE[0].costs : 0;
    }

    const totalPaid = totalPrincipal + totalInterest + totalCosts;
    const overpay = totalInterest;

    const avgPayment = (totalPrincipal + totalInterest) / n;
    const avgPaymentWithCosts = (totalPrincipal + totalInterest + costsMonth * n) / n;

    const monthlyPaymentWithCosts =
      type === "annuity"
        ? monthlyPayment + costsMonth
        : scheduleRowsBASE.length
        ? scheduleRowsBASE[0].payment
        : 0;

    const ui = buildResultUI({
      monthlyPayment,
      monthlyPaymentWithCosts,
      totalPaid,
      overpay,
      totalCosts,
      typeLabel,
      avgPayment,
      avgPaymentWithCosts,
    });

    setToast("");
    setResult(ui.main, ui.extra);

    renderScheduleFromCache();
    if (scheduleWrap) scheduleWrap.open = false;
  }

  // ---------- reset ----------
  function reset() {
    if (propertyPrice) propertyPrice.value = "";
    if (downPayment) downPayment.value = "";
    if (annualRate) annualRate.value = "";
    if (termYears) termYears.value = "";
    if (paymentType) paymentType.value = "annuity";
    if (oneTimeFee) oneTimeFee.value = "";
    if (monthlyCosts) monthlyCosts.value = "";
    if (loanAmount) loanAmount.value = "";

    if (startDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    setDpMode("UAH");
    setToast(tt("ipoteca.toast_reset"));
    setResult(tt("ipoteca.result_enter_values"), "");
    scheduleRowsBASE = [];
    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;
    setTimeout(() => setToast(""), 1200);
  }

  // ---------- copy / CSV ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt || txt.includes(tt("ipoteca.result_enter_values"))) {
      setToast(tt("ipoteca.toast_need_calc_first"));
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(tt("ipoteca.copied_result"));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("ipoteca.copy_failed") || "Copy failed");
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
      setToast(tt("ipoteca.copied_table"));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("ipoteca.copy_table_failed") || "Failed to copy table");
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
    a.download = "ipoteca-schedule.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setToast(tt("ipoteca.csv_downloaded"));
    setTimeout(() => setToast(""), 1500);
  }

  // ---------- Auto-calc debounce ----------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  function onInputsChanged() {
    syncLoanFromInputs({ keepUserField: true });
    scheduleAuto();
  }

  // ---------- schedule currency behavior ----------
  function syncScheduleCurrencyOptions() {
    if (!scheduleCurrency) return;

    // Always keep UAH/USD/EUR options present, but:
    // - If rates not loaded, lock schedule currency to baseCurrency
    if (!rates.loaded) {
      scheduleCurrency.value = baseCurrency;
      // prevent user switching away (soft lock)
      Array.from(scheduleCurrency.options).forEach((opt) => {
        opt.disabled = opt.value !== baseCurrency;
      });
    } else {
      Array.from(scheduleCurrency.options).forEach((opt) => (opt.disabled = false));
      if (!scheduleCurrency.value) scheduleCurrency.value = baseCurrency;
    }
  }

  // ---------- base currency selector ----------
  function setBaseCurrency(code) {
    baseCurrency = code === "USD" || code === "EUR" ? code : "UAH";

    // Keep schedule currency aligned by default
    if (scheduleCurrency) {
      scheduleCurrency.value = baseCurrency;
      syncScheduleCurrencyOptions();
      setTheadCurrency(scheduleCurrency.value);
    }

    // Update loan preview + recalculation
    syncLoanFromInputs({ keepUserField: true });
    scheduleAuto();
  }

  // ---------- events ----------
  propertyPrice?.addEventListener("input", onInputsChanged);
  downPayment?.addEventListener("input", onInputsChanged);
  annualRate?.addEventListener("input", scheduleAuto);
  termYears?.addEventListener("input", scheduleAuto);
  paymentType?.addEventListener("change", scheduleAuto);
  startDate?.addEventListener("change", scheduleAuto);
  oneTimeFee?.addEventListener("input", scheduleAuto);
  monthlyCosts?.addEventListener("input", scheduleAuto);

  dpModeUAH?.addEventListener("click", () => setDpMode("UAH"));
  dpModePCT?.addEventListener("click", () => setDpMode("PCT"));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  scheduleCurrency?.addEventListener("change", () => {
    if (!rates.loaded && scheduleCurrency.value !== baseCurrency) {
      setToast(tt("ipoteca.toast_nbu_not_loaded_fallback"));
      scheduleCurrency.value = baseCurrency;
      setTimeout(() => setToast(""), 2000);
    }
    setTheadCurrency(scheduleCurrency.value);
    renderScheduleFromCache();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    calc({ silent: false });
  });

  // ---------- init ----------
  // Create currency selector near property price
  const curSel = ensureCurrencySelector();
  if (curSel) {
    // default: UAH
    curSel.value = "UAH";
    curSel.addEventListener("change", () => setBaseCurrency(curSel.value));
  }

  // Add small hints under optional fees
  ensureHintAfterInput(
    oneTimeFee,
    tt("ipoteca.one_time_fee_hint") ||
      "Опційно: разова комісія банку/нотаріуса/оцінки. Додається до загальної суми витрат."
  );
  ensureHintAfterInput(
    monthlyCosts,
    tt("ipoteca.monthly_costs_hint") ||
      "Опційно: щомісячні витрати (страхування/обслуговування). Додаються до кожного платежу."
  );

  // Money formatting (spaces)
  bindMoneyFormat(propertyPrice);
  bindMoneyFormat(downPayment);
  bindMoneyFormat(oneTimeFee);
  bindMoneyFormat(monthlyCosts);

  // Loan amount is readonly but keep it pretty too (no listener needed)
  // schedule currency inits
  setTheadCurrency(baseCurrency);
  syncScheduleCurrencyOptions();

  loadNbuRates(); // async (only for schedule-view conversions)
  reset();
})();
