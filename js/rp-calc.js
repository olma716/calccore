/* rp-calc.js — калькулятор темпу бігу: темп/час/дистанція, спліти, прогноз за Рігелем, VDOT і тренувальні темпи */
PhysCalc.start(({ L }) => {
  const R = window.Rp, UI = window.PhysUI;
  const SEP = L(",", ".");
  const fnum = (x, d = 1) => { const v = Math.round(x * 10 ** d) / 10 ** d; return String(v).replace(".", SEP); };
  const num = (s) => { const t = String(s).replace(/\s+/g, "").replace(",", "."); return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null; };
  const NOTE = L("Це розрахунок за формулами для планування тренувань, а не гарантія результату: на реальний час впливають рельєф, погода, підготовка й самопочуття.", "This is a formula-based calculation for training planning, not a guarantee: terrain, weather, fitness and how you feel affect the real time.");
  const KM = L("км", "km"), MI = L("миля", "mi"), PK = L("/км", "/km"), PM = L("/милю", "/mi");
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (ml || 7) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const show = (el, id, on) => { const e = el(id + "W"); if (e) e.style.display = on ? "" : "none"; };
  const setP = (el, id, v) => { const e = el(id); if (e && v !== undefined) e.value = v; };
  const shareMap = (map, p, el) => map.forEach(([k, id]) => { const e = el(id); if (e && String(e.value).trim() !== "") p.set(k, String(e.value).trim()); });
  const applyMap = (map, qs, el) => map.forEach(([k, id]) => { const e = el(id); if (!e || !qs.has(k)) return; const v = qs.get(k).slice(0, 12); if (e.tagName === "SELECT") { if ([...e.options].some((o) => o.value === v)) e.value = v; } else e.value = v; });
  // ----- дистанція й час -----
  const unitOpts = () => [["km", L("Кілометри (км)", "Kilometres (km)")], ["mi", L("Милі", "Miles")]];
  const distF = () => fld("rpD", '<span id="rpDL">' + L("Дистанція, км", "Distance, km") + "</span>", inp("rpD", L("напр.: 10", "e.g.: 10"))) + fld("rpDu", L("Одиниці дистанції", "Distance unit"), sel("rpDu", unitOpts(), "km"));
  const timeF = () => fld("rpTh", L("Час, години", "Time, hours"), inp("rpTh", "0", 3)) + fld("rpTm", L("Час, хвилини", "Time, minutes"), inp("rpTm", L("напр.: 50", "e.g.: 50"), 3)) + fld("rpTs", L("Час, секунди", "Time, seconds"), inp("rpTs", "0", 5));
  const mi = (el) => el("rpDu").value === "mi";
  const refreshD = (el) => { if (el("rpDL")) el("rpDL").textContent = mi(el) ? L("Дистанція, милі", "Distance, miles") : L("Дистанція, км", "Distance, km"); };
  const trim = (x) => String(Math.round(x * 10000) / 10000).replace(".", SEP);
  const wireDist = (el, maybeCalc, extra) => {
    el("rpD").addEventListener("input", maybeCalc);
    el("rpDu").addEventListener("change", () => { const v = num(el("rpD").value); if (v !== null && el("rpD").value.trim()) el("rpD").value = trim(mi(el) ? v / R.KM_MI : v * R.KM_MI); refreshD(el); maybeCalc(); });
    ["rpTh", "rpTm", "rpTs"].concat(extra || []).forEach((id) => { const e = el(id); if (e) e.addEventListener(e.tagName === "SELECT" ? "change" : "input", () => { if (extra && extra.includes(id) && id === "rpF") return; maybeCalc(); }); });
  };
  const readDist = (el, lo, hi) => {
    const s = el("rpD").value.trim(); if (!s) return null;
    const v = num(s); if (v === null) return { err: L("Дистанція — число.", "Distance is a number.") };
    const km = mi(el) ? v * R.KM_MI : v;
    if (km < lo || km > hi) return { err: L("Дистанція — від " + fnum(lo, 1) + " до " + fnum(hi, 0) + " км (" + fnum(lo / R.KM_MI, 2) + "–" + fnum(hi / R.KM_MI, 0) + " миль).", "Distance — from " + fnum(lo, 1) + " to " + fnum(hi, 0) + " km (" + fnum(lo / R.KM_MI, 2) + "–" + fnum(hi / R.KM_MI, 0) + " mi).") };
    return { km };
  };
  const readTime = (el) => {
    const vs = ["rpTh", "rpTm", "rpTs"].map((id) => el(id).value.trim());
    if (vs.every((v) => !v)) return null;
    const [h, m, s] = vs.map((v) => (v === "" ? 0 : num(v)));
    if (h === null || m === null || s === null) return { err: L("Час — числа: години, хвилини, секунди.", "Time — numbers: hours, minutes, seconds.") };
    if (!Number.isInteger(h) || !Number.isInteger(m) || h > 99) return { err: L("Години й хвилини — цілі числа (години до 99).", "Hours and minutes are whole numbers (hours up to 99).") };
    if (m > 59 || s >= 60) return { err: L("Хвилини й секунди — менше 60.", "Minutes and seconds must be below 60.") };
    const sec = h * 3600 + m * 60 + s;
    if (sec <= 0) return { err: L("Час має бути більшим за нуль.", "Time must be above zero.") };
    return { sec };
  };
  const readPace = (el) => {
    const vs = [el("rpPm").value.trim(), el("rpPs").value.trim()];
    if (vs.every((v) => !v)) return null;
    const m = vs[0] === "" ? 0 : num(vs[0]), s = vs[1] === "" ? 0 : num(vs[1]);
    if (m === null || s === null || !Number.isInteger(m)) return { err: L("Темп — хвилини (ціле число) і секунди.", "Pace — minutes (a whole number) and seconds.") };
    if (s >= 60) return { err: L("Секунди темпу — менше 60.", "Pace seconds must be below 60.") };
    const sec = m * 60 + s;
    if (sec < 60 || sec > 3600) return { err: L("Темп — від 1:00 до 60:00 на одиницю дистанції.", "Pace — from 1:00 to 60:00 per distance unit.") };
    return { sec };
  };
  const speedTiles = (pk) => [{ k: L("Темп на кілометр", "Pace per kilometre"), v: R.fmtLong(pk) }, { k: L("Темп на милю", "Pace per mile"), v: R.fmtLong(pk * R.KM_MI) }, { k: L("Швидкість, км/год", "Speed, km/h"), v: fnum(3600 / pk, 2) }, { k: L("Швидкість, миль/год", "Speed, mph"), v: fnum(3600 / (pk * R.KM_MI), 2) }];
  const distName = (km) => { const d = R.DISTS.find((q) => Math.abs(q.km - km) < 0.0006); return d ? L(d.uk, d.en) : fnum(km, 2) + " " + KM; };
  const paceWarn = (pk) => (pk < 120 ? [L("Такий темп швидший за світові рекорди на будь-якій дистанції понад кілька кілометрів — перевірте введені дані.", "This pace is faster than world records over anything beyond a few kilometres — check your input.")] : []);
  // таблиця стандартних дистанцій за темпом
  const paceTable = (pk, hi) => UI.list([L("Дистанція", "Distance"), L("Час", "Time")], R.DISTS.map((d) => ({ main: hi != null && Math.abs(d.km - hi) < 0.0006, cells: [{ t: L(d.uk, d.en), cls: "is-first" }, { t: R.fmtLong(pk * d.km), cls: "chip" }] })), { w: "minmax(0, 1fr) 170px" });
  const raceTable = (res) => UI.list([L("Дистанція", "Distance"), L("Час", "Time"), L("Темп /км", "Pace /km"), L("Темп /милю", "Pace /mi")], R.DISTS.map((d) => { const t = res(d.km); return { main: false, cells: [{ t: L(d.uk, d.en), cls: "is-first" }, { t: R.fmtLong(t), cls: "chip" }, R.fmtLong(t / d.km), R.fmtLong((t / d.km) * R.KM_MI)] }; }), { w: "minmax(0, 1fr) 150px 125px 135px" });

  // ----- темп, час, дистанція -----
  const MAP1 = [["wf", "rpF"], ["un", "rpDu"], ["ds", "rpD"], ["th", "rpTh"], ["tm", "rpTm"], ["ts", "rpTs"], ["pm", "rpPm"], ["ps", "rpPs"], ["pu", "rpPu"]];
  const refresh1 = (el) => { const f = el("rpF").value; show(el, "rpD", f !== "dist"); ["rpTh", "rpTm", "rpTs"].forEach((id) => show(el, id, f !== "time")); ["rpPm", "rpPs", "rpPu"].forEach((id) => show(el, id, f !== "pace")); refreshD(el); };
  const mode1 = {
    key: "calc", type: "custom", req: ({ el }) => el("rpF").value === "time" ? ["rpD", "rpPm"] : el("rpF").value === "pace" ? ["rpD", "rpTm"] : ["rpPm", "rpTm"], nameUk: "Темп, час, дистанція", nameEn: "Pace, time, distance",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("rpF", L("Що знайти", "What to find"), sel("rpF", [["time", L("Час фінішу", "Finish time")], ["pace", L("Темп", "Pace")], ["dist", L("Дистанцію", "Distance")]], "time"), true) + distF() + timeF() + fld("rpPm", L("Темп, хвилини", "Pace, minutes"), inp("rpPm", L("напр.: 5", "e.g.: 5"), 3)) + fld("rpPs", L("Темп, секунди", "Pace, seconds"), inp("rpPs", L("напр.: 30", "e.g.: 30"), 5)) + fld("rpPu", L("Темп на", "Pace per"), sel("rpPu", [["km", L("Кілометр", "Kilometre")], ["mi", L("Милю", "Mile")]], "km")) + '</div><div class="ph__hint ph__mt12">' + L("Оберіть, що рахувати, і введіть дві інші величини.", "Choose what to calculate and enter the other two.") + "</div>";
      wireDist(el, maybeCalc, ["rpPm", "rpPs", "rpPu"]); el("rpF").addEventListener("change", () => { refresh1(el); maybeCalc(); }); refresh1(el);
    },
    calc(h) {
      const { el } = h, f = el("rpF").value;
      const d = f === "dist" ? null : readDist(el, 0.1, 1000), t = f === "time" ? null : readTime(el), p = f === "pace" ? null : readPace(el);
      const need = [f === "dist" ? 1 : d, f === "time" ? 1 : t, f === "pace" ? 1 : p];
      if (need.some((v) => v === null)) return { ok: false, incomplete: true };
      for (const v of [d, t, p]) if (v && v.err) return { ok: false, msg: v.err };
      const perMi = el("rpPu").value === "mi", unitK = perMi ? R.KM_MI : 1;
      let pk, T, D, head, sub = "", expr, steps, resText;
      if (f === "time") {
        pk = p.sec / unitK; D = d.km; T = pk * D;
        head = [L("час фінішу", "finish time"), R.fmtLong(T)]; sub = L("Дистанція ", "Distance ") + trim(D) + " " + KM + L(" · темп ", " · pace ") + R.fmtLong(p.sec) + " " + (perMi ? PM : PK); expr = distName(D) + " · " + R.fmtLong(p.sec) + (perMi ? PM : PK);
        steps = [{ t: L("Темп на кілометр", "Pace per kilometre"), l: perMi ? [R.fmtLong(p.sec) + " / " + fnum(R.KM_MI, 6) + " = " + R.fmtLong(pk) + " " + PK] : [R.fmtLong(p.sec) + " " + PK + " = " + fnum(p.sec, 0) + " " + L("с/км", "s/km")] }, { t: L("Час = дистанція × темп", "Time = distance × pace"), l: [fnum(D, 4) + " " + KM + " × " + fnum(pk, 1) + " " + L("с/км", "s/km") + " = " + fnum(T, 0) + " " + L("с", "s"), fnum(T, 0) + " " + L("с", "s") + " = " + R.fmtLong(T)] }];
        resText = distName(D) + L(" за темпом ", " at ") + R.fmtLong(p.sec) + (perMi ? PM : PK) + " → " + R.fmtLong(T);
      } else if (f === "pace") {
        D = d.km; T = t.sec; pk = T / D;
        head = [(perMi ? L("темп на милю", "pace per mile") : L("темп на кілометр", "pace per kilometre")), R.fmtLong(pk * unitK)]; sub = L("Дистанція ", "Distance ") + trim(D) + " " + KM + L(" · час ", " · time ") + R.fmtLong(T); expr = distName(D) + " · " + R.fmtLong(T);
        steps = [{ t: L("Темп = час / дистанція", "Pace = time / distance"), l: [fnum(T, 0) + " " + L("с", "s") + " / " + fnum(D, 4) + " " + KM + " = " + fnum(pk, 2) + " " + L("с/км", "s/km"), R.fmtLong(pk) + " " + PK + (perMi ? " × " + fnum(R.KM_MI, 6) + " = " + R.fmtLong(pk * R.KM_MI) + " " + PM : "")] }];
        resText = distName(D) + " " + L("за ", "in ") + R.fmtLong(T) + " → " + L("темп ", "pace ") + R.fmtLong(pk * unitK) + (perMi ? PM : PK);
      } else {
        pk = p.sec / unitK; T = t.sec; D = T / pk;
        head = [mi(el) ? L("дистанція, милі", "distance, miles") : L("дистанція, км", "distance, km"), fnum(mi(el) ? D / R.KM_MI : D, 2)]; expr = R.fmtLong(T) + " · " + R.fmtLong(p.sec) + (perMi ? PM : PK);
        steps = [{ t: L("Дистанція = час / темп", "Distance = time / pace"), l: [fnum(T, 0) + " " + L("с", "s") + " / " + fnum(pk, 2) + " " + L("с/км", "s/km") + " = " + fnum(D, 3) + " " + KM, fnum(D, 3) + " " + KM + " / " + fnum(R.KM_MI, 6) + " = " + fnum(D / R.KM_MI, 3) + " " + MI] }];
        resText = R.fmtLong(T) + L(" за темпом ", " at ") + R.fmtLong(p.sec) + (perMi ? PM : PK) + " → " + fnum(D, 2) + " " + KM;
      }
      const tiles = speedTiles(pk); if (f === "dist") tiles.unshift({ k: mi(el) ? L("Дистанція, км", "Distance, km") : L("Дистанція, милі", "Distance, miles"), v: mi(el) ? fnum(D, 2) : fnum(D / R.KM_MI, 2) });
      if (f === "time") tiles.unshift({ k: L("Дистанція", "Distance"), v: fnum(D, 3) + " " + KM });
            return { ok: true, expr, head, subRaw: true, headSub: sub, tiles, extraHtml: '<div class="ph__sub">' + L("Час на стандартних дистанціях за цим темпом", "Time over standard distances at this pace") + "</div>" + paceTable(pk, f === "dist" ? null : D) + warnHtml(paceWarn(pk)), note: NOTE, steps, resText };
    },
    reset(h) { const { el } = h; ["rpD", "rpTh", "rpTm", "rpTs", "rpPm", "rpPs"].forEach((id) => setP(el, id, "")); setP(el, "rpF", "time"); setP(el, "rpDu", "km"); setP(el, "rpPu", "km"); refresh1(el); },
    fill(h) { const { el } = h; setP(el, "rpF", "time"); setP(el, "rpDu", "km"); setP(el, "rpD", "10"); ["rpTh", "rpTm", "rpTs"].forEach((id) => setP(el, id, "")); setP(el, "rpPm", "5"); setP(el, "rpPs", "30"); setP(el, "rpPu", "km"); refresh1(el); },
    share(p, h) { const { el } = h; shareMap(MAP1, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP1, qs, el); refresh1(el); }
  };

  // ----- спліти -----
  const MAP2 = [["un", "rpDu"], ["ds", "rpD"], ["th", "rpTh"], ["tm", "rpTm"], ["ts", "rpTs"], ["su", "rpSu"], ["ng", "rpNg"]];
  const mode2 = {
    key: "splits", type: "custom", req: ({ el }) => ["rpD", "rpTm"], nameUk: "Спліти", nameEn: "Splits",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + distF() + timeF() + fld("rpSu", L("Спліт кожні", "Split every"), sel("rpSu", [["km", L("Кілометр", "Kilometre")], ["mi", L("Милю", "Mile")]], "km")) + fld("rpNg", L("Друга половина швидша на, %", "Second half faster by, %"), inp("rpNg", "0", 4)) + '</div><div class="ph__hint ph__mt12">' + L("Введіть дистанцію й цільовий час — калькулятор розпише час на кожному кілометрі чи милі. Нуль у «швидша на» означає рівний темп, значення більше нуля — негативний спліт (друга половина швидша за першу).", "Enter a distance and a target time and the calculator lays out the time for every kilometre or mile. Zero in “faster by” means even pace, above zero is a negative split (the second half faster than the first).") + "</div>";
      wireDist(el, maybeCalc, ["rpSu", "rpNg"]); refreshD(el);
    },
    calc(h) {
      const { el } = h, d = readDist(el, 0.5, 250), t = readTime(el);
      if (d === null || t === null) return { ok: false, incomplete: true };
      if (d.err) return { ok: false, msg: d.err }; if (t.err) return { ok: false, msg: t.err };
      const ngs = el("rpNg").value.trim(), ng = ngs === "" ? 0 : num(ngs);
      if (ng === null || ng > 10) return { ok: false, msg: L("Негативний спліт — від 0 до 10 %.", "Negative split — from 0 to 10%.") };
      const perMi = el("rpSu").value === "mi", u = perMi ? R.KM_MI : 1, pk = t.sec / d.km, s = R.splits(d.km, t.sec, ng, u), unitL = perMi ? MI : KM, per = perMi ? PM : PK;
      const rows = s.rows.map((r) => { const full = Math.abs(r.len - u) < 1e-9; return { cells: [{ t: full ? String(r.i) + " " + unitL : L("Останні ", "Last ") + fnum(r.len / u, 2) + " " + unitL, cls: "is-first" }, { t: R.fmtLong(r.pace), cls: "chip" }, R.fmtLong(r.segT), R.fmtLong(r.cum)] }; });
      const tiles = [{ k: L("Середній темп", "Average pace"), v: R.fmtLong(pk * u) + " " + per }, { k: L("Темп першої половини", "First-half pace"), v: R.fmtLong(s.p1 * u) + " " + per }, { k: L("Темп другої половини", "Second-half pace"), v: R.fmtLong(s.p2 * u) + " " + per }, { k: L("Час на половині", "Time at halfway"), v: R.fmtLong(s.halfT) }];
      const steps = [{ t: L("Середній темп", "Average pace"), l: [R.fmtLong(t.sec) + " / " + fnum(d.km, 3) + " " + KM + " = " + R.fmtLong(pk) + " " + PK] }].concat(ng > 0 ? [{ t: L("Негативний спліт " + fnum(ng, 1) + " %", "Negative split " + fnum(ng, 1) + "%"), l: [L("Темп першої половини = 2·T / (D·(1 + k)), k = 1 − " + fnum(ng / 100, 3), "First-half pace = 2·T / (D·(1 + k)), k = 1 − " + fnum(ng / 100, 3)), R.fmtLong(s.p1) + " " + PK + L(" → друга половина ", " → second half ") + R.fmtLong(s.p2) + " " + PK] }] : []);
      return { ok: true, expr: distName(d.km) + " · " + R.fmtLong(t.sec) + (ng > 0 ? " · −" + fnum(ng, 1) + " %" : ""), head: [L("середній темп", "average pace") + (perMi ? L(" на милю", " per mile") : L(" на кілометр", " per kilometre")), R.fmtLong(pk * u)], subRaw: true, headSub: L("Час ", "Time ") + R.fmtLong(t.sec) + L(" на ", " over ") + trim(d.km) + " " + KM, tiles, extraHtml: '<div class="ph__sub">' + L("Спліти по ", "Splits by ") + unitL + "</div>" + UI.list([L("Відрізок", "Segment"), L("Темп", "Pace"), L("Час відрізка", "Segment time"), L("Загальний час", "Total time")], rows, { w: "minmax(0, 1fr) 115px 125px 150px" }) + warnHtml(paceWarn(pk)), note: NOTE, steps, resText: distName(d.km) + " " + L("за ", "in ") + R.fmtLong(t.sec) + ": " + L("середній темп ", "average pace ") + R.fmtLong(pk * u) + per + (ng > 0 ? ", " + L("негативний спліт ", "negative split ") + fnum(ng, 1) + " %" : "") };
    },
    reset(h) { const { el } = h; ["rpD", "rpTh", "rpTm", "rpTs", "rpNg"].forEach((id) => setP(el, id, "")); setP(el, "rpDu", "km"); setP(el, "rpSu", "km"); refreshD(el); },
    fill(h) { const { el } = h; setP(el, "rpDu", "km"); setP(el, "rpD", L("21,0975", "21.0975")); setP(el, "rpTh", "1"); setP(el, "rpTm", "45"); setP(el, "rpTs", "0"); setP(el, "rpSu", "km"); setP(el, "rpNg", "2"); refreshD(el); },
    share(p, h) { const { el } = h; if (!el("rpD").value.trim()) return; shareMap(MAP2, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP2, qs, el); refreshD(el); }
  };

  // ----- прогноз Рігеля -----
  const MAP3 = [["un", "rpDu"], ["ds", "rpD"], ["th", "rpTh"], ["tm", "rpTm"], ["ts", "rpTs"], ["ex", "rpEx"], ["tg", "rpTg"], ["td", "rpTd"]];
  const mode3 = {
    key: "predict", type: "custom", req: ({ el }) => ["rpD", "rpTm"], nameUk: "Прогноз на іншу дистанцію", nameEn: "Race predictor",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + distF() + timeF() + fld("rpTg", L("Прогноз на", "Predict for"), sel("rpTg", R.DISTS.map((d) => [d.id, L(d.uk, d.en)]), "full")) + fld("rpTd", L("Або своя дистанція (в одиницях вище)", "Or your own distance (in the unit above)"), inp("rpTd", L("необов'язково", "optional"))) + fld("rpEx", L("Показник Рігеля", "Riegel exponent"), inp("rpEx", "1,06", 5)) + '</div><div class="ph__hint ph__mt12">' + L("Введіть недавній результат — калькулятор оцінить час на інших дистанціях за формулою Рігеля T₂ = T₁ · (D₂ / D₁)^k. Класичний показник k = 1,06; його можна змінити.", "Enter a recent result and the calculator estimates your time over other distances with the Riegel formula T₂ = T₁ · (D₂ / D₁)^k. The classic exponent is k = 1.06; you can change it.") + "</div>";
      wireDist(el, maybeCalc, ["rpTg", "rpTd", "rpEx"]); setP(el, "rpEx", L("1,06", "1.06")); refreshD(el);
    },
    calc(h) {
      const { el } = h, d = readDist(el, 0.8, 100), t = readTime(el);
      if (d === null || t === null) return { ok: false, incomplete: true };
      if (d.err) return { ok: false, msg: d.err }; if (t.err) return { ok: false, msg: t.err };
      const k = num(el("rpEx").value);
      if (k === null || k < 1 || k > 1.3) return { ok: false, msg: L("Показник Рігеля — від 1,00 до 1,30.", "Riegel exponent — from 1.00 to 1.30.") };
      let tg = R.findDist(el("rpTg").value).km; const tds = el("rpTd").value.trim();
      if (tds) { const v = num(tds); const km = v === null ? null : mi(el) ? v * R.KM_MI : v; if (km === null || km < 0.8 || km > 100) return { ok: false, msg: L("Своя дистанція — від 0,8 до 100 км.", "Your own distance — from 0.8 to 100 km.") }; tg = km; }
      const f = (km) => R.riegel(t.sec, d.km, km, k), T2 = f(tg), warns = [], ratio = tg / d.km;
      if (ratio > 4) warns.push(L("Дистанція прогнозу більш ніж у 4 рази довша за вашу: такий прогноз зазвичай оптимістичний, бо потребує спеціальної витривалості й підготовки (особливо марафон за коротким результатом).", "The predicted distance is more than 4 times yours: such a prediction is usually optimistic, as it needs specific endurance and training (especially a marathon from a short result)."));
      if (d.km < 1.5 && tg > 10) warns.push(L("Результат на дуже короткій дистанції погано прогнозує довгі забіги.", "A very short result predicts long races poorly."));
      const steps = [{ t: L("Формула Рігеля", "Riegel formula"), l: ["T₂ = T₁ · (D₂ / D₁)^" + fnum(k, 3), R.fmtLong(t.sec) + " · (" + fnum(tg, 3) + " / " + fnum(d.km, 3) + ")^" + fnum(k, 3) + " = " + R.fmtLong(T2)] }];
      return { ok: true, expr: distName(d.km) + " " + R.fmtLong(t.sec) + " → " + distName(tg), head: [L("прогноз на ", "prediction for ") + distName(tg).toLowerCase(), R.fmtLong(T2)], subRaw: true, headSub: L("Темп ", "Pace ") + R.fmtLong(T2 / tg) + " " + PK + " · " + R.fmtLong((T2 / tg) * R.KM_MI) + " " + PM, tiles: speedTiles(T2 / tg), extraHtml: '<div class="ph__sub">' + L("Прогноз для стандартних дистанцій", "Predictions for standard distances") + "</div>" + raceTable(f) + warnHtml(warns), note: L("Формула Рігеля — емпірична оцінка: вона припускає однакову підготовку до обох дистанцій. ", "The Riegel formula is an empirical estimate: it assumes the same preparation for both distances. ") + NOTE, steps, resText: distName(d.km) + " " + R.fmtLong(t.sec) + " → " + distName(tg) + " ≈ " + R.fmtLong(T2) + " (k = " + fnum(k, 2) + ")" };
    },
    reset(h) { const { el } = h; ["rpD", "rpTh", "rpTm", "rpTs", "rpTd"].forEach((id) => setP(el, id, "")); setP(el, "rpDu", "km"); setP(el, "rpTg", "full"); setP(el, "rpEx", L("1,06", "1.06")); refreshD(el); },
    fill(h) { const { el } = h; setP(el, "rpDu", "km"); setP(el, "rpD", "5"); setP(el, "rpTh", "0"); setP(el, "rpTm", "25"); setP(el, "rpTs", "0"); setP(el, "rpTg", "full"); setP(el, "rpTd", ""); setP(el, "rpEx", L("1,06", "1.06")); refreshD(el); },
    share(p, h) { const { el } = h; if (!el("rpD").value.trim()) return; shareMap(MAP3, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP3, qs, el); refreshD(el); }
  };

  // ----- VDOT і тренувальні темпи -----
  const MAP4 = [["un", "rpDu"], ["ds", "rpD"], ["th", "rpTh"], ["tm", "rpTm"], ["ts", "rpTs"]];
  const mode4 = {
    key: "vdot", type: "custom", req: ({ el }) => ["rpD", "rpTm"], nameUk: "Темпи тренувань (VDOT)", nameEn: "Training paces (VDOT)",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + distF() + timeF() + '</div><div class="ph__hint ph__mt12">' + L("Введіть недавній результат забігу чи контрольного бігу з максимальними зусиллями — калькулятор визначить ваш VDOT (за Джеком Деніелсом) і розрахує тренувальні темпи: легкий, марафонський, пороговий, інтервальний, повторювальний.", "Enter a recent race or all-out time trial and the calculator finds your VDOT (after Jack Daniels) and computes training paces: easy, marathon, threshold, interval, repetition.") + "</div>";
      wireDist(el, maybeCalc); refreshD(el);
    },
    calc(h) {
      const { el } = h, d = readDist(el, 0.8, 100), t = readTime(el);
      if (d === null || t === null) return { ok: false, incomplete: true };
      if (d.err) return { ok: false, msg: d.err }; if (t.err) return { ok: false, msg: t.err };
      const vd = R.vdot(d.km, t.sec);
      if (!(vd >= 15 && vd <= 90)) return { ok: false, msg: L("Результат поза межами формули: перевірте дистанцію й час.", "The result is outside the range of the formula: check the distance and time.") };
      const z = R.zones(vd), warns = paceWarn(t.sec / d.km);
      if (t.sec < 180 || t.sec > 3 * 3600 + 30 * 60) warns.push(L("Формула Деніелса зазвичай точніша для результатів приблизно від 3 хвилин до 3,5 години; поза цим діапазоном VDOT менш надійний.", "The Daniels formula is usually more accurate for results from about 3 minutes to 3.5 hours; outside this range VDOT is less reliable."));
      const row = (name, pct, a, b) => ({ cells: [{ t: name, cls: "is-first" }, pct, { t: b ? R.fmtLong(a) + " – " + R.fmtLong(b) : R.fmtLong(a), cls: "chip" }, b ? R.fmtLong(a * R.KM_MI) + " – " + R.fmtLong(b * R.KM_MI) : R.fmtLong(a * R.KM_MI)] });
      const zrows = [row(L("Легкий (E)", "Easy (E)"), "59–74 %", z.e.slow, z.e.fast), row(L("Марафонський (M)", "Marathon (M)"), L("темп марафону", "marathon pace"), z.m.pace), row(L("Пороговий (T)", "Threshold (T)"), "≈ 88 %", z.t.pace), row(L("Інтервальний (I)", "Interval (I)"), "≈ 98 %", z.i.pace), row(L("Повторювальний (R)", "Repetition (R)"), "≈ 105 %", z.r.pace)];
      const steps = [{ t: L("Швидкість і кисневі витрати", "Speed and oxygen cost"), l: [L("v = ", "v = ") + fnum((d.km * 1000) / (t.sec / 60), 1) + " " + L("м/хв", "m/min"), "VO₂ = −4,60 + 0,182258·v + 0,000104·v²".replace(/,/g, SEP) + " = " + fnum(R.vo2((d.km * 1000) / (t.sec / 60)), 2)] }, { t: L("Частка VO₂max за тривалістю", "VO₂max fraction by duration"), l: [L("t = ", "t = ") + fnum(t.sec / 60, 2) + " " + L("хв", "min"), "% = 0,8 + 0,1894393·e^(−0,012778·t) + 0,2989558·e^(−0,1932605·t)".replace(/,/g, SEP) + " = " + fnum(R.pctMax(t.sec / 60) * 100, 1) + " %"] }, { t: "VDOT", l: ["VDOT = VO₂ / % = " + fnum(vd, 1)] }];
      return { ok: true, expr: distName(d.km) + " · " + R.fmtLong(t.sec), head: ["VDOT", fnum(vd, 1)], subRaw: true, headSub: L("Марафонський темп ", "Marathon pace ") + R.fmtLong(z.m.pace) + " " + PK, tiles: [{ k: L("Легкий темп, /км", "Easy pace, /km"), v: R.fmtLong(z.e.slow) + " – " + R.fmtLong(z.e.fast) }, { k: L("Пороговий, /км", "Threshold, /km"), v: R.fmtLong(z.t.pace) }, { k: L("Інтервальний, /км", "Interval, /km"), v: R.fmtLong(z.i.pace) }, { k: L("Повторювальний, /км", "Repetition, /km"), v: R.fmtLong(z.r.pace) }], extraHtml: '<div class="ph__sub">' + L("Тренувальні темпи", "Training paces") + "</div>" + UI.list([L("Зона", "Zone"), "% VO₂max", L("Темп /км", "Pace /km"), L("Темп /милю", "Pace /mi")], zrows, { w: "minmax(0, 1.1fr) 120px 190px 190px" }) + '<div class="ph__sub">' + L("Рівноцінні результати за цим VDOT", "Equivalent results at this VDOT") + "</div>" + raceTable((km) => R.eqTime(km, vd)) + warnHtml(warns), note: L("Темпи за формулою Деніелса й відсотками VO₂max — орієнтир, який може відрізнятися від офіційних таблиць на кілька секунд. ", "Paces by the Daniels formula and VO₂max percentages are a guide that can differ from the official tables by a few seconds. ") + NOTE, steps, resText: "VDOT " + fnum(vd, 1) + " (" + distName(d.km) + " " + R.fmtLong(t.sec) + "): E " + R.fmtLong(z.e.slow) + "–" + R.fmtLong(z.e.fast) + ", M " + R.fmtLong(z.m.pace) + ", T " + R.fmtLong(z.t.pace) + ", I " + R.fmtLong(z.i.pace) + ", R " + R.fmtLong(z.r.pace) + " " + PK };
    },
    reset(h) { const { el } = h; ["rpD", "rpTh", "rpTm", "rpTs"].forEach((id) => setP(el, id, "")); setP(el, "rpDu", "km"); refreshD(el); },
    fill(h) { const { el } = h; setP(el, "rpDu", "km"); setP(el, "rpD", "5"); setP(el, "rpTh", "0"); setP(el, "rpTm", "20"); setP(el, "rpTs", "0"); refreshD(el); },
    share(p, h) { const { el } = h; if (!el("rpD").value.trim()) return; shareMap(MAP4, p, el); },
    apply(qs, h) { const { el } = h; applyMap(MAP4, qs, el); refreshD(el); }
  };
  return { modes: [mode1, mode2, mode3, mode4], exactNote: false };
});
