/* excavation-calculator.js — калькулятор об'єму земляних робіт: до шести ділянок (траншея, котлован, площа × глибина) з укосами, робочим зазором, запасом, розпушенням, вагою, рейсами та необов'язковою вартістю (UK/EN, UAH/USD/EUR)
   Траншея: V = L × h × (b + m·h), b — ширина дна з робочим зазором, m — закладення укосу на 1 м глибини.
   Котлован: призматоїд V = h/6 × (A1 + 4·Am + A2), A1 = a'·b', Am = (a' + m·h)(b' + m·h), A2 = (a' + 2m·h)(b' + 2m·h).
   Площа × глибина: V = A × h (вертикальні стінки). Запас додається до об'єму в ґрунті.
   Розпушений об'єм = об'єм у ґрунті × (1 + розпушення); вага = об'єм у ґрунті × густина в природному заляганні (масу розпушення не змінює).
   Рейси = max(розпушений об'єм / кузов, вага / вантажопідйомність). Укоси за таблицею СНиП 12-04-2002 (п. 5.2.6) для ґрунтів вище рівня ґрунтових вод.
   Вбудованих цін немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = " ";
  const MAXE = 6;
  const LIM = { price: { UAH: 1000000, USD: 25000, EUR: 25000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf", "#86a0d6", "#16a34a", "#aec1e6"];
  const PRICE_IDS = ["pEx", "pHaul", "pOth"];
  // розпушення, % і густина в природному заляганні, т/м³ (середні значення з діапазонів; редагуються)
  const SOILS = { sand: { bulk: "12", dens: "1.6" }, sandy: { bulk: "15", dens: "1.7" }, loam: { bulk: "22", dens: "1.7" }, clay: { bulk: "28", dens: "1.8" }, fill: { bulk: "12", dens: "1.5" }, custom: { bulk: "", dens: "" } };
  // закладення укосу m (горизонталь на 1 м глибини) для глибини до 1,5 / 3 / 5 м
  const SLOPE = { sand: [0.5, 1, 1], sandy: [0.25, 0.67, 0.85], loam: [0, 0.5, 0.75], clay: [0, 0.25, 0.5], fill: [0.67, 1, 1.25] };

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errTotal: "The total is too large — check the dimensions.",
        errNoSec: "Enter the dimensions of at least one section.",
        errSlopeCustom: "For a custom soil pick “Vertical walls” or enter the slope ratio.",
        errTrips: "Enter the body volume or the payload of the truck to price the haulage.",
        sec: "Section {n}", secInfo: "{v} m³ · slope {m}",
        lbl: { len: "Length", wid: "Width", bot: "Bottom width", area: "Area", dep: "Depth", gap: "Working gap", reserve: "Reserve", bulk: "Loosening", dens: "Soil density", mc: "Slope ratio", cap: "Body volume", pay: "Payload", keep: "Stays on site", pEx: "Excavation price per m³", pHaul: "Price per trip", pOth: "Other" },
        units: { len: " m", wid: " m", area: " m²", dep: " m", gap: " m", reserve: " %", bulk: " %", dens: " t/m³", mc: "", cap: " m³", pay: " t", keep: " m³" },
        types: { tr: "trench", pit: "pit", area: "area × depth" },
        title: "Earthworks · {n} · {s} · reserve {r}%", secW: ["section", "sections", "sections"],
        chip: "in the ground (undisturbed)", tripW: ["trip", "trips", "trips"],
        tLoose: "Loose volume", tLooseMini: "loosening {p}%", tMass: "Weight", tMassMini: "{d} t/m³ in the ground", tTrips: "Trips", tTripsMini: "by volume {a}, by weight {b}", tTripsNone: "enter the truck", tHaul: "To haul away", tHaulMini: "loose, {k} m³ stays",
        tCost: "Cost", perM3: "{p} per m³",
        thSec: "Section", thType: "Type", thVol: "Volume, m³", thSlope: "Slope m", rowTotal: "Total (without reserve)",
        thItem: "Item", thQty: "Quantity", thPrice: "Price", thSum: "Amount",
        rEx: "Excavation", rHaul: "Haulage", rOth: "Other", rTotal: "Total", u: { m3: "m³", trips: "trips" },
        barTitle: "What the cost consists of", bar: "Cost structure",
        diagTitle: "Cross-sections", diagAria: "Cross-sections of the excavation by section",
        diagHead: "Section {n} · {t} · depth {h} m", diagTop: "top {w} m", diagBot: "bottom {w} m", diagSlope: "slope m = {m}", diagVert: "vertical walls", diagArea: "section {a} m²", diagNote: "A section along the length of the pit; the trench is drawn across.",
        note: "An approximate estimate: the real volume depends on the soil, the water level and the way the excavation is made. The slopes are by the table of SNiP 12-04-2002 for soil above the groundwater level.",
        noteDeep: "Over 5 m the slope is set by the design: the calculator used the values for 5 m.",
        noteCustomM: "The slope ratio is yours.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅",
        copyVol: "Volume in the ground", copyLoose: "loose"
      }
    : {
        enter: "Вкажіть дані — результат з'явиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errTotal: "Підсумок завеликий — перевірте розміри.",
        errNoSec: "Вкажіть розміри хоча б однієї ділянки.",
        errSlopeCustom: "Для свого ґрунту оберіть «Вертикальні стінки» або вкажіть коефіцієнт укосу.",
        errTrips: "Вкажіть кузов або вантажопідйомність самоскида, щоб порахувати вивіз.",
        sec: "Ділянка {n}", secInfo: "{v} м³ · укіс {m}",
        lbl: { len: "Довжина", wid: "Ширина", bot: "Ширина дна", area: "Площа", dep: "Глибина", gap: "Робочий зазор", reserve: "Запас", bulk: "Розпушення", dens: "Густина ґрунту", mc: "Коефіцієнт укосу", cap: "Кузов", pay: "Вантажопідйомність", keep: "Залишається на ділянці", pEx: "Ціна земляних робіт за м³", pHaul: "Ціна за рейс", pOth: "Інше" },
        units: { len: " м", wid: " м", area: " м²", dep: " м", gap: " м", reserve: " %", bulk: " %", dens: " т/м³", mc: "", cap: " м³", pay: " т", keep: " м³" },
        types: { tr: "траншея", pit: "котлован", area: "площа × глибина" },
        title: "Земляні роботи · {n} · {s} · запас {r}%", secW: ["ділянка", "ділянки", "ділянок"],
        chip: "у щільному стані (у ґрунті)", tripW: ["рейс", "рейси", "рейсів"],
        tLoose: "Розпушений об'єм", tLooseMini: "розпушення {p}%", tMass: "Вага", tMassMini: "{d} т/м³ у ґрунті", tTrips: "Рейсів", tTripsMini: "за об'ємом {a}, за вагою {b}", tTripsNone: "вкажіть самоскид", tHaul: "Вивозимо", tHaulMini: "розпушеного, {k} м³ лишається",
        tCost: "Вартість", perM3: "{p} за м³",
        thSec: "Ділянка", thType: "Тип", thVol: "Об'єм, м³", thSlope: "Укіс m", rowTotal: "Разом (без запасу)",
        thItem: "Позиція", thQty: "Кількість", thPrice: "Ціна", thSum: "Сума",
        rEx: "Земляні роботи", rHaul: "Вивіз", rOth: "Інше", rTotal: "Разом", u: { m3: "м³", trips: "рейсів" },
        barTitle: "З чого складається вартість", bar: "Структура вартості",
        diagTitle: "Перерізи", diagAria: "Перерізи виїмки по ділянках",
        diagHead: "Ділянка {n} · {t} · глибина {h} м", diagTop: "верх {w} м", diagBot: "дно {w} м", diagSlope: "укіс m = {m}", diagVert: "вертикальні стінки", diagArea: "переріз {a} м²", diagNote: "Для котловану показано переріз уздовж довжини, траншея намальована впоперек.",
        note: "Орієнтовна оцінка: реальний об'єм залежить від ґрунту, рівня води й способу розробки. Укоси за таблицею СНиП 12-04-2002 для ґрунтів вище рівня ґрунтових вод.",
        noteDeep: "Глибше 5 м укіс задає проєкт: калькулятор узяв значення для 5 м.",
        noteCustomM: "Коефіцієнт укосу ваш.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅",
        copyVol: "Об'єм у ґрунті", copyLoose: "розпушений"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const nf = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d + 0).toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });
  const q1 = (x) => nf(x, 1);
  const q2 = (x) => nf(x, 2);
  const mm = (x) => (Math.round(x * 100) / 100).toLocaleString(LOC, { maximumFractionDigits: 2 });
  const pct = (x) => nf(x, x % 1 ? 1 : 0);
  const lim = (x) => (x % 1 ? String(x).replace(".", IS_EN ? "." : ",") : nf(x));
  const pl = (n, w) => {
    if (IS_EN) return n === 1 ? w[0] : w[2];
    const a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? w[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? w[1] : w[2];
  };
  let cur = "UAH";
  const money = (x, c = cur) => (IS_EN ? SYM[c] + nf(x) : nf(x) + NB + SYM[c]);
  const M3 = IS_EN ? "m³" : "м³";
  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2600);
  }
  const raw = (id) => (el(id).value || "").trim();
  function num(id) {
    const s = raw(id).replace(/\s+/g, "").replace(",", ".");
    if (s === "") return null;
    return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }
  const eId = (i, k) => "e" + i + "_" + k;
  const visibleSecs = () => Array.from({ length: MAXE }, (_, k) => k + 1).filter((i) => !el("el" + i).hidden);
  const MAXV = 1e9;

  // ===== курс НБУ =====
  const rates = { USD: null, EUR: null, date: "" };
  async function loadRate(code) {
    try {
      const r = await fetch("/api/nbu-history?code=" + code, { cache: "no-store" });
      if (!r.ok) throw new Error("rate");
      const pts = (await r.json()).pts;
      const p = pts[pts.length - 1];
      if (p && p[1] > 0) {
        rates[code] = p[1];
        const d = new Date(p[0]);
        rates.date = String(d.getUTCDate()).padStart(2, "0") + "." + String(d.getUTCMonth() + 1).padStart(2, "0") + "." + d.getUTCFullYear();
      }
    } catch {
      /* без курсу сторінка працює */
    }
  }

  // ===== розрахунок =====
  function val(id, label, lo, hi, required, unit) {
    const v = num(id);
    if (v === null) return required ? { miss: label } : { v: null };
    if (Number.isNaN(v)) return { err: fill(T.errNum, { f: label }) };
    if (v < lo || v > hi) return { err: fill(T.errRange, { f: label, a: lim(lo), b: lim(hi), u: unit || "" }) };
    return { v };
  }
  function slopeFor(soil, mode, mc, h) {
    if (mode === "vert") return { m: 0, deep: false };
    if (mode === "custom") return { m: mc, deep: false, own: true };
    const row = SLOPE[soil], k = h <= 1.5 ? 0 : h <= 3 ? 1 : 2;
    return { m: row[k], deep: h > 5 };
  }
  // об'єм однієї ділянки; повертає і розміри для перерізу
  function volume(type, L, W, h, m, g) {
    if (type === "tr") {
      const b = W + 2 * g, S = h * (b + m * h);
      return { V: L * S, S, wb: b, wt: b + 2 * m * h };
    }
    if (type === "pit") {
      const a = L + 2 * g, b = W + 2 * g;
      const A1 = a * b, Am = (a + m * h) * (b + m * h), A2 = (a + 2 * m * h) * (b + 2 * m * h);
      return { V: (h / 6) * (A1 + 4 * Am + A2), wb: a, wt: a + 2 * m * h };
    }
    return { V: L * h, wb: 0, wt: 0 };
  }

  function compute() {
    let err = null;
    const miss = [];
    const note = (r) => {
      if (r.miss) miss.push(r.miss);
      if (r.err && !err) err = r.err;
      return r;
    };
    const soil = el("soil").value, mode = el("slope").value;
    const g = note(val("gap", T.lbl.gap, 0, 5, false, T.units.gap)).v || 0;
    const res = note(val("reserve", T.lbl.reserve, 0, 50, false, T.units.reserve)).v || 0;
    const bulk = note(val("bulk", T.lbl.bulk, 0, 60, true, T.units.bulk)).v;
    const dens = note(val("dens", T.lbl.dens, 0.5, 3, true, T.units.dens)).v;
    let mc = null;
    if (mode === "custom") mc = note(val("mc", T.lbl.mc, 0, 5, true)).v;
    const cap = note(val("cap", T.lbl.cap, 0.5, 100, false, T.units.cap)).v;
    const pay = note(val("pay", T.lbl.pay, 0.5, 100, false, T.units.pay)).v;
    const keep = note(val("keep", T.lbl.keep, 0, MAXV, false, T.units.keep)).v || 0;
    const secs = [];
    visibleSecs().forEach((i, idx) => {
      const t = el(eId(i, "type")).value;
      const used = (t === "area" ? ["p1"] : ["p1", "p2"]).some((k) => raw(eId(i, k)) !== "") || raw(eId(i, "d")) !== "";
      if (!used) return;
      const name = fill(T.sec, { n: idx + 1 });
      const p1 = note(val(eId(i, "p1"), name + ": " + (t === "area" ? T.lbl.area : T.lbl.len), 0.1, t === "area" ? 1e7 : 10000, true, t === "area" ? T.units.area : T.units.len));
      const p2 = t === "area" ? { v: 1 } : note(val(eId(i, "p2"), name + ": " + (t === "tr" ? T.lbl.bot : T.lbl.wid), 0.1, 1000, true, T.units.wid));
      const dp = note(val(eId(i, "d"), name + ": " + T.lbl.dep, 0.1, 50, true, T.units.dep));
      if (!miss.length && !err) {
        if (soil === "custom" && mode === "norm") {
          err = T.errSlopeCustom;
          return;
        }
        const sl = slopeFor(soil, mode, mc, dp.v);
        const vol = volume(t, p1.v, p2.v, dp.v, t === "area" ? 0 : sl.m, t === "area" ? 0 : g);
        secs.push({ i, idx, name, t, L: p1.v, W: p2.v, h: dp.v, m: t === "area" ? 0 : sl.m, deep: sl.deep && t !== "area", g: t === "area" ? 0 : g, ...vol });
      }
    });
    const P = {
      ex: note(val("pEx", T.lbl.pEx, 0, LIM.price[cur], false)).v,
      haul: note(val("pHaul", T.lbl.pHaul, 0, LIM.price[cur], false)).v,
      oth: note(val("pOth", T.lbl.pOth, 0, LIM.fixed, false)).v || 0
    };
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!secs.length) return { ok: false, incomplete: true, none: true, msg: T.errNoSec };
    let V0 = 0;
    secs.forEach((s) => (V0 += s.V));
    if (V0 > MAXV) return { ok: false, msg: T.errTotal };
    const f = 1 + res / 100, V = V0 * f;
    const haulIn = Math.max(0, V - keep), loose = V * (1 + bulk / 100), haulLoose = haulIn * (1 + bulk / 100), haulMass = haulIn * dens;
    const R = { ok: true, cur, soil, mode, mc, secs, res, g, bulk, dens, cap, pay, keep, V0, V, loose, haulIn, haulLoose, haulMass, mass: V * dens, P, deep: secs.some((s) => s.deep) };
    R.tripsVol = cap ? Math.ceil(haulLoose / cap - 1e-9) : null;
    R.tripsMass = pay ? Math.ceil(haulMass / pay - 1e-9) : null;
    R.trips = R.tripsVol !== null && R.tripsMass !== null ? Math.max(R.tripsVol, R.tripsMass) : R.tripsVol !== null ? R.tripsVol : R.tripsMass;
    if (P.haul && R.trips === null) return { ok: false, msg: T.errTrips };
    const lines = [{ k: "rEx", qty: V, unit: "m3", price: P.ex, sum: P.ex ? V * P.ex : 0 }];
    if (R.trips !== null) lines.push({ k: "rHaul", qty: R.trips, unit: "trips", price: P.haul, sum: P.haul ? R.trips * P.haul : 0 });
    R.lines = lines;
    R.cost = lines.reduce((s, x) => s + x.sum, 0) + P.oth;
    R.hasPrice = R.cost > 0;
    R.perM3 = R.hasPrice ? R.cost / V : 0;
    return R;
  }

  // ===== відображення =====
  const tile = (title, value, mini) => '<div class="exc__kpi"><div class="exc__kpiT">' + title + '</div><div class="exc__kpiV">' + value + "</div>" + (mini ? '<div class="exc__kpiM">' + mini + "</div>" : "") + "</div>";
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  const tripsTxt = (n) => nf(n) + NB + pl(n, T.tripW);
  const soilName = () => el("sl_val").textContent;

  function secTable(r) {
    const head = "<thead><tr><th>" + T.thSec + "</th><th>" + T.thType + "</th><th>" + T.thVol + "</th><th>" + T.thSlope + "</th></tr></thead>";
    const body = r.secs.map((s) => "<tr><td>" + s.name + "</td><td>" + T.types[s.t] + "</td><td>" + q2(s.V) + "</td><td>" + (s.t === "area" ? "—" : mm(s.m)) + "</td></tr>").join("");
    return '<table class="exc__tbl exc__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + '<tr class="exc__total"><td>' + T.rowTotal + "</td><td></td><td>" + q2(r.V0) + "</td><td></td></tr></tbody></table>";
  }
  function costTable(r) {
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thQty + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const qty = (x) => (x.unit === "m3" ? q2(x.qty) + NB + T.u.m3 : tripsTxt(x.qty));
    let body = r.lines.map((x) => "<tr><td>" + T[x.k] + "</td><td>" + qty(x) + "</td><td>" + (x.price ? money(x.price) : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.P.oth) body += "<tr><td>" + T.rOth + "</td><td></td><td></td><td>" + money(r.P.oth) + "</td></tr>";
    if (r.hasPrice) body += '<tr class="exc__total"><td>' + T.rTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="exc__tbl exc__tbl--sch" id="costTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function barHtml(r) {
    const parts = r.lines.filter((x) => x.sum > 0).map((x) => ({ name: T[x.k], v: x.sum }));
    if (r.P.oth > 0) parts.push({ name: T.rOth, v: r.P.oth });
    if (!parts.length) return "";
    parts.forEach((p, i) => (p.c = COLORS[i % COLORS.length]));
    const seg = parts.map((p) => '<div style="width:' + ((p.v / r.cost) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = parts.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.cost) * 1000) / 10) + "%</span>").join("");
    return '<div class="exc__sub">' + T.barTitle + '</div><div class="exc__bar" role="img" aria-label="' + T.bar + '">' + seg + '</div><div class="exc__legend">' + leg + "</div>";
  }
  // переріз: трапеція (траншея, котлован уздовж довжини) або прямокутник (площа × глибина)
  function diagramHtml(r) {
    const VW = 320, CX = 160;
    let y = 4, out = "";
    r.secs.forEach((s) => {
      const wt = s.t === "area" ? Math.max(s.L ** 0.5, 1) : s.wt, wb = s.t === "area" ? wt : s.wb;
      const sc = Math.min(230 / wt, 70 / s.h), wtp = wt * sc, wbp = wb * sc, hp = s.h * sc;
      out += '<text x="10" y="' + (y + 12) + '" font-size="13" font-weight="700" fill="#1f2f55">' + fill(T.diagHead, { n: s.idx + 1, t: T.types[s.t], h: mm(s.h) }) + "</text>";
      y += 20;
      out += '<text x="' + CX + '" y="' + (y + 11) + '" font-size="12" text-anchor="middle" fill="#5b6b8c">' + fill(T.diagTop, { w: mm(Math.round(wt * 100) / 100) }) + "</text>";
      y += 16;
      const x1 = CX - wtp / 2, x2 = CX + wtp / 2, x3 = CX + wbp / 2, x4 = CX - wbp / 2;
      out += '<polygon points="' + [x1, y, x2, y, x3, y + hp, x4, y + hp].map((v) => v.toFixed(1)).join(",") + '" fill="#86a0d6" fill-opacity="0.35" stroke="#283b69" stroke-width="1.5"/>';
      y += hp;
      out += '<text x="' + CX + '" y="' + (y + 15) + '" font-size="12" text-anchor="middle" fill="#5b6b8c">' + (s.t === "area" ? fill(T.diagVert, {}) : fill(T.diagBot, { w: mm(Math.round(wb * 100) / 100) }) + " · " + (s.m ? fill(T.diagSlope, { m: mm(s.m) }) : T.diagVert)) + "</text>";
      if (s.t === "tr") {
        out += '<text x="' + CX + '" y="' + (y + 31) + '" font-size="12" text-anchor="middle" fill="#1f2f55">' + fill(T.diagArea, { a: q2(s.S) }) + "</text>";
        y += 16;
      }
      y += 30;
    });
    return '<div class="exc__sub">' + T.diagTitle + '</div><svg class="exc__diag" viewBox="0 0 ' + VW + " " + y.toFixed(0) + '" role="img" aria-label="' + T.diagAria + '">' + out + '</svg>' + (r.secs.some((s) => s.t === "pit") ? '<div class="exc__legend"><span>' + T.diagNote + "</span></div>" : "");
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="exc__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const n = r.secs.length;
    const head = '<div class="exc__kpiT">' + fill(T.title, { n: nf(n) + NB + pl(n, T.secW), s: soilName(), r: pct(r.res) }) + '</div><div class="exc__big">' + q1(r.V) + NB + M3 + '</div><div class="exc__chipWrap"><span class="exc__chip">' + T.chip + "</span></div>";
    const cost = r.hasPrice ? '<div class="exc__per"><div class="exc__kpiT">' + T.tCost + '</div><div class="exc__perV">' + money(r.cost) + '</div><div class="exc__kpiT exc__mt2">' + fill(T.perM3, { p: money(r.perM3) }) + "</div></div>" : "";
    const tripsTile = r.trips !== null ? tile(T.tTrips, nf(r.trips), r.tripsVol !== null && r.tripsMass !== null ? fill(T.tTripsMini, { a: nf(r.tripsVol), b: nf(r.tripsMass) }) : "") : tile(T.tTrips, "—", T.tTripsNone);
    const tiles = tile(T.tLoose, q1(r.loose) + NB + M3, fill(T.tLooseMini, { p: pct(r.bulk) })) + tile(T.tMass, q1(r.haulMass) + NB + (IS_EN ? "t" : "т"), fill(T.tMassMini, { d: nf(r.dens, r.dens % 1 ? 2 : 0) })) + tripsTile + tile(T.tHaul, q1(r.haulLoose) + NB + M3, r.keep > 0 ? fill(T.tHaulMini, { k: q1(Math.min(r.keep, r.V)) }) : "");
    const notes = T.note + (r.deep && r.mode === "norm" ? " " + T.noteDeep : "") + (r.mode === "custom" ? " " + T.noteCustomM : "");
    box.innerHTML =
      '<div class="exc__head"><div>' + head + (eq ? '<div class="exc__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      (r.hasPrice ? barHtml(r) : "") +
      '<div class="exc__kpis exc__kpis--4">' + tiles + "</div>" +
      diagramHtml(r) +
      '<div class="exc__note">' + notes + "</div>";
    el("schedBody").innerHTML = secTable(r) + (r.hasPrice ? '<div class="exc__sub">' + T.tCost + "</div>" + costTable(r) : "");
    sch.hidden = false;
    r.secs.forEach((s) => (el("ev" + s.i).textContent = fill(T.secInfo, { v: q1(s.V), m: s.t === "area" ? "—" : mm(s.m) })));
  }

  function calc(strict) {
    render(compute(), strict === true);
  }

  // ===== копіювання, CSV =====
  const tableMatrix = () => {
    const out = [];
    el("schedBody").querySelectorAll("table").forEach((t, k) => {
      if (k) out.push([]);
      Array.from(t.querySelectorAll("tr")).forEach((tr) => out.push(Array.from(tr.children).map((c) => c.textContent.replace(/ /g, " ").trim())));
    });
    return out;
  };
  async function copyTable() {
    try {
      await navigator.clipboard.writeText(tableMatrix().map((r) => r.join("\t")).join("\n"));
      toast(T.tableCopied);
    } catch {
      toast(T.copyFailed);
    }
  }
  function downloadCsv() {
    if (!last) return;
    const csv = "﻿" + tableMatrix().map((row) => row.map((c) => '"' + c.replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "earthworks.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    let txt = T.copyVol + ": " + q1(last.V) + " " + M3 + "; " + T.copyLoose + ": " + q1(last.loose) + " " + M3 + "; " + T.tMass + ": " + q1(last.haulMass) + " " + (IS_EN ? "t" : "т");
    if (last.trips !== null) txt += "; " + T.tTrips + ": " + nf(last.trips);
    if (last.hasPrice) txt += "; " + T.tCost + ": " + money(last.cost);
    try {
      await navigator.clipboard.writeText(txt);
      toast(T.resultCopied);
    } catch {
      toast(T.copyFailed);
    }
  }

  // ===== випадні списки =====
  function initDd(pre, onPick) {
    const btn = el(pre + "_btn"), list = el(pre + "_list");
    const items = () => Array.from(list.querySelectorAll("li"));
    const close = (focusBtn) => {
      list.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      if (focusBtn) btn.focus();
    };
    const open = () => {
      list.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      (items().find((li) => li.getAttribute("aria-selected") === "true") || items()[0]).focus();
    };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (list.hidden) open();
      else close();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        open();
      }
    });
    const pick = (li) => {
      onPick(li.dataset.v);
      close(true);
    };
    list.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-v]");
      if (li) pick(li);
    });
    list.addEventListener("keydown", (e) => {
      const all = items(), i = all.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); all[Math.min(all.length - 1, i + 1)].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); all[Math.max(0, i - 1)].focus(); }
      else if (e.key === "Home") { e.preventDefault(); all[0].focus(); }
      else if (e.key === "End") { e.preventDefault(); all[all.length - 1].focus(); }
      else if ((e.key === "Enter" || e.key === " ") && i >= 0) { e.preventDefault(); pick(all[i]); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") close();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#" + pre + "_dd")) close();
    });
  }
  // приховане значення → префікс списку
  const DDP = (hid) => (/^e\d_type$/.test(hid) ? "e" + hid[1] + "t" : hid === "soil" ? "sl" : "sk");
  function setDd(hid, v) {
    const pre = DDP(hid), lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }
  function applySoil(v) {
    const p = SOILS[v];
    if (!p) return;
    el("bulk").value = p.bulk;
    el("dens").value = p.dens;
    if (v === "custom" && el("slope").value === "norm") setDd("slope", "custom");
  }

  // ===== ділянки =====
  function syncSec(i) {
    const t = el(eId(i, "type")).value;
    el(eId(i, "p2")).closest(".exc__field").hidden = t === "area";
    el(eId(i, "p1_l")).textContent = t === "area" ? T.lbl.area + ", " + (IS_EN ? "m²" : "м²") : T.lbl.len + ", " + (IS_EN ? "m" : "м");
    el(eId(i, "p2_l")).textContent = (t === "tr" ? T.lbl.bot : T.lbl.wid) + ", " + (IS_EN ? "m" : "м");
    el("el" + i + "rm").hidden = visibleSecs().length < 2;
  }
  function syncAll() {
    visibleSecs().forEach((i, idx) => {
      syncSec(i);
      el("el" + i).querySelector(".exc__elHead span").textContent = fill(T.sec, { n: idx + 1 });
    });
    el("addEl").hidden = visibleSecs().length >= MAXE;
    el("mcWrap").hidden = el("slope").value !== "custom";
  }
  function addSec() {
    const i = Array.from({ length: MAXE }, (_, k) => k + 1).find((x) => el("el" + x).hidden);
    if (!i) return;
    el("el" + i).hidden = false;
    syncAll();
  }
  function removeSec(i) {
    if (visibleSecs().length < 2) return;
    clearSec(i);
    el("el" + i).hidden = true;
    syncAll();
  }
  function clearSec(i) {
    ["p1", "p2", "d"].forEach((k) => (el(eId(i, k)).value = ""));
    setDd(eId(i, "type"), "tr");
    el("ev" + i).textContent = "—";
  }

  // ===== валюта =====
  async function setCur(next, convert) {
    if (next === cur) return;
    const prev = cur;
    if (convert) {
      const need = [prev, next].filter((c) => c !== "UAH");
      await Promise.all(need.filter((c) => !rates[c]).map(loadRate));
      if (need.every((c) => rates[c])) {
        const toUah = (v, c) => (c === "UAH" ? v : v * rates[c]);
        const fromUah = (v, c) => (c === "UAH" ? v : v / rates[c]);
        PRICE_IDS.forEach((id) => {
          const v = num(id);
          if (v !== null && !Number.isNaN(v)) {
            const x = fromUah(toUah(v, prev), next);
            el(id).value = String(x >= 100 ? Math.round(x) : Math.round(x * 100) / 100);
          }
        });
      } else if (PRICE_IDS.some((id) => num(id) !== null)) toast(T.rateOff);
    }
    cur = next;
    syncCur();
  }
  function syncCur() {
    document.querySelectorAll("[data-wu]").forEach((n) => (n.textContent = SYM[cur]));
    el("cur_flag").src = "/assets/flags/" + { UAH: "ua", USD: "us", EUR: "eu" }[cur] + ".png";
    el("cur_code").textContent = cur;
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === cur)));
  }

  // ===== кнопки =====
  const FIELD_IDS = [].concat(
    ...Array.from({ length: MAXE }, (_, k) => ["p1", "p2", "d"].map((x) => eId(k + 1, x))),
    ["gap", "reserve", "bulk", "dens", "mc", "cap", "pay", "keep", "pEx", "pHaul", "pOth"]
  );
  const SAMPLE = { secs: [["tr", "40", "0.6", "1.8"], ["pit", "3", "2", "2.5"]], f: { gap: "0.3", reserve: "5", cap: "10", pay: "15", pEx: "150", pHaul: "1100" } };

  function setSecs(list) {
    for (let i = 1; i <= MAXE; i++) {
      clearSec(i);
      el("el" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, a, b, d], idx) => {
      const i = idx + 1;
      setDd(eId(i, "type"), t);
      el(eId(i, "p1")).value = a || "";
      el(eId(i, "p2")).value = b || "";
      el(eId(i, "d")).value = d || "";
    });
    syncAll();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    setDd("soil", "loam");
    setDd("slope", "norm");
    applySoil("loam");
    setSecs([]);
    el("haulDet").open = false;
    el("priceDet").open = false;
    syncAll();
    render({ ok: false, none: true });
  }
  function fillExample() {
    resetAll();
    if (cur !== "UAH") setCur("UAH", false);
    Object.entries(SAMPLE.f).forEach(([k, v]) => (el(k).value = v));
    setSecs(SAMPLE.secs);
    el("haulDet").open = true;
    el("priceDet").open = true;
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("cur", cur);
    p.set("soil", el("soil").value);
    p.set("slope", el("slope").value);
    visibleSecs().forEach((i, idx) => {
      p.set("e" + (idx + 1), [el(eId(i, "type")).value, raw(eId(i, "p1")) || "0", raw(eId(i, "p2")) || "0", raw(eId(i, "d")) || "0"].join(":"));
    });
    FIELD_IDS.filter((id) => !/^e\d_/.test(id)).forEach((id) => raw(id) && p.set(id, raw(id)));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    let any = false;
    if (["UAH", "USD", "EUR"].includes(q.get("cur"))) {
      cur = q.get("cur");
      syncCur();
    }
    if (q.has("soil")) setDd("soil", q.get("soil"));
    if (q.has("slope")) setDd("slope", q.get("slope"));
    const list = [];
    for (let i = 1; i <= MAXE; i++) {
      if (!q.has("e" + i)) continue;
      const [t, a, b, d] = q.get("e" + i).split(":");
      if (!["tr", "pit", "area"].includes(t)) continue;
      const z = (x) => (!x || x === "0" ? "" : x.slice(0, 10));
      list.push([t, z(a), z(b), z(d)]);
    }
    if (list.length) {
      setSecs(list);
      any = true;
    }
    FIELD_IDS.forEach((id) => {
      if (!/^e\d_/.test(id) && q.has(id)) {
        el(id).value = q.get(id).slice(0, 12);
        any = true;
      }
    });
    if (any) {
      el("haulDet").open = ["cap", "pay", "keep"].some((id) => raw(id) !== "");
      el("priceDet").open = ["pEx", "pHaul", "pOth"].some((id) => raw(id) !== "");
    }
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    FIELD_IDS.forEach((id) => {
      el(id).addEventListener("input", () => calc());
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc(true);
      });
    });
    initDd("sl", (v) => {
      setDd("soil", v);
      applySoil(v);
      syncAll();
      calc();
    });
    initDd("sk", (v) => {
      setDd("slope", v);
      syncAll();
      calc();
    });
    for (let i = 1; i <= MAXE; i++) {
      initDd("e" + i + "t", (v) => {
        setDd(eId(i, "type"), v);
        syncSec(i);
        calc();
      });
      el("el" + i + "rm").addEventListener("click", () => {
        removeSec(i);
        calc();
      });
    }
    el("addEl").addEventListener("click", addSec);
    ["haulDet", "priceDet"].forEach((id) => el(id).addEventListener("toggle", () => calc()));
    const curBtn = el("cur_btn"), curList = el("cur_list");
    const closeCur = () => {
      curList.hidden = true;
      curBtn.setAttribute("aria-expanded", "false");
    };
    curBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = curList.hidden;
      curList.hidden = !open;
      curBtn.setAttribute("aria-expanded", String(open));
    });
    curList.addEventListener("click", async (e) => {
      const li = e.target.closest("li[data-code]");
      if (!li) return;
      closeCur();
      await setCur(li.dataset.code, true);
      calc();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#cur_dd")) closeCur();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCur();
    });
    el("copyTbl").addEventListener("click", copyTable);
    el("csvBtn").addEventListener("click", downloadCsv);
    el("calcBtn").addEventListener("click", () => {
      const r = compute();
      render(r, true);
      if (!r.ok && r.msg) toast(r.msg);
    });
    el("copyBtn").addEventListener("click", copyResult);
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => {
      resetAll();
      toast(T.reset);
    });
    el("shareBtn").addEventListener("click", share);

    syncCur();
    const used = applyFromUrl();
    syncAll();
    Promise.all(["USD", "EUR"].map(loadRate)).then(() => last && render(last));
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
