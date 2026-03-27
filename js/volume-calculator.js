(() => {
  const $ = (id) => document.getElementById(id);

  const toast = $("vToast");
  const result = $("vResult");
  const details = $("vDetails");
  const visual = $("vVisual");
  const autoCalcEl = $("autoCalc");
  const calcBtn = $("btnCalc");
  const modeEl = $("vMode");
  const formulaBox = $("vFormulaBox");

  const panelCube = $("panelCube");
  const panelSphere = $("panelSphere");
  const panelCylinder = $("panelCylinder");

  const vcCubeA = $("vcCubeA");
  const vcSphereR = $("vcSphereR");
  const vcCylinderR = $("vcCylinderR");
  const vcCylinderH = $("vcCylinderH");

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
      <div class="vcalc-result-grid">
        ${items.map((item) => `
          <div class="vcalc-stat">
            <div class="vcalc-stat__label">${item.label}</div>
            <div class="vcalc-stat__value">${item.value}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function buildStep(title, text) {
    return `
      <div class="vcalc-step">
        <div class="vcalc-step__title">${title}</div>
        <div class="vcalc-step__text">${text}</div>
      </div>
    `;
  }

  function getMode() {
    return modeEl?.value || "cube";
  }

  function updateModeUI() {
    const mode = getMode();

    if (panelCube) panelCube.hidden = mode !== "cube";
    if (panelSphere) panelSphere.hidden = mode !== "sphere";
    if (panelCylinder) panelCylinder.hidden = mode !== "cylinder";

    if (formulaBox) {
      if (mode === "cube") {
        formulaBox.innerHTML = `<span class="vcalc-formula__part">V = a³</span>`;
      } else if (mode === "sphere") {
        formulaBox.innerHTML = `<span class="vcalc-formula__part">V = 4/3 · π · r³</span>`;
      } else {
        formulaBox.innerHTML = `<span class="vcalc-formula__part">V = π · r² · h</span>`;
      }
    }

    renderIdleVisual();
  }

  function renderIdleVisual() {
    const mode = getMode();

    if (mode === "cube") {
      setVisual(drawCube("?"));
    } else if (mode === "sphere") {
      setVisual(drawSphere("?"));
    } else {
      setVisual(drawCylinder("?", "?"));
    }
  }

  function drawCube(aLabel) {
    return `
      <svg class="vcalc-svg" viewBox="0 0 420 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t("Схема куба", "Cube diagram")}">
        <polygon class="shape-fill" points="120,90 220,90 220,190 120,190"></polygon>
        <polygon class="shape-fill" points="160,60 260,60 260,160 160,160"></polygon>

        <line class="shape-stroke" x1="120" y1="90" x2="220" y2="90"></line>
        <line class="shape-stroke" x1="220" y1="90" x2="220" y2="190"></line>
        <line class="shape-stroke" x1="220" y1="190" x2="120" y2="190"></line>
        <line class="shape-stroke" x1="120" y1="190" x2="120" y2="90"></line>

        <line class="shape-stroke" x1="160" y1="60" x2="260" y2="60"></line>
        <line class="shape-stroke" x1="260" y1="60" x2="260" y2="160"></line>
        <line class="shape-stroke" x1="260" y1="160" x2="160" y2="160"></line>
        <line class="shape-stroke" x1="160" y1="160" x2="160" y2="60"></line>

        <line class="shape-stroke" x1="120" y1="90" x2="160" y2="60"></line>
        <line class="shape-stroke" x1="220" y1="90" x2="260" y2="60"></line>
        <line class="shape-stroke" x1="220" y1="190" x2="260" y2="160"></line>
        <line class="shape-stroke" x1="120" y1="190" x2="160" y2="160"></line>

        <line class="accent-line" x1="120" y1="190" x2="220" y2="190"></line>
        <text class="label-main" x="170" y="212" text-anchor="middle">a = ${aLabel || "?"}</text>
      </svg>
    `;
  }

  function drawSphere(rLabel) {
    return `
      <svg class="vcalc-svg" viewBox="0 0 420 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t("Схема сфери", "Sphere diagram")}">
        <circle class="shape-fill" cx="210" cy="125" r="78"></circle>
        <circle class="shape-stroke" cx="210" cy="125" r="78"></circle>
        <ellipse class="soft-line" cx="210" cy="125" rx="78" ry="28"></ellipse>
        <ellipse class="soft-line" cx="210" cy="125" rx="30" ry="78"></ellipse>

        <circle class="point" cx="210" cy="125" r="4"></circle>
        <line class="accent-line" x1="210" y1="125" x2="288" y2="125"></line>

        <text class="label-main" x="248" y="115" text-anchor="middle">r = ${rLabel || "?"}</text>
        <text class="label-muted" x="210" y="145" text-anchor="middle">O</text>
      </svg>
    `;
  }

  function drawCylinder(rLabel, hLabel) {
    return `
      <svg class="vcalc-svg" viewBox="0 0 420 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t("Схема циліндра", "Cylinder diagram")}">
        <ellipse class="shape-fill" cx="210" cy="70" rx="65" ry="20"></ellipse>
        <ellipse class="shape-stroke" cx="210" cy="70" rx="65" ry="20"></ellipse>
        <line class="shape-stroke" x1="145" y1="70" x2="145" y2="180"></line>
        <line class="shape-stroke" x1="275" y1="70" x2="275" y2="180"></line>
        <ellipse class="shape-stroke" cx="210" cy="180" rx="65" ry="20"></ellipse>

        <line class="accent-line" x1="210" y1="70" x2="275" y2="70"></line>
        <line class="accent-line-2" x1="295" y1="70" x2="295" y2="180"></line>

        <text class="label-main" x="244" y="48" text-anchor="middle">r = ${rLabel || "?"}</text>
        <text class="label-main" x="308" y="128">h = ${hLabel || "?"}</text>
      </svg>
    `;
  }

  function solveCube({ silent = false } = {}) {
    const a = parseNum(vcCubeA?.value);

    if (!Number.isFinite(a)) {
      if (!silent) setToast(t("Введи коректне число.", "Enter a valid number."));
      setVisual(drawCube(fmtVisual(a)));
      return false;
    }

    if (a <= 0) {
      if (!silent) setToast(t("Ребро має бути більшим за 0.", "Edge must be greater than 0."));
      setVisual(drawCube(fmtVisual(a)));
      return false;
    }

    const volume = Math.pow(a, 3);

    setVisual(drawCube(fmtVisual(a)));

    const mainText = `${t("Об’єм", "Volume")} = ${fmt(volume)}`;

    const extra =
      renderResultGrid([
        { label: "a", value: fmt(a) },
        { label: "a²", value: fmt(a * a) },
        { label: "a³", value: fmt(volume) }
      ]) +
      `<div class="vcalc-steps">
        ${buildStep(
          t("Крок 1. Формула", "Step 1. Formula"),
          `V = a³`
        )}
        ${buildStep(
          t("Крок 2. Підстановка значень", "Step 2. Substitute values"),
          `V = ${fmt(a)}³`
        )}
        ${buildStep(
          t("Крок 3. Результат", "Step 3. Result"),
          `V = <b>${fmt(volume)}</b>`
        )}
      </div>`;

    setResult(mainText, extra);
    return true;
  }

  function solveSphere({ silent = false } = {}) {
    const r = parseNum(vcSphereR?.value);

    if (!Number.isFinite(r)) {
      if (!silent) setToast(t("Введи коректне число.", "Enter a valid number."));
      setVisual(drawSphere(fmtVisual(r)));
      return false;
    }

    if (r <= 0) {
      if (!silent) setToast(t("Радіус має бути більшим за 0.", "Radius must be greater than 0."));
      setVisual(drawSphere(fmtVisual(r)));
      return false;
    }

    const volume = (4 / 3) * Math.PI * Math.pow(r, 3);

    setVisual(drawSphere(fmtVisual(r)));

    const mainText = `${t("Об’єм", "Volume")} = ${fmt(volume)}`;

    const extra =
      renderResultGrid([
        { label: "r", value: fmt(r) },
        { label: "r³", value: fmt(Math.pow(r, 3)) },
        { label: "π", value: fmt(Math.PI) }
      ]) +
      renderResultGrid([
        { label: t("Формула", "Formula"), value: `4/3·π·r³` },
        { label: t("Коефіцієнт", "Coefficient"), value: fmt(4 / 3) },
        { label: t("Об’єм", "Volume"), value: fmt(volume) }
      ]) +
      `<div class="vcalc-steps">
        ${buildStep(
          t("Крок 1. Формула", "Step 1. Formula"),
          `V = 4/3 × π × r³`
        )}
        ${buildStep(
          t("Крок 2. Підстановка значень", "Step 2. Substitute values"),
          `V = 4/3 × π × ${fmt(r)}³`
        )}
        ${buildStep(
          t("Крок 3. Обчислення", "Step 3. Calculation"),
          `V = 4/3 × π × ${fmt(Math.pow(r, 3))}`
        )}
        ${buildStep(
          t("Крок 4. Результат", "Step 4. Result"),
          `V = <b>${fmt(volume)}</b>`
        )}
      </div>`;

    setResult(mainText, extra);
    return true;
  }

  function solveCylinder({ silent = false } = {}) {
    const r = parseNum(vcCylinderR?.value);
    const h = parseNum(vcCylinderH?.value);

    if (![r, h].every(Number.isFinite)) {
      if (!silent) setToast(t("Введи коректні числа.", "Enter valid numbers."));
      setVisual(drawCylinder(fmtVisual(r), fmtVisual(h)));
      return false;
    }

    if (r <= 0 || h <= 0) {
      if (!silent) setToast(t("Радіус і висота мають бути більшими за 0.", "Radius and height must be greater than 0."));
      setVisual(drawCylinder(fmtVisual(r), fmtVisual(h)));
      return false;
    }

    const volume = Math.PI * r * r * h;

    setVisual(drawCylinder(fmtVisual(r), fmtVisual(h)));

    const mainText = `${t("Об’єм", "Volume")} = ${fmt(volume)}`;

    const extra =
      renderResultGrid([
        { label: "r", value: fmt(r) },
        { label: "h", value: fmt(h) },
        { label: "r²", value: fmt(r * r) }
      ]) +
      renderResultGrid([
        { label: "π", value: fmt(Math.PI) },
        { label: t("Формула", "Formula"), value: `π·r²·h` },
        { label: t("Об’єм", "Volume"), value: fmt(volume) }
      ]) +
      `<div class="vcalc-steps">
        ${buildStep(
          t("Крок 1. Формула", "Step 1. Formula"),
          `V = π × r² × h`
        )}
        ${buildStep(
          t("Крок 2. Підстановка значень", "Step 2. Substitute values"),
          `V = π × ${fmt(r)}² × ${fmt(h)}`
        )}
        ${buildStep(
          t("Крок 3. Обчислення", "Step 3. Calculation"),
          `V = π × ${fmt(r * r)} × ${fmt(h)}`
        )}
        ${buildStep(
          t("Крок 4. Результат", "Step 4. Result"),
          `V = <b>${fmt(volume)}</b>`
        )}
      </div>`;

    setResult(mainText, extra);
    return true;
  }

  function solve({ silent = false } = {}) {
    const mode = getMode();

    if (mode === "cube") return solveCube({ silent });
    if (mode === "sphere") return solveSphere({ silent });
    if (mode === "cylinder") return solveCylinder({ silent });

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
    const exampleBtn = e.target.closest(".volume-example");
    if (exampleBtn) {
      const mode = exampleBtn.getAttribute("data-mode") || "cube";
      const v1 = exampleBtn.getAttribute("data-v1") || "";
      const v2 = exampleBtn.getAttribute("data-v2") || "";

      if (modeEl) modeEl.value = mode;
      updateModeUI();

      if (vcCubeA) vcCubeA.value = "";
      if (vcSphereR) vcSphereR.value = "";
      if (vcCylinderR) vcCylinderR.value = "";
      if (vcCylinderH) vcCylinderH.value = "";

      if (mode === "cube" && vcCubeA) {
        vcCubeA.value = v1;
      } else if (mode === "sphere" && vcSphereR) {
        vcSphereR.value = v1;
      } else if (mode === "cylinder") {
        if (vcCylinderR) vcCylinderR.value = v1;
        if (vcCylinderH) vcCylinderH.value = v2;
      }

      scheduleAutoCalc();
      return;
    }

    const resetBtn = e.target.closest("[data-reset]");
    if (resetBtn) {
      if (modeEl) modeEl.value = "cube";
      updateModeUI();

      if (vcCubeA) vcCubeA.value = "";
      if (vcSphereR) vcSphereR.value = "";
      if (vcCylinderR) vcCylinderR.value = "";
      if (vcCylinderH) vcCylinderH.value = "";

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

  const root = document.querySelector(".vcalc");
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