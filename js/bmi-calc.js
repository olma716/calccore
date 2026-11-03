/* bmi-calc.js — калькулятор ІМТ: ІМТ і категорія ВООЗ, цільова вага, таблиця норми за зростом */
PhysCalc.start(({ L }) => {
  const B = window.Bmi, UI = window.PhysUI;
  const SEP = L(",", ".");
  const fnum = (x, d = 1) => { const v = Math.round(x * 10 ** d) / 10 ** d; return String(v).replace(".", SEP); };
  const num = (s) => { const t = String(s).replace(/\s+/g, "").replace(",", "."); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
  const intOf = (s) => (/^\d{1,3}$/.test(String(s).trim()) ? Number(String(s).trim()) : null);
  const NOTE = L("Це орієнтир, а не діагноз: ІМТ не відрізняє м'язову масу від жирової й не враховує розподіл жиру. Для оцінки здоров'я зверніться до лікаря.", "This is a guide, not a diagnosis: BMI does not tell muscle from fat and ignores fat distribution. See a doctor to assess your health.");
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (ml || 6) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const wName = (imp) => (imp ? "lb" : L("кг", "kg"));
  const toUser = (kg, imp) => (imp ? kg / B.KG_PER_LB : kg);
  const wTxt = (kg, imp, d = 1) => fnum(toUser(kg, imp), d) + " " + wName(imp);
  const show = (el, id, on) => { const e = el(id + "W"); if (e) e.style.display = on ? "" : "none"; };
  const unitF = () => fld("bmU", L("Одиниці", "Units"), sel("bmU", [["metric", L("Метричні (кг, см)", "Metric (kg, cm)")], ["imp", L("Імперські (lb, ft/in)", "Imperial (lb, ft/in)")]], "metric"));
  const weightF = (label) => fld("bmW", '<span id="bmWL">' + (label || L("Вага, кг", "Weight, kg")) + "</span>", inp("bmW", L("напр.: 75", "e.g.: 75")));
  const heightF = () => fld("bmH", L("Зріст, см", "Height, cm"), inp("bmH", L("напр.: 178", "e.g.: 178"))) + fld("bmFt", L("Зріст, фути", "Height, ft"), inp("bmFt", "5", 1)) + fld("bmIn", L("Зріст, дюйми", "Height, in"), inp("bmIn", "10", 4));
  const refresh = (el) => { const imp = el("bmU").value === "imp"; if (el("bmWL")) el("bmWL").textContent = imp ? L("Вага, lb", "Weight, lb") : L("Вага, кг", "Weight, kg"); show(el, "bmH", !imp); show(el, "bmFt", imp); show(el, "bmIn", imp); if (el("bmGL")) el("bmGL").textContent = L("Цільовий ІМТ", "Target BMI"); };
  const wire = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); if (e) e.addEventListener(e.tagName === "SELECT" ? "change" : "input", () => { refresh(el); maybeCalc(); }); });
  const setP = (el, id, v) => { const e = el(id); if (e && v !== undefined) e.value = v; };
  const shareMap = (map, p, el) => map.forEach(([k, id]) => { const e = el(id); if (e && String(e.value).trim() !== "") p.set(k, String(e.value).trim()); });
  const applyMap = (map, qs, el) => { if (qs.has("un") && ["metric", "imp"].includes(qs.get("un"))) el("bmU").value = qs.get("un"); refresh(el); map.forEach(([k, id]) => { const e = el(id); if (!e || !qs.has(k)) return; const v = qs.get(k).slice(0, 12); if (e.tagName === "SELECT") { if ([...e.options].some((o) => o.value === v)) e.value = v; } else e.value = v; }); refresh(el); };
  // читання зросту (см) і ваги (кг)
  function readBody(el, needWeight) {
    const imp = el("bmU").value === "imp", ws = el("bmW") ? el("bmW").value.trim() : "", hs = imp ? el("bmFt").value.trim() : el("bmH").value.trim();
    if (!hs || (needWeight && !ws)) return { incomplete: true };
    let h;
    if (imp) { const ft = num(hs), inch = el("bmIn").value.trim() ? num(el("bmIn").value) : 0; if (ft === null || inch === null) return { err: L("Зріст — числа (фути й дюйми).", "Height — numbers (feet and inches).") }; h = (ft * 12 + inch) * B.CM_PER_IN; }
    else { h = num(hs); if (h === null) return { err: L("Зріст — число в сантиметрах.", "Height is a number in centimetres.") }; }
    if (h < 100 || h > 250) return { err: L("Зріст — від 100 до 250 см (3′3″–8′2″).", "Height — from 100 to 250 cm (3′3″–8′2″).") };
    let w = null;
    if (ws) { const wv = num(ws); if (wv === null) return { err: L("Вага — число.", "Weight is a number.") }; w = imp ? wv * B.KG_PER_LB : wv; if (w < 20 || w > 400) return { err: L("Вага — від 20 до 400 кг (44–881 lb).", "Weight — from 20 to 400 kg (44–881 lb).") }; }
    return { imp, h, w };
  }
  const scale = (b) => {
    const W = 600, H0 = 92, pl = 8, pr = 8, y = 34, hh = 26, lo = 14, hi = 42, px = (v) => pl + ((W - pl - pr) * (Math.min(hi, Math.max(lo, v)) - lo)) / (hi - lo);
    const segs = B.CATS.map((c, i) => { const a = Math.max(lo, c.lo), z = i < B.CATS.length - 1 ? B.CATS[i + 1].lo : hi; return '<rect x="' + px(a).toFixed(1) + '" y="' + y + '" width="' + (px(z) - px(a)).toFixed(1) + '" height="' + hh + '" fill="' + c.color + '"/>'; }).join("");
    const ticks = [16, 18.5, 25, 30, 35, 40].map((t) => '<text x="' + px(t).toFixed(1) + '" y="' + (y + hh + 16) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#5b6b8c">' + String(t).replace(".", SEP) + "</text>").join("");
    const mark = '<path d="M' + px(b).toFixed(1) + " " + (y - 2) + " l-7 -10 h14 z\" fill=\"#1f2f55\"/><text x=\"" + px(b).toFixed(1) + '" y="' + (y - 16) + '" text-anchor="middle" font-size="12" font-weight="800" fill="#1f2f55">' + fnum(b, 1) + "</text>";
    return '<svg class="ph__chart" viewBox="0 0 ' + W + " " + H0 + '" width="100%" role="img" aria-label="' + L("Шкала ІМТ", "BMI scale") + '">' + segs + ticks + mark + "</svg>";
  };
  const catRows = (h, imp, b) => B.CATS.map((c, i) => { const lo = c.lo, hi = i < B.CATS.length - 1 ? B.CATS[i + 1].lo : null, cur = b !== null && B.cat(b).id === c.id; const bm = hi === null ? "≥ " + fnum(lo, 1) : i === 0 ? "< " + fnum(hi, 1) : fnum(lo, 1) + "–" + fnum(hi - 0.1, 1); const wt = hi === null ? "≥ " + wTxt(B.wAt(lo, h), imp, 0) : i === 0 ? "< " + wTxt(B.wAt(hi, h), imp, 0) : fnum(toUser(B.wAt(lo, h), imp), 0) + "–" + wTxt(B.wAt(hi, h), imp, 0); return { cells: [{ t: L(c.uk, c.en), cls: "strong" }, { t: bm, cls: "muted" }, { t: wt, cls: cur ? "chip" : "" }], main: cur }; });
  const catTable = (h, imp, b) => UI.list([L("Категорія", "Category"), L("ІМТ", "BMI"), L("Вага для вашого зросту", "Weight for your height")], catRows(h, imp, b), { w: "minmax(0, 1.5fr) 100px minmax(0, 1.2fr)" });
  const MAPB = [["wt", "bmW"], ["ht", "bmH"], ["ft", "bmFt"], ["ic", "bmIn"], ["ag", "bmA"], ["st", "bmS"]];

  // ----- мій ІМТ -----
  const mine = {
    key: "bmi", type: "custom", nameUk: "Мій ІМТ", nameEn: "My BMI",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + weightF() + heightF() + unitF() + fld("bmA", L("Вік, років", "Age, years"), inp("bmA", L("необов'язково", "optional"), 3)) + fld("bmS", L("Орієнтири", "Reference"), sel("bmS", [["who", L("Стандарт ВООЗ", "WHO standard")], ["asia", L("ВООЗ + азійські орієнтири", "WHO + Asian action points")]], "who"), true) + "</div>";
      wire(el, maybeCalc, ["bmU", "bmW", "bmH", "bmFt", "bmIn", "bmA", "bmS"]); refresh(el);
    },
    calc(h) {
      const { el } = h, p = readBody(el, true);
      if (p.incomplete) return { ok: false, incomplete: true };
      if (p.err) return { ok: false, msg: p.err };
      const warns = [], as = el("bmA").value.trim();
      if (as) { const age = intOf(as); if (age === null || age < 2 || age > 120) return { ok: false, msg: L("Вік — ціле число від 2 до 120 років.", "Age — a whole number from 2 to 120 years.") }; if (age < 18) warns.push(L("Для дітей і підлітків ІМТ оцінюють за перцентильними таблицями віку й статі: категорії дорослих тут лише орієнтир.", "For children and teenagers BMI is assessed with age- and sex-specific percentile charts: the adult categories here are only a guide.")); }
      const b = B.bmi(p.w, p.h), c = B.cat(b), b1 = Math.round(b * 10) / 10, [lo, hi] = B.normalRange(p.h), asia = el("bmS").value === "asia", imp = p.imp;
      if (B.cat(b1).id !== c.id) warns.push(L("Точне значення ІМТ — " + fnum(b, 2) + ": воно належить до категорії «" + c.uk + "», хоча округлене число " + fnum(b1, 1) + " стоїть на межі.", "The exact BMI is " + fnum(b, 2) + ": it belongs to “" + c.en + "”, although the rounded " + fnum(b1, 1) + " sits on the boundary."));
      let toNorm, toNormTxt;
      if (b < 18.5) { toNorm = lo - p.w; toNormTxt = toNorm < 0.05 ? L("менше 0,1", "under 0.1") + " " + wName(imp) : "+" + wTxt(toNorm, imp); } else if (b >= 25) { toNorm = p.w - hi; toNormTxt = toNorm < 0.05 ? "−" + L("менше 0,1", "under 0.1") + " " + wName(imp) : "−" + wTxt(toNorm, imp); } else { toNormTxt = L("у нормі", "in the normal range"); }
      const ast = B.asiaStatus(b), asiaTxt = [L("нижче 23: поза підвищеним ризиком", "below 23: below the increased-risk point"), L("23–27,4: підвищений ризик", "23–27.4: increased risk"), L("від 27,5: високий ризик", "27.5 and above: high risk")][ast];
      const steps = [{ t: L("ІМТ = вага / зріст²", "BMI = weight / height²"), l: [fnum(p.w, 1) + " / (" + fnum(p.h / 100, 2) + ")² = " + fnum(b, 2)], note: L("Зріст у метрах, вага в кілограмах; для фунтів і дюймів значення переводяться автоматично.", "Height in metres, weight in kilograms; pounds and inches are converted automatically.") }, { t: L("Категорія за ВООЗ", "WHO category"), l: [L(c.uk, c.en) + " (" + fnum(b, 2) + ")"], note: L("Межі: 16, 17, 18,5, 25, 30, 35 і 40; нижня межа входить у категорію.", "Limits: 16, 17, 18.5, 25, 30, 35 and 40; the lower limit belongs to the category.") }, { t: L("Нормальна вага для вашого зросту", "Normal weight for your height"), l: [fnum(18.5, 1) + " × " + fnum(p.h / 100, 2) + "² = " + fnum(lo, 1) + " " + L("кг", "kg"), "25 × " + fnum(p.h / 100, 2) + "² = " + fnum(hi, 1) + " " + L("кг", "kg")] }];
      const tiles = [{ k: L("Нормальна вага", "Normal weight"), v: fnum(toUser(lo, imp), 1) + "–" + wTxt(hi, imp) }, { k: L("До норми", "To the normal range"), v: toNormTxt }, { k: "BMI Prime", v: fnum(B.prime(b), 2) }, { k: L("Новий ІМТ (Трефетен)", "New BMI (Trefethen)"), v: fnum(B.newBmi(p.w, p.h), 1) }, { k: L("Точне значення", "Exact value"), v: fnum(b, 2) }].concat(asia ? [{ k: L("Азійські орієнтири", "Asian action points"), v: asiaTxt }] : []);
      return { ok: true, expr: wTxt(p.w, imp) + " · " + (imp ? fnum(p.h / B.CM_PER_IN, 1) + " in" : fnum(p.h, 1) + L(" см", " cm")), head: [L("ІМТ", "BMI"), fnum(b, 1)], headSub: L(c.uk, c.en), subRaw: true, tiles, extraHtml: '<div class="ph__sub">' + L("Шкала ІМТ", "BMI scale") + "</div>" + scale(b) + '<div class="ph__sub">' + L("Категорії для вашого зросту", "Categories for your height") + "</div>" + catTable(p.h, imp, b) + warnHtml(warns) + (asia ? hint(L("Азійські орієнтири 23,0 і 27,5 — це «точки дій» щодо громадського здоров'я з консультації ВООЗ 2004 року, а не офіційні категорії. У різних популяціях ризик настає за ІМТ 22–25 (підвищений) і 26–31 (високий).", "The Asian points 23.0 and 27.5 are public health “action points” from the 2004 WHO consultation, not official categories. In different populations risk starts at a BMI of 22–25 (increased) and 26–31 (high).")) : ""), note: NOTE, steps, resText: L("ІМТ ", "BMI ") + fnum(b, 1) + " (" + L(c.uk, c.en) + "); " + L("нормальна вага ", "normal weight ") + fnum(toUser(lo, imp), 1) + "–" + wTxt(hi, imp) };
    },
    reset(h) { const { el } = h; ["bmW", "bmH", "bmFt", "bmIn", "bmA"].forEach((id) => setP(el, id, "")); setP(el, "bmU", "metric"); setP(el, "bmS", "who"); refresh(el); },
    fill(h) { const { el } = h; setP(el, "bmU", "metric"); setP(el, "bmW", "75"); setP(el, "bmH", "178"); setP(el, "bmFt", ""); setP(el, "bmIn", ""); setP(el, "bmA", ""); setP(el, "bmS", "who"); refresh(el); },
    share(p, h) { const { el } = h; if (!el("bmW").value.trim()) return; p.set("un", el("bmU").value); shareMap(MAPB, p, el); },
    apply(qs, h) { applyMap(MAPB, qs, h.el); }
  };

  // ----- цільова вага -----
  const MAPT = [["wt", "bmW"], ["ht", "bmH"], ["ft", "bmFt"], ["ic", "bmIn"], ["tb", "bmG"]];
  const target = {
    key: "target", type: "custom", nameUk: "Цільова вага", nameEn: "Target weight",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + weightF(L("Поточна вага, кг (необов'язково)", "Current weight, kg (optional)")) + heightF() + unitF() + fld("bmG", '<span id="bmGL">' + L("Цільовий ІМТ", "Target BMI") + "</span>", inp("bmG", L("напр.: 22", "e.g.: 22"), 5), true) + '</div><div class="ph__hint ph__mt12">' + L("Нормальний ІМТ — від 18,5 до 25; середина норми — близько 22. Цільова вага = ІМТ × зріст².", "A normal BMI is 18.5 to 25; the middle of the range is about 22. Target weight = BMI × height².") + "</div>";
      wire(el, maybeCalc, ["bmU", "bmW", "bmH", "bmFt", "bmIn", "bmG"]); refresh(el);
      el("bmU").addEventListener("change", () => { el("bmWL").textContent = el("bmU").value === "imp" ? L("Поточна вага, lb (необов'язково)", "Current weight, lb (optional)") : L("Поточна вага, кг (необов'язково)", "Current weight, kg (optional)"); });
    },
    calc(h) {
      const { el } = h, gs = el("bmG").value.trim(), p = readBody(el, false);
      if (p.incomplete || !gs) return { ok: false, incomplete: true };
      if (p.err) return { ok: false, msg: p.err };
      const tb = num(gs); if (tb === null || tb < 15 || tb > 40) return { ok: false, msg: L("Цільовий ІМТ — від 15 до 40.", "Target BMI — from 15 to 40.") };
      const imp = p.imp, tw = B.wAt(tb, p.h), [lo, hi] = B.normalRange(p.h), tc = B.cat(tb), warns = [];
      if (tb < 18.5) warns.push(L("Цільовий ІМТ нижчий за норму (18,5): така вага належить до дефіциту маси тіла.", "The target BMI is below the normal range (18.5): this weight counts as thinness."));
      else if (tb >= 25) warns.push(L("Цільовий ІМТ з категорії «" + tc.uk + "», не з норми.", "The target BMI is in “" + tc.en + "”, not in the normal range."));
      let diff = null, cur = null;
      if (p.w !== null) { diff = tw - p.w; cur = B.bmi(p.w, p.h); }
      const steps = [{ t: L("Цільова вага = ІМТ × зріст²", "Target weight = BMI × height²"), l: [fnum(tb, 1) + " × (" + fnum(p.h / 100, 2) + ")² = " + fnum(tw, 2) + " " + L("кг", "kg")] }].concat(diff !== null ? [{ t: L("Різниця з поточною вагою", "Difference from the current weight"), l: [fnum(tw, 1) + " − " + fnum(p.w, 1) + " = " + (diff >= 0 ? "+" : "−") + fnum(Math.abs(diff), 1) + " " + L("кг", "kg")], note: L("Поточний ІМТ — " + fnum(cur, 1) + ".", "The current BMI is " + fnum(cur, 1) + ".") }] : []);
      const tiles = [{ k: L("Цільовий ІМТ", "Target BMI"), v: fnum(tb, 1) }, { k: L("Категорія", "Category"), v: L(tc.uk, tc.en) }, { k: L("Нормальна вага", "Normal weight"), v: fnum(toUser(lo, imp), 1) + "–" + wTxt(hi, imp) }].concat(diff !== null ? [{ k: diff >= 0 ? L("Набрати", "To gain") : L("Втратити", "To lose"), v: wTxt(Math.abs(diff), imp) }] : []);
      return { ok: true, expr: L("ІМТ ", "BMI ") + fnum(tb, 1) + " · " + (imp ? fnum(p.h / B.CM_PER_IN, 1) + " in" : fnum(p.h, 1) + L(" см", " cm")), head: [L("цільова вага", "target weight"), wTxt(tw, imp)], headSub: diff !== null ? (diff >= 0 ? L("набрати ", "gain ") : L("втратити ", "lose ")) + wTxt(Math.abs(diff), imp) + L(" від поточних ", " from the current ") + wTxt(p.w, imp) : L("нормальна вага: ", "normal weight: ") + fnum(toUser(lo, imp), 1) + "–" + wTxt(hi, imp), subRaw: true, tiles, extraHtml: '<div class="ph__sub">' + L("Категорії для вашого зросту", "Categories for your height") + "</div>" + catTable(p.h, imp, tb) + warnHtml(warns) + hint(L("Для безпечного темпу зміни ваги скористайтеся калькулятором калорій.", "For a safe pace of weight change use the calorie calculator.")), note: NOTE, steps, resText: L("Цільова вага ", "Target weight ") + wTxt(tw, imp) + L(" для ІМТ ", " for a BMI of ") + fnum(tb, 1) };
    },
    reset(h) { const { el } = h; ["bmW", "bmH", "bmFt", "bmIn", "bmG"].forEach((id) => setP(el, id, "")); setP(el, "bmU", "metric"); refresh(el); },
    fill(h) { const { el } = h; setP(el, "bmU", "metric"); setP(el, "bmW", "85"); setP(el, "bmH", "178"); setP(el, "bmG", "24"); setP(el, "bmFt", ""); setP(el, "bmIn", ""); refresh(el); },
    share(p, h) { const { el } = h; if (!el("bmG").value.trim()) return; p.set("un", el("bmU").value); shareMap(MAPT, p, el); },
    apply(qs, h) { applyMap(MAPT, qs, h.el); }
  };

  // ----- таблиця норми -----
  const MAPL = [["ht", "bmH"], ["ft", "bmFt"], ["ic", "bmIn"]];
  const table = {
    key: "table", type: "custom", nameUk: "Таблиця норми", nameEn: "Normal weight table",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + heightF() + unitF() + '</div><div class="ph__hint ph__mt12">' + L("Таблиця показує нормальну вагу (ІМТ від 18,5 до 25) для зросту від 150 до 200 см. Вкажіть свій зріст, щоб підсвітити найближчий рядок.", "The table shows the normal weight (BMI 18.5 to 25) for heights from 150 to 200 cm. Enter your height to highlight the nearest row.") + "</div>";
      wire(el, maybeCalc, ["bmU", "bmH", "bmFt", "bmIn"]); refresh(el);
    },
    calc(h) {
      const { el } = h, imp = el("bmU").value === "imp", hs = imp ? el("bmFt").value.trim() : el("bmH").value.trim();
      let p = null;
      if (hs) { p = readBody(el, false); if (p.err) return { ok: false, msg: p.err }; }
      const rows = []; let near = null;
      if (p && !p.incomplete) near = Math.round(p.h / 5) * 5;
      for (let c = 150; c <= 200; c += 5) { const [lo, hi] = B.normalRange(c), inch = c / B.CM_PER_IN, ftin = Math.floor(inch / 12) + "′" + Math.round(inch % 12) + "″"; rows.push({ cells: [imp ? ftin + " (" + c + L(" см", " cm") + ")" : c + L(" см", " cm") + " (" + ftin + ")", { t: fnum(toUser(lo, imp), 0) + "–" + wTxt(hi, imp, 0), cls: "chip" }, "< " + wTxt(lo, imp, 0), "≥ " + wTxt(hi, imp, 0)], main: near === c }); }
      const table = UI.list([L("Зріст", "Height"), L("Норма", "Normal"), L("Дефіцит", "Underweight"), L("Надлишок від", "Overweight from")], rows, { w: "minmax(0, 1.3fr) minmax(0, 1.1fr) 110px 120px" });
      const own = p && !p.incomplete ? B.normalRange(p.h) : null;
      const steps = [{ t: L("Нормальна вага = ІМТ × зріст²", "Normal weight = BMI × height²"), l: [L("Межі ІМТ норми: 18,5 і 25", "BMI limits of the normal range: 18.5 and 25"), "170 " + L("см", "cm") + ": 18,5 × 1,70² = " + fnum(B.wAt(18.5, 170), 1) + "; 25 × 1,70² = " + fnum(B.wAt(25, 170), 1)] }];
      return { ok: true, expr: L("ІМТ норми 18,5–25", "Normal BMI 18.5–25"), head: own ? [L("нормальна вага", "normal weight"), fnum(toUser(own[0], imp), 1) + "–" + wTxt(own[1], imp)] : [L("ІМТ норми", "normal BMI"), "18,5–25".replace(",", SEP)], headSub: own ? L("для зросту ", "for a height of ") + (imp ? fnum(p.h / B.CM_PER_IN, 1) + " in" : fnum(p.h, 1) + L(" см", " cm")) : L("ваги для зросту 150–200 см", "weights for heights of 150–200 cm"), subRaw: true, tiles: [{ k: L("Нижня межа", "Lower limit"), v: L("ІМТ ", "BMI ") + fnum(18.5, 1) }, { k: L("Верхня межа", "Upper limit"), v: L("ІМТ 25", "BMI 25") }], extraHtml: '<div class="ph__sub">' + L("Нормальна вага за зростом", "Normal weight by height") + "</div>" + table, note: NOTE, steps, resText: L("Нормальна вага (ІМТ 18,5–25) для 170 см: ", "Normal weight (BMI 18.5–25) for 170 cm: ") + fnum(B.wAt(18.5, 170), 1) + "–" + fnum(B.wAt(25, 170), 1) + L(" кг", " kg") };
    },
    reset(h) { const { el } = h; ["bmH", "bmFt", "bmIn"].forEach((id) => setP(el, id, "")); setP(el, "bmU", "metric"); refresh(el); },
    fill(h) { const { el } = h; setP(el, "bmU", "metric"); setP(el, "bmH", "170"); setP(el, "bmFt", ""); setP(el, "bmIn", ""); refresh(el); },
    share(p, h) { const { el } = h; p.set("un", el("bmU").value); shareMap(MAPL, p, el); },
    apply(qs, h) { applyMap(MAPL, qs, h.el); }
  };
  return { modes: [mine, target, table], exactNote: false };
});
