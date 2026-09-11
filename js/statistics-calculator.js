(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: 4 }) : "—";

  const T = LANG === "en" ? {
    enterInputs: "Enter numbers to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    needTwo: "Enter at least one valid number.",
    mean: "Mean",
    median: "Median",
    mode: "Mode",
    stdDev: "Std. deviation",
    variance: "Variance",
    range: "Range",
    count: "Count",
    noMode: "No mode",
  } : {
    enterInputs: "Введи числа для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    needTwo: "Введи хоча б одне коректне число.",
    mean: "Середнє",
    median: "Медіана",
    mode: "Мода",
    stdDev: "Ст. відхилення",
    variance: "Дисперсія",
    range: "Діапазон",
    count: "Кількість",
    noMode: "Немає моди",
  };

  // ---------- DOM ----------
  const numbersInput = el("numbersInput");
  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function parseNumbers(text) {
    return text
      .split(/[,\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => Number(s.replace(",", ".")))
      .filter(n => Number.isFinite(n));
  }

  function calcMean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function calcMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function calcMode(arr) {
    const freq = {};
    arr.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(freq));
    if (maxFreq === 1) return null; // all unique, no mode
    const modes = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
    return modes;
  }

  function calcStdDevAndVariance(arr, mean) {
    if (arr.length < 2) return { variance: 0, stdDev: 0 };
    const sumSquaredDiff = arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0);
    const variance = sumSquaredDiff / (arr.length - 1); // sample variance
    const stdDev = Math.sqrt(variance);
    return { variance, stdDev };
  }

  function calc() {
    const text = numbersInput?.value || "";
    const numbers = parseNumbers(text);

    if (numbers.length === 0) {
      setResult(T.needTwo, "");
      return;
    }

    const mean = calcMean(numbers);
    const median = calcMedian(numbers);
    const mode = calcMode(numbers);
    const { variance, stdDev } = calcStdDevAndVariance(numbers, mean);
    const range = Math.max(...numbers) - Math.min(...numbers);

    const modeText = mode === null ? T.noMode : mode.map(fmt).join(", ");

    setResult(
      `${T.mean}: ${fmt(mean)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.median}</div>
            <div class="m-kpi__v">${fmt(median)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.mode}</div>
            <div class="m-kpi__v" style="font-size:14px;">${modeText}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.stdDev}</div>
            <div class="m-kpi__v">${fmt(stdDev)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.variance}</div>
            <div class="m-kpi__v">${fmt(variance)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.range}</div>
            <div class="m-kpi__v">${fmt(range)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.count}</div>
            <div class="m-kpi__v">${numbers.length}</div>
          </div>
        </div>
      `
    );
  }

  function reset() {
    if (numbersInput) numbersInput.value = "";
    setToast(T.resetDone);
    setResult(T.enterInputs, "");
    setTimeout(() => setToast(""), 1200);
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
  btnCalc?.addEventListener("click", calc);
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();