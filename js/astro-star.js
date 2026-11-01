/* astro-star.js — дані калькулятора «Зоряна величина й світність»: модуль відстані, відношення яскравостей, світність за радіусом і температурою, світність за абсолютною величиною */
PhysCalc.start(({ L, u, X }) => {
  const A = window.Astro, C = A.C;
  const F = (out, ins, txt, f, o) => ({ out, ins: ins ? ins.split(",") : [], txt, f, ...(o || {}) });
  const V = (id, sym, uk, en, si, units, ph, sign, def) => ({ id, sym, uk, en, si, units, ph, sign: sign || "pos", def });
  const soft = (v) => (v.apx ? v : v.m !== 1n && (v.m > 1000n || v.c.d > 1000n) ? X.apx(v) : v);
  const U = {
    mag: [u("m", "m", 1)],
    pc: [u("парсеків", "parsecs", 1), u("світлових років", "light-years", C.LY + "/" + C.PC), u("кілопарсеків", "kiloparsecs", 1000), u("а.о.", "AU", C.AU + "/" + C.PC)],
    rs: [u("R☉", "R☉", 1), u("км", "km", "1/695700"), u("R⊕", "R⊕", "6371/695700"), u("R юпітера", "Jupiter radii", "69911/695700")],
    ls: [u("L☉", "L☉", 1), u("Вт", "W", "1/3.828e26")]
  };
  const K = (s) => X.k(s), ONE = K(1), TWO = K(2), FIVE = K(5), TS = K(C.Tsun), MB = K(C.Mbol);
  const mag = (sym, uk, en, ph) => V(sym.id, sym.s, uk, en, ["зор. вел.", "mag"], [u("зор. вел.", "mag", 1)], ph, "any");

  // ----- модуль відстані -----
  const dist = {
    key: "dist", type: "chain", nameUk: "Модуль відстані", nameEn: "Distance modulus", find: "M",
    vars: [mag({ id: "m", s: "m" }, "Видима зоряна величина", "Apparent magnitude", "напр.: −1,46"), mag({ id: "M", s: "M" }, "Абсолютна зоряна величина", "Absolute magnitude", ""), mag({ id: "mu", s: "μ" }, "Модуль відстані m − M", "Distance modulus m − M", ""), V("d", "d", "Відстань", "Distance", ["парсеків", "parsecs"], U.pc, "напр.: 2,64")],
    formulas: [
      F("mu", "m,M", "μ = m − M", (a) => X.sub(a.m, a.M)), F("m", "M,mu", "m = M + μ", (a) => X.add(a.M, a.mu)), F("M", "m,mu", "M = m − μ", (a) => X.sub(a.m, a.mu)),
      F("mu", "d", "μ = 5 · lg d − 5", (a) => X.sub(X.mul(FIVE, X.log10(a.d)), FIVE), { note: ["Модуль відстані: m − M = 5·lg(d/10 пк). Абсолютна величина — це видима величина зорі, якби вона була на відстані 10 парсеків.", "The distance modulus: m − M = 5·lg(d / 10 pc). The absolute magnitude is the apparent magnitude the star would have at a distance of 10 parsecs."] }),
      F("d", "mu", "d = 10^((μ + 5) / 5)", (a) => X.pow10(X.div(X.add(a.mu, FIVE), FIVE)))
    ],
    chips: [{ uk: "Сіріус", en: "Sirius", find: "M", vals: { m: "-1.46", d: "2.64" } }, { uk: "Вега", en: "Vega", find: "M", vals: { m: "0.03", d: "7.68" } }, { uk: "Сонце", en: "The Sun", find: "d", vals: { m: "-26.74", M: "4.83", d: "|3" } }, { uk: "Полярна зоря", en: "Polaris", find: "M", vals: { m: "1.98", d: "133" } }],
    hint: ["Видима величина m — те, як зорю бачимо із Землі; абсолютна M — як виглядала б на відстані 10 парсеків. Чим менша величина, тим яскравіша зоря: Сіріус має m = −1,46, а найслабші зорі, видимі оком, близько +6.", "The apparent magnitude m is how we see the star from the Earth; the absolute magnitude M is how it would look at a distance of 10 parsecs. The smaller the magnitude, the brighter the star: Sirius has m = −1.46 and the faintest naked-eye stars are about +6."],
    example: { find: "M", vals: { m: "-1.46", d: "2.64" } }
  };

  // ----- відношення яскравостей -----
  const flux = {
    key: "flux", type: "chain", nameUk: "Відношення яскравостей", nameEn: "Brightness ratio", find: "k",
    vars: [mag({ id: "m1", s: "m₁" }, "Величина першої зорі", "Magnitude of the first star", "напр.: 1"), mag({ id: "m2", s: "m₂" }, "Величина другої зорі", "Magnitude of the second star", "напр.: 6"), mag({ id: "dm", s: "Δm" }, "Різниця m₂ − m₁", "Difference m₂ − m₁", ""), V("k", "k", "У скільки разів перша яскравіша", "How many times the first is brighter", ["(разів)", "(times)"], [u("(разів)", "(times)", 1)], "", "pos")],
    formulas: [
      F("dm", "m1,m2", "Δm = m₂ − m₁", (a) => X.sub(a.m2, a.m1)), F("m2", "m1,dm", "m₂ = m₁ + Δm", (a) => X.add(a.m1, a.dm)), F("m1", "m2,dm", "m₁ = m₂ − Δm", (a) => X.sub(a.m2, a.dm)),
      F("k", "dm", "k = 10^(0,4 · Δm)", (a) => X.pow10(X.mul(K("0.4"), a.dm)), { note: ["Закон Погсона: різниця в 5 зоряних величин відповідає різниці яскравості рівно в 100 разів, тому одна величина — це ≈ 2,512 разу.", "Pogson's law: a difference of 5 magnitudes corresponds to a brightness ratio of exactly 100, so one magnitude is about 2.512 times."] }),
      F("dm", "k", "Δm = 2,5 · lg k", (a) => X.mul(K("2.5"), X.log10(a.k)))
    ],
    chips: [{ uk: "Сонце проти Місяця", en: "Sun vs full Moon", find: "k", vals: { m1: "-26.74", m2: "-12.74" } }, { uk: "Вега проти Полярної", en: "Vega vs Polaris", find: "k", vals: { m1: "0.03", m2: "1.98" } }, { uk: "Межа ока й телескоп", en: "Naked eye vs telescope", find: "k", vals: { m1: "6", m2: "12" } }],
    hint: ["Величини зворотні до яскравості: менша величина означає яскравішу зорю. Різниця в 5 величин — це 100 разів, різниця в 1 величину — приблизно 2,512 разу.", "Magnitudes run opposite to brightness: a smaller magnitude means a brighter star. A difference of 5 magnitudes is a factor of 100, a difference of 1 magnitude is about 2.512."],
    example: { find: "k", vals: { m1: "1", m2: "6" } }
  };

  // ----- світність зорі -----
  const lum = {
    key: "lum", type: "chain", nameUk: "Світність за радіусом і температурою", nameEn: "Luminosity from radius and temperature", find: "Ls",
    vars: [V("R", "R", "Радіус зорі", "Stellar radius", ["R☉", "R☉"], U.rs, "напр.: 1"), V("T", "T", "Температура поверхні", "Surface temperature", ["К", "K"], [u("К", "K", 1)], "напр.: 5772"), V("Ls", "L", "Світність", "Luminosity", ["L☉", "L☉"], U.ls, "")],
    formulas: [
      F("Ls", "R,T", "L = R² · (T / 5772)⁴", (a) => X.mul(X.sq(a.R), X.sq(X.sq(X.div(a.T, TS)))), { note: ["Закон Стефана–Больцмана L = 4πR²σT⁴ у сонячних одиницях: L☉ — світність Сонця, T☉ = 5772 К, R☉ = 695 700 км (номінальні значення IAU).", "The Stefan–Boltzmann law L = 4πR²σT⁴ in solar units: L☉ is the luminosity of the Sun, T☉ = 5772 K, R☉ = 695,700 km (IAU nominal values)."] }),
      F("R", "Ls,T", "R = √L · (5772 / T)²", (a) => soft(X.mul(X.sqrt(a.Ls), X.sq(X.div(TS, a.T))))), F("T", "Ls,R", "T = 5772 · (L / R²)^¼", (a) => soft(X.mul(TS, X.sqrt(X.sqrt(X.div(a.Ls, X.sq(a.R)))))))
    ],
    chips: [{ uk: "Сонце", en: "The Sun", find: "Ls", vals: { R: "1", T: "5772" } }, { uk: "Сіріус A", en: "Sirius A", find: "Ls", vals: { R: "1.711", T: "9940" } }, { uk: "Бетельгейзе", en: "Betelgeuse", find: "Ls", vals: { R: "764", T: "3600" } }, { uk: "Проксима Центавра", en: "Proxima Centauri", find: "Ls", vals: { R: "0.154", T: "3042" } }],
    hint: ["Світність росте як квадрат радіуса й четверта степінь температури: подвоєння температури дає 16 разів більше енергії. Значення для зір (кнопки) наближені — візьміть точніші з каталогів.", "The luminosity grows as the square of the radius and the fourth power of the temperature: doubling the temperature gives 16 times more energy. The values for the stars (buttons) are approximate — take more precise ones from catalogues."],
    example: { find: "Ls", vals: { R: "1.711", T: "9940" } }
  };

  // ----- світність і абсолютна величина -----
  const mabs = {
    key: "mabs", type: "chain", nameUk: "Світність і абсолютна величина", nameEn: "Luminosity and absolute magnitude", find: "Ls",
    vars: [mag({ id: "M", s: "Mbol" }, "Абсолютна болометрична величина", "Absolute bolometric magnitude", "напр.: 4,74"), V("Ls", "L", "Світність", "Luminosity", ["L☉", "L☉"], U.ls, "напр.: 1")],
    formulas: [
      F("Ls", "M", "L = 10^(0,4 · (4,74 − Mbol))", (a) => X.pow10(X.mul(K("0.4"), X.sub(MB, a.M))), { note: ["Відлік абсолютної болометричної величини прив'язаний до Сонця: Mbol☉ = 4,74 (номінальне значення IAU).", "The absolute bolometric magnitude scale is tied to the Sun: Mbol☉ = 4.74 (IAU nominal value)."] }),
      F("M", "Ls", "Mbol = 4,74 − 2,5 · lg L", (a) => X.sub(MB, X.mul(K("2.5"), X.log10(a.Ls))))
    ],
    chips: [{ uk: "Сонце (M = 4,74)", en: "The Sun (M = 4.74)", find: "Ls", vals: { M: "4.74" } }, { uk: "Світність 100 L☉", en: "Luminosity 100 L☉", find: "M", vals: { Ls: "100" } }],
    hint: ["Світність у сонячних одиницях зв'язана з абсолютною болометричною величиною співвідношенням Погсона. Сонце має Mbol = 4,74; зоря з M = −0,26 у 100 разів яскравіша за Сонце.", "Luminosity in solar units is tied to the absolute bolometric magnitude by Pogson's relation. The Sun has Mbol = 4.74; a star with M = −0.26 is 100 times more luminous than the Sun."],
    example: { find: "Ls", vals: { M: "-0.26" } }
  };
  return { modes: [dist, flux, lum, mabs] };
});
