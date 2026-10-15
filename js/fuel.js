/* =========================================================
   FUEL / EV / HYBRID ROUTE COST CALCULATOR — fuel.js
   - 1 or 2 cars
   - Modes per car: ICE / EV / HYBRID
   - Auto-calc (silent), copy result, share link
   - State: localStorage + URL params
   - i18n: uses global window.t + window.i18nLocale
========================================================= */

(() => {
  const el = (id) => document.getElementById(id);

  // ---- i18n safe wrapper ----
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

  const LOCALE = typeof window.i18nLocale === "function" ? window.i18nLocale() : "uk-UA";

  // --- DOM ---
  const mode1Btn = el("mode1");
  const mode2Btn = el("mode2");
  const car2Toggle = el("car2_toggle");

  const car1Wrapper = el("car1_wrapper");
  const car2Wrapper = el("car2_wrapper");

  const globalDistance = el("global_distance");
  const globalYearKm = el("global_year_km");
  const roundTripEl = el("global_round_trip");
  const peopleEl = el("global_people");
  const budgetEl = el("global_budget");
  const routeNoteEl = el("route_note");
  const tollsEl = el("global_tolls");
  const parkingEl = el("global_parking");
  const unitEl = el("global_unit");

  const autoToggle = el("auto_calc_toggle");

  const calcBtn = el("calculate");
  const clearBtn = el("clear");

  const copyBtn = el("copy_result");
  const shareBtn = el("share_link");
  const shareStatus = el("share_status");

  const compareEl = el("compare_result");

  // --- SAFE init timers ---
  let saveTimer = null;
  let autoCalcTimer = null;

  const STORAGE_KEY = "fuel_calc_state_v7";

  // Орієнтовні середні ціни пального в Україні (грн/л), станом на жовтень 2026.
  // Оновлювати вручну разом із текстом fuel.fuel_price_note в i18n.js.
  const FUEL_PRESETS = [
    { id: "a95", key: "fuel.fuel_a95", price: 89 },
    { id: "a92", key: "fuel.fuel_a92", price: 84 },
    { id: "diesel", key: "fuel.fuel_diesel", price: 99 },
    { id: "lpg", key: "fuel.fuel_lpg", price: 45 },
  ];

  // --- State ---
  let isTwoCars = false;
  let autoCalcEnabled = true;

  // --- Utils ---
  const money = (v) =>
    Number(v).toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const qty = (v, d = 2) =>
    Number(v).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });

  const num = (inputEl) => {
    if (!inputEl) return NaN;
    const raw = String(inputEl.value ?? "").trim().replace(",", ".");
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : NaN;
  };

  // --- Trip options: round trip, people, budget ---
  const isRoundTrip = () => !!roundTripEl?.checked;

  // --- Одиниці відстані: км або милі (усередині все рахується в км) ---
  const KM_PER_MILE = 1.609344;
  const KM_PER_NMI = 1.852; // морська миля

  const DIST_UNITS = {
    km: { km: 1, key: "common.unit_km" },
    mi: { km: KM_PER_MILE, key: "fuel.unit_mi", costKey: "fuel.cost_per_1_mi", perKey: "fuel.unit_uah_per_mi" },
    nmi: { km: KM_PER_NMI, key: "fuel.unit_nmi", costKey: "fuel.cost_per_1_nmi", perKey: "fuel.unit_uah_per_nmi" },
  };
  const distUnit = () => DIST_UNITS[unitEl?.value] || DIST_UNITS.km;
  const isKm = () => distUnit().km === 1;
  const unitFactor = () => distUnit().km; // скільки км в одній одиниці вводу
  const toDisplayDist = (km) => km / unitFactor(); // км -> одиниця вводу
  const unitShort = () => tt(distUnit().key);

  // --- Одиниці середньої витрати (усередині все рахується в л/100 км) ---
  const CONS_UNITS = {
    l100km: { key: "fuel.cons_l100km", example: "7.5", toL100: (v) => v, fromL100: (l) => l },
    l100mi: { key: "fuel.cons_l100mi", example: "12", toL100: (v) => v / KM_PER_MILE, fromL100: (l) => l * KM_PER_MILE },
    l100nmi: { key: "fuel.cons_l100nmi", example: "14", toL100: (v) => v / KM_PER_NMI, fromL100: (l) => l * KM_PER_NMI },
    kml: { key: "fuel.cons_kml", example: "13", toL100: (v) => 100 / v, fromL100: (l) => 100 / l },
    nmil: { key: "fuel.cons_nmil", example: "7", toL100: (v) => 100 / (v * KM_PER_NMI), fromL100: (l) => 100 / (l * KM_PER_NMI) },
    mpgus: { key: "fuel.cons_mpgus", example: "31", toL100: (v) => 235.215 / v, fromL100: (l) => 235.215 / l },
    mpguk: { key: "fuel.cons_mpguk", example: "37", toL100: (v) => 282.481 / v, fromL100: (l) => 282.481 / l },
  };

  // порядок і групи у списку: кілометри, милі, морські милі
  const CONS_GROUPS = [
    ["fuel.cons_group_km", ["l100km", "kml"]],
    ["fuel.cons_group_mi", ["l100mi", "mpgus", "mpguk"]],
    ["fuel.cons_group_nmi", ["l100nmi", "nmil"]],
  ];

  // --- Одиниці ціни пального (усередині все рахується в грн/л) ---
  const L_PER_GAL_US = 3.785411784;
  const L_PER_GAL_UK = 4.54609;
  const PRICE_UNITS = {
    l: { key: "fuel.price_l", example: "55", toL: (v) => v, fromL: (p) => p },
    galus: { key: "fuel.price_galus", example: "340", toL: (v) => v / L_PER_GAL_US, fromL: (p) => p * L_PER_GAL_US },
    galuk: { key: "fuel.price_galuk", example: "400", toL: (v) => v / L_PER_GAL_UK, fromL: (p) => p * L_PER_GAL_UK },
  };

  function applyUnitLabels() {
    document.querySelectorAll("[data-unit-label]").forEach((n) => {
      n.textContent = unitShort();
    });
  }

  const getPeople = () => {
    const v = Math.floor(num(peopleEl));
    return Number.isFinite(v) && v > 1 ? Math.min(v, 99) : 1;
  };

  const getBudget = () => {
    const v = num(budgetEl);
    return Number.isFinite(v) && v > 0 ? v : 0;
  };

  // Додаткові витрати маршруту: платні дороги (в один бік — подвоюються при "Туди й назад") і паркінг
  const nonNegative = (inputEl) => {
    const v = num(inputEl);
    return Number.isFinite(v) && v > 0 ? v : 0;
  };

  function getExtras() {
    const tolls = nonNegative(tollsEl) * (isRoundTrip() ? 2 : 1);
    const parking = nonNegative(parkingEl);
    return { tolls, parking, total: tolls + parking };
  }

  function updateRouteNote(oneWay) {
    if (!routeNoteEl) return;
    const valid = Number.isFinite(oneWay) && oneWay > 0;
    if (!valid || (!isRoundTrip() && isKm())) {
      routeNoteEl.textContent = "";
      return;
    }
    const fmt = (v) => Number(v).toLocaleString(LOCALE, { maximumFractionDigits: 1 });
    const total = oneWay * (isRoundTrip() ? 2 : 1);
    let text = isRoundTrip()
      ? tt("fuel.round_trip_note", { one: fmt(oneWay), total: fmt(total), unit: unitShort() })
      : `${fmt(total)} ${unitShort()}`;
    if (!isKm()) text += ` = ${fmt(total * unitFactor())} ${tt("common.unit_km")}`;
    routeNoteEl.textContent = text;
  }

  function debounceSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 220);
  }

  function debounceAutoCalc() {
    if (!autoCalcEnabled) return;
    if (autoCalcTimer) clearTimeout(autoCalcTimer);
    autoCalcTimer = setTimeout(() => runCalculation(true), 280);
  }

  function showToast(msg, isError = false) {
    if (!shareStatus) return;
    shareStatus.innerHTML = isError
      ? `<div class="result-error">⚠️ ${msg}</div>`
      : `<div class="result-item">✅ ${msg}</div>`;
    setTimeout(() => {
      if (shareStatus) shareStatus.innerHTML = "";
    }, 3000);
  }

  function setBlockVisible(blockEl, visible) {
    if (!blockEl) return;
    blockEl.classList.toggle("is-hidden", !visible);
    blockEl.setAttribute("aria-hidden", String(!visible));
  }

  // --- Winner highlight helpers ---
  function clearWinnerBadges() {
    document.querySelectorAll(".winner-badge").forEach((b) => b.remove());
    [car1Wrapper, car2Wrapper].forEach((w) => {
      if (w) w.classList.remove("is-winner", "is-loser");
    });
  }

  function setWinner(wrapper) {
    if (!wrapper) return;
    wrapper.classList.add("is-winner");
    // значок «Дешевше» — у заголовку відповідного блоку результату
    const title = el(wrapper === car1Wrapper ? "res_car1_title" : "res_car2_title");
    if (!title) return;
    const badgeEl = document.createElement("span");
    badgeEl.className = "winner-badge";
    badgeEl.textContent = tt("common.cheaper");
    title.appendChild(badgeEl);
  }

  function setLoser(wrapper) {
    if (!wrapper) return;
    wrapper.classList.add("is-loser");
  }

  // --- Render helpers ---
  function renderError(targetEl, msg) {
    if (!targetEl) return;
    targetEl.innerHTML = `<div class="result-error">⚠️ ${msg}</div>`;
  }

  // Головний результат: велике число зверху (з урахуванням платних доріг і паркінгу)
  function heroHtml(label, energyCost, extrasTotal) {
    const total = energyCost + extrasTotal;
    const hasExtras = extrasTotal > 0;
    return `<div class="result-hero">
        <div class="result-hero-label">${hasExtras ? tt("fuel.trip_total") : label}</div>
        <div class="result-hero-value">${money(total)} ${tt("common.unit_uah")}</div>
        ${
          hasExtras
            ? `<div class="result-hero-sub">${tt("fuel.hero_breakdown", {
                energy: money(energyCost),
                extra: money(extrasTotal),
              })}</div>`
            : ""
        }
      </div>`;
  }

  function renderGrid(targetEl, itemsHtml, heroBlock = "") {
    if (!targetEl) return;
    targetEl.innerHTML = `${heroBlock}${itemsHtml ? `<div class="result-grid">${itemsHtml}</div>` : ""}`;
  }

  function renderExtras(targetEl, tripCost, dist, extraHtml = "", opts = {}) {
    if (!targetEl) return;
    const costPerKm = tripCost / dist;
    const costPer100 = costPerKm * 100;

    // у милях додатково показуємо вартість однієї милі
    const perMileHtml = !isKm()
      ? `<div class="result-item">
            <div class="result-label">${tt(distUnit().costKey)}</div>
            <div class="result-value">${money(costPerKm * unitFactor())} ${tt(distUnit().perKey)}</div>
          </div>`
      : "";

    // вартість на людину (якщо в авто більше однієї людини); платні дороги й паркінг входять у суму
    const people = getPeople();
    const totalWithExtras = tripCost + (opts.extras || 0);
    const perPersonHtml =
      people > 1
        ? `<div class="result-item">
            <div class="result-label">${tt("fuel.per_person", { n: people })}</div>
            <div class="result-value">${money(totalWithExtras / people)} ${tt("common.unit_uah")}</div>
          </div>`
        : "";

    // на скільки вистачить заданого бюджету
    const budget = getBudget();
    let budgetHtml = "";
    if (budget > 0 && costPerKm > 0) {
      const km = budget / costPerKm;
      const liters = opts.litersPer100 ? (km * opts.litersPer100) / 100 : null;
      const value =
        `≈ ${qty(km, 0)} ${tt("common.unit_km")}` +
        (!isKm() ? ` (${qty(km / unitFactor(), 0)} ${unitShort()})` : "") +
        (liters ? ` · ${qty(liters, 1)} ${tt("common.unit_l")}` : "");
      budgetHtml = `<div class="result-item result-total">
            <div class="result-label">${tt("fuel.budget_range", { budget: money(budget) })}</div>
            <div class="result-value">${value}</div>
          </div>`;
    }

    targetEl.innerHTML += `
      <div class="result-grid">
        ${opts.leadHtml || ""}
        <div class="result-item">
          <div class="result-label">${tt("fuel.cost_per_1_km")}</div>
          <div class="result-value">${money(costPerKm)} ${tt("common.unit_uah_per_km")}</div>
        </div>
        <div class="result-item">
          <div class="result-label">${tt("fuel.cost_100_km")}</div>
          <div class="result-value">${money(costPer100)} ${tt("common.unit_uah")}</div>
        </div>
        ${perMileHtml}
        ${extraHtml}
        ${perPersonHtml}
        ${budgetHtml}
      </div>
    `;
  }

  function renderICE(targetEl, data, dist, extras = 0) {
    const { liters, cost, litersPer100, rangeKmFromTank, fullTankCost } = data;

    renderGrid(targetEl, "", heroHtml(tt("fuel.route_cost"), cost, extras));

    const leadHtml = `
      <div class="result-item">
        <div class="result-label">${tt("fuel.fuel_spent")}</div>
        <div class="result-value">${qty(liters)} ${tt("common.unit_l")}</div>
      </div>`;

    const extra = `
      <div class="result-item">
        <div class="result-label">${tt("fuel.resource_100_km")}</div>
        <div class="result-value">${qty(litersPer100)} ${tt("common.unit_l_per_100_km")}</div>
      </div>
      ${
        rangeKmFromTank
          ? `<div class="result-item"><div class="result-label">${tt(
              "fuel.full_tank_range"
            )}</div><div class="result-value">${qty(rangeKmFromTank, 0)} ${tt(
              "common.unit_km"
            )}</div></div>`
          : ""
      }
      ${
        Number.isFinite(fullTankCost)
          ? `<div class="result-item"><div class="result-label">${tt(
              "fuel.full_tank_cost"
            )}</div><div class="result-value">${money(fullTankCost)} ${tt(
              "common.unit_uah"
            )}</div></div>`
          : ""
      }
    `;

    renderExtras(targetEl, cost, dist, extra, { litersPer100, extras, leadHtml });
  }

  function renderEV(targetEl, data, dist, extras = 0) {
    const { kwh, cost, loss, kwhPer100, rangeKmFromBattery, fullBatteryCost } = data;

    renderGrid(
      targetEl,
      "",
      heroHtml(tt("fuel.route_cost_with_losses", { loss: qty(loss, 0) }), cost, extras)
    );

    const leadHtml = `
      <div class="result-item">
        <div class="result-label">${tt("fuel.energy_spent")}</div>
        <div class="result-value">${qty(kwh)} ${tt("common.unit_kwh")}</div>
      </div>`;

    const extra = `
      <div class="result-item">
        <div class="result-label">${tt("fuel.resource_100_km")}</div>
        <div class="result-value">${qty(kwhPer100)} ${tt("common.unit_kwh_per_100_km")}</div>
      </div>
      ${
        rangeKmFromBattery
          ? `<div class="result-item"><div class="result-label">${tt(
              "fuel.full_battery_range"
            )}</div><div class="result-value">${qty(rangeKmFromBattery, 0)} ${tt(
              "common.unit_km"
            )}</div></div>`
          : ""
      }
      ${
        Number.isFinite(fullBatteryCost)
          ? `<div class="result-item"><div class="result-label">${tt(
              "fuel.full_battery_cost"
            )}</div><div class="result-value">${money(fullBatteryCost)} ${tt(
              "common.unit_uah"
            )}</div></div>`
          : ""
      }
    `;

    renderExtras(targetEl, cost, dist, extra, { extras, leadHtml });
  }

  function renderHybrid(targetEl, dist, share, iceData, evData, extras = 0) {
    const dEV = (dist * share) / 100;
    const dICE = dist - dEV;

    const totalCost = iceData.cost + evData.cost;

    renderGrid(
      targetEl,
      `
      <div class="result-item">
        <div class="result-label">${tt("fuel.ev_mileage")}</div>
        <div class="result-value">${qty(dEV, 0)} ${tt("common.unit_km")}</div>
      </div>
      <div class="result-item">
        <div class="result-label">${tt("fuel.fuel_mileage")}</div>
        <div class="result-value">${qty(dICE, 0)} ${tt("common.unit_km")}</div>
      </div>

      <div class="result-item">
        <div class="result-label">${tt("fuel.fuel")}</div>
        <div class="result-value">${qty(iceData.liters)} ${tt("common.unit_l")} • ${money(
        iceData.cost
      )} ${tt("common.unit_uah")}</div>
      </div>
      <div class="result-item">
        <div class="result-label">${tt("fuel.electric")}</div>
        <div class="result-value">${qty(evData.kwh)} ${tt("common.unit_kwh")} • ${money(
        evData.cost
      )} ${tt("common.unit_uah")}</div>
      </div>

      `,
      heroHtml(tt("fuel.route_cost_total"), totalCost, extras)
    );

    const litersPer100Eff = iceData.litersPer100 * (1 - share / 100);
    const kwhPer100Eff = evData.kwhPer100 * (share / 100);

    const extra = `
      <div class="result-item">
        <div class="result-label">${tt("fuel.resource_100_km")}</div>
        <div class="result-value">${qty(litersPer100Eff)} ${tt("common.unit_l")} + ${qty(
      kwhPer100Eff
    )} ${tt("common.unit_kwh")}</div>
      </div>
      ${
        iceData.rangeKmFromTank
          ? `<div class="result-item"><div class="result-label">${tt(
              "fuel.full_tank_range"
            )}</div><div class="result-value">${qty(iceData.rangeKmFromTank, 0)} ${tt(
              "common.unit_km"
            )}</div></div>`
          : ""
      }
      ${
        evData.rangeKmFromBattery
          ? `<div class="result-item"><div class="result-label">${tt(
              "fuel.full_battery_range"
            )}</div><div class="result-value">${qty(evData.rangeKmFromBattery, 0)} ${tt(
              "common.unit_km"
            )}</div></div>`
          : ""
      }
      ${
        Number.isFinite(iceData.fullTankCost)
          ? `<div class="result-item"><div class="result-label">${tt(
              "fuel.full_tank_cost"
            )}</div><div class="result-value">${money(iceData.fullTankCost)} ${tt(
              "common.unit_uah"
            )}</div></div>`
          : ""
      }
      ${
        Number.isFinite(evData.fullBatteryCost)
          ? `<div class="result-item"><div class="result-label">${tt(
              "fuel.full_battery_cost"
            )}</div><div class="result-value">${money(evData.fullBatteryCost)} ${tt(
              "common.unit_uah"
            )}</div></div>`
          : ""
      }
    `;

    renderExtras(targetEl, totalCost, dist, extra, { extras });
    return { totalCost: totalCost + extras };
  }

  // --- Car module ---
  function setupCar(prefix) {
    const type = el(`${prefix}_type`);

    const blockICE = el(`${prefix}_blockICE`);
    const consumption = el(`${prefix}_consumption`);
    const fuelPrice = el(`${prefix}_fuelPrice`);
    const tank = el(`${prefix}_tank`);
    const fuelType = el(`${prefix}_fuelType`);
    const consUnit = el(`${prefix}_consUnit`);
    const priceUnit = el(`${prefix}_priceUnit`);

    const blockEV = el(`${prefix}_blockEV`);
    const kwhPer100 = el(`${prefix}_kwhPer100`);
    const kwhPrice = el(`${prefix}_kwhPrice`);
    const chargeLoss = el(`${prefix}_chargeLoss`);
    const battery = el(`${prefix}_battery`);

    const blockHybridExtra = el(`${prefix}_blockHybridExtra`);
    const evShare = el(`${prefix}_evShare`);

    const resultEl = el(`${prefix}_result`);

    function updateUI() {
      const carType = type?.value || "ice";

      const badge = el(`${prefix}_badge`);
      if (badge && type) badge.textContent = type.options[type.selectedIndex]?.text || "";

      if (carType === "ice") {
        setBlockVisible(blockICE, true);
        setBlockVisible(blockEV, false);
        setBlockVisible(blockHybridExtra, false);
      } else if (carType === "ev") {
        setBlockVisible(blockICE, false);
        setBlockVisible(blockEV, true);
        setBlockVisible(blockHybridExtra, false);
      } else {
        setBlockVisible(blockICE, true);
        setBlockVisible(blockEV, true);
        setBlockVisible(blockHybridExtra, true);
      }

      if (resultEl) resultEl.innerHTML = "";
      if (compareEl) compareEl.innerHTML = "";
      clearWinnerBadges();

      debounceSave();
      debounceAutoCalc();
    }

    function calcICE(dist) {
      const c = (CONS_UNITS[consUnit?.value] || CONS_UNITS.l100km).toL100(num(consumption));
      const p = (PRICE_UNITS[priceUnit?.value] || PRICE_UNITS.l).toL(num(fuelPrice));

      if (!Number.isFinite(c) || c <= 0) return { error: tt("fuel.err_ice_consumption") };
      if (!Number.isFinite(p) || p <= 0) return { error: tt("fuel.err_ice_price") };

      const liters = (dist * c) / 100;
      const cost = liters * p;

      const tankVal = num(tank);
      const rangeKmFromTank = Number.isFinite(tankVal) && tankVal > 0 ? (tankVal * 100) / c : null;
      const fullTankCost = Number.isFinite(tankVal) && tankVal > 0 ? tankVal * p : NaN;

      return { liters, cost, litersPer100: c, rangeKmFromTank, fullTankCost };
    }

    function calcEV(dist) {
      const k = num(kwhPer100);
      const p = num(kwhPrice);
      const lossRaw = num(chargeLoss);
      const loss = Number.isFinite(lossRaw) ? lossRaw : 0;

      if (!Number.isFinite(k) || k <= 0) return { error: tt("fuel.err_ev_consumption") };
      if (!Number.isFinite(p) || p <= 0) return { error: tt("fuel.err_ev_price") };
      if (!Number.isFinite(loss) || loss < 0) return { error: tt("fuel.err_ev_loss") };

      const kwh = (dist * k) / 100;
      const cost = kwh * p * (1 + loss / 100);

      const batVal = num(battery);
      const rangeKmFromBattery = Number.isFinite(batVal) && batVal > 0 ? (batVal * 100) / k : null;
      const fullBatteryCost =
        Number.isFinite(batVal) && batVal > 0 ? batVal * p * (1 + loss / 100) : NaN;

      return { kwh, cost, loss, kwhPer100: k, rangeKmFromBattery, fullBatteryCost };
    }

    function calculateAndRender(dist, silent = false, extras = 0) {
      const carType = type?.value || "ice";

      if (carType === "ice") {
        const data = calcICE(dist);
        if (data.error) {
          if (!silent) renderError(resultEl, data.error);
          else if (resultEl) resultEl.innerHTML = "";
          return { ok: false };
        }
        renderICE(resultEl, data, dist, extras);
        return { ok: true, totalCost: data.cost + extras };
      }

      if (carType === "ev") {
        const data = calcEV(dist);
        if (data.error) {
          if (!silent) renderError(resultEl, data.error);
          else if (resultEl) resultEl.innerHTML = "";
          return { ok: false };
        }
        renderEV(resultEl, data, dist, extras);
        return { ok: true, totalCost: data.cost + extras };
      }

      // hybrid
      const share = num(evShare);
      if (!Number.isFinite(share) || share < 0 || share > 100) {
        if (!silent) renderError(resultEl, tt("fuel.err_hybrid_share"));
        else if (resultEl) resultEl.innerHTML = "";
        return { ok: false };
      }

      const dEV = (dist * share) / 100;
      const dICE = dist - dEV;

      const iceData = calcICE(dICE);
      if (iceData.error) {
        if (!silent) renderError(resultEl, `${tt("fuel.err_hybrid_prefix")}${iceData.error}`);
        else if (resultEl) resultEl.innerHTML = "";
        return { ok: false };
      }

      const evData = calcEV(dEV);
      if (evData.error) {
        if (!silent) renderError(resultEl, `${tt("fuel.err_hybrid_prefix")}${evData.error}`);
        else if (resultEl) resultEl.innerHTML = "";
        return { ok: false };
      }

      const out = renderHybrid(resultEl, dist, share, iceData, evData, extras);
      return { ok: true, totalCost: out.totalCost };
    }

    function clearFields() {
      if (type) type.value = "ice";

      [consumption, fuelPrice, tank, kwhPer100, kwhPrice, chargeLoss, battery, evShare]
        .filter(Boolean)
        .forEach((x) => (x.value = ""));
      if (fuelType) fuelType.value = "";
      if (consUnit) consUnit.value = "l100km";
      syncConsUnit();
      if (priceUnit) priceUnit.value = "l";
      syncPriceUnit();

      if (resultEl) resultEl.innerHTML = "";
      updateUI();
    }

    type?.addEventListener("change", updateUI);

    // Одиниці середньої витрати: перемикання перераховує введене число (витрата лишається тією самою)
    function syncConsUnit() {
      if (!consUnit) return;
      if (!CONS_UNITS[consUnit.value]) consUnit.value = "l100km";
      consUnit.dataset.prev = consUnit.value;
      if (consumption) consumption.placeholder = tt("fuel.eg") + CONS_UNITS[consUnit.value].example;
    }

    if (consUnit) {
      consUnit.innerHTML = CONS_GROUPS.map(
        ([groupKey, ids]) =>
          `<optgroup label="${tt(groupKey)}">` +
          ids.map((id) => `<option value="${id}">${tt(CONS_UNITS[id].key)}</option>`).join("") +
          "</optgroup>"
      ).join("");
      consUnit.value = "l100km";
      syncConsUnit();

      consUnit.addEventListener("change", () => {
        const from = CONS_UNITS[consUnit.dataset.prev] || CONS_UNITS.l100km;
        const to = CONS_UNITS[consUnit.value] || CONS_UNITS.l100km;
        const v = num(consumption);
        if (consumption && Number.isFinite(v) && v > 0) {
          const converted = to.fromL100(from.toL100(v));
          if (Number.isFinite(converted) && converted > 0) {
            consumption.value = String(Number(converted.toFixed(2)));
          }
        }
        syncConsUnit();
      });
    }

    // Одиниці ціни пального: перемикання перераховує введену ціну (ціна лишається тією самою)
    function syncPriceUnit() {
      if (!priceUnit) return;
      if (!PRICE_UNITS[priceUnit.value]) priceUnit.value = "l";
      priceUnit.dataset.prev = priceUnit.value;
      if (fuelPrice) fuelPrice.placeholder = tt("fuel.eg") + PRICE_UNITS[priceUnit.value].example;
    }

    if (priceUnit) {
      priceUnit.innerHTML = Object.entries(PRICE_UNITS)
        .map(([id, u]) => `<option value="${id}">${tt(u.key)}</option>`)
        .join("");
      priceUnit.value = "l";
      syncPriceUnit();

      priceUnit.addEventListener("change", () => {
        const from = PRICE_UNITS[priceUnit.dataset.prev] || PRICE_UNITS.l;
        const to = PRICE_UNITS[priceUnit.value] || PRICE_UNITS.l;
        const v = num(fuelPrice);
        if (fuelPrice && Number.isFinite(v) && v > 0) {
          const converted = to.fromL(from.toL(v));
          if (Number.isFinite(converted) && converted > 0) {
            fuelPrice.value = String(Number(converted.toFixed(2)));
          }
        }
        syncPriceUnit();
      });
    }

    // Вибір виду пального підставляє орієнтовну ціну; своя ціна повертає "Своя ціна"
    if (fuelType) {
      fuelType.innerHTML =
        `<option value="">${tt("fuel.fuel_type_custom")}</option>` +
        FUEL_PRESETS.map(
          (p) =>
            `<option value="${p.id}">${tt(p.key)} · ~${p.price} ${tt("common.unit_uah")} / ${tt("common.unit_l")}</option>`
        ).join("");

      fuelType.addEventListener("change", () => {
        const p = FUEL_PRESETS.find((x) => x.id === fuelType.value);
        if (p && fuelPrice) {
          const unit = PRICE_UNITS[priceUnit?.value] || PRICE_UNITS.l;
          fuelPrice.value = String(Number(unit.fromL(p.price).toFixed(2)));
          fuelPrice.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });

      // ручна зміна ціни — це вже "своя ціна" (програмні події ігноруємо)
      fuelPrice?.addEventListener("input", (e) => {
        if (e.isTrusted) fuelType.value = "";
      });
    }

    [
      consumption,
      consUnit,
      priceUnit,
      fuelPrice,
      fuelType,
      tank,
      kwhPer100,
      kwhPrice,
      chargeLoss,
      battery,
      evShare,
      type,
    ]
      .filter(Boolean)
      .forEach((node) => {
        node.addEventListener("input", debounceSave);
        node.addEventListener("input", debounceAutoCalc);
        node.addEventListener("change", debounceAutoCalc);
      });

    updateUI();
    return { calculateAndRender, clearFields, resultEl, syncConsUnit, syncPriceUnit };
  }

  const car1 = setupCar("car1");
  const car2 = setupCar("car2");

  // --- Compare ---
  function getYearKm() {
    const y = num(globalYearKm);
    return Number.isFinite(y) && y > 0 ? y * unitFactor() : 15000;
  }

  function renderCompare(cost1, cost2, dist) {
    if (!compareEl) return;

    const diffTrip = Math.abs(cost1 - cost2);
    const diffPer100 = (diffTrip / dist) * 100;

    const yearKm = getYearKm();
    const tripsPerYear = yearKm / dist;
    const yearDiff = diffTrip * tripsPerYear;
    const monthDiff = yearDiff / 12;

    const same = diffTrip < 0.005;
    const car1Cheaper = !same && cost1 < cost2;
    const car2Cheaper = !same && cost2 < cost1;

    const wrapCls = ["compare", car1Cheaper ? "is-car1-win" : "", car2Cheaper ? "is-car2-win" : ""]
      .filter(Boolean)
      .join(" ");

    const v1Cls = ["result-value", car1Cheaper ? "win" : car2Cheaper ? "lose" : ""]
      .filter(Boolean)
      .join(" ");
    const v2Cls = ["result-value", car2Cheaper ? "win" : car1Cheaper ? "lose" : ""]
      .filter(Boolean)
      .join(" ");

    const people = getPeople();
    const perPersonHtml =
      people > 1
        ? `
            <div class="result-item">
              <div class="result-label">${tt("fuel.per_person_car", { car: tt("fuel.car_1"), n: people })}</div>
              <div class="${v1Cls}">${money(cost1 / people)} ${tt("common.unit_uah")}</div>
            </div>

            <div class="result-item">
              <div class="result-label">${tt("fuel.per_person_car", { car: tt("fuel.car_2"), n: people })}</div>
              <div class="${v2Cls}">${money(cost2 / people)} ${tt("common.unit_uah")}</div>
            </div>
`
        : "";

    let msg = "";
    if (same) msg = tt("fuel.same_cost");
    else if (car1Cheaper) msg = tt("fuel.cheaper_car_1", { diff: money(diffTrip) });
    else msg = tt("fuel.cheaper_car_2", { diff: money(diffTrip) });

    compareEl.innerHTML = `
      <div class="${wrapCls}">
        <div class="compare-card">
          <div class="compare-title">${tt("fuel.comparison")}</div>

          <div class="result-hero result-hero--compare">
            <div class="result-hero-label">${tt("fuel.conclusion")}</div>
            <div class="result-hero-value result-hero-value--text">${msg}</div>
          </div>

          <div class="result-grid">
            <div class="result-item">
              <div class="result-label">${tt("fuel.car_1")}</div>
              <div class="${v1Cls}">${money(cost1)} ${tt("common.unit_uah")}</div>
            </div>

            <div class="result-item">
              <div class="result-label">${tt("fuel.car_2")}</div>
              <div class="${v2Cls}">${money(cost2)} ${tt("common.unit_uah")}</div>
            </div>
${perPersonHtml}
            <div class="result-item">
              <div class="result-label">${tt("fuel.diff_per_100_km")}</div>
              <div class="result-value">${money(diffPer100)} ${tt("common.unit_uah")}</div>
            </div>

            <div class="result-item">
              <div class="result-label">${tt("fuel.saving_month", { dist: qty(toDisplayDist(yearKm / 12), 0), unit: unitShort() })}</div>
              <div class="result-value">${money(monthDiff)} ${tt("common.unit_uah")}</div>
            </div>

            <div class="result-item">
              <div class="result-label">${tt("fuel.saving_year", { dist: qty(toDisplayDist(yearKm), 0), unit: unitShort() })}</div>
              <div class="result-value">${money(yearDiff)} ${tt("common.unit_uah")}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Підказка в панелі результату, поки результатів ще немає
  function updateResultsHint() {
    const hint = el("results_hint");
    if (!hint) return;
    const has1 = !!(car1.resultEl && car1.resultEl.innerHTML.trim());
    const has2 = !!(isTwoCars && car2.resultEl && car2.resultEl.innerHTML.trim());
    hint.style.display = has1 || has2 ? "none" : "";

    const comparePanel = el("compare_panel");
    if (comparePanel) {
      const hasCompare = !!(compareEl && compareEl.innerHTML.trim());
      comparePanel.style.display = isTwoCars && hasCompare ? "" : "none";
    }
  }

  // --- Mode: 1 or 2 cars ---
  function setMode(twoCars, skipAuto = false) {
    isTwoCars = !!twoCars;

    if (isTwoCars) {
      mode2Btn?.classList.add("active");
      mode1Btn?.classList.remove("active");
      if (car2Wrapper) car2Wrapper.style.display = "block";
    } else {
      mode1Btn?.classList.add("active");
      mode2Btn?.classList.remove("active");
      if (car2Wrapper) car2Wrapper.style.display = "none";
      if (compareEl) compareEl.innerHTML = "";
      clearWinnerBadges();
    }

    // права панель: результат Авто 2 і підпис кнопки внизу
    const resCar2 = el("res_car2");
    if (resCar2) resCar2.style.display = isTwoCars ? "" : "none";
    if (car2Toggle) {
      car2Toggle.textContent = isTwoCars ? car2Toggle.dataset.labelRemove : car2Toggle.dataset.labelAdd;
      car2Toggle.setAttribute("aria-expanded", isTwoCars ? "true" : "false");
      car2Toggle.classList.toggle("is-open", isTwoCars);
    }
    updateResultsHint();

    // "Пробіг на рік" потрібен лише для річної економії в порівнянні двох авто
    const yearField = el("year_km_field");
    if (yearField) yearField.style.display = isTwoCars ? "" : "none";

    debounceSave();
    if (!skipAuto) debounceAutoCalc();
  }

  mode1Btn?.addEventListener("click", () => setMode(false));
  mode2Btn?.addEventListener("click", () => setMode(true));

  // кнопка внизу: додати/прибрати Авто 2 (блок з'являється під кнопкою)
  car2Toggle?.addEventListener("click", () => {
    const next = !isTwoCars;
    setMode(next);
    if (next && car2Wrapper) {
      car2Wrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  // --- Main calc ---
  function runCalculation(silent = false) {
    if (compareEl) compareEl.innerHTML = "";
    clearWinnerBadges();

    const oneWay = num(globalDistance);
    updateRouteNote(oneWay);
    if (!Number.isFinite(oneWay) || oneWay <= 0) {
      if (!silent) {
        renderError(car1.resultEl, tt("fuel.err_distance"));
        if (isTwoCars) renderError(car2.resultEl, tt("fuel.err_distance"));
      } else {
        if (car1.resultEl) car1.resultEl.innerHTML = "";
        if (isTwoCars && car2.resultEl) car2.resultEl.innerHTML = "";
      }
      return;
    }

    // "Туди й назад" подвоює відстань для всіх розрахунків
    const dist = oneWay * unitFactor() * (isRoundTrip() ? 2 : 1);

    // платні дороги й паркінг однакові для обох авто
    const extras = getExtras().total;

    const r1 = car1.calculateAndRender(dist, silent, extras);
    let r2 = { ok: false, totalCost: NaN };

    if (isTwoCars) r2 = car2.calculateAndRender(dist, silent, extras);

    if (isTwoCars && r1.ok && r2.ok) {
      const cost1 = r1.totalCost;
      const cost2 = r2.totalCost;

      renderCompare(cost1, cost2, dist);

      if (Number.isFinite(cost1) && Number.isFinite(cost2) && cost1 !== cost2) {
        if (cost1 < cost2) {
          setWinner(car1Wrapper);
          setLoser(car2Wrapper);
        } else {
          setWinner(car2Wrapper);
          setLoser(car1Wrapper);
        }
      }
    }

    updateResultsHint();

    // довгі значення (одиниці з пробілами навколо /) — компактнішим шрифтом
    document.querySelectorAll(".fuel-page .result-value").forEach((v) => {
      v.classList.toggle("is-long", v.textContent.trim().length > 17);
    });

    saveState();
  }

  new Set([calcBtn, ...document.querySelectorAll('[data-fuel-action="calc"]')]).forEach((b) =>
    b?.addEventListener("click", () => runCalculation(false))
  );

  function doClear() {
    if (globalDistance) globalDistance.value = "";
    if (globalYearKm) globalYearKm.value = "";
    if (roundTripEl) roundTripEl.checked = false;
    if (peopleEl) peopleEl.value = "";
    if (unitEl) {
      unitEl.value = "km";
      unitEl.dataset.prev = "km";
    }
    applyUnitLabels();
    if (budgetEl) budgetEl.value = "";
    if (tollsEl) tollsEl.value = "";
    if (parkingEl) parkingEl.value = "";
    updateRouteNote(NaN);

    if (compareEl) compareEl.innerHTML = "";
    clearWinnerBadges();

    car1.clearFields();
    car2.clearFields();

    setMode(false, true);
    updateResultsHint();
    saveState();
  }

  clearBtn?.addEventListener("click", doClear);
  document.querySelectorAll('[data-fuel-action="clear"]').forEach((b) => b.addEventListener("click", doClear));

  // --- Toggle auto ---
  if (autoToggle) {
    autoToggle.addEventListener("change", () => {
      autoCalcEnabled = autoToggle.checked;
      saveState();
      if (autoCalcEnabled) debounceAutoCalc();
    });
  }

  // --- Copy/Share ---
  async function copyText(text) {
    if (!text) throw new Error("empty");
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

  function textFrom(node) {
    if (!node) return "";
    return (node.innerText || "").trim();
  }

  function collectState() {
    return {
      isTwoCars,
      autoCalcEnabled,
      global_distance: globalDistance?.value ?? "",
      global_unit: unitEl?.value ?? "km",
      global_year_km: globalYearKm?.value ?? "",
      global_round_trip: roundTripEl?.checked ? "1" : "0",
      global_people: peopleEl?.value ?? "",
      global_budget: budgetEl?.value ?? "",
      global_tolls: tollsEl?.value ?? "",
      global_parking: parkingEl?.value ?? "",

      car1_type: el("car1_type")?.value ?? "ice",
      car1_fuelType: el("car1_fuelType")?.value ?? "",
      car1_consUnit: el("car1_consUnit")?.value ?? "l100km",
      car1_priceUnit: el("car1_priceUnit")?.value ?? "l",
      car1_consumption: el("car1_consumption")?.value ?? "",
      car1_fuelPrice: el("car1_fuelPrice")?.value ?? "",
      car1_tank: el("car1_tank")?.value ?? "",
      car1_kwhPer100: el("car1_kwhPer100")?.value ?? "",
      car1_kwhPrice: el("car1_kwhPrice")?.value ?? "",
      car1_chargeLoss: el("car1_chargeLoss")?.value ?? "",
      car1_battery: el("car1_battery")?.value ?? "",
      car1_evShare: el("car1_evShare")?.value ?? "",

      car2_type: el("car2_type")?.value ?? "ice",
      car2_fuelType: el("car2_fuelType")?.value ?? "",
      car2_consUnit: el("car2_consUnit")?.value ?? "l100km",
      car2_priceUnit: el("car2_priceUnit")?.value ?? "l",
      car2_consumption: el("car2_consumption")?.value ?? "",
      car2_fuelPrice: el("car2_fuelPrice")?.value ?? "",
      car2_tank: el("car2_tank")?.value ?? "",
      car2_kwhPer100: el("car2_kwhPer100")?.value ?? "",
      car2_kwhPrice: el("car2_kwhPrice")?.value ?? "",
      car2_chargeLoss: el("car2_chargeLoss")?.value ?? "",
      car2_battery: el("car2_battery")?.value ?? "",
      car2_evShare: el("car2_evShare")?.value ?? "",
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectState()));
    } catch {}
  }

  function applyState(s) {
    if (!s || typeof s !== "object") return;

    autoCalcEnabled = s.autoCalcEnabled !== false;
    if (autoToggle) autoToggle.checked = autoCalcEnabled;

    setMode(Boolean(s.isTwoCars), true);

    if (unitEl) {
      unitEl.value = DIST_UNITS[s.global_unit] ? s.global_unit : "km";
      unitEl.dataset.prev = unitEl.value;
    }
    applyUnitLabels();
    if (globalDistance) globalDistance.value = s.global_distance ?? "";
    if (globalYearKm) globalYearKm.value = s.global_year_km ?? "";
    if (roundTripEl) roundTripEl.checked = s.global_round_trip === "1";
    if (peopleEl) peopleEl.value = s.global_people ?? "";
    if (budgetEl) budgetEl.value = s.global_budget ?? "";
    if (tollsEl) tollsEl.value = s.global_tolls ?? "";
    if (parkingEl) parkingEl.value = s.global_parking ?? "";

    const setIf = (id, val) => {
      const node = el(id);
      if (node) node.value = val ?? "";
    };

    [
      "car1_type",
      "car1_fuelType",
      "car1_consUnit",
      "car1_priceUnit",
      "car1_consumption",
      "car1_fuelPrice",
      "car1_tank",
      "car1_kwhPer100",
      "car1_kwhPrice",
      "car1_chargeLoss",
      "car1_battery",
      "car1_evShare",
      "car2_type",
      "car2_fuelType",
      "car2_consUnit",
      "car2_priceUnit",
      "car2_consumption",
      "car2_fuelPrice",
      "car2_tank",
      "car2_kwhPer100",
      "car2_kwhPrice",
      "car2_chargeLoss",
      "car2_battery",
      "car2_evShare",
    ].forEach((id) => setIf(id, s[id]));
    car1.syncConsUnit();
    car2.syncConsUnit();
    car1.syncPriceUnit();
    car2.syncPriceUnit();

    updateRouteNote(num(globalDistance));

    el("car1_type")?.dispatchEvent(new Event("change", { bubbles: true }));
    el("car2_type")?.dispatchEvent(new Event("change", { bubbles: true }));

    // "Витрати та бюджет" згорнуті за замовчуванням; якщо там вже щось введено — показуємо
    const costsCard = el("costs_card");
    if (costsCard && ["global_budget", "global_tolls", "global_parking", "global_people", "global_year_km"].some((id) => (el(id)?.value || "").trim() !== "")) {
      costsCard.open = true;
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      applyState(JSON.parse(raw));
      return true;
    } catch {
      return false;
    }
  }

  function buildShareUrl() {
    const s = collectState();
    const p = new URLSearchParams();

    p.set("m", s.isTwoCars ? "2" : "1");
    p.set("ac", s.autoCalcEnabled ? "1" : "0");

    if (s.global_distance) p.set("d", s.global_distance);
    if (s.global_unit && s.global_unit !== "km") p.set("u", s.global_unit);
    if (s.global_year_km) p.set("y", s.global_year_km);
    if (s.global_round_trip === "1") p.set("rt", "1");
    if (s.global_people) p.set("pp", s.global_people);
    if (s.global_budget) p.set("bg", s.global_budget);
    if (s.global_tolls) p.set("tl", s.global_tolls);
    if (s.global_parking) p.set("pk", s.global_parking);

    p.set("t1", s.car1_type);
    if (s.car1_fuelType) p.set("f1", s.car1_fuelType);
    if (s.car1_consUnit && s.car1_consUnit !== "l100km") p.set("cu1", s.car1_consUnit);
    if (s.car1_priceUnit && s.car1_priceUnit !== "l") p.set("pu1", s.car1_priceUnit);
    if (s.car1_consumption) p.set("c1", s.car1_consumption);
    if (s.car1_fuelPrice) p.set("p1", s.car1_fuelPrice);
    if (s.car1_tank) p.set("tk1", s.car1_tank);
    if (s.car1_kwhPer100) p.set("k1", s.car1_kwhPer100);
    if (s.car1_kwhPrice) p.set("e1", s.car1_kwhPrice);
    if (s.car1_chargeLoss) p.set("l1", s.car1_chargeLoss);
    if (s.car1_battery) p.set("b1", s.car1_battery);
    if (s.car1_evShare) p.set("s1", s.car1_evShare);

    p.set("t2", s.car2_type);
    if (s.car2_fuelType) p.set("f2", s.car2_fuelType);
    if (s.car2_consUnit && s.car2_consUnit !== "l100km") p.set("cu2", s.car2_consUnit);
    if (s.car2_priceUnit && s.car2_priceUnit !== "l") p.set("pu2", s.car2_priceUnit);
    if (s.car2_consumption) p.set("c2", s.car2_consumption);
    if (s.car2_fuelPrice) p.set("p2", s.car2_fuelPrice);
    if (s.car2_tank) p.set("tk2", s.car2_tank);
    if (s.car2_kwhPer100) p.set("k2", s.car2_kwhPer100);
    if (s.car2_kwhPrice) p.set("e2", s.car2_kwhPrice);
    if (s.car2_chargeLoss) p.set("l2", s.car2_chargeLoss);
    if (s.car2_battery) p.set("b2", s.car2_battery);
    if (s.car2_evShare) p.set("s2", s.car2_evShare);

    const base = `${location.origin}${location.pathname}`;
    return `${base}?${p.toString()}`;
  }

  function applyFromQuery() {
    const q = new URLSearchParams(location.search);
    if (![...q.keys()].length) return false;

    const s = collectState();

    s.isTwoCars = q.get("m") === "2";
    s.autoCalcEnabled = q.get("ac") !== "0";

    s.global_distance = q.get("d") ?? "";
    s.global_unit = DIST_UNITS[q.get("u")] ? q.get("u") : "km";
    s.global_year_km = q.get("y") ?? "";
    s.global_round_trip = q.get("rt") === "1" ? "1" : "0";
    s.global_people = q.get("pp") ?? "";
    s.global_budget = q.get("bg") ?? "";
    s.global_tolls = q.get("tl") ?? "";
    s.global_parking = q.get("pk") ?? "";

    s.car1_type = q.get("t1") ?? s.car1_type;
    s.car1_fuelType = q.get("f1") ?? "";
    s.car1_consUnit = q.get("cu1") ?? "l100km";
    s.car1_priceUnit = q.get("pu1") ?? "l";
    s.car1_consumption = q.get("c1") ?? "";
    s.car1_fuelPrice = q.get("p1") ?? "";
    s.car1_tank = q.get("tk1") ?? "";
    s.car1_kwhPer100 = q.get("k1") ?? "";
    s.car1_kwhPrice = q.get("e1") ?? "";
    s.car1_chargeLoss = q.get("l1") ?? "";
    s.car1_battery = q.get("b1") ?? "";
    s.car1_evShare = q.get("s1") ?? "";

    s.car2_type = q.get("t2") ?? s.car2_type;
    s.car2_fuelType = q.get("f2") ?? "";
    s.car2_consUnit = q.get("cu2") ?? "l100km";
    s.car2_priceUnit = q.get("pu2") ?? "l";
    s.car2_consumption = q.get("c2") ?? "";
    s.car2_fuelPrice = q.get("p2") ?? "";
    s.car2_tank = q.get("tk2") ?? "";
    s.car2_kwhPer100 = q.get("k2") ?? "";
    s.car2_kwhPrice = q.get("e2") ?? "";
    s.car2_chargeLoss = q.get("l2") ?? "";
    s.car2_battery = q.get("b2") ?? "";
    s.car2_evShare = q.get("s2") ?? "";

    applyState(s);
    saveState();
    showToast(tt("fuel.toast_applied_from_link"));
    return true;
  }

  async function doCopy(which = "all") {
    try {
      const t1 = textFrom(el("car1_result"));
      const t2 = textFrom(el("car2_result"));
      const tc = textFrom(compareEl);

      let out = `${tt("fuel.copy_title")}\n`;
      if (globalDistance?.value) out += `${tt("fuel.distance")}: ${globalDistance.value} ${unitShort()}\n`;
      if (isTwoCars && globalYearKm?.value) out += `${tt("fuel.year_km")}: ${globalYearKm.value} ${unitShort()}\n`;
      if (isRoundTrip()) out += `${tt("fuel.round_trip")}: ${tt("common.on")}\n`;
      if (getPeople() > 1) out += `${tt("fuel.people")}: ${getPeople()}\n`;
      if (getBudget() > 0) out += `${tt("fuel.budget")}: ${money(getBudget())} ${tt("common.unit_uah")}\n`;
      if (getExtras().tolls > 0) out += `${tt("fuel.tolls")}: ${money(getExtras().tolls)} ${tt("common.unit_uah")}\n`;
      if (getExtras().parking > 0) out += `${tt("fuel.parking")}: ${money(getExtras().parking)} ${tt("common.unit_uah")}\n`;
      out += `${tt("fuel.auto_calc")}: ${autoCalcEnabled ? tt("common.on") : tt("common.off")}\n`;

      const want = (name) => which === "all" || which === name;
      if (want("car1")) out += `\n--- ${tt("fuel.car_1")} ---\n${t1 || tt("fuel.no_result")}\n`;
      if (want("car2") && isTwoCars) out += `\n--- ${tt("fuel.car_2")} ---\n${t2 || tt("fuel.no_result")}\n`;
      if (want("compare") && isTwoCars && tc) out += `\n--- ${tt("fuel.comparison")} ---\n${tc}\n`;

      await copyText(out);
      showToast(tt("fuel.toast_copied"));
    } catch {
      showToast(tt("fuel.toast_copy_failed_https"), true);
    }
  }

  copyBtn?.addEventListener("click", () => doCopy("all"));
  document.querySelectorAll("[data-fuel-copy]").forEach((b) => b.addEventListener("click", () => doCopy(b.dataset.fuelCopy || "all")));

  shareBtn?.addEventListener("click", async () => {
    try {
      const url = buildShareUrl();
      await copyText(url);
      showToast(tt("fuel.toast_link_copied"));
    } catch {
      showToast(tt("fuel.toast_link_copy_failed"), true);
    }
  });

  // --- Global listeners ---
  [globalDistance, globalYearKm, peopleEl, budgetEl, tollsEl, parkingEl, roundTripEl].filter(Boolean).forEach((node) => {
    node.addEventListener("input", debounceSave);
    node.addEventListener("input", debounceAutoCalc);
    node.addEventListener("change", debounceSave);
    node.addEventListener("change", debounceAutoCalc);
  });

  // перемикач км/милі: переводимо вже введені числа, щоб маршрут лишився тим самим
  unitEl?.addEventListener("change", () => {
    const from = unitEl.dataset.prev || "km";
    const to = unitEl.value;
    unitEl.dataset.prev = to;
    if (from !== to) {
      const ratio = (DIST_UNITS[from]?.km || 1) / (DIST_UNITS[to]?.km || 1);
      [
        [globalDistance, 2],
        [globalYearKm, 0],
      ].forEach(([node, digits]) => {
        const v = num(node);
        if (node && Number.isFinite(v) && v > 0) node.value = String(Number((v * ratio).toFixed(digits)));
      });
    }
    applyUnitLabels();
    updateRouteNote(num(globalDistance));
    debounceSave();
    debounceAutoCalc();
  });

  // підпис "туди й назад" оновлюється одразу, навіть якщо авто-розрахунок вимкнено
  [globalDistance, roundTripEl].filter(Boolean).forEach((node) => {
    node.addEventListener("input", () => updateRouteNote(num(globalDistance)));
    node.addEventListener("change", () => updateRouteNote(num(globalDistance)));
  });

  // --- init ---
  setMode(false, true);

  const usedQuery = applyFromQuery();
  if (!usedQuery) loadState();

  if (autoToggle) autoToggle.checked = autoCalcEnabled;
  applyUnitLabels();
  updateRouteNote(num(globalDistance));

  if (globalDistance?.value && autoCalcEnabled) runCalculation(true);
})();
