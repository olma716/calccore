/* hr-calc.js — калькулятор пульсових зон: зони за віком (максимум за формулою, % від максимуму чи Карвонен), порівняння формул, порогові зони (LTHR) */
PhysCalc.start(({ L }) => {
  const H = window.Hr, UI = window.PhysUI;
  const SEP = L(",", ".");
  const BPM = L("уд/хв", "bpm");
  const fnum = (x, d = 1) => { const v = Math.round(x * 10 ** d) / 10 ** d; return String(v).replace(".", SEP); };
  const num = (s) => { const t = String(s).replace(/\s+/g, "").replace(",", "."); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
  const intOf = (s) => (/^\d{1,3}$/.test(String(s).trim()) ? Number(String(s).trim()) : null);
  const NOTE = L("Це оцінка за статистичними формулами: орієнтир для тренувань, а не медична порада. Індивідуальний максимальний пульс може відрізнятися на 10–20 уд/хв.", "This is an estimate from statistical formulas: a training guide, not medical advice. Your own maximum heart rate can differ by 10–20 bpm.");
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (ml || 4) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const RAMP = ["#cddbff", "#9db8f2", "#6f93e6", "#3d63c9", "#283b69"];
  const show = (el, id, on) => { const e = el(id + "W"); if (e) e.style.display = on ? "" : "none"; };
  const formOpts = () => H.MAXF.map((f) => [f.id, L(f.uk, f.en)]).concat([["custom", L("Власне значення (виміряне)", "Your own value (measured)")]]);
  const sexF = () => fld("hrS", L("Стать", "Sex"), sel("hrS", [["m", L("Чоловіча", "Male")], ["f", L("Жіноча", "Female")]], "m"));
  const ageF = (ph) => fld("hrA", L("Вік, років", "Age, years"), inp("hrA", ph || L("напр.: 30", "e.g.: 30"), 3));
  const refresh = (el) => { if (el("hrF")) show(el, "hrM", el("hrF").value === "custom"); };
  const wire = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); if (e) e.addEventListener(e.tagName === "SELECT" ? "change" : "input", () => { refresh(el); maybeCalc(); }); });
  const setP = (el, id, v) => { const e = el(id); if (e && v !== undefined) e.value = v; };
  const shareMap = (map, p, el) => map.forEach(([k, id]) => { const e = el(id); if (e && String(e.value).trim() !== "") p.set(k, String(e.value).trim()); });
  const applyMap = (map, qs, el) => { map.forEach(([k, id]) => { const e = el(id); if (!e || !qs.has(k)) return; const v = qs.get(k).slice(0, 12); if (e.tagName === "SELECT") { if ([...e.options].some((o) => o.value === v)) e.value = v; } else e.value = v; }); refresh(el); };
  const strip = (items, cur, unit) => {
    const W = 600, H0 = 110, pl = 8, pr = 8, y = 30, hh = 34, lo = items[0].lo, hi = items[items.length - 1].hi, span = hi - lo || 1, px = (v) => pl + ((W - pl - pr) * (v - lo)) / span;
    const rects = items.map((z, i) => '<rect x="' + px(z.lo).toFixed(1) + '" y="' + y + '" width="' + Math.max(2, px(z.hi + 1) - px(z.lo)).toFixed(1) + '" height="' + hh + '" fill="' + RAMP[Math.min(i, RAMP.length - 1)] + '"' + (i === 0 ? ' rx="6"' : "") + "/>").join("");
    const labs = items.map((z, i) => { const cx = (px(z.lo) + px(z.hi + 1)) / 2, dark = i >= 3; return '<text x="' + cx.toFixed(1) + '" y="' + (y + hh / 2 + 4) + '" text-anchor="middle" font-size="12" font-weight="800" fill="' + (dark ? "#fff" : "#1f2f55") + '">' + z.name + '</text><text x="' + px(z.lo).toFixed(1) + '" y="' + (y + hh + 16) + '" font-size="10" fill="#5b6b8c">' + z.lo + "</text>"; }).join("");
    const last = '<text x="' + px(hi + 1).toFixed(1) + '" y="' + (y + hh + 16) + '" text-anchor="end" font-size="10" fill="#5b6b8c">' + hi + "</text>";
    const mark = cur !== null && cur >= lo && cur <= hi ? '<path d="M' + px(cur).toFixed(1) + " " + (y - 2) + " l-6 -9 h12 z\" fill=\"#b3261e\"/><text x=\"" + px(cur).toFixed(1) + '" y="' + (y - 14) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#b3261e">' + cur + "</text>" : "";
    return '<svg class="ph__chart" viewBox="0 0 ' + W + " " + H0 + '" width="100%" role="img" aria-label="' + L("Пульсові зони", "Heart rate zones") + '">' + rects + labs + last + mark + "</svg>";
  };
  const barChart = (labels, values, fmtV) => {
    const W = 600, H0 = 200, pl = 10, pr = 10, pt = 24, pb = 30, n = values.length, gap = 12, bw = (W - pl - pr - gap * (n - 1)) / n, mx = Math.max(...values, 1e-9), mn = Math.min(...values) * 0.8;
    const bars = values.map((v, i) => { const h = ((H0 - pt - pb) * (v - mn)) / (mx - mn || 1), x = pl + i * (bw + gap), y = H0 - pb - h; return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" fill="#3d63c9"/><text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 6).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#1f2f55">' + fmtV(v) + '</text><text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H0 - 10) + '" text-anchor="middle" font-size="11" fill="#5b6b8c">' + labels[i] + "</text>"; }).join("");
    return '<svg class="ph__chart" viewBox="0 0 ' + W + " " + H0 + '" width="100%" role="img" aria-label="' + L("Діаграма", "Chart") + '">' + bars + "</svg>";
  };
  const ageErr = L("Вік — ціле число від 15 до 100 років.", "Age — a whole number from 15 to 100 years.");

  // ----- зони за віком -----
  const MAP = [["ag", "hrA"], ["sx", "hrS"], ["fo", "hrF"], ["mx", "hrM"], ["mt", "hrT"], ["rh", "hrR"], ["cu", "hrC"]];
  const zonesMode = {
    key: "zones", type: "custom", req: ({ el }) => [el("hrF").value === "custom" ? "hrM" : "hrA"], nameUk: "Зони за віком", nameEn: "Zones by age",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + ageF() + sexF() + fld("hrF", L("Формула максимального пульсу", "Max heart rate formula"), sel("hrF", formOpts(), "tanaka"), true) + fld("hrM", L("Ваш максимальний пульс, уд/хв", "Your max heart rate, bpm"), inp("hrM", L("напр.: 188", "e.g.: 188")), true) + fld("hrT", L("Метод зон", "Zone method"), sel("hrT", [["auto", L("Карвонен, якщо вказано пульс спокою", "Karvonen if resting HR is given")], ["max", L("% від максимального пульсу", "% of max heart rate")], ["hrr", L("% резерву пульсу (Карвонен)", "% of heart rate reserve (Karvonen)")]], "auto"), true) + fld("hrR", L("Пульс спокою, уд/хв", "Resting heart rate, bpm"), inp("hrR", L("необов'язково", "optional"))) + fld("hrC", L("Пульс на тренуванні, уд/хв", "Heart rate in training, bpm"), inp("hrC", L("необов'язково", "optional"))) + "</div>";
      wire(el, maybeCalc, ["hrA", "hrS", "hrF", "hrM", "hrT", "hrR", "hrC"]); refresh(el);
    },
    calc(h) {
      const { el } = h, f = el("hrF").value, custom = f === "custom", as = el("hrA").value.trim();
      if (custom ? !el("hrM").value.trim() : !as) return { ok: false, incomplete: true };
      const sex = el("hrS").value, warns = []; let age = null;
      if (as) { age = intOf(as); if (age === null || age < 15 || age > 100) return { ok: false, msg: ageErr }; if (age < 18) warns.push(L("Формули розраховані на дорослих: для віку до 18 років результат лише орієнтовний.", "The formulas are designed for adults: for ages under 18 the result is only a rough guide.")); }
      let max;
      if (custom) { max = num(el("hrM").value); if (max === null || max < 120 || max > 230) return { ok: false, msg: L("Максимальний пульс — від 120 до 230 уд/хв.", "Max heart rate — from 120 to 230 bpm.") }; }
      else { max = H.maxHr(f, age, sex); if (max === null) return { ok: false, msg: L("Формула Гулаті — для жінок: оберіть іншу формулу або стать.", "The Gulati formula is for women: choose another formula or sex.") }; }
      const maxR = Math.round(max);
      let rest = null; const rs = el("hrR").value.trim();
      if (rs) { rest = num(rs); if (rest === null || rest < 30 || rest > 110) return { ok: false, msg: L("Пульс спокою — від 30 до 110 уд/хв.", "Resting heart rate — from 30 to 110 bpm.") }; if (rest > maxR - 40) return { ok: false, msg: L("Пульс спокою має бути щонайменше на 40 уд/хв нижчим за максимальний (" + maxR + ").", "Resting heart rate must be at least 40 bpm below the maximum (" + maxR + ").") }; if (rest > 100) warns.push(L("Постійний пульс спокою понад 100 уд/хв варто обговорити з лікарем.", "A constant resting heart rate above 100 bpm is worth discussing with a doctor.")); }
      const mt = el("hrT").value, method = mt === "max" ? "max" : mt === "hrr" ? "hrr" : rest !== null ? "hrr" : "max";
      if (method === "hrr" && rest === null) return { ok: false, msg: L("Для методу Карвонена вкажіть пульс спокою.", "For the Karvonen method enter the resting heart rate.") };
      let cur = null; const cs = el("hrC").value.trim();
      if (cs) { cur = num(cs); if (cur === null || cur < 30 || cur > 230) return { ok: false, msg: L("Пульс на тренуванні — від 30 до 230 уд/хв.", "Heart rate in training — from 30 to 230 bpm.") }; }
      const zs = H.zones(maxR, rest || 0, method), reserve = rest !== null ? maxR - rest : null, cz = cur !== null ? H.zoneOf(cur, zs) : null;
      const rows = zs.map((z) => ({ cells: [L("Зона ", "Zone ") + (z.i + 1) + " · " + L(z.uk, z.en), { t: z.loBpm + "–" + z.hiBpm + " " + BPM, cls: "chip" }, Math.round(z.lo * 100) + "–" + Math.round(z.hi * 100) + (method === "hrr" ? L(" % резерву", " % of reserve") : " %"), z.rpe + L(" з 10 · ", " of 10 · ") + L(z.talkU, z.talkE)], main: cz === z.i }));
      const table = UI.list([L("Зона", "Zone"), L("Пульс", "Heart rate"), method === "hrr" ? L("Від резерву", "Of reserve") : L("Від максимуму", "Of max"), L("Зусилля й розмова", "Effort and talk")], rows, { w: "minmax(0, 1.2fr) 130px 120px minmax(0, 1.6fr)" });
      const items = zs.map((z) => ({ lo: z.loBpm, hi: z.hiBpm, name: "Z" + (z.i + 1) }));
      const fa = custom ? [] : H.MAXF.map((q) => (age !== null ? H.maxHr(q.id, age, sex) : null)).filter((v) => v !== null);
      const steps = [];
      steps.push(custom ? { t: L("Максимальний пульс", "Max heart rate"), l: [L("Ваше значення: ", "Your value: ") + maxR + " " + BPM] } : { t: L("Максимальний пульс за формулою ", "Max heart rate by the ") + H.name(f), l: [fnum(max, 2) + " → " + maxR + " " + BPM], note: L("Формули дають середнє для групи людей; індивідуальний максимум може відрізнятися на 10–20 уд/хв.", "The formulas give a group average; your own maximum can differ by 10–20 bpm.") });
      steps.push(method === "hrr" ? { t: L("Резерв пульсу (Карвонен)", "Heart rate reserve (Karvonen)"), l: [L("Резерв = ", "Reserve = ") + maxR + " − " + rest + " = " + reserve, L("Межа = ", "Limit = ") + rest + " + " + reserve + L(" × частка", " × share") + ": " + rest + " + " + reserve + " × 0,5 = " + fnum(rest + reserve * 0.5, 1)] } : { t: L("Зони за відсотком від максимуму", "Zones by percentage of the maximum"), l: [L("Межа = максимум × частка: ", "Limit = maximum × share: ") + maxR + " × 0,6 = " + fnum(maxR * 0.6, 1)] });
      steps.push({ t: L("Межі без перекриття", "Non-overlapping limits"), l: [L("Верхні межі округлюємо, нижня межа наступної зони — на 1 більша.", "Upper limits are rounded; the next zone starts 1 bpm higher.")] });
      const cur2 = cz === null ? [] : [{ k: L("Ваш пульс", "Your heart rate"), v: cz === -1 ? L("нижче зон", "below the zones") : cz >= zs.length ? L("вище максимуму", "above the maximum") : L("Зона ", "Zone ") + (cz + 1) + " · " + L(zs[cz].uk, zs[cz].en) }];
      const tiles = [{ k: L("Максимальний пульс", "Max heart rate"), v: maxR + " " + BPM }, reserve !== null ? { k: L("Резерв пульсу", "Heart rate reserve"), v: reserve + " " + BPM } : { k: L("Метод", "Method"), v: L("% від максимуму", "% of the max") }].concat(fa.length > 1 ? [{ k: L("За іншими формулами", "By other formulas"), v: Math.round(Math.min(...fa)) + "–" + Math.round(Math.max(...fa)) }] : []).concat(cur2);
      return { ok: true, expr: (custom ? L("власний максимум", "own maximum") : H.name(f) + (age !== null ? ", " + age + L(" р.", " y") : "")) + (rest !== null ? L(", спокій ", ", resting ") + rest : ""), head: [L("максимальний пульс", "max heart rate"), maxR + " " + BPM], headSub: (method === "hrr" ? L("Карвонен: резерв ", "Karvonen: reserve ") + reserve + " " + BPM : L("зони за відсотком від максимуму", "zones by percentage of the maximum")), subRaw: true, tiles, extraHtml: '<div class="ph__sub">' + L("Пульсові зони", "Heart rate zones") + "</div>" + table + strip(items, cur, BPM) + warnHtml(warns) + hint(L("«Зона жироспалення» — спрощення: жир витрачається в усіх зонах, а в легких частка жиру в енергії більша, проте вирішує загальна витрата калорій. Опис зусилля й розмовний тест — орієнтовні.", "The “fat-burning zone” is a simplification: fat is used in all zones; its share is higher in easy ones, but total calories matter most. The effort description and the talk test are approximate.")), note: NOTE, steps, resText: L("Максимальний пульс ", "Max heart rate ") + maxR + " " + BPM + ": " + zs.map((z) => "Z" + (z.i + 1) + " " + z.loBpm + "–" + z.hiBpm).join("; ") };
    },
    reset(h) { const { el } = h; ["hrA", "hrM", "hrR", "hrC"].forEach((id) => setP(el, id, "")); setP(el, "hrS", "m"); setP(el, "hrF", "tanaka"); setP(el, "hrT", "auto"); refresh(el); },
    fill(h) { const { el } = h; setP(el, "hrA", "30"); setP(el, "hrS", "m"); setP(el, "hrF", "tanaka"); setP(el, "hrM", ""); setP(el, "hrT", "auto"); setP(el, "hrR", ""); setP(el, "hrC", ""); refresh(el); },
    share(p, h) { const { el } = h; if (!el("hrA").value.trim() && !el("hrM").value.trim()) return; shareMap(MAP, p, el); },
    apply(qs, h) { applyMap(MAP, qs, h.el); }
  };

  // ----- порівняння формул -----
  const compare = {
    key: "compare", type: "custom", req: ({ el }) => ["hrA"], nameUk: "Порівняння формул", nameEn: "Compare formulas",
    build(body, x, h) { const { el, maybeCalc } = h; body.innerHTML = '<div class="ph__vars">' + ageF() + sexF() + "</div>"; wire(el, maybeCalc, ["hrA", "hrS"]); },
    calc(h) {
      const { el } = h, as = el("hrA").value.trim();
      if (!as) return { ok: false, incomplete: true };
      const age = intOf(as), sex = el("hrS").value;
      if (age === null || age < 15 || age > 100) return { ok: false, msg: ageErr };
      const items = H.MAXF.map((q) => ({ n: L(q.uk, q.en), id: q.id, v: H.maxHr(q.id, age, sex) })), ok = items.filter((x) => x.v !== null), vals = ok.map((x) => x.v), av = vals.reduce((a, b) => a + b, 0) / vals.length, mn = Math.min(...vals), mx = Math.max(...vals), fox = H.maxHr("fox", age, sex);
      const rows = items.map((x) => (x.v === null ? { cells: [x.n, { t: "—", cls: "muted" }, { t: L("лише для жінок", "women only"), cls: "muted" }] } : { cells: [x.n, { t: Math.round(x.v) + " " + BPM, cls: "strong" }, { t: x.id === "fox" ? L("базова", "baseline") : (x.v - fox >= 0 ? "+" : "−") + Math.abs(Math.round(x.v - fox)) + L(" до Фокса", " vs Fox"), cls: "muted" }] }));
      rows.push({ cells: [L("Середнє", "Mean"), { t: Math.round(av) + " " + BPM, cls: "chip" }, ""], main: true });
      const table = UI.list([L("Формула", "Formula"), L("Максимум", "Maximum"), L("Різниця", "Difference")], rows, { w: "minmax(0, 1.8fr) 120px 140px" });
      const chart = barChart(ok.map((x) => x.n.split(" ")[0].replace(",", "")), vals, (v) => String(Math.round(v)));
      const steps = [{ t: L("Рахуємо за кожною формулою", "Computing by each formula"), l: ok.map((x) => x.n + ": " + fnum(x.v, 2)) }, { t: L("Середнє й розкид", "Mean and spread"), l: [L("Середнє ", "Mean ") + fnum(av, 1) + " " + BPM, L("Від ", "From ") + fnum(mn, 1) + L(" до ", " to ") + fnum(mx, 1) + " (" + fnum(mx - mn, 1) + " " + BPM + ")"], note: L("Розкид між формулами — це лише частина реальної невизначеності: окрема людина відхиляється ще на 10–20 уд/хв.", "The spread between the formulas is only part of the real uncertainty: an individual deviates by another 10–20 bpm.") }];
      return { ok: true, expr: L(sex === "m" ? "чол., " : "жін., ", sex === "m" ? "male, " : "female, ") + age + L(" р.", " y"), head: [L("середній максимум", "mean maximum"), Math.round(av) + " " + BPM], headSub: L("від ", "from ") + Math.round(mn) + L(" до ", " to ") + Math.round(mx) + " " + BPM, subRaw: true, tiles: [{ k: L("Мінімум", "Minimum"), v: Math.round(mn) + " " + BPM }, { k: L("Максимум", "Maximum"), v: Math.round(mx) + " " + BPM }, { k: L("Розкид", "Spread"), v: Math.round(mx - mn) + " " + BPM }], extraHtml: table + '<div class="ph__sub">' + L("Діаграма", "Chart") + "</div>" + chart, note: NOTE, steps, resText: L("Максимальний пульс за формулами: ", "Max heart rate by formulas: ") + ok.map((x) => x.n.split(" ")[0] + " " + Math.round(x.v)).join("; ") + L("; середнє ", "; mean ") + Math.round(av) };
    },
    reset(h) { const { el } = h; setP(el, "hrA", ""); setP(el, "hrS", "m"); },
    fill(h) { const { el } = h; setP(el, "hrA", "30"); setP(el, "hrS", "m"); },
    share(p, h) { const { el } = h; if (!el("hrA").value.trim()) return; shareMap([["ag", "hrA"], ["sx", "hrS"]], p, el); },
    apply(qs, h) { applyMap([["ag", "hrA"], ["sx", "hrS"]], qs, h.el); }
  };

  // ----- зони за порогом (LTHR) -----
  const lthr = {
    key: "lthr", type: "custom", req: ({ el }) => ["hrL"], nameUk: "Зони за порогом", nameEn: "Threshold zones",
    build(body, x, h) { const { el, maybeCalc } = h; body.innerHTML = '<div class="ph__vars">' + fld("hrL", L("Пульс лактатного порогу (LTHR), уд/хв", "Lactate threshold heart rate (LTHR), bpm"), inp("hrL", L("напр.: 165", "e.g.: 165")), true) + '</div><div class="ph__hint ph__mt12">' + L("Орієнтовно LTHR — це середній пульс останніх 20 хвилин із 30-хвилинного максимально рівного забігу (за Френом). Тут зони для бігу; LTHR не дорівнює максимальному пульсу.", "As a rough guide, LTHR is the average heart rate of the last 20 minutes of a 30-minute all-out steady run (per Friel). These are running zones; LTHR is not the same as max heart rate.") + "</div>"; wire(el, maybeCalc, ["hrL"]); },
    calc(h) {
      const { el } = h, ls = el("hrL").value.trim();
      if (!ls) return { ok: false, incomplete: true };
      const lt = num(ls);
      if (lt === null || lt < 100 || lt > 210) return { ok: false, msg: L("LTHR — від 100 до 210 уд/хв.", "LTHR — from 100 to 210 bpm.") };
      const fz = H.friel(Math.round(lt));
      const rows = fz.map((z) => ({ cells: [L("Зона ", "Zone ") + z.z + " · " + L(z.uk, z.en), { t: z.loBpm === null ? "< " + (z.hiBpm + 1) + " " + BPM : z.hiBpm === null ? "≥ " + z.loBpm + " " + BPM : z.loBpm + "–" + z.hiBpm + " " + BPM, cls: "chip" }, z.loPct === null ? "< " + (z.hiPct + 1) + " %" : z.hiPct === null ? "> " + (z.loPct - 1) + " %" : z.loPct + "–" + z.hiPct + " %"] }));
      const table = UI.list([L("Зона", "Zone"), L("Пульс", "Heart rate"), L("Від LTHR", "Of LTHR")], rows, { w: "minmax(0, 1.6fr) 150px 120px" });
      const items = fz.slice(0, 6).map((z, i) => ({ lo: z.loBpm === null ? Math.round(lt * 0.7) : z.loBpm, hi: z.hiBpm, name: z.z }));
      const steps = [{ t: L("Відсотки від LTHR (Френ, біг)", "Percentages of LTHR (Friel, running)"), l: [L("Зона 1 — до 85 %; 2 — 85–89; 3 — 90–94; 4 — 95–99; 5a — 100–102; 5b — 103–106; 5c — понад 106 %", "Zone 1 — below 85%; 2 — 85–89; 3 — 90–94; 4 — 95–99; 5a — 100–102; 5b — 103–106; 5c — above 106%")] }, { t: L("Переводимо в уд/хв", "Converting to bpm"), l: [Math.round(lt) + " × 0,85 = " + fnum(lt * 0.85, 1) + " → " + fz[1].loBpm, Math.round(lt) + " × 1,00 = " + Math.round(lt)], note: L("Нижні межі округлюємо; верхня межа зони — на 1 менша за нижню межу наступної.", "Lower limits are rounded; the upper limit of a zone is 1 below the lower limit of the next.") }];
      return { ok: true, expr: "LTHR " + Math.round(lt) + " " + BPM, head: [L("пульс порогу", "threshold HR"), Math.round(lt) + " " + BPM], headSub: L("7 порогових зон для бігу", "7 threshold zones for running"), subRaw: true, tiles: [{ k: L("Межа зони 2", "Zone 2 starts"), v: fz[1].loBpm + " " + BPM }, { k: L("Поріг (зона 5a)", "Threshold (zone 5a)"), v: fz[4].loBpm + " " + BPM }, { k: L("Зона 5c від", "Zone 5c from"), v: fz[6].loBpm + " " + BPM }], extraHtml: '<div class="ph__sub">' + L("Порогові зони", "Threshold zones") + "</div>" + table + strip(items, null, BPM) + hint(L("Шкала Френа для бігу; для велосипеда й плавання пороги й відсотки інші.", "Friel's scale is for running; for cycling and swimming thresholds and percentages differ.")), note: NOTE, steps, resText: "LTHR " + Math.round(lt) + " " + BPM + ": " + fz.map((z) => z.z + " " + (z.loBpm === null ? "<" + (z.hiBpm + 1) : z.hiBpm === null ? "≥" + z.loBpm : z.loBpm + "–" + z.hiBpm)).join("; ") };
    },
    reset(h) { setP(h.el, "hrL", ""); },
    fill(h) { setP(h.el, "hrL", "165"); },
    share(p, h) { const { el } = h; if (el("hrL").value.trim()) p.set("lt", el("hrL").value.trim()); },
    apply(qs, h) { if (qs.has("lt")) h.el("hrL").value = qs.get("lt").slice(0, 4); }
  };
  return { modes: [zonesMode, compare, lthr], exactNote: false };
});
