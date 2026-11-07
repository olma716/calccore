/* ov-calc.js — температура духовки: конвертер °C / °F / газова марка з духовкою з вентилятором, таблиці відповідності, температури в тексті рецепта; залежить від km-data.js і ov-data.js */
PhysCalc.start(({ L }) => {
  const K = window.Km, O = window.Ov, UI = window.PhysUI;
  const IS_EN = L(false, true), DEC = IS_EN ? "." : ",", DEF_SCALE = L("c", "f"), MAXT = 4000;
  const S = { dC: "20", dF: "25", text: "" };
  const SAMPLE = L("Розігрійте духовку до 350°F. Випікайте 25-30 хвилин при 375 °F, потім 5 хвилин при газовій марці 6.", "Preheat the oven to 350°F. Bake for 25-30 minutes at 375°F, then 5 minutes at gas mark 6.");
  const NOTE = L("Таблиця газових марок для звичайної духовки (марка 3 = 170 °C, як у Currys; у Which? 160 °C), між рядками значення інтерполюються. Для духовки з вентилятором (конвекцією) температуру зазвичай знижують приблизно на 20 °C (≈ 25 °F): це загальне правило, у вашої духовки може бути інакше, дивіться інструкцію. Для газових духовок з вентилятором деякі джерела радять знижувати газову марку на 1. Реальна температура залежить від духовки та її калібрування: перевіряйте духовим термометром і орієнтуйтесь на стан страви.", "The gas mark table is for a conventional oven (gas mark 3 = 170 °C as in Currys; Which? gives 160 °C), values between rows are interpolated. For a fan (convection) oven the temperature is usually reduced by about 20 °C (≈ 25 °F): this is a general rule, your oven may differ, check its manual. For fan-assisted gas ovens some sources advise reducing the gas mark by 1. The real temperature depends on the oven and its calibration: check with an oven thermometer and go by how the dish looks.");
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const inp = (id, ph, max) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (max || 8) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const fold = (key, title, inner) => '<details class="ph__details ph__fold" data-keep="' + key + '"><summary>' + title + '</summary><div class="ph__foldBody">' + inner + "</div></details>";
  const bind = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); if (!e) return; e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); });
  const UNITS = [["c", "°C"], ["f", "°F"], ["g", L("Газова марка", "Gas Mark")]], OVENS = [["conv", L("Звичайна (верх і низ)", "Conventional (top and bottom)")], ["fan", L("З вентилятором (конвекція)", "Fan / convection")]];
  const GMX = L("марка ", "gas mark ");
  // ---- форматування ----
  const trim = (x) => String(Math.round(x * 10) / 10).replace(".", DEC);
  const tmp = (x) => { const r = Math.round(x); return (Math.abs(x - r) > 0.05 ? "≈ " : "") + r; };
  const gmShow = (g) => (g.below ? L("нижче ¼", "below ¼") : g.above ? L("вище 9", "above 9") : (g.v > 0 && Math.abs(g.v - Math.round(g.v * 4) / 4) > 0.02 ? "≈ " : "") + O.gmText(g.v));
  const gmRow = (g) => (g.below || g.above ? "—" : GMX + gmShow(g));
  const num = (s) => K.parseAmount(String(s).trim());
  const settings = () => fold("ovSet", L("Налаштування вентилятора", "Fan settings"), '<div class="ph__vars">' + fld("ovDC", L("Зниження для вентилятора, °C", "Fan reduction, °C"), inp("ovDC", "20", 3)) + fld("ovDF", L("Зниження для вентилятора, °F", "Fan reduction, °F"), inp("ovDF", "25", 3)) + "</div>" + hint(L("У духовці з вентилятором температуру зазвичай знижують приблизно на 20 °C (≈ 25 °F). Значення в шкалі, у якій ви вводите температуру, зсувається на це число; змініть його, якщо в інструкції до вашої духовки інакше.", "In a fan oven the temperature is usually reduced by about 20 °C (≈ 25 °F). A value in the scale you enter is shifted by this number; change it if your oven's manual says otherwise.")));
  const syncSet = (el) => { const a = el("ovDC"), b = el("ovDF"); if (a) S.dC = a.value; if (b) S.dF = b.value; const t = el("ovTx"); if (t) S.text = t.value; };
  const wireSet = (el, h) => { el("ovDC").value = S.dC; el("ovDF").value = S.dF; bind(el, h.maybeCalc, ["ovDC", "ovDF"]); ["ovDC", "ovDF"].forEach((id) => el(id).addEventListener("input", () => syncSet(el))); };
  const parseD = (v) => { const t = String(v).trim(); if (!t) return 0; if (/^0+([.,]0*)?$/.test(t)) return 0; return num(t); };
  const readSet = (el) => { syncSet(el); return { dC: parseD(el("ovDC").value), dF: parseD(el("ovDF").value) }; };
  const setErr = L("Зниження для вентилятора: число від 0 до 100.", "Fan reduction: a number from 0 to 100.");
  const shareSet = (p) => { if (S.dC !== "20") p.set("od", S.dC.slice(0, 3)); if (S.dF !== "25") p.set("of", S.dF.slice(0, 3)); };
  const applySet = (qs, el) => { if (qs.has("od") && /^\d{1,3}$/.test(qs.get("od"))) { S.dC = qs.get("od"); el("ovDC").value = S.dC; } if (qs.has("of") && /^\d{1,3}$/.test(qs.get("of"))) { S.dF = qs.get("of"); el("ovDF").value = S.dF; } };
  const badSet = (s) => s.dC === null || s.dF === null || s.dC > 100 || s.dF > 100 || s.dC < 0 || s.dF < 0;

  // ====================== конвертер ======================
  const conv = {
    key: "conv", type: "custom", req: () => ["ovT"], nameUk: "Конвертер", nameEn: "Converter",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("ovT", L("Температура", "Temperature"), inp("ovT", "180")) + fld("ovU", L("Шкала", "Scale"), sel("ovU", UNITS, "c")) + fld("ovY", L("Духовка в рецепті", "Oven in the recipe"), sel("ovY", OVENS, "conv"), true) + "</div>" + settings() + hint(L("Газова марка: від ¼ до 9 (можна писати 1/4, ½). Температура в рецепті зазвичай дана для звичайної духовки; якщо в рецепті вказано духовку з вентилятором, оберіть це вище.", "Gas mark: from ¼ to 9 (you can write 1/4, ½). A recipe temperature is usually for a conventional oven; if the recipe says fan oven, choose it above."));
      wireSet(el, h); bind(el, h.maybeCalc, ["ovT", "ovU", "ovY"]);
    },
    calc(h) {
      const { el, esc } = h, raw = el("ovT").value.trim();
      if (!raw) return { ok: false, incomplete: true };
      const st = readSet(el); if (badSet(st)) return { ok: false, msg: setErr };
      const v = num(raw), u = el("ovU").value, ty = el("ovY").value;
      if (v === null) return { ok: false, msg: L("Температура: додатне число (можна дробом для газової марки: 1/4, ½).", "Temperature: a positive number (a fraction is fine for the gas mark: 1/4, ½).") };
      if (u === "g" && !(v >= 0.25 && v <= 9)) return { ok: false, msg: L("Газова марка: від ¼ до 9.", "Gas mark: from ¼ to 9.") };
      if (u === "c" && v > 500) return { ok: false, msg: L("Температура до 500 °C.", "The temperature is up to 500 °C.") };
      if (u === "f" && v > 932) return { ok: false, msg: L("Температура до 932 °F.", "The temperature is up to 932 °F.") };
      const r = O.build(v, u, ty, st.dC, st.dF), cv = r.conv, fn = r.fan, other = ty === "conv";
      const head = tmp(cv.c) + " °C = " + tmp(cv.f) + " °F";
      const warn = cv.c < 100 || cv.c > 300 ? '<div class="ph__hintbox ph__mt12">' + esc(L("Температура поза типовим діапазоном духовки (100–300 °C): перевірте значення й шкалу.", "The temperature is outside a typical oven range (100–300 °C): check the value and the scale.")) + "</div>" : "";
      const cPos = u === "f" && cv.gm.v !== undefined ? O.gmToC(cv.gm.v) : cv.c, br = O.bracket(cPos), pos = br ? (br.exact ? GMX + O.gmText(br.exact[0]) : L("між марками ", "between marks ") + O.gmText(br.lo[0]) + L(" і ", " and ") + O.gmText(br.hi[0])) : L("поза шкалою ¼–9", "outside the ¼–9 scale");
      const disk = O.roundStep(cv.c, 5) + " °C · " + O.roundStep(cv.f, 25) + " °F";
      const hd = [L("Шкала", "Scale"), L("Звичайна", "Conventional") + (other ? L(" (як у рецепті)", " (as in the recipe)") : ""), L("З вентилятором", "Fan") + (other ? "" : L(" (як у рецепті)", " (as in the recipe)"))];
      const rows = [{ cells: [{ t: "°C", cls: "is-first" }, tmp(cv.c), tmp(fn.c)] }, { cells: [{ t: "°F", cls: "is-first" }, tmp(cv.f), tmp(fn.f)] }, { cells: [{ t: L("Газова марка", "Gas Mark"), cls: "is-first" }, gmShow(cv.gm), gmShow(fn.gm)] }];
      const extra = UI.list(hd, rows, { w: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" }) + warn;
      const tiles = [{ k: L("Режим", "Mode"), v: O.descAt(cPos) }, { k: L("Положення на шкалі газу", "Place on the gas scale"), v: pos }, { k: L("На диску (5 °C, 25 °F)", "On the dial (5 °C, 25 °F)"), v: disk }];
      const st1 = u === "c" ? { t: L("°C → °F", "°C → °F"), l: [trim(v) + " × 9/5 + 32 = " + trim(O.cToF(v)) + " °F"] } : u === "f" ? { t: L("°F → °C", "°F → °C"), l: ["(" + trim(v) + " − 32) × 5/9 = " + trim(O.fToC(v)) + " °C"] } : { t: L("Газова марка → °C, °F", "Gas Mark → °C, °F"), l: [GMX + O.gmText(v) + " → " + trim(O.gmToC(v)) + " °C, " + trim(O.gmToF(v)) + " °F"], note: L("Між рядками таблиці значення інтерполюються.", "Between table rows the values are interpolated.") };
      const steps = [st1, { t: L("Духовка з вентилятором", "Fan oven"), l: [u === "f" ? tmp(cv.f) + " − " + trim(st.dF) + " = " + tmp(fn.f) + " °F" : tmp(cv.c) + " − " + trim(st.dC) + " = " + tmp(fn.c) + " °C"], note: other ? L("Значення в рецепті для звичайної духовки: для вентилятора температуру знижуємо.", "The recipe value is for a conventional oven: for a fan oven we reduce it.") : L("Значення в рецепті для вентилятора: для звичайної духовки температуру підвищуємо.", "The recipe value is for a fan oven: for a conventional oven we raise it.") }, { t: L("Газова марка", "Gas Mark"), l: [tmp(cv.c) + " °C → " + gmRow(cv.gm)], note: L("Шкала за таблицею для звичайної духовки, між рядками інтерполяція.", "From the table for a conventional oven, interpolated between rows.") }];
      return { ok: true, expr: (u === "g" ? L("Газова марка ", "Gas Mark ") + O.gmText(v) : trim(v) + (u === "c" ? " °C" : " °F")) + " · " + OVENS.find((o) => o[0] === ty)[1], head: [L("для звичайної духовки", "conventional oven"), head], headSub: L("з вентилятором: ", "fan oven: ") + tmp(fn.c) + " °C = " + tmp(fn.f) + " °F · " + gmRow(cv.gm), subRaw: true, tiles, extraHtml: extra, note: NOTE, steps, resText: head + " (" + gmRow(cv.gm) + "); " + L("з вентилятором: ", "fan oven: ") + tmp(fn.c) + " °C = " + tmp(fn.f) + " °F" };
    },
    reset(h) { const { el } = h; el("ovT").value = ""; el("ovU").value = "c"; el("ovY").value = "conv"; },
    fill(h) { const { el } = h; el("ovT").value = L("180", "350"); el("ovU").value = L("c", "f"); el("ovY").value = "conv"; },
    share(p, h) { const { el } = h; if (el("ovT").value.trim()) p.set("ot", el("ovT").value.trim().slice(0, 8)); p.set("ou", el("ovU").value); p.set("oy", el("ovY").value); syncSet(el); shareSet(p); },
    apply(qs, h) { const { el } = h; if (qs.has("ot")) el("ovT").value = qs.get("ot").slice(0, 8); if (["c", "f", "g"].includes(qs.get("ou"))) el("ovU").value = qs.get("ou"); if (["conv", "fan"].includes(qs.get("oy"))) el("ovY").value = qs.get("oy"); applySet(qs, el); }
  };

  // ====================== таблиці ======================
  const TBLS = [["gas", L("Газові марки ¼–9", "Gas marks ¼–9")], ["c2f", L("°C → °F (100–260 °C)", "°C → °F (100–260 °C)")], ["f2c", L("°F → °C (225–500 °F)", "°F → °C (225–500 °F)")]];
  const table = {
    key: "table", type: "custom", req: () => [], nameUk: "Таблиця", nameEn: "Table",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("ovTb", L("Таблиця", "Table"), sel("ovTb", TBLS, "gas"), true) + "</div>" + settings() + hint(L("Таблиця показує значення для звичайної духовки й еквівалент для духовки з вентилятором.", "The table shows the values for a conventional oven and the equivalent for a fan oven."));
      wireSet(el, h); bind(el, h.maybeCalc, ["ovTb"]);
    },
    calc(h) {
      const { el } = h, st = readSet(el); if (badSet(st)) return { ok: false, msg: setErr };
      const kind = el("ovTb").value, name = TBLS.find((t) => t[0] === kind)[1];
      let cols, rows, steps;
      if (kind === "gas") {
        cols = [L("Марка", "Gas Mark"), "°C", "°F", L("Вентилятор, °C", "Fan, °C"), L("Режим", "Mode")];
        rows = O.GAS.map((r, i) => ({ cells: [{ t: O.gmText(r[0]), cls: "is-first" }, String(r[1]), String(r[2]), tmp(r[1] - st.dC), O.NAMES[i]] }));
        steps = [{ t: L("Звідки таблиця", "Where the table comes from"), l: [L("Значення для звичайної духовки; марка 3 = 170 °C.", "Values for a conventional oven; gas mark 3 = 170 °C.")], note: L("У Which? марка 3 = 160 °C (вентилятор 140 °C): дивіться інструкцію вашої духовки.", "Which? gives gas mark 3 = 160 °C (fan 140 °C): check your oven's manual.") }];
      } else if (kind === "c2f") {
        cols = ["°C", "°F", L("Марка", "Gas Mark"), L("Вентилятор, °C", "Fan, °C"), L("Режим", "Mode")];
        rows = []; for (let c = 100; c <= 260; c += 10) { const g = O.cToGm(c); rows.push({ cells: [{ t: String(c), cls: "is-first" }, tmp(O.cToF(c)), gmRow(g), tmp(c - st.dC), O.descAt(c)] }); }
        steps = [{ t: L("Формула", "Formula"), l: ["°F = °C × 9/5 + 32"] }];
      } else {
        cols = ["°F", "°C", L("Марка", "Gas Mark"), L("Вентилятор, °F", "Fan, °F"), L("Режим", "Mode")];
        rows = []; for (let f = 225; f <= 500; f += 25) { const c = O.fToC(f), g = O.fToGm(f); rows.push({ cells: [{ t: String(f), cls: "is-first" }, tmp(c), gmRow(g), tmp(f - st.dF), O.descAt(c)] }); }
        steps = [{ t: L("Формула", "Formula"), l: ["°C = (°F − 32) × 5/9"] }];
      }
      const list = UI.list(cols, rows, { w: "minmax(0, 0.8fr) minmax(0, 0.8fr) minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.3fr)" });
      return { ok: true, expr: name, head: [L("рядків", "rows"), String(rows.length)], headSub: name, subRaw: true, tiles: [{ k: L("Зниження для вентилятора", "Fan reduction"), v: "−" + trim(st.dC) + " °C / −" + trim(st.dF) + " °F" }], extraHtml: list, note: NOTE, steps, resText: name + ": " + rows.map((r) => r.cells.map((c) => (typeof c === "string" ? c : c.t)).join(" | ")).join("\n") };
    },
    reset(h) { h.el("ovTb").value = "gas"; },
    fill(h) { h.el("ovTb").value = "c2f"; },
    share(p, h) { p.set("otb", h.el("ovTb").value); syncSet(h.el); shareSet(p); },
    apply(qs, h) { const { el } = h; if (["gas", "c2f", "f2c"].includes(qs.get("otb"))) el("ovTb").value = qs.get("otb"); applySet(qs, el); }
  };

  // ====================== температури в тексті ======================
  const TARGETS = [["c", L("у °C", "to °C")], ["f", L("у °F", "to °F")], ["g", L("у газову марку", "to gas mark")]];
  const outBox = (text, esc) => '<div class="ph__sub">' + L("Текст з перерахованими температурами", "Text with converted temperatures") + '</div><textarea class="ph__input ph__ta ph__out" readonly rows="6" aria-label="' + L("Результат", "Result") + '">' + esc(text) + "</textarea>";
  const text = {
    key: "text", type: "custom", req: () => ["ovTx"], nameUk: "Температури в тексті", nameEn: "Temperatures in text",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full" id="ovTxW"><label class="ph__label" for="ovTx">' + L("Текст рецепта", "Recipe text") + '</label><textarea class="ph__input ph__ta" id="ovTx" rows="6" maxlength="' + MAXT + '" autocomplete="off" spellcheck="false" placeholder="' + L("Випікайте при 350°F 30 хвилин", "Bake at 350°F for 30 minutes") + '" aria-label="' + L("Текст рецепта", "Recipe text") + '"></textarea></div>' + fld("ovG", L("Перерахувати", "Convert"), sel("ovG", TARGETS, "c"), true) + "</div>" + fold("ovTxSet", L("Налаштування", "Settings"), '<div class="ph__vars">' + fld("ovF1", L("Духовка в рецепті", "Oven in the recipe"), sel("ovF1", OVENS, "conv")) + fld("ovF2", L("Моя духовка", "My oven"), sel("ovF2", OVENS, "conv")) + fld("ovDef", L("Температура без позначки шкали", "A temperature with no scale"), sel("ovDef", [["c", "°C"], ["f", "°F"]], DEF_SCALE)) + fld("ovStep", L("Округлення", "Rounding"), sel("ovStep", [["1", L("До зручного: 5 °C, 25 °F", "To a handy value: 5 °C, 25 °F")], ["0", L("До цілого", "To a whole number")]], "1")) + "</div>") + settings() + hint(L("Калькулятор знаходить у тексті температури на кшталт 350°F, 180 °C, 180 degrees, 350° і газову марку 4, і замінює їх у вибраній шкалі. Цілий текст не змінюється, лише температури.", "The calculator finds temperatures such as 350°F, 180 °C, 180 degrees, 350° and gas mark 4 in the text and replaces them in the chosen scale. The rest of the text stays unchanged."));
      el("ovTx").value = S.text; wireSet(el, h); bind(el, h.maybeCalc, ["ovTx", "ovG", "ovF1", "ovF2", "ovDef", "ovStep"]); el("ovTx").addEventListener("input", () => syncSet(el));
    },
    calc(h) {
      const { el, esc } = h; syncSet(el); const src = el("ovTx").value.slice(0, MAXT);
      if (!src.trim()) return { ok: false, incomplete: true };
      const st = readSet(el); if (badSet(st)) return { ok: false, msg: setErr };
      const o = { def: el("ovDef").value, target: el("ovG").value, from: el("ovF1").value, to: el("ovF2").value, dC: st.dC, dF: st.dF, step: el("ovStep").value === "1" };
      const r = O.convertText(src, o);
      if (!r.rows.length) return { ok: false, msg: L("Температур не знайдено. Підходять записи 350°F, 180 °C, 180 градусів, 350 degrees F, 350° чи газова марка 4.", "No temperatures found. Entries such as 350°F, 180 °C, 180 degrees, 350 degrees F, 350° or gas mark 4 work.") };
      const done = r.rows.filter((x) => x.state === "ok").length, same = r.rows.filter((x) => x.state === "same").length, out = r.rows.filter((x) => x.state === "out").length;
      const rows = r.rows.map((x) => ({ cells: [{ t: x.raw, cls: "muted" }, { t: x.state === "ok" ? x.repl : x.raw, cls: "strong" }, { t: x.state === "out" ? L("поза шкалою газової марки (110–240 °C)", "outside the gas mark scale (110–240 °C)") : x.state === "same" ? L("та сама шкала", "already in this scale") : x.assumed ? L("шкалу не вказано: прийнято ", "no scale given: assumed ") + (x.unit === "f" ? "°F" : "°C") : "", cls: "muted" }] }));
      const table = UI.list([L("Було", "Original"), L("Стало", "Converted"), L("Примітка", "Note")], rows, { w: "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.3fr)" });
      const shift = o.from !== o.to ? [L("Духовка в рецепті й ваша різні: температури зсунуто на ", "The recipe's oven and yours differ: temperatures are shifted by ") + trim(o.dC) + " °C / " + trim(o.dF) + " °F."] : [];
      const steps = [{ t: L("Знаходимо температури", "Finding the temperatures"), l: [L("Знайдено: ", "Found: ") + r.rows.length + L("; перераховано ", "; converted ") + done + (same ? L("; у тій самій шкалі ", "; already in this scale ") + same : "") + (out ? L("; поза шкалою ", "; outside the scale ") + out : "")], note: L("Шукаємо числа з °C, °F, словами «градусів»/«degrees» чи без шкали (прийнято шкалу з налаштувань), а також газову марку.", "We look for numbers with °C, °F, the words “degrees”, or with no scale (the scale from the settings is assumed), and for the gas mark.") }, { t: L("Перераховуємо", "Converting"), l: [L("Формули: ", "Formulas: ") + "°F = °C × 9/5 + 32; °C = (°F − 32) × 5/9"].concat(shift), note: o.step ? L("Результат округлено до зручного значення: 5 °C чи 25 °F.", "The result is rounded to a handy value: 5 °C or 25 °F.") : "" }];
      return { ok: true, expr: L("Температури в тексті", "Temperatures in text") + " " + TARGETS.find((t) => t[0] === o.target)[1], head: [L("знайдено температур", "temperatures found"), String(r.rows.length)], headSub: L("перераховано ", "converted ") + done, subRaw: true, tiles: [{ k: L("Знайдено", "Found"), v: String(r.rows.length) }, { k: L("Перераховано", "Converted"), v: String(done) }, { k: L("Без змін", "Unchanged"), v: String(same + out) }], extraHtml: table + outBox(r.text, esc), note: NOTE, steps, resText: r.text };
    },
    reset(h) { const { el } = h; el("ovTx").value = ""; S.text = ""; },
    fill(h) { const { el } = h; el("ovTx").value = SAMPLE; S.text = SAMPLE; el("ovG").value = "c"; },
    share(p, h) { const { el } = h; syncSet(el); if (S.text.trim()) p.set("ox", S.text.slice(0, 800)); p.set("og", el("ovG").value); p.set("oy1", el("ovF1").value); p.set("oy2", el("ovF2").value); p.set("oa", el("ovDef").value); p.set("or", el("ovStep").value); shareSet(p); },
    apply(qs, h) { const { el } = h; if (qs.has("ox")) { S.text = qs.get("ox").slice(0, 800); el("ovTx").value = S.text; } [["og", "ovG", ["c", "f", "g"]], ["oy1", "ovF1", ["conv", "fan"]], ["oy2", "ovF2", ["conv", "fan"]], ["oa", "ovDef", ["c", "f"]], ["or", "ovStep", ["0", "1"]]].forEach(([k, id, ok]) => { if (ok.includes(qs.get(k))) el(id).value = qs.get(k); }); applySet(qs, el); }
  };
  return { modes: [conv, table, text], exactNote: false };
});
