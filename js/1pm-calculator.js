(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const fmt = (n, maxFrac = 1) =>
    Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: maxFrac }) : "—";

  const parseNum = (val) => {
    if (val == null) return 0;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const safeText = (s) => String(s ?? "").replace(/[<>]/g, "");

  const unitKg = "кг";
  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    tableCopied: "Table copied.",
    tableCopyFailed: "Failed to copy table.",
    csvDownloaded: "CSV downloaded.",
    chartNeedData: "Calculate to see the chart.",
    goalStrength: "Strength",
    goalHypertrophy: "Hypertrophy",
    goalEndurance: "Endurance",
    yourEstimate: "Your estimated 1RM",
    weightLabel: "Weight",
    formulaEpley: "Epley",
    formulaBrzycki: "Brzycki",
    formulaAvg: "Average",
    thPct: "% of 1RM",
    thWeight: "Weight",
    thReps: "Reps",
    thGoal: "Goal",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    tableCopied: "Скопійовано таблицю.",
    tableCopyFailed: "Не вдалося скопіювати таблицю.",
    csvDownloaded: "CSV завантажено.",
    chartNeedData: "Зроби розрахунок, щоб побачити графік.",
    goalStrength: "Сила",
    goalHypertrophy: "Гіпертрофія",
    goalEndurance: "Витривалість",
    yourEstimate: "Твій орієнтовний 1ПМ",
    weightLabel: "Вага",
    formulaEpley: "Еплі",
    formulaBrzycki: "Бжицького",
    formulaAvg: "Середнє",
    thPct: "% від 1ПМ",
    thWeight: "Вага",
    thReps: "Повторення",
    thGoal: "Мета",
  };

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const formula = el("formula");
  const weight = el("weight");
  const reps = el("reps");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");
  const btnDownloadCSV = el("btnDownloadCSV");

  const canvas = el("growthChart");
  const ctx = canvas?.getContext?.("2d");

  // ---------- state ----------
  let tableRows = [];
  let chartBars = [];
  let last1RM = null;

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  // ---------- formulas ----------
  function calc1RM(w, r, f) {
    if (r <= 1) return w;
    const epley = w * (1 + r / 30);
    const brzycki = w * 36 / (37 - r);
    if (f === "epley") return epley;
    if (f === "brzycki") return brzycki;
    return (epley + brzycki) / 2;
  }

  const PCT_ROWS = [
    { pct: 100, reps: 1, goal: "strength" },
    { pct: 95, reps: 2, goal: "strength" },
    { pct: 90, reps: 4, goal: "strength" },
    { pct: 85, reps: 5, goal: "strength" },
    { pct: 80, reps: 8, goal: "hypertrophy" },
    { pct: 75, reps: 10, goal: "hypertrophy" },
    { pct: 70, reps: 12, goal: "hypertrophy" },
    { pct: 65, reps: 14, goal: "endurance" },
    { pct: 60, reps: 16, goal: "endurance" },
    { pct: 50, reps: 20, goal: "endurance" },
  ];

  const goalLabel = (g) => g === "strength" ? T.goalStrength : g === "hypertrophy" ? T.goalHypertrophy : T.goalEndurance;

  // ---------- chart ----------
  function drawChart() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!chartBars.length) {
      ctx.font = "12px Arial";
      ctx.fillStyle = "#0f4a44";
      ctx.fillText(T.chartNeedData, 12, 24);
      return;
    }

    const W = canvas.width, H = canvas.height;
    const padL = 52, padR = 16, padT = 16, padB = 34;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const values = chartBars.map(b => b.value);
    const maxV = Math.max(...values, 1e-9);

    ctx.strokeStyle = "rgba(15,118,110,.18)";
    ctx.lineWidth = 1;

    const gridN = 4;
    for (let g = 0; g <= gridN; g++) {
      const y = padT + (innerH * g) / gridN;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();

      const v = maxV * (1 - g / gridN);
      ctx.fillStyle = "rgba(15,74,68,.85)";
      ctx.font = "11px Arial";
      ctx.fillText(fmt(v, 0), 6, y + 4);
    }

    const n = chartBars.length;
    const gap = 6;
    const barW = Math.max(10, (innerW - gap * (n - 1)) / n);

    chartBars.forEach((b, i) => {
      const x = padL + i * (barW + gap);
      const h = innerH * (b.value / maxV);
      const y = padT + (innerH - h);

      ctx.fillStyle = "rgba(15,118,110,.85)";
      ctx.fillRect(x, y, barW, h);

      ctx.fillStyle = "rgba(15,74,68,.95)";
      ctx.font = "10px Arial";
      const label = b.label || "";
      const tw = ctx.measureText(label).width;
      ctx.fillText(label, x + barW / 2 - tw / 2, H - 12);
    });
  }

  function renderTable(highlight1pm) {
    if (!scheduleTbody) return;
    scheduleTbody.innerHTML = tableRows.map(r => `
      <tr class="${r.pct === highlight1pm ? "is-highlight" : ""}">
        <td>${safeText(r.pct)}%</td>
        <td>${safeText(r.weightStr)} ${unitKg}</td>
        <td>${safeText(r.reps)}</td>
        <td>${safeText(r.goalStr)}</td>
      </tr>
    `).join("");
  }

  // ---------- calc ----------
  function calc({ silent = false } = {}) {
    const w = parseNum(weight?.value);
    const r = Math.max(1, Math.round(parseNum(reps?.value)));
    const f = formula?.value || "epley";

    if (!(w > 0) || !(r >= 1)) {
      setResult(T.enterInputs, "");
      tableRows = [];
      chartBars = [];
      last1RM = null;
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      drawChart();
      return;
    }

    const oneRM = calc1RM(w, r, f);
    last1RM = oneRM;

    const formulaName = f === "epley" ? T.formulaEpley : f === "brzycki" ? T.formulaBrzycki : T.formulaAvg;

    setResult(
      `${T.yourEstimate}: ${fmt(oneRM, 1)} ${unitKg}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.weightLabel} × ${LANG === "en" ? "reps" : "повторень"}</div>
            <div class="m-kpi__v">${fmt(w, 1)} ${unitKg} × ${r}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${LANG === "en" ? "Formula" : "Формула"}</div>
            <div class="m-kpi__v">${formulaName}</div>
          </div>
        </div>
      `
    );

    tableRows = PCT_ROWS.map(row => {
      const w2 = oneRM * (row.pct / 100);
      return {
        pct: row.pct,
        weightStr: fmt(w2, 1),
        reps: row.reps,
        goalStr: goalLabel(row.goal),
      };
    });

    chartBars = PCT_ROWS.map(row => ({
      label: row.pct + "%",
      value: oneRM * (row.pct / 100),
    }));

    renderTable(100);
    drawChart();
  }

  function reset() {
    if (formula) formula.value = "epley";
    if (weight) weight.value = "";
    if (reps) reps.value = "";

    setToast(T.resetDone);
    setResult(T.enterInputs, "");

    tableRows = [];
    chartBars = [];
    last1RM = null;

    if (scheduleTbody) scheduleTbody.innerHTML = "";
    drawChart();

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

  function downloadCSV() {
    if (!scheduleTable) return;
    const rowsCSV = Array.from(scheduleTable.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.children).map((td) => `"${td.innerText.replace(/"/g, '""').trim()}"`).join(",")
    );
    const csv = rowsCSV.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "1rm-percentages.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setToast(T.csvDownloaded);
    setTimeout(() => setToast(""), 1500);
  }

  // ---------- auto calc ----------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  // ---------- events ----------
  [weight, reps].forEach((x) => x?.addEventListener("input", scheduleAuto));
  formula?.addEventListener("change", scheduleAuto);

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  // ---------- init ----------
  function init() {
    setResult(T.enterInputs, "");
    drawChart();
  }

  init();
})();