/* =========================================================
   PERCENT CALCULATOR — CalcCore
   - 4 tabs:
     T1: p% of x
     T2: part is what % of total
     T3: increase/decrease by p%
     T4: percent change (old -> new)
   - Auto-calc (silent) + copy + reset
   - i18n via window.t (percent.*)
========================================================= */

(() => {
  const $ = (id) => document.getElementById(id);

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

  const toast = $("pToast");
  const result = $("pResult");
  const details = $("pDetails");
  const autoCalcEl = $("autoCalc");

  const tabs = Array.from(document.querySelectorAll(".pcalc-tab"));
  const panels = Array.from(document.querySelectorAll(".pcalc-panel"));

  function n(val) {
    const s = String(val ?? "").trim().replace(/\s+/g, "").replace(",", ".");
    if (!s) return NaN;
    const num = Number(s);
    return Number.isFinite(num) ? num : NaN;
  }

  function fmt(x) {
    if (!Number.isFinite(x)) return "";
    const rounded = Math.abs(x) >= 1000 ? x.toFixed(2) : x.toString();
    const num = Number(rounded);
    return num.toLocaleString(window.i18nLocale ? window.i18nLocale() : "uk-UA", {
      maximumFractionDigits: 6,
    });
  }

  function setToast(msg) {
    if (!toast) return;
    toast.textContent = msg || "";
  }

  function setResult(main, extra = "") {
    if (result) result.textContent = main || "";
    if (details) details.innerHTML = extra || "";
  }

  function activeTabId() {
    const t = tabs.find((b) => b.classList.contains("is-active"));
    return t?.dataset?.tab || "t1";
  }

  function switchTab(id) {
    tabs.forEach((b) => {
      const isOn = b.dataset.tab === id;
      b.classList.toggle("is-active", isOn);
      b.setAttribute("aria-selected", isOn ? "true" : "false");
    });

    panels.forEach((p) => p.classList.toggle("is-active", p.id === id));

    setToast("");
    setResult(tt("percent.hint_pick_mode"), "");

    // if auto on — try recalc
    scheduleAutoCalc();
  }

  tabs.forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

  // -------- Copy result (button with data-copy) --------
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;

    const text = result?.textContent?.trim();
    if (!text || text.includes(tt("percent.hint_pick_mode").replace(/<[^>]+>/g, ""))) {
      setToast(tt("percent.copy_first_calc"));
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setToast(tt("percent.copy_ok"));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(tt("percent.copy_failed"));
    }
  });

  // -------- Reset (button with data-reset="t1|t2|t3|t4") --------
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-reset]");
    if (!btn) return;

    const t = btn.getAttribute("data-reset");
    if (!t) return;

    const panel = $(t);
    panel?.querySelectorAll("input").forEach((inp) => {
      if (inp.type === "radio") return;
      inp.value = "";
    });

    // reset radios for t3
    if (t === "t3") {
      const plus = panel?.querySelector('input[name="t3_op"][value="plus"]');
      if (plus) plus.checked = true;
    }

    setToast(tt("percent.reset_done"));
    setResult(tt("percent.hint_enter_and_calc"), "");
    setTimeout(() => setToast(""), 1200);
  });

  // -----------------------------
  // Calculations
  // -----------------------------
  function calcT1({ silent = false } = {}) {
    const p = n($("t1_percent")?.value);
    const x = n($("t1_number")?.value);

    if (!Number.isFinite(p) || !Number.isFinite(x)) {
      if (!silent) setToast(tt("percent.err_number_and_percent"));
      return false;
    }

    const r = (x * p) / 100;

    setResult(
      tt("percent.t1_line", { p: fmt(p), x: fmt(x), r: fmt(r) }),
      `<div><b>${tt("percent.formula")}:</b> ${fmt(x)} × ${fmt(p)} / 100 = <b>${fmt(r)}</b></div>`
    );

    return true;
  }

  function calcT2({ silent = false } = {}) {
    const part = n($("t2_part")?.value);
    const total = n($("t2_total")?.value);

    if (!Number.isFinite(part) || !Number.isFinite(total)) {
      if (!silent) setToast(tt("percent.err_part_and_total"));
      return false;
    }
    if (total === 0) {
      if (!silent) setToast(tt("percent.err_total_zero"));
      return false;
    }

    const p = (part / total) * 100;

    setResult(
      tt("percent.t2_line", { part: fmt(part), p: fmt(p), total: fmt(total) }),
      `<div><b>${tt("percent.formula")}:</b> ${fmt(part)} / ${fmt(total)} × 100 = <b>${fmt(p)}%</b></div>`
    );

    return true;
  }

  function calcT3({ silent = false } = {}) {
    const x = n($("t3_number")?.value);
    const p = n($("t3_percent")?.value);
    const op = document.querySelector('input[name="t3_op"]:checked')?.value || "plus";

    if (!Number.isFinite(x) || !Number.isFinite(p)) {
      if (!silent) setToast(tt("percent.err_number_and_percent"));
      return false;
    }

    const factor = op === "minus" ? 1 - p / 100 : 1 + p / 100;
    const r = x * factor;

    const signText = op === "minus" ? tt("percent.decrease") : tt("percent.increase");
    const signSymbol = op === "minus" ? "−" : "+";

    setResult(
      tt("percent.t3_line", { action: signText, x: fmt(x), p: fmt(p), r: fmt(r) }),
      `<div><b>${tt("percent.formula")}:</b> ${fmt(x)} × (1 ${signSymbol} ${fmt(p)}/100) = <b>${fmt(
        r
      )}</b></div>`
    );

    return true;
  }

  function calcT4({ silent = false } = {}) {
    const oldV = n($("t4_old")?.value);
    const newV = n($("t4_new")?.value);

    if (!Number.isFinite(oldV) || !Number.isFinite(newV)) {
      if (!silent) setToast(tt("percent.err_old_new"));
      return false;
    }
    if (oldV === 0) {
      if (!silent) setToast(tt("percent.err_old_zero"));
      return false;
    }

    const diff = newV - oldV;
    const p = (diff / oldV) * 100;

    const dir =
      diff > 0 ? tt("percent.growth") : diff < 0 ? tt("percent.drop") : tt("percent.no_change");

    setResult(
      tt("percent.t4_line", { dir, p: fmt(p) }),
      `<div><b>${tt("percent.old")}:</b> ${fmt(oldV)} → <b>${tt("percent.new")}:</b> ${fmt(newV)}</div>
       <div><b>${tt("percent.formula")}:</b> (${fmt(newV)} − ${fmt(oldV)}) / ${fmt(oldV)} × 100 = <b>${fmt(
        p
      )}%</b></div>`
    );

    return true;
  }

  function runCalc({ silent = false } = {}) {
    const id = activeTabId();
    setToast("");

    if (id === "t1") return calcT1({ silent });
    if (id === "t2") return calcT2({ silent });
    if (id === "t3") return calcT3({ silent });
    if (id === "t4") return calcT4({ silent });
    return false;
  }

  // Buttons "Calculate"
  $("btnT1")?.addEventListener("click", () => runCalc({ silent: false }));
  $("btnT2")?.addEventListener("click", () => runCalc({ silent: false }));
  $("btnT3")?.addEventListener("click", () => runCalc({ silent: false }));
  $("btnT4")?.addEventListener("click", () => runCalc({ silent: false }));

  // Enter to calculate (manual)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    runCalc({ silent: false });
  });

  // -----------------------------
  // Auto-calc
  // -----------------------------
  function isAutoOn() {
    return !!autoCalcEl && autoCalcEl.checked;
  }

  let autoTimer = null;
  function scheduleAutoCalc() {
    if (!isAutoOn()) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => runCalc({ silent: true }), 180);
  }

  // Listen only inside calculator root
  const calcRoot = document.querySelector(".pcalc");
  if (calcRoot) {
    calcRoot.addEventListener("input", (e) => {
      if (!isAutoOn()) return;
      const panel = e.target.closest(".pcalc-panel");
      if (!panel || !panel.classList.contains("is-active")) return;
      scheduleAutoCalc();
    });

    calcRoot.addEventListener("change", (e) => {
      if (!isAutoOn()) return;
      const panel = e.target.closest(".pcalc-panel");
      if (!panel || !panel.classList.contains("is-active")) return;
      scheduleAutoCalc();
    });
  }

  if (autoCalcEl) {
    autoCalcEl.addEventListener("change", () => {
      setToast("");
      if (autoCalcEl.checked) scheduleAutoCalc();
    });
  }

  // init
  switchTab("t1");
})();
