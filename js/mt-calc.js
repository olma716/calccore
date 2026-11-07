/* mt-calc.js — температура м'яса: безпечний мінімум за USDA з перевіркою показу термометра, ступені прожарки яловичини з температурою зняття з вогню, таблиці; залежить від km-data.js і mt-data.js */
PhysCalc.start(({ L }) => {
  const K = window.Km, M = window.Mt, UI = window.PhysUI;
  const IS_EN = L(false, true), DEC = IS_EN ? "." : ",";
  const NOTE = L("Безпечні мінімуми взято з таблиці USDA FSIS, ознаки для риби й морепродуктів також із таблиці FDA. Ступені прожарки яловичини (rare, medium rare…) це смакові орієнтири з двох сайтів виробників термометрів, а не вимоги безпеки: для цілих шматків яловичини USDA радить мінімум 145 °F (63 °C) і відпочинок щонайменше 3 хв, для фаршу 160 °F (71 °C). Дітям, вагітним, літнім людям і людям з ослабленим імунітетом обирайте безпечний мінімум. Температура зняття з вогню це оцінка: carryover залежить від товщини шматка, температури сковороди чи духовки й вашого термометра. Дані зібрано з відкритих джерел і викладено своїми словами; сайт не пов'язаний із цими організаціями.", "The safe minimums come from the USDA FSIS chart, and the signs for fish and shellfish also from the FDA chart. The beef doneness levels (rare, medium rare…) are flavor guides from two thermometer makers' sites, not safety requirements: for whole cuts of beef USDA advises a minimum of 145 °F (63 °C) and a rest of at least 3 minutes, for ground meat 160 °F (71 °C). For children, pregnant women, older adults and people with weakened immunity choose the safe minimum. The pull temperature is an estimate: carryover depends on the thickness of the cut, the heat of the pan or oven and your thermometer. The data is collected from public sources and put in our own words; the site is not affiliated with these organizations.");
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const bind = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); if (!e) return; e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); });
  const foodSel = () => '<select class="ph__unit ph__unit--wide" id="mtF">' + M.GROUPS.map((g) => '<optgroup label="' + g.label + '">' + M.FOODS.filter((x) => x.g === g.id).map((x) => '<option value="' + x.id + '">' + x.name + "</option>").join("") + "</optgroup>").join("") + "</select>";
  const SHORT = { USDA: "USDA FSIS", FDA: "FDA", TW: "ThermoWorks", TP: "Thermapen" };
  const link = (c) => '<a href="' + M.SRC[c][1] + '" target="_blank" rel="noopener noreferrer" title="' + M.SRC[c][0] + '">' + SHORT[c] + "</a>";
  const trim = (x) => String(Math.round(x * 10) / 10).replace(".", DEC);
  const both = (f) => M.both(f);
  const range = (lo, hi) => (hi === null ? L("від ", "from ") + both(lo) : M.fmtC(lo) + "–" + M.fmtC(hi) + " °C / " + M.fmtF(lo) + "–" + M.fmtF(hi) + " °F");
  const restTxt = (f) => (f.rest ? L("щонайменше " + f.rest + " хв", "at least " + f.rest + " min") : L("USDA не вимагає", "USDA does not require it"));
  const box = (esc, t, strong) => '<div class="ph__hintbox ph__mt12">' + (strong ? "<b>" + esc(strong) + "</b> " : "") + esc(t) + "</div>";

  // ====================== безпечна температура ======================
  const safe = {
    key: "safe", type: "custom", req: () => [], nameUk: "Безпечна температура", nameEn: "Safe temperature",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("mtF", L("Продукт", "Food"), foodSel(), true) + fld("mtR", L("Що показав термометр (необов'язково)", "Thermometer reading (optional)"), '<input class="ph__input" id="mtR" type="text" inputmode="decimal" autocomplete="off" maxlength="6" placeholder="70" aria-label="mtR">') + fld("mtU", L("Шкала", "Scale"), sel("mtU", [["c", "°C"], ["f", "°F"]], "c")) + "</div>" + hint(L("Вставте термометр у найтовщу частину, подалі від кісток, жиру й хрящів. Колір м'яса й соку не показує безпечність.", "Insert the thermometer into the thickest part, away from bones, fat and gristle. The color of the meat or juices does not show that it is safe."));
      el("mtF").value = "poultry"; bind(el, h.maybeCalc, ["mtF", "mtR", "mtU"]);
    },
    calc(h) {
      const { el, esc } = h, f = M.food(el("mtF").value), rd = el("mtR").value.trim(), u = el("mtU").value;
      let chk = "", checked = null;
      if (rd) {
        const v = K.parseAmount(rd);
        if (v === null || (u === "c" && v > 500) || (u === "f" && v > 932)) return { ok: false, msg: L("Показ термометра: додатне число до 500 °C чи 932 °F.", "Thermometer reading: a positive number up to 500 °C or 932 °F.") };
        if (f.sign) chk = box(esc, L("Для цього продукту температура не нормується: орієнтуйтесь на ознаки готовності.", "This food has no set temperature: go by the signs of doneness."));
        else {
          const rf = u === "f" ? v : M.cToF(v), diff = f.f - rf; checked = diff <= 1e-9;
          chk = checked ? box(esc, L("Показ " + trim(v) + " " + (u === "f" ? "°F" : "°C") + " досягає мінімуму " + both(f.f) + (f.rest ? ". Зніміть з вогню й дайте постояти " + f.rest + " хв." : "."), "The reading of " + trim(v) + " " + (u === "f" ? "°F" : "°C") + " reaches the minimum of " + both(f.f) + (f.rest ? ". Take it off the heat and let it rest for " + f.rest + " min." : ".")), L("Безпечно за USDA.", "Safe by USDA.")) : box(esc, L("Показ " + trim(v) + " " + (u === "f" ? "°F" : "°C") + " нижчий за мінімум " + both(f.f) + ": бракує ще " + trim(diff * 5 / 9) + " °C / " + trim(diff) + " °F. Готуйте далі й міряйте знову.", "The reading of " + trim(v) + " " + (u === "f" ? "°F" : "°C") + " is below the minimum of " + both(f.f) + ": it needs " + trim(diff * 5 / 9) + " °C / " + trim(diff) + " °F more. Keep cooking and measure again."), L("Ще не безпечно.", "Not safe yet."));
        }
      }
      const srcs = f.src.map(link).join(", ");
      const tiles = f.sign ? [{ k: L("Як зрозуміти", "How to tell"), v: f.note }, { k: L("Джерело", "Source"), v: f.src.map((c) => SHORT[c]).join(", ") }] : [{ k: L("Відпочинок", "Rest"), v: restTxt(f) }, { k: L("Де міряти", "Where to measure"), v: L("найтовща частина, подалі від кісток, жиру й хрящів", "the thickest part, away from bones, fat and gristle") }, { k: L("Джерело", "Source"), v: f.src.map((c) => SHORT[c]).join(", ") }];
      const extra = (f.sign || !f.note ? "" : hint(esc(f.note))) + chk + hint(L("Джерело: ", "Source: ") + srcs + ".");
      const steps = f.sign ? [{ t: L("Ознаки готовності", "Signs of doneness"), l: [f.note] }] : [{ t: L("°F → °C", "°F → °C"), l: ["(" + f.f + " − 32) × 5/9 = " + M.fmtC(f.f) + " °C"], note: L("USDA наводить мінімум у °F; у °C це округлене значення.", "USDA gives the minimum in °F; the °C value is rounded.") }].concat(checked === null ? [] : [{ t: L("Порівняння з показом", "Comparison with the reading"), l: [checked ? L("Показ не нижчий за мінімум.", "The reading is not below the minimum.") : L("Показ нижчий за мінімум.", "The reading is below the minimum.")] }]);
      return { ok: true, expr: f.name, head: f.sign ? [L("ознака готовності", "sign of doneness"), f.note] : [L("мінімум за USDA", "USDA minimum"), both(f.f)], headSub: f.sign ? "" : L("відпочинок: ", "rest: ") + restTxt(f), subRaw: true, tiles, extraHtml: extra, note: NOTE, steps, resText: f.name + ": " + (f.sign ? f.note : both(f.f) + "; " + L("відпочинок: ", "rest: ") + restTxt(f)) };
    },
    reset(h) { const { el } = h; el("mtF").value = "poultry"; el("mtR").value = ""; el("mtU").value = "c"; },
    fill(h) { const { el } = h; el("mtF").value = "whole"; el("mtR").value = L("60", "140"); el("mtU").value = L("c", "f"); },
    share(p, h) { const { el } = h; p.set("mf", el("mtF").value); if (el("mtR").value.trim()) { p.set("mr", el("mtR").value.trim().slice(0, 6)); p.set("mu", el("mtU").value); } },
    apply(qs, h) { const { el } = h; if (M.food(qs.get("mf"))) el("mtF").value = qs.get("mf"); if (qs.has("mr")) el("mtR").value = qs.get("mr").slice(0, 6); if (["c", "f"].includes(qs.get("mu"))) el("mtU").value = qs.get("mu"); }
  };

  // ====================== ступінь прожарки ======================
  const TH = [["thin", L("Тонкий стейк", "Thin steak")], ["large", L("Великий шматок", "Large cut")]];
  const doneness = {
    key: "done", type: "custom", req: () => [], nameUk: "Ступінь прожарки", nameEn: "Doneness",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("mtD", L("Ступінь прожарки яловичини", "Beef doneness"), sel("mtD", M.DONE.map((d) => [d.id, d.name]), "mr"), true) + fld("mtK", L("Товщина", "Thickness"), sel("mtK", TH, "thin"), true) + "</div>" + hint(L("Ступені прожарки це смакові орієнтири, а не вимоги безпеки. Фарш і тільки що подрібнене чи проколоте м'ясо готують до 160 °F (71 °C).", "Doneness levels are flavor guides, not safety requirements. Ground meat and meat that was just minced or tenderized is cooked to 160 °F (71 °C)."));
      bind(el, h.maybeCalc, ["mtD", "mtK"]);
    },
    calc(h) {
      const { el, esc } = h, d = M.done(el("mtD").value), k = el("mtK").value, pl = M.pull(d, k), c = M.CARRY[k];
      const warn = M.belowUsda(d) ? box(esc, L("Цей ступінь нижчий за мінімум USDA для цілих шматків яловичини (145 °F / 63 °C з відпочинком щонайменше 3 хв). Дітям, вагітним, літнім людям і людям з ослабленим імунітетом обирайте безпечний мінімум.", "This level is below the USDA minimum for whole cuts of beef (145 °F / 63 °C with a rest of at least 3 minutes). For children, pregnant women, older adults and people with weakened immunity choose the safe minimum."), L("Нижче мінімуму USDA.", "Below the USDA minimum.")) : box(esc, L("Цей ступінь не нижчий за мінімум USDA (145 °F / 63 °C); не забудьте відпочинок щонайменше 3 хв.", "This level is not below the USDA minimum (145 °F / 63 °C); do not forget a rest of at least 3 minutes."), L("Відповідає мінімуму USDA.", "Meets the USDA minimum."));
      const rows = M.DONE.map((x) => { const a = M.pull(x, "thin"), b = M.pull(x, "large"); return { cells: [{ t: x.name, cls: "is-first" }, range(x.lo, x.hi), range(a.lo, a.hi), range(b.lo, b.hi), M.belowUsda(x) ? L("нижче мінімуму", "below the minimum") : L("не нижче мінімуму", "not below the minimum")] }; });
      const table = UI.list([L("Ступінь", "Doneness"), L("Подача", "Serving"), L("Зняти: тонкий", "Pull: thin"), L("Зняти: великий", "Pull: large"), L("USDA", "USDA")], rows, { w: "minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1fr)" });
      const carryTxt = c[0] + "–" + c[1] + " °F (" + (k === "thin" ? "2–3" : "6–8") + " °C)";
      const steps = [{ t: L("Carryover", "Carryover"), l: [L("Середина діапазону: ", "Middle of the range: ") + trim(pl.carry) + " °F (" + trim(pl.carry * 5 / 9) + " °C)"], note: L("Джерело радить 3–5 °F для тонкого стейка і 10–15 °F для великого шматка.", "The source advises 3–5 °F for a thin steak and 10–15 °F for a large cut.") }, { t: L("Температура зняття", "Pull temperature"), l: [L("подача − carryover: ", "serving − carryover: ") + range(d.lo, d.hi) + " − " + trim(pl.carry) + " °F = " + range(pl.lo, pl.hi)] }];
      return { ok: true, expr: d.name + " · " + TH.find((t) => t[0] === k)[1], head: [L("зняти з вогню", "take off the heat"), range(pl.lo, pl.hi)], headSub: L("подача: ", "serving: ") + range(d.lo, d.hi), subRaw: true, tiles: [{ k: L("Температура подачі", "Serving temperature"), v: range(d.lo, d.hi) }, { k: L("Carryover", "Carryover"), v: carryTxt }, { k: L("Мінімум USDA", "USDA minimum"), v: both(M.USDA_MIN) + L(" + 3 хв", " + 3 min") }], extraHtml: warn + table + hint(L("Джерела ступенів і carryover: ", "Sources of the levels and carryover: ") + link("TW") + ", " + link("TP") + "."), note: NOTE, steps, resText: d.name + ": " + L("зняти з вогню ", "take off the heat at ") + range(pl.lo, pl.hi) + L("; подача ", "; serving ") + range(d.lo, d.hi) };
    },
    reset(h) { const { el } = h; el("mtD").value = "mr"; el("mtK").value = "thin"; },
    fill(h) { const { el } = h; el("mtD").value = "mw"; el("mtK").value = "large"; },
    share(p, h) { const { el } = h; p.set("md", el("mtD").value); p.set("mk", el("mtK").value); },
    apply(qs, h) { const { el } = h; if (M.done(qs.get("md"))) el("mtD").value = qs.get("md"); if (["thin", "large"].includes(qs.get("mk"))) el("mtK").value = qs.get("mk"); }
  };

  // ====================== таблиці ======================
  const TB = [["usda", L("Безпечні мінімуми USDA", "USDA safe minimums")], ["done", L("Ступені прожарки яловичини", "Beef doneness levels")]];
  const table = {
    key: "table", type: "custom", req: () => [], nameUk: "Усі температури", nameEn: "All temperatures",
    build(body, x, h) { const { el } = h; body.innerHTML = '<div class="ph__vars">' + fld("mtT", L("Таблиця", "Table"), sel("mtT", TB, "usda"), true) + "</div>" + hint(L("Безпечні мінімуми USDA і ступені прожарки яловичини зібрано в окремих таблицях.", "The USDA safe minimums and the beef doneness levels are in separate tables.")); bind(el, h.maybeCalc, ["mtT"]); },
    calc(h) {
      const { el } = h, k = el("mtT").value, name = TB.find((t) => t[0] === k)[1];
      if (k === "usda") {
        const rows = M.FOODS.map((f) => ({ cells: [{ t: f.name, cls: "is-first" }, f.sign ? "—" : both(f.f), f.sign ? "—" : restTxt(f), { h: f.note ? f.note.replace(/&/g, "&amp;").replace(/</g, "&lt;") : "", cls: "muted" }, { h: f.src.map(link).join(", "), cls: "muted" }] }));
        const list = UI.list([L("Продукт", "Food"), L("Мінімум", "Minimum"), L("Відпочинок", "Rest"), L("Примітка", "Note"), L("Джерело", "Source")], rows, { w: "minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 0.9fr) minmax(0, 1.5fr) minmax(0, 0.8fr)" });
        return { ok: true, expr: name, head: [L("позицій", "rows"), String(rows.length)], headSub: name, subRaw: true, tiles: [{ k: L("Джерело", "Source"), v: "USDA FSIS, FDA" }], extraHtml: list, note: NOTE, steps: [{ t: L("Звідки таблиця", "Where the table comes from"), l: [L("Мінімуми й відпочинок з таблиці USDA FSIS; для риби, яєць, залишків і запіканок також FDA.", "The minimums and rests come from the USDA FSIS chart; for fish, eggs, leftovers and casseroles also from the FDA chart.")] }], resText: name + ":\n" + M.FOODS.map((f) => f.name + ": " + (f.sign ? f.note : both(f.f) + (f.rest ? " + " + f.rest + L(" хв", " min") : ""))).join("\n") };
      }
      const rows = M.DONE.map((x) => { const a = M.pull(x, "thin"), b = M.pull(x, "large"); return { cells: [{ t: x.name, cls: "is-first" }, range(x.lo, x.hi), range(a.lo, a.hi), range(b.lo, b.hi), M.belowUsda(x) ? L("нижче мінімуму", "below the minimum") : L("не нижче мінімуму", "not below the minimum")] }; });
      const list = UI.list([L("Ступінь", "Doneness"), L("Подача", "Serving"), L("Зняти: тонкий", "Pull: thin"), L("Зняти: великий", "Pull: large"), L("USDA", "USDA")], rows, { w: "minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1fr)" });
      return { ok: true, expr: name, head: [L("ступенів", "levels"), String(rows.length)], headSub: name, subRaw: true, tiles: [{ k: L("Мінімум USDA", "USDA minimum"), v: both(M.USDA_MIN) + L(" + 3 хв", " + 3 min") }], extraHtml: box(h.esc, L("Rare, medium rare і medium нижчі за мінімум USDA для цілих шматків яловичини. Дітям, вагітним, літнім людям і людям з ослабленим імунітетом обирайте безпечний мінімум.", "Rare, medium rare and medium are below the USDA minimum for whole cuts of beef. For children, pregnant women, older adults and people with weakened immunity choose the safe minimum.")) + list + hint(L("Джерела: ", "Sources: ") + link("TW") + ", " + link("TP") + "."), note: NOTE, steps: [{ t: L("Як рахується зняття з вогню", "How the pull temperature is worked out"), l: [L("подача − carryover; carryover: тонкий 4 °F, великий 12,5 °F (середина діапазонів 3–5 і 10–15 °F)", "serving − carryover; carryover: thin 4 °F, large 12.5 °F (the middle of the 3–5 and 10–15 °F ranges)")] }], resText: name + ":\n" + M.DONE.map((x) => x.name + ": " + range(x.lo, x.hi)).join("\n") };
    },
    reset(h) { h.el("mtT").value = "usda"; }, fill(h) { h.el("mtT").value = "done"; },
    share(p, h) { p.set("mt", h.el("mtT").value); }, apply(qs, h) { if (["usda", "done"].includes(qs.get("mt"))) h.el("mtT").value = qs.get("mt"); }
  };
  return { modes: [safe, doneness, table], exactNote: false };
});
