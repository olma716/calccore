(() => {
  const $ = (id) => document.getElementById(id);

  const toast = $("tToast");
  const result = $("tResult");
  const details = $("tDetails");
  const visual = $("tVisual");
  const autoCalcEl = $("autoCalc");
  const calcBtn = $("btnCalc");
  const modeEl = $("tMode");
  const formulaBox = $("tFormulaBox");

  const panelBaseHeight = $("panelBaseHeight");
  const panelThreeSides = $("panelThreeSides");
  const panelTwoSidesAngle = $("panelTwoSidesAngle");

  const tbBase = $("tbBase");
  const tbHeight = $("tbHeight");

  const tsA = $("tsA");
  const tsB = $("tsB");
  const tsC = $("tsC");

  const taA = $("taA");
  const taB = $("taB");
  const taAngle = $("taAngle");

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

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function renderResultGrid(items) {
    return `
      <div class="tcalc-result-grid">
        ${items.map((item) => `
          <div class="tcalc-stat">
            <div class="tcalc-stat__label">${item.label}</div>
            <div class="tcalc-stat__value">${item.value}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function buildStep(title, text) {
    return `
      <div class="tcalc-step">
        <div class="tcalc-step__title">${title}</div>
        <div class="tcalc-step__text">${text}</div>
      </div>
    `;
  }

  function getMode() {
    return modeEl?.value || "base-height";
  }

  function updateModeUI() {
    const mode = getMode();

    if (panelBaseHeight) panelBaseHeight.hidden = mode !== "base-height";
    if (panelThreeSides) panelThreeSides.hidden = mode !== "three-sides";
    if (panelTwoSidesAngle) panelTwoSidesAngle.hidden = mode !== "two-sides-angle";

    if (formulaBox) {
      if (mode === "base-height") {
        formulaBox.innerHTML = `<span class="tcalc-formula__part">S = (a × h) / 2</span>`;
      } else if (mode === "three-sides") {
        formulaBox.innerHTML = `<span class="tcalc-formula__part">S = √(p(p − a)(p − b)(p − c))</span>`;
      } else {
        formulaBox.innerHTML = `<span class="tcalc-formula__part">S = (a × b × sin(γ)) / 2</span>`;
      }
    }

    renderIdleVisual();
  }

  function renderIdleVisual() {
    const mode = getMode();

    if (mode === "base-height") {
      setVisual(drawBaseHeightTriangle("", ""));
    } else if (mode === "three-sides") {
      setVisual(drawThreeSidesTriangle("", "", ""));
    } else {
      setVisual(drawTwoSidesAngleTriangle("", "", ""));
    }
  }

  function drawBaseHeightTriangle(baseLabel, heightLabel) {
    return `
      <svg class="tcalc-svg" viewBox="0 0 420 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t("Схема трикутника", "Triangle diagram")}">
        <polygon class="shape-fill" points="70,200 350,200 150,60"></polygon>
        <polygon class="shape-stroke" points="70,200 350,200 150,60"></polygon>

        <line class="soft-line" x1="150" y1="60" x2="150" y2="200"></line>
        <line class="accent-line" x1="150" y1="60" x2="150" y2="200"></line>

        <rect class="right-angle" x="150" y="188" width="12" height="12"></rect>

        <circle class="point" cx="70" cy="200" r="3.5"></circle>
        <circle class="point" cx="350" cy="200" r="3.5"></circle>
        <circle class="point" cx="150" cy="60" r="3.5"></circle>

        <text class="label-main" x="205" y="222" text-anchor="middle">a = ${baseLabel || "?"}</text>
        <text class="label-main" x="166" y="134" text-anchor="start">h = ${heightLabel || "?"}</text>
        <text class="label-muted" x="70" y="218">A</text>
        <text class="label-muted" x="350" y="218" text-anchor="end">B</text>
        <text class="label-muted" x="150" y="48" text-anchor="middle">C</text>
      </svg>
    `;
  }

  function drawThreeSidesTriangle(aLabel, bLabel, cLabel) {
    return `
      <svg class="tcalc-svg" viewBox="0 0 420 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t("Схема трикутника", "Triangle diagram")}">
        <polygon class="shape-fill" points="70,195 340,205 165,55"></polygon>
        <polygon class="shape-stroke" points="70,195 340,205 165,55"></polygon>

        <circle class="point" cx="70" cy="195" r="3.5"></circle>
        <circle class="point" cx="340" cy="205" r="3.5"></circle>
        <circle class="point" cx="165" cy="55" r="3.5"></circle>

        <text class="label-main" x="205" y="222" text-anchor="middle">c = ${cLabel || "?"}</text>
        <text class="label-main" x="94" y="122" text-anchor="middle">a = ${aLabel || "?"}</text>
        <text class="label-main" x="272" y="120" text-anchor="middle">b = ${bLabel || "?"}</text>

        <text class="label-muted" x="64" y="212">A</text>
        <text class="label-muted" x="346" y="223">B</text>
        <text class="label-muted" x="165" y="43" text-anchor="middle">C</text>
      </svg>
    `;
  }

  function drawTwoSidesAngleTriangle(aLabel, bLabel, angleLabel) {
    return `
      <svg class="tcalc-svg" viewBox="0 0 420 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t("Схема трикутника", "Triangle diagram")}">
        <polygon class="shape-fill" points="90,200 330,200 155,85"></polygon>
        <polygon class="shape-stroke" points="90,200 330,200 155,85"></polygon>

        <path class="angle-arc" d="M 125 200 A 45 45 0 0 0 114 160"></path>

        <circle class="point" cx="90" cy="200" r="3.5"></circle>
        <circle class="point" cx="330" cy="200" r="3.5"></circle>
        <circle class="point" cx="155" cy="85" r="3.5"></circle>

        <line class="accent-line" x1="90" y1="200" x2="330" y2="200"></line>
        <line class="accent-line-2" x1="90" y1="200" x2="155" y2="85"></line>

        <text class="label-main" x="210" y="222" text-anchor="middle">a = ${aLabel || "?"}</text>
        <text class="label-main" x="100" y="132" text-anchor="middle">b = ${bLabel || "?"}</text>
        <text class="label-main" x="127" y="182">${angleLabel || "γ"}</text>

        <text class="label-muted" x="84" y="216">A</text>
        <text class="label-muted" x="336" y="216">B</text>
        <text class="label-muted" x="155" y="73" text-anchor="middle">C</text>
      </svg>
    `;
  }

  function solveBaseHeight({ silent = false } = {}) {
    const base = parseNum(tbBase?.value);
    const height = parseNum(tbHeight?.value);

    if (![base, height].every(Number.isFinite)) {
      if (!silent) setToast(t("Введи коректні числа.", "Enter valid numbers."));
      setVisual(drawBaseHeightTriangle(fmt(base), fmt(height)));
      return false;
    }

    if (base <= 0 || height <= 0) {
      if (!silent) setToast(t("Основа і висота мають бути більші за 0.", "Base and height must be greater than 0."));
      setVisual(drawBaseHeightTriangle(fmt(base), fmt(height)));
      return false;
    }

    const area = (base * height) / 2;
    setVisual(drawBaseHeightTriangle(fmt(base), fmt(height)));

    const mainText = `${t("Площа трикутника", "Triangle area")}: ${fmt(area)}`;

    const extra =
      renderResultGrid([
        { label: t("Основа", "Base"), value: fmt(base) },
        { label: t("Висота", "Height"), value: fmt(height) },
        { label: t("Площа", "Area"), value: fmt(area) }
      ]) +
      `<div class="tcalc-steps">
        ${buildStep(
          t("Крок 1. Формула", "Step 1. Formula"),
          `S = (a × h) / 2`
        )}
        ${buildStep(
          t("Крок 2. Підстановка значень", "Step 2. Substitute values"),
          `S = (${fmt(base)} × ${fmt(height)}) / 2`
        )}
        ${buildStep(
          t("Крок 3. Результат", "Step 3. Result"),
          `S = <b>${fmt(area)}</b>`
        )}
      </div>`;

    setResult(mainText, extra);
    return true;
  }

  function solveThreeSides({ silent = false } = {}) {
    const a = parseNum(tsA?.value);
    const b = parseNum(tsB?.value);
    const c = parseNum(tsC?.value);

    if (![a, b, c].every(Number.isFinite)) {
      if (!silent) setToast(t("Введи коректні числа.", "Enter valid numbers."));
      setVisual(drawThreeSidesTriangle(fmt(a), fmt(b), fmt(c)));
      return false;
    }

    if (a <= 0 || b <= 0 || c <= 0) {
      if (!silent) setToast(t("Усі сторони мають бути більші за 0.", "All sides must be greater than 0."));
      setVisual(drawThreeSidesTriangle(fmt(a), fmt(b), fmt(c)));
      return false;
    }

    if (a + b <= c || a + c <= b || b + c <= a) {
      if (!silent) setToast(t("Такі сторони не утворюють трикутник.", "These sides do not form a triangle."));
      setVisual(drawThreeSidesTriangle(fmt(a), fmt(b), fmt(c)));
      setResult(
        t("Трикутник не існує.", "Triangle does not exist."),
        buildStep(
          t("Пояснення", "Explanation"),
          t(
            "Для існування трикутника сума будь-яких двох сторін повинна бути більшою за третю сторону.",
            "For a triangle to exist, the sum of any two sides must be greater than the third side."
          )
        )
      );
      return false;
    }

    const p = (a + b + c) / 2;
    const area = Math.sqrt(p * (p - a) * (p - b) * (p - c));

    setVisual(drawThreeSidesTriangle(fmt(a), fmt(b), fmt(c)));

    const mainText = `${t("Площа трикутника", "Triangle area")}: ${fmt(area)}`;

    const extra =
      renderResultGrid([
        { label: "a", value: fmt(a) },
        { label: "b", value: fmt(b) },
        { label: "c", value: fmt(c) }
      ]) +
      renderResultGrid([
        { label: t("Півпериметр", "Semiperimeter"), value: fmt(p) },
        { label: t("Формула", "Formula"), value: t("Герона", "Heron") },
        { label: t("Площа", "Area"), value: fmt(area) }
      ]) +
      `<div class="tcalc-steps">
        ${buildStep(
          t("Крок 1. Обчислюємо півпериметр", "Step 1. Calculate semiperimeter"),
          `p = (a + b + c) / 2 = (${fmt(a)} + ${fmt(b)} + ${fmt(c)}) / 2 = <b>${fmt(p)}</b>`
        )}
        ${buildStep(
          t("Крок 2. Використовуємо формулу Герона", "Step 2. Use Heron’s formula"),
          `S = √(p(p − a)(p − b)(p − c))`
        )}
        ${buildStep(
          t("Крок 3. Підстановка значень", "Step 3. Substitute values"),
          `S = √(${fmt(p)} × (${fmt(p)} − ${fmt(a)}) × (${fmt(p)} − ${fmt(b)}) × (${fmt(p)} − ${fmt(c)}))`
        )}
        ${buildStep(
          t("Крок 4. Результат", "Step 4. Result"),
          `S = <b>${fmt(area)}</b>`
        )}
      </div>`;

    setResult(mainText, extra);
    return true;
  }

  function solveTwoSidesAngle({ silent = false } = {}) {
    const a = parseNum(taA?.value);
    const b = parseNum(taB?.value);
    const angle = parseNum(taAngle?.value);

    if (![a, b, angle].every(Number.isFinite)) {
      if (!silent) setToast(t("Введи коректні числа.", "Enter valid numbers."));
      setVisual(drawTwoSidesAngleTriangle(fmt(a), fmt(b), `${fmt(angle)}°`));
      return false;
    }

    if (a <= 0 || b <= 0) {
      if (!silent) setToast(t("Сторони мають бути більші за 0.", "Sides must be greater than 0."));
      setVisual(drawTwoSidesAngleTriangle(fmt(a), fmt(b), `${fmt(angle)}°`));
      return false;
    }

    if (angle <= 0 || angle >= 180) {
      if (!silent) setToast(t("Кут має бути більший за 0° і менший за 180°.", "Angle must be greater than 0° and less than 180°."));
      setVisual(drawTwoSidesAngleTriangle(fmt(a), fmt(b), `${fmt(angle)}°`));
      return false;
    }

    const sinAngle = Math.sin(toRad(angle));
    const area = (a * b * sinAngle) / 2;

    setVisual(drawTwoSidesAngleTriangle(fmt(a), fmt(b), `${fmt(angle)}°`));

    const mainText = `${t("Площа трикутника", "Triangle area")}: ${fmt(area)}`;

    const extra =
      renderResultGrid([
        { label: "a", value: fmt(a) },
        { label: "b", value: fmt(b) },
        { label: t("Кут γ", "Angle γ"), value: `${fmt(angle)}°` }
      ]) +
      renderResultGrid([
        { label: t("sin(γ)", "sin(γ)"), value: fmt(sinAngle) },
        { label: t("Формула", "Formula"), value: `a·b·sin(γ)/2` },
        { label: t("Площа", "Area"), value: fmt(area) }
      ]) +
      `<div class="tcalc-steps">
        ${buildStep(
          t("Крок 1. Формула", "Step 1. Formula"),
          `S = (a × b × sin(γ)) / 2`
        )}
        ${buildStep(
          t("Крок 2. Обчислюємо синус кута", "Step 2. Calculate sine of the angle"),
          `sin(${fmt(angle)}°) = <b>${fmt(sinAngle)}</b>`
        )}
        ${buildStep(
          t("Крок 3. Підстановка значень", "Step 3. Substitute values"),
          `S = (${fmt(a)} × ${fmt(b)} × ${fmt(sinAngle)}) / 2`
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

    if (mode === "base-height") return solveBaseHeight({ silent });
    if (mode === "three-sides") return solveThreeSides({ silent });
    if (mode === "two-sides-angle") return solveTwoSidesAngle({ silent });

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
    const exampleBtn = e.target.closest(".tri-example");
    if (exampleBtn) {
      const mode = exampleBtn.getAttribute("data-mode") || "base-height";
      const v1 = exampleBtn.getAttribute("data-v1") || "";
      const v2 = exampleBtn.getAttribute("data-v2") || "";
      const v3 = exampleBtn.getAttribute("data-v3") || "";

      if (modeEl) modeEl.value = mode;
      updateModeUI();

      if (tbBase) tbBase.value = "";
      if (tbHeight) tbHeight.value = "";
      if (tsA) tsA.value = "";
      if (tsB) tsB.value = "";
      if (tsC) tsC.value = "";
      if (taA) taA.value = "";
      if (taB) taB.value = "";
      if (taAngle) taAngle.value = "";

      if (mode === "base-height") {
        if (tbBase) tbBase.value = v1;
        if (tbHeight) tbHeight.value = v2;
      } else if (mode === "three-sides") {
        if (tsA) tsA.value = v1;
        if (tsB) tsB.value = v2;
        if (tsC) tsC.value = v3;
      } else if (mode === "two-sides-angle") {
        if (taA) taA.value = v1;
        if (taB) taB.value = v2;
        if (taAngle) taAngle.value = v3;
      }

      scheduleAutoCalc();
      return;
    }

    const resetBtn = e.target.closest("[data-reset]");
    if (resetBtn) {
      if (modeEl) modeEl.value = "base-height";
      updateModeUI();

      if (tbBase) tbBase.value = "";
      if (tbHeight) tbHeight.value = "";
      if (tsA) tsA.value = "";
      if (tsB) tsB.value = "";
      if (tsC) tsC.value = "";
      if (taA) taA.value = "";
      if (taB) taB.value = "";
      if (taAngle) taAngle.value = "";

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

  const root = document.querySelector(".tcalc");
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