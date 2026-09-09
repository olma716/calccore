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
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    yourGain: "Your weight gain so far",
    recommended: "Recommended total gain",
    bmiCategory: "Pre-pregnancy BMI category",
    status: "Status",
    categories: {
      under: "Underweight",
      normal: "Normal weight",
      over: "Overweight",
      obese: "Obese",
    },
    statusBelow: "Below recommended range",
    statusOn: "Within recommended range",
    statusAbove: "Above recommended range",
    kg: "kg",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    yourGain: "Твій набір ваги дотепер",
    recommended: "Рекомендований загальний набір",
    bmiCategory: "Категорія ІМТ до вагітності",
    status: "Статус",
    categories: {
      under: "Недостатня вага",
      normal: "Норма",
      over: "Надлишкова вага",
      obese: "Ожиріння",
    },
    statusBelow: "Нижче рекомендованого діапазону",
    statusOn: "У межах рекомендованого діапазону",
    statusAbove: "Вище рекомендованого діапазону",
    kg: "кг",
  };

  // IOM ranges [min, max] in kg, singleton and twins
  const RANGES = {
    under: { single: [12.5, 18], twin: [22.5, 28] },
    normal: { single: [11.5, 16], twin: [17, 25] },
    over: { single: [7, 11.5], twin: [14, 23] },
    obese: { single: [5, 9], twin: [11, 19] },
  };

  // ---------- DOM ----------
  const height = el("height");
  const prePregWeight = el("prePregWeight");
  const currentWeight = el("currentWeight");
  const currentWeek = el("currentWeek");
  const multiple = el("multiple");

  const btnCalc = el("btnCalc");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const wgScale = el("wgScale");
  const wgMarker = el("wgMarker");
  const wgScaleLabels = el("wgScaleLabels");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function getBmiCategory(bmi) {
    if (bmi < 18.5) return "under";
    if (bmi < 25) return "normal";
    if (bmi < 30) return "over";
    return "obese";
  }

  function calc() {
    const h = parseNum(height?.value);
    const preW = parseNum(prePregWeight?.value);
    const curW = parseNum(currentWeight?.value);
    const week = parseNum(currentWeek?.value);
    const isTwin = multiple?.value === "2";

    if (!(h > 0) || !(preW > 0) || !(curW > 0) || !(week > 0)) {
      setResult(T.enterInputs, "");
      wgScale.style.display = "none";
      return;
    }

    const hM = h / 100;
    const bmi = preW / (hM * hM);
    const category = getBmiCategory(bmi);
    const catLabel = T.categories[category];

    const range = RANGES[category][isTwin ? "twin" : "single"];
    const [minRec, maxRec] = range;

    const actualGain = curW - preW;

    let status, statusColor;
    if (actualGain < minRec * (week / 40)) {
      status = T.statusBelow;
      statusColor = "#60a5fa";
    } else if (actualGain > maxRec * (week / 40) * 1.15) {
      status = T.statusAbove;
      statusColor = "#f87171";
    } else {
      status = T.statusOn;
      statusColor = "#34d399";
    }

    setResult(
      `${T.yourGain}: ${fmt(actualGain)} ${T.kg}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.bmiCategory}</div>
            <div class="m-kpi__v" style="font-size:14px;">${catLabel} (BMI ${fmt(bmi)})</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.recommended}</div>
            <div class="m-kpi__v">${fmt(minRec)}–${fmt(maxRec)} ${T.kg}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.status}</div>
            <div class="m-kpi__v" style="color:${statusColor}; font-size:14px;">${status}</div>
          </div>
        </div>
      `
    );

    // update scale to reflect this range (0 to maxRec*1.3 approx)
    const scaleMax = maxRec * 1.4;
    const pct = Math.max(0, Math.min(100, (actualGain / scaleMax) * 100));
    wgMarker.style.left = pct + "%";
    wgScale.style.display = "";

    const labels = wgScaleLabels.querySelectorAll("span");
    if (labels.length === 5) {
      labels[0].textContent = "0";
      labels[1].textContent = fmt(minRec * 0.5);
      labels[2].textContent = fmt(minRec);
      labels[3].textContent = fmt(maxRec);
      labels[4].textContent = fmt(scaleMax);
    }
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
  [height, prePregWeight, currentWeight, currentWeek].forEach(x => x?.addEventListener("input", calc));
  multiple?.addEventListener("change", calc);

  btnCalc?.addEventListener("click", calc);
  btnCopy?.addEventListener("click", copyResult);

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();