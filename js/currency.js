(() => {
  const $ = (id) => document.getElementById(id);

  // ---- i18n helpers ----
  const t = (key, vars) => (window.t ? window.t(key, vars) : key);
  const locale = () => (window.i18nLocale ? window.i18nLocale() : "uk-UA");

  const toast = $("cToast");
  const result = $("cResult");
  const details = $("cDetails");
  const rateDateEl = $("rateDate");

  const autoCalcEl = $("autoCalc");
  const amountEl = $("amount");
  const fromEl = $("fromCur");
  const toEl = $("toCur");

  const btnCalc = $("btnCalc");
  const btnReset = $("btnReset");
  const btnSwap = $("btnSwap");

  const NBU_URL = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";

  const CACHE_KEY = "cc_nbu_rates_v1";
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 годин

  let ratesByCode = {};  // { USD: { rate, txt, exchangedate }, ... }
  let lastRateDate = ""; // "dd.mm.yyyy"

  function setToast(msg) {
    if (!toast) return;
    toast.textContent = msg || "";
  }

  function setResult(main, extra = "") {
    if (result) result.textContent = main || "";
    if (details) details.innerHTML = extra || "";
  }

  function n(val) {
    const s = String(val ?? "").trim().replace(/\s+/g, "").replace(",", ".");
    if (!s) return NaN;
    const num = Number(s);
    return Number.isFinite(num) ? num : NaN;
  }

  function fmt(x, max = 6) {
    if (!Number.isFinite(x)) return "";
    return x.toLocaleString(locale(), { maximumFractionDigits: max });
  }

  function isAutoOn() {
    return !!autoCalcEl && autoCalcEl.checked;
  }

  function buildOptionLabel(code) {
    if (code === "UAH") return t("currency.ua_label"); // "UAH — Ukrainian hryvnia" / "UAH — Українська гривня"
    const item = ratesByCode[code];
    const name = item?.txt ? item.txt : code;
    return `${code} — ${name}`;
  }

  function fillSelects() {
    const prevFrom = fromEl?.value;
    const prevTo = toEl?.value;

    const codes = Object.keys(ratesByCode).sort((a, b) => a.localeCompare(b));

    if (fromEl) fromEl.innerHTML = "";
    if (toEl) toEl.innerHTML = "";

    for (const code of codes) {
      const opt1 = document.createElement("option");
      opt1.value = code;
      opt1.textContent = buildOptionLabel(code);

      const opt2 = document.createElement("option");
      opt2.value = code;
      opt2.textContent = buildOptionLabel(code);

      fromEl?.appendChild(opt1);
      toEl?.appendChild(opt2);
    }

    if (fromEl) fromEl.value = codes.includes(prevFrom) ? prevFrom : (codes.includes("USD") ? "USD" : "UAH");
    if (toEl) toEl.value = codes.includes(prevTo) ? prevTo : "UAH";
  }

  function setRateDateBadge() {
    if (!rateDateEl) return;
    rateDateEl.textContent = lastRateDate ? t("currency.nbu_badge", { date: lastRateDate }) : "";
  }

  function saveCache(payload) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch {}
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data === "object" ? data : null;
    } catch {
      return null;
    }
  }

  function cacheIsFresh(cache) {
    if (!cache?.ts) return false;
    return (Date.now() - cache.ts) < CACHE_TTL_MS;
  }

  function normalizeRates(apiArr) {
    const map = {
      UAH: { rate: 1, txt: t("currency.ua_name"), exchangedate: "" }
    };

    for (const row of apiArr || []) {
      if (!row?.cc || !Number.isFinite(Number(row.rate))) continue;
      map[String(row.cc).toUpperCase()] = {
        rate: Number(row.rate),
        txt: row.txt || row.cc,
        exchangedate: row.exchangedate || ""
      };
    }

    const any = apiArr?.find?.(x => x?.exchangedate)?.exchangedate || "";
    lastRateDate = any || "";
    return map;
  }

  async function loadRates() {
    setToast("");

    const cache = readCache();

    // 1) fresh cache
    if (cache?.rates && cacheIsFresh(cache)) {
      ratesByCode = cache.rates;
      lastRateDate = cache.lastRateDate || "";
      fillSelects();
      setRateDateBadge();
      return true;
    }

    // 2) fetch from NBU
    try {
      const res = await fetch(NBU_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("NBU not ok");
      const data = await res.json();

      ratesByCode = normalizeRates(data);
      fillSelects();
      setRateDateBadge();

      saveCache({
        ts: Date.now(),
        rates: ratesByCode,
        lastRateDate
      });

      return true;
    } catch {
      // 3) fallback to old cache
      if (cache?.rates) {
        ratesByCode = cache.rates;
        lastRateDate = cache.lastRateDate || "";
        fillSelects();
        setRateDateBadge();
        setToast(t("currency.nbu_unavailable_cached"));
        return true;
      }

      setToast(t("currency.nbu_failed"));
      return false;
    }
  }

  function convert({ silent = false } = {}) {
    const amount = n(amountEl?.value);
    const from = fromEl?.value;
    const to = toEl?.value;

    if (!Number.isFinite(amount) || (amountEl?.value || "").trim() === "") {
      if (!silent) setToast(t("currency.err_amount"));
      return false;
    }

    if (!ratesByCode[from] || !ratesByCode[to]) {
      if (!silent) setToast(t("currency.err_currencies"));
      return false;
    }

    const rateFrom = ratesByCode[from].rate; // UAH за 1 FROM
    const rateTo = ratesByCode[to].rate;     // UAH за 1 TO

    const amountUAH = amount * rateFrom;
    const out = amountUAH / rateTo;

    const line1 = t("currency.line_result", {
      a: fmt(amount),
      from,
      b: fmt(out, 6),
      to
    });

    const extra = `
      <div><b>${t("currency.rate")}</b> 1 ${from} = ${fmt(rateFrom, 6)} UAH</div>
      <div><b>${t("currency.rate")}</b> 1 ${to} = ${fmt(rateTo, 6)} UAH</div>
      <div><b>${t("currency.formula")}</b> (${fmt(amount)} × ${fmt(rateFrom, 6)}) / ${fmt(rateTo, 6)} = <b>${fmt(out, 6)}</b></div>
    `;

    setToast("");
    setResult(line1, extra);
    return true;
  }

  // Auto-calc debounce
  let autoTimer = null;
  function scheduleAuto() {
    if (!isAutoOn()) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => convert({ silent: true }), 180);
  }

  // Events
  btnCalc?.addEventListener("click", () => convert({ silent: false }));

  btnReset?.addEventListener("click", () => {
    if (amountEl) amountEl.value = "";
    if (Object.keys(ratesByCode).length) {
      if (fromEl) fromEl.value = Object.keys(ratesByCode).includes("USD") ? "USD" : "UAH";
      if (toEl) toEl.value = "UAH";
    }
    setToast(t("currency.reset_done"));
    setResult(t("currency.hint_enter"), "");
    setTimeout(() => setToast(""), 1200);
  });

  btnSwap?.addEventListener("click", () => {
    if (!fromEl || !toEl) return;
    const a = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value = a;
    scheduleAuto();
  });

  amountEl?.addEventListener("input", scheduleAuto);
  fromEl?.addEventListener("change", scheduleAuto);
  toEl?.addEventListener("change", scheduleAuto);

  autoCalcEl?.addEventListener("change", () => {
    setToast("");
    if (autoCalcEl.checked) scheduleAuto();
  });

  // Enter to calculate
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    convert({ silent: false });
  });

  // Copy result
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-copy]");
    if (!btn) return;

    const text = result?.textContent?.trim();
    if (!text || text.includes("Введи") || text.toLowerCase().includes("enter")) {
      setToast(t("currency.copy_first_calc"));
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setToast(t("currency.copy_ok"));
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(t("currency.copy_failed"));
    }
  });

  // init
  (async () => {
    setResult(t("currency.loading"), "");
    const ok = await loadRates();
    if (!ok) return;

    if ((amountEl?.value || "").trim() && isAutoOn()) scheduleAuto();
    else setResult(t("currency.hint_enter"), "");
  })();
})();
