/* sd-calc.js — заміна інгредієнтів: заміни з перерахунком на вашу кількість, за обмеженням (веган, без яєць, без молочного), таблиця всіх замін; залежить від km-data.js і sd-data.js */
PhysCalc.start(({ L }) => {
  const K = window.Km, D = window.Sd, UI = window.PhysUI;
  const IS_EN = L(false, true), CUPS = ["cup250", "cup200", "cupus", "cupcust", "cupuk"], DEF_CUP = L("cup250", "cupus"), S = { cup: DEF_CUP };
  const NOTE = L("Заміни змінюють смак і текстуру: змінюйте один інгредієнт за раз і спершу пробуйте на малій порції. Пропорції взято з названих джерел для звичайної випічки й готування; де джерела розходяться, показано кілька варіантів. У джерелах США склянка 240 мл; у вкладці «Заміна» кількості перераховано на вашу склянку. Мітки «веган», «без молочного», «без яєць» стосуються самої заміни, а не готової страви; при алергії перевіряйте склад продуктів. Дані зібрано з відкритих джерел і викладено своїми словами; сайт не пов'язаний із цими організаціями.", "Substitutions change taste and texture: change one ingredient at a time and try a small batch first. The ratios come from the named sources for ordinary baking and cooking; where the sources disagree, several options are shown. In the US sources a cup is 240 ml; on the “Substitute” tab the amounts are rescaled to your cup. The labels “vegan”, “dairy-free” and “egg-free” describe the substitute itself, not the finished dish; with allergies check the ingredient labels. The data is collected from public sources and put in our own words; the site is not affiliated with these organizations.");
  const SHORT = { CSU: "CSU Extension", USU: "USU Extension", NCSU: "NC State Extension", KAF: "King Arthur", UWX: "UW Extension", BS: "Baking Sense", ATK: "America's Test Kitchen" };
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const fold = (key, title, inner) => '<details class="ph__details ph__fold" data-keep="' + key + '"><summary>' + title + '</summary><div class="ph__foldBody">' + inner + "</div></details>";
  const bind = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); if (!e) return; e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); });
  const ingSel = () => '<select class="ph__unit ph__unit--wide" id="sdI">' + D.CATS.map((c) => '<optgroup label="' + c.label + '">' + D.ING.filter((x) => x.cat === c.id).map((x) => '<option value="' + x.id + '">' + x.label + "</option>").join("") + "</optgroup>").join("") + "</select>";
  const settings = () => fold("sdSet", L("Налаштування", "Settings"), '<div class="ph__vars">' + fld("sdCup", L("Склянка в рецепті", "Cup in the recipe"), sel("sdCup", CUPS.map((c) => [c, K.unit(c).label]), S.cup), true) + "</div>" + hint(L("Склянка потрібна для перерахунку ваших кількостей і для показу заміни в склянках. У джерелах США склянка 240 мл.", "The cup is used to rescale your amounts and to show the substitute in cups. In the US sources a cup is 240 ml.")));
  const cupMl = (el) => K.unit(el("sdCup") ? el("sdCup").value : S.cup).f;
  const syncCup = (el) => { if (el("sdCup")) S.cup = el("sdCup").value; };
  const wireCup = (el, h) => { el("sdCup").value = S.cup; bind(el, h.maybeCalc, ["sdCup"]); el("sdCup").addEventListener("change", () => syncCup(el)); };
  const link = (c) => '<a href="' + D.SRC[c][1] + '" target="_blank" rel="noopener noreferrer" title="' + D.SRC[c][0].replace(/"/g, "&quot;") + '">' + SHORT[c] + "</a>";
  const srcHtml = (codes) => codes.map(link).join(", ");
  const tagLine = (sub) => { const t = D.tagsOf(sub); return t.length ? "<br><small>" + t.join(" · ") + "</small>" : ""; };
  const amtErr = L("Кількість: додатне число, можна дробом (1/2, 1 1/2).", "Amount: a positive number, a fraction is fine (1/2, 1 1/2).");
  const unitOpts = (ig) => { const b = ig.base[0]; return b === "pc" ? [["pc", L("шт.", "pc")]] : b === "wt" ? [["g", L("г", "g")], ["oz", L("унцій", "oz")]] : [["cup", L("склянка", "cup")], ["tbsp", L("ст. л.", "tbsp")], ["tsp", L("ч. л.", "tsp")], ["ml", L("мл", "ml")]]; };
  const defUnit = (ig) => (ig.base[0] === "pc" ? "pc" : ig.base[0] === "wt" ? "g" : ig.base[2]);
  const unitLabel = (u) => ({ pc: L("шт.", "pc"), g: L("г", "g"), oz: L("унцій", "oz"), cup: L("склянки", "cup"), tbsp: L("ст. л.", "tbsp"), tsp: L("ч. л.", "tsp"), ml: L("мл", "ml") }[u]);
  const fmtN = (x) => K.fmt(x, { id: "x" }, IS_EN ? "." : ",");

  // ====================== заміна ======================
  const sub = {
    key: "sub", type: "custom", req: () => ["sdA"], nameUk: "Заміна", nameEn: "Substitute",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("sdI", L("Що замінюємо", "What to replace"), ingSel(), true) + fld("sdA", L("Кількість", "Amount"), '<input class="ph__input" id="sdA" type="text" inputmode="decimal" autocomplete="off" maxlength="12" placeholder="1" aria-label="sdA">') + fld("sdU", L("Одиниця", "Unit"), sel("sdU", unitOpts(D.ing("egg")), "pc")) + "</div>" + settings() + hint(L("Кількість можна вводити дробом (1/2, 1 1/2). Для замін показано, скільки взяти на вашу кількість.", "You can enter the amount as a fraction (1/2, 1 1/2). For each substitute you see how much to take for your amount."));
      el("sdI").value = "egg"; wireCup(el, h); bind(el, h.maybeCalc, ["sdI", "sdA", "sdU"]);
      el("sdI").addEventListener("change", () => { const ig = D.ing(el("sdI").value); el("sdU").innerHTML = unitOpts(ig).map(([v, t]) => '<option value="' + v + '">' + h.esc(t) + "</option>").join(""); el("sdU").value = defUnit(ig); h.maybeCalc(); });
    },
    calc(h) {
      const { el, esc } = h; syncCup(el);
      const raw = el("sdA").value.trim(); if (!raw) return { ok: false, incomplete: true };
      const amt = K.parseAmount(raw); if (amt === null || amt > 100000) return { ok: false, msg: amtErr };
      const ig = D.ing(el("sdI").value), u = el("sdU").value, cm = cupMl(el), f = D.factor(ig, amt, u, cm), o = { cupMl: cm };
      const rows = ig.subs.map((s) => ({ cells: [{ h: "<b>" + esc(s.name) + "</b>" + tagLine(s), cls: "" }, { t: D.subText(s, f, o), cls: "strong" }, { t: s.note, cls: "muted" }, { h: srcHtml(s.src), cls: "muted" }] }));
      const table = UI.list([L("Заміна", "Substitute"), L("Скільки взяти", "How much to take"), L("Примітка", "Note"), L("Джерело", "Source")], rows, { w: "minmax(0, 1.1fr) minmax(0, 1.5fr) minmax(0, 1.4fr) minmax(0, 0.9fr)" });
      const nV = ig.subs.filter((s) => s.t === "v").length, nD = ig.subs.filter((s) => D.okFor(s, "d")).length;
      const lab = raw + " " + (u === "cup" ? D.cupWord(amt) : unitLabel(u));
      const steps = [{ t: L("Кількість відносно основи", "The amount against the base"), l: [ig.label + ": " + lab + " = " + fmtN(f) + " × " + D.baseText(ig, o)], note: L("Джерела дають заміни на одну «основу» інгредієнта (1 яйце, 1 склянку, 1 ст. л., 1 унцію).", "The sources give substitutions per one “base” of the ingredient (1 egg, 1 cup, 1 tbsp, 1 oz).") }, { t: L("Множимо частини", "Multiplying the parts"), l: [L("Кожну частину заміни множимо на ", "Each part of the substitute is multiplied by ") + fmtN(f) + L("; об'єми показано в ", "; volumes are shown in ") + L("склянках, ложках чи мілілітрах.", "cups, spoons or milliliters.")] }];
      return { ok: true, expr: ig.label.replace(/,\s*[^,]*$/, "") + " · " + lab, head: [L("варіантів заміни", "substitutes"), String(ig.subs.length)], headSub: ig.label, subRaw: true, tiles: [{ k: L("Варіантів", "Options"), v: String(ig.subs.length) }, { k: L("Веганських", "Vegan"), v: String(nV) }, { k: L("Без молочного", "Dairy-free"), v: String(nD) }], extraHtml: table, note: NOTE, steps, resText: ig.label + " (" + lab + "):\n" + ig.subs.map((s) => "• " + s.name + ": " + D.subText(s, f, o)).join("\n") };
    },
    reset(h) { const { el } = h; el("sdI").value = "egg"; el("sdA").value = ""; el("sdU").innerHTML = unitOpts(D.ing("egg")).map(([v, t]) => '<option value="' + v + '">' + t + "</option>").join(""); el("sdU").value = "pc"; },
    fill(h) { const { el } = h; el("sdI").value = "egg"; el("sdU").innerHTML = unitOpts(D.ing("egg")).map(([v, t]) => '<option value="' + v + '">' + t + "</option>").join(""); el("sdU").value = "pc"; el("sdA").value = "2"; },
    share(p, h) { const { el } = h; syncCup(el); p.set("si", el("sdI").value); if (el("sdA").value.trim()) p.set("sa", el("sdA").value.trim().slice(0, 12)); p.set("su", el("sdU").value); if (S.cup !== DEF_CUP) p.set("sc", S.cup); },
    apply(qs, h) { const { el } = h; const ig = D.ing(qs.get("si")); if (ig) { el("sdI").value = ig.id; el("sdU").innerHTML = unitOpts(ig).map(([v, t]) => '<option value="' + v + '">' + h.esc(t) + "</option>").join(""); el("sdU").value = defUnit(ig); if (unitOpts(ig).some((x) => x[0] === qs.get("su"))) el("sdU").value = qs.get("su"); } if (qs.has("sa")) el("sdA").value = qs.get("sa").slice(0, 12); if (CUPS.includes(qs.get("sc"))) { S.cup = qs.get("sc"); el("sdCup").value = S.cup; } }
  };

  // ====================== таблиці: за обмеженням, усі ======================
  function table(h, list, name, steps) {
    const { esc } = h, o = { cupMl: 240 }, rows = []; let nSub = 0;
    for (const { ig, subs } of list) for (const s of subs) { nSub++; rows.push({ cells: [{ t: ig.label, cls: "is-first" }, { h: "<b>" + esc(s.name) + "</b>" + tagLine(s) }, { t: D.subText(s, 1, o), cls: "strong" }, { h: srcHtml(s.src), cls: "muted" }] }); }
    if (!rows.length) return { ok: false, msg: L("Для цього вибору замін немає.", "There are no substitutes for this choice.") };
    const t = UI.list([L("Інгредієнт", "Ingredient"), L("Заміна", "Substitute"), L("Скільки взяти (на основу)", "How much to take (per base)"), L("Джерело", "Source")], rows, { w: "minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.6fr) minmax(0, 0.9fr)" });
    return { ok: true, expr: name, head: [L("замін у таблиці", "substitutes listed"), String(nSub)], headSub: list.length + " " + (IS_EN ? (list.length === 1 ? "ingredient" : "ingredients") : (list.length % 10 === 1 && list.length % 100 !== 11 ? "інгредієнт" : list.length % 10 >= 2 && list.length % 10 <= 4 && (list.length % 100 < 12 || list.length % 100 > 14) ? "інгредієнти" : "інгредієнтів")), subRaw: true, tiles: [{ k: L("Інгредієнтів", "Ingredients"), v: String(list.length) }, { k: L("Замін", "Substitutes"), v: String(nSub) }, { k: L("Склянка", "Cup"), v: L("240 мл (як у джерелах)", "240 ml (as in the sources)") }], extraHtml: t, note: NOTE, steps, resText: name + ":\n" + list.map(({ ig, subs }) => ig.label + "\n" + subs.map((s) => "  • " + s.name + ": " + D.subText(s, 1, o)).join("\n")).join("\n") };
  }
  const RS = [["v", L("Веган", "Vegan")], ["e", L("Без яєць", "Egg-free")], ["d", L("Без молочного", "Dairy-free")]];
  const diet = {
    key: "diet", type: "custom", req: () => [], nameUk: "За обмеженням", nameEn: "By diet",
    build(body, x, h) { const { el } = h; body.innerHTML = '<div class="ph__vars">' + fld("sdR", L("Обмеження", "Restriction"), sel("sdR", RS, "v"), true) + "</div>" + hint(L("Показано заміни, які самі по собі підходять: веганські, без яєць чи без молочного. Для алергії перевіряйте склад продуктів.", "The substitutes that suit the choice by themselves: vegan, egg-free or dairy-free. With allergies check the ingredient labels.")); bind(el, h.maybeCalc, ["sdR"]); },
    calc(h) { const r = h.el("sdR").value, list = D.ING.map((ig) => ({ ig, subs: ig.subs.filter((s) => D.okFor(s, r)) })).filter((x) => x.subs.length); return table(h, list, RS.find((x) => x[0] === r)[1], [{ t: L("Як відбираємо", "How they are picked"), l: [L("Береться кожна заміна, яка не містить заборонених продуктів: для «Веган» лише рослинні, для «Без яєць» і «Без молочного» також і інші без яєць чи молочного.", "Every substitute without the excluded products is taken: for “Vegan” only plant-based ones, for “Egg-free” and “Dairy-free” also others without eggs or dairy.")] }]); },
    reset(h) { h.el("sdR").value = "v"; }, fill(h) { h.el("sdR").value = "e"; },
    share(p, h) { p.set("sr", h.el("sdR").value); }, apply(qs, h) { if (["v", "e", "d"].includes(qs.get("sr"))) h.el("sdR").value = qs.get("sr"); }
  };
  const all = {
    key: "all", type: "custom", req: () => [], nameUk: "Усі заміни", nameEn: "All substitutes",
    build(body, x, h) { const { el } = h; body.innerHTML = '<div class="ph__vars">' + fld("sdK", L("Категорія", "Category"), sel("sdK", [["", L("Усі категорії", "All categories")]].concat(D.CATS.map((c) => [c.id, c.label])), ""), true) + "</div>" + hint(L("Кількості показано на одну «основу» інгредієнта (1 яйце, 1 склянка, 1 ст. л., 1 унція).", "Amounts are shown per one “base” of the ingredient (1 egg, 1 cup, 1 tbsp, 1 oz).")); bind(el, h.maybeCalc, ["sdK"]); },
    calc(h) { const k = h.el("sdK").value, list = D.ING.filter((ig) => !k || ig.cat === k).map((ig) => ({ ig, subs: ig.subs })); return table(h, list, k ? D.CATS.find((c) => c.id === k).label : L("Усі заміни", "All substitutes"), [{ t: L("Звідки дані", "Where the data comes from"), l: [L("Кожна заміна має посилання на джерело: USU Extension, Colorado State Extension, NC State Extension, King Arthur, UW Extension, Baking Sense, America's Test Kitchen.", "Every substitute links to its source: USU Extension, Colorado State Extension, NC State Extension, King Arthur, UW Extension, Baking Sense, America's Test Kitchen.")] }]); },
    reset(h) { h.el("sdK").value = ""; }, fill(h) { h.el("sdK").value = "dairy"; },
    share(p, h) { if (h.el("sdK").value) p.set("sk", h.el("sdK").value); }, apply(qs, h) { if (D.CATS.some((c) => c.id === qs.get("sk"))) h.el("sdK").value = qs.get("sk"); }
  };
  return { modes: [sub, diet, all], exactNote: false };
});
