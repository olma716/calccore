/* =========================================================
   OSCPV (ОСЦПВ) — CalcCore
   - Compare 2 scenarios (A/B)
   - Market base rates per insurer
   - KPI min/avg/max + verdict + tiles
   - Share link + copy result
   - i18n via window.t (oscpv.*)

   SEO FIX:
   - Do NOT auto-sync URL on each change.
   - Read params on load (share links work).
   - Strip params ONCE after applying (canonical URL in address bar).

   UPDATE (MODE SWITCH):
   - mode1/mode2 переключатель як у EV-charge
   - у режимі "1 авто" блок Авто 2 прихований + disabled
   - KPI Авто 2 (".kpi-b") приховані
   - share link зберігає режим: m=1|2
========================================================= */

(() => {
  const $ = (id) => document.getElementById(id);

  // ---------- i18n helpers ----------
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

  // ---------- state ----------
  const state = { two: false }; // default: single (1 авто)

  /* ===== UI refs ===== */
  const insurerEl = $("insurer");
  const basePriceEl = $("basePrice");

  const regionAEl = $("regionA");
  const vehicleAEl = $("vehicleA");
  const engineAEl = $("engineA");
  const useAEl = $("useA");
  const ageAEl = $("ageA");
  const expAEl = $("expA");
  const periodAEl = $("periodA");
  const franchiseAEl = $("franchiseA");
  const benefitAEl = $("benefitA");

  const regionBEl = $("regionB");
  const vehicleBEl = $("vehicleB");
  const engineBEl = $("engineB");
  const useBEl = $("useB");
  const ageBEl = $("ageB");
  const expBEl = $("expB");
  const periodBEl = $("periodB");
  const franchiseBEl = $("franchiseB");
  const benefitBEl = $("benefitB");

  const engineRowA = $("engineRowA");
  const engineRowB = $("engineRowB");

  const showCoefEl = $("showCoef");
  const coefAEl = $("coefA");
  const coefBEl = $("coefB");

  const minAEl = $("minA");
  const avgAEl = $("avgA");
  const maxAEl = $("maxA");

  const minBEl = $("minB");
  const avgBEl = $("avgB");
  const maxBEl = $("maxB");

  const verdictBox = $("verdictBox");
  const verdictIcon = $("verdictIcon");
  const verdictText = $("verdictText");

  const tilesRegion = $("tilesRegion");
  const tilesInsurer = $("tilesInsurer");

  const btnShare = $("btnShare");
  const btnCopy = $("btnCopy");
  const btnSetDefault = $("btnSetDefault");

  // ---- mode switch UI (optional if not present) ----
  const mode1Btn = $("mode1");
  const mode2Btn = $("mode2");
  const boxB = $("boxB"); // wrapper for scenario B (Auto 2)

  /* KPI blocks (for highlight) */
  const kpiA = [minAEl, avgAEl, maxAEl].map((el) => el?.closest(".kpi")).filter(Boolean);
  const kpiB = [minBEl, avgBEl, maxBEl].map((el) => el?.closest(".kpi")).filter(Boolean);

  /* ===== “Market” insurer base rates (UAH) ===== */
  const insurerRates = {
    market: 1300,
    tas: 1180,
    arx: 1250,
    pzu: 1320,
    uniqa: 1400,
    ingo: 1280,
  };

  // Names via i18n (fallback below)
  function insurerName(key) {
    const fallback = {
      market: "Середній ринок",
      tas: "ТАС",
      arx: "ARX",
      pzu: "PZU",
      uniqa: "UNIQA",
      ingo: "INGO",
    };
    const fromI18n = tt(`oscpv.insurers.${key}`);
    return fromI18n && !fromI18n.startsWith("oscpv.") ? fromI18n : fallback[key] || key;
  }

  /* ===== MVP coefficients ===== */
  const kRegion = { kyiv: 1.35, oblast: 1.2, city: 1.05, rural: 0.9 };
  const kVehicle = { car: 1.0, moto: 0.75, truck: 1.25, bus: 1.45 };
  const kEngine = { lt16: 1.0, "16_20": 1.12, "20_30": 1.28, gt30: 1.45 };
  const kUse = { private: 1.0, delivery: 1.15, taxi: 1.35 };
  const kAge = { u25: 1.15, "25_60": 1.0, "60p": 1.1 };
  const kExp = { lt2: 1.12, "2_10": 1.0, gt10: 0.95 };
  const kPeriod = { "6": 0.65, "12": 1.0 };
  const kFr = { "0": 1.0, "500": 0.97, "1000": 0.94 };
  const kBenefit = { none: 1.0, "50": 0.5 };

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  const fmt = (n) => {
    if (!Number.isFinite(n)) return tt("oscpv.dash");
    const v = Math.round(n);
    return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  function scenarioFromUI(prefix) {
    const get = (id) => $(id)?.value;
    return {
      region: get(`region${prefix}`),
      vehicle: get(`vehicle${prefix}`),
      engine: get(`engine${prefix}`),
      use: get(`use${prefix}`),
      age: get(`age${prefix}`),
      exp: get(`exp${prefix}`),
      period: get(`period${prefix}`),
      franchise: get(`franchise${prefix}`),
      benefit: get(`benefit${prefix}`),
    };
  }

  function computeScenario(base, s) {
    const region = kRegion[s.region] ?? 1;
    const vehicle = kVehicle[s.vehicle] ?? 1;
    const engine = s.vehicle === "car" ? kEngine[s.engine] ?? 1 : 1;

    const use = kUse[s.use] ?? 1;
    const age = kAge[s.age] ?? 1;
    const exp = kExp[s.exp] ?? 1;
    const period = kPeriod[s.period] ?? 1;
    const fr = kFr[s.franchise] ?? 1;
    const benefit = kBenefit[s.benefit] ?? 1;

    const k = region * vehicle * engine * use * age * exp * period * fr * benefit;
    const avg = base * k;

    const min = avg * 0.85;
    const max = avg * 1.2;

    return { k, min, avg, max };
  }

  function updateEngineVisibility() {
    if (engineRowA) engineRowA.style.display = vehicleAEl?.value === "car" ? "" : "none";
    if (engineRowB) engineRowB.style.display = vehicleBEl?.value === "car" ? "" : "none";
  }

  /* ===== Highlight KPI win/lose ===== */
  function highlightWinner(aAvg, bAvg) {
    [...kpiA, ...kpiB].forEach((el) => el.classList.remove("kpi-win", "kpi-lose"));
    if (!Number.isFinite(aAvg) || !Number.isFinite(bAvg)) return;

    if (aAvg < bAvg) {
      kpiA.forEach((el) => el.classList.add("kpi-win"));
      kpiB.forEach((el) => el.classList.add("kpi-lose"));
    } else if (bAvg < aAvg) {
      kpiB.forEach((el) => el.classList.add("kpi-win"));
      kpiA.forEach((el) => el.classList.add("kpi-lose"));
    }
  }

  function setVerdict(aAvg, bAvg) {
    if (!verdictBox || !verdictIcon || !verdictText) return;

    verdictIcon.textContent = "ℹ️";

    if (!Number.isFinite(aAvg) || !Number.isFinite(bAvg) || aAvg <= 0) {
      verdictText.textContent = tt("oscpv.verdict_invalid");
      return;
    }

    const ratio = bAvg / aAvg;
    const pct = (ratio - 1) * 100;
    const baseLine = tt("oscpv.verdict_baseline", { a: fmt(aAvg), b: fmt(bAvg) });

    if (ratio <= 1.08) {
      verdictIcon.textContent = "✅";
      verdictText.textContent = tt("oscpv.verdict_ok", {
        base: baseLine,
        pct: String(Math.max(0, Math.round(pct))),
      });
      return;
    }

    if (ratio <= 1.8) {
      verdictIcon.textContent = "⚠️";
      verdictText.textContent = tt("oscpv.verdict_warn", {
        base: baseLine,
        pct: String(Math.round(pct)),
      });
      return;
    }

    verdictIcon.textContent = "❌";
    verdictText.textContent = tt("oscpv.verdict_bad", {
      base: baseLine,
      ratio: ratio.toFixed(1),
    });
  }

  function setSingleModeVerdict() {
    if (!verdictIcon || !verdictText) return;
    verdictIcon.textContent = "ℹ️";
    const key = tt("oscpv.verdict_single");
    verdictText.textContent =
      key && !key.startsWith("oscpv.") ? key : "Увімкни «Порівняти 2», щоб зіставити умови Авто 1 та Авто 2.";
  }

  /* ===== Tiles ===== */
  function renderRegionTiles(base) {
    if (!tilesRegion) return;

    const fixed = {
      vehicle: "car",
      engine: "lt16",
      use: "private",
      age: "25_60",
      exp: "2_10",
      period: "12",
      franchise: "0",
      benefit: "none",
    };

    const items = [
      { region: "kyiv", title: tt("oscpv.regions.kyiv") },
      { region: "oblast", title: tt("oscpv.regions.oblast") },
      { region: "city", title: tt("oscpv.regions.city") },
      { region: "rural", title: tt("oscpv.regions.rural") },
    ];

    tilesRegion.innerHTML = items
      .map((it) => {
        const r = computeScenario(base, { ...fixed, region: it.region });
        return `
        <div class="tile">
          <div class="t-title">${it.title}</div>
          <div class="t-val">≈ ${fmt(r.avg)} ${tt("oscpv.uah")}</div>
          <div class="t-sub">${tt("oscpv.tile_range", { min: fmt(r.min), max: fmt(r.max) })}</div>
        </div>
      `;
      })
      .join("");
  }

  // “Price by insurers” — scenario A, different bases
  function renderInsurerTiles(sA) {
    if (!tilesInsurer) return;

    const keys = Object.keys(insurerRates);
    if (keys.length === 0) {
      tilesInsurer.innerHTML = "";
      return;
    }

    const rows = keys.map((key) => {
      const base = insurerRates[key];
      const r = computeScenario(base, sA);
      return { key, base, r };
    });

    const best = rows.reduce((acc, cur) => (cur.r.avg < acc.r.avg ? cur : acc), rows[0]);

    tilesInsurer.innerHTML = rows
      .map(({ key, base, r }) => {
        const isBest = key === best.key;
        const cls = `tile${isBest ? " kpi-win" : ""}`;
        return `
        <div class="${cls}">
          <div class="t-title">${insurerName(key)}</div>
          <div class="t-val">≈ ${fmt(r.avg)} ${tt("oscpv.uah")}</div>
          <div class="t-sub">${tt("oscpv.tile_base_and_range", {
            base: fmt(base),
            min: fmt(r.min),
            max: fmt(r.max),
          })}</div>
        </div>
      `;
      })
      .join("");
  }

  /* ===== Base handling (insurer -> base) ===== */
  function currentInsurerKey() {
    return insurerEl?.value || "market";
  }

  function setBaseFromInsurer() {
    const key = currentInsurerKey();
    const base = insurerRates[key] ?? insurerRates.market;
    if (basePriceEl) basePriceEl.value = String(base);
  }

  function readBase() {
    const v = Number(basePriceEl?.value);
    return clamp(Number.isFinite(v) ? v : insurerRates[currentInsurerKey()] ?? insurerRates.market, 0, 50000);
  }

  /* ===== MODE SWITCH ===== */
  function setMode(two) {
    state.two = !!two;

    if (mode1Btn) mode1Btn.classList.toggle("active", !state.two);
    if (mode2Btn) mode2Btn.classList.toggle("active", state.two);

    // hide/disable scenario B
    if (boxB) boxB.classList.toggle("is-hidden", !state.two);
    if (boxB) {
      boxB.querySelectorAll("input, select").forEach((n) => {
        n.disabled = !state.two;
      });
    }

    // hide KPI blocks for B (expect HTML uses .kpi-b on Auto2 KPIs)
    document.querySelectorAll(".oscpv-page .kpi-b").forEach((k) => {
      k.classList.toggle("is-hidden", !state.two);
    });

    update();
  }

  /* ===== URL params ===== */
  function getParamsFromUrl() {
    const p = new URLSearchParams(location.search);
    const get = (k, d) => p.get(k) ?? d;

    return {
      mode: get("m", "1"), // "1" or "2"
      insurer: get("ins", "market"),
      base: Number(get("base", String(insurerRates.market))),
      a: {
        region: get("a_region", "city"),
        vehicle: get("a_vehicle", "car"),
        engine: get("a_engine", "16_20"),
        use: get("a_use", "private"),
        age: get("a_age", "25_60"),
        exp: get("a_exp", "2_10"),
        period: get("a_period", "12"),
        franchise: get("a_franchise", "0"),
        benefit: get("a_benefit", "none"),
      },
      b: {
        region: get("b_region", "kyiv"),
        vehicle: get("b_vehicle", "car"),
        engine: get("b_engine", "20_30"),
        use: get("b_use", "taxi"),
        age: get("b_age", "u25"),
        exp: get("b_exp", "lt2"),
        period: get("b_period", "12"),
        franchise: get("b_franchise", "0"),
        benefit: get("b_benefit", "none"),
      },
      show: get("k", "1") === "1",
    };
  }

  function applyParams(p) {
    if (insurerEl) insurerEl.value = p.insurer;
    if (basePriceEl && Number.isFinite(p.base)) basePriceEl.value = String(clamp(p.base, 0, 50000));

    if (regionAEl) regionAEl.value = p.a.region;
    if (vehicleAEl) vehicleAEl.value = p.a.vehicle;
    if (engineAEl) engineAEl.value = p.a.engine;
    if (useAEl) useAEl.value = p.a.use;
    if (ageAEl) ageAEl.value = p.a.age;
    if (expAEl) expAEl.value = p.a.exp;
    if (periodAEl) periodAEl.value = p.a.period;
    if (franchiseAEl) franchiseAEl.value = p.a.franchise;
    if (benefitAEl) benefitAEl.value = p.a.benefit;

    if (regionBEl) regionBEl.value = p.b.region;
    if (vehicleBEl) vehicleBEl.value = p.b.vehicle;
    if (engineBEl) engineBEl.value = p.b.engine;
    if (useBEl) useBEl.value = p.b.use;
    if (ageBEl) ageBEl.value = p.b.age;
    if (expBEl) expBEl.value = p.b.exp;
    if (periodBEl) periodBEl.value = p.b.period;
    if (franchiseBEl) franchiseBEl.value = p.b.franchise;
    if (benefitBEl) benefitBEl.value = p.b.benefit;

    if (showCoefEl) showCoefEl.checked = !!p.show;
  }

  // SEO: clean URL once if opened with share params
  function hasInternalParams() {
    const keys = [
      "m",
      "ins",
      "base",
      "k",
      "a_region",
      "a_vehicle",
      "a_engine",
      "a_use",
      "a_age",
      "a_exp",
      "a_period",
      "a_franchise",
      "a_benefit",
      "b_region",
      "b_vehicle",
      "b_engine",
      "b_use",
      "b_age",
      "b_exp",
      "b_period",
      "b_franchise",
      "b_benefit",
    ];
    const p = new URLSearchParams(location.search);
    return keys.some((k) => p.has(k));
  }

  function stripSearchParamsOnce() {
    const url = new URL(location.href);
    url.search = "";
    history.replaceState(null, "", url.toString());
  }

  function buildShareUrl() {
    const base = readBase();
    const a = scenarioFromUI("A");
    const b = scenarioFromUI("B");

    const p = new URLSearchParams();
    p.set("m", state.two ? "2" : "1");
    p.set("ins", currentInsurerKey());
    p.set("base", String(Math.round(base)));

    Object.entries(a).forEach(([k, v]) => p.set(`a_${k}`, v));
    Object.entries(b).forEach(([k, v]) => p.set(`b_${k}`, v));
    p.set("k", showCoefEl?.checked ? "1" : "0");

    const url = new URL(location.href);
    url.search = p.toString();
    return url.toString();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        document.body.removeChild(ta);
        return true;
      } catch {
        document.body.removeChild(ta);
        return false;
      }
    }
  }

  function buildResultText() {
    const base = readBase();
    const insKey = currentInsurerKey();
    const insName = insurerName(insKey);

    const a = scenarioFromUI("A");
    const b = scenarioFromUI("B");

    const rA = computeScenario(base, a);
    const rB = computeScenario(base, b);

    const ratio = rA.avg > 0 ? rB.avg / rA.avg : NaN;

    return [
      tt("oscpv.copy_title"),
      `${tt("oscpv.copy_insurer")}: ${insName}`,
      `${tt("oscpv.copy_base")}: ${fmt(base)} ${tt("oscpv.uah")}`,
      `${tt("oscpv.copy_mode") && !tt("oscpv.copy_mode").startsWith("oscpv.")
        ? tt("oscpv.copy_mode")
        : "Режим"
      }: ${state.two ? "Порівняти 2" : "1 авто"}`,
      ``,
      `${tt("oscpv.copy_car1")}: k≈${rA.k.toFixed(2)} | ${tt("oscpv.copy_range", {
        min: fmt(rA.min),
        max: fmt(rA.max),
      })} | ${tt("oscpv.copy_avg", { avg: fmt(rA.avg) })}`,
      `${tt("oscpv.copy_car2")}: k≈${rB.k.toFixed(2)} | ${tt("oscpv.copy_range", {
        min: fmt(rB.min),
        max: fmt(rB.max),
      })} | ${tt("oscpv.copy_avg", { avg: fmt(rB.avg) })}`,
      ``,
      Number.isFinite(ratio)
        ? tt("oscpv.copy_ratio", { x: ratio.toFixed(2) })
        : tt("oscpv.copy_ratio", { x: tt("oscpv.dash") }),
      buildShareUrl(),
    ].join("\n");
  }

  function setDefault() {
    if (insurerEl) insurerEl.value = "market";
    setBaseFromInsurer();

    if (regionAEl) regionAEl.value = "city";
    if (vehicleAEl) vehicleAEl.value = "car";
    if (engineAEl) engineAEl.value = "lt16";
    if (useAEl) useAEl.value = "private";
    if (ageAEl) ageAEl.value = "25_60";
    if (expAEl) expAEl.value = "2_10";
    if (periodAEl) periodAEl.value = "12";
    if (franchiseAEl) franchiseAEl.value = "0";
    if (benefitAEl) benefitAEl.value = "none";

    if (regionBEl) regionBEl.value = "kyiv";
    if (vehicleBEl) vehicleBEl.value = "car";
    if (engineBEl) engineBEl.value = "20_30";
    if (useBEl) useBEl.value = "taxi";
    if (ageBEl) ageBEl.value = "u25";
    if (expBEl) expBEl.value = "lt2";
    if (periodBEl) periodBEl.value = "12";
    if (franchiseBEl) franchiseBEl.value = "0";
    if (benefitBEl) benefitBEl.value = "none";
  }

  function update() {
    updateEngineVisibility();

    const base = readBase();
    const sA = scenarioFromUI("A");

    const rA = computeScenario(base, sA);

    const show = !!showCoefEl?.checked;
    if (coefAEl) coefAEl.textContent = show ? rA.k.toFixed(2) : tt("oscpv.dash");
    if (minAEl) minAEl.textContent = fmt(rA.min);
    if (avgAEl) avgAEl.textContent = fmt(rA.avg);
    if (maxAEl) maxAEl.textContent = fmt(rA.max);

    renderRegionTiles(base);
    renderInsurerTiles(sA);

    // ---- SINGLE MODE: do not compute/compare B ----
    if (!state.two) {
      if (coefBEl) coefBEl.textContent = tt("oscpv.dash");
      if (minBEl) minBEl.textContent = tt("oscpv.dash");
      if (avgBEl) avgBEl.textContent = tt("oscpv.dash");
      if (maxBEl) maxBEl.textContent = tt("oscpv.dash");

      [...kpiA, ...kpiB].forEach((el) => el.classList.remove("kpi-win", "kpi-lose"));
      setSingleModeVerdict();
      return;
    }

    // ---- COMPARE MODE ----
    const sB = scenarioFromUI("B");
    const rB = computeScenario(base, sB);

    if (coefBEl) coefBEl.textContent = show ? rB.k.toFixed(2) : tt("oscpv.dash");
    if (minBEl) minBEl.textContent = fmt(rB.min);
    if (avgBEl) avgBEl.textContent = fmt(rB.avg);
    if (maxBEl) maxBEl.textContent = fmt(rB.max);

    highlightWinner(rA.avg, rB.avg);
    setVerdict(rA.avg, rB.avg);

    // IMPORTANT: no URL syncing here (SEO-safe)
  }

  function bindUpdate(node, ev = "change") {
    if (!node) return;
    node.addEventListener(ev, update);
  }

  function init() {
    const p = getParamsFromUrl();
    applyParams(p);

    // Mode from URL
    setMode(p.mode === "2");

    // Clean address bar once (keep canonical), but only if opened with share params
    if (hasInternalParams()) stripSearchParamsOnce();

    if (!basePriceEl?.value || !Number.isFinite(Number(basePriceEl.value))) setBaseFromInsurer();

    // mode buttons (optional)
    mode1Btn?.addEventListener("click", () => setMode(false));
    mode2Btn?.addEventListener("click", () => setMode(true));

    if (insurerEl) {
      insurerEl.addEventListener("change", () => {
        setBaseFromInsurer();
        update();
      });
    }

    bindUpdate(basePriceEl, "input");

    [
      regionAEl,
      vehicleAEl,
      engineAEl,
      useAEl,
      ageAEl,
      expAEl,
      periodAEl,
      franchiseAEl,
      benefitAEl,

      regionBEl,
      vehicleBEl,
      engineBEl,
      useBEl,
      ageBEl,
      expBEl,
      periodBEl,
      franchiseBEl,
      benefitBEl,

      showCoefEl,
    ].forEach((n) => bindUpdate(n, "change"));

    if (btnSetDefault) {
      btnSetDefault.addEventListener("click", () => {
        setDefault();
        update();
      });
    }

    if (btnShare) {
      btnShare.addEventListener("click", async () => {
        const url = buildShareUrl();
        const ok = await copyText(url);
        btnShare.textContent = ok ? tt("oscpv.link_copied") : tt("oscpv.copy_failed");
        setTimeout(() => (btnShare.textContent = tt("oscpv.copy_link_btn")), 1400);
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener("click", async () => {
        const text = buildResultText();
        const ok = await copyText(text);
        btnCopy.textContent = ok ? tt("oscpv.result_copied") : tt("oscpv.copy_failed");
        setTimeout(() => (btnCopy.textContent = tt("oscpv.copy_result_btn")), 1400);
      });
    }

    update();
  }

  init();
})();
