(() => {
  const $ = (id) => document.getElementById(id);

  // ---- i18n helpers ----
  const t = (key, vars) => (window.t ? window.t(key, vars) : key);
  const locale = () => (window.i18nLocale ? window.i18nLocale() : "uk-UA");
  const lang = window.__LANG__ === "en" ? "en" : "uk";

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
  const CG_URL = "https://api.coingecko.com/api/v3/simple/price";

  const CACHE_KEY = "cc_nbu_rates_v1";
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 годин
  const CRYPTO_CACHE_KEY = "cc_crypto_rates_v1";
  const CRYPTO_TTL_MS = 10 * 60 * 1000; // 10 хвилин
  const MONO_URL = "https://api.monobank.ua/bank/currency";
  const MINFIN_URL = "/api/minfin"; // проксі на Cloudflare Pages Functions (ключ Мінфіну лишається на сервері)
  const BANK_CACHE_KEY = "cc_bank_rates_v1_";
  const MONO_TTL_MS = 5 * 60 * 1000;   // ліміт monobank API — 1 запит/хв
  const MINFIN_TTL_MS = 15 * 60 * 1000; // сервер і так кешує на 30 хв

  // ---- довідники ----
  const FLAG = {
    AED: "ae", AMD: "am", AUD: "au", AZN: "az", BDT: "bd", BGN: "bg", BRL: "br", BYN: "by",
    CAD: "ca", CHF: "ch", CNY: "cn", CZK: "cz", DKK: "dk", DZD: "dz", EGP: "eg", EUR: "eu",
    GBP: "gb", GEL: "ge", HKD: "hk", HUF: "hu", IDR: "id", ILS: "il", INR: "in", ISK: "is",
    JPY: "jp", KGS: "kg", KRW: "kr", KZT: "kz", LBP: "lb", MDL: "md", MXN: "mx", MYR: "my",
    NOK: "no", NZD: "nz", PLN: "pl", RON: "ro", RSD: "rs", SAR: "sa", SEK: "se", SGD: "sg",
    THB: "th", TND: "tn", TRY: "tr", UAH: "ua", USD: "us", UZS: "uz", VND: "vn", ZAR: "za"
  };

  const SPECIAL = {
    XAU: { c: "#d4af37", g: "Au" },
    XAG: { c: "#9aa4b2", g: "Ag" },
    XPT: { c: "#7f93a8", g: "Pt" },
    XPD: { c: "#6f7f94", g: "Pd" },
    XDR: { c: "#5b6b8c", g: "SDR" }
  };

  const CRYPTO = [
    { code: "BTC", id: "bitcoin", name: "Bitcoin", c: "#f7931a", g: "₿" },
    { code: "ETH", id: "ethereum", name: "Ethereum", c: "#627eea", g: "Ξ" },
    { code: "USDT", id: "tether", name: "Tether", c: "#26a17b", g: "₮" },
    { code: "BNB", id: "binancecoin", name: "BNB", c: "#d9a514", g: "B" },
    { code: "SOL", id: "solana", name: "Solana", c: "#9945ff", g: "S" },
    { code: "XRP", id: "ripple", name: "XRP", c: "#2b3340", g: "X" },
    { code: "USDC", id: "usd-coin", name: "USD Coin", c: "#2775ca", g: "$" },
    { code: "DOGE", id: "dogecoin", name: "Dogecoin", c: "#c2a633", g: "Ð" },
    { code: "TON", id: "the-open-network", name: "Toncoin", c: "#0098ea", g: "T" },
    { code: "TRX", id: "tron", name: "TRON", c: "#eb0029", g: "T" },
    { code: "ADA", id: "cardano", name: "Cardano", c: "#0033ad", g: "₳" },
    { code: "LTC", id: "litecoin", name: "Litecoin", c: "#345d9d", g: "Ł" },
    { code: "AVAX", id: "avalanche-2", name: "Avalanche", c: "#e84142", g: "A" },
    { code: "LINK", id: "chainlink", name: "Chainlink", c: "#2a5ada", g: "L" },
    { code: "DOT", id: "polkadot", name: "Polkadot", c: "#e6007a", g: "●" },
    { code: "BCH", id: "bitcoin-cash", name: "Bitcoin Cash", c: "#6fae3f", g: "Ƀ" }
  ];
  const CRYPTO_META = Object.fromEntries(CRYPTO.map((c) => [c.code, c]));

  const POPULAR = ["UAH", "USD", "EUR", "PLN", "GBP"];

  let fiat = {};         // { USD: { rate, txt, exchangedate }, ... } — курс у UAH за 1 одиницю
  let crypto = {};       // { BTC: { rate }, ... } — курс у UAH за 1 монету
  let cryptoTs = 0;
  let lastRateDate = ""; // "dd.mm.yyyy"

  const isCrypto = (code) => !!CRYPTO_META[code];

  // Джерело курсу: "nbu" — офіційний (купівля = продаж); "mono" — monobank, "avg" — середній курс банків
  // і "mb" — міжбанк (останні два — через Мінфін). Для банківських джерел є окремі купівля/продаж.
  const SOURCE_KEY = "cc_rate_source";
  const BANK_SOURCES = ["mono", "avg", "mb"];
  let source = "nbu";
  const bank = { mono: {}, avg: {}, mb: {} };           // { USD: { buy, sell }, ... } — у UAH
  const bankUpdated = { mono: "", avg: "", mb: "" };    // готовий текст "14.10, 10:45" для бейджа

  // UAH, які отримуємо, продаючи 1 одиницю / віддаємо, купуючи 1 одиницю
  function priceOf(code, side) {
    if (isCrypto(code)) return crypto[code]?.rate;
    if (code === "UAH") return 1;
    if (source !== "nbu") return bank[source]?.[code]?.[side];
    return fiat[code]?.rate;
  }
  const buyOf = (code) => priceOf(code, "buy");
  const sellOf = (code) => priceOf(code, "sell");
  const isAvailable = (code) => !!buyOf(code) && !!sellOf(code);

  let displayNames = null;
  try { displayNames = new Intl.DisplayNames([lang], { type: "currency" }); } catch {}

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

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

  function currencyName(code) {
    if (CRYPTO_META[code]) return CRYPTO_META[code].name;
    if (code === "UAH") return t("currency.ua_name");
    let nm = "";
    try { nm = displayNames?.of(code) || ""; } catch {}
    if (nm && nm !== code) return nm.charAt(0).toUpperCase() + nm.slice(1);
    return fiat[code]?.txt || code;
  }

  function iconHtml(code) {
    if (FLAG[code]) {
      return `<img class="cc-flag" src="/assets/flags/${FLAG[code]}.png" width="20" height="14" alt="" loading="lazy" decoding="async">`;
    }
    const m = CRYPTO_META[code] || SPECIAL[code] || { c: "#8a94ab", g: code.slice(0, 1) };
    return `<span class="cc-coin" style="--c:${m.c}">${esc(m.g)}</span>`;
  }

  // =====================================================
  // Picker (випадаючий список валют: прапорці, пошук, вкладки)
  // =====================================================
  const pickers = [];

  function closeAllPickers(except) {
    pickers.forEach((p) => { if (p !== except) p.close(); });
  }

  function createPicker(selectEl, { align = "start" } = {}) {
    if (!selectEl) return null;

    selectEl.classList.add("cc-native");
    selectEl.setAttribute("tabindex", "-1");
    selectEl.setAttribute("aria-hidden", "true");

    const root = document.createElement("div");
    root.className = "cc-pick" + (align === "end" ? " cc-pick--end" : "");
    root.innerHTML = `
      <button type="button" class="cc-pick__btn" id="${selectEl.id}Btn" aria-haspopup="listbox" aria-expanded="false"></button>
      <div class="cc-pick__panel" hidden>
        <input class="cc-pick__search" type="text" autocomplete="off" spellcheck="false">
        <div class="cc-pick__tabs" role="tablist">
          <button type="button" role="tab" data-tab="fiat"></button>
          <button type="button" role="tab" data-tab="crypto"></button>
        </div>
        <div class="cc-pick__list" role="listbox"></div>
      </div>`;
    selectEl.insertAdjacentElement("afterend", root);

    const label = document.querySelector(`label[for="${selectEl.id}"]`);
    if (label) label.htmlFor = `${selectEl.id}Btn`;

    const btn = root.querySelector(".cc-pick__btn");
    const panel = root.querySelector(".cc-pick__panel");
    const search = root.querySelector(".cc-pick__search");
    const tabsEl = root.querySelector(".cc-pick__tabs");
    const list = root.querySelector(".cc-pick__list");
    const tabBtns = Array.from(tabsEl.querySelectorAll("button"));

    let tab = "fiat";
    let opts = [];
    let active = -1;

    function texts() {
      search.placeholder = t("currency.search_ph");
      search.setAttribute("aria-label", t("currency.search_ph"));
      tabBtns[0].textContent = t("currency.tab_fiat");
      tabBtns[1].textContent = t("currency.tab_crypto");
    }

    function sync() {
      const code = selectEl.value;
      if (!code) { btn.innerHTML = ""; return; }
      btn.innerHTML = `${iconHtml(code)}<span class="cc-pick__code">${esc(code)}</span>` +
        `<span class="cc-pick__name">${esc(currencyName(code))}</span>` +
        `<svg class="cc-pick__chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }

    const sortByName = (a, b) => currencyName(a).localeCompare(currencyName(b), locale());

    function groupsFor(q) {
      const fiatCodes = Object.keys(fiat).filter(isAvailable);
      const cryptoCodes = CRYPTO.map((c) => c.code).filter((c) => crypto[c]);

      if (q) {
        const all = [...fiatCodes, ...cryptoCodes].filter(
          (c) => c.toLowerCase().includes(q) || currencyName(c).toLowerCase().includes(q)
        );
        return [{ label: "", codes: all.sort(sortByName) }];
      }

      if (tab === "crypto") {
        return [{ label: "", codes: cryptoCodes }];
      }

      const popular = POPULAR.filter((c) => fiat[c] && isAvailable(c));
      const special = Object.keys(SPECIAL).filter((c) => fiat[c] && isAvailable(c));
      const rest = fiatCodes.filter((c) => !POPULAR.includes(c) && !SPECIAL[c]).sort(sortByName);
      return [
        { label: t("currency.group_popular"), codes: popular },
        { label: t("currency.group_all"), codes: rest },
        { label: t("currency.group_metals"), codes: special }
      ].filter((g) => g.codes.length);
    }

    function renderList() {
      const q = search.value.trim().toLowerCase();
      tabsEl.hidden = !!q;
      tabBtns.forEach((b) => {
        const on = b.dataset.tab === tab;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });

      const groups = groupsFor(q);
      let html = "";
      for (const g of groups) {
        if (g.label) html += `<div class="cc-pick__group">${esc(g.label)}</div>`;
        for (const code of g.codes) {
          html += `<div class="cc-opt${code === selectEl.value ? " is-selected" : ""}" role="option" data-code="${esc(code)}" aria-selected="${code === selectEl.value}">` +
            `${iconHtml(code)}<span class="cc-opt__code">${esc(code)}</span><span class="cc-opt__name">${esc(currencyName(code))}</span></div>`;
        }
      }

      if (!html) {
        const msg = !q && tab === "crypto" ? t("currency.crypto_unavailable") : t("currency.no_results");
        html = `<div class="cc-pick__empty">${esc(msg)}</div>`;
      }

      list.innerHTML = html;
      opts = Array.from(list.querySelectorAll(".cc-opt"));
      setActive(opts.findIndex((o) => o.classList.contains("is-selected")), true);
    }

    function setActive(i, scroll) {
      if (active >= 0 && opts[active]) opts[active].classList.remove("is-active");
      active = opts.length ? Math.max(0, Math.min(i, opts.length - 1)) : -1;
      if (i < 0 && opts.length) active = 0;
      if (active >= 0 && opts[active]) {
        opts[active].classList.add("is-active");
        if (scroll) opts[active].scrollIntoView({ block: "nearest" });
      }
    }

    function open() {
      closeAllPickers(api);
      texts();
      tab = isCrypto(selectEl.value) ? "crypto" : "fiat";
      search.value = "";
      panel.hidden = false;
      root.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      renderList();
      search.focus({ preventScroll: true });
    }

    function close(returnFocus) {
      if (panel.hidden) return;
      panel.hidden = true;
      root.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      if (returnFocus) btn.focus({ preventScroll: true });
    }

    function pick(code) {
      if (!code) return;
      const changed = selectEl.value !== code;
      selectEl.value = code;
      sync();
      close(true);
      if (changed) selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    }

    btn.addEventListener("click", () => (panel.hidden ? open() : close()));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (panel.hidden) open();
      }
    });

    search.addEventListener("input", renderList);

    tabBtns.forEach((b) =>
      b.addEventListener("click", () => {
        tab = b.dataset.tab;
        renderList();
        search.focus({ preventScroll: true });
      })
    );

    list.addEventListener("click", (e) => {
      const o = e.target.closest(".cc-opt");
      if (o) pick(o.dataset.code);
    });

    list.addEventListener("mousemove", (e) => {
      const o = e.target.closest(".cc-opt");
      if (!o) return;
      const i = opts.indexOf(o);
      if (i !== active) setActive(i, false);
    });

    panel.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation(); // щоб глобальний Enter не запускав розрахунок
        if (active >= 0 && opts[active]) pick(opts[active].dataset.code);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive(active + 1, true);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive(active - 1, true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        close(true);
      } else if (e.key === "Tab") {
        close();
      }
    });

    const api = { root, sync, close, rebuild: () => { texts(); sync(); } };
    pickers.push(api);
    texts();
    sync();
    return api;
  }

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".cc-pick")) closeAllPickers();
  });

  let fromPicker = null;
  let toPicker = null;

  function syncPickers() {
    fromPicker?.sync();
    toPicker?.sync();
  }

  // =====================================================
  // Дані
  // =====================================================
  function fillSelects() {
    const prevFrom = fromEl?.value;
    const prevTo = toEl?.value;

    const codes = [
      ...Object.keys(fiat).filter(isAvailable).sort((a, b) => a.localeCompare(b)),
      ...CRYPTO.map((c) => c.code).filter((c) => crypto[c])
    ];

    for (const el of [fromEl, toEl]) {
      if (!el) continue;
      el.innerHTML = "";
      for (const code of codes) {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = `${code} — ${currencyName(code)}`;
        el.appendChild(opt);
      }
    }

    if (fromEl) fromEl.value = codes.includes(prevFrom) ? prevFrom : (codes.includes("USD") ? "USD" : "UAH");
    if (toEl) toEl.value = codes.includes(prevTo) ? prevTo : "UAH";

    if (!fromPicker) fromPicker = createPicker(fromEl, { align: "start" });
    if (!toPicker) toPicker = createPicker(toEl, { align: "end" });
    syncPickers();
  }

  function setRateDateBadge() {
    if (!rateDateEl) return;
    if (source !== "nbu" && bankUpdated[source]) {
      rateDateEl.textContent = t(`currency.badge_${source}`, { date: bankUpdated[source] });
      return;
    }
    rateDateEl.textContent = lastRateDate ? t("currency.nbu_badge", { date: lastRateDate }) : "";
  }

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data === "object" ? data : null;
    } catch {
      return null;
    }
  }

  function writeJson(key, payload) {
    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {}
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
    const cache = readJson(CACHE_KEY);

    // 1) fresh cache
    if (cache?.rates && cache.ts && (Date.now() - cache.ts) < CACHE_TTL_MS) {
      fiat = cache.rates;
      lastRateDate = cache.lastRateDate || "";
      return true;
    }

    // 2) fetch from NBU
    try {
      const res = await fetch(NBU_URL, { cache: "no-store" });
      if (!res.ok) throw new Error("NBU not ok");
      const data = await res.json();

      fiat = normalizeRates(data);
      writeJson(CACHE_KEY, { ts: Date.now(), rates: fiat, lastRateDate });
      return true;
    } catch {
      // 3) fallback to old cache
      if (cache?.rates) {
        fiat = cache.rates;
        lastRateDate = cache.lastRateDate || "";
        setToast(t("currency.nbu_unavailable_cached"));
        return true;
      }

      setToast(t("currency.nbu_failed"));
      return false;
    }
  }

  async function loadCrypto() {
    const cache = readJson(CRYPTO_CACHE_KEY);

    if (cache?.rates && cache.ts && (Date.now() - cache.ts) < CRYPTO_TTL_MS) {
      crypto = cache.rates;
      cryptoTs = cache.ts;
      return true;
    }

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const ids = CRYPTO.map((c) => c.id).join(",");
      const res = await fetch(`${CG_URL}?ids=${ids}&vs_currencies=uah`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error("CG not ok");
      const data = await res.json();

      const map = {};
      for (const c of CRYPTO) {
        const v = Number(data?.[c.id]?.uah);
        if (Number.isFinite(v) && v > 0) map[c.code] = { rate: v };
      }
      if (!Object.keys(map).length) throw new Error("CG empty");

      crypto = map;
      cryptoTs = Date.now();
      writeJson(CRYPTO_CACHE_KEY, { ts: cryptoTs, rates: map });
      return true;
    } catch {
      if (cache?.rates) {
        crypto = cache.rates;
        cryptoTs = cache.ts || 0;
        setToast(t("currency.crypto_unavailable_cached"));
        return true;
      }
      crypto = {};
      return false;
    }
  }

  // monobank: реальні купівля/продаж є лише для USD (840) та EUR (978)
  async function fetchMono() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(MONO_URL, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error("mono not ok");
    const data = await res.json();

    const rates = {};
    let newest = 0;
    for (const [num, code] of [[840, "USD"], [978, "EUR"]]) {
      const row = Array.isArray(data) ? data.find((x) => x.currencyCodeA === num && x.currencyCodeB === 980) : null;
      const buy = Number(row?.rateBuy);
      const sell = Number(row?.rateSell);
      if (buy > 0 && sell > 0) {
        rates[code] = { buy, sell };
        newest = Math.max(newest, Number(row.date) || 0);
      }
    }
    if (!Object.keys(rates).length) throw new Error("mono empty");

    const updated = newest
      ? new Date(newest * 1000).toLocaleString(locale(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
      : "";
    return { rates, updated };
  }

  // Мінфін (середній курс банків / міжбанк) — через власне проксі
  async function fetchMinfin(id) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(`${MINFIN_URL}?type=${id}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error("minfin not ok");
    const data = await res.json();
    if (!data?.rates || !Object.keys(data.rates).length) throw new Error("minfin empty");
    return { rates: data.rates, updated: data.updatedText || "" };
  }

  async function loadBank(id) {
    const key = BANK_CACHE_KEY + id;
    const ttl = id === "mono" ? MONO_TTL_MS : MINFIN_TTL_MS;
    const cache = readJson(key);

    if (cache?.rates && cache.ts && (Date.now() - cache.ts) < ttl) {
      bank[id] = cache.rates;
      bankUpdated[id] = cache.updated || "";
      return true;
    }

    try {
      const { rates, updated } = id === "mono" ? await fetchMono() : await fetchMinfin(id);
      bank[id] = rates;
      bankUpdated[id] = updated;
      writeJson(key, { ts: Date.now(), rates, updated });
      return true;
    } catch {
      if (cache?.rates) {
        bank[id] = cache.rates;
        bankUpdated[id] = cache.updated || "";
        return true;
      }
      return false;
    }
  }

  // =====================================================
  // Розрахунок
  // =====================================================
  function convert({ silent = false } = {}) {
    const amount = n(amountEl?.value);
    const from = fromEl?.value;
    const to = toEl?.value;

    if (!Number.isFinite(amount) || (amountEl?.value || "").trim() === "") {
      if (!silent) setToast(t("currency.err_amount"));
      return false;
    }

    const rateFrom = buyOf(from); // UAH, які отримуємо за 1 FROM
    const rateTo = sellOf(to);    // UAH, які платимо за 1 TO

    if (!rateFrom || !rateTo) {
      if (!silent) setToast(t("currency.err_currencies"));
      return false;
    }

    const out = (amount * rateFrom) / rateTo;
    const withCrypto = isCrypto(from) || isCrypto(to);
    const digits = withCrypto ? 8 : 6;
    // у звичайну валюту з крипти — 2 знаки (6 для сум менших за 1), у крипту — до 8
    const outDigits = isCrypto(to) ? 8 : (withCrypto ? (Math.abs(out) >= 1 ? 2 : 6) : 6);

    const line1 = t("currency.line_result", {
      a: fmt(amount, digits),
      from,
      b: fmt(out, outDigits),
      to
    });

    // для банківських валют підписуємо купівля/продаж, для решти — просто "Курс"
    const isBankLeg = (code) => source !== "nbu" && !!bank[source]?.[code];
    const fromLabel = isBankLeg(from) ? t("currency.rate_buy") : t("currency.rate");
    const toLabel = isBankLeg(to) ? t("currency.rate_sell") : t("currency.rate");

    let extra = `
      <div><b>${fromLabel}</b> 1 ${from} = ${fmt(rateFrom, digits)} UAH</div>
      <div><b>${toLabel}</b> 1 ${to} = ${fmt(rateTo, digits)} UAH</div>
      <div><b>${t("currency.formula")}</b> (${fmt(amount, digits)} × ${fmt(rateFrom, digits)}) / ${fmt(rateTo, digits)} = <b>${fmt(out, outDigits)}</b></div>
    `;

    if (source !== "nbu" && (isBankLeg(from) || isBankLeg(to))) {
      extra += `<div class="cconv-src">${esc(t(`currency.note_${source}`))}</div>`;
      if (source !== "mono") {
        // умови Мінфіну: використання даних — лише з гіперпосиланням на minfin.com.ua
        const link = `<a href="https://minfin.com.ua/" target="_blank" rel="noopener">Minfin.com.ua</a>`;
        extra += `<div class="cconv-src">${t("currency.src_minfin", { link })}</div>`;
      }
    }

    if (withCrypto && cryptoTs) {
      const time = new Date(cryptoTs).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
      extra += `<div class="cconv-src">${esc(t("currency.src_crypto", { time }))}</div>`;
    }

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
    if (fromEl && isAvailable("USD")) fromEl.value = "USD";
    else if (fromEl && isAvailable("UAH")) fromEl.value = "UAH";
    if (toEl && isAvailable("UAH")) toEl.value = "UAH";
    syncPickers();
    setToast(t("currency.reset_done"));
    setResult(t("currency.hint_enter"), "");
    setTimeout(() => setToast(""), 1200);
  });

  btnSwap?.addEventListener("click", () => {
    if (!fromEl || !toEl) return;
    const a = fromEl.value;
    fromEl.value = toEl.value;
    toEl.value = a;
    syncPickers();
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

  // =====================================================
  // Перемикач джерела курсу (НБУ / monobank / середній / міжбанк)
  // =====================================================
  const sourceEl = $("rateSource");
  const sourceLabelEl = $("rateSourceLabel");

  const sourceName = (id) =>
    id === "nbu" ? t("currency.src_nbu") : id === "mono" ? "monobank" : t(`currency.src_${id}`);

  function renderSourceSwitch() {
    if (!sourceEl) return;
    if (sourceLabelEl) sourceLabelEl.textContent = t("currency.rate_label");
    sourceEl.innerHTML = "";
    for (const id of ["nbu", ...BANK_SOURCES]) {
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.src = id;
      b.textContent = sourceName(id);
      const hint = t(`currency.hint_${id}`);
      if (hint && !hint.startsWith("currency.")) b.title = hint;
      b.setAttribute("aria-pressed", id === source ? "true" : "false");
      b.classList.toggle("is-active", id === source);
      sourceEl.appendChild(b);
    }
  }

  let switching = false;

  async function setSource(id) {
    if (id === source || switching) return;
    switching = true;

    try {
      if (id !== "nbu" && !Object.keys(bank[id]).length) {
        setToast(t("currency.src_loading", { src: sourceName(id) }));
        const ok = await loadBank(id);
        if (!ok) {
          setToast(t("currency.src_failed", { src: sourceName(id) }));
          return;
        }
      }

      const prevFrom = fromEl?.value;
      const prevTo = toEl?.value;

      source = id;
      try { localStorage.setItem(SOURCE_KEY, id); } catch {}

      renderSourceSwitch();
      fillSelects();
      setRateDateBadge();

      if ((amountEl?.value || "").trim() && isAutoOn()) convert({ silent: true });
      else setResult(t("currency.hint_enter"), "");

      const changed = fromEl?.value !== prevFrom || toEl?.value !== prevTo;
      if (changed) {
        const list = ["UAH", ...Object.keys(bank[id] || {})].join(", ");
        setToast(t("currency.src_limited", { src: sourceName(id), list }));
      } else {
        setToast("");
      }
    } finally {
      switching = false;
    }
  }

  sourceEl?.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-src]");
    if (b) setSource(b.dataset.src);
  });

  // init
  (async () => {
    setResult(t("currency.loading"), "");

    let saved = "";
    try { saved = localStorage.getItem(SOURCE_KEY) || ""; } catch {}

    const [ok] = await Promise.all([loadRates(), loadCrypto()]);
    if (!ok) return;

    if (BANK_SOURCES.includes(saved) && (await loadBank(saved))) source = saved;

    renderSourceSwitch();
    fillSelects();
    setRateDateBadge();

    if ((amountEl?.value || "").trim() && isAutoOn()) scheduleAuto();
    else setResult(t("currency.hint_enter"), "");
  })();
})();
