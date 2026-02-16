/* =========================================================
   ipoteca-calculator.js — CalcCore (i18n-ready)
   - Down payment mode: UAH / %
   - Loan = Price - DownPayment
   - Payment types: annuity / differentiated
   - Optional: one-time fee + monthly costs
   - Schedule currency: UAH / USD / EUR (NBU)
   - UI: big result + KPI blocks + toast + CSV/copy
   - i18n: uses window.t(key, vars) from /js/i18n.js
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

  // table thead labels (optional ids)
  const thPayment = el("thPayment");
  const thInterest = el("thInterest");
  const thPrincipal = el("thPrincipal");
  const thFees = el("thFees");
  const thBalance = el("thBalance");

  // ---------- state ----------
  let dpMode = "UAH"; // or "PCT"
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

  function annuityPayment(P, rMonth, n) {
    if (n <= 0) return 0;
    if (rMonth <= 0) return P / n;
    const p = Math.pow(1 + rMonth, n);
    const k = (rMonth * p) / (p - 1);
    return P * k;
  }

  function currencySymbol(code) {
    if (code === "USD") return "$";
    if (code === "EUR") return "€";
    return "₴";
  }

  function convertFromUAH(amountUAH, code) {
    if (!Number.isFinite(amountUAH)) return amountUAH;
    if (code === "UAH") return amountUAH;

    if (!rates.loaded) return amountUAH; // fallback
    const r = rates[code];
    if (!Number.isFinite(r) || r <= 0) return amountUAH;
    return amountUAH / r;
  }

  function formatMoneyByCurrency(amountUAH, code) {
    const v = convertFromUAH(amountUAH, code);
    if (!Number.isFinite(v)) return "—";
    return `${formatNumber(v, 2)} ${currencySymbol(code)}`;
  }

  function setTheadCurrency(code) {
    const s = currencySymbol(code);
    if (thPayment) thPayment.textContent = tt("ipoteca.th_payment", { sym: s });
    if (thInterest) thInterest.textContent = tt("ipoteca.th_interest", { sym: s });
    if (thPrincipal) thPrincipal.textContent = tt("ipoteca.th_principal", { sym: s });
    if (thFees) thFees.textContent = tt("ipoteca.th_costs", { sym: s });
    if (thBalance) thBalance.textContent = tt("ipoteca.th_balance", { sym: s });
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

      if (scheduleCurrency) {
        setTheadCurrency(scheduleCurrency.value);
        renderScheduleFromCache();
      }
    } catch {
      rates.loaded = false;
      if (nbuBadge) {
        nbuBadge.textContent = tt("ipoteca.nbu_unavailable");
        nbuBadge.title = tt("ipoteca.nbu_title");
      }
    }
  }

  // ---------- Down payment mode logic ----------
  function setDpMode(mode) {
    dpMode = mode === "PCT" ? "PCT" : "UAH";
    dpModeUAH?.classList.toggle("is-active", dpMode === "UAH");
    dpModePCT?.classList.toggle("is-active", dpMode === "PCT");

    if (dpHint) dpHint.textContent = dpMode === "UAH" ? tt("ipoteca.dp_hint_uah") : tt("ipoteca.dp_hint_pct");

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
      const dpUAH = price * (pct / 100);
      if (loanAmount) loanAmount.value = formatNumber(Math.max(0, price - dpUAH), 2);
    } else {
      dp = Math.max(0, dp);
      const dpUAH = Math.min(dp, price);
      if (!keepUserField && downPayment) downPayment.value = String(dpUAH);
      if (loanAmount) loanAmount.value = formatNumber(Math.max(0, price - dpUAH), 2);
    }
  }

  function getLoanPrincipalUAH() {
    const price = parseMoney(propertyPrice?.value);
    const dpRaw = parseMoney(downPayment?.value);
    if (!(price > 0)) return 0;

    let dpUAH = 0;
    if (dpMode === "PCT") {
      const pct = Math.max(0, Math.min(100, dpRaw));
      dpUAH = price * (pct / 100);
    } else {
      dpUAH = Math.min(Math.max(0, dpRaw), price);
    }
    return Math.max(0, price - dpUAH);
  }

  // ---------- UI builder ----------
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

    const main = tt("ipoteca.per_month", { value: formatMoneyUAH(monthlyPayment) });

    const extra = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("ipoteca.kpi_payment_no_fees")}</div>
          <div class="m-kpi__v">${formatMoneyUAH(monthlyPayment)}</div>
          <div class="m-kpi__s">${tt("ipoteca.kpi_calc_type", { type: typeLabel })}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("ipoteca.kpi_payment_with_costs")}</div>
          <div class="m-kpi__v">${formatMoneyUAH(monthlyPaymentWithCosts)}</div>
          <div class="m-kpi__s">${tt("ipoteca.kpi_with_costs_note")}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("ipoteca.kpi_overpay_interest")}</div>
          <div class="m-kpi__v">${formatMoneyUAH(overpay)}</div>
          <div class="m-kpi__s">${tt("ipoteca.kpi_interest_note")}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("ipoteca.kpi_total_paid")}</div>
          <div class="m-kpi__v">${formatMoneyUAH(totalPaid)}</div>
          <div class="m-kpi__s">${tt("ipoteca.kpi_total_note")}</div>
        </div>
      </div>

      <div class="m-summary">
        <div>${tt("ipoteca.summary_costs", { value: formatMoneyUAH(totalCosts) })}</div>
        <div class="m-hintSmall">
          ${tt("ipoteca.hint_avg", {
            avg: formatMoneyUAH(avgPayment),
            avg2: formatMoneyUAH(avgPaymentWithCosts),
          })}
        </div>
      </div>
    `;
    return { main, extra };
  }

  // ---------- schedule render ----------
  function renderScheduleFromCache() {
    if (!scheduleTbody) return;
    const code = scheduleCurrency?.value || "UAH";
    setTheadCurrency(code);

    scheduleTbody.innerHTML = scheduleRowsUAH
      .map(
        (r) => `
      <tr>
        <td>${r.i}</td>
        <td>${r.dateText}</td>
        <td>${formatMoneyByCurrency(r.paymentUAH, code)}</td>
        <td>${formatMoneyByCurrency(r.interestUAH, code)}</td>
        <td>${formatMoneyByCurrency(r.principalUAH, code)}</td>
        <td>${formatMoneyByCurrency(r.costsUAH, code)}</td>
        <td>${formatMoneyByCurrency(r.balanceUAH, code)}</td>
      </tr>
    `
      )
      .join("");
  }

  // ---------- calc ----------
  function calc({ silent = false } = {}) {
    const P0 = getLoanPrincipalUAH();
    const rateYear = parseMoney(annualRate?.value);
    const years = Number(termYears?.value || 0);
    const n = Math.round(years * 12);

    const feeOne = parseMoney(oneTimeFee?.value);
    const costsMonth = parseMoney(monthlyCosts?.value);

    if (!(P0 > 0) || !(n > 0)) {
      if (!silent) setToast(tt("ipoteca.toast_enter_values"));
      setResult(tt("ipoteca.result_enter_values"), "");
      scheduleRowsUAH = [];
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

    scheduleRowsUAH = [];
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
        scheduleRowsUAH.push({
          i,
          dateText: formatDate(date),
          paymentUAH: monthlyPayment + costsMonth,
          interestUAH: interest,
          principalUAH: principal,
          costsUAH: costsMonth,
          balanceUAH: balance,
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
        scheduleRowsUAH.push({
          i,
          dateText: formatDate(date),
          paymentUAH: basePayment + costsMonth,
          interestUAH: interest,
          principalUAH: principal,
          costsUAH: costsMonth,
          balanceUAH: balance,
        });
      }

      monthlyPayment = scheduleRowsUAH.length ? scheduleRowsUAH[0].paymentUAH - scheduleRowsUAH[0].costsUAH : 0;
    }

    const totalPaid = totalPrincipal + totalInterest + totalCosts;
    const overpay = totalInterest;

    const avgPayment = (totalPrincipal + totalInterest) / n;
    const avgPaymentWithCosts = (totalPrincipal + totalInterest + costsMonth * n) / n;

    const monthlyPaymentWithCosts =
      type === "annuity"
        ? monthlyPayment + costsMonth
        : scheduleRowsUAH.length
        ? scheduleRowsUAH[0].paymentUAH
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
    scheduleRowsUAH = [];
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
    if ((scheduleCurrency.value === "USD" || scheduleCurrency.value === "EUR") && !rates.loaded) {
      setToast(tt("ipoteca.toast_nbu_not_loaded_fallback"));
      scheduleCurrency.value = "UAH";
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
  setTheadCurrency("UAH");
  loadNbuRates(); // async
  reset();
})();
