/* insulation-calculator.js — калькулятор теплоізоляції: до шести позицій (стіни, покриття, горище, підлога, своя вимога), потрібна товщина утеплювача за опором теплопередачі, шари плити, плити й упаковки, візуалізація опору R, необов'язкова вартість (UK/EN, UAH/USD/EUR)
   Потрібний опір утеплювача R_ут = R_вимога − R_існуюча; товщина = R_ут × λ; шарів = ceil(товщина / товщина плити); фактична товщина = шари × плита; досягнутий R = R_існуюча + фактична / λ.
   Плити = площа × шари / площа плити; запас додається до плит; упаковки = ceil(плити з запасом / плит в упаковці). Вимоги для стін за ДБН В.2.6-31:2021: 4,0 (I зона) і 3,5 (II зона).
   Вбудованих цін немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = " ";
  const MAXN = 6;
  const LIM = { price: { UAH: 1000000, USD: 25000, EUR: 25000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf"];
  const PRICE_IDS = ["pMat", "pDel"];
  const LAMBDA = { wool: "0.040", eps: "0.036", xps: "0.032", pir: "0.025", custom: "" };
  // вимоги R, м²·К/Вт: I та II температурна зона (стіни: ДБН В.2.6-31:2021; покриття й горище — за джерелами, потребують перевірки)
  const REQ = { wall: { I: "4", II: "3.5" }, roof: { I: "7", II: "6" }, attic: { I: "6", II: "5.5" } };

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errInt: "“{f}” must be a whole number.",
        errOpen: "The openings area must be smaller than the area ({a} m²).",
        errTotal: "The total is too large — check the dimensions.",
        errNoPos: "Enter the data of at least one item.",
        errLayers: "The required insulation is too thick: more than 20 layers.",
        errPackPrice: "Enter the plates per pack to price the insulation per pack.",
        item: "Item {n}", itemInfo: "{a} m² · {t} mm", itemInfoNo: "{a} m² · none needed",
        lbl: { area: "Area", op: "Openings area", rq: "Required R", re: "Existing R", lam: "Conductivity λ", pt: "Plate thickness", pl: "Plate length", pw: "Plate width", ppk: "Plates per pack", reserve: "Reserve", pMat: "Price", pDel: "Delivery" },
        units: { area: " m²", op: " m²", rq: " m²·K/W", re: " m²·K/W", lam: " W/(m·K)", pt: " mm", pl: " mm", pw: " mm", ppk: "", reserve: " %" },
        types: { wall: "External walls", roof: "Combined roof", attic: "Attic or mansard roof", floor: "Floor or ceiling", custom: "Own requirement" },
        title: "Insulation · {n} · {m} · reserve {r}%", itemW: ["item", "items", "items"], packW: ["pack", "packs", "packs"], plateW: ["plate", "plates", "plates"],
        chipPlates: "{p} {w} {l}×{wd}×{t} mm", chipNone: "{p} plates {l}×{wd}×{t} mm",
        tVol: "Volume without reserve", tPlates: "Plates without reserve", tArea: "Area",
        tCost: "Cost", perM2: "{p} per m²",
        rTitle: "Thermal resistance R, m²·K/W", rLegend1: "existing structure", rLegend2: "insulation", rLegend3: "requirement",
        rRow: "{n} · {t} mm ({k} {kw}) · requirement {q} → R = {a}", rRowNo: "{n} · requirement {q} is already met: R = {a}",
        layerW: ["layer", "layers", "layers"],
        thItem: "Item", thType: "Type", thArea: "Area, m²", thReq: "Required R", thEx: "Existing R", thT: "Thickness, mm", thL: "Layers", thAch: "Achieved R", thVol: "Volume, m³", rowTotal: "Total (without reserve)",
        thCostItem: "Item", thQty: "Quantity", thPrice: "Price", thSum: "Amount",
        rMat: "Insulation", rDel: "Delivery", rTotal: "Total", u: { packs: "packs", plates: "plates", m3: "m³" },
        note: "An approximate estimate by a simplified model: the real thermal resistance depends on the whole structure, the thermal bridges and the way the insulation is fixed. Take λ from the data sheet of your product. Check the requirements for your climate zone in DBN V.2.6-31:2021.",
        noteReq: "The requirement for roofs is from secondary sources: check it against the table of the standard. For a floor enter the requirement yourself.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅",
        copyIns: "Insulation"
      }
    : {
        enter: "Вкажіть дані — результат з'явиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errInt: "«{f}» має бути цілим числом.",
        errOpen: "Площа отворів має бути меншою за площу ({a} м²).",
        errTotal: "Підсумок завеликий — перевірте розміри.",
        errNoPos: "Вкажіть дані хоча б однієї позиції.",
        errLayers: "Потрібне утеплення завелике: понад 20 шарів.",
        errPackPrice: "Вкажіть плит в упаковці, щоб порахувати вартість за упаковку.",
        item: "Позиція {n}", itemInfo: "{a} м² · {t} мм", itemInfoNo: "{a} м² · не потрібне",
        lbl: { area: "Площа", op: "Площа отворів", rq: "Вимога R", re: "Існуюча R", lam: "Теплопровідність λ", pt: "Товщина плити", pl: "Довжина плити", pw: "Ширина плити", ppk: "Плит в упаковці", reserve: "Запас", pMat: "Ціна", pDel: "Доставка" },
        units: { area: " м²", op: " м²", rq: " м²·К/Вт", re: " м²·К/Вт", lam: " Вт/(м·К)", pt: " мм", pl: " мм", pw: " мм", ppk: "", reserve: " %" },
        types: { wall: "Зовнішні стіни", roof: "Суміщене покриття", attic: "Горище або мансарда", floor: "Підлога, перекриття", custom: "Своя вимога" },
        title: "Теплоізоляція · {n} · {m} · запас {r}%", itemW: ["позиція", "позиції", "позицій"], packW: ["упаковка", "упаковки", "упаковок"], plateW: ["плита", "плити", "плит"],
        chipPlates: "{p} {w} {l}×{wd}×{t} мм", chipNone: "{p} плит {l}×{wd}×{t} мм",
        tVol: "Об'єм без запасу", tPlates: "Плит без запасу", tArea: "Площа",
        tCost: "Вартість", perM2: "{p} за м²",
        rTitle: "Опір теплопередачі R, м²·К/Вт", rLegend1: "існуюча конструкція", rLegend2: "утеплювач", rLegend3: "вимога",
        rRow: "{n} · {t} мм ({k} {kw}) · вимога {q} → R = {a}", rRowNo: "{n} · вимога {q} уже виконується: R = {a}",
        layerW: ["шар", "шари", "шарів"],
        thItem: "Позиція", thType: "Тип", thArea: "Площа, м²", thReq: "Вимога R", thEx: "Існуюча R", thT: "Товщина, мм", thL: "Шарів", thAch: "Досягнуто R", thVol: "Об'єм, м³", rowTotal: "Разом (без запасу)",
        thCostItem: "Позиція", thQty: "Кількість", thPrice: "Ціна", thSum: "Сума",
        rMat: "Утеплювач", rDel: "Доставка", rTotal: "Разом", u: { packs: "упаковок", plates: "плит", m3: "м³" },
        note: "Орієнтовна оцінка за спрощеною моделлю: реальний опір теплопередачі залежить від усієї конструкції, містків холоду й способу кріплення. Беріть λ з паспорта вашого продукту. Вимоги для вашої кліматичної зони перевіряйте за ДБН В.2.6-31:2021.",
        noteReq: "Вимога для покриттів із вторинних джерел: звірте її з таблицею норм. Для підлоги вкажіть вимогу самі.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅",
        copyIns: "Утеплювач"
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
  const nId = (i, k) => "n" + i + "_" + k;
  const visibleItems = () => Array.from({ length: MAXN }, (_, k) => k + 1).filter((i) => !el("nl" + i).hidden);
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
  function val(id, label, lo, hi, required, int, unit) {
    const v = num(id);
    if (v === null) return required ? { miss: label } : { v: null };
    if (Number.isNaN(v)) return { err: fill(T.errNum, { f: label }) };
    if (int && v % 1) return { err: fill(T.errInt, { f: label }) };
    if (v < lo || v > hi) return { err: fill(T.errRange, { f: label, a: lim(lo), b: lim(hi), u: unit || "" }) };
    return { v };
  }
  const matName = () => el("mt_val").textContent.split(" — ")[0];

  function compute() {
    let err = null;
    const miss = [];
    const note = (r) => {
      if (r.miss) miss.push(r.miss);
      if (r.err && !err) err = r.err;
      return r;
    };
    const lam = note(val("lam", T.lbl.lam, 0.01, 0.5, true, false, T.units.lam)).v;
    const pt = note(val("pt", T.lbl.pt, 5, 500, true, false, T.units.pt)).v;
    const plL = note(val("pl", T.lbl.pl, 100, 5000, true, false, T.units.pl)).v;
    const plW = note(val("pw", T.lbl.pw, 100, 5000, true, false, T.units.pw)).v;
    const ppk = note(val("ppk", T.lbl.ppk, 1, 1000, false, true)).v;
    const res = note(val("reserve", T.lbl.reserve, 0, 50, false, false, T.units.reserve)).v || 0;
    const items = [];
    visibleItems().forEach((i, idx) => {
      const t = el(nId(i, "type")).value;
      const used = ["area", "op", "rq", "re"].some((k) => raw(nId(i, k)) !== "");
      if (!used) return;
      const name = fill(T.item, { n: idx + 1 }) + ": ";
      const area = note(val(nId(i, "area"), name + T.lbl.area, 0.1, 1e7, true, false, T.units.area));
      const op = note(val(nId(i, "op"), name + T.lbl.op, 0, 1e7, false, false, T.units.op));
      const rq = note(val(nId(i, "rq"), name + T.lbl.rq, 0.1, 30, true, false, T.units.rq));
      const re = note(val(nId(i, "re"), name + T.lbl.re, 0, 30, false, false, T.units.re));
      if (!miss.length && !err) {
        const opv = op.v || 0;
        if (opv >= area.v) {
          err = fill(T.errOpen, { a: q2(area.v) });
          return;
        }
        const net = area.v - opv, Re = re.v || 0, Rt = rq.v;
        const need = Math.max(0, Rt - Re), reqMm = need * lam * 1000;
        const layers = need > 0 ? Math.ceil(reqMm / pt - 1e-9) : 0;
        if (layers > 20) {
          err = T.errLayers;
          return;
        }
        const tAct = layers * pt, Rach = Re + tAct / 1000 / lam;
        items.push({ i, idx, t, name: T.types[t], label: fill(T.item, { n: idx + 1 }), net, Rt, Re, reqMm, layers, tAct, Rach, vol: (net * tAct) / 1000, plates: (net * layers) / ((plL / 1000) * (plW / 1000)) });
      }
    });
    const P = { unit: el("punit").value, mat: note(val("pMat", T.lbl.pMat, 0, LIM.price[cur], false)).v, del: note(val("pDel", T.lbl.pDel, 0, LIM.fixed, false)).v || 0 };
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!items.length) return { ok: false, incomplete: true, none: true, msg: T.errNoPos };
    if (P.unit === "pack" && P.mat && !ppk) return { ok: false, msg: T.errPackPrice };
    let area = 0, vol = 0, platesNo = 0;
    items.forEach((x) => {
      area += x.net;
      vol += x.vol;
      platesNo += x.plates;
    });
    if (area > MAXV) return { ok: false, msg: T.errTotal };
    const f = 1 + res / 100, platesWith = Math.ceil(platesNo * f - 1e-9);
    const R = { ok: true, cur, items, lam, pt, plL, plW, ppk, res, area, vol, platesNo, platesWith, P, mat: matName() };
    R.packs = ppk ? Math.ceil(platesWith / ppk - 1e-9) : null;
    R.boughtVol = platesWith * (plL / 1000) * (plW / 1000) * (pt / 1000);
    const qty = P.unit === "pack" ? R.packs : P.unit === "plate" ? platesWith : R.boughtVol;
    R.lines = [{ k: "rMat", qty, unit: P.unit === "pack" ? "packs" : P.unit === "plate" ? "plates" : "m3", price: P.mat, sum: P.mat && qty ? qty * P.mat : 0 }];
    R.cost = R.lines[0].sum + P.del;
    R.hasPrice = R.cost > 0;
    R.perM2 = R.hasPrice ? R.cost / area : 0;
    R.anyIns = items.some((x) => x.layers > 0);
    R.roofNote = items.some((x) => x.t === "roof" || x.t === "attic");
    return R;
  }

  // ===== відображення =====
  const tile = (title, value, mini) => '<div class="ins__kpi"><div class="ins__kpiT">' + title + '</div><div class="ins__kpiV">' + value + "</div>" + (mini ? '<div class="ins__kpiM">' + mini + "</div>" : "") + "</div>";
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  const rTxt = (x) => nf(x, 2);
  function resistanceHtml(r) {
    const rows = r.items.map((x) => {
      const scale = Math.max(x.Rach, x.Rt, 0.01);
      const wEx = (Math.min(x.Re, x.Rach) / scale) * 100, wIns = ((x.Rach - Math.min(x.Re, x.Rach)) / scale) * 100, mk = (x.Rt / scale) * 100;
      const label = x.layers > 0 ? fill(T.rRow, { n: x.label + ": " + x.name, t: nf(x.tAct), k: nf(x.layers), kw: pl(x.layers, T.layerW), q: rTxt(x.Rt), a: rTxt(x.Rach) }) : fill(T.rRowNo, { n: x.label + ": " + x.name, q: rTxt(x.Rt), a: rTxt(x.Rach) });
      return '<div class="ins__rrow"><div class="ins__rlab">' + label + '</div><div class="ins__rb"><i class="ins__rbEx" style="left:0;width:' + wEx.toFixed(2) + '%"></i><i class="ins__rbIn" style="left:' + wEx.toFixed(2) + "%;width:" + wIns.toFixed(2) + '%"></i><i class="ins__rbMk" style="left:' + Math.min(mk, 100).toFixed(2) + '%"></i></div></div>';
    }).join("");
    return '<div class="ins__sub">' + T.rTitle + "</div>" + rows + '<div class="ins__legend"><span><i class="ins__sw ins__sw--ex"></i>' + T.rLegend1 + '</span><span><i class="ins__sw ins__sw--in"></i>' + T.rLegend2 + '</span><span><i class="ins__sw ins__sw--mk"></i>' + T.rLegend3 + "</span></div>";
  }
  function itemTable(r) {
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thType + "</th><th>" + T.thArea + "</th><th>" + T.thReq + "</th><th>" + T.thEx + "</th><th>" + T.thT + "</th><th>" + T.thL + "</th><th>" + T.thAch + "</th><th>" + T.thVol + "</th></tr></thead>";
    const body = r.items.map((x) => "<tr><td>" + x.label + "</td><td>" + x.name + "</td><td>" + q2(x.net) + "</td><td>" + rTxt(x.Rt) + "</td><td>" + rTxt(x.Re) + "</td><td>" + nf(x.tAct) + "</td><td>" + x.layers + "</td><td>" + rTxt(x.Rach) + "</td><td>" + q2(x.vol) + "</td></tr>").join("");
    return '<table class="ins__tbl ins__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + '<tr class="ins__total"><td>' + T.rowTotal + "</td><td></td><td>" + q2(r.area) + "</td><td></td><td></td><td></td><td></td><td></td><td>" + q2(r.vol) + "</td></tr></tbody></table>";
  }
  function costTable(r) {
    const head = "<thead><tr><th>" + T.thCostItem + "</th><th>" + T.thQty + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const qty = (x) => (x.unit === "m3" ? q2(x.qty) + NB + M3 : nf(x.qty) + NB + (x.unit === "packs" ? pl(x.qty, T.packW) : pl(x.qty, T.plateW)));
    const per = r.P.unit === "pack" ? (IS_EN ? "pack" : "упаковку") : r.P.unit === "plate" ? (IS_EN ? "plate" : "плиту") : M3;
    let body = r.lines.map((x) => "<tr><td>" + T[x.k] + "</td><td>" + qty(x) + "</td><td>" + (x.price ? unitMoney(x.price) + " / " + per : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.P.del) body += "<tr><td>" + T.rDel + "</td><td></td><td></td><td>" + money(r.P.del) + "</td></tr>";
    if (r.hasPrice) body += '<tr class="ins__total"><td>' + T.rTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="ins__tbl ins__tbl--sch" id="costTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function barHtml(r) {
    const parts = [{ name: T.rMat, v: r.lines[0].sum }];
    if (r.P.del > 0) parts.push({ name: T.rDel, v: r.P.del });
    const useful = parts.filter((p) => p.v > 0);
    if (useful.length < 2) return "";
    useful.forEach((p, i) => (p.c = COLORS[i % COLORS.length]));
    const seg = useful.map((p) => '<div style="width:' + ((p.v / r.cost) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = useful.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.cost) * 1000) / 10) + "%</span>").join("");
    return '<div class="ins__sub">' + (IS_EN ? "What the cost consists of" : "З чого складається вартість") + '</div><div class="ins__bar" role="img" aria-label="' + (IS_EN ? "Cost structure" : "Структура вартості") + '">' + seg + '</div><div class="ins__legend">' + leg + "</div>";
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="ins__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const n = r.items.length;
    const big = r.packs ? nf(r.packs) + NB + pl(r.packs, T.packW) : nf(r.platesWith) + NB + pl(r.platesWith, T.plateW);
    const chip = r.packs ? fill(T.chipPlates, { p: nf(r.platesWith), w: pl(r.platesWith, T.plateW), l: g(r.plL), wd: g(r.plW), t: g(r.pt) }) : fill(T.chipNone, { p: nf(r.platesWith), l: g(r.plL), wd: g(r.plW), t: g(r.pt) });
    const head = '<div class="ins__kpiT">' + fill(T.title, { n: nf(n) + NB + pl(n, T.itemW), m: r.mat, r: pct(r.res) }) + '</div><div class="ins__big">' + big + '</div><div class="ins__chipWrap"><span class="ins__chip">' + chip + "</span></div>";
    const cost = r.hasPrice ? '<div class="ins__per"><div class="ins__kpiT">' + T.tCost + '</div><div class="ins__perV">' + money(r.cost) + '</div><div class="ins__kpiT ins__mt2">' + fill(T.perM2, { p: unitMoney(r.perM2) }) + "</div></div>" : "";
    const tiles = tile(T.tVol, q1(r.vol) + NB + M3) + tile(T.tPlates, nf(Math.ceil(r.platesNo - 1e-9))) + tile(T.tArea, q1(r.area) + NB + M2);
    box.innerHTML =
      '<div class="ins__head"><div>' + head + (eq ? '<div class="ins__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      (r.hasPrice ? barHtml(r) : "") +
      resistanceHtml(r) +
      '<div class="ins__kpis ins__kpis--3">' + tiles + "</div>" +
      '<div class="ins__note">' + T.note + (r.roofNote ? " " + T.noteReq : "") + "</div>";
    el("schedBody").innerHTML = itemTable(r) + (r.hasPrice ? '<div class="ins__sub">' + T.tCost + "</div>" + costTable(r) : "");
    sch.hidden = false;
    r.items.forEach((x) => (el("nv" + x.i).textContent = x.layers > 0 ? fill(T.itemInfo, { a: q1(x.net), t: nf(x.tAct) }) : fill(T.itemInfoNo, { a: q1(x.net) })));
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
    a.download = "insulation.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    let txt = T.copyIns + ": " + (last.packs ? nf(last.packs) + " " + pl(last.packs, T.packW) + ", " : "") + nf(last.platesWith) + " " + pl(last.platesWith, T.plateW) + " " + g(last.plL) + "×" + g(last.plW) + "×" + g(last.pt) + " " + (IS_EN ? "mm" : "мм") + "; " + T.tVol + ": " + q1(last.vol) + " " + M3;
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
  const DDP = (hid) => (/^n\d_type$/.test(hid) ? "n" + hid[1] + "t" : hid === "zone" ? "zn" : hid === "matl" ? "mt" : "pu");
  function setDd(hid, v) {
    const pre = DDP(hid), lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }

  // ===== позиції =====
  // вимога R за типом і зоною підставляється автоматично, поки користувач її не змінив
  function autoReq(i) {
    const t = el(nId(i, "type")).value, f = el(nId(i, "rq"));
    if (f.dataset.auto === "0") return;
    const p = REQ[t];
    f.value = p ? p[el("zone").value] : "";
    f.dataset.auto = p ? "1" : "";
  }
  function syncAll() {
    visibleItems().forEach((i, idx) => {
      el("nl" + i).querySelector(".ins__elHead span").textContent = fill(T.item, { n: idx + 1 });
      el("nl" + i + "rm").hidden = visibleItems().length < 2;
    });
    el("addNl").hidden = visibleItems().length >= MAXN;
  }
  function addItem() {
    const i = Array.from({ length: MAXN }, (_, k) => k + 1).find((x) => el("nl" + x).hidden);
    if (!i) return;
    el("nl" + i).hidden = false;
    el(nId(i, "rq")).dataset.auto = "";
    autoReq(i);
    syncAll();
  }
  function removeItem(i) {
    if (visibleItems().length < 2) return;
    clearItem(i);
    el("nl" + i).hidden = true;
    syncAll();
  }
  function clearItem(i) {
    ["area", "op", "re"].forEach((k) => (el(nId(i, k)).value = ""));
    setDd(nId(i, "type"), "wall");
    el(nId(i, "rq")).dataset.auto = "";
    autoReq(i);
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
    ...Array.from({ length: MAXN }, (_, k) => ["area", "op", "rq", "re"].map((x) => nId(k + 1, x))),
    ["lam", "pt", "pl", "pw", "ppk", "reserve", "pMat", "pDel"]
  );
  const SAMPLE = { items: [["wall", "120", "18", "", "0.6"], ["roof", "80", "", "", "0.3"]], f: { ppk: "12", reserve: "5", pMat: "650" } };

  function setItems(list) {
    for (let i = 1; i <= MAXN; i++) {
      clearItem(i);
      el("nl" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, a, op, rq, re], idx) => {
      const i = idx + 1;
      setDd(nId(i, "type"), t);
      el(nId(i, "rq")).dataset.auto = "";
      autoReq(i);
      if (rq) {
        el(nId(i, "rq")).value = rq;
        el(nId(i, "rq")).dataset.auto = "0";
      }
      el(nId(i, "area")).value = a || "";
      el(nId(i, "op")).value = op || "";
      el(nId(i, "re")).value = re || "";
    });
    syncAll();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    setDd("zone", "II");
    setDd("matl", "wool");
    el("lam").value = LAMBDA.wool;
    el("pt").value = "50";
    el("pl").value = "1000";
    el("pw").value = "600";
    setDd("punit", "pack");
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
    p.set("zone", el("zone").value);
    p.set("mat", el("matl").value);
    p.set("pu", el("punit").value);
    visibleItems().forEach((i, idx) => {
      p.set("n" + (idx + 1), [el(nId(i, "type")).value, raw(nId(i, "area")) || "0", raw(nId(i, "op")) || "0", raw(nId(i, "rq")) || "0", raw(nId(i, "re")) || "0"].join(":"));
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
    if (q.has("zone")) setDd("zone", q.get("zone"));
    if (q.has("mat")) setDd("matl", q.get("mat"));
    if (q.has("pu")) setDd("punit", q.get("pu"));
    const list = [];
    for (let i = 1; i <= MAXN; i++) {
      if (!q.has("n" + i)) continue;
      const [t, a, op, rq, re] = q.get("n" + i).split(":");
      if (!["wall", "roof", "attic", "floor", "custom"].includes(t)) continue;
      const z = (x) => (!x || x === "0" ? "" : x.slice(0, 10));
      list.push([t, z(a), z(op), z(rq), z(re)]);
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
    if (any) el("priceDet").open = ["pMat", "pDel"].some((id) => raw(id) !== "");
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    FIELD_IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (/^n\d_rq$/.test(id)) el(id).dataset.auto = "0";
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc(true);
      });
    });
    initDd("zn", (v) => {
      setDd("zone", v);
      visibleItems().forEach(autoReq);
      calc();
    });
    initDd("mt", (v) => {
      setDd("matl", v);
      el("lam").value = LAMBDA[v];
      calc();
    });
    initDd("pu", (v) => {
      setDd("punit", v);
      calc();
    });
    for (let i = 1; i <= MAXN; i++) {
      initDd("n" + i + "t", (v) => {
        setDd(nId(i, "type"), v);
        el(nId(i, "rq")).dataset.auto = "";
        autoReq(i);
        calc();
      });
      el("nl" + i + "rm").addEventListener("click", () => {
        removeItem(i);
        calc();
      });
    }
    el("addNl").addEventListener("click", addItem);
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
    for (let i = 1; i <= MAXN; i++) el(nId(i, "rq")).dataset.auto = "";
    visibleItems().forEach(autoReq);
    const used = applyFromUrl();
    syncAll();
    Promise.all(["USD", "EUR"].map(loadRate)).then(() => last && render(last));
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
