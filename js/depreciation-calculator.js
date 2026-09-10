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

  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: 0 }) : "—";

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    valueAfter5: "Estimated value after 5 years",
    totalLoss: "Total value lost",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    valueAfter5: "Орієнтовна вартість через 5 років",
    totalLoss: "Загальна втрата вартості",
  };

  // Year-by-year retention rate (% of previous year's value remaining) per profile
  const PROFILES = {
    average: [0.78, 0.85, 0.87, 0.89, 0.90, 0.92, 0.93, 0.94, 0.95, 0.95],
    premium: [0.85, 0.88, 0.90, 0.91, 0.92, 0.93, 0.94, 0.95, 0.95, 0.96],
    economy: [0.72, 0.80, 0.83, 0.86, 0.88, 0.90, 0.91, 0.92, 0.93, 0.94],
    electric: [0.75, 0.82, 0.85, 0.87, 0.89, 0.91, 0.92, 0.93, 0.94, 0.95],
  };

  // ---------- DOM ----------
  const carPrice = el("carPrice");
  const carType = el("carType");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");

  const canvas = el("deprecChart");
  const ctx = canvas?.getContext?.("2d");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  let chartValues = [];

  function drawChart() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!chartValues.length) return;

    const W = canvas.width, H = canvas.height;
    const padL = 60, padR = 16, padT = 16, padB = 30;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const maxV = Math.max(...chartValues.map(v => v.value));

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
      ctx.fillText(fmt(v), 4, y + 4);
    }

    // line chart
    ctx.strokeStyle = "#0f766e";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    chartValues.forEach((point, i) => {
      const x = padL + (innerW * i) / (chartValues.length - 1);
      const y = padT + innerH * (1 - point.value / maxV);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // points + labels
    chartValues.forEach((point, i) => {
      const x = padL + (innerW * i) / (chartValues.length - 1);
      const y = padT + innerH * (1 - point.value / maxV);
      ctx.fillStyle = "#0f766e";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(15,74,68,.9)";
      ctx.font = "10px Arial";
      ctx.fillText(`Y${point.year}`, x - 8, H - 10);
    });
  }

  function calc() {
    const price = parseNum(carPrice?.value);
    const type = carType?.value || "average";

    if (!(price > 0)) {
      setResult(T.enterInputs, "");
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      chartValues = [];
      drawChart();
      return;
    }

    const rates = PROFILES[type];
    let value = price;
    const rows = [{ year: 0, value: price, loss: 0, pct: 100 }];

    for (let y = 0; y < rates.length; y++) {
      const newValue = value * rates[y];
      const loss = value - newValue;
      rows.push({
        year: y + 1,
        value: newValue,
        loss: loss,
        pct: (newValue / price) * 100,
      });
      value = newValue;
    }

    const valueAfter5 = rows[5]?.value ?? value;
    const totalLossAt5 = price - valueAfter5;

    setResult(
      `${T.valueAfter5}: ${fmt(valueAfter5)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.totalLoss}</div>
            <div class="m-kpi__v">${fmt(totalLossAt5)}</div>
          </div>
        </div>
      `
    );

    if (scheduleTbody) {
      scheduleTbody.innerHTML = rows.map(r => `
        <tr>
          <td>${r.year}</td>
          <td>${fmt(r.value)}</td>
          <td>${r.year === 0 ? "—" : fmt(r.loss)}</td>
          <td>${r.pct.toFixed(0)}%</td>
        </tr>
      `).join("");
    }

    chartValues = rows.map(r => ({ year: r.year, value: r.value }));
    drawChart();
  }

  function reset() {
    if (carPrice) carPrice.value = "";
    if (carType) carType.value = "average";
    setToast(T.resetDone);
    setResult(T.enterInputs, "");
    if (scheduleTbody) scheduleTbody.innerHTML = "";
    chartValues = [];
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

  // ---------- events ----------
  [carPrice, carType].forEach(x => x?.addEventListener("input", calc));
  carType?.addEventListener("change", calc);

  btnCalc?.addEventListener("click", calc);
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  setResult(T.enterInputs, "");
  drawChart();
})();