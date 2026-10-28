/* tile-calculator.js — калькулятор плитки: до шести поверхонь (підлога, стіна, площа), плитки з урахуванням шва, запас, упаковки, необов'язкові клей і затирка та вартість (UK/EN, UAH/USD/EUR)
   Кількість плиток = ceil(чиста площа × (1 + запас) / ((L + шов) × (W + шов))), розміри в мм; упаковки — вгору, за штуками або за м² в упаковці.
   Клей = чиста площа × витрата (кг/м² за розміром зубця шпателя); мішки — вгору.
   Затирка = чиста площа × (L + W) / (L × W) × товщина плитки × шов × густина (мм, кг/дм³ → кг/м²); мішки — вгору.
   Вбудованих цін немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = " ";
  const MAXS = 6;
  const LIM = { price: { UAH: 1000000, USD: 25000, EUR: 25000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf", "#86a0d6", "#16a34a", "#aec1e6"];
  const PRICE_IDS = ["pTile", "pAd", "pGr", "pDel"];
  const NOTCH = { "6": 2.7, "8": 3.6, "10": 4.2 };
  // запас, який підставляє вибір укладання (підказка, поле запасу редагується)
  const LAYOUT_RES = { straight: "10", offset: "10", diag: "15", complex: "20" };

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errInt: "“{f}” must be a whole number.",
        errCut: "The openings area must be smaller than the surface area ({a} m²).",
        errTotal: "The total is too large — check the dimensions.",
        errNoSurf: "Enter the dimensions of at least one surface.",
        errPrice: "Enter the pack size (pcs or m²) or leave the tile price empty.",
        surf: "Surface {n}", surfInfo: "{a} m² · {k} pcs",
        lbl: { len: "Length", wid: "Width", hgt: "Height", area: "Area", op: "Openings area", tl: "Tile length", tw: "Tile width", joint: "Joint", pcs: "Pieces per pack", pm2: "Area per pack", reserve: "Reserve", acons: "Adhesive consumption", abag: "Adhesive bag", th: "Tile thickness", gd: "Grout density", gbag: "Grout bag", pTile: "Tile price per m²", pAd: "Adhesive bag price", pGr: "Grout bag price", pDel: "Delivery" },
        units: { len: " m", wid: " m", hgt: " m", area: " m²", op: " m²", tl: " mm", tw: " mm", joint: " mm", pcs: " pcs", pm2: " m²", reserve: " %", acons: " kg/m²", abag: " kg", th: " mm", gd: " kg/dm³", gbag: " kg" },
        title: "Tile · {n} · {a} m² of net area + {r}% reserve", surfW: ["surface", "surfaces", "surfaces"], tileW: ["tile", "tiles", "tiles"], packW: ["pack", "packs", "packs"], bagW: ["bag", "bags", "bags"],
        chipPcs: "{pk} of {c} pcs · {t} pcs", chipM2: "{pk} of {c} m²", chipNone: "{a} m² of tile",
        tAd: "Adhesive", tGr: "Grout", tBought: "Tile in packs", tBoughtNone: "Tile area", tLeft: "Left over", tNet: "Net area", tNo: "Without reserve", tMod: "Tile with joint",
        tKg: "{kg} kg", tLeftPcs: "{n} pcs", tLeftM2: "{a} m²", tModMini: "{l} × {w} mm",
        tCost: "Cost", perM2: "{p} per m² of tiling",
        thSurf: "Surface", thArea: "Net area", thPcs: "Tiles", rowTotal: "Total (without reserve)",
        thItem: "Item", thQty: "Quantity", thPrice: "Price", thSum: "Amount",
        rTile: "Tile", rAd: "Adhesive", rGr: "Grout", rDel: "Delivery", rTotal: "Total", u: { m2: "m²", bags: "bags" },
        barTitle: "What the cost consists of", bar: "Cost structure",
        note: "An approximate estimate: the real consumption depends on the layout, the cutting and the evenness of the base. Adhesive and grout are counted for the net area.",
        noteJoint: "Enter the joint width so that the tiles are counted with it.",
        noteGrout: "Enter the tile thickness and the joint width to count the grout.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅",
        copyTile: "Tile"
      }
    : {
        enter: "Вкажіть дані — результат з'явиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errInt: "«{f}» має бути цілим числом.",
        errCut: "Площа отворів має бути меншою за площу поверхні ({a} м²).",
        errTotal: "Підсумок завеликий — перевірте розміри.",
        errNoSurf: "Вкажіть розміри хоча б однієї поверхні.",
        errPrice: "Вкажіть розмір упаковки (шт або м²) або залиште ціну плитки порожньою.",
        surf: "Поверхня {n}", surfInfo: "{a} м² · {k} шт",
        lbl: { len: "Довжина", wid: "Ширина", hgt: "Висота", area: "Площа", op: "Площа отворів", tl: "Довжина плитки", tw: "Ширина плитки", joint: "Шов", pcs: "Штук в упаковці", pm2: "М² в упаковці", reserve: "Запас", acons: "Витрата клею", abag: "Мішок клею", th: "Товщина плитки", gd: "Густина затирки", gbag: "Мішок затирки", pTile: "Ціна плитки за м²", pAd: "Ціна мішка клею", pGr: "Ціна мішка затирки", pDel: "Доставка" },
        units: { len: " м", wid: " м", hgt: " м", area: " м²", op: " м²", tl: " мм", tw: " мм", joint: " мм", pcs: " шт", pm2: " м²", reserve: " %", acons: " кг/м²", abag: " кг", th: " мм", gd: " кг/дм³", gbag: " кг" },
        title: "Плитка · {n} · {a} м² чистої площі + запас {r}%", surfW: ["поверхня", "поверхні", "поверхонь"], tileW: ["плитка", "плитки", "плиток"], packW: ["упаковка", "упаковки", "упаковок"], bagW: ["мішок", "мішки", "мішків"],
        chipPcs: "{pk} по {c} шт · {t} шт", chipM2: "{pk} по {c} м²", chipNone: "{a} м² плитки",
        tAd: "Клей", tGr: "Затирка", tBought: "Плитки в упаковках", tBoughtNone: "Площа плиток", tLeft: "Залишок", tNet: "Чиста площа", tNo: "Без запасу", tMod: "Плитка зі швом",
        tKg: "{kg} кг", tLeftPcs: "{n} шт", tLeftM2: "{a} м²", tModMini: "{l} × {w} мм",
        tCost: "Вартість", perM2: "{p} за м² облицювання",
        thSurf: "Поверхня", thArea: "Чиста площа", thPcs: "Плиток", rowTotal: "Разом (без запасу)",
        thItem: "Позиція", thQty: "Кількість", thPrice: "Ціна", thSum: "Сума",
        rTile: "Плитка", rAd: "Клей", rGr: "Затирка", rDel: "Доставка", rTotal: "Разом", u: { m2: "м²", bags: "мішків" },
        barTitle: "З чого складається вартість", bar: "Структура вартості",
        note: "Орієнтовна оцінка: реальна витрата залежить від розкладки, підрізки й рівності основи. Клей і затирка рахуються за чистою площею.",
        noteJoint: "Вкажіть ширину шва, щоб плитки рахувались з ним.",
        noteGrout: "Вкажіть товщину плитки й ширину шва, щоб порахувати затирку.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅",
        copyTile: "Плитка"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const nf = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d + 0).toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });
  const q1 = (x) => nf(x, 1);
  const q2 = (x) => nf(x, 2);
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
  const sId = (i, k) => "s" + i + "_" + k;
  const visibleSurfaces = () => Array.from({ length: MAXS }, (_, k) => k + 1).filter((i) => !el("sl" + i).hidden);
  const MAXPCS = 100000000;

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

  function compute() {
    let err = null;
    const miss = [];
    const note = (r) => {
      if (r.miss) miss.push(r.miss);
      if (r.err && !err) err = r.err;
      return r;
    };
    const extras = el("extraDet").open;
    const tl = note(val("tl", T.lbl.tl, 10, 3000, true, false, T.units.tl)).v;
    const tw = note(val("tw", T.lbl.tw, 10, 3000, true, false, T.units.tw)).v;
    const j = note(val("joint", T.lbl.joint, 0, 50, false, false, T.units.joint)).v || 0;
    const pcs = note(val("pcs", T.lbl.pcs, 1, 1000, false, true)).v;
    const pm2 = note(val("pm2", T.lbl.pm2, 0.05, 50, false, false, T.units.pm2)).v;
    const res = note(val("reserve", T.lbl.reserve, 0, 50, false, false, T.units.reserve)).v || 0;
    let ac = null, abag = 25, th = null, gd = 1.6, gbag = 2;
    if (extras) {
      const nv = el("anotch").value;
      ac = nv === "custom" ? note(val("acons", T.lbl.acons, 0.1, 30, true, false, T.units.acons)).v : NOTCH[nv];
      abag = note(val("abag", T.lbl.abag, 1, 100, false, false, T.units.abag)).v || 25;
      th = note(val("th", T.lbl.th, 1, 60, false, false, T.units.th)).v;
      gd = note(val("gd", T.lbl.gd, 0.5, 3, false, false, T.units.gd)).v || 1.6;
      gbag = note(val("gbag", T.lbl.gbag, 0.1, 50, false, false, T.units.gbag)).v || 2;
    }
    const surfaces = [];
    visibleSurfaces().forEach((i, idx) => {
      const t = el(sId(i, "type")).value;
      const two = t !== "area";
      const used = (two ? ["p1", "p2"] : ["p1"]).some((k) => raw(sId(i, k)) !== "") || raw(sId(i, "op")) !== "";
      if (!used) return;
      const name = fill(T.surf, { n: idx + 1 });
      const p1 = note(val(sId(i, "p1"), name + ": " + (two ? T.lbl.len : T.lbl.area), 0.1, two ? 1000 : 100000, true, false, two ? T.units.len : T.units.area));
      const p2 = two ? note(val(sId(i, "p2"), name + ": " + (t === "wl" ? T.lbl.hgt : T.lbl.wid), 0.1, t === "wl" ? 50 : 1000, true, false, t === "wl" ? T.units.hgt : T.units.wid)) : { v: 1 };
      const op = note(val(sId(i, "op"), name + ": " + T.lbl.op, 0, 100000, false, false, T.units.op));
      if (!miss.length && !err) {
        const gross = two ? p1.v * p2.v : p1.v;
        const opv = op.v || 0;
        if (opv >= gross) {
          err = fill(T.errCut, { a: q2(gross) });
          return;
        }
        surfaces.push({ i, idx, name, gross, net: gross - opv });
      }
    });
    const P = {
      tile: note(val("pTile", T.lbl.pTile, 0, LIM.price[cur], false)).v,
      ad: note(val("pAd", T.lbl.pAd, 0, LIM.price[cur], false)).v,
      gr: note(val("pGr", T.lbl.pGr, 0, LIM.price[cur], false)).v,
      del: note(val("pDel", T.lbl.pDel, 0, LIM.fixed, false)).v || 0
    };
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!surfaces.length) return { ok: false, incomplete: true, none: true, msg: T.errNoSurf };
    const pieceArea = (tl / 1000) * (tw / 1000), modArea = ((tl + j) / 1000) * ((tw + j) / 1000);
    let netTotal = 0;
    surfaces.forEach((s) => (netTotal += s.net));
    if (netTotal > MAXPCS) return { ok: false, msg: T.errTotal };
    const f = 1 + res / 100;
    const rows = surfaces.map((s) => ({ ...s, pcsNo: Math.ceil(s.net / modArea - 1e-9) }));
    const rawNo = netTotal / modArea;
    const R = { ok: true, cur, extras, rows, res, netTotal, tl, tw, j, pieceArea, modArea, P, pcsNo: Math.ceil(rawNo - 1e-9) };
    R.pieces = Math.ceil(rawNo * f - 1e-9);
    if (R.pieces > MAXPCS) return { ok: false, msg: T.errTotal };
    if (pcs) {
      R.mode = "pcs";
      R.packs = Math.ceil(R.pieces / pcs - 1e-9);
      R.boughtPcs = R.packs * pcs;
      R.bought = R.boughtPcs * pieceArea;
      R.leftPcs = R.boughtPcs - R.pieces;
      R.pcs = pcs;
    } else if (pm2) {
      R.mode = "m2";
      R.packs = Math.ceil((R.pieces * pieceArea) / pm2 - 1e-9);
      R.bought = R.packs * pm2;
      R.leftM2 = R.bought - R.pieces * pieceArea;
      R.pm2 = pm2;
    } else {
      R.mode = "none";
      R.bought = R.pieces * pieceArea;
    }
    if (P.tile && R.mode === "none") return { ok: false, msg: T.errPrice };
    const lines = [{ k: "rTile", qty: R.bought, unit: "m2", price: P.tile, sum: P.tile ? R.bought * P.tile : 0 }];
    if (extras) {
      R.adKg = netTotal * ac;
      R.adBags = Math.ceil(R.adKg / abag - 1e-9);
      R.abag = abag;
      lines.push({ k: "rAd", qty: R.adBags, unit: "bags", price: P.ad, sum: P.ad ? R.adBags * P.ad : 0 });
      R.grOk = !!(th && j > 0);
      if (R.grOk) {
        R.grKg = netTotal * ((tl + tw) / (tl * tw)) * th * j * gd;
        R.grBags = Math.ceil(R.grKg / gbag - 1e-9);
        R.gbag = gbag;
        lines.push({ k: "rGr", qty: R.grBags, unit: "bags", price: P.gr, sum: P.gr ? R.grBags * P.gr : 0 });
      }
    }
    R.lines = lines;
    R.cost = lines.reduce((s, x) => s + x.sum, 0) + P.del;
    R.hasPrice = R.cost > 0;
    R.perM2Cost = R.hasPrice ? R.cost / netTotal : 0;
    return R;
  }

  // ===== відображення =====
  const tile = (title, value, mini) => '<div class="til__kpi"><div class="til__kpiT">' + title + '</div><div class="til__kpiV">' + value + "</div>" + (mini ? '<div class="til__kpiM">' + mini + "</div>" : "") + "</div>";
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  const cntTxt = (n, w) => nf(n) + NB + pl(n, w);

  function surfTable(r) {
    const head = "<thead><tr><th>" + T.thSurf + "</th><th>" + T.thArea + "</th><th>" + T.thPcs + "</th></tr></thead>";
    const body = r.rows.map((s) => "<tr><td>" + s.name + "</td><td>" + q2(s.net) + NB + M2 + "</td><td>" + nf(s.pcsNo) + "</td></tr>").join("");
    return '<table class="til__tbl til__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + '<tr class="til__total"><td>' + T.rowTotal + "</td><td>" + q2(r.netTotal) + NB + M2 + "</td><td>" + nf(r.pcsNo) + "</td></tr></tbody></table>";
  }
  function costTable(r) {
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thQty + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const qty = (x) => (x.unit === "m2" ? q2(x.qty) + NB + T.u.m2 : cntTxt(x.qty, T.bagW));
    let body = r.lines.map((x) => "<tr><td>" + T[x.k] + "</td><td>" + qty(x) + "</td><td>" + (x.price ? unitMoney(x.price) : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.P.del) body += "<tr><td>" + T.rDel + "</td><td></td><td></td><td>" + money(r.P.del) + "</td></tr>";
    if (r.hasPrice) body += '<tr class="til__total"><td>' + T.rTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="til__tbl til__tbl--sch" id="costTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function barHtml(r) {
    const parts = r.lines.filter((x) => x.sum > 0).map((x) => ({ name: T[x.k], v: x.sum }));
    if (r.P.del > 0) parts.push({ name: T.rDel, v: r.P.del });
    if (!parts.length) return "";
    parts.forEach((p, i) => (p.c = COLORS[i % COLORS.length]));
    const seg = parts.map((p) => '<div style="width:' + ((p.v / r.cost) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = parts.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.cost) * 1000) / 10) + "%</span>").join("");
    return '<div class="til__sub">' + T.barTitle + '</div><div class="til__bar" role="img" aria-label="' + T.bar + '">' + seg + '</div><div class="til__legend">' + leg + "</div>";
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="til__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const n = r.rows.length;
    let chip;
    if (r.mode === "pcs") chip = fill(T.chipPcs, { pk: cntTxt(r.packs, T.packW), c: nf(r.pcs), t: nf(r.boughtPcs) });
    else if (r.mode === "m2") chip = fill(T.chipM2, { pk: cntTxt(r.packs, T.packW), c: q2(r.pm2) });
    else chip = fill(T.chipNone, { a: q2(r.bought) });
    const head = '<div class="til__kpiT">' + fill(T.title, { n: cntTxt(n, T.surfW), a: q2(r.netTotal), r: pct(r.res) }) + '</div><div class="til__big">' + cntTxt(r.pieces, T.tileW) + '</div><div class="til__chipWrap"><span class="til__chip">' + chip + "</span></div>";
    const cost = r.hasPrice ? '<div class="til__per"><div class="til__kpiT">' + T.tCost + '</div><div class="til__perV">' + money(r.cost) + '</div><div class="til__kpiT til__mt2">' + fill(T.perM2, { p: money(r.perM2Cost) }) + "</div></div>" : "";
    const boughtTile = r.mode === "none" ? tile(T.tBoughtNone, q2(r.bought) + NB + M2) : tile(T.tBought, q2(r.bought) + NB + M2, r.mode === "pcs" ? fill(T.tLeftPcs, { n: nf(r.boughtPcs) }) : "");
    const leftTile = r.mode === "pcs" ? tile(T.tLeft, fill(T.tLeftPcs, { n: nf(r.leftPcs) })) : r.mode === "m2" ? tile(T.tLeft, fill(T.tLeftM2, { a: q2(r.leftM2) })) : tile(T.tMod, nf(r.tl + r.j) + "×" + nf(r.tw + r.j), IS_EN ? "mm" : "мм");
    let tiles;
    if (r.extras) {
      tiles = tile(T.tAd, cntTxt(r.adBags, T.bagW), fill(T.tKg, { kg: q1(r.adKg) })) + (r.grOk ? tile(T.tGr, cntTxt(r.grBags, T.bagW), fill(T.tKg, { kg: q2(r.grKg) })) : tile(T.tGr, "—")) + boughtTile + leftTile;
    } else {
      tiles = tile(T.tNet, q2(r.netTotal) + NB + M2) + tile(T.tNo, nf(r.pcsNo) + NB + pl(r.pcsNo, T.tileW)) + boughtTile + leftTile;
    }
    const notes = T.note + (r.j === 0 ? " " + T.noteJoint : "") + (r.extras && !r.grOk ? " " + T.noteGrout : "");
    box.innerHTML =
      '<div class="til__head"><div>' + head + (eq ? '<div class="til__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      (r.hasPrice ? barHtml(r) : "") +
      '<div class="til__kpis til__kpis--4">' + tiles + "</div>" +
      '<div class="til__note">' + notes + "</div>";
    el("schedBody").innerHTML = surfTable(r) + (r.hasPrice || r.extras ? '<div class="til__sub">' + T.tCost + "</div>" + costTable(r) : "");
    sch.hidden = false;
    r.rows.forEach((s) => (el("sv" + s.i).textContent = fill(T.surfInfo, { a: q2(s.net), k: nf(s.pcsNo) })));
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
    a.download = "tile.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    let txt = T.copyTile + ": " + cntTxt(last.pieces, T.tileW);
    if (last.mode === "pcs") txt += " (" + cntTxt(last.packs, T.packW) + ", " + nf(last.boughtPcs) + " " + (IS_EN ? "pcs" : "шт") + ")";
    else if (last.mode === "m2") txt += " (" + cntTxt(last.packs, T.packW) + ", " + q2(last.bought) + " " + M2 + ")";
    if (last.extras) {
      txt += "; " + T.tAd + ": " + cntTxt(last.adBags, T.bagW) + " (" + q1(last.adKg) + " " + (IS_EN ? "kg" : "кг") + ")";
      if (last.grOk) txt += "; " + T.tGr + ": " + cntTxt(last.grBags, T.bagW) + " (" + q2(last.grKg) + " " + (IS_EN ? "kg" : "кг") + ")";
    }
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
  const DDP = (hid) => (/^s\d_type$/.test(hid) ? "s" + hid[1] + "t" : hid === "layout" ? "ly" : "an");
  function setDd(hid, v) {
    const pre = DDP(hid), lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }

  // ===== поверхні =====
  function syncSurface(i) {
    const t = el(sId(i, "type")).value;
    el(sId(i, "p2")).closest(".til__field").hidden = t === "area";
    el(sId(i, "p1_l")).textContent = t === "area" ? T.lbl.area + ", " + M2 : T.lbl.len + ", " + (IS_EN ? "m" : "м");
    el(sId(i, "p2_l")).textContent = (t === "wl" ? T.lbl.hgt : T.lbl.wid) + ", " + (IS_EN ? "m" : "м");
    el("sl" + i + "rm").hidden = visibleSurfaces().length < 2;
  }
  function syncAll() {
    visibleSurfaces().forEach((i, idx) => {
      syncSurface(i);
      el("sl" + i).querySelector(".til__elHead span").textContent = fill(T.surf, { n: idx + 1 });
    });
    el("addSl").hidden = visibleSurfaces().length >= MAXS;
    el("acCustom").hidden = el("anotch").value !== "custom";
  }
  function addSurface() {
    const i = Array.from({ length: MAXS }, (_, k) => k + 1).find((x) => el("sl" + x).hidden);
    if (!i) return;
    el("sl" + i).hidden = false;
    syncAll();
  }
  function removeSurface(i) {
    if (visibleSurfaces().length < 2) return;
    clearSurface(i);
    el("sl" + i).hidden = true;
    syncAll();
  }
  function clearSurface(i) {
    ["p1", "p2", "op"].forEach((k) => (el(sId(i, k)).value = ""));
    setDd(sId(i, "type"), "fl");
    el("sv" + i).textContent = "—";
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
    ...Array.from({ length: MAXS }, (_, k) => ["p1", "p2", "op"].map((x) => sId(k + 1, x))),
    ["tl", "tw", "joint", "pcs", "pm2", "reserve", "acons", "abag", "th", "gd", "gbag", "pTile", "pAd", "pGr", "pDel"]
  );
  const SAMPLE = { s: [["fl", "3.2", "2.4", ""]], f: { tl: "600", tw: "300", joint: "3", pcs: "8", reserve: "10", th: "9", pTile: "650", pAd: "380", pGr: "150", pDel: "300" } };

  function setSurfaces(list) {
    for (let i = 1; i <= MAXS; i++) {
      clearSurface(i);
      el("sl" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, a, b, op], idx) => {
      const i = idx + 1;
      setDd(sId(i, "type"), t);
      el(sId(i, "p1")).value = a || "";
      el(sId(i, "p2")).value = b || "";
      el(sId(i, "op")).value = op || "";
    });
    syncAll();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    el("abag").value = "25";
    el("gd").value = "1.6";
    el("gbag").value = "2";
    setDd("anotch", "8");
    setDd("layout", "none");
    setSurfaces([]);
    el("extraDet").open = false;
    el("priceDet").open = false;
    syncAll();
    render({ ok: false, none: true });
  }
  function fillExample() {
    resetAll();
    if (cur !== "UAH") setCur("UAH", false);
    Object.entries(SAMPLE.f).forEach(([k, v]) => (el(k).value = v));
    setSurfaces(SAMPLE.s);
    el("extraDet").open = true;
    el("priceDet").open = true;
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("cur", cur);
    if (el("layout").value !== "none") p.set("ly", el("layout").value);
    visibleSurfaces().forEach((i, idx) => {
      p.set("s" + (idx + 1), [el(sId(i, "type")).value, raw(sId(i, "p1")) || "0", raw(sId(i, "p2")) || "0", raw(sId(i, "op")) || "0"].join(":"));
    });
    ["tl", "tw", "joint", "pcs", "pm2", "reserve", "pTile", "pDel"].forEach((id) => raw(id) && p.set(id, raw(id)));
    if (el("extraDet").open) {
      p.set("x", "1");
      p.set("an", el("anotch").value);
      ["acons", "abag", "th", "gd", "gbag", "pAd", "pGr"].forEach((id) => raw(id) && p.set(id, raw(id)));
    } else ["pAd", "pGr"].forEach((id) => raw(id) && p.set(id, raw(id)));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    let any = false;
    if (["UAH", "USD", "EUR"].includes(q.get("cur"))) {
      cur = q.get("cur");
      syncCur();
    }
    if (q.has("an")) setDd("anotch", q.get("an"));
    if (q.has("ly")) setDd("layout", q.get("ly"));
    const list = [];
    for (let i = 1; i <= MAXS; i++) {
      if (!q.has("s" + i)) continue;
      const [t, a, b, op] = q.get("s" + i).split(":");
      if (!["fl", "wl", "area"].includes(t)) continue;
      const z = (x) => (!x || x === "0" ? "" : x.slice(0, 10));
      list.push([t, z(a), z(b), z(op)]);
    }
    if (list.length) {
      setSurfaces(list);
      any = true;
    }
    FIELD_IDS.forEach((id) => {
      if (!/^s\d_/.test(id) && q.has(id)) {
        el(id).value = q.get(id).slice(0, 12);
        any = true;
      }
    });
    if (q.get("x") === "1") el("extraDet").open = true;
    if (any) el("priceDet").open = ["pTile", "pAd", "pGr", "pDel"].some((id) => raw(id) !== "");
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    FIELD_IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (id === "reserve" && el("layout").value !== "none" && LAYOUT_RES[el("layout").value] !== raw("reserve")) setDd("layout", "none");
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc(true);
      });
    });
    initDd("ly", (v) => {
      setDd("layout", v);
      if (LAYOUT_RES[v]) el("reserve").value = LAYOUT_RES[v];
      calc();
    });
    initDd("an", (v) => {
      setDd("anotch", v);
      syncAll();
      calc();
    });
    for (let i = 1; i <= MAXS; i++) {
      initDd("s" + i + "t", (v) => {
        setDd(sId(i, "type"), v);
        syncSurface(i);
        calc();
      });
      el("sl" + i + "rm").addEventListener("click", () => {
        removeSurface(i);
        calc();
      });
    }
    el("addSl").addEventListener("click", addSurface);
    ["extraDet", "priceDet"].forEach((id) => el(id).addEventListener("toggle", () => calc()));
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
