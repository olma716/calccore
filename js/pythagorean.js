(() => {
  const $ = (id) => document.getElementById(id);

  const toast = $("pToast");
  const result = $("pResult");
  const details = $("pDetails");
  const visual = $("pVisual");
  const autoCalcEl = $("autoCalc");
  const calcBtn = $("btnCalc");
  const modeEl = $("pMode");
  const formulaBox = $("pFormulaBox");

  const panelHypotenuse = $("panelHypotenuse");
  const panelLegA = $("panelLegA");
  const panelLegB = $("panelLegB");

  const phA = $("phA");
  const phB = $("phB");

  const paC = $("paC");
  const paB = $("paB");

  const pbC = $("pbC");
  const pbA = $("pbA");

  function isEN() {
    return (document.documentElement.lang || "").toLowerCase().startsWith("en");
  }

  function t(uk, en) {
    return isEN() ? en : uk;
  }

  function setToast(msg) {
    if (!toast) return;
    toast.textContent = msg || "";
  }

  function setResult(main, extra = "") {
    if (result) result.textContent = main || "";
    if (details) details.innerHTML = extra || "";
  }

  function setVisual(html = "") {
    if (!visual) return;
    visual.innerHTML = html || "";
  }

  function initialHint() {
    return t(
      "Введи дані та натисни «Розрахувати».",
      "Enter values and click “Calculate”."
    );
  }

  function enterHint() {
    return t("Введи дані.", "Enter values.");
  }

  function parseNum(val) {
    const s = String(val ?? "").trim().replace(",", ".");
    if (!s) return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function fmt(n) {
    if (!Number.isFinite(n)) return "—";
    if (Math.abs(n) < 1e-12) return "0";
    return Number(n.toFixed(10)).toString();
  }

  function fmtVisual(n) {
    if (!Number.isFinite(n)) return "—";
    if (Math.abs(n) < 1e-12) return "0";
    return Number(n.toFixed(2)).toString();
  }

  function renderResultGrid(items) {
    return `
      <div class="pcalc-result-grid">
        ${items.map((item) => `
          <div class="pcalc-stat">
            <div class="pcalc-stat__label">${item.label}</div>
            <div class="pcalc-stat__value">${item.value}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function buildStep(title, text) {
    return `
      <div class="pcalc-step">
        <div class="pcalc-step__title">${title}</div>
        <div class="pcalc-step__text">${text}</div>
      </div>
    `;
  }

  function getMode() {
    return modeEl?.value || "hypotenuse";
  }

  function updateModeUI() {
    const mode = getMode();

    if (panelHypotenuse) panelHypotenuse.hidden = mode !== "hypotenuse";
    if (panelLegA) panelLegA.hidden = mode !== "leg-a";
    if (panelLegB) panelLegB.hidden = mode !== "leg-b";

    if (formulaBox) {
      if (mode === "hypotenuse") {
        formulaBox.innerHTML = `<span class="pcalc-formula__part">c = √(a² + b²)</span>`;
      } else if (mode === "leg-a") {
        formulaBox.innerHTML = `<span class="pcalc-formula__part">a = √(c² − b²)</span>`;
      } else {
        formulaBox.innerHTML = `<span class="pcalc-formula__part">b = √(c² − a²)</span>`;
      }
    }

    renderIdleVisual();
  }

  function renderIdleVisual() {
    const mode = getMode();

    if (mode === "hypotenuse") {
      setVisual(drawTriangle("?", "?", "?", "c"));
    } else if (mode === "leg-a") {
      setVisual(drawTriangle("?", "?", "?", "a"));
    } else {
      setVisual(drawTriangle("?", "?", "?", "b"));
    }
  }

  function drawTriangle(aLabel, bLabel, cLabel, accent = "c") {
    const classA = accent === "a" ? "accent-leg" : "shape-stroke";
    const classB = accent === "b" ? "accent-leg-2" : "shape-stroke";
    const classC = accent === "c" ? "accent-hyp" : "shape-stroke";

    return `
      <svg class="pcalc-svg" viewBox="0 0 420 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t("Схема прямокутного трикутника", "Right triangle diagram")}">
        <polygon class="shape-fill" points="90,195 300,195 90,70"></polygon>

        <line class="${classA}" x1="90" y1="195" x2="300" y2="195"></line>
        <line class="${classB}" x1="90" y1="195" x2="90" y2="70"></line>
        <line class="${classC}" x1="90" y1="70" x2="300" y2="195"></line>

        <rect class="right-angle" x="90" y="183" width="12" height="12"></rect>

        <circle class="point" cx="90" cy="195" r="3.5"></circle>
        <circle class="point" cx="300" cy="195" r="3.5"></circle>
        <circle class="point" cx="90" cy="70" r="3.5"></circle>

        <text class="label-main" x="195" y="218" text-anchor="middle">a = ${aLabel || "?"}</text>
        <text class="label-main" x="72" y="136" text-anchor="end">b = ${bLabel || "?"}</text>
        <text class="label-main" x="225" y="120" text-anchor="middle">c = ${cLabel || "?"}</text>

        <text class="label-muted" x="83" y="211">A</text>
        <text class="label-muted" x="307" y="201">B</text>
        <text class="label-muted" x="90" y="58" text-anchor="middle">C</text>
      </svg>
    `;
  }

  function solveHypotenuse({ silent = false } = {}) {
    const a = parseNum(phA?.value);
    const b = parseNum(phB?.value);

    if (![a, b].every(Number.isFinite)) {
      if (!silent) setToast(t("Введи коректні числа.", "Enter valid numbers."));
      setVisual(drawTriangle(fmtVisual(a), fmtVisual(b), "?", "c"));
      return false;
    }

    if (a <= 0 || b <= 0) {
      if (!silent) setToast(t("Катети мають бути більші за 0.", "Legs must be greater than 0."));
      setVisual(drawTriangle(fmtVisual(a), fmtVisual(b), "?", "c"));
      return false;
    }

    const c = Math.sqrt(a * a + b * b);

    setVisual(drawTriangle(fmtVisual(a), fmtVisual(b), fmtVisual(c), "c"));

    const mainText = `${t("Гіпотенуза", "Hypotenuse")} c = ${fmt(c)}`;

    const extra =
      renderResultGrid([
        { label: "a", value: fmt(a) },
        { label: "b", value: fmt(b) },
        { label: "c", value: fmt(c) }
      ]) +
      renderResultGrid([
        { label: "a²", value: fmt(a * a) },
        { label: "b²", value: fmt(b * b) },
        { label: "a² + b²", value: fmt(a * a + b * b) }
      ]) +
      `<div class="pcalc-steps">
        ${buildStep(
          t("Крок 1. Формула", "Step 1. Formula"),
          `c = √(a² + b²)`
        )}
        ${buildStep(
          t("Крок 2. Підстановка значень", "Step 2. Substitute values"),
          `c = √(${fmt(a)}² + ${fmt(b)}²)`
        )}
        ${buildStep(
          t("Крок 3. Обчислення квадратів", "Step 3. Calculate squares"),
          `c = √(${fmt(a * a)} + ${fmt(b * b)}) = √${fmt(a * a + b * b)}`
        )}
        ${buildStep(
          t("Крок 4. Результат", "Step 4. Result"),
          `c = <b>${fmt(c)}</b>`
        )}
      </div>`;

    setResult(mainText, extra);
    return true;
  }

  function solveLegA({ silent = false } = {}) {
    const c = parseNum(paC?.value);
    const b = parseNum(paB?.value);

    if (![c, b].every(Number.isFinite)) {
      if (!silent) setToast(t("Введи коректні числа.", "Enter valid numbers."));
      setVisual(drawTriangle("?", fmtVisual(b), fmtVisual(c), "a"));
      return false;
    }

    if (c <= 0 || b <= 0) {
      if (!silent) setToast(t("Сторони мають бути більші за 0.", "Sides must be greater than 0."));
      setVisual(drawTriangle("?", fmtVisual(b), fmtVisual(c), "a"));
      return false;
    }

    if (c <= b) {
      if (!silent) setToast(t("Гіпотенуза має бути більшою за катет b.", "Hypotenuse must be greater than leg b."));
      setVisual(drawTriangle("?", fmtVisual(b), fmtVisual(c), "a"));
      setResult(
        t("Некоректні дані.", "Invalid values."),
        buildStep(
          t("Пояснення", "Explanation"),
          t(
            "У прямокутному трикутнику гіпотенуза завжди більша за будь-який катет.",
            "In a right triangle, the hypotenuse is always greater than either leg."
          )
        )
      );
      return false;
    }

    const a = Math.sqrt(c * c - b * b);

    setVisual(drawTriangle(fmtVisual(a), fmtVisual(b), fmtVisual(c), "a"));

    const mainText = `${t("Катет", "Leg")} a = ${fmt(a)}`;

    const extra =
      renderResultGrid([
        { label: "c", value: fmt(c) },
        { label: "b", value: fmt(b) },
        { label: "a", value: fmt(a) }
      ]) +
      renderResultGrid([
        { label: "c²", value: fmt(c * c) },
        { label: "b²", value: fmt(b * b) },
        { label: "c² − b²", value: fmt(c * c - b * b) }
      ]) +
      `<div class="pcalc-steps">
        ${buildStep(
          t("Крок 1. Формула", "Step 1. Formula"),
          `a = √(c² − b²)`
        )}
        ${buildStep(
          t("Крок 2. Підстановка значень", "Step 2. Substitute values"),
          `a = √(${fmt(c)}² − ${fmt(b)}²)`
        )}
        ${buildStep(
          t("Крок 3. Обчислення квадратів", "Step 3. Calculate squares"),
          `a = √(${fmt(c * c)} − ${fmt(b * b)}) = √${fmt(c * c - b * b)}`
        )}
        ${buildStep(
          t("Крок 4. Результат", "Step 4. Result"),
          `a = <b>${fmt(a)}</b>`
        )}
      </div>`;

    setResult(mainText, extra);
    return true;
  }

  function solveLegB({ silent = false } = {}) {
    const c = parseNum(pbC?.value);
    const a = parseNum(pbA?.value);

    if (![c, a].every(Number.isFinite)) {
      if (!silent) setToast(t("Введи коректні числа.", "Enter valid numbers."));
      setVisual(drawTriangle(fmtVisual(a), "?", fmtVisual(c), "b"));
      return false;
    }

    if (c <= 0 || a <= 0) {
      if (!silent) setToast(t("Сторони мають бути більші за 0.", "Sides must be greater than 0."));
      setVisual(drawTriangle(fmtVisual(a), "?", fmtVisual(c), "b"));
      return false;
    }

    if (c <= a) {
      if (!silent) setToast(t("Гіпотенуза має бути більшою за катет a.", "Hypotenuse must be greater than leg a."));
      setVisual(drawTriangle(fmtVisual(a), "?", fmtVisual(c), "b"));
      setResult(
        t("Некоректні дані.", "Invalid values."),
        buildStep(
          t("Пояснення", "Explanation"),
          t(
            "У прямокутному трикутнику гіпотенуза завжди більша за будь-який катет.",
            "In a right triangle, the hypotenuse is always greater than either leg."
          )
        )
      );
      return false;
    }

    const b = Math.sqrt(c * c - a * a);

    setVisual(drawTriangle(fmtVisual(a), fmtVisual(b), fmtVisual(c), "b"));

    const mainText = `${t("Катет", "Leg")} b = ${fmt(b)}`;

    const extra =
      renderResultGrid([
        { label: "c", value: fmt(c) },
        { label: "a", value: fmt(a) },
        { label: "b", value: fmt(b) }
      ]) +
      renderResultGrid([
        { label: "c²", value: fmt(c * c) },
        { label: "a²", value: fmt(a * a) },
        { label: "c² − a²", value: fmt(c * c - a * a) }
      ]) +
      `<div class="pcalc-steps">
        ${buildStep(
          t("Крок 1. Формула", "Step 1. Formula"),
          `b = √(c² − a²)`
        )}
        ${buildStep(
          t("Крок 2. Підстановка значень", "Step 2. Substitute values"),
          `b = √(${fmt(c)}² − ${fmt(a)}²)`
        )}
        ${buildStep(
          t("Крок 3. Обчислення квадратів", "Step 3. Calculate squares"),
          `b = √(${fmt(c * c)} − ${fmt(a * a)}) = √${fmt(c * c - a * a)}`
        )}
        ${buildStep(
          t("Крок 4. Результат", "Step 4. Result"),
          `b = <b>${fmt(b)}</b>`
        )}
      </div>`;

    setResult(mainText, extra);
    return true;
  }

  function solve({ silent = false } = {}) {
    const mode = getMode();

    if (mode === "hypotenuse") return solveHypotenuse({ silent });
    if (mode === "leg-a") return solveLegA({ silent });
    if (mode === "leg-b") return solveLegB({ silent });

    if (!silent) setToast(t("Невідомий режим.", "Unknown mode."));
    return false;
  }

  calcBtn?.addEventListener("click", () => {
    setToast("");
    solve({ silent: false });
  });

  modeEl?.addEventListener("change", () => {
    updateModeUI();
    scheduleAutoCalc();
  });

  document.addEventListener("click", async (e) => {
    const exampleBtn = e.target.closest(".pyth-example");
    if (exampleBtn) {
      const mode = exampleBtn.getAttribute("data-mode") || "hypotenuse";
      const v1 = exampleBtn.getAttribute("data-v1") || "";
      const v2 = exampleBtn.getAttribute("data-v2") || "";

      if (modeEl) modeEl.value = mode;
      updateModeUI();

      if (phA) phA.value = "";
      if (phB) phB.value = "";
      if (paC) paC.value = "";
      if (paB) paB.value = "";
      if (pbC) pbC.value = "";
      if (pbA) pbA.value = "";

      if (mode === "hypotenuse") {
        if (phA) phA.value = v1;
        if (phB) phB.value = v2;
      } else if (mode === "leg-a") {
        if (paC) paC.value = v1;
        if (paB) paB.value = v2;
      } else {
        if (pbC) pbC.value = v1;
        if (pbA) pbA.value = v2;
      }

      scheduleAutoCalc();
      return;
    }

    const resetBtn = e.target.closest("[data-reset]");
    if (resetBtn) {
      if (modeEl) modeEl.value = "hypotenuse";
      updateModeUI();

      if (phA) phA.value = "";
      if (phB) phB.value = "";
      if (paC) paC.value = "";
      if (paB) paB.value = "";
      if (pbC) pbC.value = "";
      if (pbA) pbA.value = "";

      setToast(t("Скинуто.", "Reset done."));
      setResult(enterHint(), "");
      renderIdleVisual();
      setTimeout(() => setToast(""), 1200);
      return;
    }

    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      const text = result?.textContent?.trim();
      if (!text || text === initialHint() || text === enterHint()) {
        setToast(t("Спочатку порахуй результат.", "Calculate first."));
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        setToast(t("Скопійовано!", "Copied!"));
        setTimeout(() => setToast(""), 1500);
      } catch {
        setToast(t("Не вдалося скопіювати.", "Copy failed."));
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    setToast("");
    solve({ silent: false });
  });

  function isAutoOn() {
    return !!autoCalcEl && autoCalcEl.checked;
  }

  let autoTimer = null;

  function scheduleAutoCalc() {
    if (!isAutoOn()) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      setToast("");
      solve({ silent: true });
    }, 180);
  }

  const root = document.querySelector(".pcalc");
  if (root) {
    root.addEventListener("input", () => scheduleAutoCalc());
    root.addEventListener("change", () => scheduleAutoCalc());
  }

  autoCalcEl?.addEventListener("change", () => {
    setToast("");
    if (autoCalcEl.checked) scheduleAutoCalc();
  });

  updateModeUI();
  setResult(initialHint(), "");
  renderIdleVisual();
})();