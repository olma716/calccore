/* paint-calculator.js — калькулятор фарби: до шести поверхонь (стіни кімнати, стіна, стеля, площа), шари, запас, банки з візуалізацією, необов'язкові ґрунтовка й вартість (UK/EN, UAH/USD/EUR)
   Літри = площа × шари / витрата (м² з 1 л на шар); запас додається до літрів; банки = ceil(літри з запасом / об'єм банки).
   Стіни кімнати = 2·(L + W)·H − отвори; стіна = L·H − отвори; стеля = L·W − отвори; площа = A − отвори.
   Ґрунтовка рахується так само за своєю витратою й шарами. Вбудованих цін немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = " ";
  const MAXS = 6;
  const LIM = { price: { UAH: 1000000, USD: 25000, EUR: 25000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf"];
  const PRICE_IDS = ["pPaint", "pPrimer", "pDel"];
  const PRES = { int: "10", fac: "7", own: "" };

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errInt: "“{f}” must be a whole number.",
        errOpen: "The openings area must be smaller than the surface area ({a} m²).",
        errTotal: "The total is too large — check the dimensions.",
        errNoSurf: "Enter the dimensions of at least one surface.",
        errCanPrice: "Enter the can size to price the paint per can.",
        errPCanPrice: "Enter the primer can size to price the primer per can.",
        surf: "Surface {n}", surfInfo: "{a} m²",
        lbl: { len: "Length", wid: "Width", hgt: "Height", area: "Area", op: "Openings area", cov: "Coverage", coats: "Coats", reserve: "Reserve", can: "Can", pcov: "Primer coverage", pcoats: "Primer coats", pcan: "Primer can", pPaint: "Paint price", pPrimer: "Primer price", pDel: "Delivery" },
        units: { len: " m", wid: " m", hgt: " m", area: " m²", op: " m²", cov: " m²/L", reserve: " %", can: " L", pcov: " m²/L", pcoats: "" },
        title: "Paint · {n} · {a} m² · {c} {cw} · reserve {r}%", surfW: ["surface", "surfaces", "surfaces"], coatW: ["coat", "coats", "coats"], canW: ["can", "cans", "cans"],
        chipCans: "{n} of {c} L ({t} L)", chipNone: "{l} L without the reserve",
        tArea: "Area", tNo: "Without reserve", tPrimer: "Primer", tCoats: "Coats", tLeft: "Left in the cans", tLeftMini: "of {t} L bought",
        tCost: "Cost", perM2: "{p} per m²",
        thSurf: "Surface", thType: "Type", thArea: "Area, m²", thL: "Paint, L", rowNo: "Total (without reserve)", rowWith: "Total (with reserve)",
        thItem: "Item", thQty: "Quantity", thPrice: "Price", thSum: "Amount",
        rPaint: "Paint", rPrimer: "Primer", rDel: "Delivery", rTotal: "Total", u: { l: "L", cans: "cans" },
        types: { room: "Room walls", wall: "Wall", ceil: "Ceiling", area: "Area" },
        cansTitle: "Paint cans", cansAria: "Paint cans: full cans and the last can filled partly", cansLeft: "left over {l} L", cansNote: "primer: {t}",
        note: "An approximate estimate: the real consumption depends on the paint, the base and the way it is applied. Take the coverage from the label of your paint.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅",
        copyPaint: "Paint", copyPrimer: "primer"
      }
    : {
        enter: "Вкажіть дані — результат з'явиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errInt: "«{f}» має бути цілим числом.",
        errOpen: "Площа отворів має бути меншою за площу поверхні ({a} м²).",
        errTotal: "Підсумок завеликий — перевірте розміри.",
        errNoSurf: "Вкажіть розміри хоча б однієї поверхні.",
        errCanPrice: "Вкажіть об'єм банки, щоб порахувати вартість за банку.",
        errPCanPrice: "Вкажіть об'єм банки ґрунтовки, щоб порахувати її вартість за банку.",
        surf: "Поверхня {n}", surfInfo: "{a} м²",
        lbl: { len: "Довжина", wid: "Ширина", hgt: "Висота", area: "Площа", op: "Площа отворів", cov: "Витрата", coats: "Шарів", reserve: "Запас", can: "Банка", pcov: "Витрата ґрунтовки", pcoats: "Шарів ґрунтовки", pcan: "Банка ґрунтовки", pPaint: "Ціна фарби", pPrimer: "Ціна ґрунтовки", pDel: "Доставка" },
        units: { len: " м", wid: " м", hgt: " м", area: " м²", op: " м²", cov: " м²/л", reserve: " %", can: " л", pcov: " м²/л", pcoats: "" },
        title: "Фарба · {n} · {a} м² · {c} {cw} · запас {r}%", surfW: ["поверхня", "поверхні", "поверхонь"], coatW: ["шар", "шари", "шарів"], canW: ["банка", "банки", "банок"],
        chipCans: "{n} по {c} л ({t} л)", chipNone: "{l} л без запасу",
        tArea: "Площа", tNo: "Без запасу", tPrimer: "Ґрунтовка", tCoats: "Шарів", tLeft: "Залишок у банках", tLeftMini: "з {t} л куплених",
        tCost: "Вартість", perM2: "{p} за м²",
        thSurf: "Поверхня", thType: "Тип", thArea: "Площа, м²", thL: "Фарба, л", rowNo: "Разом (без запасу)", rowWith: "Разом (із запасом)",
        thItem: "Позиція", thQty: "Кількість", thPrice: "Ціна", thSum: "Сума",
        rPaint: "Фарба", rPrimer: "Ґрунтовка", rDel: "Доставка", rTotal: "Разом", u: { l: "л", cans: "банок" },
        types: { room: "Стіни кімнати", wall: "Стіна", ceil: "Стеля", area: "Площа" },
        cansTitle: "Банки фарби", cansAria: "Банки фарби: повні банки й остання заповнена частково", cansLeft: "залишок {l} л", cansNote: "ґрунтовка: {t}",
        note: "Орієнтовна оцінка: реальна витрата залежить від фарби, основи й способу нанесення. Витрату беріть з етикетки вашої фарби.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅",
        copyPaint: "Фарба", copyPrimer: "ґрунтовка"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const nf = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d + 0).toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });
  const q1 = (x) => nf(x, 1);
  const q2 = (x) => nf(x, 2);
  const g = (x) => (Math.round(x * 100) / 100).toLocaleString(LOC, { maximumFractionDigits: 2 });
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
  const LT = IS_EN ? "L" : "л";
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
  const MAXV = 1e9;
  const cansTxt = (n) => nf(n) + NB + pl(n, T.canW);

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
    const cov = note(val("cov", T.lbl.cov, 1, 60, true, false, T.units.cov)).v;
    const coats = note(val("coats", T.lbl.coats, 1, 10, true, true)).v;
    const res = note(val("reserve", T.lbl.reserve, 0, 50, false, false, T.units.reserve)).v || 0;
    const can = note(val("can", T.lbl.can, 0.1, 100, false, false, T.units.can)).v;
    const pcov = note(val("pcov", T.lbl.pcov, 1, 60, false, false, T.units.pcov)).v;
    const pcoats = pcov ? note(val("pcoats", T.lbl.pcoats, 1, 5, false, true)).v || 1 : 1;
    const pcan = note(val("pcan", T.lbl.pcan, 0.1, 100, false, false, T.units.can)).v;
    const surfaces = [];
    visibleSurfaces().forEach((i, idx) => {
      const t = el(sId(i, "type")).value;
      const keys = t === "room" ? ["p1", "p2", "p3"] : t === "area" ? ["p1"] : ["p1", "p2"];
      const used = keys.some((k) => raw(sId(i, k)) !== "") || raw(sId(i, "op")) !== "";
      if (!used) return;
      const name = fill(T.surf, { n: idx + 1 });
      const p1 = note(val(sId(i, "p1"), name + ": " + (t === "area" ? T.lbl.area : T.lbl.len), 0.1, t === "area" ? 1e7 : 10000, true, false, t === "area" ? T.units.area : T.units.len));
      const p2 = keys.length > 1 ? note(val(sId(i, "p2"), name + ": " + (t === "wall" ? T.lbl.hgt : T.lbl.wid), 0.1, t === "wall" ? 100 : 10000, true, false, t === "wall" ? T.units.hgt : T.units.wid)) : { v: 1 };
      const p3 = t === "room" ? note(val(sId(i, "p3"), name + ": " + T.lbl.hgt, 0.1, 100, true, false, T.units.hgt)) : { v: 1 };
      const op = note(val(sId(i, "op"), name + ": " + T.lbl.op, 0, 1e7, false, false, T.units.op));
      if (!miss.length && !err) {
        const gross = t === "room" ? 2 * (p1.v + p2.v) * p3.v : t === "wall" || t === "ceil" ? p1.v * p2.v : p1.v;
        const opv = op.v || 0;
        if (opv >= gross) {
          err = fill(T.errOpen, { a: q2(gross) });
          return;
        }
        surfaces.push({ i, idx, name, t, gross, net: gross - opv });
      }
    });
    const P = {
      unit: el("punit").value,
      paint: note(val("pPaint", T.lbl.pPaint, 0, LIM.price[cur], false)).v,
      primer: note(val("pPrimer", T.lbl.pPrimer, 0, LIM.price[cur], false)).v,
      del: note(val("pDel", T.lbl.pDel, 0, LIM.fixed, false)).v || 0
    };
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!surfaces.length) return { ok: false, incomplete: true, none: true, msg: T.errNoSurf };
    if (P.unit === "can" && P.paint && !can) return { ok: false, msg: T.errCanPrice };
    if (P.unit === "can" && P.primer && pcov && !pcan) return { ok: false, msg: T.errPCanPrice };
    let area = 0;
    surfaces.forEach((s) => (area += s.net));
    if (area > MAXV) return { ok: false, msg: T.errTotal };
    const f = 1 + res / 100;
    const rows = surfaces.map((s) => ({ ...s, l: (s.net * coats) / cov }));
    const lNo = (area * coats) / cov, lWith = lNo * f;
    const R = { ok: true, cur, rows, area, coats, cov, res, can, pcov, pcoats, pcan, P, lNo, lWith };
    if (can) {
      R.cans = Math.ceil(lWith / can - 1e-9);
      R.bought = R.cans * can;
      R.left = R.bought - lWith;
    }
    if (pcov) {
      R.pNo = (area * pcoats) / pcov;
      R.pWith = R.pNo * f;
      if (pcan) {
        R.pCans = Math.ceil(R.pWith / pcan - 1e-9);
        R.pBought = R.pCans * pcan;
      }
    }
    const lines = [];
    const paintQty = P.unit === "can" ? R.cans : can ? R.bought : lWith;
    lines.push({ k: "rPaint", qty: paintQty, unit: P.unit === "can" ? "cans" : "l", price: P.paint, sum: P.paint ? paintQty * P.paint : 0 });
    if (pcov) {
      const pq = P.unit === "can" ? R.pCans : pcan ? R.pBought : R.pWith;
      lines.push({ k: "rPrimer", qty: pq, unit: P.unit === "can" ? "cans" : "l", price: P.primer, sum: P.primer && pq ? pq * P.primer : 0 });
    }
    R.lines = lines;
    R.cost = lines.reduce((s, x) => s + x.sum, 0) + P.del;
    R.hasPrice = R.cost > 0;
    R.perM2 = R.hasPrice ? R.cost / area : 0;
    return R;
  }

  // ===== відображення =====
  const tile = (title, value, mini) => '<div class="pnt__kpi"><div class="pnt__kpiT">' + title + '</div><div class="pnt__kpiV">' + value + "</div>" + (mini ? '<div class="pnt__kpiM">' + mini + "</div>" : "") + "</div>";
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  function surfTable(r) {
    const head = "<thead><tr><th>" + T.thSurf + "</th><th>" + T.thType + "</th><th>" + T.thArea + "</th><th>" + T.thL + "</th></tr></thead>";
    const body = r.rows.map((s) => "<tr><td>" + s.name + "</td><td>" + T.types[s.t] + "</td><td>" + q2(s.net) + "</td><td>" + q2(s.l) + "</td></tr>").join("");
    let tot = '<tr class="pnt__total"><td>' + T.rowNo + "</td><td></td><td>" + q2(r.area) + "</td><td>" + q2(r.lNo) + "</td></tr>";
    if (r.res > 0) tot += '<tr class="pnt__total"><td>' + T.rowWith + "</td><td></td><td></td><td>" + q2(r.lWith) + "</td></tr>";
    return '<table class="pnt__tbl pnt__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + tot + "</tbody></table>";
  }
  function costTable(r) {
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thQty + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const qty = (x) => (x.unit === "cans" ? cansTxt(x.qty) : q2(x.qty) + NB + T.u.l);
    let body = r.lines.map((x) => "<tr><td>" + T[x.k] + "</td><td>" + qty(x) + "</td><td>" + (x.price ? unitMoney(x.price) + " / " + (x.unit === "cans" ? (IS_EN ? "can" : "банку") : T.u.l) : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.P.del) body += "<tr><td>" + T.rDel + "</td><td></td><td></td><td>" + money(r.P.del) + "</td></tr>";
    if (r.hasPrice) body += '<tr class="pnt__total"><td>' + T.rTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="pnt__tbl pnt__tbl--sch" id="costTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function barHtml(r) {
    const parts = r.lines.filter((x) => x.sum > 0).map((x) => ({ name: T[x.k], v: x.sum }));
    if (r.P.del > 0) parts.push({ name: T.rDel, v: r.P.del });
    if (!parts.length) return "";
    parts.forEach((p, i) => (p.c = COLORS[i % COLORS.length]));
    const seg = parts.map((p) => '<div style="width:' + ((p.v / r.cost) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = parts.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.cost) * 1000) / 10) + "%</span>").join("");
    return '<div class="pnt__sub">' + (IS_EN ? "What the cost consists of" : "З чого складається вартість") + '</div><div class="pnt__bar" role="img" aria-label="' + (IS_EN ? "Cost structure" : "Структура вартості") + '">' + seg + '</div><div class="pnt__legend">' + leg + "</div>";
  }
  // банки: повні й остання заповнена на частку
  function cansHtml(r) {
    if (!r.cans) return "";
    const n = r.cans, VW = 320, PAD = 10, GAP = n > 6 ? 5 : 14;
    const w = Math.min(74, (VW - 2 * PAD - GAP * (n - 1)) / n), h = Math.min(84, w * 1.15 + 6), Y = 22;
    const lastFrac = (r.lWith - (n - 1) * r.can) / r.can;
    let out = "";
    const total = n * w + (n - 1) * GAP, X0 = (VW - total) / 2;
    for (let k = 0; k < n; k++) {
      const x = X0 + k * (w + GAP), last = k === n - 1, fr = last ? Math.max(0.04, Math.min(1, lastFrac)) : 1;
      const fh = (h - 2) * fr;
      out += '<rect x="' + x.toFixed(1) + '" y="' + Y + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="8" fill="none" stroke="#283b69" stroke-width="1.5"/>';
      out += '<rect x="' + (x + 1).toFixed(1) + '" y="' + (Y + h - 1 - fh).toFixed(1) + '" width="' + (w - 2).toFixed(1) + '" height="' + fh.toFixed(1) + '" rx="7" fill="#86a0d6" fill-opacity="0.55"/>';
      out += '<rect x="' + x.toFixed(1) + '" y="' + Y + '" width="' + w.toFixed(1) + '" height="10" rx="5" fill="#283b69"/>';
      if (w >= 40) out += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (Y + h / 2 + 8).toFixed(1) + '" font-size="13" font-weight="700" text-anchor="middle" fill="#0C447C">' + g(last ? lastFrac * r.can : r.can) + " " + LT + "</text>";
    }
    if (r.left > 0.005) {
      const xl = X0 + (n - 1) * (w + GAP) + w / 2;
      out += '<text x="' + Math.min(Math.max(xl, 60), VW - 60).toFixed(1) + '" y="14" font-size="12" text-anchor="middle" fill="#5b6b8c">' + fill(T.cansLeft, { l: g(r.left) }) + "</text>";
    }
    const primer = r.pcov ? '<div class="pnt__legend"><span>' + fill(T.cansNote, { t: (r.pCans ? cansTxt(r.pCans) + " · " : "") + q1(r.pWith) + NB + LT }) + "</span></div>" : "";
    return '<div class="pnt__sub">' + T.cansTitle + '</div><svg class="pnt__diag" viewBox="0 0 ' + VW + " " + (Y + h + 8).toFixed(0) + '" role="img" aria-label="' + T.cansAria + '">' + out + "</svg>" + primer;
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="pnt__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const n = r.rows.length;
    const chip = r.cans ? fill(T.chipCans, { n: cansTxt(r.cans), c: g(r.can), t: g(r.bought) }) : fill(T.chipNone, { l: q1(r.lNo) });
    const head = '<div class="pnt__kpiT">' + fill(T.title, { n: nf(n) + NB + pl(n, T.surfW), a: q1(r.area), c: nf(r.coats), cw: pl(r.coats, T.coatW), r: pct(r.res) }) + '</div><div class="pnt__big">' + q1(r.lWith) + NB + LT + '</div><div class="pnt__chipWrap"><span class="pnt__chip">' + chip + "</span></div>";
    const cost = r.hasPrice ? '<div class="pnt__per"><div class="pnt__kpiT">' + T.tCost + '</div><div class="pnt__perV">' + money(r.cost) + '</div><div class="pnt__kpiT pnt__mt2">' + fill(T.perM2, { p: unitMoney(r.perM2) }) + "</div></div>" : "";
    let tiles = tile(T.tArea, q1(r.area) + NB + M2) + tile(T.tNo, q1(r.lNo) + NB + LT);
    if (r.pcov) tiles += tile(T.tPrimer, r.pCans ? cansTxt(r.pCans) : q1(r.pWith) + NB + LT, r.pCans ? q1(r.pWith) + NB + LT : "");
    else tiles += tile(T.tCoats, nf(r.coats));
    if (r.cans) tiles += tile(T.tLeft, g(r.left) + NB + LT, fill(T.tLeftMini, { t: g(r.bought) }));
    box.innerHTML =
      '<div class="pnt__head"><div>' + head + (eq ? '<div class="pnt__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      (r.hasPrice ? barHtml(r) : "") +
      cansHtml(r) +
      '<div class="pnt__kpis pnt__kpis--4">' + tiles + "</div>" +
      '<div class="pnt__note">' + T.note + "</div>";
    el("schedBody").innerHTML = surfTable(r) + (r.hasPrice ? '<div class="pnt__sub">' + T.tCost + "</div>" + costTable(r) : "");
    sch.hidden = false;
    r.rows.forEach((s) => (el("sv" + s.i).textContent = fill(T.surfInfo, { a: q1(s.net) })));
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
    a.download = "paint.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    let txt = T.copyPaint + ": " + q1(last.lWith) + " " + LT + (last.cans ? " (" + cansTxt(last.cans) + " " + (IS_EN ? "of" : "по") + " " + g(last.can) + " " + LT + ")" : "");
    if (last.pcov) txt += "; " + T.copyPrimer + ": " + q1(last.pWith) + " " + LT + (last.pCans ? " (" + cansTxt(last.pCans) + ")" : "");
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
  const DDP = (hid) => (/^s\d_type$/.test(hid) ? "s" + hid[1] + "t" : hid === "ptype" ? "pt" : "pu");
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
    const sfx = ", " + (IS_EN ? "m" : "м");
    el(sId(i, "f2")).hidden = t === "area";
    el(sId(i, "f3")).hidden = t !== "room";
    el(sId(i, "l1")).textContent = t === "area" ? T.lbl.area + ", " + M2 : T.lbl.len + sfx;
    el(sId(i, "l2")).textContent = (t === "wall" ? T.lbl.hgt : T.lbl.wid) + sfx;
    el("sl" + i + "rm").hidden = visibleSurfaces().length < 2;
  }
  function syncAll() {
    visibleSurfaces().forEach((i, idx) => {
      syncSurface(i);
      el("sl" + i).querySelector(".pnt__elHead span").textContent = fill(T.surf, { n: idx + 1 });
    });
    el("addSl").hidden = visibleSurfaces().length >= MAXS;
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
    ["p1", "p2", "p3", "op"].forEach((k) => (el(sId(i, k)).value = ""));
    setDd(sId(i, "type"), "room");
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
    ...Array.from({ length: MAXS }, (_, k) => ["p1", "p2", "p3", "op"].map((x) => sId(k + 1, x))),
    ["cov", "coats", "reserve", "can", "pcov", "pcoats", "pcan", "pPaint", "pPrimer", "pDel"]
  );
  const SAMPLE = { s: [["room", "5", "4", "2.7", "6"], ["ceil", "5", "4", "", ""]], f: { reserve: "10", can: "5", pcov: "10", pcan: "5", pPaint: "1300", pPrimer: "600" } };

  function setSurfaces(list) {
    for (let i = 1; i <= MAXS; i++) {
      clearSurface(i);
      el("sl" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, a, b, c, op], idx) => {
      const i = idx + 1;
      setDd(sId(i, "type"), t);
      el(sId(i, "p1")).value = a || "";
      el(sId(i, "p2")).value = b || "";
      el(sId(i, "p3")).value = c || "";
      el(sId(i, "op")).value = op || "";
    });
    syncAll();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    setDd("ptype", "int");
    el("cov").value = PRES.int;
    el("coats").value = "2";
    el("pcoats").value = "1";
    setDd("punit", "l");
    setSurfaces([]);
    el("primerDet").open = false;
    el("priceDet").open = false;
    syncAll();
    render({ ok: false, none: true });
  }
  function fillExample() {
    resetAll();
    if (cur !== "UAH") setCur("UAH", false);
    Object.entries(SAMPLE.f).forEach(([k, v]) => (el(k).value = v));
    setDd("punit", "can");
    setSurfaces(SAMPLE.s);
    el("primerDet").open = true;
    el("priceDet").open = true;
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("cur", cur);
    p.set("pt", el("ptype").value);
    p.set("pu", el("punit").value);
    visibleSurfaces().forEach((i, idx) => {
      p.set("s" + (idx + 1), [el(sId(i, "type")).value, raw(sId(i, "p1")) || "0", raw(sId(i, "p2")) || "0", raw(sId(i, "p3")) || "0", raw(sId(i, "op")) || "0"].join(":"));
    });
    FIELD_IDS.filter((id) => !/^s\d_/.test(id)).forEach((id) => raw(id) && p.set(id, raw(id)));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    let any = false;
    if (["UAH", "USD", "EUR"].includes(q.get("cur"))) {
      cur = q.get("cur");
      syncCur();
    }
    if (q.has("pt")) setDd("ptype", q.get("pt"));
    if (q.has("pu")) setDd("punit", q.get("pu"));
    const list = [];
    for (let i = 1; i <= MAXS; i++) {
      if (!q.has("s" + i)) continue;
      const [t, a, b, c, op] = q.get("s" + i).split(":");
      if (!["room", "wall", "ceil", "area"].includes(t)) continue;
      const z = (x) => (!x || x === "0" ? "" : x.slice(0, 10));
      list.push([t, z(a), z(b), z(c), z(op)]);
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
    if (any) {
      el("primerDet").open = raw("pcov") !== "";
      el("priceDet").open = ["pPaint", "pPrimer", "pDel"].some((id) => raw(id) !== "");
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
    initDd("pt", (v) => {
      setDd("ptype", v);
      el("cov").value = PRES[v];
      calc();
    });
    initDd("pu", (v) => {
      setDd("punit", v);
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
    ["primerDet", "priceDet"].forEach((id) => el(id).addEventListener("toggle", () => calc()));
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
