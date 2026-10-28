/* wallpaper-calculator.js — калькулятор шпалер: до шести кімнат або стін з отворами, рулон за пресетом або свій, підгонка малюнка (без підгонки, пряма стикування, зі зсувом), припуск, запас, смуги й рулони, необов'язкові клей і вартість (UK/EN, UAH/USD/EUR)
   Смуг на кімнату = ceil((периметр − отвори) / ширина рулона); довжина смуги = висота + припуск. Смуги розкроюються з рулонів послідовно: перед кожною смугою зрізається відхід до потрібної фази малюнка
   (пряма стикування: усі смуги з фази 0; зі зсувом: кожна друга смуга з фази кроку/2), смуга, що не вміщується в залишок, починає новий рулон. Рулони з запасом = ceil(рулони × (1 + запас)).
   Клей = ceil(площа стін / покриття пачки). Вбудованих цін немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = " ";
  const MAXN = 6;
  const LIM = { price: { UAH: 1000000, USD: 25000, EUR: 25000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf", "#9fb4e0"];
  const PRICE_IDS = ["pRoll", "pGlue", "pDel"];
  const ROLLS = { r053: ["0.53", "10.05"], r070: ["0.7", "10.05"], r106: ["1.06", "10.05"], r106l: ["1.06", "25"] };
  const TYPES = ["room", "wall"];
  const PATS = ["none", "straight", "drop"];

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errOpen: "The width of the openings must be smaller than the perimeter ({a} m).",
        errTotal: "The total is too large — check the dimensions.",
        errNoPos: "Enter the data of at least one room.",
        errLong: "A strip of {l} m is longer than the roll ({r} m).",
        errGluePrice: "Enter the coverage of a pack of paste to price it.",
        item: "Room {n}", itemInfo: "{n} {w} · {p} m", itemInfoNo: "no strips needed",
        lbl: { len: "Length", wid: "Width", h: "Ceiling height", op: "Openings", rw: "Roll width", rl: "Roll length", rap: "Pattern repeat", trim: "Trimming allowance", reserve: "Reserve", gcov: "Paste coverage", pRoll: "Roll price", pGlue: "Paste price", pDel: "Delivery" },
        units: { len: " m", wid: " m", h: " m", op: " m", rw: " m", rl: " m", rap: " cm", trim: " cm", reserve: " %", gcov: " m²" },
        types: { room: "Room", wall: "Single wall" },
        pat: { none: "no pattern match", straight: "straight match {r} cm", drop: "drop match {r} cm" },
        title: "Wallpaper · {n} · {p} · reserve {r}%",
        rollW: ["roll", "rolls", "rolls"], packW: ["pack", "packs", "packs"], stripW: ["strip", "strips", "strips"], roomW: ["room", "rooms", "rooms"],
        chip: "{n} {w} · {k} per roll",
        tStrips: "Strips in total", tPer: "Strips per roll", tWaste: "Waste", tArea: "Wallpaper bought", tGlue: "Paste", tBase: "Rolls without reserve",
        tCost: "Cost", perM2: "{p} per m² of wall",
        wTitle: "Strips along the walls", wLegend1: "strip of wallpaper", wLegend2: "openings", wLegend3: "last strip, trimmed",
        wRow: "{n} · {p} m, openings {o} m · {k} {kw} of {l} m",
        thItem: "Room", thType: "Type", thPer: "Perimeter, m", thOp: "Openings, m", thH: "Height, m", thL: "Strip, m", thN: "Strips", rowTotal: "Total",
        thCostItem: "Item", thQty: "Quantity", thPrice: "Price", thSum: "Amount",
        rRoll: "Wallpaper", rGlue: "Paste", rDel: "Delivery", rTotal: "Total",
        note: "An approximate estimate: the strips are counted along the perimeter without the openings, and the strips above doors and under windows are not counted. Check the roll size and the pattern repeat on the label, and buy all the rolls from one batch.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅",
        copyW: "Wallpaper", mm: "m"
      }
    : {
        enter: "Вкажіть дані — результат з'явиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errOpen: "Ширина отворів має бути меншою за периметр ({a} м).",
        errTotal: "Підсумок завеликий — перевірте розміри.",
        errNoPos: "Вкажіть дані хоча б однієї кімнати.",
        errLong: "Смуга {l} м довша за рулон ({r} м).",
        errGluePrice: "Вкажіть покриття пачки клею, щоб порахувати його вартість.",
        item: "Кімната {n}", itemInfo: "{n} {w} · {p} м", itemInfoNo: "смуги не потрібні",
        lbl: { len: "Довжина", wid: "Ширина", h: "Висота стелі", op: "Отвори", rw: "Ширина рулона", rl: "Довжина рулона", rap: "Крок малюнка", trim: "Припуск на підрізання", reserve: "Запас", gcov: "Покриття клею", pRoll: "Ціна рулона", pGlue: "Ціна клею", pDel: "Доставка" },
        units: { len: " м", wid: " м", h: " м", op: " м", rw: " м", rl: " м", rap: " см", trim: " см", reserve: " %", gcov: " м²" },
        types: { room: "Кімната", wall: "Одна стіна" },
        pat: { none: "без підгонки", straight: "пряма стикування {r} см", drop: "зі зсувом {r} см" },
        title: "Шпалери · {n} · {p} · запас {r}%",
        rollW: ["рулон", "рулони", "рулонів"], packW: ["пачка", "пачки", "пачок"], stripW: ["смуга", "смуги", "смуг"], roomW: ["кімната", "кімнати", "кімнат"],
        chip: "{n} {w} · по {k} з рулона",
        tStrips: "Смуг усього", tPer: "Смуг з рулона", tWaste: "Відходи", tArea: "Куплено шпалер", tGlue: "Клей", tBase: "Рулонів без запасу",
        tCost: "Вартість", perM2: "{p} за м² стін",
        wTitle: "Смуги вздовж стін", wLegend1: "смуга шпалер", wLegend2: "отвори", wLegend3: "остання смуга, підрізана",
        wRow: "{n} · {p} м, отвори {o} м · {k} {kw} по {l} м",
        thItem: "Кімната", thType: "Тип", thPer: "Периметр, м", thOp: "Отвори, м", thH: "Висота, м", thL: "Смуга, м", thN: "Смуг", rowTotal: "Разом",
        thCostItem: "Позиція", thQty: "Кількість", thPrice: "Ціна", thSum: "Сума",
        rRoll: "Шпалери", rGlue: "Клей", rDel: "Доставка", rTotal: "Разом",
        note: "Орієнтовна оцінка: смуги рахуються вздовж периметра без отворів, смуги над дверима й під вікнами не враховані. Розмір рулона й крок малюнка перевіряйте на етикетці, а рулони купуйте з однієї партії.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅",
        copyW: "Шпалери", mm: "м"
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
  const MAXN_STRIPS = 20000;

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

  // ===== розкрій рулонів (мм) =====
  // items: [{ n: смуг, L: довжина смуги, мм }]; rap: крок малюнка, мм (0 — без підгонки); drop: зсув на пів кроку для кожної другої смуги
  function cutRolls(items, rl, rap, drop) {
    const EPS = 1e-6, rolls = [];
    let c = null;
    items.forEach((it) => {
      for (let j = 0; j < it.n; j++) {
        const s = rap > 0 && drop ? ((j % 2) * rap) / 2 : 0;
        let w = 0;
        if (c && rap > 0) {
          w = (((s - c.pos) % rap) + rap) % rap;
          if (w < EPS || rap - w < EPS) w = 0;
        }
        if (!c || c.pos + w + it.L > rl + EPS) {
          c = { pos: 0, n: 0 };
          rolls.push(c);
          w = s;
        }
        c.pos = Math.round((c.pos + w + it.L) * 1000) / 1000;
        c.n++;
      }
    });
    return rolls;
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
    const rw = note(val("rw", T.lbl.rw, 0.2, 3, true, T.units.rw)).v;
    const rl = note(val("rl", T.lbl.rl, 1, 100, true, T.units.rl)).v;
    const pat = el("pat").value;
    const rap = pat === "none" ? null : note(val("rap", T.lbl.rap, 1, 200, true, T.units.rap)).v;
    const trim = note(val("trim", T.lbl.trim, 0, 50, false, T.units.trim)).v || 0;
    const res = note(val("reserve", T.lbl.reserve, 0, 100, false, T.units.reserve)).v || 0;
    const gcov = note(val("gcov", T.lbl.gcov, 0.1, 1000, false, T.units.gcov)).v;
    const items = [];
    visibleItems().forEach((i, idx) => {
      const t = el(nId(i, "type")).value;
      const used = ["len", "wid", "h", "op"].some((k) => raw(nId(i, k)) !== "");
      if (!used) return;
      const name = fill(T.item, { n: idx + 1 }) + ": ";
      const len = note(val(nId(i, "len"), name + T.lbl.len, 0.1, 1000, true, T.units.len));
      const wid = t === "room" ? note(val(nId(i, "wid"), name + T.lbl.wid, 0.1, 1000, true, T.units.wid)) : { v: 0 };
      const h = note(val(nId(i, "h"), name + T.lbl.h, 0.3, 20, true, T.units.h));
      const op = note(val(nId(i, "op"), name + T.lbl.op, 0, 10000, false, T.units.op));
      if (!miss.length && !err) {
        const perim = t === "room" ? 2 * (len.v + wid.v) : len.v, opv = op.v || 0;
        if (opv >= perim) {
          err = fill(T.errOpen, { a: q2(perim) });
          return;
        }
        const net = perim - opv, n = rw ? Math.ceil(net / rw - 1e-9) : 0;
        items.push({ i, idx, t, name: T.types[t], label: fill(T.item, { n: idx + 1 }), perim, op: opv, net, h: h.v, L: h.v + trim / 100, n });
      }
    });
    const P = { roll: note(val("pRoll", T.lbl.pRoll, 0, LIM.price[cur], false)).v, glue: note(val("pGlue", T.lbl.pGlue, 0, LIM.price[cur], false)).v, del: note(val("pDel", T.lbl.pDel, 0, LIM.fixed, false)).v || 0 };
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!items.length) return { ok: false, incomplete: true, none: true, msg: T.errNoPos };
    if (P.glue && !gcov) return { ok: false, msg: T.errGluePrice };
    const drop = pat === "drop", rapM = pat === "none" ? 0 : rap / 100;
    const longest = Math.max(...items.map((x) => x.L)) + (drop ? rapM / 2 : 0);
    if (longest > rl + 1e-9) return { ok: false, msg: fill(T.errLong, { l: q2(longest), r: q2(rl) }) };
    let strips = 0, perim = 0, opens = 0, wallArea = 0, usefulLen = 0;
    items.forEach((x) => {
      strips += x.n;
      perim += x.perim;
      opens += x.op;
      wallArea += x.net * x.h;
      usefulLen += x.n * x.h;
    });
    if (strips > MAXN_STRIPS) return { ok: false, msg: T.errTotal };
    const cuts = cutRolls(items.map((x) => ({ n: x.n, L: x.L * 1000 })), rl * 1000, rapM * 1000, drop);
    const R = { ok: true, cur, items, rw, rl, pat, rap, trim, res, gcov, P, strips, perim, opens, wallArea };
    R.rolls = cuts.length;
    R.rollsWith = Math.ceil(R.rolls * (1 + res / 100) - 1e-9);
    const counts = cuts.map((c) => c.n), full = counts.length > 1 ? counts.slice(0, -1) : counts;
    R.perMin = Math.min(...full);
    R.perMax = Math.max(...full);
    R.waste = Math.max(0, 1 - usefulLen / (R.rolls * rl)) * 100;
    R.buyArea = R.rollsWith * rw * rl;
    R.gluePacks = gcov ? Math.ceil(wallArea / gcov - 1e-9) : 0;
    R.lines = [{ k: "rRoll", qty: R.rollsWith, unit: "rolls", price: P.roll, sum: P.roll ? R.rollsWith * P.roll : 0 }];
    if (gcov) R.lines.push({ k: "rGlue", qty: R.gluePacks, unit: "packs", price: P.glue, sum: P.glue ? R.gluePacks * P.glue : 0 });
    R.cost = R.lines.reduce((s, x) => s + x.sum, 0) + P.del;
    R.hasPrice = R.cost > 0;
    R.perM2 = R.hasPrice ? R.cost / wallArea : 0;
    return R;
  }

  // ===== відображення =====
  const tile = (title, value, mini) => '<div class="wal__kpi"><div class="wal__kpiT">' + title + '</div><div class="wal__kpiV">' + value + "</div>" + (mini ? '<div class="wal__kpiM">' + mini + "</div>" : "") + "</div>";
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  function wallsHtml(r) {
    const W = 600, maxP = Math.max(...r.items.map((x) => x.perim)), sc = W / maxP;
    const rows = r.items.map((x, k) => {
      const x0 = x.op * sc, cw = r.rw * sc;
      let cells = "";
      if (x.op > 0) cells += '<rect x="0" y="0" width="' + (x.op * sc).toFixed(2) + '" height="26" fill="url(#walHat' + k + ')"/>';
      for (let c = 0; c < x.n; c++) {
        const left = x0 + c * cw, last = c === x.n - 1, w = last ? Math.max(0.5, x.net * sc - c * cw) : cw;
        cells += '<rect class="' + (last && w < cw - 0.01 ? "wal__c2" : "wal__c" + (c % 2)) + '" x="' + left.toFixed(2) + '" y="0" width="' + Math.max(0.3, w - (cw > 3 ? 0.8 : 0)).toFixed(2) + '" height="26"/>';
      }
      const label = fill(T.wRow, { n: x.label, p: q1(x.perim), o: q1(x.op), k: nf(x.n), kw: pl(x.n, T.stripW), l: q2(x.L) });
      return '<div class="wal__wrow"><div class="wal__wlab">' + label + '</div><svg class="wal__wsvg" viewBox="0 0 ' + W + ' 26" preserveAspectRatio="none" role="img" aria-label="' + x.label + '"><defs><pattern id="walHat' + k + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#9aa3b5" stroke-width="2"/></pattern></defs>' + cells + "</svg></div>";
    }).join("");
    return '<div class="wal__sub">' + T.wTitle + "</div>" + rows + '<div class="wal__legend"><span><i class="wal__sw wal__sw--st"></i>' + T.wLegend1 + '</span><span><i class="wal__sw wal__sw--op"></i>' + T.wLegend2 + '</span><span><i class="wal__sw wal__sw--cut"></i>' + T.wLegend3 + "</span></div>";
  }
  function itemTable(r) {
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thType + "</th><th>" + T.thPer + "</th><th>" + T.thOp + "</th><th>" + T.thH + "</th><th>" + T.thL + "</th><th>" + T.thN + "</th></tr></thead>";
    const body = r.items.map((x) => "<tr><td>" + x.label + "</td><td>" + x.name + "</td><td>" + q2(x.perim) + "</td><td>" + q2(x.op) + "</td><td>" + q2(x.h) + "</td><td>" + q2(x.L) + "</td><td>" + x.n + "</td></tr>").join("");
    return '<table class="wal__tbl wal__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + '<tr class="wal__total"><td>' + T.rowTotal + "</td><td></td><td>" + q2(r.perim) + "</td><td>" + q2(r.opens) + "</td><td></td><td></td><td>" + r.strips + "</td></tr></tbody></table>";
  }
  function costTable(r) {
    const head = "<thead><tr><th>" + T.thCostItem + "</th><th>" + T.thQty + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const qty = (x) => nf(x.qty) + NB + (x.unit === "rolls" ? pl(x.qty, T.rollW) : pl(x.qty, T.packW));
    const per = (x) => (x.unit === "rolls" ? (IS_EN ? "roll" : "рулон") : IS_EN ? "pack" : "пачку");
    let body = r.lines.map((x) => "<tr><td>" + T[x.k] + "</td><td>" + qty(x) + "</td><td>" + (x.price ? unitMoney(x.price) + " / " + per(x) : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.P.del) body += "<tr><td>" + T.rDel + "</td><td></td><td></td><td>" + money(r.P.del) + "</td></tr>";
    if (r.hasPrice) body += '<tr class="wal__total"><td>' + T.rTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="wal__tbl wal__tbl--sch" id="costTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function barHtml(r) {
    const parts = [{ name: T.rRoll, v: r.lines[0].sum }];
    if (r.lines[1]) parts.push({ name: T.rGlue, v: r.lines[1].sum });
    if (r.P.del > 0) parts.push({ name: T.rDel, v: r.P.del });
    const useful = parts.filter((p) => p.v > 0);
    if (useful.length < 2) return "";
    useful.forEach((p, i) => (p.c = COLORS[i % COLORS.length]));
    const seg = useful.map((p) => '<div style="width:' + ((p.v / r.cost) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = useful.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.cost) * 1000) / 10) + "%</span>").join("");
    return '<div class="wal__sub">' + (IS_EN ? "What the cost consists of" : "З чого складається вартість") + '</div><div class="wal__bar" role="img" aria-label="' + (IS_EN ? "Cost structure" : "Структура вартості") + '">' + seg + '</div><div class="wal__legend">' + leg + "</div>";
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="wal__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const n = r.items.length;
    const per = r.perMin === r.perMax ? nf(r.perMin) : nf(r.perMin) + "–" + nf(r.perMax);
    const patTxt = fill(T.pat[r.pat], { r: g(r.rap) });
    const head = '<div class="wal__kpiT">' + fill(T.title, { n: nf(n) + NB + pl(n, T.roomW), p: patTxt, r: pct(r.res) }) + '</div><div class="wal__big">' + nf(r.rollsWith) + NB + pl(r.rollsWith, T.rollW) + '</div><div class="wal__chipWrap"><span class="wal__chip">' + fill(T.chip, { n: nf(r.strips), w: pl(r.strips, T.stripW), k: per }) + "</span></div>";
    const cost = r.hasPrice ? '<div class="wal__per"><div class="wal__kpiT">' + T.tCost + '</div><div class="wal__perV">' + money(r.cost) + '</div><div class="wal__kpiT wal__mt2">' + fill(T.perM2, { p: unitMoney(r.perM2) }) + "</div></div>" : "";
    const tiles = [tile(T.tStrips, nf(r.strips)), tile(T.tPer, per), tile(T.tWaste, pct(Math.round(r.waste * 10) / 10) + "%"), tile(T.tArea, q1(r.buyArea) + NB + M2)];
    if (r.gcov) tiles.push(tile(T.tGlue, nf(r.gluePacks) + NB + pl(r.gluePacks, T.packW)));
    if (r.res > 0) tiles.push(tile(T.tBase, nf(r.rolls) + NB + pl(r.rolls, T.rollW)));
    box.innerHTML =
      '<div class="wal__head"><div>' + head + (eq ? '<div class="wal__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      (r.hasPrice ? barHtml(r) : "") +
      wallsHtml(r) +
      '<div class="wal__kpis wal__kpis--' + (tiles.length === 4 ? "4" : "3") + '">' + tiles.join("") + "</div>" +
      '<div class="wal__note">' + T.note + "</div>";
    el("schedBody").innerHTML = itemTable(r) + (r.hasPrice || r.gcov ? '<div class="wal__sub">' + T.tCost + "</div>" + costTable(r) : "");
    sch.hidden = false;
    r.items.forEach((x) => (el("nv" + x.i).textContent = fill(T.itemInfo, { n: nf(x.n), w: pl(x.n, T.stripW), p: q1(x.perim) })));
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
    a.download = "wallpaper.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    let txt = T.copyW + ": " + nf(last.rollsWith) + " " + pl(last.rollsWith, T.rollW) + " " + g(last.rw) + "×" + g(last.rl) + " " + T.mm + " (" + nf(last.strips) + " " + pl(last.strips, T.stripW) + ")";
    if (last.gcov) txt += "; " + T.tGlue + ": " + nf(last.gluePacks) + " " + pl(last.gluePacks, T.packW);
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
  const DDP = (hid) => (/^n\d_type$/.test(hid) ? "n" + hid[1] + "t" : hid === "rollp" ? "rp" : hid === "pat" ? "pa" : hid);
  function setDd(hid, v) {
    const pre = DDP(hid), lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }
  // ширина стіни → поле «Ширина» кімнати ховається, крок малюнка видно лише з підгонкою
  function syncVisibility() {
    visibleItems().forEach((i) => (el("n" + i + "_widW").hidden = el(nId(i, "type")).value === "wall"));
    el("rapW").hidden = el("pat").value === "none";
  }
  function syncRollDd() {
    const w = raw("rw").replace(",", "."), l = raw("rl").replace(",", ".");
    const hit = Object.keys(ROLLS).find((k) => Number(ROLLS[k][0]) === Number(w) && Number(ROLLS[k][1]) === Number(l));
    setDd("rollp", hit || "custom");
  }

  // ===== кімнати =====
  function syncAll() {
    visibleItems().forEach((i, idx) => {
      el("nl" + i).querySelector(".wal__elHead span").textContent = fill(T.item, { n: idx + 1 });
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
    ["len", "wid", "h", "op"].forEach((k) => (el(nId(i, k)).value = ""));
    setDd(nId(i, "type"), "room");
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
    ...Array.from({ length: MAXN }, (_, k) => ["len", "wid", "h", "op"].map((x) => nId(k + 1, x))),
    ["rw", "rl", "rap", "trim", "reserve", "gcov", "pRoll", "pGlue", "pDel"]
  );
  const SAMPLE = { items: [["room", "4", "3.5", "2.7", "0.9"], ["room", "3.2", "2.8", "2.7", "0.9"]], pat: "straight", f: { rap: "32", trim: "5", reserve: "5", gcov: "25", pRoll: "1200", pGlue: "180" } };

  function setItems(list) {
    for (let i = 1; i <= MAXN; i++) {
      clearItem(i);
      el("nl" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, len, wid, h, op], idx) => {
      const i = idx + 1;
      setDd(nId(i, "type"), t);
      el(nId(i, "len")).value = len || "";
      el(nId(i, "wid")).value = wid || "";
      el(nId(i, "h")).value = h || "";
      el(nId(i, "op")).value = op || "";
    });
    syncAll();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    setDd("rollp", "r053");
    el("rw").value = ROLLS.r053[0];
    el("rl").value = ROLLS.r053[1];
    setDd("pat", "none");
    setItems([]);
    el("glueDet").open = false;
    el("priceDet").open = false;
    syncAll();
    render({ ok: false, none: true });
  }
  function fillExample() {
    resetAll();
    if (cur !== "UAH") setCur("UAH", false);
    Object.entries(SAMPLE.f).forEach(([k, v]) => (el(k).value = v));
    setDd("pat", SAMPLE.pat);
    setItems(SAMPLE.items);
    el("glueDet").open = true;
    el("priceDet").open = true;
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("cur", cur);
    p.set("pat", el("pat").value);
    visibleItems().forEach((i, idx) => {
      p.set("n" + (idx + 1), [el(nId(i, "type")).value, raw(nId(i, "len")) || "0", raw(nId(i, "wid")) || "0", raw(nId(i, "h")) || "0", raw(nId(i, "op")) || "0"].join(":"));
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
    if (PATS.includes(q.get("pat"))) setDd("pat", q.get("pat"));
    const list = [];
    for (let i = 1; i <= MAXN; i++) {
      if (!q.has("n" + i)) continue;
      const [t, len, wid, h, op] = q.get("n" + i).split(":");
      if (!TYPES.includes(t)) continue;
      const z = (x) => (!x || x === "0" ? "" : x.slice(0, 10));
      list.push([t, z(len), z(wid), z(h), z(op)]);
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
      syncRollDd();
      el("glueDet").open = raw("gcov") !== "";
      el("priceDet").open = ["pRoll", "pGlue", "pDel"].some((id) => raw(id) !== "");
    }
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    FIELD_IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (id === "rw" || id === "rl") syncRollDd();
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc(true);
      });
    });
    initDd("rp", (v) => {
      setDd("rollp", v);
      if (ROLLS[v]) {
        el("rw").value = ROLLS[v][0];
        el("rl").value = ROLLS[v][1];
      }
      calc();
    });
    initDd("pa", (v) => {
      setDd("pat", v);
      syncVisibility();
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
    el("glueDet").addEventListener("toggle", () => calc());
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
