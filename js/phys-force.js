/* phys-force.js — дані калькулятора «Сила й закони Ньютона»: F = ma і вага, сила тертя, закон Гука, всесвітнє тяжіння, густина й тиск, тиск рідини й закон Архімеда */
PhysCalc.start(({ L, UN, X }) => {
  const SYMEN = { "Fтер": "Ffr", "Eпр": "Eₛ", "Eп": "Eₛ", "Aк": "Aᵤ", "Aз": "Aₜ", "Nк": "Nᵤ", "Nз": "Nₜ" };
  const loc = (s) => L(s, s.replace(/Fтер|Eпр|Eп|Aк|Aз|Nк|Nз/g, (m) => SYMEN[m]));
  const F = (out, ins, txt, f, o) => ({ out, ins: ins ? ins.split(",") : [], txt: loc(txt), f, ...(o || {}) });
  const V = (id, sym, uk, en, si, units, ph, sign, def) => ({ id, sym: loc(sym), uk, en, si, units, ph, sign: sign || "pos", def });
  const SIn = ["Н", "N"], SIkg = ["кг", "kg"], SIm = ["м", "m"], SIj = ["Дж", "J"];
  const G = { consts: ["g"] };

  const newton = {
    key: "newton", type: "chain", nameUk: "Другий закон Ньютона і вага", nameEn: "Newton's second law and weight", find: "F",
    vars: [V("F", "F", "Сила", "Force", SIn, UN.force, "напр.: 15", "any"), V("m", "m", "Маса", "Mass", SIkg, UN.mass, "напр.: 5"), V("a", "a", "Прискорення", "Acceleration", ["м/с²", "m/s²"], UN.acc, "напр.: 3", "any"), V("W", "P", "Вага тіла", "Weight", SIn, UN.force, "")],
    formulas: [F("F", "m,a", "F = m · a", (a, x) => x.mul(a.m, a.a)), F("m", "F,a", "m = F / a", (a, x) => x.div(a.F, a.a)), F("a", "F,m", "a = F / m", (a, x) => x.div(a.F, a.m)), F("W", "m", "P = m · g", (a, x, c) => x.mul(a.m, c.g), G), F("m", "W", "m = P / g", (a, x, c) => x.div(a.W, c.g), G)],
    hint: ["Другий закон Ньютона F = ma і вага тіла в стані спокою P = mg. Заповніть дві величини з F, m, a або масу для ваги. Значення g змінюється в налаштуваннях.", "Newton's second law F = ma and the weight of a body at rest P = mg. Fill in two of F, m, a, or the mass for the weight. The value of g is set in the settings."],
    example: { find: "F", vals: { m: "5", a: "3" } }
  };
  const fric = {
    key: "fric", type: "chain", nameUk: "Сила тертя", nameEn: "Friction force", find: "Ft",
    vars: [V("Ft", "Fтер", "Сила тертя", "Friction force", SIn, UN.force, ""), V("mu", "μ", "Коефіцієнт тертя", "Friction coefficient", ["(число)", "(number)"], UN.one, "напр.: 0,2"), V("N", "N", "Сила нормальної реакції", "Normal force", SIn, UN.force, "напр.: 98"), V("m", "m", "Маса тіла (на горизонталі)", "Mass of the body (on a horizontal surface)", SIkg, UN.mass, "напр.: 10")],
    formulas: [F("N", "m", "N = m · g", (a, x, c) => x.mul(a.m, c.g), G), F("Ft", "mu,N", "Fтер = μ · N", (a, x) => x.mul(a.mu, a.N)), F("mu", "Ft,N", "μ = Fтер / N", (a, x) => x.div(a.Ft, a.N)), F("N", "Ft,mu", "N = Fтер / μ", (a, x) => x.div(a.Ft, a.mu)), F("m", "N", "m = N / g", (a, x, c) => x.div(a.N, c.g), G)],
    hint: ["Сила тертя ковзання F = μN. На горизонтальній поверхні N = mg, тому достатньо вказати масу й коефіцієнт тертя.", "Sliding friction F = μN. On a horizontal surface N = mg, so the mass and the friction coefficient are enough."],
    example: { find: "Ft", vals: { mu: "0.2", m: "10" } }
  };
  const hooke = {
    key: "hooke", type: "chain", nameUk: "Закон Гука", nameEn: "Hooke's law", find: "F",
    vars: [V("F", "F", "Сила пружності", "Elastic force", SIn, UN.force, "напр.: 20"), V("k", "k", "Жорсткість", "Stiffness", ["Н/м", "N/m"], UN.spring, "напр.: 400"), V("x", "x", "Видовження", "Extension", SIm, UN.len, "напр.: 5|3"), V("E", "Eп", "Енергія пружини", "Spring energy", SIj, UN.energy, "")],
    formulas: [F("F", "k,x", "F = k · x", (a, x) => x.mul(a.k, a.x)), F("k", "F,x", "k = F / x", (a, x) => x.div(a.F, a.x)), F("x", "F,k", "x = F / k", (a, x) => x.div(a.F, a.k)), F("E", "k,x", "Eп = k · x² / 2", (a, x) => x.div(x.mul(a.k, x.sq(a.x)), x.k(2))), F("E", "F,x", "Eп = F · x / 2", (a, x) => x.div(x.mul(a.F, a.x), x.k(2)))],
    hint: ["Закон Гука F = kx для малих деформацій; енергія пружини Eп = kx²/2. Видовження можна вказувати в см чи мм.", "Hooke's law F = kx for small deformations; the spring energy is Eₚ = kx²/2. The extension can be given in cm or mm."],
    example: { find: "F", vals: { k: "400", x: "5|3" } }
  };
  const grav = {
    key: "grav", type: "chain", nameUk: "Закон всесвітнього тяжіння", nameEn: "Law of universal gravitation", find: "F",
    vars: [V("F", "F", "Сила тяжіння", "Gravitational force", SIn, UN.force, ""), V("m1", "m₁", "Маса першого тіла", "Mass of the first body", SIkg, UN.mass, "напр.: 5,972e24"), V("m2", "m₂", "Маса другого тіла", "Mass of the second body", SIkg, UN.mass, "напр.: 7,348e22"), V("r", "r", "Відстань між центрами", "Distance between the centres", SIm, UN.len, "напр.: 3,844e8")],
    formulas: [F("F", "m1,m2,r", "F = G · m₁ · m₂ / r²", (a, x) => x.div(x.mul(x.mul(x.k("6.6743e-11"), a.m1), a.m2), x.sq(a.r))), F("m1", "F,m2,r", "m₁ = F · r² / (G · m₂)", (a, x) => x.div(x.mul(a.F, x.sq(a.r)), x.mul(x.k("6.6743e-11"), a.m2))), F("m2", "F,m1,r", "m₂ = F · r² / (G · m₁)", (a, x) => x.div(x.mul(a.F, x.sq(a.r)), x.mul(x.k("6.6743e-11"), a.m1))), F("r", "F,m1,m2", "r = √(G · m₁ · m₂ / F)", (a, x) => x.sqrt(x.div(x.mul(x.mul(x.k("6.6743e-11"), a.m1), a.m2), a.F)))],
    hint: ["Гравітаційна стала G = 6,6743·10⁻¹¹ Н·м²/кг². Для великих і малих чисел можна писати 5,972e24 (це 5,972·10²⁴).", "The gravitational constant G = 6.6743·10⁻¹¹ N·m²/kg². For very large and small numbers you can write 5.972e24 (that is 5.972·10²⁴)."],
    example: { find: "F", vals: { m1: "5.972e24", m2: "7.348e22", r: "3.844e8" } }
  };
  const dens = {
    key: "dens", type: "chain", nameUk: "Густина й тиск", nameEn: "Density and pressure", find: "rho",
    vars: [V("rho", "ρ", "Густина", "Density", ["кг/м³", "kg/m³"], UN.dens, "напр.: 2700"), V("m", "m", "Маса", "Mass", SIkg, UN.mass, "напр.: 540"), V("V", "V", "Об'єм", "Volume", ["м³", "m³"], UN.vol, "напр.: 0,2"), V("p", "p", "Тиск", "Pressure", ["Па", "Pa"], UN.press, "напр.: 5"), V("F", "F", "Сила тиску", "Pressing force", SIn, UN.force, "напр.: 500"), V("S", "S", "Площа", "Area", ["м²", "m²"], UN.area, "напр.: 0,1")],
    formulas: [F("rho", "m,V", "ρ = m / V", (a, x) => x.div(a.m, a.V)), F("m", "rho,V", "m = ρ · V", (a, x) => x.mul(a.rho, a.V)), F("V", "m,rho", "V = m / ρ", (a, x) => x.div(a.m, a.rho)), F("p", "F,S", "p = F / S", (a, x) => x.div(a.F, a.S)), F("F", "p,S", "F = p · S", (a, x) => x.mul(a.p, a.S)), F("S", "F,p", "S = F / p", (a, x) => x.div(a.F, a.p))],
    hint: ["Дві незалежні формули: густина ρ = m/V і тиск p = F/S. Можна користуватися обома, заповнивши потрібні величини.", "Two independent formulas: density ρ = m/V and pressure p = F/S. You can use both by filling in the quantities you need."],
    example: { find: "rho", vals: { m: "540", V: "0.2" } }
  };
  const fluid = {
    key: "fluid", type: "chain", nameUk: "Тиск рідини й сила Архімеда", nameEn: "Fluid pressure and buoyancy", find: "p",
    vars: [V("p", "p", "Гідростатичний тиск", "Hydrostatic pressure", ["Па", "Pa"], UN.press, ""), V("rho", "ρ", "Густина рідини", "Density of the fluid", ["кг/м³", "kg/m³"], UN.dens, "напр.: 1000"), V("h", "h", "Глибина", "Depth", SIm, UN.len, "напр.: 10"), V("FA", "Fₐ", "Сила Архімеда", "Buoyant force", SIn, UN.force, ""), V("V", "V", "Об'єм зануреної частини", "Submerged volume", ["м³", "m³"], UN.vol, "напр.: 0,5")],
    formulas: [F("p", "rho,h", "p = ρ · g · h", (a, x, c) => x.mul(x.mul(a.rho, c.g), a.h), G), F("h", "p,rho", "h = p / (ρ · g)", (a, x, c) => x.div(a.p, x.mul(a.rho, c.g)), G), F("rho", "p,h", "ρ = p / (g · h)", (a, x, c) => x.div(a.p, x.mul(c.g, a.h)), G), F("FA", "rho,V", "Fₐ = ρ · g · V", (a, x, c) => x.mul(x.mul(a.rho, c.g), a.V), G), F("V", "FA,rho", "V = Fₐ / (ρ · g)", (a, x, c) => x.div(a.FA, x.mul(a.rho, c.g)), G), F("rho", "FA,V", "ρ = Fₐ / (g · V)", (a, x, c) => x.div(a.FA, x.mul(c.g, a.V)), G)],
    hint: ["Тиск рідини на глибині h і виштовхувальна сила Архімеда. Густина води близько 1000 кг/м³.", "The pressure of a fluid at depth h and the buoyant force of Archimedes. The density of water is about 1000 kg/m³."],
    example: { find: "p", vals: { rho: "1000", h: "10" } }
  };
  return { modes: [newton, fric, hooke, grav, dens, fluid] };
});
