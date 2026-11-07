/* km-calc.js — конвертер кулінарних мір: склянки, ложки, грами, мілілітри з урахуванням густини продукту; скільки грамів у склянці; таблиця всіх продуктів */
PhysCalc.start(({ L }) => {
  const K = window.Km, UI = window.PhysUI;
  const IS_EN = L(false, true), DEC = IS_EN ? "." : ",";
  const NOTE = L("Густина продуктів середня: для сипучих і густих (борошно, цукор, крупи, горіхи, масло) взято медіану ваги склянки з кількох незалежних опублікованих таблиць (склянка США 236,6 мл; для частини позицій є лише одна таблиця), для рідин (вода, молоко, олія, мед) фізичну густину. Реальна вага залежить від утрамбування, вологості й виробника: для борошна різниця між «насипати» і «зачерпнути» сягає 10–15%, тож результат наближений (приблизно ±5–10%). Ложки рівні, без гірки. Для точної випічки зважуйте продукти на кухонних вагах. Склянки бувають різні: оберіть ту, що в рецепті (250 мл, 200 мл, US 240 мл, UK 284 мл).", "Ingredient densities are averages: for dry and thick ingredients (flour, sugar, grains, nuts, butter) the weight of a cup is the median of several independent published charts (US cup 236.6 ml; for some items only one chart exists), for liquids (water, milk, oil, honey) the physical density is used. The real weight depends on packing, moisture and brand: for flour the difference between scooping and spooning reaches 10–15%, so the result is approximate (about ±5–10%). Spoons are level, not heaped. For exact baking weigh ingredients on a kitchen scale. Cups differ: choose the one in your recipe (250 ml, 200 ml, US 240 ml, UK 284 ml).");
  const ABBR = L({ ml: "мл", l: "л", tsp: "ч. л.", dsp: "дес. л.", tbsp: "ст. л.", tbspau: "ст. л. (AU)", cup250: "склянки (250 мл)", cup200: "склянки (200 мл)", cupus: "склянки (US)", cupcust: "склянки (US звичайна)", cupuk: "склянки (UK)", flozus: "рід. унції (US)", flozuk: "рід. унції (UK)", pintus: "пінти (US)", pintuk: "пінти (UK)", qtus: "кварти (US)", g: "г", kg: "кг", oz: "унцій", lb: "фунтів" }, { ml: "ml", l: "L", tsp: "tsp", dsp: "dessert spoons", tbsp: "tbsp", tbspau: "tbsp (AU)", cup250: "cups (250 ml)", cup200: "cups (200 ml)", cupus: "cups (US)", cupcust: "cups (US customary)", cupuk: "cups (UK)", flozus: "fl oz (US)", flozuk: "fl oz (UK)", pintus: "pints (US)", pintuk: "pints (UK)", qtus: "quarts (US)", g: "g", kg: "kg", oz: "oz", lb: "lb" });
  const CNT = { cup250: ["склянка", "склянки", "склянок", "склянки", " (250 мл)"], cup200: ["склянка", "склянки", "склянок", "склянки", " (200 мл)"], cupus: ["склянка", "склянки", "склянок", "склянки", " (US)"], cupcust: ["склянка", "склянки", "склянок", "склянки", " (US звичайна)"], cupuk: ["склянка", "склянки", "склянок", "склянки", " (UK)"], flozus: ["рід. унція", "рід. унції", "рід. унцій", "рід. унції", " (US)"], flozuk: ["рід. унція", "рід. унції", "рід. унцій", "рід. унції", " (UK)"], pintus: ["пінта", "пінти", "пінт", "пінти", " (US)"], pintuk: ["пінта", "пінти", "пінт", "пінти", " (UK)"], qtus: ["кварта", "кварти", "кварт", "кварти", " (US)"], oz: ["унція", "унції", "унцій", "унції", ""], lb: ["фунт", "фунти", "фунтів", "фунта", ""] };
  const CNT_EN = { cup250: ["cup", "cups", " (250 ml)"], cup200: ["cup", "cups", " (200 ml)"], cupus: ["cup", "cups", " (US)"], cupcust: ["cup", "cups", " (US customary)"], cupuk: ["cup", "cups", " (UK)"], pintus: ["pint", "pints", " (US)"], pintuk: ["pint", "pints", " (UK)"], qtus: ["quart", "quarts", " (US)"], dsp: ["dessert spoon", "dessert spoons", ""] };
  // назва одиниці в потрібній формі: 1 склянка, 2 склянки, 5 склянок, 1,5 склянки
  const ab = (id, x) => {
    const n = Number(x);
    if (IS_EN) { const c = CNT_EN[id]; return c ? (n <= 1 ? c[0] : c[1]) + c[2] : ABBR[id]; }
    const c = CNT[id]; if (!c) return ABBR[id];
    if (!Number.isInteger(n)) return c[3] + c[4];
    const m10 = n % 10, m100 = n % 100;
    return (m10 === 1 && m100 !== 11 ? c[0] : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? c[1] : c[2]) + c[4];
  };
  const CUPS = ["cup250", "cup200", "cupus", "cupcust", "cupuk"], DEF_CUP = L("cup250", "cupus");
  const fmtU = (x, u) => K.fmt(x, u, DEC);
  const fmtN = (x) => K.fmt(x, { id: "x" }, DEC);
  const fracOf = (x, u) => (u.kind === "v" && !["ml", "l", "pintus", "pintuk", "qtus", "flozus", "flozuk"].includes(u.id) ? K.fracText(x) : null);
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const chipsHtml = (id, chips) => '<div class="ph__chips ph__mt12" id="' + id + '">' + chips.map(([k, t]) => '<button type="button" class="ph__mini" data-k="' + k + '">' + t + "</button>").join("") + "</div>";
  const setV = (el, id, v) => { const e = el(id); if (!e) return; e.value = String(v); e.dispatchEvent(new Event("change", { bubbles: true })); };
  const bind = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); e.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); maybeCalc(); } }); });
  const fold = (key, title, inner) => '<details class="ph__details ph__fold" data-keep="' + key + '"><summary>' + title + '</summary><div class="ph__foldBody">' + inner + "</div></details>";
  const ingSel = (id) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + K.CATS.map((c) => '<optgroup label="' + c.label + '">' + K.ING.filter((x) => x.cat === c.id).map((x) => '<option value="' + x.id + '">' + x.label + "</option>").join("") + "</optgroup>").join("") + "</select>";
  const unitSel = (id) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + K.UNITS.map((u) => '<option value="' + u.id + '">' + u.label + "</option>").join("") + "</select>";
  const cupSel = (id) => sel(id, CUPS.map((c) => [c, K.unit(c).label]), DEF_CUP);
  const dens = (d) => fmtN(d) + L(" г/мл", " g/ml");
  const srcTxt = (x) => (x.src === "phys" ? L("фізична густина", "physical density") : x.src === "multi" ? L("медіана " + x.n + " таблиць", "median of " + x.n + " charts") : L("одна таблиця, орієнтир", "a single chart, a rough guide"));
  const amtErr = L("Кількість: число, дріб (1/2, 1 1/2) або символ (½, 1½); більше нуля.", "Amount: a number, a fraction (1/2, 1 1/2) or a symbol (½, 1½); greater than zero.");

  // ====================== конвертер ======================
  const conv = {
    key: "conv", type: "custom", req: () => ["kmA"], nameUk: "Конвертер", nameEn: "Converter",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("kmI", L("Продукт", "Ingredient"), ingSel("kmI"), true) + fld("kmA", L("Кількість", "Amount"), '<input class="ph__input" id="kmA" type="text" inputmode="decimal" autocomplete="off" maxlength="20" placeholder="1 1/2" aria-label="kmA">') + fld("kmF", L("З одиниці", "From"), unitSel("kmF")) + fld("kmT", L("В одиницю", "To"), unitSel("kmT"), true) + "</div>" + chipsHtml("kmChips", [["swap", L("⇄ Поміняти місцями", "⇄ Swap")]]) + hint(L("Кількість можна вводити дробом: 1/2, 1 1/2, ½, 1½ чи 0,5. Для переведення об'єму у вагу враховується густина продукту.", "You can enter the amount as a fraction: 1/2, 1 1/2, ½, 1½ or 0.5. Converting volume to weight takes the density of the ingredient into account."));
      el("kmI").value = "flour"; el("kmF").value = DEF_CUP; el("kmT").value = "g"; bind(el, maybeCalc, ["kmI", "kmA", "kmF", "kmT"]);
      el("kmChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; const f = el("kmF").value; el("kmF").value = el("kmT").value; el("kmT").value = f; h.calc(true); });
    },
    calc(h) {
      const { el } = h, raw = el("kmA").value.trim();
      if (!raw) return { ok: false, incomplete: true };
      const amt = K.parseAmount(raw);
      if (amt === null) return { ok: false, msg: amtErr };
      const ing = K.ing(el("kmI").value), fu = K.unit(el("kmF").value), tu = K.unit(el("kmT").value), d = ing.d, res = K.convert(amt, fu, tu, d), cross = fu.kind !== tu.kind;
      const ml = K.toMl(amt, fu, d), g = K.toG(amt, fu, d), pre = cross ? "≈ " : "", fr = fracOf(res, tu), resN = K.round(res, tu), amtN = Number(amt);
      const tiles = [{ k: L("Вага", "Weight"), v: (cross || fu.kind === "v" ? "≈ " : "") + fmtU(g, K.unit("g")) + " " + ABBR.g }, { k: L("Об'єм", "Volume"), v: (cross || fu.kind === "w" ? "≈ " : "") + fmtU(ml, K.unit("ml")) + " " + ABBR.ml }, { k: L("Густина", "Density"), v: dens(d) }, { k: L("Джерело густини", "Density source"), v: srcTxt(ing) }];
      const steps = cross ? [{ t: L("Кількість у " + (fu.kind === "v" ? "мілілітрах" : "грамах"), "The amount in " + (fu.kind === "v" ? "milliliters" : "grams")), l: [fmtN(amt) + " × " + fmtN(fu.f) + " " + (fu.kind === "v" ? ABBR.ml : ABBR.g) + " = " + fmtN(amt * fu.f) + " " + (fu.kind === "v" ? ABBR.ml : ABBR.g)] }, { t: L("Через густину " + dens(d), "Through the density " + dens(d)), l: [fu.kind === "v" ? fmtN(amt * fu.f) + " " + ABBR.ml + " × " + fmtN(d) + " = " + fmtN(g) + " " + ABBR.g : fmtN(amt * fu.f) + " " + ABBR.g + " / " + fmtN(d) + " = " + fmtN(ml) + " " + ABBR.ml] }, { t: L("У потрібну одиницю", "Into the target unit"), l: [fmtN(tu.kind === "w" ? g : ml) + " " + (tu.kind === "w" ? ABBR.g : ABBR.ml) + " / " + fmtN(tu.f) + " = " + fmtN(res) + " " + ab(tu.id, resN)] }] : [{ t: L("Перерахунок", "Conversion"), l: [fmtN(amt) + " × " + fmtN(fu.f) + " / " + fmtN(tu.f) + " = " + fmtN(res)], note: L("Об'єм в об'єм чи вага у вагу: продукт на результат не впливає.", "Volume to volume or weight to weight: the ingredient does not affect the result.") }];
      const rows = K.UNITS.filter((u) => u.id !== tu.id || true).map((u) => { const v = K.convert(amt, fu, u, d), f2 = fracOf(v, u); return { cells: [{ t: u.label, cls: "is-first" }, (u.kind !== fu.kind ? "≈ " : "") + fmtU(v, u) + (f2 ? " (≈ " + f2 + ")" : "")] }; });
      const extra = (cross ? "" : hint(L("Об'єм в об'єм чи вага у вагу: продукт на результат не впливає.", "Volume to volume or weight to weight: the ingredient does not affect the result."))) + fold("kmAll", L("Усі одиниці", "All units"), UI.list([L("Одиниця", "Unit"), L("Значення", "Value")], rows, { w: "minmax(0, 2fr) minmax(0, 1.4fr)" }));
      return { ok: true, expr: ing.label + " · " + raw + " " + ab(fu.id, amtN), head: [L("це", "that is"), pre + fmtU(res, tu) + " " + ab(tu.id, resN)], subRaw: true, headSub: (fr ? L("приблизно ", "about ") + fr + " " + ab(tu.id, 1.5) + " · " : "") + ing.label + (cross ? " · " + dens(d) : ""), tiles, extraHtml: extra, note: NOTE, steps, resText: ing.label + ": " + raw + " " + ab(fu.id, amtN) + " " + L("дорівнює", "equals") + " " + pre + fmtU(res, tu) + " " + ab(tu.id, resN) };
    },
    reset(h) { const { el } = h; el("kmI").value = "flour"; el("kmA").value = ""; el("kmF").value = DEF_CUP; el("kmT").value = "g"; },
    fill(h) { const { el } = h; el("kmI").value = "flour"; el("kmA").value = "1 1/2"; el("kmF").value = DEF_CUP; el("kmT").value = "g"; },
    share(p, h) { const { el } = h; p.set("ki", el("kmI").value); if (el("kmA").value.trim()) p.set("ka", el("kmA").value.trim().slice(0, 20)); p.set("kf", el("kmF").value); p.set("kt", el("kmT").value); },
    apply(qs, h) { const { el } = h; if (K.ing(qs.get("ki"))) el("kmI").value = qs.get("ki"); if (qs.has("ka") && K.parseAmount(qs.get("ka")) !== null) el("kmA").value = qs.get("ka").slice(0, 20); if (K.unit(qs.get("kf"))) el("kmF").value = qs.get("kf"); if (K.unit(qs.get("kt"))) el("kmT").value = qs.get("kt"); }
  };

  // ====================== скільки грамів у… ======================
  const how = {
    key: "how", type: "custom", req: () => [], nameUk: "Скільки грамів у…", nameEn: "How many grams in…",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("kmI", L("Продукт", "Ingredient"), ingSel("kmI"), true) + fld("kmC", L("Яка склянка", "Which cup"), cupSel("kmC"), true) + "</div>" + hint(L("Показує вагу частин склянки, ложок і зворотний перерахунок грамів у склянки й ложки. Склянки й ложки рівні, без гірки.", "Shows the weight of parts of a cup, spoons and the reverse conversion of grams to cups and spoons. Cups and spoons are level, not heaped."));
      el("kmI").value = "flour"; el("kmC").value = DEF_CUP; bind(el, maybeCalc, ["kmI", "kmC"]);
    },
    calc(h) {
      const { el } = h, ing = K.ing(el("kmI").value), cu = K.unit(el("kmC").value), d = ing.d, G = K.unit("g"), OZ = K.unit("oz"), perCup = K.toG(1, cu, d);
      const partsC = [[0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, "1"], [1.5, "1½"], [2, "2"], [3, "3"]];
      const cupRows = partsC.map(([f, t]) => ({ cells: [{ t: t + " " + L("скл.", "cup"), cls: "is-first" }, "≈ " + fmtU(perCup * f, G) + " " + ABBR.g, "≈ " + fmtU(perCup * f / OZ.f, OZ) + " " + ab("oz", K.round(perCup * f / OZ.f, OZ)), fmtU(cu.f * f, K.unit("ml")) + " " + ABBR.ml] }));
      const spoons = [["tbsp", 1], ["tsp", 1], ["dsp", 1], ["tbspau", 1]];
      const spoonRows = spoons.map(([id]) => { const u = K.unit(id); return { cells: [{ t: "1 " + u.label.charAt(0).toLowerCase() + u.label.slice(1), cls: "is-first" }, "≈ " + fmtU(K.toG(1, u, d), G) + " " + ABBR.g, "≈ " + fmtU(K.toG(1, u, d) / OZ.f, OZ) + " " + ab("oz", K.round(K.toG(1, u, d) / OZ.f, OZ)), fmtU(u.f, K.unit("ml")) + " " + ABBR.ml] }; });
      const revG = [25, 50, 100, 150, 200, 250, 300, 500, 1000].map((g) => { const c = K.convert(g, G, cu, d), t = K.convert(g, G, K.unit("tbsp"), d), fr = K.fracText(c); return { cells: [{ t: g + " " + ABBR.g, cls: "is-first" }, "≈ " + fmtU(c, cu) + (fr ? " (≈ " + fr + ")" : ""), "≈ " + fmtU(t, K.unit("tbsp")) + " " + ABBR.tbsp] }; });
      const tbspG = K.toG(1, K.unit("tbsp"), d), tspG = K.toG(1, K.unit("tsp"), d);
      const tiles = [{ k: "1 " + L("ст. ложка", "tbsp"), v: "≈ " + fmtU(tbspG, G) + " " + ABBR.g }, { k: "1 " + L("ч. ложка", "tsp"), v: "≈ " + fmtU(tspG, G) + " " + ABBR.g }, { k: L("Густина", "Density"), v: dens(d) }, { k: L("Джерело", "Source"), v: srcTxt(ing) }];
      const steps = [{ t: L("Вага склянки", "The weight of a cup"), l: [fmtN(cu.f) + " " + ABBR.ml + " × " + fmtN(d) + " " + L("г/мл", "g/ml") + " = " + fmtN(perCup) + " " + ABBR.g] }, { t: L("Ложки", "Spoons"), l: [L("столова: 15 мл × ", "tablespoon: 15 ml × ") + fmtN(d) + " = " + fmtN(tbspG) + " " + ABBR.g + "; " + L("чайна: 5 мл × ", "teaspoon: 5 ml × ") + fmtN(d) + " = " + fmtN(tspG) + " " + ABBR.g] }];
      const extra = '<div class="ph__sub">' + L("Частини склянки", "Parts of a cup") + "</div>" + UI.list([L("Об'єм", "Volume"), L("Грами", "Grams"), L("Унції", "Ounces"), L("Мілілітри", "Milliliters")], cupRows, { w: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" }) + '<div class="ph__sub">' + L("Ложки", "Spoons") + "</div>" + UI.list([L("Ложка", "Spoon"), L("Грами", "Grams"), L("Унції", "Ounces"), L("Мілілітри", "Milliliters")], spoonRows, { w: "minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" }) + fold("kmRev", L("Зворотно: грами у склянки й ложки", "Reverse: grams to cups and spoons"), UI.list([L("Вага", "Weight"), L("Склянки", "Cups"), L("Столові ложки", "Tablespoons")], revG, { w: "minmax(0, 1fr) minmax(0, 1.6fr) minmax(0, 1.2fr)" }));
      return { ok: true, expr: ing.label + " · " + cu.label, head: [L("1 склянка (" + fmtN(cu.f) + " мл)", "1 cup (" + fmtN(cu.f) + " ml)"), "≈ " + fmtU(perCup, G) + " " + ABBR.g], subRaw: true, headSub: ing.label + " · " + dens(d), tiles, extraHtml: extra, note: NOTE, steps, resText: ing.label + ": 1 " + L("склянка", "cup") + " (" + fmtN(cu.f) + " " + ABBR.ml + ") ≈ " + fmtU(perCup, G) + " " + ABBR.g };
    },
    reset(h) { const { el } = h; el("kmI").value = "flour"; el("kmC").value = DEF_CUP; },
    fill(h) { const { el } = h; el("kmI").value = "sugar"; el("kmC").value = DEF_CUP; },
    share(p, h) { const { el } = h; p.set("ki", el("kmI").value); p.set("kc", el("kmC").value); },
    apply(qs, h) { const { el } = h; if (K.ing(qs.get("ki"))) el("kmI").value = qs.get("ki"); if (CUPS.includes(qs.get("kc"))) el("kmC").value = qs.get("kc"); }
  };

  // ====================== усі продукти ======================
  const all = {
    key: "all", type: "custom", req: () => [], nameUk: "Усі продукти", nameEn: "All ingredients",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("kmG", L("Категорія", "Category"), sel("kmG", [["", L("Усі продукти", "All ingredients")]].concat(K.CATS.map((c) => [c.id, c.label])), ""), true) + fld("kmC", L("Яка склянка", "Which cup"), cupSel("kmC"), true) + "</div>" + hint(L("Таблиця ваги склянки, столової й чайної ложки для кожного продукту. Значення середні, див. примітку під результатом.", "A table of the weight of a cup, a tablespoon and a teaspoon for every ingredient. The values are averages, see the note under the result."));
      el("kmC").value = DEF_CUP; bind(el, maybeCalc, ["kmG", "kmC"]);
    },
    calc(h) {
      const { el } = h, cat = el("kmG").value, cu = K.unit(el("kmC").value), G = K.unit("g"), list = K.ING.filter((x) => !cat || x.cat === cat);
      const groups = K.CATS.filter((c) => list.some((x) => x.cat === c.id));
      const html = groups.map((c) => '<div class="ph__sub">' + c.label + "</div>" + UI.list([L("Продукт", "Ingredient"), L("Склянка", "Cup"), L("Ст. ложка", "Tbsp"), L("Ч. ложка", "Tsp"), L("г на 100 мл", "g per 100 ml")], list.filter((x) => x.cat === c.id).map((x) => ({ cells: [{ t: x.label, cls: "is-first" }, "≈ " + fmtU(K.toG(1, cu, x.d), G), "≈ " + fmtU(K.toG(1, K.unit("tbsp"), x.d), G), "≈ " + fmtU(K.toG(1, K.unit("tsp"), x.d), G), fmtU(x.d * 100, G)] })), { w: "minmax(0, 2fr) repeat(4, minmax(0, 1fr))" })).join("");
      const steps = [{ t: L("Як рахується", "How it is calculated"), l: [L("склянка (г) = об'єм склянки (мл) × густина (г/мл); ложка так само: 15 мл і 5 мл", "cup (g) = cup volume (ml) × density (g/ml); a spoon the same way: 15 ml and 5 ml")], note: L("Склянка " + fmtN(cu.f) + " мл. Вага сипучих продуктів: медіана кількох незалежних таблиць (одна таблиця лише для частини позицій), рідин: фізичні дані.", "The cup is " + fmtN(cu.f) + " ml. The weight of dry ingredients is the median of several independent charts (a single chart for some items only) and of liquids physical data.") }];
      return { ok: true, expr: (cat ? K.CATS.find((c) => c.id === cat).label : L("Усі продукти", "All ingredients")) + " · " + cu.label, head: [L("продуктів у таблиці", "ingredients in the table"), String(list.length)], subRaw: true, headSub: L("склянка ", "cup ") + fmtN(cu.f) + " " + ABBR.ml, tiles: [{ k: L("Склянка", "Cup"), v: cu.label }, { k: L("Ст. ложка", "Tablespoon"), v: "15 " + ABBR.ml }, { k: L("Ч. ложка", "Teaspoon"), v: "5 " + ABBR.ml }], extraHtml: html, note: NOTE, steps, resText: L("Таблиця ваги склянки, ложок (", "Table of the weight of a cup and spoons (") + list.length + L(" продуктів)", " ingredients)") };
    },
    reset(h) { const { el } = h; el("kmG").value = ""; el("kmC").value = DEF_CUP; },
    fill(h) { const { el } = h; el("kmG").value = "flour"; el("kmC").value = DEF_CUP; },
    share(p, h) { const { el } = h; if (el("kmG").value) p.set("kg", el("kmG").value); p.set("kc", el("kmC").value); },
    apply(qs, h) { const { el } = h; if (K.CATS.some((c) => c.id === qs.get("kg"))) el("kmG").value = qs.get("kg"); if (CUPS.includes(qs.get("kc"))) el("kmC").value = qs.get("kc"); }
  };
  return { modes: [conv, how, all], exactNote: false };
});
