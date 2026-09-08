(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const fmt = (n, maxFrac = 0) =>
    Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: maxFrac }) : "—";

  const parseNum = (val) => {
    if (val == null) return 0;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const safeText = (s) => String(s ?? "").replace(/[<>]/g, "");

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    tableCopied: "Table copied.",
    tableCopyFailed: "Failed to copy table.",
    bmrLabel: "BMR (basal metabolism)",
    tdeeLabel: "TDEE (daily maintenance)",
    yourTdee: "Your daily calorie need (TDEE)",
    goalLoss: "Weight loss",
    goalMaintain: "Maintenance",
    goalGain: "Muscle gain",
    kcalDay: "kcal/day",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    tableCopied: "Скопійовано таблицю.",
    tableCopyFailed: "Не вдалося скопіювати таблицю.",
    bmrLabel: "BMR (базовий метаболізм)",
    tdeeLabel: "TDEE (норма для підтримки)",
    yourTdee: "Твоя денна норма калорій (TDEE)",
    goalLoss: "Схуднення",
    goalMaintain: "Підтримка",
    goalGain: "Набір маси",
    kcalDay: "ккал/день",
  };

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const sex = el("sex");
  const age = el("age");
  const weight = el("weight");
  const height = el("height");
  const activity = el("activity");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  let tableRows = [];

  function calcBMR(s, a, w, h) {
    const base = 10 * w + 6.25 * h - 5 * a;
    return s === "male" ? base + 5 : base - 161;
  }

  const GOALS = [
    { key: "loss20", pct: -20, label: LANG === "en" ? "Weight loss (fast)" : "Схуднення (швидке)" },
    { key: "loss10", pct: -10, label: LANG === "en" ? "Weight loss (moderate)" : "Схуднення (помірне)" },
    { key: "maintain", pct: 0, label: LANG === "en" ? "Maintenance" : "Підтримка" },
    { key: "gain10", pct: 10, label: LANG === "en" ? "Muscle gain (lean)" : "Набір маси (чистий)" },
    { key: "gain15", pct: 15, label: LANG === "en" ? "Muscle gain (fast)" : "Набір маси (швидкий)" },
  ];

  function renderTable(tdee) {
    if (!scheduleTbody) return;
    tableRows = GOALS.map(g => {
      const val = tdee * (1 + g.pct / 100);
      const diffStr = g.pct === 0 ? "—" : `${g.pct > 0 ? "+" : ""}${g.pct}%`;
      return { goal: g.label, kcal: fmt(val), diff: diffStr, isMaintain: g.pct === 0 };
    });
    scheduleTbody.innerHTML = tableRows.map(r => `
      <tr class="${r.isMaintain ? "is-highlight" : ""}">
        <td>${safeText(r.goal)}</td>
        <td>${safeText(r.kcal)} ${T.kcalDay}</td>
        <td>${safeText(r.diff)}</td>
      </tr>
    `).join("");
  }

  function calc({ silent = false } = {}) {
    const s = sex?.value || "male";
    const a = parseNum(age?.value);
    const w = parseNum(weight?.value);
    const h = parseNum(height?.value);
    const act = parseNum(activity?.value) || 1.55;

    if (!(a > 0) || !(w > 0) || !(h > 0)) {
      setResult(T.enterInputs, "");
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      return;
    }

    const bmr = calcBMR(s, a, w, h);
    const tdee = bmr * act;

    setResult(
      `${T.yourTdee}: ${fmt(tdee)} ${T.kcalDay}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.bmrLabel}</div>
            <div class="m-kpi__v">${fmt(bmr)} ${T.kcalDay}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.tdeeLabel}</div>
            <div class="m-kpi__v">${fmt(tdee)} ${T.kcalDay}</div>
          </div>
        </div>
      `
    );

    renderTable(tdee);
  }

  function reset() {
    if (sex) sex.value = "male";
    if (age) age.value = "";
    if (weight) weight.value = "";
    if (height) height.value = "";
    if (activity) activity.value = "1.55";

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

  async function copySchedule() {
    if (!scheduleTable) return;
    const trs = Array.from(scheduleTable.querySelectorAll("tr"));
    const lines = trs.map((tr) =>
      Array.from(tr.children).map((td) => td.innerText.replace(/\s+/g, " ").trim()).join("\t")
    );
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      setToast(T.tableCopied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.tableCopyFailed);
    }
  }

  // ---------- auto calc ----------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  // ---------- events ----------
  [age, weight, height].forEach((x) => x?.addEventListener("input", scheduleAuto));
  [sex, activity].forEach((x) => x?.addEventListener("change", scheduleAuto));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);
  btnCopySchedule?.addEventListener("click", copySchedule);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();