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
  const safeText = (s) => String(s ?? "").replace(/[<>]/g, "");

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    totalBudget: "Total wedding budget",
    perGuest: "Cost per guest",
    catering: "Catering",
    venue: "Venue",
    decor: "Decor & flowers",
    entertainment: "Music & entertainment",
    attire: "Dress/suit",
    photography: "Photo/video",
    other: "Other",
    contingency: "Contingency reserve",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    totalBudget: "Загальний бюджет весілля",
    perGuest: "Вартість на гостя",
    catering: "Кейтеринг",
    venue: "Локація",
    decor: "Декор та квіти",
    entertainment: "Музика та розваги",
    attire: "Сукня/костюм",
    photography: "Фото/відео",
    other: "Інше",
    contingency: "Резерв",
  };

  // ---------- DOM ----------
  const guestCount = el("guestCount");
  const cateringPerGuest = el("cateringPerGuest");
  const venue = el("venue");
  const decor = el("decor");
  const entertainment = el("entertainment");
  const attire = el("attire");
  const photography = el("photography");
  const other = el("other");
  const contingency = el("contingency");

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

  function calc() {
    const guests = parseNum(guestCount?.value);
    const cateringVal = parseNum(cateringPerGuest?.value) * guests;
    const venueVal = parseNum(venue?.value);
    const decorVal = parseNum(decor?.value);
    const entertainmentVal = parseNum(entertainment?.value);
    const attireVal = parseNum(attire?.value);
    const photographyVal = parseNum(photography?.value);
    const otherVal = parseNum(other?.value);
    const contingencyPct = parseNum(contingency?.value) || 10;

    const subtotal = cateringVal + venueVal + decorVal + entertainmentVal + attireVal + photographyVal + otherVal;

    if (!(subtotal > 0)) {
      setResult(T.enterInputs, "");
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      return;
    }

    const contingencyAmount = subtotal * (contingencyPct / 100);
    const total = subtotal + contingencyAmount;
    const perGuest = guests > 0 ? total / guests : 0;

    setResult(
      `${T.totalBudget}: ${fmt(total)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.perGuest}</div>
            <div class="m-kpi__v">${fmt(perGuest)}</div>
          </div>
        </div>
      `
    );

    const categories = [
      { label: T.catering, value: cateringVal },
      { label: T.venue, value: venueVal },
      { label: T.decor, value: decorVal },
      { label: T.entertainment, value: entertainmentVal },
      { label: T.attire, value: attireVal },
      { label: T.photography, value: photographyVal },
      { label: T.other, value: otherVal },
      { label: T.contingency, value: contingencyAmount },
    ];

    if (scheduleTbody) {
      scheduleTbody.innerHTML = categories.map(c => `
        <tr>
          <td>${safeText(c.label)}</td>
          <td>${fmt(c.value)}</td>
          <td>${total > 0 ? ((c.value / total) * 100).toFixed(1) : 0}%</td>
        </tr>
      `).join("");
    }
  }

  function reset() {
    [guestCount, cateringPerGuest, venue, decor, entertainment, attire, photography, other].forEach(x => { if (x) x.value = ""; });
    if (contingency) contingency.value = "10";
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

  // ---------- events ----------
  [guestCount, cateringPerGuest, venue, decor, entertainment, attire, photography, other, contingency].forEach(x =>
    x?.addEventListener("input", calc)
  );

  btnCalc?.addEventListener("click", calc);
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();