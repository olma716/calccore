(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const parseNum = (val) => {
    if (val == null) return 0;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: 2 }) : "—";
  const safeText = (s) => String(s ?? "").replace(/[<>]/g, "");

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    yourDots: "Your DOTS score",
    levels: [
      { label: "Beginner", score: "< 250" },
      { label: "Intermediate", score: "250-300" },
      { label: "Advanced", score: "300-400" },
      { label: "Elite", score: "400-500" },
      { label: "World class", score: "500+" },
    ],
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    yourDots: "Твій DOTS бал",
    levels: [
      { label: "Початківець", score: "< 250" },
      { label: "Середній рівень", score: "250-300" },
      { label: "Просунутий", score: "300-400" },
      { label: "Елітний", score: "400-500" },
      { label: "Світовий клас", score: "500+" },
    ],
  };

  // Official DOTS coefficients
  const MALE_COEF = [-0.000001093, 0.0007391293, -0.1918759221, 24.0900756, -307.75076];
  const FEMALE_COEF = [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288];

  function dotsCoefficient(bw, coef) {
    const [a, b, c, d, e] = coef;
    return 500 / (a * bw ** 4 + b * bw ** 3 + c * bw ** 2 + d * bw + e);
  }

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const sex = el("sex");
  const bodyweight = el("bodyweight");
  const total = el("total");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function renderLevels() {
    if (!scheduleTbody) return;
    scheduleTbody.innerHTML = T.levels.map(l => `
      <tr><td>${safeText(l.label)}</td><td>${safeText(l.score)}</td></tr>
    `).join("");
  }

  function calc({ silent = false } = {}) {
    const s = sex?.value || "male";
    const bw = parseNum(bodyweight?.value);
    const tot = parseNum(total?.value);

    if (!(bw > 0) || !(tot > 0)) {
      setResult(T.enterInputs, "");
      return;
    }

    const coef = s === "male" ? MALE_COEF : FEMALE_COEF;
    const factor = dotsCoefficient(bw, coef);
    const dots = tot * factor;

    setResult(
      `${T.yourDots}: ${fmt(dots)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${LANG === "en" ? "Total lifted" : "Загальна сума"}</div>
            <div class="m-kpi__v">${fmt(tot)} kg</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${LANG === "en" ? "Body weight" : "Вага тіла"}</div>
            <div class="m-kpi__v">${fmt(bw)} kg</div>
          </div>
        </div>
      `
    );

    renderLevels();
  }

  function reset() {
    if (sex) sex.value = "male";
    if (bodyweight) bodyweight.value = "";
    if (total) total.value = "";

    setToast(T.resetDone);
    setResult(T.enterInputs, "");
    if (scheduleTbody) scheduleTbody.innerHTML = "";

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

  // ---------- auto calc ----------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  [bodyweight, total].forEach((x) => x?.addEventListener("input", scheduleAuto));
  sex?.addEventListener("change", scheduleAuto);

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  setResult(T.enterInputs, "");
})();