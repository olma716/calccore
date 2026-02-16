(() => {
  const el = (id) => document.getElementById(id);

  const LANG =
    (window.__LANG__ && String(window.__LANG__).toLowerCase().startsWith("en")) ||
    String(document.documentElement.lang || "").toLowerCase().startsWith("en") ||
    location.pathname.startsWith("/en/")
      ? "en"
      : "uk";

  const hasT = typeof window.t === "function";
  function tr(key, uk, en, vars) {
    if (hasT) {
      const out = window.t(key, vars);
      if (out && out !== key) return out;
    }
    const s = LANG === "en" ? en : uk;
    if (!vars || typeof vars !== "object") return s;
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.split(`{${k}}`).join(String(v)),
      s
    );
  }

  function isAuto() {
    return !!el("auto_calc_toggle")?.checked;
  }

  function parseNum(v) {
    if (v == null) return NaN;
    const s = String(v).trim().replace(/\s+/g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function clamp(n, a, b) {
    if (!Number.isFinite(n)) return a;
    return Math.max(a, Math.min(b, n));
  }

  function loc() {
    return typeof window.i18nLocale === "function"
      ? window.i18nLocale()
      : (LANG === "en" ? "en-US" : "uk-UA");
  }

  function fmt(n, digits = 2) {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString(loc(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function fmtUAH(n) {
    if (!Number.isFinite(n)) return "—";
    const unit = tr("common.unit_uah", "грн", "UAH");
    return Math.round(n).toLocaleString(loc()) + " " + unit;
  }

  function fmtCur(n, cur) {
    if (!Number.isFinite(n)) return "—";
    const s = n.toLocaleString(loc(), { maximumFractionDigits: 2 });
    if (cur === "EUR") return s + " €";
    if (cur === "USD") return s + " $";
    return Math.round(n).toLocaleString(loc()) + " " + tr("common.unit_uah", "грн", "UAH");
  }

  function currentYear() {
    return new Date().getFullYear();
  }

  function setStatus(msg, ms = 0) {
    const s = el("status");
    if (!s) return;
    s.textContent = msg || "";
    if (ms > 0) setTimeout(() => s && (s.textContent = ""), ms);
  }

  // -------------------------
  // NBU rates (EUR + USD)
  // -------------------------
  let RATE_EUR = null; // UAH per 1 EUR
  let RATE_USD = null; // UAH per 1 USD

  async function fetchNbuRate(code) {
    const url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${code}&json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`NBU fetch failed (${code}): ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || !data[0] || typeof data[0].rate !== "number") {
      throw new Error(`Unexpected NBU response for ${code}`);
    }
    return { rate: data[0].rate, date: data[0].exchangedate || "", cc: data[0].cc || code };
  }

  function nbuCacheKey(code) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `cc_import_cost_nbu_${code}_${y}-${m}-${day}`;
  }

  function updateRatesBadge() {
    const b = el("ratesBadge");
    if (!b) return;

    if (!Number.isFinite(RATE_EUR) || !Number.isFinite(RATE_USD)) {
      b.textContent = tr("import.rates_badge_na", "Курс НБУ: —", "NBU rates: —");
      return;
    }

    b.textContent = tr(
      "import.rates_badge",
      "Курс НБУ: EUR {eur} • USD {usd}",
      "NBU: EUR {eur} • USD {usd}",
      { eur: RATE_EUR.toFixed(2), usd: RATE_USD.toFixed(2) }
    );
  }

  async function loadRates({ force = false } = {}) {
    const meta = el("rateMeta");
    try {
      if (meta) meta.textContent = tr("import.meta_loading", "Завантажую курси НБУ…", "Loading NBU rates…");

      const loadOne = async (code) => {
        const key = nbuCacheKey(code);
        if (!force) {
          const cached = localStorage.getItem(key);
          if (cached) return JSON.parse(cached);
        }
        const obj = await fetchNbuRate(code);
        localStorage.setItem(key, JSON.stringify(obj));
        return obj;
      };

      const eur = await loadOne("EUR");
      const usd = await loadOne("USD");

      RATE_EUR = eur.rate;
      RATE_USD = usd.rate;

      if (el("eurRate")) el("eurRate").value = String(RATE_EUR).replace(".", ",");

      if (meta) {
        meta.textContent = tr(
          "import.meta_loaded",
          "НБУ: EUR {eur} • USD {usd} • дата: {date}",
          "NBU: EUR {eur} • USD {usd} • date: {date}",
          { eur: eur.rate.toFixed(4), usd: usd.rate.toFixed(4), date: eur.date || usd.date || "" }
        );
      }

      updateRatesBadge();
      return { eur, usd };
    } catch (e) {
      console.warn(e);
      if (meta) meta.textContent = tr(
        "import.meta_failed",
        "Не вдалося отримати курси НБУ. Перезавантаж сторінку.",
        "Couldn’t load NBU rates. Please refresh the page."
      );
      updateRatesBadge();
      return null;
    }
  }

  // -------------------------
  // Conversions
  // -------------------------
  function toUAH(value, currency) {
    if (!Number.isFinite(value)) return NaN;
    if (currency === "UAH") return value;
    if (currency === "EUR") return Number.isFinite(RATE_EUR) ? value * RATE_EUR : NaN;
    if (currency === "USD") return Number.isFinite(RATE_USD) ? value * RATE_USD : NaN;
    return NaN;
  }

  function fromUAH(uah, currency) {
    if (!Number.isFinite(uah)) return NaN;
    if (currency === "UAH") return uah;
    if (currency === "EUR") return Number.isFinite(RATE_EUR) ? uah / RATE_EUR : NaN;
    if (currency === "USD") return Number.isFinite(RATE_USD) ? uah / RATE_USD : NaN;
    return NaN;
  }

  // -------------------------
  // Customs model (aligned to defs)
  // Base ставки + пороги 3000/3500, Кдвигун=см3/1000, Квік=min1..max15 full calendar years
  // EV: duty=0, excise=1€ * kWh
  // VAT: 20% * (customsValue + duty + excise)
  // -------------------------
  function exciseBaseRateEUR(fuelType, engineCm3) {
    if (fuelType === "ev") return 0;
    const cm3 = Number.isFinite(engineCm3) ? engineCm3 : 0;

    // diesel thresholds: 3500
    if (fuelType === "diesel") return cm3 > 3500 ? 150 : 75;

    // petrol / hybrid thresholds: 3000
    return cm3 > 3000 ? 100 : 50;
  }

  function ageCoef(yearMade) {
    const y = parseInt(yearMade, 10);
    const yr = currentYear();
    if (!Number.isFinite(y) || y <= 1900) return 1;

    // Квік = кількість повних календарних років з року, наступного за роком виробництва,
    // до року визначення ставки; min=1, max=15
    const coef = yr - y;
    return clamp(coef, 1, 15);
  }

  function calcCustomsEUR({ carPriceEur, deliveryEur, fuelType, engineCm3, yearMade, batteryKwh }) {
    const customsValue = carPriceEur + deliveryEur;

    const duty = fuelType === "ev" ? 0 : customsValue * 0.1;

    let excise = 0;
    let base = 0;
    let acoef = 0;

    if (fuelType === "ev") {
      const kwh = Number.isFinite(batteryKwh) ? batteryKwh : 0;
      // акциз EV = 1€ за 1 кВт·год
      excise = Math.max(0, kwh) * 1;
    } else {
      const engK = Math.max(0, engineCm3) / 1000;
      base = exciseBaseRateEUR(fuelType, engineCm3);
      acoef = ageCoef(yearMade);
      excise = base * engK * acoef;
    }

    const vat = (customsValue + duty + excise) * 0.2;
    const totalCustoms = duty + excise + vat;

    return { customsValue, duty, excise, vat, totalCustoms, baseRate: base, ageCoef: acoef };
  }

  // -------------------------
  // UI helpers
  // -------------------------
  function clearAllBlocks({ keepTotals = false } = {}) {
    if (el("customsKpi")) el("customsKpi").innerHTML = "";
    if (el("kpiGrid")) el("kpiGrid").innerHTML = "";
    if (el("humanExplain")) el("humanExplain").innerHTML = "";
    if (el("status")) el("status").textContent = "";

    if (!keepTotals) {
      if (el("totalMain")) el("totalMain").textContent = "—";
      if (el("totalSub")) el("totalSub").textContent = "—";
    }
  }

  function labelForPart(k) {
    const uk = {
      carUAH: "Ціна авто",
      deliveryUAH: "Доставка",
      customsUAH: "Розмитнення",
      certUAH: "Сертифікація",
      regUAH: "Реєстрація",
      serviceUAH: "Перше ТО",
      agentUAH: "Комісія/посередник",
      extraUAH: "Непередбачені",
    };
    const en = {
      carUAH: "Car price",
      deliveryUAH: "Delivery",
      customsUAH: "Customs & taxes",
      certUAH: "Certification",
      regUAH: "Registration",
      serviceUAH: "First service",
      agentUAH: "Agent fee",
      extraUAH: "Contingency",
    };
    return (LANG === "en" ? en[k] : uk[k]) || k;
  }

  function vWithUah(uah, displayCur) {
    const main = fmtCur(fromUAH(uah, displayCur), displayCur);
    const sub = `<span class="imp-small-uah">≈ ${fmtUAH(uah)}</span>`;
    return `${main}${sub}`;
  }

  // -------------------------
  // Render: TOTAL
  // -------------------------
  function renderTotal({ totalUAH, parts, customsUAH, displayCur }) {
    const totalMain = el("totalMain");
    const totalSub = el("totalSub");

    if (totalMain) totalMain.innerHTML = vWithUah(totalUAH, displayCur);

    const customsPct = totalUAH > 0 ? (customsUAH / totalUAH) * 100 : 0;

    const topKey = Object.entries(parts)
      .filter(([, v]) => Number.isFinite(v) && v > 0)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const topLabel = topKey ? labelForPart(topKey) : "—";

    const subParts = [];
    subParts.push(
      tr("import.sub_customs_pct", "розмитнення: {pct}%", "customs: {pct}%", { pct: fmt(customsPct, 1) })
    );
    if (topLabel && topLabel !== "—") {
      subParts.push(
        tr("import.sub_biggest", "найбільша стаття: {x}", "largest item: {x}", {
          x: String(topLabel).toLowerCase(),
        })
      );
    }

    if (totalSub) totalSub.textContent = subParts.filter(Boolean).join(" • ");
  }

  // -------------------------
  // Render: KPI GRID
  // -------------------------
  function renderKpiGrid({ parts, totalUAH, displayCur }) {
    const box = el("kpiGrid");
    if (!box) return;

    const pctOf = (v) => (totalUAH > 0 ? (v / totalUAH) * 100 : 0);

    const otherUAH = (parts.serviceUAH || 0) + (parts.agentUAH || 0) + (parts.extraUAH || 0);

    const rows = [
      { t: labelForPart("carUAH"), v: parts.carUAH, sub: `${fmt(pctOf(parts.carUAH), 1)}%` },
      { t: labelForPart("deliveryUAH"), v: parts.deliveryUAH, sub: `${fmt(pctOf(parts.deliveryUAH), 1)}%` },
      { t: labelForPart("customsUAH"), v: parts.customsUAH, sub: `${fmt(pctOf(parts.customsUAH), 1)}%` },
      { t: labelForPart("certUAH"), v: parts.certUAH, sub: `${fmt(pctOf(parts.certUAH), 1)}%` },
      { t: labelForPart("regUAH"), v: parts.regUAH, sub: `${fmt(pctOf(parts.regUAH), 1)}%` },
      {
        t: tr("import.kpi_other", "Інше (ТО/комісія/непередбачені)", "Other (service/fees/contingency)"),
        v: otherUAH,
        sub: `${fmt(pctOf(otherUAH), 1)}%`,
      },
    ];

    box.innerHTML = rows
      .map(
        (r) => `
      <div class="imp-kpi-card">
        <div class="imp-kpi-title">${r.t}</div>
        <div class="imp-kpi-value">${vWithUah(r.v, displayCur)}</div>
        ${r.sub ? `<div class="imp-kpi-sub">${r.sub}</div>` : ""}
      </div>
    `
      )
      .join("");
  }

  // -------------------------
  // Render: CUSTOMS PRETTY
  // -------------------------
  function renderCustomsPretty({ eurRate, customs, displayCur }) {
    const box = el("customsKpi");
    if (!box) return;

    const uah = (x) => x * eurRate;

    const cards = [
      {
        t: tr("import.c_customs_value", "Митна вартість", "Customs value"),
        vU: uah(customs.customsValue),
        sub: tr("import.c_customs_value_sub", "Ціна авто + доставка", "Car price + delivery"),
      },
      {
        t: tr("import.c_duty", "Мито (10%)", "Duty (10%)"),
        vU: uah(customs.duty),
        sub:
          customs.duty === 0
            ? tr("import.c_ev_duty_zero", "Для EV мито = 0", "For EV duty = 0")
            : tr("import.c_duty_sub", "10% від митної вартості", "10% of customs value"),
      },
      {
        t: tr("import.c_excise", "Акциз", "Excise"),
        vU: uah(customs.excise),
        sub:
          customs.excise === 0
            ? tr("import.c_ev_excise_zero", "Для EV залежить від kWh (1€ × kWh)", "For EV depends on kWh (1€ × kWh)")
            : tr("import.c_excise_sub", "База: {base}€ • коеф. віку: {coef}", "Base: {base}€ • age coef: {coef}", {
                base: customs.baseRate,
                coef: customs.ageCoef,
              }),
      },
      {
        t: tr("import.c_vat", "ПДВ (20%)", "VAT (20%)"),
        vU: uah(customs.vat),
        sub: tr("import.c_vat_sub", "20% від (митна вартість + мито + акциз)", "20% of (customs value + duty + excise)"),
      },
    ];

    const cardsHtml = cards
      .map(
        (c) => `
        <div class="imp-kpi-card">
          <div class="imp-kpi-title">${c.t}</div>
          <div class="imp-kpi-value">${vWithUah(c.vU, displayCur)}</div>
          <div class="imp-kpi-sub">${c.sub}</div>
        </div>
      `
      )
      .join("");

    box.innerHTML = `
      <div class="imp-kpi-grid">
        ${cardsHtml}
        <div class="imp-kpi-card imp-kpi-wide">
          <div class="imp-kpi-title">${tr("import.c_total_customs", "Разом розмитнення", "Total customs & taxes")}</div>
          <div class="imp-kpi-value">${vWithUah(uah(customs.totalCustoms), displayCur)}</div>
          <div class="imp-kpi-sub">
            <b>${tr("import.note", "Примітка:", "Note:")}</b>
            ${tr(
              "import.c_note",
              "формула: мито=10% (EV=0), акциз=база×(см³/1000)×Квік (EV: 1€×kWh), ПДВ=20% від (митна вартість+мито+акциз).",
              "formula: duty=10% (EV=0), excise=base×(cc/1000)×age (EV: 1€×kWh), VAT=20% of (customs value+duty+excise)."
            )}
          </div>
        </div>
      </div>
    `;
  }

  // -------------------------
  // Human explain
  // -------------------------
  function buildVerdict(totalUAH, parts) {
    const entries = Object.entries(parts).filter(([, v]) => Number.isFinite(v) && v > 0);
    entries.sort((a, b) => b[1] - a[1]);

    const top = entries[0] || ["—", 0];
    const topPct = totalUAH > 0 ? (top[1] / totalUAH) * 100 : 0;

    const customs = parts.customsUAH || 0;
    const customsPct = totalUAH > 0 ? (customs / totalUAH) * 100 : 0;

    let title = tr("import.v_title_ok", "✅ Оцінка “під ключ” готова", "✅ Turnkey estimate is ready");
    let hint = tr(
      "import.v_hint_default",
      "Це орієнтовний розрахунок. Реальні суми залежать від документів, митної оцінки, пільг і додаткових послуг.",
      "This is an estimate. Real totals depend on documents, customs valuation, exemptions and additional services."
    );

    if (customsPct > 45) {
      title = tr("import.v_title_warn", "⚠️ Розмитнення займає велику частку", "⚠️ Customs take a large share");
      hint = tr(
        "import.v_hint_warn",
        "Якщо сума здається завеликою — перевір обʼєм/рік/тип пального та значення витрат.",
        "If it looks too high, double-check engine size, year, fuel type and extra costs."
      );
    }

    return {
      title,
      short: tr(
        "import.v_short",
        "Розмитнення: {pct}% від загальної суми.",
        "Customs: {pct}% of total.",
        { pct: fmt(customsPct, 1) }
      ),
      long: tr(
        "import.v_long",
        "Найбільша стаття: <b>{label}</b> — {val} ({pct}%).",
        "Largest item: <b>{label}</b> — {val} ({pct}%).",
        { label: labelForPart(top[0]), val: fmtUAH(top[1]), pct: fmt(topPct, 1) }
      ),
      hint,
    };
  }

  function renderHumanExplainBlock({ verdict }) {
  const box = el("humanExplain");
  if (!box) return;

  box.innerHTML = `
    <b>${verdict.title}</b><br>
    ${verdict.short}<br>
    ${verdict.long}<br>
    <span style="color:#6b7280">${verdict.hint}</span>
  `;

  /* 🔥 soft highlight when customs too big */
  box.classList.toggle(
    "is-warn",
    verdict.title.includes("⚠️")
  );
}
  // -------------------------
  // Share / copy (без змін + batteryKwh)
  // -------------------------
  function buildShareLink() {
    const p = new URLSearchParams();
    const fields = [
      "carPriceVal","carPriceCur","yearMade","fuelType","engineCm3","batteryKwh",
      "deliveryVal","deliveryCur","certUah","regUah","serviceUah","agentUah","extraPct","auto_calc_toggle"
    ];

    for (const id of fields) {
      const node = el(id);
      if (!node) continue;
      if (node.type === "checkbox") p.set(id, node.checked ? "1" : "0");
      else {
        const v = String(node.value || "").trim();
        if (v) p.set(id, v);
      }
    }
    return `${location.origin}${location.pathname}?${p.toString()}`;
  }

  async function copyText(text) {
    if (!text) return;
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  async function shareLink() {
    const url = buildShareLink();
    try {
      await copyText(url);
      setStatus(tr("import.link_copied", "Посилання скопійовано ✅", "Link copied ✅"), 2500);
    } catch {
      prompt(tr("import.copy_link_prompt", "Скопіюй посилання:", "Copy this link:"), url);
    }
  }

  async function copyResult() {
    const totalMain = el("totalMain")?.innerText?.trim() || "";
    const totalSub = el("totalSub")?.innerText?.trim() || "";
    const kpi = el("kpiGrid")?.innerText?.trim() || "";
    const explain = el("humanExplain")?.innerText?.trim() || "";
    const customs = el("customsKpi")?.innerText?.trim() || "";
    const out = [totalMain, totalSub, kpi, explain, customs].filter(Boolean).join("\n\n").trim();

    if (!out) {
      setStatus(tr("import.no_result_copy", "Немає результату для копіювання.", "No result to copy."), 2500);
      return;
    }

    try {
      await copyText(out);
      setStatus(tr("import.result_copied", "Результат скопійовано ✅", "Result copied ✅"), 2500);
    } catch {
      prompt(tr("import.copy_result_prompt", "Скопіюй результат:", "Copy the result:"), out);
    }
  }

  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    if (![...q.keys()].length) return;

    const setVal = (id) => {
      const node = el(id);
      if (!node) return;
      if (!q.has(id)) return;
      if (node.type === "checkbox") node.checked = q.get(id) === "1";
      else node.value = q.get(id);
    };

    [
      "carPriceVal","carPriceCur","yearMade","fuelType","engineCm3","batteryKwh",
      "deliveryVal","deliveryCur","certUah","regUah","serviceUah","agentUah","extraPct","auto_calc_toggle"
    ].forEach(setVal);

    syncFuelUI();
    doCalc({ soft: true });
  }

  // -------------------------
  // Fuel UI (engine vs battery)
  // -------------------------
  function syncFuelUI() {
    const ft = el("fuelType")?.value || "petrol";
    const engineWrap = el("engineWrap");
    const batteryWrap = el("batteryWrap");

    if (ft === "ev") {
      if (engineWrap) engineWrap.style.display = "none";
      if (batteryWrap) batteryWrap.style.display = "";
    } else {
      if (engineWrap) engineWrap.style.display = "";
      if (batteryWrap) batteryWrap.style.display = "none";
    }
  }

  // -------------------------
  // Core calc
  // -------------------------
  function doCalc({ soft = false } = {}) {
    if (!Number.isFinite(RATE_EUR) || RATE_EUR <= 0) {
      clearAllBlocks();
      setStatus(tr(
        "import.rates_not_ready",
        "Курси НБУ ще не завантажились. Спробуй через секунду або перезавантаж сторінку.",
        "NBU rates are not ready yet. Try again in a second or refresh the page."
      ));
      return;
    }

    const displayCur = el("carPriceCur")?.value || "EUR";

    // car price -> UAH -> EUR for customs model
    const carVal = parseNum(el("carPriceVal")?.value);
    const carCur = el("carPriceCur")?.value || "EUR";
    const carUAH = toUAH(carVal, carCur);

    if (!Number.isFinite(carUAH) || carUAH <= 0) {
      clearAllBlocks();
      if (!soft) setStatus(tr("import.err_car_price", "Заповни коректну ціну авто.", "Enter a valid car price."));
      return;
    }

    // delivery -> UAH
    const deliveryVal = parseNum(el("deliveryVal")?.value);
    const deliveryCur = el("deliveryCur")?.value || "EUR";
    const deliveryRaw = Number.isFinite(deliveryVal) ? deliveryVal : 0;
    const deliveryUAH = toUAH(deliveryRaw, deliveryCur);

    if (!Number.isFinite(deliveryUAH)) {
      clearAllBlocks();
      if (!soft) setStatus(tr("import.err_delivery", "Перевір доставку та валюту доставки.", "Check delivery and its currency."));
      return;
    }

    // Convert to EUR for customs calc base (because base rates are in EUR)
    const carEur = carUAH / RATE_EUR;
    const deliveryEur = deliveryUAH / RATE_EUR;

    const fuelType = el("fuelType")?.value || "petrol";
    const engineCm3 = parseNum(el("engineCm3")?.value);
    const engine = Number.isFinite(engineCm3) ? engineCm3 : 0;
    const batteryKwh = parseNum(el("batteryKwh")?.value);
    const kwh = Number.isFinite(batteryKwh) ? batteryKwh : 0;
    const yearMade = (el("yearMade")?.value || "").trim();

    const certUAH = Number.isFinite(parseNum(el("certUah")?.value)) ? parseNum(el("certUah")?.value) : 0;
    const regUAH = Number.isFinite(parseNum(el("regUah")?.value)) ? parseNum(el("regUah")?.value) : 0;
    const serviceUAH = Number.isFinite(parseNum(el("serviceUah")?.value)) ? parseNum(el("serviceUah")?.value) : 0;
    const agentUAH = Number.isFinite(parseNum(el("agentUah")?.value)) ? parseNum(el("agentUah")?.value) : 0;
    const extraPct = parseNum(el("extraPct")?.value);
    const extraP = Number.isFinite(extraPct) ? extraPct : 0;

    const customs = calcCustomsEUR({
      carPriceEur: carEur,
      deliveryEur,
      fuelType,
      engineCm3: engine,
      yearMade,
      batteryKwh: kwh,
    });

    const customsUAH = customs.totalCustoms * RATE_EUR;

    const subtotalUAH = carUAH + deliveryUAH + customsUAH + certUAH + regUAH + serviceUAH + agentUAH;
    const extraUAH = subtotalUAH * (clamp(extraP, 0, 50) / 100);
    const totalUAH = subtotalUAH + extraUAH;

    const parts = { carUAH, deliveryUAH, customsUAH, certUAH, regUAH, serviceUAH, agentUAH, extraUAH };

    renderTotal({ totalUAH, parts, customsUAH, displayCur });
    renderKpiGrid({ parts, totalUAH, displayCur });
    renderCustomsPretty({ eurRate: RATE_EUR, customs, displayCur });

    const verdict = buildVerdict(totalUAH, parts);
    renderHumanExplainBlock({ verdict });

    setStatus(tr("import.done", "Розрахунок готовий ✅", "Calculation ready ✅"), 2000);
  }

  function resetAll() {
    ["carPriceVal","yearMade","engineCm3","batteryKwh","deliveryVal","certUah","regUah","serviceUah","agentUah","extraPct"]
      .forEach((id) => { const n = el(id); if (n) n.value = ""; });

    if (el("carPriceCur")) el("carPriceCur").value = "EUR";
    if (el("fuelType")) el("fuelType").value = "petrol";
    if (el("deliveryCur")) el("deliveryCur").value = "EUR";

    syncFuelUI();
    clearAllBlocks();
    setStatus("");
  }

  function bindAutoCalc() {
    const nodes = document.querySelectorAll(".imp-shell input, .imp-shell select");
    nodes.forEach((n) => {
      n.addEventListener("input", () => { if (isAuto()) doCalc({ soft: true }); });
      n.addEventListener("change", () => { if (isAuto()) doCalc({ soft: true }); });
    });
  }

  window.addEventListener("DOMContentLoaded", async () => {
    await loadRates({ force: false });

    el("rateBtn")?.addEventListener("click", async () => {
      await loadRates({ force: true });
      if (isAuto()) doCalc({ soft: true });
    });

    el("fuelType")?.addEventListener("change", () => {
      syncFuelUI();
      if (isAuto()) doCalc({ soft: true });
    });

    el("calcBtn")?.addEventListener("click", () => doCalc({ soft: false }));
    el("resetBtn")?.addEventListener("click", resetAll);
    el("shareBtn")?.addEventListener("click", shareLink);
    

    document.addEventListener("keydown", (e) => { if (e.key === "Enter") doCalc({ soft: false }); });

    syncFuelUI();
    bindAutoCalc();
    applyFromUrl();

    if (isAuto() && (el("carPriceVal")?.value || "").trim()) doCalc({ soft: true });
  });
})();
