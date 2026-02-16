(() => {
  // --- i18n helpers ---
  const tr = (key, vars) => (typeof window.t === "function" ? window.t(key, vars) : key);

  // Constants
  const g = 9.81;

  const baseMu = { dry: 0.85, wet: 0.6, snow: 0.3, ice: 0.15 };
  const tireFactor = { summer: 1.0, winter: 0.95, studs: 0.9, allseason: 0.92, worn: 0.8 };
  const tempFactor = { warm: 1.0, cool: 0.95, cold: 0.9 };

  const $ = (id) => document.getElementById(id);

  // Inputs
  const speedEl = $("speed");
  const reactionEl = $("reaction");
  const reactionValEl = $("reactionVal");
  const showMuEl = $("showMu");

  const surfaceAEl = $("surfaceA");
  const tireAEl = $("tireA");
  const tempAEl = $("tempA");

  const surfaceBEl = $("surfaceB");
  const tireBEl = $("tireB");
  const tempBEl = $("tempB");

  // Outputs
  const reactionAEl = $("reactionM"); // A
  const reactionBEl = $("reactionB"); // B
  const brakeAEl = $("brakeA");
  const totalAEl = $("totalA");
  const brakeBEl = $("brakeB");
  const totalBEl = $("totalB");

  const muAEl = $("muA");
  const muBEl = $("muB");

  const verdictBox = $("verdictBox");
  const verdictIcon = $("verdictIcon");
  const verdictText = $("verdictText");

  const tiles100 = $("tiles100");

  // KPI cards (for highlight)
  const kpiReactA = $("kpiReactA");
  const kpiBrakeA = $("kpiBrakeA");
  const kpiTotalA = $("kpiTotalA");
  const kpiReactB = $("kpiReactB");
  const kpiBrakeB = $("kpiBrakeB");
  const kpiTotalB = $("kpiTotalB");

  // Buttons
  const btnShare = $("btnShare");
  const btnCopy = $("btnCopy");
  const btnReactionAvg = $("btnReactionAvg");
  const btnApply100 = $("btnApply100");

  // Utils
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const fmt = (n, digits = 1) => (Number.isFinite(n) ? Number(n).toFixed(digits) : "—");
  const kmhToMs = (kmh) => kmh / 3.6;

  function computeMu(surface, tire, temp) {
    const mu = baseMu[surface] * tireFactor[tire] * tempFactor[temp];
    return clamp(mu, 0.05, 0.95);
  }

  function computeDistances(speedKmh, reactionTime, mu) {
    const v = kmhToMs(speedKmh);
    const reaction = v * reactionTime;
    const brake = (v * v) / (2 * mu * g);
    const total = reaction + brake;
    return { reaction, brake, total };
  }

  function scenarioLabel(surface, tire, temp) {
    const s = tr(`brake.surface.${surface}`);
    const t = tr(`brake.tire.${tire}`);
    const tp = tr(`brake.temp.${temp}`);
    return `${s}, ${t}, ${tp}`;
  }

  function clearKpiMark() {
    [kpiReactA, kpiBrakeA, kpiTotalA, kpiReactB, kpiBrakeB, kpiTotalB].forEach((el) => {
      if (!el) return;
      el.classList.remove("kpi-win", "kpi-lose");
    });
  }

  function markWinnerByBrake(brakeA, brakeB) {
    clearKpiMark();
    if (!Number.isFinite(brakeA) || !Number.isFinite(brakeB)) return;
    if (Math.abs(brakeA - brakeB) < 1e-9) return;

    const aWins = brakeA < brakeB;
    const add = (arr, cls) => arr.forEach((el) => el && el.classList.add(cls));

    if (aWins) {
      add([kpiReactA, kpiBrakeA, kpiTotalA], "kpi-win");
      add([kpiReactB, kpiBrakeB, kpiTotalB], "kpi-lose");
    } else {
      add([kpiReactB, kpiBrakeB, kpiTotalB], "kpi-win");
      add([kpiReactA, kpiBrakeA, kpiTotalA], "kpi-lose");
    }
  }

  function setVerdict(totalA, totalB, speedKmh) {
    const ratio = totalB / totalA;
    const pct = (ratio - 1) * 100;

    verdictBox.style.background = "rgba(60,87,163,.06)";
    verdictBox.style.borderColor = "var(--border)";
    verdictIcon.style.background = "rgba(60,87,163,.14)";
    verdictIcon.textContent = "ℹ️";

    if (!Number.isFinite(totalA) || !Number.isFinite(totalB) || totalA <= 0) {
      verdictText.textContent = tr("brake.verdict_invalid");
      return;
    }

    const baseLine = tr("brake.verdict_baseline", {
      speed: speedKmh,
      a: fmt(totalA, 1),
      b: fmt(totalB, 1),
    });

    if (ratio <= 1.08) {
      verdictBox.style.background = "rgba(31,143,82,.08)";
      verdictBox.style.borderColor = "rgba(31,143,82,.20)";
      verdictIcon.style.background = "rgba(31,143,82,.18)";
      verdictIcon.textContent = "✅";
      verdictText.textContent = tr("brake.verdict_ok", {
        base: baseLine,
        pct: fmt(Math.max(0, pct), 0),
      });
      return;
    }

    if (ratio <= 1.8) {
      verdictBox.style.background = "rgba(211,124,21,.08)";
      verdictBox.style.borderColor = "rgba(211,124,21,.22)";
      verdictIcon.style.background = "rgba(211,124,21,.18)";
      verdictIcon.textContent = "⚠️";
      verdictText.textContent = tr("brake.verdict_warn", { base: baseLine, pct: fmt(pct, 0) });
      return;
    }

    verdictBox.style.background = "rgba(197,58,58,.08)";
    verdictBox.style.borderColor = "rgba(197,58,58,.22)";
    verdictIcon.style.background = "rgba(197,58,58,.18)";
    verdictIcon.textContent = "❌";
    verdictText.textContent = tr("brake.verdict_bad", { base: baseLine, ratio: fmt(ratio, 1) });
  }

  function renderTiles100() {
    const speed = 100;
    const reactionTime = 1.0;
    const tire = "summer";
    const temp = "warm";

    const tiles = [
      { surface: "dry", titleKey: "brake.surface.dry" },
      { surface: "wet", titleKey: "brake.surface.wet" },
      { surface: "snow", titleKey: "brake.surface.snow" },
      { surface: "ice", titleKey: "brake.surface.ice" },
    ];

    tiles100.innerHTML = tiles
      .map((t) => {
        const mu = computeMu(t.surface, tire, temp);
        const d = computeDistances(speed, reactionTime, mu);
        return `
          <div class="tile">
            <div class="t-title">${tr(t.titleKey)}</div>
            <div class="t-val">≈ ${fmt(d.total, 1)} ${tr("common.unit_m")}</div>
            <div class="t-sub">${tr("brake.tile_sub", { r: fmt(d.reaction, 1), b: fmt(d.brake, 1) })}</div>
          </div>
        `;
      })
      .join("");
  }

  function readState() {
    return {
      speed: Number(speedEl.value),
      reactionTime: Number(reactionEl.value),
      sA: surfaceAEl.value,
      tA: tireAEl.value,
      tpA: tempAEl.value,
      sB: surfaceBEl.value,
      tB: tireBEl.value,
      tpB: tempBEl.value,
    };
  }

  function writeMu(muA, muB) {
    const show = !!showMuEl.checked;
    muAEl.textContent = show ? fmt(muA, 2) : "—";
    muBEl.textContent = show ? fmt(muB, 2) : "—";
  }

  // URL params (read on load only)
  function getParamsFromUrl() {
    const p = new URLSearchParams(location.search);
    const get = (k, fallback) => p.get(k) ?? fallback;

    return {
      speed: Number(get("speed", "100")),
      rt: Number(get("rt", "1.0")),
      sA: get("sA", "dry"),
      tA: get("tA", "summer"),
      tpA: get("tpA", "warm"),
      sB: get("sB", "wet"),
      tB: get("tB", "worn"),
      tpB: get("tpB", "cold"),
      showMu: get("mu", "1") === "1",
    };
  }

  function applyParams(params) {
    if (Number.isFinite(params.speed)) speedEl.value = String(clamp(params.speed, 0, 400));
    if (Number.isFinite(params.rt)) reactionEl.value = String(clamp(params.rt, 0.7, 1.5));

    surfaceAEl.value = params.sA;
    tireAEl.value = params.tA;
    tempAEl.value = params.tpA;

    surfaceBEl.value = params.sB;
    tireBEl.value = params.tB;
    tempBEl.value = params.tpB;

    showMuEl.checked = !!params.showMu;
  }

  // SEO: clean URL once if opened with share params
  function hasInternalParams() {
    const keys = ["speed", "rt", "sA", "tA", "tpA", "sB", "tB", "tpB", "mu"];
    const p = new URLSearchParams(location.search);
    return keys.some((k) => p.has(k));
  }

  function stripSearchParamsOnce() {
    const url = new URL(location.href);
    url.search = "";
    history.replaceState(null, "", url.toString());
  }

  // Share URL (generated only on button click)
  function buildShareUrl() {
    const st = readState();
    const p = new URLSearchParams();
    p.set("speed", String(Math.round(clamp(st.speed || 0, 0, 400))));
    p.set("rt", String(clamp(st.reactionTime || 1.0, 0.7, 1.5).toFixed(2)));

    p.set("sA", st.sA);
    p.set("tA", st.tA);
    p.set("tpA", st.tpA);
    p.set("sB", st.sB);
    p.set("tB", st.tB);
    p.set("tpB", st.tpB);
    p.set("mu", showMuEl.checked ? "1" : "0");

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
        ta.remove();
        return true;
      } catch {
        ta.remove();
        return false;
      }
    }
  }

  function buildResultText() {
    const st = readState();
    const speed = clamp(st.speed || 0, 0, 400);
    const rt = clamp(st.reactionTime || 1.0, 0.7, 1.5);

    const muA = computeMu(st.sA, st.tA, st.tpA);
    const muB = computeMu(st.sB, st.tB, st.tpB);

    const dA = computeDistances(speed, rt, muA);
    const dB = computeDistances(speed, rt, muB);

    const aLabel = scenarioLabel(st.sA, st.tA, st.tpA);
    const bLabel = scenarioLabel(st.sB, st.tB, st.tpB);

    const ratio = dB.total / dA.total;

    return [
      tr("brake.copy_title"),
      tr("brake.copy_speed", { speed: Math.round(speed) }),
      tr("brake.copy_reaction", { rt: rt.toFixed(2), m: fmt(dA.reaction, 1) }),
      "",
      tr("brake.copy_scenario_a", { label: aLabel }),
      `μ ≈ ${fmt(muA, 2)}`,
      tr("brake.copy_brake", { m: fmt(dA.brake, 1) }),
      tr("brake.copy_total", { m: fmt(dA.total, 1) }),
      "",
      tr("brake.copy_scenario_b", { label: bLabel }),
      `μ ≈ ${fmt(muB, 2)}`,
      tr("brake.copy_brake", { m: fmt(dB.brake, 1) }),
      tr("brake.copy_total", { m: fmt(dB.total, 1) }),
      "",
      tr("brake.copy_ratio", { x: fmt(ratio, 2) }),
      buildShareUrl(),
    ].join("\n");
  }

  function hookQuickSpeed() {
    document.querySelectorAll("[data-speed]").forEach((btn) => {
      btn.addEventListener("click", () => {
        speedEl.value = btn.getAttribute("data-speed");
        update();
      });
    });
  }

  function update() {
    const st = readState();

    const speed = clamp(Number.isFinite(st.speed) ? st.speed : 0, 0, 400);
    const rt = clamp(Number.isFinite(st.reactionTime) ? st.reactionTime : 1.0, 0.7, 1.5);

    reactionValEl.textContent = rt.toFixed(2);

    const muA = computeMu(st.sA, st.tA, st.tpA);
    const muB = computeMu(st.sB, st.tB, st.tpB);
    writeMu(muA, muB);

    const dA = computeDistances(speed, rt, muA);
    const dB = computeDistances(speed, rt, muB);

    reactionAEl.textContent = fmt(dA.reaction, 1);
    if (reactionBEl) reactionBEl.textContent = fmt(dB.reaction, 1);

    brakeAEl.textContent = fmt(dA.brake, 1);
    totalAEl.textContent = fmt(dA.total, 1);

    brakeBEl.textContent = fmt(dB.brake, 1);
    totalBEl.textContent = fmt(dB.total, 1);

    markWinnerByBrake(dA.brake, dB.brake);
    setVerdict(dA.total, dB.total, Math.round(speed));

    // IMPORTANT: no URL syncing here (SEO-safe)
  }

  function init() {
    const p = getParamsFromUrl();
    applyParams(p);

    // Clean address bar once (keep page canonical), but only if opened with share params
    if (hasInternalParams()) stripSearchParamsOnce();

    renderTiles100();
    hookQuickSpeed();

    speedEl.addEventListener("input", update);
    reactionEl.addEventListener("input", update);
    showMuEl.addEventListener("change", update);

    [surfaceAEl, tireAEl, tempAEl, surfaceBEl, tireBEl, tempBEl].forEach((x) =>
      x.addEventListener("change", update)
    );

    btnReactionAvg.addEventListener("click", () => {
      reactionEl.value = "1.0";
      update();
    });

    btnApply100.addEventListener("click", () => {
      speedEl.value = "100";
      update();
    });

    btnShare.addEventListener("click", async () => {
      const url = buildShareUrl();
      const ok = await copyText(url);
      btnShare.textContent = ok ? tr("brake.link_copied") : tr("brake.copy_failed");
      setTimeout(() => (btnShare.textContent = tr("brake.copy_link_btn")), 1400);
    });

    btnCopy.addEventListener("click", async () => {
      const text = buildResultText();
      const ok = await copyText(text);
      btnCopy.textContent = ok ? tr("brake.result_copied") : tr("brake.copy_failed");
      setTimeout(() => (btnCopy.textContent = tr("brake.copy_result_btn")), 1400);
    });

    update();
  }

  init();
})();
