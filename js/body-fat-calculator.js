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

  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: 1 }) : "—";

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    yourBf: "Your body fat percentage",
    category: "Category",
    categories: {
      essential: "Essential fat",
      athletic: "Athletic",
      fitness: "Fitness",
      acceptable: "Acceptable",
      obese: "Obese",
    },
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    yourBf: "Твій відсоток жиру в тілі",
    category: "Категорія",
    categories: {
      essential: "Есенційний жир",
      athletic: "Спортивний",
      fitness: "Фітнес",
      acceptable: "Прийнятний",
      obese: "Ожиріння",
    },
  };

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const sex = el("sex");
  const height = el("height");
  const neck = el("neck");
  const waist = el("waist");
  const hip = el("hip");
  const hipWrap = el("hipWrap");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const bfScale = el("bfScale");
  const bfMarker = el("bfMarker");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function applySexUI() {
    const isFemale = sex?.value === "female";
    if (hipWrap) hipWrap.style.display = isFemale ? "" : "none";
  }

  // US Navy method (log10 based, cm and height in cm)
  function calcBodyFat(s, h, n, w, hp) {
    if (s === "male") {
      // %BF = 495 / (1.0324 - 0.19077*log10(waist-neck) + 0.15456*log10(height)) - 450
      return 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
    } else {
      // %BF = 495 / (1.29579 - 0.35004*log10(waist+hip-neck) + 0.22100*log10(height)) - 450
      return 495 / (1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.22100 * Math.log10(h)) - 450;
    }
  }

  function getCategory(bf, isFemale) {
    const th = isFemale
      ? [13, 20, 24, 31]
      : [5, 13, 17, 24];
    if (bf < th[0]) return { key: "essential", color: "#60a5fa" };
    if (bf < th[1]) return { key: "athletic", color: "#34d399" };
    if (bf < th[2]) return { key: "fitness", color: "#a3e635" };
    if (bf < th[3]) return { key: "acceptable", color: "#fbbf24" };
    return { key: "obese", color: "#f87171" };
  }

  function updateMarker(bf) {
    const min = 2, max = 40;
    const clamped = Math.max(min, Math.min(max, bf));
    const pct = ((clamped - min) / (max - min)) * 100;
    if (bfMarker) bfMarker.style.left = pct + "%";
  }

  function calc({ silent = false } = {}) {
    const s = sex?.value || "male";
    const isFemale = s === "female";
    const h = parseNum(height?.value);
    const n = parseNum(neck?.value);
    const w = parseNum(waist?.value);
    const hp = isFemale ? parseNum(hip?.value) : 0;

    const validBase = h > 0 && n > 0 && w > 0 && (w - n) > 0;
    const validFemale = isFemale ? (hp > 0 && (w + hp - n) > 0) : true;

    if (!validBase || !validFemale) {
      setResult(T.enterInputs, "");
      if (bfScale) bfScale.style.display = "none";
      return;
    }

    const bf = calcBodyFat(s, h, n, w, hp);

    if (!Number.isFinite(bf) || bf <= 0) {
      setResult(T.enterInputs, "");
      if (bfScale) bfScale.style.display = "none";
      return;
    }

    const cat = getCategory(bf, isFemale);
    const catLabel = T.categories[cat.key];

    setResult(
      `${T.yourBf}: ${fmt(bf)}%`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.category}</div>
            <div class="m-kpi__v" style="color:${cat.color};">${catLabel}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">Body Fat %</div>
            <div class="m-kpi__v">${fmt(bf)}%</div>
          </div>
        </div>
      `
    );

    if (bfScale) bfScale.style.display = "";
    updateMarker(bf);
  }

  function reset() {
    if (sex) sex.value = "male";
    if (height) height.value = "";
    if (neck) neck.value = "";
    if (waist) waist.value = "";
    if (hip) hip.value = "";

    applySexUI();
    setToast(T.resetDone);
    setResult(T.enterInputs, "");
    if (bfScale) bfScale.style.display = "none";

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

  [height, neck, waist, hip].forEach((x) => x?.addEventListener("input", scheduleAuto));
  sex?.addEventListener("change", () => { applySexUI(); scheduleAuto(); });

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  // ---------- init ----------
  applySexUI();
  setResult(T.enterInputs, "");
})();