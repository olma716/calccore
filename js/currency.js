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

  // =====================================================
  // Блок курсів і графік динаміки (графік — лише НБУ)
  // =====================================================
  const BOARD_CODES = ["USD", "EUR", "GBP", "PLN", "CHF", "CZK", "CAD"];
  const HIST_URL = "/api/nbu-history"; // проксі: діапазонний ендпоїнт НБУ не віддає CORS
  const HIST_CACHE_KEY = "cc_nbu_hist_v1_";
  const HIST_TTL_MS = 6 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const PERIODS = [7, 30, 90, 365];
  const CRYPTO_HIST_URL = "/api/crypto-history"; // проксі до CoinGecko (ціни в UAH)
  const CRYPTO_HIST_CACHE_KEY = "cc_crypto_hist_v1_";
  const CRYPTO_CHART_CODES = ["BTC", "ETH", "BNB", "SOL", "XRP", "TON"];

  const boardTableEl = $("boardTable");
  const boardSrcEl = $("boardSrc");

  const rateFmt = (x) =>
    x >= 1000
      ? x.toLocaleString(locale(), { maximumFractionDigits: 0 })
      : x.toLocaleString(locale(), { minimumFractionDigits: 2, maximumFractionDigits: x < 10 ? 3 : 2 });
  const signed = (x, d) =>
    (x > 0 ? "+" : "") + x.toLocaleString(locale(), { minimumFractionDigits: Math.min(2, d), maximumFractionDigits: d });

  function renderBoard() {
    if (!boardTableEl) return;
    const ids = ["nbu", ...BANK_SOURCES];

    const cell = (id, code) => {
      if (id === "nbu") {
        const r = fiat[code]?.rate;
        return r ? rateFmt(r) : "";
      }
      const q = bank[id]?.[code];
      return q?.buy && q?.sell ? `${rateFmt(q.buy)} / ${rateFmt(q.sell)}` : "";
    };

    const head = `<thead><tr><th scope="col">${esc(t("currency.board_cur"))}</th>${ids
      .map((id) => `<th scope="col">${esc(sourceName(id))}</th>`)
      .join("")}</tr></thead>`;

    const rows = BOARD_CODES.map((code) => {
      const tds = ids
        .map((id) => {
          const v = cell(id, code);
          return v ? `<td>${v}</td>` : '<td class="cb-na">—</td>';
        })
        .join("");
      return `<tr><th scope="row"><span class="cb-cur">${iconHtml(code).replace('loading="lazy"', 'loading="eager"')}<span>${code}</span></span></th>${tds}</tr>`;
    }).join("");

    boardTableEl.innerHTML = head + `<tbody>${rows}</tbody>`;

    if (boardSrcEl) {
      const link = '<a href="https://minfin.com.ua/" target="_blank" rel="noopener">Minfin.com.ua</a>';
      boardSrcEl.innerHTML = t("currency.board_src", { link });
    }
  }

  // ---- історія курсу НБУ (одним запитом на рік) ----
  const histMem = {};

  async function loadHistory(code) {
    if (histMem[code]) return histMem[code];

    const key = HIST_CACHE_KEY + code;
    const cache = readJson(key);
    if (cache?.pts?.length && cache.ts && Date.now() - cache.ts < HIST_TTL_MS) {
      return (histMem[code] = cache.pts);
    }

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(`${HIST_URL}?code=${code}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error("hist not ok");
      const data = await res.json();

      const pts = (Array.isArray(data?.pts) ? data.pts : [])
        .map((pt) => [Number(pt[0]), Number(pt[1])])
        .filter((pt) => Number.isFinite(pt[0]) && pt[1] > 0)
        .sort((x, y) => x[0] - y[0]);
      if (pts.length < 2) throw new Error("hist empty");

      writeJson(key, { ts: Date.now(), pts });
      return (histMem[code] = pts);
    } catch {
      if (cache?.pts?.length) return (histMem[code] = cache.pts);
      return null;
    }
  }

  // ---- історія цін криптовалют (CoinGecko через проксі; окремий запит на кожен період) ----
  const cryptoHistMem = {};

  async function loadCryptoHistory(code, days) {
    const id = CRYPTO_META[code]?.id;
    if (!id) return null;

    const mem = `${code}_${days}`;
    const ttl = days <= 7 ? 10 * 60 * 1000 : days <= 30 ? 30 * 60 * 1000 : 60 * 60 * 1000;
    if (cryptoHistMem[mem] && Date.now() - cryptoHistMem[mem].ts < ttl) return cryptoHistMem[mem].pts;

    const key = CRYPTO_HIST_CACHE_KEY + mem;
    const cache = readJson(key);
    if (cache?.pts?.length && cache.ts && Date.now() - cache.ts < ttl) {
      cryptoHistMem[mem] = cache;
      return cache.pts;
    }

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(`${CRYPTO_HIST_URL}?id=${id}&days=${days}`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error("crypto hist not ok");
      const data = await res.json();

      const pts = (Array.isArray(data?.pts) ? data.pts : [])
        .map((pt) => [Number(pt[0]), Number(pt[1])])
        .filter((pt) => Number.isFinite(pt[0]) && pt[1] > 0);
      if (pts.length < 2) throw new Error("crypto hist empty");

      const entry = { ts: Date.now(), pts };
      writeJson(key, entry);
      cryptoHistMem[mem] = entry;
      return pts;
    } catch {
      if (cache?.pts?.length) return cache.pts;
      return null;
    }
  }

  // ---- графік (SVG без бібліотек): спільний для НБУ і криптовалют ----
  // o: { curEl, perEl, statsEl, boxEl, noteEl, codes, load(code, days), noteHtml(code), reloadOnPeriod, intraday }
  function createChart(o) {
    if (!o.boxEl) return null;

    let code = o.codes[0];
    let days = 30;
    let pts = null;
    let seq = 0;
    let width = 0;

    function renderControls() {
      if (o.curEl) {
        o.curEl.innerHTML = "";
        for (const c of o.codes) {
          const b = document.createElement("button");
          b.type = "button";
          b.dataset.cur = c;
          b.innerHTML = iconHtml(c).replace('loading="lazy"', 'loading="eager"') + `<span>${esc(c)}</span>`;
          b.setAttribute("aria-pressed", c === code ? "true" : "false");
          b.classList.toggle("is-active", c === code);
          o.curEl.appendChild(b);
        }
      }
      if (o.perEl) {
        o.perEl.innerHTML = "";
        for (const d of PERIODS) {
          const b = document.createElement("button");
          b.type = "button";
          b.dataset.days = String(d);
          b.textContent = t(`currency.per_${d}`);
          b.setAttribute("aria-pressed", d === days ? "true" : "false");
          b.classList.toggle("is-active", d === days);
          o.perEl.appendChild(b);
        }
      }
      if (o.noteEl) o.noteEl.innerHTML = o.noteHtml(code);
    }

    function message(text) {
      o.boxEl.innerHTML = `<div class="cb-msg">${esc(text)}</div>`;
      if (o.statsEl) o.statsEl.innerHTML = "";
    }

    async function update() {
      const mySeq = ++seq;
      message(t("currency.chart_loading"));

      const loaded = await o.load(code, days);
      if (mySeq !== seq) return;

      if (!loaded) {
        pts = null;
        message(t("currency.chart_failed"));
        return;
      }
      pts = loaded;
      draw();
    }

    function draw() {
      if (!pts) return;

      const lastT = pts[pts.length - 1][0];
      const view = pts.filter((pt) => pt[0] >= lastT - days * DAY_MS);
      if (view.length < 2) {
        message(t("currency.chart_failed"));
        return;
      }

      const first = view[0][1];
      const now = view[view.length - 1][1];
      let min = Infinity;
      let max = -Infinity;
      for (const pt of view) {
        if (pt[1] < min) min = pt[1];
        if (pt[1] > max) max = pt[1];
      }
      const diff = now - first;
      const pct = (diff / first) * 100;
      const dd = now >= 1000 ? 0 : now >= 10 ? 2 : 3;

      if (o.statsEl) {
        const tile = (label, value, sub = "") =>
          `<div class="cb-stat"><span>${esc(label)}</span><b>${esc(value)}</b>${sub ? `<em>${esc(sub)}</em>` : ""}</div>`;
        o.statsEl.innerHTML =
          tile(t("currency.chart_now"), rateFmt(now)) +
          tile(t("currency.chart_change"), signed(diff, dd), signed(pct, 2) + "%") +
          tile(t("currency.chart_min"), rateFmt(min)) +
          tile(t("currency.chart_max"), rateFmt(max));
      }

      const W = Math.max(260, Math.floor(o.boxEl.clientWidth));
      width = W;
      const H = W < 520 ? 220 : 280;
      const padL = max >= 1000 ? 74 : 52, padR = 12, padT = 12, padB = 26;
      const innerW = W - padL - padR;
      const innerH = H - padT - padB;

      const span = max - min || max * 0.01;
      const lo = min - span * 0.1;
      const hi = max + span * 0.1;
      const t0 = view[0][0];
      const t1 = view[view.length - 1][0];

      const xOf = (ts) => padL + ((ts - t0) / (t1 - t0 || 1)) * innerW;
      const yOf = (v) => padT + (1 - (v - lo) / (hi - lo)) * innerH;

      const line = view.map((pt, i) => `${i ? "L" : "M"}${xOf(pt[0]).toFixed(1)},${yOf(pt[1]).toFixed(1)}`).join("");
      const area = `${line}L${xOf(t1).toFixed(1)},${padT + innerH}L${xOf(t0).toFixed(1)},${padT + innerH}Z`;

      let grid = "";
      for (let i = 0; i <= 4; i++) {
        const v = lo + ((hi - lo) * i) / 4;
        const y = yOf(v).toFixed(1);
        grid += `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" class="cb-grid"/>` +
          `<text x="${padL - 8}" y="${y}" class="cb-ax" text-anchor="end" dominant-baseline="middle">${esc(rateFmt(v))}</text>`;
      }

      const dateOpts = days >= 365 ? { month: "short", year: "2-digit" } : { day: "2-digit", month: "2-digit" };
      const xTicks = W < 420 ? 3 : 5;
      for (let i = 0; i < xTicks; i++) {
        const ts = t0 + ((t1 - t0) * i) / (xTicks - 1);
        const anchor = i === 0 ? "start" : i === xTicks - 1 ? "end" : "middle";
        const label = new Date(ts).toLocaleDateString(locale(), dateOpts);
        grid += `<text x="${xOf(ts).toFixed(1)}" y="${H - 8}" class="cb-ax" text-anchor="${anchor}">${esc(label)}</text>`;
      }

      o.boxEl.innerHTML =
        `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(t("currency.chart_aria", { cur: code }))}">` +
        grid +
        `<path d="${area}" class="cb-area"/><path d="${line}" class="cb-line"/>` +
        `<line class="cb-cross" y1="${padT}" y2="${padT + innerH}" x1="0" x2="0" visibility="hidden"/>` +
        `<circle class="cb-dot" r="4.5" cx="0" cy="0" visibility="hidden"/>` +
        `</svg><div class="cb-tip" hidden></div>`;

      const svg = o.boxEl.querySelector("svg");
      const cross = svg.querySelector(".cb-cross");
      const dot = svg.querySelector(".cb-dot");
      const tip = o.boxEl.querySelector(".cb-tip");

      // для погодинних даних (7–90 днів) у підказці показуємо ще й час
      const tipOpts = o.intraday && days <= 90
        ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
        : { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" };

      function hide() {
        cross.setAttribute("visibility", "hidden");
        dot.setAttribute("visibility", "hidden");
        tip.hidden = true;
      }

      function show(ev) {
        const rect = svg.getBoundingClientRect();
        const px = ((ev.clientX - rect.left) / rect.width) * W;
        const ts = t0 + ((px - padL) / innerW) * (t1 - t0);

        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < view.length; i++) {
          const d = Math.abs(view[i][0] - ts);
          if (d < bestD) { bestD = d; best = i; }
        }

        const x = xOf(view[best][0]);
        const y = yOf(view[best][1]);
        cross.setAttribute("x1", x);
        cross.setAttribute("x2", x);
        cross.setAttribute("visibility", "visible");
        dot.setAttribute("cx", x);
        dot.setAttribute("cy", y);
        dot.setAttribute("visibility", "visible");

        const date = new Date(view[best][0]).toLocaleString(locale(), tipOpts);
        tip.innerHTML = `<span>${esc(date)}</span><b>${esc(rateFmt(view[best][1]))} UAH</b>`;
        tip.hidden = false;

        const tw = tip.offsetWidth;
        tip.style.left = Math.min(Math.max(x - tw / 2, 0), W - tw) + "px";
        tip.style.top = Math.max(y - tip.offsetHeight - 12, 0) + "px";
      }

      svg.addEventListener("pointermove", show);
      svg.addEventListener("pointerdown", show);
      svg.addEventListener("pointerleave", hide);
      svg.addEventListener("pointercancel", hide);
    }

    o.curEl?.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-cur]");
      if (!b || b.dataset.cur === code) return;
      code = b.dataset.cur;
      renderControls();
      update();
    });

    o.perEl?.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-days]");
      if (!b || Number(b.dataset.days) === days) return;
      days = Number(b.dataset.days);
      renderControls();
      if (o.reloadOnPeriod) update();
      else draw();
    });

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => {
        const w = Math.floor(o.boxEl.clientWidth);
        if (w && w !== width && pts) draw();
      }).observe(o.boxEl);
    }

    return { init() { renderControls(); update(); } };
  }

  function initBoard() {
    renderBoard();
    Promise.all(BANK_SOURCES.map((id) => loadBank(id))).then(renderBoard);

    createChart({
      curEl: $("chartCur"),
      perEl: $("chartPer"),
      statsEl: $("chartStats"),
      boxEl: $("chartBox"),
      noteEl: $("chartNote"),
      codes: BOARD_CODES,
      load: (code) => loadHistory(code),
      noteHtml: (code) => esc(t("currency.chart_note", { cur: code }))
    })?.init();

    createChart({
      curEl: $("cryptoCur"),
      perEl: $("cryptoPer"),
      statsEl: $("cryptoStats"),
      boxEl: $("cryptoBox"),
      noteEl: $("cryptoNote"),
      codes: CRYPTO_CHART_CODES,
      load: loadCryptoHistory,
      reloadOnPeriod: true,
      intraday: true,
      noteHtml: (code) => {
        const link = '<a href="https://www.coingecko.com/" target="_blank" rel="noopener">CoinGecko</a>';
        return t("currency.crypto_note", { cur: code, link });
      }
    })?.init();
  }

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
    initBoard();

    if ((amountEl?.value || "").trim() && isAutoOn()) scheduleAuto();
    else setResult(t("currency.hint_enter"), "");
  })();
})();
