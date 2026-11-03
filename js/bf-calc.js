/* bf-calc.js — калькулятор жиру в тілі: метод ВМФ США, оцінка за ІМТ і віком (Дейренберг), склад тіла й ціль */
PhysCalc.start(({ L }) => {
  const B = window.Bf, UI = window.PhysUI;
  const SEP = L(",", ".");
  const fnum = (x, d = 1) => { const v = Math.round(x * 10 ** d) / 10 ** d; return String(v).replace(".", SEP); };
  const fix = (x, d = 1) => x.toFixed(d).replace(".", SEP);
  const num = (s) => { const t = String(s).replace(/\s+/g, "").replace(",", "."); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
  const NOTE = L("Це оцінка за формулами, а не медичний аналіз: точніше склад тіла визначають DEXA, біоімпеданс чи гідростатичне зважування. Питання здоров'я обговорюйте з лікарем.", "This is a formula-based estimate, not a medical test: body composition is measured more accurately by DEXA, bioimpedance or hydrostatic weighing. Discuss health questions with a doctor.");
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (ml || 6) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const show = (el, id, on) => { const e = el(id + "W"); if (e) e.style.display = on ? "" : "none"; };
  const setP = (el, id, v) => { const e = el(id); if (e && v !== undefined) e.value = v; };
  const shareMap = (map, p, el) => map.forEach(([k, id]) => { const e = el(id); if (e && String(e.value).trim() !== "") p.set(k, String(e.value).trim()); });
  const applyMap = (map, qs, el) => map.forEach(([k, id]) => { const e = el(id); if (!e || !qs.has(k)) return; const v = qs.get(k).slice(0, 12); if (e.tagName === "SELECT") { if ([...e.options].some((o) => o.value === v)) e.value = v; } else e.value = v; });
  // ----- поля й одиниці -----
  const imp = (el) => el("bfU").value === "imp";
  const unitF = () => fld("bfU", L("Одиниці", "Units"), sel("bfU", [["metric", L("Метричні (кг, см)", "Metric (kg, cm)")], ["imp", L("Імперські (lb, дюйми)", "Imperial (lb, in)")]], "metric"));
  const sexF = () => fld("bfS", L("Стать", "Sex"), sel("bfS", [["m", L("Чоловіча", "Male")], ["f", L("Жіноча", "Female")]], "m"));
  const lenLabel = (el, uk, en) => (imp(el) ? L(uk + ", дюйми", en + ", in") : L(uk + ", см", en + ", cm"));
  const lenF = (id, uk, en, ph, opt) => fld(id, '<span id="' + id + 'L">' + L(uk + ", см", en + ", cm") + "</span>" + (opt ? L(" (необов'язково)", " (optional)") : ""), inp(id, ph));
  const wtF = (opt) => fld("bfW", '<span id="bfWL">' + L("Вага, кг", "Weight, kg") + "</span>" + (opt ? L(" (необов'язково)", " (optional)") : ""), inp("bfW", L("напр.: 80", "e.g.: 80")));
  const LEN = [["bfH", "Зріст", "Height"], ["bfN", "Шия", "Neck"], ["bfWa", "Талія", "Waist"], ["bfP", "Стегна", "Hips"]];
  const refreshU = (el) => {
    LEN.forEach(([id, uk, en]) => { if (el(id + "L")) el(id + "L").textContent = lenLabel(el, uk, en); });
    if (el("bfWL")) el("bfWL").textContent = imp(el) ? L("Вага, lb", "Weight, lb") : L("Вага, кг", "Weight, kg");
  };
  const toCm = (el, v) => (imp(el) ? v * B.CM_IN : v), toKg = (el, v) => (imp(el) ? v * B.KG_LB : v);
  const massOut = (el, kg) => (imp(el) ? fix(kg / B.KG_LB, 1) + " " + L("lb", "lb") : fix(kg, 1) + " " + L("кг", "kg"));
  const rngErr = (el, name, lo, hi) => { const k = imp(el) ? B.CM_IN : 1, u = imp(el) ? L("дюймів", "in") : L("см", "cm"); return L(name + " — від " + fnum(lo / k, 0) + " до " + fnum(hi / k, 0) + " " + u + ".", name + " — from " + fnum(lo / k, 0) + " to " + fnum(hi / k, 0) + " " + u + "."); };
  // читання числа в діапазоні (у см): null — порожньо, {err} — помилка, {v} — значення в см
  const readLen = (el, id, name, lo, hi) => { const s = el(id).value.trim(); if (!s) return null; const v = num(s); if (v === null) return { err: L(name + " — число.", name + " is a number.") }; const cm = toCm(el, v); if (cm < lo || cm > hi) return { err: rngErr(el, name, lo, hi) }; return { v: cm }; };
  const readKg = (el, id, name) => { const s = el(id).value.trim(); if (!s) return null; const v = num(s); if (v === null) return { err: L(name + " — число.", name + " is a number.") }; const kg = toKg(el, v); if (kg < 30 || kg > 300) return { err: L(name + " — від 30 до 300 кг (66–661 lb).", name + " — from 30 to 300 kg (66–661 lb).") }; return { v: kg }; };
  const catName = (c) => L(c.uk, c.en);
  const sexName = (s) => (s === "m" ? L("чоловіки", "men") : L("жінки", "women"));
  // ----- шкала за статтю -----
  const scale = (bf, sex) => {
    const W = 600, H0 = 84, pl = 8, y = 30, hh = 30, w = W - 2 * pl, [a, b] = B.AXIS[sex], lo = B.LOWS[sex], px = (v) => pl + (w * (Math.max(a, Math.min(b, v)) - a)) / (b - a);
    const segs = B.CATS.map((c, i) => { const x0 = px(lo[i]), x1 = px(i + 1 < lo.length ? lo[i + 1] : b), sw = x1 - x0, cx = x0 + sw / 2; return '<rect x="' + x0.toFixed(1) + '" y="' + y + '" width="' + sw.toFixed(1) + '" height="' + hh + '" fill="' + c.color + '"/>' + (sw > 64 ? '<text x="' + cx.toFixed(1) + '" y="' + (y + hh / 2 + 4) + '" text-anchor="middle" font-size="11" font-weight="800" fill="' + (c.id === "fitness" || c.id === "average" ? "#2b2200" : "#fff") + '">' + catName(c) + "</text>" : ""); }).join("");
    const ticks = lo.slice(1).map((v) => '<text x="' + px(v).toFixed(1) + '" y="' + (y + hh + 15) + '" text-anchor="middle" font-size="10" fill="#5b6b8c">' + v + "</text>").join("");
    const mx = px(bf), mark = '<path d="M' + mx.toFixed(1) + " " + (y - 2) + ' l-6 -9 h12 z" fill="#1f2f55"/><text x="' + mx.toFixed(1) + '" y="' + (y - 14) + '" text-anchor="' + (mx > W - 40 ? "end" : mx < 40 ? "start" : "middle") + '" font-size="12" font-weight="800" fill="#1f2f55">' + fix(bf, 1) + " %</text>";
    return '<svg class="ph__chart" viewBox="0 0 ' + W + " " + H0 + '" width="100%" role="img" aria-label="' + L("Шкала категорій жиру в тілі", "Body fat category scale") + '">' + segs + ticks + mark + "</svg>";
  };
  const rangeText = (lo, hi) => (hi === null ? "≥ " + lo + " %" : lo + "–" + (hi - 1) + " %");
  const catTable = (sex, c) => UI.list([L("Категорія", "Category"), L("Жир у тілі, %", "Body fat, %")], B.CATS.map((k, i) => { const lo = B.LOWS[sex][i], hi = i + 1 < B.LOWS[sex].length ? B.LOWS[sex][i + 1] : null; return { main: k.id === c.id, cells: [{ t: catName(k), cls: "is-first" }, { t: rangeText(lo, hi), cls: "chip" }] }; }), { w: "minmax(0, 1.4fr) 140px" });
  const stdWarns = (bf, sex) => { const w = []; if (bf < B.LOWS[sex][0]) w.push(L("Такий низький відсоток нижчий за необхідний для життя: перевірте виміри, а за реальних значень зверніться до лікаря.", "Such a low percentage is below what is essential for life: check your measurements and, if real, see a doctor.")); if (bf > 45) w.push(L("Дуже високе значення: формули менш надійні в крайніх випадках, орієнтуйтесь на лікаря.", "A very high value: formulas are less reliable at the extremes, rely on a doctor.")); return w; };
  const catTiles = (bf, c, sex) => [{ k: L("Категорія", "Category"), v: catName(c) }, { k: L("Межі категорії", "Category range"), v: rangeText(c.lo, c.hi) }].concat(c.hi !== null ? [{ k: L("До наступної категорії", "To the next category"), v: "+" + fix(c.hi - bf, 1) + L(" п.п.", " pp") }] : []).concat(c.i > 0 ? [{ k: L("До попередньої", "To the previous"), v: "−" + fix(bf - c.lo, 1) + L(" п.п.", " pp") }] : []);

  // ----- метод ВМФ США -----
  const MAP1 = [["sx", "bfS"], ["ht", "bfH"], ["nk", "bfN"], ["wa", "bfWa"], ["hp", "bfP"], ["wt", "bfW"], ["un", "bfU"]];
  const refresh1 = (el) => { show(el, "bfP", el("bfS").value === "f"); refreshU(el); };
  const navy = {
    key: "navy", type: "custom", nameUk: "Метод ВМФ США", nameEn: "US Navy method",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + sexF() + lenF("bfH", "Зріст", "Height", L("напр.: 178", "e.g.: 178")) + lenF("bfN", "Шия", "Neck", L("напр.: 38", "e.g.: 38")) + lenF("bfWa", "Талія", "Waist", L("напр.: 85", "e.g.: 85")) + lenF("bfP", "Стегна", "Hips", L("напр.: 100", "e.g.: 100")) + wtF(true) + unitF() + '</div><div class="ph__hint ph__mt12">' + L("Шия: нижче кадика, стрічка трохи нахилена вниз спереду. Талія: чоловікам на рівні пупка, жінкам у найвужчому місці (зазвичай трохи вище пупка), після звичайного видиху без утягування живота. Стегна (жінкам): у найширшому місці сідниць. Мірьте стрічкою щільно, але не стискаючи шкіру.", "Neck: below the Adam's apple, the tape slightly angled down at the front. Waist: for men at the navel, for women at the narrowest point (usually a little above the navel), after a normal exhale without sucking in. Hips (women): at the widest part of the buttocks. Keep the tape snug but not pressing into the skin.") + "</div>";
      ["bfH", "bfN", "bfWa", "bfP", "bfW"].forEach((id) => el(id).addEventListener("input", maybeCalc)); el("bfS").addEventListener("change", () => { refresh1(el); maybeCalc(); }); el("bfU").addEventListener("change", () => { refreshU(el); maybeCalc(); }); refresh1(el);
    },
    calc(h) {
      const { el } = h, sex = el("bfS").value, f = sex === "f";
      const ht = readLen(el, "bfH", L("Зріст", "Height"), 120, 230), nk = readLen(el, "bfN", L("Шия", "Neck"), 20, 70), wa = readLen(el, "bfWa", L("Талія", "Waist"), 40, 200), hp = f ? readLen(el, "bfP", L("Стегна", "Hips"), 50, 200) : { v: 0 };
      for (const v of [ht, nk, wa, hp]) if (v && v.err) return { ok: false, msg: v.err };
      if (!ht || !nk || !wa || !hp) return { ok: false, incomplete: true };
      const wt = readKg(el, "bfW", L("Вага", "Weight")); if (wt && wt.err) return { ok: false, msg: wt.err };
      if (!f && wa.v <= nk.v) return { ok: false, msg: L("Талія має бути більшою за шию.", "The waist must be larger than the neck.") };
      const bf = B.navy(sex, ht.v, nk.v, wa.v, hp.v);
      if (!Number.isFinite(bf) || bf <= 0 || bf > 70) return { ok: false, msg: L("Результат поза межами формули: перевірте виміри.", "The result is outside the range of the formula: check your measurements.") };
      const c = B.cat(bf, sex), tiles = catTiles(bf, c, sex), warns = stdWarns(bf, sex);
      if (wt) { const m = B.comp(wt.v, bf); tiles.push({ k: L("Жирова маса", "Fat mass"), v: massOut(el, m.fat) }, { k: L("Суха маса", "Lean mass"), v: massOut(el, m.lean) }); }
      const lg = (x) => fnum(Math.log10(x), 4);
      const steps = [sex === "m" ? { t: L("Чоловіки: формула ВМФ", "Men: Navy formula"), l: [L("талія − шия = ", "waist − neck = ") + fnum(wa.v - nk.v, 1) + " " + L("см", "cm"), "495 / (1,0324 − 0,19077·lg(" .replace(/,/g, SEP) + fnum(wa.v - nk.v, 1) + ") + 0,15456·lg(".replace(/,/g, SEP) + fnum(ht.v, 1) + ")) − 450 = " + fix(bf, 1) + " %"] } : { t: L("Жінки: формула ВМФ", "Women: Navy formula"), l: [L("талія + стегна − шия = ", "waist + hips − neck = ") + fnum(wa.v + hp.v - nk.v, 1) + " " + L("см", "cm"), "495 / (1,29579 − 0,35004·lg(".replace(/,/g, SEP) + fnum(wa.v + hp.v - nk.v, 1) + ") + 0,221·lg(".replace(/,/g, SEP) + fnum(ht.v, 1) + ")) − 450 = " + fix(bf, 1) + " %"] }];
      return { ok: true, expr: sexName(sex).replace(/^./, (s) => s.toUpperCase()) + " · " + fnum(ht.v, 0) + " " + L("см", "cm"), head: [L("жиру в тілі", "body fat"), fix(bf, 1) + " %"], subRaw: true, headSub: catName(c) + " (" + sexName(sex) + ")", tiles, extraHtml: '<div class="ph__sub">' + L("Шкала категорій (ACE)", "Category scale (ACE)") + "</div>" + scale(bf, sex) + catTable(sex, c) + warnHtml(warns) + hint(L("Метод обхватів зазвичай помиляється на кілька відсоткових пунктів порівняно з лабораторними методами.", "The circumference method usually errs by a few percentage points compared with laboratory methods.")), note: NOTE, steps, resText: L("Жир у тілі ", "Body fat ") + fix(bf, 1) + " % (" + catName(c) + ", " + sexName(sex) + L(", метод ВМФ США)", ", US Navy method)") };
    },
    reset(h) { const { el } = h; ["bfH", "bfN", "bfWa", "bfP", "bfW"].forEach((id) => setP(el, id, "")); setP(el, "bfS", "m"); setP(el, "bfU", "metric"); refresh1(el); },
    fill(h) { const { el } = h; setP(el, "bfS", "m"); setP(el, "bfU", "metric"); setP(el, "bfH", "178"); setP(el, "bfN", "38"); setP(el, "bfWa", "85"); setP(el, "bfP", ""); setP(el, "bfW", "80"); refresh1(el); },
    share(p, h) { const { el } = h; if (!el("bfH").value.trim() && !el("bfWa").value.trim()) return; shareMap(MAP1, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP1, qs, el); refresh1(el); }
  };

  // ----- за ІМТ і віком -----
  const MAP2 = [["sx", "bfS"], ["ag", "bfA"], ["wt", "bfW"], ["ht", "bfH"], ["un", "bfU"]];
  const bmi = {
    key: "bmi", type: "custom", nameUk: "За ІМТ і віком", nameEn: "From BMI and age",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + sexF() + fld("bfA", L("Вік, років", "Age, years"), inp("bfA", L("напр.: 30", "e.g.: 30"), 3)) + wtF() + lenF("bfH", "Зріст", "Height", L("напр.: 178", "e.g.: 178")) + unitF() + '</div><div class="ph__hint ph__mt12">' + L("Груба оцінка за формулою Дейренберга: жир залежить від ІМТ, віку й статі. Не потребує вимірювань стрічкою, але менш точна, ніж обхвати: вона не відрізняє м'язи від жиру.", "A rough estimate by the Deurenberg formula: fat depends on BMI, age and sex. It needs no tape measurements but is less accurate than circumferences: it cannot tell muscle from fat.") + "</div>";
      ["bfA", "bfW", "bfH"].forEach((id) => el(id).addEventListener("input", maybeCalc)); ["bfS", "bfU"].forEach((id) => el(id).addEventListener("change", () => { refreshU(el); maybeCalc(); })); refreshU(el);
    },
    calc(h) {
      const { el } = h, sex = el("bfS").value, as = el("bfA").value.trim();
      const wt = readKg(el, "bfW", L("Вага", "Weight")), ht = readLen(el, "bfH", L("Зріст", "Height"), 120, 230);
      for (const v of [wt, ht]) if (v && v.err) return { ok: false, msg: v.err };
      if (!as || !wt || !ht) return { ok: false, incomplete: true };
      if (!/^\d{1,3}$/.test(as) || Number(as) > 90) return { ok: false, msg: L("Вік — ціле число років.", "Age is a whole number of years.") };
      const age = Number(as);
      if (age < 18) return { ok: false, msg: L("Формула призначена для дорослих (від 18 років): для дітей і підлітків використовують інші моделі.", "The formula is for adults (18 and over): other models are used for children and teenagers.") };
      const b = B.bmi(wt.v, ht.v), bf = B.deurenberg(wt.v, ht.v, age, sex);
      if (!(bf > 0 && bf < 70)) return { ok: false, msg: L("Результат поза межами формули: перевірте вагу, зріст і вік.", "The result is outside the range of the formula: check weight, height and age.") };
      const c = B.cat(bf, sex), tiles = [{ k: L("ІМТ", "BMI"), v: fix(b, 1) }].concat(catTiles(bf, c, sex)), warns = stdWarns(bf, sex), m = B.comp(wt.v, bf);
      tiles.push({ k: L("Жирова маса", "Fat mass"), v: massOut(el, m.fat) }, { k: L("Суха маса", "Lean mass"), v: massOut(el, m.lean) });
      if (b >= 30) warns.push(L("При ІМТ від 30 формула, за даними авторів, трохи завищує жир.", "At a BMI of 30 or more the formula, according to its authors, slightly overestimates fat."));
      if (b < 18.5) warns.push(L("При дуже малій вазі формула менш надійна.", "At a very low weight the formula is less reliable."));
      const steps = [{ t: L("ІМТ", "BMI"), l: [fnum(wt.v, 1) + " / (" + fnum(ht.v / 100, 2) + ")² = " + fnum(b, 2)] }, { t: L("Формула Дейренберга", "Deurenberg formula"), l: ["1,20·ІМТ + 0,23·вік − 10,8·стать − 5,4".replace(/,/g, SEP).replace(/ІМТ/, L("ІМТ", "BMI")).replace(/вік/, L("вік", "age")).replace(/стать/, L("стать", "sex")), "1,20·" .replace(",", SEP) + fnum(b, 2) + " + 0,23·".replace(",", SEP) + age + " − 10,8·".replace(",", SEP) + (sex === "m" ? 1 : 0) + " − 5,4 = ".replace(",", SEP) + fix(bf, 1) + " %"], note: L("Стать: чоловіки 1, жінки 0.", "Sex: men 1, women 0.") }];
      return { ok: true, expr: sexName(sex).replace(/^./, (s) => s.toUpperCase()) + " · " + age + L(" р.", " y"), head: [L("жиру в тілі (оцінка)", "body fat (estimate)"), fix(bf, 1) + " %"], subRaw: true, headSub: catName(c) + " (" + sexName(sex) + ")", tiles, extraHtml: '<div class="ph__sub">' + L("Шкала категорій (ACE)", "Category scale (ACE)") + "</div>" + scale(bf, sex) + catTable(sex, c) + warnHtml(warns) + hint(L("Стандартна похибка формули в дослідженні авторів — приблизно 4 відсоткові пункти.", "The standard error of the formula in its authors' study is about 4 percentage points.")), note: NOTE, steps, resText: L("Жир у тілі ≈ ", "Body fat ≈ ") + fix(bf, 1) + " % (" + catName(c) + ", " + sexName(sex) + L(", за ІМТ і віком)", ", from BMI and age)") };
    },
    reset(h) { const { el } = h; ["bfA", "bfW", "bfH"].forEach((id) => setP(el, id, "")); setP(el, "bfS", "m"); setP(el, "bfU", "metric"); refreshU(el); },
    fill(h) { const { el } = h; setP(el, "bfS", "m"); setP(el, "bfU", "metric"); setP(el, "bfA", "30"); setP(el, "bfW", "80"); setP(el, "bfH", "178"); refreshU(el); },
    share(p, h) { const { el } = h; if (!el("bfW").value.trim()) return; shareMap(MAP2, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP2, qs, el); refreshU(el); }
  };

  // ----- склад тіла й ціль -----
  const MAP3 = [["sx", "bfS"], ["wt", "bfW"], ["un", "bfU"], ["bf", "bfF"], ["ht", "bfH"], ["tg", "bfT"]];
  const comp = {
    key: "comp", type: "custom", nameUk: "Склад тіла й ціль", nameEn: "Body composition and goal",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + sexF() + wtF() + unitF() + fld("bfF", L("Жиру в тілі зараз, %", "Body fat now, %"), inp("bfF", L("напр.: 20", "e.g.: 20"), 5)) + lenF("bfH", "Зріст", "Height", L("напр.: 178", "e.g.: 178"), true) + fld("bfT", L("Ціль, % жиру", "Goal, % body fat") + L(" (необов'язково)", " (optional)"), inp("bfT", L("напр.: 15", "e.g.: 15"), 5)) + '</div><div class="ph__hint ph__mt12">' + L("Введіть вагу та відсоток жиру (з вимірювання чи будь-якої вкладки) — отримаєте жирову й суху масу. Якщо задати ціль у відсотках, калькулятор покаже вагу при цілі в припущенні, що суха маса (м'язи, кістки, вода) не змінюється.", "Enter your weight and body fat percentage (from a measurement or any tab) to get fat and lean mass. If you set a goal percentage, the calculator shows the weight at that goal assuming lean mass (muscle, bone, water) stays the same.") + "</div>";
      ["bfW", "bfF", "bfH", "bfT"].forEach((id) => el(id).addEventListener("input", maybeCalc)); ["bfS", "bfU"].forEach((id) => el(id).addEventListener("change", () => { refreshU(el); maybeCalc(); })); refreshU(el);
    },
    calc(h) {
      const { el } = h, sex = el("bfS").value, fs = el("bfF").value.trim();
      const wt = readKg(el, "bfW", L("Вага", "Weight")), ht = readLen(el, "bfH", L("Зріст", "Height"), 120, 230);
      for (const v of [wt, ht]) if (v && v.err) return { ok: false, msg: v.err };
      if (!wt || !fs) return { ok: false, incomplete: true };
      const bf = num(fs); if (bf === null || bf < 3 || bf > 60) return { ok: false, msg: L("Відсоток жиру — від 3 до 60.", "Body fat percentage — from 3 to 60.") };
      const ts = el("bfT").value.trim(); let tg = null;
      if (ts) { tg = num(ts); if (tg === null || tg < 3 || tg > 60) return { ok: false, msg: L("Ціль — від 3 до 60 % жиру.", "Goal — from 3 to 60% body fat.") }; }
      const c = B.cat(bf, sex), m = B.comp(wt.v, bf, ht ? ht.v : 0), warns = stdWarns(bf, sex);
      const tiles = [{ k: L("Жирова маса", "Fat mass"), v: massOut(el, m.fat) }, { k: L("Суха маса", "Lean mass"), v: massOut(el, m.lean) }, { k: L("Категорія", "Category"), v: catName(c) }];
      if (ht) tiles.push({ k: L("Індекс жирової маси (FMI)", "Fat mass index (FMI)"), v: fix(m.fmi, 1) + " " + L("кг/м²", "kg/m²") }, { k: L("Індекс безжирової маси (FFMI)", "Fat-free mass index (FFMI)"), v: fix(m.ffmi, 1) + " " + L("кг/м²", "kg/m²") });
      const steps = [{ t: L("Жирова й суха маса", "Fat and lean mass"), l: [fnum(wt.v, 1) + " × " + fix(bf, 1) + " % = " + fnum(m.fat, 1) + " " + L("кг жиру", "kg of fat"), fnum(wt.v, 1) + " − " + fnum(m.fat, 1) + " = " + fnum(m.lean, 1) + " " + L("кг сухої маси", "kg of lean mass")] }];
      let extra = "", sub = L("Суха маса ", "Lean mass ") + massOut(el, m.lean);
      if (tg !== null) {
        const t = B.target(wt.v, bf, tg), tc = B.cat(tg, sex), loss = t.fatChange > 0;
        tiles.push({ k: L("Вага при цілі", "Weight at the goal"), v: massOut(el, t.weight) }, { k: loss ? L("Скинути жиру", "Fat to lose") : L("Набрати (жир)", "To gain (fat)"), v: massOut(el, Math.abs(t.fatChange)) }, { k: L("Категорія цілі", "Goal category"), v: catName(tc) });
        steps.push({ t: L("Вага при цілі " + fnum(tg, 1) + " %", "Weight at the goal of " + fnum(tg, 1) + "%"), l: [L("вага = суха маса / (1 − ціль) = ", "weight = lean mass / (1 − goal) = ") + fnum(m.lean, 1) + " / (1 − " + fnum(tg / 100, 3) + ") = " + fnum(t.weight, 1) + " " + L("кг", "kg"), (loss ? L("скинути жиру: ", "fat to lose: ") : L("набрати: ", "to gain: ")) + fnum(wt.v, 1) + " − " + fnum(t.weight, 1) + " = " + fnum(t.fatChange, 1) + " " + L("кг", "kg")] });
        sub = (loss ? L("До цілі скинути ", "To reach the goal lose ") : L("До цілі набрати ", "To reach the goal gain ")) + massOut(el, Math.abs(t.fatChange)) + L(" жиру · вага ", " of fat · weight ") + massOut(el, t.weight);
        if (tg < B.LOWS[sex][0]) warns.push(L("Ціль нижча за необхідний жир для " + sexName(sex) + " (" + B.LOWS[sex][0] + " %): це небезпечно для здоров'я.", "The goal is below essential fat for " + sexName(sex) + " (" + B.LOWS[sex][0] + "%): this is unsafe for your health."));
        else if (tg < B.LOWS[sex][1]) warns.push(L("Це дуже низький рівень жиру, характерний для спортсменів: утримувати його довго складно й не завжди безпечно.", "This is a very low fat level typical of athletes: keeping it long-term is hard and not always safe."));
        if (!loss && tg > bf) warns.push(L("Ціль вища за поточний відсоток: розрахунок показує набір жиру.", "The goal is higher than the current percentage: the calculation shows a fat gain."));
        warns.push(L("Припущення про незмінну суху масу спрощене: при дефіциті калорій частина ваги втрачається й з м'язів. Скористайтеся калькулятором калорій для темпу й терміну.", "The assumption of constant lean mass is simplified: in a calorie deficit part of the weight also comes from muscle. Use the calorie calculator for the pace and time."));
        extra = '<div class="ph__sub">' + L("Ціль " + fnum(tg, 1) + " % жиру", "Goal of " + fnum(tg, 1) + "% body fat") + "</div>" + hint(L("Вага при цілі " + massOut(el, t.weight) + " (зараз " + massOut(el, wt.v) + "), суха маса лишається " + massOut(el, m.lean) + ".", "Weight at the goal " + massOut(el, t.weight) + " (now " + massOut(el, wt.v) + "), lean mass stays at " + massOut(el, m.lean) + "."));
      }
      return { ok: true, expr: sexName(sex).replace(/^./, (s) => s.toUpperCase()) + " · " + massOut(el, wt.v) + " · " + fix(bf, 1) + " %", head: [L("жирова маса", "fat mass"), massOut(el, m.fat)], subRaw: true, headSub: sub, tiles, extraHtml: '<div class="ph__sub">' + L("Шкала категорій (ACE)", "Category scale (ACE)") + "</div>" + scale(bf, sex) + extra + warnHtml(warns), note: NOTE, steps, resText: L("Жирова маса ", "Fat mass ") + massOut(el, m.fat) + L(", суха ", ", lean ") + massOut(el, m.lean) + " (" + fix(bf, 1) + " %)" + (tg !== null ? L("; ціль ", "; goal ") + fnum(tg, 1) + " %: " + massOut(el, B.target(wt.v, bf, tg).weight) : "") };
    },
    reset(h) { const { el } = h; ["bfW", "bfF", "bfH", "bfT"].forEach((id) => setP(el, id, "")); setP(el, "bfS", "m"); setP(el, "bfU", "metric"); refreshU(el); },
    fill(h) { const { el } = h; setP(el, "bfS", "m"); setP(el, "bfU", "metric"); setP(el, "bfW", "80"); setP(el, "bfF", "20"); setP(el, "bfH", "178"); setP(el, "bfT", "15"); refreshU(el); },
    share(p, h) { const { el } = h; if (!el("bfW").value.trim() || !el("bfF").value.trim()) return; shareMap(MAP3, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP3, qs, el); refreshU(el); }
  };
  return { modes: [navy, bmi, comp], exactNote: false };
});
