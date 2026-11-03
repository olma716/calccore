/* cal-calc.js — калькулятор калорій: добова норма (BMR/TDEE), ціль за вагою, порівняння формул, витрати на тренування (MET) */
PhysCalc.start(({ L }) => {
  const C = window.Cal, UI = window.PhysUI;
  const SEP = L(",", ".");
  const fnum = (x, d = 1) => { const v = Math.round(x * 10 ** d) / 10 ** d; return String(v).replace(".", SEP); };
  const kc = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const num = (s) => { const t = String(s).replace(/\s+/g, "").replace(",", "."); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
  const intOf = (s) => (/^\d{1,3}$/.test(String(s).trim()) ? Number(String(s).trim()) : null);
  const KCAL = L("ккал", "kcal");
  const NOTE = L("Це оцінка за статистичними формулами: орієнтир, а не вимірювання й не медична порада. Реальний обмін речовин залежить від генетики, складу тіла й здоров'я.", "This is an estimate from statistical formulas: a guide, not a measurement and not medical advice. Real metabolism depends on genetics, body composition and health.");
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (ml || 6) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const palOpts = () => C.PAL.map((p) => [p.v, L(p.uk, p.en)]).concat([["custom", L("Своє значення коефіцієнта", "Custom multiplier")]]);
  const formOpts = () => C.FORMS.map((f) => [f.id, L(f.uk, f.en)]);

  // ---------- спільні поля «людина» ----------
  const personHtml = (o) => fld("cuA", L("Вік, років", "Age, years"), inp("cuA", L("напр.: 30", "e.g.: 30"), 3)) + fld("cuS", L("Стать", "Sex"), sel("cuS", [["m", L("Чоловіча", "Male")], ["f", L("Жіноча", "Female")]], "m")) +
    fld("cuW", '<span id="cuWL">' + L("Вага, кг", "Weight, kg") + "</span>", inp("cuW", L("напр.: 75", "e.g.: 75"))) + fld("cuU", L("Одиниці", "Units"), sel("cuU", [["metric", L("Метричні (кг, см)", "Metric (kg, cm)")], ["imp", L("Імперські (lb, ft/in)", "Imperial (lb, ft/in)")]], "metric")) + fld("cuH", L("Зріст, см", "Height, cm"), inp("cuH", L("напр.: 178", "e.g.: 178"))) +
    fld("cuFt", L("Зріст, фути", "Height, ft"), inp("cuFt", "5", 1)) + fld("cuIn", L("Зріст, дюйми", "Height, in"), inp("cuIn", "10", 4)) +
    (o.formula ? fld("cuF", L("Формула BMR", "BMR formula"), sel("cuF", formOpts(), "mifflin"), true) : "") +
    (o.bf ? fld("cuB", L("Відсоток жиру, % (для Кетча — Макардла й Каннінгема)", "Body fat, % (for Katch–McArdle and Cunningham)"), inp("cuB", L("необов'язково", "optional"), 4), true) : "") +
    (o.pal === false ? "" : fld("cuP", L("Рівень активності", "Activity level"), sel("cuP", palOpts(), "1.55"), true) + fld("cuC", L("Коефіцієнт активності (1,0–2,5)", "Activity multiplier (1.0–2.5)"), inp("cuC", "1.45", 5)));
  const show = (el, id, on) => { const e = el(id + "W"); if (e) e.style.display = on ? "" : "none"; };
  const refresh = (el) => {
    const imp = el("cuU").value === "imp";
    el("cuWL").textContent = imp ? L("Вага, lb", "Weight, lb") : L("Вага, кг", "Weight, kg");
    show(el, "cuH", !imp); show(el, "cuFt", imp); show(el, "cuIn", imp);
    if (el("cuF") && el("cuB")) show(el, "cuB", C.find(el("cuF").value).bf);
    if (el("cuP")) show(el, "cuC", el("cuP").value === "custom");
    if (el("cuR")) { const cur = el("cuR").value; el("cuR").innerHTML = rateOpts(imp).map(([v, t]) => '<option value="' + v + '">' + t + "</option>").join(""); el("cuR").value = [...el("cuR").options].some((o) => o.value === cur) ? cur : rateOpts(imp)[1][0]; }
  };
  const wire = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); if (!e) return; e.addEventListener(e.tagName === "SELECT" ? "change" : "input", () => { refresh(el); maybeCalc(); }); });
  const rateOpts = (imp) => (imp ? [0.5, 1, 1.5, 2].map((x) => [x, fnum(x, 1) + L(" lb на тиждень", " lb per week")]) : [0.25, 0.5, 0.75, 1].map((x) => [x, fnum(x, 2) + L(" кг на тиждень", " kg per week")]));
  const wName = (imp) => (imp ? "lb" : L("кг", "kg"));
  const toUser = (kg, imp) => (imp ? kg / C.KG_PER_LB : kg);

  // читання й перевірка
  function read(el, o) {
    const imp = el("cuU").value === "imp", sex = el("cuS").value, as = el("cuA").value.trim(), ws = el("cuW").value.trim();
    const hs = imp ? el("cuFt").value.trim() : el("cuH").value.trim();
    if (!as || !ws || !hs) return { incomplete: true };
    const age = intOf(as);
    if (age === null || age < 15 || age > 100) return { err: L("Вік — ціле число від 15 до 100 років.", "Age — a whole number from 15 to 100 years.") };
    const wv = num(ws); if (wv === null) return { err: L("Вага — число.", "Weight is a number.") };
    const w = imp ? wv * C.KG_PER_LB : wv;
    if (w < 30 || w > 300) return { err: L("Вага — від 30 до 300 кг (" + (imp ? "66–660 lb" : "або 66–660 lb") + ").", "Weight — from 30 to 300 kg (66–660 lb).") };
    let h;
    if (imp) { const ft = num(hs), inch = el("cuIn").value.trim() ? num(el("cuIn").value) : 0; if (ft === null || inch === null) return { err: L("Зріст — числа (фути й дюйми).", "Height — numbers (feet and inches).") }; h = (ft * 12 + inch) * C.CM_PER_IN; }
    else { h = num(hs); if (h === null) return { err: L("Зріст — число в сантиметрах.", "Height is a number in centimetres.") }; }
    if (h < 120 || h > 230) return { err: L("Зріст — від 120 до 230 см (4′0″–7′6″).", "Height — from 120 to 230 cm (4′0″–7′6″).") };
    let bf = null;
    if (el("cuB") && el("cuB").value.trim()) { bf = num(el("cuB").value); if (bf === null || bf < 3 || bf > 60) return { err: L("Відсоток жиру — від 3 до 60.", "Body fat — from 3 to 60.") }; }
    let pal = 1.55;
    if (o.pal !== false) { const pv = el("cuP").value; if (pv === "custom") { pal = num(el("cuC").value); if (pal === null || pal < 1 || pal > 2.5) return { err: L("Коефіцієнт активності — від 1,0 до 2,5.", "The activity multiplier is from 1.0 to 2.5.") }; } else pal = Number(pv); }
    const warns = [];
    if (age < 18) warns.push(L("Формули розраховані на дорослих: для віку до 18 років результат лише орієнтовний.", "The formulas are designed for adults: for ages under 18 the result is only a rough guide."));
    else if (age > 78) warns.push(L("Формулу Міффліна — Сент-Джеора перевіряли на людях до 78 років: для старшого віку точність невідома.", "The Mifflin–St Jeor formula was tested on people up to 78: accuracy is unknown at older ages."));
    return { imp, sex, age, w, h, bf, pal, warns };
  }
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const barChart = (labels, values, fmtV) => {
    const W = 600, H = 220, pl = 10, pr = 10, pt = 24, pb = 30, n = values.length, gap = 8, bw = (W - pl - pr - gap * (n - 1)) / n, mx = Math.max(...values, 1e-9);
    const bars = values.map((v, i) => { const h = ((H - pt - pb) * v) / mx, x = pl + i * (bw + gap), y = H - pb - h; return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" fill="#3d63c9"/><text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#1f2f55">' + fmtV(v) + '</text><text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="10" fill="#5b6b8c">' + labels[i] + "</text>"; }).join("");
    return '<svg class="ph__chart" viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="' + L("Діаграма", "Chart") + '">' + bars + "</svg>";
  };
  const lineChart = (pts, unitLbl) => {
    const W = 600, H = 200, pl = 44, pr = 16, pt = 18, pb = 30, xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), dy = y1 - y0 || 1, dx = x1 - x0 || 1;
    const px = (x) => pl + ((W - pl - pr) * (x - x0)) / dx, py = (y) => pt + ((H - pt - pb) * (y1 - y)) / dy;
    const line = pts.map((p) => px(p.x).toFixed(1) + "," + py(p.y).toFixed(1)).join(" ");
    const dots = pts.map((p) => '<circle cx="' + px(p.x).toFixed(1) + '" cy="' + py(p.y).toFixed(1) + '" r="4" fill="#3d63c9"/>').join("");
    const lab = [pts[0], pts[pts.length - 1]].map((p, i) => '<text x="' + px(p.x).toFixed(1) + '" y="' + (py(p.y) + (i ? 20 : -10)).toFixed(1) + '" text-anchor="' + (i ? "end" : "start") + '" font-size="11" font-weight="700" fill="#1f2f55">' + fnum(p.y, 1) + " " + unitLbl + "</text>").join("");
    const ax = '<text x="' + pl + '" y="' + (H - 8) + '" font-size="10" fill="#5b6b8c">' + L("тиждень ", "week ") + x0 + '</text><text x="' + (W - pr) + '" y="' + (H - 8) + '" text-anchor="end" font-size="10" fill="#5b6b8c">' + L("тиждень ", "week ") + fnum(x1, 1) + "</text>";
    return '<svg class="ph__chart" viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="' + L("Графік ваги", "Weight chart") + '"><polyline points="' + line + '" fill="none" stroke="#3d63c9" stroke-width="3" stroke-linejoin="round"/>' + dots + lab + ax + "</svg>";
  };
  const setP = (el, id, v) => { const e = el(id); if (e && v !== undefined && v !== null) e.value = v; };
  const FILL = { cuS: "m", cuA: "30", cuU: "metric", cuW: "75", cuH: "178", cuP: "1.55" };
  const RESET = { cuS: "m", cuA: "", cuU: "metric", cuW: "", cuH: "", cuFt: "", cuIn: "", cuB: "", cuP: "1.55", cuC: "" };
  const applyMap = (map, qs, el) => {
    if (qs.has("un") && ["metric", "imp"].includes(qs.get("un"))) el("cuU").value = qs.get("un");
    refresh(el);
    map.forEach(([k, id]) => { const e = el(id); if (!e || !qs.has(k)) return; const v = qs.get(k).slice(0, 12); if (e.tagName === "SELECT") { if ([...e.options].some((o) => o.value === v)) e.value = v; } else e.value = v; });
    refresh(el);
  };
  const shareMap = (map, p, el) => map.forEach(([k, id]) => { const e = el(id); if (e && String(e.value).trim() !== "") p.set(k, String(e.value).trim()); });
  const PERSON_MAP = [["sx", "cuS"], ["ag", "cuA"], ["wt", "cuW"], ["ht", "cuH"], ["ft", "cuFt"], ["ic", "cuIn"], ["bf", "cuB"], ["ac", "cuP"], ["pc", "cuC"]];

  // ----- добова норма -----
  const tdee = {
    key: "tdee", type: "custom", nameUk: "Добова норма (BMR / TDEE)", nameEn: "Daily needs (BMR / TDEE)",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + personHtml({ formula: true, bf: true }) + "</div>";
      wire(el, maybeCalc, ["cuS", "cuA", "cuU", "cuW", "cuH", "cuFt", "cuIn", "cuF", "cuB", "cuP", "cuC"]); refresh(el);
    },
    calc(h) {
      const { el } = h, o = { formula: true }, p = read(el, o);
      if (p.incomplete) return { ok: false, incomplete: true };
      if (p.err) return { ok: false, msg: p.err };
      const f = el("cuF").value, fo = C.find(f);
      if (fo.bf && p.bf === null) return { ok: false, msg: L("Для формули «" + C.name(f) + "» вкажіть відсоток жиру.", "For the “" + C.name(f) + "” formula enter the body fat percentage.") };
      const bmr = C.bmr(f, p);
      if (bmr === null) return { ok: false, msg: L("Формула Скофілда — для дорослих (від 18 років).", "The Schofield formula is for adults (18 and older).") };
      const td = bmr * p.pal, all = C.FORMS.map((q) => C.bmr(q.id, p)).filter((v) => v !== null), mn = Math.min(...all), mx = Math.max(...all);
      const fl = C.floorKcal(p.sex), rows = C.GOALS.map((g) => { const k = td * (1 + g.pct / 100), wk = C.weeklyKg(k - td), flag = k < bmr ? { t: L("нижче BMR", "below BMR"), cls: "chip bad" } : k < fl ? { t: L("нижче " + kc(fl), "below " + kc(fl)), cls: "chip bad" } : ""; return { cells: [L(g.uk, g.en), { t: kc(k) + " " + KCAL, cls: "strong" }, g.pct === 0 ? "—" : (wk > 0 ? "+" : "−") + fnum(Math.abs(toUser(wk, p.imp)), 2) + " " + wName(p.imp), flag], main: g.pct === 0 }; });
      const table = UI.list([L("Ціль", "Goal"), L("Калорії на день", "Calories per day"), L("Зміна ваги на тиждень", "Weight change per week"), ""], rows, { w: "minmax(0, 1.4fr) 130px 150px 110px" });
      const steps = [{ t: L("BMR за формулою ", "BMR by the ") + C.name(f), l: [L(fo.txtU, fo.txtE), L("BMR = ", "BMR = ") + fnum(bmr, 1) + " " + KCAL], note: L("BMR — калорії, які тіло витрачає у спокої протягом доби.", "BMR is the calories the body burns at rest over a day.") }, { t: L("Множимо на активність", "Multiplying by activity"), l: [fnum(bmr, 1) + " × " + fnum(p.pal, 3) + " = " + fnum(td, 1) + " " + KCAL], note: L("TDEE — загальна добова витрата з урахуванням руху й тренувань.", "TDEE is the total daily expenditure including movement and exercise.") }, { t: L("Калорії для цілі", "Calories for a goal"), l: [L("1 кг жиру ≈ 7700 ккал, тому дефіцит 550 ккал на день ≈ 0,5 кг на тиждень.", "1 kg of fat ≈ 7700 kcal, so a 550 kcal daily deficit ≈ 0.5 kg per week.")], note: L("Це спрощення: з втратою ваги витрата зменшується, тож темп з часом сповільнюється.", "This is a simplification: expenditure drops as weight falls, so the pace slows over time.") }];
      const chart = barChart(C.GOALS.map((g) => (g.pct > 0 ? "+" : "") + g.pct + "%"), C.GOALS.map((g) => td * (1 + g.pct / 100)), (v) => kc(v));
      return { ok: true, expr: C.name(f) + " · " + L(p.sex === "m" ? "чол., " : "жін., ", p.sex === "m" ? "male, " : "female, ") + p.age + L(" р., ", " y, ") + fnum(toUser(p.w, p.imp), 1) + " " + wName(p.imp), head: [L("TDEE, ккал на день", "TDEE, kcal per day"), kc(td)], headSub: "BMR " + kc(bmr) + " " + KCAL + " × " + fnum(p.pal, 3), subRaw: true, tiles: [{ k: L("BMR (базовий обмін)", "BMR (basal rate)"), v: kc(bmr) + " " + KCAL }, { k: L("Активність", "Activity"), v: "× " + fnum(p.pal, 3) }, { k: L("BMR за формулами", "BMR by formulas"), v: kc(mn) + "–" + kc(mx) }, { k: L("Мінімум без нагляду", "Common minimum"), v: kc(fl) + " " + KCAL }], extraHtml: '<div class="ph__sub">' + L("Калорії для цілі", "Calories for a goal") + "</div>" + table + chart + warnHtml(p.warns) + hint(L("Мінімум 1200 (жінки) і 1500 (чоловіки) ккал — поширений орієнтир для харчування без нагляду лікаря; нижче BMR калорійність опускати не варто.", "1200 (women) and 1500 (men) kcal is a commonly cited minimum for eating without medical supervision; avoid dropping below your BMR.")), note: NOTE, steps, resText: "TDEE ≈ " + kc(td) + " " + KCAL + L(" на день (BMR ", " per day (BMR ") + kc(bmr) + "; " + C.name(f) + L("; активність ", "; activity ") + fnum(p.pal, 3) + ")" };
    },
    reset(h) { const { el } = h; Object.entries(RESET).forEach(([id, v]) => setP(el, id, v)); setP(el, "cuF", "mifflin"); refresh(el); },
    fill(h) { const { el } = h; Object.entries(FILL).forEach(([id, v]) => setP(el, id, v)); setP(el, "cuF", "mifflin"); setP(el, "cuB", ""); refresh(el); },
    share(p, h) { const { el } = h; if (!el("cuA").value.trim() || !el("cuW").value.trim()) return; p.set("un", el("cuU").value); p.set("fo", el("cuF").value); shareMap(PERSON_MAP, p, el); },
    apply(qs, h) { applyMap(PERSON_MAP.concat([["fo", "cuF"]]), qs, h.el); }
  };

  // ----- ціль за вагою -----
  const plan = {
    key: "plan", type: "custom", nameUk: "Ціль за вагою", nameEn: "Weight goal",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + personHtml({}) + fld("cuG", '<span id="cuGL">' + L("Бажана вага, кг", "Goal weight, kg") + "</span>", inp("cuG", L("напр.: 68", "e.g.: 68"))) + fld("cuR", L("Темп зміни ваги", "Pace of change"), sel("cuR", rateOpts(false), 0.5)) + fld("cuT", L("Ваш TDEE, ккал (необов'язково)", "Your TDEE, kcal (optional)"), inp("cuT", L("якщо відомий", "if known"), 5), true) + '</div><div class="ph__hint ph__mt12">' + L("Без свого TDEE він береться за формулою Міффліна — Сент-Джеора й обраною активністю.", "Without your own TDEE it is taken from the Mifflin–St Jeor formula and the chosen activity.") + "</div>";
      wire(el, () => { el("cuGL").textContent = el("cuU").value === "imp" ? L("Бажана вага, lb", "Goal weight, lb") : L("Бажана вага, кг", "Goal weight, kg"); maybeCalc(); }, ["cuS", "cuA", "cuU", "cuW", "cuH", "cuFt", "cuIn", "cuP", "cuC", "cuG", "cuR", "cuT"]); refresh(el);
    },
    calc(h) {
      const { el } = h, p = read(el, {});
      if (p.incomplete || !el("cuG").value.trim()) return { ok: false, incomplete: true };
      if (p.err) return { ok: false, msg: p.err };
      const gv = num(el("cuG").value); if (gv === null) return { ok: false, msg: L("Бажана вага — число.", "Goal weight is a number.") };
      const wg = p.imp ? gv * C.KG_PER_LB : gv;
      if (wg < 30 || wg > 300) return { ok: false, msg: L("Бажана вага — від 30 до 300 кг (66–660 lb).", "Goal weight — from 30 to 300 kg (66–660 lb).") };
      if (Math.abs(wg - p.w) < 0.05) return { ok: false, msg: L("Бажана вага збігається з поточною: ціль уже досягнуто, потрібна підтримка (TDEE).", "The goal weight equals the current one: use maintenance calories (TDEE).") };
      let td; const ts = el("cuT").value.trim();
      if (ts) { td = num(ts); if (td === null || td < 800 || td > 6000) return { ok: false, msg: L("TDEE — від 800 до 6000 ккал.", "TDEE — from 800 to 6000 kcal.") }; } else td = C.bmr("mifflin", p) * p.pal;
      const bmr = C.bmr("mifflin", p), loss = wg < p.w, rate = Number(el("cuR").value) * (p.imp ? C.KG_PER_LB : 1), delta = C.dailyDelta(rate), cals = loss ? td - delta : td + delta, weeks = Math.abs(p.w - wg) / rate;
      const date = new Date(Date.now() + weeks * 7 * 864e5).toLocaleDateString(L("uk-UA", "en-US"), { day: "numeric", month: "long", year: "numeric" });
      const warns = p.warns.slice(), fl = C.floorKcal(p.sex);
      if (loss && cals < bmr) warns.push(L("Калорійність нижча за ваш базовий обмін (" + kc(bmr) + " ккал): так худнути без нагляду не варто.", "The calories are below your basal rate (" + kc(bmr) + " kcal): avoid this without supervision."));
      else if (loss && cals < fl) warns.push(L("Калорійність нижча за поширений мінімум " + kc(fl) + " ккал без нагляду лікаря.", "The calories are below the common " + kc(fl) + " kcal minimum without medical supervision."));
      if (loss && rate > p.w * 0.01) warns.push(L("Темп більший за ~1 % маси тіла на тиждень: це швидко, зменште темп.", "The pace is above ~1% of body weight per week: that is fast, lower it."));
      if (loss && delta > td * 0.25) warns.push(L("Дефіцит перевищує 25 % від TDEE.", "The deficit exceeds 25% of TDEE."));
      if (!loss && rate > p.w * 0.005) warns.push(L("Темп набору понад ~0,5 % маси тіла на тиждень: більша частка набраної ваги буде жиром.", "A gain pace above ~0.5% of body weight per week: a larger share of the gain will be fat."));
      if (weeks > 104) warns.push(L("Ціль далека (понад 2 роки): перераховуйте норму після кожних 4–5 кг зміни ваги.", "The goal is far off (over 2 years): recalculate after every 4–5 kg of change."));
      const u = wName(p.imp), step = weeks > 40 ? 8 : weeks > 20 ? 4 : 2, pts = [], rows = [];
      for (let wk = 0; wk < weeks; wk += step) { const wv = loss ? p.w - rate * wk : p.w + rate * wk; pts.push({ x: wk, y: toUser(wv, p.imp) }); if (wk > 0) rows.push([L("Тиждень ", "Week ") + wk, { t: fnum(toUser(wv, p.imp), 1) + " " + u, cls: "strong" }]); }
      pts.push({ x: weeks, y: toUser(wg, p.imp) }); rows.push({ cells: [L("Тиждень ", "Week ") + fnum(weeks, 1), { t: fnum(toUser(wg, p.imp), 1) + " " + u, cls: "chip" }], main: true });
      const steps = [{ t: L("Добова норма (TDEE)", "Daily needs (TDEE)"), l: [ts ? L("Ваше значення: ", "Your value: ") + kc(td) + " " + KCAL : "BMR " + fnum(bmr, 1) + " × " + fnum(p.pal, 3) + " = " + fnum(td, 1) + " " + KCAL] }, { t: L("Дефіцит чи профіцит", "Deficit or surplus"), l: [fnum(toUser(rate, p.imp), 2) + " " + u + L(" на тиждень × 7700 ккал / 7 = ", " per week × 7700 kcal / 7 = ") + fnum(delta, 0) + " " + KCAL + L(" на день", " per day")], note: L("Приблизно 7700 ккал відповідають 1 кг жирової маси.", "About 7700 kcal correspond to 1 kg of fat mass.") }, { t: L("Калорії й строк", "Calories and time"), l: [kc(td) + (loss ? " − " : " + ") + kc(delta) + " = " + kc(cals) + " " + KCAL, L("Строк: |", "Time: |") + fnum(toUser(p.w, p.imp), 1) + " − " + fnum(toUser(wg, p.imp), 1) + "| / " + fnum(toUser(rate, p.imp), 2) + " = " + fnum(weeks, 1) + L(" тижнів", " weeks")], note: L("Модель лінійна: насправді темп сповільнюється, бо витрата зменшується разом із вагою.", "The model is linear: in reality the pace slows as expenditure falls with weight.") }];
      return { ok: true, expr: fnum(toUser(p.w, p.imp), 1) + " → " + fnum(toUser(wg, p.imp), 1) + " " + u + " · " + fnum(toUser(rate, p.imp), 2) + " " + u + L("/тиж", "/wk"), head: [loss ? L("калорій на день для схуднення", "kcal per day to lose weight") : L("калорій на день для набору", "kcal per day to gain"), kc(cals)], headSub: L("ціль через ", "goal in ") + fnum(weeks, 1) + L(" тижнів · приблизно ", " weeks · around ") + date, subRaw: true, tiles: [{ k: loss ? L("Дефіцит на день", "Daily deficit") : L("Профіцит на день", "Daily surplus"), v: kc(delta) + " " + KCAL }, { k: L("Строк", "Time"), v: fnum(weeks, 1) + L(" тижнів", " weeks") }, { k: L("Орієнтовна дата", "Estimated date"), v: date }, { k: "TDEE", v: kc(td) + " " + KCAL }], extraHtml: '<div class="ph__sub">' + L("Вага по тижнях", "Weight by week") + "</div>" + UI.list([L("Коли", "When"), L("Вага", "Weight")], rows, { kv: true }) + lineChart(pts, u) + warnHtml(warns), note: NOTE, steps, resText: kc(cals) + " " + KCAL + L(" на день, ціль через ", " per day, goal in ") + fnum(weeks, 1) + L(" тижнів (", " weeks (") + fnum(toUser(rate, p.imp), 2) + " " + u + L(" на тиждень)", " per week)") };
    },
    reset(h) { const { el } = h; Object.entries(RESET).forEach(([id, v]) => setP(el, id, v)); setP(el, "cuG", ""); setP(el, "cuT", ""); refresh(el); setP(el, "cuR", "0.5"); },
    fill(h) { const { el } = h; Object.entries(FILL).forEach(([id, v]) => setP(el, id, v)); setP(el, "cuG", "68"); setP(el, "cuT", ""); refresh(el); setP(el, "cuR", "0.5"); },
    share(p, h) { const { el } = h; if (!el("cuA").value.trim() || !el("cuW").value.trim() || !el("cuG").value.trim()) return; p.set("un", el("cuU").value); p.set("rt", el("cuR").value); shareMap(PERSON_MAP.concat([["gw", "cuG"], ["td", "cuT"]]), p, el); },
    apply(qs, h) { const { el } = h; applyMap(PERSON_MAP.concat([["gw", "cuG"], ["td", "cuT"]]), qs, el); if (qs.has("rt") && [...el("cuR").options].some((o) => o.value === qs.get("rt"))) el("cuR").value = qs.get("rt"); el("cuGL").textContent = el("cuU").value === "imp" ? L("Бажана вага, lb", "Goal weight, lb") : L("Бажана вага, кг", "Goal weight, kg"); }
  };

  // ----- порівняння формул -----
  const compare = {
    key: "compare", type: "custom", nameUk: "Порівняння формул", nameEn: "Compare formulas",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + personHtml({ bf: true }) + "</div>";
      wire(el, maybeCalc, ["cuS", "cuA", "cuU", "cuW", "cuH", "cuFt", "cuIn", "cuB", "cuP", "cuC"]); refresh(el); show(el, "cuB", true);
    },
    calc(h) {
      const { el } = h, p = read(el, {});
      if (p.incomplete) return { ok: false, incomplete: true };
      if (p.err) return { ok: false, msg: p.err };
      const items = C.FORMS.map((q) => ({ n: C.name(q.id), id: q.id, b: C.bmr(q.id, p), need: q.bf ? L("потрібен % жиру", "body fat % needed") : L("лише від 18 років", "18 and older only") })), ok = items.filter((x) => x.b !== null), av = ok.reduce((a, x) => a + x.b, 0) / ok.length, mn = Math.min(...ok.map((x) => x.b)), mx = Math.max(...ok.map((x) => x.b));
      const rows = items.map((x) => (x.b === null ? { cells: [x.n, { t: "—", cls: "muted" }, { t: x.need, cls: "muted" }, ""] } : { cells: [x.n, { t: kc(x.b) + " " + KCAL, cls: "strong" }, { t: kc(x.b * p.pal) + " " + KCAL, cls: "strong" }, { t: (x.b >= av ? "+" : "−") + fnum(Math.abs(((x.b - av) / av) * 100), 1) + " %", cls: "muted" }] }));
      rows.push({ cells: [L("Середнє", "Mean"), { t: kc(av) + " " + KCAL, cls: "chip" }, { t: kc(av * p.pal) + " " + KCAL, cls: "chip" }, ""], main: true });
      const table = UI.list([L("Формула", "Formula"), "BMR", "TDEE", L("Від середнього", "From the mean")], rows, { w: "minmax(0, 1.5fr) 120px 130px 110px" });
      const chart = barChart(ok.map((x) => x.n.split(/[ —–-]/)[0].slice(0, 10)), ok.map((x) => x.b), (v) => kc(v));
      const steps = [{ t: L("Рахуємо BMR за кожною формулою", "Computing the BMR by each formula"), l: ok.map((x) => x.n + ": " + fnum(x.b, 1) + " " + KCAL) }, { t: L("Середнє й розкид", "Mean and spread"), l: [L("Середнє ", "Mean ") + fnum(av, 1) + " " + KCAL, L("Від ", "From ") + fnum(mn, 1) + L(" до ", " to ") + fnum(mx, 1) + " (" + fnum(((mx - mn) / av) * 100, 1) + " %)"], note: L("Розкид показує реальну невизначеність оцінки: різні формули виведено на різних вибірках.", "The spread shows the real uncertainty of the estimate: the formulas were derived on different samples.") }];
      return { ok: true, expr: L(p.sex === "m" ? "чол., " : "жін., ", p.sex === "m" ? "male, " : "female, ") + p.age + L(" р., ", " y, ") + fnum(toUser(p.w, p.imp), 1) + " " + wName(p.imp), head: [L("середній BMR", "mean BMR"), kc(av) + " " + KCAL], headSub: L("від ", "from ") + kc(mn) + L(" до ", " to ") + kc(mx) + " · TDEE ≈ " + kc(av * p.pal), subRaw: true, tiles: [{ k: L("Мінімум", "Minimum"), v: kc(mn) + " " + KCAL }, { k: L("Максимум", "Maximum"), v: kc(mx) + " " + KCAL }, { k: L("Розкид", "Spread"), v: fnum(((mx - mn) / av) * 100, 1) + " %" }], extraHtml: table + '<div class="ph__sub">' + L("Діаграма BMR", "BMR chart") + "</div>" + chart + warnHtml(p.warns), note: NOTE, steps, resText: L("BMR за формулами: ", "BMR by formulas: ") + ok.map((x) => x.n + " " + kc(x.b)).join("; ") + L("; середнє ", "; mean ") + kc(av) + " " + KCAL };
    },
    reset(h) { const { el } = h; Object.entries(RESET).forEach(([id, v]) => setP(el, id, v)); refresh(el); },
    fill(h) { const { el } = h; Object.entries(FILL).forEach(([id, v]) => setP(el, id, v)); setP(el, "cuB", "18"); refresh(el); },
    share(p, h) { const { el } = h; if (!el("cuA").value.trim() || !el("cuW").value.trim()) return; p.set("un", el("cuU").value); shareMap(PERSON_MAP, p, el); },
    apply(qs, h) { applyMap(PERSON_MAP, qs, h.el); }
  };

  // ----- витрати на тренування -----
  const met = {
    key: "met", type: "custom", nameUk: "Витрати на тренування", nameEn: "Exercise calories",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("cuU", L("Одиниці ваги", "Weight unit"), sel("cuU", [["metric", L("Кілограми (кг)", "Kilograms (kg)")], ["imp", L("Фунти (lb)", "Pounds (lb)")]], "metric")) + fld("cuW", '<span id="cuWL">' + L("Вага, кг", "Weight, kg") + "</span>", inp("cuW", L("напр.: 75", "e.g.: 75"))) + fld("cuE", L("Вид активності", "Activity"), sel("cuE", C.MET.map((m) => [m.id, L(m.uk, m.en) + " · " + fnum(m.v, 1) + " MET"]), "run10"), true) + fld("cuM", L("Тривалість, хвилин", "Duration, minutes"), inp("cuM", L("напр.: 30", "e.g.: 30"), 4)) + '</div><div class="ph__hint ph__mt12">' + L("MET — у скільки разів активність витрачає більше енергії, ніж спокій. Калорії = MET × вага (кг) × години.", "MET is how many times an activity burns more energy than rest. Calories = MET × weight (kg) × hours.") + "</div>";
      ["cuU", "cuW", "cuE", "cuM"].forEach((id) => el(id).addEventListener(el(id).tagName === "SELECT" ? "change" : "input", () => { el("cuWL").textContent = el("cuU").value === "imp" ? L("Вага, lb", "Weight, lb") : L("Вага, кг", "Weight, kg"); maybeCalc(); }));
    },
    calc(h) {
      const { el } = h, ws = el("cuW").value.trim(), ms = el("cuM").value.trim();
      if (!ws || !ms) return { ok: false, incomplete: true };
      const imp = el("cuU").value === "imp", wv = num(ws), mins = num(ms), a = C.MET.find((q) => q.id === el("cuE").value);
      if (wv === null) return { ok: false, msg: L("Вага — число.", "Weight is a number.") };
      const w = imp ? wv * C.KG_PER_LB : wv;
      if (w < 30 || w > 300) return { ok: false, msg: L("Вага — від 30 до 300 кг (66–660 lb).", "Weight — from 30 to 300 kg (66–660 lb).") };
      if (mins === null || mins < 1 || mins > 1440) return { ok: false, msg: L("Тривалість — від 1 до 1440 хвилин.", "Duration — from 1 to 1440 minutes.") };
      const hrs = mins / 60, k = C.kcalMet(a.v, w, hrs), net = C.kcalMet(a.v - 1, w, hrs), perHour = C.kcalMet(a.v, w, 1);
      const rows = C.MET.slice().sort((x, y) => y.v - x.v).map((q) => ({ cells: [L(q.uk, q.en), fnum(q.v, 1), { t: kc(C.kcalMet(q.v, w, hrs)) + " " + KCAL, cls: q.id === a.id ? "chip" : "strong" }], main: q.id === a.id }));
      const steps = [{ t: L("Формула", "Formula"), l: [fnum(a.v, 1) + " MET × " + fnum(w, 1) + L(" кг × ", " kg × ") + fnum(hrs, 3) + L(" год = ", " h = ") + fnum(k, 1) + " " + KCAL], note: L("Це повна витрата, разом зі спокоєм, який ви витратили б і без тренування.", "This is the gross expenditure, including the rest you would burn anyway.") }, { t: L("Чиста витрата", "Net expenditure"), l: [fnum(a.v - 1, 1) + " MET × " + fnum(w, 1) + L(" кг × ", " kg × ") + fnum(hrs, 3) + L(" год = ", " h = ") + fnum(net, 1) + " " + KCAL], note: L("Без калорій спокою (1 MET): так рахують «додатково спалено».", "Without resting calories (1 MET): this is the “extra burned”.") }];
      return { ok: true, expr: L(a.uk, a.en) + " · " + mins + L(" хв", " min"), head: [L("витрачено", "burned"), kc(k) + " " + KCAL], headSub: L("чиста витрата ", "net ") + kc(net) + " " + KCAL, subRaw: true, tiles: [{ k: L("За годину", "Per hour"), v: kc(perHour) + " " + KCAL }, { k: "MET", v: fnum(a.v, 1) }, { k: L("Чиста витрата", "Net"), v: kc(net) + " " + KCAL }], extraHtml: '<div class="ph__sub">' + L("Те саме за ", "The same for ") + mins + L(" хв для інших видів", " min for other activities") + "</div>" + UI.list([L("Активність", "Activity"), "MET", KCAL], rows, { w: "minmax(0, 1.6fr) 70px 120px" }) + hint(L("MET — середні значення з довідника фізичної активності: реальна витрата залежить від темпу, рельєфу, техніки та тренованості.", "MET values are averages from the physical activity compendium: the real expenditure depends on pace, terrain, technique and fitness.")), note: NOTE, steps, resText: kc(k) + " " + KCAL + " (" + L(a.uk, a.en) + ", " + mins + L(" хв, ", " min, ") + fnum(wv, 1) + " " + wName(imp) + ")" };
    },
    reset(h) { const { el } = h; el("cuU").value = "metric"; el("cuW").value = ""; el("cuM").value = ""; el("cuE").value = "run10"; el("cuWL").textContent = L("Вага, кг", "Weight, kg"); },
    fill(h) { const { el } = h; el("cuU").value = "metric"; el("cuW").value = "70"; el("cuM").value = "30"; el("cuE").value = "run10"; el("cuWL").textContent = L("Вага, кг", "Weight, kg"); },
    share(p, h) { const { el } = h; if (!el("cuW").value.trim() || !el("cuM").value.trim()) return; p.set("un", el("cuU").value); p.set("wt", el("cuW").value.trim()); p.set("ev", el("cuE").value); p.set("mn", el("cuM").value.trim()); },
    apply(qs, h) { const { el } = h; if (qs.has("un") && ["metric", "imp"].includes(qs.get("un"))) el("cuU").value = qs.get("un"); el("cuWL").textContent = el("cuU").value === "imp" ? L("Вага, lb", "Weight, lb") : L("Вага, кг", "Weight, kg"); if (qs.has("wt")) el("cuW").value = qs.get("wt").slice(0, 6); if (qs.has("mn")) el("cuM").value = qs.get("mn").slice(0, 4); if (qs.has("ev") && C.MET.some((q) => q.id === qs.get("ev"))) el("cuE").value = qs.get("ev"); }
  };
  return { modes: [tdee, plan, compare, met], exactNote: false };
});
