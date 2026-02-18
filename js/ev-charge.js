(() => {
  console.log("EV CHARGE JS v10 (full i18n in compare) loaded");

  const el = (id) => document.getElementById(id);

  // ===== i18n =====
  const t = (key, vars) => (window.t ? window.t(key, vars) : key);
  const locale = () => (window.i18nLocale ? window.i18nLocale() : "uk-UA");

  // ---- helpers ----
  const num = (v) => {
    if (v == null) return 0;
    const s = String(v).trim().replace(/\s+/g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const fmt2 = (n) => {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString(locale(), { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  };

  const fmt0 = (n) => {
    if (!Number.isFinite(n)) return "—";
    return Math.round(n).toLocaleString(locale());
  };

  const fmtMoney = (n) => {
    if (!Number.isFinite(n)) return "—";
    return Math.round(n).toLocaleString(locale());
  };

  const unit = {
    h: () => t("evc.unit_h"),
    min: () => t("evc.unit_min"),
    hShort: () => t("evc.unit_h_short"),
    minShort: () => t("evc.unit_min_short"),
    kw: () => t("evc.unit_kw"),
    kwh: () => t("evc.unit_kwh"),
    uah: () => t("evc.unit_uah"),
  };

  function isAutoOn() {
    return !!el("auto_calc_toggle")?.checked;
  }

  // ---- state ----
  let source = "home"; // home | station | compare

  // ---- station tariff mode ----
  function getStationTariffMode() {
    return el("station_tariff_mode")?.value || "kwh"; // kwh | min
  }

  function updateStationTariffUI() {
    const mode = getStationTariffMode();
    const label = el("station_price_label");
    const hint = el("station_hint");

    if (label) {
      label.textContent = mode === "min"
        ? t("evc.station_price_per_min")
        : t("evc.station_price_per_kwh");
    }

    if (hint) {
      hint.textContent = mode === "min"
        ? t("evc.station_hint_min")
        : t("evc.station_hint_kwh");
    }

    if (isAutoOn()) calculate({ soft: true });
  }

  // ---- mode UI (hide/show + move socket) ----
  function applyModeUI() {
    const homeCard = el("home_tariff_card");
    const stationCard = el("station_tariff_card");
    const tariffsGrid = document.querySelector(".evc-tariffs");

    const socketWrap = el("socket_wrap");
    const batteryHost = el("socket_host_battery");

    const placeSocketUnderHomePrice = () => {
      if (!homeCard || !socketWrap) return;
      const priceInput = el("price_home");
      if (priceInput && priceInput.parentElement === homeCard) {
        priceInput.insertAdjacentElement("afterend", socketWrap);
      } else {
        homeCard.appendChild(socketWrap);
      }
    };

    const placeSocketBackToBattery = () => {
      if (!batteryHost || !socketWrap) return;
      batteryHost.appendChild(socketWrap);
    };

    if (source === "home") {
      homeCard && (homeCard.style.display = "");
      stationCard && (stationCard.style.display = "none");

      placeSocketBackToBattery();
      socketWrap && (socketWrap.style.display = "");

      tariffsGrid && tariffsGrid.classList.add("evc-tariffs--single");
      return;
    }

    if (source === "station") {
      homeCard && (homeCard.style.display = "none");
      stationCard && (stationCard.style.display = "");

      placeSocketBackToBattery();
      socketWrap && (socketWrap.style.display = "none");

      tariffsGrid && tariffsGrid.classList.add("evc-tariffs--single");
      return;
    }

    // compare
    homeCard && (homeCard.style.display = "");
    stationCard && (stationCard.style.display = "");

    placeSocketUnderHomePrice();
    socketWrap && (socketWrap.style.display = "");

    tariffsGrid && tariffsGrid.classList.remove("evc-tariffs--single");
  }

  function setSource(next) {
    source = next;

    el("srcHome")?.classList.toggle("active", source === "home");
    el("srcStation")?.classList.toggle("active", source === "station");
    el("srcCompare")?.classList.toggle("active", source === "compare");

    applyModeUI();

    if (isAutoOn()) calculate({ soft: true });
  }

  // ---- render helpers ----
  function showDefault() {
    const r = el("result");
    if (r) r.innerHTML = t("evc.hint_enter_and_calc");
    if (el("compare")) el("compare").innerHTML = "";
  }

  function showHint(msg) {
    el("result").innerHTML = `<div class="evc-hintbox">${msg}</div>`;
    if (el("compare")) el("compare").innerHTML = "";
  }

  // ---- minimum inputs (auto mode) ----
  function hasMinimumInputs() {
    const capRaw = (el("battery_kwh")?.value || "").trim();
    const nowRaw = (el("soc_now")?.value || "").trim();
    const targetRaw = (el("soc_target")?.value || "").trim();
    if (!capRaw || !nowRaw || !targetRaw) return false;

    if (source === "home") {
      return !!(el("price_home")?.value || "").trim();
    }

    if (source === "station") {
      const stPriceOk = !!(el("price_station")?.value || "").trim();
      const stPowerOk = !!(el("station_power_kw")?.value || "").trim();
      return stPriceOk && stPowerOk;
    }

    const homeOk = !!(el("price_home")?.value || "").trim();
    const stationOk = !!(el("price_station")?.value || "").trim();
    const stPowerOk = !!(el("station_power_kw")?.value || "").trim();
    return homeOk && stationOk && stPowerOk;
  }

  // ---- core math ----
  function calcEnergy() {
    const cap = num(el("battery_kwh")?.value);
    const now = num(el("soc_now")?.value);
    const target = num(el("soc_target")?.value);
    const lossPct = num(el("loss_pct")?.value);

    if (cap <= 0) return { ok: false, msg: t("evc.err_cap") };
    if (now < 0 || now > 100) return { ok: false, msg: t("evc.err_now") };
    if (target < 0 || target > 100) return { ok: false, msg: t("evc.err_target") };
    if (target <= now) return { ok: false, msg: t("evc.err_target_gt_now") };

    const loss = clamp(lossPct || 0, 0, 50) / 100;

    const deltaPct = (target - now) / 100;
    const eBatt = cap * deltaPct;
    const eGrid = eBatt / (1 - loss);

    return { ok: true, cap, now, target, loss, eBatt, eGrid };
  }

  function calcTimeHome(eGrid) {
    const p = num(el("socket_type")?.value);
    if (p <= 0) return { ok: false, msg: t("evc.err_power") };
    const hours = eGrid / p;
    const minutes = hours * 60;
    return { ok: true, p, hours, minutes };
  }

  function calcTimeStation(eGrid) {
    const p = num(el("station_power_kw")?.value);
    if (p <= 0) return { ok: false, msg: t("evc.err_power") };
    const hours = eGrid / p;
    const minutes = hours * 60;
    return { ok: true, p, hours, minutes };
  }

  // ---- compare summary card ----
  function renderCompareCard(homeCost, stationCost) {
    const box = el("compare");
    if (!box) return;

    if (!Number.isFinite(homeCost) || !Number.isFinite(stationCost)) {
      box.innerHTML = "";
      return;
    }

    const diff = stationCost - homeCost;
    const abs = Math.abs(diff);

    let verdict = "";
    let cls = "is-eq";

    if (diff > 0) {
      verdict = t("evc.cheaper_home", { diff: fmtMoney(abs) });
      cls = "is-home";
    } else if (diff < 0) {
      verdict = t("evc.cheaper_station", { diff: fmtMoney(abs) });
      cls = "is-station";
    } else {
      verdict = t("evc.same_cost");
      cls = "is-eq";
    }

    box.innerHTML = `<div class="evc-compare-card ${cls}">${verdict}</div>`;
  }

  // ---- render single ----
  function renderSingle({ eBatt, eGrid, now, target, loss, time, cost, title, priceLine }) {
    const head =
      `${title} • ` +
      t("evc.from_to", { now: fmt2(now), target: fmt2(target) }) +
      ` • ` +
      t("evc.losses", { loss: fmt2(loss * 100) });

    const timeBlock = time
      ? `
        <div class="evc-kpi">
          <div class="kpi-title">${t("evc.kpi_time")}</div>
          <div class="kpi-value">${fmt2(time.hours)} ${unit.h()}</div>
          <div class="kpi-mini">≈ ${fmt0(time.minutes)} ${unit.min()} • ${fmt2(time.p)} ${unit.kw()}</div>
        </div>
      `
      : `
        <div class="evc-kpi">
          <div class="kpi-title">${t("evc.kpi_time")}</div>
          <div class="kpi-value">—</div>
          <div class="kpi-mini">${t("evc.time_need_power")}</div>
        </div>
      `;

    el("result").innerHTML = `
      <div class="evc-head">${head}</div>

      <div class="evc-kpi-grid">
        <div class="evc-kpi">
          <div class="kpi-title">${t("evc.kpi_to_battery")}</div>
          <div class="kpi-value">${fmt2(eBatt)} ${unit.kwh()}</div>
        </div>

        <div class="evc-kpi">
          <div class="kpi-title">${t("evc.kpi_from_grid")}</div>
          <div class="kpi-value">${fmt2(eGrid)} ${unit.kwh()}</div>
        </div>

        ${timeBlock}

        <div class="evc-kpi">
          <div class="kpi-title">${t("evc.kpi_cost", { mode: "" })}</div>
          <div class="kpi-value">${fmtMoney(cost)} ${unit.uah()}</div>
          <div class="kpi-mini">${priceLine}</div>
        </div>
      </div>

      <div class="evc-mini" style="margin-top:10px;">
        ${t("evc.explain_base")}
      </div>
    `;
  }

  // ---- render compare mode (WIN/LOSE by COST) ----
  function renderCompareMode({
    eBatt,
    eGrid,
    now,
    target,
    loss,
    homeCost,
    stationCost,
    tHomeOk,
    tStationOk,
    priceHome,
    priceStation,
    stMode,
  }) {
    const head =
      `${t("evc.compare_title")} • ` +
      t("evc.from_to", { now: fmt2(now), target: fmt2(target) }) +
      ` • ` +
      t("evc.losses", { loss: fmt2(loss * 100) });

    // Winner by COST
    let winner = "eq"; // home | station | eq
    if (Number.isFinite(homeCost) && Number.isFinite(stationCost)) {
      if (homeCost < stationCost) winner = "home";
      else if (stationCost < homeCost) winner = "station";
      else winner = "eq";
    }

    const homeTone = winner === "home" ? "is-win" : winner === "station" ? "is-lose" : "";
    const stationTone = winner === "station" ? "is-win" : winner === "home" ? "is-lose" : "";

    const stationModeLabel = stMode === "min" ? t("evc.unit_uah_per_min") : t("evc.unit_uah_per_kwh");

    el("result").innerHTML = `
      <div class="evc-head">${head}</div>

      <div class="evc-kpi-grid">
        <div class="evc-kpi">
          <div class="kpi-title">${t("evc.kpi_to_battery")}</div>
          <div class="kpi-value">${fmt2(eBatt)} ${unit.kwh()}</div>
        </div>

        <div class="evc-kpi">
          <div class="kpi-title">${t("evc.kpi_from_grid")}</div>
          <div class="kpi-value">${fmt2(eGrid)} ${unit.kwh()}</div>
        </div>

        <!-- HOME: time + cost -->
        <div class="evc-kpi is-home ${homeTone}">
          <div class="kpi-title">${t("evc.compare_home_time")}</div>
          <div class="kpi-value">${tHomeOk ? `${fmt2(tHomeOk.hours)} ${unit.hShort()}` : "—"}</div>
          <div class="kpi-mini">${tHomeOk ? `≈ ${fmt0(tHomeOk.minutes)} ${unit.minShort()} • ${fmt2(tHomeOk.p)} ${unit.kw()}` : "—"}</div>
        </div>

        <div class="evc-kpi is-home ${homeTone}">
          <div class="kpi-title">${t("evc.compare_home_cost")}</div>
          <div class="kpi-value">${fmtMoney(homeCost)} ${unit.uah()}</div>
          <div class="kpi-mini">${t("evc.tariff_label")}: <b>${fmt2(priceHome)}</b> ${t("evc.unit_uah_per_kwh")}</div>
        </div>

        <!-- STATION: time + cost -->
        <div class="evc-kpi is-station ${stationTone}">
          <div class="kpi-title">${t("evc.compare_station_time")}</div>
          <div class="kpi-value">${tStationOk ? `${fmt2(tStationOk.hours)} ${unit.hShort()}` : "—"}</div>
          <div class="kpi-mini">${tStationOk ? `≈ ${fmt0(tStationOk.minutes)} ${unit.minShort()} • ${fmt2(tStationOk.p)} ${unit.kw()}` : "—"}</div>
        </div>

        <div class="evc-kpi is-station ${stationTone}">
          <div class="kpi-title">${t("evc.compare_station_cost")}</div>
          <div class="kpi-value">${fmtMoney(stationCost)} ${unit.uah()}</div>
          <div class="kpi-mini">${t("evc.tariff_label")}: <b>${fmt2(priceStation)}</b> ${stationModeLabel}</div>
        </div>
      </div>

      <div class="evc-mini" style="margin-top:10px;">
        ${stMode === "min" ? t("evc.station_formula_min") : t("evc.station_formula_kwh")}
      </div>
    `;
  }

  // ---- main calc ----
  function calculate(opts = {}) {
    const soft = !!opts.soft;

    if (soft && !hasMinimumInputs()) {
      showDefault();
      return;
    }

    const base = calcEnergy();
    if (!base.ok) {
      if (soft) return showDefault();
      return showHint(base.msg);
    }

    const { eBatt, eGrid, now, target, loss } = base;

    const priceHome = num(el("price_home")?.value);
    const priceStation = num(el("price_station")?.value);
    const stMode = getStationTariffMode();

    const tHome = calcTimeHome(eGrid);
    const tStation = calcTimeStation(eGrid);

    const tHomeOk = tHome.ok ? tHome : null;
    const tStationOk = tStation.ok ? tStation : null;

    const homeCost = priceHome > 0 ? eGrid * priceHome : NaN;

    let stationCost = NaN;
    if (stMode === "kwh") {
      if (priceStation > 0) stationCost = eGrid * priceStation;
    } else {
      if (priceStation > 0 && tStationOk) stationCost = tStationOk.minutes * priceStation;
    }

    if (source === "home") {
      if (priceHome <= 0) {
        if (soft) return showDefault();
        return showHint(t("evc.err_price_home"));
      }

      renderSingle({
        eBatt,
        eGrid,
        now,
        target,
        loss,
        time: tHomeOk,
        cost: homeCost,
        title: t("evc.source_home"),
        priceLine: `${t("evc.tariff_label")}: <b>${fmt2(priceHome)}</b> ${t("evc.unit_uah_per_kwh")}`,
      });

      renderCompareCard(NaN, NaN);
      return;
    }

    if (source === "station") {
      if (priceStation <= 0) {
        if (soft) return showDefault();
        return showHint(t("evc.err_price_station", {
          unit: stMode === "min" ? t("evc.unit_uah_per_min") : t("evc.unit_uah_per_kwh"),
        }));
      }
      if (stMode === "min" && !tStationOk) {
        if (soft) return showDefault();
        return showHint(t("evc.err_min_need_power"));
      }

      renderSingle({
        eBatt,
        eGrid,
        now,
        target,
        loss,
        time: tStationOk,
        cost: stationCost,
        title: t("evc.source_station"),
        priceLine: `${t("evc.tariff_label")}: <b>${fmt2(priceStation)}</b> ${
          stMode === "min" ? t("evc.unit_uah_per_min") : t("evc.unit_uah_per_kwh")
        }`,
      });

      renderCompareCard(NaN, NaN);
      return;
    }

    // compare
    if (priceHome <= 0 || priceStation <= 0) {
      if (soft) return showDefault();
      return showHint(t("evc.err_compare_need_tariffs") || t("evc.err_price_home"));
    }
    if (stMode === "min" && !tStationOk) {
      if (soft) return showDefault();
      return showHint(t("evc.err_min_need_power"));
    }

    renderCompareMode({
      eBatt,
      eGrid,
      now,
      target,
      loss,
      homeCost,
      stationCost,
      tHomeOk,
      tStationOk,
      priceHome,
      priceStation,
      stMode,
    });

    renderCompareCard(homeCost, stationCost);
  }

  function reset() {
    ["battery_kwh", "soc_now", "soc_target", "loss_pct", "price_home", "price_station"].forEach((id) => {
      const node = el(id);
      if (node) node.value = "";
    });

    if (el("socket_type")) el("socket_type").value = "2.3";
    if (el("station_tariff_mode")) el("station_tariff_mode").value = "kwh";
    if (el("station_power_kw")) el("station_power_kw").value = "11";

    updateStationTariffUI();
    showDefault();
    applyModeUI();
  }

  function share() {
    const params = new URLSearchParams();

    const ids = [
      "battery_kwh",
      "soc_now",
      "soc_target",
      "loss_pct",
      "socket_type",
      "price_home",
      "price_station",
      "station_tariff_mode",
      "station_power_kw",
      "auto_calc_toggle",
    ];

    ids.forEach((id) => {
      const node = el(id);
      if (!node) return;

      if (node.type === "checkbox") {
        params.set(id, node.checked ? "1" : "0");
        return;
      }

      const v = (node.value || "").trim();
      if (v) params.set(id, v);
    });

    params.set("src", source);

    const base = `${location.origin}${location.pathname}`;
    const url = `${base}?${params.toString()}`;

    navigator.clipboard
      ?.writeText(url)
      .then(() => alert(t("evc.link_copied")))
      .catch(() => prompt(t("evc.copy_link_prompt"), url));
  }

  function applyFromUrl() {
    const params = new URLSearchParams(location.search);
    if (![...params.keys()].length) return;

    const src = params.get("src");
    if (src === "station") setSource("station");
    else if (src === "compare") setSource("compare");
    else setSource("home");

    [
      "battery_kwh",
      "soc_now",
      "soc_target",
      "loss_pct",
      "socket_type",
      "price_home",
      "price_station",
      "station_tariff_mode",
      "station_power_kw",
    ].forEach((id) => {
      if (!params.has(id)) return;
      const node = el(id);
      if (node) node.value = params.get(id);
    });

    if (params.has("auto_calc_toggle") && el("auto_calc_toggle")) {
      el("auto_calc_toggle").checked = params.get("auto_calc_toggle") === "1";
    }

    updateStationTariffUI();
    applyModeUI();

    const hasSome =
      (el("battery_kwh")?.value || "").trim() &&
      (el("soc_now")?.value || "").trim() &&
      (el("soc_target")?.value || "").trim();

    if (hasSome) calculate({ soft: true });
  }

  function bindAutoCalc() {
    const nodes = document.querySelectorAll("input, select");
    nodes.forEach((n) => {
      n.addEventListener("input", () => {
        if (isAutoOn()) calculate({ soft: true });
      });
      n.addEventListener("change", () => {
        if (isAutoOn()) calculate({ soft: true });
      });
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    el("srcHome")?.addEventListener("click", () => setSource("home"));
    el("srcStation")?.addEventListener("click", () => setSource("station"));
    el("srcCompare")?.addEventListener("click", () => setSource("compare"));

    el("station_tariff_mode")?.addEventListener("change", updateStationTariffUI);
    updateStationTariffUI();

    el("calcBtn")?.addEventListener("click", () => calculate({ soft: false }));
    el("resetBtn")?.addEventListener("click", reset);
    el("shareBtn")?.addEventListener("click", share);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") calculate({ soft: false });
    });

    applyModeUI();
    bindAutoCalc();
    applyFromUrl();
  });
})();
