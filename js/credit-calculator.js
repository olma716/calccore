/* =========================================================
   CREDIT CALCULATOR — CalcCore
   + NBU rates (UAH / USD / EUR) for conversion
   + Base currency selector (UAH/USD/EUR) for ALL inputs/outputs
   + Auto-format money inputs with spaces: 1 000 000
   + i18n (uk/en) via /js/i18n.js
========================================================= */

(() => {
  const el = (id) => document.getElementById(id);

  // ---- i18n helpers ----
  const t = (key, vars) => (window.t ? window.t(key, vars) : key);
  const locale = () => (window.i18nLocale ? window.i18nLocale() : "uk-UA");
  const isEn = () =>
    String(document.documentElement.lang || "")
      .toLowerCase()
      .startsWith("en");

  // Inputs
  const loanAmount = el("loanAmount");
  const annualRate = el("annualRate");
  const termMonths = el("termMonths");
  const paymentType = el("paymentType");
  const startDate = el("startDate");
  const oneTimeFee = el("oneTimeFee");
  const monthlyFee = el("monthlyFee");
  const insurance = el("insurance");

  // Controls
  const autoCalc = el("autoCalc");
  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  // UI
  const toast = el("cToast");
  const resultEl = el("cResult") || el("resultBox");
  const detailsEl = el("cDetails");

  // Badge (top right)
  const badgeEl = el("nbuBadge") || el("calcBadge") || el("rateDate");

  // Schedule
  const scheduleWrap = el("scheduleWrap");
  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");
  const btnDownloadCSV = el("btnDownloadCSV");

  // Currency selector for schedule (exists in your HTML)
  const scheduleCurEl = el("scheduleCurrency");

  // ---------------- NBU rates ----------------
  const NBU_URL =
    "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";
  const CACHE_KEY = "cc_credit_nbu_rates_v2";
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h

  // Rates are "UAH per 1 unit"
  let ratesByCode = {
    UAH: { rate: 1, txt: "Українська гривня", exchangedate: "" },
  };
  let lastRateDate = ""; // dd.mm.yyyy

  // ---------------- base currency (ALL calculator) ----------------
  let baseCur = "UAH";
  let baseCurSelect = null;

  // ---------------- helpers (ui) ----------------
  function setToast(msg) {
    if (!toast) return;
    toast.textContent = msg || "";
  }

  function setResult(main, extraHtml = "") {
    if (resultEl) resultEl.textContent = main || "";
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

  function setNbuBadge() {
    if (!badgeEl) return;

    if (lastRateDate) {
      badgeEl.textContent = t("credit.nbu_badge", { date: lastRateDate });
      badgeEl.title = t("credit.nbu_badge_title", { date: lastRateDate });
    } else {
      badgeEl.textContent = t("credit.nbu_badge_short");
      badgeEl.title = t("credit.nbu_badge_short_title");
    }
  }

  function normalizeRates(apiArr) {
    const map = {
      UAH: { rate: 1, txt: "Українська гривня", exchangedate: "" },
    };

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

  async function loadNbuRates() {
    const cache = readCache();

    // 1) fresh cache
    if (cache?.rates && cacheIsFresh(cache)) {
      ratesByCode = cache.rates;
      lastRateDate = cache.lastRateDate || "";
      setNbuBadge();
      return true;
    }

    // 2) fetch
    try {
      const res = await fetch(NBU_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("NBU not ok");
      const data = await res.json();

      ratesByCode = normalizeRates(data);
      setNbuBadge();

      saveCache({ ts: Date.now(), rates: ratesByCode, lastRateDate });
      return true;
    } catch {
      // 3) fallback to old cache
      if (cache?.rates) {
        ratesByCode = cache.rates;
        lastRateDate = cache.lastRateDate || "";
        setNbuBadge();
        setToast(t("credit.nbu_unavailable_cached"));
        return true;
      }

      // no rates at all
      setNbuBadge();
      return false;
    }
  }

  function hasRate(code) {
    const c = String(code || "UAH").toUpperCase();
    if (c === "UAH") return true;
    const r = ratesByCode?.[c]?.rate;
    return Number.isFinite(r) && r > 0;
  }

  // ---------------- helpers (currency) ----------------
  function currencySymbol(code) {
    const c = String(code || "UAH").toUpperCase();
    if (c === "USD") return "$";
    if (c === "EUR") return "€";
    return "₴";
  }

  function toUAH(code, amount) {
    const c = String(code || "UAH").toUpperCase();
    if (!Number.isFinite(amount)) return amount;
    if (c === "UAH") return amount;
    const r = ratesByCode?.[c]?.rate;
    if (!Number.isFinite(r) || r <= 0) return amount;
    return amount * r; // amount in CUR -> UAH
  }

  function fromUAH(code, uahAmount) {
    const c = String(code || "UAH").toUpperCase();
    if (!Number.isFinite(uahAmount)) return uahAmount;
    if (c === "UAH") return uahAmount;
    const r = ratesByCode?.[c]?.rate;
    if (!Number.isFinite(r) || r <= 0) return uahAmount;
    return uahAmount / r; // UAH -> CUR
  }

  function formatMoney(n, code = "UAH") {
    if (!Number.isFinite(n)) return "—";
    const loc = locale();
    return (
      n.toLocaleString(loc, { maximumFractionDigits: 2 }) +
      " " +
      currencySymbol(code)
    );
  }

  function formatDate(d) {
    try {
      return d.toLocaleDateString(locale());
    } catch {
      return "";
    }
  }

  function updateTableHeadCurrency(outCur) {
    if (!scheduleTable) return;
    const sym = currencySymbol(outCur);

    const ths = scheduleTable.querySelectorAll("thead th");
    if (!ths?.length) return;

    const labels = [
      t("credit.th_no"),
      t("credit.th_date"),
      t("credit.th_payment"),
      t("credit.th_interest"),
      t("credit.th_principal"),
      t("credit.th_fees"),
      t("credit.th_balance"),
    ];

    ths.forEach((th, idx) => {
      if (idx <= 1) th.textContent = labels[idx] || th.textContent;
      else th.textContent = `${labels[idx] || th.textContent} (${sym})`;
    });
  }

  // ---------------- money parsing + autoformat ----------------
  function parseMoney(val) {
    if (val == null) return 0;
    const s = String(val)
      .replace(/\s+/g, "")
      .replace(/,/g, ".")
      .replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function formatWithSpacesRaw(input) {
    // Keep only digits + optional dot; group integer part by spaces.
    const s0 = String(input ?? "");
    const s = s0.replace(/[^\d.,]/g, "").replace(/,/g, ".");
    if (!s) return "";

    const firstDot = s.indexOf(".");
    let intPart = firstDot >= 0 ? s.slice(0, firstDot) : s;
    let fracPart = firstDot >= 0 ? s.slice(firstDot + 1) : "";

    // remove extra dots from frac part
    fracPart = fracPart.replace(/\./g, "");

    // trim leading zeros (but keep single 0 if all zeros)
    intPart = intPart.replace(/^0+(?=\d)/, "");

    // group by 3
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    // we allow decimals but keep as typed (no rounding here)
    return firstDot >= 0 ? `${grouped}.${fracPart}` : grouped;
  }

  function countDigitsLeft(str) {
    // count digits before caret in string (ignore spaces)
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

      // digits before caret (ignore spaces)
      const left = oldVal.slice(0, caret);
      const digitsLeft = countDigitsLeft(left);

      const formatted = formatWithSpacesRaw(oldVal);

      inputEl.value = formatted;

      // restore caret by digits count
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

  // ---------------- credit math ----------------
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

  function buildResultUI(data) {
    const {
      monthlyPayment,
      monthlyPaymentWithFees,
      totalPaid,
      overpay,
      totalFees,
      typeLabel,
      avgPayment,
      avgPaymentWithFees,
      outCur,
    } = data;

    const main = t("credit.main_monthly", {
      amount: formatMoney(monthlyPayment, outCur),
    });

    const extra = `
      <div class="ccredit-kpis">
        <div class="ccredit-kpi">
          <div class="ccredit-kpi__k">${t("credit.kpi_monthly_no_fees")}</div>
          <div class="ccredit-kpi__v">${formatMoney(monthlyPayment, outCur)}</div>
          <div class="ccredit-kpi__s">${t("credit.kpi_calc_type", {
            type: typeLabel,
          })}</div>
        </div>

        <div class="ccredit-kpi">
          <div class="ccredit-kpi__k">${t("credit.kpi_monthly_with_fees")}</div>
          <div class="ccredit-kpi__v">${formatMoney(
            monthlyPaymentWithFees,
            outCur
          )}</div>
          <div class="ccredit-kpi__s">${t("credit.kpi_fees_included")}</div>
        </div>

        <div class="ccredit-kpi">
          <div class="ccredit-kpi__k">${t("credit.kpi_overpay_interest")}</div>
          <div class="ccredit-kpi__v">${formatMoney(overpay, outCur)}</div>
          <div class="ccredit-kpi__s">${t("credit.kpi_overpay_note")}</div>
        </div>

        <div class="ccredit-kpi">
          <div class="ccredit-kpi__k">${t("credit.kpi_total")}</div>
          <div class="ccredit-kpi__v">${formatMoney(totalPaid, outCur)}</div>
          <div class="ccredit-kpi__s">${t("credit.kpi_total_note")}</div>
        </div>
      </div>

      <div class="ccredit-summary">
        <div><b>${t("credit.summary_fees")}:</b> ${formatMoney(
          totalFees,
          outCur
        )}</div>
        <div class="ccredit-hint" style="margin-top:6px; font-size:12px; opacity:.9;">
          <span class="muted">${t("credit.hint_prefix")}:</span>
          ${t("credit.hint_avg", {
            avg1: formatMoney(avgPayment, outCur),
            avg2: formatMoney(avgPaymentWithFees, outCur),
          })}
        </div>
      </div>
    `;

    return { main, extra };
  }

  function calc({ silent = false, keepScheduleOpen = false } = {}) {
    // read inputs in BASE currency, convert to UAH for math
    const P0_base = parseMoney(loanAmount?.value);
    const rateYear = parseMoney(annualRate?.value);
    const n = Number(termMonths?.value || 0);

    const feeOne_base = parseMoney(oneTimeFee?.value);
    const feeMonth_base = parseMoney(monthlyFee?.value);
    const insMonth_base = parseMoney(insurance?.value);

    const outCur = String(baseCur || "UAH").toUpperCase();
    const scheduleCur = String(scheduleCurEl?.value || outCur).toUpperCase();

    if (!(P0_base > 0) || !(n > 0)) {
      if (!silent) setToast(t("credit.err_amount_term"));
      setResult(t("credit.hint_enter_inputs"), "");
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap && !keepScheduleOpen) scheduleWrap.open = false;
      return;
    }

    // if user picked USD/EUR but rates not available -> fallback to UAH
    if ((outCur === "USD" || outCur === "EUR") && !hasRate(outCur)) {
      setToast(
        isEn()
          ? "NBU rates not loaded yet. Using UAH."
          : "Курс НБУ ще не завантажено. Використовую UAH."
      );
      baseCur = "UAH";
      if (baseCurSelect) baseCurSelect.value = "UAH";
    }

    const P0 = toUAH(outCur, P0_base);
    const feeOne = toUAH(outCur, feeOne_base);
    const feeMonth = toUAH(outCur, feeMonth_base);
    const insMonth = toUAH(outCur, insMonth_base);

    const rMonth = rateYear > 0 ? rateYear / 100 / 12 : 0;
    const type = paymentType?.value || "annuity";
    const typeLabel =
      type === "annuity" ? t("credit.type_annuity") : t("credit.type_diff");

    const start = startDate?.value ? new Date(startDate.value) : new Date();

    let balance = P0;
    let totalInterest = 0;
    let totalPrincipal = 0;
    let totalFees = feeOne;

    const rows = [];
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

        const feesThisMonth = feeMonth + insMonth;
        totalFees += feesThisMonth;

        rows.push({
          i,
          date: addMonths(start, i),
          payment: monthlyPayment + feesThisMonth,
          interest,
          principal,
          fees: feesThisMonth,
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

        const feesThisMonth = feeMonth + insMonth;
        totalFees += feesThisMonth;

        rows.push({
          i,
          date: addMonths(start, i),
          payment: basePayment + feesThisMonth,
          interest,
          principal,
          fees: feesThisMonth,
          balance,
        });
      }

      monthlyPayment = rows.length ? rows[0].payment - rows[0].fees : 0;
    }

    const totalPaid = totalPrincipal + totalInterest + totalFees;
    const overpay = totalInterest;

    const avgPayment = (totalPrincipal + totalInterest) / n;
    const avgPaymentWithFees =
      (totalPrincipal + totalInterest + (feeMonth + insMonth) * n) / n;

    const monthlyPaymentWithFees =
      type === "annuity"
        ? monthlyPayment + feeMonth + insMonth
        : rows.length
        ? rows[0].payment
        : 0;

    // UI (convert to BASE currency)
    const ui = buildResultUI({
      monthlyPayment: fromUAH(outCur, monthlyPayment),
      monthlyPaymentWithFees: fromUAH(outCur, monthlyPaymentWithFees),
      totalPaid: fromUAH(outCur, totalPaid),
      overpay: fromUAH(outCur, overpay),
      totalFees: fromUAH(outCur, totalFees),
      typeLabel,
      avgPayment: fromUAH(outCur, avgPayment),
      avgPaymentWithFees: fromUAH(outCur, avgPaymentWithFees),
      outCur,
    });

    setToast("");
    setResult(ui.main, ui.extra);

    // Schedule (convert each cell to schedule currency)
    updateTableHeadCurrency(scheduleCur);

    if (scheduleTbody) {
      scheduleTbody.innerHTML = rows
        .map((r) => {
          const pay = fromUAH(scheduleCur, r.payment);
          const intr = fromUAH(scheduleCur, r.interest);
          const prin = fromUAH(scheduleCur, r.principal);
          const fees = fromUAH(scheduleCur, r.fees);
          const bal = fromUAH(scheduleCur, r.balance);

          return `
            <tr>
              <td>${r.i}</td>
              <td>${formatDate(r.date)}</td>
              <td>${formatMoney(pay, scheduleCur)}</td>
              <td>${formatMoney(intr, scheduleCur)}</td>
              <td>${formatMoney(prin, scheduleCur)}</td>
              <td>${formatMoney(fees, scheduleCur)}</td>
              <td>${formatMoney(bal, scheduleCur)}</td>
            </tr>
          `;
        })
        .join("");
    }

    if (scheduleWrap) scheduleWrap.open = !!keepScheduleOpen;
  }

  function reset() {
    if (loanAmount) loanAmount.value = "";
    if (annualRate) annualRate.value = "";
    if (termMonths) termMonths.value = "";
    if (paymentType) paymentType.value = "annuity";
    if (oneTimeFee) oneTimeFee.value = "";
    if (monthlyFee) monthlyFee.value = "";
    if (insurance) insurance.value = "";

    if (startDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    setToast(t("credit.reset_done"));
    setResult(t("credit.hint_enter_inputs_short"), "");

    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;

    updateTableHeadCurrency(String(scheduleCurEl?.value || "UAH").toUpperCase());

    setTimeout(() => setToast(""), 1200);
  }

  async function copyResult() {
    const text = resultEl?.textContent?.trim() || "";
    if (!text || text.includes("Введи") || text.toLowerCase().includes("enter")) {
      setToast(t("credit.copy_first_calc"));
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setToast(t("credit.copy_ok"));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(t("credit.copy_failed"));
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
      setToast(t("credit.copy_table_ok"));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(t("credit.copy_table_failed"));
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
    a.download = "credit-schedule.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);

    setToast(t("credit.csv_downloaded"));
    setTimeout(() => setToast(""), 1500);
  }

  // Auto-calc debounce
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  // ---------------- remove OLD currency picker in topline (if any) ----------------
  function removeOldToplineCurrencyPicker() {
    const topline = document.querySelector(".evc-topline");
    if (!topline) return;

    // remove old injected wrap if exists
    const oldWrap = topline.querySelector(".ccredit-curpick");
    if (oldWrap) oldWrap.remove();

    // also remove select if someone injected it directly
    const oldSelect = topline.querySelector("#calcCurrency");
    if (oldSelect) oldSelect.remove();
  }

  // ---------------- base currency picker (now in LEFT block) ----------------
  function initBaseCurrencyPicker() {
    const select = document.getElementById("calcCurrency");
    if (!select) return;

    // force old sizes (same as previous topline picker)
    select.classList.add("ccalc__select", "ccredit-curpick__select");

    baseCurSelect = select;
    select.value = baseCur;

    select.addEventListener("change", () => {
      const next = String(select.value || "UAH").toUpperCase();

      // if USD/EUR but rates not loaded -> revert to UAH
      if ((next === "USD" || next === "EUR") && !hasRate(next)) {
        setToast(
          isEn()
            ? "NBU rates are not loaded yet. Please try later."
            : "Курс НБУ ще не завантажено. Спробуй пізніше."
        );
        select.value = "UAH";
        baseCur = "UAH";
        setTimeout(() => setToast(""), 1800);
      } else {
        baseCur = next;
      }

      // sync schedule currency to base (nice default)
      if (scheduleCurEl) {
        scheduleCurEl.value = baseCur;
        updateTableHeadCurrency(baseCur);
      }

      calc({ silent: true, keepScheduleOpen: true });
    });
  }

  // ---------------- init ----------------
  document.addEventListener("DOMContentLoaded", async () => {
    // remove old currency picker from topline (if any)
    removeOldToplineCurrencyPicker();

    // init base currency picker (now inside "Введи дані")
    initBaseCurrencyPicker();

    // default date (if empty)
    if (startDate && !startDate.value) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    // attach autoformat for money inputs
    [loanAmount, oneTimeFee, monthlyFee, insurance].forEach(attachMoneyFormatter);

    // load NBU
    const ok = await loadNbuRates();
    if (!ok) {
      setToast(t("credit.nbu_unavailable_now"));
      setTimeout(() => setToast(""), 1800);
    }

    // schedule currency change -> recalc (keep open)
    scheduleCurEl?.addEventListener("change", () => {
      const cur = String(scheduleCurEl.value || "UAH").toUpperCase();
      if ((cur === "USD" || cur === "EUR") && !hasRate(cur)) {
        setToast(
          isEn()
            ? "NBU rates not loaded yet. Using UAH."
            : "Курс НБУ ще не завантажено. Використовую UAH."
        );
        scheduleCurEl.value = "UAH";
        setTimeout(() => setToast(""), 1800);
      }
      calc({ silent: true, keepScheduleOpen: true });
    });

    // inputs -> auto
    const inputs = [annualRate, termMonths, paymentType, startDate].filter(Boolean);
    inputs.forEach((inp) => {
      inp.addEventListener("input", scheduleAuto);
      inp.addEventListener("change", scheduleAuto);
    });

    // these are already hooked by formatter via input -> scheduleAuto, but keep change safety
    [loanAmount, oneTimeFee, monthlyFee, insurance]
      .filter(Boolean)
      .forEach((inp) => {
        inp.addEventListener("change", scheduleAuto);
      });

    btnCalc?.addEventListener("click", () => calc({ silent: false }));
    btnReset?.addEventListener("click", reset);
    btnCopy?.addEventListener("click", copyResult);

    btnCopySchedule?.addEventListener("click", copySchedule);
    btnDownloadCSV?.addEventListener("click", downloadCSV);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      calc({ silent: false });
    });

    // initial state
    reset();
  });
})();
