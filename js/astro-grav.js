/* astro-grav.js — дані калькулятора «Гравітація й вага на планетах»: вага тіла на планетах і g, космічні швидкості, густина за масою й радіусом */
PhysCalc.start(({ L, u, X }) => {
  const A = window.Astro, C = A.C;
  const F = (out, ins, txt, f, o) => ({ out, ins: ins ? ins.split(",") : [], txt, f, ...(o || {}) });
  const V = (id, sym, uk, en, si, units, ph, sign, def) => ({ id, sym, uk, en, si, units, ph, sign: sign || "pos", def });
  const G = X.k(C.G), PI = X.pi(), TWO = X.k(2), THREE = X.k(3), FOUR = X.k(4);
  const U = {
    m: [u("кг", "kg", 1), u("M⊕ (Землі)", "M⊕ (Earth)", C.Mearth), u("M☉ (Сонця)", "M☉ (Sun)", C.Msun), u("M Юпітера", "Jupiter masses", "1.8982e27"), u("M Місяця", "Moon masses", "7.346e22")],
    r: [u("м", "m", 1), u("км", "km", 1000), u("R⊕ (Землі)", "R⊕ (Earth)", "6371000"), u("R☉ (Сонця)", "R☉ (Sun)", "695700000"), u("R Юпітера", "Jupiter radii", "69911000"), u("R Місяця", "Moon radii", "1737400")],
    g: [u("м/с²", "m/s²", 1), u("g⊕ (9,80665)", "g⊕ (9.80665)", C.g0)],
    v: [u("м/с", "m/s", 1), u("км/с", "km/s", 1000)],
    rho: [u("кг/м³", "kg/m³", 1), u("г/см³", "g/cm³", 1000)]
  };

  // ----- вага на планетах -----
  const MU = [["kg", "кг", "kg", 1], ["g", "г", "g", "0.001"], ["t", "т", "t", 1000], ["lb", "фунтів", "lb", "0.45359237"]];
  const CH = [["Дитина 30 кг", "Child 30 kg", "30", 0], ["Дорослий 70 кг", "Adult 70 kg", "70", 0], ["Космонавт 100 кг", "Astronaut 100 kg", "100", 0]];
  const weight = {
    key: "weight", type: "custom", nameUk: "Вага на планетах", nameEn: "Weight on the planets",
    build(body, x, h) {
      const { el, esc, maybeCalc } = h;
      const bodies = A.BODIES.filter((b) => b.id !== "earth");
      body.innerHTML = '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="wgM">' + L("Маса тіла", "Mass of the body") + '</label><div class="ph__inl"><input class="ph__input" id="wgM" type="text" inputmode="text" autocomplete="off" maxlength="30" placeholder="' + L("напр.: 70", "e.g.: 70") + '"><select class="ph__unit" id="wgU" aria-label="' + L("Одиниця", "Unit") + '">' + MU.map((m, i) => '<option value="' + i + '">' + L(m[1], m[2]) + "</option>").join("") + '</select></div></div><div class="ph__var"><label class="ph__label" for="wgB">' + L("Де зважуємось", "Where to weigh") + '</label><select class="ph__unit ph__unit--wide" id="wgB">' + bodies.map((b) => '<option value="' + b.id + '"' + (b.id === "mars" ? " selected" : "") + ">" + esc(b.name) + "</option>").join("") + '</select></div></div><div class="ph__fnActions" id="wgChips">' + CH.map((c, i) => '<button type="button" class="ph__mini" data-i="' + i + '">' + esc(L(c[0], c[1])) + "</button>").join("") + '</div><div class="ph__hint ph__mt12">' + L("Маса тіла скрізь однакова, змінюється лише вага P = m · g. «Вага на пружинних вагах» показує, скільки кілограмів зазначили б ваги, відкалібровані на Землі.", "The mass of a body is the same everywhere, only the weight P = m · g changes. “Spring-scale reading” shows how many kilograms a scale calibrated on the Earth would indicate.") + "</div>";
      el("wgChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-i]"); if (!b) return; const c = CH[Number(b.dataset.i)]; el("wgM").value = c[2]; el("wgU").value = String(c[3]); h.calc(true); });
      ["wgU", "wgB"].forEach((id) => el(id).addEventListener("change", maybeCalc));
      el("wgM").addEventListener("input", maybeCalc);
      el("wgM").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
    },
    calc(h) {
      const { el, parseNum, ND, vstr, VR, decNum, esc, qmul, qdiv } = h, nd = ND();
      const r = parseNum(el("wgM").value);
      if (r.empty) return { ok: false, incomplete: true };
      if (r.err || r.v.n <= 0n) return { ok: false, msg: L("Введіть додатне число (наприклад, 70).", "Enter a positive number (for example 70).") };
      const mu = MU[Number(el("wgU").value) || 0], m = qmul(r.v, A.dec(String(mu[3]))), b = A.body(el("wgB").value), earth = A.body("earth");
      const S = (v, br) => vstr(VR(v), null, nd, br !== false), N = (v) => decNum(v, nd);
      const P = (bd) => qmul(m, bd.gq), PE = P(earth), scale = (bd) => qdiv(P(bd), earth.gq);
      const steps = [
        { t: L("Маса в кілограмах", "Mass in kilograms"), l: [N(r.v) + " " + L(mu[1], mu[2]) + " = " + S(m) + " " + L("кг", "kg")], note: mu[0] === "kg" ? "" : L("Вагу рахують із маси в СІ.", "The weight is computed from the mass in SI units.") },
        { t: L("Прискорення вільного падіння на тілі «" + b.name + "»", "Gravitational acceleration on “" + b.name + "”"), l: ["g = " + S(b.gq) + " " + L("м/с²", "m/s²")], note: L("Значення з довідника NASA (на екваторі, для газових гігантів — на рівні 1 бар).", "Values from the NASA reference table (at the equator; for the gas giants at the 1-bar level).") },
        { t: L("Вага P = m · g", "Weight P = m · g"), l: ["P = " + S(m) + " · " + S(b.gq) + " = " + S(P(b)) + " " + L("Н", "N")] },
        { t: L("Показання пружинних ваг", "Spring-scale reading"), l: [S(P(b)) + " / " + S(earth.gq) + " = " + S(scale(b)) + " " + L("кг", "kg")], note: L("Ваги, відкалібровані на Землі, показали б вагу, поділену на 9,80665 м/с².", "A scale calibrated on the Earth would show the weight divided by 9.80665 m/s².") }
      ];
      const rows = A.BODIES.map((bd) => "<tr" + (bd.id === b.id ? ' class="ph__total"' : "") + "><th>" + esc(bd.name) + "</th><td>" + esc(S(bd.gq)) + "</td><td>" + esc(S(P(bd))) + "</td><td>" + esc(S(scale(bd))) + "</td></tr>").join("");
      const table = '<div class="ph__sub">' + L("Вага на всіх тілах", "Weight on every body") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Тіло", "Body") + "</th><th>g, " + L("м/с²", "m/s²") + "</th><th>P, " + L("Н", "N") + "</th><th>" + L("Ваги, кг", "Scale, kg") + "</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
      return { ok: true, expr: L("Вага тіла масою ", "Weight of a body of mass ") + N(r.v) + " " + L(mu[1], mu[2]) + L(" на тілі «", " on “") + b.name + L("»", "”"), head: ["P", S(P(b)) + " " + L("Н", "N")], headSub: L("ваги покажуть ", "a scale shows ") + S(scale(b)) + " " + L("кг", "kg"), subRaw: true, tiles: [{ k: "g", v: S(b.gq) + " " + L("м/с²", "m/s²") }, { k: L("На Землі P", "On the Earth P"), v: S(PE) + " " + L("Н", "N") }, { k: L("У разів порівняно із Землею", "Times the Earth value"), v: S(qdiv(b.gq, earth.gq)) }], extraHtml: table, steps, resText: "P = " + S(P(b)) + " " + L("Н", "N") + " (" + b.name + "),  " + L("ваги покажуть ", "scale shows ") + S(scale(b)) + " " + L("кг", "kg") };
    },
    reset(h) { h.el("wgM").value = ""; h.el("wgU").value = "0"; h.el("wgB").value = "mars"; },
    fill(h) { h.el("wgM").value = "70"; h.el("wgU").value = "0"; h.el("wgB").value = "mars"; },
    share(p, h) { if (h.el("wgM").value.trim()) { p.set("wm", h.el("wgM").value.trim()); p.set("wu", h.el("wgU").value); p.set("wb", h.el("wgB").value); } },
    apply(qs, h) { if (qs.has("wm")) { h.el("wgM").value = qs.get("wm").slice(0, 30); const u2 = Number(qs.get("wu")); if (u2 >= 0 && u2 < MU.length) h.el("wgU").value = String(u2); if (qs.has("wb") && A.BODIES.some((b) => b.id === qs.get("wb") && b.id !== "earth")) h.el("wgB").value = qs.get("wb"); } }
  };

  // ----- гравітація й космічні швидкості -----
  const ap = X.apx;
  const bodyChips = A.BODIES.map((b) => ({ uk: b.uk, en: b.en, find: "g", vals: { M: b.M, R: b.R + "|1" } }));
  const surf = {
    key: "surf", type: "chain", nameUk: "g, космічні швидкості, густина", nameEn: "g, escape speeds, density", find: "g",
    vars: [V("M", "M", "Маса тіла", "Mass of the body", ["кг", "kg"], U.m, "напр.: 6,4171e23"), V("R", "R", "Радіус тіла", "Radius of the body", ["м", "m"], U.r, "напр.: 3389,5"), V("g", "g", "Прискорення вільного падіння", "Surface gravity", ["м/с²", "m/s²"], U.g, ""), V("v1", "v₁", "Перша космічна швидкість", "Orbital speed at the surface", ["м/с", "m/s"], U.v, ""), V("v2", "v₂", "Друга космічна швидкість", "Escape speed", ["м/с", "m/s"], U.v, ""), V("rho", "ρ", "Середня густина", "Mean density", ["кг/м³", "kg/m³"], U.rho, "")],
    formulas: [
      F("g", "M,R", "g = G · M / R²", (a) => ap(X.div(X.mul(G, a.M), X.sq(a.R))), { note: ["G = 6,6743·10⁻¹¹ м³/(кг·с²). Значення g — на середньому радіусі, без урахування обертання й сплюснутості, тому для газових гігантів воно відрізняється від табличного.", "G = 6.6743·10⁻¹¹ m³/(kg·s²). The value of g is at the mean radius, without rotation or oblateness, so for the gas giants it differs from the tabulated one."] }),
      F("v1", "M,R", "v₁ = √(G · M / R)", (a) => ap(X.sqrt(ap(X.div(X.mul(G, a.M), a.R))))), F("v2", "v1", "v₂ = √2 · v₁", (a) => ap(X.mul(X.sqrt(TWO), a.v1)), { note: ["Друга космічна швидкість (швидкість утечі) у √2 разів більша за першу.", "The escape speed is √2 times the orbital speed at the surface."] }), F("v1", "v2", "v₁ = v₂ / √2", (a) => ap(X.div(a.v2, X.sqrt(TWO)))),
      F("rho", "M,R", "ρ = 3M / (4π · R³)", (a) => ap(X.div(X.mul(THREE, a.M), X.mul(X.mul(FOUR, PI), X.mul(X.sq(a.R), a.R))))),
      F("M", "g,R", "M = g · R² / G", (a) => ap(X.div(X.mul(a.g, X.sq(a.R)), G))), F("R", "M,g", "R = √(G · M / g)", (a) => ap(X.sqrt(ap(X.div(X.mul(G, a.M), a.g))))),
      F("M", "rho,R", "M = ρ · 4π · R³ / 3", (a) => ap(X.div(X.mul(X.mul(a.rho, X.mul(FOUR, PI)), X.mul(X.sq(a.R), a.R)), THREE))), F("R", "M,rho", "R = ∛(3M / (4π · ρ))", (a) => ap(X.cbrt(ap(X.div(X.mul(THREE, a.M), X.mul(X.mul(FOUR, PI), a.rho))))))
    ],
    chips: bodyChips,
    hint: ["Введіть масу й радіус тіла (кнопки підставляють дані планет) — отримаєте g, першу й другу космічні швидкості та густину. Можна й навпаки: за g і R знайти масу. Результати наближені.", "Enter the mass and the radius of a body (the buttons fill in the data of the planets) to get g, the orbital and escape speeds and the density. It also works backwards: find the mass from g and R. The results are approximate."],
    example: { find: "g", vals: { M: "6.4171e23", R: "3389.5|1" } }
  };
  return { modes: [weight, surf] };
});
