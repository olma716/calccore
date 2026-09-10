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

  const fmt = (n, digits = 1) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: digits }) : "—";

  const T = LANG === "en" ? {
    enterInputs: "Enter surface area to calculate.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    recommendedThickness: "Recommended thickness",
    volumeNeeded: "Material volume needed",
    cm: "cm",
    m3: "m³",
  } : {
    enterInputs: "Введи площу для розрахунку.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    recommendedThickness: "Рекомендована товщина",
    volumeNeeded: "Потрібний об'єм матеріалу",
    cm: "см",
    m3: "м³",
  };

  // Target thermal resistance (R, m²·K/W) by surface type (simplified typical values)
  const TARGET_R = {
    wall: 3.3,
    roof: 6.0,
    floor: 3.0,
  };

  // Thermal conductivity (lambda, W/m·K) by material
  const LAMBDA = {
    mineralWool: 0.040,
    eps: 0.037,
    xps: 0.030,
    pur: 0.022,
  };

  // ---------- DOM ----------
  const surfaceType = el("surfaceType");
  const material = el("material");
  const area = el("area");

  const btnCalc = el("btnCalc");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function calc() {
    const surface = surfaceType?.value || "wall";
    const mat = material?.value || "mineralWool";
    const areaVal = parseNum(area?.value);

    const R = TARGET_R[surface];
    const lambda = LAMBDA[mat];

    // thickness (m) = R * lambda
    const thicknessM = R * lambda;
    const thicknessCm = thicknessM * 100;

    if (!(areaVal > 0)) {
      setResult(
        `${T.recommendedThickness}: ${fmt(thicknessCm)} ${T.cm}`,
        ""
      );
      return;
    }

    const volumeM3 = areaVal * thicknessM;

    setResult(
      `${T.recommendedThickness}: ${fmt(thicknessCm)} ${T.cm}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.volumeNeeded}</div>
            <div class="m-kpi__v">${fmt(volumeM3, 2)} ${T.m3}</div>
          </div>
        </div>
      `
    );
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
  [surfaceType, material, area].forEach(x => {
    x?.addEventListener("input", calc);
    x?.addEventListener("change", calc);
  });

  btnCalc?.addEventListener("click", calc);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  calc();
})();