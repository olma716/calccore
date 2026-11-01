/* phys-energy.js — дані калькулятора «Енергія, робота, потужність»: кінетична енергія, потенціальна енергія й пружина, робота й потужність, ККД, збереження енергії */
PhysCalc.start(({ L, UN, X }) => {
  const SYMEN = { "Fтер": "Ffr", "Eпр": "Eₛ", "Eп": "Eₛ", "Aк": "Aᵤ", "Aз": "Aₜ", "Nк": "Nᵤ", "Nз": "Nₜ" };
  const loc = (s) => L(s, s.replace(/Fтер|Eпр|Eп|Aк|Aз|Nк|Nз/g, (m) => SYMEN[m]));
  const F = (out, ins, txt, f, o) => ({ out, ins: ins ? ins.split(",") : [], txt: loc(txt), f, ...(o || {}) });
  const V = (id, sym, uk, en, si, units, ph, sign, def) => ({ id, sym: loc(sym), uk, en, si, units, ph, sign: sign || "pos", def });
  const SIj = ["Дж", "J"], SIkg = ["кг", "kg"], SIm = ["м", "m"], SIv = ["м/с", "m/s"], SIw = ["Вт", "W"], SIn = ["Н", "N"];
  const G = { consts: ["g"] };

  const ek = {
    key: "ek", type: "chain", nameUk: "Кінетична енергія", nameEn: "Kinetic energy", find: "E",
    vars: [V("E", "Eₖ", "Кінетична енергія", "Kinetic energy", SIj, UN.energy, ""), V("m", "m", "Маса", "Mass", SIkg, UN.mass, "напр.: 2"), V("v", "v", "Швидкість", "Speed", SIv, UN.vel, "напр.: 10")],
    formulas: [F("E", "m,v", "Eₖ = m · v² / 2", (a, x) => x.div(x.mul(a.m, x.sq(a.v)), x.k(2))), F("m", "E,v", "m = 2Eₖ / v²", (a, x) => x.div(x.mul(x.k(2), a.E), x.sq(a.v))), F("v", "E,m", "v = √(2Eₖ / m)", (a, x) => x.sqrt(x.div(x.mul(x.k(2), a.E), a.m)))],
    hint: ["Кінетична енергія тіла масою m, що рухається зі швидкістю v. Швидкість можна вказувати в км/год.", "The kinetic energy of a body of mass m moving at speed v. The speed can be given in km/h."],
    example: { find: "E", vals: { m: "2", v: "10" } }
  };
  const ep = {
    key: "ep", type: "chain", nameUk: "Потенціальна енергія", nameEn: "Potential energy", find: "E",
    vars: [V("E", "Eₚ", "Потенціальна енергія тіла", "Gravitational potential energy", SIj, UN.energy, ""), V("m", "m", "Маса", "Mass", SIkg, UN.mass, "напр.: 5"), V("h", "h", "Висота", "Height", SIm, UN.len, "напр.: 10"), V("Es", "Eпр", "Енергія пружини", "Spring energy", SIj, UN.energy, ""), V("k", "k", "Жорсткість", "Stiffness", ["Н/м", "N/m"], UN.spring, "напр.: 400"), V("x", "x", "Видовження", "Extension", SIm, UN.len, "напр.: 5|3")],
    formulas: [F("E", "m,h", "Eₚ = m · g · h", (a, x, c) => x.mul(x.mul(a.m, c.g), a.h), G), F("m", "E,h", "m = Eₚ / (g · h)", (a, x, c) => x.div(a.E, x.mul(c.g, a.h)), G), F("h", "E,m", "h = Eₚ / (m · g)", (a, x, c) => x.div(a.E, x.mul(a.m, c.g)), G), F("Es", "k,x", "Eпр = k · x² / 2", (a, x) => x.div(x.mul(a.k, x.sq(a.x)), x.k(2))), F("k", "Es,x", "k = 2Eпр / x²", (a, x) => x.div(x.mul(x.k(2), a.Es), x.sq(a.x))), F("x", "Es,k", "x = √(2Eпр / k)", (a, x) => x.sqrt(x.div(x.mul(x.k(2), a.Es), a.k)))],
    hint: ["Дві групи: потенціальна енергія тіла над землею Eₚ = mgh і енергія стиснутої чи розтягнутої пружини Eпр = kx²/2.", "Two groups: the potential energy of a body above the ground Eₚ = mgh and the energy of a compressed or stretched spring Eₛ = kx²/2."],
    example: { find: "E", vals: { m: "5", h: "10" } }
  };
  const work = {
    key: "work", type: "chain", nameUk: "Робота й потужність", nameEn: "Work and power", find: "A",
    vars: [V("A", "A", "Робота", "Work", SIj, UN.energy, ""), V("F", "F", "Сила", "Force", SIn, UN.force, "напр.: 50"), V("s", "s", "Переміщення", "Displacement", SIm, UN.len, "напр.: 10"), V("al", "α", "Кут між силою й переміщенням", "Angle between force and displacement", ["°", "°"], UN.deg, "", "nn", "0"), V("t", "t", "Час", "Time", ["с", "s"], UN.time, "напр.: 5"), V("N", "N", "Потужність", "Power", SIw, UN.power, ""), V("v", "v", "Швидкість", "Speed", SIv, UN.vel, "")],
    formulas: [
      F("A", "F,s,al", "A = F · s · cos α", (a, x) => x.mul(x.mul(a.F, a.s), x.cos(a.al))), F("F", "A,s,al", "F = A / (s · cos α)", (a, x) => x.div(a.A, x.mul(a.s, x.cos(a.al)))), F("s", "A,F,al", "s = A / (F · cos α)", (a, x) => x.div(a.A, x.mul(a.F, x.cos(a.al)))),
      F("N", "A,t", "N = A / t", (a, x) => x.div(a.A, a.t)), F("A", "N,t", "A = N · t", (a, x) => x.mul(a.N, a.t)), F("t", "A,N", "t = A / N", (a, x) => x.div(a.A, a.N)),
      F("v", "s,t", "v = s / t", (a, x) => x.div(a.s, a.t)), F("N", "F,v", "N = F · v", (a, x) => x.mul(a.F, a.v)), F("F", "N,v", "F = N / v", (a, x) => x.div(a.N, a.v)), F("v", "N,F", "v = N / F", (a, x) => x.div(a.N, a.F))
    ],
    hint: ["Механічна робота A = F·s·cos α (кут за замовчуванням 0°), потужність N = A/t і N = F·v. Заповніть відомі величини, решту знайдемо.", "Mechanical work A = F·s·cos α (the angle defaults to 0°), power N = A/t and N = F·v. Fill in the known quantities and the rest is found."],
    example: { find: "A", vals: { F: "50", s: "10", al: "60" } }
  };
  const eff = {
    key: "eff", type: "chain", nameUk: "ККД", nameEn: "Efficiency", find: "eta",
    vars: [V("eta", "η", "ККД", "Efficiency", ["(частка)", "(fraction)"], UN.pct, ""), V("Ak", "Aк", "Корисна робота", "Useful work", SIj, UN.energy, "напр.: 80"), V("Az", "Aз", "Повна (затрачена) робота", "Total work done", SIj, UN.energy, "напр.: 100"), V("Nk", "Nк", "Корисна потужність", "Useful power", SIw, UN.power, ""), V("Nz", "Nз", "Повна потужність", "Total power", SIw, UN.power, "")],
    formulas: [F("eta", "Ak,Az", "η = Aк / Aз", (a, x) => x.div(a.Ak, a.Az)), F("Ak", "eta,Az", "Aк = η · Aз", (a, x) => x.mul(a.eta, a.Az)), F("Az", "Ak,eta", "Aз = Aк / η", (a, x) => x.div(a.Ak, a.eta)), F("eta", "Nk,Nz", "η = Nк / Nз", (a, x) => x.div(a.Nk, a.Nz)), F("Nk", "eta,Nz", "Nк = η · Nз", (a, x) => x.mul(a.eta, a.Nz)), F("Nz", "Nk,eta", "Nз = Nк / η", (a, x) => x.div(a.Nk, a.eta))],
    hint: ["ККД — відношення корисної роботи (чи потужності) до повної. Результат можна показати у відсотках чи часткою.", "Efficiency is the ratio of useful work (or power) to total work (or power). The result can be shown as a percentage or a fraction."],
    example: { find: "eta", vals: { Ak: "80", Az: "100" } }
  };
  const cons = {
    key: "cons", type: "chain", nameUk: "Збереження енергії", nameEn: "Conservation of energy", find: "v",
    vars: [V("m", "m", "Маса", "Mass", SIkg, UN.mass, "напр.: 2"), V("h", "h", "Висота", "Height", SIm, UN.len, "напр.: 5"), V("v", "v", "Швидкість внизу", "Speed at the bottom", SIv, UN.vel, "напр.: 9,9"), V("Ep", "Eₚ", "Потенціальна енергія", "Potential energy", SIj, UN.energy, ""), V("Ek", "Eₖ", "Кінетична енергія", "Kinetic energy", SIj, UN.energy, "")],
    formulas: [
      F("Ep", "m,h", "Eₚ = m · g · h", (a, x, c) => x.mul(x.mul(a.m, c.g), a.h), G), F("v", "h", "v = √(2g · h)", (a, x, c) => x.sqrt(x.mul(x.mul(x.k(2), c.g), a.h)), { ...G, note: ["m·g·h = m·v²/2: маса скорочується, тому швидкість не залежить від неї.", "m·g·h = m·v²/2: the mass cancels, so the speed does not depend on it."] }), F("h", "v", "h = v² / (2g)", (a, x, c) => x.div(x.sq(a.v), x.mul(x.k(2), c.g)), G),
      F("Ek", "m,v", "Eₖ = m · v² / 2", (a, x) => x.div(x.mul(a.m, x.sq(a.v)), x.k(2))), F("Ek", "Ep", "Eₖ = Eₚ", (a) => a.Ep, { note: ["Без втрат на тертя вся потенціальна енергія перетворюється на кінетичну.", "Without friction losses all the potential energy turns into kinetic energy."] }), F("Ep", "Ek", "Eₚ = Eₖ", (a) => a.Ek)
    ],
    hint: ["Тіло падає з висоти h без тертя: потенціальна енергія внизу повністю стає кінетичною. Достатньо вказати висоту, щоб знайти швидкість внизу.", "A body falls from height h without friction: the potential energy turns completely into kinetic energy at the bottom. The height alone gives the speed at the bottom."],
    example: { find: "v", vals: { m: "2", h: "5" } }
  };
  return { modes: [ek, ep, work, eff, cons] };
});
