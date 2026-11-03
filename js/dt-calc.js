/* dt-calc.js — калькулятор DOTS: бали й IPF GL, потрібна сума для цілі, таблиця сум за вагою тіла */
PhysCalc.start(({ L }) => {
  const D = window.Dt, UI = window.PhysUI;
  const SEP = L(",", ".");
  const fnum = (x, d = 1) => { const v = Math.round(x * 10 ** d) / 10 ** d; return String(v).replace(".", SEP); };
  const fix = (x, d = 1) => x.toFixed(d).replace(".", SEP);
  const num = (s) => { const t = String(s).replace(/\s+/g, "").replace(",", "."); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
  const NOTE = L("DOTS і IPF GL — спортивні оціночні формули для порівняння пауерліфтерів різної ваги, а не оцінка здоров'я чи загальної форми. Рівні — неофіційні орієнтири з відкритих джерел, які розходяться до ~50 балів.", "DOTS and IPF GL are sport scoring formulas for comparing powerlifters of different weights, not a measure of health or general fitness. The levels are unofficial guides from open sources that differ by up to ~50 points.");
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (ml || 6) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const show = (el, id, on) => { const e = el(id + "W"); if (e) e.style.display = on ? "" : "none"; };
  const setP = (el, id, v) => { const e = el(id); if (e && v !== undefined) e.value = v; };
  const shareMap = (map, p, el) => map.forEach(([k, id]) => { const e = el(id); if (e && String(e.value).trim() !== "") p.set(k, String(e.value).trim()); });
  const applyMap = (map, qs, el) => map.forEach(([k, id]) => { const e = el(id); if (!e || !qs.has(k)) return; const v = qs.get(k).slice(0, 12); if (e.tagName === "SELECT") { if ([...e.options].some((o) => o.value === v)) e.value = v; } else e.value = v; });
  // ----- одиниці й поля -----
  const imp = (el) => el("dtU").value === "imp", sx = (el) => el("dtS").value;
  const sexF = () => fld("dtS", L("Стать", "Sex"), sel("dtS", [["m", L("Чоловіча", "Male")], ["f", L("Жіноча", "Female")]], "m"));
  const unitF = () => fld("dtU", L("Одиниці", "Units"), sel("dtU", [["metric", L("Кілограми (кг)", "Kilograms (kg)")], ["imp", L("Фунти (lb)", "Pounds (lb)")]], "metric"));
  const kgF = (id, uk, en, ph) => fld(id, '<span id="' + id + 'L" data-uk="' + uk + '" data-en="' + en + '">' + L(uk + ", кг", en + ", kg") + "</span>", inp(id, ph));
  const LABS = [["dtB", "Вага тіла", "Body weight"], ["dtQ", "Присідання", "Squat"], ["dtP", "Жим лежачи", "Bench press"], ["dtL", "Станова тяга", "Deadlift"], ["dtT", "Сума", "Total"]];
  const refreshU = (el) => LABS.forEach(([id]) => { const e = el(id + "L"); if (e) { const uk = e.dataset.uk, en = e.dataset.en; e.textContent = imp(el) ? L(uk + ", lb", en + ", lb") : L(uk + ", кг", en + ", kg"); } });
  const kgOf = (el, v) => (imp(el) ? v * D.KG_LB : v);
  const wv = (el, kg) => (imp(el) ? fix(kg / D.KG_LB, 1) + " lb" : fix(kg, 1) + " " + L("кг", "kg"));
  const wv0 = (el, kg) => (imp(el) ? fnum(kg / D.KG_LB, 0) + " lb" : fnum(kg, 0) + " " + L("кг", "kg"));
  const ACCEPT = { m: [30, 230], f: [30, 170] };
  const readNum = (el, id, name, lo, hi, optional) => { const s = el(id).value.trim(); if (!s) return optional ? null : null; const v = num(s); if (v === null) return { err: L(name + " — число.", name + " is a number.") }; const kg = kgOf(el, v); if (kg < lo || kg > hi) return { err: L(name + " — від " + fnum(lo / (imp(el) ? D.KG_LB : 1), 0) + " до " + fnum(hi / (imp(el) ? D.KG_LB : 1), 0) + (imp(el) ? " lb." : " кг."), name + " — from " + fnum(lo / (imp(el) ? D.KG_LB : 1), 0) + " to " + fnum(hi / (imp(el) ? D.KG_LB : 1), 0) + (imp(el) ? " lb." : " kg.")) }; return { v: kg }; };
  const readBw = (el) => { const sex = sx(el), r = readNum(el, "dtB", L("Вага тіла", "Body weight"), ACCEPT[sex][0], ACCEPT[sex][1]); return r; };
  const bwWarn = (el, bw) => (D.inRange(bw, sx(el)) ? [] : [L("Вага тіла поза діапазоном, для якого чинна формула DOTS (" + D.VALID[sx(el)][0] + "–" + D.VALID[sx(el)][1] + " кг для " + (sx(el) === "m" ? "чоловіків" : "жінок") + "): результат ненадійний і не годиться для офіційних порівнянь.", "The body weight is outside the range for which the DOTS formula is valid (" + D.VALID[sx(el)][0] + "–" + D.VALID[sx(el)][1] + " kg for " + (sx(el) === "m" ? "men" : "women") + "): the result is unreliable and not suitable for official comparisons.")]);
  const bandName = (b) => L(b.uk, b.en);
  const bandRange = (b) => (b.hi === null ? "≥ " + b.lo0 : b.lo0 === 0 ? "< " + b.hi : b.lo0 + "–" + (b.hi - 1));
  const bandTable = (sex, b) => UI.list([L("Рівень (неофіційно)", "Level (unofficial)"), L("DOTS", "DOTS")], D.BANDS.map((x, i) => { const nx = D.BANDS[i + 1], hi = nx ? nx.lo[sex] : null, lo = x.lo[sex]; return { main: x.id === b.id, cells: [{ t: bandName(x), cls: "is-first" }, { t: bandRange({ lo0: lo, hi }), cls: "chip" }] }; }), { w: "minmax(0, 1.4fr) 140px" });

  // ----- мій DOTS -----
  const MAP1 = [["sx", "dtS"], ["bw", "dtB"], ["un", "dtU"], ["im", "dtI"], ["sq", "dtQ"], ["bp", "dtP"], ["dl", "dtL"], ["tt", "dtT"]];
  const refresh1 = (el) => { const lifts = el("dtI").value === "lifts"; ["dtQ", "dtP", "dtL"].forEach((id) => show(el, id, lifts)); show(el, "dtT", !lifts); refreshU(el); };
  const mine = {
    key: "mine", type: "custom", req: ({ el }) => ["dtB"].concat(el("dtI").value === "lifts" ? ["dtQ", "dtP", "dtL"] : ["dtT"]), nameUk: "Мій DOTS", nameEn: "My DOTS",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + sexF() + kgF("dtB", "Вага тіла", "Body weight", L("напр.: 80", "e.g.: 80")) + unitF() + fld("dtI", L("Що вводите", "What to enter"), sel("dtI", [["lifts", L("Три вправи (присід, жим, тяга)", "Three lifts (squat, bench, deadlift)")], ["total", L("Одразу суму", "The total")]], "lifts")) + kgF("dtQ", "Присідання", "Squat", L("напр.: 200", "e.g.: 200")) + kgF("dtP", "Жим лежачи", "Bench press", L("напр.: 140", "e.g.: 140")) + kgF("dtL", "Станова тяга", "Deadlift", L("напр.: 245", "e.g.: 245")) + kgF("dtT", "Сума", "Total", L("напр.: 585", "e.g.: 585")) + '</div><div class="ph__hint ph__mt12">' + L("DOTS рахується від суми трьох вправ пауерліфтингу й ваги тіла. Поруч показано IPF GL Points для класичного (без екіпіровки) пауерліфтингу, бо саме ними користується IPF.", "DOTS is calculated from the total of the three powerlifting lifts and body weight. IPF GL Points for classic (raw) powerlifting are shown alongside because they are what the IPF uses.") + "</div>";
      ["dtB", "dtQ", "dtP", "dtL", "dtT"].forEach((id) => el(id).addEventListener("input", maybeCalc)); el("dtS").addEventListener("change", maybeCalc); el("dtU").addEventListener("change", () => { refreshU(el); maybeCalc(); }); el("dtI").addEventListener("change", () => { refresh1(el); maybeCalc(); }); refresh1(el);
    },
    calc(h) {
      const { el } = h, sex = sx(el), lifts = el("dtI").value === "lifts", bw = readBw(el);
      if (bw && bw.err) return { ok: false, msg: bw.err };
      let total = null, parts = null;
      if (lifts) {
        const ids = [["dtQ", L("Присідання", "Squat")], ["dtP", L("Жим лежачи", "Bench press")], ["dtL", L("Станова тяга", "Deadlift")]], vs = ids.map(([id, n]) => readNum(el, id, n, 20, 600, true));
        for (const v of vs) if (v && v.err) return { ok: false, msg: v.err };
        if (vs.every((v) => !v)) return { ok: false, incomplete: true };
        parts = ids.map(([id, n], i) => ({ n, v: vs[i] ? vs[i].v : null })); total = parts.reduce((a, p) => a + (p.v || 0), 0);
      } else { const t = readNum(el, "dtT", L("Сума", "Total"), 30, 1800); if (t && t.err) return { ok: false, msg: t.err }; if (!t) return { ok: false, incomplete: true }; total = t.v; }
      if (!bw) return { ok: false, incomplete: true };
      const dn = D.denom(bw.v, sex); if (!(dn > 0)) return { ok: false, msg: L("Вага тіла поза межами формули.", "The body weight is outside the range of the formula.") };
      const cf = D.coef(bw.v, sex), dots = D.dots(total, bw.v, sex), gl = D.gl(total, bw.v, sex), b = D.band(dots, sex), warns = bwWarn(el, bw.v);
      if (lifts && parts.some((p) => p.v === null)) warns.push(L("Введено не всі три вправи: рахується сума введених. Для повного DOTS потрібні присід, жим і тяга.", "Not all three lifts were entered: the total of those entered is used. A full DOTS needs squat, bench and deadlift."));
      const tiles = [{ k: L("Сума", "Total"), v: wv(el, total) }, { k: L("Коефіцієнт DOTS", "DOTS coefficient"), v: fix(cf, 4) }, { k: L("IPF GL Points (класика)", "IPF GL Points (classic)"), v: fix(gl, 2) }, { k: L("Рівень (неофіційно)", "Level (unofficial)"), v: bandName(b) }];
      let table = "";
      if (lifts && parts.filter((p) => p.v !== null).length > 1) table = '<div class="ph__sub">' + L("Внесок вправ", "Lift contributions") + "</div>" + UI.list([L("Вправа", "Lift"), L("Вага", "Weight"), L("Частка суми", "Share of total"), L("Довідково: DOTS вправи", "For reference: lift DOTS")], parts.filter((p) => p.v !== null).map((p) => ({ cells: [{ t: p.n, cls: "is-first" }, { t: wv(el, p.v), cls: "chip" }, fix((p.v / total) * 100, 1) + " %", fix(p.v * cf, 1)] })), { w: "minmax(0, 1.2fr) 120px 110px 140px" }) + hint(L("DOTS вправи (вага × коефіцієнт) — довідкова цифра для порівняння вправ між собою; офіційний DOTS рахується від суми трьох.", "A lift's DOTS (weight × coefficient) is a reference figure for comparing the lifts; the official DOTS is calculated from the total of the three."));
      const steps = [{ t: L("Коефіцієнт за вагою тіла", "Coefficient from body weight"), l: [L("знаменник = a·w⁴ + b·w³ + c·w² + d·w + e = ", "denominator = a·w⁴ + b·w³ + c·w² + d·w + e = ") + fix(dn, 3), L("коефіцієнт = 500 / ", "coefficient = 500 / ") + fix(dn, 3) + " = " + fix(cf, 5)], note: L("w — вага тіла в кг: ", "w is body weight in kg: ") + fix(bw.v, 1) } , { t: "DOTS", l: [fix(total, 1) + L(" кг × ", " kg × ") + fix(cf, 5) + " = " + fix(dots, 2)] }, { t: "IPF GL Points", l: ["100 / (A − B·e^(−C·w)) × " + L("сума", "total") + " = " + fix(gl, 2)], note: L("Класичний (raw) пауерліфтинг, коефіцієнти IPF чинні станом на 2020–2023 роки, актуальні значення перевірте на сайті IPF.", "Classic (raw) powerlifting, IPF coefficients valid for 2020–2023; check the IPF site for current values.") }];
      return { ok: true, expr: (sex === "m" ? L("Чоловік", "Man") : L("Жінка", "Woman")) + " · " + wv(el, bw.v) + " · " + wv(el, total), head: ["DOTS", fix(dots, 2)], subRaw: true, headSub: L("Рівень: ", "Level: ") + bandName(b) + " (" + L("неофіційно", "unofficial") + ") · IPF GL " + fix(gl, 2), tiles, extraHtml: table + '<div class="ph__sub">' + L("Орієнтовні рівні DOTS", "Approximate DOTS levels") + "</div>" + bandTable(sex, b) + hint(L("Офіційних порогів немає: різні джерела дають рівні, що розходяться приблизно до 50 балів.", "There are no official thresholds: different sources give levels that differ by up to about 50 points.")) + warnHtml(warns), note: NOTE, steps, resText: "DOTS " + fix(dots, 2) + " (" + (sex === "m" ? L("чоловік", "man") : L("жінка", "woman")) + ", " + wv(el, bw.v) + ", " + L("сума ", "total ") + wv(el, total) + "); IPF GL " + fix(gl, 2) };
    },
    reset(h) { const { el } = h; ["dtB", "dtQ", "dtP", "dtL", "dtT"].forEach((id) => setP(el, id, "")); setP(el, "dtS", "m"); setP(el, "dtU", "metric"); setP(el, "dtI", "lifts"); refresh1(el); },
    fill(h) { const { el } = h; setP(el, "dtS", "m"); setP(el, "dtU", "metric"); setP(el, "dtI", "lifts"); setP(el, "dtB", "80"); setP(el, "dtQ", "200"); setP(el, "dtP", "140"); setP(el, "dtL", "245"); setP(el, "dtT", ""); refresh1(el); },
    share(p, h) { const { el } = h; if (!el("dtB").value.trim()) return; shareMap(MAP1, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP1, qs, el); refresh1(el); }
  };

  // ----- потрібна сума -----
  const MAP2 = [["sx", "dtS"], ["bw", "dtB"], ["un", "dtU"], ["tg", "dtG"], ["tt", "dtT"]];
  const target = {
    key: "need", type: "custom", req: ({ el }) => ["dtB", "dtG"], nameUk: "Потрібна сума", nameEn: "Required total",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + sexF() + kgF("dtB", "Вага тіла", "Body weight", L("напр.: 80", "e.g.: 80")) + unitF() + fld("dtG", L("Цільовий DOTS", "Target DOTS"), inp("dtG", L("напр.: 400", "e.g.: 400"), 5)) + kgF("dtT", "Ваша сума", "Your total", L("необов'язково", "optional")) + '</div><div class="ph__hint ph__mt12">' + L("Введіть вагу тіла й бажаний DOTS — калькулятор покаже суму трьох вправ, яка його дає. Якщо додати поточну суму, побачите, скільки не вистачає.", "Enter your body weight and a desired DOTS and the calculator shows the total of the three lifts that gives it. Add your current total to see how far you are.") + "</div>";
      ["dtB", "dtG", "dtT"].forEach((id) => el(id).addEventListener("input", maybeCalc)); el("dtS").addEventListener("change", maybeCalc); el("dtU").addEventListener("change", () => { refreshU(el); maybeCalc(); }); refreshU(el);
    },
    calc(h) {
      const { el } = h, sex = sx(el), bw = readBw(el), gs = el("dtG").value.trim();
      if (bw && bw.err) return { ok: false, msg: bw.err };
      if (!bw || !gs) return { ok: false, incomplete: true };
      const g = num(gs); if (g === null || g < 50 || g > 800) return { ok: false, msg: L("Цільовий DOTS — від 50 до 800.", "Target DOTS — from 50 to 800.") };
      const cur = readNum(el, "dtT", L("Ваша сума", "Your total"), 30, 1800, true); if (cur && cur.err) return { ok: false, msg: cur.err };
      const dn = D.denom(bw.v, sex); if (!(dn > 0)) return { ok: false, msg: L("Вага тіла поза межами формули.", "The body weight is outside the range of the formula.") };
      const cf = D.coef(bw.v, sex), t = D.need(g, bw.v, sex), warns = bwWarn(el, bw.v), b = D.band(g, sex);
      const tiles = [{ k: L("Потрібна сума", "Required total"), v: wv(el, t) }, { k: L("Коефіцієнт DOTS", "DOTS coefficient"), v: fix(cf, 4) }, { k: L("Те саме в IPF GL", "The same in IPF GL"), v: fix(D.gl(t, bw.v, sex), 2) }, { k: L("Рівень цілі (неофіційно)", "Goal level (unofficial)"), v: bandName(b) }];
      let sub = L("Для DOTS ", "For DOTS ") + fix(g, 0) + L(" при вазі ", " at ") + wv0(el, bw.v);
      if (cur) { const my = D.dots(cur.v, bw.v, sex), gap = t - cur.v; tiles.push({ k: L("Ваш DOTS", "Your DOTS"), v: fix(my, 2) }, { k: gap > 0 ? L("Не вистачає", "Short by") : L("Запас над ціллю", "Above the goal"), v: wv(el, Math.abs(gap)) }); sub += " · " + (gap > 0 ? L("не вистачає ", "short by ") : L("запас ", "above by ")) + wv(el, Math.abs(gap)); }
      const steps = [{ t: L("Коефіцієнт", "Coefficient"), l: [L("500 / знаменник = ", "500 / denominator = ") + fix(cf, 5)] }, { t: L("Потрібна сума = DOTS / коефіцієнт", "Required total = DOTS / coefficient"), l: [fix(g, 1) + " / " + fix(cf, 5) + " = " + fix(t, 1) + " " + L("кг", "kg")] }];
      return { ok: true, expr: (sex === "m" ? L("Чоловік", "Man") : L("Жінка", "Woman")) + " · " + wv0(el, bw.v) + " · DOTS " + fix(g, 0), head: [L("потрібна сума", "required total"), wv(el, t)], subRaw: true, headSub: sub, tiles, extraHtml: warnHtml(warns), note: NOTE, steps, resText: L("Для DOTS ", "For DOTS ") + fix(g, 0) + " (" + wv0(el, bw.v) + "): " + L("сума ", "total ") + wv(el, t) };
    },
    reset(h) { const { el } = h; ["dtB", "dtG", "dtT"].forEach((id) => setP(el, id, "")); setP(el, "dtS", "m"); setP(el, "dtU", "metric"); refreshU(el); },
    fill(h) { const { el } = h; setP(el, "dtS", "m"); setP(el, "dtU", "metric"); setP(el, "dtB", "80"); setP(el, "dtG", "400"); setP(el, "dtT", ""); refreshU(el); },
    share(p, h) { const { el } = h; if (!el("dtB").value.trim() || !el("dtG").value.trim()) return; shareMap(MAP2, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP2, qs, el); refreshU(el); }
  };

  // ----- таблиця за вагою -----
  const MAP3 = [["sx", "dtS"], ["un", "dtU"], ["g1", "dtG1"], ["g2", "dtG2"], ["g3", "dtG3"], ["bw", "dtB"]];
  const ROWS = { m: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140], f: [40, 50, 60, 70, 80, 90, 100, 110] };
  const DEF = ["300", "400", "500"];
  const table = {
    key: "table", type: "custom", req: ({ el }) => [], nameUk: "Таблиця за вагою", nameEn: "Table by weight",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + sexF() + unitF() + fld("dtG1", L("DOTS, ціль 1", "DOTS, goal 1"), inp("dtG1", "300", 5)) + fld("dtG2", L("DOTS, ціль 2", "DOTS, goal 2"), inp("dtG2", "400", 5)) + fld("dtG3", L("DOTS, ціль 3", "DOTS, goal 3"), inp("dtG3", "500", 5)) + kgF("dtB", "Ваша вага тіла", "Your body weight", L("необов'язково", "optional")) + '</div><div class="ph__hint ph__mt12">' + L("Таблиця показує, яку суму трьох вправ дають вибрані значення DOTS для різної ваги тіла. Цілі можна змінити; за бажанням додайте свою вагу, щоб побачити її окремим рядком.", "The table shows the total of the three lifts that the chosen DOTS values give at different body weights. You can change the goals; optionally add your body weight to see it as a separate row.") + "</div>";
      ["dtG1", "dtG2", "dtG3", "dtB"].forEach((id) => el(id).addEventListener("input", maybeCalc)); el("dtS").addEventListener("change", maybeCalc); el("dtU").addEventListener("change", () => { refreshU(el); maybeCalc(); });
      DEF.forEach((v, i) => setP(el, "dtG" + (i + 1), v)); refreshU(el);
    },
    calc(h) {
      const { el } = h, sex = sx(el), gs = [1, 2, 3].map((i) => num(el("dtG" + i).value));
      if (gs.some((g) => g === null || g < 50 || g > 800)) return { ok: false, msg: L("Цілі DOTS — числа від 50 до 800.", "DOTS goals are numbers from 50 to 800.") };
      const bw = readBw(el); if (bw && bw.err) return { ok: false, msg: bw.err };
      const warns = bw ? bwWarn(el, bw.v) : [], rows = ROWS[sex].slice();
      if (bw && !rows.includes(bw.v)) rows.push(bw.v); rows.sort((a, b) => a - b);
      const lst = UI.list([L("Вага тіла", "Body weight")].concat(gs.map((g) => "DOTS " + fix(g, 0))), rows.map((w) => ({ main: bw !== null && bw !== undefined && w === bw.v, cells: [{ t: wv0(el, w), cls: "is-first" }].concat(gs.map((g) => D.need(g, w, sex)).map((t, i) => ({ t: wv(el, t), cls: i === 1 ? "chip" : "" }))) })), { w: "minmax(0, 1fr) 120px 120px 120px" });
      const w0 = bw ? bw.v : (sex === "m" ? 80 : 60), totals = gs.map((g) => D.need(g, w0, sex));
      const tiles = gs.map((g, i) => ({ k: L("Сума для DOTS ", "Total for DOTS ") + fix(g, 0), v: wv(el, totals[i]) }));
      const steps = [{ t: L("Потрібна сума = DOTS / коефіцієнт", "Required total = DOTS / coefficient"), l: [L("при вазі ", "at ") + wv0(el, w0) + L(": коефіцієнт ", ": coefficient ") + fix(D.coef(w0, sex), 5)].concat(gs.map((g, i) => fix(g, 0) + " / " + fix(D.coef(w0, sex), 5) + " = " + fix(totals[i], 1) + " " + L("кг", "kg"))) }];
      return { ok: true, expr: (sex === "m" ? L("Чоловіки", "Men") : L("Жінки", "Women")) + " · DOTS " + gs.map((g) => fix(g, 0)).join(" / "), head: [L("сума для DOTS ", "total for DOTS ") + fix(gs[1], 0), wv(el, totals[1])], subRaw: true, headSub: L("При вазі тіла ", "At a body weight of ") + wv0(el, w0), tiles, extraHtml: '<div class="ph__sub">' + L("Потрібна сума за вагою тіла", "Required total by body weight") + "</div>" + lst + warnHtml(warns), note: NOTE, steps, resText: L("DOTS ", "DOTS ") + gs.map((g, i) => fix(g, 0) + " = " + wv(el, totals[i])).join(", ") + L(" при вазі ", " at ") + wv0(el, w0) };
    },
    reset(h) { const { el } = h; setP(el, "dtB", ""); setP(el, "dtS", "m"); setP(el, "dtU", "metric"); DEF.forEach((v, i) => setP(el, "dtG" + (i + 1), v)); refreshU(el); },
    fill(h) { const { el } = h; setP(el, "dtS", "m"); setP(el, "dtU", "metric"); DEF.forEach((v, i) => setP(el, "dtG" + (i + 1), v)); setP(el, "dtB", "85"); refreshU(el); },
    share(p, h) { const { el } = h; shareMap(MAP3, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP3, qs, el); refreshU(el); }
  };
  return { modes: [mine, target, table], exactNote: false };
});
