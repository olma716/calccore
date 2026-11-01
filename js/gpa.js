/* gpa.js — дані калькулятора GPA (UK/EN): GPA за курсами (США 4,0 з +/−, 100-бальна ECTS, 12-бальна, 5-бальна), середній бал за українськими шкалами,
   цільовий GPA та конвертер оцінок. Обчислення на точних раціональних числах (BigInt). Зіставлення шкал — орієнтовні й позначені як такі. */
PhysCalc.start(({ L, DErr, X }) => {
  // ----- невеликі раціональні утиліти -----
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  const q = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
  const R = (n) => q(BigInt(n));
  const D = (s) => { const [ip, fp = ""] = String(s).split("."); return q(BigInt(ip + fp), 10n ** BigInt(fp.length)); };
  const add = (x, y) => q(x.n * y.d + y.n * x.d, x.d * y.d), sub = (x, y) => q(x.n * y.d - y.n * x.d, x.d * y.d);
  const mul = (x, y) => q(x.n * y.n, x.d * y.d), div = (x, y) => q(x.n * y.d, x.d * y.n);
  const cmp = (x, y) => { const a = x.n * y.d, b = y.n * x.d; return a < b ? -1 : a > b ? 1 : 0; };
  const ZERO = R(0), HUNDRED = R(100);

  // ----- шкали -----
  const US = [["A+", "4.0", "97–100"], ["A", "4.0", "93–96"], ["A-", "3.7", "90–92"], ["B+", "3.3", "87–89"], ["B", "3.0", "83–86"], ["B-", "2.7", "80–82"], ["C+", "2.3", "77–79"], ["C", "2.0", "73–76"], ["C-", "1.7", "70–72"], ["D+", "1.3", "67–69"], ["D", "1.0", "63–66"], ["D-", "0.7", "60–62"], ["F", "0.0", "0–59"]];
  const usLabel = (g) => g.replace("-", "−");
  const ECTS_MIN = [["A", 90], ["B", 82], ["C", 74], ["D", 64], ["E", 60], ["FX", 35]];
  const ectsOf = (p) => { for (const [l, m] of ECTS_MIN) if (cmp(p, R(m)) >= 0) return l; return "F"; };
  const EPT = { mix: { A: "4.0", B: "3.5", C: "3.0", D: "2.5", E: "2.0", FX: "0", F: "0" }, us: { A: "4.0", B: "3.0", C: "2.0", D: "1.0", E: "1.0", FX: "0", F: "0" } };
  const fiveOf = (p) => (cmp(p, R(90)) >= 0 ? 5 : cmp(p, R(74)) >= 0 ? 4 : cmp(p, R(60)) >= 0 ? 3 : 2);
  const five12 = (g) => (g >= 10 ? 5 : g >= 7 ? 4 : g >= 4 ? 3 : 2);
  const P5 = { 5: "4.0", 4: "3.0", 3: "2.0", 2: "0" };
  const usOfPct = (p) => { for (const [l, , r] of US) { const lo = Number(r.split("–")[0]); if (cmp(p, R(lo)) >= 0) return l; } return "F"; };
  const setNow = () => (document.getElementById("gval").value === "us" ? "us" : "mix");
  const SC = {
    us: { uk: "США (4,0 з +/−)", en: "US (4.0 with +/−)", sel: US.map(([g]) => [g, usLabel(g)]) },
    s100: { uk: "100-бальна (ECTS)", en: "100-point (ECTS)", num: true, ph: L("напр.: 87", "e.g.: 87") },
    s12: { uk: "12-бальна", en: "12-point", sel: Array.from({ length: 12 }, (_, i) => [String(12 - i), String(12 - i)]) },
    s5: { uk: "5-бальна", en: "5-point", sel: [["5", "5"], ["4", "4"], ["3", "3"], ["2", "2"]] }
  };
  // оцінка → { pts (бали для GPA 4,0), num (числове значення в шкалі), label } або { err }
  function grade(scale, raw, parseNum) {
    raw = String(raw == null ? "" : raw).trim();
    if (!raw) return { empty: true };
    if (scale === "us") { const u = US.find((x) => x[0] === raw); return u ? { pts: D(u[1]), num: null, label: usLabel(raw) } : { err: 1 }; }
    if (scale === "s100") {
      const r = parseNum(raw); if (r.err || r.empty) return { err: 1 };
      if (cmp(r.v, ZERO) < 0 || cmp(r.v, HUNDRED) > 0) return { err: 2 };
      const l = ectsOf(r.v); return { pts: D(EPT[setNow()][l]), num: r.v, label: l, five: fiveOf(r.v) };
    }
    if (scale === "s12") { const g = Number(raw); if (!Number.isInteger(g) || g < 1 || g > 12) return { err: 1 }; return { pts: D(P5[five12(g)]), num: R(g), label: raw, five: five12(g) }; }
    const g = Number(raw); if (![5, 4, 3, 2].includes(g)) return { err: 1 };
    return { pts: D(P5[g]), num: R(g), label: raw, five: g };
  }

  // ----- спільний режим «курси» -----
  const MAXR = 30;
  function courseMode(key, scales, nameUk, nameEn, dflt, ex) {
    return {
      key, type: "custom", nameUk, nameEn,
      build(body, x, h) {
        const { el, esc, maybeCalc } = h;
        const state = { n: 4, scale: dflt };
        const gradeCtl = (i, scale, val) => {
          const s = SC[scale];
          if (s.num) return '<input class="ph__input" id="gcG_' + i + '" type="text" inputmode="decimal" autocomplete="off" maxlength="6" placeholder="' + s.ph + '" value="' + esc(val || "") + '" aria-label="' + L("Оцінка", "Grade") + '">';
          return '<select class="ph__unit ph__unit--wide" id="gcG_' + i + '" aria-label="' + L("Оцінка", "Grade") + '"><option value="">—</option>' + s.sel.map(([v, t]) => '<option value="' + v + '"' + (v === val ? " selected" : "") + ">" + esc(t) + "</option>").join("") + "</select>";
        };
        const rowHtml = (i, scale, k) => '<div class="ph__crow"><span class="ph__crowN">' + (i + 1) + '</span><input class="ph__input ph__crowName" id="gcN_' + i + '" type="text" autocomplete="off" maxlength="40" placeholder="' + L("Назва курсу", "Course name") + '" value="' + esc(k ? k[0] : "") + '" aria-label="' + L("Назва курсу", "Course name") + '"><div class="ph__crowG">' + gradeCtl(i, scale, k ? k[1] : "") + '</div><input class="ph__input ph__crowC" id="gcC_' + i + '" type="text" inputmode="decimal" autocomplete="off" maxlength="6" placeholder="' + L("кредити", "credits") + '" value="' + esc(k ? k[2] : "") + '" aria-label="' + L("Кредити", "Credits") + '">' +
          (scale === "us" ? '<div class="ph__crowT"><select class="ph__unit ph__unit--wide" id="gcT_' + i + '" aria-label="' + L("Тип курсу", "Course type") + '"><option value="0"' + (k && k[3] === "0" || !k ? " selected" : "") + ">" + L("Звичайний", "Regular") + '</option><option value="0.5"' + (k && k[3] === "0.5" ? " selected" : "") + ">Honors " + L("+0,5", "+0.5") + "</option><option value=\"1\"" + (k && k[3] === "1" ? " selected" : "") + ">AP " + L("+1,0", "+1.0") + "</option></select></div>" : "") +
          '<button type="button" class="ph__crowX" data-i="' + i + '" aria-label="' + L("Видалити курс", "Remove the course") + '">✕</button></div>';
        const collect = () => Array.from({ length: state.n }, (_, i) => [el("gcN_" + i).value, el("gcG_" + i).value, el("gcC_" + i).value, el("gcT_" + i) ? el("gcT_" + i).value : "0"]);
        const draw = (rows) => {
          el("gcRows").innerHTML = rows.map((k, i) => rowHtml(i, state.scale, k)).join("");
          state.n = rows.length;
          for (let i = 0; i < state.n; i++) { ["gcN_", "gcG_", "gcC_", "gcT_"].forEach((p) => { const e = el(p + i); if (e) { e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); } }); }
          el("gcAdd").disabled = state.n >= MAXR;
        };
        body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="gcScale">' + L("Шкала оцінок", "Grading scale") + '</label><select class="ph__unit ph__unit--wide" id="gcScale">' + scales.map((s) => '<option value="' + s + '"' + (s === dflt ? " selected" : "") + ">" + esc(L(SC[s].uk, SC[s].en)) + "</option>").join("") + '</select></div></div><div class="ph__crows" id="gcRows"></div><div class="ph__fnActions"><button type="button" class="ph__mini" id="gcAdd">' + L("+ Додати курс", "+ Add a course") + '</button><button type="button" class="ph__mini" id="gcClear">' + L("Очистити", "Clear") + '</button></div><div class="ph__hint ph__mt12">' + (dflt === "us" ? L("Кредити — вага курсу (кредит-години). Honors і AP додають бонус до балу курсу для зваженого GPA. ", "Credits are the weight of a course (credit hours). Honors and AP add a bonus to the course points for the weighted GPA. ") : L("Кредити ECTS — вага предмета в середньозваженому балі. ", "ECTS credits are the weight of a subject in the weighted average. ")) + L("Курси без оцінки чи без кредитів пропускаються.", "Courses without a grade or without credits are skipped.") + "</div>";
        draw(Array.from({ length: 4 }, () => null));
        el("gcScale").addEventListener("change", () => { const keep = collect().map((k) => [k[0], "", k[2], k[3]]); state.scale = el("gcScale").value; draw(keep); maybeCalc(); });
        el("gcAdd").addEventListener("click", () => { if (state.n < MAXR) { draw(collect().concat([null])); maybeCalc(); } });
        el("gcClear").addEventListener("click", () => { draw(Array.from({ length: 4 }, () => null)); maybeCalc(); });
        el("gcRows").addEventListener("click", (e) => { const b = e.target.closest(".ph__crowX"); if (!b) return; const i = Number(b.dataset.i), rows = collect(); rows.splice(i, 1); draw(rows.length ? rows : [null]); maybeCalc(); });
        body._gc = { state, draw, collect };
      },
      calc(h) {
        const { el, parseNum, ND, roundStr, esc } = h, nd = ND(), st = el("phBody")._gc.state, scale = st.scale, rows = el("phBody")._gc.collect();
        const fx = (r, d = nd) => { let s = roundStr(r, d); const sep = L(",", "."); if (d > 0) { if (!s.includes(sep)) s += sep; const have = s.length - s.indexOf(sep) - 1; if (have < d) s += "0".repeat(d - have); } return s; };
        const used = [], errs = [];
        rows.forEach((k, i) => {
          const g = grade(scale, k[1], parseNum), cr = String(k[2]).trim() ? parseNum(k[2]) : { empty: true }, nm = k[0].trim() || L("Курс ", "Course ") + (i + 1);
          if (g.empty && cr.empty) return;
          if (g.empty) return;
          if (g.err) { errs.push(nm + ": " + (g.err === 2 ? L("оцінка має бути від 0 до 100", "the grade must be from 0 to 100") : L("недопустима оцінка", "invalid grade"))); return; }
          if (cr.empty) { errs.push(nm + ": " + L("вкажіть кредити", "enter the credits")); return; }
          if (cr.err || cmp(cr.v, ZERO) <= 0) { errs.push(nm + ": " + L("кредити — додатне число", "credits must be a positive number")); return; }
          used.push({ nm, g, c: cr.v, bonus: D(k[3] || "0") });
        });
        if (errs.length) return { ok: false, msg: errs.slice(0, 3).join("; ") };
        if (!used.length) return { ok: false, incomplete: true };
        const totC = used.reduce((a, r) => add(a, r.c), ZERO), qp = used.reduce((a, r) => add(a, mul(r.g.pts, r.c)), ZERO), gpa = div(qp, totC);
        const wq = used.reduce((a, r) => add(a, mul(r.g.pts.n > 0n ? add(r.g.pts, r.bonus) : r.g.pts, r.c)), ZERO), wg = div(wq, totC), weighted = scale === "us" && cmp(wq, qp) !== 0;
        const numeric = scale !== "us", avg = numeric ? div(used.reduce((a, r) => add(a, mul(r.g.num, r.c)), ZERO), totC) : null;
        const cr = (v) => fx(v, 2).replace(/([.,]\d*?)0+$/, "$1").replace(/[.,]$/, "");
        const steps = [];
        steps.push({ t: L("Бали за оцінками", "Points for the grades"), l: used.map((r) => r.nm + ": " + r.g.label + " → " + fx(r.g.pts, 2)), note: numeric ? L("Бали для GPA 4,0 беруться за зіставленням шкал (орієнтовно): " + (scale === "s100" ? "оцінка → літера ECTS → бал за обраною таблицею." : "оцінка → 5-бальна → бал."), "The points for the 4.0 GPA come from a scale mapping (approximate): " + (scale === "s100" ? "grade → ECTS letter → points from the chosen table." : "grade → 5-point → points.")) : "" });
        steps.push({ t: L("Бали якості: бал · кредити", "Quality points: points · credits"), l: used.map((r) => r.nm + ": " + fx(r.g.pts, 2) + " · " + cr(r.c) + " = " + fx(mul(r.g.pts, r.c), 2)).concat(["Σ = " + fx(qp, 2) + ";  " + L("кредитів ", "credits ") + cr(totC)]) });
        steps.push({ t: L("GPA = Σ(бал · кредити) / Σ кредитів", "GPA = Σ(points · credits) / Σ credits"), l: ["GPA = " + fx(qp, 2) + " / " + cr(totC) + " = " + fx(gpa)] });
        if (weighted) steps.push({ t: L("Зважений GPA", "Weighted GPA"), l: used.filter((r) => r.bonus.n > 0n && r.g.pts.n > 0n).map((r) => r.nm + ": " + fx(r.g.pts, 2) + " + " + fx(r.bonus, 2) + " = " + fx(add(r.g.pts, r.bonus), 2)).concat(["GPA(w) = " + fx(wq, 2) + " / " + cr(totC) + " = " + fx(wg)]), note: L("Бонус додається лише до курсів із додатним балом.", "The bonus is added only to courses with positive points.") });
        if (numeric) steps.push({ t: L("Середньозважений бал у шкалі", "Weighted average in the scale"), l: ["Σ(" + L("оцінка", "grade") + " · " + L("кредити", "credits") + ") / Σ = " + fx(used.reduce((a, r) => add(a, mul(r.g.num, r.c)), ZERO), 2) + " / " + cr(totC) + " = " + fx(avg)] });
        // розподіл
        const dist = {}; used.forEach((r) => { const k = scale === "us" ? r.g.label : scale === "s100" ? r.g.label : r.g.label; dist[k] = dist[k] || { n: 0, c: ZERO }; dist[k].n++; dist[k].c = add(dist[k].c, r.c); });
        const order = scale === "us" ? US.map((x) => usLabel(x[0])) : scale === "s100" ? ["A", "B", "C", "D", "E", "FX", "F"] : scale === "s12" ? SC.s12.sel.map((x) => x[0]) : ["5", "4", "3", "2"];
        const trs = order.filter((k) => dist[k]).map((k) => "<tr><th>" + esc(k) + "</th><td>" + dist[k].n + "</td><td>" + esc(cr(dist[k].c)) + "</td></tr>").join("");
        const table = '<div class="ph__sub">' + L("Розподіл оцінок", "Grade distribution") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + (scale === "s100" ? L("Літера ECTS", "ECTS letter") : L("Оцінка", "Grade")) + "</th><th>" + L("Курсів", "Courses") + "</th><th>" + L("Кредитів", "Credits") + "</th></tr></thead><tbody>" + trs + "</tbody></table></div>";
        const tiles = [{ k: L("Всього кредитів", "Total credits"), v: cr(totC) }, { k: L("Кількість курсів", "Number of courses"), v: String(used.length) }, { k: L("Бали якості", "Quality points"), v: fx(qp, 2) }];
        let head, headSub = null, resText;
        if (numeric) {
          head = [L("середній бал", "average"), fx(avg)];
          headSub = "≈ GPA 4,0: ".replace("4,0", L("4,0", "4.0")) + fx(gpa) + L(" (орієнтовно)", " (approx.)");
          tiles.push({ k: L("≈ GPA за 4,0", "≈ GPA on 4.0"), v: fx(gpa) });
          if (scale === "s100") { tiles.push({ k: L("Літера ECTS середнього", "ECTS letter of the average"), v: ectsOf(avg) }, { k: L("У 5-бальній шкалі", "In the 5-point scale"), v: String(fiveOf(avg)) }); }
          if (scale === "s12") tiles.push({ k: L("У 5-бальній шкалі", "In the 5-point scale"), v: String(five12(Math.round(Number(avg.n) / Number(avg.d)))) });
          resText = L("Середній бал ", "Average ") + fx(avg) + " (≈ GPA " + fx(gpa) + ")";
        } else {
          head = ["GPA", fx(gpa)];
          if (weighted) { headSub = L("зважений GPA ", "weighted GPA ") + fx(wg); tiles.push({ k: L("Зважений GPA", "Weighted GPA"), v: fx(wg) }); }
          resText = "GPA = " + fx(gpa) + (weighted ? ";  " + L("зважений ", "weighted ") + fx(wg) : "");
        }
        return { ok: true, expr: L(SC[scale].uk, SC[scale].en) + ", " + L("курсів: ", "courses: ") + used.length, head, headSub, subRaw: true, tiles: tiles.slice(0, 8), extraHtml: table, steps, resText };
      },
      reset(h) { const g = h.el("phBody")._gc; g.state.scale = dflt; h.el("gcScale").value = dflt; g.draw(Array.from({ length: 4 }, () => null)); },
      fill(h) {
        const g = h.el("phBody")._gc; g.state.scale = dflt; h.el("gcScale").value = dflt; g.draw(ex.map((r) => r.slice()));
      },
      share(p, h) {
        const g = h.el("phBody")._gc, rows = g.collect(); p.set("sc", g.state.scale); let n = 0;
        rows.forEach((k, i) => { if (k[1] || k[2].trim()) { p.set("g" + i, k[1]); p.set("c" + i, k[2].trim()); if (k[3] && k[3] !== "0") p.set("t" + i, k[3]); n = i + 1; } }); p.set("n", String(Math.max(n, 1)));
      },
      apply(qs, h) {
        const g = h.el("phBody")._gc, sc = qs.get("sc"); g.state.scale = scales.includes(sc) ? sc : dflt; h.el("gcScale").value = g.state.scale;
        const n = Math.min(MAXR, Math.max(1, Number(qs.get("n")) || 4));
        g.draw(Array.from({ length: n }, (_, i) => (qs.has("g" + i) || qs.has("c" + i) ? ["", (qs.get("g" + i) || "").slice(0, 6), (qs.get("c" + i) || "").slice(0, 6), qs.get("t" + i) === "0.5" || qs.get("t" + i) === "1" ? qs.get("t" + i) : "0"] : null)));
      }
    };
  }
  const courses = courseMode("courses", ["us", "s100", "s12", "s5"], "GPA за курсами", "GPA from courses", "us", [[L("Математика", "Mathematics"), "A", "4", "0.5"], [L("Фізика", "Physics"), "B+", "3", "0"], [L("Історія", "History"), "A-", "2", "0"], [L("Програмування", "Programming"), "B", "3", "0"]]);
  const ua = courseMode("ua", ["s100", "s5", "s12"], "Середній бал (Україна)", "Average grade (Ukraine)", "s100", [[L("Математика", "Mathematics"), "95", "5", "0"], [L("Фізика", "Physics"), "82", "4", "0"], [L("Історія", "History"), "74", "3", "0"], [L("Програмування", "Programming"), "90", "3", "0"]]);

  // ----- цільовий GPA -----
  const F = (out, ins, txt, f) => ({ out, ins: ins ? ins.split(",") : [], txt, f });
  const V = (id, sym, uk, en, ph, sign, def, unit) => { const un = unit || ["бал", "pts"]; return { id, sym, uk, en, si: un, units: [{ uk: un[0], en: un[1], f: q(1n) }], ph, sign: sign || "pos", def }; };
  const num = (v) => Number(v.c.n) / Number(v.c.d);
  const fmt2 = (x) => x.toFixed(2).replace(".", L(",", "."));
  const tg = {
    key: "tg", type: "chain", nameUk: "Цільовий GPA", nameEn: "Target GPA", find: "gr",
    vars: [V("g1", "G₁", "Поточний GPA", "Current GPA", "напр.: 3,2", "nn"), V("c1", "C₁", "Кредитів уже набрано", "Credits already earned", "напр.: 60", "nn", undefined, ["кредитів", "credits"]), V("c2", "C₂", "Кредитів залишилось", "Credits remaining", "напр.: 30", undefined, undefined, ["кредитів", "credits"]), V("gt", "Gₜ", "Цільовий GPA", "Target GPA", "напр.: 3,4", "nn"), V("gr", "Gᵣ", "Потрібний середній бал за решту", "Required average for the rest", ""), V("gm", "Gₘ", "Максимум шкали", "Maximum of the scale", "", "pos", "4"), V("gx", "Gₓ", "Найкращий можливий GPA", "Best possible GPA", "")],
    formulas: [
      F("gr", "g1,c1,c2,gt,gm", "Gᵣ = (Gₜ · (C₁ + C₂) − G₁ · C₁) / C₂", (a) => {
        const r = X.div(X.sub(X.mul(a.gt, X.add(a.c1, a.c2)), X.mul(a.g1, a.c1)), a.c2), v = num(r);
        if (r.c.n > 0n && X.sub(r, a.gm).c.n > 0n) throw new DErr(L("ціль недосяжна: за решту кредитів потрібен середній бал " + fmt2(v) + " — вище за максимум шкали (" + fmt2(num(a.gm)) + ")", "the target is out of reach: the remaining credits need an average of " + fmt2(v) + ", above the scale maximum (" + fmt2(num(a.gm)) + ")"));
        if (r.c.n <= 0n) throw new DErr(L("ціль уже гарантована: навіть із нульовими оцінками за решту GPA не впаде нижче цілі", "the target is already guaranteed: even with zero grades for the rest the GPA will not fall below it"));
        return r;
      }),
      F("gx", "g1,c1,c2,gm", "Gₓ = (G₁ · C₁ + Gₘ · C₂) / (C₁ + C₂)", (a) => X.div(X.add(X.mul(a.g1, a.c1), X.mul(a.gm, a.c2)), X.add(a.c1, a.c2))),
      F("gt", "g1,c1,c2,gr", "Gₜ = (G₁ · C₁ + Gᵣ · C₂) / (C₁ + C₂)", (a) => X.div(X.add(X.mul(a.g1, a.c1), X.mul(a.gr, a.c2)), X.add(a.c1, a.c2))),
      F("g1", "gt,c1,c2,gr", "G₁ = (Gₜ · (C₁ + C₂) − Gᵣ · C₂) / C₁", (a) => X.div(X.sub(X.mul(a.gt, X.add(a.c1, a.c2)), X.mul(a.gr, a.c2)), a.c1)),
      F("c2", "g1,c1,gt,gr", "C₂ = C₁ · (Gₜ − G₁) / (Gᵣ − Gₜ)", (a) => { const r = X.div(X.mul(a.c1, X.sub(a.gt, a.g1)), X.sub(a.gr, a.gt)); if (r.c.n <= 0n) throw new DErr(L("з такими даними кредитів не вийде: перевірте співвідношення G₁, Gₜ і Gᵣ", "no number of credits works with these data: check the relation of G₁, Gₜ and Gᵣ")); return r; }),
      F("c1", "g1,c2,gt,gr", "C₁ = C₂ · (Gᵣ − Gₜ) / (Gₜ − G₁)", (a) => { const r = X.div(X.mul(a.c2, X.sub(a.gr, a.gt)), X.sub(a.gt, a.g1)); if (r.c.n <= 0n) throw new DErr(L("з такими даними кредитів не вийде: перевірте співвідношення G₁, Gₜ і Gᵣ", "no number of credits works with these data: check the relation of G₁, Gₜ and Gᵣ")); return r; })
    ],
    hint: ["Скільки потрібно мати в середньому за решту кредитів, щоб довести GPA до цілі. Максимум шкали 4 для американської шкали (для 5-бальної вкажіть 5, для 100-бальної 100). Калькулятор скаже, якщо ціль недосяжна.", "How much you need on average for the remaining credits to bring the GPA to the target. The scale maximum is 4 for the American scale (enter 5 for the 5-point scale or 100 for the 100-point one). The calculator says if the target is out of reach."],
    example: { find: "gr", vals: { g1: "3.2", c1: "60", c2: "30", gt: "3.4" } }
  };

  // ----- конвертер оцінок -----
  const conv = {
    key: "conv", type: "custom", nameUk: "Конвертер оцінок", nameEn: "Grade converter",
    build(body, x, h) {
      const { el, esc, maybeCalc } = h;
      const ctl = (scale, val) => (SC[scale].num ? '<input class="ph__input" id="gvV" type="text" inputmode="decimal" autocomplete="off" maxlength="6" placeholder="' + SC[scale].ph + '" value="' + esc(val || "") + '" aria-label="' + L("Оцінка", "Grade") + '">' : '<select class="ph__unit ph__unit--wide" id="gvV" aria-label="' + L("Оцінка", "Grade") + '">' + SC[scale].sel.map(([v, t]) => '<option value="' + v + '"' + (v === val ? " selected" : "") + ">" + esc(t) + "</option>").join("") + "</select>");
      body.innerHTML = '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="gvS">' + L("Шкала оцінки", "Grade scale") + '</label><select class="ph__unit ph__unit--wide" id="gvS">' + Object.keys(SC).map((s) => '<option value="' + s + '"' + (s === "s100" ? " selected" : "") + ">" + esc(L(SC[s].uk, SC[s].en)) + "</option>").join("") + '</select></div><div class="ph__var"><label class="ph__label" for="gvV">' + L("Оцінка", "Grade") + '</label><div id="gvCtl">' + ctl("s100", "") + '</div></div></div><div class="ph__hint ph__mt12">' + L("Зіставлення шкал орієнтовні: офіційної єдиної таблиці немає, а виші можуть мати власні. Прочерк означає, що загальноприйнятої відповідності немає.", "Scale mappings are approximate: there is no single official table, and institutions may have their own. A dash means there is no generally accepted equivalent.") + "</div>";
      const wire = () => { const v = el("gvV"); v.addEventListener("input", maybeCalc); v.addEventListener("change", maybeCalc); };
      wire();
      el("gvS").addEventListener("change", () => { el("gvCtl").innerHTML = ctl(el("gvS").value, ""); wire(); maybeCalc(); });
    },
    calc(h) {
      const { el, parseNum, ND, roundStr, esc } = h, nd = Math.min(ND(), 2), scale = el("gvS").value, raw = el("gvV").value;
      const g = grade(scale, raw, parseNum);
      if (g.empty) return { ok: false, incomplete: true };
      if (g.err) return { ok: false, msg: g.err === 2 ? L("Оцінка має бути від 0 до 100.", "The grade must be from 0 to 100.") : L("Недопустима оцінка для цієї шкали.", "Invalid grade for this scale.") };
      const fx = (r) => { let s = roundStr(r, nd); const sep = L(",", "."); if (nd > 0) { if (!s.includes(sep)) s += sep; const have = s.length - s.indexOf(sep) - 1; if (have < nd) s += "0".repeat(nd - have); } return s; };
      const DASH = "—", set = setNow(), rows = [];
      let p100 = DASH, ects = DASH, f5 = DASH, f12 = DASH, usL = DASH, gp = fx(g.pts);
      if (scale === "s100") { const e = ectsOf(g.num); p100 = fx(g.num); ects = e; f5 = String(fiveOf(g.num)); usL = usLabel(usOfPct(g.num)); }
      else if (scale === "us") { const u = US.find((x) => x[0] === raw); p100 = u[2]; const mid = q(BigInt(u[2].split("–")[0]) + BigInt(u[2].split("–")[1]), 2n); ects = ectsOf(mid); f5 = String(fiveOf(mid)); usL = usLabel(raw); }
      else if (scale === "s5") { const n = Number(raw); p100 = { 5: "90–100", 4: "74–89", 3: "60–73", 2: "0–59" }[n]; ects = { 5: "A", 4: "B, C", 3: "D, E", 2: "FX, F" }[n]; f5 = raw; usL = { 5: "A", 4: "B", 3: "C", 2: "F" }[n]; }
      else { const n = Number(raw); f12 = raw; f5 = String(five12(n)); usL = { 5: "A", 4: "B", 3: "C", 2: "F" }[five12(n)]; }
      const table = [[L("100-бальна", "100-point"), p100], ["ECTS", ects], [L("5-бальна", "5-point"), f5], [L("12-бальна", "12-point"), f12], [L("США (літера)", "US (letter)"), usL], [L("GPA 4,0 (орієнтовно)", "GPA 4.0 (approx.)"), gp]];
      const trs = table.map(([k, v]) => "<tr><th>" + esc(k) + "</th><td>" + esc(v) + "</td></tr>").join("");
      const ref = '<div class="ph__sub">' + L("Усі шкали", "All scales") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Шкала", "Scale") + "</th><th>" + L("Значення", "Value") + "</th></tr></thead><tbody>" + trs + "</tbody></table></div>" +
        '<div class="ph__sub">' + L("Таблиця меж 100-бальної шкали", "Boundaries of the 100-point scale") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>ECTS</th><th>100</th><th>5</th><th>GPA 4,0</th></tr></thead><tbody>' +
        [["A", "90–100", "5", EPT[set].A], ["B", "82–89", "4", EPT[set].B], ["C", "74–81", "4", EPT[set].C], ["D", "64–73", "3", EPT[set].D], ["E", "60–63", "3", EPT[set].E], ["FX", "35–59", "2", EPT[set].FX], ["F", "0–34", "2", EPT[set].F]].map((r) => "<tr><th>" + r[0] + "</th><td>" + r[1] + "</td><td>" + r[2] + "</td><td>" + esc(fx(D(r[3]))) + "</td></tr>").join("") + "</tbody></table></div>";
      const steps = [{ t: L("Вхідна оцінка", "Input grade"), l: [L(SC[scale].uk, SC[scale].en) + ": " + (scale === "us" ? usLabel(raw) : raw)] }, { t: L("Зіставлення", "Mapping"), l: table.filter((r) => r[1] !== DASH).map((r) => r[0] + ": " + r[1]), note: L("Зіставлення орієнтовні; прочерк — немає загальноприйнятої відповідності.", "The mappings are approximate; a dash means there is no generally accepted equivalent.") }];
      return { ok: true, expr: L("Конвертер оцінок", "Grade converter"), head: [L("GPA 4,0", "GPA 4.0"), gp], headSub: L("орієнтовно", "approx."), subRaw: true, tiles: [{ k: "ECTS", v: ects }, { k: L("5-бальна", "5-point"), v: f5 }, { k: L("США", "US"), v: usL }], extraHtml: ref, steps, resText: (scale === "us" ? usLabel(raw) : raw) + " → GPA " + gp + ", ECTS " + ects + ", 5: " + f5 };
    },
    reset(h) { h.el("gvS").value = "s100"; h.el("gvCtl").innerHTML = '<input class="ph__input" id="gvV" type="text" inputmode="decimal" autocomplete="off" maxlength="6" placeholder="' + SC.s100.ph + '">'; h.el("gvV").addEventListener("input", h.maybeCalc); },
    fill(h) { h.el("gvS").value = "s100"; h.el("gvCtl").innerHTML = '<input class="ph__input" id="gvV" type="text" inputmode="decimal" autocomplete="off" maxlength="6" value="87">'; h.el("gvV").addEventListener("input", h.maybeCalc); },
    share(p, h) { p.set("vs", h.el("gvS").value); p.set("vv", h.el("gvV").value); },
    apply(qs, h) { const s = qs.get("vs"); if (!SC[s]) return; h.el("gvS").value = s; const v = (qs.get("vv") || "").slice(0, 6); h.el("gvCtl").innerHTML = SC[s].num ? '<input class="ph__input" id="gvV" type="text" inputmode="decimal" autocomplete="off" maxlength="6" value="' + v.replace(/"/g, "") + '">' : '<select class="ph__unit ph__unit--wide" id="gvV">' + SC[s].sel.map(([x, t]) => '<option value="' + x + '"' + (x === v ? " selected" : "") + ">" + t + "</option>").join("") + "</select>"; h.el("gvV").addEventListener("input", h.maybeCalc); h.el("gvV").addEventListener("change", h.maybeCalc); }
  };
  return { modes: [courses, ua, tg, conv], keepSet: true };
});
