/* pn-calc.js — розмір форми для випічки: заміна форми (площа й об'єм), підбір рівнозначної форми, таблиця стандартних форм; залежить від km-data.js і pn-data.js */
PhysCalc.start(({ L }) => {
  const K = window.Km, P = window.Pn, UI = window.PhysUI;
  const IS_EN = L(false, true), DEC = IS_EN ? "." : ",", BASE = IS_EN ? "/en" : "", CUP = K.unit(L("cup250", "cupus")).f, DEF_U = L("cm", "in");
  const NOTE = L("Коефіцієнт за площею це відношення площі нової форми до оригінальної: він зберігає однакову висоту тіста. Коефіцієнт за об'ємом враховує й глибину форм, він потрібен, коли форми заповнюють на однакову частку глибини. Час випікання не множиться на коефіцієнт: у глибшій і меншій формі тісто товще й пектиметься довше, у більшій і дрібнішій коротше, тому перевіряйте готовність шпажкою. Наповнювати форму радять приблизно наполовину–на ⅔ (Food Network) і не більше ніж на ¾ (відповідь на сайті King Arthur): різні рецепти піднімаються по-різному. Розміри стандартних форм номінальні, реальні форми можуть відрізнятися на сантиметр-два.", "The area factor is the area of the new pan divided by the original and keeps the batter at the same depth. The volume factor also takes the depth of the pans into account; it is needed when the pans are filled to the same fraction of their depth. Baking time does not multiply by the factor: in a deeper, smaller pan the batter is thicker and takes longer, in a larger, shallower one it takes less, so check with a skewer. A pan is usually filled about halfway to two-thirds (Food Network) and no more than three-quarters (a reply on the King Arthur site): recipes rise differently. The sizes of the standard pans are nominal, real pans can differ by a centimeter or two.");
  const SHAPES = [["round", L("Кругла", "Round")], ["square", L("Квадратна", "Square")], ["rect", L("Прямокутна чи буханка", "Rectangular or loaf")], ["ring", L("Кільце (бундт)", "Ring (Bundt)")]];
  const LAB = { d: L("Діаметр (для кільця зовнішній)", "Diameter (outer for a ring)"), s: L("Сторона", "Side"), l: L("Довжина", "Length"), w: L("Ширина", "Width"), r: L("Діаметр отвору", "Hole diameter"), h: L("Глибина (необов'язково)", "Depth (optional)") };
  const VIS = { round: ["d"], square: ["s"], rect: ["l", "w"], ring: ["d", "r"] };
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const inp = (id) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="6" aria-label="' + id + '">';
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const bind = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); if (!e) return; e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); });
  const sub = (t) => '<div class="ph__sub">' + t + "</div>";
  const box = (esc, t, strong) => '<div class="ph__hintbox ph__mt12">' + (strong ? "<b>" + esc(strong) + "</b> " : "") + esc(t) + "</div>";
  const num1 = (x) => String(Math.round(x * 10) / 10).replace(".", DEC);
  const num2 = (x) => String(Math.round(x * 100) / 100).replace(".", DEC);
  const grp = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const cm2 = L("см²", "cm²");
  const areaTxt = (a) => grp(a) + " " + cm2 + " (" + num1(a / (P.IN * P.IN)) + " in²)";
  const volTxt = (ml) => grp(ml) + " " + L("мл", "ml") + " (" + num2(ml / CUP) + " " + L("склянки", "cups") + ")";
  const lenTxt = (x, u) => num1(x) + " " + (u === "in" ? "″" : L("см", "cm"));
  const U = () => [["cm", L("Сантиметри", "Centimeters")], ["in", L("Дюйми", "Inches")]];
  // поля форми з префіксом X
  const shapeFields = (X, title, withDepth) => sub(title) + '<div class="ph__vars">' + fld("pn" + X + "S", L("Форма", "Shape"), sel("pn" + X + "S", SHAPES, "round"), true) + ["d", "s", "l", "w", "r"].concat(withDepth ? ["h"] : []).map((k) => fld("pn" + X + k, LAB[k], inp("pn" + X + k))).join("") + "</div>";
  const showFields = (el, X) => { const sh = el("pn" + X + "S").value; ["d", "s", "l", "w", "r"].forEach((k) => { const w = el("pn" + X + k + "W"); if (w) w.style.display = VIS[sh].includes(k) ? "" : "none"; }); };
  const wire = (el, h, X) => { showFields(el, X); el("pn" + X + "S").addEventListener("change", () => { showFields(el, X); h.maybeCalc(); }); };
  const allIds = (X, withDepth) => ["pn" + X + "S", "pn" + X + "d", "pn" + X + "s", "pn" + X + "l", "pn" + X + "w", "pn" + X + "r"].concat(withDepth ? ["pn" + X + "h"] : []);
  // розбір форми: {shape, v}, null — не всі поля, {err} — помилка
  function readShape(el, X, u) {
    const sh = el("pn" + X + "S").value, v = {}, lim = u === "in" ? 60 : 150;
    for (const k of VIS[sh]) {
      const raw = el("pn" + X + k).value.trim(); if (!raw) return null;
      const x = K.parseAmount(raw); if (x === null || x > lim) return { err: L("Розміри: додатні числа до " + lim + (u === "in" ? " дюймів" : " см") + ".", "Dimensions: positive numbers up to " + lim + (u === "in" ? " inches" : " cm") + ".") };
      v[k === "r" ? "h" : k] = x;
    }
    if (sh === "ring" && !(v.h < v.d)) return { err: L("Діаметр отвору має бути меншим за зовнішній діаметр.", "The hole diameter must be smaller than the outer diameter.") };
    return { shape: sh, v };
  }
  const readDepth = (el, X, u) => { const raw = el("pn" + X + "h").value.trim(); if (!raw) return { none: true }; const x = K.parseAmount(raw); if (x === null || x > (u === "in" ? 20 : 50)) return { err: L("Глибина: додатне число до " + (u === "in" ? "20 дюймів" : "50 см") + ".", "Depth: a positive number up to " + (u === "in" ? "20 inches" : "50 cm") + ".") }; return { x }; };
  const encShape = (s) => s.shape + ":" + VIS[s.shape].map((k) => s.v[k === "r" ? "h" : k]).join(",");
  function decShape(el, X, str) {
    const m = /^(round|square|rect|ring):([0-9.,]+)$/.exec(str || ""); if (!m) return; const parts = m[2].split(","), keys = VIS[m[1]];
    if (parts.length !== keys.length) return; el("pn" + X + "S").value = m[1]; showFields(el, X); keys.forEach((k, i) => { el("pn" + X + k).value = parts[i].slice(0, 6); });
  }
  const rowsFor = (el, esc) => null;

  // ====================== заміна форми ======================
  const swap = {
    key: "swap", type: "custom", req: () => [], nameUk: "Заміна форми", nameEn: "Swap pans",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("pnU", L("Одиниці", "Units"), sel("pnU", U(), DEF_U), true) + "</div>" + shapeFields("O", L("Форма з рецепта", "The pan in the recipe"), true) + shapeFields("N", L("Ваша форма", "Your pan"), true) + hint(L("Глибина необов'язкова: якщо вказати її для обох форм, буде й коефіцієнт за об'ємом. Розміри міряйте всередині форми.", "Depth is optional: if you give it for both pans you also get the volume factor. Measure the inside of the pan."));
      wire(el, h, "O"); wire(el, h, "N"); bind(el, h.maybeCalc, ["pnU"].concat(allIds("O", true), allIds("N", true)));
      el("pnNS").value = "square"; showFields(el, "N");
    },
    calc(h) {
      const { el, esc } = h, u = el("pnU").value, o = readShape(el, "O", u), n = readShape(el, "N", u);
      if (o === null || n === null) return { ok: false, incomplete: true };
      if (o.err || n.err) return { ok: false, msg: o.err || n.err };
      const ho = readDepth(el, "O", u), hn = readDepth(el, "N", u); if (ho.err || hn.err) return { ok: false, msg: ho.err || hn.err };
      const ao = P.areaCm2(o.shape, o.v, u), an = P.areaCm2(n.shape, n.v, u), fa = an / ao, vol = !ho.none && !hn.none, vo = vol ? P.volMl(ao, ho.x, u) : 0, vn = vol ? P.volMl(an, hn.x, u) : 0, fv = vol ? vn / vo : 0;
      const verdict = fa > 1.02 ? L("Нова форма більша: беріть більше тіста.", "The new pan is larger: use more batter.") : fa < 0.98 ? L("Нова форма менша: беріть менше тіста.", "The new pan is smaller: use less batter.") : L("Площі форм майже однакові: кількість та сама.", "The pans are about the same area: the same amount.");
      const rows = [{ cells: [{ t: L("Площа", "Area"), cls: "is-first" }, areaTxt(ao), areaTxt(an)] }];
      if (vol) { rows.push({ cells: [{ t: L("Об'єм", "Volume"), cls: "is-first" }, volTxt(vo), volTxt(vn)] }); const ro = P.fillRange(vo), rn = P.fillRange(vn); rows.push({ cells: [{ t: L("Тісто при ½–⅔", "Batter at ½–⅔"), cls: "is-first" }, grp(ro[0]) + "–" + grp(ro[1]) + " " + L("мл", "ml"), grp(rn[0]) + "–" + grp(rn[1]) + " " + L("мл", "ml")] }); rows.push({ cells: [{ t: L("Не більше (¾)", "At most (¾)"), cls: "is-first" }, grp(ro[2]) + " " + L("мл", "ml"), grp(rn[2]) + " " + L("мл", "ml")] }); }
      const table = UI.list([L("Показник", "Measure"), L("З рецепта", "Recipe pan"), L("Ваша форма", "Your pan")], rows, { w: "minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1.4fr)" });
      const diff = vol && Math.abs(fv / fa - 1) > 0.05 ? box(esc, L("Глибини форм різні, тому коефіцієнт за об'ємом (" + num2(fv) + ") відрізняється від коефіцієнта за площею (" + num2(fa) + "). Для тієї самої висоти тіста беріть коефіцієнт за площею; за об'ємом лише якщо форми заповнюєте на однакову частку глибини.", "The pans differ in depth, so the volume factor (" + num2(fv) + ") differs from the area factor (" + num2(fa) + "). For the same batter depth use the area factor; use the volume one only if you fill both pans to the same fraction of their depth."), L("Різна глибина.", "Different depth.")) : "";
      const link = hint(L("Перерахувати інгредієнти: ", "Scale the ingredients: ") + '<a href="' + BASE + "/kitchen/recipe-scaler?m=fact&rf=" + encodeURIComponent(String(Math.round(fa * 1000) / 1000)) + '">' + L("калькулятор порцій із коефіцієнтом ", "the recipe scaler with the factor ") + num2(fa) + "</a>.");
      const tiles = [{ k: L("Площа з рецепта", "Recipe pan area"), v: areaTxt(ao) }, { k: L("Площа вашої", "Your pan area"), v: areaTxt(an) }].concat(vol ? [{ k: L("Коефіцієнт за об'ємом", "Volume factor"), v: "× " + num2(fv) }] : []);
      const fm = (s) => ({ round: "π × (" + L("діаметр", "diameter") + " / 2)²", square: L("сторона", "side") + "²", rect: L("довжина", "length") + " × " + L("ширина", "width"), ring: "π × ((D / 2)² − (d / 2)²)" }[s]);
      const steps = [{ t: L("Площі форм", "The areas"), l: [L("З рецепта: ", "Recipe pan: ") + fm(o.shape) + " = " + areaTxt(ao), L("Ваша: ", "Yours: ") + fm(n.shape) + " = " + areaTxt(an)] }, { t: L("Коефіцієнт за площею", "The area factor"), l: [grp(an) + " / " + grp(ao) + " = " + num2(fa)], note: verdict }].concat(vol ? [{ t: L("Коефіцієнт за об'ємом", "The volume factor"), l: [L("об'єм = площа × глибина: ", "volume = area × depth: ") + grp(vn) + " / " + grp(vo) + " = " + num2(fv)] }] : []);
      return { ok: true, expr: SHAPES.find((s) => s[0] === o.shape)[1] + " → " + SHAPES.find((s) => s[0] === n.shape)[1], head: [L("коефіцієнт за площею", "area factor"), "× " + num2(fa)], headSub: verdict, subRaw: true, tiles, extraHtml: table + diff + link, note: NOTE, steps, resText: L("Коефіцієнт за площею ", "Area factor ") + "× " + num2(fa) + (vol ? "; " + L("за об'ємом ", "volume ") + "× " + num2(fv) : "") + ". " + verdict };
    },
    reset(h) { const { el } = h; allIds("O", true).concat(allIds("N", true)).forEach((id) => { if (!/S$/.test(id)) el(id).value = ""; }); el("pnOS").value = "round"; el("pnNS").value = "square"; showFields(el, "O"); showFields(el, "N"); },
    fill(h) { const { el } = h; el("pnU").value = L("cm", "in"); el("pnOS").value = "round"; el("pnNS").value = "square"; showFields(el, "O"); showFields(el, "N"); allIds("O", true).concat(allIds("N", true)).forEach((id) => { if (!/S$/.test(id)) el(id).value = ""; }); el("pnOd").value = L("23", "9"); el("pnNs").value = L("20", "8"); },
    share(p, h) { const { el } = h, u = el("pnU").value, o = readShape(el, "O", u), n = readShape(el, "N", u); p.set("pu", u); if (o && !o.err) p.set("po", encShape(o)); if (n && !n.err) p.set("pn", encShape(n)); if (el("pnOh").value.trim()) p.set("pq", el("pnOh").value.trim().slice(0, 6)); if (el("pnNh").value.trim()) p.set("pr", el("pnNh").value.trim().slice(0, 6)); },
    apply(qs, h) { const { el } = h; if (["cm", "in"].includes(qs.get("pu"))) el("pnU").value = qs.get("pu"); decShape(el, "O", qs.get("po")); decShape(el, "N", qs.get("pn")); if (qs.has("pq")) el("pnOh").value = qs.get("pq").slice(0, 6); if (qs.has("pr")) el("pnNh").value = qs.get("pr").slice(0, 6); }
  };

  // ====================== підібрати форму ======================
  const find = {
    key: "find", type: "custom", req: () => [], nameUk: "Підібрати форму", nameEn: "Find a pan",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("pnU", L("Одиниці", "Units"), sel("pnU", U(), DEF_U), true) + "</div>" + shapeFields("F", L("Форма з рецепта", "The pan in the recipe"), false) + hint(L("Калькулятор покаже форми такої самої площі й три найближчі стандартні форми.", "The calculator shows pans of the same area and the three nearest standard pans."));
      wire(el, h, "F"); bind(el, h.maybeCalc, ["pnU"].concat(allIds("F", false)));
    },
    calc(h) {
      const { el } = h, u = el("pnU").value, o = readShape(el, "F", u);
      if (o === null) return { ok: false, incomplete: true }; if (o.err) return { ok: false, msg: o.err };
      const a = P.areaCm2(o.shape, o.v, u), conv = (cm) => (u === "in" ? cm / P.IN : cm), area = (cm2) => cm2 / (u === "in" ? P.IN * P.IN : 1), pct = (x) => num1((x / a) * 100) + "%";
      const rows = [];
      const add = (name, size, ar) => rows.push({ cells: [{ t: name, cls: "is-first" }, size, grp(ar) + " " + cm2, pct(ar)] });
      add(L("Кругла", "Round"), L("діаметр ", "diameter ") + lenTxt(conv(P.eqRoundD(a)), u), a);
      add(L("Квадратна", "Square"), lenTxt(conv(P.eqSquareS(a)), u) + " × " + lenTxt(conv(P.eqSquareS(a)), u), a);
      (u === "in" ? [6, 8, 9, 10, 12] : [15, 18, 20, 25, 30]).forEach((w) => add(L("Прямокутна", "Rectangular"), lenTxt(w, u) + " × " + lenTxt(area(a) / w, u), a));
      const near = P.nearest(a, 3);
      const nrows = near.map((s) => ({ cells: [{ t: s.name, cls: "is-first" }, grp(s.area) + " " + cm2 + " (" + num1(s.area / (P.IN * P.IN)) + " in²)", (s.area >= a ? "+" : "−") + num1(Math.abs(s.area / a - 1) * 100) + "%"] }));
      const t1 = UI.list([L("Форма", "Shape"), L("Розмір", "Size"), L("Площа", "Area"), L("Від оригіналу", "Of the original")], rows, { w: "minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 0.9fr)" });
      const t2 = UI.list([L("Стандартна форма", "Standard pan"), L("Площа", "Area"), L("Різниця", "Difference")], nrows, { w: "minmax(0, 1.6fr) minmax(0, 1.4fr) minmax(0, 0.8fr)" });
      return { ok: true, expr: SHAPES.find((s) => s[0] === o.shape)[1], head: [L("площа форми", "pan area"), areaTxt(a)], headSub: L("форми такої самої площі й найближчі стандартні", "pans of the same area and the nearest standard ones"), subRaw: true, tiles: [{ k: L("Площа", "Area"), v: areaTxt(a) }], extraHtml: sub(L("Рівнозначні за площею", "Same area")) + t1 + sub(L("Найближчі стандартні форми", "Nearest standard pans")) + t2 + hint(L("Розміри стандартних форм номінальні.", "The sizes of the standard pans are nominal.")), note: NOTE, steps: [{ t: L("Площа", "Area"), l: [areaTxt(a)] }, { t: L("Рівнозначні форми", "Equivalent pans"), l: [L("кругла: d = 2 × √(S / π); квадратна: a = √S; прямокутна: довжина = S / ширина", "round: d = 2 × √(S / π); square: a = √S; rectangular: length = S / width")] }], resText: areaTxt(a) + "; " + L("кругла діаметром ", "round with a diameter of ") + lenTxt(conv(P.eqRoundD(a)), u) + L("; квадратна ", "; square ") + lenTxt(conv(P.eqSquareS(a)), u) };
    },
    reset(h) { const { el } = h; allIds("F", false).forEach((id) => { if (!/S$/.test(id)) el(id).value = ""; }); el("pnFS").value = "round"; showFields(el, "F"); },
    fill(h) { const { el } = h; el("pnU").value = L("cm", "in"); allIds("F", false).forEach((id) => { if (!/S$/.test(id)) el(id).value = ""; }); el("pnFS").value = "round"; showFields(el, "F"); el("pnFd").value = L("23", "9"); },
    share(p, h) { const { el } = h, u = el("pnU").value, o = readShape(el, "F", u); p.set("pu", u); if (o && !o.err) p.set("pf", encShape(o)); },
    apply(qs, h) { const { el } = h; if (["cm", "in"].includes(qs.get("pu"))) el("pnU").value = qs.get("pu"); decShape(el, "F", qs.get("pf")); }
  };

  // ====================== стандартні форми ======================
  const stdTab = {
    key: "std", type: "custom", req: () => [], nameUk: "Стандартні форми", nameEn: "Standard pans",
    build(body, x, h) { const { el } = h; body.innerHTML = '<div class="ph__vars">' + fld("pnR", L("Еталонна форма", "Reference pan"), sel("pnR", P.STD.map((s) => [s.id, s.name]), L("r22", "r9")), true) + "</div>" + hint(L("Таблиця показує площу стандартних форм і те, у скільки разів вони більші чи менші за еталонну. Розміри номінальні.", "The table shows the area of the standard pans and how many times larger or smaller they are than the reference pan. The sizes are nominal.")); bind(el, h.maybeCalc, ["pnR"]); },
    calc(h) {
      const { el } = h, ref = P.std(el("pnR").value), rows = P.STD.slice().sort((a, b) => a.area - b.area).map((s) => ({ cells: [{ t: s.name, cls: "is-first" }, grp(s.area) + " " + cm2 + " (" + num1(s.area / (P.IN * P.IN)) + " in²)", "× " + num2(s.area / ref.area)] }));
      const list = UI.list([L("Форма", "Pan"), L("Площа", "Area"), L("До еталона", "To the reference")], rows, { w: "minmax(0, 1.6fr) minmax(0, 1.5fr) minmax(0, 0.8fr)" });
      return { ok: true, expr: ref.name, head: [L("еталон", "reference"), areaTxt(ref.area)], headSub: ref.name, subRaw: true, tiles: [{ k: L("Форм у таблиці", "Pans in the table"), v: String(rows.length) }], extraHtml: list, note: NOTE, steps: [{ t: L("Як рахується", "How it is worked out"), l: [L("Коефіцієнт = площа форми / площа еталона", "Factor = pan area / reference area")] }], resText: ref.name + ":\n" + rows.map((r) => r.cells.map((c) => (typeof c === "string" ? c : c.t)).join(" | ")).join("\n") };
    },
    reset(h) { h.el("pnR").value = L("r22", "r9"); }, fill(h) { h.el("pnR").value = "b9x13"; },
    share(p, h) { p.set("ps", h.el("pnR").value); }, apply(qs, h) { if (P.std(qs.get("ps"))) h.el("pnR").value = qs.get("ps"); }
  };
  return { modes: [swap, find, stdTab], exactNote: false };
});
