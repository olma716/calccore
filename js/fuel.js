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

  const car1Wrapper = el("car1_wrapper");
  const car2Wrapper = el("car2_wrapper");

  const globalDistance = el("global_distance");
  const globalYearKm = el("global_year_km");

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
    [car1Wrapper, car2Wrapper].forEach((w) => {
      if (!w) return;
      w.classList.remove("is-winner", "is-loser");
      const badge = w.querySelector(".winner-badge");
      if (badge) badge.remove();
    });
  }

  function setWinner(wrapper) {
    if (!wrapper) return;
    wrapper.classList.add("is-winner");
    const badgeEl = document.createElement("div");
    badgeEl.className = "winner-badge";
    badgeEl.textContent = tt("common.cheaper");
    wrapper.appendChild(badgeEl);
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

  function renderGrid(targetEl, itemsHtml) {
    if (!targetEl) return;
    targetEl.innerHTML = `<div class="result-grid">${itemsHtml}</div>`;
  }

  function renderExtras(targetEl, tripCost, dist, extraHtml = "") {
    if (!targetEl) return;
    const costPerKm = tripCost / dist;
    const costPer100 = costPerKm * 100;

    targetEl.innerHTML += `
      <div class="result-grid">
        <div class="result-item">
          <div class="result-label">${tt("fuel.cost_per_1_km")}</div>
          <div class="result-value">${money(costPerKm)} ${tt("common.unit_uah_per_km")}</div>
        </div>
        <div class="result-item">
          <div class="result-label">${tt("fuel.cost_100_km")}</div>
          <div class="result-value">${money(costPer100)} ${tt("common.unit_uah")}</div>
        </div>
        ${extraHtml}
      </div>
    `;
  }

  function renderICE(targetEl, data, dist) {
    const { liters, cost, litersPer100, rangeKmFromTank, fullTankCost } = data;

    renderGrid(
      targetEl,
      `
      <div class="result-item">
        <div class="result-label">${tt("fuel.fuel_spent")}</div>
        <div class="result-value">${qty(liters)} ${tt("common.unit_l")}</div>
      </div>
      <div class="result-item">
        <div class="result-label">${tt("fuel.route_cost")}</div>
        <div class="result-value">${money(cost)} ${tt("common.unit_uah")}</div>
      </div>
      `
    );

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

    renderExtras(targetEl, cost, dist, extra);
  }

  function renderEV(targetEl, data, dist) {
    const { kwh, cost, loss, kwhPer100, rangeKmFromBattery, fullBatteryCost } = data;

    renderGrid(
      targetEl,
      `
      <div class="result-item">
        <div class="result-label">${tt("fuel.energy_spent")}</div>
        <div class="result-value">${qty(kwh)} ${tt("common.unit_kwh")}</div>
      </div>
      <div class="result-item">
        <div class="result-label">${tt("fuel.route_cost_with_losses", { loss: qty(loss, 0) })}</div>
        <div class="result-value">${money(cost)} ${tt("common.unit_uah")}</div>
      </div>
      `
    );

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

    renderExtras(targetEl, cost, dist, extra);
  }

  function renderHybrid(targetEl, dist, share, iceData, evData) {
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

      <div class="result-item result-total">
        <div class="result-label">${tt("fuel.route_cost_total")}</div>
        <div class="result-value">${money(totalCost)} ${tt("common.unit_uah")}</div>
      </div>
      `
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

    renderExtras(targetEl, totalCost, dist, extra);
    return { totalCost };
  }

  // --- Car module ---
  function setupCar(prefix) {
    const type = el(`${prefix}_type`);

    const blockICE = el(`${prefix}_blockICE`);
    const consumption = el(`${prefix}_consumption`);
    const fuelPrice = el(`${prefix}_fuelPrice`);
    const tank = el(`${prefix}_tank`);

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
      const c = num(consumption);
      const p = num(fuelPrice);

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

    function calculateAndRender(dist, silent = false) {
      const carType = type?.value || "ice";

      if (carType === "ice") {
        const data = calcICE(dist);
        if (data.error) {
          if (!silent) renderError(resultEl, data.error);
          else if (resultEl) resultEl.innerHTML = "";
          return { ok: false };
        }
        renderICE(resultEl, data, dist);
        return { ok: true, totalCost: data.cost };
      }

      if (carType === "ev") {
        const data = calcEV(dist);
        if (data.error) {
          if (!silent) renderError(resultEl, data.error);
          else if (resultEl) resultEl.innerHTML = "";
          return { ok: false };
        }
        renderEV(resultEl, data, dist);
        return { ok: true, totalCost: data.cost };
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

      const out = renderHybrid(resultEl, dist, share, iceData, evData);
      return { ok: true, totalCost: out.totalCost };
    }

    function clearFields() {
      if (type) type.value = "ice";

      [consumption, fuelPrice, tank, kwhPer100, kwhPrice, chargeLoss, battery, evShare]
        .filter(Boolean)
        .forEach((x) => (x.value = ""));

      if (resultEl) resultEl.innerHTML = "";
      updateUI();
    }

    type?.addEventListener("change", updateUI);

    [
      consumption,
      fuelPrice,
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
    return { calculateAndRender, clearFields, resultEl };
  }

  const car1 = setupCar("car1");
  const car2 = setupCar("car2");

  // --- Compare ---
  function getYearKm() {
    const y = num(globalYearKm);
    return Number.isFinite(y) && y > 0 ? y : 15000;
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

    let msg = "";
    if (same) msg = tt("fuel.same_cost");
    else if (car1Cheaper) msg = tt("fuel.cheaper_car_1", { diff: money(diffTrip) });
    else msg = tt("fuel.cheaper_car_2", { diff: money(diffTrip) });

    compareEl.innerHTML = `
      <div class="${wrapCls}">
        <div class="compare-card">
          <div class="compare-title">${tt("fuel.comparison")}</div>

          <div class="result-grid">
            <div class="result-item">
              <div class="result-label">${tt("common.car_1") || "Авто 1"}</div>
              <div class="${v1Cls}">${money(cost1)} ${tt("common.unit_uah")}</div>
            </div>

            <div class="result-item">
              <div class="result-label">${tt("common.car_2") || "Авто 2"}</div>
              <div class="${v2Cls}">${money(cost2)} ${tt("common.unit_uah")}</div>
            </div>

            <div class="result-item result-total">
              <div class="result-label">${tt("fuel.conclusion")}</div>
              <div class="result-value">${msg}</div>
            </div>

            <div class="result-item">
              <div class="result-label">${tt("fuel.diff_per_100_km")}</div>
              <div class="result-value">${money(diffPer100)} ${tt("common.unit_uah")}</div>
            </div>

            <div class="result-item">
              <div class="result-label">${tt("fuel.saving_month", { km: qty(yearKm / 12, 0) })}</div>
              <div class="result-value">${money(monthDiff)} ${tt("common.unit_uah")}</div>
            </div>

            <div class="result-item">
              <div class="result-label">${tt("fuel.saving_year", { km: qty(yearKm, 0) })}</div>
              <div class="result-value">${money(yearDiff)} ${tt("common.unit_uah")}</div>
            </div>
          </div>
        </div>
      </div>
    `;
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

    debounceSave();
    if (!skipAuto) debounceAutoCalc();
  }

  mode1Btn?.addEventListener("click", () => setMode(false));
  mode2Btn?.addEventListener("click", () => setMode(true));

  // --- Main calc ---
  function runCalculation(silent = false) {
    if (compareEl) compareEl.innerHTML = "";
    clearWinnerBadges();

    const dist = num(globalDistance);
    if (!Number.isFinite(dist) || dist <= 0) {
      if (!silent) {
        renderError(car1.resultEl, tt("fuel.err_distance"));
        if (isTwoCars) renderError(car2.resultEl, tt("fuel.err_distance"));
      } else {
        if (car1.resultEl) car1.resultEl.innerHTML = "";
        if (isTwoCars && car2.resultEl) car2.resultEl.innerHTML = "";
      }
      return;
    }

    const r1 = car1.calculateAndRender(dist, silent);
    let r2 = { ok: false, totalCost: NaN };

    if (isTwoCars) r2 = car2.calculateAndRender(dist, silent);

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

    saveState();
  }

  calcBtn?.addEventListener("click", () => runCalculation(false));

  clearBtn?.addEventListener("click", () => {
    if (globalDistance) globalDistance.value = "";
    if (globalYearKm) globalYearKm.value = "";

    if (compareEl) compareEl.innerHTML = "";
    clearWinnerBadges();

    car1.clearFields();
    car2.clearFields();

    setMode(false, true);
    saveState();
  });

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
      global_year_km: globalYearKm?.value ?? "",

      car1_type: el("car1_type")?.value ?? "ice",
      car1_consumption: el("car1_consumption")?.value ?? "",
      car1_fuelPrice: el("car1_fuelPrice")?.value ?? "",
      car1_tank: el("car1_tank")?.value ?? "",
      car1_kwhPer100: el("car1_kwhPer100")?.value ?? "",
      car1_kwhPrice: el("car1_kwhPrice")?.value ?? "",
      car1_chargeLoss: el("car1_chargeLoss")?.value ?? "",
      car1_battery: el("car1_battery")?.value ?? "",
      car1_evShare: el("car1_evShare")?.value ?? "",

      car2_type: el("car2_type")?.value ?? "ice",
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

    if (globalDistance) globalDistance.value = s.global_distance ?? "";
    if (globalYearKm) globalYearKm.value = s.global_year_km ?? "";

    const setIf = (id, val) => {
      const node = el(id);
      if (node) node.value = val ?? "";
    };

    [
      "car1_type",
      "car1_consumption",
      "car1_fuelPrice",
      "car1_tank",
      "car1_kwhPer100",
      "car1_kwhPrice",
      "car1_chargeLoss",
      "car1_battery",
      "car1_evShare",
      "car2_type",
      "car2_consumption",
      "car2_fuelPrice",
      "car2_tank",
      "car2_kwhPer100",
      "car2_kwhPrice",
      "car2_chargeLoss",
      "car2_battery",
      "car2_evShare",
    ].forEach((id) => setIf(id, s[id]));

    el("car1_type")?.dispatchEvent(new Event("change", { bubbles: true }));
    el("car2_type")?.dispatchEvent(new Event("change", { bubbles: true }));
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
    if (s.global_year_km) p.set("y", s.global_year_km);

    p.set("t1", s.car1_type);
    if (s.car1_consumption) p.set("c1", s.car1_consumption);
    if (s.car1_fuelPrice) p.set("p1", s.car1_fuelPrice);
    if (s.car1_tank) p.set("tk1", s.car1_tank);
    if (s.car1_kwhPer100) p.set("k1", s.car1_kwhPer100);
    if (s.car1_kwhPrice) p.set("e1", s.car1_kwhPrice);
    if (s.car1_chargeLoss) p.set("l1", s.car1_chargeLoss);
    if (s.car1_battery) p.set("b1", s.car1_battery);
    if (s.car1_evShare) p.set("s1", s.car1_evShare);

    p.set("t2", s.car2_type);
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
    s.global_year_km = q.get("y") ?? "";

    s.car1_type = q.get("t1") ?? s.car1_type;
    s.car1_consumption = q.get("c1") ?? "";
    s.car1_fuelPrice = q.get("p1") ?? "";
    s.car1_tank = q.get("tk1") ?? "";
    s.car1_kwhPer100 = q.get("k1") ?? "";
    s.car1_kwhPrice = q.get("e1") ?? "";
    s.car1_chargeLoss = q.get("l1") ?? "";
    s.car1_battery = q.get("b1") ?? "";
    s.car1_evShare = q.get("s1") ?? "";

    s.car2_type = q.get("t2") ?? s.car2_type;
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

  copyBtn?.addEventListener("click", async () => {
    try {
      const t1 = textFrom(el("car1_result"));
      const t2 = textFrom(el("car2_result"));
      const tc = textFrom(compareEl);

      let out = `${tt("fuel.copy_title")}\n`;
      if (globalDistance?.value) out += `${tt("fuel.distance")}: ${globalDistance.value} ${tt("common.unit_km")}\n`;
      if (globalYearKm?.value) out += `${tt("fuel.year_km")}: ${globalYearKm.value} ${tt("common.unit_km")}\n`;
      out += `${tt("fuel.auto_calc")}: ${autoCalcEnabled ? tt("common.on") : tt("common.off")}\n`;

      out += `\n--- ${tt("fuel.car_1") || "Авто 1"} ---\n${t1 || tt("fuel.no_result")}\n`;
      if (isTwoCars) out += `\n--- ${tt("fuel.car_2") || "Авто 2"} ---\n${t2 || tt("fuel.no_result")}\n`;
      if (isTwoCars && tc) out += `\n--- ${tt("fuel.comparison")} ---\n${tc}\n`;

      await copyText(out);
      showToast(tt("fuel.toast_copied"));
    } catch {
      showToast(tt("fuel.toast_copy_failed_https"), true);
    }
  });

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
  [globalDistance, globalYearKm].filter(Boolean).forEach((node) => {
    node.addEventListener("input", debounceSave);
    node.addEventListener("input", debounceAutoCalc);
    node.addEventListener("change", debounceAutoCalc);
  });

  // --- init ---
  setMode(false, true);

  const usedQuery = applyFromQuery();
  if (!usedQuery) loadState();

  if (autoToggle) autoToggle.checked = autoCalcEnabled;

  if (globalDistance?.value && autoCalcEnabled) runCalculation(true);
})();
