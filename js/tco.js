/* =========================================================
   TCO калькулятор (EV vs ДВЗ) — tco.js
   - вартість володіння: ціна покупки + енергія + сервіс + страховка + податок + шини − перепродаж
   - 12 валют (курс НБУ): при зміні валюти суми перераховуються
   - одиниці (км/милі, л/100 км, mpg, галони, кВт·год/100 км …): число при зміні одиниці НЕ змінюється
   - стан у localStorage, відновлення зі старих посилань (?cur=…&mileage=…)
========================================================= */

(() => {
  const el = (id) => document.getElementById(id);
  const tr = (key, vars) => (typeof window.t === "function" ? window.t(key, vars) : String(key));
  const LOCALE = typeof window.i18nLocale === "function" ? window.i18nLocale() : "uk-UA";

  // ---------- Валюта ----------
  const CURRENCIES = ["UAH", "USD", "EUR", "GBP", "CHF", "PLN", "CZK", "HUF", "RON", "CAD", "AUD", "TRY"];
  const CUR_FLAG = { UAH: "ua", USD: "us", EUR: "eu", GBP: "gb", CHF: "ch", PLN: "pl", CZK: "cz", HUF: "hu", RON: "ro", CAD: "ca", AUD: "au", TRY: "tr" };
  const RATES_KEY = "fuel_nbu_rates_v1"; // спільний кеш курсів з калькулятором пального
  const STATE_KEY = "tco_state_v2";

  let currency = "UAH";
  const rates = { UAH: 1 }; // грн за 1 одиницю валюти (НБУ)

  const curLabel = () => (currency === "UAH" ? tr("common.unit_uah") : currency);
  const curSub = (s) => (currency === "UAH" ? s : String(s).replace(/грн|UAH/g, currency));
  const trc = (k, v) => curSub(tr(k, v));

  // ---------- Одиниці (усередині: км, л/100 км, ціна за літр, кВт·год/100 км) ----------
  const KM_PER_MILE = 1.609344;
  const L_PER_GAL_US = 3.785411784;
  const L_PER_GAL_UK = 4.54609;

  const DIST = { km: { f: 1, key: "common.unit_km" }, mi: { f: KM_PER_MILE, key: "fuel.unit_mi" } };
  const ICE_CONS = {
    l100km: { key: "fuel.cons_l100km", toL100: (v) => v },
    kml: { key: "fuel.cons_kml", toL100: (v) => 100 / v },
    l100mi: { key: "fuel.cons_l100mi", toL100: (v) => v / KM_PER_MILE },
    mpgus: { key: "fuel.cons_mpgus", toL100: (v) => 235.215 / v },
    mpguk: { key: "fuel.cons_mpguk", toL100: (v) => 282.481 / v },
  };
  const FUEL_PRICE = {
    l: { key: "fuel.price_l", toL: (v) => v, fromL: (p) => p },
    galus: { key: "fuel.price_galus", toL: (v) => v / L_PER_GAL_US, fromL: (p) => p * L_PER_GAL_US },
    galuk: { key: "fuel.price_galuk", toL: (v) => v / L_PER_GAL_UK, fromL: (p) => p * L_PER_GAL_UK },
  };

  // Паливо ДВЗ: підписи та підказки в полях (приклади в грн). Ціна палива вводиться вручну — вона часто змінюється
  const FUEL_TYPES = {
    petrol: { key: "tco.fuel_petrol", gen: "tco.fuel_gen_petrol", ph: { cons: "7", price: "60" } },
    diesel: { key: "tco.fuel_diesel", gen: "tco.fuel_gen_diesel", ph: { cons: "6", price: "65" } },
    lpg: { key: "tco.fuel_lpg", gen: "tco.fuel_gen_lpg", ph: { cons: "9", price: "30" } },
  };
  const fuelType = () => (FUEL_TYPES[el("ice_fuel")?.value] ? el("ice_fuel").value : "petrol");
  const EV_CONS = {
    kwh100km: { key: "tco.ev_u_kwh100km", to100: (v) => v },
    kwh100mi: { key: "tco.ev_u_kwh100mi", to100: (v) => v / KM_PER_MILE },
    mikwh: { key: "tco.ev_u_mikwh", to100: (v) => 100 / (v * KM_PER_MILE) },
    kmkwh: { key: "tco.ev_u_kmkwh", to100: (v) => 100 / v },
  };
  const UNIT_SELECTS = [
    ["dist_unit", DIST, "km", trc],
    ["ice_consUnit", ICE_CONS, "l100km", trc],
    ["fuel_priceUnit", FUEL_PRICE, "l", trc],
    ["ev_consUnit", EV_CONS, "kwh100km", trc],
  ];

  // ---------- Поля ----------
  const MONEY = [
    "ice_price", "fuel_price", "ice_service", "ice_insurance", "ice_tax", "ice_tyres",
    "ev_price", "electric_price", "ev_public_price", "ev_service", "ev_insurance", "ev_tax", "ev_tyres",
  ];
  const PLAIN = ["mileage", "years", "ice_consumption", "ev_consumption", "ice_resale", "ev_resale", "ev_home_share", "loan_down", "loan_rate", "loan_term"];
  const LOAN_IDS = ["loan_down", "loan_rate", "loan_term"];
  const FIELDS = [...MONEY, ...PLAIN];
  const SELECT_IDS = UNIT_SELECTS.map((u) => u[0]);
  const EXTRA_IDS = ["ice_tax", "ice_tyres", "ice_resale", "ev_tax", "ev_tyres", "ev_resale"];

  // українською кома — десятковий роздільник (1,6), англійською — роздільник тисяч (1,000,000)
  const IS_EN = !String(LOCALE).toLowerCase().startsWith("uk");
  const NUM_CHARS = IS_EN ? /[\d.]/ : /[\d.,]/;
  const NON_NUM_CHARS = IS_EN ? /[^\d.]/g : /[^\d.,]/g;

  const parseNum = (v) => {
    const t = String(v ?? "").replace(/\s+/g, "");
    const s = IS_EN ? t.replace(/,/g, "") : t.replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const num = (id) => parseNum(el(id)?.value);
  const fmt = (v) => Number(v).toLocaleString(LOCALE, { maximumFractionDigits: 0 });
  const fmt1 = (v) => Number(v).toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmt2 = (v) => Number(v).toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // 5 значущих цифр: 13 372,69 → 13373, 1,00288 → 1,0029 (дрібні ціни за літр/кВт·год не втрачають точності)
  const roundMoney = (v) => Number(v.toPrecision(5));

  // ---------- Пробіли між тисячами у полях вводу: 1 000 000 ----------
  const groupNumber = (raw) => {
    const s = String(raw ?? "").replace(NON_NUM_CHARS, "");
    const m = s.match(/^(\d*)([.,]?)([\s\S]*)$/);
    const intPart = m[1].replace(/\B(?=(\d{3})+(?!\d))/g, IS_EN ? "," : " ");
    const frac = m[3].replace(/[^\d]/g, "");
    return intPart + m[2] + frac;
  };

  // форматує значення під час вводу, зберігаючи позицію курсора
  function formatWhileTyping(inp) {
    const old = inp.value;
    const pos = inp.selectionStart ?? old.length;
    const digitsBefore = old.slice(0, pos).replace(NON_NUM_CHARS, "").length;
    const next = groupNumber(old);
    if (next === old) return;
    inp.value = next;
    let seen = 0;
    let i = 0;
    for (; i < next.length && seen < digitsBefore; i++) if (NUM_CHARS.test(next[i])) seen++;
    try {
      inp.setSelectionRange(i, i);
    } catch {}
  }

  const formatAllFields = () =>
    FIELDS.forEach((id) => {
      const inp = el(id);
      if (inp && inp.value) inp.value = groupNumber(inp.value);
    });
  const codeOf = (c) => (c === "UAH" ? tr("common.unit_uah") : c);
  const money = (v, c = currency) => `${fmt(v)} ${codeOf(c)}`;

  const autoEl = () => el("tcoAutoCalc");
  const isAutoOn = () => !!autoEl()?.checked;

  // ---------- Курси НБУ ----------
  let ratesPromise = null;
  function loadRates() {
    if (ratesPromise) return ratesPromise;
    ratesPromise = (async () => {
      try {
        const c = JSON.parse(localStorage.getItem(RATES_KEY) || "null");
        if (c && c.map && Date.now() - c.t < 6 * 3600 * 1000) {
          Object.assign(rates, c.map);
          return true;
        }
      } catch {}
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 7000);
        const res = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json", { signal: ctl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error("http " + res.status);
        const data = await res.json();
        const map = {};
        data.forEach((r) => {
          if (CURRENCIES.includes(r.cc) && Number(r.rate) > 0) map[r.cc] = Number(r.rate);
        });
        Object.assign(rates, map);
        try {
          localStorage.setItem(RATES_KEY, JSON.stringify({ t: Date.now(), map }));
        } catch {}
        return true;
      } catch {
        ratesPromise = null;
        return false;
      }
    })();
    return ratesPromise;
  }

  // ---------- Тост ----------
  let toastTimer = null;
  function showToast(msg, isError = false) {
    const box = el("tcoToast");
    if (!box) return;
    box.innerHTML = isError ? `<div class="result-error">⚠️ ${msg}</div>` : `<div class="result-item">✅ ${msg}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (box.innerHTML = ""), 3000);
  }

  // ---------- Розрахунок ----------
  // ефективна ціна електроенергії: частка зарядки вдома × ціна вдома + решта × ціна на станціях
  // (порожня частка = 100% вдома; без ціни на станціях змішування не застосовується)
  function evEnergyMix(home) {
    const raw = (el("ev_home_share")?.value || "").trim();
    const share = raw === "" ? 100 : Math.min(100, Math.max(0, num("ev_home_share")));
    const pub = num("ev_public_price");
    const mixed = pub > 0 && share < 100;
    return { share, pub, mixed, price: mixed ? (home * share) / 100 + (pub * (100 - share)) / 100 : home };
  }

  // що ще треба заповнити, щоб результат був повним (id полів)
  function missingFields() {
    const miss = [];
    if (!(num("mileage") > 0)) miss.push("mileage");
    if (!(Math.floor(num("years")) >= 1)) miss.push("years");
    if (!(num("ice_price") > 0)) miss.push("ice_price");
    if (!(num("ice_consumption") > 0)) miss.push("ice_consumption");
    if (!(num("fuel_price") > 0)) miss.push("fuel_price");
    if (!(num("ev_price") > 0)) miss.push("ev_price");
    if (!(num("ev_consumption") > 0)) miss.push("ev_consumption");
    if (!(evEnergyMix(num("electric_price")).price > 0)) miss.push("electric_price");
    return miss;
  }

  // назва поля з підпису (без одиниць у дужках та зірочки)
  const labelOf = (id) =>
    (document.querySelector(`label[for="${id}"]`)?.textContent || id).replace(/\([^)]*\)/g, "").replace(/\*/g, "").replace(/\s+/g, " ").trim();

  function readCar(prefix, energyPriceId, consId, consUnits, energyPriceToCur) {
    const rawCons = num(consId);
    const cons = rawCons > 0 ? consUnits[el(prefix + "_consUnit").value]?.[prefix === "ice" ? "toL100" : "to100"](rawCons) : 0;
    const rawEnergy = num(energyPriceId);
    return {
      price: num(prefix + "_price"),
      cons: Number.isFinite(cons) ? cons : 0,
      energyPrice: energyPriceToCur(rawEnergy),
      service: num(prefix + "_service"),
      insurance: num(prefix + "_insurance"),
      tax: num(prefix + "_tax"),
      tyres: num(prefix + "_tyres"),
      resale: Math.min(100, Math.max(0, num(prefix + "_resale"))),
    };
  }

  function compute() {
    const kmInput = num("mileage");
    const unitKm = DIST[el("dist_unit")?.value]?.f || 1;
    const km = kmInput * unitKm;
    const years = Math.max(0, Math.floor(num("years")));
    if (!(km > 0) || years < 1) return null;

    const fuelUnit = FUEL_PRICE[el("fuel_priceUnit")?.value] || FUEL_PRICE.l;
    const ice = readCar("ice", "fuel_price", "ice_consumption", ICE_CONS, (v) => (v > 0 ? fuelUnit.toL(v) : 0));
    const mix = evEnergyMix(num("electric_price"));
    const ev = readCar("ev", "electric_price", "ev_consumption", EV_CONS, () => mix.price);

    const energyY = (c) => (km / 100) * c.cons * c.energyPrice;
    const upkeepY = (c) => c.service + c.insurance + c.tax + c.tyres;
    const runY = (c) => energyY(c) + upkeepY(c);
    // кредит: однакові умови для обох авто; відсотки лише за період володіння (залишок боргу погашається з перепродажу)
    const loan = { down: Math.min(100, Math.max(0, num("loan_down"))), rate: num("loan_rate"), term: num("loan_term") };
    const loanOn = loan.rate > 0 && loan.term > 0;
    const interestUpTo = (c, y) => {
      if (!loanOn) return 0;
      const principal = c.price * (1 - loan.down / 100);
      if (!(principal > 0)) return 0;
      const r = loan.rate / 100 / 12;
      const n = Math.max(1, Math.round(loan.term * 12));
      const m = Math.min(n, y * 12);
      const pay = (principal * r) / (1 - Math.pow(1 + r, -n));
      const balance = principal * Math.pow(1 + r, m) - (pay * (Math.pow(1 + r, m) - 1)) / r;
      return Math.max(0, pay * m - (principal - balance));
    };
    const cum = (c, y) => c.price + interestUpTo(c, y) + runY(c) * y - (y === years ? (c.price * c.resale) / 100 : 0);

    const rows = (c) => ({
      price: c.price,
      resale: (c.price * c.resale) / 100,
      energy: energyY(c) * years,
      service: c.service * years,
      insurance: c.insurance * years,
      tax: c.tax * years,
      tyres: c.tyres * years,
      interest: interestUpTo(c, years),
      total: cum(c, years),
    });

    return { km, kmInput, years, ice, ev, mix, loan, loanOn, energyY, runY, cum, rows: { ice: rows(ice), ev: rows(ev) } };
  }

  function altCurrencies() {
    const out = [];
    for (const c of ["UAH", "USD", "EUR"]) if (c !== currency && rates[c] > 0 && out.length < 2) out.push(c);
    return currency === "UAH" || rates[currency] > 0 ? out : [];
  }
  const toAlt = (v, alt) => (v * (rates[currency] || 1)) / rates[alt];

  function resultHtml(d) {
    const { km, kmInput, years, ice, ev } = d;
    const r = d.rows;
    const alts = altCurrencies();

    const iceTotal = r.ice.total;
    const evTotal = r.ev.total;
    const diff = iceTotal - evTotal; // >0 => EV вигідніше
    const absDiff = Math.abs(diff);
    const kmTotal = km * years;

    // окупність (за поточних цін, без перепродажу)
    let breakEven;
    if (ev.price <= ice.price) {
      breakEven = tr("tco.payback_not_needed");
    } else {
      const saving = (d.runY(ice) - d.runY(ev)) / km; // економія на 1 км
      if (!(saving > 0)) {
        breakEven = tr("tco.ev_not_payback");
      } else {
        const kmBe = (ev.price - ice.price) / saving;
        breakEven = tr("tco.payback_km_years_value", { km: fmt(kmBe), years: fmt1(kmBe / km) });
      }
    }

    // окупність у роках: різниця в ціні покупки / щорічна економія на енергії та утриманні
    // (як і в кілометрах — без перепродажу, щоб обидві плитки збігалися); 0 — EV не дорожчий при покупці
    let paybackBase = null;
    if (ev.price <= ice.price) {
      paybackBase = 0;
    } else {
      const savingY = d.runY(ice) - d.runY(ev);
      if (savingY > 0) paybackBase = Math.round(((ev.price - ice.price) / savingY) * 10) / 10;
    }

    const kpi = (cls, title, badge, value) => `
      <div class="tco-kpi ${cls}">
        <div class="tco-kpi-head"><div class="tco-kpi-title">${title}</div><span class="cc-badge">${badge}</span></div>
        <div class="tco-kpi-value">${money(value)}</div>
        <div class="tco-kpi-meta">${tr("tco.kpi_meta")} · ${tr("tco.cost_per_km")}: ${fmt2(value / kmTotal)} ${codeOf(currency)}</div>
      </div>`;

    const altNote = alts.length ? `<div class="tco-note">≈ ${alts.map((a) => money(toAlt(absDiff, a), a)).join(" · ")}</div>` : "";

    // структура витрат
    const lines = [
      ["row_price", "price"], ["row_resale", "resale", -1], ["row_energy", "energy"], ["row_service", "service"],
      ["row_insurance", "insurance"], ["row_tax", "tax"], ["row_tyres", "tyres"], ["row_interest", "interest"],
    ];
    const breakdownRows = lines
      .filter(([, k]) => k === "price" || r.ice[k] > 0 || r.ev[k] > 0)
      .map(([key, k, sign]) => {
        const cell = (v) => (sign === -1 && v > 0 ? `−${money(v)}` : money(v));
        return `<tr><td>${tr("tco." + key)}</td><td>${cell(r.ice[k])}</td><td>${cell(r.ev[k])}</td></tr>`;
      })
      .join("");

    // таблиця по роках
    let breakYear = null;
    let yearRows = "";
    for (let y = 1; y <= years; y++) {
      const iy = d.cum(ice, y);
      const ey = d.cum(ev, y);
      const dy = iy - ey;
      if (breakYear === null && dy > 0) breakYear = y;
      yearRows += `<tr class="${breakYear === y ? "is-win" : ""}">
        <td>${y}</td><td>${money(iy)}</td><td>${money(ey)}</td>
        <td><b>${money(Math.abs(dy))}</b> (${dy > 0 ? tr("tco.ev_plus") : tr("tco.ice_plus")})</td>
        ${alts.map((a) => `<td>${money(toAlt(Math.abs(dy), a), a)}</td>`).join("")}
      </tr>`;
    }
    // пояснення до стовпців Δ: курс НБУ (грн за 1 одиницю валюти)
    const rateCodes = [currency, ...alts].filter((c, i, a) => c !== "UAH" && rates[c] > 0 && a.indexOf(c) === i);
    const nbuNote = alts.length
      ? `<div class="tco-note tco-nbu">${tr("tco.nbu_conv_note", {
          rates: rateCodes.map((c) => `1 ${c} = ${fmt2(rates[c])} ${codeOf("UAH")}`).join(" · "),
        })}</div>`
      : "";

    const chart = chartHtml(d);
    const extraNotes =
      (d.mix.mixed
        ? `<div class="tco-note">${tr("tco.charge_note", { price: fmt2(d.mix.price), cur: codeOf(currency), home: fmt(d.mix.share), pub: fmt(100 - d.mix.share) })}</div>`
        : "") +
      (d.loanOn
        ? `<div class="tco-note">${tr("tco.loan_note", { down: fmt(d.loan.down), rate: fmt1(d.loan.rate), term: fmt1(d.loan.term), ice: money(r.ice.interest), ev: money(r.ev.interest) })}</div>`
        : "");

    const yearTitle = breakYear ? tr("tco.break_even_title_win", { year: breakYear }) : tr("tco.break_even_title_no", { years });

    return `
      <div class="tco-kpis">
        ${kpi(iceTotal <= evTotal ? "is-win" : "is-lose", `${tr("tco.k_ice")} ${tr("tco.sum_for_years", { years })}`, tr(FUEL_TYPES[fuelType()].key), iceTotal)}
        ${kpi(evTotal <= iceTotal ? "is-win" : "is-lose", `${tr("tco.k_ev")} ${tr("tco.sum_for_years", { years })}`, "EV", evTotal)}
      </div>

      <div class="result-hero tco-diff ${diff > 0 ? "is-ev" : "is-ice"}">
        <div class="result-hero-label">${tr("tco.diff")}</div>
        <div class="result-hero-value result-hero-value--text">${money(absDiff)} · ${diff > 0 ? tr("tco.ev_better") : tr("tco.ice_better")}</div>
        ${altNote}
      </div>

      <div class="result-grid tco-tiles">
        <div class="result-item">
          <div class="result-label">${tr("tco.payback_km_years")}</div>
          <div class="result-value is-long">${breakEven}</div>
        </div>
        <div class="result-item">
          <div class="result-label">${tr("tco.payback_years")}</div>
          <div class="result-value is-long">${
            paybackBase === null
              ? tr("tco.ev_not_payback")
              : paybackBase === 0
              ? tr("tco.less_than_year")
              : tr("tco.payback_years_value", { years: fmt1(paybackBase) })
          }</div>
        </div>
      </div>
      <div class="tco-note">${tr("tco.assessment_note")} ${tr("tco.for_mileage", { km: fmt(kmInput) })}</div>
      ${extraNotes}

      ${chart}

      <h3 class="tco-h3">${tr("tco.breakdown_title", { years })}</h3>
      <div class="tco-table-wrap">
        <table class="tco-table">
          <thead><tr><th></th><th>${tr("tco.ice_sum")}</th><th>${tr("tco.ev_sum")}</th></tr></thead>
          <tbody>${breakdownRows}
            <tr class="tco-total"><td>${tr("tco.row_total")}</td><td>${money(iceTotal)}</td><td>${money(evTotal)}</td></tr>
          </tbody>
        </table>
      </div>

      <h3 class="tco-h3">${yearTitle}</h3>
      ${nbuNote}
      <div class="tco-table-wrap">
        <table class="tco-table">
          <thead><tr>
            <th>${tr("tco.year")}</th><th>${tr("tco.ice_sum")}</th><th>${tr("tco.ev_sum")}</th><th>${tr("tco.diff")}</th>
            ${alts.map((a) => `<th>Δ ${codeOf(a)}</th>`).join("")}
          </tr></thead>
          <tbody>${yearRows}</tbody>
        </table>
      </div>
      <div class="tco-note">${tr("tco.cumulative_note")}</div>`;
  }

  // ---------- Графік накопичення витрат (SVG, згруповані стовпці по роках) ----------
  function chartHtml(d) {
    const { years, ice, ev } = d;
    const W = 640;
    const H = 280;
    const m = { l: 62, r: 18, t: 22, b: 38 };
    const pts = [];
    for (let y = 0; y <= years; y++) pts.push({ y, i: d.cum(ice, y), e: d.cum(ev, y) });

    // вісь Y від нуля (стовпці), «круглі» поділки: крок 1 / 2 / 2,5 / 5 × 10^k
    let hi = Math.max(...pts.flatMap((p) => [p.i, p.e])) * 1.06 || 1;
    const rawStep = hi / 4;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const norm = rawStep / mag;
    const niceStep = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    hi = Math.ceil(hi / niceStep) * niceStep;
    const ticks = [];
    for (let v = 0; v <= hi + niceStep / 2; v += niceStep) ticks.push(v);

    const slot = (W - m.l - m.r) / (years + 1); // слот на кожен рік (0 = покупка)
    const cx = (k) => m.l + slot * k + slot / 2;
    const bw = Math.min(26, slot * 0.38);
    const Y = (v) => H - m.b - ((H - m.t - m.b) * v) / hi;
    const compact = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });
    const tickText = (v) => (niceStep >= 1000 ? compact.format(v) : Number(v).toLocaleString(LOCALE, { maximumFractionDigits: niceStep >= 1 ? 0 : 2 }));

    const grid = ticks
      .map((v) => `<line x1="${m.l}" y1="${Y(v).toFixed(1)}" x2="${W - m.r}" y2="${Y(v).toFixed(1)}" class="tco-grid"/><text x="${m.l - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" class="tco-tick">${tickText(v)}</text>`)
      .join("");

    const step = years > 12 ? 2 : 1;
    const xt = pts
      .filter((p) => p.y % step === 0 || p.y === years)
      .map((p) => `<text x="${cx(p.y).toFixed(1)}" y="${H - 14}" text-anchor="middle" class="tco-tick">${p.y}</text>`)
      .join("");

    const label = (p) => (p.y ? tr("tco.year") + " " + p.y : tr("tco.chart_year0"));
    const bars = pts
      .map((p) => {
        const x = cx(p.y);
        const rect = (xx, v, cls) =>
          `<rect x="${xx.toFixed(1)}" y="${Y(v).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, Y(0) - Y(v)).toFixed(1)}" rx="2" class="tco-bar ${cls}"><title>${label(p)}: ${money(v)}</title></rect>`;
        return rect(x - bw - 1, p.i, "tco-ice") + rect(x + 1, p.e, "tco-ev");
      })
      .join("");

    // перетин (перша зміна знаку різниці) — позначка між групами стовпців
    let cross = null;
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1].i - pts[k - 1].e;
      const b = pts[k].i - pts[k].e;
      if ((a < 0 && b > 0) || (a > 0 && b < 0)) {
        cross = { y: pts[k - 1].y + a / (a - b), evWins: b > 0 };
        break;
      }
    }
    const crossSvg = cross
      ? `<line x1="${cx(cross.y).toFixed(1)}" y1="${m.t - 6}" x2="${cx(cross.y).toFixed(1)}" y2="${H - m.b}" class="tco-cross"/>`
      : "";
    const crossText = cross
      ? tr(cross.evWins ? "tco.chart_cross" : "tco.chart_cross_ice", { years: fmt1(cross.y) })
      : tr("tco.chart_nocross");

    return `
      <h3 class="tco-h3">${tr("tco.chart_title")}</h3>
      <div class="tco-legend"><span><i class="tco-dot tco-ice"></i>${tr("tco.k_ice")}</span><span><i class="tco-dot tco-ev"></i>${tr("tco.k_ev")}</span><span class="tco-axis-note">${tr("tco.chart_axis", { cur: codeOf(currency) })}</span></div>
      <div class="tco-chart">
        <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${tr("tco.chart_title")}" preserveAspectRatio="xMidYMid meet">
          ${grid}${xt}${bars}${crossSvg}
        </svg>
      </div>
      <div class="tco-note">${crossText}</div>`;
  }

  function calculate() {
    const box = el("result");
    if (!box) return;
    const miss = missingFields();
    const d = miss.length ? null : compute();
    box.innerHTML = d ? resultHtml(d) : missingHtml(miss);
    saveState();
  }

  const hasEnoughData = () => missingFields().length === 0;

  // підказка: що саме ще треба заповнити (якщо користувач уже щось ввів)
  function missingHtml(miss) {
    const touched = FIELDS.some((id) => (el(id)?.value || "").trim() !== "");
    if (!touched || !miss.length) return `<p class="results-hint">${tr("tco.hint_enter_and_calc")}</p>`;
    // однакові підписи в картках розрізняємо назвою авто: «ДВЗ: Ціна авто», «Електро: Ціна авто»
    const named = (id) => {
      const side = id.startsWith("ice_") || id === "fuel_price" ? tr("tco.k_ice") : id.startsWith("ev_") || id === "electric_price" ? tr("tco.k_ev") : "";
      return side ? `${side}: ${labelOf(id)}` : labelOf(id);
    };
    return `<p class="results-hint">${tr("tco.missing", { list: miss.map(named).join(", ") })}</p>`;
  }

  let autoTimer = null;
  function autoCalc() {
    if (!isAutoOn()) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => (hasEnoughData() ? calculate() : (saveState(), showHint())), 200);
  }

  function showHint() {
    const box = el("result");
    if (box) box.innerHTML = missingHtml(missingFields());
  }

  // ---------- Підписи / валюта ----------
  function flagImg(code) {
    return `<img class="cur-flag" src="/assets/flags/${CUR_FLAG[code]}.png" width="20" height="14" alt="" loading="lazy" decoding="async">`;
  }

  function currencyName(code, names) {
    try {
      const nm = names ? names.of(code) : "";
      return nm ? nm.charAt(0).toUpperCase() + nm.slice(1) : "";
    } catch {
      return "";
    }
  }

  const curBtn = el("cur_btn");
  const curList = el("cur_list");
  const currencySelect = el("currency_select");

  function buildCurrencyOptions() {
    let names = null;
    try {
      names = new Intl.DisplayNames([LOCALE.split("-")[0]], { type: "currency" });
    } catch {}
    if (currencySelect) {
      currencySelect.innerHTML = CURRENCIES.map((c) => {
        const nm = currencyName(c, names);
        return `<option value="${c}">${c}${nm ? " — " + nm : ""}</option>`;
      }).join("");
      currencySelect.value = currency;
    }
    if (curList) {
      curList.innerHTML = CURRENCIES.map((c) => {
        const nm = currencyName(c, names);
        return `<li role="option" tabindex="-1" data-code="${c}" aria-selected="${c === currency}">${flagImg(c)}<span class="cur-item-code">${c}</span><span class="cur-item-name">${nm}</span></li>`;
      }).join("");
    }
  }

  function closeCurrencyList() {
    if (!curList || curList.hidden) return;
    curList.hidden = true;
    curBtn?.setAttribute("aria-expanded", "false");
  }

  function syncCurrencyUi() {
    const flag = el("cur_flag");
    if (flag) flag.src = `/assets/flags/${CUR_FLAG[currency] || "ua"}.png`;
    const code = el("cur_code");
    if (code) code.textContent = currency;
    curList?.querySelectorAll("li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === currency)));
    if (currencySelect) currencySelect.value = currency;
  }

  function buildUnitOptions() {
    UNIT_SELECTS.forEach(([id, table, def, label]) => {
      const sel = el(id);
      if (!sel) return;
      const keep = sel.value;
      sel.innerHTML = Object.entries(table).map(([k, u]) => `<option value="${k}">${label(u.key)}</option>`).join("");
      sel.value = table[keep] ? keep : def;
    });
  }

  function buildFuelOptions() {
    const sel = el("ice_fuel");
    if (!sel) return;
    const keep = sel.value;
    sel.innerHTML = Object.entries(FUEL_TYPES).map(([k, u]) => `<option value="${k}">${tr(u.key)}</option>`).join("");
    sel.value = FUEL_TYPES[keep] ? keep : "petrol";
  }

  function applyFuelType() {
    const ft = FUEL_TYPES[fuelType()];
    document.querySelectorAll("[data-fuel-gen]").forEach((n) => (n.textContent = tr(ft.gen)));
    const badge = el("ice_badge");
    if (badge) badge.textContent = tr(ft.key);

    const cons = el("ice_consumption");
    if (cons) cons.placeholder = (cons.placeholder.match(/^\D*/) || [""])[0] + ft.ph.cons;
    const price = el("fuel_price");
    if (price) {
      const prefix = ((price.dataset.ph0 ?? price.placeholder).match(/^\D*/) || [""])[0];
      price.dataset.ph0 = prefix + ft.ph.price;
    }
  }

  function applyLabels() {
    document.querySelectorAll("[data-cur]").forEach((n) => (n.textContent = curLabel()));
    document.querySelectorAll("[data-cur-code]").forEach((n) => (n.textContent = currency));
    document.querySelectorAll("[data-dist]").forEach((n) => {
      n.textContent = tr(DIST[el("dist_unit")?.value]?.key || "common.unit_km");
    });

    // підказки в полях: приклади задані в грн — масштабуємо до вибраної валюти
    MONEY.forEach((id) => {
      const inp = el(id);
      if (!inp) return;
      if (inp.dataset.ph0 === undefined) inp.dataset.ph0 = inp.placeholder;
      const m = inp.dataset.ph0.match(/^(\D*)([\d.,]+)$/);
      const r = rates[currency];
      if (!m || currency === "UAH" || !(r > 0)) {
        inp.placeholder = inp.dataset.ph0;
        return;
      }
      inp.placeholder = m[1] + String(Number((Number(m[2].replace(",", ".")) / r).toPrecision(2)));
    });

    applyFuelType();
    // підказки з урахуванням типу палива: після зміни ph0 перераховуємо ще раз
    (() => {
      const inp = el("fuel_price");
      const m = inp?.dataset.ph0?.match(/^(\D*)([\d.,]+)$/);
      const r = rates[currency];
      if (inp && m) inp.placeholder = currency === "UAH" || !(r > 0) ? inp.dataset.ph0 : m[1] + String(Number((Number(m[2].replace(",", ".")) / r).toPrecision(2)));
    })();
    buildUnitOptions();
    syncCurrencyUi();

    // примітка про курс
    const note = el("tcoRateNote");
    if (note) {
      note.textContent =
        currency !== "UAH" && rates[currency] > 0
          ? tr("tco.nbu_rate", { cur: currency, rate: fmt2(rates[currency]) })
          : "";
    }
  }

  // opts.restore — відновлення стану: суми вже у цій валюті
  async function setCurrency(code, opts = {}) {
    if (!CURRENCIES.includes(code)) code = "UAH";
    const prev = currency;

    if (opts.restore) {
      currency = code;
      applyLabels();
      if (code !== "UAH" && !(rates[code] > 0)) {
        if (await loadRates()) {
          applyLabels();
          applyFuelType();
          if (!opts.silent && hasEnoughData()) calculate();
        }
      }
      return;
    }

    if (code === prev) return;
    if (code !== "UAH" && !(rates[code] > 0)) await loadRates();
    if (code !== "UAH" && !(rates[code] > 0)) {
      syncCurrencyUi();
      showToast(tr("tco.toast_rate_failed"), true);
      return;
    }

    const prevRate = rates[prev];
    currency = code;
    if (prevRate > 0 && rates[code] > 0) {
      // базова сума в грн запам'ятовується, щоб переходи між валютами не накопичували похибку округлення
      MONEY.forEach((id) => {
        const inp = el(id);
        const v = num(id);
        if (!inp || !(v > 0)) return;
        const base = inp.dataset.baseUah && inp.dataset.shown === inp.value ? Number(inp.dataset.baseUah) : v * prevRate;
        const shown = groupNumber(String(roundMoney(base / rates[code])));
        inp.value = shown;
        inp.dataset.baseUah = String(base);
        inp.dataset.shown = shown;
      });
    }
    applyLabels();
    saveState();
    if (hasEnoughData()) calculate();
  }

  // ---------- Стан ----------
  function collectState() {
    const s = { currency, auto: isAutoOn(), f: {}, u: {} };
    FIELDS.forEach((id) => {
      const v = (el(id)?.value || "").trim();
      if (v) s.f[id] = v;
    });
    SELECT_IDS.forEach((id) => (s.u[id] = el(id)?.value));
    s.fuel = fuelType();
    return s;
  }

  function saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(collectState()));
    } catch {}
  }

  function applyState(s) {
    if (!s || typeof s !== "object") return;
    const auto = autoEl();
    if (auto) auto.checked = s.auto !== false;
    UNIT_SELECTS.forEach(([id, table]) => {
      const sel = el(id);
      if (sel && s.u && table[s.u[id]]) sel.value = s.u[id];
    });
    FIELDS.forEach((id) => {
      const inp = el(id);
      if (inp) inp.value = (s.f && s.f[id]) || "";
    });
    const fsel = el("ice_fuel");
    if (fsel) fsel.value = FUEL_TYPES[s.fuel] ? s.fuel : "petrol";
    formatAllFields();
    setCurrency(CURRENCIES.includes(s.currency) ? s.currency : "UAH", { restore: true, silent: true });
    openExtraIfFilled();
  }

  function openExtraIfFilled() {
    const loanCard = el("loan_card");
    if (loanCard && LOAN_IDS.some((id) => (el(id)?.value || "").trim() !== "")) loanCard.open = true;
    ["ice", "ev"].forEach((p) => {
      const card = el(p + "_extra");
      if (card && EXTRA_IDS.filter((id) => id.startsWith(p + "_")).some((id) => (el(id)?.value || "").trim() !== "")) card.open = true;
    });
  }

  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    if (!["cur", "fuel", ...FIELDS].some((k) => q.has(k))) return false;
    const s = { currency: q.get("cur") || "UAH", auto: true, f: {}, u: {}, fuel: q.get("fuel") || "petrol" };
    FIELDS.forEach((id) => {
      if (q.has(id)) s.f[id] = q.get(id);
    });
    applyState(s);
    return true;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return false;
      applyState(JSON.parse(raw));
      return true;
    } catch {
      return false;
    }
  }

  // ---------- Скидання / копіювання ----------
  function resetAll() {
    FIELDS.forEach((id) => {
      const inp = el(id);
      if (inp) inp.value = "";
    });
    UNIT_SELECTS.forEach(([id, , def]) => {
      const sel = el(id);
      if (sel) sel.value = def;
    });
    ["ice", "ev"].forEach((p) => {
      const card = el(p + "_extra");
      if (card) card.open = false;
    });
    const loanCard = el("loan_card");
    if (loanCard) loanCard.open = false;
    const fsel = el("ice_fuel");
    if (fsel) fsel.value = "petrol";
    applyLabels();
    showHint();
    saveState();
  }

  async function copyResult() {
    const box = el("result");
    const text = (box?.innerText || "").trim();
    if (!text || !compute()) {
      showToast(tr("tco.toast_copy_failed"), true);
      return;
    }
    const head =
      `${tr("tco.copy_title")}\n` +
      `${tr("tco.label_mileage")}: ${el("mileage").value} ${tr(DIST[el("dist_unit").value].key)}\n` +
      `${tr("tco.label_years")}: ${el("years").value}\n` +
      `${tr("tco.label_fuel")}: ${tr(FUEL_TYPES[fuelType()].key)}\n\n`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(head + text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = head + text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      showToast(tr("tco.toast_copied"));
    } catch {
      showToast(tr("tco.toast_copy_failed"), true);
    }
  }

  // ---------- Приклад: типовий сценарій «ДВЗ проти EV» ----------
  // суми задані в грн і перераховуються у вибрану валюту; одиниці скидаються до км / л/100 км / кВт·год/100 км
  const EXAMPLE = {
    mileage: 15000, years: 5,
    ice_price: 800000, ice_consumption: 7, fuel_price: 60, ice_service: 20000, ice_insurance: 15000,
    ice_tax: 3000, ice_tyres: 5000, ice_resale: 35,
    ev_price: 1100000, ev_consumption: 18, electric_price: 6, ev_public_price: 14, ev_home_share: 70,
    ev_service: 8000, ev_insurance: 18000, ev_tyres: 6000, ev_resale: 40,
  };

  async function fillExample() {
    if (currency !== "UAH" && !(rates[currency] > 0)) {
      await loadRates();
      if (!(rates[currency] > 0)) {
        showToast(tr("tco.toast_rate_failed"), true);
        return;
      }
    }
    const rate = rates[currency] || 1;

    FIELDS.forEach((id) => {
      const inp = el(id);
      if (!inp) return;
      inp.value = "";
      delete inp.dataset.baseUah;
      delete inp.dataset.shown;
    });
    UNIT_SELECTS.forEach(([id, , def]) => {
      const sel = el(id);
      if (sel) sel.value = def;
    });
    const fsel = el("ice_fuel");
    if (fsel) fsel.value = "petrol";

    Object.entries(EXAMPLE).forEach(([id, v]) => {
      const inp = el(id);
      if (!inp) return;
      if (MONEY.includes(id)) {
        const shown = groupNumber(String(roundMoney(v / rate)));
        inp.value = shown;
        inp.dataset.baseUah = String(v); // точна сума в грн — без похибки при подальшій зміні валюти
        inp.dataset.shown = shown;
      } else {
        inp.value = groupNumber(String(v));
      }
    });

    const loanCard = el("loan_card");
    if (loanCard) loanCard.open = false;
    applyLabels();
    openExtraIfFilled();
    calculate();
  }

  // ---------- Події ----------
  function bindUI() {
    buildCurrencyOptions();
    buildUnitOptions();

    curBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!curList) return;
      const open = curList.hidden;
      curList.hidden = !open;
      curBtn.setAttribute("aria-expanded", String(open));
      if (open) curList.querySelector('li[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    });
    curList?.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-code]");
      if (!li) return;
      closeCurrencyList();
      setCurrency(li.dataset.code);
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#cur_dd")) closeCurrencyList();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCurrencyList();
    });

    buildFuelOptions();

    el("ice_fuel")?.addEventListener("change", () => {
      applyLabels();
      saveState();
      autoCalc();
    });

    FIELDS.forEach((id) => {
      const inp = el(id);
      if (!inp) return;
      inp.addEventListener("input", () => formatWhileTyping(inp));
      inp.addEventListener("input", autoCalc);
      inp.addEventListener("change", autoCalc);
    });

    // зміна одиниць не чіпає введені числа — лише їхнє трактування
    SELECT_IDS.forEach((id) => {
      el(id)?.addEventListener("change", () => {
        if (id === "dist_unit") applyLabels();
        autoCalc();
        saveState();
      });
    });

    autoEl()?.addEventListener("change", () => {
      saveState();
      if (isAutoOn() && hasEnoughData()) calculate();
    });

    el("tcoCalcBtn")?.addEventListener("click", calculate);
    el("tcoExampleBtn")?.addEventListener("click", fillExample);
    el("tcoResetBtn")?.addEventListener("click", resetAll);
    el("tcoTopReset")?.addEventListener("click", resetAll);
    el("tcoCopyBtn")?.addEventListener("click", copyResult);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !isAutoOn() && !e.target.closest("#cur_dd, summary")) calculate();
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    bindUI();
    if (!applyFromUrl()) loadState();
    applyLabels();
    openExtraIfFilled();
    if (hasEnoughData()) calculate();
    else showHint();
    loadRates().then((ok) => {
      if (ok) {
        applyLabels();
        if (hasEnoughData()) calculate();
      }
    });
  });
})();
