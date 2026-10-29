/* roofing-calculator.js — калькулятор даху: до шести дахів (двосхилий, чотирисхилий з однаковим кутом, односхилий), площа скатів з точною геометрією (прямокутники, трапеції, трикутники), висота коника, коник, карнизи, фронтони, ребра вальми, покриття листове або штучне з запасом, необов'язкові планки, обрешітка, мембрана й вартість (UK/EN, UAH/USD/EUR)
   Скат: довжина по схилу s = (горизонтальний проліт до коника) / cos(кут). Двосхилий: 2 прямокутники L' × s, L' = L + 2·звис фронтону, проліт = W/2 + звис карниза. Чотирисхилий (a ≥ b, проліт = b/2 + звис): 2 трапеції (основа a + 2·звис, верх a − b) і 2 трикутники (основа b + 2·звис); коник a − b; ребро вальми = проліт · sqrt(2 + tan²). Односхилий: прямокутник L' × s, проліт = W + 2·звис.
   Площа скату = (основа + верх) / 2 · s; сума збігається з (план з звисами) / cos. Листи: колонок = ceil(основа / корисна ширина), рядів = 1 при s ≤ довжини листа, інакше ceil((s − нахльост) / (довжина − нахльост)); «під розмір скату»: колонки з довжиною s. Штучне: ceil(площа · (1 + запас) / площа одиниці).
   Обрешітка: рядів floor(s / крок) + 1, довжина ряду = основа − (основа − верх) · x / s. Мембрана: ceil(площа · (1 + нахльост) / площа рулона). Вбудованих цін і норм немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = " ";
  const MAXN = 6;
  const LIM = { price: { UAH: 10000000, USD: 250000, EUR: 250000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf", "#9fb4e0", "#c9d4ec", "#7f9ad0"];
  const PRICE_IDS = ["pCover", "pTrim", "pBat", "pMem", "pDel"];
  const TYPES = ["gable", "hip", "shed"];
  const COVERS = ["sheet", "unit"];
  const CUTS = ["fixed", "cut"];
  const PUS = ["piece", "m2"];
  const ce = (x) => Math.ceil(x - 1e-9);
  const EPS = 1e-9;

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errOv: "The overlap must be smaller than the sheet length.",
        errCover: "Enter the parameters of the covering to price it.",
        errTrim: "Enter the length of a trim piece to price the trims.",
        errBat: "Enter the batten step and the board length to price the boards.",
        errMem: "Enter the area of a roll of the membrane to price it.",
        errTotal: "The total is too large — check the dimensions.",
        errNoPos: "Enter the data of at least one roof.",
        item: "Roof {n}", itemInfo: "{a} m²",
        lbl: { a: "House length", b: "House width", p: "Pitch", oe: "Eaves overhang", og: "Gable overhang", sw: "Useful width of a sheet", sl: "Sheet length", ov: "Overlap", ua: "Useful area of a unit", reserve: "Reserve", plen: "Trim length", bst: "Batten step", blen: "Board length", mroll: "Roll area", mov: "Membrane overlap", pCover: "Covering price", pTrim: "Trim price", pBat: "Board price", pMem: "Roll price", pDel: "Delivery" },
        units: { a: " m", b: " m", p: "°", oe: " m", og: " m", sw: " m", sl: " m", ov: " m", ua: " m²", reserve: " %", plen: " m", bst: " cm", blen: " m", mroll: " m²", mov: " %" },
        types: { gable: "Gable", hip: "Hip (equal pitch)", shed: "Shed" },
        title: "Roof · {n} · {c} · reserve {r}%",
        roofW: ["roof", "roofs", "roofs"], sheetW: ["sheet", "sheets", "sheets"], unitW: ["unit", "units", "units"], pieceW: ["piece", "pieces", "pieces"], boardW: ["board", "boards", "boards"], rollW: ["roll", "rolls", "rolls"],
        covSheet: "sheets {w} × {l} m", covSheetCut: "sheets {w} m cut to the slope", covUnit: "units of {a} m²", covNone: "covering not set",
        chipCover: "{n} {w} · {d}", chipNone: "Covering not set",
        tPlan: "Plan area with overhangs", tRidge: "Ridge", tEaves: "Eaves", tRakes: "Gable edges", tHips: "Hip edges", tBase: "Without reserve", tBat: "Battens", tMem: "Membrane", tCoverArea: "Covering bought",
        tCost: "Cost", perM2: "{p} per m² of roof",
        vTitle: "Plan, section and the area by slopes", vPlan: "Plan", vSec: "Section",
        vRow: "{n} · {t} · {a} × {b} m · pitch {p}° · ridge height {h} m · {k} m²", vOver: "overhang {o} m",
        gLong: "long slopes", gEnd: "end slopes", gSlope: "slope", gAll: "slopes",
        thRoof: "Roof", thType: "Type", thSize: "Size, m", thPitch: "Pitch", thArea: "Area, m²", thH: "Ridge height, m", thRidge: "Ridge, m", thEaves: "Eaves, m", thRakes: "Gable edges, m", thHips: "Hip edges, m",
        rowTotal: "Total",
        thCostItem: "Item", thQty: "Quantity", thPrice: "Price", thSum: "Amount",
        rCover: "Covering", rTrim: "Trims (ridge, eaves, edges)", rBat: "Battens", rMem: "Membrane", rDel: "Delivery", rTotal: "Total", per: { piece: "piece", m2: "m²", board: "board", roll: "roll" },
        note: "An approximate estimate: all slopes of a hip roof have the same pitch. Sheets over trapezoid and triangular slopes are counted by the base, so the sheets are a safe upper estimate. Valleys, dormers, chimneys and the wastage at the ridge are not counted.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅",
        copyR: "Roof", m: "m", m2: "m²"
      }
    : {
        enter: "Вкажіть дані — результат з'явиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errOv: "Нахльост має бути меншим за довжину листа.",
        errCover: "Вкажіть параметри покриття, щоб порахувати його вартість.",
        errTrim: "Вкажіть довжину планки, щоб порахувати вартість планок.",
        errBat: "Вкажіть крок обрешітки й довжину дошки, щоб порахувати дошки.",
        errMem: "Вкажіть площу рулона мембрани, щоб порахувати її.",
        errTotal: "Підсумок завеликий — перевірте розміри.",
        errNoPos: "Вкажіть дані хоча б одного даху.",
        item: "Дах {n}", itemInfo: "{a} м²",
        lbl: { a: "Довжина будинку", b: "Ширина будинку", p: "Кут нахилу", oe: "Звис карниза", og: "Звис фронтону", sw: "Корисна ширина листа", sl: "Довжина листа", ov: "Нахльост", ua: "Корисна площа одиниці", reserve: "Запас", plen: "Довжина планки", bst: "Крок обрешітки", blen: "Довжина дошки", mroll: "Площа рулона", mov: "Нахльост мембрани", pCover: "Ціна покриття", pTrim: "Ціна планки", pBat: "Ціна дошки", pMem: "Ціна рулона", pDel: "Доставка" },
        units: { a: " м", b: " м", p: "°", oe: " м", og: " м", sw: " м", sl: " м", ov: " м", ua: " м²", reserve: " %", plen: " м", bst: " см", blen: " м", mroll: " м²", mov: " %" },
        types: { gable: "Двосхилий", hip: "Чотирисхилий (однаковий кут)", shed: "Односхилий" },
        title: "Дах · {n} · {c} · запас {r}%",
        roofW: ["дах", "дахи", "дахів"], sheetW: ["лист", "листи", "листів"], unitW: ["одиниця", "одиниці", "одиниць"], pieceW: ["шт", "шт", "шт"], boardW: ["дошка", "дошки", "дошок"], rollW: ["рулон", "рулони", "рулонів"],
        covSheet: "листи {w} × {l} м", covSheetCut: "листи {w} м під довжину скату", covUnit: "одиниці по {a} м²", covNone: "покриття не вказано",
        chipCover: "{n} {w} · {d}", chipNone: "Покриття не вказано",
        tPlan: "Площа в плані зі звисами", tRidge: "Коник", tEaves: "Карнизи", tRakes: "Фронтонні кромки", tHips: "Ребра вальми", tBase: "Без запасу", tBat: "Обрешітка", tMem: "Мембрана", tCoverArea: "Куплено покриття",
        tCost: "Вартість", perM2: "{p} за м² даху",
        vTitle: "План, переріз і площа за скатами", vPlan: "План", vSec: "Переріз",
        vRow: "{n} · {t} · {a} × {b} м · кут {p}° · висота коника {h} м · {k} м²", vOver: "звис {o} м",
        gLong: "довгі скати", gEnd: "торцеві скати", gSlope: "скат", gAll: "скати",
        thRoof: "Дах", thType: "Тип", thSize: "Розмір, м", thPitch: "Кут", thArea: "Площа, м²", thH: "Висота коника, м", thRidge: "Коник, м", thEaves: "Карнизи, м", thRakes: "Фронтони, м", thHips: "Ребра вальми, м",
        rowTotal: "Разом",
        thCostItem: "Позиція", thQty: "Кількість", thPrice: "Ціна", thSum: "Сума",
        rCover: "Покриття", rTrim: "Планки (коник, карниз, кромки)", rBat: "Обрешітка", rMem: "Мембрана", rDel: "Доставка", rTotal: "Разом", per: { piece: "шт", m2: "м²", board: "дошку", roll: "рулон" },
        note: "Орієнтовна оцінка: усі скати вальмового даху мають однаковий кут. Листи над трапеціями й трикутниками рахуються по основі, тому кількість листів це безпечна верхня оцінка. Розжолобки, мансардні вікна, димарі й відходи біля коника не враховані.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅",
        copyR: "Дах", m: "м", m2: "м²"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const nf = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d + 0).toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });
  const q1 = (x) => nf(x, 1);
  const q2 = (x) => nf(x, 2);
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
  const nId = (i, k) => "n" + i + "_" + k;
  const visibleItems = () => Array.from({ length: MAXN }, (_, k) => k + 1).filter((i) => !el("nl" + i).hidden);

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

  // ===== геометрія даху =====
  // повертає скати [{ k: група, base, top, n }], довжину по схилу s, довжини коника, карнизів, кромок, ребер і висоту коника
  function geometry(t, a, b, pDeg, oe, og) {
    const rad = (pDeg * Math.PI) / 180, cos = Math.cos(rad), tan = Math.tan(rad);
    if (t === "gable") {
      const L = a + 2 * og, run = b / 2 + oe, s = run / cos;
      return { s, slopes: [{ k: "all", base: L, top: L, n: 2 }], ridge: L, eaves: 2 * L, rakes: 4 * s, hips: 0, h: (tan * b) / 2, plan: L * (b + 2 * oe), w: b + 2 * oe, rise: tan * run, span: b };
    }
    if (t === "shed") {
      const L = a + 2 * og, run = b + 2 * oe, s = run / cos;
      return { s, slopes: [{ k: "all", base: L, top: L, n: 1 }], ridge: L, eaves: L, rakes: 2 * s, hips: 0, h: tan * b, plan: L * run, w: b + 2 * oe, rise: tan * run, span: b };
    }
    const A = Math.max(a, b), B = Math.min(a, b), run = B / 2 + oe, s = run / cos;
    const slopes = A - B > EPS
      ? [{ k: "long", base: A + 2 * oe, top: A - B, n: 2 }, { k: "end", base: B + 2 * oe, top: 0, n: 2 }]
      : [{ k: "all", base: B + 2 * oe, top: 0, n: 4 }];
    return { s, slopes, ridge: A - B, eaves: 2 * (A + 2 * oe) + 2 * (B + 2 * oe), rakes: 0, hips: 4 * run * Math.sqrt(2 + tan * tan), h: (tan * B) / 2, plan: (A + 2 * oe) * (B + 2 * oe), w: B + 2 * oe, rise: tan * run, span: B };
  }

  // ===== розрахунок =====
  function val(id, label, lo, hi, required, unit) {
    const v = num(id);
    if (v === null) return required ? { miss: label } : { v: null };
    if (Number.isNaN(v)) return { err: fill(T.errNum, { f: label }) };
    if (v < lo || v > hi) return { err: fill(T.errRange, { f: label, a: lim(lo), b: lim(hi), u: unit || "" }) };
    return { v };
  }

  function compute() {
    let err = null;
    const miss = [];
    const note = (r) => {
      if (r.miss) miss.push(r.miss);
      if (r.err && !err) err = r.err;
      return r;
    };
    const cov = el("covm").value, cutm = el("cutm").value;
    const sw = note(val("sw", T.lbl.sw, 0.05, 5, false, T.units.sw)).v;
    const sl = note(val("sl", T.lbl.sl, 0.2, 20, false, T.units.sl)).v;
    const ov = note(val("ov", T.lbl.ov, 0, 5, false, T.units.ov)).v || 0;
    const ua = note(val("ua", T.lbl.ua, 0.001, 100, false, T.units.ua)).v;
    const res = note(val("reserve", T.lbl.reserve, 0, 100, false, T.units.reserve)).v || 0;
    const plen = note(val("plen", T.lbl.plen, 0.2, 20, false, T.units.plen)).v;
    const bst = note(val("bst", T.lbl.bst, 5, 200, false, T.units.bst)).v;
    const blen = note(val("blen", T.lbl.blen, 0.5, 20, !!bst, T.units.blen)).v;
    const mroll = note(val("mroll", T.lbl.mroll, 1, 500, false, T.units.mroll)).v;
    const mov = note(val("mov", T.lbl.mov, 0, 100, false, T.units.mov)).v || 0;
    const roofs = [];
    visibleItems().forEach((i, idx) => {
      const t = el(nId(i, "type")).value;
      const used = ["a", "b", "p", "oe", "og"].some((k) => raw(nId(i, k)) !== "");
      if (!used) return;
      const name = fill(T.item, { n: idx + 1 }) + ": ";
      const a = note(val(nId(i, "a"), name + T.lbl.a, 0.5, 200, true, T.units.a));
      const b = note(val(nId(i, "b"), name + T.lbl.b, 0.5, 200, true, T.units.b));
      const p = note(val(nId(i, "p"), name + T.lbl.p, 0, 85, true, T.units.p));
      const oe = note(val(nId(i, "oe"), name + T.lbl.oe, 0, 5, false, T.units.oe)).v || 0;
      const og = t === "hip" ? 0 : note(val(nId(i, "og"), name + T.lbl.og, 0, 5, false, T.units.og)).v || 0;
      if (!miss.length && !err) {
        const G = geometry(t, a.v, b.v, p.v, oe, t === "hip" ? 0 : og);
        G.slopes.forEach((s) => (s.area = ((s.base + s.top) / 2) * G.s));
        G.area = G.slopes.reduce((x, s) => x + s.area * s.n, 0);
        roofs.push(Object.assign(G, { i, idx, t, label: fill(T.item, { n: idx + 1 }), name: T.types[t], a: a.v, b: b.v, p: p.v, oe, og }));
      }
    });
    const P = {};
    PRICE_IDS.forEach((id) => (P[id] = note(val(id, T.lbl[id], 0, id === "pDel" ? LIM.fixed : LIM.price[cur], false)).v || 0));
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!roofs.length) return { ok: false, incomplete: true, none: true, msg: T.errNoPos };
    // покриття
    const sheetSet = cov === "sheet" && sw && sl, unitSet = cov === "unit" && ua;
    if (cov === "sheet" && (sw || sl || ov) && !(sw && sl)) {
      return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: (!sw ? T.lbl.sw : "") + (!sw && !sl ? ", " : "") + (!sl ? T.lbl.sl : "") }) };
    }
    if (sheetSet && cutm === "fixed" && ov >= sl) return { ok: false, msg: T.errOv };
    if (P.pCover && !sheetSet && !unitSet) return { ok: false, msg: T.errCover };
    if (P.pTrim && !plen) return { ok: false, msg: T.errTrim };
    if (P.pBat && !bst) return { ok: false, msg: T.errBat };
    if (P.pMem && !mroll) return { ok: false, msg: T.errMem };
    const R = { ok: true, cur, roofs, P, cov, cutm, sw, sl, ov, ua, res, plen, bst, blen, mroll, mov, sheetSet, unitSet };
    R.area = roofs.reduce((s, r) => s + r.area, 0);
    R.plan = roofs.reduce((s, r) => s + r.plan, 0);
    ["ridge", "eaves", "rakes", "hips"].forEach((k) => (R[k] = roofs.reduce((s, r) => s + r[k], 0)));
    // покриття
    let base = 0, boughtArea = 0;
    if (sheetSet) {
      roofs.forEach((r) => r.slopes.forEach((s) => {
        const cols = ce(s.base / sw);
        const rows = cutm === "cut" ? 1 : r.s <= sl + EPS ? 1 : ce((r.s - ov) / (sl - ov));
        s.cols = cols;
        s.rows = rows;
        base += cols * rows * s.n;
        boughtArea += cutm === "cut" ? cols * s.n * sw * r.s : cols * rows * s.n * sw * sl;
      }));
      R.coverBase = base;
      R.coverQty = ce(base * (1 + res / 100));
      R.boughtArea = boughtArea * (1 + res / 100) * (cutm === "cut" ? 1 : R.coverQty / base);
      if (cutm === "fixed") R.boughtArea = R.coverQty * sw * sl;
      R.coverUnit = "sheet";
    } else if (unitSet) {
      R.coverBase = ce(R.area / ua);
      R.coverQty = ce((R.area * (1 + res / 100)) / ua);
      R.boughtArea = R.coverQty * ua;
      R.coverUnit = "unit";
    }
    // планки
    if (plen) {
      R.trimPieces = ["ridge", "eaves", "rakes", "hips"].reduce((s, k) => s + (R[k] > EPS ? ce(R[k] / plen) : 0), 0);
      R.trimBy = { ridge: R.ridge > EPS ? ce(R.ridge / plen) : 0, eaves: ce(R.eaves / plen), rakes: R.rakes > EPS ? ce(R.rakes / plen) : 0, hips: R.hips > EPS ? ce(R.hips / plen) : 0 };
    }
    // обрешітка
    if (bst) {
      const step = bst / 100;
      let len = 0;
      roofs.forEach((r) => r.slopes.forEach((s) => {
        let sum = 0;
        for (let j = 0; j <= Math.floor(r.s / step + EPS); j++) sum += s.base - ((s.base - s.top) * (j * step)) / r.s;
        len += sum * s.n;
      }));
      R.battenLen = len;
      R.boards = ce(len / blen);
    }
    // мембрана
    if (mroll) R.rolls = ce((R.area * (1 + mov / 100)) / mroll);
    // вартість
    const pu = el("punit").value;
    R.lines = [];
    if (R.coverQty) {
      const qty = pu === "m2" ? R.boughtArea : R.coverQty;
      R.lines.push({ k: "rCover", qty, unit: pu === "m2" ? "m2" : R.coverUnit, price: P.pCover, sum: P.pCover ? qty * P.pCover : 0 });
    }
    if (plen) R.lines.push({ k: "rTrim", qty: R.trimPieces, unit: "piece", price: P.pTrim, sum: P.pTrim ? R.trimPieces * P.pTrim : 0 });
    if (bst) R.lines.push({ k: "rBat", qty: R.boards, unit: "board", price: P.pBat, sum: P.pBat ? R.boards * P.pBat : 0 });
    if (mroll) R.lines.push({ k: "rMem", qty: R.rolls, unit: "roll", price: P.pMem, sum: P.pMem ? R.rolls * P.pMem : 0 });
    R.cost = R.lines.reduce((s, x) => s + x.sum, 0) + P.pDel;
    R.hasPrice = R.cost > 0;
    R.perM2 = R.hasPrice ? R.cost / R.area : 0;
    return R;
  }

  // ===== відображення =====
  const tile = (title, value, mini) => '<div class="rof__kpi"><div class="rof__kpiT">' + title + '</div><div class="rof__kpiV">' + value + "</div>" + (mini ? '<div class="rof__kpiM">' + mini + "</div>" : "") + "</div>";
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  function coverDesc(r) {
    if (r.sheetSet) return r.cutm === "cut" ? fill(T.covSheetCut, { w: g(r.sw) }) : fill(T.covSheet, { w: g(r.sw), l: g(r.sl) });
    if (r.unitSet) return fill(T.covUnit, { a: g(r.ua) });
    return T.covNone;
  }
  // переріз: будинок, схил даху зі звисом, кут
  function sectionSvg(x, W, Hmax) {
    const tan = Math.tan((x.p * Math.PI) / 180);
    const sc = Math.min(W / x.w, Hmax / Math.max(x.rise, 0.3));
    const w = x.w * sc, oePx = x.oe * sc, rise = x.rise * sc, wall = 26, pad = 8;
    const yTip = pad + rise;
    let s = "";
    const hatch = '<pattern id="rofHat' + x.i + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#9aa3b5" stroke-width="1.2"/></pattern>';
    let H;
    if (x.t === "shed") {
      const yL = yTip - tan * oePx, yR = yTip - tan * (oePx + x.b * sc);
      const base = yL + wall;
      H = base + pad;
      s += '<polygon points="' + [oePx, yL, oePx + x.b * sc, yR, oePx + x.b * sc, base, oePx, base].map((v) => v.toFixed(2)).join(" ") + '" fill="url(#rofHat' + x.i + ')" stroke="#9aa3b5" stroke-width="0.8"/>';
      s += '<line x1="0" y1="' + yTip.toFixed(2) + '" x2="' + w.toFixed(2) + '" y2="' + (yTip - tan * w).toFixed(2) + '" stroke="#283b69" stroke-width="3" stroke-linecap="round"/>';
      s += '<line x1="' + oePx.toFixed(2) + '" y1="' + base.toFixed(2) + '" x2="' + (oePx + x.b * sc).toFixed(2) + '" y2="' + base.toFixed(2) + '" stroke="#9aa3b5" stroke-width="1"/>';
    } else {
      const yW = yTip - tan * oePx, base = yW + wall, mid = w / 2, yR = pad;
      H = base + pad;
      s += '<polygon points="' + [oePx, yW, mid, yR, oePx + x.span * sc, yW, oePx + x.span * sc, base, oePx, base].map((v) => v.toFixed(2)).join(" ") + '" fill="url(#rofHat' + x.i + ')" stroke="#9aa3b5" stroke-width="0.8"/>';
      s += '<polyline points="' + [0, yTip, mid, yR, w, yTip].map((v) => v.toFixed(2)).join(" ") + '" fill="none" stroke="#283b69" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>';
      s += '<line x1="' + oePx.toFixed(2) + '" y1="' + base.toFixed(2) + '" x2="' + (oePx + x.span * sc).toFixed(2) + '" y2="' + base.toFixed(2) + '" stroke="#9aa3b5" stroke-width="1"/>';
      s += '<line x1="' + mid.toFixed(2) + '" y1="' + yR.toFixed(2) + '" x2="' + mid.toFixed(2) + '" y2="' + yW.toFixed(2) + '" stroke="#5b7bbf" stroke-width="1" stroke-dasharray="3 3"/>';
    }
    // дуга кута біля нижньої точки скату
    const rArc = Math.min(34, w / 4), ang = (x.p * Math.PI) / 180;
    const ax = x.t === "shed" ? 0 : 0, ay = yTip;
    s += '<path d="M ' + (ax + rArc).toFixed(2) + " " + ay.toFixed(2) + " A " + rArc.toFixed(2) + " " + rArc.toFixed(2) + " 0 0 0 " + (ax + rArc * Math.cos(ang)).toFixed(2) + " " + (ay - rArc * Math.sin(ang)).toFixed(2) + '" fill="none" stroke="#5b7bbf" stroke-width="1.4"/>';
    return { svg: "<defs>" + hatch + "</defs>" + s, w, h: H };
  }
  // план даху зверху: скати, коник, ребра вальми, контур будинку
  function planSvg(x, W, Hmax) {
    const run = x.t === "shed" ? x.b + 2 * x.oe : x.span / 2 + x.oe;
    const pw = x.t === "hip" ? Math.max(x.a, x.b) + 2 * x.oe : x.a + 2 * x.og, ph = x.t === "hip" ? Math.min(x.a, x.b) + 2 * x.oe : x.b + 2 * x.oe;
    const sc = Math.min(W / pw, Hmax / ph), w = pw * sc, h = ph * sc, r = run * sc;
    const P = (pts) => pts.map((v) => v.toFixed(2)).join(" ");
    const c1 = "#5b7bbf", c2 = "#9fb4e0", line = "#283b69";
    let s = "";
    if (x.t === "gable") {
      s += '<polygon points="' + P([0, 0, w, 0, w, r, 0, r]) + '" fill="' + c1 + '" stroke="#fff" stroke-width="1"/>';
      s += '<polygon points="' + P([0, r, w, r, w, h, 0, h]) + '" fill="' + c1 + '" stroke="#fff" stroke-width="1"/>';
      s += '<line x1="0" y1="' + r.toFixed(2) + '" x2="' + w.toFixed(2) + '" y2="' + r.toFixed(2) + '" stroke="' + line + '" stroke-width="3"/>';
      s += '<rect x="' + (x.og * sc).toFixed(2) + '" y="' + (x.oe * sc).toFixed(2) + '" width="' + (x.a * sc).toFixed(2) + '" height="' + (x.b * sc).toFixed(2) + '" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="4 3"/>';
    } else if (x.t === "shed") {
      s += '<polygon points="' + P([0, 0, w, 0, w, h, 0, h]) + '" fill="' + c1 + '" stroke="#fff" stroke-width="1"/>';
      s += '<line x1="0" y1="0" x2="' + w.toFixed(2) + '" y2="0" stroke="' + line + '" stroke-width="3"/>';
      s += '<line x1="' + (w / 2).toFixed(2) + '" y1="' + (h * 0.22).toFixed(2) + '" x2="' + (w / 2).toFixed(2) + '" y2="' + (h * 0.78).toFixed(2) + '" stroke="#fff" stroke-width="2"/><polyline points="' + P([w / 2 - 6, h * 0.78 - 8, w / 2, h * 0.78, w / 2 + 6, h * 0.78 - 8]) + '" fill="none" stroke="#fff" stroke-width="2"/>';
      s += '<rect x="' + (x.og * sc).toFixed(2) + '" y="' + (x.oe * sc).toFixed(2) + '" width="' + (x.a * sc).toFixed(2) + '" height="' + (x.b * sc).toFixed(2) + '" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="4 3"/>';
    } else {
      const ridgeLen = Math.max(x.a, x.b) - Math.min(x.a, x.b), tl = [r, h / 2], tr = [w - r, h / 2];
      s += '<polygon points="' + P([0, 0, w, 0, tr[0], tr[1], tl[0], tl[1]]) + '" fill="' + c1 + '" stroke="#fff" stroke-width="1"/>';
      s += '<polygon points="' + P([0, h, w, h, tr[0], tr[1], tl[0], tl[1]]) + '" fill="' + c1 + '" stroke="#fff" stroke-width="1"/>';
      s += '<polygon points="' + P([0, 0, 0, h, tl[0], tl[1]]) + '" fill="' + (ridgeLen > EPS ? c2 : c1) + '" stroke="#fff" stroke-width="1"/>';
      s += '<polygon points="' + P([w, 0, w, h, tr[0], tr[1]]) + '" fill="' + (ridgeLen > EPS ? c2 : c1) + '" stroke="#fff" stroke-width="1"/>';
      [[0, 0, tl], [0, h, tl], [w, 0, tr], [w, h, tr]].forEach((e) => (s += '<line x1="' + e[0].toFixed(2) + '" y1="' + e[1].toFixed(2) + '" x2="' + e[2][0].toFixed(2) + '" y2="' + e[2][1].toFixed(2) + '" stroke="' + line + '" stroke-width="2"/>'));
      if (ridgeLen > EPS) s += '<line x1="' + tl[0].toFixed(2) + '" y1="' + tl[1].toFixed(2) + '" x2="' + tr[0].toFixed(2) + '" y2="' + tr[1].toFixed(2) + '" stroke="' + line + '" stroke-width="3"/>';
      s += '<rect x="' + (x.oe * sc).toFixed(2) + '" y="' + (x.oe * sc).toFixed(2) + '" width="' + ((pw - 2 * x.oe) * sc).toFixed(2) + '" height="' + ((ph - 2 * x.oe) * sc).toFixed(2) + '" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="4 3"/>';
    }
    return { svg: s, w, h };
  }
  function groupName(k, many) {
    return k === "long" ? T.gLong : k === "end" ? T.gEnd : many ? T.gAll : T.gAll;
  }
  function visualHtml(r) {
    const rows = r.roofs.map((x, k) => {
      const v = sectionSvg(x, 560, 130), pv = planSvg(x, 560, 170);
      const label = fill(T.vRow, { n: x.label, t: x.name, a: q2(x.a), b: q2(x.b), p: g(x.p), h: q2(x.h), k: q1(x.area) }) + (x.oe > 0 || x.og > 0 ? " · " + fill(T.vOver, { o: g(x.oe) }) : "");
      const seg = x.slopes.map((s, j) => '<div style="width:' + ((s.area * s.n / x.area) * 100).toFixed(3) + "%;background:" + COLORS[j % COLORS.length] + '" title="' + groupName(s.k) + ": " + s.n + " × " + q1(s.area) + " " + T.m2 + '"></div>').join("");
      const leg = x.slopes.map((s, j) => '<span><i style="background:' + COLORS[j % COLORS.length] + '"></i>' + groupName(s.k) + ", " + s.n + " × " + q1(s.area) + NB + T.m2 + "</span>").join("");
      return '<div class="rof__vrow"><div class="rof__vlab">' + label + '</div><div class="rof__vcap">' + T.vPlan + '</div><svg class="rof__vsvg" style="width:' + ((pv.w / 560) * 100).toFixed(2) + '%" viewBox="0 0 ' + pv.w.toFixed(2) + " " + pv.h.toFixed(2) + '" role="img" aria-label="' + T.vPlan + ": " + x.label + '">' + pv.svg + '</svg><div class="rof__vcap">' + T.vSec + '</div><svg class="rof__vsvg" style="width:' + ((v.w / 560) * 100).toFixed(2) + '%" viewBox="0 0 ' + v.w.toFixed(2) + " " + v.h.toFixed(2) + '" role="img" aria-label="' + T.vSec + ": " + x.label + '">' + v.svg + '</svg><div class="rof__bar rof__bar--sl">' + seg + '</div><div class="rof__legend">' + leg + "</div></div>";
    }).join("");
    return '<div class="rof__sub">' + T.vTitle + "</div>" + rows;
  }
  function itemTable(r) {
    const head = "<thead><tr><th>" + T.thRoof + "</th><th>" + T.thType + "</th><th>" + T.thSize + "</th><th>" + T.thPitch + "</th><th>" + T.thArea + "</th><th>" + T.thH + "</th><th>" + T.thRidge + "</th><th>" + T.thEaves + "</th><th>" + T.thRakes + "</th><th>" + T.thHips + "</th></tr></thead>";
    const body = r.roofs.map((x) => "<tr><td>" + x.label + "</td><td>" + x.name + "</td><td>" + q2(x.a) + " × " + q2(x.b) + "</td><td>" + g(x.p) + "°</td><td>" + q2(x.area) + "</td><td>" + q2(x.h) + "</td><td>" + q2(x.ridge) + "</td><td>" + q2(x.eaves) + "</td><td>" + q2(x.rakes) + "</td><td>" + q2(x.hips) + "</td></tr>").join("");
    return '<table class="rof__tbl rof__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + '<tr class="rof__total"><td>' + T.rowTotal + "</td><td></td><td></td><td></td><td>" + q2(r.area) + "</td><td></td><td>" + q2(r.ridge) + "</td><td>" + q2(r.eaves) + "</td><td>" + q2(r.rakes) + "</td><td>" + q2(r.hips) + "</td></tr></tbody></table>";
  }
  function costTable(r) {
    const head = "<thead><tr><th>" + T.thCostItem + "</th><th>" + T.thQty + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const qty = (x) => (x.unit === "sheet" ? nf(x.qty) + NB + pl(x.qty, T.sheetW) : x.unit === "unit" ? nf(x.qty) + NB + pl(x.qty, T.unitW) : x.unit === "m2" ? q1(x.qty) + NB + T.m2 : x.unit === "board" ? nf(x.qty) + NB + pl(x.qty, T.boardW) : x.unit === "roll" ? nf(x.qty) + NB + pl(x.qty, T.rollW) : nf(x.qty) + NB + pl(x.qty, T.pieceW));
    const per = (x) => (x.unit === "sheet" ? (IS_EN ? "sheet" : "лист") : x.unit === "unit" ? (IS_EN ? "unit" : "одиницю") : T.per[x.unit]);
    let body = r.lines.map((x) => "<tr><td>" + T[x.k] + "</td><td>" + qty(x) + "</td><td>" + (x.price ? unitMoney(x.price) + " / " + per(x) : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.P.pDel) body += "<tr><td>" + T.rDel + "</td><td></td><td></td><td>" + money(r.P.pDel) + "</td></tr>";
    if (r.hasPrice) body += '<tr class="rof__total"><td>' + T.rTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="rof__tbl rof__tbl--sch" id="costTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function barHtml(r) {
    const parts = r.lines.map((x) => ({ name: T[x.k], v: x.sum }));
    if (r.P.pDel > 0) parts.push({ name: T.rDel, v: r.P.pDel });
    const useful = parts.filter((p) => p.v > 0);
    if (useful.length < 2) return "";
    useful.forEach((p, i) => (p.c = COLORS[i % COLORS.length]));
    const seg = useful.map((p) => '<div style="width:' + ((p.v / r.cost) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = useful.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.cost) * 1000) / 10) + "%</span>").join("");
    return '<div class="rof__sub">' + (IS_EN ? "What the cost consists of" : "З чого складається вартість") + '</div><div class="rof__bar" role="img" aria-label="' + (IS_EN ? "Cost structure" : "Структура вартості") + '">' + seg + '</div><div class="rof__legend">' + leg + "</div>";
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="rof__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const n = r.roofs.length;
    const chip = r.coverQty ? fill(T.chipCover, { n: nf(r.coverQty), w: r.coverUnit === "sheet" ? pl(r.coverQty, T.sheetW) : pl(r.coverQty, T.unitW), d: coverDesc(r) }) : T.chipNone;
    const head = '<div class="rof__kpiT">' + fill(T.title, { n: nf(n) + NB + pl(n, T.roofW), c: coverDesc(r), r: pct(r.res) }) + '</div><div class="rof__big">' + q1(r.area) + NB + T.m2 + '</div><div class="rof__chipWrap"><span class="rof__chip">' + chip + "</span></div>";
    const cost = r.hasPrice ? '<div class="rof__per"><div class="rof__kpiT">' + T.tCost + '</div><div class="rof__perV">' + money(r.cost) + '</div><div class="rof__kpiT rof__mt2">' + fill(T.perM2, { p: unitMoney(r.perM2) }) + "</div></div>" : "";
    const pc = (k) => (r.trimBy && r.trimBy[k] ? nf(r.trimBy[k]) + NB + T.pieceW[0] : "");
    const tiles = [tile(T.tPlan, q1(r.plan) + NB + T.m2)];
    if (r.ridge > EPS) tiles.push(tile(T.tRidge, q1(r.ridge) + NB + T.m, pc("ridge")));
    tiles.push(tile(T.tEaves, q1(r.eaves) + NB + T.m, pc("eaves")));
    if (r.rakes > EPS) tiles.push(tile(T.tRakes, q1(r.rakes) + NB + T.m, pc("rakes")));
    if (r.hips > EPS) tiles.push(tile(T.tHips, q1(r.hips) + NB + T.m, pc("hips")));
    if (r.coverQty && r.res > 0) tiles.push(tile(T.tBase, nf(r.coverBase) + NB + (r.coverUnit === "sheet" ? pl(r.coverBase, T.sheetW) : pl(r.coverBase, T.unitW))));
    if (r.coverQty) tiles.push(tile(T.tCoverArea, q1(r.boughtArea) + NB + T.m2));
    if (r.bst) tiles.push(tile(T.tBat, nf(r.boards) + NB + pl(r.boards, T.boardW), q1(r.battenLen) + NB + T.m));
    if (r.mroll) tiles.push(tile(T.tMem, nf(r.rolls) + NB + pl(r.rolls, T.rollW)));
    box.innerHTML =
      '<div class="rof__head"><div>' + head + (eq ? '<div class="rof__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      (r.hasPrice ? barHtml(r) : "") +
      visualHtml(r) +
      '<div class="rof__kpis rof__kpis--' + (tiles.length === 4 ? "4" : "3") + '">' + tiles.join("") + "</div>" +
      '<div class="rof__note">' + T.note + "</div>";
    el("schedBody").innerHTML = itemTable(r) + (r.lines.length || r.P.pDel ? '<div class="rof__sub">' + T.tCost + "</div>" + costTable(r) : "");
    sch.hidden = false;
    r.roofs.forEach((x) => (el("nv" + x.i).textContent = fill(T.itemInfo, { a: q1(x.area) })));
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
    a.download = "roofing.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    let txt = T.copyR + ": " + q1(last.area) + " " + T.m2;
    if (last.coverQty) txt += "; " + nf(last.coverQty) + " " + (last.coverUnit === "sheet" ? pl(last.coverQty, T.sheetW) : pl(last.coverQty, T.unitW)) + " (" + coverDesc(last) + ")";
    if (last.ridge > EPS) txt += "; " + T.tRidge + ": " + q1(last.ridge) + " " + T.m;
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
  const DDP = (hid) => (/^n\d_type$/.test(hid) ? "n" + hid[1] + "t" : hid === "covm" ? "cv" : hid === "cutm" ? "ct" : "pu");
  function setDd(hid, v) {
    const pre = DDP(hid), lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }
  // тип даху → звис фронтону; тип покриття → поля листів або одиниці
  function syncVisibility() {
    visibleItems().forEach((i) => (el("n" + i + "_ogW").hidden = el(nId(i, "type")).value === "hip"));
    const sheet = el("covm").value === "sheet";
    ["swW", "slW", "ovW", "cutW"].forEach((k) => (el(k).hidden = !sheet));
    el("uaW").hidden = sheet;
  }

  // ===== дахи =====
  function syncAll() {
    visibleItems().forEach((i, idx) => {
      el("nl" + i).querySelector(".rof__elHead span").textContent = fill(T.item, { n: idx + 1 });
      el("nl" + i + "rm").hidden = visibleItems().length < 2;
    });
    el("addNl").hidden = visibleItems().length >= MAXN;
    syncVisibility();
  }
  function addItem() {
    const i = Array.from({ length: MAXN }, (_, k) => k + 1).find((x) => el("nl" + x).hidden);
    if (!i) return;
    el("nl" + i).hidden = false;
    syncAll();
  }
  function removeItem(i) {
    if (visibleItems().length < 2) return;
    clearItem(i);
    el("nl" + i).hidden = true;
    syncAll();
  }
  function clearItem(i) {
    ["a", "b", "p", "oe", "og"].forEach((k) => (el(nId(i, k)).value = ""));
    setDd(nId(i, "type"), "gable");
    el("nv" + i).textContent = "—";
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
  const ITEM_KEYS = ["a", "b", "p", "oe", "og"];
  const FIELD_IDS = [].concat(
    ...Array.from({ length: MAXN }, (_, k) => ITEM_KEYS.map((x) => nId(k + 1, x))),
    ["sw", "sl", "ov", "ua", "reserve", "plen", "bst", "blen", "mroll", "mov"], PRICE_IDS
  );
  const SAMPLE = {
    items: [["hip", { a: "10", b: "8", p: "30", oe: "0.5" }], ["gable", { a: "6", b: "5", p: "35", oe: "0.4", og: "0.3" }]],
    cov: "sheet", cut: "fixed",
    f: { sw: "1.1", sl: "3", ov: "0.15", reserve: "5", plen: "2", bst: "35", blen: "6", mroll: "75", mov: "10", pCover: "950", pTrim: "250", pBat: "180", pMem: "1900" }
  };

  function setItems(list) {
    for (let i = 1; i <= MAXN; i++) {
      clearItem(i);
      el("nl" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, vals], idx) => {
      const i = idx + 1;
      setDd(nId(i, "type"), t);
      ITEM_KEYS.forEach((k) => (el(nId(i, k)).value = (vals && vals[k]) || ""));
    });
    syncAll();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    setDd("covm", "sheet");
    setDd("cutm", "fixed");
    setDd("punit", "piece");
    setItems([]);
    el("accDet").open = false;
    el("priceDet").open = false;
    syncAll();
    render({ ok: false, none: true });
  }
  function fillExample() {
    resetAll();
    if (cur !== "UAH") setCur("UAH", false);
    Object.entries(SAMPLE.f).forEach(([k, v]) => (el(k).value = v));
    setDd("covm", SAMPLE.cov);
    setDd("cutm", SAMPLE.cut);
    setItems(SAMPLE.items);
    el("accDet").open = true;
    el("priceDet").open = true;
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("cur", cur);
    p.set("cov", el("covm").value);
    p.set("cut", el("cutm").value);
    p.set("pu", el("punit").value);
    visibleItems().forEach((i, idx) => {
      p.set("n" + (idx + 1), [el(nId(i, "type")).value].concat(ITEM_KEYS.map((k) => raw(nId(i, k)) || "0")).join(":"));
    });
    FIELD_IDS.filter((id) => !/^n\d_/.test(id)).forEach((id) => raw(id) && p.set(id, raw(id)));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    let any = false;
    if (["UAH", "USD", "EUR"].includes(q.get("cur"))) {
      cur = q.get("cur");
      syncCur();
    }
    if (COVERS.includes(q.get("cov"))) setDd("covm", q.get("cov"));
    if (CUTS.includes(q.get("cut"))) setDd("cutm", q.get("cut"));
    if (PUS.includes(q.get("pu"))) setDd("punit", q.get("pu"));
    const list = [];
    for (let i = 1; i <= MAXN; i++) {
      if (!q.has("n" + i)) continue;
      const parts = q.get("n" + i).split(":");
      if (!TYPES.includes(parts[0])) continue;
      const z = (x) => (!x || x === "0" ? "" : x.slice(0, 10));
      const vals = {};
      ITEM_KEYS.forEach((k, j) => (vals[k] = z(parts[1 + j])));
      list.push([parts[0], vals]);
    }
    if (list.length) {
      setItems(list);
      any = true;
    }
    FIELD_IDS.forEach((id) => {
      if (!/^n\d_/.test(id) && q.has(id)) {
        el(id).value = q.get(id).slice(0, 12);
        any = true;
      }
    });
    if (any) {
      el("accDet").open = ["plen", "bst", "blen", "mroll", "mov"].some((id) => raw(id) !== "");
      el("priceDet").open = PRICE_IDS.some((id) => raw(id) !== "");
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
    initDd("cv", (v) => {
      setDd("covm", v);
      syncVisibility();
      calc();
    });
    initDd("ct", (v) => {
      setDd("cutm", v);
      calc();
    });
    initDd("pu", (v) => {
      setDd("punit", v);
      calc();
    });
    for (let i = 1; i <= MAXN; i++) {
      initDd("n" + i + "t", (v) => {
        setDd(nId(i, "type"), v);
        syncVisibility();
        calc();
      });
      el("nl" + i + "rm").addEventListener("click", () => {
        removeItem(i);
        calc();
      });
    }
    el("addNl").addEventListener("click", addItem);
    el("accDet").addEventListener("toggle", () => calc());
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
