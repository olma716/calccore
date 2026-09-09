(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const parseNum = (val) => {
    if (val == null) return null;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.\-]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const round = (n) => Math.round(n);

  const T = LANG === "en" ? {
    enterInputs: "Enter a temperature.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    celsius: "Celsius",
    fahrenheit: "Fahrenheit",
    gasMark: "Gas Mark",
  } : {
    enterInputs: "Введи температуру.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    celsius: "Цельсій",
    fahrenheit: "Фаренгейт",
    gasMark: "Газова марка",
  };

  // Gas Mark reference table: [gasMark, celsius, fahrenheit, description]
  const GAS_TABLE = LANG === "en" ? [
    [0.25, 110, 225, "Very cool"],
    [0.5, 120, 250, "Very cool"],
    [1, 140, 275, "Cool"],
    [2, 150, 300, "Cool"],
    [3, 160, 325, "Warm"],
    [4, 180, 350, "Moderate"],
    [5, 190, 375, "Moderately hot"],
    [6, 200, 400, "Moderately hot"],
    [7, 220, 425, "Hot"],
    [8, 230, 450, "Hot"],
    [9, 240, 475, "Very hot"],
  ] : [
    [0.25, 110, 225, "Дуже слабка"],
    [0.5, 120, 250, "Дуже слабка"],
    [1, 140, 275, "Слабка"],
    [2, 150, 300, "Слабка"],
    [3, 160, 325, "Тепла"],
    [4, 180, 350, "Помірна"],
    [5, 190, 375, "Помірно гаряча"],
    [6, 200, 400, "Помірно гаряча"],
    [7, 220, 425, "Гаряча"],
    [8, 230, 450, "Гаряча"],
    [9, 240, 475, "Дуже гаряча"],
  ];

  // ---------- DOM ----------
  const tempValue = el("tempValue");
  const tempUnit = el("tempUnit");
  const btnCalc = el("btnCalc");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");
  const refTableBody = el("refTableBody");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function cToF(c) { return c * 9 / 5 + 32; }
  function fToC(f) { return (f - 32) * 5 / 9; }

  function gasMarkToCelsius(gm) {
    // find closest match or interpolate
    let closest = GAS_TABLE[0];
    let minDiff = Math.abs(GAS_TABLE[0][0] - gm);
    for (const row of GAS_TABLE) {
      const diff = Math.abs(row[0] - gm);
      if (diff < minDiff) { minDiff = diff; closest = row; }
    }
    return closest[1];
  }

  function celsiusToGasMark(c) {
    let closest = GAS_TABLE[0];
    let minDiff = Math.abs(GAS_TABLE[0][1] - c);
    for (const row of GAS_TABLE) {
      const diff = Math.abs(row[1] - c);
      if (diff < minDiff) { minDiff = diff; closest = row; }
    }
    return closest[0];
  }

  function calc() {
    const val = parseNum(tempValue?.value);
    const unit = tempUnit?.value || "c";

    if (val === null) {
      setResult(T.enterInputs, "");
      return;
    }

    let celsius, fahrenheit, gasMark;

    if (unit === "c") {
      celsius = val;
      fahrenheit = cToF(val);
      gasMark = celsiusToGasMark(val);
    } else if (unit === "f") {
      fahrenheit = val;
      celsius = fToC(val);
      gasMark = celsiusToGasMark(celsius);
    } else {
      gasMark = val;
      celsius = gasMarkToCelsius(val);
      fahrenheit = cToF(celsius);
    }

    setResult(
      `${round(celsius)}°C = ${round(fahrenheit)}°F`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.celsius}</div>
            <div class="m-kpi__v">${round(celsius)}°C</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.fahrenheit}</div>
            <div class="m-kpi__v">${round(fahrenheit)}°F</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.gasMark}</div>
            <div class="m-kpi__v">${gasMark}</div>
          </div>
        </div>
      `
    );
  }

  function renderTable() {
    if (!refTableBody) return;
    refTableBody.innerHTML = GAS_TABLE.map(([gm, c, f, desc]) => `
      <tr>
        <td>${c}</td>
        <td>${f}</td>
        <td>${gm}</td>
        <td>${desc}</td>
      </tr>
    `).join("");
  }

  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      setToast(T.copied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.copyFailed);
    }
  }

  // ---------- events ----------
  tempValue?.addEventListener("input", calc);
  tempUnit?.addEventListener("change", calc);
  btnCalc?.addEventListener("click", calc);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  renderTable();
  setResult(T.enterInputs, "");
})();