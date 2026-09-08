(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const T = LANG === "en" ? {
    enterTs: "Enter a timestamp.",
    enterDate: "Enter a date.",
    invalidTs: "Invalid timestamp.",
    copied: "Copied.",
    copyFailed: "Copy failed.",
    utcLabel: "UTC",
    localLabel: "Local time",
    isoLabel: "ISO 8601",
    timestampSec: "Timestamp (seconds)",
    timestampMs: "Timestamp (ms)",
  } : {
    enterTs: "Введи timestamp.",
    enterDate: "Введи дату.",
    invalidTs: "Некоректний timestamp.",
    copied: "Скопійовано.",
    copyFailed: "Не вдалося скопіювати.",
    utcLabel: "UTC",
    localLabel: "Місцевий час",
    isoLabel: "ISO 8601",
    timestampSec: "Timestamp (секунди)",
    timestampMs: "Timestamp (мс)",
  };

  // ---------- DOM ----------
  const liveTimestamp = el("liveTimestamp");

  const tsInput = el("tsInput");
  const tsUnit = el("tsUnit");
  const btnToDate = el("btnToDate");
  const dateResult = el("dateResult");
  const dateDetails = el("dateDetails");

  const dateInput = el("dateInput");
  const timeInput = el("timeInput");
  const btnToTs = el("btnToTs");
  const tsResult = el("tsResult");
  const tsDetails = el("tsDetails");

  const toast = el("mToast");
  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };

  // ---------- live timestamp ----------
  function updateLive() {
    if (liveTimestamp) liveTimestamp.textContent = Math.floor(Date.now() / 1000);
  }
  updateLive();
  setInterval(updateLive, 1000);

  // ---------- timestamp -> date ----------
  function tsToDate() {
    const raw = (tsInput?.value || "").trim();
    if (!raw) {
      dateResult.textContent = T.enterTs;
      dateDetails.innerHTML = "";
      return;
    }

    const num = Number(raw);
    if (!Number.isFinite(num)) {
      dateResult.textContent = T.invalidTs;
      dateDetails.innerHTML = "";
      return;
    }

    const unit = tsUnit?.value || "seconds";
    const ms = unit === "seconds" ? num * 1000 : num;
    const d = new Date(ms);

    if (isNaN(d.getTime())) {
      dateResult.textContent = T.invalidTs;
      dateDetails.innerHTML = "";
      return;
    }

    const utcStr = d.toUTCString();
    const localStr = d.toLocaleString(LOCALE);
    const isoStr = d.toISOString();

    dateResult.textContent = utcStr;
    dateDetails.innerHTML = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${T.localLabel}</div>
          <div class="m-kpi__v" style="font-size:13px;">${localStr}</div>
        </div>
        <div class="m-kpi">
          <div class="m-kpi__k">${T.isoLabel}</div>
          <div class="m-kpi__v" style="font-size:12px; word-break:break-all;">${isoStr}</div>
        </div>
      </div>
    `;
  }

  // ---------- date -> timestamp ----------
  function dateToTs() {
    const dateVal = dateInput?.value;
    const timeVal = timeInput?.value || "00:00";

    if (!dateVal) {
      tsResult.textContent = T.enterDate;
      tsDetails.innerHTML = "";
      return;
    }

    const d = new Date(`${dateVal}T${timeVal}:00Z`);
    if (isNaN(d.getTime())) {
      tsResult.textContent = T.invalidTs;
      tsDetails.innerHTML = "";
      return;
    }

    const seconds = Math.floor(d.getTime() / 1000);
    const ms = d.getTime();

    tsResult.textContent = `${seconds}`;
    tsDetails.innerHTML = `
      <div class="m-kpis">
        <div class="m-kpi">
          <div class="m-kpi__k">${T.timestampSec}</div>
          <div class="m-kpi__v" style="font-family:monospace;">${seconds}</div>
        </div>
        <div class="m-kpi">
          <div class="m-kpi__k">${T.timestampMs}</div>
          <div class="m-kpi__v" style="font-family:monospace; font-size:14px;">${ms}</div>
        </div>
      </div>
    `;
  }

  async function copyText(txt) {
    try {
      await navigator.clipboard.writeText(txt);
      setToast(T.copied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.copyFailed);
    }
  }

  // ---------- events ----------
  btnToDate?.addEventListener("click", tsToDate);
  btnToTs?.addEventListener("click", dateToTs);

  tsInput?.addEventListener("input", tsToDate);
  tsUnit?.addEventListener("change", tsToDate);
  dateInput?.addEventListener("change", dateToTs);
  timeInput?.addEventListener("change", dateToTs);

  dateResult?.addEventListener("click", () => copyText(dateResult.textContent));
  tsResult?.addEventListener("click", () => copyText(tsResult.textContent));

  // ---------- init ----------
  function init() {
    const now = new Date();
    if (dateInput) dateInput.value = now.toISOString().split("T")[0];
    if (timeInput) timeInput.value = now.toISOString().split("T")[1].slice(0, 5);
    if (tsInput) tsInput.value = Math.floor(now.getTime() / 1000);
    tsToDate();
    dateToTs();
  }

  init();
})();