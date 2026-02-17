// /js/excavation-calculator.js
(() => {
  "use strict";

  // ---------- i18n helpers ----------
  const t = (key, vars) => (typeof window.t === "function" ? window.t(key, vars) : key);
  const locale = () => (typeof window.i18nLocale === "function" ? window.i18nLocale() : "uk-UA");
  const lang = () => (String(window.__LANG__ || document.documentElement.lang || "uk").toLowerCase().startsWith("en") ? "en" : "uk");

  // ---------- DOM helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const isFiniteNumber = (n) => typeof n === "number" && Number.isFinite(n);

  function parseNum(v) {
    if (v == null) return NaN;
    const s = String(v).trim().replace(/\s+/g, "").replace(",", ".");
    if (!s) return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function fmt(n, digits = 2) {
    if (!isFiniteNumber(n)) return "—";
    return n.toLocaleString(locale(), {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    });
  }

  function fmtInt(n) {
    if (!isFiniteNumber(n)) return "—";
    return Math.round(n).toLocaleString(locale());
  }

  function toast(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.classList.remove("show");
      el.textContent = "";
    }, 2200);
  }

  function getFieldWrapByInputId(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return null;
    const wrapByKnown = document.getElementById(inputId + "Wrap");
    if (wrapByKnown) return wrapByKnown;
    return el.closest(".mcalc__field");
  }

  // ---------- elements ----------
  const els = {
    autoCalc: $("#autoCalc"),
    mode: $("#mode"),

    length: $("#length"),
    width: $("#width"),
    depth: $("#depth"),
    area: $("#area"),
    customVol: $("#customVol"),

    lengthWrap: $("#lengthWrap"),
    widthWrap: $("#widthWrap"),
    depthWrap: $("#depthWrap"),
    areaWrap: $("#areaWrap"),
    customWrap: $("#customWrap"),

    overdigPct: $("#overdigPct"),

    soilPreset: $("#soilPreset"),
    bulkingPct: $("#bulkingPct"),
    densityT: $("#densityT"),

    truckCap: $("#truckCap"),

    btnCalc: $("#btnCalc"),
    btnReset: $("#btnReset"),
    btnCopy: $("#btnCopy"),
    mToast: $("#mToast"),

    // result containers (UK vs EN)
    mResult: $("#mResult"),
    mDetails: $("#mDetails"),     // UK has this
    kpiGrid: $("#kpiGrid"),       // EN has this (already has class m-kpis)
    mSummary: $("#mSummary"),     // EN has this
    mHint: $("#mHint"),           // EN has this

    // chart
    canvas: $("#growthChart"),

    // table
    scheduleWrap: $("#scheduleWrap"),
    scheduleTable: $("#scheduleTable"),
    scheduleTbody: $("#scheduleTable tbody"),
    btnCopySchedule: $("#btnCopySchedule"),
    btnDownloadCSV: $("#btnDownloadCSV"),

    // cost
    costWrap: $("#costWrap"),
    priceExcPerM3: $("#priceExcPerM3"),
    priceHaulPerM3: $("#priceHaulPerM3"),
    priceTrip: $("#priceTrip"),
    delivery: $("#delivery"),
    wastePctCost: $("#wastePctCost"),
    btnSavePrices: $("#btnSavePrices"),
    btnResetPrices: $("#btnResetPrices"),
    btnCopyCost: $("#btnCopyCost"),
    costToast: $("#costToast"),
    costTotal: $("#costTotal"),
    costDetails: $("#costDetails"),
  };

  const bulkingWrap = getFieldWrapByInputId("bulkingPct");
  const densityWrap = getFieldWrapByInputId("densityT");

  // ---------- presets ----------
  const SOILS = {
    sand:      { nameKey: "excavation.soil_sand",      bulking: 15, density: 1.60 },
    loam:      { nameKey: "excavation.soil_loam",      bulking: 20, density: 1.70 },
    clay:      { nameKey: "excavation.soil_clay",      bulking: 25, density: 1.80 },
    chernozem: { nameKey: "excavation.soil_chernozem", bulking: 20, density: 1.55 },
    gravel:    { nameKey: "excavation.soil_gravel",    bulking: 10, density: 1.90 },
    custom:    { nameKey: "excavation.soil_custom",    bulking: 25, density: 1.60 },
  };

  function currentSoilLabel() {
    const v = (els.soilPreset?.value || "sand");
    const s = SOILS[v] || SOILS.sand;
    return t(s.nameKey);
  }

  function setModeUI() {
    const mode = els.mode?.value || "trench";
    const show = (node, ok) => { if (node) node.style.display = ok ? "" : "none"; };

    if (mode === "area") {
      show(els.lengthWrap, false);
      show(els.widthWrap, false);
      show(els.depthWrap, true);
      show(els.areaWrap, true);
      show(els.customWrap, false);
    } else if (mode === "custom") {
      show(els.lengthWrap, false);
      show(els.widthWrap, false);
      show(els.depthWrap, false);
      show(els.areaWrap, false);
      show(els.customWrap, true);
    } else {
      show(els.lengthWrap, true);
      show(els.widthWrap, true);
      show(els.depthWrap, true);
      show(els.areaWrap, false);
      show(els.customWrap, false);
    }
  }

  function setSoilUI() {
    const v = (els.soilPreset?.value || "sand");
    const isCustom = v === "custom";

    // show bulking/density only for custom
    if (bulkingWrap) bulkingWrap.style.display = isCustom ? "" : "none";
    if (densityWrap) densityWrap.style.display = isCustom ? "" : "none";

    if (!els.bulkingPct || !els.densityT) return;
    const preset = SOILS[v] || SOILS.sand;

    if (!isCustom) {
      els.bulkingPct.value = String(preset.bulking);
      els.densityT.value = String(preset.density);
      els.bulkingPct.disabled = true;
      els.densityT.disabled = true;
    } else {
      if (!String(els.bulkingPct.value || "").trim()) els.bulkingPct.value = String(preset.bulking);
      if (!String(els.densityT.value || "").trim()) els.densityT.value = String(preset.density);
      els.bulkingPct.disabled = false;
      els.densityT.disabled = false;
    }
  }

  // ---------- calculation ----------
  function compute() {
    const mode = els.mode?.value || "trench";

    const overdigPct = clamp(parseNum(els.overdigPct?.value) || 0, 0, 500);
    const bulkingPct = clamp(parseNum(els.bulkingPct?.value) || 0, 0, 500);

    const densityT = parseNum(els.densityT?.value); // optional
    const truckCap = parseNum(els.truckCap?.value); // optional

    let inSitu = NaN;

    if (mode === "custom") {
      inSitu = parseNum(els.customVol?.value);
    } else if (mode === "area") {
      const A = parseNum(els.area?.value);
      const D = parseNum(els.depth?.value);
      inSitu = A * D;
    } else {
      const L = parseNum(els.length?.value);
      const W = parseNum(els.width?.value);
      const D = parseNum(els.depth?.value);
      inSitu = L * W * D;
    }

    if (!isFiniteNumber(inSitu) || inSitu <= 0) return { ok: false };

    const excavation = inSitu * (1 + overdigPct / 100);
    const loose = excavation * (1 + bulkingPct / 100);

    const tonnage = isFiniteNumber(densityT) && densityT > 0 ? loose * densityT : NaN;

    const tripsRaw = isFiniteNumber(truckCap) && truckCap > 0 ? loose / truckCap : NaN;
    const trips = isFiniteNumber(tripsRaw) ? Math.ceil(tripsRaw) : NaN;

    return {
      ok: true,
      mode,
      inSitu,
      overdigPct,
      excavation,
      bulkingPct,
      loose,
      densityT,
      tonnage,
      truckCap,
      trips,
      tripsRaw,
      soilLabel: currentSoilLabel(),
    };
  }

  // ---------- KPI blocks (restores old styling) ----------
  function renderKpis(data) {
    const kpis = [
      { title: t("excavation.kpi_in_situ"), value: `${fmt(data.inSitu)} m³` },

      {
        title: t("excavation.kpi_excavation"),
        value: `${fmt(data.excavation)} m³`,
        sub: `${t("excavation.row_overdig")}: ${fmt(data.overdigPct, 2)}%`,
      },

      {
        title: t("excavation.kpi_loose"),
        value: `${fmt(data.loose)} m³`,
        sub: `${t("excavation.row_bulking")}: ${fmt(data.bulkingPct, 2)}%`,
      },

      {
        title: t("excavation.kpi_tonnage"),
        value: isFiniteNumber(data.tonnage) ? `${fmt(data.tonnage)} t` : "—",
        sub: isFiniteNumber(data.densityT) ? `${t("excavation.row_density")}: ${fmt(data.densityT, 2)} t/m³` : "",
      },

      {
        title: t("excavation.kpi_trips"),
        value: isFiniteNumber(data.trips) ? fmtInt(data.trips) : "—",
        sub: isFiniteNumber(data.truckCap) ? `${t("excavation.row_truck")}: ${fmt(data.truckCap, 2)} m³` : "",
      },
    ];

    const cards = kpis.map((k) => `
      <div class="m-kpi">
        <div class="m-kpi__title">${k.title}</div>
        <div class="m-kpi__value">${k.value}</div>
        ${k.sub ? `<div class="m-kpi__sub">${k.sub}</div>` : ``}
      </div>
    `).join("");

    // EN: put into #kpiGrid (already .m-kpis in your EN html)
    if (els.kpiGrid) {
      els.kpiGrid.innerHTML = cards;
      els.kpiGrid.style.display = "";
      return;
    }

    // UK: render into #mDetails as .m-kpis container
    if (els.mDetails) {
      els.mDetails.innerHTML = `<div class="m-kpis">${cards}</div>`;
      els.mDetails.style.display = "";
    }
  }

  function renderNotes(data) {
    const note1 = t("excavation.note_soil", { soil: data.soilLabel });
    const note2 = t("excavation.note_trips");

    if (els.mSummary) {
      els.mSummary.style.display = "";
      els.mSummary.innerHTML = `<div class="m-summary__line">${note1}</div>`;
    }
    if (els.mHint) {
      els.mHint.style.display = "";
      els.mHint.textContent = note2;
    }

    if (!els.mSummary && els.mDetails) {
      const extra = `
        <div class="m-summary" style="margin-top:10px;">
          <div class="m-summary__line">${note1}</div>
          <div class="m-hintSmall" style="margin-top:6px;">${note2}</div>
        </div>
      `;
      els.mDetails.insertAdjacentHTML("beforeend", extra);
    }
  }

  function renderMainLine(data) {
    if (!els.mResult) return;
    // leave as-is (you can change to inSitu if you want)
    els.mResult.innerHTML = `${t("excavation.kpi_excavation")}: <b>${fmt(data.excavation)} m³</b>`;
  }

  // ---------- chart ----------
  function drawChart(data) {
    if (!els.canvas) return;
    const ctx = els.canvas.getContext("2d");
    if (!ctx) return;

    const W = els.canvas.width;
    const H = els.canvas.height;

    ctx.clearRect(0, 0, W, H);

    const values = [
      { label: t("excavation.kpi_in_situ"), v: data.inSitu || 0 },
      { label: t("excavation.kpi_excavation"), v: data.excavation || 0 },
      { label: t("excavation.kpi_loose"), v: data.loose || 0 },
    ];

    const maxV = Math.max(...values.map((x) => x.v));
    if (!isFiniteNumber(maxV) || maxV <= 0) {
      // nothing to draw (prevents division by zero)
      return;
    }

    const pad = 36;
    const barW = (W - pad * 2) / values.length * 0.62;
    const gap = (W - pad * 2) / values.length * 0.38;

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.moveTo(pad, H - pad);
    ctx.lineTo(W - pad, H - pad);
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";

    values.forEach((it, i) => {
      const x0 = pad + i * (barW + gap) + gap / 2;
      const usableH = H - pad * 2;
      const bh = (it.v / maxV) * usableH;

      ctx.fillRect(x0, H - pad - bh, barW, bh);

      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillText(`${fmt(it.v)} m³`, x0 + barW / 2, H - pad - bh - 8);

      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillText(it.label, x0 + barW / 2, H - pad + 18);

      ctx.fillStyle = "rgba(0,0,0,0.18)";
    });
  }

  // ---------- table ----------
  function tableRows(data) {
    return [
      { item: t("excavation.row_geom"), qty: fmt(data.inSitu), unit: "m³", note: t("excavation.kpi_in_situ") },
      { item: t("excavation.row_overdig"), qty: fmt(data.overdigPct, 2), unit: "%", note: t("excavation.overdig_label") },
      { item: t("excavation.row_excavation"), qty: fmt(data.excavation), unit: "m³", note: t("excavation.kpi_excavation") },
      { item: t("excavation.row_bulking"), qty: fmt(data.bulkingPct, 2), unit: "%", note: t("excavation.bulking_label") },
      { item: t("excavation.row_loose"), qty: fmt(data.loose), unit: "m³", note: t("excavation.kpi_loose") },
      { item: t("excavation.row_density"), qty: isFiniteNumber(data.densityT) ? fmt(data.densityT, 2) : "—", unit: "t/m³", note: t("excavation.density_label") },
      { item: t("excavation.row_tonnage"), qty: isFiniteNumber(data.tonnage) ? fmt(data.tonnage) : "—", unit: "t", note: t("excavation.kpi_tonnage") },
      { item: t("excavation.row_truck"), qty: isFiniteNumber(data.truckCap) ? fmt(data.truckCap, 2) : "—", unit: "m³", note: t("excavation.truck_label") },
      { item: t("excavation.row_trips"), qty: isFiniteNumber(data.trips) ? fmtInt(data.trips) : "—", unit: "×", note: t("excavation.kpi_trips") },
    ];
  }

  function renderTable(data) {
    if (!els.scheduleTbody) return;
    const rows = tableRows(data);
    els.scheduleTbody.innerHTML = rows.map((r) => `
      <tr>
        <td>${r.item}</td>
        <td><b>${r.qty}</b></td>
        <td>${r.unit}</td>
        <td class="muted">${r.note}</td>
      </tr>
    `).join("");
  }

  // ---------- copy & CSV ----------
  async function copyText(text, okMsg, failMsg, toastEl) {
    try {
      await navigator.clipboard.writeText(text);
      toast(toastEl, okMsg);
    } catch (e) {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        toast(toastEl, okMsg);
      } catch (e2) {
        toast(toastEl, failMsg);
      }
    }
  }

  function buildResultCopy(data) {
    const lines = [];
    lines.push(`${t("excavation.h1")}`);
    lines.push(`${t("excavation.kpi_in_situ")}: ${fmt(data.inSitu)} m³`);
    lines.push(`${t("excavation.kpi_excavation")}: ${fmt(data.excavation)} m³`);
    lines.push(`${t("excavation.kpi_loose")}: ${fmt(data.loose)} m³`);
    lines.push(`${t("excavation.kpi_tonnage")}: ${isFiniteNumber(data.tonnage) ? fmt(data.tonnage) : "—"} t`);
    lines.push(`${t("excavation.kpi_trips")}: ${isFiniteNumber(data.trips) ? fmtInt(data.trips) : "—"}`);
    lines.push(t("excavation.note_soil", { soil: data.soilLabel }));
    return lines.join("\n");
  }

  function buildTableTSV(data) {
    const rows = tableRows(data);
    const header = [t("excavation.th_item"), t("excavation.th_qty"), t("excavation.th_unit"), t("excavation.th_note")].join("\t");
    const body = rows.map((r) => [r.item, r.qty, r.unit, r.note].join("\t")).join("\n");
    return header + "\n" + body;
  }

  function downloadCSV(data) {
    const rows = tableRows(data);
    const header = [t("excavation.th_item"), t("excavation.th_qty"), t("excavation.th_unit"), t("excavation.th_note")];

    const esc = (s) => `"${String(s).replaceAll('"', '""')}"`;
    const csv = [header, ...rows.map((r) => [r.item, r.qty, r.unit, r.note])]
      .map((line) => line.map(esc).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "excavation-calculator.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast(els.mToast, t("excavation.csv_downloaded"));
  }

  // ---------- cost ----------
  const PRICES_KEY = "cc_excavation_prices_v1";

  function loadPrices() {
    try {
      const raw = localStorage.getItem(PRICES_KEY);
      if (!raw) return;
      const p = JSON.parse(raw);

      if (els.priceExcPerM3) els.priceExcPerM3.value = p.priceExcPerM3 ?? "";
      if (els.priceHaulPerM3) els.priceHaulPerM3.value = p.priceHaulPerM3 ?? "";
      if (els.priceTrip) els.priceTrip.value = p.priceTrip ?? "";
      if (els.delivery) els.delivery.value = p.delivery ?? "";
      if (els.wastePctCost) els.wastePctCost.value = p.wastePctCost ?? "";
    } catch (_) {}
  }

  function savePrices() {
    const p = {
      priceExcPerM3: els.priceExcPerM3?.value ?? "",
      priceHaulPerM3: els.priceHaulPerM3?.value ?? "",
      priceTrip: els.priceTrip?.value ?? "",
      delivery: els.delivery?.value ?? "",
      wastePctCost: els.wastePctCost?.value ?? "",
    };
    localStorage.setItem(PRICES_KEY, JSON.stringify(p));
    toast(els.costToast, lang() === "en" ? "Saved ✅" : "Збережено ✅");
  }

  function resetPrices() {
    localStorage.removeItem(PRICES_KEY);
    if (els.priceExcPerM3) els.priceExcPerM3.value = "";
    if (els.priceHaulPerM3) els.priceHaulPerM3.value = "";
    if (els.priceTrip) els.priceTrip.value = "";
    if (els.delivery) els.delivery.value = "";
    if (els.wastePctCost) els.wastePctCost.value = "";
    toast(els.costToast, t("excavation.toast_reset"));
    renderCost(lastData);
  }

  function renderCost(data) {
    if (!els.costTotal || !els.costDetails) return;

    if (!data || !data.ok) {
      els.costTotal.textContent = t("excavation.cost_enter");
      els.costDetails.innerHTML = "";
      return;
    }

    const wastePctCost = clamp(parseNum(els.wastePctCost?.value) || 0, 0, 500);

    const priceExc = parseNum(els.priceExcPerM3?.value);
    const priceHaul = parseNum(els.priceHaulPerM3?.value);
    const priceTrip = parseNum(els.priceTrip?.value);
    const delivery = parseNum(els.delivery?.value) || 0;

    const k = 1 + wastePctCost / 100;

    const excCost = isFiniteNumber(priceExc) && priceExc > 0 ? (data.excavation * priceExc * k) : 0;
    const haulCost = isFiniteNumber(priceHaul) && priceHaul > 0 ? (data.loose * priceHaul * k) : 0;
    const tripCost = isFiniteNumber(priceTrip) && priceTrip > 0 && isFiniteNumber(data.trips) ? (data.trips * priceTrip) : 0;

    const total = excCost + haulCost + tripCost + (isFiniteNumber(delivery) ? delivery : 0);

    const any =
      (isFiniteNumber(priceExc) && priceExc > 0) ||
      (isFiniteNumber(priceHaul) && priceHaul > 0) ||
      (isFiniteNumber(priceTrip) && priceTrip > 0) ||
      (isFiniteNumber(delivery) && delivery > 0);

    if (!any) {
      els.costTotal.textContent = t("excavation.cost_enter");
      els.costDetails.innerHTML = "";
      return;
    }

    els.costTotal.innerHTML = `${t("excavation.cost_title")}: <b>${fmt(total)}</b>`;
    els.costDetails.innerHTML = `
      <div class="m-details__row"><span>${t("excavation.price_exc")}</span><b>${fmt(excCost)}</b></div>
      <div class="m-details__row"><span>${t("excavation.price_haul")}</span><b>${fmt(haulCost)}</b></div>
      <div class="m-details__row"><span>${t("excavation.price_trip")}</span><b>${fmt(tripCost)}</b></div>
      <div class="m-details__row"><span>${t("excavation.delivery")}</span><b>${fmt(delivery)}</b></div>
      <div class="m-details__row muted"><span>${t("excavation.waste_cost")}: ${fmt(wastePctCost, 2)}%</span><span></span></div>
    `.trim();
  }

  async function copyCost() {
    if (!lastData || !lastData.ok) {
      toast(els.costToast, t("excavation.toast_need_calc_first"));
      return;
    }

    renderCost(lastData);

    const wastePctCost = clamp(parseNum(els.wastePctCost?.value) || 0, 0, 500);
    const priceExc = parseNum(els.priceExcPerM3?.value);
    const priceHaul = parseNum(els.priceHaulPerM3?.value);
    const priceTrip = parseNum(els.priceTrip?.value);
    const delivery = parseNum(els.delivery?.value) || 0;

    const k = 1 + wastePctCost / 100;
    const excCost = isFiniteNumber(priceExc) && priceExc > 0 ? (lastData.excavation * priceExc * k) : 0;
    const haulCost = isFiniteNumber(priceHaul) && priceHaul > 0 ? (lastData.loose * priceHaul * k) : 0;
    const tripCost = isFiniteNumber(priceTrip) && priceTrip > 0 && isFiniteNumber(lastData.trips) ? (lastData.trips * priceTrip) : 0;
    const total = excCost + haulCost + tripCost + (isFiniteNumber(delivery) ? delivery : 0);

    const text = [
      `${t("excavation.cost_title")}`,
      `${t("excavation.price_exc")}: ${fmt(excCost)}`,
      `${t("excavation.price_haul")}: ${fmt(haulCost)}`,
      `${t("excavation.price_trip")}: ${fmt(tripCost)}`,
      `${t("excavation.delivery")}: ${fmt(delivery)}`,
      `${t("excavation.waste_cost")}: ${fmt(wastePctCost, 2)}%`,
      `TOTAL: ${fmt(total)}`,
    ].join("\n");

    await copyText(text, t("excavation.copy_ok"), t("excavation.copy_failed"), els.costToast);
  }

  // ---------- main render ----------
  let lastData = null;

  function clearResultUI() {
    if (els.mResult) els.mResult.textContent = t("excavation.result_enter");
    if (els.mDetails) els.mDetails.innerHTML = "";
    if (els.kpiGrid) els.kpiGrid.innerHTML = "";
    if (els.mSummary) { els.mSummary.innerHTML = ""; els.mSummary.style.display = "none"; }
    if (els.mHint) { els.mHint.textContent = ""; els.mHint.style.display = "none"; }

    if (els.scheduleTbody) els.scheduleTbody.innerHTML = "";
    drawChart({ inSitu: 0, excavation: 0, loose: 0 });
    renderCost({ ok: false });
  }

  function runCalc(showToastOnFail = false) {
    const data = compute();
    lastData = data;

    if (!data.ok) {
      clearResultUI();
      if (showToastOnFail) toast(els.mToast, t("excavation.toast_enter_values"));
      return;
    }

    renderMainLine(data);
    renderKpis(data);
    renderNotes(data);

    drawChart(data);
    renderTable(data);
    renderCost(data);
  }

  function resetAll() {
    [els.length, els.width, els.depth, els.area, els.customVol, els.overdigPct, els.truckCap]
      .forEach((x) => { if (x) x.value = ""; });

    if (els.soilPreset) els.soilPreset.value = "sand";

    setModeUI();
    setSoilUI();

    clearResultUI();
    toast(els.mToast, t("excavation.toast_reset"));
  }

  // ---------- events ----------
  function bindAutoCalc() {
    const inputs = [
      els.mode,
      els.length, els.width, els.depth, els.area, els.customVol,
      els.overdigPct,
      els.soilPreset, els.bulkingPct, els.densityT,
      els.truckCap,
      els.priceExcPerM3, els.priceHaulPerM3, els.priceTrip, els.delivery, els.wastePctCost
    ].filter(Boolean);

    inputs.forEach((el) => {
      el.addEventListener("input", () => {
        if (els.autoCalc?.checked) runCalc(false);
      });
      el.addEventListener("change", () => {
        if (el === els.mode) setModeUI();
        if (el === els.soilPreset) setSoilUI();
        if (els.autoCalc?.checked) runCalc(false);
      });
    });
  }

  async function onCopyResult() {
    if (!lastData || !lastData.ok) {
      toast(els.mToast, t("excavation.toast_need_calc_first"));
      return;
    }
    const text = buildResultCopy(lastData);
    await copyText(text, t("excavation.copy_ok"), t("excavation.copy_failed"), els.mToast);
  }

  async function onCopyTable() {
    if (!lastData || !lastData.ok) {
      toast(els.mToast, t("excavation.toast_need_calc_first"));
      return;
    }
    const text = buildTableTSV(lastData);
    await copyText(text, t("excavation.table_copy_ok"), t("excavation.table_copy_failed"), els.mToast);
  }

  // ---------- init ----------
  function init() {
    if (!$("#cexcavation")) return;

    setModeUI();
    setSoilUI();
    loadPrices();

    els.btnCalc?.addEventListener("click", () => runCalc(true));
    els.btnReset?.addEventListener("click", resetAll);
    els.btnCopy?.addEventListener("click", onCopyResult);

    els.btnCopySchedule?.addEventListener("click", onCopyTable);
    els.btnDownloadCSV?.addEventListener("click", () => {
      if (!lastData || !lastData.ok) {
        toast(els.mToast, t("excavation.toast_need_calc_first"));
        return;
      }
      downloadCSV(lastData);
    });

    els.btnSavePrices?.addEventListener("click", savePrices);
    els.btnResetPrices?.addEventListener("click", resetPrices);
    els.btnCopyCost?.addEventListener("click", copyCost);

    bindAutoCalc();

    clearResultUI();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
