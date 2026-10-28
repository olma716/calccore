/* brick-calculator.js — калькулятор цегли: до шести стін, цегла з запасом і піддонами, розчин, необов'язкові матеріали розчину й вартість (UK/EN, UAH/USD/EUR)
   Цегли на 1 м² кладки = (t + j) / ((L + j)(W + j)(H + j)), де t — товщина стіни, j — шов, L×W×H — цегла (усе в метрах).
   Для одинарної цегли 250×120×65 і шва 10 мм це 51,3 / 102,6 / 153,8 / 205,1 шт на 1 м² для ½, 1, 1½, 2 цегел (товщини W, L, L+W+j, 2L+j).
   Розчин = чиста площа × t − цегли × L×W×H. Запас застосовується до цегли й розчину; цегла округлюється вгору. Піддони = ceil(цегла / шт на піддоні).
   Матеріали розчину (необов'язково): сухий об'єм = розчин із запасом × k; цемент = сухий × c/(c+s) × 1440 кг/м³, мішки — вгору; пісок = сухий × s/(c+s).
   Вбудованих цін немає. Курс НБУ — лише для перерахунку введених цін при зміні валюти. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const NB = " ";
  const CEMENT_DENSITY = 1440;
  const MAXW = 6;
  const LIM = { price: { UAH: 1000000, USD: 25000, EUR: 25000 }, fixed: 10000000000 };
  const COLORS = ["#283b69", "#5b7bbf", "#86a0d6", "#16a34a", "#aec1e6"];
  const PRICE_IDS = ["pBrick", "pReady", "pCem", "pSand", "pDel"];
  const PRESETS = { "250x120x65": [250, 120, 65], "250x120x88": [250, 120, 88], "250x120x138": [250, 120, 138], "250x85x65": [250, 85, 65], "380x250x219": [380, 250, 219] };

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b}{u}.",
        errInt: "“{f}” must be a whole number.",
        errOpen: "The openings area must be smaller than the wall area ({a} m²).",
        errTotal: "The total is too large — check the dimensions.",
        errNoWall: "Enter the dimensions of at least one wall.",
        wall: "Wall {n}", wallInfo: "{a} m² · {b} pcs",
        lbl: { len: "Length", hgt: "Height", area: "Area", op: "Openings area", tmm: "Thickness", cnt: "Walls", bL: "Brick length", bW: "Brick width", bH: "Brick height", joint: "Joint", reserve: "Reserve", pal: "Bricks per pallet", pBrick: "Brick price", pReady: "Ready mortar price", pCem: "Cement price per bag", pSand: "Sand price per m³", pDel: "Delivery", mk: "Dry volume factor", mbag: "Bag", mrc: "Cement part", mrs: "Sand part" },
        units: { len: " m", hgt: " m", area: " m²", op: " m²", tmm: " mm", bL: " mm", bW: " mm", bH: " mm", joint: " mm", reserve: " %", pal: " pcs", mbag: " kg" },
        th: { "0.5": "½ brick — {v} mm", "1": "1 brick — {v} mm", "1.5": "1½ bricks — {v} mm", "2": "2 bricks — {v} mm", custom: "Custom thickness" },
        title: "Bricks · {n} · {a} m² of net masonry + {r}% reserve", walls1: "1 wall", walls: "{n} walls",
        chip: "≈ {v} pcs per 1 m² (average)", tNo: "Without reserve", tMortar: "Mortar", tPallets: "Pallets", tPalletsMini: "{p} pcs each", tArea: "Net masonry", tCement: "Cement", tSand: "Sand", tBags: "bags", tKg: "{kg} kg", tL: "{l} L",
        tCost: "Cost", perM2: "{p} per m² of masonry",
        thWall: "Wall", thArea: "Net area", thPer: "Bricks per m²", thBricks: "Bricks", thMortar: "Mortar, m³", rowTotalNo: "Total (without reserve)",
        thItem: "Item", thQty: "Quantity", thPrice: "Price", thSum: "Amount",
        rBricks: "Bricks (with reserve)", rMortar: "Mortar (with reserve)", rCem: "Cement", rSand: "Sand", rDel: "Delivery", rTotal: "Total", u: { pcs: "pcs", m3: "m³", bags: "bags", pallets: "pallets" },
        barTitle: "What the cost consists of", bar: "Cost structure",
        note: "An approximate estimate: the real consumption depends on the quality of the masonry, trimming and the joint thickness. The mortar is the geometric volume of the joints; the reserve covers losses.",
        noteMortar: "Mortar materials: the mix is by volume, cement bulk density 1440 kg/m³, the dry volume factor is yours to set.",
        eq: "≈ {v} at the NBU rate as of {d}",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅"
      }
    : {
        enter: "Вкажіть дані — результат з'явиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b}{u}.",
        errInt: "«{f}» має бути цілим числом.",
        errOpen: "Площа отворів має бути меншою за площу стіни ({a} м²).",
        errTotal: "Підсумок завеликий — перевірте розміри.",
        errNoWall: "Вкажіть розміри хоча б однієї стіни.",
        wall: "Стіна {n}", wallInfo: "{a} м² · {b} шт",
        lbl: { len: "Довжина", hgt: "Висота", area: "Площа", op: "Площа отворів", tmm: "Товщина", cnt: "Таких стін", bL: "Довжина цегли", bW: "Ширина цегли", bH: "Висота цегли", joint: "Шов", reserve: "Запас", pal: "Цегли на піддоні", pBrick: "Ціна цегли", pReady: "Ціна готового розчину", pCem: "Ціна цементу за мішок", pSand: "Ціна піску за м³", pDel: "Доставка", mk: "Коефіцієнт сухого об'єму", mbag: "Мішок", mrc: "Частка цементу", mrs: "Частка піску" },
        units: { len: " м", hgt: " м", area: " м²", op: " м²", tmm: " мм", bL: " мм", bW: " мм", bH: " мм", joint: " мм", reserve: " %", pal: " шт", mbag: " кг" },
        th: { "0.5": "½ цегли — {v} мм", "1": "1 цегла — {v} мм", "1.5": "1½ цегли — {v} мм", "2": "2 цегли — {v} мм", custom: "Своя товщина" },
        title: "Цегла · {n} · {a} м² чистої кладки + запас {r}%", walls1: "1 стіна", walls: "{n} стіни",
        chip: "≈ {v} шт на 1 м² (у середньому)", tNo: "Без запасу", tMortar: "Розчин", tPallets: "Піддонів", tPalletsMini: "по {p} шт", tArea: "Чиста кладка", tCement: "Цемент", tSand: "Пісок", tBags: "мішків", tKg: "{kg} кг", tL: "{l} л",
        tCost: "Вартість", perM2: "{p} за м² кладки",
        thWall: "Стіна", thArea: "Чиста площа", thPer: "Цегла на 1 м²", thBricks: "Цегла", thMortar: "Розчин, м³", rowTotalNo: "Разом (без запасу)",
        thItem: "Позиція", thQty: "Кількість", thPrice: "Ціна", thSum: "Сума",
        rBricks: "Цегла (із запасом)", rMortar: "Розчин (із запасом)", rCem: "Цемент", rSand: "Пісок", rDel: "Доставка", rTotal: "Разом", u: { pcs: "шт", m3: "м³", bags: "мішків", pallets: "піддонів" },
        barTitle: "З чого складається вартість", bar: "Структура вартості",
        note: "Орієнтовна оцінка: реальна витрата залежить від якості кладки, підрізки й товщини швів. Розчин — геометричний об'єм швів; запас покриває втрати.",
        noteMortar: "Матеріали розчину: склад за об'ємом, насипна густина цементу 1440 кг/м³, коефіцієнт сухого об'єму задаєте ви.",
        eq: "≈ {v} за курсом НБУ на {d}",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const nf = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d + 0).toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });
  const q1 = (x) => nf(x, 1);
  const q2 = (x) => nf(x, 2);
  const q3 = (x) => nf(x, 3);
  const pct = (x) => nf(x, x % 1 ? 1 : 0);
  const lim = (x) => (x % 1 ? String(x).replace(".", IS_EN ? "." : ",") : nf(x));
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
  const wId = (i, k) => "w" + i + "_" + k;
  const visibleWalls = () => Array.from({ length: MAXW }, (_, k) => k + 1).filter((i) => !el("wl" + i).hidden);

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

  // ===== цегла, шов, товщина =====
  function brickMm() {
    const v = el("brick").value;
    if (PRESETS[v]) return PRESETS[v].slice();
    return [num("bL"), num("bW"), num("bH")];
  }
  const jointMm = () => {
    const j = num("joint");
    return j === null || Number.isNaN(j) ? 0 : j;
  };
  function thicknessMm(th, b, j) {
    const [L, W] = b;
    return th === "0.5" ? W : th === "1" ? L : th === "1.5" ? L + W + j : th === "2" ? 2 * L + j : null;
  }
  // підписи товщин у списках залежать від цегли й шва
  function syncThLabels() {
    const b = brickMm(), j = jointMm();
    const ok = b.every((x) => x > 0 && Number.isFinite(x));
    for (let i = 1; i <= MAXW; i++) {
      document.querySelectorAll("#w" + i + "h_list li").forEach((li) => {
        const v = li.dataset.v;
        li.textContent = v === "custom" || !ok ? fill(T.th[v], { v: "—" }) : fill(T.th[v], { v: nf(thicknessMm(v, b, j)) });
      });
      const cu = document.querySelector("#w" + i + "h_list li[aria-selected=true]");
      if (cu) el("w" + i + "h_val").textContent = cu.textContent;
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
    // цегла й шов
    const custom = !PRESETS[el("brick").value];
    const bL = custom ? note(val("bL", T.lbl.bL, 50, 1000, true, false, T.units.bL)).v : PRESETS[el("brick").value][0];
    const bW = custom ? note(val("bW", T.lbl.bW, 30, 500, true, false, T.units.bW)).v : PRESETS[el("brick").value][1];
    const bH = custom ? note(val("bH", T.lbl.bH, 30, 500, true, false, T.units.bH)).v : PRESETS[el("brick").value][2];
    const j = note(val("joint", T.lbl.joint, 0, 30, false, false, T.units.joint)).v;
    const joint = j === null ? 0 : j;
    const resR = note(val("reserve", T.lbl.reserve, 0, 50, false, false, T.units.reserve));
    const res = resR.v || 0;
    // стіни
    const walls = [];
    visibleWalls().forEach((i, idx) => {
      const t = el(wId(i, "type")).value;
      const ids = ["p1", "p2", "op", "n"].map((k) => wId(i, k));
      const used = (t === "wh" ? ["p1", "p2"] : ["p1"]).some((k) => raw(wId(i, k)) !== "") || raw(wId(i, "op")) !== "";
      if (!used) return;
      const name = fill(T.wall, { n: idx + 1 });
      const p1 = note(val(wId(i, "p1"), name + ": " + (t === "wh" ? T.lbl.len : T.lbl.area), 0.1, t === "wh" ? 1000 : 100000, true, false, t === "wh" ? T.units.len : T.units.area));
      const p2 = t === "wh" ? note(val(wId(i, "p2"), name + ": " + T.lbl.hgt, 0.1, 50, true, false, T.units.hgt)) : { v: 1 };
      const op = note(val(wId(i, "op"), name + ": " + T.lbl.op, 0, 100000, false, false, T.units.op));
      const th = el(wId(i, "th")).value;
      let tmm;
      if (th === "custom") tmm = note(val(wId(i, "tmm"), name + ": " + T.lbl.tmm, 30, 2000, true, false, T.units.tmm)).v;
      const cnt = note(val(wId(i, "n"), name + ": " + T.lbl.cnt, 1, 1000, false, true));
      if (!miss.length && !err) {
        const gross = t === "wh" ? p1.v * p2.v : p1.v;
        const opv = op.v || 0;
        if (opv >= gross) {
          err = fill(T.errOpen, { a: q2(gross) });
          return;
        }
        walls.push({ i, idx, name, gross, op: opv, net: gross - opv, th, tmm, n: cnt.v || 1 });
      }
    });
    // необов'язкові блоки
    const pal = note(val("pal", T.lbl.pal, 10, 5000, false, true, T.units.pal));
    const mortarOn = el("mortarDet").open;
    let M = {};
    if (mortarOn) {
      const rk = el("mratio").value;
      let rc, rs;
      if (rk === "custom") {
        rc = note(val("mrc", T.lbl.mrc, 0.01, 100, true)).v;
        rs = note(val("mrs", T.lbl.mrs, 0.01, 100, true)).v;
      } else [rc, rs] = rk.split(":").map(Number);
      const k = note(val("mk", T.lbl.mk, 1.1, 2, false)).v || 1.3;
      const bag = note(val("mbag", T.lbl.mbag, 5, 100, false, false, T.units.mbag)).v || 50;
      M = { rc, rs, k, bag };
    }
    const P = {
      brick: note(val("pBrick", T.lbl.pBrick, 0, LIM.price[cur], false)).v,
      ready: note(val("pReady", T.lbl.pReady, 0, LIM.price[cur], false)).v,
      cem: note(val("pCem", T.lbl.pCem, 0, LIM.price[cur], false)).v,
      sand: note(val("pSand", T.lbl.pSand, 0, LIM.price[cur], false)).v,
      del: note(val("pDel", T.lbl.pDel, 0, LIM.fixed, false)).v || 0
    };
    if (err) return { ok: false, msg: err };
    if (miss.length) return { ok: false, incomplete: true, none: false, msg: fill(T.missing, { list: miss.join(", ") }) };
    if (!walls.length) return { ok: false, incomplete: true, none: true, msg: T.errNoWall };
    const L = bL / 1000, W = bW / 1000, H = bH / 1000, jm = joint / 1000, bv = L * W * H;
    const mod = (L + jm) * (W + jm) * (H + jm);
    let netTotal = 0, noWaste = 0, mortarNo = 0;
    const rows = walls.map((w) => {
      const tm = (w.th === "custom" ? w.tmm : thicknessMm(w.th, [bL, bW], joint)) / 1000;
      const perM2 = (tm + jm) / mod;
      const net = w.net * w.n, bricks = net * perM2, mortar = net * tm - bricks * bv;
      netTotal += net; noWaste += bricks; mortarNo += mortar;
      return { ...w, tm, perM2, net, bricks, mortar: Math.max(0, mortar) };
    });
    mortarNo = Math.max(0, mortarNo);
    if (noWaste > 100000000) return { ok: false, msg: T.errTotal };
    const bricksWith = Math.ceil(noWaste * (1 + res / 100) - 1e-9), mortarWith = mortarNo * (1 + res / 100);
    const R = { ok: true, cur, rows, res, joint, brick: [bL, bW, bH], netTotal, noWaste, bricksWith, mortarNo, mortarWith, pallets: pal.v ? Math.ceil(bricksWith / pal.v - 1e-9) : null, pal: pal.v, mortarOn, M, P };
    if (mortarOn) {
      const dry = mortarWith * M.k, sm = M.rc + M.rs, cV = (dry * M.rc) / sm, sV = (dry * M.rs) / sm, kg = cV * CEMENT_DENSITY;
      Object.assign(R, { cV, sV, kg, bags: Math.ceil(kg / M.bag - 1e-9) });
    }
    // вартість
    const lines = [];
    lines.push({ k: "rBricks", qty: bricksWith, unit: "pcs", price: P.brick, sum: P.brick ? bricksWith * P.brick : 0 });
    if (P.ready) lines.push({ k: "rMortar", qty: mortarWith, unit: "m3", price: P.ready, sum: mortarWith * P.ready });
    else if (mortarOn) {
      lines.push({ k: "rCem", qty: R.bags, unit: "bags", price: P.cem, sum: P.cem ? R.bags * P.cem : 0 });
      lines.push({ k: "rSand", qty: R.sV, unit: "m3", price: P.sand, sum: P.sand ? R.sV * P.sand : 0 });
    } else lines.push({ k: "rMortar", qty: mortarWith, unit: "m3", price: 0, sum: 0 });
    R.lines = lines;
    R.cost = lines.reduce((s, x) => s + x.sum, 0) + P.del;
    R.hasPrice = R.cost > 0;
    R.perM2Cost = R.hasPrice ? R.cost / netTotal : 0;
    return R;
  }

  // ===== відображення =====
  const tile = (title, value, mini) => '<div class="bri__kpi"><div class="bri__kpiT">' + title + '</div><div class="bri__kpiV">' + value + "</div>" + (mini ? '<div class="bri__kpiM">' + mini + "</div>" : "") + "</div>";
  function eqLine(r) {
    if (!r.hasPrice) return "";
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.cost / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.cost * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  const unitTxt = (u, n) => T.u[u];

  function wallsTable(r) {
    const head = "<thead><tr><th>" + T.thWall + "</th><th>" + T.thArea + "</th><th>" + T.thPer + "</th><th>" + T.thBricks + "</th><th>" + T.thMortar + "</th></tr></thead>";
    const body = r.rows.map((w) => "<tr><td>" + w.name + " · " + el("w" + w.i + "h_val").textContent.split(" — ")[0] + "</td><td>" + q2(w.net) + NB + (IS_EN ? "m²" : "м²") + "</td><td>" + q1(w.perM2) + "</td><td>" + nf(w.bricks) + "</td><td>" + q3(w.mortar) + "</td></tr>").join("");
    return '<table class="bri__tbl bri__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + '<tr class="bri__total"><td>' + T.rowTotalNo + "</td><td>" + q2(r.netTotal) + NB + (IS_EN ? "m²" : "м²") + "</td><td>" + q1(r.noWaste / r.netTotal) + "</td><td>" + nf(r.noWaste) + "</td><td>" + q3(r.mortarNo) + "</td></tr></tbody></table>";
  }
  function costTable(r) {
    const head = "<thead><tr><th>" + T.thItem + "</th><th>" + T.thQty + "</th><th>" + T.thPrice + "</th><th>" + T.thSum + "</th></tr></thead>";
    const lines = r.lines.slice();
    let body = lines.map((x) => "<tr><td>" + T[x.k] + "</td><td>" + (x.unit === "m3" ? q3(x.qty) : nf(x.qty)) + NB + T.u[x.unit] + "</td><td>" + (x.price ? unitMoney(x.price) : "") + "</td><td>" + (x.sum ? money(x.sum) : "—") + "</td></tr>").join("");
    if (r.P.del) body += "<tr><td>" + T.rDel + "</td><td></td><td></td><td>" + money(r.P.del) + "</td></tr>";
    if (r.pallets) body += "<tr><td>" + T.tPallets + "</td><td>" + nf(r.pallets) + NB + T.u.pallets + "</td><td></td><td></td></tr>";
    if (r.hasPrice) body += '<tr class="bri__total"><td>' + T.rTotal + "</td><td></td><td></td><td>" + money(r.cost) + "</td></tr>";
    return '<table class="bri__tbl bri__tbl--sch" id="costTable">' + head + "<tbody>" + body + "</tbody></table>";
  }
  function barHtml(r) {
    const parts = r.lines.filter((x) => x.sum > 0).map((x) => ({ name: T[x.k], v: x.sum }));
    if (r.P.del > 0) parts.push({ name: T.rDel, v: r.P.del });
    if (!parts.length) return "";
    parts.forEach((p, i) => (p.c = COLORS[i % COLORS.length]));
    const seg = parts.map((p) => '<div style="width:' + ((p.v / r.cost) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = parts.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.cost) * 1000) / 10) + "%</span>").join("");
    return '<div class="bri__sub">' + T.barTitle + '</div><div class="bri__bar" role="img" aria-label="' + T.bar + '">' + seg + '</div><div class="bri__legend">' + leg + "</div>";
  }

  let last = null;

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="bri__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r);
    const wTxt = r.rows.length === 1 ? T.walls1 : fill(T.walls, { n: r.rows.length });
    const unit = IS_EN ? "m³" : "м³";
    const pcs = T.u.pcs;
    const head = '<div class="bri__kpiT">' + fill(T.title, { n: wTxt, a: q2(r.netTotal), r: pct(r.res) }) + '</div><div class="bri__big">' + nf(r.bricksWith) + " " + pcs + '</div><div class="bri__chipWrap"><span class="bri__chip">' + fill(T.chip, { v: q1(r.noWaste / r.netTotal) }) + "</span></div>";
    const cost = r.hasPrice ? '<div class="bri__per"><div class="bri__kpiT">' + T.tCost + '</div><div class="bri__perV">' + money(r.cost) + '</div><div class="bri__kpiT bri__mt2">' + fill(T.perM2, { p: money(r.perM2Cost) }) + "</div></div>" : "";
    let tiles;
    if (r.mortarOn) {
      tiles = tile(T.tMortar, q2(r.mortarWith) + NB + unit, fill(T.tL, { l: nf(r.mortarWith * 1000) })) + tile(T.tCement, nf(r.bags) + NB + T.tBags, fill(T.tKg, { kg: nf(r.kg) })) + tile(T.tSand, q2(r.sV) + NB + unit) + (r.pallets ? tile(T.tPallets, nf(r.pallets), fill(T.tPalletsMini, { p: nf(r.pal) })) : tile(T.tNo, nf(r.noWaste) + NB + pcs));
    } else {
      tiles = tile(T.tNo, nf(r.noWaste) + NB + pcs) + tile(T.tMortar, q2(r.mortarWith) + NB + unit, fill(T.tL, { l: nf(r.mortarWith * 1000) })) + (r.pallets ? tile(T.tPallets, nf(r.pallets), fill(T.tPalletsMini, { p: nf(r.pal) })) : tile(T.tArea, q2(r.netTotal) + NB + (IS_EN ? "m²" : "м²")));
    }
    box.innerHTML =
      '<div class="bri__head"><div>' + head + (eq ? '<div class="bri__eq">' + eq + "</div>" : "") + "</div>" + cost + "</div>" +
      (r.hasPrice ? barHtml(r) : "") +
      '<div class="bri__kpis bri__kpis--' + (r.mortarOn ? 4 : 3) + '">' + tiles + "</div>" +
      '<div class="bri__note">' + T.note + (r.mortarOn ? " " + T.noteMortar : "") + "</div>";
    el("schedBody").innerHTML = wallsTable(r) + (r.hasPrice || r.mortarOn || r.pallets ? '<div class="bri__sub">' + T.tCost + "</div>" + costTable(r) : "");
    sch.hidden = false;
    r.rows.forEach((w) => (el("wv" + w.i).textContent = fill(T.wallInfo, { a: q2(w.net), b: nf(w.bricks) })));
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
    a.download = "bricks.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    const unit = IS_EN ? "m³" : "м³";
    let txt = T.rBricks + ": " + nf(last.bricksWith) + " " + T.u.pcs + " (" + fill(T.chip, { v: q1(last.noWaste / last.netTotal) }) + "); " + T.tMortar + ": " + q2(last.mortarWith) + " " + unit;
    if (last.mortarOn) txt += "; " + T.tCement + ": " + nf(last.bags) + " " + T.tBags + "; " + T.tSand + ": " + q2(last.sV) + " " + unit;
    if (last.pallets) txt += "; " + T.tPallets + ": " + nf(last.pallets);
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
  const DDP = (hid) => (/^w\d_type$/.test(hid) ? "w" + hid[1] + "t" : /^w\d_th$/.test(hid) ? "w" + hid[1] + "h" : hid === "brick" ? "bp" : "mr");
  function setDd(hid, v) {
    const pre = DDP(hid), lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }

  // ===== стіни =====
  function syncWall(i) {
    const area = el(wId(i, "type")).value === "area";
    el(wId(i, "p2")).closest(".bri__field").hidden = area;
    el(wId(i, "p1_l")).textContent = area ? T.lbl.area + (IS_EN ? ", m²" : ", м²") : T.lbl.len + (IS_EN ? ", m" : ", м");
    el(wId(i, "tcw")).hidden = el(wId(i, "th")).value !== "custom";
    el("wl" + i + "rm").hidden = visibleWalls().length < 2;
  }
  function syncAll() {
    syncThLabels();
    visibleWalls().forEach((i, idx) => {
      syncWall(i);
      el("wl" + i).querySelector(".bri__elHead span").textContent = fill(T.wall, { n: idx + 1 });
    });
    el("addWl").hidden = visibleWalls().length >= MAXW;
    el("brickCustom").hidden = PRESETS[el("brick").value] !== undefined;
    el("mratioCustom").hidden = el("mratio").value !== "custom";
  }
  function addWall() {
    const i = Array.from({ length: MAXW }, (_, k) => k + 1).find((x) => el("wl" + x).hidden);
    if (!i) return;
    el("wl" + i).hidden = false;
    syncAll();
  }
  function removeWall(i) {
    if (visibleWalls().length < 2) return;
    clearWall(i);
    el("wl" + i).hidden = true;
    syncAll();
  }
  function clearWall(i) {
    ["p1", "p2", "op", "tmm", "n"].forEach((k) => (el(wId(i, k)).value = ""));
    setDd(wId(i, "type"), "wh");
    setDd(wId(i, "th"), "1");
    el("wv" + i).textContent = "—";
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
    ...Array.from({ length: MAXW }, (_, k) => ["p1", "p2", "op", "tmm", "n"].map((x) => wId(k + 1, x))),
    ["bL", "bW", "bH", "joint", "reserve", "pal", "pBrick", "pReady", "pCem", "pSand", "pDel", "mk", "mbag", "mrc", "mrs"]
  );
  const SAMPLE_W = [["wh", "10", "2.7", "3.6", "1"], ["wh", "6", "2.7", "1.8", "0.5"]];
  const SAMPLE_P = { pal: "350", pBrick: "12", pCem: "210", pSand: "900", pDel: "900" };

  function autoOpen() {
    el("mortarDet").open = raw("mk") !== "1.3" && raw("mk") !== "" || raw("mbag") !== "50" && raw("mbag") !== "" || el("mratio").value !== "1:4" || raw("mrc") !== "" || el("mortarDet").open;
    el("priceDet").open = ["pal", "pBrick", "pReady", "pCem", "pSand", "pDel"].some((id) => raw(id) !== "");
  }
  function setWalls(list) {
    for (let i = 1; i <= MAXW; i++) {
      clearWall(i);
      el("wl" + i).hidden = i > Math.max(1, list.length);
    }
    list.forEach(([t, a, b, op, th, n], idx) => {
      const i = idx + 1;
      setDd(wId(i, "type"), t);
      el(wId(i, "p1")).value = a || "";
      el(wId(i, "p2")).value = b || "";
      el(wId(i, "op")).value = op || "";
      if (String(th).startsWith("c")) {
        setDd(wId(i, "th"), "custom");
        el(wId(i, "tmm")).value = String(th).slice(1, 8);
      } else setDd(wId(i, "th"), ["0.5", "1", "1.5", "2"].includes(String(th)) ? String(th) : "1");
      el(wId(i, "n")).value = n && n !== "1" ? n : "";
    });
    syncAll();
  }
  function resetAll() {
    FIELD_IDS.forEach((id) => (el(id).value = ""));
    el("mk").value = "1.3";
    el("mbag").value = "50";
    setDd("brick", "250x120x65");
    setDd("mratio", "1:4");
    setWalls([]);
    el("mortarDet").open = false;
    el("priceDet").open = false;
    syncAll();
    render({ ok: false, none: true });
  }
  function fillExample() {
    resetAll();
    el("joint").value = "10";
    el("reserve").value = "5";
    if (cur !== "UAH") setCur("UAH", false);
    setWalls(SAMPLE_W.map((w, k) => (k === 0 ? [...w.slice(0, 4), "1", "1"] : [...w.slice(0, 4), "0.5", "1"])).map(([t, a, b, op, th, n]) => [t, a, b, op, th, n]));
    Object.entries(SAMPLE_P).forEach(([k, v]) => (el(k).value = v));
    el("mortarDet").open = true;
    el("priceDet").open = true;
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("cur", cur);
    p.set("brick", el("brick").value);
    visibleWalls().forEach((i, idx) => {
      const th = el(wId(i, "th")).value;
      p.set("w" + (idx + 1), [el(wId(i, "type")).value, raw(wId(i, "p1")) || "0", raw(wId(i, "p2")) || "0", raw(wId(i, "op")) || "0", th === "custom" ? "c" + (raw(wId(i, "tmm")) || "0") : th, raw(wId(i, "n")) || "1"].join(":"));
    });
    ["joint", "reserve", "pal", "pBrick", "pReady", "pCem", "pSand", "pDel"].forEach((id) => raw(id) && p.set(id, raw(id)));
    if (PRESETS[el("brick").value] === undefined) ["bL", "bW", "bH"].forEach((id) => raw(id) && p.set(id, raw(id)));
    if (el("mortarDet").open) {
      p.set("m", "1");
      p.set("mratio", el("mratio").value);
      ["mk", "mbag", "mrc", "mrs"].forEach((id) => raw(id) && p.set(id, raw(id)));
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
    if (q.has("brick")) setDd("brick", q.get("brick"));
    const list = [];
    for (let i = 1; i <= MAXW; i++) {
      if (!q.has("w" + i)) continue;
      const [t, a, b, op, th, n] = q.get("w" + i).split(":");
      if (!["wh", "area"].includes(t)) continue;
      const z = (x) => (!x || x === "0" ? "" : x.slice(0, 10));
      list.push([t, z(a), z(b), z(op), th || "1", (n || "1").slice(0, 6)]);
    }
    if (list.length) {
      setWalls(list);
      any = true;
    }
    FIELD_IDS.forEach((id) => {
      if (!/^w\d_/.test(id) && q.has(id)) {
        el(id).value = q.get(id).slice(0, 12);
        any = true;
      }
    });
    if (q.get("m") === "1") {
      if (q.has("mratio")) setDd("mratio", q.get("mratio"));
      el("mortarDet").open = true;
    }
    if (any) el("priceDet").open = ["pal", "pBrick", "pReady", "pCem", "pSand", "pDel"].some((id) => raw(id) !== "");
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    FIELD_IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (["joint", "bL", "bW", "bH"].includes(id)) syncThLabels();
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc(true);
      });
    });
    initDd("bp", (v) => {
      setDd("brick", v);
      syncAll();
      calc();
    });
    initDd("mr", (v) => {
      setDd("mratio", v);
      syncAll();
      calc();
    });
    for (let i = 1; i <= MAXW; i++) {
      initDd("w" + i + "t", (v) => {
        setDd(wId(i, "type"), v);
        syncWall(i);
        calc();
      });
      initDd("w" + i + "h", (v) => {
        setDd(wId(i, "th"), v);
        syncWall(i);
        calc();
      });
      el("wl" + i + "rm").addEventListener("click", () => {
        removeWall(i);
        calc();
      });
    }
    el("addWl").addEventListener("click", addWall);
    ["mortarDet", "priceDet"].forEach((id) => el(id).addEventListener("toggle", () => calc()));
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
