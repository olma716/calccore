/* steel-weight-calculator.js — калькулятор ваги металу: до шести позицій (пруток, шестигранник, квадрат, смуга, лист, труби, кутник, швелер, двотавр), матеріал за густиною, запас, вага по позиціях, необов'язкова вартість (UK/EN, UAH/USD/EUR)
   Вага 1 м = площа перерізу × густина. Площі, мм²: круг π·d²/4; шестигранник √3/2·S²; квадрат a²; смуга w·t; труба π/4·(D² − (D−2t)²); профільна труба A·B − (A−2t)(B−2t); кутник t·(A+B−t) (без радіусів).
   Лист: вага = ширина × довжина × товщина × густина. Швелер і двотавр: кг/м із сортаменту (сталь 7850), для іншого матеріалу масштабується на густину/7850.
   Вага = кг/м × довжина × кількість; запас додається до загальної ваги. Вбудованих цін немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = " ";
  const MAXI = 6;
  const LIM = { price: { UAH: 1000000, USD: 25000, EUR: 25000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf", "#86a0d6", "#16a34a", "#aec1e6", "#7c8db5"];
  const PRICE_IDS = ["pr", "pDel"];
  const MATS = { steel: 7850, stainless: 7900, cast: 7200, alu: 2700, copper: 8960, brass: 8500, bronze: 8800, titan: 4500 };
  // сортамент, кг/м (сталь 7850): швелер ГОСТ 8240-97 серія У, двотавр ГОСТ 8239-89
  const CHANNEL = { "5": 4.842, "6.5": 5.899, "8": 7.049, "10": 8.594, "12": 10.43, "14": 12.29, "16": 14.23, "18": 16.26, "20": 18.37, "22": 20.98, "24": 24.06, "27": 27.66, "30": 31.78, "33": 36.53, "36": 41.91, "40": 48.32 };
  const IBEAM = { "10": 9.46, "12": 11.5, "14": 13.7, "16": 15.9, "18": 18.4, "20": 21.0, "22": 24.0, "24": 27.3, "27": 31.5, "30": 36.5, "33": 42.2, "36": 48.6, "40": 57.0, "45": 66.5, "50": 78.5, "55": 92.6, "60": 108.0 };
  const DEFNO = { channel: "12", ibeam: "20" };
  // поля розмірів за типом: ключі підписів
  const DIMS = { round: ["dia"], hex: ["hexS"], square: ["side"], flat: ["wid", "thk"], sheet: ["wid", "len", "thk"], pipe: ["od", "wall"], rect: ["sa", "sb", "wall"], angle: ["pa", "pb", "thk"], channel: [], ibeam: [] };

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errInt: "“{f}” must be a whole number.",
        errWall: "The wall must be thinner than half of the section.",
        errAngle: "The thickness must be smaller than both flanges.",
        errNoItem: "Enter the dimensions of at least one item.",
        errTotal: "The total is too large — check the dimensions.",
        item: "Item {n}", itemInfo: "{k} kg", itemInfoM: "{k} kg · {m} kg/m",
        types: { round: "Round bar / wire", hex: "Hexagon bar", square: "Square bar", flat: "Flat bar", sheet: "Sheet / plate", pipe: "Round pipe", rect: "Rectangular tube", angle: "Angle", channel: "Channel", ibeam: "I-beam" },
        names: { round: "Round bar", hex: "Hexagon", square: "Square", flat: "Flat bar", sheet: "Sheet", pipe: "Round pipe", rect: "Rectangular tube", angle: "Angle", channel: "Channel {n}U", ibeam: "I-beam {n}" },
        lbl: { dia: "Diameter", hexS: "Across flats S", side: "Side", wid: "Width", thk: "Thickness", len: "Length", od: "Outer diameter", wall: "Wall", sa: "Side A", sb: "Side B", pa: "Flange A", pb: "Flange B", L: "Length", q: "Quantity", kgm: "Mass per metre", dens: "Density", reserve: "Reserve", pr: "Price", pDel: "Delivery" },
        units: { mm: " mm", m: " m", kgm: " kg/m", dens: " kg/m³", reserve: " %", pcs: "" },
        custom: "Custom kg/m", noLabel: "{n} — {k} kg/m",
        title: "Metal · {n} · {m} · reserve {r}%", itemW: ["item", "items", "items"],
        tCost: "Cost", perKg: "{p} per kg", perT: "{p} per tonne",
        thItem: "Item", thSize: "Size", thQty: "Quantity", thKg: "Weight, kg", thKgm: "kg/m or kg/m²", thVol: "Volume, m³", thShare: "Share",
        rowNo: "Total (without reserve)", rowWith: "Total (with reserve)",
        thCostItem: "Item", thQtyC: "Quantity", thPrice: "Price", thSum: "Amount",
        rMetal: "Metal", rDel: "Delivery", rTotal: "Total", u: { kg: "kg", t: "t", m: "m", pcs: "pcs", m3: "m³" },
        barTitle: "Weight by item", barAria: "Weight by item",
        costBarTitle: "What the cost consists of",
        sizeRound: "Ø {d}", sizeHex: "S {d}", sizeSquare: "{d}×{d}", sizeSq: "{a}×{b}", sizeThree: "{a}×{b}×{c}", sizeKgm: "{k} kg/m", qtyL: "{q} × {l} m", qtyPcs: "{q} pcs",
        chipT: "{t} t",
        note: "An approximate calculation from the nominal dimensions: the real weight differs because of the tolerances, the radii and the coating. The mass of the channel and the I-beam is from the sortament for steel.",
        noteApprox: "The angle and the rectangular tube are counted without the radii of the corners, so the weight is slightly overstated.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅",
        copyMetal: "Metal"
      }
    : {
        enter: "Вкажіть дані — результат з'явиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errInt: "«{f}» має бути цілим числом.",
        errWall: "Стінка має бути тоншою за половину перерізу.",
        errAngle: "Товщина має бути меншою за обидві полиці.",
        errNoItem: "Вкажіть розміри хоча б однієї позиції.",
        errTotal: "Підсумок завеликий — перевірте розміри.",
        item: "Позиція {n}", itemInfo: "{k} кг", itemInfoM: "{k} кг · {m} кг/м",
        types: { round: "Круглий пруток / дріт", hex: "Шестигранник", square: "Квадрат", flat: "Смуга", sheet: "Лист / плита", pipe: "Труба кругла", rect: "Профільна труба", angle: "Кутник", channel: "Швелер", ibeam: "Двотавр" },
        names: { round: "Круглий пруток", hex: "Шестигранник", square: "Квадрат", flat: "Смуга", sheet: "Лист", pipe: "Труба кругла", rect: "Профільна труба", angle: "Кутник", channel: "Швелер {n}У", ibeam: "Двотавр {n}" },
        lbl: { dia: "Діаметр", hexS: "Розмір під ключ S", side: "Сторона", wid: "Ширина", thk: "Товщина", len: "Довжина", od: "Зовнішній діаметр", wall: "Стінка", sa: "Сторона A", sb: "Сторона B", pa: "Полиця A", pb: "Полиця B", L: "Довжина", q: "Кількість", kgm: "Маса 1 м", dens: "Густина", reserve: "Запас", pr: "Ціна", pDel: "Доставка" },
        units: { mm: " мм", m: " м", kgm: " кг/м", dens: " кг/м³", reserve: " %", pcs: "" },
        custom: "Свій кг/м", noLabel: "{n} — {k} кг/м",
        title: "Метал · {n} · {m} · запас {r}%", itemW: ["позиція", "позиції", "позицій"],
        tCost: "Вартість", perKg: "{p} за кг", perT: "{p} за тонну",
        thItem: "Позиція", thSize: "Розмір", thQty: "Кількість", thKg: "Вага, кг", thKgm: "кг/м або кг/м²", thVol: "Об'єм, м³", thShare: "Частка",
        rowNo: "Разом (без запасу)", rowWith: "Разом (із запасом)",
        thCostItem: "Позиція", thQtyC: "Кількість", thPrice: "Ціна", thSum: "Сума",
        rMetal: "Метал", rDel: "Доставка", rTotal: "Разом", u: { kg: "кг", t: "т", m: "м", pcs: "шт", m3: "м³" },
        barTitle: "Вага по позиціях", barAria: "Вага по позиціях",
        costBarTitle: "З чого складається вартість",
        sizeRound: "Ø {d}", sizeHex: "S {d}", sizeSquare: "{d}×{d}", sizeSq: "{a}×{b}", sizeThree: "{a}×{b}×{c}", sizeKgm: "{k} кг/м", qtyL: "{q} × {l} м", qtyPcs: "{q} шт",
        chipT: "{t} т",
        note: "Орієнтовний розрахунок за номінальними розмірами: реальна вага відрізняється через допуски, радіуси й покриття. Маса швелера й двотавра взята із сортаменту для сталі.",
        noteApprox: "Кутник і профільна труба рахуються без радіусів заокруглень, тому вага трохи завищена.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅",
        copyMetal: "Метал"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const nf = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d + 0).toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });
  const q1 = (x) => nf(x, 1);
  const q2 = (x) => nf(x, 2);
  const q3 = (x) => nf(x, 3);
  const g = (x) => (Math.round(x * 1000) / 1000).toLocaleString(LOC, { maximumFractionDigits: 3, useGrouping: false });
  const pct = (x) => nf(x, x % 1 ? 1 : 0);
  const lim = (x) => (x % 1 ? String(x).replace(".", IS_EN ? "." : ",") : nf(x));
  const pl = (n, w) => {
    if (IS_EN) return n === 1 ? w[0] : w[2];
    const a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? w[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? w[1] : w[2];
  };
  let cur = "UAH";
  const money = (x, c = cur) => (IS_EN ? SYM[c] + nf(x) : nf(x) + NB + SYM[c]);
  const unitMoney = (x) => (Number.isInteger(x) || x >= 100 ? money(x) : IS_EN ? SYM[cur] + q2(x) : q2(x) + NB + SYM[cur]);
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
  const iId = (i, k) => "m" + i + "_" + k;
  const visibleItems = () => Array.from({ length: MAXI }, (_, k) => k + 1).filter((i) => !el("il" + i).hidden);
  const MAXKG = 1e12;

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
  function val(id, label, lo, hi, required, int, unit) {
    const v = num(id);
    if (v === null) return required ? { miss: label } : { v: null };
    if (Number.isNaN(v)) return { err: fill(T.errNum, { f: label }) };
    if (int && v % 1) return { err: fill(T.errInt, { f: label }) };
    if (v < lo || v > hi) return { err: fill(T.errRange, { f: label, a: lim(lo), b: lim(hi), u: unit || "" }) };
    return { v };
  }
  const density = () => (el("matl").value === "custom" ? num("dens") : MATS[el("matl").value]);

  // площа перерізу, мм²
  function sectionArea(type, d) {
    if (type === "round") return (Math.PI * d[0] * d[0]) / 4;
    if (type === "hex") return (Math.sqrt(3) / 2) * d[0] * d[0];
    if (type === "square") return d[0] * d[0];
    if (type === "flat") return d[0] * d[1];
    if (type === "pipe") return (Math.PI / 4) * (d[0] * d[0] - (d[0] - 2 * d[1]) ** 2);
    if (type === "rect") return d[0] * d[1] - (d[0] - 2 * d[2]) * (d[1] - 2 * d[2]);
    if (type === "angle") return d[2] * (d[0] + d[1] - d[2]);
    return NaN;
  }
  const sizeText = (type, d, kgm) => {
    const x = (v) => g(v);
    if (type === "round") return fill(T.sizeRound, { d: x(d[0]) });
    if (type === "hex") return fill(T.sizeHex, { d: x(d[0]) });
    if (type === "square") return fill(T.sizeSquare, { d: x(d[0]) });
    if (type === "flat") return fill(T.sizeSq, { a: x(d[0]), b: x(d[1]) });
    if (type === "pipe") return fill(T.sizeSq, { a: x(d[0]), b: x(d[1]) });
    if (type === "sheet" || type === "rect" || type === "angle") return fill(T.sizeThree, { a: x(d[0]), b: x(d[1]), c: x(d[2]) });
    return fill(T.sizeKgm, { k: x(kgm) });
  };

  function compute() {
    let err = null;
    const miss = [];
    const note = (r) => {
      if (r.miss) miss.push(r.miss);
      if (r.err && !err) err = r.err;
      return r;
    };
    const matl = el("matl").value;
    const dens = matl === "custom" ? note(val("dens", T.lbl.dens, 100, 25000, true, false, T.units.dens)).v : MATS[matl];
    const res = note(val("reserve", T.lbl.reserve, 0, 50, false, false, T.units.reserve)).v || 0;
    const items = [];
    visibleItems().forEach((i, idx) => {
      const type = el(iId(i, "type")).value;
      const used = ["d1", "d2", "d3", "L", "q"].some((k) => raw(iId(i, k)) !== "");
      if (!used) return;
      const name = fill(T.item, { n: idx + 1 }) + ": ";
      const keys = DIMS[type];
      const d = [];
      const ranges = { dia: [0.1, 2000], hexS: [0.1, 2000], side: [0.1, 2000], wid: [0.1, 20000], thk: [0.05, 500], len: [1, 20000], od: [1, 5000], wall: [0.05, 500], sa: [1, 5000], sb: [1, 5000], pa: [1, 2000], pb: [1, 2000] };
      keys.forEach((k, j) => {
        const rg = ranges[k];
        d.push(note(val(iId(i, "d" + (j + 1)), name + T.lbl[k], rg[0], rg[1], true, false, T.units.mm)).v);
      });
      let kgm = null, noKey = null;
      if (type === "channel" || type === "ibeam") {
        noKey = el(iId(i, "no")).value;
        if (noKey === "custom") kgm = note(val(iId(i, "d1"), name + T.lbl.kgm, 0.01, 2000, true, false, T.units.kgm)).v;
        else kgm = (type === "channel" ? CHANNEL : IBEAM)[noKey] * (dens / 7850);
      }
      const L = type === "sheet" ? null : note(val(iId(i, "L"), name + T.lbl.L, 0.01, 100000, true, false, T.units.m)).v;
      const q = note(val(iId(i, "q"), name + T.lbl.q, 1, 1000000, false, true)).v || 1;
      if (!miss.length && !err && dens) {
        if (type === "pipe" && !(d[0] > 2 * d[1])) { err = name + T.errWall; return; }
        if (type === "rect" && !(d[0] > 2 * d[2] && d[1] > 2 * d[2])) { err = name + T.errWall; return; }
        if (type === "angle" && !(d[2] < d[0] && d[2] < d[1])) { err = name + T.errAngle; return; }
        let kg, kgPer, length = 0, vol, approx = type === "angle" || type === "rect";
        if (type === "sheet") {
          const volPc = d[0] * d[1] * d[2] * 1e-9;
          kg = volPc * dens * q;
          kgPer = d[2] * 1e-3 * dens; // кг/м²
          vol = volPc * q;
        } else {
          kgm = kgm !== null ? kgm : sectionArea(type, d) * 1e-6 * dens;
          kg = kgm * L * q;
          kgPer = kgm;
          length = L * q;
          vol = kg / dens;
        }
        items.push({ i, idx, type, name: noKey && noKey !== "custom" ? fill(T.names[type], { n: noKey }) : noKey ? T.types[type] : T.names[type], size: sizeText(type, d, kgm), d, L, q, kg, kgPer, length, vol, approx, qtyTxt: type === "sheet" ? fill(T.qtyPcs, { q: nf(q) }) : fill(T.qtyL, { q: nf(q), l: g(L) }), per: type === "sheet" ? "kg/m²" : "kg/m" });
      }
    });
    const P = {
      unit: el("punit").value,
      price: note(val("pr", T.lbl.pr, 0, LIM.price[cur], false)).v,
      del: note(val("pDel", T.lbl.pDel, 0, LIM.fixed, false)).v || 0
    };
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!items.length) return { ok: false, incomplete: true, none: true, msg: T.errNoItem };
    let kgNo = 0, volNo = 0, lenNo = 0;
    items.forEach((x) => {
      kgNo += x.kg;
      volNo += x.vol;
      lenNo += x.length;
    });
    if (kgNo > MAXKG) return { ok: false, msg: T.errTotal };
    const f = 1 + res / 100, kgWith = kgNo * f;
    const R = { ok: true, cur, matl, dens, items, res, kgNo, kgWith, volNo, lenNo, P, approx: items.some((x) => x.approx) };
    const metalSum = P.price ? (P.unit === "t" ? (kgWith / 1000) * P.price : kgWith * P.price) : 0;
    R.lines = [{ k: "rMetal", qty: P.unit === "t" ? kgWith / 1000 : kgWith, unit: P.unit === "t" ? "t" : "kg", price: P.price, sum: metalSum }];
    R.cost = metalSum + P.del;
    R.hasPrice = R.cost > 0;
    R.perKg = R.hasPrice ? R.cost / kgWith : 0;
    return R;
  }

  // ===== відображення =====
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  const matName = () => el("mt_val").textContent.split(" — ")[0];
  const kgTxt = (x) => (x >= 100 ? nf(x, 1) : x >= 1 ? q2(x) : q3(x));

  function posBar(r) {
    const seg = r.items.map((x, k) => '<div style="width:' + ((x.kg / r.kgNo) * 100).toFixed(3) + "%;background:" + COLORS[k % COLORS.length] + '" title="' + x.name + ": " + kgTxt(x.kg) + " " + T.u.kg + '"></div>').join("");
    return '<div class="stw__sub">' + T.barTitle + '</div><div class="stw__bar" role="img" aria-label="' + T.barAria + '">' + seg + "</div>";
  }
  function resultTable(r) {
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thQty + "</th><th>" + T.thKg + "</th></tr></thead>";
    const body = r.items.map((x, k) => '<tr><td><i class="stw__dot" style="background:' + COLORS[k % COLORS.length] + '"></i>' + x.name + '<span class="stw__sz">' + x.size + "</span></td><td>" + x.qtyTxt + "</td><td>" + kgTxt(x.kg) + "</td></tr>").join("");
    return '<div class="stw__tableWrap"><table class="stw__tbl stw__tbl--res">' + head + "<tbody>" + body + '<tr class="stw__total"><td>' + T.rowNo + "</td><td></td><td>" + kgTxt(r.kgNo) + "</td></tr></tbody></table></div>";
  }
  function detailTable(r) {
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thSize + "</th><th>" + T.thKgm + "</th><th>" + T.thQty + "</th><th>" + T.thKg + "</th><th>" + T.thVol + "</th><th>" + T.thShare + "</th></tr></thead>";
    const body = r.items.map((x) => "<tr><td>" + x.name + "</td><td>" + x.size + "</td><td>" + g(x.kgPer) + "</td><td>" + x.qtyTxt + "</td><td>" + kgTxt(x.kg) + "</td><td>" + nf(x.vol, 5) + "</td><td>" + pct(Math.round((x.kg / r.kgNo) * 1000) / 10) + "%</td></tr>").join("");
    let tot = '<tr class="stw__total"><td>' + T.rowNo + "</td><td></td><td></td><td></td><td>" + kgTxt(r.kgNo) + "</td><td>" + nf(r.volNo, 5) + "</td><td>100%</td></tr>";
    if (r.res > 0) tot += '<tr class="stw__total"><td>' + T.rowWith + "</td><td></td><td></td><td></td><td>" + kgTxt(r.kgWith) + "</td><td></td><td></td></tr>";
    return '<table class="stw__tbl stw__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + tot + "</tbody></table>";
  }
  function costTable(r) {
    const head = "<thead><tr><th>" + T.thCostItem + "</th><th>" + T.thQtyC + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const qty = (x) => (x.unit === "t" ? q3(x.qty) + NB + T.u.t : kgTxt(x.qty) + NB + T.u.kg);
    let body = r.lines.map((x) => "<tr><td>" + T[x.k] + "</td><td>" + qty(x) + "</td><td>" + (x.price ? unitMoney(x.price) + " / " + (x.unit === "t" ? T.u.t : T.u.kg) : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.P.del) body += "<tr><td>" + T.rDel + "</td><td></td><td></td><td>" + money(r.P.del) + "</td></tr>";
    if (r.hasPrice) body += '<tr class="stw__total"><td>' + T.rTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="stw__tbl stw__tbl--sch" id="costTable">' + head + "<tbody>" + body + "</tbody></table>";
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="stw__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const n = r.items.length;
    const head = '<div class="stw__kpiT">' + fill(T.title, { n: nf(n) + NB + pl(n, T.itemW), m: matName(), r: pct(r.res) }) + '</div><div class="stw__big">' + kgTxt(r.kgWith) + NB + T.u.kg + '</div><div class="stw__chipWrap"><span class="stw__chip">' + fill(T.chipT, { t: q3(r.kgWith / 1000) }) + "</span></div>";
    const cost = r.hasPrice ? '<div class="stw__per"><div class="stw__kpiT">' + T.tCost + '</div><div class="stw__perV">' + money(r.cost) + '</div><div class="stw__kpiT stw__mt2">' + (r.P.unit === "t" ? fill(T.perT, { p: money(r.cost / (r.kgWith / 1000)) }) : fill(T.perKg, { p: unitMoney(r.perKg) })) + "</div></div>" : "";
    box.innerHTML =
      '<div class="stw__head"><div>' + head + (eq ? '<div class="stw__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      posBar(r) +
      resultTable(r) +
      '<div class="stw__note">' + T.note + (r.approx ? " " + T.noteApprox : "") + "</div>";
    el("schedBody").innerHTML = detailTable(r) + (r.hasPrice ? '<div class="stw__sub">' + T.tCost + "</div>" + costTable(r) : "");
    sch.hidden = false;
    r.items.forEach((x) => (el("mv" + x.i).textContent = x.type === "sheet" ? fill(T.itemInfo, { k: kgTxt(x.kg) }) : fill(T.itemInfoM, { k: kgTxt(x.kg), m: g(x.kgPer) })));
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
    a.download = "metal-weight.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    let txt = T.copyMetal + ": " + kgTxt(last.kgWith) + " " + T.u.kg + " (" + q3(last.kgWith / 1000) + " " + T.u.t + ")";
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
  const DDP = (hid) => (/^m\d_type$/.test(hid) ? "m" + hid[1] + "t" : /^m\d_no$/.test(hid) ? "m" + hid[1] + "n" : hid === "matl" ? "mt" : "pu");
  function setDd(hid, v) {
    const pre = DDP(hid), lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }

  // ===== переріз профілю: схематичний малюнок з розмірами, оновлюється при введенні =====
  function profileSvg(type, d, no) {
    const S = "#283b69", F = 'fill="#86a0d6" fill-opacity="0.35" stroke="' + S + '" stroke-width="1.6"';
    const tx = (x, y, s, a) => '<text x="' + x + '" y="' + y + '" font-size="12" font-weight="700" text-anchor="' + (a || "middle") + '" fill="#5b6b8c">' + s + "</text>";
    const v = (i, sym) => (d[i] ? sym + " " + g(d[i]) : sym);
    const ln = (x1, y1, x2, y2) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#5b6b8c" stroke-width="1" stroke-dasharray="3 3"/>';
    let o = "";
    if (type === "round") o = '<circle cx="100" cy="46" r="34" ' + F + "/>" + ln(66, 46, 134, 46) + tx(100, 104, v(0, "Ø"));
    else if (type === "hex") o = '<polygon points="136,46 118,77.2 82,77.2 64,46 82,14.8 118,14.8" ' + F + "/>" + ln(100, 14.8, 100, 77.2) + tx(110, 98, v(0, "S"));
    else if (type === "square") o = '<rect x="66" y="12" width="68" height="68" ' + F + "/>" + tx(100, 100, v(0, "a"));
    else if (type === "flat") o = '<rect x="40" y="36" width="120" height="24" ' + F + "/>" + tx(100, 28, v(0, "b")) + tx(168, 52, v(1, "t"), "start");
    else if (type === "sheet") o = '<rect x="40" y="16" width="120" height="62" ' + F + "/>" + tx(100, 11, v(0, "b")) + tx(168, 50, v(1, "l"), "start") + tx(100, 100, v(2, "t"));
    else if (type === "pipe") o = '<circle cx="100" cy="46" r="34" ' + F + '/><circle cx="100" cy="46" r="24" fill="#fff" stroke="' + S + '" stroke-width="1.6"/>' + tx(100, 104, v(0, "D")) + tx(142, 50, v(1, "t"), "start");
    else if (type === "rect") o = '<rect x="44" y="16" width="112" height="62" rx="6" ' + F + '/><rect x="56" y="28" width="88" height="38" fill="#fff" stroke="' + S + '" stroke-width="1.6"/>' + tx(100, 11, v(0, "A")) + tx(162, 50, v(1, "B"), "start") + tx(100, 100, v(2, "t"));
    else if (type === "angle") o = '<polygon points="70,12 88,12 88,60 140,60 140,78 70,78" ' + F + "/>" + tx(62, 50, v(0, "A"), "end") + tx(105, 100, v(1, "B")) + tx(148, 72, v(2, "t"), "start");
    else if (type === "channel") o = '<polygon points="60,12 132,12 132,25 76,25 76,63 132,63 132,76 60,76" ' + F + "/>" + tx(100, 100, no ? no : "");
    else if (type === "ibeam") o = '<polygon points="56,12 144,12 144,25 106,25 106,63 144,63 144,76 56,76 56,63 94,63 94,25 56,25" ' + F + "/>" + tx(100, 100, no ? no : "");
    return '<svg class="stw__profSvg" viewBox="0 0 200 110" aria-hidden="true">' + o + "</svg>";
  }
  function drawProfile(i) {
    const type = el(iId(i, "type")).value;
    const keys = DIMS[type];
    const d = keys.map((_, j) => num(iId(i, "d" + (j + 1))));
    const dd = d.map((x) => (x && !Number.isNaN(x) ? x : 0));
    let no = "";
    if (type === "channel" || type === "ibeam") {
      const k = el(iId(i, "no")).value;
      no = k === "custom" || !k ? (IS_EN ? "kg/m" : "кг/м") : type === "channel" ? k + (IS_EN ? "U" : "У") : k;
    }
    el("mp" + i).innerHTML = profileSvg(type, dd, no);
  }

  // ===== позиції =====
  // список номерів сортаменту для швелера / двотавра будується при виборі типу
  function buildNoList(i, type) {
    const tbl = type === "channel" ? CHANNEL : IBEAM;
    const list = el("m" + i + "n_list");
    const keys = Object.keys(tbl).sort((a, b) => Number(a) - Number(b));
    list.innerHTML = keys.map((k) => '<li role="option" tabindex="-1" data-v="' + k + '" aria-selected="false">' + fill(T.noLabel, { n: type === "channel" ? k + (IS_EN ? "U" : "У") : k, k: g(tbl[k]).replace(".", IS_EN ? "." : ",") }) + "</li>").join("") + '<li role="option" tabindex="-1" data-v="custom" aria-selected="false">' + T.custom + "</li>";
  }
  function syncItem(i) {
    const type = el(iId(i, "type")).value;
    const keys = DIMS[type];
    const sheet = type === "sheet", sortament = type === "channel" || type === "ibeam";
    [1, 2, 3].forEach((j) => {
      const w = el(iId(i, "f" + j));
      const k = keys[j - 1];
      w.hidden = !k;
      if (k) el(iId(i, "l" + j)).textContent = T.lbl[k] + ", " + (IS_EN ? "mm" : "мм");
    });
    el(iId(i, "fno")).hidden = !sortament;
    if (sortament) {
      if (el("m" + i + "n_list").dataset.type !== type) {
        buildNoList(i, type);
        el("m" + i + "n_list").dataset.type = type;
        el(iId(i, "no")).value = "";
      }
      if (!el(iId(i, "no")).value) setDd(iId(i, "no"), DEFNO[type]);
      const custom = el(iId(i, "no")).value === "custom";
      el(iId(i, "f1")).hidden = !custom;
      if (custom) el(iId(i, "l1")).textContent = T.lbl.kgm + ", " + (IS_EN ? "kg/m" : "кг/м");
    }
    el(iId(i, "fL")).hidden = sheet;
    el("il" + i + "rm").hidden = visibleItems().length < 2;
    drawProfile(i);
  }
  function syncAll() {
    visibleItems().forEach((i, idx) => {
      syncItem(i);
      el("il" + i).querySelector(".stw__elHead span").textContent = fill(T.item, { n: idx + 1 });
    });
    el("addIt").hidden = visibleItems().length >= MAXI;
    el("densWrap").hidden = el("matl").value !== "custom";
  }
  function addItem() {
    const i = Array.from({ length: MAXI }, (_, k) => k + 1).find((x) => el("il" + x).hidden);
    if (!i) return;
    el("il" + i).hidden = false;
    syncAll();
  }
  function removeItem(i) {
    if (visibleItems().length < 2) return;
    clearItem(i);
    el("il" + i).hidden = true;
    syncAll();
  }
  function clearItem(i) {
    ["d1", "d2", "d3", "L", "q"].forEach((k) => (el(iId(i, k)).value = ""));
    setDd(iId(i, "type"), "round");
    el(iId(i, "no")).value = "";
    el("m" + i + "n_list").dataset.type = "";
    el("mv" + i).textContent = "—";
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
    ...Array.from({ length: MAXI }, (_, k) => ["d1", "d2", "d3", "L", "q"].map((x) => iId(k + 1, x))),
    ["dens", "reserve", "pr", "pDel"]
  );
  const SAMPLE = { items: [["pipe", "57", "3", "", "6", "10", ""], ["channel", "", "", "", "6", "4", "12"], ["sheet", "1250", "2500", "3", "", "2", ""]], f: { reserve: "5", pr: "38" } };

  function setItems(list) {
    for (let i = 1; i <= MAXI; i++) {
      clearItem(i);
      el("il" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, a, b, c, L, q, no], idx) => {
      const i = idx + 1;
      setDd(iId(i, "type"), t);
      el(iId(i, "d1")).value = a || "";
      el(iId(i, "d2")).value = b || "";
      el(iId(i, "d3")).value = c || "";
      el(iId(i, "L")).value = L || "";
      el(iId(i, "q")).value = q || "";
      syncItem(i);
      if (no) {
        setDd(iId(i, "no"), no);
        syncItem(i);
      }
    });
    syncAll();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    setDd("matl", "steel");
    setDd("punit", "kg");
    setItems([]);
    el("priceDet").open = false;
    syncAll();
    render({ ok: false, none: true });
  }
  function fillExample() {
    resetAll();
    if (cur !== "UAH") setCur("UAH", false);
    Object.entries(SAMPLE.f).forEach(([k, v]) => (el(k).value = v));
    setItems(SAMPLE.items);
    el("priceDet").open = true;
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("cur", cur);
    p.set("mat", el("matl").value);
    p.set("pu", el("punit").value);
    visibleItems().forEach((i, idx) => {
      const t = el(iId(i, "type")).value;
      p.set("m" + (idx + 1), [t, raw(iId(i, "d1")) || "0", raw(iId(i, "d2")) || "0", raw(iId(i, "d3")) || "0", raw(iId(i, "L")) || "0", raw(iId(i, "q")) || "0", t === "channel" || t === "ibeam" ? el(iId(i, "no")).value : ""].join(":"));
    });
    FIELD_IDS.filter((id) => !/^m\d_/.test(id)).forEach((id) => raw(id) && p.set(id, raw(id)));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    let any = false;
    if (["UAH", "USD", "EUR"].includes(q.get("cur"))) {
      cur = q.get("cur");
      syncCur();
    }
    if (q.has("mat")) setDd("matl", q.get("mat"));
    if (q.has("pu")) setDd("punit", q.get("pu"));
    const list = [];
    for (let i = 1; i <= MAXI; i++) {
      if (!q.has("m" + i)) continue;
      const [t, a, b, c, L, qt, no] = q.get("m" + i).split(":");
      if (!Object.keys(DIMS).includes(t)) continue;
      const z = (x) => (!x || x === "0" ? "" : x.slice(0, 10));
      list.push([t, z(a), z(b), z(c), z(L), z(qt), no || ""]);
    }
    if (list.length) {
      setItems(list);
      any = true;
    }
    FIELD_IDS.forEach((id) => {
      if (!/^m\d_/.test(id) && q.has(id)) {
        el(id).value = q.get(id).slice(0, 12);
        any = true;
      }
    });
    if (any) el("priceDet").open = ["pr", "pDel"].some((id) => raw(id) !== "");
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    FIELD_IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        const m = /^m(\d)_d\d$/.exec(id);
        if (m) drawProfile(Number(m[1]));
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc(true);
      });
    });
    initDd("mt", (v) => {
      setDd("matl", v);
      syncAll();
      calc();
    });
    initDd("pu", (v) => {
      setDd("punit", v);
      calc();
    });
    for (let i = 1; i <= MAXI; i++) {
      initDd("m" + i + "t", (v) => {
        setDd(iId(i, "type"), v);
        syncItem(i);
        calc();
      });
      initDd("m" + i + "n", (v) => {
        setDd(iId(i, "no"), v);
        syncItem(i);
        calc();
      });
      el("il" + i + "rm").addEventListener("click", () => {
        removeItem(i);
        calc();
      });
    }
    el("addIt").addEventListener("click", addItem);
    el("priceDet").addEventListener("toggle", () => calc());
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
