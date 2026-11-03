/* wi-calc.js — калькулятор норми води: норма на день, потовиділення на тренуванні, розклад питва */
PhysCalc.start(({ L }) => {
  const W = window.Wi, UI = window.PhysUI;
  const SEP = L(",", ".");
  const fnum = (x, d = 1) => { const v = Math.round(x * 10 ** d) / 10 ** d; return String(v).replace(".", SEP); };
  const fix = (x, d = 1) => x.toFixed(d).replace(".", SEP);
  const kc = (x) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, L(" ", ","));
  const num = (s) => { const t = String(s).replace(/\s+/g, "").replace(",", "."); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
  const NOTE = L("Це орієнтир для здорової дорослої людини, а не медичне призначення: при хворобах серця, нирок, обмеженні рідини, вагітності чи прийомі ліків норму визначає лікар.", "This is a guide for a healthy adult, not medical advice: with heart or kidney disease, fluid restriction, pregnancy or medication the amount is set by a doctor.");
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (ml || 6) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const show = (el, id, on) => { const e = el(id + "W"); if (e) e.style.display = on ? "" : "none"; };
  const setP = (el, id, v) => { const e = el(id); if (e && v !== undefined) e.value = v; };
  const shareMap = (map, p, el) => map.forEach(([k, id]) => { const e = el(id); if (e && String(e.value).trim() !== "") p.set(k, String(e.value).trim()); });
  const applyMap = (map, qs, el) => map.forEach(([k, id]) => { const e = el(id); if (!e || !qs.has(k)) return; const v = qs.get(k).slice(0, 12); if (e.tagName === "SELECT") { if ([...e.options].some((o) => o.value === v)) e.value = v; } else e.value = v; });
  // ----- одиниці -----
  const imp = (el) => el("wiU").value === "imp";
  const unitF = () => fld("wiU", L("Одиниці", "Units"), sel("wiU", [["metric", L("Метричні (кг, мл)", "Metric (kg, ml)")], ["imp", L("Імперські (lb, fl oz)", "Imperial (lb, fl oz)")]], "metric"));
  const wLabel = (el, uk, en) => (imp(el) ? L(uk + ", lb", en + ", lb") : L(uk + ", кг", en + ", kg"));
  const vLabel = (el, uk, en) => (imp(el) ? L(uk + ", fl oz", en + ", fl oz") : L(uk + ", мл", en + ", ml"));
  const wF = (id, uk, en, ph) => fld(id, '<span id="' + id + 'L">' + L(uk + ", кг", en + ", kg") + "</span>", inp(id, ph));
  const vF = (id, uk, en, ph, opt) => fld(id, '<span id="' + id + 'L">' + L(uk + ", мл", en + ", ml") + "</span>" + (opt ? L(" (необов'язково)", " (optional)") : ""), inp(id, ph));
  const WTS = [["wiW", "Вага", "Weight"], ["wiW0", "Вага до тренування", "Weight before"], ["wiW1", "Вага після тренування", "Weight after"]], VOLS = [["wiD", "Випито під час тренування", "Drunk during exercise"], ["wiUr", "Сеча під час тренування", "Urine during exercise"], ["wiN", "Норма на день", "Daily amount"], ["wiG", "Об'єм склянки", "Glass size"]];
  const refreshU = (el) => { WTS.forEach(([id, uk, en]) => { if (el(id + "L")) el(id + "L").textContent = wLabel(el, uk, en); }); VOLS.forEach(([id, uk, en]) => { if (el(id + "L")) el(id + "L").textContent = vLabel(el, uk, en); }); };
  const kgOf = (el, v) => (imp(el) ? v * W.KG_LB : v), mlOf = (el, v) => (imp(el) ? v * W.ML_OZ : v);
  const vol = (el, ml) => (imp(el) ? fix(ml / W.ML_OZ, 1) + " fl oz" : kc(ml) + " " + L("мл", "ml"));
  const lit = (ml) => fix(Math.round(ml / 10) / 100, 2);
  const readKg = (el, id, name) => { const s = el(id).value.trim(); if (!s) return null; const v = num(s); if (v === null) return { err: L(name + " — число.", name + " is a number.") }; const kg = kgOf(el, v); if (kg < 30 || kg > 300) return { err: L(name + " — від 30 до 300 кг (66–661 lb).", name + " — from 30 to 300 kg (66–661 lb).") }; return { v: kg }; };
  const readMl = (el, id, name, lo, hi, optional) => { const s = el(id).value.trim(); if (!s) return optional ? { v: 0 } : null; const v = num(s); if (v === null) return { err: L(name + " — число.", name + " is a number.") }; const ml = mlOf(el, v); if (ml < lo || ml > hi) return { err: L(name + " — від " + kc(lo) + " до " + kc(hi) + " мл (" + fnum(lo / W.ML_OZ, 0) + "–" + fnum(hi / W.ML_OZ, 0) + " fl oz).", name + " — from " + kc(lo) + " to " + kc(hi) + " ml (" + fnum(lo / W.ML_OZ, 0) + "–" + fnum(hi / W.ML_OZ, 0) + " fl oz).") }; return { v: ml }; };
  const dur = (min) => { const m = Math.round(min), h = Math.floor(m / 60), r = m % 60; return ((h ? h + L(" год ", " h ") : "") + (r || !h ? r + L(" хв", " min") : "")).trim(); };

  // ----- норма на день -----
  const MAP1 = [["sx", "wiS"], ["wt", "wiW"], ["un", "wiU"], ["ac", "wiA"], ["cl", "wiC"], ["sp", "wiP"], ["pk", "wiK"]];
  const refresh1 = (el) => { show(el, "wiP", el("wiS").value === "f"); refreshU(el); };
  const need = {
    key: "need", type: "custom", req: ({ el }) => ["wiW"], nameUk: "Норма води на день", nameEn: "Daily water need",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("wiS", L("Стать", "Sex"), sel("wiS", [["m", L("Чоловіча", "Male")], ["f", L("Жіноча", "Female")]], "m")) + wF("wiW", "Вага", "Weight", L("напр.: 75", "e.g.: 75")) + unitF() + fld("wiA", L("Активність", "Activity"), sel("wiA", [["low", L("Низька (сидяча робота, мало руху)", "Low (desk job, little movement)")], ["walk", L("Звичайна (прогулянки, без тренувань) +200 мл", "Normal (walks, no workouts) +200 ml")], ["mod", L("Помірна (тренування 3–5 разів на тиждень) +350 мл", "Moderate (workouts 3–5 times a week) +350 ml")], ["high", L("Висока (щоденні інтенсивні тренування) +700 мл", "High (intense workouts daily) +700 ml")]], "mod"), true) + fld("wiC", L("Клімат", "Climate"), sel("wiC", [["normal", L("Помірний", "Temperate")], ["hot", L("Спекотний (літо, спека) +500 мл", "Hot (summer, heat) +500 ml")]], "normal"), true) + fld("wiP", L("Особливий стан", "Special condition"), sel("wiP", [["none", L("Немає", "None")], ["preg", L("Вагітність +300 мл", "Pregnancy +300 ml")], ["lact", L("Годування груддю +700 мл", "Breastfeeding +700 ml")]], "none"), true) + fld("wiK", L("Базова норма, мл на кг ваги", "Base amount, ml per kg"), inp("wiK", "33", 4)) + '</div><div class="ph__hint ph__mt12">' + L("Базова формула — 33 мл на кг ваги (значення можна змінити в межах 20–50), плюс поправки на активність (від 0 до 700 мл), спеку й особливий стан. Це орієнтири, а не клінічна норма; нижче для порівняння наведено офіційні норми.", "The base formula is 33 ml per kg of weight (adjustable from 20 to 50), plus adjustments for activity, heat and special conditions. These are guides, not a clinical norm; official reference values are shown below for comparison.") + "</div>";
      ["wiW", "wiK"].forEach((id) => el(id).addEventListener("input", maybeCalc)); ["wiA", "wiC", "wiP"].forEach((id) => el(id).addEventListener("change", maybeCalc)); el("wiS").addEventListener("change", () => { refresh1(el); maybeCalc(); }); el("wiU").addEventListener("change", () => { refreshU(el); maybeCalc(); });
      setP(el, "wiK", String(W.ML_PER_KG)); refresh1(el);
    },
    calc(h) {
      const { el } = h, sex = el("wiS").value, wt = readKg(el, "wiW", L("Вага", "Weight"));
      if (wt && wt.err) return { ok: false, msg: wt.err };
      if (!wt) return { ok: false, incomplete: true };
      const k = num(el("wiK").value);
      if (k === null || k < 20 || k > 50) return { ok: false, msg: L("Базова норма — від 20 до 50 мл на кг.", "Base amount — from 20 to 50 ml per kg.") };
      const sp = sex === "f" ? el("wiP").value : "none", r = W.need(wt.v, k, el("wiA").value, el("wiC").value, sp), im = imp(el), warns = [];
      if (r.total > 5000) warns.push(L("Понад 5 літрів на день потрібно лише за дуже великого потовиділення; надмір води небезпечний (гіпонатріємія), особливо за короткий час.", "More than 5 litres a day is only needed with very heavy sweating; too much water is dangerous (hyponatraemia), especially in a short time."));
      if (r.total < 1200) warns.push(L("Результат дуже малий: перевірте вагу й базову норму.", "The result is very small: check the weight and the base amount."));
      const glassMl = im ? 8 * W.ML_OZ : 250, glasses = r.total / glassMl;
      const tiles = [{ k: L("Базова норма", "Base amount"), v: vol(el, r.base) }, { k: L("Активність", "Activity"), v: "+" + vol(el, r.act) }, { k: L("Клімат", "Climate"), v: "+" + vol(el, r.climate) }].concat(sp !== "none" ? [{ k: sp === "preg" ? L("Вагітність", "Pregnancy") : L("Годування груддю", "Breastfeeding"), v: "+" + vol(el, r.special) }] : []);
      const T = W.REF.efsaTotal[sex] + r.special, rows = [{ cells: [{ t: L("EFSA (ЄС)", "EFSA (EU)"), cls: "is-first" }, { t: lit(T) + L(" л", " L"), cls: "chip" }, lit(W.REF.efsaDrinks[sex]) + L(" л", " L")] }, { cells: [{ t: L("Нац. академії США", "US National Academies"), cls: "is-first" }, { t: lit(W.REF.namTotal[sex]) + L(" л", " L"), cls: "chip" }, lit(W.REF.namDrinks[sex]) + L(" л", " L")] }];
      const steps = [{ t: L("Базова норма", "Base amount"), l: [fnum(wt.v, 1) + " " + L("кг", "kg") + " × " + fnum(k, 0) + " " + L("мл/кг", "ml/kg") + " = " + kc(r.base) + " " + L("мл", "ml")] }, { t: L("Поправки", "Adjustments"), l: [L("активність +", "activity +") + kc(r.act) + L(", клімат +", ", climate +") + kc(r.climate) + (sp !== "none" ? (sp === "preg" ? L(", вагітність +", ", pregnancy +") : L(", годування +", ", breastfeeding +")) + kc(r.special) : "") + " " + L("мл", "ml"), kc(r.base) + " + " + kc(r.act + r.climate + r.special) + " = " + kc(r.total) + " " + L("мл", "ml")] }];
      return { ok: true, expr: (sex === "m" ? L("Чоловік", "Man") : L("Жінка", "Woman")) + " · " + fnum(wt.v / (im ? W.KG_LB : 1), 0) + (im ? " lb" : " " + L("кг", "kg")), head: [L("орієнтир для напоїв на день", "drinks target per day"), im ? fix(r.total / W.ML_OZ, 0) + " fl oz" : lit(r.total) + " " + L("л", "L")], subRaw: true, headSub: vol(el, r.total) + " ≈ " + fnum(glasses, 1) + L(" склянок по ", " glasses of ") + (im ? "8 fl oz" : "250 " + L("мл", "ml")), tiles, extraHtml: '<div class="ph__sub">' + L("Довідкові норми для дорослих (" + (sex === "m" ? "чоловіки" : "жінки") + ")", "Reference values for adults (" + (sex === "m" ? "men" : "women") + ")") + "</div>" + UI.list([L("Джерело", "Source"), L("Вся вода (напої й їжа)", "Total water (drinks and food)"), L("Лише напої", "Drinks only")], rows, { w: "minmax(0, 1.3fr) 160px 120px" }) + hint(L("Близько 20 % води людина отримує з їжі, тому напоїв потрібно менше за загальну норму. Довідкові значення — для помірної температури й активності.", "About 20% of water comes from food, so you need fewer drinks than the total amount. The reference values are for moderate temperature and activity.")) + warnHtml(warns), note: NOTE, steps, resText: L("Норма напоїв ", "Drinks target ") + vol(el, r.total) + " (" + fnum(wt.v / (im ? W.KG_LB : 1), 0) + (im ? " lb" : L(" кг", " kg")) + ")" };
    },
    reset(h) { const { el } = h; setP(el, "wiW", ""); setP(el, "wiS", "m"); setP(el, "wiU", "metric"); setP(el, "wiA", "mod"); setP(el, "wiC", "normal"); setP(el, "wiP", "none"); setP(el, "wiK", String(W.ML_PER_KG)); refresh1(el); },
    fill(h) { const { el } = h; setP(el, "wiS", "m"); setP(el, "wiU", "metric"); setP(el, "wiW", "75"); setP(el, "wiA", "mod"); setP(el, "wiC", "normal"); setP(el, "wiP", "none"); setP(el, "wiK", String(W.ML_PER_KG)); refresh1(el); },
    share(p, h) { const { el } = h; if (!el("wiW").value.trim()) return; shareMap(MAP1, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP1, qs, el); refresh1(el); }
  };

  // ----- потовиділення -----
  const MAP2 = [["wb", "wiW0"], ["wa", "wiW1"], ["un", "wiU"], ["dk", "wiD"], ["ur", "wiUr"], ["mn", "wiM"]];
  const sweat = {
    key: "sweat", type: "custom", req: ({ el }) => ["wiW0", "wiW1", "wiM"], nameUk: "Потовиділення на тренуванні", nameEn: "Sweat rate",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + wF("wiW0", "Вага до тренування", "Weight before", L("напр.: 70", "e.g.: 70")) + wF("wiW1", "Вага після тренування", "Weight after", L("напр.: 69,4", "e.g.: 69.4")) + unitF() + vF("wiD", "Випито під час тренування", "Drunk during exercise", L("напр.: 400", "e.g.: 400"), true) + vF("wiUr", "Сеча під час тренування", "Urine during exercise", "0", true) + fld("wiM", L("Тривалість, хв", "Duration, min"), inp("wiM", L("напр.: 60", "e.g.: 60"), 4)) + '</div><div class="ph__hint ph__mt12">' + L("Зважтеся до й після тренування (без одягу чи в однаковому сухому одязі, після того як витерлися рушником), запишіть, скільки випили, а якщо ходили в туалет, то й обсяг сечі. За зміною ваги калькулятор знайде, скільки рідини ви втрачаєте з потом за годину й скільки треба випити для відновлення.", "Weigh yourself before and after exercise (without clothes or in the same dry clothes after towelling off), note how much you drank and, if you went to the toilet, the urine volume. From the weight change the calculator finds how much fluid you lose in sweat per hour and how much to drink to recover.") + "</div>";
      ["wiW0", "wiW1", "wiD", "wiUr", "wiM"].forEach((id) => el(id).addEventListener("input", maybeCalc)); el("wiU").addEventListener("change", () => { refreshU(el); maybeCalc(); }); refreshU(el);
    },
    calc(h) {
      const { el } = h, w0 = readKg(el, "wiW0", L("Вага до", "Weight before")), w1 = readKg(el, "wiW1", L("Вага після", "Weight after")), ms = el("wiM").value.trim();
      for (const v of [w0, w1]) if (v && v.err) return { ok: false, msg: v.err };
      if (!w0 || !w1 || !ms) return { ok: false, incomplete: true };
      const dk = readMl(el, "wiD", L("Випите", "Drunk"), 0, 5000, true); if (dk.err) return { ok: false, msg: dk.err };
      const ur = readMl(el, "wiUr", L("Сеча", "Urine"), 0, 3000, true); if (ur.err) return { ok: false, msg: ur.err };
      if (!/^\d{1,3}$/.test(ms) || Number(ms) < 5 || Number(ms) > 600) return { ok: false, msg: L("Тривалість — від 5 до 600 хвилин.", "Duration — from 5 to 600 minutes.") };
      if (Math.abs(w0.v - w1.v) > 5) return { ok: false, msg: L("Зміна ваги понад 5 кг — перевірте виміри.", "A weight change above 5 kg — check your measurements.") };
      const mn = Number(ms), s = W.sweat(w0.v, w1.v, dk.v, mn, ur.v);
      if (s.loss < 0) return { ok: false, msg: L("Вага після більша за суму ваги до й випитого: перевірте виміри (сеча й випите враховані).", "The weight after is larger than the weight before plus what you drank: check your measurements (urine and drinks are included).") };
      const warns = [], im = imp(el), wOut = (kg) => (im ? fix(kg / W.KG_LB, 2) + " lb" : fix(kg, 2) + " " + L("кг", "kg"));
      if (s.rate > 2000) warns.push(L("Така швидкість потовиділення вища за типові 0,4–1,8 л/год: перевірте ваги, час і випите.", "This sweat rate is above the typical 0.4–1.8 L/h: check the weights, time and what you drank."));
      const pr = Math.round(s.pct * 10) / 10;
      if (pr >= 2) warns.push(L("Втрата маси від 2 % і більше знижує працездатність: наступного разу пийте більше під час тренування.", "A body mass loss of 2% or more reduces performance: drink more during your next workout."));
      if (s.pct < 0) warns.push(L("Ви набрали вагу: випили більше, ніж утратили. Надмір рідини під час тривалих навантажень теж небезпечний.", "You gained weight: you drank more than you lost. Too much fluid during long exercise is also dangerous."));
      const status = pr >= 2 ? L("2 % і більше", "2% or more") : pr >= 1 ? L("1–2 %", "1–2%") : L("до 1 %", "under 1%");
      const tiles = [{ k: L("Піт за тренування", "Sweat during exercise"), v: vol(el, s.loss) }, { k: L("Втрата ваги", "Weight lost"), v: wOut(s.diffKg) + " (" + fix(s.pct, 1) + " %)" }, { k: L("Рівень зневоднення", "Dehydration level"), v: status }, { k: L("Відновити питвом", "To replace by drinking"), v: s.replace > 0 ? vol(el, s.replace) : "—" }];
      const steps = [{ t: L("Піт = втрата ваги + випите − сеча", "Sweat = weight lost + drunk − urine"), l: [fnum(s.diffKg * 1000, 0) + " " + L("мл", "ml") + " + " + fnum(dk.v, 0) + " " + L("мл", "ml") + (ur.v ? " − " + fnum(ur.v, 0) + " " + L("мл", "ml") : "") + " = " + fnum(s.loss, 0) + " " + L("мл", "ml")] }, { t: L("Швидкість потовиділення", "Sweat rate"), l: [fnum(s.loss, 0) + " " + L("мл", "ml") + " / " + dur(mn) + " = " + kc(s.rate) + " " + L("мл/год", "ml/h")] }, { t: L("Відновлення", "Replacement"), l: [L("150 % втраченої ваги: ", "150% of the weight lost: ") + "1,5 × ".replace(",", SEP) + fnum(s.diffKg, 2) + " = " + kc(s.replace) + " " + L("мл", "ml")], note: L("Втрату ваги вважаємо втратою води; випите вже враховано.", "The weight loss is treated as water loss; what you drank is already included.") }];
      return { ok: true, expr: wOut(w0.v) + " → " + wOut(w1.v) + " · " + dur(mn), head: [L("потовиділення за годину", "sweat rate per hour"), im ? fix(s.rate / W.ML_OZ, 1) + " fl oz/" + L("год", "h") : kc(s.rate) + " " + L("мл/год", "ml/h")], subRaw: true, headSub: L("Втрата ваги ", "Weight lost ") + wOut(s.diffKg) + " (" + fix(s.pct, 1) + " %) · " + L("піт ", "sweat ") + vol(el, s.loss), tiles, extraHtml: warnHtml(warns) + hint(L("Орієнтири за позицією Американського коледжу спортивної медицини (ACSM): під час тренування прагніть не втрачати понад 2 % маси, а відновлювати рідину приблизно 150 % від втраченої ваги (1,5 л на кг) протягом кількох годин.", "Guides from the American College of Sports Medicine (ACSM) position: during exercise aim to lose no more than 2% of body mass, and replace about 150% of the weight lost (1.5 L per kg) over a few hours.")), note: NOTE, steps, resText: L("Потовиділення ", "Sweat rate ") + vol(el, s.rate) + L("/год, втрата ваги ", "/h, weight lost ") + wOut(s.diffKg) + " (" + fix(s.pct, 1) + " %)" };
    },
    reset(h) { const { el } = h; ["wiW0", "wiW1", "wiD", "wiUr", "wiM"].forEach((id) => setP(el, id, "")); setP(el, "wiU", "metric"); refreshU(el); },
    fill(h) { const { el } = h; setP(el, "wiU", "metric"); setP(el, "wiW0", "70"); setP(el, "wiW1", L("69,4", "69.4")); setP(el, "wiD", "400"); setP(el, "wiUr", ""); setP(el, "wiM", "60"); refreshU(el); },
    share(p, h) { const { el } = h; if (!el("wiW0").value.trim() || !el("wiW1").value.trim()) return; shareMap(MAP2, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP2, qs, el); refreshU(el); }
  };

  // ----- розклад -----
  const MAP3 = [["nd", "wiN"], ["un", "wiU"], ["wk", "wiT1"], ["sl", "wiT2"], ["gl", "wiG"]];
  const sched = {
    key: "sched", type: "custom", req: ({ el }) => ["wiN", "wiT1", "wiT2"], nameUk: "Розклад на день", nameEn: "Daily schedule",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + vF("wiN", "Норма на день", "Daily amount", L("напр.: 2500", "e.g.: 2500")) + unitF() + fld("wiT1", L("Прокидаюсь о", "I wake up at"), inp("wiT1", "07:00", 5)) + fld("wiT2", L("Лягаю спати о", "I go to bed at"), inp("wiT2", "23:00", 5)) + vF("wiG", "Об'єм склянки", "Glass size", "250", true) + '</div><div class="ph__hint ph__mt12">' + L("Калькулятор рівномірно розподілить норму від пробудження до години перед сном: перший прийом одразу після підйому, останній за годину до сну (так менше шансів прокидатися вночі). Норму візьміть з першої вкладки.", "The calculator spreads the amount evenly from waking up to an hour before bed: the first drink right after waking and the last one an hour before sleep (so you are less likely to wake at night). Take the amount from the first tab.") + "</div>";
      ["wiN", "wiT1", "wiT2", "wiG"].forEach((id) => el(id).addEventListener("input", maybeCalc)); el("wiU").addEventListener("change", () => { refreshU(el); maybeCalc(); }); refreshU(el);
    },
    calc(h) {
      const { el } = h, nd = readMl(el, "wiN", L("Норма", "Amount"), 500, 8000), t1s = el("wiT1").value.trim(), t2s = el("wiT2").value.trim();
      if (nd && nd.err) return { ok: false, msg: nd.err };
      if (!nd || !t1s || !t2s) return { ok: false, incomplete: true };
      const gl = readMl(el, "wiG", L("Склянка", "Glass"), 50, 1000, true); if (gl.err) return { ok: false, msg: gl.err };
      const glass = gl.v || (imp(el) ? 8 * W.ML_OZ : 250), a = W.parseTime(t1s), b = W.parseTime(t2s);
      if (a === null || b === null) return { ok: false, msg: L("Час — у форматі години:хвилини, наприклад 07:00.", "Time — in the hours:minutes format, for example 07:00.") };
      if (b - a < 360) return { ok: false, msg: L("Між підйомом і сном має бути щонайменше 6 годин, а сон — пізніше за підйом у межах доби.", "There must be at least 6 hours between waking and bed, with bedtime later than waking within the same day.") };
      const s = W.schedule(nd.v, a, b, glass), warns = [];
      if (Math.round(nd.v / glass) > 40) warns.push(L("Забагато прийомів: збільште склянку.", "Too many drinks: increase the glass size."));
      if (s.n > 1 && s.step < 30) warns.push(L("Прийоми частіші за кожні 30 хвилин — збільште склянку.", "Drinks more often than every 30 minutes — increase the glass size."));
      const rows = s.rows.map((r) => ({ cells: [{ t: String(r.i), cls: "is-first" }, { t: W.fmtTime(r.t), cls: "chip" }, vol(el, r.ml), vol(el, r.cum)] }));
      const tiles = [{ k: L("Один прийом", "One drink"), v: vol(el, s.each) }, { k: L("Інтервал", "Interval"), v: s.n > 1 ? dur(s.step) : "—" }, { k: L("Перший прийом", "First drink"), v: W.fmtTime(s.rows[0].t) }, { k: L("Останній прийом", "Last drink"), v: W.fmtTime(s.rows[s.n - 1].t) }];
      const steps = [{ t: L("Кількість прийомів", "Number of drinks"), l: [kc(nd.v) + " " + L("мл", "ml") + " / " + kc(glass) + " " + L("мл", "ml") + " ≈ " + fnum(nd.v / glass, 1) + " → " + s.n] }, { t: L("Інтервал", "Interval"), l: [L("(останній прийом − перший) / (", "(last drink − first drink) / (") + s.n + " − 1) = " + (s.n > 1 ? dur(s.step) : "—")] }];
      return { ok: true, expr: vol(el, nd.v) + " · " + W.fmtTime(a) + "–" + W.fmtTime(b), head: [L("прийомів води на день", "drinks per day"), String(s.n)], subRaw: true, headSub: vol(el, s.each) + (s.n > 1 ? L(" кожні ", " every ") + dur(s.step) : ""), tiles, extraHtml: '<div class="ph__sub">' + L("Час і кількість", "Time and amount") + "</div>" + UI.list([L("№", "#"), L("Час", "Time"), L("Кількість", "Amount"), L("Накопичено", "Total so far")], rows, { w: "50px 90px 1fr 1fr" }) + warnHtml(warns), note: NOTE, steps, resText: L("Норма ", "Amount ") + vol(el, nd.v) + ": " + s.n + L(" прийомів, від ", " drinks, from ") + W.fmtTime(a) + L(" до ", " to ") + W.fmtTime(s.rows[s.n - 1].t) };
    },
    reset(h) { const { el } = h; ["wiN", "wiT1", "wiT2", "wiG"].forEach((id) => setP(el, id, "")); setP(el, "wiU", "metric"); refreshU(el); },
    fill(h) { const { el } = h; setP(el, "wiU", "metric"); setP(el, "wiN", "2825"); setP(el, "wiT1", "07:00"); setP(el, "wiT2", "23:00"); setP(el, "wiG", "250"); refreshU(el); },
    share(p, h) { const { el } = h; if (!el("wiN").value.trim()) return; shareMap(MAP3, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP3, qs, el); refreshU(el); }
  };
  return { modes: [need, sweat, sched], exactNote: false };
});
