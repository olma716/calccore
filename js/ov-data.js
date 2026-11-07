/* ov-data.js — температура духовки: Цельсій, Фаренгейт, газова марка (інтерполяція по таблиці), духовка з вентилятором, пошук температур у тексті рецепта; залежить від km-data.js */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis, K = root.Km, L = K.L, IS_EN = L(false, true), DEC = IS_EN ? "." : ",";
  // [марка, °C, °F]: таблиця для звичайної (не вентиляторної) духовки; марка 3 = 170 °C (Currys), Which? дає 160 °C
  const GAS = [[0.25, 110, 225], [0.5, 120, 250], [1, 140, 275], [2, 150, 300], [3, 170, 325], [4, 180, 350], [5, 190, 375], [6, 200, 400], [7, 220, 425], [8, 230, 450], [9, 240, 475]];
  const NAMES = [["Дуже слабка", "Very cool"], ["Дуже слабка", "Very cool"], ["Слабка", "Cool"], ["Слабка", "Cool"], ["Тепла", "Warm"], ["Помірна", "Moderate"], ["Помірно гаряча", "Moderately hot"], ["Помірно гаряча", "Moderately hot"], ["Гаряча", "Hot"], ["Гаряча", "Hot"], ["Дуже гаряча", "Very hot"]].map(([u, e]) => L(u, e));
  const cToF = (c) => (c * 9) / 5 + 32, fToC = (f) => ((f - 32) * 5) / 9;
  const EPS = 1e-9;

  function gmToC(gm) {
    if (!(gm >= 0.25 - EPS && gm <= 9 + EPS)) return null;
    for (let i = 0; i < GAS.length - 1; i++) { const a = GAS[i], b = GAS[i + 1]; if (gm <= b[0] + EPS) return a[1] + ((gm - a[0]) / (b[0] - a[0])) * (b[1] - a[1]); }
    return 240;
  }
  // марка за °C: {v} усередині шкали, {below}/{above} поза нею
  function cToGm(c) {
    if (c < GAS[0][1] - EPS) return { below: true };
    if (c > 240 + EPS) return { above: true };
    for (let i = 0; i < GAS.length - 1; i++) { const a = GAS[i], b = GAS[i + 1]; if (c <= b[1] + EPS) return { v: a[0] + ((c - a[1]) / (b[1] - a[1])) * (b[0] - a[0]) }; }
    return { v: 9 };
  }
  const lerp = (x, xi, yi) => { for (let i = 0; i < GAS.length - 1; i++) { const a = GAS[i], b = GAS[i + 1]; if (x <= b[xi] + EPS) return a[yi] + ((x - a[xi]) / (b[xi] - a[xi])) * (b[yi] - a[yi]); } return GAS[GAS.length - 1][yi]; };
  const gmToF = (gm) => (gm >= 0.25 - EPS && gm <= 9 + EPS ? lerp(gm, 0, 2) : null);
  function fToGm(f) { if (f < GAS[0][2] - EPS) return { below: true }; if (f > 475 + EPS) return { above: true }; return { v: lerp(f, 2, 0) }; }
  // назва режиму: найвищий рядок таблиці, що не перевищує температуру
  function descAt(c) {
    if (c < GAS[0][1] - EPS) return L("нижче шкали газової марки", "below the gas mark scale");
    let k = 0; for (let i = 0; i < GAS.length; i++) if (GAS[i][1] <= c + EPS) k = i;
    return NAMES[k];
  }
  const roundStep = (x, s) => Math.round(x / s) * s;
  const fracOr = (x) => { const fr = K.fracText(x); return fr || (Math.round(x * 10) / 10).toString().replace(".", DEC); };
  // «3 ½», «¼», «4»
  const gmText = (x) => (Math.abs(x - Math.round(x)) < 0.02 ? String(Math.round(x)) : fracOr(x));
  const gmCompact = (x) => gmText(x).replace(" ", "");
  const roundGm = (x) => (x < 1 ? Math.round(x * 4) / 4 : Math.round(x * 2) / 2);
  // положення на шкалі: точна марка чи «між 3 і 4»
  function bracket(c) {
    const g = cToGm(c); if (g.below || g.above) return null;
    for (const r of GAS) if (Math.abs(r[1] - c) < 0.5) return { exact: r };
    for (let i = 0; i < GAS.length - 1; i++) if (c > GAS[i][1] && c < GAS[i + 1][1]) return { lo: GAS[i], hi: GAS[i + 1] };
    return null;
  }

  // значення в трьох шкалах для звичайної й вентиляторної духовки; val у шкалі unit ("c", "f", "g"), type "conv" чи "fan" — для якої духовки вказано значення
  function build(val, unit, type, dC, dF) {
    let convC, convF, fanC, fanF;
    if (unit === "f") { convF = type === "fan" ? val + dF : val; fanF = convF - dF; convC = fToC(convF); fanC = fToC(fanF); }
    else if (unit === "g") { const c0 = gmToC(val), f0 = gmToF(val); convC = type === "fan" ? c0 + dC : c0; convF = type === "fan" ? f0 + dF : f0; fanC = convC - dC; fanF = convF - dF; }
    else { convC = type === "fan" ? val + dC : val; fanC = convC - dC; convF = cToF(convC); fanF = cToF(fanC); }
    const mk = (c, f) => ({ c, f, gm: unit === "f" ? fToGm(f) : cToGm(c) });
    return { conv: mk(convC, convF), fan: mk(fanC, fanF) };
  }

  // ---------- температури в тексті ----------
  const NUM = "(?<![\\d.,])(\\d{2,3}(?:[.,]\\d+)?)", RNG = "(?:\\s*[-–—]\\s*(\\d{2,3}(?:[.,]\\d+)?))?", DEG = "[°º˚]";
  const RXS = [
    { kind: "unit", re: new RegExp(NUM + RNG + "\\s*" + DEG + "\\s*([CFcfСс])(?![\\p{L}\\p{N}])", "gu") },
    { kind: "word", re: new RegExp(NUM + RNG + "\\s*(?:degrees?|градус\\p{L}*)(?:\\s+(C|F|Celsius|Fahrenheit|Цельсі\\p{L}*|Фаренгейт\\p{L}*))?(?![\\p{L}\\p{N}])", "giu") },
    { kind: "bare", re: new RegExp("(?<![\\p{L}\\p{N}.,])(\\d{3})()\\s?([CF])(?![\\p{L}\\p{N}])", "gu") },
    { kind: "deg", re: new RegExp(NUM + RNG + "\\s*" + DEG + "(?!\\s*[CFcfСс])", "gu") },
    { kind: "gas", re: new RegExp("(?:gas\\s*mark|gas|\\bGM\\b|газов\\p{L}*\\s*мар[кц]\\p{L}*|мар[кц]\\p{L}*)\\s*[:№#]?\\s*(\\d+(?:[.,]\\d+)?|[¼½]|1/[24])(?![\\d.,/])", "giu") }
  ];
  const num = (s) => parseFloat(String(s).replace(",", "."));
  const unitOf = (s, def) => (!s ? def : /^(c|с|цельс)/i.test(s) ? "c" : /^(f|фаренг)/i.test(s) ? "f" : def);
  function findTemps(text, defScale) {
    const found = [];
    for (const { kind, re } of RXS) {
      re.lastIndex = 0; let m;
      while ((m = re.exec(text))) {
        if (m[0] === "") { re.lastIndex++; continue; }
        const it = { start: m.index, end: m.index + m[0].length, raw: m[0], kind };
        if (kind === "gas") { const g = m[1] === "¼" || m[1] === "1/4" ? 0.25 : m[1] === "½" || m[1] === "1/2" ? 0.5 : num(m[1]); if (!(g >= 0.25 && g <= 9)) continue; it.unit = "g"; it.a = g; }
        else {
          it.a = num(m[1]); it.b = kind === "bare" ? undefined : m[2] !== undefined && m[2] !== "" ? num(m[2]) : undefined;
          it.unit = kind === "deg" ? defScale : kind === "bare" ? unitOf(m[3], defScale) : unitOf(m[kind === "unit" ? 3 : 3], defScale);
          it.assumed = kind === "deg" || (kind === "word" && !m[3]);
          const lim = it.unit === "f" ? [120, 800] : [50, 400];
          if (!(it.a >= lim[0] && it.a <= lim[1]) || (it.b !== undefined && !(it.b >= lim[0] && it.b <= lim[1] && it.b > it.a))) continue;
        }
        found.push(it);
      }
    }
    found.sort((x, y) => x.start - y.start || y.end - x.end);
    const out = []; let last = -1;
    for (const f of found) if (f.start >= last) { out.push(f); last = f.end; }
    return out;
  }
  // перерахунок одного значення: from/to — «conv» чи «fan», target — "c", "f", "g"
  function convertOne(a, unit, target, o) {
    const c0 = unit === "g" ? gmToC(a) : unit === "f" ? fToC(a) : a;
    let v = a, shift = (o.from === "fan" ? 1 : 0) - (o.to === "fan" ? 1 : 0);
    // зсув для вентилятора виконуємо в тій шкалі, в якій вказано значення
    if (unit === "f") v = a + shift * o.dF; else if (unit === "c") v = a + shift * o.dC; else v = null;
    const cEff = unit === "f" ? fToC(v) : unit === "c" ? v : c0 + shift * o.dC;
    if (target === unit && shift === 0) return { same: true, txt: null };
    if (target === "c") return { c: cEff, txt: (o.step ? roundStep(cEff, 5) : Math.round(cEff)) + " °C" };
    if (target === "f") { const f = unit === "f" ? v : unit === "g" ? gmToF(a) + shift * o.dF : cToF(cEff); return { c: cEff, txt: (o.step ? roundStep(f, 25) : Math.round(f)) + " °F" }; }
    const g = unit === "f" ? fToGm(v) : cToGm(cEff); if (g.below || g.above) return { c: cEff, out: true, txt: null };
    return { c: cEff, txt: L("Gas Mark ", "gas mark ") + gmCompact(roundGm(g.v)) };
  }
  function convertText(text, o) {
    const list = findTemps(text, o.def), rows = []; let res = "", pos = 0;
    for (const t of list) {
      res += text.slice(pos, t.start); pos = t.end;
      const r1 = convertOne(t.a, t.unit, o.target, o), r2 = t.b !== undefined ? convertOne(t.b, t.unit, o.target, o) : null;
      let repl = t.raw, state = "ok";
      if (r1.out || (r2 && r2.out)) state = "out";
      else if (r1.same) state = "same";
      else if (r2) { const cut = r1.txt.lastIndexOf(" ") + 1; repl = o.target === "g" ? r1.txt.slice(0, cut) + r1.txt.slice(cut) + "–" + r2.txt.slice(r2.txt.lastIndexOf(" ") + 1) : r1.txt.split(" ")[0] + "–" + r2.txt; }
      else repl = r1.txt;
      res += repl; rows.push({ raw: t.raw, repl, state, assumed: !!t.assumed, c: r1.c, unit: t.unit });
    }
    res += text.slice(pos);
    return { text: res, rows };
  }
  root.Ov = { gmToF, fToGm, GAS, NAMES, cToF, fToC, gmToC, cToGm, descAt, roundStep, gmText, gmCompact, roundGm, bracket, build, findTemps, convertText, convertOne };
})();
