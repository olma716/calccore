/* chem-sol.js — дані калькулятора «Розчини й концентрація»: масова частка, молярність, розведення, змішування, перерахунок ω ↔ c, моляльність і нормальність */
PhysCalc.start(({ L, u, X, DErr }) => {
  // кириличні позначення (Vв, mр, Cн) в англійській версії замінюємо латинськими
  const SYM = { "Vв": "Vw", "mр": "mₛ", "Cн": "Cₙ" };
  const loc = (s) => L(s, String(s).replace(/Vв|mр|Cн/g, (m) => SYM[m]));
  const F = (out, ins, txt, f, o) => ({ out, ins: ins ? ins.split(",") : [], txt: loc(txt), f, ...(o || {}) });
  const V = (id, sym, uk, en, si, units, ph, sign, def, extra) => ({ id, sym: loc(sym), uk, en, si, units, ph, sign: sign || "pos", def, ...(extra || {}) });
  const U = {
    mass: [u("г", "g", 1), u("мг", "mg", "0.001"), u("кг", "kg", 1000), u("т", "t", 1000000)],
    kg: [u("кг", "kg", 1), u("г", "g", "0.001"), u("мг", "mg", "0.000001")],
    vol: [u("л", "L", 1), u("мл", "mL", "0.001"), u("м³", "m³", 1000), u("дм³", "dm³", 1)],
    mvol: [u("мл", "mL", 1), u("л", "L", 1000), u("см³", "cm³", 1)],
    conc: [u("моль/л", "mol/L", 1), u("ммоль/л", "mmol/L", "0.001"), u("моль/м³", "mol/m³", "0.001")],
    mol: [u("моль", "mol", 1), u("ммоль", "mmol", "0.001"), u("кмоль", "kmol", 1000)],
    pct: [u("%", "%", "0.01"), u("(частка)", "(fraction)", 1)],
    dens: [u("г/мл", "g/mL", 1), u("г/см³", "g/cm³", 1), u("кг/л", "kg/L", 1), u("кг/м³", "kg/m³", "0.001"), u("г/л", "g/L", "0.001")],
    M: [u("г/моль", "g/mol", 1)],
    num: [u("(число)", "(number)", 1)],
    same: [u("(од.)", "(units)", 1)],
    molal: [u("моль/кг", "mol/kg", 1)],
    eq: [u("екв/л", "eq/L", 1)]
  };
  const FR = ["(частка)", "(fraction)"], G = ["г", "g"], ML = ["мл", "mL"], LL = ["л", "L"], MOL = ["моль", "mol"];
  const one = (v) => X.sub(X.k(1), v);
  const pos = (v, uk, en) => { if (v.c.n <= 0n) throw new DErr(L(uk, en)); return v; };
  const WMAX = { max: 1 };

  // ----- масова частка -----
  const w = {
    key: "w", type: "chain", nameUk: "Масова частка", nameEn: "Mass fraction", find: "w",
    vars: [V("w", "ω", "Масова частка", "Mass fraction", FR, U.pct, "", "pos", undefined, WMAX), V("m1", "m₁", "Маса розчиненої речовини", "Mass of the solute", G, U.mass, "напр.: 20"), V("m2", "m₂", "Маса розчинника (води)", "Mass of the solvent (water)", G, U.mass, "напр.: 180"), V("m", "m", "Маса розчину", "Mass of the solution", G, U.mass, "напр.: 200"), V("rho", "ρ", "Густина розчину", "Density of the solution", ["г/мл", "g/mL"], U.dens, "напр.: 1,1"), V("V", "V", "Об'єм розчину", "Volume of the solution", ML, U.mvol, "напр.: 250")],
    formulas: [
      F("m", "m1,m2", "m = m₁ + m₂", (a) => X.add(a.m1, a.m2)), F("m", "rho,V", "m = ρ · V", (a) => X.mul(a.rho, a.V)),
      F("m2", "m,m1", "m₂ = m − m₁", (a) => pos(X.sub(a.m, a.m1), "маса розчинника вийшла недодатною: m має бути більшою за m₁", "the solvent mass came out non-positive: m must exceed m₁")),
      F("m1", "m,m2", "m₁ = m − m₂", (a) => pos(X.sub(a.m, a.m2), "маса розчиненої речовини вийшла недодатною: m має бути більшою за m₂", "the solute mass came out non-positive: m must exceed m₂")),
      F("w", "m1,m", "ω = m₁ / m", (a) => { const r = X.div(a.m1, a.m); if (r.c.n > r.c.d) throw new DErr(L("розчинена речовина не може важити більше за весь розчин: m₁ має бути меншою за m", "the solute cannot weigh more than the whole solution: m₁ must be less than m")); return r; }), F("m1", "w,m", "m₁ = ω · m", (a) => X.mul(a.w, a.m)), F("m", "m1,w", "m = m₁ / ω", (a) => X.div(a.m1, a.w)),
      F("m1", "w,m2", "m₁ = ω · m₂ / (1 − ω)", (a) => X.div(X.mul(a.w, a.m2), one(a.w))), F("m2", "w,m1", "m₂ = m₁ · (1 − ω) / ω", (a) => X.div(X.mul(a.m1, one(a.w)), a.w)),
      F("rho", "m,V", "ρ = m / V", (a) => X.div(a.m, a.V)), F("V", "m,rho", "V = m / ρ", (a) => X.div(a.m, a.rho))
    ],
    hint: ["Масова частка ω = m(речовини) / m(розчину). Вкажіть дві величини з m₁, m₂, m, ω; густина й об'єм потрібні, якщо розчин міряють у мілілітрах.", "Mass fraction ω = m(solute) / m(solution). Enter two of m₁, m₂, m, ω; density and volume are needed if the solution is measured in millilitres."],
    example: { find: "w", vals: { m1: "20", m2: "180" } }
  };

  // ----- молярна концентрація -----
  const c = {
    key: "c", type: "chain", nameUk: "Молярна концентрація", nameEn: "Molar concentration", find: "c",
    vars: [V("c", "c", "Молярна концентрація", "Molar concentration", ["моль/л", "mol/L"], U.conc, ""), V("n", "n", "Кількість речовини", "Amount of substance", MOL, U.mol, "напр.: 0,1"), V("V", "V", "Об'єм розчину", "Volume of the solution", LL, U.vol, "напр.: 0,5"), V("m", "m", "Маса речовини", "Mass of the substance", G, U.mass, "напр.: 5,844"), { ...V("M", "M", "Молярна маса (число або формула)", "Molar mass (number or formula)", ["г/моль", "g/mol"], U.M, "напр.: 58,44 або NaCl"), chem: true }],
    formulas: [
      F("n", "m,M", "n = m / M", (a) => X.div(a.m, a.M)), F("n", "c,V", "n = c · V", (a) => X.mul(a.c, a.V)), F("m", "n,M", "m = n · M", (a) => X.mul(a.n, a.M)), F("M", "m,n", "M = m / n", (a) => X.div(a.m, a.n)),
      F("c", "n,V", "c = n / V", (a) => X.div(a.n, a.V)), F("V", "n,c", "V = n / c", (a) => X.div(a.n, a.c))
    ],
    hint: ["Молярна концентрація c = n / V (моль на літр). Молярну масу можна ввести числом або формулою (NaCl, H2SO4) — калькулятор сам її порахує.", "Molar concentration c = n / V (moles per litre). The molar mass can be entered as a number or a formula (NaCl, H2SO4) — the calculator works it out itself."],
    example: { find: "c", vals: { m: "5.844", M: "NaCl", V: "0.5" } }
  };

  // ----- розведення -----
  const dil = {
    key: "dil", type: "chain", nameUk: "Розведення розчину", nameEn: "Dilution", find: "V1",
    vars: [V("c1", "c₁", "Початкова концентрація", "Initial concentration", ["(од.)", "(units)"], U.same, "напр.: 36"), V("V1", "V₁", "Об'єм концентрату", "Volume of the concentrate", LL, U.vol, "", "pos"), V("c2", "c₂", "Кінцева концентрація", "Final concentration", ["(од.)", "(units)"], U.same, "напр.: 10"), V("V2", "V₂", "Кінцевий об'єм", "Final volume", LL, U.vol, "напр.: 500"), V("Vw", "Vв", "Об'єм води", "Volume of water", LL, U.vol, "")],
    formulas: [
      F("V1", "c1,c2,V2", "V₁ = c₂ · V₂ / c₁", (a) => X.div(X.mul(a.c2, a.V2), a.c1), { note: ["Кількість розчиненої речовини при розведенні не змінюється: c₁·V₁ = c₂·V₂.", "The amount of solute does not change on dilution: c₁·V₁ = c₂·V₂."] }),
      F("V2", "c1,c2,V1", "V₂ = c₁ · V₁ / c₂", (a) => X.div(X.mul(a.c1, a.V1), a.c2)), F("c2", "c1,V1,V2", "c₂ = c₁ · V₁ / V₂", (a) => X.div(X.mul(a.c1, a.V1), a.V2)), F("c1", "c2,V1,V2", "c₁ = c₂ · V₂ / V₁", (a) => X.div(X.mul(a.c2, a.V2), a.V1)),
      F("Vw", "V1,V2", "Vв = V₂ − V₁", (a) => pos(X.sub(a.V2, a.V1), "кінцевий об'єм має бути більшим за початковий — інакше це не розведення", "the final volume must exceed the initial one — otherwise it is not a dilution")),
      F("V2", "V1,Vw", "V₂ = V₁ + Vв", (a) => X.add(a.V1, a.Vw)), F("V1", "V2,Vw", "V₁ = V₂ − Vв", (a) => pos(X.sub(a.V2, a.Vw), "об'єм води не може перевищувати кінцевий об'єм", "the water volume cannot exceed the final volume")),
      F("V1", "c1,c2,Vw", "V₁ = c₂ · Vв / (c₁ − c₂)", (a) => X.div(X.mul(a.c2, a.Vw), pos(X.sub(a.c1, a.c2), "кінцева концентрація має бути меншою за початкову", "the final concentration must be lower than the initial one"))),
      F("V2", "c1,c2,Vw", "V₂ = c₁ · Vв / (c₁ − c₂)", (a) => X.div(X.mul(a.c1, a.Vw), pos(X.sub(a.c1, a.c2), "кінцева концентрація має бути меншою за початкову", "the final concentration must be lower than the initial one")))
    ],
    hint: ["Закон розведення c₁·V₁ = c₂·V₂ діє для будь-якої концентрації (%, моль/л…), якщо c₁ і c₂ в одних одиницях. Вкажіть три величини з c₁, c₂, V₁, V₂ — або c₁, c₂ і об'єм води.", "The dilution law c₁·V₁ = c₂·V₂ works for any concentration (%, mol/L…) as long as c₁ and c₂ use the same units. Enter three of c₁, c₂, V₁, V₂ — or c₁, c₂ and the volume of water."],
    example: { find: "V1", vals: { c1: "36", c2: "10", V2: "500|1", V1: "|1" } }
  };

  // ----- змішування -----
  const mix = {
    key: "mix", type: "chain", nameUk: "Змішування розчинів", nameEn: "Mixing solutions", find: "w",
    vars: [V("w1", "ω₁", "Частка в першому розчині", "Fraction in the first solution", FR, U.pct, "напр.: 10", "pos", undefined, WMAX), V("m1", "m₁", "Маса першого розчину", "Mass of the first solution", G, U.mass, "напр.: 100"), V("w2", "ω₂", "Частка в другому розчині", "Fraction in the second solution", FR, U.pct, "напр.: 30", "pos", undefined, WMAX), V("m2", "m₂", "Маса другого розчину", "Mass of the second solution", G, U.mass, "напр.: 300"), V("w", "ω", "Частка в суміші", "Fraction in the mixture", FR, U.pct, "", "pos", undefined, WMAX), V("m", "m", "Маса суміші", "Mass of the mixture", G, U.mass, "")],
    formulas: [
      F("m", "m1,m2", "m = m₁ + m₂", (a) => X.add(a.m1, a.m2)),
      F("w", "w1,m1,w2,m2", "ω = (ω₁ · m₁ + ω₂ · m₂) / (m₁ + m₂)", (a) => X.div(X.add(X.mul(a.w1, a.m1), X.mul(a.w2, a.m2)), X.add(a.m1, a.m2)), { note: ["Кількість розчиненої речовини в суміші дорівнює сумі її кількостей у обох розчинах. Частка суміші завжди лежить між ω₁ і ω₂.", "The amount of solute in the mixture is the sum of its amounts in both solutions. The fraction of the mixture always lies between ω₁ and ω₂."] }),
      F("m2", "w1,w2,w,m1", "m₂ = m₁ · (ω₁ − ω) / (ω − ω₂)", (a) => pos(X.div(X.mul(a.m1, X.sub(a.w1, a.w)), X.sub(a.w, a.w2)), "ω має лежати між ω₁ і ω₂", "ω must lie between ω₁ and ω₂"), { note: ["Це правило змішування (правило хреста): маси відносяться як різниці часток.", "This is the rule of mixtures (the cross rule): the masses are in the ratio of the differences of the fractions."] }),
      F("m1", "w1,w2,w,m2", "m₁ = m₂ · (ω − ω₂) / (ω₁ − ω)", (a) => pos(X.div(X.mul(a.m2, X.sub(a.w, a.w2)), X.sub(a.w1, a.w)), "ω має лежати між ω₁ і ω₂", "ω must lie between ω₁ and ω₂")),
      F("m1", "w1,w2,w,m", "m₁ = m · (ω − ω₂) / (ω₁ − ω₂)", (a) => pos(X.div(X.mul(a.m, X.sub(a.w, a.w2)), X.sub(a.w1, a.w2)), "ω має лежати між ω₁ і ω₂", "ω must lie between ω₁ and ω₂")),
      F("m2", "w1,w2,w,m", "m₂ = m · (ω₁ − ω) / (ω₁ − ω₂)", (a) => pos(X.div(X.mul(a.m, X.sub(a.w1, a.w)), X.sub(a.w1, a.w2)), "ω має лежати між ω₁ і ω₂", "ω must lie between ω₁ and ω₂")),
      F("m2", "m,m1", "m₂ = m − m₁", (a) => pos(X.sub(a.m, a.m1), "m має бути більшою за m₁", "m must exceed m₁")), F("m1", "m,m2", "m₁ = m − m₂", (a) => pos(X.sub(a.m, a.m2), "m має бути більшою за m₂", "m must exceed m₂")),
      F("w1", "w,w2,m1,m2", "ω₁ = (ω · (m₁ + m₂) − ω₂ · m₂) / m₁", (a) => pos(X.div(X.sub(X.mul(a.w, X.add(a.m1, a.m2)), X.mul(a.w2, a.m2)), a.m1), "такої частки не існує за цими даними", "no such fraction exists for these data")),
      F("w2", "w,w1,m1,m2", "ω₂ = (ω · (m₁ + m₂) − ω₁ · m₁) / m₂", (a) => pos(X.div(X.sub(X.mul(a.w, X.add(a.m1, a.m2)), X.mul(a.w1, a.m1)), a.m2), "такої частки не існує за цими даними", "no such fraction exists for these data"))
    ],
    hint: ["Змішуємо два розчини однієї речовини. Знайдіть частку суміші або, навпаки, скільки взяти кожного розчину, щоб отримати потрібну частку (правило хреста). Води відповідає ω = 0 %: щоб розбавити водою, вкажіть малу частку, наприклад 0,0001 %.", "Two solutions of the same substance are mixed. Find the fraction of the mixture or, conversely, how much of each solution to take to get the fraction you need (the cross rule). Water corresponds to ω = 0 %: to dilute with water enter a tiny fraction, for example 0.0001 %."],
    example: { find: "w", vals: { w1: "10", m1: "100", w2: "30", m2: "300" } }
  };

  // ----- перерахунок масової частки в молярність -----
  const conv = {
    key: "conv", type: "chain", nameUk: "ω ↔ молярна концентрація", nameEn: "ω ↔ molar concentration", find: "c",
    vars: [V("c", "c", "Молярна концентрація", "Molar concentration", ["моль/л", "mol/L"], U.conc, ""), V("w", "ω", "Масова частка", "Mass fraction", FR, U.pct, "напр.: 98", "pos", undefined, WMAX), V("rho", "ρ", "Густина розчину", "Density of the solution", ["г/мл", "g/mL"], U.dens, "напр.: 1,84"), { ...V("M", "M", "Молярна маса (число або формула)", "Molar mass (number or formula)", ["г/моль", "g/mol"], U.M, "напр.: H2SO4"), chem: true }],
    formulas: [
      F("c", "w,rho,M", "c = 1000 · ω · ρ / M", (a) => X.div(X.mul(X.mul(X.k(1000), a.w), a.rho), a.M), { note: ["У 1 л розчину міститься 1000·ρ грамів розчину, з них ω — розчинена речовина; ділимо на M, щоб отримати моли.", "One litre of solution holds 1000·ρ grams of solution, a fraction ω of which is the solute; dividing by M gives moles."] }),
      F("w", "c,rho,M", "ω = c · M / (1000 · ρ)", (a) => { const r = X.div(X.mul(a.c, a.M), X.mul(X.k(1000), a.rho)); if (r.c.n > r.c.d) throw new DErr(L("масова частка вийшла більшою за 100 % — перевірте дані", "the mass fraction came out above 100 % — check the data")); return r; }),
      F("rho", "c,w,M", "ρ = c · M / (1000 · ω)", (a) => X.div(X.mul(a.c, a.M), X.mul(X.k(1000), a.w))), F("M", "c,w,rho", "M = 1000 · ω · ρ / c", (a) => X.div(X.mul(X.mul(X.k(1000), a.w), a.rho), a.c))
    ],
    hint: ["Перерахунок між масовою часткою й молярною концентрацією потребує густини розчину (її беруть з довідника). Молярну масу можна ввести формулою.", "Converting between mass fraction and molar concentration needs the density of the solution (take it from a reference table). The molar mass can be entered as a formula."],
    example: { find: "c", vals: { w: "98", rho: "1.84", M: "H2SO4" } }
  };

  // ----- моляльність і нормальність -----
  const mb = {
    key: "mb", type: "chain", nameUk: "Моляльність і нормальність", nameEn: "Molality and normality", find: "b",
    vars: [V("b", "b", "Моляльність", "Molality", ["моль/кг", "mol/kg"], U.molal, ""), V("n", "n", "Кількість речовини", "Amount of substance", MOL, U.mol, "напр.: 0,5"), V("mp", "mр", "Маса розчинника", "Mass of the solvent", ["кг", "kg"], U.kg, "напр.: 2"), V("m", "m", "Маса речовини", "Mass of the substance", G, U.mass, "напр.: 29,22"), { ...V("M", "M", "Молярна маса (число або формула)", "Molar mass (number or formula)", ["г/моль", "g/mol"], U.M, "напр.: NaCl"), chem: true }, V("c", "c", "Молярна концентрація", "Molar concentration", ["моль/л", "mol/L"], U.conc, "напр.: 0,5"), V("z", "z", "Еквівалентне число", "Equivalent number", ["(число)", "(number)"], U.num, "напр.: 2"), V("N", "Cн", "Нормальна концентрація", "Normality", ["екв/л", "eq/L"], U.eq, "")],
    formulas: [
      F("n", "m,M", "n = m / M", (a) => X.div(a.m, a.M)), F("m", "n,M", "m = n · M", (a) => X.mul(a.n, a.M)), F("M", "m,n", "M = m / n", (a) => X.div(a.m, a.n)),
      F("b", "n,mp", "b = n / mр", (a) => X.div(a.n, a.mp)), F("n", "b,mp", "n = b · mр", (a) => X.mul(a.b, a.mp)), F("mp", "n,b", "mр = n / b", (a) => X.div(a.n, a.b)),
      F("N", "c,z", "Cн = c · z", (a) => X.mul(a.c, a.z)), F("c", "N,z", "c = Cн / z", (a) => X.div(a.N, a.z)), F("z", "N,c", "z = Cн / c", (a) => X.div(a.N, a.c))
    ],
    hint: ["Моляльність b = n / m(розчинника) — моль на кілограм розчинника. Нормальна концентрація Cн = c · z, де z — число еквівалентів (для H₂SO₄ в реакції нейтралізації z = 2). Дві групи формул незалежні.", "Molality b = n / m(solvent) — moles per kilogram of solvent. Normality Cн = c · z, where z is the number of equivalents (z = 2 for H₂SO₄ in a neutralisation reaction). The two groups of formulas are independent."],
    example: { find: "b", vals: { n: "0.5", mp: "2" } }
  };

  [w, c, dil, mix, conv, mb].forEach((m) => { m.hint[1] = loc(m.hint[1]); m.vars.forEach((v) => { v.en = loc(v.en); }); });
  return { modes: [w, c, dil, mix, conv, mb], keepSet: true };
});
