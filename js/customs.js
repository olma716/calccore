/* customs.js — i18n-ready
   + Таблиця результатів: UAH / EUR / USD
   + Дефолти: мито 10%, ПДВ 20% (і після reset)
   + EV: мито 0% якщо поле порожнє або було 10
   + Автопідтягування курсів НБУ (USD/EUR) (без полів у формі)
   + Вивід курсу НБУ у правому верхньому куті
   + Якщо ціна авто порожня — у результаті "—" (не рахуємо 0)
   + ICE акциз: автоматичні ставки для великих обʼємів
   + EV (варіант A): ставка акцизу фіксована 1€/кВт·год (поле прибрано)
*/
(() => {
  // ========= i18n =========
  const t = (key, vars) => (window.t ? window.t(key, vars) : key);
  const locale = () => (window.i18nLocale ? window.i18nLocale() : "uk-UA");

  // ========= 1) НБУ курси =========
  async function fetchNbuRates() {
    const url = "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("NBU request failed");
    const data = await res.json();

    const usd = data.find((x) => x.cc === "USD");
    const eur = data.find((x) => x.cc === "EUR");

    return {
      usd: usd?.rate,
      eur: eur?.rate,
      date: usd?.exchangedate || eur?.exchangedate || null
    };
  }

  // ========= 2) Root + elements =========
  const root = document.getElementById("ccalc");
  if (!root) return;

  const $ = (key) => root.querySelector(`[data-cc="${key}"]`);
  const $$ = (sel) => Array.from(root.querySelectorAll(sel));

  const state = {
    mode: "ICE",
    rates: { eur: null, usd: null, date: null }
  };

  const els = {
    modeBadge: $("modeBadge"),
    ageBadge: $("ageBadge"),
    ratesBadge: $("ratesBadge"),

    currency: $("currency"),
    year: $("year"),
    price: $("price"),
    shipping: $("shipping"),

    fuelType: $("fuelType"),
    engineCC: $("engineCC"),

    batteryKwh: $("batteryKwh"),

    dutyRate: $("dutyRate"),
    vatRate: $("vatRate"),

    includePension: $("includePension"),
    pensionBlock: $("pensionBlock"),
    pensionT1: $("pensionT1"),
    pensionT2: $("pensionT2"),

    iceBlock: $("iceBlock"),
    evBlock: $("evBlock"),

    totalCustoms: $("totalCustoms"),
    subHint: $("subHint"),

    // UAH
    customsValue: $("customsValue"),
    duty: $("duty"),
    excise: $("excise"),
    vat: $("vat"),
    pensionRow: $("pensionRow"),
    pension: $("pension"),
    grandTotal: $("grandTotal"),

    // EUR / USD
    customsValueEur: $("customsValueEur"),
    customsValueUsd: $("customsValueUsd"),

    dutyEur: $("dutyEur"),
    dutyUsd: $("dutyUsd"),

    exciseEur: $("exciseEur"),
    exciseUsd: $("exciseUsd"),

    vatEur: $("vatEur"),
    vatUsd: $("vatUsd"),

    pensionEur: $("pensionEur"),
    pensionUsd: $("pensionUsd"),

    grandTotalEur: $("grandTotalEur"),
    grandTotalUsd: $("grandTotalUsd"),

    toast: $("toast"),
  };

  // ========= 3) Helpers =========
  function num(v, fallback = 0) {
    const n = Number(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : fallback;
  }

  function fmtUAH(v) {
    const n = Math.round(v);
    return n.toLocaleString(locale()) + " ₴";
  }

  function fmtMoney(v, cur) {
    const n = Math.round(v * 100) / 100;
    const s = n.toLocaleString(locale(), { maximumFractionDigits: 2 });
    if (cur === "EUR") return s + " €";
    if (cur === "USD") return s + " $";
    return s + " ₴";
  }

  function safeDiv(a, b) {
    const bb = Number(b);
    if (!Number.isFinite(bb) || bb === 0) return null;
    const aa = Number(a);
    if (!Number.isFinite(aa)) return null;
    return aa / bb;
  }

  function setCellMoneyOrDash(el, value, cur) {
    if (!el) return;
    el.textContent = value === null ? "—" : fmtMoney(value, cur);
  }

  function currentYear() {
    return new Date().getFullYear();
  }

  function toast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (els.toast.textContent = ""), 1800);
  }

  function getAge() {
    const yRaw = (els.year?.value || "").trim();
    if (yRaw === "") return null;

    const y = num(yRaw, NaN);
    if (!Number.isFinite(y)) return null;

    const age = currentYear() - y;
    return Math.max(0, age);
  }

  function updateRatesBadge() {
    if (!els.ratesBadge) return;
    const { usd, eur, date } = state.rates;
    if (Number.isFinite(usd) && Number.isFinite(eur)) {
      const d = date ? ` • ${date}` : "";
      els.ratesBadge.textContent =
        `Курс НБУ: USD ${usd.toFixed(4)} / EUR ${eur.toFixed(4)}${d}`;
    } else {
      els.ratesBadge.textContent = "Курс НБУ: —";
    }
  }

  function getRateToUAH(currency) {
    if (currency === "UAH") return 1;
    if (currency === "EUR") return Number.isFinite(state.rates.eur) ? state.rates.eur : null;
    if (currency === "USD") return Number.isFinite(state.rates.usd) ? state.rates.usd : null;
    return null;
  }

  // ========= 4) Mode =========
  function syncModeButtons(mode) {
    $$('.ccalc__toggleBtn[data-cc-action="setMode"]').forEach((b) => {
      b.classList.toggle("is-active", b.getAttribute("data-mode") === mode);
    });
  }

  function ensureDefaultsForICE() {
    if (els.dutyRate && (els.dutyRate.value || "").trim() === "") els.dutyRate.value = "10";
    if (els.vatRate && (els.vatRate.value || "").trim() === "") els.vatRate.value = "20";
  }

  function setMode(mode) {
    state.mode = mode;

    if (els.modeBadge) {
      els.modeBadge.textContent = mode === "EV" ? t("customs.mode_ev") : t("customs.mode_ice");
    }

    // EV: duty 0% if empty or was 10
    if (mode === "EV" && els.dutyRate) {
      const dr = (els.dutyRate.value || "").trim();
      if (dr === "" || dr === "10") els.dutyRate.value = "0";
    }

    // ICE defaults
    if (mode === "ICE") ensureDefaultsForICE();

    if (els.iceBlock) els.iceBlock.style.display = mode === "ICE" ? "" : "none";
    if (els.evBlock) els.evBlock.style.display = mode === "EV" ? "" : "none";

    syncModeButtons(mode);
    recalc();
  }

  // ========= 5) Calculations =========
  function calcExciseEUR(ageOrNull) {
    const age = ageOrNull === null ? 0 : ageOrNull;

    if (state.mode === "EV") {
      const kwh = num(els.batteryKwh?.value, 0);
      const EV_EXCISE_RATE = 1; // € / кВт·год (фіксована ставка)
      return kwh * EV_EXCISE_RATE;
    }

    const cc = num(els.engineCC?.value, 0);
    const fuel = els.fuelType?.value;

    // Автопідстановка ставки при великих обʼємах
    let base;
    if (fuel === "diesel") {
      base = cc > 3500 ? 150 : 75;
    } else {
      base = cc > 3000 ? 100 : 50;
    }

    return base * (cc / 1000) * age;
  }

  function calcPensionUAH(baseUAH) {
    const t1 = num(els.pensionT1?.value, 0);
    const t2 = num(els.pensionT2?.value, 0);
    let rate = 0.03;
    if (baseUAH > t2) rate = 0.05;
    else if (baseUAH > t1) rate = 0.04;
    return baseUAH * rate;
  }

  function setResultDashes() {
    const dash = "—";

    // UAH
    if (els.customsValue) els.customsValue.textContent = dash;
    if (els.duty) els.duty.textContent = dash;
    if (els.excise) els.excise.textContent = dash;
    if (els.vat) els.vat.textContent = dash;
    if (els.totalCustoms) els.totalCustoms.textContent = dash;
    if (els.pension) els.pension.textContent = dash;
    if (els.grandTotal) els.grandTotal.textContent = dash;
    if (els.subHint) els.subHint.textContent = "";

    // EUR / USD
    if (els.customsValueEur) els.customsValueEur.textContent = dash;
    if (els.customsValueUsd) els.customsValueUsd.textContent = dash;

    if (els.dutyEur) els.dutyEur.textContent = dash;
    if (els.dutyUsd) els.dutyUsd.textContent = dash;

    if (els.exciseEur) els.exciseEur.textContent = dash;
    if (els.exciseUsd) els.exciseUsd.textContent = dash;

    if (els.vatEur) els.vatEur.textContent = dash;
    if (els.vatUsd) els.vatUsd.textContent = dash;

    if (els.pensionEur) els.pensionEur.textContent = dash;
    if (els.pensionUsd) els.pensionUsd.textContent = dash;

    if (els.grandTotalEur) els.grandTotalEur.textContent = dash;
    if (els.grandTotalUsd) els.grandTotalUsd.textContent = dash;
  }

  function recalc() {
    if (!els.currency || !els.price) return;

    // if price empty => no calc
    if ((els.price.value || "").trim() === "") {
      if (els.ageBadge) els.ageBadge.textContent = t("customs.age_dash");
      setResultDashes();
      return;
    }

    const currency = els.currency.value;

    const price = num(els.price.value, 0);
    const shipping = num(els.shipping?.value, 0);
    const dutyRate = num(els.dutyRate?.value, 0) / 100;
    const vatRate = num(els.vatRate?.value, 0) / 100;

    const age = getAge();
    if (els.ageBadge) {
      els.ageBadge.textContent =
        age === null ? t("customs.age_dash") : t("customs.age_years", { age });
    }

    const customsValue = price + shipping;

    const toUAH = getRateToUAH(currency);
    if (toUAH === null) {
      // немає курсів — не можемо порахувати коректно
      setResultDashes();
      if (els.subHint) els.subHint.textContent = "Немає курсу НБУ для обраної валюти.";
      return;
    }

    const customsValueUAH = customsValue * toUAH;

    const dutyUAH = customsValueUAH * dutyRate;

    const exciseEUR = calcExciseEUR(age);
    const eurRate = state.rates.eur;
    const usdRate = state.rates.usd;

    const exciseUAH = exciseEUR * (Number.isFinite(eurRate) ? eurRate : 0);

    const vatUAH = (customsValueUAH + dutyUAH + exciseUAH) * vatRate;

    const totalCustomsUAH = dutyUAH + exciseUAH + vatUAH;

    const pensionOn = !!els.includePension?.checked;
    if (els.pensionBlock) els.pensionBlock.style.display = pensionOn ? "" : "none";
    if (els.pensionRow) els.pensionRow.style.display = pensionOn ? "" : "none";

    const pensionUAH = pensionOn ? calcPensionUAH(customsValueUAH) : 0;
    const grandUAH = totalCustomsUAH + pensionUAH;

    // output UAH
    if (els.customsValue) els.customsValue.textContent = fmtUAH(customsValueUAH);
    if (els.duty) els.duty.textContent = fmtUAH(dutyUAH);
    if (els.excise) els.excise.textContent = fmtUAH(exciseUAH);
    if (els.vat) els.vat.textContent = fmtUAH(vatUAH);

    if (els.totalCustoms) els.totalCustoms.textContent = fmtUAH(totalCustomsUAH);
    if (els.pension) els.pension.textContent = fmtUAH(pensionUAH);
    if (els.grandTotal) els.grandTotal.textContent = fmtUAH(grandUAH);

    // output EUR / USD
    const customsValueEUR = safeDiv(customsValueUAH, eurRate);
    const customsValueUSD = safeDiv(customsValueUAH, usdRate);

    const dutyEUR = safeDiv(dutyUAH, eurRate);
    const dutyUSD = safeDiv(dutyUAH, usdRate);

    const exciseEUR_out = safeDiv(exciseUAH, eurRate);
    const exciseUSD_out = safeDiv(exciseUAH, usdRate);

    const vatEUR = safeDiv(vatUAH, eurRate);
    const vatUSD = safeDiv(vatUAH, usdRate);

    const pensionEUR = safeDiv(pensionUAH, eurRate);
    const pensionUSD = safeDiv(pensionUAH, usdRate);

    const grandEUR = safeDiv(grandUAH, eurRate);
    const grandUSD = safeDiv(grandUAH, usdRate);

    setCellMoneyOrDash(els.customsValueEur, customsValueEUR, "EUR");
    setCellMoneyOrDash(els.customsValueUsd, customsValueUSD, "USD");

    setCellMoneyOrDash(els.dutyEur, dutyEUR, "EUR");
    setCellMoneyOrDash(els.dutyUsd, dutyUSD, "USD");

    setCellMoneyOrDash(els.exciseEur, exciseEUR_out, "EUR");
    setCellMoneyOrDash(els.exciseUsd, exciseUSD_out, "USD");

    setCellMoneyOrDash(els.vatEur, vatEUR, "EUR");
    setCellMoneyOrDash(els.vatUsd, vatUSD, "USD");

    if (pensionOn) {
      setCellMoneyOrDash(els.pensionEur, pensionEUR, "EUR");
      setCellMoneyOrDash(els.pensionUsd, pensionUSD, "USD");
    } else {
      if (els.pensionEur) els.pensionEur.textContent = "—";
      if (els.pensionUsd) els.pensionUsd.textContent = "—";
    }

    setCellMoneyOrDash(els.grandTotalEur, grandEUR, "EUR");
    setCellMoneyOrDash(els.grandTotalUsd, grandUSD, "USD");

    if (els.subHint) {
      els.subHint.textContent = t("customs.sub_hint", {
        customs_value_input: fmtMoney(customsValue, currency),
        customs_value_uah: fmtUAH(customsValueUAH),
        excise_eur: exciseEUR.toFixed(2),
      });
    }
  }

  // ========= 6) Reset / Share / URL =========
  function resetAll() {
    if (els.currency) els.currency.value = "EUR";

    if (els.year) els.year.value = "";
    if (els.price) els.price.value = "";
    if (els.shipping) els.shipping.value = "";

    if (els.fuelType) els.fuelType.value = "gasoline";
    if (els.engineCC) els.engineCC.value = "";

    if (els.batteryKwh) els.batteryKwh.value = "";

    if (els.dutyRate) els.dutyRate.value = "10";
    if (els.vatRate) els.vatRate.value = "20";

    if (els.includePension) els.includePension.checked = false;
    if (els.pensionT1) els.pensionT1.value = "";
    if (els.pensionT2) els.pensionT2.value = "";

    if (els.pensionBlock) els.pensionBlock.style.display = "none";
    if (els.pensionRow) els.pensionRow.style.display = "none";

    setMode("ICE");

    if (els.ageBadge) els.ageBadge.textContent = t("customs.age_dash");
    setResultDashes();

    // оновити курси і перерахувати
    fetchNbuRates()
      .then((rates) => {
        state.rates = {
          eur: Number.isFinite(rates.eur) ? rates.eur : null,
          usd: Number.isFinite(rates.usd) ? rates.usd : null,
          date: rates.date || null
        };
        updateRatesBadge();
        recalc();
      })
      .catch(() => {
        updateRatesBadge();
        recalc();
      });
  }

  function copyLink() {
    const params = new URLSearchParams();
    params.set("mode", state.mode);
    params.set("cur", els.currency?.value || "EUR");
    params.set("y", els.year?.value || "");
    params.set("p", els.price?.value || "");
    params.set("s", els.shipping?.value || "");
    params.set("ft", els.fuelType?.value || "gasoline");
    params.set("cc", els.engineCC?.value || "");
    params.set("kwh", els.batteryKwh?.value || "");
    params.set("d", els.dutyRate?.value || "");
    params.set("vat", els.vatRate?.value || "");
    params.set("pen", els.includePension?.checked ? "1" : "0");
    params.set("t1", els.pensionT1?.value || "");
    params.set("t2", els.pensionT2?.value || "");

    const url = `${location.origin}${location.pathname}?${params.toString()}`;

    navigator.clipboard?.writeText(url)
      .then(() => toast(t("customs.link_copied")))
      .catch(() => toast(t("customs.link_copy_failed")));
  }

  function loadFromUrl() {
    const q = new URLSearchParams(location.search);
    if (!q.size) return;

    const mode = q.get("mode");
    if (mode === "EV" || mode === "ICE") setMode(mode);

    const setIf = (el, key) => {
      const v = q.get(key);
      if (v !== null && el) el.value = v;
    };

    setIf(els.currency, "cur");
    setIf(els.year, "y");
    setIf(els.price, "p");
    setIf(els.shipping, "s");
    setIf(els.fuelType, "ft");
    setIf(els.engineCC, "cc");
    setIf(els.batteryKwh, "kwh");
    setIf(els.dutyRate, "d");
    setIf(els.vatRate, "vat");
    setIf(els.pensionT1, "t1");
    setIf(els.pensionT2, "t2");

    if (els.includePension) els.includePension.checked = q.get("pen") === "1";
    recalc();
  }

  // ========= 7) Events =========
  $$('.ccalc__toggleBtn[data-cc-action="setMode"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const mode = btn.getAttribute("data-mode");
      setMode(mode);
    });
  });

  [
    "currency", "year", "price", "shipping", "fuelType", "engineCC",
    "batteryKwh", "dutyRate", "vatRate",
    "includePension", "pensionT1", "pensionT2"
  ].forEach((k) => {
    const el = els[k];
    if (!el) return;
    el.addEventListener("input", recalc);
    el.addEventListener("change", recalc);
  });

  root.querySelector('[data-cc-action="reset"]')?.addEventListener("click", () => {
    resetAll();
    toast(t("customs.reset_done"));
  });

  root.querySelector('[data-cc-action="copyLink"]')?.addEventListener("click", copyLink);

  // ========= 8) Init =========
  document.addEventListener("DOMContentLoaded", async () => {
    if (els.dutyRate && (els.dutyRate.value || "").trim() === "") els.dutyRate.value = "10";
    if (els.vatRate && (els.vatRate.value || "").trim() === "") els.vatRate.value = "20";

    try {
      const rates = await fetchNbuRates();
      state.rates = {
        eur: Number.isFinite(rates.eur) ? rates.eur : null,
        usd: Number.isFinite(rates.usd) ? rates.usd : null,
        date: rates.date || null
      };
    } catch (e) {
      console.warn("NBU fetch failed:", e);
      state.rates = { eur: null, usd: null, date: null };
    }

    updateRatesBadge();
    setMode("ICE");
    loadFromUrl();
    recalc();
  });
})();
