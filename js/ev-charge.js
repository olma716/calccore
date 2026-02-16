(() => {
  console.log("EV CHARGE JS v5 (i18n) loaded");

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

  // number formatting for UI
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

  function isAutoOn() {
    return !!el("auto_calc_toggle")?.checked;
  }

  // ---- state ----
  let source = "home"; // home | station

  // ---- UI: mode ----
  function setSource(next) {
    source = next;
    el("srcHome")?.classList.toggle("active", source === "home");
    el("srcStation")?.classList.toggle("active", source === "station");
    if (isAutoOn()) calculate({ soft: true });
  }

  // ---- UI: station tariff mode ----
  function getStationTariffMode() {
    return el("station_tariff_mode")?.value || "kwh"; // kwh | min
  }

  function updateStationTariffUI() {
    const mode = getStationTariffMode();

    const label = el("station_price_label");
    const hint = el("station_hint");

    if (label) {
      label.textContent =
        mode === "min" ? t("evc.station_price_per_min") : t("evc.station_price_per_kwh");
    }
    if (hint) {
      hint.textContent =
        mode === "min" ? t("evc.station_hint_min") : t("evc.station_hint_kwh");
    }

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

  // ---- required-fields check (для авто-режиму) ----
  function hasMinimumInputs() {
    const capRaw = (el("battery_kwh")?.value || "").trim();
    const nowRaw = (el("soc_now")?.value || "").trim();
    const targetRaw = (el("soc_target")?.value || "").trim();
    return !!capRaw && !!nowRaw && !!targetRaw;
  }

  // ---- core math ----
  function calcEnergy() {
    const cap = num(el("battery_kwh")?.value);
    const now = num(el("soc_now")?.value);
    const sees = num(el("soc_target")?.value);
    const lossPct = num(el("loss_pct")?.value);

    if (cap <= 0) return { ok: false, msg: t("evc.err_cap") };
    if (now < 0 || now > 100) return { ok: false, msg: t("evc.err_now") };
    if (sees < 0 || sees > 100) return { ok: false, msg: t("evc.err_target") };
    if (sees <= now) return { ok: false, msg: t("evc.err_target_gt_now") };

    const loss = clamp(lossPct || 0, 0, 50) / 100;

    const deltaPct = (sees - now) / 100;
    const eBatt = cap * deltaPct;
    const eGrid = eBatt / (1 - loss);

    return { ok: true, cap, now, target: sees, loss, eBatt, eGrid };
  }

  function calcTime(eGrid) {
    const p = num(el("power_kw")?.value);
    if (p <= 0) return { ok: false, msg: t("evc.err_power") };
    const hours = eGrid / p;
    const minutes = hours * 60;
    return { ok: true, p, hours, minutes };
  }

  // ---- render ----
  function render(res) {
    const { eBatt, eGrid, time, cost, now, target, loss, modeLabel, priceLabel, priceValue } = res;

    const head = `${source === "home" ? t("evc.source_home") : t("evc.source_station")} • ` +
      `${t("evc.from_to", { now: fmt2(now), target: fmt2(target) })} • ` +
      `${t("evc.losses", { loss: fmt2(loss * 100) })}`;

    const timeBlock = time
      ? `
        <div class="evc-kpi">
          <div class="kpi-title">${t("evc.kpi_time")}</div>
          <div class="kpi-value">${fmt2(time.hours)} ${t("evc.unit_h")}</div>
          <div class="kpi-mini">≈ ${fmt0(time.minutes)} ${t("evc.unit_min")} • ${t("evc.power_kw", { p: fmt2(time.p) })}</div>
        </div>
      `
      : `
        <div class="evc-kpi">
          <div class="kpi-title">${t("evc.kpi_time")}</div>
          <div class="kpi-value">—</div>
          <div class="kpi-mini">${t("evc.time_need_power")}</div>
        </div>
      `;

    const costKpiClass = source === "home" ? "is-home" : "is-station";

    el("result").innerHTML = `
      <div class="evc-head">${head}</div>

      <div class="evc-kpi-grid">
        <div class="evc-kpi">
          <div class="kpi-title">${t("evc.kpi_to_battery")}</div>
          <div class="kpi-value">${fmt2(eBatt)} ${t("evc.unit_kwh")}</div>
        </div>

        <div class="evc-kpi">
          <div class="kpi-title">${t("evc.kpi_from_grid")}</div>
          <div class="kpi-value">${fmt2(eGrid)} ${t("evc.unit_kwh")}</div>
        </div>

        ${timeBlock}

        <div class="evc-kpi ${costKpiClass}">
          <div class="kpi-title">${t("evc.kpi_cost", { mode: modeLabel })}</div>
          <div class="kpi-value">${fmtMoney(cost)} ${t("evc.unit_uah")}</div>
          <div class="kpi-mini">${priceLabel}: <b>${fmt2(priceValue)}</b></div>
        </div>
      </div>

      <div class="evc-mini" style="margin-top:10px;">
        ${t("evc.explain_base")}
        ${
          source === "station" && getStationTariffMode() === "min"
            ? " " + t("evc.explain_min")
            : ""
        }
      </div>
    `;
  }

  // compare-card highlight
  function renderCompare(homeCost, stationCost) {
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

  // ---- main calc ----
  function calculate(opts = {}) {
    const soft = !!opts.soft;

    if (soft && !hasMinimumInputs()) {
      showDefault();
      return;
    }

    const base = calcEnergy();
    if (!base.ok) {
      if (soft) {
        showDefault();
        return;
      }
      showHint(base.msg);
      return;
    }

    const { eBatt, eGrid, now, target, loss } = base;

    const priceHome = num(el("price_home")?.value);
    const priceStation = num(el("price_station")?.value);

    const tRes = calcTime(eGrid);
    const timeOk = tRes.ok ? tRes : null;

    const homeCost = priceHome > 0 ? eGrid * priceHome : NaN;

    let stationCost = NaN;
    const stMode = getStationTariffMode();

    if (stMode === "kwh") {
      if (priceStation > 0) stationCost = eGrid * priceStation;
    } else {
      if (priceStation > 0 && timeOk) stationCost = timeOk.minutes * priceStation;
    }

    if (source === "home") {
      if (priceHome <= 0) {
        if (soft) return showDefault();
        return showHint(t("evc.err_price_home"));
      }

      render({
        ...base,
        now,
        target,
        loss,
        eBatt,
        eGrid,
        time: timeOk,
        cost: homeCost,
        modeLabel: t("evc.mode_home"),
        priceLabel: t("evc.price_home_label"),
        priceValue: priceHome,
      });
    } else {
      if (priceStation <= 0) {
        if (soft) return showDefault();
        return showHint(
          t("evc.err_price_station", {
            unit: stMode === "min" ? t("evc.unit_uah_per_min") : t("evc.unit_uah_per_kwh"),
          })
        );
      }
      if (stMode === "min" && !timeOk) {
        if (soft) return showDefault();
        return showHint(t("evc.err_min_need_power"));
      }

      render({
        ...base,
        now,
        target,
        loss,
        eBatt,
        eGrid,
        time: timeOk,
        cost: stationCost,
        modeLabel: stMode === "min" ? t("evc.mode_station_min") : t("evc.mode_station_kwh"),
        priceLabel: stMode === "min" ? t("evc.price_station_label_min") : t("evc.price_station_label_kwh"),
        priceValue: priceStation,
      });
    }

    // compare
    if (priceHome > 0 && priceStation > 0) {
      if (stMode === "kwh") renderCompare(homeCost, stationCost);
      else if (timeOk) renderCompare(homeCost, stationCost);
      else renderCompare(NaN, NaN);
    } else {
      renderCompare(NaN, NaN);
    }
  }

  function reset() {
    ["battery_kwh", "soc_now", "soc_target", "loss_pct", "price_home", "price_station"].forEach((id) => {
      const node = el(id);
      if (node) node.value = "";
    });

    if (el("power_kw")) el("power_kw").value = "11";
    if (el("station_tariff_mode")) el("station_tariff_mode").value = "kwh";
    updateStationTariffUI();

    showDefault();
  }

  function share() {
    const params = new URLSearchParams();

    const ids = [
      "battery_kwh",
      "soc_now",
      "soc_target",
      "loss_pct",
      "power_kw",
      "price_home",
      "price_station",
      "station_tariff_mode",
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
    else setSource("home");

    [
      "battery_kwh",
      "soc_now",
      "soc_target",
      "loss_pct",
      "power_kw",
      "price_home",
      "price_station",
      "station_tariff_mode",
    ].forEach((id) => {
      if (!params.has(id)) return;
      const node = el(id);
      if (node) node.value = params.get(id);
    });

    if (params.has("auto_calc_toggle") && el("auto_calc_toggle")) {
      el("auto_calc_toggle").checked = params.get("auto_calc_toggle") === "1";
    }

    updateStationTariffUI();

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

    el("station_tariff_mode")?.addEventListener("change", updateStationTariffUI);
    updateStationTariffUI();

    el("calcBtn")?.addEventListener("click", () => calculate({ soft: false }));
    el("resetBtn")?.addEventListener("click", reset);
    el("shareBtn")?.addEventListener("click", share);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") calculate({ soft: false });
    });

    bindAutoCalc();
    applyFromUrl();
  });
})();
