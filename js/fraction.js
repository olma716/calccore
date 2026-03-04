/* =========================================================
   FRACTION CALCULATOR — CalcCore
   Tabs:
     T1: operations with fractions (dynamic count) — mixed input blocks
     T2: simplify — mixed input block
     T3: mixed -> improper — mixed input block
     T4: improper -> mixed — mixed input block
   Features:
     - Auto-calc (silent)
     - Copy result
     - Reset all
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
            for (const [kk, vv] of Object.entries(vars)) {
              s = s.replaceAll(`{${kk}}`, String(vv));
            }
          }
          return s;
        };

  const toast = $("fToast");
  const result = $("fResult");
  const details = $("fDetails");
  const autoCalcEl = $("autoCalc");

  const tabs = Array.from(document.querySelectorAll(".fcalc-tab"));
  const panels = Array.from(document.querySelectorAll(".fcalc-panel"));

  // T1 dynamic chain controls
  const chainEl = $("t1_chain");
  const countEl = $("t1_count");
  const addBtn = $("t1_add");
  const removeBtn = $("t1_remove");

  // T2/T3/T4 blocks (mixed-style input)
  const t2Block = $("t2_block");
  const t3Block = $("t3_block");
  const t4Block = $("t4_block");

  // ---------- UI helpers ----------
  function setToast(msg) {
    if (!toast) return;
    toast.textContent = msg || "";
  }

  function setResult(main, extra = "") {
    if (result) result.textContent = main || "";
    if (details) details.innerHTML = extra || "";
  }

  function isEN() {
    return (document.documentElement.lang || "").toLowerCase().startsWith("en");
  }

  function hintPickMode() {
    return isEN()
      ? "Choose a mode and click “Calculate”."
      : "Вибери режим і натисни «Розрахувати».";
  }

  function hintEnter() {
    return isEN() ? "Enter values." : "Введи дані.";
  }

  // -----------------------------
  // Math helpers (fractions)
  // -----------------------------
  const abs = Math.abs;

  function gcd(a, b) {
    a = Math.trunc(abs(a));
    b = Math.trunc(abs(b));
    while (b !== 0) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 0;
  }

  function normFrac(fr) {
    let n = fr?.n;
    let d = fr?.d;

    if (!Number.isFinite(n) || !Number.isFinite(d)) return null;

    n = Math.trunc(n);
    d = Math.trunc(d);

    if (d === 0) return null;
    if (d < 0) {
      d = -d;
      n = -n;
    }

    const g = gcd(n, d);
    if (g > 1) {
      n /= g;
      d /= g;
    }
    return { n, d };
  }

  function add(a, b) {
    return normFrac({ n: a.n * b.d + b.n * a.d, d: a.d * b.d });
  }
  function sub(a, b) {
    return normFrac({ n: a.n * b.d - b.n * a.d, d: a.d * b.d });
  }
  function mul(a, b) {
    return normFrac({ n: a.n * b.n, d: a.d * b.d });
  }
  function div(a, b) {
    if (b.n === 0) return null;
    return normFrac({ n: a.n * b.d, d: a.d * b.n });
  }

  function toMixed(fr) {
    const n = fr.n;
    const d = fr.d;

    const sign = n < 0 ? -1 : 1;
    const an = abs(n);
    const w = Math.trunc(an / d);
    const r = an % d;

    return { sign, w, r, d };
  }

  function fmtFrac(fr) {
    if (!fr) return "";
    if (fr.d === 1) return String(fr.n);

    const m = toMixed(fr);
    const sgn = m.sign < 0 ? "-" : "";

    if (m.w === 0) return `${sgn}${m.r}/${m.d}`;
    if (m.r === 0) return `${sgn}${m.w}`;
    return `${sgn}${m.w} ${m.r}/${m.d}`;
  }
  function fracToDecimal(fr){

  if(!fr) return "";

  const v = fr.n / fr.d;

  // округлення до 6 знаків
  return Number(v.toFixed(6)).toString();
}

  // Vertical fraction HTML (for details box)
  function renderFraction(fr) {
    if (!fr) return "";
    if (fr.d === 1) {
      return `
        <div class="fcalc-result-frac">
          <div class="fcalc-result-num">${fr.n}</div>
        </div>
      `;
    }
    return `
      <div class="fcalc-result-frac">
        <div class="fcalc-result-num">${fr.n}</div>
        <div class="fcalc-result-bar"></div>
        <div class="fcalc-result-den">${fr.d}</div>
      </div>
    `;
  }

  function renderPrettyResult(fr){

  if(!fr) return "";

  const decimal = fracToDecimal(fr);

  return `
    <div class="fcalc-result-row">

        <div class="fcalc-result-box">
            ${renderFraction(fr)}
        </div>

        <div class="fcalc-result-eq">=</div>

        <div class="fcalc-result-box2">
            ${renderMixedFraction(fr)}
        </div>

        <div class="fcalc-result-eq">=</div>

        <div class="fcalc-result-box3">
            ${decimal}
        </div>

    </div>
  `;
}
function renderMixedFraction(fr){

  if(!fr) return "";

  const m = toMixed(fr);

  const sign = m.sign < 0 ? "-" : "";

  // тільки ціле число
  if(m.r === 0){
    return `<div class="fcalc-mixed">${sign}${m.w}</div>`;
  }

  // тільки дріб
  if(m.w === 0){
    return `
      <div class="fcalc-mixed">
        ${sign}
        ${renderFraction({n:m.r,d:m.d})}
      </div>
    `;
  }

  // мішаний
  return `
    <div class="fcalc-mixed">
        <span class="fcalc-mixed-whole">${sign}${m.w}</span>
        ${renderFraction({n:m.r,d:m.d})}
    </div>
  `;
}

  // -----------------------------
  // Mixed blocks reader (whole + num/den)
  // -----------------------------
  function intVal(v) {
    const s = String(v ?? "").trim();
    if (!s) return NaN;
    if (!/^-?\d+$/.test(s)) return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  }

  function readMixedFromEl(el) {
    if (!el) return null;

    const wholeEl = el.querySelector(".fcalc-whole");
    const numEl = el.querySelector(".fcalc-num");
    const denEl = el.querySelector(".fcalc-den");

    const wRaw = intVal(wholeEl?.value);
    const num = intVal(numEl?.value);
    const den = intVal(denEl?.value);

    const w = Number.isFinite(wRaw) ? wRaw : 0;

    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;

    // sign: from whole if negative, else from numerator if whole=0 and num negative
    let sign = 1;
    if (w < 0) sign = -1;
    if (w === 0 && num < 0) sign = -1;

    const wAbs = abs(w);
    const numAbs = abs(num);

    return normFrac({ n: (wAbs * den + numAbs) * sign, d: den });
  }

  // -----------------------------
  // Tab UI
  // -----------------------------
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
    setResult(hintPickMode(), "");
    scheduleAutoCalc();
  }

  tabs.forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

  // -----------------------------
  // Copy result
  // -----------------------------
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;

    const text = result?.textContent?.trim();
    if (!text || text === hintPickMode()) {
      setToast(isEN() ? "Calculate first." : "Спочатку порахуй результат.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setToast(isEN() ? "Copied!" : "Скопійовано!");
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(isEN() ? "Copy failed." : "Не вдалося скопіювати.");
    }
  });

  // -----------------------------
  // Reset all
  // -----------------------------
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-reset]");
    if (!btn) return;

    const root = document.querySelector(".fcalc");
    root?.querySelectorAll("input").forEach((inp) => {
      if (inp.id === "autoCalc") return;
      inp.value = "";
    });

    // reset chain to 2 items
    if (countEl) countEl.value = "2";
    buildChain(getChainCount());
    chainEl?.querySelectorAll("select.fcalc-op").forEach((s) => (s.value = "add"));

    setToast(isEN() ? "Reset done." : "Скинуто.");
    setResult(hintEnter(), "");
    setTimeout(() => setToast(""), 1200);
  });

  // -----------------------------
  // T1: Dynamic chain build/read (mixed numbers)
  // -----------------------------
  function getChainCount() {
    const v = Number(countEl?.value || 2);
    return Number.isFinite(v) ? Math.max(2, Math.min(10, v)) : 2;
  }

  function buildChain(count) {
    if (!chainEl) return;
    chainEl.innerHTML = "";

    for (let i = 0; i < count; i++) {
      const fr = document.createElement("div");
      fr.className = "fcalc-fr";
      fr.dataset.index = String(i);

      fr.innerHTML = `
        <input class="fcalc-whole" inputmode="numeric" placeholder="0"
          aria-label="${isEN() ? "Whole" : "Ціле"}" />
        <div class="fcalc-frac">
          <input class="fcalc-num" inputmode="numeric" placeholder="1"
            aria-label="${isEN() ? "Numerator" : "Чисельник"}" />
          <div class="fcalc-bar"></div>
          <input class="fcalc-den" inputmode="numeric" placeholder="2"
            aria-label="${isEN() ? "Denominator" : "Знаменник"}" />
        </div>
      `;
      chainEl.appendChild(fr);

      if (i < count - 1) {
        const op = document.createElement("select");
        op.className = "fcalc-op";
        op.dataset.opIndex = String(i);
        op.setAttribute("aria-label", isEN() ? "Operation" : "Операція");
        op.innerHTML = `
          <option value="add">+</option>
          <option value="sub">−</option>
          <option value="mul">×</option>
          <option value="div">÷</option>
        `;
        chainEl.appendChild(op);
      }
    }
  }

  function setChainCount(n) {
    const v = Math.max(2, Math.min(10, Math.trunc(n)));
    if (countEl) countEl.value = String(v);
    buildChain(v);
    scheduleAutoCalc();
  }

  countEl?.addEventListener("change", () => setChainCount(getChainCount()));
  addBtn?.addEventListener("click", () => setChainCount(getChainCount() + 1));
  removeBtn?.addEventListener("click", () => setChainCount(Math.max(2, getChainCount() - 1)));

  // -----------------------------
  // Calculations
  // -----------------------------
  function calcT1({ silent = false } = {}) {
    if (!chainEl) return false;

    const items = Array.from(chainEl.children);
    const firstFrEl = items.find((x) => x.classList.contains("fcalc-fr"));
    if (!firstFrEl) return false;

    let acc = readMixedFromEl(firstFrEl);
    if (!acc) {
      if (!silent) setToast(isEN() ? "Enter valid fractions." : "Введи коректні дроби.");
      return false;
    }

    for (let i = 1; i < items.length; i += 2) {
      const opEl = items[i];
      const frEl = items[i + 1];
      if (!opEl || !frEl) break;

      const op = opEl.value;
      const fr = readMixedFromEl(frEl);

      if (!fr) {
        if (!silent) setToast(isEN() ? "Fill all numerators/denominators." : "Заповни всі чисельники/знаменники.");
        return false;
      }

      let next = null;
      if (op === "add") next = add(acc, fr);
      if (op === "sub") next = sub(acc, fr);
      if (op === "mul") next = mul(acc, fr);
      if (op === "div") next = div(acc, fr);

      if (!next) {
        if (!silent) setToast(isEN() ? "Division by zero." : "Ділення на нуль.");
        return false;
      }
      acc = next;
    }

    const main = isEN() ? "Result" : "Результат";
    const extra = renderPrettyResult(acc);
    setResult(main, extra);
    return true;
  }

  function calcT2({ silent = false } = {}) {
    const fr = readMixedFromEl(t2Block);
    if (!fr) {
      if (!silent) setToast(isEN() ? "Enter a valid fraction." : "Введи коректний дріб.");
      return false;
    }
    const main = isEN() ? "Result" : "Результат";
    const extra = renderPrettyResult(fr);
    setResult(main, extra);
    return true;
  }

  function calcT3({ silent = false } = {}) {
    const fr = readMixedFromEl(t3Block);
    if (!fr) {
      if (!silent) setToast(isEN() ? "Enter a valid mixed number." : "Введи коректний мішаний дріб.");
      return false;
    }
    const main = isEN() ? "Result" : "Результат";
    const extra = renderPrettyResult(fr);
    setResult(main, extra);
    return true;
  }

  function calcT4({ silent = false } = {}) {
    const fr = readMixedFromEl(t4Block);
    if (!fr) {
      if (!silent) setToast(isEN() ? "Enter a valid fraction." : "Введи коректний дріб.");
      return false;
    }
    const main = isEN() ? "Result" : "Результат";
    const extra = renderPrettyResult(fr);
    setResult(main, extra);
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

  // Buttons
  $("btnT1")?.addEventListener("click", () => runCalc({ silent: false }));
  $("btnT2")?.addEventListener("click", () => runCalc({ silent: false }));
  $("btnT3")?.addEventListener("click", () => runCalc({ silent: false }));
  $("btnT4")?.addEventListener("click", () => runCalc({ silent: false }));

  // Enter to calculate
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

  const calcRoot = document.querySelector(".fcalc");
  if (calcRoot) {
    calcRoot.addEventListener("input", (e) => {
      if (!isAutoOn()) return;
      const panel = e.target.closest(".fcalc-panel");
      if (!panel || !panel.classList.contains("is-active")) return;
      scheduleAutoCalc();
    });

    calcRoot.addEventListener("change", (e) => {
      if (!isAutoOn()) return;
      const panel = e.target.closest(".fcalc-panel");
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

  // -----------------------------
  // Init
  // -----------------------------
  buildChain(getChainCount());
  switchTab("t1");
})();