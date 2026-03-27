(() => {
  const $ = (id) => document.getElementById(id);

  const toast = $("ciToast");
  const result = $("ciResult");
  const details = $("ciDetails");
  const visual = $("ciVisual");
  const autoCalcEl = $("autoCalc");
  const calcBtn = $("btnCalc");
  const modeEl = $("ciMode");
  const formulaBox = $("ciFormulaBox");

  const panelRadius = $("panelRadius");
  const panelDiameter = $("panelDiameter");
  const panelCircumference = $("panelCircumference");

  const radiusEl = $("ciRadius");
  const diameterEl = $("ciDiameter");
  const circumferenceEl = $("ciCircumference");

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

  function renderResultGrid(items) {
    return `
      <div class="cicalc-result-grid">
        ${items.map((item) => `
          <div class="cicalc-stat">
            <div class="cicalc-stat__label">${item.label}</div>
            <div class="cicalc-stat__value">${item.value}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function buildStep(title, text) {
    return `
      <div class="cicalc-step">
        <div class="cicalc-step__title">${title}</div>
        <div class="cicalc-step__text">${text}</div>
      </div>
    `;
  }

  function getMode() {
    return modeEl?.value || "radius";
  }

  function updateModeUI() {
    const mode = getMode();

    if (panelRadius) panelRadius.hidden = mode !== "radius";
    if (panelDiameter) panelDiameter.hidden = mode !== "diameter";
    if (panelCircumference) panelCircumference.hidden = mode !== "circumference";

    if (formulaBox) {
      if (mode === "radius") {
        formulaBox.innerHTML = `<span class="cicalc-formula__part">S = πr²</span>`;
      } else if (mode === "diameter") {
        formulaBox.innerHTML = `<span class="cicalc-formula__part">r = d / 2, S = πr²</span>`;
      } else {
        formulaBox.innerHTML = `<span class="cicalc-formula__part">r = C / (2π), S = πr²</span>`;
      }
    }

    renderIdleVisual();
  }

  function renderIdleVisual() {
    const mode = getMode();

    if (mode === "radius") {
      setVisual(drawRadiusCircle("?"));
    } else if (mode === "diameter") {
      setVisual(drawDiameterCircle("?"));
    } else {
      setVisual(drawCircumferenceCircle("?"));
    }
  }

  function drawRadiusCircle(radiusLabel) {
    return `
      <svg class="cicalc-svg" viewBox="0 0 420 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t("Схема кола", "Circle diagram")}">
        <circle class="circle-fill" cx="210" cy="125" r="78"></circle>
        <circle class="circle-stroke" cx="210" cy="125" r="78"></circle>

        <circle class="center-point" cx="210" cy="125" r="4"></circle>
        <line class="accent-line" x1="210" y1="125" x2="288" y2="125"></line>

        <text class="label-main" x="248" y="116" text-anchor="middle">r = ${radiusLabel || "?"}</text>
        <text class="label-muted" x="210" y="145" text-anchor="middle">O</text>
      </svg>
    `;
  }

  function drawDiameterCircle(diameterLabel) {
    return `
      <svg class="cicalc-svg" viewBox="0 0 420 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t("Схема кола", "Circle diagram")}">
        <circle class="circle-fill" cx="210" cy="125" r="78"></circle>
        <circle class="circle-stroke" cx="210" cy="125" r="78"></circle>

        <circle class="center-point" cx="210" cy="125" r="4"></circle>
        <line class="accent-line-2" x1="132" y1="125" x2="288" y2="125"></line>

        <text class="label-main" x="210" y="112" text-anchor="middle">d = ${diameterLabel || "?"}</text>
        <text class="label-muted" x="210" y="145" text-anchor="middle">O</text>
      </svg>
    `;
  }

  function drawCircumferenceCircle(cLabel) {
    return `
      <svg class="cicalc-svg" viewBox="0 0 420 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t("Схема кола", "Circle diagram")}">
        <circle class="circle-fill" cx="210" cy="125" r="78"></circle>
        <circle class="circle-stroke" cx="210" cy="125" r="78"></circle>

        <circle class="center-point" cx="210" cy="125" r="4"></circle>
        <path class="accent-arc" d="M 132 125 A 78 78 0 1 1 288 125"></path>

        <text class="label-main" x="210" y="36" text-anchor="middle">C = ${cLabel || "?"}</text>
        <text class="label-muted" x="210" y="145" text-anchor="middle">O</text>
      </svg>
    `;
  }

  function solveRadius({ silent = false } = {}) {
    const r = parseNum(radiusEl?.value);

    if (!Number.isFinite(r)) {
      if (!silent) setToast(t("Введи коректне число.", "Enter a valid number."));
      setVisual(drawRadiusCircle(fmt(r)));
      return false;
    }

    if (r <= 0) {
      if (!silent) setToast(t("Радіус має бути більший за 0.", "Radius must be greater than 0."));
      setVisual(drawRadiusCircle(fmt(r)));
      return false;
    }

    const area = Math.PI * r * r;
    const diameter = 2 * r;
    const circumference = 2 * Math.PI * r;

    setVisual(drawRadiusCircle(fmt(r)));

    const mainText = `${t("Площа кола", "Circle area")}: ${fmt(area)}`;

    const extra =
      renderResultGrid([
        { label: t("Радіус", "Radius"), value: fmt(r) },
        { label: t("Діаметр", "Diameter"), value: fmt(diameter) },
        { label: t("Довжина кола", "Circumference"), value: fmt(circumference) }
      ]) +
      renderResultGrid([
        { label: "π", value: fmt(Math.PI) },
        { label: t("Формула", "Formula"), value: "πr²" },
        { label: t("Площа", "Area"), value: fmt(area) }
      ]) +
      `<div class="cicalc-steps">
        ${buildStep(
          t("Крок 1. Формула", "Step 1. Formula"),
          `S = πr²`
        )}
        ${buildStep(
          t("Крок 2. Підстановка значень", "Step 2. Substitute values"),
          `S = π × ${fmt(r)}²`
        )}
        ${buildStep(
          t("Крок 3. Обчислення", "Step 3. Calculation"),
          `S = π × ${fmt(r * r)}`
        )}
        ${buildStep(
          t("Крок 4. Результат", "Step 4. Result"),
          `S = <b>${fmt(area)}</b>`
        )}
      </div>`;

    setResult(mainText, extra);
    return true;
  }

  function solveDiameter({ silent = false } = {}) {
    const d = parseNum(diameterEl?.value);

    if (!Number.isFinite(d)) {
      if (!silent) setToast(t("Введи коректне число.", "Enter a valid number."));
      setVisual(drawDiameterCircle(fmt(d)));
      return false;
    }

    if (d <= 0) {
      if (!silent) setToast(t("Діаметр має бути більший за 0.", "Diameter must be greater than 0."));
      setVisual(drawDiameterCircle(fmt(d)));
      return false;
    }

    const r = d / 2;
    const area = Math.PI * r * r;
    const circumference = Math.PI * d;

    setVisual(drawDiameterCircle(fmt(d)));

    const mainText = `${t("Площа кола", "Circle area")}: ${fmt(area)}`;

    const extra =
      renderResultGrid([
        { label: t("Діаметр", "Diameter"), value: fmt(d) },
        { label: t("Радіус", "Radius"), value: fmt(r) },
        { label: t("Довжина кола", "Circumference"), value: fmt(circumference) }
      ]) +
      renderResultGrid([
        { label: "π", value: fmt(Math.PI) },
        { label: t("Формула", "Formula"), value: "π(d/2)²" },
        { label: t("Площа", "Area"), value: fmt(area) }
      ]) +
      `<div class="cicalc-steps">
        ${buildStep(
          t("Крок 1. Знаходимо радіус", "Step 1. Find the radius"),
          `r = d / 2 = ${fmt(d)} / 2 = <b>${fmt(r)}</b>`
        )}
        ${buildStep(
          t("Крок 2. Формула площі", "Step 2. Area formula"),
          `S = πr²`
        )}
        ${buildStep(
          t("Крок 3. Підстановка значень", "Step 3. Substitute values"),
          `S = π × ${fmt(r)}²`
        )}
        ${buildStep(
          t("Крок 4. Результат", "Step 4. Result"),
          `S = <b>${fmt(area)}</b>`
        )}
      </div>`;

    setResult(mainText, extra);
    return true;
  }

  function solveCircumference({ silent = false } = {}) {
    const C = parseNum(circumferenceEl?.value);

    if (!Number.isFinite(C)) {
      if (!silent) setToast(t("Введи коректне число.", "Enter a valid number."));
      setVisual(drawCircumferenceCircle(fmt(C)));
      return false;
    }

    if (C <= 0) {
      if (!silent) setToast(t("Довжина кола має бути більша за 0.", "Circumference must be greater than 0."));
      setVisual(drawCircumferenceCircle(fmt(C)));
      return false;
    }

    const r = C / (2 * Math.PI);
    const d = 2 * r;
    const area = Math.PI * r * r;

    setVisual(drawCircumferenceCircle(fmt(C)));

    const mainText = `${t("Площа кола", "Circle area")}: ${fmt(area)}`;

    const extra =
      renderResultGrid([
        { label: t("Довжина кола", "Circumference"), value: fmt(C) },
        { label: t("Радіус", "Radius"), value: fmt(r) },
        { label: t("Діаметр", "Diameter"), value: fmt(d) }
      ]) +
      renderResultGrid([
        { label: "π", value: fmt(Math.PI) },
        { label: t("Формула", "Formula"), value: "C / (2π)" },
        { label: t("Площа", "Area"), value: fmt(area) }
      ]) +
      `<div class="cicalc-steps">
        ${buildStep(
          t("Крок 1. Знаходимо радіус", "Step 1. Find the radius"),
          `r = C / (2π) = ${fmt(C)} / (2 × ${fmt(Math.PI)}) = <b>${fmt(r)}</b>`
        )}
        ${buildStep(
          t("Крок 2. Формула площі", "Step 2. Area formula"),
          `S = πr²`
        )}
        ${buildStep(
          t("Крок 3. Підстановка значень", "Step 3. Substitute values"),
          `S = π × ${fmt(r)}²`
        )}
        ${buildStep(
          t("Крок 4. Результат", "Step 4. Result"),
          `S = <b>${fmt(area)}</b>`
        )}
      </div>`;

    setResult(mainText, extra);
    return true;
  }

  function solve({ silent = false } = {}) {
    const mode = getMode();

    if (mode === "radius") return solveRadius({ silent });
    if (mode === "diameter") return solveDiameter({ silent });
    if (mode === "circumference") return solveCircumference({ silent });

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
    const exampleBtn = e.target.closest(".circle-example");
    if (exampleBtn) {
      const mode = exampleBtn.getAttribute("data-mode") || "radius";
      const v1 = exampleBtn.getAttribute("data-v1") || "";

      if (modeEl) modeEl.value = mode;
      updateModeUI();

      if (radiusEl) radiusEl.value = "";
      if (diameterEl) diameterEl.value = "";
      if (circumferenceEl) circumferenceEl.value = "";

      if (mode === "radius" && radiusEl) radiusEl.value = v1;
      if (mode === "diameter" && diameterEl) diameterEl.value = v1;
      if (mode === "circumference" && circumferenceEl) circumferenceEl.value = v1;

      scheduleAutoCalc();
      return;
    }

    const resetBtn = e.target.closest("[data-reset]");
    if (resetBtn) {
      if (modeEl) modeEl.value = "radius";
      updateModeUI();

      if (radiusEl) radiusEl.value = "";
      if (diameterEl) diameterEl.value = "";
      if (circumferenceEl) circumferenceEl.value = "";

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

  const root = document.querySelector(".cicalc");
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