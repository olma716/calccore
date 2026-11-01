/* astro-kepler.js — дані калькулятора «Закони Кеплера й орбіти»: третій закон, еліптична орбіта (q, Q, b, швидкості), орбіта супутника */
PhysCalc.start(({ L, u, X, UN, DErr }) => {
  const A = window.Astro;
  const F = (out, ins, txt, f, o) => ({ out, ins: ins ? ins.split(",") : [], txt, f, ...(o || {}) });
  const V = (id, sym, uk, en, si, units, ph, sign, def) => ({ id, sym, uk, en, si, units, ph, sign: sign || "pos", def });
  // зручний вигляд результату: точний лише якщо радикал або дріб невеликі, інакше наближений
  const soft = (v) => (v.apx ? v : v.m !== 1n && (v.m > 1000n || v.c.d > 1000n) ? X.apx(v) : v);
  const U = {
    au: [u("а.о.", "AU", 1), u("км", "km", "1/149597870.7"), u("млн км", "million km", "1/149.5978707")],
    yr: [u("років", "years", 1), u("діб", "days", "1/365.25"), u("місяців", "months", "1/12")],
    ms: [u("M☉", "M☉", 1)],
    kms: [u("км/с", "km/s", 1)]
  };
  const ONE = X.k(1), TWO = X.k(2);
  const GMAU = X.div(X.k(A.C.GMsun), X.k(A.C.AU));
  const sq = (v) => X.sq(v), cube = (v) => X.mul(X.mul(v, v), v);
  const ecc = (e) => { if (e.c.n >= e.c.d) throw new DErr(L("ексцентриситет еліпса має бути меншим за 1", "the eccentricity of an ellipse must be less than 1")); return e; };

  // ----- третій закон Кеплера -----
  const planetChips = A.ORBITS.slice(0, 8).map((o) => ({ uk: o.uk, en: o.en, find: "T", vals: { a: o.a } }));
  const t3 = {
    key: "t3", type: "chain", nameUk: "Третій закон Кеплера", nameEn: "Kepler's third law", find: "T",
    vars: [V("T", "T", "Період обертання", "Orbital period", ["років", "years"], U.yr, ""), V("a", "a", "Велика піввісь орбіти", "Semi-major axis", ["а.о.", "AU"], U.au, "напр.: 1,524"), V("M", "M", "Маса центрального тіла", "Mass of the central body", ["M☉", "M☉"], U.ms, "", "pos", "1")],
    formulas: [
      F("T", "a,M", "T = √(a³ / M)", (a) => soft(X.sqrt(X.div(cube(a.a), a.M))), { note: ["Третій закон Кеплера: квадрати періодів відносяться як куби великих півосей. Для Сонця T² = a³, якщо T у роках, а a в астрономічних одиницях.", "Kepler's third law: the squares of the periods are in the ratio of the cubes of the semi-major axes. For the Sun T² = a³ when T is in years and a in astronomical units."] }),
      F("a", "T,M", "a = ∛(T² · M)", (a) => soft(X.cbrt(X.mul(sq(a.T), a.M)))), F("M", "a,T", "M = a³ / T²", (a) => X.div(cube(a.a), sq(a.T)))
    ],
    chips: planetChips,
    hint: ["Період T у роках, велика піввісь a в астрономічних одиницях, маса центрального тіла M в масах Сонця. Для планет Сонячної системи M = 1 і T² = a³. Кнопки підставляють велику піввісь планет.", "The period T is in years, the semi-major axis a in astronomical units, and the mass M of the central body in solar masses. For the planets of the Solar System M = 1 and T² = a³. The buttons fill in the semi-major axes of the planets."],
    example: { find: "T", vals: { a: "1.524" } }
  };

  // ----- еліптична орбіта -----
  const ell = {
    key: "ell", type: "chain", nameUk: "Еліптична орбіта", nameEn: "Elliptical orbit", find: "q",
    vars: [V("a", "a", "Велика піввісь", "Semi-major axis", ["а.о.", "AU"], U.au, "напр.: 17,8"), V("e", "e", "Ексцентриситет", "Eccentricity", ["(число)", "(number)"], UN.one, "напр.: 0,967", "nn"), V("q", "q", "Перигелій (найближча точка)", "Perihelion (closest point)", ["а.о.", "AU"], U.au, ""), V("Q", "Q", "Афелій (найдальша точка)", "Aphelion (farthest point)", ["а.о.", "AU"], U.au, ""), V("b", "b", "Мала піввісь", "Semi-minor axis", ["а.о.", "AU"], U.au, ""), V("M", "M", "Маса Сонця", "Mass of the Sun", ["M☉", "M☉"], U.ms, "", "pos", "1"), V("T", "T", "Період", "Period", ["років", "years"], U.yr, ""), V("vp", "vₚ", "Швидкість у перигелії", "Speed at perihelion", ["км/с", "km/s"], U.kms, ""), V("va", "vₐ", "Швидкість в афелії", "Speed at aphelion", ["км/с", "km/s"], U.kms, "")],
    formulas: [
      F("q", "a,e", "q = a · (1 − e)", (a) => X.mul(a.a, X.sub(ONE, ecc(a.e))), { note: ["Перигелій — найближча до Сонця точка орбіти.", "Perihelion is the point of the orbit closest to the Sun."] }), F("Q", "a,e", "Q = a · (1 + e)", (a) => X.mul(a.a, X.add(ONE, ecc(a.e))), { note: ["Афелій — найдальша від Сонця точка орбіти.", "Aphelion is the point of the orbit farthest from the Sun."] }),
      F("a", "q,Q", "a = (q + Q) / 2", (a) => X.div(X.add(a.q, a.Q), TWO)), F("e", "q,Q", "e = (Q − q) / (Q + q)", (a) => X.div(X.sub(a.Q, a.q), X.add(a.Q, a.q))),
      F("a", "q,e", "a = q / (1 − e)", (a) => X.div(a.q, X.sub(ONE, a.e))), F("a", "Q,e", "a = Q / (1 + e)", (a) => X.div(a.Q, X.add(ONE, a.e))),
      F("e", "a,q", "e = 1 − q / a", (a) => X.sub(ONE, X.div(a.q, a.a))), F("e", "a,Q", "e = Q / a − 1", (a) => X.sub(X.div(a.Q, a.a), ONE)),
      F("b", "a,e", "b = a · √(1 − e²)", (a) => soft(X.mul(a.a, X.sqrt(X.sub(ONE, sq(a.e)))))), F("a", "b,e", "a = b / √(1 − e²)", (a) => soft(X.div(a.b, X.sqrt(X.sub(ONE, sq(a.e)))))),
      F("T", "a,M", "T = √(a³ / M)", (a) => soft(X.sqrt(X.div(cube(a.a), a.M)))),
      F("vp", "q,a,M", "vₚ = √(μ · M · (2/q − 1/a))", (a) => X.apx(X.div(X.sqrt(X.mul(X.mul(GMAU, a.M), X.sub(X.div(TWO, a.q), X.div(ONE, a.a)))), X.k(1000))), { note: ["Швидкість із рівняння vis-viva: v² = GM·(2/r − 1/a); тут μ = GM☉ / (1 а.о.) ≈ 8,8713·10⁸ м²/с², швидкість у км/с. У перигелії r = q, в афелії r = Q. За другим законом Кеплера vₚ · q = vₐ · Q.", "Speed from the vis-viva equation: v² = GM·(2/r − 1/a); here μ = GM☉ / (1 AU) ≈ 8.8713·10⁸ m²/s², the speed is in km/s. At perihelion r = q, at aphelion r = Q. By Kepler's second law vₚ · q = vₐ · Q."] }),
      F("va", "Q,a,M", "vₐ = √(μ · M · (2/Q − 1/a))", (a) => X.apx(X.div(X.sqrt(X.mul(X.mul(GMAU, a.M), X.sub(X.div(TWO, a.Q), X.div(ONE, a.a)))), X.k(1000))))
    ],
    chips: [{ uk: "Комета Галлея", en: "Halley's comet", find: "q", vals: { a: "17.834", e: "0.967" } }, { uk: "Марс", en: "Mars", find: "q", vals: { a: "1.524", e: "0.0934" } }, { uk: "Меркурій", en: "Mercury", find: "q", vals: { a: "0.387", e: "0.2056" } }, { uk: "Плутон", en: "Pluto", find: "q", vals: { a: "39.48", e: "0.2488" } }],
    hint: ["Еліпс задають великою піввіссю a та ексцентриситетом e, або двома крайніми точками q і Q. Швидкості рахуються для орбіти навколо Сонця, масу центрального тіла можна змінити.", "An ellipse is given by the semi-major axis a and the eccentricity e, or by the two extreme points q and Q. The speeds are for an orbit around the Sun; the mass of the central body can be changed."],
    example: { find: "q", vals: { a: "17.834", e: "0.967" } }
  };

  // ----- орбіта супутника -----
  const BODY_USE = A.BODIES.filter((b) => b.id !== "pluto");
  const TU = [["хв", "min", 60], ["год", "h", 3600], ["діб", "days", 86400], ["років", "years", 31557600]];
  const sat = {
    key: "sat", type: "custom", nameUk: "Орбіта супутника", nameEn: "Satellite orbit",
    build(body, x, h) {
      const { el, esc, maybeCalc } = h;
      const bodyOpts = BODY_USE.map((b) => '<option value="' + b.id + '"' + (b.id === "earth" ? " selected" : "") + ">" + esc(b.name) + "</option>").join("");
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="kpBody">' + L("Центральне тіло", "Central body") + '</label><select class="ph__unit ph__unit--wide" id="kpBody">' + bodyOpts + '</select></div><div class="ph__var"><label class="ph__label" for="kpH">' + L("Висота над поверхнею, км", "Altitude above the surface, km") + '</label><input class="ph__input" id="kpH" type="text" inputmode="text" autocomplete="off" maxlength="30" placeholder="' + L("напр.: 420", "e.g.: 420") + '"></div><div class="ph__var"><label class="ph__label" for="kpT">' + L("або період обертання", "or the orbital period") + '</label><div class="ph__inl"><input class="ph__input" id="kpT" type="text" inputmode="text" autocomplete="off" maxlength="30" placeholder="' + L("напр.: 23,934", "e.g.: 23.934") + '"><select class="ph__unit" id="kpTu" aria-label="' + L("Одиниця", "Unit") + '">' + TU.map((t, i) => '<option value="' + i + '"' + (i === 1 ? " selected" : "") + ">" + L(t[0], t[1]) + "</option>").join("") + '</select></div></div></div><div class="ph__fnActions" id="kpChips">' +
        [["МКС (420 км)", "ISS (420 km)", "earth", "420", ""], ["GPS (20 200 км)", "GPS (20,200 km)", "earth", "20200", ""], ["Геостаціонарна", "Geostationary", "earth", "", "23.9345"], ["Місяць (384 400 км)", "Moon (384,400 km)", "earth", "378029", ""]].map((c, i) => '<button type="button" class="ph__mini" data-i="' + i + '">' + esc(L(c[0], c[1])) + "</button>").join("") + '</div><div class="ph__hint ph__mt12">' + L("Заповніть одне з двох: висоту над поверхнею або період. Орбіта кругова, маса супутника мала порівняно з центральним тілом. Дані тіл (маса, радіус) — із довідника.", "Fill in one of the two: the altitude above the surface or the period. The orbit is circular and the mass of the satellite is small compared with the central body. The data of the bodies (mass, radius) come from a reference table.") + "</div>";
      const CH = [["earth", "420", ""], ["earth", "20200", ""], ["earth", "", "23.9345"], ["earth", "378029", ""]];
      el("kpChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (!b) return; const c = CH[Number(b.dataset.i)]; el("kpBody").value = c[0]; el("kpH").value = c[1]; el("kpT").value = c[2]; el("kpTu").value = "1"; h.calc(true); });
      ["kpBody", "kpTu"].forEach((id) => el(id).addEventListener("change", maybeCalc));
      ["kpH", "kpT"].forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } }); });
    },
    calc(h) {
      const { el, ND, vstr, parseNum, decNum } = h, nd = ND(), b = A.body(el("kpBody").value), VR = X.VR;
      const hr = parseNum(el("kpH").value), tr = parseNum(el("kpT").value);
      if (hr.empty && tr.empty) return { ok: false, incomplete: true };
      if (!hr.empty && !tr.empty) return { ok: false, msg: L("Заповніть лише одне поле: висоту або період.", "Fill in only one field: the altitude or the period.") };
      if (hr.err || tr.err) return { ok: false, msg: L("Введіть число (наприклад, 420 чи 23,934).", "Enter a number (for example 420 or 23.934).") };
      const S = (v, f, br) => vstr(v, f, nd, br !== false), km = A.dec("1000"), pi = X.pi();
      const GM = X.apx(X.mul(X.k(A.C.G), VR(b.Mq))), R = VR(A.q(b.Rq.n * 1000n, b.Rq.d));
      let r, hh;
      const steps = [];
      steps.push({ t: L("Параметри тіла «" + b.name + "»", "Parameters of the body “" + b.name + "”"), l: ["M = " + decNum(b.Mq, nd) + " " + L("кг", "kg"), "R = " + b.R + " " + L("км", "km"), "GM = G · M = " + S(GM, null) + " " + L("м³/с²", "m³/s²")], note: L("Маса й середній радіус — із довідника NASA.", "Mass and mean radius come from the NASA reference table.") });
      if (!hr.empty) {
        if (hr.v.n < 0n) return { ok: false, msg: L("Висота не може бути від'ємною.", "The altitude cannot be negative.") };
        hh = VR(A.q(hr.v.n * 1000n, hr.v.d)); r = X.add(R, hh);
        steps.push({ t: L("Радіус орбіти", "Orbit radius"), l: ["r = R + h = " + S(R, km) + " + " + decNum(hr.v, nd) + " = " + S(r, km) + " " + L("км", "km")] });
      } else {
        if (tr.v.n <= 0n) return { ok: false, msg: L("Період має бути додатним.", "The period must be positive.") };
        const tu = TU[Number(el("kpTu").value) || 0], T = VR(A.q(tr.v.n * BigInt(tu[2]), tr.v.d));
        r = X.cbrt(X.div(X.mul(GM, X.sq(T)), X.mul(X.k(4), X.sq(pi)))); hh = X.sub(r, R);
        steps.push({ t: L("Радіус орбіти за періодом", "Orbit radius from the period"), l: ["r = ∛(GM · T² / 4π²)", "T = " + decNum(tr.v, nd) + " " + L(tu[0], tu[1]) + " = " + S(T, null) + " " + L("с", "s"), "r = " + S(r, km) + " " + L("км", "km"), "h = r − R = " + S(hh, km) + " " + L("км", "km")], note: L("Із третього закону Кеплера: T² = 4π² r³ / (GM).", "From Kepler's third law: T² = 4π² r³ / (GM).") });
        if (hh.c.n < 0n) return { ok: false, msg: L("Така орбіта лежить нижче поверхні тіла: радіус орбіти менший за радіус тіла.", "Such an orbit lies below the surface of the body: the orbit radius is smaller than the body radius.") };
      }
      const v = X.sqrt(X.div(GM, r)), Tp = X.div(X.mul(X.mul(X.k(2), pi), r), v), ve = X.mul(v, X.sqrt(X.k(2))), gr = X.div(GM, X.sq(r));
      steps.push({ t: L("Орбітальна швидкість", "Orbital speed"), l: ["v = √(GM / r) = " + S(v, km) + " " + L("км/с", "km/s")], note: L("Гравітація дає доцентрове прискорення: GM/r² = v²/r.", "Gravity provides the centripetal acceleration: GM/r² = v²/r.") });
      steps.push({ t: L("Період обертання", "Orbital period"), l: ["T = 2πr / v = " + S(Tp, null) + " " + L("с", "s")] });
      steps.push({ t: L("Друга космічна швидкість на цій висоті", "Escape speed at this altitude"), l: ["v₂ = √2 · v = " + S(ve, km) + " " + L("км/с", "km/s"), "g = GM / r² = " + S(gr, null) + " " + L("м/с²", "m/s²")] });
      const Ts = Number(Tp.c.n) / Number(Tp.c.d), best = Ts < 7200 ? [60, L("хв", "min")] : Ts < 172800 ? [3600, L("год", "h")] : Ts < 63115200 ? [86400, L("діб", "days")] : [31557600, L("років", "years")];
      const Tbest = S(Tp, A.dec(String(best[0]))) + " " + best[1];
      return { ok: true, expr: L("Орбіта навколо: ", "Orbit around: ") + b.name, head: ["v", S(v, km) + " " + L("км/с", "km/s")], headSub: "T = " + Tbest, subRaw: true, tiles: [{ k: L("Радіус орбіти r", "Orbit radius r"), v: S(r, km) + " " + L("км", "km") }, { k: L("Висота h", "Altitude h"), v: S(hh, km) + " " + L("км", "km") }, { k: L("Період T", "Period T"), v: Tbest }, { k: L("Друга космічна v₂", "Escape speed v₂"), v: S(ve, km) + " " + L("км/с", "km/s") }, { k: L("Прискорення g", "Acceleration g"), v: S(gr, null) + " " + L("м/с²", "m/s²") }], steps, resText: "v = " + S(v, km) + " " + L("км/с", "km/s") + ",  T = " + Tbest + ",  r = " + S(r, km) + " " + L("км", "km") };
    },
    reset(h) { h.el("kpBody").value = "earth"; h.el("kpH").value = ""; h.el("kpT").value = ""; h.el("kpTu").value = "1"; },
    fill(h) { h.el("kpBody").value = "earth"; h.el("kpH").value = "420"; h.el("kpT").value = ""; h.el("kpTu").value = "1"; },
    share(p, h) { p.set("kb", h.el("kpBody").value); if (h.el("kpH").value.trim()) p.set("kh", h.el("kpH").value.trim()); if (h.el("kpT").value.trim()) { p.set("kt", h.el("kpT").value.trim()); p.set("ktu", h.el("kpTu").value); } },
    apply(qs, h) { if (qs.has("kb") && BODY_USE.some((b) => b.id === qs.get("kb"))) h.el("kpBody").value = qs.get("kb"); if (qs.has("kh")) h.el("kpH").value = qs.get("kh").slice(0, 30); if (qs.has("kt")) { h.el("kpT").value = qs.get("kt").slice(0, 30); const tu = Number(qs.get("ktu")); if (tu >= 0 && tu < TU.length) h.el("kpTu").value = String(tu); } }
  };
  return { modes: [t3, ell, sat] };
});
