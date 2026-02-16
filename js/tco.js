(() => {
  const el = (id) => document.getElementById(id);

  // rate = UAH за 1 одиницю валюти
  const currencies = {
    UAH: { symbol: "₴", rate: 1 },
    USD: { symbol: "$", rate: 40 }, // fallback
    EUR: { symbol: "€", rate: 43 }, // fallback
  };

  let currentCurrency = "UAH";

  // --- i18n helper ---
  const tr = (key, vars) => (typeof window.t === "function" ? window.t(key, vars) : String(key));

  // Поля, які є "грошима" і мають конвертуватися при зміні валюти
  const moneyFields = [
    "ice_price",
    "fuel_price",
    "ice_service",
    "ev_price",
    "electric_price",
    "ev_service",
  ];

  // Усі поля, які впливають на перерахунок
  const inputFields = [
    "ice_price",
    "ice_consumption",
    "fuel_price",
    "ice_service",
    "ev_price",
    "ev_consumption",
    "electric_price",
    "ev_service",
    "mileage",
    "years",
  ];

  const parseNum = (v) => {
    const s = String(v || "").replace(/\s+/g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const fmt = (n) => {
    const sign = n < 0 ? "-" : "";
    n = Math.abs(n);
    const s = Math.round(n).toString();
    return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const curSym = () => currencies[currentCurrency]?.symbol || "₴";

  // ✅ У твоєму HTML чекбокс має id="evAutoCalc"
  const autoEl = () => el("evAutoCalc");
  const isAutoOn = () => !!autoEl()?.checked;

  const hasEnoughData = () =>
    ["mileage", "years", "ice_price", "ev_price"].every(
      (id) => parseNum(el(id)?.value) > 0
    );

  function updateCurrencyLabels() {
    document.querySelectorAll(".curSym").forEach((node) => {
      node.textContent = curSym();
    });
  }

  // Конвертуємо значення в інпутах при зміні валюти
  function convertMoney(from, to) {
    moneyFields.forEach((id) => {
      const input = el(id);
      if (!input) return;

      const raw = (input.value || "").trim();
      if (!raw) return;

      const value = parseNum(raw);
      if (!value) return;

      const uah = value * (currencies[from]?.rate ?? 1);
      const converted = uah / (currencies[to]?.rate ?? 1);

      const rounded = Math.round(converted * 100) / 100;
      input.value = String(rounded).replace(".", ",");
    });
  }

  // ===== helpers for dynamic "other currencies" =====
  const otherCurrencies = (base) => {
    if (base === "USD") return ["UAH", "EUR"];
    if (base === "EUR") return ["UAH", "USD"];
    return ["USD", "EUR"]; // base = UAH
  };

  const toCurrency = (value, from, to) => {
    const uah = value * (currencies[from]?.rate ?? 1);
    return uah / (currencies[to]?.rate ?? 1);
  };

  const fmtCur = (value, code) => {
    const sym = currencies[code]?.symbol || "";
    return `${sym} ${fmt(value)}`;
  };

  async function loadNbuRates() {
    const hint = el("tcoCurrencyHint");
    if (hint) hint.textContent = "";

    try {
      const res = await fetch(
        "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json",
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const pick = (code) =>
        data.find((x) => String(x.cc || "").toUpperCase() === code);

      const usd = pick("USD");
      const eur = pick("EUR");

      if (usd?.rate) currencies.USD.rate = Number(usd.rate);
      if (eur?.rate) currencies.EUR.rate = Number(eur.rate);

      const d = usd?.exchangedate || eur?.exchangedate || "";

      if (hint) {
        const datePart = d ? " (" + d + ")" : "";
        hint.textContent =
          tr("currency.nbu_rate_prefix", { datePart }) +
          ` USD=${currencies.USD.rate.toFixed(2)}, EUR=${currencies.EUR.rate.toFixed(2)}`;
      }

      if (isAutoOn()) calculate();
    } catch {
      if (hint) {
        hint.textContent = tr("currency.nbu_unavailable_cached");
      }
    }
  }

  function calculate() {
    const result = el("result");
    const yearly = el("tcoYearly");

    const kmYear = parseNum(el("mileage")?.value);

    // ✅ FIX: роки робимо цілими (і не даємо 0/негатив)
    const yearsRaw = parseNum(el("years")?.value);
    const yearsInt = Math.max(0, Math.floor(yearsRaw));

    if (!kmYear || !yearsInt) {
      if (result) result.innerHTML = tr("tco.fill_km_year_and_years");
      if (yearly) yearly.innerHTML = "";
      return;
    }

    // ICE
    const icePrice = parseNum(el("ice_price")?.value);
    const iceCons = parseNum(el("ice_consumption")?.value);
    const fuelPrice = parseNum(el("fuel_price")?.value);
    const iceServicePerYear = parseNum(el("ice_service")?.value);

    // EV
    const evPrice = parseNum(el("ev_price")?.value);
    const evCons = parseNum(el("ev_consumption")?.value);
    const elPrice = parseNum(el("electric_price")?.value);
    const evServicePerYear = parseNum(el("ev_service")?.value);

    const iceTotalFor = (kmY, y) => {
      const iceEnergyY = (kmY / 100) * iceCons * fuelPrice;
      return icePrice + iceEnergyY * y + iceServicePerYear * y;
    };

    const evTotalFor = (kmY, y) => {
      const evEnergyY = (kmY / 100) * evCons * elPrice;
      return evPrice + evEnergyY * y + evServicePerYear * y;
    };

    // Окупність у роках (точно), null якщо не окупається в межах yearsInt
    // 0 = "< 1 року"
    const paybackYearsFor = (kmY) => {
      let prevD = null;
      for (let y = 1; y <= yearsInt; y++) {
        const d = iceTotalFor(kmY, y) - evTotalFor(kmY, y); // >0 => EV вигідніше
        if (prevD !== null && prevD < 0 && d > 0) {
          const frac = (0 - prevD) / (d - prevD);
          const precise = (y - 1) + frac;
          return Math.round(precise * 10) / 10;
        }
        if (prevD === null && d > 0) return 0;
        prevD = d;
      }
      return null;
    };

    const kmTotal = kmYear * yearsInt;
    const iceTotal = iceTotalFor(kmYear, yearsInt);
    const evTotal = evTotalFor(kmYear, yearsInt);

    const icePerKm = kmTotal > 0 ? iceTotal / kmTotal : 0;
    const evPerKm = kmTotal > 0 ? evTotal / kmTotal : 0;

    const diff = iceTotal - evTotal; // >0 => EV вигідніше
    const absDiff = Math.abs(diff);

    // Дві "інші" валюти (без дублю основної)
    const [alt1, alt2] = otherCurrencies(currentCurrency);
    const diffAlt1 = toCurrency(absDiff, currentCurrency, alt1);
    const diffAlt2 = toCurrency(absDiff, currentCurrency, alt2);

    // Окупність (км/роки)
    let breakEvenText = "";
    if (evPrice <= icePrice) {
      breakEvenText =
        tr("tco.payback_not_needed");
    } else if (evPerKm >= icePerKm) {
      breakEvenText = tr("tco.ev_not_payback");
    } else {
      const savingPerKm = icePerKm - evPerKm;
      const kmBe = (evPrice - icePrice) / savingPerKm;
      const yearsBe = kmBe / kmYear;
      breakEvenText = tr("tco.payback_km_years_value", { km: fmt(kmBe), years: yearsBe.toFixed(1) });
    }

    // Окупність (роки)
    const paybackBase = paybackYearsFor(kmYear);

    // ✅ класи для підсвіток KPI
    const iceKpiClass = iceTotal <= evTotal ? "is-win" : "is-lose";
    const evKpiClass = evTotal <= iceTotal ? "is-win" : "is-lose";

    // ✅ клас для підсвітки "Різниця"
    const diffClass = diff > 0 ? "is-ev" : "is-ice";

    if (result) {
      result.innerHTML = `
        <div class="tcoResultWrap">

          <div class="tcoResultGrid">
            <div class="tcoKpiCard ${iceKpiClass}">
              <div class="tcoKpiHead">
                <div class="tcoKpiTitle">🚗 ${tr("tco.ice_sum")} ${tr("tco.sum_for_years", { years: yearsInt })}</div>
                <span class="tcoBadgeMini">ICE</span>
              </div>
              <div class="tcoKpiValue">${curSym()} ${fmt(iceTotal)}</div>
              <div class="tcoKpiMeta">${tr("tco.kpi_meta")}</div>
            </div>

            <div class="tcoKpiCard ${evKpiClass}">
              <div class="tcoKpiHead">
                <div class="tcoKpiTitle">⚡ ${tr("tco.ev_sum")} ${tr("tco.sum_for_years", { years: yearsInt })}</div>
                <span class="tcoBadgeMini">EV</span>
              </div>
              <div class="tcoKpiValue">${curSym()} ${fmt(evTotal)}</div>
              <div class="tcoKpiMeta">${tr("tco.kpi_meta")}</div>
            </div>
          </div>

          <div class="tcoBlock">
            <div class="tcoBlockTitle">${tr("tco.diff")}</div>
            <div class="tcoBlockMain ${diffClass}">
              ${curSym()} ${fmt(absDiff)} (${diff > 0 ? tr("tco.ev_better") : tr("tco.ice_better")})
            </div>
            <div class="tcoDiffNote">≈ ${fmtCur(diffAlt1, alt1)} · ${fmtCur(diffAlt2, alt2)}</div>
          </div>

          <div class="tcoRow2">
            <div class="tcoBlock">
              <div class="tcoBlockTitle">${tr("tco.payback_km_years")}</div>
              <div class="tcoBlockMain">${breakEvenText}</div>
              <div class="tcoBlockSub">${tr("tco.assessment_note")}</div>
            </div>

            <div class="tcoBlock">
              <div class="tcoBlockTitle">${tr("tco.payback_years")}</div>
              <div class="tcoBlockMain">${
                paybackBase === null
                  ? tr("tco.ev_not_payback")
                  : paybackBase === 0
                  ? tr("tco.less_than_year")
                  : tr("tco.payback_years_value", { years: paybackBase.toFixed(1) })
              }</div>
              <div class="tcoBlockSub">${tr("tco.for_mileage", { km: fmt(kmYear) })}</div>
            </div>
          </div>

        </div>
      `;
    }

    // ===== Таблиця по роках + 2 динамічні колонки в "інших" валютах =====
    if (yearly) {
      let breakEvenYear = null;
      let rows = "";

      for (let y = 1; y <= yearsInt; y++) {
        const iceY = iceTotalFor(kmYear, y);
        const evY = evTotalFor(kmYear, y);
        const d = iceY - evY; // >0 EV +
        const dAbs = Math.abs(d);

        const dAlt1 = toCurrency(dAbs, currentCurrency, alt1);
        const dAlt2 = toCurrency(dAbs, currentCurrency, alt2);

        if (breakEvenYear === null && d > 0) breakEvenYear = y;

        rows += `
          <tr class="${breakEvenYear === y ? "is-win" : ""}">
            <td>${y}</td>
            <td>${fmtCur(iceY, currentCurrency)}</td>
            <td>${fmtCur(evY, currentCurrency)}</td>
            <td><b>${fmtCur(dAbs, currentCurrency)}</b> (${d > 0 ? tr("tco.ev_plus") : tr("tco.ice_plus")})</td>
            <td>${fmtCur(dAlt1, alt1)}</td>
            <td>${fmtCur(dAlt2, alt2)}</td>
          </tr>
        `;
      }

      const title = breakEvenYear
        ? tr("tco.break_even_title_win", { year: breakEvenYear })
        : tr("tco.break_even_title_no", { years: yearsInt });

      yearly.innerHTML = `
        <h4>${title}</h4>
        <table>
          <thead>
            <tr>
              <th>${tr("tco.year")}</th>
              <th>${tr("tco.ice_sum")}</th>
              <th>${tr("tco.ev_sum")}</th>
              <th>${tr("tco.diff")}</th>
              <th>Δ ${alt1}</th>
              <th>Δ ${alt2}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="muted">${tr("tco.cumulative_note")}</div>
      `;
    }
  }

  function applyFromUrl() {
    const params = new URLSearchParams(location.search);

    const cur = params.get("cur");
    if (cur && currencies[cur]) currentCurrency = cur;

    inputFields.forEach((id) => {
      if (params.has(id)) {
        const node = el(id);
        if (node) node.value = params.get(id);
      }
    });

    const curSel = el("currencySelect");
    if (curSel) curSel.value = currentCurrency;

    updateCurrencyLabels();

    if (hasEnoughData()) calculate();
  }

  function bindAutoCalcInputs() {
    inputFields.forEach((id) => {
      const node = el(id);
      if (!node) return;

      const handler = () => {
        if (!isAutoOn()) return;
        calculate();
      };

      node.addEventListener("input", handler);
      node.addEventListener("change", handler);
    });
  }

  function bindUI() {
    // Валюта
    const curSel = el("currencySelect");
    if (curSel) {
      curSel.value = currentCurrency;
      curSel.addEventListener("change", (e) => {
        const next = e.target.value;
        if (!currencies[next]) return;

        const prev = currentCurrency;
        if (prev === next) return;

        convertMoney(prev, next);
        currentCurrency = next;
        updateCurrencyLabels();

        // ✅ FIX: якщо вже є дані — перерахувати навіть коли авто вимкнено
        if (hasEnoughData()) calculate();
      });
    }

    // Авто-розрахунок: увімкнули -> одразу порахувати
    autoEl()?.addEventListener("change", () => {
      if (isAutoOn()) calculate();
    });

    // Кнопки
    el("tcoCalcBtn")?.addEventListener("click", calculate);

    el("tcoResetBtn")?.addEventListener("click", () => {
      inputFields.forEach((id) => {
        const node = el(id);
        if (node) node.value = "";
      });

      const res = el("result");
      if (res) res.innerHTML = tr("tco.hint_enter_and_calc");
      const tbl = el("tcoYearly");
      if (tbl) tbl.innerHTML = "";
    });

    el("tcoShareBtn")?.addEventListener("click", async () => {
      const params = new URLSearchParams();
      params.set("cur", currentCurrency);

      inputFields.forEach((id) => {
        const node = el(id);
        const v = (node?.value || "").trim();
        if (v) params.set(id, v);
      });

      const base = `${location.origin}${location.pathname}`;
      const url = `${base}?${params.toString()}`;

      try {
        await navigator.clipboard.writeText(url);
        alert(tr("tco.link_copied"));
      } catch {
        prompt(tr("tco.copy_link_prompt"), url);
      }
    });

    // Enter: якщо авто вимкнено — Enter рахує
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (!isAutoOn()) calculate();
    });

    bindAutoCalcInputs();
  }

  window.addEventListener("DOMContentLoaded", () => {
    bindUI();
    updateCurrencyLabels();
    applyFromUrl();
    loadNbuRates();
  });
})();
