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

  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: 2 }) : "—";

  const T = LANG === "en" ? {
    enterInputs: "Enter the bill amount.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    tipAmount: "Tip amount",
    total: "Total (bill + tip)",
    perPerson: "Per person",
  } : {
    enterInputs: "Введи суму рахунку.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    tipAmount: "Сума чайових",
    total: "Разом (рахунок + чайові)",
    perPerson: "На кожну особу",
  };

  // ---------- DOM ----------
  const billAmount = el("billAmount");
  const tipPercent = el("tipPercent");
  const peopleCount = el("peopleCount");
  const tipQuickBtns = document.querySelectorAll("[data-tip]");

  const btnCalc = el("btnCalc");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function calc() {
    const bill = parseNum(billAmount?.value);
    const tipPct = parseNum(tipPercent?.value);
    const people = Math.max(1, parseNum(peopleCount?.value) || 1);

    if (!(bill > 0)) {
      setResult(T.enterInputs, "");
      return;
    }

    const tipAmount = bill * (tipPct / 100);
    const total = bill + tipAmount;
    const perPerson = total / people;

    setResult(
      `${T.perPerson}: ${fmt(perPerson)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.tipAmount}</div>
            <div class="m-kpi__v">${fmt(tipAmount)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.total}</div>
            <div class="m-kpi__v">${fmt(total)}</div>
          </div>
        </div>
      `
    );
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
  [billAmount, tipPercent, peopleCount].forEach(x => x?.addEventListener("input", calc));

  tipQuickBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (tipPercent) tipPercent.value = btn.getAttribute("data-tip");
      calc();
    });
  });

  btnCalc?.addEventListener("click", calc);
  btnCopy?.addEventListener("click", copyResult);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  calc();
})();