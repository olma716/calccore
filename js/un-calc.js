/* un-calc.js — конвертер одиниць: перетворення, усі одиниці категорії; залежить від km-data.js і un-data.js */
PhysCalc.start(({ L }) => {
  const U = window.Un, UI = window.PhysUI;
  const IS_EN = L(false, true), SIGS = ["4", "6", "8", "10", "12", "15"], DEF_SIG = "10";
  const NOTE = L("Коефіцієнти взято за точними визначеннями (SI/BIPM і NIST SP 811): дюйм 2,54 см, фунт 0,45359237 кг, галон США 3,785411784 л, акр 4046,8564224 м² тощо, тож переведення туди й назад збігається. Одиниці США й Британії різняться (галон, пінта, рідинна унція), а склянка не має єдиного розміру, тому наведено кілька варіантів. Парсек і середній місяць наближені. Результат показано з обраною кількістю значущих цифр; «≈» означає округлення. Дані зібрано з відкритих джерел і викладено своїми словами; сайт не пов'язаний із цими організаціями.", "The factors follow the exact definitions (SI/BIPM and NIST SP 811): an inch is 2.54 cm, a pound 0.45359237 kg, a US gallon 3.785411784 L, an acre 4046.8564224 m² and so on, so converting there and back agrees. US and British units differ (gallon, pint, fluid ounce), and a cup has no single size, so several are given. The parsec and the average month are approximate. The result is shown with the chosen number of significant digits; “≈” means it is rounded. The data is collected from public sources and put in our own words; the site is not affiliated with these organizations.");
  const BASE = { length: L("м", "m"), mass: L("кг", "kg"), volume: L("л", "L"), area: L("м²", "m²"), speed: L("м/с", "m/s"), time: L("с", "s"), pressure: L("Па", "Pa"), energy: L("Дж", "J"), power: L("Вт", "W"), angle: L("оберт", "turn"), data: L("Б", "B") };
  const DEF = { length: ["km", "mi"], mass: ["kg", "lb"], volume: ["l", "galus"], area: ["ha", "ac"], speed: ["kmh", "mph"], temp: ["c", "f"], time: ["h", "min"], pressure: ["bar", "psi"], energy: ["kcal", "kj"], power: ["kw", "hp"], angle: ["deg", "rad"], data: ["gb", "gib"] };
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const selH = (id, inner) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + inner + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const fold = (key, title, inner) => '<details class="ph__details ph__fold" data-keep="' + key + '"><summary>' + title + '</summary><div class="ph__foldBody">' + inner + "</div></details>";
  const chipsHtml = (id, chips) => '<div class="ph__chips ph__mt12" id="' + id + '">' + chips.map(([k, t]) => '<button type="button" class="ph__mini" data-k="' + k + '">' + t + "</button>").join("") + "</div>";
  const bind = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); if (!e) return; e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); });
  // скорочення з дужок; для варіантів «США», «метрична» тощо береться повна назва
  const sym = (u) => { const m = /\(([^()]*)\)\s*$/.exec(u.label); if (!m) return u.label; const s = m[1].split(",")[0].trim(); return !s || s.length > 6 || /^\d/.test(s) || /^(США|US|UK|Британія|metric|imperial|customary|Julian)$/i.test(s) ? u.label : s; };
  const catOpts = () => U.CATS.map((c) => '<option value="' + c.id + '">' + c.label + "</option>").join("");
  const unitOpts = (cid) => { const c = U.cat(cid), order = ["si", "us", "uk", "ot"]; return order.filter((g) => c.units.some((u) => u.g === g)).map((g) => '<optgroup label="' + U.GRP[g] + '">' + c.units.filter((u) => u.g === g).map((u) => '<option value="' + u.id + '">' + u.label + "</option>").join("") + "</optgroup>").join(""); };
  const sigSel = () => selH("unS", SIGS.map((s) => '<option value="' + s + '"' + (s === DEF_SIG ? " selected" : "") + ">" + s + "</option>").join(""));
  const settings = () => fold("unSet", L("Налаштування", "Settings"), '<div class="ph__vars">' + fld("unS", L("Значущих цифр", "Significant digits"), sigSel(), true) + "</div>" + hint(L("Скільки значущих цифр показувати в результаті. Обчислення виконуються з повною точністю.", "How many significant digits to show in the result. The calculation runs at full precision.")));
  const valErr = L("Значення: число (можна з комою, знаком чи записом 1e-3).", "Value: a number (a comma, a sign or a form like 1e-3 is fine).");
  const setUnits = (el, h, cid, keep) => { const opts = unitOpts(cid), f = el("unF"), t = el("unT"), pf = f.value, pt = t ? t.value : ""; f.innerHTML = opts; if (t) t.innerHTML = opts; const c = U.cat(cid), ok = (id) => c.units.some((u) => u.id === id); f.value = keep && ok(pf) ? pf : DEF[cid][0]; if (t) t.value = keep && ok(pt) ? pt : DEF[cid][1]; };
  const sync = (el, h) => { el("unC").addEventListener("change", () => { setUnits(el, h, el("unC").value, false); h.maybeCalc(); }); };
  const tempLines = (x, from, to, sig) => {
    const toK = { c: "K = °C + 273" + (IS_EN ? "." : ",") + "15", f: "K = (°F + 459" + (IS_EN ? "." : ",") + "67) × 5/9", k: "K = K", r: "K = °R × 5/9" }[from], fromK = { c: "°C = K − 273" + (IS_EN ? "." : ",") + "15", f: "°F = K × 9/5 − 459" + (IS_EN ? "." : ",") + "67", k: "K = K", r: "°R = K × 9/5" }[to];
    return [toK + " = " + U.fmt(U.TK[from][0](x), sig) + " K", fromK + " = " + U.fmt(U.TK[to][1](U.TK[from][0](x)), sig)];
  };

  // ====================== конвертер ======================
  const conv = {
    key: "conv", type: "custom", req: () => ["unA"], nameUk: "Конвертер", nameEn: "Converter",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("unC", L("Категорія", "Category"), selH("unC", catOpts()), true) + fld("unA", L("Значення", "Value"), '<input class="ph__input" id="unA" type="text" inputmode="decimal" autocomplete="off" maxlength="30" placeholder="1" aria-label="unA">', true) + fld("unF", L("З", "From"), selH("unF", unitOpts("length"))) + fld("unT", L("В", "To"), selH("unT", unitOpts("length"))) + "</div>" + chipsHtml("unChips", [["swap", L("⇄ Поміняти місцями", "⇄ Swap")]]) + settings() + hint(L("Оберіть категорію, одиниці й введіть значення. Є пошук одиниці в списку.", "Choose a category and units and enter a value. The unit lists have a search."));
      el("unC").value = "length"; setUnits(el, h, "length", false); sync(el, h); bind(el, h.maybeCalc, ["unA", "unF", "unT", "unS"]);
      el("unChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; const f = el("unF").value; el("unF").value = el("unT").value; el("unT").value = f; h.calc(true); });
    },
    calc(h) {
      const { el, esc } = h, raw = el("unA").value.trim(); if (!raw) return { ok: false, incomplete: true };
      const x = U.parse(raw); if (x === null) return { ok: false, msg: valErr };
      const cid = el("unC").value, c = U.cat(cid), fu = U.unit(cid, el("unF").value), tu = U.unit(cid, el("unT").value), sig = Number(el("unS").value) || 10;
      if (cid === "temp" && U.TK[fu.id][0](x) < 0) return { ok: false, msg: L("Температура нижча за абсолютний нуль.", "The temperature is below absolute zero.") };
      const y = U.convert(cid, x, fu.id, tu.id), ys = U.fmt(y, sig), ap = U.isApprox(y, sig) || fu.ap || tu.ap, pre = ap ? "≈ " : "";
      const rows = c.units.map((u) => { const v = U.convert(cid, x, fu.id, u.id); return { cells: [{ t: u.label, cls: u.id === tu.id ? "is-first strong" : "is-first" }, (U.isApprox(v, sig) || fu.ap || u.ap ? "≈ " : "") + U.fmt(v, sig)] }; });
      const all = fold("unAll", L("Усі одиниці категорії", "All units of the category"), UI.list([L("Одиниця", "Unit"), L("Значення", "Value")], rows, { w: "minmax(0, 2fr) minmax(0, 1.4fr)" }));
      const one = cid === "temp" ? null : U.convert(cid, 1, fu.id, tu.id), inv = cid === "temp" ? null : U.convert(cid, 1, tu.id, fu.id);
      const tiles = cid === "temp" ? [{ k: L("Формула", "Formula"), v: L("через кельвін", "through kelvin") }, { k: L("Значення", "Value"), v: U.fmt(x, sig) + " " + sym(fu) }] : [{ k: L("1 ", "1 ") + sym(fu), v: U.fmt(one, sig) + " " + sym(tu) }, { k: L("1 ", "1 ") + sym(tu), v: U.fmt(inv, sig) + " " + sym(fu) }, { k: L("Точність", "Precision"), v: ap ? L("наближено", "approximate") : L("за визначенням", "by definition") }];
      const steps = cid === "temp" ? [{ t: L("Через кельвін", "Through kelvin"), l: tempLines(x, fu.id, tu.id, sig) }] : [{ t: L("У базову одиницю", "To the base unit"), l: [U.fmt(x, sig) + " " + sym(fu) + " × " + U.fmt(fu.f, 15) + " = " + U.fmt(x * fu.f, sig) + " " + BASE[cid]] }, { t: L("У потрібну одиницю", "To the target unit"), l: [U.fmt(x * fu.f, sig) + " " + BASE[cid] + " / " + U.fmt(tu.f, 15) + " = " + pre + ys + " " + sym(tu)] }];
      const approxNote = fu.ap || tu.ap ? hint(esc(L("Одиниця «" + (fu.ap ? fu.label : tu.label) + "» наближена.", "The unit “" + (fu.ap ? fu.label : tu.label) + "” is approximate."))) : "";
      return { ok: true, expr: U.fmt(x, sig) + " " + sym(fu) + " → " + sym(tu), head: [L("результат", "result"), pre + ys + " " + sym(tu)], headSub: c.label + " · " + fu.label + " → " + tu.label, subRaw: true, tiles, extraHtml: approxNote + all, note: NOTE, steps, resText: U.fmt(x, sig) + " " + sym(fu) + " = " + pre + ys + " " + sym(tu) };
    },
    reset(h) { const { el } = h; el("unA").value = ""; el("unC").value = "length"; setUnits(el, h, "length", false); el("unS").value = DEF_SIG; },
    fill(h) { const { el } = h; el("unC").value = "length"; setUnits(el, h, "length", false); el("unF").value = "mi"; el("unT").value = "km"; el("unA").value = "26.2"; },
    share(p, h) { const { el } = h; p.set("nc", el("unC").value); if (el("unA").value.trim()) p.set("na", el("unA").value.trim().slice(0, 30)); p.set("nf", el("unF").value); p.set("nt", el("unT").value); if (el("unS").value !== DEF_SIG) p.set("nd", el("unS").value); },
    apply(qs, h) { const { el } = h; const cid = qs.get("nc"); if (U.cat(cid)) { el("unC").value = cid; setUnits(el, h, cid, false); if (U.unit(cid, qs.get("nf"))) el("unF").value = qs.get("nf"); if (U.unit(cid, qs.get("nt"))) el("unT").value = qs.get("nt"); } if (qs.has("na")) el("unA").value = qs.get("na").slice(0, 30); if (SIGS.includes(qs.get("nd"))) el("unS").value = qs.get("nd"); }
  };

  // ====================== усі одиниці ======================
  const all = {
    key: "all", type: "custom", req: () => ["unA"], nameUk: "Усі одиниці", nameEn: "All units",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("unC", L("Категорія", "Category"), selH("unC", catOpts()), true) + fld("unA", L("Значення", "Value"), '<input class="ph__input" id="unA" type="text" inputmode="decimal" autocomplete="off" maxlength="30" placeholder="1" aria-label="unA">') + fld("unF", L("Одиниця", "Unit"), selH("unF", unitOpts("length"))) + "</div>" + settings();
      el("unC").value = "length"; setUnits(el, h, "length", false); el("unF").addEventListener("change", () => {}); el("unC").addEventListener("change", () => { setUnits(el, h, el("unC").value, false); h.maybeCalc(); }); bind(el, h.maybeCalc, ["unA", "unF", "unS"]);
    },
    calc(h) {
      const { el } = h, raw = el("unA").value.trim(); if (!raw) return { ok: false, incomplete: true };
      const x = U.parse(raw); if (x === null) return { ok: false, msg: valErr };
      const cid = el("unC").value, c = U.cat(cid), fu = U.unit(cid, el("unF").value), sig = Number(el("unS").value) || 10;
      if (cid === "temp" && U.TK[fu.id][0](x) < 0) return { ok: false, msg: L("Температура нижча за абсолютний нуль.", "The temperature is below absolute zero.") };
      const rows = c.units.map((u) => { const v = U.convert(cid, x, fu.id, u.id); return { cells: [{ t: u.label, cls: u.id === fu.id ? "is-first strong" : "is-first" }, (U.isApprox(v, sig) || fu.ap || u.ap ? "≈ " : "") + U.fmt(v, sig)] }; });
      const list = UI.list([L("Одиниця", "Unit"), L("Значення", "Value")], rows, { w: "minmax(0, 2fr) minmax(0, 1.4fr)" });
      return { ok: true, expr: U.fmt(x, sig) + " " + sym(fu), head: [L("одиниць", "units"), String(rows.length)], headSub: c.label + " · " + U.fmt(x, sig) + " " + sym(fu), subRaw: true, tiles: [{ k: L("Категорія", "Category"), v: c.label }, { k: L("Вихідна", "Source"), v: fu.label }], extraHtml: list, note: NOTE, steps: [{ t: L("Як рахується", "How it is worked out"), l: [cid === "temp" ? L("Через кельвін для кожної шкали.", "Through kelvin for each scale.") : L("Значення × коефіцієнт вихідної одиниці / коефіцієнт потрібної.", "Value × the factor of the source unit / the factor of the target unit.")] }], resText: U.fmt(x, sig) + " " + sym(fu) + ":\n" + c.units.map((u) => u.label + " = " + U.fmt(U.convert(cid, x, fu.id, u.id), sig)).join("\n") };
    },
    reset(h) { const { el } = h; el("unA").value = ""; el("unC").value = "length"; setUnits(el, h, "length", false); },
    fill(h) { const { el } = h; el("unC").value = "mass"; setUnits(el, h, "mass", false); el("unF").value = "kg"; el("unA").value = "70"; },
    share(p, h) { const { el } = h; p.set("nc", el("unC").value); if (el("unA").value.trim()) p.set("na", el("unA").value.trim().slice(0, 30)); p.set("nf", el("unF").value); if (el("unS").value !== DEF_SIG) p.set("nd", el("unS").value); },
    apply(qs, h) { const { el } = h; const cid = qs.get("nc"); if (U.cat(cid)) { el("unC").value = cid; setUnits(el, h, cid, false); if (U.unit(cid, qs.get("nf"))) el("unF").value = qs.get("nf"); } if (qs.has("na")) el("unA").value = qs.get("na").slice(0, 30); if (SIGS.includes(qs.get("nd"))) el("unS").value = qs.get("nd"); }
  };

  return { modes: [conv, all], exactNote: false };
});
