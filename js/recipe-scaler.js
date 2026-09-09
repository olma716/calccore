(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const fmt = (n) => {
    if (!Number.isFinite(n)) return "—";
    const rounded = Math.round(n * 100) / 100;
    return rounded.toLocaleString(LOCALE, { maximumFractionDigits: 2 });
  };

  const T = LANG === "en" ? {
    enterInputs: "Enter your recipe on the left.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    scaledFor: "Scaled recipe for",
    servingsWord: "servings",
    needServings: "Enter both original and target servings.",
    needIngredients: "Enter at least one ingredient line.",
  } : {
    enterInputs: "Введи рецепт зліва.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    scaledFor: "Рецепт перераховано на",
    servingsWord: "порцій",
    needServings: "Введи оригінальну і бажану кількість порцій.",
    needIngredients: "Введи хоча б один рядок з інгредієнтом.",
  };

  // Handle mixed numbers like "1 1/2" and simple fractions "1/2"
  function parseLeadingNumber(str) {
    const trimmed = str.trim();

    // mixed number: "1 1/2 cups flour"
    let m = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
    if (m) {
      const whole = Number(m[1]);
      const num = Number(m[2]);
      const den = Number(m[3]);
      return { value: whole + num / den, rest: m[4] };
    }

    // simple fraction: "1/2 cup sugar"
    m = trimmed.match(/^(\d+)\/(\d+)\s*(.*)$/);
    if (m) {
      const num = Number(m[1]);
      const den = Number(m[2]);
      return { value: num / den, rest: m[3] };
    }

    // decimal or integer: "2.5 cups", "3 eggs"
    m = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
    if (m) {
      const value = Number(m[1].replace(",", "."));
      return { value, rest: m[2] };
    }

    return null;
  }

  // ---------- DOM ----------
  const originalServings = el("originalServings");
  const targetServings = el("targetServings");
  const ingredientsInput = el("ingredientsInput");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const recipeOutput = el("recipeOutput");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };

  let lastScaledLines = [];

  function calc() {
    const orig = Number(originalServings?.value);
    const target = Number(targetServings?.value);
    const text = (ingredientsInput?.value || "").trim();

    if (!(orig > 0) || !(target > 0)) {
      resultEl.textContent = T.needServings;
      recipeOutput.innerHTML = "";
      return;
    }

    if (!text) {
      resultEl.textContent = T.needIngredients;
      recipeOutput.innerHTML = "";
      return;
    }

    const factor = target / orig;
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    lastScaledLines = [];
    const htmlLines = lines.map(line => {
      const parsed = parseLeadingNumber(line);
      if (!parsed) {
        lastScaledLines.push(line);
        return `<div class="recipe-line recipe-line--unparsed"><span class="recipe-line__rest">${escapeHtml(line)}</span></div>`;
      }
      const scaled = parsed.value * factor;
      const scaledStr = `${fmt(scaled)} ${parsed.rest}`.trim();
      lastScaledLines.push(scaledStr);
      return `<div class="recipe-line"><span class="recipe-line__amount">${fmt(scaled)}</span><span class="recipe-line__rest">${escapeHtml(parsed.rest)}</span></div>`;
    });

    resultEl.textContent = `${T.scaledFor} ${target} ${T.servingsWord}`;
    recipeOutput.innerHTML = htmlLines.join("");
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function reset() {
    if (originalServings) originalServings.value = "";
    if (targetServings) targetServings.value = "";
    if (ingredientsInput) ingredientsInput.value = "";

    setToast(T.resetDone);
    resultEl.textContent = T.enterInputs;
    recipeOutput.innerHTML = "";

    setTimeout(() => setToast(""), 1200);
  }

  async function copyResult() {
    if (!lastScaledLines.length) return;
    const txt = lastScaledLines.join("\n");
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
  resultEl.textContent = T.enterInputs;
})();