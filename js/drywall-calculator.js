/* drywall-calculator.js — калькулятор гіпсокартону: до шести поверхонь (стіна, стеля, перегородка з двох боків, своя площа) з отворами та шарами, лист за пресетом або свій, запас; листи за розкладкою (кожна поверхня окремо, обрізки не використовуються) або за площею, схема розкладки, необовʼязкові каркас (CD, UD) і саморізи за геометрією, вартість (UK/EN, UAH/USD/EUR)
   Розкладка: листи кладуться вертикально або горизонтально, береться орієнтація з меншою кількістю; кількість = ceil(довжина / сторона листа) × ceil(висота / інша сторона). Отвори в розкладці не віднімаються.
   За площею: ceil(Σ чиста площа × множник / площа листа); множник = шари (× 2 для перегородки). Запас додається до листів: ceil(листи × (1 + запас)).
   Каркас: стіна й перегородка — CD по висоті з кроком, UD зверху й знизу; стеля — CD вздовж довжини з кроком по ширині, UD по периметру. Саморізи = площа листів × множник / (крок профілю × крок саморізів).
   Вбудованих цін немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = " ";
  const MAXN = 6;
  const LIM = { price: { UAH: 1000000, USD: 25000, EUR: 25000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf", "#9fb4e0", "#c9d4ec", "#7f9ad0"];
  const PRICE_IDS = ["pSheet", "pCd", "pUd", "pScr", "pDel"];
  const SHEETS = { s1225: ["2.5", "1.2"], s123: ["3", "1.2"], s122: ["2", "1.2"] };
  const TYPES = ["wall", "ceiling", "partition", "area"];
  const METHODS = ["layout", "area"];
  const MAXV = 1e7;

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errOpen: "The openings area must be smaller than the area ({a} m²).",
        errTotal: "The total is too large — check the dimensions.",
        errNoPos: "Enter the data of at least one surface.",
        errCd: "Enter the step of the CD profiles to count the screws and to price the profiles.",
        errScr: "Enter the step of the screws to price them.",
        item: "Surface {n}", itemInfo: "{n} {w} · {a} m²", itemInfoNo: "—",
        lbl: { a: "Length", b: "Height", bc: "Width", ar: "Area", op: "Openings area", sl: "Sheet length", sw: "Sheet width", reserve: "Reserve", cd: "Profile step", plen: "Profile length", scr: "Screw step", pSheet: "Sheet price", pCd: "CD profile price", pUd: "UD profile price", pScr: "Price of 100 screws", pDel: "Delivery" },
        units: { a: " m", b: " m", ar: " m²", op: " m²", sl: " m", sw: " m", reserve: " %", cd: " cm", plen: " m", scr: " cm" },
        types: { wall: "Wall", ceiling: "Ceiling", partition: "Partition (two sides)", area: "Own area" },
        title: "Drywall · {n} · {m} · reserve {r}%",
        sheetsW: ["sheet", "sheets", "sheets"], itemW: ["surface", "surfaces", "surfaces"], pcsW: ["pc", "pcs", "pcs"],
        methTxt: { layout: "by layout", area: "by area" },
        chip: "{o}: {n} {w}", chipLayout: "By layout", chipArea: "By area",
        tArea: "Sheets area", tBase: "Sheets without reserve", tCd: "CD profiles", tUd: "UD profiles", tScr: "Screws", tWaste: "Offcuts",
        tCost: "Cost", perM2: "{p} per m² of surface",
        vTitle: "Layout of the sheets", vLegend1: "whole sheet", vLegend2: "cut sheet", vLegend3: "offcut",
        vRow: "{n} · {a} × {b} m · {k} {kw}{x}", vRowArea: "{n} · {s} m² · counted by area", vMult: " (× {m})",
        thItem: "Surface", thType: "Type", thSize: "Size, m", thArea: "Area, m²", thOp: "Openings, m²", thMult: "Layers × sides", thN: "Sheets by layout", rowTotal: "Total",
        thCostItem: "Item", thQty: "Quantity", thPrice: "Price", thSum: "Amount",
        rSheet: "Drywall sheets", rCd: "CD profiles", rUd: "UD profiles", rScr: "Screws", rDel: "Delivery", rTotal: "Total", per100: "100 pcs",
        note: "An approximate estimate. The layout does not subtract openings and does not reuse offcuts; the area method gives the lower bound, so the real number is in between. Frame and screws are counted by geometry for one row of profiles, with no allowance for joints.",
        noteFrame: "The frame is not counted for “Own area” surfaces.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅",
        copyD: "Drywall", mm: "m"
      }
    : {
        enter: "Вкажіть дані — результат зʼявиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errOpen: "Площа отворів має бути меншою за площу ({a} м²).",
        errTotal: "Підсумок завеликий — перевірте розміри.",
        errNoPos: "Вкажіть дані хоча б однієї поверхні.",
        errCd: "Вкажіть крок профілів CD, щоб порахувати саморізи й вартість профілів.",
        errScr: "Вкажіть крок саморізів, щоб порахувати їх вартість.",
        item: "Поверхня {n}", itemInfo: "{n} {w} · {a} м²", itemInfoNo: "—",
        lbl: { a: "Довжина", b: "Висота", bc: "Ширина", ar: "Площа", op: "Площа отворів", sl: "Довжина листа", sw: "Ширина листа", reserve: "Запас", cd: "Крок профілю", plen: "Довжина профілю", scr: "Крок саморізів", pSheet: "Ціна листа", pCd: "Ціна профілю CD", pUd: "Ціна профілю UD", pScr: "Ціна 100 саморізів", pDel: "Доставка" },
        units: { a: " м", b: " м", ar: " м²", op: " м²", sl: " м", sw: " м", reserve: " %", cd: " см", plen: " м", scr: " см" },
        types: { wall: "Стіна", ceiling: "Стеля", partition: "Перегородка (2 сторони)", area: "Своя площа" },
        title: "Гіпсокартон · {n} · {m} · запас {r}%",
        sheetsW: ["лист", "листи", "листів"], itemW: ["поверхня", "поверхні", "поверхонь"], pcsW: ["шт", "шт", "шт"],
        methTxt: { layout: "за розкладкою", area: "за площею" },
        chip: "{o}: {n} {w}", chipLayout: "За розкладкою", chipArea: "За площею",
        tArea: "Площа листів", tBase: "Листів без запасу", tCd: "Профілів CD", tUd: "Профілів UD", tScr: "Саморізів", tWaste: "Обрізки",
        tCost: "Вартість", perM2: "{p} за м² поверхні",
        vTitle: "Розкладка листів", vLegend1: "цілий лист", vLegend2: "обрізаний лист", vLegend3: "відхід",
        vRow: "{n} · {a} × {b} м · {k} {kw}{x}", vRowArea: "{n} · {s} м² · рахується за площею", vMult: " (× {m})",
        thItem: "Поверхня", thType: "Тип", thSize: "Розмір, м", thArea: "Площа, м²", thOp: "Отвори, м²", thMult: "Шарів × сторін", thN: "Листів за розкладкою", rowTotal: "Разом",
        thCostItem: "Позиція", thQty: "Кількість", thPrice: "Ціна", thSum: "Сума",
        rSheet: "Листи гіпсокартону", rCd: "Профілі CD", rUd: "Профілі UD", rScr: "Саморізи", rDel: "Доставка", rTotal: "Разом", per100: "100 шт",
        note: "Орієнтовна оцінка. Розкладка не віднімає отвори й не використовує обрізки, а за площею виходить нижня межа, тож реальна кількість між ними. Каркас і саморізи рахуються за геометрією для одного ряду профілів без запасу на стики.",
        noteFrame: "Каркас для поверхонь «Своя площа» не рахується.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅",
        copyD: "Гіпсокартон", mm: "м"
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
  const M2 = IS_EN ? "m²" : "м²";
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
  const ce = (x) => Math.ceil(x - 1e-9);

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

  // ===== розкладка листів на прямокутнику a × b =====
  function layoutOf(a, b, sl, sw) {
    const v = { aS: sw, bS: sl, cols: ce(a / sw), rows: ce(b / sl) };
    const h = { aS: sl, bS: sw, cols: ce(a / sl), rows: ce(b / sw) };
    v.count = v.cols * v.rows;
    h.count = h.cols * h.rows;
    return h.count < v.count ? h : v;
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
    const sl = note(val("sl", T.lbl.sl, 0.5, 6, true, T.units.sl)).v;
    const sw = note(val("sw", T.lbl.sw, 0.3, 2.5, true, T.units.sw)).v;
    const res = note(val("reserve", T.lbl.reserve, 0, 100, false, T.units.reserve)).v || 0;
    const cdStep = note(val("cd", T.lbl.cd, 10, 100, false, T.units.cd)).v;
    const plen = note(val("plen", T.lbl.plen, 1, 12, !!cdStep, T.units.plen)).v;
    const scrStep = note(val("scr", T.lbl.scr, 5, 60, false, T.units.scr)).v;
    const meth = el("meth").value;
    const items = [];
    visibleItems().forEach((i, idx) => {
      const t = el(nId(i, "type")).value;
      const used = ["a", "b", "ar", "op"].some((k) => raw(nId(i, k)) !== "");
      if (!used) return;
      const name = fill(T.item, { n: idx + 1 }) + ": ";
      const isArea = t === "area";
      const a = isArea ? { v: 0 } : note(val(nId(i, "a"), name + T.lbl.a, 0.1, 200, true, T.units.a));
      const b = isArea ? { v: 0 } : note(val(nId(i, "b"), name + (t === "ceiling" ? T.lbl.bc : T.lbl.b), 0.1, 200, true, T.units.b));
      const ar = isArea ? note(val(nId(i, "ar"), name + T.lbl.ar, 0.1, MAXV, true, T.units.ar)) : { v: 0 };
      const op = note(val(nId(i, "op"), name + T.lbl.op, 0, MAXV, false, T.units.op));
      const ly = Number(el(nId(i, "ly")).value) || 1;
      if (!miss.length && !err) {
        const gross = isArea ? ar.v : a.v * b.v, opv = op.v || 0;
        if (opv >= gross) {
          err = fill(T.errOpen, { a: q2(gross) });
          return;
        }
        const mult = ly * (t === "partition" ? 2 : 1);
        items.push({ i, idx, t, isArea, name: T.types[t], label: fill(T.item, { n: idx + 1 }), a: a.v, b: b.v, gross, op: opv, net: gross - opv, ly, mult, lay: isArea ? null : layoutOf(a.v, b.v, sl, sw) });
      }
    });
    const P = {};
    PRICE_IDS.forEach((id) => (P[id] = note(val(id, T.lbl[id], 0, id === "pDel" ? LIM.fixed : LIM.price[cur], false)).v || 0));
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!items.length) return { ok: false, incomplete: true, none: true, msg: T.errNoPos };
    if ((P.pCd || P.pUd || scrStep) && !cdStep) return { ok: false, msg: T.errCd };
    if (P.pScr && !scrStep) return { ok: false, msg: T.errScr };
    const sheetArea = sl * sw;
    let netMulti = 0, layoutDim = 0, poolArea = 0, grossAll = 0, cells = 0;
    items.forEach((x) => {
      netMulti += x.net * x.mult;
      grossAll += x.gross;
      if (x.isArea) poolArea += x.net * x.mult;
      else {
        layoutDim += x.lay.count * x.mult;
        cells += x.lay.count;
      }
    });
    if (netMulti > MAXV || cells > 1e6) return { ok: false, msg: T.errTotal };
    const layoutBase = layoutDim + ce(poolArea / sheetArea), areaBase = ce(netMulti / sheetArea);
    const base = meth === "layout" ? layoutBase : areaBase;
    const R = { ok: true, cur, items, sl, sw, res, meth, P, cdStep, plen, scrStep, layoutBase, areaBase, base, grossAll };
    R.sheets = ce(base * (1 + res / 100));
    R.sheetsArea = R.sheets * sheetArea;
    R.other = meth === "layout" ? areaBase : layoutBase;
    // каркас (тільки для поверхонь з розмірами)
    R.frame = !!cdStep;
    if (cdStep) {
      const step = cdStep / 100;
      let cdPieces = 0, udM = 0, screws = 0;
      items.forEach((x) => {
        if (x.isArea) return;
        const lines = x.t === "ceiling" ? ce(x.b / step) + 1 : ce(x.a / step) + 1;
        const lineLen = x.t === "ceiling" ? x.a : x.b;
        cdPieces += lines * ce(lineLen / plen);
        udM += x.t === "ceiling" ? 2 * (x.a + x.b) : 2 * x.a;
      });
      R.cdPieces = cdPieces;
      R.udPieces = ce(udM / plen);
      R.udM = udM;
      if (scrStep) {
        const pitch = scrStep / 100;
        items.forEach((x) => (screws += (x.isArea ? x.net : x.gross) * x.mult / (step * pitch)));
        R.screws = ce(screws);
      }
    }
    R.lines = [{ k: "rSheet", qty: R.sheets, unit: "sheets", price: P.pSheet, sum: P.pSheet ? R.sheets * P.pSheet : 0 }];
    if (R.frame) {
      R.lines.push({ k: "rCd", qty: R.cdPieces, unit: "pcs", price: P.pCd, sum: P.pCd ? R.cdPieces * P.pCd : 0 });
      R.lines.push({ k: "rUd", qty: R.udPieces, unit: "pcs", price: P.pUd, sum: P.pUd ? R.udPieces * P.pUd : 0 });
      if (R.screws) R.lines.push({ k: "rScr", qty: R.screws, unit: "scr", price: P.pScr, sum: P.pScr ? (R.screws / 100) * P.pScr : 0 });
    }
    R.cost = R.lines.reduce((s, x) => s + x.sum, 0) + P.pDel;
    R.hasPrice = R.cost > 0;
    R.perM2 = R.hasPrice ? R.cost / grossAll : 0;
    R.anyArea = items.some((x) => x.isArea);
    return R;
  }

  // ===== відображення =====
  const tile = (title, value, mini) => '<div class="dry__kpi"><div class="dry__kpiT">' + title + '</div><div class="dry__kpiV">' + value + "</div>" + (mini ? '<div class="dry__kpiM">' + mini + "</div>" : "") + "</div>";
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  function layoutHtml(r) {
    const dim = r.items.filter((x) => !x.isArea);
    const ext = dim.map((x) => ({ w: x.lay.cols * x.lay.aS, h: x.lay.rows * x.lay.bS }));
    const maxW = Math.max(...ext.map((e) => e.w), 0.001), maxH = Math.max(...ext.map((e) => e.h), 0.001);
    const sc = Math.min(600 / maxW, 200 / maxH);
    const rows = r.items.map((x, k) => {
      if (x.isArea) return '<div class="dry__vrow"><div class="dry__vlab">' + fill(T.vRowArea, { n: x.label, s: q1(x.net) }) + "</div></div>";
      const L = x.lay, ew = L.cols * L.aS, eh = L.rows * L.bS;
      const label = fill(T.vRow, { n: x.label + " · " + x.name, a: q2(x.a), b: q2(x.b), k: nf(L.count), kw: pl(L.count, T.sheetsW), x: x.mult > 1 ? fill(T.vMult, { m: x.mult }) : "" });
      let cells = "";
      if (L.count <= 3000) {
        for (let rr = 0; rr < L.rows; rr++) {
          for (let c = 0; c < L.cols; c++) {
            const x0 = c * L.aS, y0 = rr * L.bS, w = Math.min(L.aS, x.a - x0), h = Math.min(L.bS, x.b - y0);
            const cut = w < L.aS - 1e-9 || h < L.bS - 1e-9;
            cells += '<rect x="' + (x0 * sc).toFixed(2) + '" y="' + (y0 * sc).toFixed(2) + '" width="' + (L.aS * sc).toFixed(2) + '" height="' + (L.bS * sc).toFixed(2) + '" fill="url(#dryHat' + k + ')"/>';
            cells += '<rect class="' + (cut ? "dry__c2" : "dry__c0") + '" x="' + (x0 * sc + 0.5).toFixed(2) + '" y="' + (y0 * sc + 0.5).toFixed(2) + '" width="' + Math.max(0.3, w * sc - 1).toFixed(2) + '" height="' + Math.max(0.3, h * sc - 1).toFixed(2) + '"/>';
          }
        }
      }
      return '<div class="dry__vrow"><div class="dry__vlab">' + label + '</div><svg class="dry__vsvg" style="width:' + ((ew * sc / 600) * 100).toFixed(2) + '%" viewBox="0 0 ' + (ew * sc).toFixed(2) + " " + (eh * sc).toFixed(2) + '" role="img" aria-label="' + x.label + '"><defs><pattern id="dryHat' + k + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#eef2fa"/><line x1="0" y1="0" x2="0" y2="6" stroke="#9aa3b5" stroke-width="2"/></pattern></defs>' + cells + "</svg></div>";
    }).join("");
    return '<div class="dry__sub">' + T.vTitle + "</div>" + rows + '<div class="dry__legend"><span><i class="dry__sw dry__sw--w"></i>' + T.vLegend1 + '</span><span><i class="dry__sw dry__sw--c"></i>' + T.vLegend2 + '</span><span><i class="dry__sw dry__sw--o"></i>' + T.vLegend3 + "</span></div>";
  }
  function itemTable(r) {
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thType + "</th><th>" + T.thSize + "</th><th>" + T.thArea + "</th><th>" + T.thOp + "</th><th>" + T.thMult + "</th><th>" + T.thN + "</th></tr></thead>";
    const body = r.items.map((x) => "<tr><td>" + x.label + "</td><td>" + x.name + "</td><td>" + (x.isArea ? "—" : q2(x.a) + " × " + q2(x.b)) + "</td><td>" + q2(x.gross) + "</td><td>" + q2(x.op) + "</td><td>" + x.mult + "</td><td>" + (x.isArea ? "—" : nf(x.lay.count * x.mult)) + "</td></tr>").join("");
    let netTotal = 0, grossTotal = 0, opTotal = 0;
    r.items.forEach((x) => { netTotal += x.net; grossTotal += x.gross; opTotal += x.op; });
    return '<table class="dry__tbl dry__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + '<tr class="dry__total"><td>' + T.rowTotal + "</td><td></td><td></td><td>" + q2(grossTotal) + "</td><td>" + q2(opTotal) + "</td><td></td><td>" + nf(r.layoutBase) + "</td></tr></tbody></table>";
  }
  function costTable(r) {
    const head = "<thead><tr><th>" + T.thCostItem + "</th><th>" + T.thQty + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const qty = (x) => nf(x.qty) + NB + (x.unit === "sheets" ? pl(x.qty, T.sheetsW) : x.unit === "scr" ? (IS_EN ? "pcs" : "шт") : pl(x.qty, T.pcsW));
    const per = (x) => (x.unit === "sheets" ? (IS_EN ? "sheet" : "лист") : x.unit === "scr" ? T.per100 : IS_EN ? "pc" : "шт");
    let body = r.lines.map((x) => "<tr><td>" + T[x.k] + "</td><td>" + qty(x) + "</td><td>" + (x.price ? unitMoney(x.price) + " / " + per(x) : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.P.pDel) body += "<tr><td>" + T.rDel + "</td><td></td><td></td><td>" + money(r.P.pDel) + "</td></tr>";
    if (r.hasPrice) body += '<tr class="dry__total"><td>' + T.rTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="dry__tbl dry__tbl--sch" id="costTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function barHtml(r) {
    const parts = r.lines.map((x) => ({ name: T[x.k], v: x.sum }));
    if (r.P.pDel > 0) parts.push({ name: T.rDel, v: r.P.pDel });
    const useful = parts.filter((p) => p.v > 0);
    if (useful.length < 2) return "";
    useful.forEach((p, i) => (p.c = COLORS[i % COLORS.length]));
    const seg = useful.map((p) => '<div style="width:' + ((p.v / r.cost) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = useful.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.cost) * 1000) / 10) + "%</span>").join("");
    return '<div class="dry__sub">' + (IS_EN ? "What the cost consists of" : "З чого складається вартість") + '</div><div class="dry__bar" role="img" aria-label="' + (IS_EN ? "Cost structure" : "Структура вартості") + '">' + seg + '</div><div class="dry__legend">' + leg + "</div>";
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="dry__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const n = r.items.length;
    const head = '<div class="dry__kpiT">' + fill(T.title, { n: nf(n) + NB + pl(n, T.itemW), m: T.methTxt[r.meth], r: pct(r.res) }) + '</div><div class="dry__big">' + nf(r.sheets) + NB + pl(r.sheets, T.sheetsW) + '</div><div class="dry__chipWrap"><span class="dry__chip">' + fill(T.chip, { o: r.meth === "layout" ? T.chipArea : T.chipLayout, n: nf(r.other), w: pl(r.other, T.sheetsW) }) + "</span></div>";
    const cost = r.hasPrice ? '<div class="dry__per"><div class="dry__kpiT">' + T.tCost + '</div><div class="dry__perV">' + money(r.cost) + '</div><div class="dry__kpiT dry__mt2">' + fill(T.perM2, { p: unitMoney(r.perM2) }) + "</div></div>" : "";
    const tiles = [tile(T.tArea, q1(r.sheetsArea) + NB + M2), tile(T.tBase, nf(r.base))];
    if (r.frame) {
      tiles.push(tile(T.tCd, nf(r.cdPieces)), tile(T.tUd, nf(r.udPieces)));
      if (r.screws) tiles.push(tile(T.tScr, nf(r.screws)));
    }
    box.innerHTML =
      '<div class="dry__head"><div>' + head + (eq ? '<div class="dry__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      (r.hasPrice ? barHtml(r) : "") +
      layoutHtml(r) +
      '<div class="dry__kpis dry__kpis--' + (tiles.length === 4 ? "4" : "3") + '">' + tiles.join("") + "</div>" +
      '<div class="dry__note">' + T.note + (r.frame && r.anyArea ? " " + T.noteFrame : "") + "</div>";
    el("schedBody").innerHTML = itemTable(r) + (r.hasPrice || r.frame ? '<div class="dry__sub">' + T.tCost + "</div>" + costTable(r) : "");
    sch.hidden = false;
    r.items.forEach((x) => (el("nv" + x.i).textContent = x.isArea || r.meth === "area" ? q1(x.net) + NB + M2 : fill(T.itemInfo, { n: nf(x.lay.count * x.mult), w: pl(x.lay.count * x.mult, T.sheetsW), a: q1(x.gross) })));
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
    a.download = "drywall.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    let txt = T.copyD + ": " + nf(last.sheets) + " " + pl(last.sheets, T.sheetsW) + " " + g(last.sl) + "×" + g(last.sw) + " " + T.mm + " (" + T.methTxt[last.meth] + ")";
    if (last.frame) txt += "; CD: " + nf(last.cdPieces) + ", UD: " + nf(last.udPieces) + (last.screws ? "; " + T.tScr + ": " + nf(last.screws) : "");
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
  const DDP = (hid) => (/^n\d_type$/.test(hid) ? "n" + hid[1] + "t" : /^n\d_ly$/.test(hid) ? "n" + hid[1] + "y" : hid === "sheetp" ? "sp" : "me");
  function setDd(hid, v) {
    const pre = DDP(hid), lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }
  // тип поверхні → які поля видно й як підписано другий розмір
  function syncVisibility() {
    visibleItems().forEach((i) => {
      const t = el(nId(i, "type")).value, isArea = t === "area";
      el("n" + i + "_aW").hidden = isArea;
      el("n" + i + "_bW").hidden = isArea;
      el("n" + i + "_arW").hidden = !isArea;
      const lab = el("n" + i + "_bL");
      lab.firstChild.textContent = (t === "ceiling" ? T.lbl.bc : T.lbl.b) + (IS_EN ? ", m" : ", м") + " ";
    });
  }
  function syncSheetDd() {
    const l = raw("sl").replace(",", "."), w = raw("sw").replace(",", ".");
    const hit = Object.keys(SHEETS).find((k) => Number(SHEETS[k][0]) === Number(l) && Number(SHEETS[k][1]) === Number(w));
    setDd("sheetp", hit || "custom");
  }

  // ===== поверхні =====
  function syncAll() {
    visibleItems().forEach((i, idx) => {
      el("nl" + i).querySelector(".dry__elHead span").textContent = fill(T.item, { n: idx + 1 });
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
    ["a", "b", "ar", "op"].forEach((k) => (el(nId(i, k)).value = ""));
    setDd(nId(i, "type"), "wall");
    setDd(nId(i, "ly"), "1");
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
  const FIELD_IDS = [].concat(
    ...Array.from({ length: MAXN }, (_, k) => ["a", "b", "ar", "op"].map((x) => nId(k + 1, x))),
    ["sl", "sw", "reserve", "cd", "plen", "scr"], PRICE_IDS
  );
  const SAMPLE = { items: [["wall", "4", "2.7", "", "", "1"], ["ceiling", "4", "3.5", "", "", "1"]], f: { reserve: "5", cd: "60", plen: "3", scr: "25", pSheet: "600", pCd: "110", pUd: "95", pScr: "120" } };

  function setItems(list) {
    for (let i = 1; i <= MAXN; i++) {
      clearItem(i);
      el("nl" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, a, b, ar, op, ly], idx) => {
      const i = idx + 1;
      setDd(nId(i, "type"), t);
      setDd(nId(i, "ly"), ly || "1");
      el(nId(i, "a")).value = a || "";
      el(nId(i, "b")).value = b || "";
      el(nId(i, "ar")).value = ar || "";
      el(nId(i, "op")).value = op || "";
    });
    syncAll();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    setDd("sheetp", "s1225");
    el("sl").value = SHEETS.s1225[0];
    el("sw").value = SHEETS.s1225[1];
    setDd("meth", "layout");
    setItems([]);
    el("frameDet").open = false;
    el("priceDet").open = false;
    syncAll();
    render({ ok: false, none: true });
  }
  function fillExample() {
    resetAll();
    if (cur !== "UAH") setCur("UAH", false);
    Object.entries(SAMPLE.f).forEach(([k, v]) => (el(k).value = v));
    setItems(SAMPLE.items);
    el("frameDet").open = true;
    el("priceDet").open = true;
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("cur", cur);
    p.set("meth", el("meth").value);
    visibleItems().forEach((i, idx) => {
      p.set("n" + (idx + 1), [el(nId(i, "type")).value, raw(nId(i, "a")) || "0", raw(nId(i, "b")) || "0", raw(nId(i, "ar")) || "0", raw(nId(i, "op")) || "0", el(nId(i, "ly")).value].join(":"));
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
    if (METHODS.includes(q.get("meth"))) setDd("meth", q.get("meth"));
    const list = [];
    for (let i = 1; i <= MAXN; i++) {
      if (!q.has("n" + i)) continue;
      const [t, a, b, ar, op, ly] = q.get("n" + i).split(":");
      if (!TYPES.includes(t)) continue;
      const z = (x) => (!x || x === "0" ? "" : x.slice(0, 10));
      list.push([t, z(a), z(b), z(ar), z(op), ["1", "2", "3"].includes(ly) ? ly : "1"]);
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
      syncSheetDd();
      el("frameDet").open = ["cd", "plen", "scr"].some((id) => raw(id) !== "");
      el("priceDet").open = PRICE_IDS.some((id) => raw(id) !== "");
    }
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    FIELD_IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (id === "sl" || id === "sw") syncSheetDd();
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc(true);
      });
    });
    initDd("sp", (v) => {
      setDd("sheetp", v);
      if (SHEETS[v]) {
        el("sl").value = SHEETS[v][0];
        el("sw").value = SHEETS[v][1];
      }
      calc();
    });
    initDd("me", (v) => {
      setDd("meth", v);
      calc();
    });
    for (let i = 1; i <= MAXN; i++) {
      initDd("n" + i + "t", (v) => {
        setDd(nId(i, "type"), v);
        syncVisibility();
        calc();
      });
      initDd("n" + i + "y", (v) => {
        setDd(nId(i, "ly"), v);
        calc();
      });
      el("nl" + i + "rm").addEventListener("click", () => {
        removeItem(i);
        calc();
      });
    }
    el("addNl").addEventListener("click", addItem);
    el("frameDet").addEventListener("toggle", () => calc());
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
