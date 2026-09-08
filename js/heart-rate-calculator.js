(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const parseNum = (val) => {
    if (val == null) return 0;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const fmt = (n) => Number.isFinite(n) ? Math.round(n) : "—";
  const safeText = (s) => String(s ?? "").replace(/[<>]/g, "");

  const T = LANG === "en" ? {
    enterInputs: "Enter your age to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    tableCopied: "Table copied.",
    tableCopyFailed: "Failed to copy table.",
    maxHr: "Max heart rate",
    yourMaxHr: "Your estimated max heart rate",
    usingKarvonen: "Using Karvonen formula (with resting HR)",
    usingSimple: "Using simple formula (220 − age)",
    bpm: "bpm",
    zones: [
      { name: "Zone 1 — Warm-up", goal: "Recovery" },
      { name: "Zone 2 — Fat burn", goal: "Fat burning" },
      { name: "Zone 3 — Aerobic", goal: "Endurance" },
      { name: "Zone 4 — Anaerobic", goal: "Speed & power" },
      { name: "Zone 5 — Maximum", goal: "Max effort" },
    ],
  } : {
    enterInputs: "Введи вік для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    tableCopied: "Скопійовано таблицю.",
    tableCopyFailed: "Не вдалося скопіювати таблицю.",
    maxHr: "Максимальний пульс",
    yourMaxHr: "Твій орієнтовний максимальний пульс",
    usingKarvonen: "За формулою Карвонена (з пульсом спокою)",
    usingSimple: "За простою формулою (220 − вік)",
    bpm: "уд/хв",
    zones: [
      { name: "Зона 1 — Розминка", goal: "Відновлення" },
      { name: "Зона 2 — Жироспалення", goal: "Спалювання жиру" },
      { name: "Зона 3 — Аеробна", goal: "Витривалість" },
      { name: "Зона 4 — Анаеробна", goal: "Швидкість і потужність" },
      { name: "Зона 5 — Максимальна", goal: "Максимальне зусилля" },
    ],
  };

  const ZONE_RANGES = [
    [0.50, 0.60],
    [0.60, 0.70],
    [0.70, 0.80],
    [0.80, 0.90],
    [0.90, 1.00],
  ];

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const age = el("age");
  const restHr = el("restHr");

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

  function targetHr(pctLow, pctHigh, maxHr, rest) {
    if (rest > 0) {
      const reserve = maxHr - rest;
      return [rest + reserve * pctLow, rest + reserve * pctHigh];
    }
    return [maxHr * pctLow, maxHr * pctHigh];
  }

  function renderTable(maxHr, rest) {
    if (!scheduleTbody) return;
    const rows = ZONE_RANGES.map(([lo, hi], i) => {
      const [loHr, hiHr] = targetHr(lo, hi, maxHr, rest);
      return {
        name: T.zones[i].name,
        pct: `${Math.round(lo * 100)}-${Math.round(hi * 100)}%`,
        bpm: `${fmt(loHr)}-${fmt(hiHr)}`,
        goal: T.zones[i].goal,
      };
    });
    scheduleTbody.innerHTML = rows.map(r => `
      <tr>
        <td>${safeText(r.name)}</td>
        <td>${safeText(r.pct)}</td>
        <td>${safeText(r.bpm)} ${T.bpm}</td>
        <td>${safeText(r.goal)}</td>
      </tr>
    `).join("");
  }

  function calc({ silent = false } = {}) {
    const a = parseNum(age?.value);
    const rest = parseNum(restHr?.value);

    if (!(a > 0)) {
      setResult(T.enterInputs, "");
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      return;
    }

    const maxHr = 220 - a;
    const usingKarvonen = rest > 0;

    setResult(
      `${T.yourMaxHr}: ${fmt(maxHr)} ${T.bpm}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.maxHr}</div>
            <div class="m-kpi__v">${fmt(maxHr)} ${T.bpm}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${LANG === "en" ? "Formula used" : "Використана формула"}</div>
            <div class="m-kpi__v" style="font-size:13px;">${usingKarvonen ? T.usingKarvonen : T.usingSimple}</div>
          </div>
        </div>
      `
    );

    renderTable(maxHr, rest);
  }

  function reset() {
    if (age) age.value = "";
    if (restHr) restHr.value = "";

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

  [age, restHr].forEach((x) => x?.addEventListener("input", scheduleAuto));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);
  btnCopySchedule?.addEventListener("click", copySchedule);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  setResult(T.enterInputs, "");
})();