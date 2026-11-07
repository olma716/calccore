/* rs-calc.js — перерахунок порцій рецепта: за порціями, за коефіцієнтом, від наявного інгредієнта; залежить від km-data.js і rs-data.js */
PhysCalc.start(({ L }) => {
  const K = window.Km, R = window.Rs, UI = window.PhysUI;
  const IS_EN = L(false, true), BASE = IS_EN ? "/en" : "";
  const CUPS = ["cup250", "cup200", "cupus", "cupcust", "cupuk"], DEF_CUP = L("cup250", "cupus"), MAXL = 200, MAXT = 4000;
  const S = { text: "", cup: DEF_CUP, simplify: "1" };
  const SAMPLE = L("1 1/2 склянки борошна\n200 г вершкового масла\n3 яйця\n2 ст. л. цукру\n1 ч. л. розпушувача\n1 щіпка солі\nванільний цукор за смаком", "1 1/2 cups flour\n1 stick butter\n3 eggs\n2 tbsp sugar\n1 tsp baking powder\n1 pinch salt\nvanilla sugar to taste");
  const NOTE = L("Перерахунок лінійний: кожна кількість множиться на коефіцієнт. Спеції, сіль, розпушувач і дріжджі, час готування, розмір форми й випаровування рідини не масштабуються прямо пропорційно, тож коригуйте їх за смаком і станом страви. Рядки без числа й кількості в хвилинах чи градусах лишаються без змін. Слова змінюють форму лише для відомих (склянка, яйце, зубчик, штука, банка…), інші лишаються як у вашому рядку. Кількості округлено до зручної точності.", "The scaling is linear: every amount is multiplied by the factor. Spices, salt, leavening and yeast, cooking time, pan size and evaporation do not scale in direct proportion, so adjust them to taste and to how the dish looks. Lines without a number and amounts in minutes or degrees stay unchanged. Words change their form only for known ones (cup, egg, clove, piece, can…), the rest stay as in your line. Amounts are rounded to a practical precision.");
  const fmt = (x) => R.fmtNum(x);
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const inp = (id, ph, max) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (max || 12) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const fold = (key, title, inner) => '<details class="ph__details ph__fold" data-keep="' + key + '"><summary>' + title + '</summary><div class="ph__foldBody">' + inner + "</div></details>";
  const chipsHtml = (id, chips) => '<div class="ph__chips ph__mt12" id="' + id + '">' + chips.map(([k, t]) => '<button type="button" class="ph__mini" data-k="' + k + '">' + t + "</button>").join("") + "</div>";
  const bind = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); if (!e) return; e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); });
  const textarea = () => '<div class="ph__var ph__var--full" id="rsTextW"><label class="ph__label" for="rsText">' + L("Інгредієнти (один у рядку)", "Ingredients (one per line)") + '</label><textarea class="ph__input ph__ta" id="rsText" rows="8" maxlength="' + MAXT + '" autocomplete="off" spellcheck="false" placeholder="' + L("200 г борошна\n1/2 склянки цукру\n2 яйця", "2 cups flour\n1/2 cup sugar\n2 eggs") + '" aria-label="' + L("Інгредієнти", "Ingredients") + '"></textarea></div>';
  const settings = () => fold("rsSet", L("Налаштування", "Settings"), '<div class="ph__vars">' + fld("rsCup", L("Склянка в рецепті", "Cup in the recipe"), sel("rsCup", CUPS.map((c) => [c, K.unit(c).label]), S.cup)) + fld("rsHint", L("Зручніші одиниці й дроби", "Handier units and fractions"), sel("rsHint", [["1", L("Показувати підказки", "Show hints")], ["0", L("Не показувати", "Hide")]], S.simplify)) + "</div>" + hint(L("Підказки не змінюють результат: поруч із кількістю показується, наприклад, «= 1,5 кг», «≈ ¼ склянки» чи «≈ 2 ⅔». Склянка потрібна, щоб перевести ложки в склянки.", "The hints do not change the result: next to an amount you see, for example, “= 1.5 kg”, “≈ ¼ cup” or “≈ 2 ⅔”. The cup size is used to convert spoons to cups.")));
  const sync = (el) => { const t = el("rsText"); if (t) S.text = t.value; const c = el("rsCup"); if (c) S.cup = c.value; const s = el("rsHint"); if (s) S.simplify = s.value; };
  function wireCommon(el, h, ids) {
    el("rsText").value = S.text; bind(el, h.maybeCalc, ["rsText", "rsCup", "rsHint"].concat(ids));
    ["rsText", "rsCup", "rsHint"].forEach((id) => el(id).addEventListener("input", () => sync(el))); ["rsCup", "rsHint"].forEach((id) => el(id).addEventListener("change", () => sync(el)));
  }
  const amtErr = L("Введіть додатне число, можна дробом (1/2, 1 1/2).", "Enter a positive number, a fraction is fine (1/2, 1 1/2).");
  const num = (s) => K.parseAmount(String(s).replace(/^[×xх*]\s*/i, "").trim());

  // ---------- спільне побудова результату ----------
  function result(h, f, o) {
    const text = (h.el("rsText").value || "").slice(0, MAXT), all = String(text).split("\n").filter((l) => l.trim());
    if (all.length > MAXL) return { ok: false, msg: L("Забагато рядків: до " + MAXL + ".", "Too many lines: up to " + MAXL + ".") };
    const items = R.parse(text), n = items.filter((i) => i.kind === "item").length;
    if (!n) return { ok: false, msg: L("У рецепті не знайдено рядків із кількістю. Почніть рядок із числа («2 склянки борошна») або поставте його після тире («Борошно — 200 г»).", "No lines with an amount were found. Start a line with a number (“2 cups flour”) or put it after a dash (“Flour — 200 g”).") };
    if (!(f >= 0.0001 && f <= 10000)) return { ok: false, msg: L("Коефіцієнт має бути від 0,0001 до 10 000.", "The factor must be between 0.0001 and 10,000.") };
    const so = { cup: h.el("rsCup").value, simplify: h.el("rsHint").value === "1", factor: f };
    const sc = items.map((i) => R.scaleItem(i, f, so)), anyHint = sc.some((x) => x.hints.length || x.tag);
    const rows = items.map((i, k) => {
      const x = sc[k];
      if (i.kind !== "item") return { cells: [{ t: i.raw, cls: "muted" }, { t: "—", cls: "muted" }].concat(anyHint ? [{ t: "", cls: "muted" }] : []) };
      const hs = x.hints.concat(x.tag ? ["✎ " + x.tag] : []).join(" · ");
      return { cells: [{ t: x.text, cls: "strong" }, { t: i.raw.trim(), cls: "muted" }].concat(anyHint ? [{ t: hs, cls: "muted" }] : []) };
    });
    const cols = [L("Стало", "Scaled"), L("Було", "Original")].concat(anyHint ? [L("Підказка", "Hint")] : []);
    const table = UI.list(cols, rows, { w: anyHint ? "minmax(0, 1.5fr) minmax(0, 1.1fr) minmax(0, 1.5fr)" : "minmax(0, 1.5fr) minmax(0, 1fr)" });
    const up = f >= 2, down = f <= 0.5, tips = [];
    if (up || down) {
      tips.push([L("Час і температура", "Time and temperature"), up ? L("Час готування не множиться на коефіцієнт. Починайте перевіряти готовність у звичайний час: більша порція чи форма готується довше, але не прямо пропорційно.", "Cooking time does not multiply by the factor. Start checking at the usual time: a larger portion or pan takes longer, but not in direct proportion.") : L("Менша порція чи форма готується швидше: перевіряйте готовність раніше, ніж у рецепті.", "A smaller portion or pan cooks faster: check for doneness earlier than the recipe says.")]);
      tips.push([L("Посуд і форма", "Pan and dish"), (up ? L("Для більшої порції потрібна більша форма чи сковорода, щоб шар не став занадто товстим.", "A larger portion needs a larger pan or dish so that the layer does not become too thick.") : L("Для меншої порції візьміть меншу форму чи сковороду, щоб шар лишився таким самим.", "For a smaller portion use a smaller pan or dish so that the layer stays the same.")) + ' <a href="' + BASE + '/kitchen/pan-size-converter">' + L("Конвертер розмірів форм", "Pan size converter") + "</a>."]);
      if (R.hasSpice(items)) tips.push([L("Спеції й сіль", "Spices and salt"), up ? L("Додавайте поступово й куштуйте: у великих порціях смак росте повільніше, ніж кількість.", "Add gradually and taste: in large portions the flavor grows more slowly than the amount.") : L("Малі кількості важко відміряти: беріть щіпку й куштуйте.", "Small amounts are hard to measure: take a pinch and taste.")]);
      if (R.hasLeaven(items)) tips.push([L("Розпушувач, сода, дріжджі", "Baking powder, soda, yeast"), up ? L("Не множте на повний коефіцієнт без потреби: зайвий розпушувач і сода дають гіркуватий присмак, а дріжджам для більшого тіста зазвичай треба менше, ніж прямо пропорційно.", "Do not multiply by the full factor without need: extra baking powder and soda taste bitter, and yeast for a bigger dough usually needs less than direct proportion.") : L("Відміряйте точно й не округлюйте вгору: від надлишку тісто пахне содою.", "Measure exactly and do not round up: too much makes the dough taste of soda.")]);
      if (up) tips.push([L("Рідина й соуси", "Liquids and sauces"), L("У ширшому посуді рідина википає швидше, у глибшому повільніше: стежте за густотою й за потреби додайте чи прибавте вогонь.", "In a wider pan liquid evaporates faster, in a deeper one more slowly: watch the thickness and adjust the heat or add liquid if needed.")]);
    }
    const tipsHtml = tips.length ? '<div class="ph__sub">' + L("Що врахувати", "What to keep in mind") + "</div>" + tips.map(([t, b]) => '<div class="ph__hint ph__mt12"><b>' + h.esc(t) + ".</b> " + b + "</div>").join("") : "";
    const conv = hint(L("Потрібні грами замість склянок і ложок? ", "Need grams instead of cups and spoons? ") + '<a href="' + BASE + '/kitchen/measurement-converter">' + L("Конвертер кулінарних мір", "Cooking measurement converter") + "</a>.");
    const same = Math.abs(f - 1) < 1e-9;
    const tiles = [{ k: L("Коефіцієнт", "Factor"), v: "× " + fmt(f) }, { k: L("Перераховано рядків", "Lines scaled"), v: String(n) }, { k: L("Без змін", "Unchanged"), v: String(items.length - n) }];
    const out = items.map((i, k) => sc[k].text).join("\n");
    return { ok: true, expr: L("Перерахований рецепт", "Scaled recipe"), head: [L("коефіцієнт", "factor"), "× " + fmt(f)], headSub: o.sub, subRaw: true, tiles, extraHtml: table + tipsHtml + conv, note: same ? L("Коефіцієнт дорівнює 1: кількості не змінилися. ", "The factor is 1: the amounts did not change. ") + NOTE : NOTE, steps: o.steps.concat([{ t: L("Множимо кількості", "Multiplying the amounts"), l: [L("Кожне число в рядку множимо на ", "Each number in a line is multiplied by ") + fmt(f) + L("; діапазони множимо обидва кінці; слова-одиниці ставимо у відповідну форму.", "; both ends of a range are multiplied; unit words get the matching form.")] }]), resText: out };
  }
  const lineLabel = (it, k) => (k + 1) + ". " + it.raw.trim().replace(/\s+/g, " ").slice(0, 60);

  // ====================== за порціями ======================
  const serv = {
    key: "serv", type: "custom", req: () => ["rsA", "rsB"], nameUk: "За порціями", nameEn: "By servings",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("rsA", L("Порцій у рецепті", "Servings in the recipe"), inp("rsA", "4")) + fld("rsB", L("Порцій потрібно", "Servings needed"), inp("rsB", "6")) + textarea() + "</div>" + settings() + hint(L("Кількості можна писати дробом (1/2, 1 1/2, ½), діапазоном (2-3) і після тире («Борошно — 200 г»).", "Amounts can be written as fractions (1/2, 1 1/2, ½), as ranges (2-3) and after a dash (“Flour — 200 g”)."));
      wireCommon(el, h, ["rsA", "rsB"]);
    },
    calc(h) {
      const { el } = h; sync(el);
      const ra = el("rsA").value.trim(), rb = el("rsB").value.trim();
      if (!ra || !rb || !el("rsText").value.trim()) return { ok: false, incomplete: true };
      const a = num(ra), b = num(rb);
      if (a === null || b === null) return { ok: false, msg: L("Порції: ", "Servings: ") + amtErr };
      const f = b / a;
      return result(h, f, { sub: fmt(b) + L(" порцій замість ", " servings instead of ") + fmt(a), steps: [{ t: L("Коефіцієнт", "The factor"), l: [fmt(b) + " / " + fmt(a) + " = " + fmt(f)], note: L("Коефіцієнт — це відношення потрібних порцій до порцій у рецепті.", "The factor is the ratio of the servings you need to the servings in the recipe.") }] });
    },
    reset(h) { const { el } = h; el("rsA").value = ""; el("rsB").value = ""; el("rsText").value = ""; S.text = ""; },
    fill(h) { const { el } = h; el("rsA").value = "4"; el("rsB").value = "6"; el("rsText").value = SAMPLE; S.text = SAMPLE; },
    share(p, h) { const { el } = h; if (el("rsA").value.trim()) p.set("ro", el("rsA").value.trim().slice(0, 12)); if (el("rsB").value.trim()) p.set("rn", el("rsB").value.trim().slice(0, 12)); shareCommon(p, el); },
    apply(qs, h) { const { el } = h; if (qs.has("ro")) el("rsA").value = qs.get("ro").slice(0, 12); if (qs.has("rn")) el("rsB").value = qs.get("rn").slice(0, 12); applyCommon(qs, el); }
  };

  // ====================== за коефіцієнтом ======================
  const fact = {
    key: "fact", type: "custom", req: () => ["rsK"], nameUk: "За коефіцієнтом", nameEn: "By factor",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("rsK", L("Коефіцієнт (множник)", "Factor (multiplier)"), inp("rsK", "2"), true) + "</div>" + chipsHtml("rsChips", [["1/4", "¼"], ["1/2", "½"], ["3/4", "¾"], ["1 1/2", "1½"], ["2", "×2"], ["3", "×3"], ["4", "×4"]]) + '<div class="ph__vars ph__mt12">' + textarea() + "</div>" + settings() + hint(L("Наприклад, ×2 подвоює рецепт, ½ зменшує вдвічі, 1 1/2 збільшує на половину.", "For example ×2 doubles the recipe, ½ halves it, 1 1/2 makes it half as large again."));
      wireCommon(el, h, ["rsK"]);
      el("rsChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; el("rsK").value = b.dataset.k; h.maybeCalc(); });
    },
    calc(h) {
      const { el } = h; sync(el);
      const rk = el("rsK").value.trim();
      if (!rk || !el("rsText").value.trim()) return { ok: false, incomplete: true };
      const f = num(rk);
      if (f === null) return { ok: false, msg: L("Коефіцієнт: ", "Factor: ") + amtErr };
      return result(h, f, { sub: L("усі кількості множимо на ", "every amount is multiplied by ") + fmt(f), steps: [{ t: L("Коефіцієнт", "The factor"), l: ["× " + fmt(f)], note: L("Значення береться з поля: усе множиться на нього без перетворення порцій.", "The value is taken from the field: everything is multiplied by it directly.") }] });
    },
    reset(h) { const { el } = h; el("rsK").value = ""; el("rsText").value = ""; S.text = ""; },
    fill(h) { const { el } = h; el("rsK").value = "2"; el("rsText").value = SAMPLE; S.text = SAMPLE; },
    share(p, h) { const { el } = h; if (el("rsK").value.trim()) p.set("rf", el("rsK").value.trim().slice(0, 12)); shareCommon(p, el); },
    apply(qs, h) { const { el } = h; if (qs.has("rf")) el("rsK").value = qs.get("rf").slice(0, 12); applyCommon(qs, el); }
  };

  // ====================== від наявного ======================
  const have = {
    key: "have", type: "custom", req: () => ["rsH"], nameUk: "Від наявного", nameEn: "From what you have",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + textarea() + fld("rsL", L("Рядок, якого обмаль", "The limiting line"), sel("rsL", [["0", "—"]], "0"), true) + fld("rsH", L("Скільки в мене є", "How much you have"), inp("rsH", "300")) + "</div>" + settings() + hint(L("Оберіть інгредієнт, якого вистачає лише на частину рецепта, і вкажіть, скільки його є (у тій самій одиниці, що в рядку). Решта перерахується пропорційно.", "Pick the ingredient you only have part of and enter how much you have (in the same unit as the line). The rest is scaled in proportion."));
      wireCommon(el, h, ["rsH", "rsL"]);
      const fill = () => { const items = R.parse(el("rsText").value).filter((i) => i.kind === "item"), cur = el("rsL").value, opts = items.length ? items.map((it, k) => [String(k), lineLabel(it, k)]) : [["0", "—"]]; el("rsL").innerHTML = opts.map(([v, t]) => '<option value="' + v + '">' + h.esc(t) + "</option>").join(""); el("rsL").value = Number(cur) < opts.length ? cur : "0"; };
      el("rsText").addEventListener("input", fill); fill(); have._fill = fill;
    },
    calc(h) {
      const { el } = h; sync(el);
      const rh = el("rsH").value.trim();
      if (!rh || !el("rsText").value.trim()) return { ok: false, incomplete: true };
      const items = R.parse(el("rsText").value).filter((i) => i.kind === "item");
      if (!items.length) return { ok: false, msg: L("У рецепті не знайдено рядків із кількістю.", "No lines with an amount were found.") };
      const k = Math.min(Number(el("rsL").value) || 0, items.length - 1), it = items[k], base = it.hi !== undefined ? (it.v + it.hi) / 2 : it.v, hv = num(rh);
      if (hv === null) return { ok: false, msg: L("Є: ", "You have: ") + amtErr };
      const f = hv / base;
      return result(h, f, { sub: L("є ", "you have ") + fmt(hv) + L(" із ", " out of ") + fmt(base) + " · " + it.raw.trim().replace(/\s+/g, " ").slice(0, 50), steps: [{ t: L("Коефіцієнт", "The factor"), l: [fmt(hv) + " / " + fmt(base) + " = " + fmt(f)], note: it.hi !== undefined ? L("Для діапазону береться середина.", "For a range the midpoint is used.") : L("Є стільки, скільки вказано, поділити на кількість у рядку рецепта.", "What you have divided by the amount in the recipe line.") }] });
    },
    reset(h) { const { el } = h; el("rsH").value = ""; el("rsText").value = ""; S.text = ""; if (have._fill) have._fill(); },
    fill(h) { const { el } = h; el("rsText").value = SAMPLE; S.text = SAMPLE; if (have._fill) have._fill(); el("rsL").value = "0"; el("rsH").value = "1"; },
    share(p, h) { const { el } = h; if (el("rsH").value.trim()) { p.set("rh", el("rsH").value.trim().slice(0, 12)); p.set("rl", el("rsL").value); } shareCommon(p, el); },
    apply(qs, h) { const { el } = h; applyCommon(qs, el); if (have._fill) have._fill(); if (qs.has("rl") && /^\d{1,3}$/.test(qs.get("rl")) && [...el("rsL").options].some((o) => o.value === qs.get("rl"))) el("rsL").value = qs.get("rl"); if (qs.has("rh")) el("rsH").value = qs.get("rh").slice(0, 12); }
  };

  function shareCommon(p, el) { sync(el); if (S.text.trim()) p.set("rt", S.text.slice(0, 800)); if (CUPS.includes(S.cup) && S.cup !== DEF_CUP) p.set("rc", S.cup); if (S.simplify === "0") p.set("rx", "0"); }
  function applyCommon(qs, el) {
    if (qs.has("rt")) { S.text = qs.get("rt").slice(0, 800); el("rsText").value = S.text; }
    if (CUPS.includes(qs.get("rc"))) { S.cup = qs.get("rc"); el("rsCup").value = S.cup; }
    if (qs.get("rx") === "0") { S.simplify = "0"; el("rsHint").value = "0"; }
  }
  return { modes: [serv, fact, have], exactNote: false };
});
