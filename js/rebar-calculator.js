/* rebar-calculator.js — калькулятор арматури: до шести елементів двох типів (плита з сіткою в 1–2 шари; каркас: стрічка, балка, колона з поздовжніми стрижнями й хомутами), діаметри 6–32 мм, захисний шар, прутки стандартної довжини з перепуском, запас, вага, необов'язкові в'язальний дріт і вартість (UK/EN, UAH/USD/EUR)
   Плита: довжини прутків = розмір − 2 захисних шари; кількість = floor(розмір поперек / крок) + 1 у кожному напрямку, помножена на шари.
   Каркас: поздовжні стрижні = кількість × довжина елемента; хомути = floor(довжина / крок) + 1, периметр = 2 × (ширина + висота перерізу − 4 захисних шари) без гаків.
   Вага метра = 0,00617 × d² (d, мм). Деталь довшу за пруток складають з кількох із перепуском (перепуск = кратність діаметра, вводить користувач): k = ceil((довжина − перепуск) / (пруток − перепуск)).
   Прутки рахуються для кожного діаметра окремо: відрізки від найдовшого до найкоротшого кладуться в пруток із найменшим достатнім залишком (best-fit decreasing), інакше береться новий пруток; запас округлюється вгору.
   Вбудованих цін і норм перепуску немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = " ";
  const MAXN = 6;
  const LIM = { price: { UAH: 10000000, USD: 250000, EUR: 250000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf", "#9fb4e0", "#c9d4ec"];
  const PRICE_IDS = ["pBar", "pWire", "pDel"];
  const TYPES = ["slab", "frame"];
  const DIAS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32];
  const UNITS = ["ton", "bar", "m"];
  const kgm = (d) => 0.00617 * d * d;
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const ce = (x) => Math.ceil(x - 1e-9);

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errCover: "The cover is too large for the size of the element.",
        errLap: "The lap must be shorter than the bar.",
        errTotal: "The total is too large — check the dimensions.",
        errNoPos: "Enter the data of at least one element.",
        errWire: "Enter the tie wire rate per tonne to price the wire.",
        item: "Element {n}", itemInfo: "{w}",
        lbl: { a: "Length", aF: "Element length", b: "Width", s: "Mesh step", c: "Cover", w: "Section width", h: "Section height", nb: "Main bars", ss: "Stirrup step", bl: "Bar length", lap: "Lap", reserve: "Reserve", wire: "Tie wire rate", pBar: "Price", pWire: "Wire price", pDel: "Delivery" },
        units: { a: " m", b: " m", s: " cm", c: " cm", w: " cm", h: " cm", nb: "", ss: " cm", bl: " m", lap: " diameters", reserve: " %", wire: " kg/t" },
        types: { slab: "Slab (mesh)", frame: "Frame (strip, beam, column)" },
        title: "Rebar · {n} · bars of {b} m · reserve {r}%",
        elemW: ["element", "elements", "elements"], barW: ["bar", "bars", "bars"],
        chip: "{n} {w} of {b} m",
        tLen: "Length with laps", tReq: "Weight by the calculation", tWaste: "Offcuts", tBase: "Bars without reserve", tWire: "Tie wire",
        tCost: "Cost", perT: "{p} per tonne",
        vTitle: "Reinforcement of the elements",
        vSlab: "{n} · Slab · {a} × {b} m · Ø{d} at {s} cm{x} · {k}", vFrame: "{n} · Frame · {l} m · {w} × {h} cm · {nb} × Ø{d} + stirrups Ø{ds} at {ss} cm · {k}",
        vLayers: " × {m} layers", vLegA: "bars along the length", vLegB: "bars across", vLegS: "stirrup", vLegM: "main bars", vLegC: "cover",
        thEl: "Element", thType: "Type", thSize: "Size", thRebar: "Reinforcement", thLen: "Length, m", thKg: "Weight, kg",
        thD: "Diameter", thNet: "Length, m", thLapL: "With laps, m", thBars: "Bars", thRes: "With reserve",
        rowTotal: "Total",
        thCostItem: "Item", thQty: "Quantity", thPrice: "Price", thSum: "Amount",
        rBar: "Rebar", rWire: "Tie wire", rDel: "Delivery", rTotal: "Total", per: { ton: "tonne", bar: "bar", m: "m" },
        note: "An approximate estimate. The stirrups are counted without hooks, which make a real stirrup longer; the lap and the cover come from your project. The bars are cut with the offcuts reused where the next piece fits.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅",
        copyR: "Rebar", kg: "kg", t: "t", m: "m", pcs: "pcs", mm: "mm"
      }
    : {
        enter: "Вкажіть дані — результат з'явиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errCover: "Захисний шар завеликий для розмірів елемента.",
        errLap: "Перепуск має бути коротшим за пруток.",
        errTotal: "Підсумок завеликий — перевірте розміри.",
        errNoPos: "Вкажіть дані хоча б одного елемента.",
        errWire: "Вкажіть норму в'язального дроту на тонну, щоб порахувати його вартість.",
        item: "Елемент {n}", itemInfo: "{w}",
        lbl: { a: "Довжина", aF: "Довжина елемента", b: "Ширина", s: "Крок сітки", c: "Захисний шар", w: "Ширина перерізу", h: "Висота перерізу", nb: "Основних стрижнів", ss: "Крок хомутів", bl: "Довжина прутка", lap: "Перепуск", reserve: "Запас", wire: "Норма дроту", pBar: "Ціна", pWire: "Ціна дроту", pDel: "Доставка" },
        units: { a: " м", b: " м", s: " см", c: " см", w: " см", h: " см", nb: "", ss: " см", bl: " м", lap: " діаметрів", reserve: " %", wire: " кг/т" },
        types: { slab: "Плита (сітка)", frame: "Каркас (стрічка, балка, колона)" },
        title: "Арматура · {n} · прутки {b} м · запас {r}%",
        elemW: ["елемент", "елементи", "елементів"], barW: ["пруток", "прутки", "прутків"],
        chip: "{n} {w} по {b} м",
        tLen: "Довжина з перепуском", tReq: "Вага за розрахунком", tWaste: "Обрізки", tBase: "Прутків без запасу", tWire: "В'язальний дріт",
        tCost: "Вартість", perT: "{p} за тонну",
        vTitle: "Армування елементів",
        vSlab: "{n} · Плита · {a} × {b} м · Ø{d} з кроком {s} см{x} · {k}", vFrame: "{n} · Каркас · {l} м · {w} × {h} см · {nb} × Ø{d} + хомути Ø{ds} через {ss} см · {k}",
        vLayers: " × {m} шари", vLegA: "прутки вздовж довжини", vLegB: "прутки впоперек", vLegS: "хомут", vLegM: "основні стрижні", vLegC: "захисний шар",
        thEl: "Елемент", thType: "Тип", thSize: "Розмір", thRebar: "Армування", thLen: "Довжина, м", thKg: "Вага, кг",
        thD: "Діаметр", thNet: "Довжина, м", thLapL: "З перепуском, м", thBars: "Прутків", thRes: "З запасом",
        rowTotal: "Разом",
        thCostItem: "Позиція", thQty: "Кількість", thPrice: "Ціна", thSum: "Сума",
        rBar: "Арматура", rWire: "В'язальний дріт", rDel: "Доставка", rTotal: "Разом", per: { ton: "тонну", bar: "пруток", m: "м" },
        note: "Орієнтовна оцінка. Хомути рахуються без гаків, через які реальний хомут довший; перепуск і захисний шар беріть з вашого проєкту. Розкрій використовує залишки прутків, де вміщується наступний відрізок.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅",
        copyR: "Арматура", kg: "кг", t: "т", m: "м", pcs: "шт", mm: "мм"
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
  const wTxt = (kg) => (kg >= 1000 ? nf(kg / 1000, 3) + NB + T.t : nf(kg, kg >= 100 ? 0 : 1) + NB + T.kg);
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

  // ===== прутки: відрізки з перепуском і розкрій =====
  // деталь довжини len → [[довжина відрізка, кількість]]; деталі довші за пруток складаються з кількох із перепуском
  function segmentsOf(len, B, lap) {
    if (len <= B + 1e-9) return [[r3(len), 1]];
    const k = ce((len - lap) / (B - lap));
    const last = r3(len + (k - 1) * lap - (k - 1) * B);
    return [[B, k - 1], [last, 1]];
  }
  // pieces: [{ len, n }] для одного діаметра; відрізки розкроюються з прутків за правилом best-fit decreasing:
  // від найдовшого відрізка до найкоротшого кожен іде в пруток із найменшим залишком, у якому він вміщується, інакше береться новий пруток
  function barsFor(pieces, B, lap) {
    const seg = new Map();
    pieces.forEach((p) => segmentsOf(p.len, B, lap).forEach(([l, c]) => seg.set(l, (seg.get(l) || 0) + c * p.n)));
    const groups = [...seg.entries()].sort((a, b) => b[0] - a[0]);
    const rem = new Map();
    let bars = 0, mat = 0;
    const put = (r, c) => {
      if (c <= 0) return;
      const k = r3(r);
      rem.set(k, (rem.get(k) || 0) + c);
    };
    groups.forEach(([l, count]) => {
      mat += l * count;
      let n = count;
      const upd = [];
      for (const r of [...rem.keys()].filter((k) => k >= l - 1e-9).sort((a, b) => a - b)) {
        if (n <= 0) break;
        const c = rem.get(r), per = Math.floor((r + 1e-9) / l);
        if (n >= per * c) {
          upd.push([r, [[r - per * l, c]]]);
          n -= per * c;
        } else {
          const f = Math.floor(n / per), p = n - f * per, left = c - f - (p > 0 ? 1 : 0);
          upd.push([r, [[r - per * l, f], [r - p * l, p > 0 ? 1 : 0], [r, left]]]);
          n = 0;
        }
      }
      upd.forEach(([r, adds]) => {
        rem.delete(r);
        adds.forEach(([nr, cnt]) => put(nr, cnt));
      });
      if (n > 0) {
        const per = Math.floor((B + 1e-9) / l), f = Math.floor(n / per), p = n - f * per;
        bars += ce(n / per);
        put(B - per * l, f);
        if (p > 0) put(B - p * l, 1);
      }
    });
    return { bars, mat };
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
    const B = note(val("bl", T.lbl.bl, 1, 30, true, T.units.bl)).v;
    const lapD = note(val("lap", T.lbl.lap, 0, 200, false, T.units.lap)).v || 0;
    const res = note(val("reserve", T.lbl.reserve, 0, 100, false, T.units.reserve)).v || 0;
    const wireRate = note(val("wire", T.lbl.wire, 0, 100, false, T.units.wire)).v;
    const items = [];
    visibleItems().forEach((i, idx) => {
      const t = el(nId(i, "type")).value;
      const used = ["a", "b", "s", "c", "w", "h", "nb", "ss"].some((k) => raw(nId(i, k)) !== "");
      if (!used) return;
      const name = fill(T.item, { n: idx + 1 }) + ": ";
      const d = Number(el(nId(i, "d")).value);
      const c = note(val(nId(i, "c"), name + T.lbl.c, 0, 20, false, T.units.c)).v || 0;
      const cm = c / 100;
      if (t === "slab") {
        const a = note(val(nId(i, "a"), name + T.lbl.a, 0.1, 500, true, T.units.a));
        const b = note(val(nId(i, "b"), name + T.lbl.b, 0.1, 500, true, T.units.b));
        const s = note(val(nId(i, "s"), name + T.lbl.s, 5, 100, true, T.units.s));
        const ly = Number(el(nId(i, "ly")).value) || 1;
        if (!miss.length && !err) {
          const ua = a.v - 2 * cm, ub = b.v - 2 * cm;
          if (ua <= 0 || ub <= 0) {
            err = T.errCover;
            return;
          }
          const step = s.v / 100, nA = Math.floor(ub / step + 1e-9) + 1, nB = Math.floor(ua / step + 1e-9) + 1;
          items.push({ i, idx, t, label: fill(T.item, { n: idx + 1 }), name: T.types[t], a: a.v, b: b.v, s: s.v, c, cm, d, ly, ua, ub, nA, nB, pieces: [{ d, len: r3(ua), n: nA * ly }, { d, len: r3(ub), n: nB * ly }] });
        }
      } else {
        const L = note(val(nId(i, "a"), name + T.lbl.aF, 0.1, 1000, true, T.units.a));
        const w = note(val(nId(i, "w"), name + T.lbl.w, 10, 300, true, T.units.w));
        const h = note(val(nId(i, "h"), name + T.lbl.h, 10, 500, true, T.units.h));
        const nb = note(val(nId(i, "nb"), name + T.lbl.nb, 2, 40, true, T.units.nb));
        const ss = note(val(nId(i, "ss"), name + T.lbl.ss, 5, 100, true, T.units.ss));
        const ds = Number(el(nId(i, "ds")).value);
        if (!miss.length && !err) {
          if (nb.v % 1) {
            err = fill(T.errNum, { f: name + T.lbl.nb });
            return;
          }
          const iw = w.v - 2 * c, ih = h.v - 2 * c;
          if (iw <= 0 || ih <= 0) {
            err = T.errCover;
            return;
          }
          const ns = Math.floor(L.v / (ss.v / 100) + 1e-9) + 1, per = (2 * (iw + ih)) / 100;
          items.push({ i, idx, t, label: fill(T.item, { n: idx + 1 }), name: T.types[t], L: L.v, w: w.v, h: h.v, nb: nb.v, ss: ss.v, c, cm, d, ds, iw, ih, ns, per, pieces: [{ d, len: r3(L.v), n: nb.v }, { d: ds, len: r3(per), n: ns }] });
        }
      }
    });
    const pu = el("punit").value;
    const P = { bar: note(val("pBar", T.lbl.pBar, 0, LIM.price[cur], false)).v || 0, wire: note(val("pWire", T.lbl.pWire, 0, LIM.price[cur], false)).v || 0, del: note(val("pDel", T.lbl.pDel, 0, LIM.fixed, false)).v || 0 };
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!items.length) return { ok: false, incomplete: true, none: true, msg: T.errNoPos };
    if (P.wire && !wireRate) return { ok: false, msg: T.errWire };
    // за діаметрами
    const byD = new Map();
    items.forEach((x) => x.pieces.forEach((p) => {
      if (!byD.has(p.d)) byD.set(p.d, []);
      byD.get(p.d).push(p);
    }));
    const rows = [];
    let totalBars = 0;
    for (const d of [...byD.keys()].sort((a, b) => a - b)) {
      const lap = (lapD * d) / 1000;
      if (lap >= B) return { ok: false, msg: T.errLap };
      const ps = byD.get(d), net = ps.reduce((s, p) => s + p.len * p.n, 0), f = barsFor(ps, B, lap);
      totalBars += f.bars;
      if (totalBars > 1e6) return { ok: false, msg: T.errTotal };
      rows.push({ d, net, mat: f.mat, bars: f.bars, barsRes: ce(f.bars * (1 + res / 100)), kgm: kgm(d), wReq: f.mat * kgm(d), wBuy: ce(f.bars * (1 + res / 100)) * B * kgm(d) });
    }
    const R = { ok: true, cur, items, rows, B, lapD, res, wireRate, P, pu };
    R.len = rows.reduce((s, r) => s + r.mat, 0);
    R.wReq = rows.reduce((s, r) => s + r.wReq, 0);
    R.wBuy = rows.reduce((s, r) => s + r.wBuy, 0);
    R.bars = rows.reduce((s, r) => s + r.bars, 0);
    R.barsRes = rows.reduce((s, r) => s + r.barsRes, 0);
    R.waste = Math.max(0, 1 - R.len / (R.bars * B)) * 100;
    items.forEach((x) => {
      x.len = x.pieces.reduce((s, p) => s + p.len * p.n, 0);
      x.kg = x.pieces.reduce((s, p) => s + p.len * p.n * kgm(p.d), 0);
    });
    R.wireKg = wireRate ? (R.wReq / 1000) * wireRate : 0;
    const buyLen = R.barsRes * B;
    const qty = pu === "ton" ? R.wBuy / 1000 : pu === "bar" ? R.barsRes : buyLen;
    R.lines = [{ k: "rBar", qty, unit: pu, price: P.bar, sum: P.bar ? qty * P.bar : 0 }];
    if (wireRate) R.lines.push({ k: "rWire", qty: R.wireKg, unit: "kg", price: P.wire, sum: P.wire ? R.wireKg * P.wire : 0 });
    R.cost = R.lines.reduce((s, x) => s + x.sum, 0) + P.del;
    R.hasPrice = R.cost > 0;
    R.perT = R.hasPrice ? R.cost / (R.wBuy / 1000) : 0;
    return R;
  }

  // ===== відображення =====
  const tile = (title, value, mini) => '<div class="reb__kpi"><div class="reb__kpiT">' + title + '</div><div class="reb__kpiV">' + value + "</div>" + (mini ? '<div class="reb__kpiM">' + mini + "</div>" : "") + "</div>";
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  const ln = (x1, y1, x2, y2, col, w) => '<line x1="' + x1.toFixed(2) + '" y1="' + y1.toFixed(2) + '" x2="' + x2.toFixed(2) + '" y2="' + y2.toFixed(2) + '" stroke="' + col + '" stroke-width="' + w + '"/>';
  function slabSvg(x, W, H) {
    const sc = Math.min(W / x.a, H / x.b), w = x.a * sc, h = x.b * sc, c = x.cm * sc;
    let s = '<rect x="0" y="0" width="' + w.toFixed(2) + '" height="' + h.toFixed(2) + '" fill="#eef2fa" stroke="#9aa3b5" stroke-width="0.5"/>';
    if (c > 0.5) s += '<rect x="' + c.toFixed(2) + '" y="' + c.toFixed(2) + '" width="' + (w - 2 * c).toFixed(2) + '" height="' + (h - 2 * c).toFixed(2) + '" fill="none" stroke="#9aa3b5" stroke-width="0.5" stroke-dasharray="3 3"/>';
    const stepPx = (x.s / 100) * sc, cap = 90;
    const draw = (n, horiz) => {
      const every = Math.max(1, Math.ceil(n / cap));
      for (let j = 0; j < n; j += every) {
        const p = c + j * stepPx;
        s += horiz ? ln(c, p, w - c, p, "#283b69", 1.4) : ln(p, c, p, h - c, "#5b7bbf", 1.4);
      }
    };
    draw(x.nA, true);
    draw(x.nB, false);
    return { svg: s, w, h };
  }
  function frameSvg(x, S) {
    const sc = S / Math.max(x.w, x.h), w = x.w * sc, h = x.h * sc, c = x.c * sc, sd = (x.ds / 10) * sc, md = (x.d / 10) * sc;
    let s = '<rect x="0" y="0" width="' + w.toFixed(2) + '" height="' + h.toFixed(2) + '" rx="2" fill="#eef2fa" stroke="#9aa3b5" stroke-width="0.5"/>';
    const so = c + sd / 2;
    s += '<rect x="' + so.toFixed(2) + '" y="' + so.toFixed(2) + '" width="' + (w - 2 * so).toFixed(2) + '" height="' + (h - 2 * so).toFixed(2) + '" rx="3" fill="none" stroke="#5b7bbf" stroke-width="' + Math.max(1.2, sd).toFixed(2) + '"/>';
    const bo = c + sd + md / 2, r = Math.max(2.2, md / 2), x0 = bo, x1 = w - bo, y0 = bo, y1 = h - bo;
    const pts = [];
    const nb = x.nb;
    if (nb === 2) pts.push([x0, y1], [x1, y1]);
    else if (nb === 3) pts.push([x0, y1], [x1, y1], [(x0 + x1) / 2, y0]);
    else {
      pts.push([x0, y0], [x1, y0], [x0, y1], [x1, y1]);
      let rest = nb - 4, top = true;
      const place = (cnt, yy) => { for (let k = 1; k <= cnt; k++) pts.push([x0 + ((x1 - x0) * k) / (cnt + 1), yy]); };
      const t = Math.ceil(rest / 2), b = rest - t;
      place(t, y0);
      place(b, y1);
    }
    pts.forEach((p) => (s += '<circle cx="' + p[0].toFixed(2) + '" cy="' + p[1].toFixed(2) + '" r="' + r.toFixed(2) + '" fill="#283b69"/>'));
    return { svg: s, w, h };
  }
  function visualHtml(r) {
    const rows = r.items.map((x) => {
      const wt = wTxt(x.kg);
      if (x.t === "slab") {
        const label = fill(T.vSlab, { n: x.label, a: q2(x.a), b: q2(x.b), d: x.d, s: g(x.s), x: x.ly > 1 ? fill(T.vLayers, { m: x.ly }) : "", k: wt });
        const v = slabSvg(x, 600, 170);
        return '<div class="reb__vrow"><div class="reb__vlab">' + label + '</div><svg class="reb__vsvg" style="width:' + ((v.w / 600) * 100).toFixed(2) + '%" viewBox="0 0 ' + v.w.toFixed(2) + " " + v.h.toFixed(2) + '" role="img" aria-label="' + x.label + '">' + v.svg + "</svg></div>";
      }
      const label = fill(T.vFrame, { n: x.label, l: q2(x.L), w: g(x.w), h: g(x.h), nb: x.nb, d: x.d, ds: x.ds, ss: g(x.ss), k: wt });
      const v = frameSvg(x, 150);
      return '<div class="reb__vrow"><div class="reb__vlab">' + label + '</div><svg class="reb__vsvg" style="width:' + v.w.toFixed(0) + 'px" viewBox="0 0 ' + v.w.toFixed(2) + " " + v.h.toFixed(2) + '" role="img" aria-label="' + x.label + '">' + v.svg + "</svg></div>";
    }).join("");
    return '<div class="reb__sub">' + T.vTitle + "</div>" + rows + '<div class="reb__legend"><span><i class="reb__sw reb__sw--a"></i>' + T.vLegA + '</span><span><i class="reb__sw reb__sw--b"></i>' + T.vLegB + '</span><span><i class="reb__sw reb__sw--m"></i>' + T.vLegM + '</span><span><i class="reb__sw reb__sw--s"></i>' + T.vLegS + '</span><span><i class="reb__sw reb__sw--c"></i>' + T.vLegC + "</span></div>";
  }
  function itemTable(r) {
    const head = "<thead><tr><th>" + T.thEl + "</th><th>" + T.thType + "</th><th>" + T.thSize + "</th><th>" + T.thRebar + "</th><th>" + T.thLen + "</th><th>" + T.thKg + "</th></tr></thead>";
    const body = r.items.map((x) => {
      const size = x.t === "slab" ? q2(x.a) + " × " + q2(x.b) + " " + T.m : q2(x.L) + " " + T.m + ", " + g(x.w) + " × " + g(x.h) + " " + (IS_EN ? "cm" : "см");
      const rb = x.t === "slab" ? "Ø" + x.d + " / " + g(x.s) + (IS_EN ? " cm" : " см") + (x.ly > 1 ? " × " + x.ly : "") : x.nb + " × Ø" + x.d + " + Ø" + x.ds + " / " + g(x.ss) + (IS_EN ? " cm" : " см");
      return "<tr><td>" + x.label + "</td><td>" + x.name + "</td><td>" + size + "</td><td>" + rb + "</td><td>" + q1(x.len) + "</td><td>" + q1(x.kg) + "</td></tr>";
    }).join("");
    const L = r.items.reduce((s, x) => s + x.len, 0), K = r.items.reduce((s, x) => s + x.kg, 0);
    const drows = r.rows.map((x) => "<tr><td>Ø" + x.d + " " + T.mm + "</td><td>" + q1(x.net) + "</td><td>" + q1(x.mat) + "</td><td>" + nf(x.bars) + "</td><td>" + nf(x.barsRes) + "</td></tr>").join("");
    return '<table class="reb__tbl reb__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + '<tr class="reb__total"><td>' + T.rowTotal + "</td><td></td><td></td><td></td><td>" + q1(L) + "</td><td>" + q1(K) + "</td></tr></tbody></table>" +
      '<table class="reb__tbl reb__tbl--sch" id="diaTable"><thead><tr><th>' + T.thD + "</th><th>" + T.thNet + "</th><th>" + T.thLapL + "</th><th>" + T.thBars + "</th><th>" + T.thRes + "</th></tr></thead><tbody>" + drows + '<tr class="reb__total"><td>' + T.rowTotal + "</td><td>" + q1(r.rows.reduce((s, x) => s + x.net, 0)) + "</td><td>" + q1(r.len) + "</td><td>" + nf(r.bars) + "</td><td>" + nf(r.barsRes) + "</td></tr></tbody></table>";
  }
  function costTable(r) {
    const head = "<thead><tr><th>" + T.thCostItem + "</th><th>" + T.thQty + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const qty = (x) => (x.unit === "ton" ? nf(x.qty, 3) + NB + T.t : x.unit === "bar" ? nf(x.qty) + NB + pl(x.qty, T.barW) : x.unit === "kg" ? q1(x.qty) + NB + T.kg : q1(x.qty) + NB + T.m);
    const per = (x) => (x.unit === "kg" ? T.kg : T.per[x.unit]);
    let body = r.lines.map((x) => "<tr><td>" + T[x.k] + "</td><td>" + qty(x) + "</td><td>" + (x.price ? unitMoney(x.price) + " / " + per(x) : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.P.del) body += "<tr><td>" + T.rDel + "</td><td></td><td></td><td>" + money(r.P.del) + "</td></tr>";
    if (r.hasPrice) body += '<tr class="reb__total"><td>' + T.rTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="reb__tbl reb__tbl--sch" id="costTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function barHtml(r) {
    const parts = r.lines.map((x) => ({ name: T[x.k], v: x.sum }));
    if (r.P.del > 0) parts.push({ name: T.rDel, v: r.P.del });
    const useful = parts.filter((p) => p.v > 0);
    if (useful.length < 2) return "";
    useful.forEach((p, i) => (p.c = COLORS[i % COLORS.length]));
    const seg = useful.map((p) => '<div style="width:' + ((p.v / r.cost) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = useful.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.cost) * 1000) / 10) + "%</span>").join("");
    return '<div class="reb__sub">' + (IS_EN ? "What the cost consists of" : "З чого складається вартість") + '</div><div class="reb__bar" role="img" aria-label="' + (IS_EN ? "Cost structure" : "Структура вартості") + '">' + seg + '</div><div class="reb__legend">' + leg + "</div>";
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="reb__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const n = r.items.length;
    const head = '<div class="reb__kpiT">' + fill(T.title, { n: nf(n) + NB + pl(n, T.elemW), b: g(r.B), r: pct(r.res) }) + '</div><div class="reb__big">' + wTxt(r.wBuy) + '</div><div class="reb__chipWrap"><span class="reb__chip">' + fill(T.chip, { n: nf(r.barsRes), w: pl(r.barsRes, T.barW), b: g(r.B) }) + "</span></div>";
    const cost = r.hasPrice ? '<div class="reb__per"><div class="reb__kpiT">' + T.tCost + '</div><div class="reb__perV">' + money(r.cost) + '</div><div class="reb__kpiT reb__mt2">' + fill(T.perT, { p: unitMoney(r.perT) }) + "</div></div>" : "";
    const tiles = [tile(T.tLen, q1(r.len) + NB + T.m), tile(T.tReq, wTxt(r.wReq)), tile(T.tWaste, pct(Math.round(r.waste * 10) / 10) + "%")];
    if (r.res > 0) tiles.push(tile(T.tBase, nf(r.bars) + NB + pl(r.bars, T.barW)));
    if (r.wireRate) tiles.push(tile(T.tWire, q1(r.wireKg) + NB + T.kg));
    box.innerHTML =
      '<div class="reb__head"><div>' + head + (eq ? '<div class="reb__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      (r.hasPrice ? barHtml(r) : "") +
      visualHtml(r) +
      '<div class="reb__kpis reb__kpis--' + (tiles.length === 4 ? "4" : "3") + '">' + tiles.join("") + "</div>" +
      '<div class="reb__note">' + T.note + "</div>";
    el("schedBody").innerHTML = itemTable(r) + (r.hasPrice || r.wireRate ? '<div class="reb__sub">' + T.tCost + "</div>" + costTable(r) : "");
    sch.hidden = false;
    r.items.forEach((x) => (el("nv" + x.i).textContent = wTxt(x.kg)));
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
    a.download = "rebar.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    let txt = T.copyR + ": " + wTxt(last.wBuy) + ", " + nf(last.barsRes) + " " + pl(last.barsRes, T.barW) + " " + g(last.B) + " " + T.m + " (" + last.rows.map((x) => "Ø" + x.d + ": " + nf(x.barsRes)).join(", ") + ")";
    if (last.wireRate) txt += "; " + T.tWire + ": " + q1(last.wireKg) + " " + T.kg;
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
  const DDP = (hid) => (/^n\d_type$/.test(hid) ? "n" + hid[1] + "t" : /^n\d_d$/.test(hid) ? "n" + hid[1] + "d" : /^n\d_ds$/.test(hid) ? "n" + hid[1] + "s" : /^n\d_ly$/.test(hid) ? "n" + hid[1] + "y" : "pu");
  function setDd(hid, v) {
    const pre = DDP(hid), lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }
  // тип елемента → які поля видно
  function syncVisibility() {
    visibleItems().forEach((i) => {
      const slab = el(nId(i, "type")).value === "slab";
      ["bW", "sW", "lyW"].forEach((k) => (el("n" + i + "_" + k).hidden = !slab));
      ["wW", "hW", "nbW", "ssW", "dsW"].forEach((k) => (el("n" + i + "_" + k).hidden = slab));
      el("n" + i + "_aL").firstChild.textContent = (slab ? T.lbl.a : T.lbl.aF) + (IS_EN ? ", m" : ", м") + " ";
    });
  }

  // ===== елементи =====
  function syncAll() {
    visibleItems().forEach((i, idx) => {
      el("nl" + i).querySelector(".reb__elHead span").textContent = fill(T.item, { n: idx + 1 });
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
    ["a", "b", "s", "c", "w", "h", "nb", "ss"].forEach((k) => (el(nId(i, k)).value = ""));
    setDd(nId(i, "type"), "slab");
    setDd(nId(i, "d"), "12");
    setDd(nId(i, "ds"), "8");
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
  const ITEM_KEYS = ["a", "b", "s", "c", "w", "h", "nb", "ss"];
  const FIELD_IDS = [].concat(
    ...Array.from({ length: MAXN }, (_, k) => ITEM_KEYS.map((x) => nId(k + 1, x))),
    ["bl", "lap", "reserve", "wire"], PRICE_IDS
  );
  const SAMPLE = {
    items: [["slab", { a: "6", b: "4", s: "20", c: "3" }, "12", "8", "2"], ["frame", { a: "20", w: "40", h: "80", nb: "4", ss: "20", c: "5" }, "14", "8", "1"]],
    f: { lap: "40", reserve: "5", wire: "2", pBar: "50400", pWire: "80" }
  };

  function setItems(list) {
    for (let i = 1; i <= MAXN; i++) {
      clearItem(i);
      el("nl" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, vals, d, ds, ly], idx) => {
      const i = idx + 1;
      setDd(nId(i, "type"), t);
      setDd(nId(i, "d"), d || "12");
      setDd(nId(i, "ds"), ds || "8");
      setDd(nId(i, "ly"), ly || "1");
      ITEM_KEYS.forEach((k) => (el(nId(i, k)).value = (vals && vals[k]) || ""));
    });
    syncAll();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    el("bl").value = "11.7";
    setDd("punit", "ton");
    setItems([]);
    el("wireDet").open = false;
    el("priceDet").open = false;
    syncAll();
    render({ ok: false, none: true });
  }
  function fillExample() {
    resetAll();
    if (cur !== "UAH") setCur("UAH", false);
    Object.entries(SAMPLE.f).forEach(([k, v]) => (el(k).value = v));
    setItems(SAMPLE.items);
    el("wireDet").open = true;
    el("priceDet").open = true;
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("cur", cur);
    p.set("pu", el("punit").value);
    visibleItems().forEach((i, idx) => {
      p.set("n" + (idx + 1), [el(nId(i, "type")).value, el(nId(i, "d")).value, el(nId(i, "ds")).value, el(nId(i, "ly")).value].concat(ITEM_KEYS.map((k) => raw(nId(i, k)) || "0")).join(":"));
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
    if (UNITS.includes(q.get("pu"))) setDd("punit", q.get("pu"));
    const list = [];
    for (let i = 1; i <= MAXN; i++) {
      if (!q.has("n" + i)) continue;
      const parts = q.get("n" + i).split(":");
      const [t, d, ds, ly] = parts;
      if (!TYPES.includes(t)) continue;
      const z = (x) => (!x || x === "0" ? "" : x.slice(0, 10));
      const vals = {};
      ITEM_KEYS.forEach((k, j) => (vals[k] = z(parts[4 + j])));
      list.push([t, vals, DIAS.includes(Number(d)) ? d : "12", DIAS.includes(Number(ds)) ? ds : "8", ["1", "2"].includes(ly) ? ly : "1"]);
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
      el("wireDet").open = raw("wire") !== "";
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
      ["d", "ds", "ly"].forEach((k) => {
        initDd("n" + i + { d: "d", ds: "s", ly: "y" }[k], (v) => {
          setDd(nId(i, k), v);
          calc();
        });
      });
      el("nl" + i + "rm").addEventListener("click", () => {
        removeItem(i);
        calc();
      });
    }
    el("addNl").addEventListener("click", addItem);
    el("wireDet").addEventListener("toggle", () => calc());
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
