(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    enterInputs: "Select time zones to calculate.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    resultIn: "Time in",
    dateLabel: "Date",
    diffLabel: "Difference",
    hoursShort: "h",
  } : {
    enterInputs: "Обери часові пояси для розрахунку.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    resultIn: "Час у",
    dateLabel: "Дата",
    diffLabel: "Різниця",
    hoursShort: "год",
  };

  // Popular time zones list (IANA names)
  const ZONES = [
    { id: "Europe/Kyiv", label: "Kyiv (Ukraine)" },
    { id: "Europe/London", label: "London (UK)" },
    { id: "Europe/Berlin", label: "Berlin (Germany)" },
    { id: "Europe/Warsaw", label: "Warsaw (Poland)" },
    { id: "Europe/Paris", label: "Paris (France)" },
    { id: "Europe/Madrid", label: "Madrid (Spain)" },
    { id: "Europe/Moscow", label: "Moscow (Russia)" },
    { id: "America/New_York", label: "New York (USA, ET)" },
    { id: "America/Chicago", label: "Chicago (USA, CT)" },
    { id: "America/Denver", label: "Denver (USA, MT)" },
    { id: "America/Los_Angeles", label: "Los Angeles (USA, PT)" },
    { id: "America/Toronto", label: "Toronto (Canada)" },
    { id: "America/Sao_Paulo", label: "São Paulo (Brazil)" },
    { id: "Asia/Dubai", label: "Dubai (UAE)" },
    { id: "Asia/Kolkata", label: "Mumbai/Delhi (India)" },
    { id: "Asia/Shanghai", label: "Shanghai (China)" },
    { id: "Asia/Tokyo", label: "Tokyo (Japan)" },
    { id: "Asia/Seoul", label: "Seoul (South Korea)" },
    { id: "Asia/Singapore", label: "Singapore" },
    { id: "Asia/Bangkok", label: "Bangkok (Thailand)" },
    { id: "Australia/Sydney", label: "Sydney (Australia)" },
    { id: "Pacific/Auckland", label: "Auckland (New Zealand)" },
    { id: "UTC", label: "UTC" },
  ];

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const dateInput = el("dateInput");
  const timeInput = el("timeInput");
  const fromZone = el("fromZone");
  const toZone = el("toZone");

  const btnCalc = el("btnCalc");
  const btnNow = el("btnNow");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function populateZones() {
    if (!fromZone || !toZone) return;
    const opts = ZONES.map(z => `<option value="${z.id}">${z.label}</option>`).join("");
    fromZone.innerHTML = opts;
    toZone.innerHTML = opts;

    // try to detect user's zone as default "from"
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (ZONES.some(z => z.id === userTz)) {
        fromZone.value = userTz;
      } else {
        fromZone.value = "Europe/Kyiv";
      }
    } catch {
      fromZone.value = "Europe/Kyiv";
    }
    toZone.value = "America/New_York";
  }

  function getOffsetMinutes(tz, date) {
    // Get the UTC offset for a given IANA timezone at a given date, in minutes
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = dtf.formatToParts(date);
    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });
    const asUTC = Date.UTC(
      Number(map.year), Number(map.month) - 1, Number(map.day),
      Number(map.hour) === 24 ? 0 : Number(map.hour), Number(map.minute), Number(map.second)
    );
    return (asUTC - date.getTime()) / 60000;
  }

  function calc({ silent = false } = {}) {
    const dateVal = dateInput?.value;
    const timeVal = timeInput?.value;
    const from = fromZone?.value;
    const to = toZone?.value;

    if (!dateVal || !timeVal || !from || !to) {
      setResult(T.enterInputs, "");
      return;
    }

    // Interpret input date/time as being in the "from" zone
    const naiveDate = new Date(`${dateVal}T${timeVal}:00Z`); // treat as UTC placeholder
    const fromOffsetAtNaive = getOffsetMinutes(from, naiveDate);
    // Actual UTC instant = naive - fromOffset
    const utcInstant = new Date(naiveDate.getTime() - fromOffsetAtNaive * 60000);

    const toOffset = getOffsetMinutes(to, utcInstant);
    const diffHours = (toOffset - fromOffsetAtNaive) / 60;

    const timeFormatter = new Intl.DateTimeFormat(LANG === "en" ? "en-US" : "uk-UA", {
      timeZone: to, hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const dateFormatter = new Intl.DateTimeFormat(LANG === "en" ? "en-US" : "uk-UA", {
      timeZone: to, weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const toLabel = (ZONES.find(z => z.id === to) || {}).label || to;

    setResult(
      `${T.resultIn} ${toLabel}: ${timeFormatter.format(utcInstant)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.dateLabel}</div>
            <div class="m-kpi__v" style="font-size:14px;">${dateFormatter.format(utcInstant)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.diffLabel}</div>
            <div class="m-kpi__v">${diffHours >= 0 ? "+" : ""}${diffHours} ${T.hoursShort}</div>
          </div>
        </div>
      `
    );
  }

  function setNow() {
    const now = new Date();
    if (dateInput) dateInput.value = now.toISOString().split("T")[0];
    if (timeInput) timeInput.value = now.toTimeString().slice(0, 5);
    calc();
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

  [dateInput, timeInput, fromZone, toZone].forEach(x => {
    x?.addEventListener("input", scheduleAuto);
    x?.addEventListener("change", scheduleAuto);
  });

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnNow?.addEventListener("click", setNow);
  btnCopy?.addEventListener("click", copyResult);

  // ---------- init ----------
  populateZones();
  setNow();
})();