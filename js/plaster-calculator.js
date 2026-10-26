/* plaster-calculator.js — калькулятор штукатурки: до шести поверхонь зі своїм шаром, готова суха суміш (мішки) або самозаміс цемент + пісок, необовʼязкові вода й вартість (UK/EN, UAH/USD/EUR)
   Готова суміш: кг = чиста площа × витрата (кг/м² на 10 мм) × товщина / 10; запас додається до кг; мішки = ceil(кг із запасом / вага мішка).
   Самозаміс: розчин = чиста площа × товщина; сухий обʼєм = розчин із запасом × k (за замовчуванням 1,3); цемент = сухий × c/(c+s) × 1440 кг/м³, мішки — вгору; пісок = сухий × s/(c+s).
   Вбудованих цін немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = " ";
  const CEMENT_DENSITY = 1440;
  const MAXS = 6;
  const LIM = { price: { UAH: 1000000, USD: 25000, EUR: 25000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf", "#86a0d6", "#16a34a", "#aec1e6"];
  const PRICE_IDS = ["pBag", "pSand", "pDel"];
  // витрата кг/м² на 10 мм і вага мішка за типом готової суміші
  const PRES = { gyp: { cons: "8.5", bag: "30" }, gypm: { cons: "10", bag: "30" }, cem: { cons: "17", bag: "25" }, own: { cons: "", bag: "" } };

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errOpen: "The openings area must be smaller than the surface area ({a} m²).",
        errTotal: "The total is too large — check the dimensions.",
        errNoSurf: "Enter the dimensions of at least one surface.",
        errBag: "Enter the bag weight to calculate the cost.",
        surf: "Surface {n}", surfInfoKg: "{a} m² · {k} kg", surfInfoM3: "{a} m² · {k} m³",
        lbl: { len: "Length", hgt: "Height", area: "Area", op: "Openings area", t: "Layer thickness", cons: "Consumption", bag: "Bag weight", reserve: "Reserve", water: "Water", pBag: "Bag price", pSand: "Sand price per m³", pDel: "Delivery", mk: "Dry volume factor", mbag: "Cement bag", mrc: "Cement part", mrs: "Sand part", wc: "Water/cement" },
        units: { len: " m", hgt: " m", area: " m²", op: " m²", t: " mm", cons: " kg/m²", bag: " kg", reserve: " %", water: " L/kg", mbag: " kg", wc: " L/kg" },
        title: "Plaster · {n} · {a} m² of net area + {r}% reserve", surfW: ["surface", "surfaces", "surfaces"], bagW: ["bag", "bags", "bags"],
        chipKg: "≈ {v} kg per 1 m² (average)", chipMix: "≈ {v} kg of cement per 1 m² (average)",
        tKgWith: "Mix with reserve", tKgNo: "Without reserve", tArea: "Net area", tWater: "Water", tCons: "Per 1 m²", tBagMini: "{b} × {w} kg",
        tMortar: "Mortar", tCement: "Cement", tSand: "Sand", tL: "{l} L", tKg: "{kg} kg",
        tCost: "Cost", perM2: "{p} per m² of plaster",
        thSurf: "Surface", thArea: "Net area", thT: "Layer, mm", thKg: "Mix, kg", thVol: "Mortar, m³", rowTotalNo: "Total (without reserve)",
        thItem: "Item", thQty: "Quantity", thPrice: "Price", thSum: "Amount",
        rMix: "Mix (with reserve)", rCem: "Cement", rSand: "Sand", rDel: "Delivery", rTotal: "Total", u: { kg: "kg", m3: "m³" },
        barTitle: "What the cost consists of", bar: "Cost structure",
        note: "An approximate estimate: the real consumption depends on the evenness of the base, the tool and the way the plaster is applied. Take the consumption from the bag of your mix.",
        noteMix: "Self-mix: the mix is by volume, cement bulk density 1440 kg/m³, the dry volume factor is yours to set.",
        noteThick: "A layer over 50 mm: gypsum mixes are usually applied in several layers — check the data sheet of your mix.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅",
        copyMix: "Mix", copyAvg: "per 1 m²"
      }
    : {
        enter: "Вкажіть дані — результат зʼявиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errOpen: "Площа отворів має бути меншою за площу поверхні ({a} м²).",
        errTotal: "Підсумок завеликий — перевірте розміри.",
        errNoSurf: "Вкажіть розміри хоча б однієї поверхні.",
        errBag: "Вкажіть вагу мішка, щоб порахувати вартість.",
        surf: "Поверхня {n}", surfInfoKg: "{a} м² · {k} кг", surfInfoM3: "{a} м² · {k} м³",
        lbl: { len: "Довжина", hgt: "Висота", area: "Площа", op: "Площа отворів", t: "Товщина шару", cons: "Витрата", bag: "Вага мішка", reserve: "Запас", water: "Вода", pBag: "Ціна мішка", pSand: "Ціна піску за м³", pDel: "Доставка", mk: "Коефіцієнт сухого об'єму", mbag: "Мішок цементу", mrc: "Частка цементу", mrs: "Частка піску", wc: "Вода/цемент" },
        units: { len: " м", hgt: " м", area: " м²", op: " м²", t: " мм", cons: " кг/м²", bag: " кг", reserve: " %", water: " л/кг", mbag: " кг", wc: " л/кг" },
        title: "Штукатурка · {n} · {a} м² чистої площі + запас {r}%", surfW: ["поверхня", "поверхні", "поверхонь"], bagW: ["мішок", "мішки", "мішків"],
        chipKg: "≈ {v} кг на 1 м² (у середньому)", chipMix: "≈ {v} кг цементу на 1 м² (у середньому)",
        tKgWith: "Суміш із запасом", tKgNo: "Без запасу", tArea: "Чиста площа", tWater: "Вода", tCons: "На 1 м²", tBagMini: "{b} × {w} кг",
        tMortar: "Розчин", tCement: "Цемент", tSand: "Пісок", tL: "{l} л", tKg: "{kg} кг",
        tCost: "Вартість", perM2: "{p} за м² штукатурки",
        thSurf: "Поверхня", thArea: "Чиста площа", thT: "Шар, мм", thKg: "Суміш, кг", thVol: "Розчин, м³", rowTotalNo: "Разом (без запасу)",
        thItem: "Позиція", thQty: "Кількість", thPrice: "Ціна", thSum: "Сума",
        rMix: "Суміш (із запасом)", rCem: "Цемент", rSand: "Пісок", rDel: "Доставка", rTotal: "Разом", u: { kg: "кг", m3: "м³" },
        barTitle: "З чого складається вартість", bar: "Структура вартості",
        note: "Орієнтовна оцінка: реальна витрата залежить від рівності основи, інструмента й способу нанесення. Витрату беріть із мішка вашої суміші.",
        noteMix: "Самозаміс: склад за обʼємом, насипна густина цементу 1440 кг/м³, коефіцієнт сухого обʼєму задаєте ви.",
        noteThick: "Шар понад 50 мм: гіпсові суміші зазвичай наносять у кілька шарів, перевірте технічний лист вашої суміші.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅",
        copyMix: "Суміш", copyAvg: "на 1 м²"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const nf = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d + 0).toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });
  const q1 = (x) => nf(x, 1);
  const q2 = (x) => nf(x, 2);
  const q3 = (x) => nf(x, 3);
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
  const sId = (i, k) => "s" + i + "_" + k;
  const visibleSurfaces = () => Array.from({ length: MAXS }, (_, k) => k + 1).filter((i) => !el("sl" + i).hidden);
  const isMix = () => el("mtype").value === "mix";

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

  function compute() {
    let err = null;
    const miss = [];
    const note = (r) => {
      if (r.miss) miss.push(r.miss);
      if (r.err && !err) err = r.err;
      return r;
    };
    const mix = isMix();
    const type = el("mtype").value;
    const resR = note(val("reserve", T.lbl.reserve, 0, 50, false, T.units.reserve));
    const res = resR.v || 0;
    let cons = null, bag = null, water = null;
    if (!mix) {
      cons = note(val("cons", T.lbl.cons, 0.5, 60, true, T.units.cons)).v;
      bag = note(val("bag", T.lbl.bag, 1, 100, false, T.units.bag)).v;
      water = note(val("water", T.lbl.water, 0.05, 2, false, T.units.water)).v;
    }
    const surfaces = [];
    visibleSurfaces().forEach((i, idx) => {
      const t = el(sId(i, "type")).value;
      const used = (t === "wh" ? ["p1", "p2"] : ["p1"]).some((k) => raw(sId(i, k)) !== "") || raw(sId(i, "op")) !== "" || raw(sId(i, "t")) !== "";
      if (!used) return;
      const name = fill(T.surf, { n: idx + 1 });
      const p1 = note(val(sId(i, "p1"), name + ": " + (t === "wh" ? T.lbl.len : T.lbl.area), 0.1, t === "wh" ? 1000 : 100000, true, t === "wh" ? T.units.len : T.units.area));
      const p2 = t === "wh" ? note(val(sId(i, "p2"), name + ": " + T.lbl.hgt, 0.1, 50, true, T.units.hgt)) : { v: 1 };
      const op = note(val(sId(i, "op"), name + ": " + T.lbl.op, 0, 100000, false, T.units.op));
      const th = note(val(sId(i, "t"), name + ": " + T.lbl.t, 1, 200, true, T.units.t));
      if (!miss.length && !err) {
        const gross = t === "wh" ? p1.v * p2.v : p1.v;
        const opv = op.v || 0;
        if (opv >= gross) {
          err = fill(T.errOpen, { a: q2(gross) });
          return;
        }
        surfaces.push({ i, idx, name, gross, op: opv, net: gross - opv, t: th.v });
      }
    });
    let M = {};
    if (mix) {
      const rk = el("mratio").value;
      let rc, rs;
      if (rk === "custom") {
        rc = note(val("mrc", T.lbl.mrc, 0.01, 100, true)).v;
        rs = note(val("mrs", T.lbl.mrs, 0.01, 100, true)).v;
      } else [rc, rs] = rk.split(":").map(Number);
      const k = note(val("mk", T.lbl.mk, 1.1, 2, false)).v || 1.3;
      const mb = note(val("mbag", T.lbl.mbag, 5, 100, false, T.units.mbag)).v || 50;
      const wc = note(val("wc", T.lbl.wc, 0.1, 2, false, T.units.wc)).v;
      M = { rc, rs, k, bag: mb, wc };
    }
    const P = {
      bag: note(val("pBag", T.lbl.pBag, 0, LIM.price[cur], false)).v,
      sand: note(val("pSand", T.lbl.pSand, 0, LIM.price[cur], false)).v,
      del: note(val("pDel", T.lbl.pDel, 0, LIM.fixed, false)).v || 0
    };
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!surfaces.length) return { ok: false, incomplete: true, none: true, msg: T.errNoSurf };
    if (!mix && P.bag && !bag) return { ok: false, msg: T.errBag };
    let netTotal = 0, kgNo = 0, volNo = 0, tSum = 0;
    const rows = surfaces.map((s) => {
      const kg = mix ? 0 : s.net * cons * (s.t / 10), vol = (s.net * s.t) / 1000;
      netTotal += s.net;
      kgNo += kg;
      volNo += vol;
      tSum += s.net * s.t;
      return { ...s, kg, vol };
    });
    if (netTotal > 100000000 || kgNo > 1e10) return { ok: false, msg: T.errTotal };
    const f = 1 + res / 100;
    const R = { ok: true, cur, mix, type, rows, res, netTotal, kgNo, volNo, avgT: tSum / netTotal, kgWith: kgNo * f, volWith: volNo * f, cons, bag, M, P, thick: !mix && type !== "cem" && type !== "own" && surfaces.some((s) => s.t > 50) };
    const lines = [];
    if (mix) {
      const dry = R.volWith * M.k, sm = M.rc + M.rs, cV = (dry * M.rc) / sm, sV = (dry * M.rs) / sm, kgC = cV * CEMENT_DENSITY;
      Object.assign(R, { cV, sV, kgC, bagsC: Math.ceil(kgC / M.bag - 1e-9), waterL: M.wc ? kgC * M.wc : null });
      lines.push({ k: "rCem", qty: R.bagsC, unit: "bags", price: P.bag, sum: P.bag ? R.bagsC * P.bag : 0 });
      lines.push({ k: "rSand", qty: sV, unit: "m3", price: P.sand, sum: P.sand ? sV * P.sand : 0 });
    } else {
      R.bags = bag ? Math.ceil(R.kgWith / bag - 1e-9) : null;
      R.waterL = water ? R.kgWith * water : null;
      lines.push({ k: "rMix", qty: R.bags || R.kgWith, unit: R.bags ? "bags" : "kg", price: P.bag, sum: P.bag && R.bags ? R.bags * P.bag : 0 });
    }
    R.lines = lines;
    R.cost = lines.reduce((s, x) => s + x.sum, 0) + P.del;
    R.hasPrice = R.cost > 0;
    R.perM2Cost = R.hasPrice ? R.cost / netTotal : 0;
    return R;
  }

  // ===== відображення =====
  const tile = (title, value, mini) => '<div class="pla__kpi"><div class="pla__kpiT">' + title + '</div><div class="pla__kpiV">' + value + "</div>" + (mini ? '<div class="pla__kpiM">' + mini + "</div>" : "") + "</div>";
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  const bagsTxt = (n) => nf(n) + NB + pl(n, T.bagW);
  const tTxt = (t) => nf(t, t % 1 ? 1 : 0);
  const mixName = () => el("mt_val").textContent.split(" — ")[0];

  function surfTable(r) {
    const m = r.mix;
    const head = "<thead><tr><th>" + T.thSurf + "</th><th>" + T.thArea + "</th><th>" + T.thT + "</th><th>" + (m ? T.thVol : T.thKg) + "</th></tr></thead>";
    const body = r.rows.map((s) => "<tr><td>" + s.name + "</td><td>" + q2(s.net) + NB + (IS_EN ? "m²" : "м²") + "</td><td>" + tTxt(s.t) + "</td><td>" + (m ? q3(s.vol) : nf(s.kg)) + "</td></tr>").join("");
    return '<table class="pla__tbl pla__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + '<tr class="pla__total"><td>' + T.rowTotalNo + "</td><td>" + q2(r.netTotal) + NB + (IS_EN ? "m²" : "м²") + "</td><td>" + q1(r.avgT) + "</td><td>" + (m ? q3(r.volNo) : nf(r.kgNo)) + "</td></tr></tbody></table>";
  }
  function costTable(r) {
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thQty + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const qty = (x) => (x.unit === "bags" ? bagsTxt(x.qty) : x.unit === "m3" ? q3(x.qty) + NB + T.u.m3 : nf(x.qty) + NB + T.u.kg);
    let body = r.lines.map((x) => "<tr><td>" + T[x.k] + "</td><td>" + qty(x) + "</td><td>" + (x.price ? unitMoney(x.price) : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.P.del) body += "<tr><td>" + T.rDel + "</td><td></td><td></td><td>" + money(r.P.del) + "</td></tr>";
    if (r.hasPrice) body += '<tr class="pla__total"><td>' + T.rTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="pla__tbl pla__tbl--sch" id="costTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function barHtml(r) {
    const parts = r.lines.filter((x) => x.sum > 0).map((x) => ({ name: T[x.k], v: x.sum }));
    if (r.P.del > 0) parts.push({ name: T.rDel, v: r.P.del });
    if (!parts.length) return "";
    parts.forEach((p, i) => (p.c = COLORS[i % COLORS.length]));
    const seg = parts.map((p) => '<div style="width:' + ((p.v / r.cost) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = parts.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.cost) * 1000) / 10) + "%</span>").join("");
    return '<div class="pla__sub">' + T.barTitle + '</div><div class="pla__bar" role="img" aria-label="' + T.bar + '">' + seg + '</div><div class="pla__legend">' + leg + "</div>";
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="pla__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const n = r.rows.length;
    const unit3 = IS_EN ? "m³" : "м³";
    const sTxt = nf(n) + NB + pl(n, T.surfW);
    let bigTxt, chip;
    if (r.mix) {
      bigTxt = bagsTxt(r.bagsC);
      chip = fill(T.chipMix, { v: q1(r.kgC / r.netTotal) });
    } else {
      bigTxt = r.bags ? bagsTxt(r.bags) : nf(r.kgWith) + NB + T.u.kg;
      chip = fill(T.chipKg, { v: q1(r.kgNo / r.netTotal) });
    }
    const head = '<div class="pla__kpiT">' + fill(T.title, { n: sTxt, a: q2(r.netTotal), r: pct(r.res) }) + '</div><div class="pla__big">' + bigTxt + '</div><div class="pla__chipWrap"><span class="pla__chip">' + chip + "</span></div>";
    const cost = r.hasPrice ? '<div class="pla__per"><div class="pla__kpiT">' + T.tCost + '</div><div class="pla__perV">' + money(r.cost) + '</div><div class="pla__kpiT pla__mt2">' + fill(T.perM2, { p: money(r.perM2Cost) }) + "</div></div>" : "";
    const area = tile(T.tArea, q2(r.netTotal) + NB + (IS_EN ? "m²" : "м²"));
    let tiles;
    if (r.mix) {
      tiles = tile(T.tMortar, q2(r.volWith) + NB + unit3, fill(T.tL, { l: nf(r.volWith * 1000) })) + tile(T.tCement, bagsTxt(r.bagsC), fill(T.tKg, { kg: nf(r.kgC) })) + tile(T.tSand, q2(r.sV) + NB + unit3) + (r.waterL ? tile(T.tWater, nf(r.waterL) + NB + (IS_EN ? "L" : "л")) : area);
    } else {
      tiles = tile(T.tKgWith, nf(r.kgWith) + NB + T.u.kg, r.bags ? fill(T.tBagMini, { b: nf(r.bags), w: nf(r.bag) }) : "") + tile(T.tKgNo, nf(r.kgNo) + NB + T.u.kg) + area + (r.waterL ? tile(T.tWater, nf(r.waterL) + NB + (IS_EN ? "L" : "л")) : tile(T.tCons, q1(r.kgNo / r.netTotal) + NB + T.u.kg));
    }
    box.innerHTML =
      '<div class="pla__head"><div>' + head + (eq ? '<div class="pla__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      (r.hasPrice ? barHtml(r) : "") +
      '<div class="pla__kpis pla__kpis--4">' + tiles + "</div>" +
      '<div class="pla__note">' + T.note + (r.mix ? " " + T.noteMix : "") + (r.thick ? " " + T.noteThick : "") + "</div>";
    el("schedBody").innerHTML = surfTable(r) + (r.hasPrice || r.mix ? '<div class="pla__sub">' + T.tCost + "</div>" + costTable(r) : "");
    sch.hidden = false;
    r.rows.forEach((s) => (el("sv" + s.i).textContent = r.mix ? fill(T.surfInfoM3, { a: q2(s.net), k: q2(s.vol) }) : fill(T.surfInfoKg, { a: q2(s.net), k: nf(s.kg) })));
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
    a.download = "plaster.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    const unit = IS_EN ? "m³" : "м³";
    let txt;
    if (last.mix) txt = T.tCement + ": " + bagsTxt(last.bagsC) + " (" + nf(last.kgC) + " " + T.u.kg + "); " + T.tSand + ": " + q2(last.sV) + " " + unit + "; " + T.tMortar + ": " + q2(last.volWith) + " " + unit;
    else txt = T.copyMix + ": " + nf(last.kgWith) + " " + T.u.kg + (last.bags ? " (" + bagsTxt(last.bags) + ")" : "") + "; " + q1(last.kgNo / last.netTotal) + " " + T.u.kg + " " + T.copyAvg;
    if (last.waterL) txt += "; " + T.tWater + ": " + nf(last.waterL) + " " + (IS_EN ? "L" : "л");
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
  const DDP = (hid) => (/^s\d_type$/.test(hid) ? "s" + hid[1] + "t" : hid === "mtype" ? "mt" : "mr");
  function setDd(hid, v) {
    const pre = DDP(hid), lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }

  // ===== поверхні =====
  function syncSurface(i) {
    const area = el(sId(i, "type")).value === "area";
    el(sId(i, "p2")).closest(".pla__field").hidden = area;
    el(sId(i, "p1_l")).textContent = area ? T.lbl.area + (IS_EN ? ", m²" : ", м²") : T.lbl.len + (IS_EN ? ", m" : ", м");
    el("sl" + i + "rm").hidden = visibleSurfaces().length < 2;
  }
  function syncAll() {
    const mix = isMix();
    visibleSurfaces().forEach((i, idx) => {
      syncSurface(i);
      el("sl" + i).querySelector(".pla__elHead span").textContent = fill(T.surf, { n: idx + 1 });
    });
    el("addSl").hidden = visibleSurfaces().length >= MAXS;
    el("readyBox").hidden = mix;
    el("mixDet").hidden = !mix;
    el("pSandWrap").hidden = !mix;
    el("pBag_l").textContent = mix ? el("pBag_l").dataset.mix : el("pBag_l").dataset.ready;
    el("mratioCustom").hidden = el("mratio").value !== "custom";
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
    ["p1", "p2", "op", "t"].forEach((k) => (el(sId(i, k)).value = ""));
    setDd(sId(i, "type"), "wh");
    el("sv" + i).textContent = "—";
  }
  function applyPreset(v) {
    if (!PRES[v]) return;
    el("cons").value = PRES[v].cons;
    el("bag").value = PRES[v].bag;
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
    ...Array.from({ length: MAXS }, (_, k) => ["p1", "p2", "op", "t"].map((x) => sId(k + 1, x))),
    ["cons", "bag", "water", "reserve", "pBag", "pSand", "pDel", "mk", "mbag", "mrc", "mrs", "wc"]
  );
  const SAMPLE_S = [["wh", "12", "2.7", "3.6", "15"], ["area", "20", "", "", "10"]];
  const SAMPLE_P = { pBag: "380", pDel: "500" };

  function setSurfaces(list) {
    for (let i = 1; i <= MAXS; i++) {
      clearSurface(i);
      el("sl" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, a, b, op, th], idx) => {
      const i = idx + 1;
      setDd(sId(i, "type"), t);
      el(sId(i, "p1")).value = a || "";
      el(sId(i, "p2")).value = b || "";
      el(sId(i, "op")).value = op || "";
      el(sId(i, "t")).value = th || "";
    });
    syncAll();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    el("mk").value = "1.3";
    el("mbag").value = "50";
    setDd("mtype", "gyp");
    applyPreset("gyp");
    setDd("mratio", "1:3");
    setSurfaces([]);
    el("priceDet").open = false;
    syncAll();
    render({ ok: false, none: true });
  }
  function fillExample() {
    resetAll();
    if (cur !== "UAH") setCur("UAH", false);
    el("reserve").value = "10";
    setSurfaces(SAMPLE_S);
    Object.entries(SAMPLE_P).forEach(([k, v]) => (el(k).value = v));
    el("priceDet").open = true;
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("cur", cur);
    p.set("mt", el("mtype").value);
    visibleSurfaces().forEach((i, idx) => {
      p.set("s" + (idx + 1), [el(sId(i, "type")).value, raw(sId(i, "p1")) || "0", raw(sId(i, "p2")) || "0", raw(sId(i, "op")) || "0", raw(sId(i, "t")) || "0"].join(":"));
    });
    ["reserve", "pBag", "pDel"].forEach((id) => raw(id) && p.set(id, raw(id)));
    if (isMix()) {
      p.set("mratio", el("mratio").value);
      ["mk", "mbag", "mrc", "mrs", "wc", "pSand"].forEach((id) => raw(id) && p.set(id, raw(id)));
    } else ["cons", "bag", "water"].forEach((id) => raw(id) && p.set(id, raw(id)));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    let any = false;
    if (["UAH", "USD", "EUR"].includes(q.get("cur"))) {
      cur = q.get("cur");
      syncCur();
    }
    if (q.has("mt")) setDd("mtype", q.get("mt"));
    if (q.has("mratio")) setDd("mratio", q.get("mratio"));
    const list = [];
    for (let i = 1; i <= MAXS; i++) {
      if (!q.has("s" + i)) continue;
      const [t, a, b, op, th] = q.get("s" + i).split(":");
      if (!["wh", "area"].includes(t)) continue;
      const z = (x) => (!x || x === "0" ? "" : x.slice(0, 10));
      list.push([t, z(a), z(b), z(op), z(th)]);
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
    if (any) el("priceDet").open = ["pBag", "pSand", "pDel"].some((id) => raw(id) !== "");
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    FIELD_IDS.forEach((id) => {
      el(id).addEventListener("input", () => calc());
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc(true);
      });
    });
    initDd("mt", (v) => {
      setDd("mtype", v);
      applyPreset(v);
      syncAll();
      calc();
    });
    initDd("mr", (v) => {
      setDd("mratio", v);
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
    ["mixDet", "priceDet"].forEach((id) => el(id).addEventListener("toggle", () => calc()));
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
