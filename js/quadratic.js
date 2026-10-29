/* quadratic.js — калькулятор квадратного рівняння: п'ять режимів (розв'язати, вершина й графік, розкладання на множники, рівняння за коренями, нерівність), розв'язання по кроках, графік параболи (UK/EN)
   Коефіцієнти: цілі, десяткові (0,5) або дроби (3/4), точні раціональні числа на BigInt. D = b² − 4ac; корені раціональні, у вигляді (P ± Q√m)/S із спрощеним коренем або комплексні (D < 0).
   Радикал: рівняння домножується на НСК знаменників і скорочується на НСД, D (ціле) = k²·m, √D = k√m (квадрати простих до 10⁵, залишок перевіряється на повний квадрат).
   Наближені значення: цілочисельний √ із масштабуванням 10²⁰, округлення до 10 знаків. Вершина: x₀ = −b/(2a), y₀ = c − b²/(4a). Нерівність: знак f(x) поза коренями дорівнює знаку a. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const SEP = IS_EN ? "." : ",";
  const MODES = ["solve", "vertex", "factor", "roots", "ineq"];
  const MAXD = 30;
  let mode = "solve";

  const T = {
    enter: L("Вкажіть дані — результат з'явиться тут.", "Enter your data — the result will appear here."),
    copied: L("Результат скопійовано ✅", "Result copied ✅"),
    copyFailed: L("Не вдалось скопіювати 😕", "Could not copy 😕"),
    linkCopied: L("Посилання скопійовано ✅", "Link copied ✅"),
    reset: L("Скинуто ✅", "Reset ✅"),
    example: L("Підставлено приклад ✅", "Example filled in ✅"),
    calcFirst: L("Спочатку порахуйте результат.", "Calculate first.")
  };

  // ===== раціональні числа на BigInt =====
  const Z = 0n, O = 1n;
  const babs = (x) => (x < Z ? -x : x);
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  const q = (n, d = O) => { if (d < Z) { n = -n; d = -d; } const g = gcd(n, d) || O; return { n: n / g, d: d / g }; };
  const add = (x, y) => q(x.n * y.d + y.n * x.d, x.d * y.d);
  const sub = (x, y) => q(x.n * y.d - y.n * x.d, x.d * y.d);
  const mul = (x, y) => q(x.n * y.n, x.d * y.d);
  const div = (x, y) => q(x.n * y.d, x.d * y.n);
  const neg = (x) => ({ n: -x.n, d: x.d });
  const sg = (x) => (x.n < Z ? -1 : x.n > Z ? 1 : 0);
  const cmp = (x, y) => sg(sub(x, y));
  const isZ = (x) => x.n === Z;
  const R = (n) => ({ n: BigInt(n), d: O });
  const fs = (x) => (x.d === O ? String(x.n) : x.n + "/" + x.d);
  const par = (x) => (x.n < Z || x.d !== O ? "(" + fs(x) + ")" : fs(x));
  const isqrt = (n) => { if (n < 2n) return n; let x = 1n << BigInt((n.toString(2).length + 1) >> 1), y = (x + n / x) >> 1n; while (y < x) { x = y; y = (x + n / x) >> 1n; } return x; };
  const perfSq = (r) => { if (r.n < Z) return null; const sn = isqrt(r.n), sd = isqrt(r.d); return sn * sn === r.n && sd * sd === r.d ? q(sn, sd) : null; };
  const toNum = (r) => Number(r.n) / Number(r.d);
  // десятковий запис: { t, exact }
  function decTxt(x, places = 10) {
    const pw = 10n ** BigInt(places), a = babs(x.n) * pw;
    let v = a / x.d;
    const rem = a % x.d;
    const exact = rem === Z;
    if (!exact && rem * 2n >= x.d) v += 1n;
    let s = v.toString().padStart(places + 1, "0");
    let ip = s.slice(0, s.length - places), fr = s.slice(s.length - places).replace(/0+$/, "");
    const mn = x.n < Z && (v !== Z) ? "-" : "";
    return { t: mn + ip + (fr ? SEP + fr : ""), exact };
  }
  const dsub = (x) => (x.d === O ? "" : (decTxt(x).exact ? "= " : "≈ ") + decTxt(x).t);
  const dvert = (x, y) => { if (x.d === O && y.d === O) return ""; const p = decTxt(x), q = decTxt(y); return (p.exact && q.exact ? "= " : "≈ ") + "(" + p.t + "; " + q.t + ")"; };
  const dtx = (x) => { const d = decTxt(x); return (d.exact ? "" : "≈ ") + d.t; };

  // ===== розбір коефіцієнта: ціле, десяткове (0,5), дріб (3/4) =====
  const NUM = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/;
  function parseDec(s) {
    if (!NUM.test(s)) return null;
    if (s.replace(/[+\-.,]/g, "").length > MAXD) return "long";
    const neg = s[0] === "-", t = s.replace(/^[+-]/, "").replace(",", "."), [ip, fp = ""] = t.split(".");
    const n = BigInt((ip || "0") + fp), d = 10n ** BigInt(fp.length);
    return q(neg ? -n : n, d);
  }
  function parseRat(raw) {
    const s = String(raw || "").trim();
    if (!s) return { empty: true };
    const parts = s.split("/");
    if (parts.length > 2) return { err: L("«" + s.slice(0, 14) + "» не підходить: потрібне число або дріб a/b.", "“" + s.slice(0, 14) + "” is not valid: use a number or a fraction a/b.") };
    const p = parts.map((x) => parseDec(x.trim()));
    if (p.some((x) => x === null)) return { err: L("«" + s.slice(0, 14) + "» не підходить: потрібне число або дріб a/b.", "“" + s.slice(0, 14) + "” is not valid: use a number or a fraction a/b.") };
    if (p.some((x) => x === "long")) return { err: L("Не більше " + MAXD + " цифр у числі.", "At most " + MAXD + " digits in a number.") };
    if (p.length === 2) { if (isZ(p[1])) return { err: L("Знаменник не може дорівнювати нулю.", "The denominator cannot be zero.") }; return { v: div(p[0], p[1]) }; }
    return { v: p[0] };
  }
  const val = (id, label) => { const r = parseRat(el(id).value); if (r.err) return { err: label + ": " + r.err }; if (r.empty) return { miss: label }; return { v: r.v }; };

  // ===== вирази: рівняння, радикали =====
  const MN = "−";
  function coefTxt(x, isFirst, sym) { // x ≠ 0
    const abs = { n: babs(x.n), d: x.d };
    let c = abs.n === abs.d ? "" : abs.d === O ? String(abs.n) : "(" + fs(abs) + ")";
    return (x.n < Z ? (isFirst ? MN : " " + MN + " ") : isFirst ? "" : " + ") + c + sym;
  }
  function eqTxt(a, b, c) {
    let s = "";
    if (!isZ(a)) s += coefTxt(a, true, "x²");
    if (!isZ(b)) s += s ? coefTxt(b, false, "x") : coefTxt(b, true, "x");
    if (!isZ(c) || !s) s += s ? (c.n < Z ? " " + MN + " " : " + ") + fs({ n: babs(c.n), d: c.d }) : fs(c).replace("-", MN);
    return s + " = 0";
  }
  function simplifyRadical(m) { // m > 0 → { k, m }
    let k = O, rem = m;
    for (let p = 2n; p <= 100000n && p * p <= rem; p++) {
      const p2 = p * p;
      while (rem % p2 === Z) { rem /= p2; k *= p; }
    }
    if (rem > O) { const s = isqrt(rem); if (s * s === rem) { k *= s; rem = O; } }
    return { k, m: rem };
  }
  // корені (P ± Q√m)/S для D, що не є повним квадратом; coef — раціональні a, b, c
  function radicalRoots(a, b, c) {
    const Lc = lcm(lcm(a.d, b.d), c.d);
    let A = a.n * (Lc / a.d), B = b.n * (Lc / b.d), C = c.n * (Lc / c.d);
    const g = gcd(gcd(A, B), C) || O;
    A /= g; B /= g; C /= g;
    const Dint = B * B - 4n * A * C, isNeg = Dint < Z;
    const { k, m } = simplifyRadical(babs(Dint));
    const G = gcd(gcd(B, k), 2n * A) || O;
    let P = -B / G, Qv = k / G, S = (2n * A) / G;
    if (S < Z) { S = -S; P = -P; }
    return { P, Q: Qv, m, S, neg: isNeg, Dint, k };
  }
  function radTxt(r, sign, imag) {
    const p = r.P !== Z ? String(r.P) : "";
    const sym = sign === "-" ? "-" : sign === "±" ? "±" : p ? "+" : "";
    const body = (r.Q === O ? "" : String(r.Q)) + (r.m === O ? "" : "√" + r.m) + (imag ? "i" : "");
    const num = p + sym + (body || "1");
    return r.S > O ? (p ? "(" + num + ")/" + r.S : num + "/" + r.S) : num;
  }
  // наближення (P ± Q√m)/S
  function radApprox(r, sign) {
    const pw = 10n ** 20n, sm = isqrt(r.m * pw * pw);
    return q(r.P * pw + BigInt(sign) * r.Q * sm, r.S * pw);
  }
  const vf = (num, den) => (den === undefined || den === "1" ? '<span class="qdr__int">' + esc(num) + "</span>" : '<span class="qdr__f"><span class="qdr__fn">' + esc(num) + '</span><span class="qdr__fd">' + esc(den) + "</span></span>");
  const vfr = (x) => (x.d === O ? vf(String(x.n)) : vf(String(x.n), String(x.d)));
  const vrad = (r, sign, imag) => { const p = r.P !== Z ? String(r.P) : ""; const sym = sign === "-" ? (p ? " - " : "-") : sign === "±" ? " ± " : p ? " + " : ""; const body = (r.Q === O ? "" : String(r.Q)) + (r.m === O ? "" : "√" + r.m) + (imag ? "i" : ""); const num = p + sym + (body || "1"); return vf(num, r.S > O ? String(r.S) : undefined); };

  // ===== аналіз рівняння a x² + b x + c = 0 (a ≠ 0) =====
  function analyze(a, b, c) {
    const D = sub(mul(b, b), mul(R(4), mul(a, c)));
    const twoA = mul(R(2), a);
    const x0 = neg(div(b, twoA)), y0 = sub(c, div(mul(b, b), mul(R(4), a)));
    const o = { a, b, c, D, twoA, x0, y0 };
    if (isZ(D)) { o.kind = "one"; o.x1 = x0; o.x2 = x0; return o; }
    if (D.n > Z) {
      const s = perfSq(D);
      if (s) { o.kind = "two"; o.rational = true; o.sqrtD = s; o.x1 = div(add(neg(b), s), twoA); o.x2 = div(sub(neg(b), s), twoA); }
      else { o.kind = "two"; o.rational = false; o.rad = radicalRoots(a, b, c); }
      return o;
    }
    const sq = perfSq(neg(D));
    if (sq) { o.kind = "complex"; o.rational = true; o.re = x0; o.im = div(sq, babs2(twoA)); }
    else { o.kind = "complex"; o.rational = false; o.rad = radicalRoots(a, b, c); }
    return o;
  }
  const babs2 = (x) => ({ n: babs(x.n), d: x.d });
  const pm = (sign) => (sign > 0 ? "+" : "-");

  // ===== кроки, відображення =====
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const step = (t, lines, note) => ({ t, l: lines, note });
  const SUB = ["₁", "₂"];

  function rootStrings(o) { // [{ exact, approx }] або комплексні
    if (o.kind === "one") return [{ name: "x", ex: fs(o.x0), ap: o.x0.d === O ? "" : dtx(o.x0) }];
    if (o.kind === "two" && o.rational) return [o.x1, o.x2].map((x, i) => ({ name: "x" + SUB[i], ex: fs(x), ap: x.d === O ? "" : dtx(x) }));
    if (o.kind === "two") return [1, -1].map((sg2, i) => ({ name: "x" + SUB[i], ex: radTxt(o.rad, pm(sg2)), ap: dtx(radApprox(o.rad, sg2)) }));
    if (o.rational) return [1, -1].map((s2, i) => ({ name: "x" + SUB[i], ex: complexRatTxt(o, s2), ap: "" }));
    return [1, -1].map((s2, i) => ({ name: "x" + SUB[i], ex: radTxt(o.rad, pm(s2), true), ap: "" }));
  }
  const complexRatTxt = (o, s2) => (isZ(o.re) ? "" : fs(o.re) + (s2 > 0 ? " + " : " - ")) + (isZ(o.re) && s2 < 0 ? "-" : "") + (o.im.n === o.im.d ? "" : o.im.d === O ? String(o.im.n) : "(" + fs(o.im) + ")") + "i";

  function rootsStep(o, method) {
    const a = o.a, b = o.b, c = o.c, lines = [];
    if (o.kind === "one") {
      lines.push(L("D = 0, тому один (подвійний) корінь:", "D = 0, so there is one (double) root:"));
      lines.push("x = -b/(2a) = " + fs(neg(b)) + "/" + fs(o.twoA) + " = " + fs(o.x0));
      return step(L("Корінь", "The root"), lines);
    }
    if (o.kind === "two" && o.rational) {
      lines.push("√D = " + fs(o.sqrtD));
      lines.push("x = (-b ± √D)/(2a) = (" + fs(neg(b)) + " ± " + fs(o.sqrtD) + ")/(2·" + par(a) + ")");
      lines.push("x₁ = (" + fs(neg(b)) + " + " + fs(o.sqrtD) + ")/" + fs(o.twoA) + " = " + fs(o.x1));
      lines.push("x₂ = (" + fs(neg(b)) + " - " + fs(o.sqrtD) + ")/" + fs(o.twoA) + " = " + fs(o.x2));
      return step(L("Корені", "The roots"), lines, L("D — повний квадрат, тому корені раціональні.", "D is a perfect square, so the roots are rational."));
    }
    if (o.kind === "two") {
      const r = o.rad;
      lines.push(L("D не є повним квадратом, тому √D залишаємо під коренем.", "D is not a perfect square, so √D stays under the root."));
      if (r.k > O) lines.push(L("Спрощуємо: √" + babs(r.Dint) + " = " + r.k + "√" + r.m + " (для рівняння з цілими коефіцієнтами).", "Simplify: √" + babs(r.Dint) + " = " + r.k + "√" + r.m + " (for the equation with whole coefficients)."));
      lines.push("x = (-b ± √D)/(2a) = " + radTxt(r, "±"));
      lines.push("x₁ = " + radTxt(r, "+") + " " + dtx(radApprox(r, 1)));
      lines.push("x₂ = " + radTxt(r, "-") + " " + dtx(radApprox(r, -1)));
      return step(L("Корені", "The roots"), lines, L("Десяткові значення наближені.", "The decimal values are approximate."));
    }
    lines.push(L("D < 0, тому дійсних коренів немає. Комплексні корені (i² = -1):", "D < 0, so there are no real roots. Complex roots (i² = -1):"));
    if (o.rational) { lines.push("x = (-b ± i√|D|)/(2a)"); lines.push("x₁ = " + complexRatTxt(o, 1)); lines.push("x₂ = " + complexRatTxt(o, -1)); }
    else { lines.push("x = (-b ± i√|D|)/(2a) = " + radTxt(o.rad, "±", true)); lines.push("x₁ = " + radTxt(o.rad, "+", true)); lines.push("x₂ = " + radTxt(o.rad, "-", true)); }
    return step(L("Корені", "The roots"), lines);
  }
  function vietaStep(o) {
    const a = o.a, b = o.b, c = o.c, s = neg(div(b, a)), p = div(c, a);
    const lines = ["x₁ + x₂ = -b/a = " + fs(s), "x₁ · x₂ = c/a = " + fs(p)];
    if (o.kind === "two" && o.rational) lines.push(L("Перевірка: ", "Check: ") + fs(o.x1) + " + " + par(o.x2) + " = " + fs(add(o.x1, o.x2)) + ", " + fs(o.x1) + " · " + par(o.x2) + " = " + fs(mul(o.x1, o.x2)));
    return step(L("Теорема Вієта (перевірка)", "Vieta's formulas (check)"), lines);
  }

  // ---- режим «Розв'язати»
  function modeSolve(a, b, c) {
    const eq = eqTxt(a, b, c), steps = [];
    if (isZ(a)) return linearSolve(b, c, eq);
    const method = el("method").value;
    steps.push(step(L("Коефіцієнти", "Coefficients"), ["a = " + fs(a) + ", b = " + fs(b) + ", c = " + fs(c)], L("Запишіть рівняння у вигляді ax² + bx + c = 0.", "Write the equation as ax² + bx + c = 0.")));
    const o = analyze(a, b, c);
    const incomplete = isZ(b) || isZ(c);
    if (incomplete) {
      if (isZ(b) && isZ(c)) steps.push(step(L("Неповне рівняння", "Incomplete equation"), ["a·x² = 0  →  x² = 0  →  x = 0"], L("Подвійний корінь.", "A double root.")));
      else if (isZ(c)) steps.push(step(L("Неповне рівняння (c = 0)", "Incomplete equation (c = 0)"), ["a·x² + b·x = 0", "x·(a·x + b) = 0", "x = 0  або  a·x + b = 0  →  x = " + fs(neg(div(b, a)))], L("Виносимо x за дужки, добуток дорівнює нулю, коли один із множників нуль.", "Factor out x: a product is zero when one of its factors is zero.")));
      else steps.push(step(L("Неповне рівняння (b = 0)", "Incomplete equation (b = 0)"), ["a·x² + c = 0", "x² = -c/a = " + fs(neg(div(c, a)))], L("Далі беремо квадратний корінь з обох частин.", "Then take the square root of both sides.")));
    }
    if (method === "square" && !incomplete) {
      const ba = div(b, a), ca = div(c, a), h = div(ba, R(2)), h2 = mul(h, h), rhs = sub(h2, ca);
      steps.push(step(L("Виділяємо повний квадрат", "Complete the square"), [
        L("Ділимо на a:  x² + (b/a)x + c/a = 0", "Divide by a:  x² + (b/a)x + c/a = 0"),
        "x² + " + par(ba) + "x + " + par(ca) + " = 0",
        L("Додаємо й віднімаємо (b/(2a))² = ", "Add and subtract (b/(2a))² = ") + fs(h2),
        "(x + " + par(h) + ")² = " + fs(h2) + " - " + par(ca) + " = " + fs(rhs)
      ], L("Ліва частина стала квадратом двочлена.", "The left side is now the square of a binomial.")));
      steps.push(step(L("Дискримінант", "The discriminant"), ["D = b² - 4ac = " + fs(o.D), L("(x + " + par(h) + ")² = D/(4a²)", "(x + " + par(h) + ")² = D/(4a²)")]));
    } else {
      steps.push(step(L("Дискримінант", "The discriminant"), ["D = b² - 4ac = " + par(b) + "² - 4·" + par(a) + "·" + par(c) + " = " + fs(mul(b, b)) + " " + (sg(mul(R(4), mul(a, c))) < 0 ? "+ " + fs(neg(mul(R(4), mul(a, c)))) : "- " + fs(mul(R(4), mul(a, c)))) + " = " + fs(o.D)], o.D.n > Z ? L("D > 0: два різні дійсні корені.", "D > 0: two different real roots.") : isZ(o.D) ? L("D = 0: один корінь.", "D = 0: one root.") : L("D < 0: дійсних коренів немає.", "D < 0: no real roots.")));
    }
    steps.push(rootsStep(o, method));
    steps.push(vietaStep(o));
    return { ok: true, kind: "solve", expr: eq, o, head: headRoots(o), tiles: tilesFor(o), steps, graph: o };
  }
  function linearSolve(b, c, eq) {
    if (isZ(b)) {
      const t = isZ(c) ? L("0 = 0: розв'язком є будь-яке число.", "0 = 0: every number is a solution.") : L("c ≠ 0: розв'язків немає.", "c ≠ 0: no solutions.");
      return { ok: true, kind: "solve", expr: eq, o: null, head: '<div class="qdr__line">' + esc(t) + "</div>", tiles: [], steps: [step(L("Лінійний випадок", "Linear case"), [L("a = 0 і b = 0: рівняння c = 0", "a = 0 and b = 0: the equation c = 0"), t])], graph: null };
    }
    const x = neg(div(c, b));
    return { ok: true, kind: "solve", expr: eq, o: null, head: '<div class="qdr__forms"><span class="qdr__nm">x =</span>' + vfr(x) + (x.d !== O ? '<span class="qdr__eq">≈</span><span class="qdr__dec">' + esc(decTxt(x).t) + "</span>" : "") + "</div>", tiles: [], steps: [step(L("Це не квадратне рівняння (a = 0)", "This is not a quadratic equation (a = 0)"), [L("Рівняння стає лінійним: bx + c = 0", "The equation becomes linear: bx + c = 0"), "x = -c/b = " + fs(x)], L("Для a ≠ 0 використовуйте формулу дискримінанта.", "For a ≠ 0 use the discriminant formula."))], graph: null };
  }
  function headRoots(o) {
    const parts = [];
    if (o.kind === "one") parts.push('<span class="qdr__rt"><small>x</small>' + vfr(o.x0) + (o.x0.d !== O ? '<span class="qdr__eq">=</span><span class="qdr__dec">' + esc(decTxt(o.x0).t) + "</span>" : "") + "</span>");
    else if (o.kind === "two" && o.rational) [o.x1, o.x2].forEach((x, i) => parts.push('<span class="qdr__rt"><small>x' + SUB[i] + "</small>" + vfr(x) + (x.d !== O ? '<span class="qdr__eq">=</span><span class="qdr__dec">' + esc(decTxt(x).t) + "</span>" : "") + "</span>"));
    else if (o.kind === "two") [1, -1].forEach((s2, i) => parts.push('<span class="qdr__rt"><small>x' + SUB[i] + "</small>" + vrad(o.rad, pm(s2)) + '<span class="qdr__eq">≈</span><span class="qdr__dec">' + esc(decTxt(radApprox(o.rad, s2)).t) + "</span></span>"));
    else if (o.rational) [1, -1].forEach((s2, i) => parts.push('<span class="qdr__rt"><small>x' + SUB[i] + '</small><span class="qdr__dec">' + esc(complexRatTxt(o, s2)) + "</span></span>"));
    else [1, -1].forEach((s2, i) => parts.push('<span class="qdr__rt"><small>x' + SUB[i] + "</small>" + vrad(o.rad, pm(s2), true) + "</span>"));
    return '<div class="qdr__forms">' + parts.join("") + "</div>";
  }
  function tilesFor(o) {
    const t = [{ k: L("Дискримінант D", "Discriminant D"), v: fs(o.D) }, { k: L("Вершина", "Vertex"), v: "(" + fs(o.x0) + "; " + fs(o.y0) + ")", s: dvert(o.x0, o.y0) }, { k: L("Вітки", "Branches"), v: sg(o.a) > 0 ? L("вгору (a > 0)", "up (a > 0)") : L("вниз (a < 0)", "down (a < 0)") }];
    return t;
  }

  // ---- режим «Вершина та графік»
  function modeVertex(a, b, c) {
    const eq = eqTxt(a, b, c);
    if (isZ(a)) return { ok: false, msg: L("Для параболи потрібно a ≠ 0.", "A parabola needs a ≠ 0.") };
    const o = analyze(a, b, c), x0 = o.x0, y0 = o.y0, up = sg(a) > 0;
    const steps = [];
    steps.push(step(L("Абсциса вершини", "The x of the vertex"), ["x₀ = -b/(2a) = " + fs(neg(b)) + "/" + fs(o.twoA) + " = " + fs(x0)], L("Вісь симетрії параболи: x = " + fs(x0) + ".", "The axis of symmetry: x = " + fs(x0) + ".")));
    steps.push(step(L("Ордината вершини", "The y of the vertex"), ["y₀ = c - b²/(4a) = " + fs(c) + " - " + par(b) + "²/(4·" + par(a) + ") = " + fs(y0), L("або y₀ = f(x₀) = " + fs(add(add(mul(a, mul(x0, x0)), mul(b, x0)), c)), "or y₀ = f(x₀) = " + fs(add(add(mul(a, mul(x0, x0)), mul(b, x0)), c)))]));
    const aV = a.d === O && a.n === 1n ? "" : a.d === O && a.n === -1n ? "-" : a.d === O ? fs(a) : "(" + fs(a) + ")";
    const shV = isZ(x0) ? "x" : "(x " + (x0.n < Z ? "+ " : "- ") + fs({ n: babs(x0.n), d: x0.d }) + ")";
    const cV = isZ(y0) ? "" : (y0.n < Z ? " - " : " + ") + fs({ n: babs(y0.n), d: y0.d });
    steps.push(step(L("Вершинна форма", "Vertex form"), ["y = a(x - x₀)² + y₀", "y = " + aV + shV + "²" + cV], L("У такому записі вершина видна одразу: (" + fs(x0) + "; " + fs(y0) + "). Знак перед x₀ протилежний: x - x₀.", "In this form the vertex is visible at once: (" + fs(x0) + "; " + fs(y0) + "). The sign before x₀ is opposite: x - x₀.")));
    steps.push(step(L("Напрям віток і екстремум", "Direction and the extremum"), [up ? L("a > 0: вітки вгору, найменше значення y = " + fs(y0), "a > 0: branches up, the minimum value is y = " + fs(y0)) : L("a < 0: вітки вниз, найбільше значення y = " + fs(y0), "a < 0: branches down, the maximum value is y = " + fs(y0)), up ? L("Область значень: [" + fs(y0) + "; +∞)", "Range: [" + fs(y0) + "; +∞)") : L("Область значень: (-∞; " + fs(y0) + "]", "Range: (-∞; " + fs(y0) + "]"), up ? L("Спадає на (-∞; " + fs(x0) + "], зростає на [" + fs(x0) + "; +∞)", "Decreases on (-∞; " + fs(x0) + "], increases on [" + fs(x0) + "; +∞)") : L("Зростає на (-∞; " + fs(x0) + "], спадає на [" + fs(x0) + "; +∞)", "Increases on (-∞; " + fs(x0) + "], decreases on [" + fs(x0) + "; +∞)")]));
    steps.push(step(L("Перетин з осями", "Intercepts"), [L("З віссю y: (0; " + fs(c) + ")", "With the y-axis: (0; " + fs(c) + ")"), L("З віссю x: ", "With the x-axis: ") + (o.kind === "complex" ? L("немає (D < 0)", "none (D < 0)") : o.kind === "one" ? "(" + fs(o.x0) + "; 0)" : o.rational ? "(" + fs(o.x1) + "; 0), (" + fs(o.x2) + "; 0)" : "(" + radTxt(o.rad, "+") + "; 0), (" + radTxt(o.rad, "-") + "; 0)")]));
    const head = '<div class="qdr__forms"><span class="qdr__rt"><small>' + L("вершина", "vertex") + '</small><span class="qdr__dec">(' + esc(fs(x0)) + "; " + esc(fs(y0)) + ")</span>" + (dvert(x0, y0) ? "<span class=\"qdr__eq\">" + (dvert(x0, y0)[0] === "=" ? "=" : "≈") + "</span><span class=\"qdr__dec\">" + esc(dvert(x0, y0).slice(2)) + "</span>" : "") + "</span></div>";
    const tiles = [{ k: L("Вісь симетрії", "Axis of symmetry"), v: "x = " + fs(x0), s: dsub(x0) && "x " + dsub(x0) }, { k: L("Перетин з y", "y-intercept"), v: "(0; " + fs(c) + ")", s: c.d === O ? "" : (decTxt(c).exact ? "= " : "≈ ") + "(0; " + decTxt(c).t + ")" }, { k: up ? L("Мінімум y", "Minimum y") : L("Максимум y", "Maximum y"), v: fs(y0), s: dsub(y0) }];
    return { ok: true, kind: "vertex", expr: eq, o, head, tiles, steps, graph: o };
  }

  // ---- режим «Розкладання на множники»
  function modeFactor(a, b, c) {
    const eq = eqTxt(a, b, c);
    if (isZ(a)) return { ok: false, msg: L("Для розкладання потрібно a ≠ 0.", "Factoring needs a ≠ 0.") };
    const o = analyze(a, b, c), steps = [], aT = a.n === a.d ? "" : a.n === -a.d ? "-" : par(a);
    steps.push(step(L("Знаходимо корені", "Find the roots"), ["D = b² - 4ac = " + fs(o.D)], L("Розкладання a(x - x₁)(x - x₂) потребує коренів.", "Factoring a(x - x₁)(x - x₂) needs the roots.")));
    steps.push(rootsStep(o));
    let head, res;
    const xm = (x) => (isZ(x) ? "x" : "x " + (sg(x) > 0 ? "- " + fs(x) : "+ " + fs(neg(x))));
    if (o.kind === "one") { res = aT + "(" + xm(o.x0) + ")²"; steps.push(step(L("Розкладання", "Factorization"), [L("D = 0: ax² + bx + c = a(x - x₀)²", "D = 0: ax² + bx + c = a(x - x₀)²"), "= " + res])); }
    else if (o.kind === "two" && o.rational) {
      res = aT + "(" + xm(o.x1) + ")(" + xm(o.x2) + ")";
      const l2 = ["ax² + bx + c = a(x - x₁)(x - x₂)", "= " + res];
      const p1 = o.x1, p2 = o.x2;
      if (p1.d !== O || p2.d !== O) { const k = div(a, mul(R(Number(p1.d)), R(Number(p2.d)))); l2.push(L("З цілими коефіцієнтами: ", "With whole coefficients: ") + (k.n === k.d ? "" : fs(k) + "·") + "(" + p1.d + "x " + (p1.n < Z ? "+ " + babs(p1.n) : "- " + p1.n) + ")(" + p2.d + "x " + (p2.n < Z ? "+ " + babs(p2.n) : "- " + p2.n) + ")"); }
      steps.push(step(L("Розкладання", "Factorization"), l2));
    }
    else if (o.kind === "two") { const xr = (t) => (t[0] === "-" ? "x + " + t.slice(1) : "x - " + t); res = aT + "(" + xr(radTxt(o.rad, "+")) + ")(" + xr(radTxt(o.rad, "-")) + ")"; steps.push(step(L("Розкладання", "Factorization"), [res, L("Корені ірраціональні, тому множники містять радикали.", "The roots are irrational, so the factors contain radicals.")])); }
    else { res = L("над дійсними числами не розкладається", "does not factor over the reals"); steps.push(step(L("Розкладання", "Factorization"), [L("D < 0: над дійсними числами тричлен нерозкладний.", "D < 0: the trinomial is irreducible over the reals."), o.rational ? "a(x - x₁)(x - x₂), x₁ = " + complexRatTxt(o, 1) + ", x₂ = " + complexRatTxt(o, -1) : "a(x - x₁)(x - x₂), x₁ = " + radTxt(o.rad, "+", true) + ", x₂ = " + radTxt(o.rad, "-", true)], L("Над комплексними числами розкладання існує.", "Over the complex numbers it factors."))); }
    steps.push(vietaStep(o));
    head = '<div class="qdr__forms"><span class="qdr__dec">' + esc(res) + "</span></div>";
    const s = neg(div(b, a)), p = div(c, a);
    return { ok: true, kind: "factor", expr: eq, o, head, tiles: [{ k: "x₁ + x₂", v: fs(s) }, { k: "x₁ · x₂", v: fs(p) }, { k: "D", v: fs(o.D) }], steps, graph: o, resText: res };
  }

  // ---- режим «Рівняння за коренями»
  function modeRoots() {
    const r1 = val("rx1", "x₁"), r2 = val("rx2", "x₂"), ra = el("ra").value.trim() ? val("ra", "a") : { v: R(1) };
    for (const r of [r1, r2, ra]) { if (r.err) return { ok: false, msg: r.err }; if (r.miss) return { ok: false, incomplete: true, msg: L("Вкажіть " + r.miss + ".", "Enter " + r.miss + ".") }; }
    const x1 = r1.v, x2 = r2.v, a = ra.v;
    if (isZ(a)) return { ok: false, msg: L("Коефіцієнт a має бути відмінним від нуля.", "The coefficient a must not be zero.") };
    const s = add(x1, x2), p = mul(x1, x2), b = neg(mul(a, s)), c = mul(a, p);
    const steps = [];
    steps.push(step(L("Сума й добуток коренів", "Sum and product of the roots"), ["x₁ + x₂ = " + par(x1) + " + " + par(x2) + " = " + fs(s), "x₁ · x₂ = " + par(x1) + " · " + par(x2) + " = " + fs(p)]));
    steps.push(step(L("Рівняння за теоремою Вієта", "The equation by Vieta's theorem"), ["a(x - x₁)(x - x₂) = a(x² - (x₁ + x₂)x + x₁x₂)", "= " + par(a) + "(x² - " + par(s) + "x + " + par(p) + ")", "= " + eqTxt(a, b, c).replace(/ = 0$/, "")], L("Коефіцієнти: b = -a(x₁ + x₂), c = a·x₁x₂.", "Coefficients: b = -a(x₁ + x₂), c = a·x₁x₂.")));
    const Lc = lcm(lcm(a.d, b.d), c.d);
    let ai = mul(a, R(Number(Lc))), bi = mul(b, R(Number(Lc))), ci = mul(c, R(Number(Lc)));
    const eq = eqTxt(a, b, c);
    if (Lc !== O) { steps.push(step(L("Цілі коефіцієнти", "Whole coefficients"), [L("Домножимо на " + Lc + ":", "Multiply by " + Lc + ":"), eqTxt(ai, bi, ci)])); }
    const o = analyze(a, b, c);
    return { ok: true, kind: "roots", expr: L("Корені x₁ = " + fs(x1) + ", x₂ = " + fs(x2), "Roots x₁ = " + fs(x1) + ", x₂ = " + fs(x2)), o, head: '<div class="qdr__forms"><span class="qdr__dec">' + esc(eq) + "</span></div>", tiles: [{ k: "x₁ + x₂", v: fs(s) }, { k: "x₁ · x₂", v: fs(p) }, { k: "D", v: fs(o.D) }], steps, graph: o, resText: eq };
  }

  // ---- режим «Нерівність»
  const SIGNS = { gt: [">", ">"], ge: ["≥", "≥"], lt: ["<", "<"], le: ["≤", "≤"] };
  function modeIneq(a, b, c) {
    const sign = el("ineqSign").value, S = SIGNS[sign][0], strict = sign === "gt" || sign === "lt", wantPos = sign === "gt" || sign === "ge";
    const eq = eqTxt(a, b, c).replace(" = 0", " " + S + " 0");
    const lb = strict ? "(" : "[", rb = strict ? ")" : "]";
    const steps = [];
    let ans, o = null;
    if (isZ(a)) {
      if (isZ(b)) { const holds = sg(c) > 0 ? wantPos : sg(c) < 0 ? !wantPos : !strict; ans = holds ? L("будь-яке x", "any x") : L("розв'язків немає", "no solutions"); steps.push(step(L("Лінійний випадок", "Linear case"), [L("a = 0, b = 0: нерівність c " + S + " 0 " + (holds ? "виконується завжди" : "не виконується ніколи"), "a = 0, b = 0: the inequality c " + S + " 0 " + (holds ? "always holds" : "never holds"))])); }
      else { const x = neg(div(c, b)), up = (sg(b) > 0) === wantPos; ans = up ? "x " + (strict ? ">" : "≥") + " " + fs(x) : "x " + (strict ? "<" : "≤") + " " + fs(x); steps.push(step(L("Лінійний випадок (a = 0)", "Linear case (a = 0)"), ["bx + c " + S + " 0", "x = -c/b = " + fs(x), L("Знак b " + (sg(b) < 0 ? "від'ємний: знак нерівності змінюється" : "додатний: знак нерівності зберігається"), "The sign of b is " + (sg(b) < 0 ? "negative: the inequality flips" : "positive: the inequality keeps its direction"))])); }
      return { ok: true, kind: "ineq", expr: eq, o: null, head: '<div class="qdr__forms"><span class="qdr__dec">' + esc(ans) + "</span></div>", tiles: [], steps, graph: null, resText: ans };
    }
    o = analyze(a, b, c);
    steps.push(step(L("Корені відповідного рівняння", "Roots of the related equation"), ["D = b² - 4ac = " + fs(o.D)]));
    steps.push(rootsStep(o));
    const up = sg(a) > 0;
    let lo, hi, loT, hiT;
    if (o.kind === "two") { if (o.rational) { lo = cmp(o.x1, o.x2) < 0 ? o.x1 : o.x2; hi = cmp(o.x1, o.x2) < 0 ? o.x2 : o.x1; loT = fs(lo); hiT = fs(hi); } else { loT = radTxt(o.rad, "-"); hiT = radTxt(o.rad, "+"); } }
    const outside = wantPos === up; // f має потрібний знак поза коренями
    let l1;
    if (o.kind === "two") { ans = outside ? "(-∞; " + loT + (strict ? ")" : "]") + " ∪ " + (strict ? "(" : "[") + hiT + "; +∞)" : lb + loT + "; " + hiT + rb; l1 = outside ? L("Парабола " + (up ? "вітками вгору" : "вітками вниз") + ": потрібний знак поза коренями", "The parabola opens " + (up ? "up" : "down") + ": the required sign is outside the roots") : L("Парабола " + (up ? "вітками вгору" : "вітками вниз") + ": потрібний знак між коренями", "The parabola opens " + (up ? "up" : "down") + ": the required sign is between the roots"); }
    else if (o.kind === "one") { const x0 = fs(o.x0); if (outside) ans = strict ? "(-∞; " + x0 + ") ∪ (" + x0 + "; +∞)" : L("будь-яке x", "any x"); else ans = strict ? L("розв'язків немає", "no solutions") : "x = " + x0; l1 = L("D = 0: парабола лише дотикається до осі x у точці " + x0, "D = 0: the parabola only touches the x-axis at " + x0); }
    else { const all = outside; ans = all ? L("будь-яке x", "any x") : L("розв'язків немає", "no solutions"); l1 = L("D < 0: парабола не перетинає вісь x, f(x) скрізь має знак a", "D < 0: the parabola does not cross the x-axis, f(x) has the sign of a everywhere"); }
    steps.push(step(L("Знак квадратного тричлена", "The sign of the trinomial"), [l1, L("Відповідь: ", "Answer: ") + ans]));
    return { ok: true, kind: "ineq", expr: eq, o, head: '<div class="qdr__forms"><span class="qdr__dec">' + esc(ans) + "</span></div>", tiles: [{ k: "D", v: fs(o.D) }, { k: L("Вітки", "Branches"), v: up ? L("вгору", "up") : L("вниз", "down") }], steps, graph: o, resText: ans };
  }

  // ===== графік =====
  function niceStep(range, n) {
    const raw = range / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), nm = raw / mag;
    return (nm <= 1 ? 1 : nm <= 2 ? 2 : nm <= 5 ? 5 : 10) * mag;
  }
  function graphSvg(o) {
    const a = toNum(o.a), b = toNum(o.b), c = toNum(o.c), f = (x) => a * x * x + b * x + c;
    const x0 = toNum(o.x0), y0 = toNum(o.y0), rts = [];
    if (o.kind === "two") rts.push(...(o.rational ? [toNum(o.x1), toNum(o.x2)] : [toNum(radApprox(o.rad, 1)), toNum(radApprox(o.rad, -1))]));
    else if (o.kind === "one") rts.push(x0);
    rts.sort((p, q) => p - q);
    // межі: нуль, вершина і корені, з полем з обох боків
    const xs = [x0, 0, ...rts], lo = Math.min(...xs), hi = Math.max(...xs);
    let span = hi - lo; if (span < 1e-9) span = 2;
    const pad = span * 0.3 + 0.4, xmin = lo - pad, xmax = hi + pad;
    const ys = [0, y0, f(xmin), f(xmax)];
    let ylo = Math.min(...ys), yhi = Math.max(...ys);
    if (yhi - ylo < 1e-9) { ylo -= 1; yhi += 1; }
    const yp = (yhi - ylo) * 0.14, ymin = ylo - yp, ymax = yhi + yp;
    // поділки
    const xStep = niceStep(xmax - xmin, 8), yStep = niceStep(ymax - ymin, 6);
    const dec = (st) => Math.max(0, -Math.floor(Math.log10(st) + 1e-9));
    const tick = (v, st) => { const t = Math.abs(v) < st * 1e-6 ? "0" : v.toFixed(dec(st)); return t.replace(".", SEP); };
    const xt = [], yt = [];
    for (let k = Math.ceil(xmin / xStep); k * xStep <= xmax + 1e-12; k++) xt.push(k * xStep);
    for (let k = Math.ceil(ymin / yStep); k * yStep <= ymax + 1e-12; k++) yt.push(k * yStep);
    const lw = Math.max(...yt.map((v) => tick(v, yStep).length), 2);
    const W = 560, H = 340, mL = Math.max(40, Math.round(lw * 7.4 + 18)), mR = 26, mT = 26, mB = 30, pw = W - mL - mR, ph = H - mT - mB;
    const X = (x) => mL + ((x - xmin) / (xmax - xmin)) * pw, Y = (y) => mT + ph - ((y - ymin) / (ymax - ymin)) * ph;
    const fmtN = (v) => { const t = Math.abs(v) >= 100000 || (Math.abs(v) < 0.0001 && v !== 0) ? v.toExponential(2) : String(Math.round(v * 10000) / 10000); return t.replace(".", SEP); };
    const px = [], py = [], occ = [];
    let pts = "";
    const N = 480;
    for (let i = 0; i <= N; i++) { const x = xmin + ((xmax - xmin) * i) / N, y = f(x); pts += (i ? " " : "") + X(x).toFixed(1) + "," + Math.max(-3000, Math.min(3000, Y(y))).toFixed(1); }
    const ax = Y(0), ay = X(0);
    let s = '<svg class="qdr__svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + L("Графік параболи", "Graph of the parabola") + '"><defs><clipPath id="qdrClip"><rect x="' + mL + '" y="' + mT + '" width="' + pw + '" height="' + ph + '"/></clipPath>' +
      '<marker id="qdrArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#4b5563"/></marker></defs>';
    s += '<rect x="' + mL + '" y="' + mT + '" width="' + pw + '" height="' + ph + '" fill="#fff" stroke="#dfe3ec"/>';
    // сітка
    xt.forEach((v) => { s += '<line x1="' + X(v).toFixed(1) + '" y1="' + mT + '" x2="' + X(v).toFixed(1) + '" y2="' + (mT + ph) + '" stroke="#eef0f6" stroke-width="1"/>'; });
    yt.forEach((v) => { s += '<line x1="' + mL + '" y1="' + Y(v).toFixed(1) + '" x2="' + (mL + pw) + '" y2="' + Y(v).toFixed(1) + '" stroke="#eef0f6" stroke-width="1"/>'; });
    // вісь симетрії
    s += '<line x1="' + X(x0).toFixed(1) + '" y1="' + mT + '" x2="' + X(x0).toFixed(1) + '" y2="' + (mT + ph) + '" stroke="#d85a30" stroke-width="1" stroke-dasharray="5 4" opacity=".55"/>';
    // осі зі стрілками
    s += '<line x1="' + mL + '" y1="' + ax.toFixed(1) + '" x2="' + (W - mR + 14) + '" y2="' + ax.toFixed(1) + '" stroke="#4b5563" stroke-width="1.4" marker-end="url(#qdrArr)"/>';
    s += '<line x1="' + ay.toFixed(1) + '" y1="' + (mT + ph) + '" x2="' + ay.toFixed(1) + '" y2="' + (mT - 14) + '" stroke="#4b5563" stroke-width="1.4" marker-end="url(#qdrArr)"/>';
    s += '<text x="' + (W - 6) + '" y="' + (ax + 4).toFixed(1) + '" font-size="18" font-style="italic" font-weight="700" fill="#1f2f55" text-anchor="end">x</text>';
    s += '<text x="' + (ay + 10).toFixed(1) + '" y="' + (mT - 8) + '" font-size="18" font-style="italic" font-weight="700" fill="#1f2f55">y</text>';
    // крива
    s += '<polyline clip-path="url(#qdrClip)" points="' + pts + '" fill="none" stroke="#4f6fb8" stroke-width="2.8" stroke-linejoin="round" stroke-linecap="round"/>';
    // точки
    const halo = ' paint-order="stroke" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"';
    const txt = (x, y, t, anchor, col, bold) => {
      const w = t.length * 7.4, cx = Math.max(mL + 2, Math.min(W - mR - 2, x));
      let xx = cx; if (anchor === "middle") xx = Math.max(mL + w / 2 + 2, Math.min(W - mR - w / 2 - 2, x)); else if (anchor === "end") xx = Math.max(mL + w + 2, cx); else xx = Math.min(W - mR - w - 2, cx);
      return '<text x="' + xx.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="14" fill="' + (col || "#1f2937") + '"' + (bold ? ' font-weight="700"' : "") + ' text-anchor="' + anchor + '"' + halo + ">" + esc(t) + "</text>";
    };
    const dot = (x, y, col, r) => '<circle cx="' + X(x).toFixed(1) + '" cy="' + Y(y).toFixed(1) + '" r="' + r + '" fill="' + col + '" stroke="#fff" stroke-width="1.6"/>';
    let marks = "";
    const vertexIsRoot = o.kind === "one";
    if (!vertexIsRoot) rts.forEach((x, i) => {
      px.push(X(x));
      const below = a > 0, out = rts.length === 2 ? (i === 0 ? "end" : "start") : "middle";
      const lt = "(" + fmtN(x) + "; 0)", lw2 = lt.length * 7.4 + 8; if (below) occ.push(out === "end" ? [X(x) - 7 - lw2, X(x) + 4] : out === "start" ? [X(x) - 4, X(x) + 7 + lw2] : [X(x) - lw2 / 2, X(x) + lw2 / 2]);
      marks += dot(x, 0, "#283b69", 5) + txt(X(x) + (out === "end" ? -7 : out === "start" ? 7 : 0), Y(0) + (below ? 17 : -9), "(" + fmtN(x) + "; 0)", out, "#283b69", true);
    });
    px.push(X(x0)); py.push(Y(y0));
    if (vertexIsRoot && a > 0) { const vw = ("(" + fmtN(x0) + "; " + fmtN(y0) + ")").length * 7.4 / 2 + 4; occ.push([X(x0) - vw, X(x0) + vw]); }
    const vOn = a > 0;
    marks += dot(x0, y0, "#d85a30", 5.5) + txt(X(x0), Y(y0) + (vertexIsRoot ? (a > 0 ? 17 : -10) : (vOn ? 18 : -11)), "(" + fmtN(x0) + "; " + fmtN(y0) + ")", "middle", "#b4411f", true);
    if (c !== 0 && Math.abs(x0) > 1e-12) {
      py.push(Y(c));
      marks += dot(0, c, "#6b7280", 4) + (b > 0 ? txt(X(0) - 8, Y(c) - 7, "(0; " + fmtN(c) + ")", "end", "#4b5563") : txt(X(0) + 8, Y(c) - 7, "(0; " + fmtN(c) + ")", "start", "#4b5563"));
    }
    // підписи поділок (пропускаємо ті, що збігаються з підписами точок)
    const flipX = ax + 15 > mT + ph - 2, flipY = ay - 7 - lw * 7.4 < mL;
    xt.forEach((v) => { const x = X(v); if (Math.abs(v) < xStep * 1e-6 || px.some((p) => Math.abs(p - x) < 30) || occ.some((r) => x > r[0] - 14 && x < r[1] + 14)) return; s += '<line x1="' + x.toFixed(1) + '" y1="' + (ax - 3).toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + (ax + 3).toFixed(1) + '" stroke="#4b5563"/>' + txt(x, flipX ? ax - 8 : ax + 16, tick(v, xStep), "middle", "#4b5563"); });
    yt.forEach((v) => { const y = Y(v); if (Math.abs(v) < yStep * 1e-6 || py.some((p) => Math.abs(p - y) < 13)) return; s += '<line x1="' + (ay - 3).toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + (ay + 3).toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#4b5563"/>' + (flipY ? txt(ay + 8, y + 4, tick(v, yStep), "start", "#4b5563") : txt(ay - 8, y + 4, tick(v, yStep), "end", "#4b5563")); });
    s += txt(flipY ? ay + 8 : ay - 7, flipX ? ax - 7 : ax + 16, "0", flipY ? "start" : "end", "#4b5563");
    s += marks;
    const li = (cls, t) => '<span class="qdr__legI"><i class="' + cls + '"></i>' + esc(t) + '</span>';
    let leg = '';
    if (!vertexIsRoot && rts.length) leg += li('qdr__legD qdr__legD--root', L('Корені (x; 0)', 'Roots (x; 0)'));
    leg += li('qdr__legD qdr__legD--vert', vertexIsRoot ? L('Вершина параболи, вона ж корінь', 'Vertex, also the root') : L('Вершина параболи', 'Vertex of the parabola'));
    if (c !== 0 && Math.abs(x0) > 1e-12) leg += li('qdr__legD qdr__legD--y', L('Перетин з віссю y (0; c)', 'y-intercept (0; c)'));
    leg += li('qdr__legL', L('Вісь симетрії x = ', 'Axis of symmetry x = ') + fmtN(x0));
    return s + '</svg><div class="qdr__leg">' + leg + '</div>';
  }

  // ===== відображення =====
  const CALC = {
    solve: () => { const r = coefs(); return r.ok ? modeSolve(r.a, r.b, r.c) : r; },
    vertex: () => { const r = coefs(); return r.ok ? modeVertex(r.a, r.b, r.c) : r; },
    factor: () => { const r = coefs(); return r.ok ? modeFactor(r.a, r.b, r.c) : r; },
    roots: () => modeRoots(),
    ineq: () => { const r = coefs(); return r.ok ? modeIneq(r.a, r.b, r.c) : r; }
  };
  function coefs() {
    const a = val("qa", "a"), b = val("qb", "b"), c = val("qc", "c");
    for (const r of [a, b, c]) if (r.err) return { ok: false, msg: r.err };
    const miss = [a, b, c].filter((r) => r.miss).map((r) => r.miss);
    if (miss.length) return { ok: false, incomplete: true, msg: L("Вкажіть коефіцієнти: " + miss.join(", ") + ".", "Enter the coefficients: " + miss.join(", ") + ".") };
    return { ok: true, a: a.v, b: b.v, c: c.v };
  }
  function stepsHtml(steps) {
    return '<div class="qdr__sub">' + L("Розв'язання", "Solution") + '</div>' + steps.map((s, i) => '<div class="qdr__step"><span class="qdr__stepN">' + (i + 1) + '</span><div><b class="qdr__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="qdr__math">' + esc(x) + "</p>").join("") + (s.note ? '<p class="qdr__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join("");
  }
  function textOf(m) {
    const roots = m.o ? rootStrings(m.o).map((r) => r.name + " = " + r.ex + (r.ap ? " (" + r.ap + ")" : "")).join(", ") : "";
    const head = m.kind === "solve" && roots ? m.expr.replace(/−/g, "-") + ":  " + roots : (m.resText ? m.expr.replace(/−/g, "-") + "  →  " + m.resText : m.expr.replace(/−/g, "-"));
    return [head, ""].concat(m.steps.map((s, i) => (i + 1) + ". " + s.t + "\n   " + s.l.join("\n   "))).join("\n");
  }
  let last = null;
  function render(m, strict) {
    const box = el("result");
    if (!m.ok) { last = null; box.innerHTML = m.incomplete && !strict ? T.enter : '<div class="qdr__hintbox">' + esc(m.msg || T.enter) + "</div>"; return; }
    last = m;
    const tiles = m.tiles && m.tiles.length ? '<div class="qdr__tiles">' + m.tiles.map((t) => '<div class="qdr__tile"><small>' + esc(t.k) + "</small><b>" + esc(t.v) + "</b>" + (t.s ? "<span>" + esc(t.s) + "</span>" : "") + "</div>").join("") + "</div>" : "";
    const graph = m.graph ? '<div class="qdr__sub">' + L("Графік", "Graph") + '</div><div class="qdr__graph">' + graphSvg(m.graph) + "</div>" : "";
    box.innerHTML = '<div class="qdr__rhead"><div class="qdr__expr">' + esc(m.expr) + "</div>" + m.head + "</div>" + tiles + stepsHtml(m.steps) + graph + '<div class="qdr__note">' + L("Усі обчислення точні (раціональні числа). Десяткові значення коренів, що містять √, наближені.", "All calculations are exact (rational numbers). Decimal values of roots with √ are approximate.") + "</div>";
  }
  const autoOn = () => !el("autoCalc") || el("autoCalc").checked;
  function calc(strict) { const m = CALC[mode](); render(m, strict === true); preview(); return m; }
  function maybeCalc() { if (autoOn()) calc(); else { render({ ok: false, incomplete: true }, false); preview(); } }
  function preview() {
    const p = el("eqPreview");
    if (!p) return;
    if (mode === "roots") { p.textContent = ""; return; }
    const r = coefs();
    p.textContent = !r.ok ? "" : mode === "ineq" ? eqTxt(r.a, r.b, r.c).replace(" = 0", " " + SIGNS[el("ineqSign").value][0] + " 0") : eqTxt(r.a, r.b, r.c);
  }

  // ===== режими, випадні списки, кнопки =====
  const DDP = { method: "md", ineqSign: "sg" };
  function setDd(hid, v) {
    const pre = DDP[hid], lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }
  function initDd(pre, onPick) {
    const btn = el(pre + "_btn"), list = el(pre + "_list");
    const items = () => Array.from(list.querySelectorAll("li"));
    const close = (f) => { list.hidden = true; btn.setAttribute("aria-expanded", "false"); if (f) btn.focus(); };
    const open = () => { list.hidden = false; btn.setAttribute("aria-expanded", "true"); (items().find((li) => li.getAttribute("aria-selected") === "true") || items()[0]).focus(); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); if (list.hidden) open(); else close(); });
    btn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); } });
    const pick = (li) => { onPick(li.dataset.v); close(true); };
    list.addEventListener("click", (e) => { const li = e.target.closest("li[data-v]"); if (li) pick(li); });
    list.addEventListener("keydown", (e) => {
      const all = items(), i = all.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); all[Math.min(all.length - 1, i + 1)].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); all[Math.max(0, i - 1)].focus(); }
      else if ((e.key === "Enter" || e.key === " ") && i >= 0) { e.preventDefault(); pick(all[i]); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") close();
    });
    document.addEventListener("click", (e) => { if (!e.target.closest("#" + pre + "_dd")) close(); });
  }
  function toast(msg) { const n = el("toast"); if (!n) return; n.textContent = msg; clearTimeout(toast._t); toast._t = setTimeout(() => (n.textContent = ""), 2600); }
  function syncVisibility() {
    el("coefs").hidden = mode === "roots";
    el("rootsBlock").hidden = mode !== "roots";
    el("methodRow").hidden = mode !== "solve";
    el("signRow").hidden = mode !== "ineq";
  }
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".qdr__tab").forEach((b) => { const on = b.dataset.m === m; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    syncVisibility();
    maybeCalc();
  }
  const FIELDS = ["qa", "qb", "qc", "rx1", "rx2", "ra"];
  function resetAll() {
    FIELDS.forEach((id) => (el(id).value = ""));
    setDd("method", "disc"); setDd("ineqSign", "gt");
    maybeCalc();
  }
  const EXAMPLES = {
    solve: () => { el("qa").value = "2"; el("qb").value = "-3"; el("qc").value = "-5"; },
    vertex: () => { el("qa").value = "1"; el("qb").value = "-4"; el("qc").value = "3"; },
    factor: () => { el("qa").value = "1"; el("qb").value = "-5"; el("qc").value = "6"; },
    roots: () => { el("rx1").value = "2"; el("rx2").value = "-3"; el("ra").value = "1"; },
    ineq: () => { el("qa").value = "1"; el("qb").value = "-5"; el("qc").value = "6"; setDd("ineqSign", "gt"); }
  };
  function fillExample() { resetAll(); EXAMPLES[mode](); calc(true); toast(T.example); }
  function share() {
    const p = new URLSearchParams();
    p.set("m", mode); p.set("md", el("method").value); p.set("sg", el("ineqSign").value);
    FIELDS.forEach((id) => el(id).value.trim() && p.set(id, el(id).value.trim()));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const qs = new URLSearchParams(location.search);
    if (![...qs.keys()].length) return false;
    if (MODES.includes(qs.get("m"))) mode = qs.get("m");
    if (["disc", "square"].includes(qs.get("md"))) setDd("method", qs.get("md"));
    if (["gt", "ge", "lt", "le"].includes(qs.get("sg"))) setDd("ineqSign", qs.get("sg"));
    FIELDS.forEach((id) => { if (qs.has(id)) el(id).value = qs.get(id).slice(0, 70); });
    return true;
  }
  async function copyResult() {
    if (!last) { toast(T.calcFirst); return; }
    try { await navigator.clipboard.writeText(textOf(last)); toast(T.copied); } catch { toast(T.copyFailed); }
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".qdr__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    initDd("md", (v) => { setDd("method", v); maybeCalc(); });
    initDd("sg", (v) => { setDd("ineqSign", v); maybeCalc(); });
    FIELDS.forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") calc(true); }); });
    el("calcBtn").addEventListener("click", () => { const m = calc(true); if (!m.ok && m.msg) toast(m.msg); });
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => { resetAll(); toast(T.reset); });
    el("shareBtn").addEventListener("click", share);
    el("copyBtn").addEventListener("click", copyResult);
    const used = applyFromUrl();
    setMode(mode);
    if (used) calc();
  });
})();
