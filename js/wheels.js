(() => {
  const el = (id) => document.getElementById(id);

  // ---- i18n helpers ----
  const tr = (key, vars) => (typeof window.t === "function" ? window.t(key, vars) : key);
  const loc = () => (typeof window.i18nLocale === "function" ? window.i18nLocale() : "uk-UA");

  const state = {
    two: false,
    auto: true,
  };

  function parseNum(v) {
    if (v == null) return NaN;
    const s = String(v).trim().replace(/\s+/g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function fmt(n, digits = 2) {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString(loc(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function fmt0(n) {
    if (!Number.isFinite(n)) return "—";
    return Math.round(n).toLocaleString(loc());
  }

  function isAuto() {
    return !!el("auto_calc_toggle")?.checked;
  }

  // ---- math ----
  // width mm, aspect %, rim inches
  function calcTire(w, a, r) {
    const side = w * (a / 100);
    const rimMm = r * 25.4;
    const dia = rimMm + 2 * side;
    const circ = Math.PI * dia;

    return {
      w,
      a,
      r,
      side,
      rimMm,
      dia,
      circ,
      diaIn: dia / 25.4,
      circM: circ / 1000,
    };
  }

  function validateSize(prefix) {
    const w = parseNum(el(`w${prefix}`)?.value);
    const a = parseNum(el(`a${prefix}`)?.value);
    const r = parseNum(el(`r${prefix}`)?.value);

    const errors = [];
    if (!Number.isFinite(w) || w <= 0) errors.push(tr("wheels.err_width_mm"));
    if (!Number.isFinite(a) || a <= 0) errors.push(tr("wheels.err_aspect_pct"));
    if (!Number.isFinite(r) || r <= 0) errors.push(tr("wheels.err_rim_r"));

    return { ok: errors.length === 0, errors, w, a, r };
  }

  function renderKpi(prefix, data) {
    const box = el(prefix === 1 ? "kpi1" : "kpi2");
    if (!box) return;

    box.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi">
          <div class="kpi-title">${tr("wheels.kpi_sidewall")}</div>
          <div class="kpi-value">${fmt(data.side, 1)} ${tr("common.unit_mm")}</div>
        </div>
        <div class="kpi">
          <div class="kpi-title">${tr("wheels.kpi_rim_diameter")}</div>
          <div class="kpi-value">${fmt(data.rimMm, 1)} ${tr("common.unit_mm")}</div>
        </div>
        <div class="kpi">
          <div class="kpi-title">${tr("wheels.kpi_wheel_diameter")}</div>
          <div class="kpi-value">${fmt(data.dia, 1)} ${tr("common.unit_mm")}</div>
        </div>
        <div class="kpi">
          <div class="kpi-title">${tr("wheels.circumference")}</div>
          <div class="kpi-value">${fmt(data.circM, 3)} ${tr("wheels.unit_m")}</div>
        </div>
      </div>
    `;
  }

  function speedErrorPercent(baseCirc, newCirc) {
    return (newCirc / baseCirc - 1) * 100;
  }

  // =========================
  // Verdict + text
  // =========================
  function buildVerdict(label1, label2, baseDiaMm, newDiaMm) {
    const diffPct = ((newDiaMm - baseDiaMm) / baseDiaMm) * 100;
    const abs = Math.abs(diffPct);

    const deltaDia = newDiaMm - baseDiaMm;
    const clearanceMm = deltaDia / 2;
    const speedoErrPct = (newDiaMm / baseDiaMm - 1) * 100;

    let grade, title, shortText, longText;

    if (abs <= 1.5) {
      grade = "ok";
      title = tr("wheels.verdict_ok_title");
      shortText = tr("wheels.verdict_ok_short", { pct: diffPct.toFixed(2) });
      longText = tr("wheels.verdict_ok_long", { pct: diffPct.toFixed(2) });
    } else if (abs <= 2.0) {
      grade = "warn";
      title = tr("wheels.verdict_warn_title");
      shortText = tr("wheels.verdict_warn_short", { pct: diffPct.toFixed(2) });
      longText = tr("wheels.verdict_warn_long", { pct: diffPct.toFixed(2) });
    } else {
      grade = "bad";
      title = tr("wheels.verdict_bad_title");
      shortText = tr("wheels.verdict_bad_short", { pct: diffPct.toFixed(2) });
      longText = tr("wheels.verdict_bad_long", { pct: diffPct.toFixed(2) });
    }

    let hint = "";
    if (diffPct > 0) {
      hint = tr("wheels.verdict_hint_bigger", {
        err: Math.abs(speedoErrPct).toFixed(1),
        mm: Math.round(clearanceMm),
      });
    } else if (diffPct < 0) {
      hint = tr("wheels.verdict_hint_smaller", {
        err: Math.abs(speedoErrPct).toFixed(1),
        mm: Math.round(Math.abs(clearanceMm)),
      });
    } else {
      hint = tr("wheels.verdict_hint_same");
    }

    const seo = tr("wheels.verdict_seo", { s2: label2, s1: label1 });

    return { grade, title, shortText, longText, hint, seo, diffPct, absDiffPct: abs };
  }

  function renderVerdict(compareEl, statusEl, verdict) {
    if (compareEl) {
      const verdictHtml = `
        <div class="verdict-box ${verdict.grade}">
          <div class="verdict-title">${verdict.title}</div>
          <div class="verdict-short">${verdict.shortText}</div>
          <div class="verdict-long">${verdict.longText}</div>
          <div class="verdict-hint">${verdict.hint}</div>
          <div class="verdict-seo">${verdict.seo}</div>
        </div>
      `;
      compareEl.innerHTML = verdictHtml + compareEl.innerHTML;
    }

    if (statusEl) statusEl.textContent = verdict.title;
  }

  function clearStatus() {
    const s = el("status");
    if (s) s.textContent = "";
  }

  // =========================
  // FAQ Accordion
  // =========================
  function initFaqAccordion() {
    const root = document.getElementById("whlFaq");
    if (!root) return;

    root.addEventListener("click", (e) => {
      const btn = e.target.closest(".acc-q");
      if (!btn) return;

      const item = btn.closest(".acc-item");
      if (!item) return;

      const panel = item.querySelector(".acc-a");
      const isOpen = item.classList.contains("is-open");

      root.querySelectorAll(".acc-item.is-open").forEach((x) => {
        if (x !== item) {
          x.classList.remove("is-open");
          const b = x.querySelector(".acc-q");
          const p = x.querySelector(".acc-a");
          if (b) b.setAttribute("aria-expanded", "false");
          if (p) p.hidden = true;
        }
      });

      item.classList.toggle("is-open", !isOpen);
      btn.setAttribute("aria-expanded", String(!isOpen));
      if (panel) panel.hidden = isOpen;
    });

    const first = root.querySelector(".acc-item");
    if (first) {
      const b = first.querySelector(".acc-q");
      const p = first.querySelector(".acc-a");
      first.classList.add("is-open");
      if (b) b.setAttribute("aria-expanded", "true");
      if (p) p.hidden = false;
    }
  }

  function doCalc() {
    const v1 = validateSize(1);
    const v2 = validateSize(2);

    const result = el("result");
    const compare = el("compare");

    if (!v1.ok) {
      if (result) {
        result.innerHTML = tr("wheels.err_fill_correct_size", {
          fields: `<b>${v1.errors.join("</b>, <b>")}</b>`,
          n: 1,
        });
      }
      if (compare) compare.innerHTML = "";
      el("kpi1").innerHTML = "";
      el("kpi2").innerHTML = "";
      clearStatus();
      return;
    }

    const d1 = calcTire(v1.w, v1.a, v1.r);
    renderKpi(1, d1);

    if (!state.two) {
      if (result) {
        result.innerHTML = tr("wheels.single_result", {
          size: `<b>${fmt0(d1.w)}/${fmt0(d1.a)} R${fmt0(d1.r)}</b>`,
          dia: `<b>${fmt(d1.dia, 1)} ${tr("common.unit_mm")}</b>`,
          circ: `<b>${fmt(d1.circM, 3)} ${tr("wheels.unit_m")}</b>`,
        });
      }
      if (compare) compare.innerHTML = "";
      el("kpi2").innerHTML = "";
      clearStatus();
      return;
    }

    if (!v2.ok) {
      if (result) {
        result.innerHTML = tr("wheels.err_fill_correct_size", {
          fields: `<b>${v2.errors.join("</b>, <b>")}</b>`,
          n: 2,
        });
      }
      if (compare) compare.innerHTML = "";
      el("kpi2").innerHTML = "";
      clearStatus();
      return;
    }

    const d2 = calcTire(v2.w, v2.a, v2.r);
    renderKpi(2, d2);

    const diaDiff = d2.dia - d1.dia;
    const diaDiffPct = (diaDiff / d1.dia) * 100;
    const clearance = diaDiff / 2;
    const circDiffPct = (d2.circ / d1.circ - 1) * 100;

    const errPct = speedErrorPercent(d1.circ, d2.circ);
    const actual100 = 100 * (1 + errPct / 100);

    const okBand = Math.abs(diaDiffPct) <= 2;

    const label1 = `${fmt0(d1.w)}/${fmt0(d1.a)} R${fmt0(d1.r)}`;
    const label2 = `${fmt0(d2.w)}/${fmt0(d2.a)} R${fmt0(d2.r)}`;
    const verdict = buildVerdict(label1, label2, d1.dia, d2.dia);

    if (result) {
      result.innerHTML = tr("wheels.compare_line", {
        s1: `<b>${label1}</b>`,
        s2: `<b>${label2}</b>`,
        band: okBand
          ? `<b style='color:#1a7f37'>${tr("wheels.within_2")}</b>`
          : `<b style='color:#b42318'>${tr("wheels.outside_2")}</b>`,
      });
    }

    if (compare) {
      const signDia = diaDiff >= 0 ? "+" : "−";
      const signDiaPct = diaDiffPct >= 0 ? "+" : "−";
      const signClr = clearance >= 0 ? "+" : "−";
      const signCirc = circDiffPct >= 0 ? "+" : "−";
      const signErr = errPct >= 0 ? "+" : "−";

      compare.innerHTML = `
        <div class="compare-card">
          <div class="compare-title">${tr("wheels.difference")}</div>
          <div class="compare-grid">
            <div class="compare-item">
              <div class="compare-label">${tr("wheels.diameter")}</div>
              <div class="compare-value">
                ${signDia}${fmt(Math.abs(diaDiff), 1)} ${tr("common.unit_mm")}
                (${signDiaPct}${fmt(Math.abs(diaDiffPct), 2)}%)
              </div>
            </div>

            <div class="compare-item">
              <div class="compare-label">${tr("wheels.clearance")}</div>
              <div class="compare-value">
                ${signClr}${fmt(Math.abs(clearance), 1)} ${tr("common.unit_mm")}
              </div>
            </div>

            <div class="compare-item">
              <div class="compare-label">${tr("wheels.circumference")}</div>
              <div class="compare-value">
                ${signCirc}${fmt(Math.abs(circDiffPct), 2)}%
              </div>
            </div>

            <div class="compare-item">
              <div class="compare-label">${tr("wheels.speedometer_error")}</div>
              <div class="compare-value">
                ${tr("wheels.at_100")} <b>${fmt(actual100, 1)} ${tr("common.unit_km_h")}</b>
                (${signErr}${fmt(Math.abs(errPct), 2)}%)
              </div>
            </div>
          </div>

          <div style="margin-top:10px;color:#5b6477;font-size:13px;">
            ${tr("wheels.explanation")}
          </div>
        </div>
      `;

      renderVerdict(compare, el("status"), verdict);
    }
  }

  function setMode(two) {
    state.two = two;

    const b1 = el("mode1");
    const b2 = el("mode2");
    const box2 = el("size2_box");

    if (b1) b1.classList.toggle("active", !two);
    if (b2) b2.classList.toggle("active", two);
    if (box2) box2.style.display = two ? "" : "none";

    if (isAuto()) doCalc();
    else {
      el("compare").innerHTML = "";
      el("kpi2").innerHTML = "";
      clearStatus();
    }
  }

  function resetAll() {
    ["w1", "a1", "r1", "w2", "a2", "r2"].forEach((id) => {
      const n = el(id);
      if (n) n.value = "";
    });
    el("kpi1").innerHTML = "";
    el("kpi2").innerHTML = "";
    el("compare").innerHTML = "";
    el("status").textContent = "";
    el("result").textContent = tr("wheels.hint_enter_and_calc");
  }

  function buildShareLink() {
    const p = new URLSearchParams();
    p.set("m", state.two ? "2" : "1");
    p.set("ac", isAuto() ? "1" : "0");

    ["w1", "a1", "r1", "w2", "a2", "r2"].forEach((id) => {
      const v = (el(id)?.value || "").trim();
      if (v) p.set(id, v);
    });

    const base = `${location.origin}${location.pathname}`;
    return `${base}?${p.toString()}`;
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

  async function share() {
    const url = buildShareLink();
    try {
      await copyText(url);
      el("status").textContent = tr("wheels.link_copied");
      setTimeout(() => (el("status").textContent = ""), 2500);
    } catch {
      prompt(tr("wheels.copy_link_prompt"), url);
    }
  }

  async function copyResult() {
    const textParts = [];
    const res = el("result")?.innerText?.trim();
    const cmp = el("compare")?.innerText?.trim();

    if (res) textParts.push(res);
    if (cmp) textParts.push("\n" + cmp);

    const out = textParts.join("\n").trim();
    if (!out) {
      el("status").textContent = tr("wheels.nothing_to_copy");
      setTimeout(() => (el("status").textContent = ""), 2500);
      return;
    }

    try {
      await copyText(out);
      el("status").textContent = tr("wheels.result_copied");
      setTimeout(() => (el("status").textContent = ""), 2500);
    } catch {
      prompt(tr("wheels.copy_result_prompt"), out);
    }
  }

  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    if (![...q.keys()].length) return;

    const m = q.get("m");
    setMode(m === "2");

    const ac = q.get("ac");
    if (ac && el("auto_calc_toggle")) el("auto_calc_toggle").checked = ac === "1";

    ["w1", "a1", "r1", "w2", "a2", "r2"].forEach((id) => {
      if (q.has(id) && el(id)) el(id).value = q.get(id);
    });

    doCalc();
  }

  function bindAutoCalc() {
    const nodes = document.querySelectorAll(".whl-shell input, .whl-shell select");
    nodes.forEach((n) => {
      n.addEventListener("input", () => {
        if (isAuto()) doCalc();
      });
      n.addEventListener("change", () => {
        if (isAuto()) doCalc();
      });
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    el("mode1")?.addEventListener("click", () => setMode(false));
    el("mode2")?.addEventListener("click", () => setMode(true));

    el("calcBtn")?.addEventListener("click", doCalc);
    el("resetBtn")?.addEventListener("click", resetAll);
    el("shareBtn")?.addEventListener("click", share);
    el("copyBtn")?.addEventListener("click", copyResult);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doCalc();
    });

    bindAutoCalc();
    applyFromUrl();
    initFaqAccordion();
  });
})();
