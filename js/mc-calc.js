/* mc-calc.js — калькулятор БЖУ: розподіл за ціллю, за співвідношенням і калорії з грамів */
PhysCalc.start(({ L }) => {
  const M = window.Mc, UI = window.PhysUI;
  const SEP = L(",", ".");
  const fnum = (x, d = 1) => { const v = Math.round(x * 10 ** d) / 10 ** d; return String(v).replace(".", SEP); };
  const kc = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const num = (s) => { const t = String(s).replace(/\s+/g, "").replace(",", "."); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
  const KCAL = L("ккал", "kcal"), G = L("г", "g");
  const NOTE = L("Це оцінка для планування, а не медична порада: норму білка, жирів і калорій індивідуально уточнює лікар чи дієтолог (особливо при хворобах нирок, вагітності й дієтах на кшталт кето).", "This is an estimate for planning, not medical advice: protein, fat and calories are best adjusted individually by a doctor or dietitian (especially with kidney disease, pregnancy and diets such as keto).");
  const COL = { p: "#3d63c9", f: "#f2b705", c: "#2faa73" };
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (ml || 6) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const dot = (c) => '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;background:' + c + '"></span>';
  const NAMES = { p: L("Білки", "Protein"), f: L("Жири", "Fat"), c: L("Вуглеводи", "Carbs") };
  const unitF = () => fld("mcU", L("Одиниці ваги", "Weight unit"), sel("mcU", [["kg", L("Кілограми (кг)", "Kilograms (kg)")], ["lb", L("Фунти (lb)", "Pounds (lb)")]], "kg"));
  const wLabel = (el) => (el("mcU").value === "lb" ? L("Вага, lb", "Weight, lb") : L("Вага, кг", "Weight, kg"));
  const refreshU = (el) => { if (el("mcWL")) el("mcWL").textContent = wLabel(el); };
  const weightF = (opt) => fld("mcW", '<span id="mcWL">' + L("Вага, кг", "Weight, kg") + "</span>" + (opt ? L(" (необов'язково)", " (optional)") : ""), inp("mcW", L("напр.: 75", "e.g.: 75")));
  const setP = (el, id, v) => { const e = el(id); if (e && v !== undefined) e.value = v; };
  const shareMap = (map, p, el) => map.forEach(([k, id]) => { const e = el(id); if (e && String(e.value).trim() !== "") p.set(k, String(e.value).trim()); });
  const applyMap = (map, qs, el) => map.forEach(([k, id]) => { const e = el(id); if (!e || !qs.has(k)) return; const v = qs.get(k).slice(0, 12); if (e.tagName === "SELECT") { if ([...e.options].some((o) => o.value === v)) e.value = v; } else e.value = v; });
  const bar = (r) => {
    const W = 600, H0 = 70, pl = 6, y = 8, hh = 34, tot = r.pK + r.fK + r.cK || 1; let x = pl; const w = W - 2 * pl;
    const segs = [["p", r.pK], ["f", r.fK], ["c", r.cK]].map(([k, v]) => { const sw = (w * v) / tot, cx = x + sw / 2, t = sw > 70 ? '<text x="' + cx.toFixed(1) + '" y="' + (y + hh / 2 + 4) + '" text-anchor="middle" font-size="12" font-weight="800" fill="' + (k === "f" ? "#3b2a00" : "#fff") + '">' + NAMES[k] + " " + Math.round((v / tot) * 100) + "%</text>" : ""; const out = sw > 0.5 ? '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + sw.toFixed(1) + '" height="' + hh + '" fill="' + COL[k] + '"/>' + t : ""; x += sw; return out; }).join("");
    return '<svg class="ph__chart" viewBox="0 0 ' + W + " " + H0 + '" width="100%" role="img" aria-label="' + L("Частки білків, жирів і вуглеводів", "Shares of protein, fat and carbs") + '">' + segs + "</svg>";
  };
  // таблиця макро
  const macroTable = (r, meals) => {
    const rows = ["p", "f", "c"].map((k) => { const g = r[k + "G"], kk = r[k + "K"], pc = r[k + "Pct"]; return { cells: [{ h: dot(COL[k]) + NAMES[k], cls: "is-first" }, { t: fnum(g, 0) + " " + G, cls: "chip" }, kc(kk) + " " + KCAL, fnum(pc, 1) + " %"].concat(meals ? [fnum(g / meals, 0) + " " + G] : []) }; });
    const head = [L("Поживна речовина", "Nutrient"), L("На день", "Per day"), L("Калорії", "Calories"), L("Частка", "Share")].concat(meals ? [L("На прийом", "Per meal")] : []);
    return UI.list(head, rows, { w: "minmax(0, 1.3fr) 110px 110px 90px" + (meals ? " 100px" : "") });
  };
  const kcDay = (r) => kc(r.total);

  // ----- за ціллю -----
  const MAPG = [["ca", "mcC"], ["un", "mcU"], ["wt", "mcW"], ["gl", "mcG"], ["pk", "mcP"], ["ft", "mcF"], ["ml", "mcM"]];
  const applyGoalDefaults = (el) => { const g = M.findGoal(el("mcG").value); setP(el, "mcP", String(g.p).replace(".", SEP)); setP(el, "mcF", String(g.f)); };
  const goal = {
    key: "goal", type: "custom", req: ({ el }) => ["mcC", "mcW"], nameUk: "БЖУ за ціллю", nameEn: "Macros by goal",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("mcC", L("Калорії на день, ккал", "Calories per day, kcal"), inp("mcC", L("напр.: 2200", "e.g.: 2200"), 5)) + weightF() + unitF() + fld("mcG", L("Ціль", "Goal"), sel("mcG", M.GOALS.map((g) => [g.id, L(g.uk, g.en)]), "maintain")) + fld("mcP", L("Білок, г на кг ваги", "Protein, g per kg"), inp("mcP", "1,8", 4)) + fld("mcF", L("Жир, % калорій", "Fat, % of calories"), inp("mcF", "30", 3)) + fld("mcM", L("Прийомів їжі", "Meals per day"), sel("mcM", [3, 4, 5, 6].map((n) => [n, String(n)]), 4)) + '</div><div class="ph__hint ph__mt12">' + L("Білок рахується від ваги, жир — відсоток калорій, вуглеводи — залишок. Типові значення залежать від цілі, їх можна змінити. Не знаєте калорій — скористайтеся калькулятором калорій.", "Protein is counted from weight, fat is a share of calories, carbs are the remainder. Typical values depend on the goal and can be changed. If you do not know your calories, use the calorie calculator.") + "</div>";
      applyGoalDefaults(el);
      ["mcC", "mcW", "mcP", "mcF"].forEach((id) => el(id).addEventListener("input", maybeCalc)); ["mcU", "mcM"].forEach((id) => el(id).addEventListener("change", () => { refreshU(el); maybeCalc(); }));
      el("mcG").addEventListener("change", () => { applyGoalDefaults(el); maybeCalc(); });
    },
    calc(h) {
      const { el } = h, cs = el("mcC").value.trim(), ws = el("mcW").value.trim();
      if (!cs || !ws) return { ok: false, incomplete: true };
      const cal = num(cs), wv = num(ws), pk = num(el("mcP").value), fp = num(el("mcF").value), meals = Number(el("mcM").value), lb = el("mcU").value === "lb";
      if (cal === null || cal < 800 || cal > 10000) return { ok: false, msg: L("Калорії — від 800 до 10 000 ккал на день.", "Calories — from 800 to 10,000 kcal per day.") };
      if (wv === null) return { ok: false, msg: L("Вага — число.", "Weight is a number.") };
      const kg = lb ? wv * M.KG_PER_LB : wv;
      if (kg < 30 || kg > 300) return { ok: false, msg: L("Вага — від 30 до 300 кг (66–661 lb).", "Weight — from 30 to 300 kg (66–661 lb).") };
      if (pk === null || pk < 0.8 || pk > 3) return { ok: false, msg: L("Білок — від 0,8 до 3,0 г на кг ваги.", "Protein — from 0.8 to 3.0 g per kg of weight.") };
      if (fp === null || fp < 15 || fp > 45) return { ok: false, msg: L("Жир — від 15 до 45 % калорій.", "Fat — from 15 to 45% of calories.") };
      const r = M.byGoal(cal, kg, pk, fp), warns = [];
      if (r.over > 0) warns.push(L("Білок і жир потребують " + kc(r.pK + r.fK) + " ккал — більше за задані " + kc(cal) + ". Вуглеводи обнулено, сума стала " + kc(r.total) + " ккал: збільште калорії або зменште білок чи жир.", "Protein and fat need " + kc(r.pK + r.fK) + " kcal — more than the " + kc(cal) + " you set. Carbs are zeroed and the total became " + kc(r.total) + " kcal: raise the calories or lower protein or fat."));
      if (pk > 2.4) warns.push(L("Білок понад ~2,4 г/кг — вище звичних для тренованих людей діапазонів (1,4–2,0 г/кг, у дефіциті трохи більше).", "Protein above ~2.4 g/kg is higher than the usual ranges for trained people (1.4–2.0 g/kg, a bit more in a deficit)."));
      if (fp < 20) warns.push(L("Жир менше 20 % калорій — нижче поширеного мінімуму.", "Fat below 20% of calories is under the common minimum."));
      const fib = M.fiber(cal), gl = M.findGoal(el("mcG").value);
      const steps = [{ t: L("Білки", "Protein"), l: [fnum(pk, 2) + " " + L("г/кг", "g/kg") + " × " + fnum(kg, 1) + " " + L("кг", "kg") + " = " + fnum(r.pG, 1) + " " + G, fnum(r.pG, 1) + " × 4 = " + kc(r.pK) + " " + KCAL] }, { t: L("Жири", "Fat"), l: [kc(cal) + " × " + fnum(fp, 0) + " % = " + kc(r.fK) + " " + KCAL, kc(r.fK) + " / 9 = " + fnum(r.fG, 1) + " " + G] }, { t: L("Вуглеводи — залишок", "Carbs — the remainder"), l: [kc(cal) + " − " + kc(r.pK) + " − " + kc(r.fK) + " = " + kc(Math.max(0, cal - r.pK - r.fK)) + " " + KCAL, kc(r.cK) + " / 4 = " + fnum(r.cG, 1) + " " + G], note: L("Енергетична цінність: білки й вуглеводи по 4 ккал, жири 9 ккал на грам.", "Energy value: protein and carbs 4 kcal, fat 9 kcal per gram.") }];
      return { ok: true, expr: L(gl.uk, gl.en) + " · " + fnum(wv, 1) + " " + (lb ? "lb" : L("кг", "kg")), head: [L("калорій на день", "kcal per day"), kcDay(r)], headSub: L("Б ", "P ") + fnum(r.pG, 0) + " " + G + L(" · Ж ", " · F ") + fnum(r.fG, 0) + " " + G + L(" · В ", " · C ") + fnum(r.cG, 0) + " " + G, subRaw: true, tiles: [{ k: L("Білки", "Protein"), v: fnum(r.pG, 0) + " " + G }, { k: L("Жири", "Fat"), v: fnum(r.fG, 0) + " " + G }, { k: L("Вуглеводи", "Carbs"), v: fnum(r.cG, 0) + " " + G }, { k: L("Клітковина", "Fibre"), v: "≈ " + fnum(fib, 0) + " " + G }, { k: L("Білка на прийом", "Protein per meal"), v: fnum(r.pG / meals, 0) + " " + G }], extraHtml: '<div class="ph__sub">' + L("Розподіл на день", "Daily split") + "</div>" + macroTable(r, meals) + bar(r) + warnHtml(warns) + hint(L("Клітковина — орієнтир 14 г на кожні 1000 ккал.", "Fibre — a guide of 14 g per 1000 kcal.")), note: NOTE, steps, resText: L("БЖУ на ", "Macros for ") + kc(cal) + " " + KCAL + ": " + L("білки ", "protein ") + fnum(r.pG, 0) + " " + G + L(", жири ", ", fat ") + fnum(r.fG, 0) + " " + G + L(", вуглеводи ", ", carbs ") + fnum(r.cG, 0) + " " + G };
    },
    reset(h) { const { el } = h; ["mcC", "mcW"].forEach((id) => setP(el, id, "")); setP(el, "mcU", "kg"); setP(el, "mcG", "maintain"); setP(el, "mcM", "4"); applyGoalDefaults(el); refreshU(el); },
    fill(h) { const { el } = h; setP(el, "mcC", "2200"); setP(el, "mcU", "kg"); setP(el, "mcW", "75"); setP(el, "mcG", "maintain"); setP(el, "mcM", "4"); applyGoalDefaults(el); refreshU(el); },
    share(p, h) { const { el } = h; if (!el("mcC").value.trim() || !el("mcW").value.trim()) return; shareMap(MAPG, p, el); },
    apply(qs, h) { const { el } = h; if (qs.has("gl")) applyMap([["gl", "mcG"]], qs, el); applyGoalDefaults(el); applyMap(MAPG, qs, el); refreshU(el); }
  };

  // ----- за співвідношенням -----
  const MAPR = [["ca", "mcC"], ["ps", "mcS"], ["pp", "mcPp"], ["fp", "mcFp"], ["cp", "mcCp"], ["un", "mcU"], ["wt", "mcW"]];
  const ratio = {
    key: "ratio", type: "custom", req: ({ el }) => ["mcC"], nameUk: "За співвідношенням", nameEn: "By ratio",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("mcC", L("Калорії на день, ккал", "Calories per day, kcal"), inp("mcC", L("напр.: 2200", "e.g.: 2200"), 5), true) + fld("mcS", L("Готова схема (Б / Ж / В, %)", "Preset (P / F / C, %)"), sel("mcS", M.PRESETS.map((p) => [p.id, L(p.uk, p.en) + " — " + p.p + " / " + p.f + " / " + p.c]).concat([["custom", L("Власні відсотки", "Custom percentages")]]), "athletic"), true) + fld("mcPp", L("Білки, %", "Protein, %"), inp("mcPp", "30", 3)) + fld("mcFp", L("Жири, %", "Fat, %"), inp("mcFp", "30", 3)) + fld("mcCp", L("Вуглеводи, %", "Carbs, %"), inp("mcCp", "40", 3)) + weightF(true) + unitF() + '</div><div class="ph__hint ph__mt12">' + L("Сума відсотків має дорівнювати 100. Готові схеми — приклади розподілу, а не рекомендації для кожного.", "The percentages must add up to 100. The presets are examples of a split, not recommendations for everyone.") + "</div>";
      const fillPreset = () => { const p = M.PRESETS.find((q) => q.id === el("mcS").value); if (p) { setP(el, "mcPp", p.p); setP(el, "mcFp", p.f); setP(el, "mcCp", p.c); } };
      fillPreset();
      el("mcS").addEventListener("change", () => { fillPreset(); maybeCalc(); });
      ["mcPp", "mcFp", "mcCp"].forEach((id) => el(id).addEventListener("input", () => { el("mcS").value = "custom"; maybeCalc(); }));
      ["mcC", "mcW"].forEach((id) => el(id).addEventListener("input", maybeCalc)); el("mcU").addEventListener("change", () => { refreshU(el); maybeCalc(); });
    },
    calc(h) {
      const { el } = h, cs = el("mcC").value.trim();
      if (!cs) return { ok: false, incomplete: true };
      const cal = num(cs), pp = num(el("mcPp").value), fp = num(el("mcFp").value), cp = num(el("mcCp").value);
      if (cal === null || cal < 800 || cal > 10000) return { ok: false, msg: L("Калорії — від 800 до 10 000 ккал на день.", "Calories — from 800 to 10,000 kcal per day.") };
      if (pp === null || fp === null || cp === null || [pp, fp, cp].some((v) => v < 0 || v > 100)) return { ok: false, msg: L("Відсотки — числа від 0 до 100.", "Percentages are numbers from 0 to 100.") };
      const sum = pp + fp + cp;
      if (Math.abs(sum - 100) > 0.5) return { ok: false, msg: L("Сума відсотків — " + fnum(sum, 1) + ", а має бути 100.", "The percentages add up to " + fnum(sum, 1) + ", but must be 100.") };
      const r = M.byRatio(cal, pp, fp, cp), ws = el("mcW").value.trim(), lb = el("mcU").value === "lb"; let perKg = null; const warns = [];
      if (ws) { const wv = num(ws); if (wv === null) return { ok: false, msg: L("Вага — число.", "Weight is a number.") }; const kg = lb ? wv * M.KG_PER_LB : wv; if (kg < 30 || kg > 300) return { ok: false, msg: L("Вага — від 30 до 300 кг (66–661 lb).", "Weight — from 30 to 300 kg (66–661 lb).") }; perKg = r.pG / kg; if (perKg > 2.4) warns.push(L("Білок вийшов " + fnum(perKg, 1) + " г на кг — вище звичних 1,4–2,0 г/кг для тренованих.", "Protein comes to " + fnum(perKg, 1) + " g per kg — above the usual 1.4–2.0 g/kg for trained people.")); }
      if (fp > 45) warns.push(L("Жир понад 45 % калорій — це дуже жирова схема (як кето), узгодьте з лікарем.", "Fat above 45% of calories is a very high-fat pattern (like keto): agree it with a doctor."));
      if (cp < 20) warns.push(L("Вуглеводів менше 20 % калорій — низьковуглеводна схема, не для всіх.", "Carbs below 20% of calories — a low-carb pattern, not for everyone."));
      const pre = M.PRESETS.find((q) => q.id === el("mcS").value), fib = M.fiber(cal);
      const steps = [{ t: L("Калорії кожної речовини", "Calories of each nutrient"), l: [L("Білки: ", "Protein: ") + kc(cal) + " × " + fnum(pp, 0) + " % = " + kc(r.pK) + " " + KCAL, L("Жири: ", "Fat: ") + kc(cal) + " × " + fnum(fp, 0) + " % = " + kc(r.fK) + " " + KCAL, L("Вуглеводи: ", "Carbs: ") + kc(cal) + " × " + fnum(cp, 0) + " % = " + kc(r.cK) + " " + KCAL] }, { t: L("Переводимо в грами", "Converting to grams"), l: [kc(r.pK) + " / 4 = " + fnum(r.pG, 1) + " " + G, kc(r.fK) + " / 9 = " + fnum(r.fG, 1) + " " + G, kc(r.cK) + " / 4 = " + fnum(r.cG, 1) + " " + G] }];
      return { ok: true, expr: (pre ? L(pre.uk, pre.en) + ", " : "") + fnum(pp, 0) + " / " + fnum(fp, 0) + " / " + fnum(cp, 0) + " %", head: [L("калорій на день", "kcal per day"), kc(cal)], headSub: L("Б ", "P ") + fnum(r.pG, 0) + " " + G + L(" · Ж ", " · F ") + fnum(r.fG, 0) + " " + G + L(" · В ", " · C ") + fnum(r.cG, 0) + " " + G, subRaw: true, tiles: [{ k: L("Білки", "Protein"), v: fnum(r.pG, 0) + " " + G }, { k: L("Жири", "Fat"), v: fnum(r.fG, 0) + " " + G }, { k: L("Вуглеводи", "Carbs"), v: fnum(r.cG, 0) + " " + G }, { k: L("Клітковина", "Fibre"), v: "≈ " + fnum(fib, 0) + " " + G }].concat(perKg !== null ? [{ k: L("Білка на кг", "Protein per kg"), v: fnum(perKg, 1) + " " + L("г", "g") }] : []), extraHtml: '<div class="ph__sub">' + L("Розподіл на день", "Daily split") + "</div>" + macroTable(r, 0) + bar(r) + warnHtml(warns), note: NOTE, steps, resText: L("БЖУ на ", "Macros for ") + kc(cal) + " " + KCAL + " (" + fnum(pp, 0) + "/" + fnum(fp, 0) + "/" + fnum(cp, 0) + " %): " + L("білки ", "protein ") + fnum(r.pG, 0) + " " + G + L(", жири ", ", fat ") + fnum(r.fG, 0) + " " + G + L(", вуглеводи ", ", carbs ") + fnum(r.cG, 0) + " " + G };
    },
    reset(h) { const { el } = h; ["mcC", "mcW"].forEach((id) => setP(el, id, "")); setP(el, "mcU", "kg"); setP(el, "mcS", "athletic"); setP(el, "mcPp", 30); setP(el, "mcFp", 30); setP(el, "mcCp", 40); refreshU(el); },
    fill(h) { const { el } = h; setP(el, "mcC", "2200"); setP(el, "mcU", "kg"); setP(el, "mcW", "75"); setP(el, "mcS", "athletic"); setP(el, "mcPp", 30); setP(el, "mcFp", 30); setP(el, "mcCp", 40); refreshU(el); },
    share(p, h) { const { el } = h; if (!el("mcC").value.trim()) return; shareMap(MAPR, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAPR, qs, el); refreshU(el); }
  };

  // ----- калорії з грамів -----
  const MAPK = [["gp", "mcGp"], ["gf", "mcGf"], ["gc", "mcGc"], ["ct", "mcT"]];
  const grams = {
    key: "grams", type: "custom", req: ({ el }) => ["mcGp", "mcGf", "mcGc"], nameUk: "Калорії з грамів", nameEn: "Calories from grams",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("mcGp", L("Білки, г", "Protein, g"), inp("mcGp", L("напр.: 150", "e.g.: 150"), 5)) + fld("mcGf", L("Жири, г", "Fat, g"), inp("mcGf", L("напр.: 70", "e.g.: 70"), 5)) + fld("mcGc", L("Вуглеводи, г", "Carbs, g"), inp("mcGc", L("напр.: 250", "e.g.: 250"), 5)) + fld("mcT", L("Ваша ціль, ккал (необов'язково)", "Your target, kcal (optional)"), inp("mcT", L("напр.: 2200", "e.g.: 2200"), 5)) + '</div><div class="ph__hint ph__mt12">' + L("Введіть, скільки грамів білків, жирів і вуглеводів у вашому раціоні за день, — калькулятор порахує калорії та частки. Можна залишити поле порожнім (нуль).", "Enter how many grams of protein, fat and carbs are in your daily diet and the calculator computes the calories and shares. You can leave a field empty (zero).") + "</div>";
      ["mcGp", "mcGf", "mcGc", "mcT"].forEach((id) => el(id).addEventListener("input", maybeCalc));
    },
    calc(h) {
      const { el } = h, vals = ["mcGp", "mcGf", "mcGc"].map((id) => el(id).value.trim());
      if (vals.every((v) => !v)) return { ok: false, incomplete: true };
      const nums = vals.map((v) => (v === "" ? 0 : num(v)));
      if (nums.some((v) => v === null || v > 2000)) return { ok: false, msg: L("Грами — числа від 0 до 2000.", "Grams are numbers from 0 to 2000.") };
      if (nums.every((v) => v === 0)) return { ok: false, msg: L("Введіть хоча б один показник більший за нуль.", "Enter at least one value above zero.") };
      const r = M.fromGrams(nums[0], nums[1], nums[2]), ts = el("mcT").value.trim(); let tgt = null;
      if (ts) { tgt = num(ts); if (tgt === null || tgt < 800 || tgt > 10000) return { ok: false, msg: L("Ціль — від 800 до 10 000 ккал.", "Target — from 800 to 10,000 kcal.") }; }
      const diff = tgt !== null ? r.total - tgt : null;
      const steps = [{ t: L("Калорії кожної речовини", "Calories of each nutrient"), l: [fnum(nums[0], 1) + " × 4 = " + kc(r.pK) + " " + KCAL, fnum(nums[1], 1) + " × 9 = " + kc(r.fK) + " " + KCAL, fnum(nums[2], 1) + " × 4 = " + kc(r.cK) + " " + KCAL] }, { t: L("Сума й частки", "Total and shares"), l: [kc(r.pK) + " + " + kc(r.fK) + " + " + kc(r.cK) + " = " + kcDay(r) + " " + KCAL].concat(diff !== null ? [L("Різниця з ціллю: ", "Difference from the target: ") + (diff >= 0 ? "+" : "−") + kc(Math.abs(diff)) + " " + KCAL] : []), note: L("Спирт дає ще 7 ккал на грам, але тут не враховується.", "Alcohol adds 7 kcal per gram but is not included here.") }];
      return { ok: true, expr: fnum(nums[0], 0) + " / " + fnum(nums[1], 0) + " / " + fnum(nums[2], 0) + " " + G, head: [L("калорій на день", "kcal per day"), kcDay(r)], headSub: diff !== null ? L("відносно цілі ", "versus the target ") + (diff >= 0 ? "+" : "−") + kc(Math.abs(diff)) + " " + KCAL : L("Б ", "P ") + fnum(r.pPct, 0) + L(" % · Ж ", " % · F ") + fnum(r.fPct, 0) + L(" % · В ", " % · C ") + fnum(r.cPct, 0) + " %", subRaw: true, tiles: [{ k: L("Білки", "Protein"), v: kc(r.pK) + " " + KCAL }, { k: L("Жири", "Fat"), v: kc(r.fK) + " " + KCAL }, { k: L("Вуглеводи", "Carbs"), v: kc(r.cK) + " " + KCAL }], extraHtml: '<div class="ph__sub">' + L("Частки калорій", "Calorie shares") + "</div>" + macroTable(r, 0) + bar(r), note: NOTE, steps, resText: kcDay(r) + " " + KCAL + " (" + L("білки ", "protein ") + fnum(r.pPct, 0) + L(" %, жири ", "%, fat ") + fnum(r.fPct, 0) + L(" %, вуглеводи ", "%, carbs ") + fnum(r.cPct, 0) + " %)" };
    },
    reset(h) { ["mcGp", "mcGf", "mcGc", "mcT"].forEach((id) => setP(h.el, id, "")); },
    fill(h) { const { el } = h; setP(el, "mcGp", "150"); setP(el, "mcGf", "70"); setP(el, "mcGc", "250"); setP(el, "mcT", "2200"); },
    share(p, h) { const { el } = h; if (!["mcGp", "mcGf", "mcGc"].some((id) => el(id).value.trim())) return; shareMap(MAPK, p, el); },
    apply(qs, h) { applyMap(MAPK, qs, h.el); }
  };
  return { modes: [goal, ratio, grams], exactNote: false };
});
