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
  const safeText = (s) => String(s ?? "").replace(/[<>]/g, "");

  const T = LANG === "en" ? {
    enterInputs: "Enter your weight to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    yourNeed: "Your daily water need",
    liters: "L",
    ml: "ml",
    glasses: "≈ glasses (250ml)",
    schedule: [
      { time: "Wake up", pct: 0.15 },
      { time: "Morning (before lunch)", pct: 0.25 },
      { time: "Lunch", pct: 0.15 },
      { time: "Afternoon", pct: 0.20 },
      { time: "Dinner", pct: 0.15 },
      { time: "Evening (before bed)", pct: 0.10 },
    ],
  } : {
    enterInputs: "Введи вагу для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    yourNeed: "Твоя денна норма води",
    liters: "л",
    ml: "мл",
    glasses: "≈ склянок (250мл)",
    schedule: [
      { time: "Прокидання", pct: 0.15 },
      { time: "Ранок (до обіду)", pct: 0.25 },
      { time: "Обід", pct: 0.15 },
      { time: "День", pct: 0.20 },
      { time: "Вечеря", pct: 0.15 },
      { time: "Вечір (перед сном)", pct: 0.10 },
    ],
  };

  const ACTIVITY_ML = { low: 0, moderate: 350, high: 700 };
  const CLIMATE_ML = { normal: 0, hot: 500 };

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const weight = el("weight");
  const activity = el("activity");
  const climate = el("climate");

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

  function renderSchedule(totalMl) {
    if (!scheduleTbody) return;
    scheduleTbody.innerHTML = T.schedule.map(s => {
      const amount = totalMl * s.pct;
      return `<tr><td>${safeText(s.time)}</td><td>${fmt(amount)} ${T.ml}</td></tr>`;
    }).join("");
  }

  function calc({ silent = false } = {}) {
    const w = parseNum(weight?.value);
    const act = activity?.value || "moderate";
    const cli = climate?.value || "normal";

    if (!(w > 0)) {
      setResult(T.enterInputs, "");
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      return;
    }

    const baseMl = w * 33;
    const totalMl = baseMl + ACTIVITY_ML[act] + CLIMATE_ML[cli];
    const liters = totalMl / 1000;
    const glasses = totalMl / 250;

    setResult(
      `${T.yourNeed}: ${fmt(liters)} ${T.liters}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${LANG === "en" ? "Total" : "Всього"}</div>
            <div class="m-kpi__v">${fmt(totalMl)} ${T.ml}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.glasses}</div>
            <div class="m-kpi__v">${fmt(glasses)}</div>
          </div>
        </div>
      `
    );

    renderSchedule(totalMl);
  }

  function reset() {
    if (weight) weight.value = "";
    if (activity) activity.value = "moderate";
    if (climate) climate.value = "normal";

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

  weight?.addEventListener("input", scheduleAuto);
  [activity, climate].forEach((x) => x?.addEventListener("change", scheduleAuto));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  setResult(T.enterInputs, "");
})();