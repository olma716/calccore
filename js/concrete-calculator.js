/* concrete-calculator.js — калькулятор бетону: об'єм елементів і два режими, «Готовий бетон» (замовлення) та «Замішування самому» (UK/EN, UAH/USD/EUR)
   Об'єм елемента: плита L×W×T; стрічка L×W×H; стіна L×H×T; балка L×W×H; колона прямокутна H×a×b; колона кругла π×(D/2)²×H; × кількість.
   Замовлення = Σ об'єм × (1 + запас). Готовий бетон: вартість = замовлення × ціна за м³ + доставка + насос; рейсів = замовлення / місткість (угору).
   Замішування: склад кожного елемента свій; для елемента: сухий об'єм = його замовлення × k; цемент = сухий × c/(c+s+g) × 1440 кг/м³; мішки — угору; пісок, щебінь — сухий × s(g)/(c+s+g); вода (л) = цемент (кг) × В/Ц.
   Склад — за об'ємом; марок бетону немає: склад задає користувач. Вбудованих цін немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = "\u00a0";
  const CEMENT_DENSITY = 1440; // кг/м³ (насипна)
  const MAXEL = 6;
  const LIM = { price: { UAH: 1000000, USD: 25000, EUR: 25000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf", "#86a0d6", "#16a34a", "#aec1e6"];
  const PRICE_IDS = ["pPrice", "pDel", "pPump", "mCem", "mSand", "mGravel", "mWater", "mDel"];

  // типи елементів: підписи трьох розмірів (ключі T.p) і формула
  const TYPES = {
    slab: { p: ["len", "wid", "thk"], vol: (a, b, c) => a * b * c },
    strip: { p: ["slen", "wid", "hgt"], vol: (a, b, c) => a * b * c },
    wall: { p: ["len", "hgt", "thk"], vol: (a, b, c) => a * b * c },
    beam: { p: ["len", "wid", "hgt"], vol: (a, b, c) => a * b * c },
    colRect: { p: ["hgt", "sa", "sb"], vol: (a, b, c) => a * b * c },
    colRound: { p: ["hgt", "dia"], vol: (a, b) => (Math.PI * (b / 2) ** 2) * a }
  };

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errInt: "“{f}” must be a whole number.",
        errTotal: "The total volume is too large — check the dimensions.",
        errNoEl: "Enter the dimensions of at least one element.",
        el: "Element {n}", elVolume: "{v} m³",
        p: { len: "Length, m", slen: "Strip length, m", wid: "Width, m", thk: "Thickness, m", hgt: "Height, m", sa: "Side a, m", sb: "Side b, m", dia: "Diameter, m" },
        pl: { len: "Length", slen: "Strip length", wid: "Width", thk: "Thickness", hgt: "Height", sa: "Side a", sb: "Side b", dia: "Diameter" },
        lbl: { reserve: "Reserve", cnt: "Pieces", pPrice: "Price per m³", pDel: "Delivery", pPump: "Pump", pCap: "Mixer capacity", mCem: "Cement price per bag", mSand: "Sand price per m³", mGravel: "Gravel price per m³", mWater: "Water price per m³", mDel: "Delivery", dryK: "Dry volume factor", bag: "Bag", wcr: "W/C ratio", dSand: "Sand bulk density", dGravel: "Gravel bulk density", rc: "Cement part", rs: "Sand part", rg: "Gravel part" },
        total: "Total volume", order: "Order", orderTitle: "To order · {n} · {v} m³ + {r}% reserve", mixTitle: "Mix {r} · {v} m³ with the reserve",
        costTitle: "Cost", perM3: "{p} per m³",
        tWith: "Reserve", tNo: "Without reserve", tTrips: "Mixer trips", tTripsMini: "{c} m³ each", tCement: "Cement", tSand: "Sand", tGravel: "Gravel", tWater: "Water", tons: "≈ {t} t", bagsKg: "bags of {w} kg · {kg} kg of cement", wcMini: "W/C {w}",
        elements: "{n} elements", element1: "1 element", mixTitleMixed: "Different mixes · {v} m³ with the reserve",
        elTblTitle: "By element", thEl: "Element", thRatio: "Mix", thVolR: "Volume + reserve, m³", thCemKg: "Cement, kg", thSandM3: "Sand, m³", thGravelM3: "Gravel, m³",
        rowConcrete: "Concrete (order)", rowDel: "Delivery", rowPump: "Pump", rowCem: "Cement", rowSand: "Sand", rowGravel: "Gravel", rowWater: "Water", rowTotal: "Total",
        thItem: "Item", thQty: "Quantity", thPrice: "Price", thSum: "Amount", unitL: "L",
        barTitle: "What the cost consists of", bar: "Cost structure",
        note: "An approximate estimate: the real consumption depends on the moisture of the sand, the gravel fraction, compaction and losses.",
        noteReady: "The order volume includes the reserve you set. The number of trips is counted from the mixer capacity you enter.",
        noteMix: "The mix is by volume; cement bulk density 1440 kg/m³; water = cement × W/C. Ask the plant or a lab for the recipe of a given grade.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅"
      }
    : {
        enter: "Вкажіть дані — результат зʼявиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errInt: "«{f}» має бути цілим числом.",
        errTotal: "Загальний об'єм завеликий — перевірте розміри.",
        errNoEl: "Вкажіть розміри хоча б одного елемента.",
        el: "Елемент {n}", elVolume: "{v} м³",
        p: { len: "Довжина, м", slen: "Довжина стрічки, м", wid: "Ширина, м", thk: "Товщина, м", hgt: "Висота, м", sa: "Сторона a, м", sb: "Сторона b, м", dia: "Діаметр, м" },
        pl: { len: "Довжина", slen: "Довжина стрічки", wid: "Ширина", thk: "Товщина", hgt: "Висота", sa: "Сторона a", sb: "Сторона b", dia: "Діаметр" },
        lbl: { reserve: "Запас", cnt: "Штук", pPrice: "Ціна за м³", pDel: "Доставка", pPump: "Насос", pCap: "Місткість міксера", mCem: "Ціна цементу за мішок", mSand: "Ціна піску за м³", mGravel: "Ціна щебеню за м³", mWater: "Ціна води за м³", mDel: "Доставка", dryK: "Коефіцієнт сухого об'єму", bag: "Мішок", wcr: "В/Ц", dSand: "Об'ємна маса піску", dGravel: "Об'ємна маса щебеню", rc: "Частка цементу", rs: "Частка піску", rg: "Частка щебеню" },
        total: "Загальний об'єм", order: "Замовлення", orderTitle: "Замовити · {n} · {v} м³ + запас {r}%", mixTitle: "Суміш {r} · {v} м³ із запасом",
        costTitle: "Вартість", perM3: "{p} за м³",
        tWith: "Запас", tNo: "Без запасу", tTrips: "Рейсів міксера", tTripsMini: "по {c} м³", tCement: "Цемент", tSand: "Пісок", tGravel: "Щебінь", tWater: "Вода", tons: "≈ {t} т", bagsKg: "мішки по {w} кг · {kg} кг цементу", wcMini: "В/Ц {w}",
        elements: "{n} елементи", element1: "1 елемент", mixTitleMixed: "Різні склади · {v} м³ із запасом",
        elTblTitle: "По елементах", thEl: "Елемент", thRatio: "Склад", thVolR: "Об'єм із запасом, м³", thCemKg: "Цемент, кг", thSandM3: "Пісок, м³", thGravelM3: "Щебінь, м³",
        rowConcrete: "Бетон (замовлення)", rowDel: "Доставка", rowPump: "Насос", rowCem: "Цемент", rowSand: "Пісок", rowGravel: "Щебінь", rowWater: "Вода", rowTotal: "Разом",
        thItem: "Позиція", thQty: "Кількість", thPrice: "Ціна", thSum: "Сума", unitL: "л",
        barTitle: "З чого складається вартість", bar: "Структура вартості",
        note: "Орієнтовна оцінка: реальна витрата залежить від вологості піску, фракції щебеню, ущільнення та втрат.",
        noteReady: "Об'єм замовлення включає заданий запас. Кількість рейсів рахується за введеною місткістю міксера.",
        noteMix: "Склад за об'ємом; насипна густина цементу 1440 кг/м³; вода = цемент × В/Ц. Рецептуру потрібної марки уточніть на заводі або в лабораторії.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const nf = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d + 0).toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });
  const q2 = (x) => nf(x, 2);
  const pct = (x) => nf(x, x % 1 ? 1 : 0);
  const bagsWord = (n) => {
    if (IS_EN) return n === 1 ? "bag" : "bags";
    const a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? "мішок" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "мішки" : "мішків";
  };
  const ntrim = (x) => (x % 1 ? String(Math.round(x * 100) / 100).replace(".", IS_EN ? "." : ",") : nf(x));
  let cur = "UAH", mode = "ready";
  const money = (x, c = cur) => (IS_EN ? SYM[c] + nf(x) : nf(x) + NB + SYM[c]);
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

  // ===== елементи =====
  const elId = (i, k) => "e" + i + "_" + k;
  const typeOf = (i) => el(elId(i, "type")).value;
  const visibleEls = () => Array.from({ length: MAXEL }, (_, k) => k + 1).filter((i) => !el("el" + i).hidden);

  function syncEl(i) {
    const t = TYPES[typeOf(i)];
    ["p1", "p2", "p3"].forEach((k, idx) => {
      const f = el(elId(i, k)).closest(".cnc__field");
      const key = t.p[idx];
      f.hidden = !key;
      if (key) el(elId(i, k) + "_l").textContent = T.p[key];
    });
    const v = elVolume(i);
    el("ev" + i).textContent = v ? fill(T.elVolume, { v: q2(v) }) : "—";
    el("el" + i + "rm").hidden = visibleEls().length < 2;
  }
  function elValues(i) {
    const t = TYPES[typeOf(i)];
    const vals = t.p.map((_, idx) => num(elId(i, "p" + (idx + 1))));
    const n = num(elId(i, "n"));
    return { t, vals, n };
  }
  function elVolume(i) {
    const { t, vals, n } = elValues(i);
    if (vals.some((v) => v === null || Number.isNaN(v) || v <= 0)) return 0;
    const cnt = n === null ? 1 : n;
    if (Number.isNaN(cnt) || cnt < 1) return 0;
    return t.vol(...vals) * cnt;
  }
  function syncAll() {
    visibleEls().forEach(syncEl);
    el("addEl").hidden = visibleEls().length >= MAXEL;
  }
  function addElement() {
    const i = Array.from({ length: MAXEL }, (_, k) => k + 1).find((x) => el("el" + x).hidden);
    if (!i) return;
    el("el" + i).hidden = false;
    syncAll();
  }
  function removeElement(i) {
    if (visibleEls().length < 2) return;
    ["p1", "p2", "p3", "n"].forEach((k) => (el(elId(i, k)).value = ""));
    setDd(elId(i, "type"), "slab");
    setRatio(i, "1:2:4");
    el("el" + i).hidden = true;
    syncAll();
  }

  // ===== модель =====
  const UNITS = IS_EN
    ? { reserve: "%", pCap: "m³", bag: "kg", dSand: "kg/m³", dGravel: "kg/m³" }
    : { reserve: "%", pCap: "м³", bag: "кг", dSand: "кг/м³", dGravel: "кг/м³" };
  const lim = (x) => (x % 1 ? String(x).replace(".", IS_EN ? "." : ",") : nf(x));
  function val(id, label, lo, hi, required, int) {
    const v = num(id);
    if (v === null) return required ? { miss: label } : { v: null };
    if (Number.isNaN(v)) return { err: fill(T.errNum, { f: label }) };
    if (int && v % 1) return { err: fill(T.errInt, { f: label }) };
    if (v < lo || v > hi) return { err: fill(T.errRange, { f: label, a: lim(lo), b: lim(hi), u: UNITS[id] ? " " + UNITS[id] : "" }) };
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
    // елементи
    const els = [];
    visibleEls().forEach((i, idx) => {
      const { t, vals } = elValues(i);
      const used = vals.some((v) => v !== null) || num(elId(i, "n")) !== null;
      if (!used) return;
      const name = fill(T.el, { n: idx + 1 });
      const dims = t.p.map((key, k) => note(val(elId(i, "p" + (k + 1)), name + ": " + T.pl[key], 0.01, key === "dia" ? 10 : 1000, true)));
      const cnt = note(val(elId(i, "n"), name + ": " + T.lbl.cnt, 1, 10000, false, true));
      let rr = null, rk = "1:2:4";
      if (mode === "mix") {
        rk = el(elId(i, "ratio")).value;
        if (rk === "custom") {
          const rc = note(val(elId(i, "rc"), name + ": " + T.lbl.rc, 0.01, 100, true)), rs = note(val(elId(i, "rs"), name + ": " + T.lbl.rs, 0.01, 100, true)), rg = note(val(elId(i, "rg"), name + ": " + T.lbl.rg, 0.01, 100, true));
          rr = [rc.v, rs.v, rg.v];
        } else rr = rk.split(":").map(Number);
      }
      if (!miss.length && !err) {
        const v = t.vol(...dims.map((d) => d.v));
        els.push({ i, type: typeOf(i), dims: dims.map((d) => d.v), n: cnt.v || 1, vol: v * (cnt.v || 1), name, rk, ratio: rr });
      }
    });
    const resR = val("reserve", T.lbl.reserve, 0, 50, false);
    note(resR);
    const res = resR.v || 0;
    const info = { els, res };
    let M = {};
    if (mode === "ready") {
      const pr = note(val("pPrice", T.lbl.pPrice, 0, LIM.price[cur], false)), del = note(val("pDel", T.lbl.pDel, 0, LIM.fixed, false)), pump = note(val("pPump", T.lbl.pPump, 0, LIM.fixed, false)), cap = note(val("pCap", T.lbl.pCap, 0.5, 20, false));
      M = { price: pr.v, del: del.v || 0, pump: pump.v || 0, cap: cap.v };
    } else {
      const df = note(val("dryK", T.lbl.dryK, 1.2, 2, false)).v || 1.54;
      const bag = note(val("bag", T.lbl.bag, 5, 100, false)).v || 50;
      let wc;
      if (el("wcp").value === "custom") wc = note(val("wcr", T.lbl.wcr, 0.2, 1.2, true)).v;
      else wc = Number(el("wcp").value);
      const pc = note(val("mCem", T.lbl.mCem, 0, LIM.price[cur], false)), ps = note(val("mSand", T.lbl.mSand, 0, LIM.price[cur], false)), pg = note(val("mGravel", T.lbl.mGravel, 0, LIM.price[cur], false)), pw = note(val("mWater", T.lbl.mWater, 0, LIM.price[cur], false)), md = note(val("mDel", T.lbl.mDel, 0, LIM.fixed, false));
      const dS = note(val("dSand", T.lbl.dSand, 500, 3000, false)), dG = note(val("dGravel", T.lbl.dGravel, 500, 3000, false));
      M = { df, bag, wc, pc: pc.v, ps: ps.v, pg: pg.v, pw: pw.v, del: md.v || 0, dS: dS.v, dG: dG.v };
    }
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!els.length) return { ok: false, incomplete: true, none: true, msg: T.errNoEl };
    const total = els.reduce((s, x) => s + x.vol, 0);
    if (total > 100000) return { ok: false, msg: T.errTotal };
    const order = total * (1 + res / 100);
    const R = { ok: true, mode, cur, els, res, total, order, M };
    if (mode === "ready") {
      const concrete = M.price ? order * M.price : 0;
      R.cost = concrete + M.del + M.pump;
      R.concrete = concrete;
      R.trips = M.cap ? Math.ceil(order / M.cap - 1e-9) : null;
      R.hasPrice = M.price > 0 || M.del > 0 || M.pump > 0;
    } else {
      let cV = 0, sV = 0, gV = 0;
      R.perEl = els.map((e) => {
        const o = e.vol * (1 + res / 100), dry1 = o * M.df, sm = e.ratio[0] + e.ratio[1] + e.ratio[2];
        const c = (dry1 * e.ratio[0]) / sm, sa = (dry1 * e.ratio[1]) / sm, g = (dry1 * e.ratio[2]) / sm;
        cV += c; sV += sa; gV += g;
        return { c, sa, g, o, kg: c * CEMENT_DENSITY };
      });
      const dry = order * M.df;
      const kg = cV * CEMENT_DENSITY, bags = Math.ceil(kg / M.bag - 1e-9), water = kg * M.wc;
      Object.assign(R, { dry, cV, sV, gV, kg, bags, water, tS: M.dS ? (sV * M.dS) / 1000 : null, tG: M.dG ? (gV * M.dG) / 1000 : null });
      R.lines = [
        { k: "rowCem", qty: bags, unit: "bags", price: M.pc, sum: M.pc ? bags * M.pc : 0 },
        { k: "rowSand", qty: sV, unit: "m3", price: M.ps, sum: M.ps ? sV * M.ps : 0 },
        { k: "rowGravel", qty: gV, unit: "m3", price: M.pg, sum: M.pg ? gV * M.pg : 0 },
        { k: "rowWater", qty: water, unit: "l", price: M.pw, sum: M.pw ? (water / 1000) * M.pw : 0 }
      ];
      R.cost = R.lines.reduce((s, x) => s + x.sum, 0) + M.del;
      R.hasPrice = R.cost > 0;
    }
    R.perM3 = R.cost > 0 ? R.cost / order : 0;
    return R;
  }

  // ===== відображення =====
  const tile = (title, value, mini) => '<div class="cnc__kpi"><div class="cnc__kpiT">' + title + '</div><div class="cnc__kpiV">' + value + "</div>" + (mini ? '<div class="cnc__kpiM">' + mini + "</div>" : "") + "</div>";
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  const ratioText = (e) => (e.rk === "custom" ? e.ratio.map(ntrim).join(":") : e.rk);
  const unitText = (u, n) => (u === "bags" ? bagsWord(n) : u === "l" ? T.unitL : IS_EN ? "m³" : "м³");

  function rowsOf(r) {
    if (r.mode === "ready") {
      const rows = [{ name: T.rowConcrete, qty: q2(r.order) + NB + (IS_EN ? "m³" : "м³"), price: r.M.price, sum: r.concrete }];
      if (r.M.del) rows.push({ name: T.rowDel, qty: "", price: 0, sum: r.M.del });
      if (r.M.pump) rows.push({ name: T.rowPump, qty: "", price: 0, sum: r.M.pump });
      return rows;
    }
    const rows = r.lines.map((x) => ({ name: T[x.k], qty: (x.unit === "m3" ? q2(x.qty) : nf(x.qty)) + NB + unitText(x.unit, x.qty), price: x.price, sum: x.sum }));
    if (r.M.del) rows.push({ name: T.rowDel, qty: "", price: 0, sum: r.M.del });
    return rows;
  }
  function tableHtml(r) {
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thQty + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const rows = rowsOf(r);
    let body = rows.map((x) => "<tr><td>" + x.name + "</td><td>" + (x.qty || "") + "</td><td>" + (x.price ? money(x.price) : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.hasPrice) body += '<tr class="cnc__total"><td>' + T.rowTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="cnc__tbl cnc__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function elTableHtml(r) {
    const head = "<thead><tr><th>" + T.thEl + "</th><th>" + T.thRatio + "</th><th>" + T.thVolR + "</th><th>" + T.thCemKg + "</th><th>" + T.thSandM3 + "</th><th>" + T.thGravelM3 + "</th></tr></thead>";
    const body = r.els.map((e, k) => {
      const p = r.perEl[k];
      return "<tr><td>" + e.name + " · " + el("e" + e.i + "t_val").textContent + "</td><td>" + ratioText(e) + "</td><td>" + q2(p.o) + "</td><td>" + nf(p.kg) + "</td><td>" + q2(p.sa) + "</td><td>" + q2(p.g) + "</td></tr>";
    }).join("");
    return '<div class="cnc__sub">' + T.elTblTitle + '</div><table class="cnc__tbl cnc__tbl--sch" id="elTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function barHtml(r) {
    const parts = rowsOf(r).filter((x) => x.sum > 0).map((x, i) => ({ name: x.name, v: x.sum, c: COLORS[i % COLORS.length] }));
    if (!parts.length) return "";
    const seg = parts.map((p) => '<div style="width:' + ((p.v / r.cost) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = parts.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.cost) * 1000) / 10) + "%</span>").join("");
    return '<div class="cnc__sub">' + T.barTitle + '</div><div class="cnc__bar" role="img" aria-label="' + T.bar + '">' + seg + '</div><div class="cnc__legend">' + leg + "</div>";
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="cnc__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const elsTxt = r.els.length === 1 ? T.element1 : fill(T.elements, { n: r.els.length });
    const unit = IS_EN ? "m³" : "м³";
    let head, tiles;
    if (r.mode === "ready") {
      head = '<div class="cnc__kpiT">' + fill(T.orderTitle, { n: elsTxt, v: q2(r.total), r: pct(r.res) }) + '</div><div class="cnc__big">' + q2(r.order) + " " + unit + "</div>";
      tiles = tile(T.tNo, q2(r.total) + NB + unit) + tile(fill(T.tWith, {}) + " " + pct(r.res) + "%", "+" + q2(r.order - r.total) + NB + unit) + (r.trips ? tile(T.tTrips, String(r.trips), fill(T.tTripsMini, { c: ntrim(r.M.cap) })) : "");
    } else {
      const labs = [...new Set(r.els.map((e) => ratioText(e)))];
      const ratio = labs[0];
      head = '<div class="cnc__kpiT">' + (labs.length === 1 ? fill(T.mixTitle, { r: ratio, v: q2(r.order) }) : fill(T.mixTitleMixed, { v: q2(r.order) })) + '</div><div class="cnc__big">' + nf(r.bags) + " " + bagsWord(r.bags) + '</div><div class="cnc__kpiT cnc__mt2">' + fill(T.bagsKg, { w: nf(r.M.bag), kg: nf(r.kg) }) + "</div>";
      tiles = tile(T.tSand, q2(r.sV) + NB + unit, r.tS ? fill(T.tons, { t: nf(r.tS, 1) }) : "") + tile(T.tGravel, q2(r.gV) + NB + unit, r.tG ? fill(T.tons, { t: nf(r.tG, 1) }) : "") + tile(T.tWater, nf(r.water) + NB + T.unitL, fill(T.wcMini, { w: ntrim(r.M.wc) }));
    }
    const cost = r.hasPrice ? '<div class="cnc__per"><div class="cnc__kpiT">' + T.costTitle + '</div><div class="cnc__perV">' + money(r.cost) + '</div><div class="cnc__kpiT cnc__mt2">' + fill(T.perM3, { p: money(r.perM3) }) + "</div></div>" : "";
    box.innerHTML =
      '<div class="cnc__head"><div>' + head + (eq ? '<div class="cnc__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      (r.hasPrice ? barHtml(r) : "") +
      '<div class="cnc__kpis cnc__kpis--3">' + tiles + "</div>" +
      '<div class="cnc__note">' + (r.mode === "ready" ? T.noteReady : T.noteMix) + " " + T.note + "</div>";
    el("schedBody").innerHTML = tableHtml(r) + (r.mode === "mix" && r.els.length > 1 ? elTableHtml(r) : "");
    sch.hidden = false;
  }

  function calc(strict) {
    render(compute(), strict === true);
  }

  // ===== копіювання, CSV =====
  const tableMatrix = () => {
    const out = [];
    el("schedBody").querySelectorAll("table").forEach((t, k) => {
      if (k) out.push([]);
      Array.from(t.querySelectorAll("tr")).forEach((tr) => out.push(Array.from(tr.children).map((c) => c.textContent.replace(/ /g, " ").trim())));
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
    if (!el("scheduleTable") || !last) return;
    const csv = "﻿" + tableMatrix().map((row) => row.map((c) => '"' + c.replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "concrete.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    const unit = IS_EN ? "m³" : "м³";
    let txt = T.total + ": " + q2(last.total) + " " + unit + "; " + T.order + ": " + q2(last.order) + " " + unit + " (+" + pct(last.res) + "%)";
    if (last.mode === "mix") txt += "; " + T.tCement + ": " + nf(last.bags) + " " + bagsWord(last.bags) + " (" + nf(last.kg) + (IS_EN ? " kg" : " кг") + "); " + T.tSand + ": " + q2(last.sV) + " " + unit + "; " + T.tGravel + ": " + q2(last.gV) + " " + unit + "; " + T.tWater + ": " + nf(last.water) + " " + T.unitL;
    else if (last.trips) txt += "; " + T.tTrips + ": " + last.trips;
    if (last.hasPrice) txt += "; " + T.costTitle + ": " + money(last.cost);
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
  // select-подібні поля: приховане значення hid → префікс списку
  const DDP = (hid) => (/^e\d_type$/.test(hid) ? "e" + hid[1] + "t" : /^e\d_ratio$/.test(hid) ? "e" + hid[1] + "r" : "wp");
  function setDd(hid, v) {
    const pre = DDP(hid), lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }

  // необовʼязкові блоки: відкриваємо, лише якщо в них уже є дані
  function autoOpen() {
    const has = (ids) => ids.some((id) => raw(id) !== "");
    el("readyDet").open = has(["pPrice", "pCap", "pDel", "pPump"]);
    el("mixPriceDet").open = has(["mCem", "mSand", "mGravel", "mWater", "mDel"]);
    el("mixParDet").open = raw("dryK") !== "1.54" || raw("bag") !== "50" || el("wcp").value !== "0.5" || has(["dSand", "dGravel", "wcr"]);
  }

  // ===== режими й видимість =====
  function setMode(m) {
    mode = m === "mix" ? "mix" : "ready";
    document.querySelectorAll(".cnc__mcard").forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== mode));
    syncVis();
  }
  function syncVis() {
    for (let i = 1; i <= MAXEL; i++) {
      el("e" + i + "_ratioWrap").hidden = mode !== "mix";
      el("e" + i + "_custom").hidden = mode !== "mix" || el(elId(i, "ratio")).value !== "custom";
    }
    el("wcrCustom").hidden = el("wcp").value !== "custom";
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
    ...Array.from({ length: MAXEL }, (_, k) => ["p1", "p2", "p3", "n", "rc", "rs", "rg"].map((x) => elId(k + 1, x))),
    ["reserve", "pPrice", "pDel", "pPump", "pCap", "dryK", "wcr", "bag", "mCem", "mSand", "mGravel", "mWater", "mDel", "dSand", "dGravel"]
  );
  const SAMPLE_EL = [["slab", "6", "4", "0.2", "1", "1:2:4"], ["strip", "20", "0.4", "0.8", "1", "1:2:4"]];
  const SAMPLE = { ready: { pPrice: "2500", pDel: "1500", pPump: "3000", pCap: "8" }, mix: { mCem: "210", mSand: "900", mGravel: "1200", mDel: "1500" } };

  function setRatio(i, code) {
    ["rc", "rs", "rg"].forEach((k) => (el(elId(i, k)).value = ""));
    if (String(code).startsWith("c:")) {
      const [, a, b, c] = code.split(":");
      setDd(elId(i, "ratio"), "custom");
      el(elId(i, "rc")).value = (a || "").slice(0, 8);
      el(elId(i, "rs")).value = (b || "").slice(0, 8);
      el(elId(i, "rg")).value = (c || "").slice(0, 8);
    } else setDd(elId(i, "ratio"), ["1:5:10", "1:4:8", "1:3:6", "1:2:4", "1:1.5:3"].includes(code) ? code : "1:2:4");
  }
  function setElements(list) {
    for (let i = 1; i <= MAXEL; i++) {
      ["p1", "p2", "p3", "n"].forEach((k) => (el(elId(i, k)).value = ""));
      setDd(elId(i, "type"), "slab");
      setRatio(i, "1:2:4");
      el("el" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, a, b, c, n, rt], idx) => {
      const i = idx + 1;
      setDd(elId(i, "type"), t);
      el(elId(i, "p1")).value = a || "";
      el(elId(i, "p2")).value = b || "";
      el(elId(i, "p3")).value = c || "";
      el(elId(i, "n")).value = n && n !== "1" ? n : "";
      setRatio(i, rt || "1:2:4");
    });
    syncAll();
    syncVis();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    el("reserve").value = "5";
    el("dryK").value = "1.54";
    el("bag").value = "50";
    setElements([]);
    setDd("wcp", "0.5");
    syncVis();
    autoOpen();
    render({ ok: false, none: true });
  }
  function fillExample() {
    resetAll();
    if (cur !== "UAH") setCur("UAH", false);
    setElements(SAMPLE_EL);
    Object.entries(SAMPLE[mode]).forEach(([k, v]) => (el(k).value = v));
    autoOpen();
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("mode", mode);
    p.set("cur", cur);
    visibleEls().forEach((i, idx) => {
      const t = TYPES[typeOf(i)];
      p.set("e" + (idx + 1), [typeOf(i)].concat(t.p.map((_, k) => raw(elId(i, "p" + (k + 1))) || "0"), [raw(elId(i, "n")) || "1"]).join(":"));
      if (mode === "mix") {
        const rk = el(elId(i, "ratio")).value;
        p.set("r" + (idx + 1), rk === "custom" ? ["c", raw(elId(i, "rc")) || "0", raw(elId(i, "rs")) || "0", raw(elId(i, "rg")) || "0"].join(":") : rk);
      }
    });
    ["reserve"].concat(mode === "ready" ? ["pPrice", "pDel", "pPump", "pCap"] : ["mCem", "mSand", "mGravel", "mWater", "mDel", "dryK", "bag", "wcr", "dSand", "dGravel"]).forEach((id) => raw(id) && p.set(id, raw(id)));
    if (mode === "mix") p.set("wcp", el("wcp").value);
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    let any = false;
    if (["UAH", "USD", "EUR"].includes(q.get("cur"))) {
      cur = q.get("cur");
      syncCur();
    }
    if (q.get("mode") === "mix" || q.get("mode") === "ready") {
      mode = q.get("mode");
      any = true;
    }
    const list = [];
    for (let i = 1; i <= MAXEL; i++) {
      if (!q.has("e" + i)) continue;
      const parts = q.get("e" + i).split(":");
      const t = parts[0];
      if (!TYPES[t]) continue;
      const k = TYPES[t].p.length;
      list.push([t, ...parts.slice(1, 1 + k).map((x) => (x === "0" ? "" : x.slice(0, 10))), ...Array(3 - k).fill(""), (parts[1 + k] || "1").slice(0, 6), q.get("r" + i) || "1:2:4"]);
    }
    if (list.length) {
      setElements(list.map((x) => [x[0], x[1], x[2], x[3], x[4], x[5]]));
      any = true;
    }
    FIELD_IDS.forEach((id) => {
      if (!/^e\d_/.test(id) && q.has(id)) {
        el(id).value = q.get(id).slice(0, 12);
        any = true;
      }
    });
    if (q.has("wcp")) setDd("wcp", q.get("wcp"));
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    FIELD_IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (/^e\d_/.test(id)) syncEl(Number(id[1]));
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc(true);
      });
    });
    for (let i = 1; i <= MAXEL; i++) {
      initDd("e" + i + "t", (v) => {
        setDd(elId(i, "type"), v);
        syncEl(i);
        calc();
      });
      initDd("e" + i + "r", (v) => {
        setDd(elId(i, "ratio"), v);
        syncVis();
        calc();
      });
      el("el" + i + "rm").addEventListener("click", () => {
        removeElement(i);
        calc();
      });
    }
    initDd("wp", (v) => {
      setDd("wcp", v);
      syncVis();
      calc();
    });
    el("addEl").addEventListener("click", addElement);
    document.querySelectorAll(".cnc__mcard").forEach((b) =>
      b.addEventListener("click", () => {
        setMode(b.dataset.mode);
        calc();
      })
    );
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
    setMode(mode);
    syncAll();
    autoOpen();
    Promise.all(["USD", "EUR"].map(loadRate)).then(() => last && render(last));
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
