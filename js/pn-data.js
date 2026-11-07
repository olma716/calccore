/* pn-data.js — розмір форми для випічки: площа й об'єм круглої, квадратної, прямокутної форми й кільця (бундт), рівнозначні форми, стандартні форми (номінальні розміри), діапазон тіста */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis, K = root.Km, L = K.L, IS_EN = L(false, true), DEC = IS_EN ? "." : ",";
  const IN = 2.54;
  // розміри у вибраній одиниці u ("cm" чи "in"); площа в одиницях², перерахунок у см²
  const toCm = (x, u) => (u === "in" ? x * IN : x);
  // форми: round {d}, square {s}, rect {l, w}, ring {d, h — діаметр отвору}
  function areaOf(shape, v) {
    if (shape === "round") return Math.PI * (v.d / 2) ** 2;
    if (shape === "square") return v.s * v.s;
    if (shape === "rect") return v.l * v.w;
    if (shape === "ring") return Math.PI * ((v.d / 2) ** 2 - (v.h / 2) ** 2);
    return NaN;
  }
  const areaCm2 = (shape, v, u) => areaOf(shape, v) * (u === "in" ? IN * IN : 1);
  const volMl = (a, depth, u) => a * toCm(depth, u); // см² × см = мл
  // рівнозначні за площею розміри (см)
  const eqRoundD = (a) => 2 * Math.sqrt(a / Math.PI), eqSquareS = (a) => Math.sqrt(a), eqRectL = (a, w) => a / w;
  // стандартні форми: номінальні розміри; u — рідна одиниця
  const STD = [
    ["r8", "round", { d: 8 }, "in", "us"], ["r9", "round", { d: 9 }, "in", "us"], ["r10", "round", { d: 10 }, "in", "us"], ["s8", "square", { s: 8 }, "in", "us"], ["s9", "square", { s: 9 }, "in", "us"], ["b9x13", "rect", { l: 13, w: 9 }, "in", "us"], ["loaf", "rect", { l: 9, w: 5 }, "in", "us"],
    ["r18", "round", { d: 18 }, "cm", "eu"], ["r20", "round", { d: 20 }, "cm", "eu"], ["r22", "round", { d: 22 }, "cm", "eu"], ["r24", "round", { d: 24 }, "cm", "eu"], ["r26", "round", { d: 26 }, "cm", "eu"], ["r28", "round", { d: 28 }, "cm", "eu"],
    ["s20", "square", { s: 20 }, "cm", "eu"], ["s22", "square", { s: 22 }, "cm", "eu"], ["s24", "square", { s: 24 }, "cm", "eu"], ["b20x30", "rect", { l: 30, w: 20 }, "cm", "eu"]
  ].map(([id, shape, v, u, reg]) => {
    const a = areaCm2(shape, v, u), q = (x) => String(Math.round(x * 10) / 10).replace(".", DEC), mark = u === "in" ? "″" : " " + L("см", "cm");
    const nat = shape === "round" ? v.d + mark : shape === "square" ? v.s + "×" + v.s + mark : v.w + "×" + v.l + mark;
    const cmTxt = u === "in" ? " (" + (shape === "round" ? q(v.d * IN) : shape === "square" ? q(v.s * IN) + "×" + q(v.s * IN) : q(v.w * IN) + "×" + q(v.l * IN)) + " " + L("см", "cm") + ")" : "";
    const kind = L({ round: "Кругла", square: "Квадратна", rect: "Прямокутна" }[shape], { round: "Round", square: "Square", rect: "Rectangular" }[shape]);
    return { id, shape, v, u, reg, area: a, name: (id === "loaf" ? L("Буханка ", "Loaf ") : kind + " ") + nat + cmTxt };
  });
  const std = (id) => STD.find((x) => x.id === id) || null;
  // найближчі стандартні форми за площею
  const nearest = (a, n) => STD.slice().sort((x, y) => Math.abs(Math.log(x.area / a)) - Math.abs(Math.log(y.area / a))).slice(0, n);
  // діапазон тіста для об'єму форми: ½–⅔ (Food Network), до ¾ (King Arthur)
  const FILL = { lo: 1 / 2, hi: 2 / 3, max: 3 / 4 };
  const fillRange = (v) => [v * FILL.lo, v * FILL.hi, v * FILL.max];
  const sq = (c) => c.toFixed(1);
  root.Pn = { IN, areaOf, areaCm2, volMl, toCm, eqRoundD, eqSquareS, eqRectL, STD, std, nearest, FILL, fillRange, sq };
})();
