/* rm-calc.js — калькулятор 1ПМ (одноповторного максимуму): 1ПМ за підходом, вага за відсотком чи повтореннями, повторення за вагою, порівняння формул */
PhysCalc.start(({ L }) => {
  const R = window.Rm, UI = window.PhysUI;
  const SEP = L(",", ".");
  const PCTS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
  const fnum = (x, d = 1) => { const v = Math.round(x * 10 ** d) / 10 ** d; return String(v).replace(".", SEP); };
  const num = (s) => { const t = String(s).replace(/\s+/g, "").replace(",", "."); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
  const intOf = (s) => (/^\d{1,3}$/.test(String(s).trim()) ? Number(String(s).trim()) : null);
  const unitName = (u) => (u === "lb" ? "lb" : L("кг", "kg"));
  const other = (u, x) => (u === "lb" ? { v: R.toKg(x), n: L("кг", "kg") } : { v: R.toLb(x), n: "lb" });
  const STEPS = { kg: [0, 0.5, 1, 1.25, 2.5, 5], lb: [0, 1, 2.5, 5, 10] };
  const GOAL = { strength: L("Сила", "Strength"), hypertrophy: L("Гіпертрофія", "Hypertrophy"), endurance: L("Витривалість", "Endurance") };
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (ml || 8) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const fOpts = () => R.F.map((f) => [f.id, L(f.uk, f.en)]).concat([["avg", R.name("avg")]]);
  const uOpts = () => [["kg", L("Кілограми (кг)", "Kilograms (kg)")], ["lb", L("Фунти (lb)", "Pounds (lb)")]];
  const sOpts = (u) => STEPS[u].map((s) => [s, s === 0 ? L("без округлення", "no rounding") : "± " + String(s).replace(".", SEP) + " " + unitName(u)]);
  const refillSteps = (el) => { const u = el("rmU").value, prev = el("rmS").value; el("rmS").innerHTML = sOpts(u).map(([v, t]) => '<option value="' + v + '">' + t + "</option>").join(""); el("rmS").value = STEPS[u].map(String).includes(prev) ? prev : "0"; };
  const bind = (el, maybeCalc, ids, withSteps) => {
    ids.forEach((id) => { const e = el(id); if (!e) return; e.addEventListener(e.tagName === "SELECT" ? "change" : "input", () => { if (id === "rmU" && withSteps) refillSteps(el); maybeCalc(); }); });
  };
  const barChart = (labels, values, fmtV) => {
    const W = 600, H = 220, pl = 10, pr = 10, pt = 24, pb = 30, n = values.length, gap = 8, bw = (W - pl - pr - gap * (n - 1)) / n, mx = Math.max(...values, 1e-9);
    const bars = values.map((v, i) => { const h = ((H - pt - pb) * v) / mx, x = pl + i * (bw + gap), y = H - pb - h; return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" fill="#3d63c9"/><text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#1f2f55">' + fmtV(v) + '</text><text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="11" fill="#5b6b8c">' + labels[i] + "</text>"; }).join("");
    return '<svg class="ph__chart" viewBox="0 0 ' + W + " " + H + '" width="100%" role="img" aria-label="' + L("Діаграма", "Chart") + '">' + bars + "</svg>";
  };
  // таблиця «% від 1ПМ → вага, повторення, мета»
  const pctTable = (oneRM, fid, step, u) => {
    const rows = PCTS.map((p) => { const w = R.round((oneRM * p) / 100, step), r = R.repsAt(fid, p / 100), z = R.zone(p); return { cells: [p + " %", { t: fnum(w, 2) + " " + unitName(u), cls: "strong" }, r === null ? "—" : "≈ " + Math.round(r), { t: GOAL[z], cls: "muted" }], main: p === 100 }; });
    return UI.list([L("% від 1ПМ", "% of 1RM"), L("Вага", "Weight"), L("Повторень", "Reps"), L("Мета", "Goal")], rows, { w: "90px minmax(0, 1fr) 100px minmax(0, 1fr)" });
  };
  const NOTE = L("Це оцінка за емпіричними формулами: орієнтир для планування, а не вимірювання.", "This is an estimate from empirical formulas: a guide for planning, not a measurement.");
  const note = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const repsNote = (r) => (r > R.WARN_REPS ? note(L("Понад 12 повторень похибка формул помітно зростає: результат — орієнтир.", "Above 12 reps the error of the formulas grows noticeably: treat the result as a guide.")) : r === 1 ? note(L("Одне повторення — це і є 1ПМ, формули не застосовуються.", "One repetition is the 1RM itself, no formula is applied.")) : "");

  const common = (id) => fld("rmF", L("Формула", "Formula"), sel("rmF", fOpts(), "epley")) + fld("rmU", L("Одиниця ваги", "Weight unit"), sel("rmU", uOpts(), "kg")) + fld("rmS", L("Округлення ваги до дисків штанги", "Round the weight to plates"), sel("rmS", sOpts("kg"), "0"), true);

  // ----- 1ПМ за підходом -----
  const onerm = {
    key: "onerm", type: "custom", req: ({ el }) => ["rmW", "rmR"], nameUk: "1ПМ за підходом", nameEn: "1RM from a set",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("rmW", L("Піднята вага", "Weight lifted"), inp("rmW", L("напр.: 100", "e.g.: 100"))) + fld("rmR", L("Повторень у підході", "Reps in the set"), inp("rmR", L("напр.: 5", "e.g.: 5"), 2)) + common() + '</div><div class="ph__hint ph__mt12">' + L("Найточніше працює для 2–10 повторень; до 30 повторень калькулятор рахує, але понад 12 похибка зростає. Одне повторення — це і є 1ПМ.", "Works best for 2–10 reps; up to 30 reps are accepted, but above 12 the error grows. A single rep is the 1RM itself.") + "</div>";
      bind(el, maybeCalc, ["rmW", "rmR", "rmF", "rmU", "rmS"], true);
      ["rmW", "rmR"].forEach((id) => el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } }));
    },
    calc(h) {
      const { el } = h, ws = el("rmW").value.trim(), rs = el("rmR").value.trim();
      if (!ws || !rs) return { ok: false, incomplete: true };
      const w = num(ws), r = intOf(rs), f = el("rmF").value, u = el("rmU").value, step = Number(el("rmS").value);
      if (w === null || w <= 0) return { ok: false, msg: L("Вага — додатне число.", "The weight is a positive number.") };
      if (r === null || r < 1 || r > R.MAX_REPS) return { ok: false, msg: L("Повторень — ціле число від 1 до " + R.MAX_REPS + ".", "Reps — a whole number from 1 to " + R.MAX_REPS + ".") };
      const e = R.est(f, w, r), all = R.F.map((q) => R.est(q.id, w, r)), mn = Math.min(...all), mx = Math.max(...all), av = all.reduce((a, b) => a + b, 0) / all.length, o = other(u, e);
      const fi = f === "avg" ? null : R.find(f);
      const steps = [];
      if (r === 1) steps.push({ t: L("Одне повторення", "One repetition"), l: [fnum(w, 2) + " " + unitName(u) + " × 1 = " + fnum(e, 1) + " " + unitName(u)], note: L("Для одного повторення 1ПМ дорівнює піднятій вазі.", "For one repetition the 1RM equals the weight lifted.") });
      else {
        steps.push({ t: L("Формула ", "Formula ") + R.name(f), l: [fi ? fi.txt : L("Середнє арифметичне семи формул", "Arithmetic mean of the seven formulas"), fnum(w, 2) + " × " + fnum(R.factor(f, r), 4) + " = " + fnum(e, 2) + " " + unitName(u)], note: L("Множник 1ПМ / вага для " + r + " повторень — " + fnum(R.factor(f, r), 4) + ".", "The 1RM / weight multiplier for " + r + " reps is " + fnum(R.factor(f, r), 4) + ".") });
        steps.push({ t: L("Інші формули", "Other formulas"), l: [L("Від ", "From ") + fnum(mn, 1) + L(" до ", " to ") + fnum(mx, 1) + " " + unitName(u) + L("; середнє ", "; mean ") + fnum(av, 1)], note: L("Розбіжність між формулами — природна оцінка похибки.", "The spread between the formulas is a natural estimate of the uncertainty.") });
      }
      steps.push({ t: L("Відсотки від 1ПМ", "Percentages of the 1RM"), l: [L("Вага = 1ПМ × відсоток; повторення — розв'язок тієї ж формули відносно r.", "Weight = 1RM × percentage; reps — the solution of the same formula for r.")] });
      const chart = barChart(PCTS.map((p) => p + "%"), PCTS.map((p) => R.round((e * p) / 100, step)), (v) => fnum(v, step > 0 && step < 1 ? 1 : 0));
      const tiles = [{ k: L("У " + o.n, "In " + o.n), v: fnum(o.v, 1) + " " + o.n }, { k: L("Діапазон формул", "Range of formulas"), v: fnum(mn, 1) + "–" + fnum(mx, 1) }, { k: L("Середнє всіх формул", "Mean of all formulas"), v: fnum(av, 1) + " " + unitName(u) }, { k: L("Розбіжність", "Spread"), v: fnum(((mx - mn) / av) * 100, 1) + " %" }];
      return { ok: true, expr: fnum(w, 2) + " " + unitName(u) + " × " + r, head: [L("1ПМ приблизно", "1RM approx."), fnum(e, 1) + " " + unitName(u)], headSub: R.name(f) + (r > 1 ? L(" · діапазон формул ", " · formulas range ") + fnum(mn, 1) + "–" + fnum(mx, 1) : ""), subRaw: true, tiles: r === 1 ? tiles.slice(0, 1) : tiles, extraHtml: '<div class="ph__sub">' + L("Вага за відсотками від 1ПМ", "Weight by percentage of the 1RM") + "</div>" + pctTable(e, f, step, u) + '<div class="ph__sub">' + L("Діаграма ваги", "Weight chart") + "</div>" + chart + repsNote(r), note: NOTE, steps, resText: L("1ПМ ≈ ", "1RM ≈ ") + fnum(e, 1) + " " + unitName(u) + " (" + R.name(f) + "; " + fnum(w, 2) + " " + unitName(u) + " × " + r + ")" };
    },
    reset(h) { const { el } = h; el("rmW").value = ""; el("rmR").value = ""; el("rmF").value = "epley"; el("rmU").value = "kg"; refillSteps(el); el("rmS").value = "0"; },
    fill(h) { const { el } = h; el("rmW").value = "100"; el("rmR").value = "5"; el("rmF").value = "epley"; el("rmU").value = "kg"; refillSteps(el); el("rmS").value = "0"; },
    share(p, h) { const { el } = h; if (!el("rmW").value.trim() || !el("rmR").value.trim()) return; p.set("w", el("rmW").value.trim()); p.set("r", el("rmR").value.trim()); p.set("f", el("rmF").value); p.set("u", el("rmU").value); p.set("s", el("rmS").value); },
    apply(qs, h) { const { el } = h; if (qs.has("u") && ["kg", "lb"].includes(qs.get("u"))) { el("rmU").value = qs.get("u"); refillSteps(el); } if (qs.has("w")) el("rmW").value = qs.get("w").slice(0, 8); if (qs.has("r")) el("rmR").value = qs.get("r").slice(0, 2); if (qs.has("f") && (qs.get("f") === "avg" || R.find(qs.get("f")))) el("rmF").value = qs.get("f"); if (qs.has("s") && STEPS[el("rmU").value].map(String).includes(qs.get("s"))) el("rmS").value = qs.get("s"); }
  };

  // ----- вага за відсотком чи повтореннями -----
  const load = {
    key: "load", type: "custom", req: ({ el }) => ["rmM", "ldV"], nameUk: "Яка вага для підходу", nameEn: "Weight for a set",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("rmM", L("Ваш 1ПМ", "Your 1RM"), inp("rmM", L("напр.: 120", "e.g.: 120"))) + fld("ldK", L("Задати підхід", "Define the set by"), sel("ldK", [["pct", L("відсотком від 1ПМ", "percentage of the 1RM")], ["reps", L("кількістю повторень", "number of reps")]], "pct")) + fld("ldV", '<span id="ldLbl">' + L("Відсоток від 1ПМ, %", "Percentage of the 1RM, %") + "</span>", inp("ldV", L("напр.: 80", "e.g.: 80"), 5), true) + common() + "</div>";
      const lbl = () => { el("ldLbl").textContent = el("ldK").value === "pct" ? L("Відсоток від 1ПМ, %", "Percentage of the 1RM, %") : L("Повторень у підході", "Reps in the set"); };
      bind(el, maybeCalc, ["rmM", "ldV", "rmF", "rmU", "rmS"], true);
      el("ldK").addEventListener("change", () => { lbl(); maybeCalc(); });
    },
    calc(h) {
      const { el } = h, ms = el("rmM").value.trim(), vs = el("ldV").value.trim();
      if (!ms || !vs) return { ok: false, incomplete: true };
      const M = num(ms), kind = el("ldK").value, f = el("rmF").value, u = el("rmU").value, step = Number(el("rmS").value);
      if (M === null || M <= 0) return { ok: false, msg: L("1ПМ — додатне число.", "The 1RM is a positive number.") };
      let p, reps, label;
      if (kind === "pct") {
        const v = num(vs);
        if (v === null || v <= 0 || v > 100) return { ok: false, msg: L("Відсоток — число понад 0 і не більше 100.", "The percentage is a number above 0 and at most 100.") };
        p = v / 100; reps = R.repsAt(f, p); label = fnum(v, 2) + " %";
      } else {
        const r = intOf(vs);
        if (r === null || r < 1 || r > R.MAX_REPS) return { ok: false, msg: L("Повторень — ціле число від 1 до " + R.MAX_REPS + ".", "Reps — a whole number from 1 to " + R.MAX_REPS + ".") };
        p = 1 / R.factor(f, r); reps = r; label = r + L(" повт.", " reps");
      }
      const wRaw = M * p, w = R.round(wRaw, step), o = other(u, w);
      const steps = [{ t: kind === "pct" ? L("Вага за відсотком", "Weight by percentage") : L("Відсоток за повтореннями", "Percentage by reps"), l: kind === "pct" ? [fnum(M, 2) + " × " + fnum(p * 100, 2) + " % = " + fnum(wRaw, 2) + " " + unitName(u)] : [L("k(", "k(") + reps + ") = " + fnum(R.factor(f, reps), 4) + " → " + fnum(p * 100, 1) + " %", fnum(M, 2) + " × " + fnum(p * 100, 1) + " % = " + fnum(wRaw, 2) + " " + unitName(u)], note: kind === "pct" ? "" : L("Частка від 1ПМ для r повторень — це 1 / k(r) за формулою " + R.name(f) + ".", "The share of the 1RM for r reps is 1 / k(r) by the " + R.name(f) + " formula.") }];
      if (step > 0) steps.push({ t: L("Округлення до дисків", "Rounding to plates"), l: [fnum(wRaw, 2) + " → " + fnum(w, 2) + " " + unitName(u)] });
      const tiles = [{ k: L("Відсоток від 1ПМ", "Share of the 1RM"), v: fnum(p * 100, 1) + " %" }, { k: L("Повторень", "Reps"), v: reps === null ? "—" : "≈ " + Math.round(reps) }, { k: L("У " + o.n, "In " + o.n), v: fnum(o.v, 1) + " " + o.n }, { k: L("Мета", "Goal"), v: GOAL[R.zone(p * 100)] }];
      return { ok: true, expr: L("1ПМ ", "1RM ") + fnum(M, 2) + " " + unitName(u) + " · " + label, head: [L("робоча вага", "working weight"), fnum(w, 2) + " " + unitName(u)], headSub: step > 0 ? L("точно: ", "exact: ") + fnum(wRaw, 2) + " " + unitName(u) + " · " + R.name(f) : R.name(f), subRaw: true, tiles, extraHtml: '<div class="ph__sub">' + L("Усі відсотки від вашого 1ПМ", "All percentages of your 1RM") + "</div>" + pctTable(M, f, step, u), note: NOTE, steps, resText: fnum(w, 2) + " " + unitName(u) + " (" + label + L(" від 1ПМ ", " of the 1RM ") + fnum(M, 2) + " " + unitName(u) + ")" };
    },
    reset(h) { const { el } = h; el("rmM").value = ""; el("ldV").value = ""; el("ldK").value = "pct"; el("ldLbl").textContent = L("Відсоток від 1ПМ, %", "Percentage of the 1RM, %"); el("rmF").value = "epley"; el("rmU").value = "kg"; refillSteps(el); el("rmS").value = "0"; },
    fill(h) { const { el } = h; el("rmM").value = "120"; el("ldK").value = "pct"; el("ldLbl").textContent = L("Відсоток від 1ПМ, %", "Percentage of the 1RM, %"); el("ldV").value = "80"; el("rmF").value = "epley"; el("rmU").value = "kg"; refillSteps(el); el("rmS").value = "2.5"; },
    share(p, h) { const { el } = h; if (!el("rmM").value.trim() || !el("ldV").value.trim()) return; p.set("rm", el("rmM").value.trim()); p.set("k", el("ldK").value); p.set("v", el("ldV").value.trim()); p.set("f", el("rmF").value); p.set("u", el("rmU").value); p.set("s", el("rmS").value); },
    apply(qs, h) { const { el } = h; if (qs.has("u") && ["kg", "lb"].includes(qs.get("u"))) { el("rmU").value = qs.get("u"); refillSteps(el); } if (qs.has("rm")) el("rmM").value = qs.get("rm").slice(0, 8); if (qs.has("k") && ["pct", "reps"].includes(qs.get("k"))) { el("ldK").value = qs.get("k"); el("ldLbl").textContent = qs.get("k") === "pct" ? L("Відсоток від 1ПМ, %", "Percentage of the 1RM, %") : L("Повторень у підході", "Reps in the set"); } if (qs.has("v")) el("ldV").value = qs.get("v").slice(0, 5); if (qs.has("f") && (qs.get("f") === "avg" || R.find(qs.get("f")))) el("rmF").value = qs.get("f"); if (qs.has("s") && STEPS[el("rmU").value].map(String).includes(qs.get("s"))) el("rmS").value = qs.get("s"); }
  };

  // ----- скільки повторень -----
  const reps = {
    key: "reps", type: "custom", req: ({ el }) => ["rmM", "rpW"], nameUk: "Скільки повторень", nameEn: "How many reps",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("rmM", L("Ваш 1ПМ", "Your 1RM"), inp("rmM", L("напр.: 120", "e.g.: 120"))) + fld("rpW", L("Робоча вага", "Working weight"), inp("rpW", L("напр.: 90", "e.g.: 90"))) + fld("rmF", L("Формула", "Formula"), sel("rmF", fOpts(), "epley")) + fld("rmU", L("Одиниця ваги", "Weight unit"), sel("rmU", uOpts(), "kg")) + "</div>";
      bind(el, maybeCalc, ["rmM", "rpW", "rmF", "rmU"], false);
    },
    calc(h) {
      const { el } = h, ms = el("rmM").value.trim(), ws = el("rpW").value.trim();
      if (!ms || !ws) return { ok: false, incomplete: true };
      const M = num(ms), W = num(ws), f = el("rmF").value, u = el("rmU").value;
      if (M === null || M <= 0 || W === null || W <= 0) return { ok: false, msg: L("1ПМ і вага — додатні числа.", "The 1RM and the weight are positive numbers.") };
      if (W > M * 1.0000001) return { ok: false, msg: L("Робоча вага більша за 1ПМ — повторень бути не може.", "The working weight is above the 1RM — no reps are possible.") };
      const p = W / M, r = R.repsAt(f, p);
      const rows = R.F.map((q) => { const rr = R.repsAt(q.id, p); return [L(q.uk, q.en), { t: rr === null ? L("поза межами", "out of range") : "≈ " + Math.round(rr), cls: rr === null ? "muted" : "strong" }]; });
      const valid = R.F.map((q) => R.repsAt(q.id, p)).filter((x) => x !== null);
      const table = UI.list([L("Формула", "Formula"), L("Повторень", "Reps")], rows, { kv: true });
      const steps = [{ t: L("Частка від 1ПМ", "Share of the 1RM"), l: [fnum(W, 2) + " / " + fnum(M, 2) + " = " + fnum(p * 100, 1) + " %"] }, { t: L("Розв'язуємо формулу відносно r", "Solving the formula for r"), l: [r === null ? L("Формула " + R.name(f) + " не описує таку малу частку (потрібно понад " + R.MAX_REPS + " повторень).", "The " + R.name(f) + " formula does not cover such a small share (more than " + R.MAX_REPS + " reps needed).") : "k(r) = " + fnum(1 / p, 4) + " → r ≈ " + fnum(r, 1)], note: L("Для 100% (вага = 1ПМ) завжди одне повторення.", "At 100% (weight = 1RM) it is always one rep.") }];
      return { ok: true, expr: fnum(W, 2) + " / " + fnum(M, 2) + " " + unitName(u), head: [L("повторень", "reps"), r === null ? L("понад " + R.MAX_REPS, "over " + R.MAX_REPS) : "≈ " + Math.round(r)], headSub: R.name(f) + " · " + fnum(p * 100, 1) + L(" % від 1ПМ", " % of the 1RM"), subRaw: true, tiles: [{ k: L("Частка від 1ПМ", "Share of the 1RM"), v: fnum(p * 100, 1) + " %" }, { k: L("Діапазон формул", "Range of formulas"), v: valid.length ? (Math.round(Math.min(...valid)) === Math.round(Math.max(...valid)) ? String(Math.round(Math.min(...valid))) : Math.round(Math.min(...valid)) + "–" + Math.round(Math.max(...valid))) : "—" }, { k: L("Мета", "Goal"), v: GOAL[R.zone(p * 100)] }], extraHtml: '<div class="ph__sub">' + L("Повторення за різними формулами", "Reps by different formulas") + "</div>" + table + repsNote(r === null ? 31 : Math.round(r)), note: NOTE, steps, resText: (r === null ? L("понад ", "over ") + R.MAX_REPS : "≈ " + Math.round(r)) + L(" повторень з вагою ", " reps with ") + fnum(W, 2) + " " + unitName(u) + L(" (1ПМ ", " (1RM ") + fnum(M, 2) + " " + unitName(u) + ")" };
    },
    reset(h) { const { el } = h; el("rmM").value = ""; el("rpW").value = ""; el("rmF").value = "epley"; el("rmU").value = "kg"; },
    fill(h) { const { el } = h; el("rmM").value = "120"; el("rpW").value = "90"; el("rmF").value = "epley"; el("rmU").value = "kg"; },
    share(p, h) { const { el } = h; if (!el("rmM").value.trim() || !el("rpW").value.trim()) return; p.set("rm", el("rmM").value.trim()); p.set("w", el("rpW").value.trim()); p.set("f", el("rmF").value); p.set("u", el("rmU").value); },
    apply(qs, h) { const { el } = h; if (qs.has("rm")) el("rmM").value = qs.get("rm").slice(0, 8); if (qs.has("w")) el("rpW").value = qs.get("w").slice(0, 8); if (qs.has("f") && (qs.get("f") === "avg" || R.find(qs.get("f")))) el("rmF").value = qs.get("f"); if (qs.has("u") && ["kg", "lb"].includes(qs.get("u"))) el("rmU").value = qs.get("u"); }
  };

  // ----- порівняння формул -----
  const compare = {
    key: "compare", type: "custom", req: ({ el }) => ["rmW", "rmR"], nameUk: "Порівняння формул", nameEn: "Compare formulas",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("rmW", L("Піднята вага", "Weight lifted"), inp("rmW", L("напр.: 100", "e.g.: 100"))) + fld("rmR", L("Повторень у підході", "Reps in the set"), inp("rmR", L("напр.: 5", "e.g.: 5"), 2)) + fld("rmU", L("Одиниця ваги", "Weight unit"), sel("rmU", uOpts(), "kg"), true) + "</div>";
      bind(el, maybeCalc, ["rmW", "rmR", "rmU"], false);
    },
    calc(h) {
      const { el } = h, ws = el("rmW").value.trim(), rs = el("rmR").value.trim();
      if (!ws || !rs) return { ok: false, incomplete: true };
      const w = num(ws), r = intOf(rs), u = el("rmU").value;
      if (w === null || w <= 0) return { ok: false, msg: L("Вага — додатне число.", "The weight is a positive number.") };
      if (r === null || r < 1 || r > R.MAX_REPS) return { ok: false, msg: L("Повторень — ціле число від 1 до " + R.MAX_REPS + ".", "Reps — a whole number from 1 to " + R.MAX_REPS + ".") };
      const vals = R.F.map((q) => ({ n: L(q.uk, q.en), v: R.est(q.id, w, r) })), all = vals.map((x) => x.v), av = all.reduce((a, b) => a + b, 0) / all.length, mn = Math.min(...all), mx = Math.max(...all);
      const rows = vals.map((x) => ({ cells: [x.n, { t: fnum(x.v, 1) + " " + unitName(u), cls: "strong" }, { t: (x.v >= av ? "+" : "−") + fnum(Math.abs(((x.v - av) / av) * 100), 1) + " %", cls: "muted" }] }));
      rows.push({ cells: [L("Середнє", "Mean"), { t: fnum(av, 1) + " " + unitName(u), cls: "chip" }, ""], main: true });
      const table = UI.list([L("Формула", "Formula"), "1" + L("ПМ", "RM"), L("Від середнього", "From the mean")], rows, { w: "minmax(0, 1fr) 120px 120px" });
      const chart = barChart(vals.map((x) => x.n.slice(0, 9)), all, (v) => fnum(v, 0));
      const steps = [{ t: L("Рахуємо за кожною формулою", "Computing by each formula"), l: vals.map((x) => x.n + ": " + fnum(x.v, 2) + " " + unitName(u)) }, { t: L("Середнє і розкид", "Mean and spread"), l: [L("Середнє ", "Mean ") + fnum(av, 2) + " " + unitName(u), L("Від ", "From ") + fnum(mn, 2) + L(" до ", " to ") + fnum(mx, 2) + " (" + fnum(((mx - mn) / av) * 100, 1) + " %)"], note: L("Чим більше повторень, тим сильніше формули розходяться.", "The more reps, the more the formulas disagree.") }];
      return { ok: true, expr: fnum(w, 2) + " " + unitName(u) + " × " + r, head: [L("середнє 1ПМ", "mean 1RM"), fnum(av, 1) + " " + unitName(u)], headSub: L("від ", "from ") + fnum(mn, 1) + L(" до ", " to ") + fnum(mx, 1) + " " + unitName(u), subRaw: true, tiles: [{ k: L("Мінімум", "Minimum"), v: fnum(mn, 1) + " " + unitName(u) }, { k: L("Максимум", "Maximum"), v: fnum(mx, 1) + " " + unitName(u) }, { k: L("Розкид", "Spread"), v: fnum(((mx - mn) / av) * 100, 1) + " %" }], extraHtml: table + '<div class="ph__sub">' + L("Діаграма", "Chart") + "</div>" + chart + repsNote(r), note: NOTE, steps, resText: L("1ПМ за формулами: ", "1RM by formulas: ") + vals.map((x) => x.n + " " + fnum(x.v, 1)).join("; ") + L("; середнє ", "; mean ") + fnum(av, 1) + " " + unitName(u) };
    },
    reset(h) { const { el } = h; el("rmW").value = ""; el("rmR").value = ""; el("rmU").value = "kg"; },
    fill(h) { const { el } = h; el("rmW").value = "100"; el("rmR").value = "8"; el("rmU").value = "kg"; },
    share(p, h) { const { el } = h; if (!el("rmW").value.trim() || !el("rmR").value.trim()) return; p.set("w", el("rmW").value.trim()); p.set("r", el("rmR").value.trim()); p.set("u", el("rmU").value); },
    apply(qs, h) { const { el } = h; if (qs.has("w")) el("rmW").value = qs.get("w").slice(0, 8); if (qs.has("r")) el("rmR").value = qs.get("r").slice(0, 2); if (qs.has("u") && ["kg", "lb"].includes(qs.get("u"))) el("rmU").value = qs.get("u"); }
  };
  return { modes: [onerm, load, reps, compare], exactNote: false };
});
