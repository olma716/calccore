/* customs.js — калькулятор розмитнення (i18n-ready)
   - категорії: легкові / вантажні / мото / автобуси; двигун: бензин / дизель / електро / гібрид
   - регіон: Європа / США / Інше (мито 0% для авто європейського походження за сертифікатом)
   - вбудовані ставки акцизу для легкових (бензин, дизель, електро), решта — ставка вручну
   - збір до ПФ (3 / 4 / 5% за прожитковим мінімумом; лише легкові, не електро), додаткові витрати в Україні
   - загальна вартість «авто в Україні», діаграма розбивки платежів, порівняння двох варіантів
   - курс НБУ: сьогодні / на дату / власний (USD, EUR); 12 валют ціни
   - групування тисяч при вводі, кнопка «Приклад»
*/
(() => {
  // ========= i18n =========
  const t = (key, vars) => (window.t ? window.t(key, vars) : key);
  const locale = () => (window.i18nLocale ? window.i18nLocale() : "uk-UA");
  const IS_EN = !String(locale()).toLowerCase().startsWith("uk");

  const CURRENCIES = ["EUR", "USD", "UAH", "GBP", "CHF", "PLN", "CZK", "HUF", "RON", "CAD", "AUD", "TRY"];
  const CUR_FLAG = { UAH: "ua", USD: "us", EUR: "eu", GBP: "gb", CHF: "ch", PLN: "pl", CZK: "cz", HUF: "hu", RON: "ro", CAD: "ca", AUD: "au", TRY: "tr" };

  // ========= 1) Курси НБУ (на сьогодні або на дату) =========
  async function fetchNbuRates(dateYmd) {
    const url =
      "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?" + (dateYmd ? `date=${dateYmd}&` : "") + "json";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("NBU request failed");
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) throw new Error("NBU: no data for date");

    const map = {};
    data.forEach((x) => {
      if (CURRENCIES.includes(x.cc) && Number(x.rate) > 0) map[x.cc] = Number(x.rate);
    });
    const any = data.find((x) => x.cc === "USD") || data.find((x) => x.cc === "EUR") || data[0];
    return { map, date: any?.exchangedate || null };
  }

  // ========= 2) Root + elements =========
  const root = document.getElementById("ccalc");
  if (!root) return;

  const $ = (key) => root.querySelector(`[data-cc="${key}"]`);
  const $$ = (sel) => Array.from(root.querySelectorAll(sel));

  const CATS = ["car", "truck", "moto", "bus"];
  // які типи двигуна доступні в кожній категорії
  const ENGINES = {
    car: ["gasoline", "diesel", "electric", "hybrid"],
    truck: ["diesel", "gasoline", "electric", "hybrid"],
    moto: ["gasoline", "electric"],
    bus: ["diesel", "gasoline", "electric", "hybrid"]
  };
  const REGIONS = ["eu", "us", "other"];

  const state = {
    category: "car",
    engine: "gasoline",
    region: "eu",
    mode: "ICE",
    rates: {}, // грн за 1 одиницю валюти (НБУ)
    ratesDate: null,
    saved: null // збережений варіант A для порівняння
  };

  const els = {};
  [
    "modeBadge", "ageBadge", "ratesBadge", "currency", "curFlag", "curBtn", "curCode", "curList", "year", "yearBtn", "yearLabel", "yearList", "price", "shipping",
    "usBlock", "auctionFee", "usInland", "seaFreight",
    "iceBlock", "engineCC", "evBlock", "batteryKwh", "manualBlock", "exciseRate", "ageCoef",
    "euBlock", "euOrigin", "dutyRate", "vatRate",
    "includePension", "pensionBlock", "subMin", "pensionHint",
    "extrasDetails", "broker", "registration", "osago", "domestic",
    "yearReq", "curHead", "rateNote", "ratesDetails", "ratesSummary", "rateDetails", "rateDate", "rateUsd", "rateEur",
    "totalCustoms", "subHint", "landedTotal", "landedSub", "splitBar", "splitLegend", "splitNote",
    "pensionRow", "extrasRow",
    "cmpPanel", "cmpDescA", "cmpDescB", "cmpCustomsA", "cmpCustomsB", "cmpCustomsD", "cmpLandedA", "cmpLandedB", "cmpLandedD",
    "toast"
  ].forEach((k) => (els[k] = $(k)));

  // рядки таблиці: UAH / EUR / USD
  const ROWS = ["customsValue", "duty", "excise", "vat", "pension", "grandTotal", "extras", "landed"];
  ROWS.forEach((r) => {
    els[r] = $(r);
    els[r + "Cur"] = $(r + "Cur");
  });

  const MONEY_FIELDS = ["price", "shipping", "auctionFee", "usInland", "seaFreight", "broker", "registration", "osago", "domestic"];

  // ========= 3) Helpers =========
  // англійською кома — роздільник тисяч, українською — десятковий роздільник
  const NUM_CHARS = IS_EN ? /[\d.]/ : /[\d.,]/;
  const NON_NUM_CHARS = IS_EN ? /[^\d.]/g : /[^\d.,]/g;

  function num(v, fallback = 0) {
    const raw = String(v ?? "").replace(/\s+/g, "");
    const s = IS_EN ? raw.replace(/,/g, "") : raw.replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }

  const val = (k) => num(els[k]?.value, 0);
  const isBlank = (k) => (els[k]?.value || "").trim() === "";

  function groupNumber(raw) {
    const s = String(raw ?? "").replace(NON_NUM_CHARS, "");
    const m = s.match(/^(\d*)([.,]?)([\s\S]*)$/);
    const intPart = m[1].replace(/\B(?=(\d{3})+(?!\d))/g, IS_EN ? "," : " ");
    return intPart + m[2] + m[3].replace(/[^\d]/g, "");
  }

  // групування тисяч під час вводу зі збереженням позиції курсора
  function formatWhileTyping(inp) {
    const old = inp.value;
    const pos = inp.selectionStart ?? old.length;
    const digitsBefore = old.slice(0, pos).replace(NON_NUM_CHARS, "").length;
    const next = groupNumber(old);
    if (next === old) return;
    inp.value = next;
    let seen = 0;
    let i = 0;
    for (; i < next.length && seen < digitsBefore; i++) if (NUM_CHARS.test(next[i])) seen++;
    try {
      inp.setSelectionRange(i, i);
    } catch {}
  }

  function fmtUAH(v) {
    return Math.round(v).toLocaleString(locale()) + " ₴";
  }

  function fmtMoney(v, cur) {
    const n = Math.round(v * 100) / 100;
    const s = n.toLocaleString(locale(), { maximumFractionDigits: 2 });
    if (cur === "EUR") return s + " €";
    if (cur === "USD") return s + " $";
    if (cur === "UAH") return s + " ₴";
    return s + " " + cur;
  }

  function safeDiv(a, b) {
    const bb = Number(b);
    if (!Number.isFinite(bb) || bb === 0) return null;
    const aa = Number(a);
    return Number.isFinite(aa) ? aa / bb : null;
  }

  function setText(k, text) {
    if (els[k]) els[k].textContent = text;
  }

  function toast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (els.toast.textContent = ""), 2200);
  }

  function currentYear() {
    return new Date().getFullYear();
  }

  // коефіцієнт віку для акцизу: кількість років від року випуску, але не менше 1 і не більше 15
  function getAge() {
    const yRaw = (els.year?.value || "").trim();
    if (yRaw === "") return null;
    const y = num(yRaw, NaN);
    if (!Number.isFinite(y)) return null;
    return Math.min(15, Math.max(1, currentYear() - y));
  }

  // ---- курси ----
  const manualRate = (k) => {
    const v = val(k);
    return v > 0 ? v : null;
  };

  function rateOf(code) {
    if (code === "UAH") return 1;
    if (code === "USD" && manualRate("rateUsd")) return manualRate("rateUsd");
    if (code === "EUR" && manualRate("rateEur")) return manualRate("rateEur");
    const r = state.rates[code];
    return Number.isFinite(r) && r > 0 ? r : null;
  }

  // дрібна примітка під таблицею: за яким курсом пораховано
  function updateRatesBadge() {
    if (!els.rateNote) return;
    const usd = rateOf("USD");
    const eur = rateOf("EUR");
    if (!(usd && eur)) {
      els.rateNote.textContent = t("customs.rates_none");
      return;
    }
    const manual = !!(manualRate("rateUsd") || manualRate("rateEur"));
    els.rateNote.textContent = t(manual ? "customs.rate_note_manual" : "customs.rate_note", {
      usd: usd.toFixed(4),
      eur: eur.toFixed(4),
      date: state.ratesDate || ""
    });
  }

  function syncFlag() {
    const cur = els.currency?.value;
    const f = CUR_FLAG[cur] || "ua";
    if (els.curFlag) els.curFlag.src = `/assets/flags/${f}.png`;
    if (els.curCode) els.curCode.textContent = cur || "EUR";
    els.curList?.querySelectorAll("li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.v === cur)));
  }

  // ========= 4) Категорія, двигун, регіон =========
  // вбудовані ставки акцизу: легкові на бензині, дизелі та електро; решта — вручну
  const builtInExcise = () => state.category === "car" && state.engine !== "hybrid";
  // коефіцієнт віку застосовується до ДВЗ (вбудовано) та до ручної ставки, якщо ввімкнено перемикач
  const usesAge = () => (builtInExcise() ? state.engine !== "electric" : !!els.ageCoef?.checked);

  function syncUI() {
    $$('[data-cc-action="setCategory"]').forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-category") === state.category));
    $$('[data-cc-action="setEngine"]').forEach((b) => {
      const eng = b.getAttribute("data-engine");
      b.hidden = !ENGINES[state.category].includes(eng);
      b.classList.toggle("is-active", eng === state.engine);
    });
    $$('[data-cc-action="setRegion"]').forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-region") === state.region));

    if (els.modeBadge) {
      els.modeBadge.textContent = t("customs.cat_" + state.category) + " · " + t("customs.eng_" + state.engine);
    }
    if (els.iceBlock) els.iceBlock.style.display = state.engine === "electric" ? "none" : "";
    if (els.evBlock) els.evBlock.style.display = state.engine === "electric" ? "" : "none";
    if (els.manualBlock) els.manualBlock.style.display = builtInExcise() ? "none" : "";
    if (els.euBlock) els.euBlock.style.display = state.region === "eu" ? "" : "none";
    if (els.usBlock) els.usBlock.style.display = state.region === "us" ? "" : "none";
  }

  // типове мито: 0% для електро або для авто європейського походження (сертифікат), інакше 10%
  function defaultDuty() {
    if (state.engine === "electric") return "0";
    if (state.region === "eu" && els.euOrigin?.checked) return "0";
    return "10";
  }

  // підставляємо типове мито лише якщо поле порожнє, стоїть 10% або мито виставлене автоматично (власну ставку не чіпаємо)
  function syncDutyDefault() {
    const el = els.dutyRate;
    if (!el) return;
    const v = (el.value || "").trim();
    if (v === "" || v === "10" || el.dataset.auto === "1") {
      const want = defaultDuty();
      el.value = want;
      if (want === "10") delete el.dataset.auto;
      else el.dataset.auto = "1";
    }
  }

  function afterEngineChange() {
    state.mode = state.engine === "electric" ? "EV" : "ICE";
    syncDutyDefault();
    if (els.vatRate && isBlank("vatRate")) els.vatRate.value = "20";
    syncUI();
    recalc();
  }

  function setCategory(cat) {
    if (!CATS.includes(cat)) return;
    state.category = cat;
    if (!ENGINES[cat].includes(state.engine)) state.engine = ENGINES[cat][0];
    afterEngineChange();
  }

  function setEngine(eng) {
    if (!ENGINES[state.category].includes(eng)) return;
    state.engine = eng;
    afterEngineChange();
  }

  function setRegion(region) {
    if (!REGIONS.includes(region)) return;
    state.region = region;
    // якщо ціну ще не введено — підставляємо типову валюту (USD зі США, EUR з Європи)
    if (els.currency && isBlank("price")) {
      if (region === "us") els.currency.value = "USD";
      else if (region === "eu") els.currency.value = "EUR";
      syncFlag();
    }
    if (region !== "eu" && els.euOrigin) els.euOrigin.checked = false;
    syncDutyDefault();
    syncUI();
    recalc();
  }

  // ========= 5) Розрахунки =========
  function calcExciseEUR(age) {
    const k = age === null ? 1 : age;
    const cc = val("engineCC");
    const kwh = val("batteryKwh");

    if (builtInExcise()) {
      if (state.engine === "electric") return kwh * 1; // 1 € за кВт·год батареї
      // ставка залежить від пального та обʼєму двигуна
      let base;
      if (state.engine === "diesel") base = cc > 3500 ? 150 : 75;
      else base = cc > 3000 ? 100 : 50;
      return base * (cc / 1000) * k;
    }

    // інші категорії та гібриди: ставку акцизу вводить користувач
    const rate = val("exciseRate");
    const kk = els.ageCoef?.checked ? k : 1;
    return state.engine === "electric" ? rate * kwh * kk : rate * (cc / 1000) * kk;
  }

  // збір до ПФ при першій реєстрації: 3% до 165 прожиткових мінімумів, 4% від 165 до 290, 5% понад 290
  // (прожитковий мінімум для працездатних на 1 січня; база — вартість авто без ПДВ, тут — митна вартість у грн)
  function pensionInfo(baseUAH) {
    const sm = Math.max(0, val("subMin"));
    const t1 = 165 * sm;
    const t2 = 290 * sm;
    let rate = 0.03;
    if (baseUAH > t2) rate = 0.05;
    else if (baseUAH > t1) rate = 0.04;
    return { t1, t2, rate, amount: baseUAH * rate };
  }

  // що ще треба заповнити, щоб результат не був заниженим
  function labelOf(el) {
    return (el?.closest(".ccalc__field")?.querySelector("label")?.textContent || "").replace(/\([^)]*\)/g, "").replace(/\*/g, "").trim();
  }

  function missingFields() {
    const miss = [];
    if (usesAge() && getAge() === null) miss.push(labelOf(els.year));
    if (state.engine === "electric") {
      if (!(val("batteryKwh") > 0)) miss.push(labelOf(els.batteryKwh));
    } else if (!(val("engineCC") > 0)) {
      miss.push(labelOf(els.engineCC));
    }
    if (!builtInExcise() && isBlank("exciseRate")) miss.push(labelOf(els.exciseRate));
    return miss;
  }

  const DASH = "—";

  function setResultDashes() {
    ROWS.forEach((r) => {
      setText(r, DASH);
      setText(r + "Cur", DASH);
    });
    setText("totalCustoms", DASH);
    setText("landedTotal", DASH);
    setText("pensionHint", "");
    setText("landedSub", "");
    setText("subHint", "");
    setText("splitNote", "");
    if (els.splitBar) els.splitBar.innerHTML = "";
    if (els.splitLegend) els.splitLegend.innerHTML = "";
    updateCompare(null);
  }

  // друга колонка таблиці — у валюті, обраній для розрахунку (для UAH колонка прихована)
  function syncResultCurrency() {
    const cur = els.currency?.value || "EUR";
    setText("curHead", cur);
    $("resTable")?.classList.toggle("is-uah", cur === "UAH");
  }

  // рядок таблиці: гривні + валюта розрахунку
  function setRow(key, uah, curRate, cur) {
    setText(key, fmtUAH(uah));
    const v = safeDiv(uah, curRate);
    setText(key + "Cur", v === null ? DASH : fmtMoney(v, cur));
  }

  const SPLIT_COLORS = { duty: "#5b7bd5", excise: "#e07b39", vat: "#1f8f52", pension: "#8a6fd1" };

  function renderSplit(parts, taxTotal, customsValueUAH) {
    if (!els.splitBar || !els.splitLegend) return;
    const sum = parts.reduce((a, p) => a + p.value, 0);
    if (!(sum > 0)) {
      els.splitBar.innerHTML = "";
      els.splitLegend.innerHTML = "";
      setText("splitNote", "");
      return;
    }
    els.splitBar.innerHTML = parts
      .filter((p) => p.value > 0)
      .map((p) => `<span class="ccalc__splitSeg" style="width:${((p.value / sum) * 100).toFixed(2)}%;background:${SPLIT_COLORS[p.key]}" title="${p.label}: ${fmtUAH(p.value)}"></span>`)
      .join("");
    els.splitLegend.innerHTML = parts
      .map((p) => `<span><i style="background:${SPLIT_COLORS[p.key]}"></i>${p.label} <b>${fmtUAH(p.value)}</b> (${Math.round((p.value / sum) * 100)}%)</span>`)
      .join("");
    const pct = customsValueUAH > 0 ? Math.round((taxTotal / customsValueUAH) * 100) : 0;
    setText("splitNote", t("customs.split_note", { pct }));
  }

  // ---- порівняння двох варіантів ----
  function describeCurrent() {
    const cur = els.currency?.value || "EUR";
    return t("customs.cmp_desc", {
      cat: t("customs.cat_" + state.category),
      eng: t("customs.eng_" + state.engine),
      region: t("customs.reg_" + state.region),
      year: (els.year?.value || "").trim() || DASH,
      price: fmtMoney(val("price"), cur)
    });
  }

  function updateCompare(current) {
    if (!els.cmpPanel) return;
    if (!state.saved) {
      els.cmpPanel.style.display = "none";
      return;
    }
    els.cmpPanel.style.display = "";
    setText("cmpDescA", state.saved.desc);
    setText("cmpCustomsA", fmtUAH(state.saved.customs));
    setText("cmpLandedA", fmtUAH(state.saved.landed));
    if (!current) {
      setText("cmpDescB", DASH);
      setText("cmpCustomsB", DASH);
      setText("cmpLandedB", DASH);
      setText("cmpCustomsD", DASH);
      setText("cmpLandedD", DASH);
      return;
    }
    const diff = (b, a) => (b - a >= 0 ? "+" : "−") + fmtUAH(Math.abs(b - a));
    setText("cmpDescB", current.desc);
    setText("cmpCustomsB", fmtUAH(current.customs));
    setText("cmpLandedB", fmtUAH(current.landed));
    setText("cmpCustomsD", diff(current.customs, state.saved.customs));
    setText("cmpLandedD", diff(current.landed, state.saved.landed));
  }

  let lastResult = null; // останній коректний результат (для «Зберегти варіант A»)

  function recalc() {
    if (!els.currency || !els.price) return;

    updateRatesBadge();
    syncResultCurrency();

    // підпис рядка мита в таблиці — зі ставкою, наприклад «Ввізне мито (10%)»
    const dutyCell = els.duty?.parentElement?.firstElementChild;
    if (dutyCell) {
      const dr = (els.dutyRate?.value || "").trim();
      dutyCell.textContent = t("customs.lbl_duty_full") + (dr === "" ? "" : ` (${dr}%)`);
    }

    // зірочка біля року випуску — лише коли вік впливає на акциз
    if (els.yearReq) els.yearReq.style.display = usesAge() ? "" : "none";

    // поточні ставки мита й ПДВ у заголовку згорнутого блоку
    setText("ratesSummary", `· ${t("customs.lbl_duty")} ${(els.dutyRate?.value || "0").trim() || 0}% · ${t("customs.lbl_vat")} ${(els.vatRate?.value || "0").trim() || 0}%`);

    // ціну не введено — нічого не рахуємо
    if (isBlank("price")) {
      if (els.ageBadge) els.ageBadge.textContent = t("customs.age_dash");
      lastResult = null;
      setResultDashes();
      return;
    }

    const age = getAge();
    if (els.ageBadge) els.ageBadge.textContent = age === null ? t("customs.age_dash") : t("customs.age_years", { age });

    const miss = missingFields();
    if (miss.length) {
      lastResult = null;
      setResultDashes();
      setText("subHint", t("customs.missing", { list: miss.join(", ") }));
      return;
    }

    const currency = els.currency.value;
    const toUAH = rateOf(currency);
    if (toUAH === null) {
      lastResult = null;
      setResultDashes();
      setText("subHint", t("customs.no_rate"));
      return;
    }
    const eurRate = rateOf("EUR");

    const dutyRate = val("dutyRate") / 100;
    const vatRate = val("vatRate") / 100;

    // митна вартість: ціна + доставка/страховка до кордону (+ витрати зі США: аукціон, порт, море)
    const usExtra = state.region === "us" ? val("auctionFee") + val("usInland") + val("seaFreight") : 0;
    const customsValue = val("price") + val("shipping") + usExtra;
    const customsValueUAH = customsValue * toUAH;

    const dutyUAH = customsValueUAH * dutyRate;
    const exciseEUR = calcExciseEUR(age);
    const exciseUAH = exciseEUR * (eurRate || 0);
    const vatUAH = (customsValueUAH + dutyUAH + exciseUAH) * vatRate;
    const totalCustomsUAH = dutyUAH + exciseUAH + vatUAH;

    // збір стосується лише легкових авто; електромобілі від нього звільнені
    const pensionChecked = !!els.includePension?.checked;
    const pensionNa = state.category !== "car" ? "customs.pension_na_cat" : state.engine === "electric" ? "customs.pension_na_ev" : "";
    const pensionOn = pensionChecked && !pensionNa;
    if (els.pensionBlock) els.pensionBlock.style.display = pensionChecked ? "" : "none";
    if (els.pensionRow) els.pensionRow.style.display = pensionOn ? "" : "none";
    const pInfo = pensionInfo(customsValueUAH);
    const pensionUAH = pensionOn ? pInfo.amount : 0;
    if (els.pensionHint) {
      els.pensionHint.textContent = pensionNa
        ? pensionChecked
          ? t(pensionNa)
          : ""
        : pensionOn
          ? t("customs.pension_hint", { t1: fmtUAH(pInfo.t1), t2: fmtUAH(pInfo.t2), rate: Math.round(pInfo.rate * 100) })
          : "";
    }
    const grandUAH = totalCustomsUAH + pensionUAH;

    // додаткові витрати в Україні (грн), не входять у митну вартість
    const extrasUAH = val("broker") + val("registration") + val("osago") + val("domestic");
    if (els.extrasRow) els.extrasRow.style.display = extrasUAH > 0 ? "" : "none";
    const landedUAH = customsValueUAH + grandUAH + extrasUAH;

    // таблиця
    setRow("customsValue", customsValueUAH, toUAH, currency);
    setRow("duty", dutyUAH, toUAH, currency);
    setRow("excise", exciseUAH, toUAH, currency);
    setRow("vat", vatUAH, toUAH, currency);
    if (pensionOn) setRow("pension", pensionUAH, toUAH, currency);
    else ["pension", "pensionCur"].forEach((k) => setText(k, DASH));
    setRow("grandTotal", grandUAH, toUAH, currency);
    if (extrasUAH > 0) setRow("extras", extrasUAH, toUAH, currency);
    setRow("landed", landedUAH, toUAH, currency);

    setText("totalCustoms", fmtUAH(totalCustomsUAH));
    setText(
      "subHint",
      t("customs.sub_hint", {
        customs_value_input: fmtMoney(customsValue, currency),
        customs_value_uah: fmtUAH(customsValueUAH),
        excise_eur: exciseEUR.toFixed(2)
      })
    );

    // загальна вартість «авто в Україні»
    setText("landedTotal", fmtUAH(landedUAH));
    const lc = safeDiv(landedUAH, toUAH);
    setText("landedSub", currency === "UAH" || lc === null ? "" : "≈ " + fmtMoney(lc, currency));

    // діаграма розбивки платежів
    renderSplit(
      [
        { key: "duty", label: t("customs.lbl_duty_full"), value: dutyUAH },
        { key: "excise", label: t("customs.lbl_excise"), value: exciseUAH },
        { key: "vat", label: t("customs.lbl_vat"), value: vatUAH },
        ...(pensionOn ? [{ key: "pension", label: t("customs.lbl_pension"), value: pensionUAH }] : [])
      ],
      grandUAH,
      customsValueUAH
    );

    lastResult = { desc: describeCurrent(), customs: grandUAH, landed: landedUAH };
    updateCompare(lastResult);
  }

  // ========= 6) Приклад / скидання / посилання =========
  function setValue(k, v) {
    if (k === "year") ensureYearOption(v);
    if (els[k]) els[k].value = v;
    if (k === "year") syncYearDd();
  }

  // список років випуску: від поточного до 1980 (акциз старших за 15 років однаковий)
  function ensureYearOption(v) {
    const sel = els.year;
    const y = String(v || "").trim();
    if (!sel || !/^[0-9]{4}$/.test(y) || Array.from(sel.options).some((o) => o.value === y)) return;
    const opt = new Option(y, y);
    const next = Array.from(sel.options).find((o) => o.value && Number(o.value) < Number(y));
    sel.add(opt, next || null);
    buildYearList();
  }

  function fillYears() {
    const sel = els.year;
    if (!sel) return;
    const keep = sel.value;
    const first = sel.options[0];
    sel.innerHTML = "";
    if (first) sel.add(first);
    for (let y = currentYear(); y >= 1980; y--) sel.add(new Option(String(y), String(y)));
    sel.value = keep;
    buildYearList();
  }

  // ========= випадні списки: валюта (з прапорцями) та рік (сітка) =========
  function closeCcDd(exceptKey) {
    ["curList", "yearList"].forEach((k) => {
      const ul = els[k];
      if (!ul || k === exceptKey || ul.hidden) return;
      ul.hidden = true;
      ul.closest(".ccalc__dd")?.querySelector(".ccalc__ddBtn")?.setAttribute("aria-expanded", "false");
    });
  }

  function toggleCcDd(listKey, btn) {
    const ul = els[listKey];
    if (!ul) return;
    closeCcDd(listKey);
    const open = ul.hidden;
    ul.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) ul.querySelector('li[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }

  function buildYearList() {
    if (!els.yearList || !els.year) return;
    els.yearList.innerHTML = Array.from(els.year.options)
      .filter((o) => o.value)
      .map((o) => '<li role="option" tabindex="-1" data-v="' + o.value + '" aria-selected="false">' + o.value + "</li>")
      .join("");
    syncYearDd();
  }

  function syncYearDd() {
    if (!els.year || !els.yearLabel) return;
    const v = els.year.value;
    if (els.yearLabel.dataset.ph === undefined) els.yearLabel.dataset.ph = els.yearLabel.textContent;
    els.yearLabel.textContent = v || els.yearLabel.dataset.ph;
    els.yearBtn?.classList.toggle("is-filled", !!v);
    els.yearList?.querySelectorAll("li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.v === v)));
  }

  function initCcDropdowns() {
    // валюта: список із прапорцями, кодом і назвою (з опцій прихованого select)
    if (els.currency && els.curList) {
      els.curList.innerHTML = Array.from(els.currency.options)
        .map((o) => {
          const parts = o.text.split(" — ");
          return (
            '<li role="option" tabindex="-1" data-v="' + o.value + '" aria-selected="false"><img class="ccalc__ddFlag" src="/assets/flags/' +
            (CUR_FLAG[o.value] || "ua") + '.png" width="20" height="14" alt="" loading="lazy" decoding="async"><span class="ccalc__ddCode">' + o.value +
            '</span><span class="ccalc__ddName">' + (parts[1] || "") + "</span></li>"
          );
        })
        .join("");
      syncFlag();
    }
    els.curBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCcDd("curList", els.curBtn);
    });
    els.curList?.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-v]");
      if (!li) return;
      closeCcDd("");
      els.currency.value = li.dataset.v;
      syncFlag();
      els.currency.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // рік: сітка років
    buildYearList();
    els.yearBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCcDd("yearList", els.yearBtn);
    });
    els.yearList?.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-v]");
      if (!li) return;
      closeCcDd("");
      els.year.value = li.dataset.v;
      syncYearDd();
      els.year.dispatchEvent(new Event("change", { bubbles: true }));
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".ccalc__dd")) closeCcDd("");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCcDd("");
    });
  }

  function fillExample() {
    state.category = "car";
    state.engine = "gasoline";
    state.region = "eu";
    if (els.euOrigin) els.euOrigin.checked = false;
    setValue("currency", "EUR");
    syncFlag();
    setValue("year", String(currentYear() - 8));
    setValue("price", groupNumber("10000"));
    setValue("shipping", groupNumber("1000"));
    setValue("engineCC", "2000");
    setValue("batteryKwh", "");
    setValue("exciseRate", "");
    if (els.ageCoef) els.ageCoef.checked = true;
    ["auctionFee", "usInland", "seaFreight"].forEach((k) => setValue(k, ""));
    setValue("broker", groupNumber("6000"));
    setValue("registration", groupNumber("12000"));
    setValue("osago", groupNumber("4000"));
    setValue("domestic", groupNumber("3000"));
    if (els.dutyRate) {
      els.dutyRate.value = "10";
      delete els.dutyRate.dataset.auto;
    }
    setValue("vatRate", "20");
    if (els.includePension) els.includePension.checked = false;
    if (els.extrasDetails) els.extrasDetails.open = true;
    afterEngineChange();
    toast(t("customs.example_done"));
  }

  function resetAll() {
    setValue("currency", "EUR");
    syncFlag();
    ["year", "price", "shipping", "engineCC", "batteryKwh", "exciseRate", "auctionFee", "usInland", "seaFreight", "broker", "registration", "osago", "domestic", "rateDate", "rateUsd", "rateEur"].forEach((k) => setValue(k, ""));

    state.category = "car";
    state.engine = "gasoline";
    state.region = "eu";
    if (els.euOrigin) els.euOrigin.checked = false;
    if (els.ageCoef) els.ageCoef.checked = true;

    if (els.dutyRate) {
      els.dutyRate.value = "10";
      delete els.dutyRate.dataset.auto;
    }
    setValue("vatRate", "20");
    if (els.includePension) els.includePension.checked = false;
    setValue("subMin", "3328");
    if (els.pensionBlock) els.pensionBlock.style.display = "none";
    if (els.pensionRow) els.pensionRow.style.display = "none";
    if (els.extrasDetails) els.extrasDetails.open = false;
    if (els.rateDetails) els.rateDetails.open = false;
    if (els.ratesDetails) els.ratesDetails.open = false;

    afterEngineChange();
    if (els.ageBadge) els.ageBadge.textContent = t("customs.age_dash");
    setResultDashes();
    loadRates(null).then(recalc);
  }

  // параметри посилання: ключ → елемент
  const URL_FIELDS = [
    ["cur", "currency"], ["y", "year"], ["p", "price"], ["s", "shipping"], ["cc", "engineCC"], ["kwh", "batteryKwh"],
    ["d", "dutyRate"], ["vat", "vatRate"], ["sm", "subMin"], ["xr", "exciseRate"],
    ["au", "auctionFee"], ["ui", "usInland"], ["sf", "seaFreight"],
    ["br", "broker"], ["rt", "registration"], ["os", "osago"], ["dm", "domestic"],
    ["rd", "rateDate"], ["ru", "rateUsd"], ["re", "rateEur"]
  ];

  function copyLink() {
    const params = new URLSearchParams();
    params.set("cat", state.category);
    params.set("eng", state.engine);
    params.set("rg", state.region);
    params.set("eu", els.euOrigin?.checked ? "1" : "0");
    params.set("ac", els.ageCoef?.checked ? "1" : "0");
    params.set("pen", els.includePension?.checked ? "1" : "0");
    URL_FIELDS.forEach(([key, el]) => {
      let v = (els[el]?.value || "").trim();
      if (v && MONEY_FIELDS.includes(el)) v = String(num(v)); // у посиланні без групування тисяч
      if (v) params.set(key, v);
    });
    const url = `${location.origin}${location.pathname}?${params.toString()}`;
    navigator.clipboard?.writeText(url)
      .then(() => toast(t("customs.link_copied")))
      .catch(() => toast(t("customs.link_copy_failed")));
  }

  function loadFromUrl() {
    const q = new URLSearchParams(location.search);
    if (![...q.keys()].some((k) => ["cat", "eng", "rg", "cur", "p", "y", "mode"].includes(k))) return false;

    const cat = q.get("cat");
    if (CATS.includes(cat)) state.category = cat;
    const rg = q.get("rg");
    if (REGIONS.includes(rg)) state.region = rg;
    if (els.euOrigin && q.get("eu") !== null) els.euOrigin.checked = q.get("eu") === "1" && state.region === "eu";

    // категорія й двигун (а також старі параметри mode/ft)
    let eng = q.get("eng");
    if (!eng) {
      const mode = q.get("mode");
      if (mode === "EV") eng = "electric";
      else if (q.get("ft") === "diesel") eng = "diesel";
      else if (mode === "ICE") eng = "gasoline";
    }
    if (eng && ENGINES[state.category].includes(eng)) state.engine = eng;

    URL_FIELDS.forEach(([key, el]) => {
      const v = q.get(key);
      if (el === "year" && v !== null) ensureYearOption(v);
      if (v !== null && els[el]) els[el].value = MONEY_FIELDS.includes(el) ? groupNumber(v) : v;
    });
    if (els.ageCoef && q.get("ac") !== null) els.ageCoef.checked = q.get("ac") === "1";
    if (els.includePension) els.includePension.checked = q.get("pen") === "1";
    syncFlag();
    syncYearDd();
    if (els.extrasDetails && ["broker", "registration", "osago", "domestic"].some((k) => !isBlank(k))) els.extrasDetails.open = true;
    // нестандартні ставки з посилання — показуємо блок відкритим
    if (els.ratesDetails && ((q.get("d") !== null && q.get("d") !== "10") || (q.get("vat") !== null && q.get("vat") !== "20"))) els.ratesDetails.open = true;
    if (els.rateDetails && ["rateDate", "rateUsd", "rateEur"].some((k) => !isBlank(k))) els.rateDetails.open = true;
    afterEngineChange();
    return true;
  }

  // ========= 7) Курси: завантаження (сьогодні / на дату) =========
  const ymd = (isoDate) => String(isoDate || "").replace(/-/g, "");

  async function loadRates(isoDate) {
    try {
      const r = await fetchNbuRates(isoDate ? ymd(isoDate) : null);
      state.rates = r.map;
      state.ratesDate = r.date;
    } catch (e) {
      if (isoDate) {
        // для вибраної дати даних немає — лишаємо поточні курси і повідомляємо
        toast(t("customs.rate_date_fail"));
      } else {
        console.warn("NBU fetch failed:", e);
        state.rates = {};
        state.ratesDate = null;
      }
    }
    updateRatesBadge();
  }

  // ========= 8) Events =========
  $$('[data-cc-action="setCategory"]').forEach((btn) => btn.addEventListener("click", () => setCategory(btn.getAttribute("data-category"))));
  $$('[data-cc-action="setRegion"]').forEach((btn) => btn.addEventListener("click", () => setRegion(btn.getAttribute("data-region"))));
  $$('[data-cc-action="setEngine"]').forEach((btn) => btn.addEventListener("click", () => setEngine(btn.getAttribute("data-engine"))));

  els.euOrigin?.addEventListener("change", () => {
    syncDutyDefault();
    recalc();
  });

  [
    "currency", "year", "price", "shipping", "engineCC", "exciseRate", "ageCoef", "batteryKwh", "dutyRate", "vatRate",
    "includePension", "subMin", "auctionFee", "usInland", "seaFreight", "broker", "registration", "osago", "domestic",
    "rateUsd", "rateEur"
  ].forEach((k) => {
    const el = els[k];
    if (!el) return;
    el.addEventListener("input", recalc);
    el.addEventListener("change", recalc);
  });

  els.currency?.addEventListener("change", syncFlag);

  // групування тисяч у грошових полях
  MONEY_FIELDS.forEach((k) => els[k]?.addEventListener("input", () => formatWhileTyping(els[k])));

  // ручна зміна мита знімає позначку «виставлено автоматично»
  els.dutyRate?.addEventListener("input", (e) => {
    if (e.isTrusted) delete els.dutyRate.dataset.auto;
  });

  // курс на дату
  els.rateDate?.addEventListener("change", async () => {
    await loadRates(els.rateDate.value || null);
    recalc();
  });

  root.querySelector('[data-cc-action="reset"]')?.addEventListener("click", () => {
    resetAll();
    toast(t("customs.reset_done"));
  });
  root.querySelector('[data-cc-action="copyLink"]')?.addEventListener("click", copyLink);
  root.querySelector('[data-cc-action="example"]')?.addEventListener("click", fillExample);
  // «Розрахувати»: перерахунок (він і так автоматичний), підказка про незаповнені поля, прокрутка до результату
  root.querySelector('[data-cc-action="calc"]')?.addEventListener("click", () => {
    recalc();
    const miss = isBlank("price") ? [labelOf(els.price)] : missingFields();
    if (miss.length) {
      toast(t("customs.missing", { list: miss.join(", ") }));
      return;
    }
    if (els.toast) els.toast.textContent = "";
    const card = root.querySelectorAll(".ccalc__card")[1];
    if (!card) return;
    // на вузьких екранах блоки стоять один під одним — прокручуємо до результату
    const first = root.querySelector(".ccalc__card");
    const stacked = card.getBoundingClientRect().top >= first.getBoundingClientRect().bottom - 5;
    if (stacked) card.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  root.querySelector('[data-cc-action="saveVariant"]')?.addEventListener("click", () => {
    if (!lastResult) {
      toast(t("customs.variant_need_data"));
      return;
    }
    state.saved = { ...lastResult };
    updateCompare(lastResult);
    toast(t("customs.variant_saved"));
  });
  root.querySelector('[data-cc-action="clearVariant"]')?.addEventListener("click", () => {
    state.saved = null;
    updateCompare(lastResult);
    toast(t("customs.variant_cleared"));
  });

  // ========= 9) Init =========
  document.addEventListener("DOMContentLoaded", async () => {
    fillYears();

    // поле валюти: 12 валют із назвами
    if (els.currency) {
      let names = null;
      try {
        names = new Intl.DisplayNames([locale().split("-")[0]], { type: "currency" });
      } catch {}
      const keep = els.currency.value || "EUR";
      els.currency.innerHTML = CURRENCIES.map((c) => {
        let nm = "";
        try {
          nm = names ? names.of(c) : "";
        } catch {}
        return `<option value="${c}">${c}${nm ? " — " + nm.charAt(0).toUpperCase() + nm.slice(1) : ""}</option>`;
      }).join("");
      els.currency.value = CURRENCIES.includes(keep) ? keep : "EUR";
      syncFlag();
    }

    initCcDropdowns();

    if (els.dutyRate && isBlank("dutyRate")) els.dutyRate.value = "10";
    if (els.vatRate && isBlank("vatRate")) els.vatRate.value = "20";
    if (els.rateDate) els.rateDate.max = new Date().toISOString().slice(0, 10);

    const fromUrl = loadFromUrl();
    await loadRates(fromUrl && !isBlank("rateDate") ? els.rateDate.value : null);
    if (!fromUrl) afterEngineChange();
    syncUI();
    recalc();
  });
})();
