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

  const safeText = (s) => String(s ?? "").replace(/[<>]/g, "");

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    tableCopied: "Table copied.",
    tableCopyFailed: "Failed to copy table.",
    finishTime: "Estimated finish time",
    yourPace: "Your pace",
    yourDistance: "Estimated distance",
    perKm: "min/km",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    tableCopied: "Скопійовано таблицю.",
    tableCopyFailed: "Не вдалося скопіювати таблицю.",
    finishTime: "Орієнтовний час фінішу",
    yourPace: "Твій темп",
    yourDistance: "Орієнтовна дистанція",
    perKm: "хв/км",
  };

  const STANDARD_DISTANCES = [
    { km: 5, label: "5 km" },
    { km: 10, label: "10 km" },
    { km: 21.0975, label: LANG === "en" ? "Half marathon" : "Півмарафон" },
    { km: 42.195, label: LANG === "en" ? "Marathon" : "Марафон" },
  ];

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const mode = el("mode");

  const distanceWrap = el("distanceWrap");
  const paceWrap = el("paceWrap");
  const timeWrap = el("timeWrap");

  const distance = el("distance");
  const paceMin = el("paceMin");
  const paceSec = el("paceSec");
  const timeH = el("timeH");
  const timeM = el("timeM");
  const timeS = el("timeS");

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

  function fmtTime(totalSec) {
    if (!Number.isFinite(totalSec) || totalSec < 0) return "—";
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.round(totalSec % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function fmtPace(secPerKm) {
    if (!Number.isFinite(secPerKm) || secPerKm < 0) return "—";
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function applyModeUI() {
    const m = mode?.value || "time";
    if (distanceWrap) distanceWrap.style.display = m === "distance" ? "none" : "";
    if (paceWrap) paceWrap.style.display = m === "pace" ? "none" : "";
    if (timeWrap) timeWrap.style.display = m === "time" ? "none" : "";
  }

  function getPaceSec() {
    return parseNum(paceMin?.value) * 60 + parseNum(paceSec?.value);
  }

  function getTimeSec() {
    return parseNum(timeH?.value) * 3600 + parseNum(timeM?.value) * 60 + parseNum(timeS?.value);
  }

  function renderTable(paceSecPerKm) {
    if (!scheduleTbody) return;
    const rows = STANDARD_DISTANCES.map(d => ({
      label: d.label,
      time: fmtTime(paceSecPerKm * d.km),
    }));
    scheduleTbody.innerHTML = rows.map(r => `
      <tr>
        <td>${safeText(r.label)}</td>
        <td>${safeText(r.time)}</td>
      </tr>
    `).join("");
  }

  function calc({ silent = false } = {}) {
    const m = mode?.value || "time";

    if (m === "time") {
      const dist = parseNum(distance?.value);
      const paceSecPerKm = getPaceSec();
      if (!(dist > 0) || !(paceSecPerKm > 0)) {
        setResult(T.enterInputs, "");
        if (scheduleTbody) scheduleTbody.innerHTML = "";
        return;
      }
      const totalSec = dist * paceSecPerKm;
      setResult(
        `${T.finishTime}: ${fmtTime(totalSec)}`,
        `<div class="m-kpis"><div class="m-kpi"><div class="m-kpi__k">${T.yourPace}</div><div class="m-kpi__v">${fmtPace(paceSecPerKm)} ${T.perKm}</div></div></div>`
      );
      renderTable(paceSecPerKm);
    }

    if (m === "pace") {
      const dist = parseNum(distance?.value);
      const totalSec = getTimeSec();
      if (!(dist > 0) || !(totalSec > 0)) {
        setResult(T.enterInputs, "");
        if (scheduleTbody) scheduleTbody.innerHTML = "";
        return;
      }
      const paceSecPerKm = totalSec / dist;
      setResult(
        `${T.yourPace}: ${fmtPace(paceSecPerKm)} ${T.perKm}`,
        `<div class="m-kpis"><div class="m-kpi"><div class="m-kpi__k">${LANG === "en" ? "Total time" : "Загальний час"}</div><div class="m-kpi__v">${fmtTime(totalSec)}</div></div></div>`
      );
      renderTable(paceSecPerKm);
    }

    if (m === "distance") {
      const paceSecPerKm = getPaceSec();
      const totalSec = getTimeSec();
      if (!(paceSecPerKm > 0) || !(totalSec > 0)) {
        setResult(T.enterInputs, "");
        if (scheduleTbody) scheduleTbody.innerHTML = "";
        return;
      }
      const dist = totalSec / paceSecPerKm;
      setResult(
        `${T.yourDistance}: ${dist.toFixed(2)} km`,
        `<div class="m-kpis"><div class="m-kpi"><div class="m-kpi__k">${T.yourPace}</div><div class="m-kpi__v">${fmtPace(paceSecPerKm)} ${T.perKm}</div></div></div>`
      );
      renderTable(paceSecPerKm);
    }
  }

  function reset() {
    if (mode) mode.value = "time";
    [distance, paceMin, paceSec, timeH, timeM, timeS].forEach(x => { if (x) x.value = ""; });

    applyModeUI();
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

  // ---------- events ----------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  mode?.addEventListener("change", () => { applyModeUI(); scheduleAuto(); });
  [distance, paceMin, paceSec, timeH, timeM, timeS].forEach(x => x?.addEventListener("input", scheduleAuto));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);
  btnCopySchedule?.addEventListener("click", copySchedule);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  // ---------- init ----------
  applyModeUI();
  setResult(T.enterInputs, "");
})();