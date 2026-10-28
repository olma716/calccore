/* flooring-calculator.js — калькулятор підлоги: до шести кімнат, упаковки (ламінат, вініл, паркетна дошка) або рулон (лінолеум, килим) з розкроєм смугами, необов'язкові підкладка, плінтус і вартість (UK/EN, UAH/USD/EUR)
   Упаковки: упаковки = ceil(чиста площа × (1 + запас) / площа упаковки).
   Рулон: у кожній кімнаті смуги йдуть вздовж однієї зі сторін a, їх кількість n = ceil(b / ширина рулону), довжина смуги = a + 2 × підрізка; після першої смуги додається раппорт.
   Довжина = n × (a + 2t) + (n − 1) × раппорт; береться напрямок із меншою довжиною; кімнати розкроюються окремо. Запас додається до довжини.
   Підкладка = чиста площа × (1 + нахлест); плінтус = периметр − двері × ширина дверей, планки вгору.
   Вбудованих цін немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = " ";
  const MAXR = 6;
  const LIM = { price: { UAH: 1000000, USD: 25000, EUR: 25000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf", "#86a0d6", "#16a34a", "#aec1e6"];
  const PRICE_IDS = ["pPack", "pRoll", "pUnd", "pSk", "pDel"];

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errInt: "“{f}” must be a whole number.",
        errCut: "The area to subtract must be smaller than the room area ({a} m²).",
        errTotal: "The total is too large — check the dimensions.",
        errNoRoom: "Enter the dimensions of at least one room.",
        errRollDims: "For a roll, enter the length and width of each room.",
        errSkDims: "For the skirting, enter the length and width of each room.",
        errUnd: "Enter the underlay roll area to price the underlay.",
        room: "Room {n}", roomInfoPack: "{a} m²", roomInfoRoll: "{a} m² · {l} m",
        lbl: { len: "Length", wid: "Width", area: "Area", cut: "Area to subtract", doors: "Doors", reserve: "Reserve", cover: "Pack coverage", rwc: "Roll width", trim: "Trim allowance", rep: "Pattern repeat", ur: "Underlay roll area", ov: "Underlay overlap", bar: "Skirting length", dw: "Door width", pPack: "Pack price", pRoll: "Roll price per m²", pUnd: "Underlay roll price", pSk: "Skirting piece price", pDel: "Delivery" },
        units: { len: " m", wid: " m", area: " m²", cut: " m²", reserve: " %", cover: " m²", rwc: " m", trim: " cm", rep: " cm", ur: " m²", ov: " %", bar: " m", dw: " m" },
        title: "Flooring · {n} · {a} m² of net area + {r}% reserve", roomW: ["room", "rooms", "rooms"], packW: ["pack", "packs", "packs"], rollW: ["roll", "rolls", "rolls"], pcsW: ["piece", "pieces", "pieces"], stripW: ["strip", "strips", "strips"], seamW: ["seam", "seams", "seams"],
        chipPack: "{w} m² with the reserve · {c} m² per pack", chipRoll: "{s}", noSeams: "no seams", seams: "seams: {n}",
        tNet: "Net area", tWith: "With the reserve", tPackArea: "Pack area", tLeft: "Left over", tUnder: "Underlay", tSkirt: "Skirting", tBought: "Area bought", tWaste: "Waste", tStrips: "Strips", tSeams: "Seams",
        tUnderMini: "{a} m² with the overlap", tSkMini: "{l} m", tWasteMini: "{p}% of the bought",
        tCost: "Cost", perM2: "{p} per m² of floor",
        thRoom: "Room", thArea: "Net area", thWith: "With reserve, m²", thStrips: "Strips", thLen: "Length, m", thSeams: "Seams", rowTotal: "Total",
        thItem: "Item", thQty: "Quantity", thPrice: "Price", thSum: "Amount",
        rPack: "Flooring (packs)", rRoll: "Flooring (roll)", rUnd: "Underlay", rSk: "Skirting", rDel: "Delivery", rTotal: "Total", u: { lm: "m", rolls: "rolls", pcs: "pcs", m2: "m²", packs: "packs" },
        barTitle: "What the cost consists of", bar: "Cost structure",
        diagTitle: "Cutting plan", diagAria: "Cutting plan of the roll by rooms",
        diagRoom: "Room {n} · {l} × {w} m", diagInfo: "{n} {s} × {len} m", diagLegend: "Solid line: the room. Dashed: a strip with the trim allowance.",
        note: "An approximate estimate: the real consumption depends on the layout, the pattern and the cutting.", notePack: "Take the pack coverage from the label.",
        noteRoll: "The rooms are cut from the roll separately and the strips run along the direction that needs the shorter length.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅",
        copyFloor: "Flooring", copyRoll: "Roll", unitM: "m"
      }
    : {
        enter: "Вкажіть дані — результат з'явиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errInt: "«{f}» має бути цілим числом.",
        errCut: "Площа, що віднімається, має бути меншою за площу кімнати ({a} м²).",
        errTotal: "Підсумок завеликий — перевірте розміри.",
        errNoRoom: "Вкажіть розміри хоча б однієї кімнати.",
        errRollDims: "Для рулону вкажіть довжину й ширину кожної кімнати.",
        errSkDims: "Для плінтуса вкажіть довжину й ширину кожної кімнати.",
        errUnd: "Вкажіть площу рулону підкладки, щоб порахувати її вартість.",
        room: "Кімната {n}", roomInfoPack: "{a} м²", roomInfoRoll: "{a} м² · {l} м",
        lbl: { len: "Довжина", wid: "Ширина", area: "Площа", cut: "Площа, що віднімається", doors: "Дверей", reserve: "Запас", cover: "Покриття упаковки", rwc: "Ширина рулону", trim: "Запас на підрізку", rep: "Раппорт", ur: "Площа рулону підкладки", ov: "Нахлест підкладки", bar: "Довжина планки плінтуса", dw: "Ширина дверей", pPack: "Ціна упаковки", pRoll: "Ціна рулону за м²", pUnd: "Ціна рулону підкладки", pSk: "Ціна планки плінтуса", pDel: "Доставка" },
        units: { len: " м", wid: " м", area: " м²", cut: " м²", reserve: " %", cover: " м²", rwc: " м", trim: " см", rep: " см", ur: " м²", ov: " %", bar: " м", dw: " м" },
        title: "Підлога · {n} · {a} м² чистої площі + запас {r}%", roomW: ["кімната", "кімнати", "кімнат"], packW: ["упаковка", "упаковки", "упаковок"], rollW: ["рулон", "рулони", "рулонів"], pcsW: ["планка", "планки", "планок"], stripW: ["смуга", "смуги", "смуг"], seamW: ["шов", "шви", "швів"],
        chipPack: "{w} м² із запасом · {c} м² в упаковці", chipRoll: "{s}", noSeams: "швів немає", seams: "швів: {n}",
        tNet: "Чиста площа", tWith: "З запасом", tPackArea: "Площа упаковок", tLeft: "Залишок", tUnder: "Підкладка", tSkirt: "Плінтус", tBought: "Куплено площі", tWaste: "Відходи", tStrips: "Смуг", tSeams: "Швів",
        tUnderMini: "{a} м² з нахлестом", tSkMini: "{l} м", tWasteMini: "{p}% від купленого",
        tCost: "Вартість", perM2: "{p} за м² підлоги",
        thRoom: "Кімната", thArea: "Чиста площа", thWith: "З запасом, м²", thStrips: "Смуг", thLen: "Довжина, м", thSeams: "Швів", rowTotal: "Разом",
        thItem: "Позиція", thQty: "Кількість", thPrice: "Ціна", thSum: "Сума",
        rPack: "Покриття (упаковки)", rRoll: "Покриття (рулон)", rUnd: "Підкладка", rSk: "Плінтус", rDel: "Доставка", rTotal: "Разом", u: { lm: "пог. м", rolls: "рулонів", pcs: "шт", m2: "м²", packs: "упаковок" },
        barTitle: "З чого складається вартість", bar: "Структура вартості",
        diagTitle: "Схема розкрою", diagAria: "Схема розкрою рулону по кімнатах",
        diagRoom: "Кімната {n} · {l} × {w} м", diagInfo: "{n} {s} × {len} м", diagLegend: "Суцільна лінія: кімната. Пунктир: смуга з запасом на підрізку.",
        note: "Орієнтовна оцінка: реальна витрата залежить від розкладки, малюнка й розкрою.", notePack: "Покриття упаковки беріть з етикетки.",
        noteRoll: "Кімнати розкроюються з рулону окремо, смуги йдуть у напрямку, якому потрібна менша довжина.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅",
        copyFloor: "Покриття", copyRoll: "Рулон", unitM: "м"
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
  const rId = (i, k) => "r" + i + "_" + k;
  const visibleRooms = () => Array.from({ length: MAXR }, (_, k) => k + 1).filter((i) => !el("rl" + i).hidden);
  const isRoll = () => el("ftype").value === "roll";
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

  // розкрій однієї кімнати: смуги вздовж a, n = ceil(b / ширина), довжина = n(a + 2t) + (n − 1) раппорт
  function cutRoom(L, W, rw, t, rep) {
    const opt = (a, b, along) => {
      const n = Math.ceil(b / rw - 1e-9);
      return { a, b, n, along, strip: a + 2 * t, len: n * (a + 2 * t) + (n - 1) * rep };
    };
    const x = opt(L, W, "L"), y = opt(W, L, "W");
    return y.len < x.len - 1e-9 ? y : x;
  }

  function compute() {
    let err = null;
    const miss = [];
    const note = (r) => {
      if (r.miss) miss.push(r.miss);
      if (r.err && !err) err = r.err;
      return r;
    };
    const roll = isRoll();
    const extras = el("extraDet").open;
    const resR = note(val("reserve", T.lbl.reserve, 0, 50, false, false, T.units.reserve));
    const res = resR.v || 0;
    let cover = null, rw = null, trim = 0, rep = 0;
    if (roll) {
      rw = el("rwidth").value === "custom" ? note(val("rwc", T.lbl.rwc, 0.5, 10, true, false, T.units.rwc)).v : Number(el("rwidth").value);
      trim = (note(val("trim", T.lbl.trim, 0, 50, false, false, T.units.trim)).v || 0) / 100;
      rep = (note(val("rep", T.lbl.rep, 0, 300, false, false, T.units.rep)).v || 0) / 100;
    } else cover = note(val("cover", T.lbl.cover, 0.1, 50, true, false, T.units.cover)).v;
    let ur = null, ov = 10, bar = 2.5, dw = 0.9;
    if (extras) {
      if (!roll) {
        ur = note(val("ur", T.lbl.ur, 1, 100, false, false, T.units.ur)).v;
        const o = note(val("ov", T.lbl.ov, 0, 50, false, false, T.units.ov)).v;
        ov = o === null ? 10 : o;
      }
      bar = note(val("bar", T.lbl.bar, 0.5, 6, false, false, T.units.bar)).v || 2.5;
      dw = note(val("dw", T.lbl.dw, 0.5, 3, false, false, T.units.dw)).v || 0.9;
    }
    const rooms = [];
    visibleRooms().forEach((i, idx) => {
      const t = el(rId(i, "type")).value;
      const used = (t === "wh" ? ["p1", "p2"] : ["p1"]).some((k) => raw(rId(i, k)) !== "") || raw(rId(i, "op")) !== "" || raw(rId(i, "d")) !== "";
      if (!used) return;
      const name = fill(T.room, { n: idx + 1 });
      const p1 = note(val(rId(i, "p1"), name + ": " + (t === "wh" ? T.lbl.len : T.lbl.area), 0.1, t === "wh" ? 200 : 100000, true, false, t === "wh" ? T.units.len : T.units.area));
      const p2 = t === "wh" ? note(val(rId(i, "p2"), name + ": " + T.lbl.wid, 0.1, 200, true, false, T.units.wid)) : { v: 1 };
      const op = note(val(rId(i, "op"), name + ": " + T.lbl.cut, 0, 100000, false, false, T.units.cut));
      const dr = extras ? note(val(rId(i, "d"), name + ": " + T.lbl.doors, 0, 20, false, true)) : { v: null };
      if (!miss.length && !err) {
        const gross = t === "wh" ? p1.v * p2.v : p1.v;
        const opv = op.v || 0;
        if (opv >= gross) {
          err = fill(T.errCut, { a: q2(gross) });
          return;
        }
        if (t !== "wh" && (roll || extras)) {
          err = roll ? T.errRollDims : T.errSkDims;
          return;
        }
        rooms.push({ i, idx, name, t, L: t === "wh" ? p1.v : null, W: t === "wh" ? p2.v : null, gross, net: gross - opv, doors: dr.v || 0 });
      }
    });
    const P = {
      pack: note(val("pPack", T.lbl.pPack, 0, LIM.price[cur], false)).v,
      roll: note(val("pRoll", T.lbl.pRoll, 0, LIM.price[cur], false)).v,
      und: note(val("pUnd", T.lbl.pUnd, 0, LIM.price[cur], false)).v,
      sk: note(val("pSk", T.lbl.pSk, 0, LIM.price[cur], false)).v,
      del: note(val("pDel", T.lbl.pDel, 0, LIM.fixed, false)).v || 0
    };
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!rooms.length) return { ok: false, incomplete: true, none: true, msg: T.errNoRoom };
    if (extras && !roll && P.und && !ur) return { ok: false, msg: T.errUnd };
    const f = 1 + res / 100;
    let netTotal = 0;
    rooms.forEach((r) => (netTotal += r.net));
    if (netTotal > MAXPCS) return { ok: false, msg: T.errTotal };
    const R = { ok: true, cur, roll, extras, rooms, res, netTotal, cover, rw, trim, rep, P };
    const lines = [];
    if (roll) {
      let sum = 0, seams = 0, strips = 0;
      R.cuts = rooms.map((r) => {
        const c = cutRoom(r.L, r.W, rw, trim, rep);
        sum += c.len;
        seams += c.n - 1;
        strips += c.n;
        return { ...r, ...c };
      });
      R.sumLen = sum;
      R.lenWith = Math.ceil(sum * f * 100 - 1e-6) / 100;
      R.bought = R.lenWith * rw;
      R.waste = R.bought - netTotal;
      R.seams = seams;
      R.strips = strips;
      lines.push({ k: "rRoll", qty: R.lenWith, unit: "lm", price: P.roll, sum: P.roll ? R.bought * P.roll : 0 });
    } else {
      R.areaWith = netTotal * f;
      R.packs = Math.ceil(R.areaWith / cover - 1e-9);
      R.packArea = R.packs * cover;
      R.left = R.packArea - netTotal;
      lines.push({ k: "rPack", qty: R.packs, unit: "packs", price: P.pack, sum: P.pack ? R.packs * P.pack : 0 });
      if (extras) {
        R.uArea = netTotal * (1 + ov / 100);
        R.uRolls = ur ? Math.ceil(R.uArea / ur - 1e-9) : null;
        R.ur = ur;
        if (R.uRolls) lines.push({ k: "rUnd", qty: R.uRolls, unit: "rolls", price: P.und, sum: P.und ? R.uRolls * P.und : 0 });
      }
    }
    if (extras) {
      let per = 0, doors = 0;
      rooms.forEach((r) => {
        per += 2 * (r.L + r.W);
        doors += r.doors;
      });
      R.skLen = Math.max(0, per - doors * dw);
      R.skBars = Math.ceil(R.skLen / bar - 1e-9);
      R.bar = bar;
      lines.push({ k: "rSk", qty: R.skBars, unit: "pcs", price: P.sk, sum: P.sk ? R.skBars * P.sk : 0 });
    }
    R.lines = lines;
    R.cost = lines.reduce((s, x) => s + x.sum, 0) + P.del;
    R.hasPrice = R.cost > 0;
    R.perM2Cost = R.hasPrice ? R.cost / netTotal : 0;
    return R;
  }

  // ===== відображення =====
  const tile = (title, value, mini) => '<div class="flo__kpi"><div class="flo__kpiT">' + title + '</div><div class="flo__kpiV">' + value + "</div>" + (mini ? '<div class="flo__kpiM">' + mini + "</div>" : "") + "</div>";
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  const M2 = IS_EN ? "m²" : "м²";
  const qtyTxt = (n, w) => nf(n) + NB + pl(n, w);

  function roomTable(r) {
    let head, body, total;
    if (r.roll) {
      head = "<thead><tr><th>" + T.thRoom + "</th><th>" + T.thArea + "</th><th>" + T.thStrips + "</th><th>" + T.thLen + "</th><th>" + T.thSeams + "</th></tr></thead>";
      body = r.cuts.map((c) => "<tr><td>" + c.name + "</td><td>" + q2(c.net) + NB + M2 + "</td><td>" + c.n + "</td><td>" + q2(c.len) + "</td><td>" + (c.n - 1) + "</td></tr>").join("");
      total = '<tr class="flo__total"><td>' + T.rowTotal + "</td><td>" + q2(r.netTotal) + NB + M2 + "</td><td>" + r.strips + "</td><td>" + q2(r.sumLen) + "</td><td>" + r.seams + "</td></tr>";
    } else {
      head = "<thead><tr><th>" + T.thRoom + "</th><th>" + T.thArea + "</th><th>" + T.thWith + "</th></tr></thead>";
      body = r.rooms.map((c) => "<tr><td>" + c.name + "</td><td>" + q2(c.net) + NB + M2 + "</td><td>" + q2(c.net * (1 + r.res / 100)) + "</td></tr>").join("");
      total = '<tr class="flo__total"><td>' + T.rowTotal + "</td><td>" + q2(r.netTotal) + NB + M2 + "</td><td>" + q2(r.areaWith) + "</td></tr>";
    }
    return '<table class="flo__tbl flo__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + total + "</tbody></table>";
  }
  function costTable(r) {
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thQty + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const qty = (x) => (x.unit === "lm" ? q2(x.qty) + NB + T.u.lm : qtyTxt(x.qty, x.unit === "packs" ? T.packW : x.unit === "rolls" ? T.rollW : T.pcsW));
    let body = r.lines.map((x) => "<tr><td>" + T[x.k] + "</td><td>" + qty(x) + "</td><td>" + (x.price ? unitMoney(x.price) : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.P.del) body += "<tr><td>" + T.rDel + "</td><td></td><td></td><td>" + money(r.P.del) + "</td></tr>";
    if (r.hasPrice) body += '<tr class="flo__total"><td>' + T.rTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="flo__tbl flo__tbl--sch" id="costTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function barHtml(r) {
    const parts = r.lines.filter((x) => x.sum > 0).map((x) => ({ name: T[x.k], v: x.sum }));
    if (r.P.del > 0) parts.push({ name: T.rDel, v: r.P.del });
    if (!parts.length) return "";
    parts.forEach((p, i) => (p.c = COLORS[i % COLORS.length]));
    const seg = parts.map((p) => '<div style="width:' + ((p.v / r.cost) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = parts.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.cost) * 1000) / 10) + "%</span>").join("");
    return '<div class="flo__sub">' + T.barTitle + '</div><div class="flo__bar" role="img" aria-label="' + T.bar + '">' + seg + '</div><div class="flo__legend">' + leg + "</div>";
  }
  // схема розкрою: у кожній кімнаті смуги вздовж a, суцільна лінія — кімната, пунктир — смуга з запасом на підрізку
  function diagramHtml(r) {
    const VW = 320, X0 = 10, SW = 300, SH = 110, GAP = 18;
    let y = 6, out = "";
    r.cuts.forEach((c) => {
      const totalB = Math.max(c.b, c.n * r.rw), total = c.strip;
      const s = Math.min(SW / total, SH / totalB);
      const h = totalB * s;
      out += '<text x="' + X0 + '" y="' + (y + 12) + '" font-size="13" font-weight="700" fill="#1f2f55">' + fill(T.diagRoom, { n: c.idx + 1, l: nf(c.L, c.L % 1 ? 1 : 0), w: nf(c.W, c.W % 1 ? 1 : 0) }) + "</text>";
      out += '<text x="' + X0 + '" y="' + (y + 29) + '" font-size="12" fill="#5b6b8c">' + fill(T.diagInfo, { n: c.n, s: pl(c.n, T.stripW), len: q2(c.strip) }) + (c.n > 1 ? ", " + fill(T.seams, { n: c.n - 1 }) : ", " + T.noSeams) + "</text>";
      y += 38;
      for (let k = 0; k < c.n; k++) out += '<rect x="' + X0 + '" y="' + (y + k * r.rw * s).toFixed(1) + '" width="' + (total * s).toFixed(1) + '" height="' + (r.rw * s).toFixed(1) + '" fill="#86a0d6" fill-opacity="0.35" stroke="#283b69" stroke-width="1" stroke-dasharray="4 3"/>';
      out += '<rect x="' + (X0 + r.trim * s).toFixed(1) + '" y="' + y + '" width="' + (c.a * s).toFixed(1) + '" height="' + (c.b * s).toFixed(1) + '" fill="none" stroke="#1f2f55" stroke-width="1.4"/>';
      y += Math.max(h, 20) + GAP;
    });
    return '<div class="flo__sub">' + T.diagTitle + '</div><svg class="flo__diag" viewBox="0 0 ' + VW + " " + (y - GAP + 6).toFixed(0) + '" role="img" aria-label="' + T.diagAria + '">' + out + '</svg><div class="flo__legend"><span>' + T.diagLegend + "</span></div>";
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="flo__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const n = r.rooms.length;
    let bigTxt, chip, tiles;
    if (r.roll) {
      bigTxt = q2(r.lenWith) + NB + T.u.lm;
      chip = r.seams ? fill(T.seams, { n: r.seams }) : T.noSeams;
      tiles = tile(T.tBought, q2(r.bought) + NB + M2, nf(r.rw, r.rw % 1 ? 1 : 0) + " × " + q2(r.lenWith) + " " + T.unitM) + tile(T.tWaste, q2(r.waste) + NB + M2, fill(T.tWasteMini, { p: nf((r.waste / r.bought) * 100) })) + (r.extras ? tile(T.tSkirt, qtyTxt(r.skBars, T.pcsW), fill(T.tSkMini, { l: q2(r.skLen) })) : tile(T.tStrips, nf(r.strips))) + tile(T.tSeams, nf(r.seams));
    } else {
      bigTxt = qtyTxt(r.packs, T.packW);
      chip = fill(T.chipPack, { w: q2(r.areaWith), c: q2(r.cover) });
      tiles = r.extras
        ? (r.uRolls ? tile(T.tUnder, qtyTxt(r.uRolls, T.rollW), fill(T.tUnderMini, { a: q1(r.uArea) })) : tile(T.tUnder, q1(r.uArea) + NB + M2)) + tile(T.tSkirt, qtyTxt(r.skBars, T.pcsW), fill(T.tSkMini, { l: q2(r.skLen) })) + tile(T.tNet, q2(r.netTotal) + NB + M2) + tile(T.tPackArea, q2(r.packArea) + NB + M2)
        : tile(T.tNet, q2(r.netTotal) + NB + M2) + tile(T.tWith, q2(r.areaWith) + NB + M2) + tile(T.tPackArea, q2(r.packArea) + NB + M2) + tile(T.tLeft, q2(r.left) + NB + M2);
    }
    const head = '<div class="flo__kpiT">' + fill(T.title, { n: nf(n) + NB + pl(n, T.roomW), a: q2(r.netTotal), r: pct(r.res) }) + '</div><div class="flo__big">' + bigTxt + '</div><div class="flo__chipWrap"><span class="flo__chip">' + chip + "</span></div>";
    const cost = r.hasPrice ? '<div class="flo__per"><div class="flo__kpiT">' + T.tCost + '</div><div class="flo__perV">' + money(r.cost) + '</div><div class="flo__kpiT flo__mt2">' + fill(T.perM2, { p: money(r.perM2Cost) }) + "</div></div>" : "";
    box.innerHTML =
      '<div class="flo__head"><div>' + head + (eq ? '<div class="flo__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      (r.hasPrice ? barHtml(r) : "") +
      '<div class="flo__kpis flo__kpis--4">' + tiles + "</div>" +
      (r.roll ? diagramHtml(r) : "") +
      '<div class="flo__note">' + T.note + (r.roll ? " " + T.noteRoll : " " + T.notePack) + "</div>";
    el("schedBody").innerHTML = roomTable(r) + (r.hasPrice || r.extras ? '<div class="flo__sub">' + T.tCost + "</div>" + costTable(r) : "");
    sch.hidden = false;
    r.rooms.forEach((c) => {
      const cut = r.roll && r.cuts.find((x) => x.i === c.i);
      el("rv" + c.i).textContent = cut ? fill(T.roomInfoRoll, { a: q2(c.net), l: q2(cut.len) }) : fill(T.roomInfoPack, { a: q2(c.net) });
    });
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
    a.download = "flooring.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    let txt;
    if (last.roll) txt = T.copyRoll + ": " + q2(last.lenWith) + " " + T.u.lm + " (" + nf(last.rw, last.rw % 1 ? 1 : 0) + " " + T.unitM + "); " + T.tBought + ": " + q2(last.bought) + " " + M2 + "; " + T.tSeams + ": " + last.seams;
    else txt = T.copyFloor + ": " + qtyTxt(last.packs, T.packW) + " (" + q2(last.areaWith) + " " + M2 + ")";
    if (last.extras) {
      if (!last.roll) txt += "; " + T.tUnder + ": " + (last.uRolls ? qtyTxt(last.uRolls, T.rollW) : q1(last.uArea) + " " + M2);
      txt += "; " + T.tSkirt + ": " + qtyTxt(last.skBars, T.pcsW);
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
  const DDP = (hid) => (/^r\d_type$/.test(hid) ? "r" + hid[1] + "t" : hid === "ftype" ? "ft" : "rw");
  function setDd(hid, v) {
    const pre = DDP(hid), lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }

  // ===== кімнати =====
  function syncRoom(i) {
    const area = el(rId(i, "type")).value === "area";
    el(rId(i, "p2")).closest(".flo__field").hidden = area;
    el(rId(i, "p1_l")).textContent = area ? T.lbl.area + ", " + M2 : T.lbl.len + ", " + (IS_EN ? "m" : "м");
    el("rl" + i + "rm").hidden = visibleRooms().length < 2;
    el(rId(i, "d")).closest(".flo__field").hidden = !el("extraDet").open;
  }
  function syncAll() {
    const roll = isRoll();
    visibleRooms().forEach((i, idx) => {
      syncRoom(i);
      el("rl" + i).querySelector(".flo__elHead span").textContent = fill(T.room, { n: idx + 1 });
    });
    el("addRl").hidden = visibleRooms().length >= MAXR;
    el("packBox").hidden = roll;
    el("rollBox").hidden = !roll;
    el("rwCustom").hidden = !roll || el("rwidth").value !== "custom";
    el("underBox").hidden = roll;
    el("pPackWrap").hidden = roll;
    el("pRollWrap").hidden = !roll;
    el("pUndWrap").hidden = roll;
  }
  function addRoom() {
    const i = Array.from({ length: MAXR }, (_, k) => k + 1).find((x) => el("rl" + x).hidden);
    if (!i) return;
    el("rl" + i).hidden = false;
    syncAll();
  }
  function removeRoom(i) {
    if (visibleRooms().length < 2) return;
    clearRoom(i);
    el("rl" + i).hidden = true;
    syncAll();
  }
  function clearRoom(i) {
    ["p1", "p2", "op", "d"].forEach((k) => (el(rId(i, k)).value = ""));
    setDd(rId(i, "type"), "wh");
    el("rv" + i).textContent = "—";
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
    ...Array.from({ length: MAXR }, (_, k) => ["p1", "p2", "op", "d"].map((x) => rId(k + 1, x))),
    ["reserve", "cover", "rwc", "trim", "rep", "ur", "ov", "bar", "dw", "pPack", "pRoll", "pUnd", "pSk", "pDel"]
  );
  const SAMPLE = {
    pack: { rooms: [["wh", "5.5", "4.2", "", "1"], ["wh", "6", "3", "", "1"]], f: { reserve: "10", cover: "2.22", ur: "10", pPack: "1500", pUnd: "250", pSk: "90", pDel: "500" }, extras: true },
    roll: { rooms: [["wh", "5.5", "3.2", "", ""], ["wh", "3", "2", "", ""]], f: { reserve: "", trim: "5", pRoll: "148", pDel: "300" }, extras: false }
  };

  function setRooms(list) {
    for (let i = 1; i <= MAXR; i++) {
      clearRoom(i);
      el("rl" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, a, b, op, d], idx) => {
      const i = idx + 1;
      setDd(rId(i, "type"), t);
      el(rId(i, "p1")).value = a || "";
      el(rId(i, "p2")).value = b || "";
      el(rId(i, "op")).value = op || "";
      el(rId(i, "d")).value = d || "";
    });
    syncAll();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    el("ov").value = "10";
    el("bar").value = "2.5";
    el("dw").value = "0.9";
    setDd("ftype", "pack");
    setDd("rwidth", "3.5");
    setRooms([]);
    el("extraDet").open = false;
    el("priceDet").open = false;
    syncAll();
    render({ ok: false, none: true });
  }
  function fillExample() {
    const kind = isRoll() ? "roll" : "pack";
    const S = SAMPLE[kind];
    resetAll();
    if (cur !== "UAH") setCur("UAH", false);
    setDd("ftype", kind);
    if (kind === "roll") setDd("rwidth", "3.5");
    Object.entries(S.f).forEach(([k, v]) => (el(k).value = v));
    el("extraDet").open = S.extras;
    setRooms(S.rooms);
    el("priceDet").open = true;
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("cur", cur);
    p.set("ft", el("ftype").value);
    visibleRooms().forEach((i, idx) => {
      p.set("r" + (idx + 1), [el(rId(i, "type")).value, raw(rId(i, "p1")) || "0", raw(rId(i, "p2")) || "0", raw(rId(i, "op")) || "0", raw(rId(i, "d")) || "0"].join(":"));
    });
    ["reserve", "pDel", "pSk"].forEach((id) => raw(id) && p.set(id, raw(id)));
    if (isRoll()) {
      p.set("rw", el("rwidth").value);
      ["rwc", "trim", "rep", "pRoll"].forEach((id) => raw(id) && p.set(id, raw(id)));
    } else ["cover", "pPack", "pUnd"].forEach((id) => raw(id) && p.set(id, raw(id)));
    if (el("extraDet").open) {
      p.set("x", "1");
      ["ur", "ov", "bar", "dw"].forEach((id) => raw(id) && p.set(id, raw(id)));
    }
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    let any = false;
    if (["UAH", "USD", "EUR"].includes(q.get("cur"))) {
      cur = q.get("cur");
      syncCur();
    }
    if (q.has("ft")) setDd("ftype", q.get("ft"));
    if (q.has("rw")) setDd("rwidth", q.get("rw"));
    const list = [];
    for (let i = 1; i <= MAXR; i++) {
      if (!q.has("r" + i)) continue;
      const [t, a, b, op, d] = q.get("r" + i).split(":");
      if (!["wh", "area"].includes(t)) continue;
      const z = (x) => (!x || x === "0" ? "" : x.slice(0, 10));
      list.push([t, z(a), z(b), z(op), z(d)]);
    }
    if (list.length) {
      setRooms(list);
      any = true;
    }
    FIELD_IDS.forEach((id) => {
      if (!/^r\d_/.test(id) && q.has(id)) {
        el(id).value = q.get(id).slice(0, 12);
        any = true;
      }
    });
    if (q.get("x") === "1") el("extraDet").open = true;
    if (any) el("priceDet").open = ["pPack", "pRoll", "pUnd", "pSk", "pDel"].some((id) => raw(id) !== "");
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    FIELD_IDS.forEach((id) => {
      el(id).addEventListener("input", () => calc());
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc(true);
      });
    });
    initDd("ft", (v) => {
      setDd("ftype", v);
      syncAll();
      calc();
    });
    initDd("rw", (v) => {
      setDd("rwidth", v);
      syncAll();
      calc();
    });
    for (let i = 1; i <= MAXR; i++) {
      initDd("r" + i + "t", (v) => {
        setDd(rId(i, "type"), v);
        syncRoom(i);
        calc();
      });
      el("rl" + i + "rm").addEventListener("click", () => {
        removeRoom(i);
        calc();
      });
    }
    el("addRl").addEventListener("click", addRoom);
    el("extraDet").addEventListener("toggle", () => {
      syncAll();
      calc();
    });
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
