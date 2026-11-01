/* phys-motion.js — дані калькулятора «Швидкість, шлях, час»: v = s/t, середня швидкість за кількома ділянками, рівноприскорений рух, вільне падіння, кинуте вертикально вгору */
PhysCalc.start(({ L, UN, X }) => {
  const F = (out, ins, txt, f, o) => ({ out, ins: ins ? ins.split(",") : [], txt, f, ...(o || {}) });
  const V = (id, sym, uk, en, si, units, ph, sign, def) => ({ id, sym, uk, en, si, units, ph, sign: sign || "pos", def });
  const SIm = ["м", "m"], SIs = ["с", "s"], SIv = ["м/с", "m/s"], SIa = ["м/с²", "m/s²"];
  const G = { consts: ["g"] };

  const vst = {
    key: "vst", type: "chain", nameUk: "Швидкість, шлях і час", nameEn: "Speed, distance and time", find: "v",
    vars: [V("v", "v", "Швидкість", "Speed", SIv, UN.vel, "напр.: 5"), V("s", "s", "Шлях", "Distance", SIm, UN.len, "напр.: 100"), V("t", "t", "Час", "Time", SIs, UN.time, "напр.: 20")],
    formulas: [F("v", "s,t", "v = s / t", (a, x) => x.div(a.s, a.t)), F("s", "v,t", "s = v · t", (a, x) => x.mul(a.v, a.t)), F("t", "s,v", "t = s / v", (a, x) => x.div(a.s, a.v))],
    hint: ["Рівномірний рух: заповніть дві величини, калькулятор знайде третю. Для швидкості доступні км/год, миль/год, вузли тощо.", "Uniform motion: fill in two quantities and the calculator finds the third. Speed can be in km/h, mph, knots and so on."],
    example: { find: "v", vals: { s: "150|1", t: "2|2", v: "|1" } }
  };

  const acc = {
    key: "acc", type: "chain", nameUk: "Рівноприскорений рух", nameEn: "Uniformly accelerated motion", find: "s",
    vars: [V("s", "s", "Переміщення", "Displacement", SIm, UN.len, "напр.: 25", "nn"), V("v0", "v₀", "Початкова швидкість", "Initial speed", SIv, UN.vel, "напр.: 0", "nn"), V("v", "v", "Кінцева швидкість", "Final speed", SIv, UN.vel, "напр.: 10", "nn"), V("a", "a", "Прискорення", "Acceleration", SIa, UN.acc, "напр.: 2", "any"), V("t", "t", "Час", "Time", SIs, UN.time, "напр.: 5")],
    formulas: [
      F("v", "v0,a,t", "v = v₀ + a · t", (a, x) => x.add(a.v0, x.mul(a.a, a.t))), F("a", "v0,v,t", "a = (v − v₀) / t", (a, x) => x.div(x.sub(a.v, a.v0), a.t)), F("v0", "v,a,t", "v₀ = v − a · t", (a, x) => x.sub(a.v, x.mul(a.a, a.t))), F("t", "v0,v,a", "t = (v − v₀) / a", (a, x) => x.div(x.sub(a.v, a.v0), a.a)),
      F("s", "v0,t,a", "s = v₀ · t + a · t² / 2", (a, x) => x.add(x.mul(a.v0, a.t), x.div(x.mul(a.a, x.sq(a.t)), x.k(2)))), F("s", "v0,v,t", "s = (v₀ + v) · t / 2", (a, x) => x.div(x.mul(x.add(a.v0, a.v), a.t), x.k(2))),
      F("v0", "s,v,t", "v₀ = 2s / t − v", (a, x) => x.sub(x.div(x.mul(x.k(2), a.s), a.t), a.v)), F("v", "s,v0,t", "v = 2s / t − v₀", (a, x) => x.sub(x.div(x.mul(x.k(2), a.s), a.t), a.v0)), F("t", "s,v0,v", "t = 2s / (v₀ + v)", (a, x) => x.div(x.mul(x.k(2), a.s), x.add(a.v0, a.v))),
      F("a", "s,v0,t", "a = 2(s − v₀ · t) / t²", (a, x) => x.div(x.mul(x.k(2), x.sub(a.s, x.mul(a.v0, a.t))), x.sq(a.t))), F("v0", "s,a,t", "v₀ = (s − a · t² / 2) / t", (a, x) => x.div(x.sub(a.s, x.div(x.mul(a.a, x.sq(a.t)), x.k(2))), a.t)),
      F("v", "v0,a,s", "v = √(v₀² + 2a · s)", (a, x) => x.sqrt(x.add(x.sq(a.v0), x.mul(x.mul(x.k(2), a.a), a.s)))), F("a", "v0,v,s", "a = (v² − v₀²) / (2s)", (a, x) => x.div(x.sub(x.sq(a.v), x.sq(a.v0)), x.mul(x.k(2), a.s))),
      F("s", "v0,v,a", "s = (v² − v₀²) / (2a)", (a, x) => x.div(x.sub(x.sq(a.v), x.sq(a.v0)), x.mul(x.k(2), a.a))), F("v0", "v,a,s", "v₀ = √(v² − 2a · s)", (a, x) => x.sqrt(x.sub(x.sq(a.v), x.mul(x.mul(x.k(2), a.a), a.s)))),
      F("t", "s,v0,a", "t = (−v₀ + √(v₀² + 2a · s)) / a", (a, x) => x.div(x.add(x.neg(a.v0), x.sqrt(x.add(x.sq(a.v0), x.mul(x.mul(x.k(2), a.a), a.s)))), a.a), { note: ["З двох коренів квадратного рівняння береться менший додатний: перший момент, коли тіло проходить шлях s.", "Of the two roots of the quadratic equation the smaller positive one is taken: the first moment the body covers the distance s."] })
    ],
    hint: ["Задайте будь-які три з п'яти величин: s, v₀, v, a, t. Для гальмування прискорення від'ємне.", "Give any three of the five quantities: s, v₀, v, a, t. For braking the acceleration is negative."],
    example: { find: "s", vals: { v0: "0", a: "2", t: "5" } }
  };

  const fall = {
    key: "fall", type: "chain", nameUk: "Вільне падіння", nameEn: "Free fall", find: "t",
    vars: [V("h", "h", "Висота падіння", "Height of the fall", SIm, UN.len, "напр.: 19,6"), V("t", "t", "Час падіння", "Time of the fall", SIs, UN.time, "напр.: 2"), V("v", "v", "Швидкість у кінці", "Final speed", SIv, UN.vel, "напр.: 19,6")],
    formulas: [
      F("h", "t", "h = g · t² / 2", (a, x, c) => x.div(x.mul(c.g, x.sq(a.t)), x.k(2)), G), F("v", "t", "v = g · t", (a, x, c) => x.mul(c.g, a.t), G), F("t", "v", "t = v / g", (a, x, c) => x.div(a.v, c.g), G),
      F("t", "h", "t = √(2h / g)", (a, x, c) => x.sqrt(x.div(x.mul(x.k(2), a.h), c.g)), G), F("v", "h", "v = √(2g · h)", (a, x, c) => x.sqrt(x.mul(x.mul(x.k(2), c.g), a.h)), G), F("h", "v", "h = v² / (2g)", (a, x, c) => x.div(x.sq(a.v), x.mul(x.k(2), c.g)), G)
    ],
    hint: ["Тіло падає без початкової швидкості, опір повітря не враховується. Заповніть одну величину: калькулятор знайде решту. Значення g змінюється в налаштуваннях.", "The body falls from rest and air resistance is ignored. Fill in one quantity and the calculator finds the rest. The value of g is set in the settings."],
    example: { find: "t", vals: { h: "19.6" } }
  };

  const up = {
    key: "up", type: "chain", nameUk: "Кинуте вертикально вгору", nameEn: "Thrown vertically upward", find: "H",
    vars: [V("v0", "v₀", "Початкова швидкість", "Initial speed", SIv, UN.vel, "напр.: 19,6"), V("H", "H", "Максимальна висота", "Maximum height", SIm, UN.len, ""), V("tu", "t↑", "Час підйому", "Time to the top", SIs, UN.time, "напр.: 2"), V("tf", "T", "Час польоту до повернення", "Total flight time", SIs, UN.time, "напр.: 4")],
    formulas: [
      F("H", "v0", "H = v₀² / (2g)", (a, x, c) => x.div(x.sq(a.v0), x.mul(x.k(2), c.g)), G), F("tu", "v0", "t↑ = v₀ / g", (a, x, c) => x.div(a.v0, c.g), G), F("tf", "tu", "T = 2 · t↑", (a, x) => x.mul(x.k(2), a.tu)),
      F("tu", "tf", "t↑ = T / 2", (a, x) => x.div(a.tf, x.k(2))), F("v0", "tu", "v₀ = g · t↑", (a, x, c) => x.mul(c.g, a.tu), G), F("v0", "H", "v₀ = √(2g · H)", (a, x, c) => x.sqrt(x.mul(x.mul(x.k(2), c.g), a.H)), G), F("H", "tu", "H = g · t↑² / 2", (a, x, c) => x.div(x.mul(c.g, x.sq(a.tu)), x.k(2)), G)
    ],
    hint: ["Тіло кинули вгору зі швидкістю v₀ з поверхні: опір повітря не враховується, час підйому дорівнює часу спуску.", "A body is thrown upward from the ground with speed v₀: air resistance is ignored and the time up equals the time down."],
    example: { find: "H", vals: { v0: "19.6" } }
  };

  // ----- середня швидкість -----
  const avg = {
    key: "avg", type: "custom", nameUk: "Середня швидкість", nameEn: "Average speed",
    build(body, x, h) {
      const { el, L, esc, selOpts, maybeCalc } = h;
      const MODES = { st: ["s", "t"], vt: ["v", "t"], sv: ["s", "v"] }, UNS = { s: UN.len, t: UN.time, v: UN.vel }, NAME = { s: L("Шлях s", "Distance s"), t: L("Час t", "Time t"), v: L("Швидкість v", "Speed v") };
      const rowHtml = (i, keep) => {
        const k = keep || { m: "st", a: "", ua: 0, b: "", ub: 0 }, [pa, pb] = MODES[k.m];
        return '<div class="ph__sgm" id="seg_' + i + '"><div class="ph__sgmHead"><b class="ph__sym">' + L("Ділянка ", "Segment ") + (i + 1) + '</b><select class="ph__unit ph__unit--wide" id="segm_' + i + '"><option value="st"' + (k.m === "st" ? " selected" : "") + ">" + L("відомі s і t", "s and t known") + '</option><option value="vt"' + (k.m === "vt" ? " selected" : "") + ">" + L("відомі v і t", "v and t known") + '</option><option value="sv"' + (k.m === "sv" ? " selected" : "") + ">" + L("відомі s і v", "s and v known") + '</option></select></div><div class="ph__vars"><div class="ph__var"><label class="ph__label" for="sega_' + i + '">' + esc(NAME[pa]) + '</label><div class="ph__inl"><input class="ph__input" id="sega_' + i + '" type="text" autocomplete="off" maxlength="40" value="' + esc(k.a) + '"><select class="ph__unit" id="segua_' + i + '">' + selOpts({ units: UNS[pa] }, Number(k.ua)) + '</select></div></div><div class="ph__var"><label class="ph__label" for="segb_' + i + '">' + esc(NAME[pb]) + '</label><div class="ph__inl"><input class="ph__input" id="segb_' + i + '" type="text" autocomplete="off" maxlength="40" value="' + esc(k.b) + '"><select class="ph__unit" id="segub_' + i + '">' + selOpts({ units: UNS[pb] }, Number(k.ub)) + "</select></div></div></div></div>";
      };
      const read = (n) => Array.from({ length: n }, (_, i) => ({ m: el("segm_" + i).value, a: el("sega_" + i).value, ua: el("segua_" + i).value, b: el("segb_" + i).value, ub: el("segub_" + i).value }));
      let n = 2;
      const wire = () => { for (let i = 0; i < n; i++) { ["sega_", "segb_"].forEach((p) => el(p + i).addEventListener("input", maybeCalc)); ["segua_", "segub_"].forEach((p) => el(p + i).addEventListener("change", maybeCalc)); el("segm_" + i).addEventListener("change", () => { const keep = read(n); keep[i] = { m: el("segm_" + i).value, a: "", ua: 0, b: "", ub: 0 }; draw(keep); maybeCalc(); }); } };
      const draw = (keep) => { el("segRows").innerHTML = Array.from({ length: n }, (_, i) => rowHtml(i, keep && keep[i])).join(""); wire(); el("segAdd").disabled = n >= 6; el("segDel").disabled = n <= 2; };
      body.innerHTML = '<div id="segRows"></div><div class="ph__fnActions"><button type="button" class="ph__mini" id="segAdd">' + L("+ Додати ділянку", "+ Add a segment") + '</button><button type="button" class="ph__mini" id="segDel">' + L("− Прибрати", "− Remove") + '</button></div><div class="ph__hint ph__mt12">' + L("Середня швидкість = весь шлях / весь час. Вона не дорівнює середньому арифметичному швидкостей, якщо час на ділянках різний. Кожну ділянку можна задати парою s і t, v і t або s і v.", "Average speed = total distance / total time. It is not the arithmetic mean of the speeds unless the times on the segments are equal. Each segment can be given by s and t, v and t, or s and v.") + "</div>";
      draw(); body._segN = () => n; body._segSet = (nn, keep) => { n = nn; draw(keep); };
      el("segAdd").addEventListener("click", () => { if (n < 6) { const keep = read(n); n++; draw(keep); maybeCalc(); } });
      el("segDel").addEventListener("click", () => { if (n > 2) { const keep = read(n); n--; draw(keep); maybeCalc(); } });
    },
    calc(h) {
      const { el, L, parseNum, vstr, ND, VR, decNum } = h, x = h.X, nd = ND(), body = el("phBody"), n = body._segN();
      const UNS = { s: UN.len, t: UN.time, v: UN.vel }, MODES = { st: ["s", "t"], vt: ["v", "t"], sv: ["s", "v"] };
      const segs = [], errs = [];
      for (let i = 0; i < n; i++) {
        const m = el("segm_" + i).value, [pa, pb] = MODES[m], ra = parseNum(el("sega_" + i).value), rb = parseNum(el("segb_" + i).value);
        if (ra.empty && rb.empty) continue;
        if (ra.empty || rb.empty) { errs.push(L("Ділянка ", "Segment ") + (i + 1) + ": " + L("вкажіть обидві величини", "enter both quantities")); continue; }
        if (ra.err || rb.err) { errs.push(L("Ділянка ", "Segment ") + (i + 1) + ": " + L("некоректне число", "invalid number")); continue; }
        const va = h.qmul(ra.v, UNS[pa][Number(el("segua_" + i).value) || 0].f), vb = h.qmul(rb.v, UNS[pb][Number(el("segub_" + i).value) || 0].f);
        if (va.n <= 0n || vb.n <= 0n) { errs.push(L("Ділянка ", "Segment ") + (i + 1) + ": " + L("значення мають бути додатними", "the values must be positive")); continue; }
        const o = { i, m, [pa]: VR(va), [pb]: VR(vb) };
        if (!o.s) o.s = x.mul(o.v, o.t); if (!o.t) o.t = x.div(o.s, o.v); if (!o.v) o.v = x.div(o.s, o.t);
        segs.push(o);
      }
      if (errs.length) return { ok: false, msg: errs.join("; ") };
      if (segs.length < 2) return { ok: false, incomplete: true };
      const S = (v) => vstr(v, null, nd, true), kmh = h.q(5n, 18n);
      const St = segs.reduce((s, g) => (s ? x.add(s, g.s) : g.s), null), Tt = segs.reduce((s, g) => (s ? x.add(s, g.t) : g.t), null), Va = x.div(St, Tt);
      const steps = [{ t: L("Ділянки в одиницях СІ", "Segments in SI units"), l: segs.map((g) => L("Ділянка ", "Segment ") + (g.i + 1) + ":  s = " + S(g.s) + " " + L("м", "m") + ",  t = " + S(g.t) + " " + L("с", "s") + ",  v = " + S(g.v) + " " + L("м/с", "m/s")), note: L("Якщо ділянка задана парою v і t чи s і v, третя величина знайдена за v = s / t.", "If a segment is given by v and t or by s and v, the third quantity comes from v = s / t.") }];
      steps.push({ t: L("Весь шлях і весь час", "Total distance and total time"), l: ["s = " + segs.map((g) => S(g.s)).join(" + ") + " = " + S(St) + " " + L("м", "m"), "t = " + segs.map((g) => S(g.t)).join(" + ") + " = " + S(Tt) + " " + L("с", "s")] });
      steps.push({ t: L("Середня швидкість", "Average speed"), l: ["v = s / t = " + S(St) + " / " + S(Tt) + " = " + S(Va) + " " + L("м/с", "m/s"), "v = " + vstr(Va, kmh, nd, true) + " " + L("км/год", "km/h")] });
      const mean = segs.reduce((s, g) => x.add(s, g.v), VR(h.R(0)));
      const meanV = x.div(mean, x.k(segs.length));
      steps.push({ t: L("Порівняння із середнім арифметичним", "Comparison with the arithmetic mean"), l: [L("Середнє арифметичне швидкостей = ", "The arithmetic mean of the speeds = ") + S(meanV) + " " + L("м/с", "m/s"), L("Воно ", "It ") + (S(meanV) === S(Va) ? L("збігається", "matches") : L("відрізняється", "differs")) + L(" від середньої швидкості.", " from the average speed.")], note: L("Середня швидкість — це весь шлях, поділений на весь час, а не середнє швидкостей на ділянках.", "The average speed is the total distance divided by the total time, not the mean of the segment speeds.") });
      return { ok: true, expr: L("Середня швидкість за ", "Average speed over ") + segs.length + L(" ділянками", " segments"), head: ["v", vstr(Va, null, nd, false) + " " + L("м/с", "m/s")], headSub: vstr(Va, kmh, nd, false) + " " + L("км/год", "km/h"), tiles: [{ k: L("Весь шлях s", "Total distance s"), v: S(St) + " " + L("м", "m") }, { k: L("Весь час t", "Total time t"), v: S(Tt) + " " + L("с", "s") }, { k: L("Середнє арифметичне", "Arithmetic mean"), v: S(meanV) + " " + L("м/с", "m/s") }], steps, resText: "v = " + S(Va) + " " + L("м/с", "m/s") };
    },
    reset(h) { h.el("phBody")._segSet(2); },
    fill(h) { h.el("phBody")._segSet(2, [{ m: "st", a: "60", ua: "1", b: "1", ub: "2" }, { m: "st", a: "60", ua: "1", b: "2", ub: "2" }]); },
    share(p, h) { const b = h.el("phBody"), n = b._segN(); p.set("sn", n); for (let i = 0; i < n; i++) { p.set("sg" + i, [h.el("segm_" + i).value, h.el("sega_" + i).value, h.el("segua_" + i).value, h.el("segb_" + i).value, h.el("segub_" + i).value].join("~")); } },
    apply(qs, h) { const b = h.el("phBody"), n = Math.min(6, Math.max(2, Number(qs.get("sn")) || 2)), keep = []; for (let i = 0; i < n; i++) { const t = (qs.get("sg" + i) || "st~~0~~0").split("~"); keep.push({ m: ["st", "vt", "sv"].includes(t[0]) ? t[0] : "st", a: (t[1] || "").slice(0, 40), ua: Number(t[2]) || 0, b: (t[3] || "").slice(0, 40), ub: Number(t[4]) || 0 }); } b._segSet(n, keep); }
  };
  return { modes: [vst, avg, acc, fall, up] };
});
