/* =========================================================
   salary-calculator.js — CalcCore (i18n-ready)
   - Mode: gross->net / net->gross
   - Taxes: standard(19.5%), none, custom
   - Bonus (adds to taxable base)
   - Deductions (after tax)
   - ESv: optional (employer cost), default 22%
   - Period: monthly/yearly (yearly converted to monthly for schedule)
   - Schedule currency: UAH / USD / EUR (NBU)
   - UI: big result + KPI blocks + toast + CSV/copy
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

  function getEffectiveTaxRate() {
    const m = taxMode?.value || "standard";
    if (m === "none") return 0;
    if (m === "custom") {
      const r = parseMoney(taxRate?.value);
      return Math.max(0, r) / 100;
    }
    return 0.195; // standard 19.5%
  }

  function updateTaxFieldState() {
    const m = taxMode?.value || "standard";
    if (!taxRate) return;
    if (m === "custom") {
      taxRate.disabled = false;
      if (!taxRate.value) taxRate.value = "19.5";
    } else {
      taxRate.disabled = true;
      taxRate.value = m === "none" ? "0" : "19.5";
    }
  }

  function updateEsvFieldState() {
    if (!esvRate) return;
    const on = !!showEsv?.checked;
    esvRate.disabled = !on;
    if (!esvRate.value) esvRate.value = "22";
    if (!on) esvRate.value = "22";
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
            `Курс НБУ: USD ${formatNumber(rates.USD, 4)} / EUR ${formatNumber(rates.EUR, 4)}${datePart}`;
          nbuBadge.title = tt("salary.nbu_title") || "Курс НБУ (USD/EUR)";
        } else {
          nbuBadge.textContent = tt("salary.nbu_unavailable") || "Курс НБУ: недоступно";
          nbuBadge.title = tt("salary.nbu_title") || "Курс НБУ (USD/EUR)";
        }
      }

      renderScheduleFromCache();
    } catch {
      rates.loaded = false;
      if (nbuBadge) {
        nbuBadge.textContent = tt("salary.nbu_unavailable") || "Курс НБУ: недоступно";
        nbuBadge.title = tt("salary.nbu_title") || "Курс НБУ (USD/EUR)";
      }
    }
  }

  // ---------- math ----------
  function solveGrossFromNet(netTarget, taxR, deductionsValue) {
    // net = gross*(1-tax) - deductions  => gross = (net + deductions)/(1-tax)
    const denom = 1 - taxR;
    if (denom <= 0) return 0;
    return (netTarget + deductionsValue) / denom;
  }

  function buildResultUI(data) {
    const {
      gross,
      taxes,
      net,
      bonusValue,
      deductionsValue,
      taxPct,
      esvValue,
      employerCost,
      periodLabel,
      modeLabel,
    } = data;

    const main =
      `${tt("salary.net_inhand") || "На руки"}: ${formatMoneyUAH(net)} ` +
      `(${tt("salary.period") || "період"}: ${periodLabel})`;

    const extra = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${tt("salary.kpi_gross") || "Брутто (база)"} </div>
          <div class="m-kpi__v">${formatMoneyUAH(gross)}</div>
          <div class="m-kpi__s">${tt("salary.kpi_mode") || "Режим"}: ${modeLabel}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("salary.kpi_taxes") || "Податки (ПДФО+ВЗ)"} </div>
          <div class="m-kpi__v">${formatMoneyUAH(taxes)}</div>
          <div class="m-kpi__s">${tt("salary.kpi_tax_rate") || "Ставка"}: ${formatNumber(taxPct, 2)}%</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("salary.kpi_bonus") || "Бонус / премія"} </div>
          <div class="m-kpi__v">${formatMoneyUAH(bonusValue)}</div>
          <div class="m-kpi__s">${tt("salary.kpi_deductions") || "Утримання"}: ${formatMoneyUAH(deductionsValue)}</div>
        </div>

        <div class="m-kpi">
          <div class="m-kpi__k">${tt("salary.kpi_employer_cost") || "Вартість роботодавця"} </div>
          <div class="m-kpi__v">${formatMoneyUAH(employerCost)}</div>
          <div class="m-kpi__s">${tt("salary.kpi_esv") || "ЄСВ"}: ${formatMoneyUAH(esvValue)}</div>
        </div>
      </div>

      <div class="m-summary">
        <div><b>${tt("salary.summary_net") || "На руки"}</b>: ${formatMoneyUAH(net)}</div>
        <div class="m-hintSmall">
          ${tt("salary.summary_hint") || "У графіку: суми відображаються в ₴ та можуть бути конвертовані у USD/EUR за курсом НБУ."}
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
          <td>${formatMoneyByCurrency(r.grossUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.taxUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.dedUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.netUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.esvUAH, code)}</td>
          <td>${formatMoneyByCurrency(r.employerUAH, code)}</td>
        </tr>
      `
      )
      .join("");
  }

  // ---------- calc ----------
  function calc({ silent = false } = {}) {
    const baseInput = parseMoney(salaryAmount?.value);
    const p = period?.value || "monthly";
    const bonusValue = Math.max(0, parseMoney(bonus?.value));
    const deductionsValue = Math.max(0, parseMoney(deductions?.value));
    const taxR = getEffectiveTaxRate();

    const mCount = Math.max(1, Number(months?.value || 12));
    const start = startDate?.value ? new Date(startDate.value) : new Date();

    if (!(baseInput > 0)) {
      if (!silent) setToast(tt("salary.toast_enter_values") || "Введи суму для розрахунку.");
      setResult(tt("salary.result_enter_values") || "Введи суму для розрахунку.", "");
      scheduleRowsUAH = [];
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      if (scheduleWrap) scheduleWrap.open = false;
      return;
    }

    // normalize to monthly amount for schedule
    const baseMonthly = p === "yearly" ? baseInput / 12 : baseInput;
    const bonusMonthly = p === "yearly" ? bonusValue / 12 : bonusValue;
    const deductionsMonthly = p === "yearly" ? deductionsValue / 12 : deductionsValue;

    const modeVal = mode?.value || "gross2net";

    let grossMonthly = 0;
    let netMonthly = 0;

    if (modeVal === "net2gross") {
      // input is "net (in hand)" BEFORE bonus? We'll treat it as net after taxes and after deductions, but including bonus effect.
      // For simplicity: taxableBase = gross (which includes bonusMonthly) ; net = taxableBase*(1-tax) - deductionsMonthly
      // So solve taxableBase from net: taxableBase = (net + deductions) / (1-tax)
      const taxableBase = solveGrossFromNet(baseMonthly, taxR, deductionsMonthly);
      // taxableBase is grossMonthly + bonusMonthly? We treat taxableBase = grossMonthly + bonusMonthly
      grossMonthly = Math.max(0, taxableBase - bonusMonthly);
      netMonthly = baseMonthly;
    } else {
      // gross2net: input is base gross salary
      grossMonthly = baseMonthly;
      const taxableBase = grossMonthly + bonusMonthly;
      const taxes = taxableBase * taxR;
      netMonthly = taxableBase - taxes - deductionsMonthly;
    }

    const taxableBaseMonthly = grossMonthly + bonusMonthly;
    const taxesMonthly = taxableBaseMonthly * taxR;
    const netCalcMonthly = taxableBaseMonthly - taxesMonthly - deductionsMonthly;

    // ESv (employer cost)
    const esvOn = !!showEsv?.checked;
    const esvR = esvOn ? Math.max(0, parseMoney(esvRate?.value) || 22) / 100 : 0;
    const esvMonthly = esvOn ? taxableBaseMonthly * esvR : 0;
    const employerCostMonthly = taxableBaseMonthly + esvMonthly;

    // build schedule
    scheduleRowsUAH = [];
    for (let i = 1; i <= mCount; i++) {
      const date = addMonths(start, i);
      scheduleRowsUAH.push({
        i,
        dateText: formatDate(date),
        grossUAH: grossMonthly + bonusMonthly,
        taxUAH: taxesMonthly,
        dedUAH: deductionsMonthly,
        netUAH: netCalcMonthly,
        esvUAH: esvMonthly,
        employerUAH: employerCostMonthly,
      });
    }

    const periodLabel = p === "yearly" ? (tt("salary.period_year") || "рік") : (tt("salary.period_month") || "місяць");
    const modeLabel =
      modeVal === "net2gross"
        ? (tt("salary.mode_net2gross") || "від “на руки” → брутто")
        : (tt("salary.mode_gross2net") || "від брутто → “на руки”");

    const ui = buildResultUI({
      gross: taxableBaseMonthly * (p === "yearly" ? 12 : 1),
      taxes: taxesMonthly * (p === "yearly" ? 12 : 1),
      net: netCalcMonthly * (p === "yearly" ? 12 : 1),
      bonusValue: bonusValue,
      deductionsValue: deductionsValue,
      taxPct: taxR * 100,
      esvValue: esvMonthly * (p === "yearly" ? 12 : 1),
      employerCost: employerCostMonthly * (p === "yearly" ? 12 : 1),
      periodLabel,
      modeLabel,
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
    if (taxRate) taxRate.value = "19.5";

    if (showEsv) showEsv.checked = true;
    if (esvRate) esvRate.value = "22";

    if (months) months.value = "12";
    if (scheduleCurrency) scheduleCurrency.value = "UAH";

    if (startDate) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      startDate.value = `${yyyy}-${mm}-${dd}`;
    }

    updateTaxFieldState();
    updateEsvFieldState();

    setToast(tt("salary.toast_reset") || "Скинуто.");
    setResult(tt("salary.result_enter_values") || "Введи суму для розрахунку.", "");
    scheduleRowsUAH = [];
    if (scheduleTbody) scheduleTbody.innerHTML = "";
    if (scheduleWrap) scheduleWrap.open = false;
    setTimeout(() => setToast(""), 1200);
  }

  // ---------- copy / CSV ----------
  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt || txt.includes(tt("salary.result_enter_values") || "Введи")) {
      setToast(tt("salary.toast_need_calc_first") || "Спочатку зроби розрахунок.");
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      setToast(tt("salary.copied_result") || "Скопійовано результат.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("salary.copy_failed") || "Не вдалося скопіювати.");
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
      setToast(tt("salary.copied_table") || "Скопійовано таблицю.");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("salary.copy_table_failed") || "Не вдалося скопіювати таблицю.");
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
    a.download = "salary-schedule.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
    setToast(tt("salary.csv_downloaded") || "CSV завантажено.");
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
  salaryAmount?.addEventListener("input", scheduleAuto);
  mode?.addEventListener("change", scheduleAuto);
  period?.addEventListener("change", scheduleAuto);

  bonus?.addEventListener("input", scheduleAuto);
  deductions?.addEventListener("input", scheduleAuto);

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
    if ((scheduleCurrency.value === "USD" || scheduleCurrency.value === "EUR") && !rates.loaded) {
      setToast(tt("salary.toast_nbu_not_loaded_fallback") || "Курс НБУ не завантажився — показую UAH.");
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
  loadNbuRates();
})();
