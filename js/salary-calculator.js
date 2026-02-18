/* =========================================================
   salary-calculator.js — CalcCore (i18n-ready)
   UPDATED:
   - Base currency picker (UAH/USD/EUR) injected next to "Mode"
   - Standard taxes: PIT 18% + Military levy 5% = 23%
   - ESV checkbox default OFF
   - Hide ESV rate field + hide ESV columns in table when unchecked
   - Money inputs autoformat with spaces: 100 000 / 1 000 000
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
  const mode = el("mode"); // gross2net / net2gross
  const salaryAmount = el("salaryAmount");
  const period = el("period"); // monthly / yearly
  const bonus = el("bonus");
  const deductions = el("deductions");

  const taxMode = el("taxMode"); // standard / none / custom
  const taxRate = el("taxRate");

  const showEsv = el("showEsv");
  const esvRate = el("esvRate");

  const months = el("months");
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

  // Base currency for ALL inputs/outputs
  let baseCur = "UAH";
  let baseCurSelect = null;

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

  function currencySymbol(code) {
    if (code === "USD") return "$";
    if (code === "EUR") return "€";
    return "₴";
  }

  function hasRate(code) {
    const c = String(code || "UAH").toUpperCase();
    if (c === "UAH") return true;
    const r = rates?.[c];
    return Number.isFinite(r) && r > 0;
  }

  function toUAH(code, amount) {
    const c = String(code || "UAH").toUpperCase();
    if (!Number.isFinite(amount)) return amount;
    if (c === "UAH") return amount;
    if (!rates.loaded) return amount;
    const r = rates[c];
    if (!Number.isFinite(r) || r <= 0) return amount;
    return amount * r;
  }

  function fromUAH(code, uahAmount) {
    const c = String(code || "UAH").toUpperCase();
    if (!Number.isFinite(uahAmount)) return uahAmount;
    if (c === "UAH") return uahAmount;
    if (!rates.loaded) return uahAmount;
    const r = rates[c];
    if (!Number.isFinite(r) || r <= 0) return uahAmount;
    return uahAmount / r;
  }

  function formatMoney(amountInUAH, outCode) {
    const code = String(outCode || "UAH").toUpperCase();
    const v = fromUAH(code, amountInUAH);
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

  // ---------- taxes / esv ----------
  function getEffectiveTaxRate() {
    const m = taxMode?.value || "standard";
    if (m === "none") return 0;
    if (m === "custom") {
      const r = parseMoney(taxRate?.value);
      return Math.max(0, r) / 100;
    }
    // Standard: PIT 18% + Military levy 5% = 23%
    return 0.23;
  }

  function updateTaxFieldState() {
    const m = taxMode?.value || "standard";
    if (!taxRate) return;

    if (m === "custom") {
      taxRate.disabled = false;
      if (!taxRate.value) taxRate.value = "23";
    } else {
      taxRate.disabled = true;
      taxRate.value = m === "none" ? "0" : "23";
    }
  }

  function updateEsvFieldState() {
    if (!esvRate) return;

    const on = !!showEsv?.checked;

    // disable + hide the field container when off
    esvRate.disabled = !on;
    const fieldWrap = esvRate.closest(".mcalc__field");
    if (fieldWrap) fieldWrap.style.display = on ? "" : "none";

    if (!esvRate.value) esvRate.value = "22";
    if (!on) esvRate.value = "22";

    // also hide / show columns in schedule table
    updateEsvColumnsVisibility(on);
  }

  function updateEsvColumnsVisibility(on) {
    if (!scheduleTable) return;

    // 0 №, 1 Date, 2 Gross, 3 Taxes, 4 Deductions, 5 Net, 6 ESV, 7 Employer cost
    const hideIdx = [6, 7];

    const rows = scheduleTable.querySelectorAll("tr");
    rows.forEach((tr) => {
      const cells = tr.children;
      hideIdx.forEach((idx) => {
        const cell = cells?.[idx];
        if (cell) cell.style.display = on ? "" : "none";
      });
    });
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
            tt("salary.nbu_badge", {
              usd: formatNumber(rates.USD, 4),
              eur: formatNumber(rates.EUR, 4),
              datePart,
            }) ||
            `NBU: USD ${formatNumber(rates.USD, 4)} / EUR ${formatNumber(rates.EUR, 4)}${datePart}`;
          nbuBadge.title = tt("salary.nbu_title") || "NBU rates (USD/EUR)";
        } else {
          nbuBadge.textContent = tt("salary.nbu_unavailable") || "NBU: unavailable";
          nbuBadge.title = tt("salary.nbu_title") || "NBU rates (USD/EUR)";
        }
      }

      // if user selected USD/EUR but rates not ready -> force UAH
      if ((baseCur === "USD" || baseCur === "EUR") && !hasRate(baseCur)) {
        baseCur = "UAH";
        if (baseCurSelect) baseCurSelect.value = "UAH";
      }

      renderScheduleFromCache();
    } catch {
      rates.loaded = false;
      if (nbuBadge) {
        nbuBadge.textContent = tt("salary.nbu_unavailable") || "NBU: unavailable";
        nbuBadge.title = tt("salary.nbu_title") || "NBU rates (USD/EUR)";
      }

      // fallback base currency
      if (baseCur !== "UAH") {
        baseCur = "UAH";
        if (baseCurSelect) baseCurSelect.value = "UAH";
      }
    }
  }

  // ---------- math ----------
  function solveGrossFromNet(netTarget, taxR, deductionsValue) {
    const denom = 1 - taxR;
    if (denom <= 0) return 0;
    return (netTarget + deductionsValue) / denom;
  }

  function buildResultUI(data) {
    const {
      grossUAH,
      taxesUAH,
      netUAH,
      bonusUAH,
      deductionsUAH,
      taxPct,
      esvUAH,
      employerCostUAH,
      periodLabel,
      modeLabel,
      esvOn,
    } = data;

    const main =
      `${tt("salary.net_inhand") || (isEn() ? "Net (in hand)" : "На руки")}: ${formatMoney(netUAH, baseCur)} ` +
      `(${tt("salary.period") || (isEn() ? "period" : "період")}: ${periodLabel})`;

    const kpiEsvBlock = esvOn
      ? `
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("salary.kpi_employer_cost") || (isEn() ? "Employer cost" : "Вартість роботодавця")}</div>
          <div class="m-kpi__v">${formatMoney(employerCostUAH, baseCur)}</div>
          <div class="m-kpi__s">${tt("salary.kpi_esv") || "ЄСВ"}: ${formatMoney(esvUAH, baseCur)}</div>
        </div>
      `
      : `
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("salary.kpi_employer_cost") || (isEn() ? "Employer cost" : "Вартість роботодавця")}</div>
          <div class="m-kpi__v">${formatMoney(employerCostUAH, baseCur)}</div>
          <div class="m-kpi__s">${isEn() ? "ESV not included" : "ЄСВ не враховано"}</div>
        </div>
      `;

    const extra = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("salary.kpi_gross") || (isEn() ? "Gross (tax base)" : "Брутто (база)")}</div>
          <div class="m-kpi__v">${formatMoney(grossUAH, baseCur)}</div>
          <div class="m-kpi__s">${tt("salary.kpi_mode") || (isEn() ? "Mode" : "Режим")}: ${modeLabel}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("salary.kpi_taxes") || (isEn() ? "Taxes" : "Податки (ПДФО+ВЗ)")}</div>
          <div class="m-kpi__v">${formatMoney(taxesUAH, baseCur)}</div>
          <div class="m-kpi__s">${tt("salary.kpi_tax_rate") || (isEn() ? "Rate" : "Ставка")}: ${formatNumber(taxPct, 2)}%</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("salary.kpi_bonus") || (isEn() ? "Bonus" : "Бонус / премія")}</div>
          <div class="m-kpi__v">${formatMoney(bonusUAH, baseCur)}</div>
          <div class="m-kpi__s">${tt("salary.kpi_deductions") || (isEn() ? "Deductions" : "Утримання")}: ${formatMoney(deductionsUAH, baseCur)}</div>
        </div>

        ${kpiEsvBlock}
      </div>

      <div class="m-summary">
        <div><b>${tt("salary.summary_net") || (isEn() ? "Net" : "На руки")}</b>: ${formatMoney(netUAH, baseCur)}</div>
        <div class="m-hintSmall">
          ${tt("salary.summary_hint") || (isEn()
            ? "In the table: values can be shown in UAH/USD/EUR (USD/EUR use NBU rates)."
            : "У таблиці: суми можуть відображатися в UAH/USD/EUR (USD/EUR — за курсом НБУ).")}
        </div>
      </div>
    `;

    return { main, extra };
  }

  // ---------- schedule render ----------
  function renderScheduleFromCache() {
    if (!scheduleTbody) return;
    const code = String(scheduleCurrency?.value || "UAH").toUpperCase();

    scheduleTbody.innerHTML = scheduleRowsUAH
      .map(
        (r) => `
        <tr>
          <td>${r.i}</td>
          <td>${r.dateText}</td>
          <td>${formatMoney(r.grossUAH, code)}</td>
          <td>${formatMoney(r.taxUAH, code)}</td>
          <td>${formatMoney(r.dedUAH, code)}</td>
          <td>${formatMoney(r.netUAH, code)}</td>
          <td>${formatMoney(r.esvUAH, code)}</td>
          <td>${formatMoney(r.employerUAH, code)}</td>
        </tr>
      `
      )
      .join("");

    // ensure columns visibility matches checkbox
    updateEsvColumnsVisibility(!!showEsv?.checked);
  }

  // ---------- base currency UI injection (next to Mode) ----------
  function injectBaseCurrencyPickerNextToMode() {
    if (!mode) return;

    const modeField = mode.closest(".mcalc__field");
    if (!modeField) return;

    // Make mode NOT full width so it can sit next to currency
    modeField.classList.remove("m-full");

    // Create currency field
    const curField = document.createElement("div");
    curField.className = "mcalc__field";
    curField.innerHTML = `
      <label class="mcalc__label" for="calcCurrency">${isEn() ? "Currency" : "Валюта"}</label>
      <select class="mcalc__select mcalc__select--mini" id="calcCurrency">
        <option value="UAH">UAH ₴</option>
        <option value="USD">USD $</option>
        <option value="EUR">EUR €</option>
      </select>
      <div class="mcalc__hint">${isEn() ? "Used for all inputs & results." : "Застосовується до всіх вводів і результатів."}</div>
    `;

    // Insert right after mode field
    modeField.parentElement?.insertBefore(curField, modeField.nextSibling);

    baseCurSelect = curField.querySelector("#calcCurrency");
    if (baseCurSelect) {
      baseCurSelect.value = baseCur;

      baseCurSelect.addEventListener("change", () => {
        const next = String(baseCurSelect.value || "UAH").toUpperCase();

        // If USD/EUR selected but rates not loaded yet -> revert to UAH
        if ((next === "USD" || next === "EUR") && !hasRate(next)) {
          setToast(isEn() ? "NBU rates not loaded yet. Using UAH." : "Курс НБУ ще не завантажено. Використовую UAH.");
          baseCurSelect.value = "UAH";
          baseCur = "UAH";
          setTimeout(() => setToast(""), 1800);
        } else {
          baseCur = next;
        }

        // nice default: sync schedule currency to base
        if (scheduleCurrency) scheduleCurrency.value = baseCur;

        calc({ silent: true });
      });
    }
  }

  // ---------- calc ----------
  function calc({ silent = false } = {}) {
    // read inputs in BASE currency -> convert to UAH for math
    const baseInputBase = parseMoney(salaryAmount?.value);
    const p = period?.value || "monthly";

    const bonusBase = Math.max(0, parseMoney(bonus?.value));
    const deductionsBase = Math.max(0, parseMoney(deductions?.value));
    const taxR = getEffectiveTaxRate();

    const mCount = Math.max(1, Number(months?.value || 12));
    const start = startDate?.value ? new Date(startDate.value) : new Date();

    if (!(baseInputBase > 0)) {
      if (!silent) setToast(tt("salary.toast_enter_values") || (isEn() ? "Enter amount." : "Введи суму для розрахунку."));
      setResult(tt("salary.result_enter_values") || (isEn() ? "Enter amount to calculate." : "Введи суму для розрахунку."), "");
      scheduleRowsUAH = [];
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap) scheduleWrap.open = false;
      return;
    }

    // If user picked USD/EUR but rates not loaded -> fallback to UAH
    if ((baseCur === "USD" || baseCur === "EUR") && !hasRate(baseCur)) {
      baseCur = "UAH";
      if (baseCurSelect) baseCurSelect.value = "UAH";
      setToast(isEn() ? "NBU rates not loaded yet. Using UAH." : "Курс НБУ ще не завантажено. Використовую UAH.");
      setTimeout(() => setToast(""), 1800);
    }

    // Convert input values to UAH
    const baseInputUAH = toUAH(baseCur, baseInputBase);
    const bonusUAH = toUAH(baseCur, bonusBase);
    const deductionsUAH = toUAH(baseCur, deductionsBase);

    // normalize to monthly amount for schedule (UAH)
    const baseMonthlyUAH = p === "yearly" ? baseInputUAH / 12 : baseInputUAH;
    const bonusMonthlyUAH = p === "yearly" ? bonusUAH / 12 : bonusUAH;
    const deductionsMonthlyUAH = p === "yearly" ? deductionsUAH / 12 : deductionsUAH;

    const modeVal = mode?.value || "gross2net";

    let grossMonthlyUAH = 0;
    let netMonthlyUAH = 0;

    if (modeVal === "net2gross") {
      const taxableBase = solveGrossFromNet(baseMonthlyUAH, taxR, deductionsMonthlyUAH);
      grossMonthlyUAH = Math.max(0, taxableBase - bonusMonthlyUAH);
      netMonthlyUAH = baseMonthlyUAH;
    } else {
      grossMonthlyUAH = baseMonthlyUAH;
      const taxableBase = grossMonthlyUAH + bonusMonthlyUAH;
      const taxes = taxableBase * taxR;
      netMonthlyUAH = taxableBase - taxes - deductionsMonthlyUAH;
    }

    const taxableBaseMonthlyUAH = grossMonthlyUAH + bonusMonthlyUAH;
    const taxesMonthlyUAH = taxableBaseMonthlyUAH * taxR;
    const netCalcMonthlyUAH = taxableBaseMonthlyUAH - taxesMonthlyUAH - deductionsMonthlyUAH;

    // ESv (employer cost)
    const esvOn = !!showEsv?.checked;
    const esvR = esvOn ? Math.max(0, parseMoney(esvRate?.value) || 22) / 100 : 0;
    const esvMonthlyUAH = esvOn ? taxableBaseMonthlyUAH * esvR : 0;
    const employerCostMonthlyUAH = taxableBaseMonthlyUAH + esvMonthlyUAH;

    // build schedule
    scheduleRowsUAH = [];
    for (let i = 1; i <= mCount; i++) {
      const date = addMonths(start, i);
      scheduleRowsUAH.push({
        i,
        dateText: formatDate(date),
        grossUAH: taxableBaseMonthlyUAH,
        taxUAH: taxesMonthlyUAH,
        dedUAH: deductionsMonthlyUAH,
        netUAH: netCalcMonthlyUAH,
        esvUAH: esvMonthlyUAH,
        employerUAH: employerCostMonthlyUAH,
      });
    }

    const periodLabel = p === "yearly" ? (tt("salary.period_year") || (isEn() ? "year" : "рік")) : (tt("salary.period_month") || (isEn() ? "month" : "місяць"));
    const modeLabel =
      modeVal === "net2gross"
        ? (tt("salary.mode_net2gross") || (isEn() ? "net → gross" : "від “на руки” → брутто"))
        : (tt("salary.mode_gross2net") || (isEn() ? "gross → net" : "від брутто → “на руки”"));

    const mult = p === "yearly" ? 12 : 1;

    const ui = buildResultUI({
      grossUAH: taxableBaseMonthlyUAH * mult,
      taxesUAH: taxesMonthlyUAH * mult,
      netUAH: netCalcMonthlyUAH * mult,
      bonusUAH: bonusUAH, // show as entered (base period)
      deductionsUAH: deductionsUAH,
      taxPct: taxR * 100,
      esvUAH: esvMonthlyUAH * mult,
      employerCostUAH: employerCostMonthlyUAH * mult,
      periodLabel,
      modeLabel,
      esvOn,
    });

    setToast("");
    setResult(ui.main, ui.extra);

    renderScheduleFromCache();
    if (scheduleWrap) scheduleWrap.open = false;
  }

  // ---------- reset ----------
  function reset() {
    if (mode) mode.value = "gross2net";
    if (salaryAmount) salaryAmount.value = "";
    if (period) period.value = "monthly";
    if (bonus) bonus.value = "";
    if (deductions) deductions.value = "";

    if (taxMode) taxMode.value = "standard";
    if (taxRate) taxRate.value = "23"; // updated default

    // ESV default OFF
    if (showEsv) showEsv.checked = false;
    if (esvRate) esvRate.value = "22";

    if (months) months.value = "12";
    if (scheduleCurrency) scheduleCurrency.value = baseCur;

    if (startDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    updateTaxFieldState();
    updateEsvFieldState();

    setToast(tt("salary.toast_reset") || (isEn() ? "Reset." : "Скинуто."));
    setResult(tt("salary.result_enter_values") || (isEn() ? "Enter amount to calculate." : "Введи суму для розрахунку."), "");
    scheduleRowsUAH = [];
    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;
    setTimeout(() => setToast(""), 1200);
  }

  // ---------- copy / CSV ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt || txt.includes(tt("salary.result_enter_values") || (isEn() ? "Enter" : "Введи"))) {
      setToast(tt("salary.toast_need_calc_first") || (isEn() ? "Calculate first." : "Спочатку зроби розрахунок."));
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(tt("salary.copied_result") || (isEn() ? "Result copied." : "Скопійовано результат."));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("salary.copy_failed") || (isEn() ? "Copy failed." : "Не вдалося скопіювати."));
    }
  }

  async function copySchedule() {
    if (!scheduleTable) return;
    const rows = Array.from(scheduleTable.querySelectorAll("tr"));
    const lines = rows.map((tr) =>
      Array.from(tr.children)
        .filter((td) => td.style.display !== "none") // respect hidden columns
        .map((td) => td.innerText.replace(/\s+/g, " ").trim())
        .join("\t")
    );
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text.trim());
      setToast(tt("salary.copied_table") || (isEn() ? "Table copied." : "Скопійовано таблицю."));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("salary.copy_table_failed") || (isEn() ? "Copy failed." : "Не вдалося скопіювати таблицю."));
    }
  }

  function downloadCSV() {
    if (!scheduleTable) return;

    const rows = Array.from(scheduleTable.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.children)
        .filter((td) => td.style.display !== "none") // respect hidden columns
        .map((td) => `"${td.innerText.replace(/"/g, '""').trim()}"`)
        .join(",")
    );

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "salary-schedule.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setToast(tt("salary.csv_downloaded") || (isEn() ? "CSV downloaded." : "CSV завантажено."));
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
  // money inputs formatting
  [salaryAmount, bonus, deductions].forEach(attachMoneyFormatter);

  salaryAmount?.addEventListener("change", scheduleAuto);
  mode?.addEventListener("change", scheduleAuto);
  period?.addEventListener("change", scheduleAuto);

  bonus?.addEventListener("change", scheduleAuto);
  deductions?.addEventListener("change", scheduleAuto);

  taxMode?.addEventListener("change", () => {
    updateTaxFieldState();
    scheduleAuto();
  });
  taxRate?.addEventListener("input", scheduleAuto);

  showEsv?.addEventListener("change", () => {
    updateEsvFieldState();
    scheduleAuto();
  });
  esvRate?.addEventListener("input", scheduleAuto);

  months?.addEventListener("input", scheduleAuto);
  startDate?.addEventListener("change", scheduleAuto);

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  scheduleCurrency?.addEventListener("change", () => {
    const c = String(scheduleCurrency.value || "UAH").toUpperCase();
    if ((c === "USD" || c === "EUR") && !rates.loaded) {
      setToast(tt("salary.toast_nbu_not_loaded_fallback") || (isEn() ? "NBU not loaded — showing UAH." : "Курс НБУ не завантажився — показую UAH."));
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
  document.addEventListener("DOMContentLoaded", () => {
    // Insert currency picker next to "Mode"
    injectBaseCurrencyPickerNextToMode();

    // Default base currency
    baseCur = "UAH";
    if (baseCurSelect) baseCurSelect.value = "UAH";

    reset();
    loadNbuRates();
  });
})();
