/* pythagorean.js — калькулятор теореми Піфагора: п'ять режимів (знайти сторону; чи прямокутний трикутник; діагональ коробки; відстань між точками; піфагорові трійки), розв'язання по кроках, схеми (UK/EN)
   Числа — точні раціональні (ціле, десяткове, дріб). Корінь із раціонального числа спрощується точно: √50 = 5√2, а поруч стоїть десяткове наближення.
   Знайти сторону: c = √(a² + b²), a = √(c² − b²). Обернена теорема: порівняння квадрата найбільшої сторони з сумою квадратів двох інших (точно).
   Діагональ коробки: d = √(a² + b² + c²). Відстань: d = √(Δx² + Δy² (+ Δz²)). Трійки: формула Евкліда (m² − n², 2mn, m² + n²), перелік до N, трійки із заданим числом. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const SEP = IS_EN ? "." : ",";
  const MODES = ["sd", "rt", "bx", "ds", "tp"];
  const MAXD = 30;
  let mode = "sd";

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
  const Z = 0n, O = 1n, NB = " ";
  const babs = (x) => (x < Z ? -x : x);
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  const q = (n, d = O) => { if (d < Z) { n = -n; d = -d; } const g = gcd(n, d) || O; return { n: n / g, d: d / g }; };
  const add = (x, y) => q(x.n * y.d + y.n * x.d, x.d * y.d);
  const sub = (x, y) => q(x.n * y.d - y.n * x.d, x.d * y.d);
  const mul = (x, y) => q(x.n * y.n, x.d * y.d);
  const div = (x, y) => q(x.n * y.d, x.d * y.n);
  const neg = (x) => ({ n: -x.n, d: x.d });
  const isZ = (x) => x.n === Z;
  const R = (n) => ({ n: BigInt(n), d: O });
  const ONE = R(1), TWO = R(2), HALF = q(1n, 2n);
  const cmp = (x, y) => { const d = sub(x, y); return d.n < Z ? -1 : d.n > Z ? 1 : 0; };
  const isqrt = (n) => { if (n < 2n) return n; let x = 1n << BigInt((n.toString(2).length + 1) >> 1), y = (x + n / x) >> 1n; while (y < x) { x = y; y = (x + n / x) >> 1n; } return x; };
  const sqrtApprox = (x) => { const P = 40n; return q(isqrt((x.n * 10n ** (2n * P)) / x.d), 10n ** P); };
  const toDbl = (r) => Number(r.n) / Number(r.d);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const step = (t, lines, note) => ({ t, l: lines, note });
  const exactDec = (x) => (x.n * 10n ** 12n) % x.d === Z;
  function roundStr(x, nd, trim = true) {
    const ng = x.n < Z, a = babs(x.n), sc = 10n ** BigInt(nd);
    const v = (a * sc * 2n + x.d) / (2n * x.d);
    const s = v.toString().padStart(nd + 1, "0");
    const ip = s.slice(0, s.length - nd);
    let fr = s.slice(s.length - nd);
    if (trim) fr = fr.replace(/0+$/, "");
    const zero = /^0+$/.test(ip) && /^0*$/.test(fr);
    return (ng && !zero ? "-" : "") + ip.replace(/\B(?=(\d{3})+(?!\d))/g, NB) + (fr ? SEP + fr : "");
  }
  const nf = (x) => (x.d === O ? String(x.n) : exactDec(x) ? roundStr(x, 12) : x.n + "/" + x.d);
  const par = (x) => (x.n < Z || x.d !== O ? "(" + nf(x) + ")" : nf(x));
  const rad2 = (x) => (x.d === O ? nf(x) : "(" + nf(x) + ")");
  const dblStr = (x, nd) => { if (!Number.isFinite(x) || Math.abs(x) >= 1e15) return "—"; return x.toFixed(nd).replace(/\.?0+$/, "").replace(".", SEP) || "0"; };
  const ND = () => Number(el("decs").value) || 4;
  const ints = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB);

  // ===== радикали: { c, m } = c·√m, m без квадратних множників (m = 1 — раціональне) =====
  function simplifyRadical(m) {
    let k = O, rem = m;
    for (let p = 2n; p <= 100000n && p * p <= rem; p++) {
      const p2 = p * p;
      while (rem % p2 === Z) { rem /= p2; k *= p; }
    }
    if (rem > O) { const s = isqrt(rem); if (s * s === rem) { k *= s; rem = O; } }
    return { k, m: rem === Z ? O : rem };
  }
  function sqrtRat(Qv) {
    if (isZ(Qv)) return { c: R(0), m: O };
    const { k, m } = simplifyRadical(Qv.n * Qv.d);
    return { c: q(k, Qv.d), m };
  }
  const rat = (x) => ({ c: x, m: O });
  const radText = (c, m) => (m === O ? nf(c) : (c.n === O ? "" : String(c.n)) + "√" + m + (c.d === O ? "" : "/" + c.d));
  const rvScale = (r, k) => ({ c: mul(r.c, k), m: r.m });
  const rvVal = (r) => (r.m === O ? r.c : mul(r.c, sqrtApprox(R(r.m))));
  const rvMul = (x, y) => { const k = mul(x.c, y.c), mm = x.m * y.m; if (mm === O) return { c: k, m: O }; const s = simplifyRadical(mm); return { c: mul(k, R(s.k)), m: s.m }; };
  const rvDiv = (x, y) => { const cc = div(x.c, y.c), t = sqrtRat(q(x.m, y.m)); return { c: mul(cc, t.c), m: t.m }; };
  const rvNeg = (x) => ({ c: neg(x.c), m: x.m });
  const rvAdd = (x, y) => { if (!x || !y) return null; if (isZ(x.c)) return y; if (isZ(y.c)) return x; if (x.m === y.m) return { c: add(x.c, y.c), m: x.m }; return null; };
  const item = (ex, v, rt) => ({ ex, v, rat: !!rt });
  const rvItem = (r) => (r.m === O ? item(null, r.c, true) : item(radText(r.c, r.m), rvVal(r), false));
  const num = (it, nd, suf) => {
    if (it.rat) return nf(it.v) + (it.v.d !== O && !exactDec(it.v) ? " ≈ " + roundStr(it.v, nd) : "") + (suf ? " " + suf : "");
    return (it.ex ? it.ex + (suf ? " " + suf : "") + " ≈ " : "≈ ") + roundStr(it.v, nd) + (suf ? " " + suf : "");
  };
  const brief = (it, nd, suf) => {
    if (it.rat) return (it.v.d === O || exactDec(it.v) ? nf(it.v) : "≈ " + roundStr(it.v, nd)) + (suf ? " " + suf : "");
    return (it.ex ? it.ex + " ≈ " : "≈ ") + roundStr(it.v, nd) + (suf ? " " + suf : "");
  };
  // сума кількох радикалів: точна, якщо вони одного типу, інакше наближена
  const sumItem = (list) => { let acc = rat(R(0)); for (const x of list) acc = rvAdd(acc, x); if (acc) return rvItem(acc); return item(null, list.reduce((s, x) => add(s, rvVal(x)), R(0)), false); };

  // ===== одиниці =====
  const UL = { none: "", mm: L("мм", "mm"), cm: L("см", "cm"), dm: L("дм", "dm"), m: L("м", "m"), km: L("км", "km"), in: L("дюйм", "in"), ft: L("фут", "ft") };
  const SQ = { none: "", mm: L("мм²", "mm²"), cm: L("см²", "cm²"), dm: L("дм²", "dm²"), m: L("м²", "m²"), km: L("км²", "km²"), in: L("дюйм²", "in²"), ft: L("фут²", "ft²") };
  const unit = () => el("unit").value || "none";
  const U1 = () => UL[unit()];
  const U2 = () => SQ[unit()];
  const withU = (s, u) => (u ? s + " " + u : s);

  // ===== розбір чисел =====
  const NUM = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/;
  function parseDec(s) {
    if (!NUM.test(s)) return null;
    if (s.replace(/[+\-.,]/g, "").length > MAXD) return "long";
    const ng = s[0] === "-", t = s.replace(/^[+-]/, "").replace(",", "."), [ip, fp = ""] = t.split(".");
    const n = BigInt((ip || "0") + fp), d = 10n ** BigInt(fp.length);
    return q(ng ? -n : n, d);
  }
  const badNum = (s) => L("«" + s.slice(0, 16) + "» не підходить: потрібне число або дріб a/b.", "“" + s.slice(0, 16) + "” is not valid: use a number or a fraction a/b.");
  function plain(str) {
    const s = String(str || "").trim().replace(/[−–—]/g, "-");
    if (!s) return { empty: true };
    const parts = s.split("/");
    if (parts.length > 2) return { err: badNum(s) };
    const p = parts.map((x) => parseDec(x.trim()));
    if (p.some((x) => x === null)) return { err: badNum(s) };
    if (p.some((x) => x === "long")) return { err: L("Не більше " + MAXD + " цифр у числі.", "At most " + MAXD + " digits in a number.") };
    if (p.length === 2) { if (isZ(p[1])) return { err: L("Знаменник не може дорівнювати нулю.", "The denominator cannot be zero.") }; return { v: div(p[0], p[1]) }; }
    return { v: p[0] };
  }
  const posLen = (id, label) => { const r = plain(el(id).value); if (r.err) return { err: label + ": " + r.err }; if (r.empty) return { miss: label }; if (r.v.n <= Z) return { err: label + ": " + L("значення має бути більше нуля.", "the value must be greater than zero.") }; return r; };
  const anyNum = (id, label) => { const r = plain(el(id).value); if (r.err) return { err: label + ": " + r.err }; if (r.empty) return { miss: label }; return r; };
  function posInt(id, label, max) {
    const s = el(id).value.trim();
    if (!s) return { miss: label };
    if (!/^\d+$/.test(s)) return { err: label + ": " + L("потрібне ціле додатне число.", "a positive whole number is required.") };
    const n = BigInt(s);
    if (n <= Z) return { err: label + ": " + L("значення має бути більше нуля.", "the value must be greater than zero.") };
    if (max !== undefined && n > BigInt(max)) return { err: label + ": " + L("не більше " + ints(max) + ".", "at most " + ints(max) + ".") };
    return { v: n };
  }
  const firstErr = (arr) => { for (const r of arr) if (r.err) return { ok: false, msg: r.err }; return null; };

  // піфагорова трійка за трьома додатними раціональними сторонами (будь-який порядок)
  function tripleNote(list) {
    const rs = list.slice().sort((x, y) => cmp(x, y));
    let l = O;
    rs.forEach((x) => { l = (l / gcd(l, x.d)) * x.d; });
    const ii = rs.map((x) => (x.n * l) / x.d);
    if (ii[0] * ii[0] + ii[1] * ii[1] !== ii[2] * ii[2]) return null;
    const g = ii.reduce((p, x) => gcd(p, x), Z), pr = ii.map((x) => x / g);
    const trip = "(" + pr.join(", ") + ")";
    if (l === O && g === O) return L("Це піфагорова трійка " + trip + ", примітивна (числа взаємно прості).", "This is the Pythagorean triple " + trip + ", primitive (the numbers are coprime).");
    if (l === O) return L("Це піфагорова трійка (" + ii.join(", ") + ") = " + g + " · " + trip + ".", "This is the Pythagorean triple (" + ii.join(", ") + ") = " + g + " · " + trip + ".");
    return L("Сторони пропорційні піфагоровій трійці " + trip + " (коефіцієнт " + nf(q(g, l)) + ").", "The sides are proportional to the Pythagorean triple " + trip + " (factor " + nf(q(g, l)) + ").");
  }
  const angStr = (d, nd) => dblStr(d, nd) + "°";
  const bySides = (sa, sb, sc2) => {
    const e = [cmp(sa, sb) === 0, cmp(sb, sc2) === 0, cmp(sa, sc2) === 0].filter(Boolean).length;
    return e === 3 ? L("рівносторонній", "equilateral") : e >= 1 ? L("рівнобедрений", "isosceles") : L("різносторонній", "scalene");
  };
  // підпис довжини на схемі: точний запис без «≈», а для нескінченного десяткового — наближення
  const lblOf = (nm, it) => (it.rat ? nm + " = " + nf(it.v) : it.ex ? nm + " = " + it.ex : nm + " ≈ " + roundStr(it.v, 2));
  const headOf = (small, text) => '<div class="pyt__forms"><span class="pyt__rt"><small>' + esc(small) + '</small><span class="pyt__big">' + esc(text) + "</span></span></div>";

  // ===== режим «Знайти сторону» =====
  function modeSd() {
    const f = el("find").value;
    const HY = L("Гіпотенуза c", "Hypotenuse c"), LA = L("Катет a", "Leg a"), LB = L("Катет b", "Leg b");
    const need = f === "c" ? [["sA", "a", LA], ["sB", "b", LB]] : f === "a" ? [["sC", "c", HY], ["sB", "b", LB]] : [["sC", "c", HY], ["sA", "a", LA]];
    const r = need.map(([id, , lab]) => posLen(id, lab));
    const fe = firstErr(r);
    if (fe) return fe;
    if (r.some((x) => x.miss)) return { ok: false, incomplete: true };
    const val = {};
    need.forEach(([, k], i) => { val[k] = r[i].v; });
    const nd = ND(), u = U1(), u2 = U2(), sq = (x) => mul(x, x);
    const steps = [];
    let ra, rb, rc, foundRv, foundName, exprT;
    if (f === "c") {
      const A = val.a, B = val.b, c2 = add(sq(A), sq(B));
      rc = sqrtRat(c2); ra = rat(A); rb = rat(B); foundRv = rc; foundName = "c";
      steps.push(step(L("Формула", "The formula"), ["c² = a² + b²", "c = √(a² + b²)"], L("Теорема Піфагора: у прямокутному трикутнику квадрат гіпотенузи дорівнює сумі квадратів катетів.", "The Pythagorean theorem: in a right triangle the square of the hypotenuse equals the sum of the squares of the legs.")));
      steps.push(step(L("Підстановка", "Substitution"), ["c² = " + nf(A) + "² + " + nf(B) + "² = " + nf(sq(A)) + " + " + nf(sq(B)) + " = " + nf(c2), "c = √" + rad2(c2) + " = " + num(rvItem(rc), nd, u)]));
      exprT = L("Гіпотенуза: a = ", "Hypotenuse: a = ") + el("sA").value.trim() + ", b = " + el("sB").value.trim();
    } else {
      const C = val.c, K = f === "a" ? val.b : val.a, kn = f === "a" ? "b" : "a";
      if (cmp(C, K) <= 0) return { ok: false, msg: L("Гіпотенуза c має бути більшою за катет " + kn + ": вона завжди найдовша сторона прямокутного трикутника.", "The hypotenuse c must be greater than the leg " + kn + ": it is always the longest side of a right triangle.") };
      const l2 = sub(sq(C), sq(K)), lv = sqrtRat(l2);
      rc = rat(C); foundRv = lv; foundName = f;
      if (f === "a") { ra = lv; rb = rat(K); } else { rb = lv; ra = rat(K); }
      steps.push(step(L("Формула", "The formula"), [f + "² = c² − " + kn + "²", f + " = √(c² − " + kn + "²)"], L("Катет знаходять із тієї самої рівності a² + b² = c², перенісши відомий катет у праву частину.", "A leg comes from the same equality a² + b² = c² with the known leg moved to the right-hand side.")));
      steps.push(step(L("Підстановка", "Substitution"), [f + "² = " + nf(C) + "² − " + nf(K) + "² = " + nf(sq(C)) + " − " + nf(sq(K)) + " = " + nf(l2), f + " = √" + rad2(l2) + " = " + num(rvItem(lv), nd, u)]));
      exprT = (f === "a" ? L("Катет a: c = ", "Leg a: c = ") + el("sC").value.trim() + ", b = " + el("sB").value.trim() : L("Катет b: c = ", "Leg b: c = ") + el("sC").value.trim() + ", a = " + el("sA").value.trim());
    }
    const ia = rvItem(ra), ib = rvItem(rb), ic = rvItem(rc);
    // квадрати сторін завжди раціональні: беремо їх точно
    const A2 = ra.m === O ? sq(ra.c) : mul(sq(ra.c), R(ra.m)), B2 = rb.m === O ? sq(rb.c) : mul(sq(rb.c), R(rb.m)), C2 = rc.m === O ? sq(rc.c) : mul(sq(rc.c), R(rc.m));
    steps.push(step(L("Перевірка", "Check"), ["a² + b² = " + nf(A2) + " + " + nf(B2) + " = " + nf(add(A2, B2)), "c² = " + nf(C2), cmp(add(A2, B2), C2) === 0 ? L("Рівність виконується ✓", "The equality holds ✓") : "≠"]));
    const ab = rvMul(ra, rb), Sv = rvScale(ab, HALF), hc = rvDiv(ab, rc), sIt = rvItem(Sv), hIt = rvItem(hc);
    const Pit = sumItem([ra, rb, rc]);
    const rinV = rvAdd(rvAdd(ra, rb), rvNeg(rc));
    const rinIt = rinV ? rvItem(rvScale(rinV, HALF)) : item(null, mul(sub(add(rvVal(ra), rvVal(rb)), rvVal(rc)), HALF), false);
    const Rit = rvItem(rvScale(rc, HALF));
    const angA = (Math.atan2(toDbl(rvVal(ra)), toDbl(rvVal(rb))) * 180) / Math.PI, angB = 90 - angA;
    steps.push(step(L("Інші величини трикутника", "Other values of the triangle"), [
      "S = ab / 2 = " + num(sIt, nd, u2),
      "P = a + b + c " + (Pit.rat ? "= " + nf(Pit.v) : Pit.ex ? "= " + Pit.ex + " ≈ " + roundStr(Pit.v, nd) : "≈ " + roundStr(Pit.v, nd)) + (u ? " " + u : ""),
      "h(c) = ab / c = " + num(hIt, nd, u),
      "r = (a + b − c) / 2 " + (rinIt.rat ? "= " + nf(rinIt.v) : "≈ " + roundStr(rinIt.v, nd)) + (u ? " " + u : "") + ",  R = c / 2 = " + num(Rit, nd, u)
    ], L("h(c) — висота до гіпотенузи, r — радіус вписаного кола, R — описаного (середина гіпотенузи).", "h(c) is the height to the hypotenuse, r is the inradius, R is the circumradius (the midpoint of the hypotenuse).")));
    steps.push(step(L("Гострі кути", "The acute angles"), ["tg A = a / b,  A ≈ " + angStr(angA, nd), "B = 90° − A ≈ " + angStr(angB, nd)], L("Кути наближені: A лежить проти катета a, B — проти катета b.", "The angles are approximate: A is opposite the leg a, B is opposite the leg b.")));
    const tn = ra.m === O && rb.m === O && rc.m === O ? tripleNote([ra.c, rb.c, rc.c]) : null;
    if (tn) steps.push(step(L("Піфагорова трійка", "Pythagorean triple"), [tn]));
    const fIt = rvItem(foundRv);
    return {
      ok: true, expr: exprT, head: headOf(foundName, brief(fIt, nd, u)),
      tiles: [{ k: L("Периметр P", "Perimeter P"), v: Pit.rat ? withU(nf(Pit.v), u) : withU("≈ " + roundStr(Pit.v, nd), u) }, { k: L("Площа S", "Area S"), v: brief(sIt, nd, u2) }, { k: L("Кути A і B", "Angles A and B"), v: "≈ " + angStr(angA, nd) + ", " + angStr(angB, nd) }],
      steps, visual: { kind: "right", a: toDbl(rvVal(ra)), b: toDbl(rvVal(rb)), al: lblOf("a", ia), bl: lblOf("b", ib), cl: lblOf("c", ic), hi: f },
      resText: foundName + " = " + brief(fIt, nd, u)
    };
  }

  // ===== режим «Чи прямокутний трикутник» =====
  function modeRt() {
    const ids = [["rA", "a"], ["rB", "b"], ["rC", "c"]];
    const r = ids.map(([id, k]) => posLen(id, L("Сторона ", "Side ") + k));
    const fe = firstErr(r);
    if (fe) return fe;
    if (r.some((x) => x.miss)) return { ok: false, incomplete: true };
    const sides = r.map((x, i) => ({ v: x.v, k: ids[i][1], t: el(ids[i][0]).value.trim() })).sort((p, q2) => cmp(p.v, q2.v));
    const [s1, s2, s3] = sides, nd = ND(), u = U1(), u2 = U2(), sq = (x) => mul(x, x);
    if (cmp(add(s1.v, s2.v), s3.v) <= 0) return { ok: false, msg: L("Такі сторони не утворюють трикутник: сума двох менших сторін (" + nf(add(s1.v, s2.v)) + ") не більша за найбільшу (" + nf(s3.v) + ").", "These sides do not form a triangle: the sum of the two smaller sides (" + nf(add(s1.v, s2.v)) + ") is not greater than the largest (" + nf(s3.v) + ").") };
    const q1 = sq(s1.v), q2 = sq(s2.v), q3 = sq(s3.v), sum = add(q1, q2), cv = cmp(sum, q3);
    const kind = cv === 0 ? L("прямокутний", "right") : cv > 0 ? L("гострокутний", "acute") : L("тупокутний", "obtuse");
    const cosG = div(sub(sum, q3), mul(TWO, mul(s1.v, s2.v)));
    const gam = cv === 0 ? 90 : (Math.acos(Math.max(-1, Math.min(1, toDbl(cosG)))) * 180) / Math.PI;
    const steps = [];
    steps.push(step(L("Сторони за зростанням", "Sides in ascending order"), ["s₁ = " + nf(s1.v) + ",  s₂ = " + nf(s2.v) + ",  s₃ = " + nf(s3.v)], L("Гіпотенузою може бути лише найбільша сторона, тому порівнюємо її квадрат із сумою квадратів двох інших.", "Only the largest side can be the hypotenuse, so its square is compared with the sum of the squares of the other two.")));
    steps.push(step(L("Чи існує трикутник", "Does the triangle exist"), ["s₁ + s₂ = " + nf(s1.v) + " + " + nf(s2.v) + " = " + nf(add(s1.v, s2.v)) + " > " + nf(s3.v) + " = s₃ ✓"], L("Нерівність трикутника виконується.", "The triangle inequality holds.")));
    steps.push(step(L("Квадрати сторін", "The squares of the sides"), ["s₁² = " + nf(q1) + ",  s₂² = " + nf(q2) + ",  s₃² = " + nf(q3)]));
    steps.push(step(L("Обернена теорема Піфагора", "The converse of the Pythagorean theorem"), ["s₁² + s₂² = " + nf(q1) + " + " + nf(q2) + " = " + nf(sum), "s₃² = " + nf(q3), nf(sum) + (cv === 0 ? " = " : cv > 0 ? " > " : " < ") + nf(q3) + "  →  " + L("трикутник " + kind, "the triangle is " + kind)], cv === 0 ? L("Якщо s₁² + s₂² = s₃², трикутник прямокутний, а найбільша сторона — гіпотенуза.", "If s₁² + s₂² = s₃², the triangle is right-angled and the largest side is the hypotenuse.") : cv > 0 ? L("Якщо s₁² + s₂² > s₃², найбільший кут гострий — трикутник гострокутний.", "If s₁² + s₂² > s₃², the largest angle is acute — the triangle is acute.") : L("Якщо s₁² + s₂² < s₃², найбільший кут тупий — трикутник тупокутний.", "If s₁² + s₂² < s₃², the largest angle is obtuse — the triangle is obtuse.")));
    steps.push(step(L("Найбільший кут", "The largest angle"), ["cos γ = (s₁² + s₂² − s₃²) / (2 s₁ s₂) = " + nf(cosG), cv === 0 ? "γ = 90°" : "γ ≈ " + angStr(gam, nd)], L("Кут γ лежить проти найбільшої сторони.", "The angle γ is opposite the largest side.")));
    const tn = tripleNote([s1.v, s2.v, s3.v]);
    const bs = bySides(s1.v, s2.v, s3.v);
    const last = [L("За сторонами: ", "By sides: ") + bs];
    if (cv === 0) { const S = div(mul(s1.v, s2.v), TWO); last.push("S = s₁ · s₂ / 2 = " + nf(S) + (u2 ? " " + u2 : "")); }
    if (tn) last.push(tn);
    steps.push(step(L("Додатково", "In addition"), last));
    const names = sides.map((s) => s.k + " = " + s.t);
    return {
      ok: true, expr: L("Сторони: ", "Sides: ") + ids.map(([id, k]) => el(id).value.trim()).join(", ") + (u ? " " + u : ""),
      head: headOf(L("Вид", "Type"), cv === 0 ? L("Прямокутний ✓", "Right-angled ✓") : cv > 0 ? L("Гострокутний, не прямокутний", "Acute, not right") : L("Тупокутний, не прямокутний", "Obtuse, not right")),
      tiles: [{ k: L("Найбільший кут", "Largest angle"), v: cv === 0 ? "90°" : "≈ " + angStr(gam, nd) }, { k: "s₁² + s₂²  vs  s₃²", v: nf(sum) + (cv === 0 ? " = " : cv > 0 ? " > " : " < ") + nf(q3) }, { k: L("Периметр P", "Perimeter P"), v: withU(nf(add(add(s1.v, s2.v), s3.v)), u) }],
      steps, visual: { kind: "tri3", a: toDbl(s1.v), b: toDbl(s2.v), c: toDbl(s3.v), la: names[0], lb: names[1], lc: names[2], right: cv === 0 }, resText: L("Трикутник ", "The triangle is ") + kind
    };
  }

  // ===== режим «Діагональ коробки» =====
  function modeBx() {
    const r = [posLen("dA", L("Довжина a", "Length a")), posLen("dB", L("Ширина b", "Width b")), posLen("dC", L("Висота c", "Height c"))];
    const fe = firstErr(r);
    if (fe) return fe;
    if (r.some((x) => x.miss)) return { ok: false, incomplete: true };
    const [A, B, C] = r.map((x) => x.v), nd = ND(), u = U1(), sq = (x) => mul(x, x);
    const ab2 = add(sq(A), sq(B)), mv = sqrtRat(ab2), d2 = add(ab2, sq(C)), dv = sqrtRat(d2);
    const fac = sqrtRat(add(sq(A), sq(C))), fbc = sqrtRat(add(sq(B), sq(C)));
    const mIt = rvItem(mv), dIt = rvItem(dv), fa = rvItem(fac), fb = rvItem(fbc);
    const sinv = rvDiv(rat(C), dv), phi = (Math.asin(Math.min(1, toDbl(rvVal(sinv)))) * 180) / Math.PI;
    const steps = [];
    steps.push(step(L("Формула", "The formula"), ["d² = a² + b² + c²", "d = √(a² + b² + c²)"], L("Теорему Піфагора застосовують двічі: спершу до діагоналі основи, потім до трикутника з висотою c і цією діагоналлю.", "The Pythagorean theorem is applied twice: first to the diagonal of the base, then to the triangle formed by the height c and that diagonal.")));
    steps.push(step(L("Діагональ основи", "The diagonal of the base"), ["m² = a² + b² = " + nf(sq(A)) + " + " + nf(sq(B)) + " = " + nf(ab2), "m = √" + rad2(ab2) + " = " + num(mIt, nd, u)]));
    steps.push(step(L("Просторова діагональ", "The space diagonal"), ["d² = m² + c² = " + nf(ab2) + " + " + nf(sq(C)) + " = " + nf(d2), "d = √" + rad2(d2) + " = " + num(dIt, nd, u)]));
    steps.push(step(L("Діагоналі граней", "The face diagonals"), ["√(a² + c²) = " + num(fa, nd, u), "√(b² + c²) = " + num(fb, nd, u)], L("Грані a×c і b×c; діагональ грані a×b — це m.", "The faces a×c and b×c; the diagonal of the face a×b is m.")));
    steps.push(step(L("Кут із площиною основи", "The angle with the base plane"), ["sin φ = c / d = " + num(rvItem(sinv), nd, ""), "φ ≈ " + angStr(phi, nd)], L("Кут наближений.", "The angle is approximate.")));
    if (cmp(A, B) === 0 && cmp(B, C) === 0) steps.push(step(L("Куб", "A cube"), ["d = a√3 = " + num(dIt, nd, u)], L("У куба з ребром a просторова діагональ дорівнює a√3.", "In a cube with edge a the space diagonal equals a√3.")));
    return {
      ok: true, expr: L("Коробка ", "Box ") + el("dA").value.trim() + " × " + el("dB").value.trim() + " × " + el("dC").value.trim() + (u ? " " + u : ""), head: headOf("d", brief(dIt, nd, u)),
      tiles: [{ k: L("Діагональ основи m", "Base diagonal m"), v: brief(mIt, nd, u) }, { k: L("Діагоналі граней", "Face diagonals"), v: brief(fa, nd, "") + "; " + brief(fb, nd, u) }, { k: L("Кут із основою φ", "Angle with base φ"), v: "≈ " + angStr(phi, nd) }],
      steps, visual: { kind: "box", a: toDbl(A), b: toDbl(B), c: toDbl(C), la: "a = " + nf(A), lb: "b = " + nf(B), lc: "c = " + nf(C), ld: lblOf("d", dIt), lm: lblOf("m", mIt), cap: L("Схема умовна: косокутна проєкція.", "The sketch is schematic: an oblique projection.") },
      resText: "d = " + brief(dIt, nd, u)
    };
  }

  // ===== режим «Відстань між точками» =====
  function modeDs() {
    const d3 = el("dim").value === "3";
    const ids = d3 ? [["x1", "x₁"], ["y1", "y₁"], ["z1", "z₁"], ["x2", "x₂"], ["y2", "y₂"], ["z2", "z₂"]] : [["x1", "x₁"], ["y1", "y₁"], ["x2", "x₂"], ["y2", "y₂"]];
    const v = ids.map(([id, nm]) => anyNum(id, nm));
    const fe = firstErr(v);
    if (fe) return fe;
    if (v.every((r) => r.miss)) return { ok: false, incomplete: true };
    if (v.some((r) => r.miss)) return { ok: false, incomplete: true, msg: L("Вкажіть усі координати обох точок.", "Enter all coordinates of both points.") };
    const g = v.map((r) => r.v), nd = ND(), u = U1(), sq = (x) => mul(x, x);
    const P1 = d3 ? [g[0], g[1], g[2]] : [g[0], g[1]], P2 = d3 ? [g[3], g[4], g[5]] : [g[2], g[3]];
    const ax = d3 ? ["x", "y", "z"] : ["x", "y"], dl = P1.map((p, i) => sub(P2[i], p)), sqs = dl.map(sq), tot = sqs.reduce((s, x) => add(s, x), R(0));
    const dv = sqrtRat(tot), dIt = rvItem(dv), pt = (P) => "(" + P.map(nf).join("; ") + ")";
    const mid = P1.map((p, i) => div(add(p, P2[i]), TWO));
    const sub1 = ["₁", "₂"];
    const steps = [];
    steps.push(step(L("Формула", "The formula"), ["d = √((x₂ − x₁)² + (y₂ − y₁)²" + (d3 ? " + (z₂ − z₁)²" : "") + ")"], L("Різниці координат — катети прямокутного трикутника (в просторі — ребра коробки), а відстань — гіпотенуза чи діагональ.", "The coordinate differences are the legs of a right triangle (in space — the edges of a box), and the distance is its hypotenuse or diagonal.")));
    steps.push(step(L("Різниці координат", "Coordinate differences"), ax.map((a, i) => "Δ" + a + " = " + a + sub1[1] + " − " + a + sub1[0] + " = " + par(P2[i]) + " − " + par(P1[i]) + " = " + nf(dl[i]))));
    steps.push(step(L("Квадрати й сума", "Squares and the sum"), [ax.map((a) => "Δ" + a + "²").join(" + ") + " = " + sqs.map(nf).join(" + ") + " = " + nf(tot)]));
    steps.push(step(L("Відстань", "The distance"), isZ(tot) ? ["d = 0", L("Точки збігаються.", "The points coincide.")] : ["d = √" + rad2(tot) + " = " + num(dIt, nd, u)]));
    steps.push(step(L("Середина відрізка", "The midpoint"), ["M = " + pt(mid)], L("Координати середини — півсуми координат кінців.", "The midpoint coordinates are the half-sums of the endpoint coordinates.")));
    let visualO = null;
    if (!isZ(tot)) {
      if (d3) { const mx = Math.max(...dl.map((x) => Math.abs(toDbl(x)))); visualO = { kind: "box", a: Math.max(Math.abs(toDbl(dl[0])), mx * 0.03), b: Math.max(Math.abs(toDbl(dl[1])), mx * 0.03), c: Math.max(Math.abs(toDbl(dl[2])), mx * 0.03), la: "Δx = " + nf(dl[0]), lb: "Δy = " + nf(dl[1]), lc: "Δz = " + nf(dl[2]), ld: lblOf("d", dIt), lm: "", cap: L("Схема умовна: коробка зі сторонами |Δx|, |Δy|, |Δz|.", "The sketch is schematic: a box with the sides |Δx|, |Δy|, |Δz|.") }; }
      else visualO = { kind: "pt2", p1: [toDbl(P1[0]), toDbl(P1[1])], p2: [toDbl(P2[0]), toDbl(P2[1])], l1: "A(" + nf(P1[0]) + "; " + nf(P1[1]) + ")", l2: "B(" + nf(P2[0]) + "; " + nf(P2[1]) + ")", lx: "Δx = " + nf(dl[0]), ly: "Δy = " + nf(dl[1]), ld: lblOf("d", dIt) };
    }
    return {
      ok: true, expr: L("Точки ", "Points ") + pt(P1) + L(" і ", " and ") + pt(P2), head: headOf("d", isZ(tot) ? "0" : brief(dIt, nd, u)),
      tiles: dl.map((x, i) => ({ k: "Δ" + ax[i], v: nf(x) })).concat([{ k: L("Середина M", "Midpoint M"), v: pt(mid) }]).slice(0, 4),
      steps, visual: visualO, resText: "d = " + (isZ(tot) ? "0" : brief(dIt, nd, u))
    };
  }

  // ===== режим «Піфагорові трійки» =====
  function triplesUpTo(N) {
    const out = [];
    for (let m = 2; m * m < N; m++) {
      for (let n = 1; n < m; n++) {
        if ((m - n) % 2 === 0 || Number(gcd(BigInt(m), BigInt(n))) !== 1) continue;
        let a = m * m - n * n, b = 2 * m * n; const c = m * m + n * n;
        if (c > N) break;
        if (a > b) [a, b] = [b, a];
        for (let k = 1; k * c <= N; k++) out.push({ a: a * k, b: b * k, c: c * k, k, p: [a, b, c] });
      }
    }
    return out.sort((x, y) => x.c - y.c || x.a - y.a);
  }
  function triplesWith(n) {
    const rows = [];
    // n — катет: n² = (c − b)(c + b), дільники d1 < d2 однакової парності
    const exps = []; let rest = n;
    for (let p = 2; p * p <= rest; p++) { if (rest % p === 0) { let e = 0; while (rest % p === 0) { rest /= p; e++; } exps.push([p, e * 2]); } }
    if (rest > 1) exps.push([rest, 2]);
    let divs = [1];
    exps.forEach(([p, e]) => { const nd = []; divs.forEach((d) => { let pw = 1; for (let i = 0; i <= e; i++) { nd.push(d * pw); pw *= p; } }); divs = nd; });
    const n2 = n * n;
    divs.filter((d) => d * d < n2).sort((x, y) => x - y).forEach((d1) => {
      const d2 = n2 / d1;
      if ((d1 + d2) % 2) return;
      const b = (d2 - d1) / 2, c = (d2 + d1) / 2;
      rows.push({ a: Math.min(n, b), b: Math.max(n, b), c, role: "leg" });
    });
    // n — гіпотенуза
    for (let a = 1; 2 * a * a < n2; a++) {
      const m2 = n2 - a * a, rr = Math.round(Math.sqrt(m2));
      if (rr * rr === m2 && rr > a) rows.push({ a, b: rr, c: n, role: "hyp" });
    }
    return rows;
  }
  const TKP = {
    euclid: { l1: ["Число m", "Number m"], p1: "напр.: 2", l2: ["Число n", "Number n"], p2: "напр.: 1", l3: ["Множник k (необов.)", "Factor k (optional)"], p3: "напр.: 1" },
    list: { l1: ["Найбільша гіпотенуза N", "Largest hypotenuse N"], p1: "напр.: 50" },
    with: { l1: ["Число n", "Number n"], p1: "напр.: 12" }
  };
  const phE = (s) => (IS_EN ? s.replace("напр.", "e.g.") : s);
  function modeTp() {
    const kind = el("tkind").value, steps = [];
    if (kind === "euclid") {
      const rm = posInt("p1", "m", 1e15), rn = posInt("p2", "n", 1e15), rk = el("p3").value.trim() ? posInt("p3", "k", 1e6) : { v: O };
      const fe = firstErr([rm, rn, rk]);
      if (fe) return fe;
      if (rm.miss || rn.miss) return { ok: false, incomplete: true };
      const m = rm.v, n = rn.v, k = rk.v;
      if (m <= n) return { ok: false, msg: L("Має бути m > n: число m більше за n.", "It must be m > n: m is greater than n.") };
      const a0 = m * m - n * n, b0 = 2n * m * n, c0 = m * m + n * n, a = a0 * k, b = b0 * k, c = c0 * k;
      const gg = gcd(m, n), prim = gg === O && (m - n) % 2n === 1n;
      const lo = a < b ? a : b, hi = a < b ? b : a;
      steps.push(step(L("Формула Евкліда", "Euclid's formula"), ["a = m² − n²,  b = 2mn,  c = m² + n²"], L("За довільних натуральних m > n ці три числа задовольняють a² + b² = c².", "For any whole numbers m > n these three numbers satisfy a² + b² = c².")));
      steps.push(step(L("Підстановка", "Substitution"), ["a = " + m + "² − " + n + "² = " + ints(m * m) + " − " + ints(n * n) + " = " + ints(a0), "b = 2 · " + m + " · " + n + " = " + ints(b0), "c = " + m + "² + " + n + "² = " + ints(m * m) + " + " + ints(n * n) + " = " + ints(c0)].concat(k > 1n ? [L("Множник k = ", "Factor k = ") + k + ":  (" + ints(a) + ", " + ints(b) + ", " + ints(c) + ")"] : [])));
      steps.push(step(L("Перевірка", "Check"), ["a² + b² = " + ints(a * a) + " + " + ints(b * b) + " = " + ints(a * a + b * b), "c² = " + ints(c * c), a * a + b * b === c * c ? L("Рівність виконується ✓", "The equality holds ✓") : "≠"]));
      const note = prim ? L("Трійка примітивна: m і n взаємно прості й різної парності.", "The triple is primitive: m and n are coprime and of opposite parity.") : L("Трійка не примітивна: m і n ", "The triple is not primitive: m and n ") + (gg !== O ? L("мають спільний дільник " + gg + ".", "share the divisor " + gg + ".") : L("обидва непарні.", "are both odd.")) + L(" Поділивши на НСД, отримуємо меншу трійку.", " Dividing by the GCD gives a smaller triple.");
      const g3 = gcd(gcd(a, b), c);
      steps.push(step(L("Примітивність", "Primitiveness"), [note, L("НСД трійки = ", "The GCD of the triple = ") + g3 + " → (" + ints(a / g3) + ", " + ints(b / g3) + ", " + ints(c / g3) + ")"]));
      const S = (a * b) / 2n, Prm = a + b + c;
      return {
        ok: true, expr: L("За формулою Евкліда: m = ", "By Euclid's formula: m = ") + m + ", n = " + n + (k > 1n ? ", k = " + k : ""), head: headOf("a, b, c", ints(lo) + ", " + ints(hi) + ", " + ints(c)),
        tiles: [{ k: L("Периметр P", "Perimeter P"), v: ints(Prm) }, { k: L("Площа S", "Area S"), v: a * b % 2n === Z ? ints(S) : ints(a * b) + "/2" }, { k: L("Примітивна", "Primitive"), v: prim && k === O ? L("так", "yes") : L("ні", "no") }],
        steps, visual: { kind: "right", a: Number(lo), b: Number(hi), al: "a = " + ints(lo), bl: "b = " + ints(hi), cl: "c = " + ints(c), hi: "" }, resText: "(" + ints(lo) + ", " + ints(hi) + ", " + ints(c) + ")"
      };
    }
    if (kind === "list") {
      const rN = posInt("p1", "N", 10000);
      const fe = firstErr([rN]);
      if (fe) return fe;
      if (rN.miss) return { ok: false, incomplete: true };
      const N = Number(rN.v);
      if (N < 5) return { ok: false, msg: L("Найменша піфагорова трійка (3, 4, 5) має c = 5, тож N має бути не менше 5.", "The smallest Pythagorean triple (3, 4, 5) has c = 5, so N must be at least 5.") };
      const all = triplesUpTo(N), primCnt = all.filter((t) => t.k === 1).length, shown = all.slice(0, 100);
      steps.push(step(L("Як шукаємо", "How they are found"), ["a = m² − n²,  b = 2mn,  c = m² + n²  (m > n, " + L("різної парності, взаємно прості", "opposite parity, coprime") + ")"], L("Так виходять усі примітивні трійки; решту дають їх множення на k = 2, 3, …", "This gives all primitive triples; the rest are their multiples by k = 2, 3, …")));
      steps.push(step(L("Скільки трійок", "How many triples"), [L("з гіпотенузою c ≤ ", "with the hypotenuse c ≤ ") + N + ": " + all.length, L("з них примітивних: ", "of them primitive: ") + primCnt]));
      return {
        ok: true, expr: L("Трійки з гіпотенузою до ", "Triples with a hypotenuse up to ") + N, head: headOf(L("Трійок", "Triples"), String(all.length)),
        tiles: [{ k: L("Усього", "Total"), v: String(all.length) }, { k: L("Примітивних", "Primitive"), v: String(primCnt) }, { k: L("Найбільша c", "Largest c"), v: all.length ? String(all[all.length - 1].c) : "—" }],
        table: { head: ["a", "b", "c", L("Тип", "Type")], rows: shown.map((t) => [t.a, t.b, t.c, t.k === 1 ? L("примітивна", "primitive") : t.k + " × (" + t.p.join(", ") + ")"]), cap: all.length > shown.length ? L("Показано перші " + shown.length + " з " + all.length + " (за зростанням c).", "The first " + shown.length + " of " + all.length + " are shown (by increasing c).") : "" },
        steps, visual: null, resText: L("Трійок до c ≤ ", "Triples with c ≤ ") + N + ": " + all.length
      };
    }
    const rn = posInt("p1", "n", 1000000);
    const fe2 = firstErr([rn]);
    if (fe2) return fe2;
    if (rn.miss) return { ok: false, incomplete: true };
    const n = Number(rn.v), rows = triplesWith(n), legs = rows.filter((r) => r.role === "leg"), hyps = rows.filter((r) => r.role === "hyp");
    if (!rows.length) return { ok: false, msg: L("Числа " + n + " немає в жодній піфагоровій трійці: тільки 1 і 2 не входять до трійок.", "The number " + n + " is in no Pythagorean triple: only 1 and 2 are not part of any.") };
    const shown = rows.slice(0, 60);
    steps.push(step(L("Число як катет", "The number as a leg"), ["n² = (c − b)(c + b) = " + ints(n * n), L("Дільники n² парами d₁ · d₂ однакової парності дають b = (d₂ − d₁)/2, c = (d₂ + d₁)/2.", "Pairs of divisors d₁ · d₂ of n² with the same parity give b = (d₂ − d₁)/2, c = (d₂ + d₁)/2."), L("Знайдено трійок: ", "Triples found: ") + legs.length]));
    steps.push(step(L("Число як гіпотенуза", "The number as the hypotenuse"), [L("Для кожного катета a < n перевіряємо, чи n² − a² — повний квадрат.", "For each leg a < n we check whether n² − a² is a perfect square."), L("Знайдено трійок: ", "Triples found: ") + hyps.length]));
    return {
      ok: true, expr: L("Трійки із числом ", "Triples containing the number ") + n, head: headOf(L("Трійок", "Triples"), String(rows.length)),
      tiles: [{ k: L("Як катет", "As a leg"), v: String(legs.length) }, { k: L("Як гіпотенуза", "As the hypotenuse"), v: String(hyps.length) }, { k: L("Усього", "Total"), v: String(rows.length) }],
      table: { head: ["a", "b", "c", L("Число n", "The number n")], rows: shown.map((t) => [t.a, t.b, t.c, t.role === "leg" ? L("катет", "leg") : L("гіпотенуза", "hypotenuse")]), cap: rows.length > shown.length ? L("Показано перші " + shown.length + " з " + rows.length + ".", "The first " + shown.length + " of " + rows.length + " are shown.") : "" },
      steps, visual: null, resText: L("Трійок із числом ", "Triples with ") + n + ": " + rows.length
    };
  }

  // ===== схеми =====
  const label = (x, y, t, anchor, col, size) => '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + (size || 15) + '" font-weight="700" fill="' + (col || "#1f2f55") + '" text-anchor="' + (anchor || "middle") + '" paint-order="stroke" stroke="#fff" stroke-width="3.5" stroke-linejoin="round">' + esc(t) + "</text>";
  function fit(pts, W, H, pad) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const w = Math.max(x1 - x0, 1e-9), h = Math.max(y1 - y0, 1e-9), s = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
    const ox = (W - w * s) / 2 - x0 * s, oy = (H + h * s) / 2 + y0 * s;
    return { P: (p) => [p[0] * s + ox, oy - p[1] * s], s };
  }
  const BLUE = "#4f6fb8", ORG = "#d85a30", GRN = "#2f9d6a";
  const ln = (p, r, col, w, dash) => '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + r[0].toFixed(1) + '" y2="' + r[1].toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>";
  const dot = (p) => '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.5" fill="#283b69" stroke="#fff" stroke-width="1.5"/>';
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const outFrom = (m, c, d) => { const vx = m[0] - c[0], vy = m[1] - c[1], l = Math.hypot(vx, vy) || 1; return [m[0] + (vx / l) * d, m[1] + (vy / l) * d]; };
  function rightMark(P, Q, Rr, size) {
    const u1 = [Q[0] - P[0], Q[1] - P[1]], u2 = [Rr[0] - P[0], Rr[1] - P[1]], l1 = Math.hypot(...u1) || 1, l2 = Math.hypot(...u2) || 1, s = size || 14;
    const a = [P[0] + (u1[0] / l1) * s, P[1] + (u1[1] / l1) * s], b = [a[0] + (u2[0] / l2) * s, a[1] + (u2[1] / l2) * s], c = [P[0] + (u2[0] / l2) * s, P[1] + (u2[1] / l2) * s];
    return '<path d="M ' + a[0].toFixed(1) + " " + a[1].toFixed(1) + " L " + b[0].toFixed(1) + " " + b[1].toFixed(1) + " L " + c[0].toFixed(1) + " " + c[1].toFixed(1) + '" fill="none" stroke="' + GRN + '" stroke-width="2"/>';
  }
  function boxSvg(v, W, H) {
    const mx = Math.max(v.a, v.b, v.c), sm = (x) => Math.max(0.3, Math.pow(x / mx, 0.6)), ca = sm(v.a), cb = sm(v.b), cc = sm(v.c), dx = 0.55 * cb * Math.cos(Math.PI / 4), dy = 0.55 * cb * Math.sin(Math.PI / 4);
    const raw = { f0: [0, 0], f1: [ca, 0], f2: [ca, cc], f3: [0, cc], b0: [dx, dy], b1: [ca + dx, dy], b2: [ca + dx, cc + dy], b3: [dx, cc + dy] };
    const f = fit(Object.values(raw), W, H, 54), P = {};
    Object.keys(raw).forEach((k) => { P[k] = f.P(raw[k]); });
    let s = '<polygon points="' + [P.f0, P.f1, P.f2, P.f3].map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ") + '" fill="#e8efff" stroke="none"/>';
    s += '<polygon points="' + [P.f3, P.f2, P.b2, P.b3].map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ") + '" fill="#dbe6fb" stroke="none"/>';
    s += '<polygon points="' + [P.f1, P.b1, P.b2, P.f2].map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ") + '" fill="#cfdcf7" stroke="none"/>';
    [["b0", "f0"], ["b0", "b1"], ["b0", "b3"]].forEach(([i, j]) => { s += ln(P[i], P[j], "#9aa8c7", 1.8, "5 5"); });
    [["f0", "f1"], ["f1", "f2"], ["f2", "f3"], ["f3", "f0"], ["f3", "b3"], ["f2", "b2"], ["b3", "b2"], ["f1", "b1"], ["b1", "b2"]].forEach(([i, j]) => { s += ln(P[i], P[j], BLUE, 2.8); });
    if (v.lm) s += ln(P.f0, P.b1, "#e0a000", 2.4, "6 5");
    s += ln(P.f0, P.b2, ORG, 3.4) + dot(P.f0) + dot(P.b2);
    const ctr = mid(P.f0, P.b2);
    s += label(P.f0[0] + (P.f1[0] - P.f0[0]) / 2, P.f0[1] + 22, v.la, "middle", "#283b69", 14);
    s += label(P.f0[0] - 10, (P.f0[1] + P.f3[1]) / 2 + 5, v.lc, "end", "#283b69", 14);
    const mb = mid(P.f1, P.b1);
    s += label(mb[0] + 12, mb[1] + 6, v.lb, "start", "#283b69", 14);
    s += label(ctr[0] - 6, ctr[1] - 10, v.ld, "end", "#b4411f", 15);
    if (v.lm) { const mm = [P.f0[0] + 0.62 * (P.b1[0] - P.f0[0]), P.f0[1] + 0.62 * (P.b1[1] - P.f0[1])]; s += label(mm[0] + 4, mm[1] - 7, v.lm, "start", "#8a6400", 13); }
    return s;
  }
  function visual(v) {
    const W = 420, H = 260;
    let s = '<svg class="pyt__svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + L("Схема", "Diagram") + '"><rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    const poly = (p) => '<polygon points="' + p.map((q2) => q2[0].toFixed(1) + "," + q2[1].toFixed(1)).join(" ") + '" fill="#e8efff" stroke="none"/>';
    if (v.kind === "box") s += boxSvg(v, W, H);
    else if (v.kind === "pt2") {
      const pts = [v.p1, v.p2, [0, 0]], f = fit(pts, W, H, 50), A = f.P(v.p1), B = f.P(v.p2), O0 = f.P([0, 0]), Cc = f.P([v.p2[0], v.p1[1]]);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const step0 = (r) => { const raw = r / 5, mg = Math.pow(10, Math.floor(Math.log10(raw))), nm = raw / mg; return (nm <= 1 ? 1 : nm <= 2 ? 2 : nm <= 5 ? 5 : 10) * mg; };
      const gs = Math.max(step0(Math.max(...xs) - Math.min(...xs) || 1), step0(Math.max(...ys) - Math.min(...ys) || 1));
      for (let gx = Math.ceil((Math.min(...xs) - 1e-9) / gs) * gs; gx <= Math.max(...xs) + 1e-9; gx += gs) s += '<line x1="' + f.P([gx, 0])[0].toFixed(1) + '" y1="10" x2="' + f.P([gx, 0])[0].toFixed(1) + '" y2="' + (H - 10) + '" stroke="#eef0f6"/>';
      for (let gy = Math.ceil((Math.min(...ys) - 1e-9) / gs) * gs; gy <= Math.max(...ys) + 1e-9; gy += gs) s += '<line x1="10" y1="' + f.P([0, gy])[1].toFixed(1) + '" x2="' + (W - 10) + '" y2="' + f.P([0, gy])[1].toFixed(1) + '" stroke="#eef0f6"/>';
      s += '<line x1="10" y1="' + O0[1].toFixed(1) + '" x2="' + (W - 10) + '" y2="' + O0[1].toFixed(1) + '" stroke="#9aa3b5" stroke-width="1.4"/><line x1="' + O0[0].toFixed(1) + '" y1="10" x2="' + O0[0].toFixed(1) + '" y2="' + (H - 10) + '" stroke="#9aa3b5" stroke-width="1.4"/>';
      s += poly([A, Cc, B]) + ln(A, Cc, BLUE, 2.4, "6 5") + ln(Cc, B, BLUE, 2.4, "6 5") + ln(A, B, ORG, 3.6);
      if (Math.abs(A[0] - Cc[0]) > 18 && Math.abs(B[1] - Cc[1]) > 18) s += rightMark(Cc, A, B, 12);
      s += dot(A) + dot(B);
      const ctr = [(A[0] + B[0] + Cc[0]) / 3, (A[1] + B[1] + Cc[1]) / 3];
      const oa = outFrom(A, ctr, 20), ob = outFrom(B, ctr, 20), ox = outFrom(mid(A, Cc), ctr, 18), oy = outFrom(mid(Cc, B), ctr, 22), od = outFrom(mid(A, B), ctr, 22);
      s += label(oa[0], oa[1] + 5, v.l1, "middle", "#b4411f", 13) + label(ob[0], ob[1] + 5, v.l2, "middle", "#b4411f", 13);
      s += label(ox[0], ox[1] + 5, v.lx, "middle", "#283b69", 13) + label(oy[0], oy[1] + 5, v.ly, "middle", "#283b69", 13) + label(od[0], od[1] + 5, v.ld, "middle", "#b4411f", 14);
    } else {
      let A, B, C, lab, hl = null;
      if (v.kind === "right") { A = [0, 0]; B = [v.a, 0]; C = [0, v.b]; lab = { ab: v.al, ac: v.bl, bc: v.cl }; hl = v.hi; }
      else { const cc = v.c, b = v.b, a = v.a, cosA = (b * b + cc * cc - a * a) / (2 * b * cc); A = [0, 0]; B = [cc, 0]; C = [b * cosA, b * Math.sqrt(Math.max(0, 1 - cosA * cosA))]; lab = { ab: v.lc, ac: v.lb, bc: v.la }; hl = "c"; }
      const f = fit([A, B, C], W, H, 54), P = [f.P(A), f.P(B), f.P(C)], ctr = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
      s += poly(P);
      const hiSide = v.kind === "right" ? { a: [0, 1], b: [0, 2], c: [1, 2] }[hl] : [0, 1];
      [[0, 1], [0, 2], [1, 2]].forEach(([i, j]) => { const on = hiSide && hiSide[0] === i && hiSide[1] === j; s += ln(P[i], P[j], on ? ORG : BLUE, on ? 4 : 3); });
      if (v.kind === "right") s += rightMark(P[0], P[1], P[2]);
      else if (v.right) s += rightMark(P[2], P[0], P[1]);
      s += P.map(dot).join("");
      const side = (i, j, t) => { if (!t) return; const m = mid(P[i], P[j]), o = outFrom(m, ctr, 22); s += label(o[0], o[1] + 5, t, "middle", "#283b69", 14); };
      side(0, 1, lab.ab); side(0, 2, lab.ac); side(1, 2, lab.bc);
    }
    return s + "</svg>";
  }

  // ===== відображення =====
  const CALC = { sd: modeSd, rt: modeRt, bx: modeBx, ds: modeDs, tp: modeTp };
  function stepsHtml(steps) {
    return '<div class="pyt__sub">' + L("Розв'язання", "Solution") + "</div>" + steps.map((s, i) => '<div class="pyt__step"><span class="pyt__stepN">' + (i + 1) + '</span><div><b class="pyt__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="pyt__math">' + esc(x) + "</p>").join("") + (s.note ? '<p class="pyt__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join("");
  }
  function tableHtml(t) {
    return '<div class="pyt__tblWrap"><table class="pyt__tbl pyt__tbl--list"><thead><tr>' + t.head.map((h) => "<th>" + esc(h) + "</th>").join("") + "</tr></thead><tbody>" + t.rows.map((r) => "<tr>" + r.map((c, i) => (i === r.length - 1 ? '<td class="pyt__tdL">' : "<td>") + esc(String(c)) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>" + (t.cap ? '<div class="pyt__note">' + esc(t.cap) + "</div>" : "");
  }
  const clean = (s) => s.replace(/ /g, "");
  function textOf(m) {
    const parts = [m.expr + "  →  " + m.resText, ""];
    if (m.table) parts.push(m.table.head.join("\t"), ...m.table.rows.map((r) => r.join("\t")), "");
    parts.push(...m.steps.map((s, i) => (i + 1) + ". " + s.t + "\n   " + s.l.join("\n   ")));
    return clean(parts.join("\n"));
  }
  let last = null;
  function render(m, strict) {
    const box = el("result");
    if (!m.ok) {
      last = null;
      if (m.incomplete && !strict) { box.innerHTML = T.enter; return; }
      box.innerHTML = '<div class="pyt__hintbox">' + esc(m.msg || T.enter) + "</div>";
      return;
    }
    last = m;
    const tiles = '<div class="pyt__tiles">' + m.tiles.map((t) => '<div class="pyt__tile"><small>' + esc(t.k) + "</small><b>" + esc(t.v) + "</b></div>").join("") + "</div>";
    const vis = m.visual ? '<div class="pyt__sub">' + L("Схема", "Diagram") + '</div><div class="pyt__graph">' + visual(m.visual) + "</div>" + (m.visual.cap ? '<div class="pyt__note">' + esc(m.visual.cap) + "</div>" : "") : "";
    const tbl = m.table ? '<div class="pyt__sub">' + L("Список", "The list") + "</div>" + tableHtml(m.table) : "";
    box.innerHTML = '<div class="pyt__rhead"><div class="pyt__expr">' + esc(m.expr) + "</div>" + m.head + "</div>" + tiles + tbl + vis + stepsHtml(m.steps) + '<div class="pyt__note">' + L("Точні значення записано дробами й радикалами; десяткові наближені до обраної кількості знаків.", "Exact values are written with fractions and radicals; decimals are rounded to the chosen number of places.") + "</div>";
  }
  const autoOn = () => !el("autoCalc") || el("autoCalc").checked;
  function calc(strict) {
    let m;
    try { m = CALC[mode](); } catch (e) { m = { ok: false, msg: String(e && e.message ? e.message : e) }; }
    render(m, strict === true);
    return m;
  }
  function maybeCalc() { if (autoOn()) calc(); else render({ ok: false, incomplete: true }, false); }

  // ===== режими, списки, кнопки =====
  const DDP = { unit: "ut", decs: "dc", find: "fd", dim: "dm", tkind: "tk" };
  function setDd(hid, v) {
    const pre = DDP[hid], lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return false;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
    return true;
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
  const FIELDS = ["sA", "sB", "sC", "rA", "rB", "rC", "dA", "dB", "dC", "x1", "y1", "z1", "x2", "y2", "z2", "p1", "p2", "p3"];
  const DDS = ["unit", "decs", "find", "dim", "tkind"];
  const PANELS = { sd: "panelSd", rt: "panelRt", bx: "panelBx", ds: "panelDs", tp: "panelTp" };
  function syncFind() {
    const f = el("find").value;
    el("sARow").hidden = f === "a"; el("sBRow").hidden = f === "b"; el("sCRow").hidden = f === "c";
  }
  function syncDim() {
    const d3 = el("dim").value === "3";
    el("z1Row").hidden = !d3; el("z2Row").hidden = !d3;
    el("ptA").className = d3 ? "pyt__rows3" : "pyt__rows2"; el("ptB").className = d3 ? "pyt__rows3" : "pyt__rows2";
  }
  function syncTk() {
    const k = el("tkind").value, c = TKP[k];
    el("p1Label").textContent = L(c.l1[0], c.l1[1]); el("p1").placeholder = phE(c.p1);
    el("p2Row").hidden = !c.l2; el("p3Row").hidden = !c.l3;
    if (c.l2) { el("p2Label").textContent = L(c.l2[0], c.l2[1]); el("p2").placeholder = phE(c.p2); }
    if (c.l3) { el("p3Label").textContent = L(c.l3[0], c.l3[1]); el("p3").placeholder = phE(c.p3); }
    el("ptP").className = c.l3 ? "pyt__rows3" : "pyt__rows2";
  }
  function syncUnit() { el("setBox").hidden = mode === "tp"; }
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".pyt__tab").forEach((b) => { const on = b.dataset.m === m; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    MODES.forEach((k) => { el(PANELS[k]).hidden = k !== m; });
    syncUnit();
    maybeCalc();
  }
  const DEFAULTS = { unit: "none", decs: "4", find: "c", dim: "2", tkind: "euclid" };
  function syncAll() { syncFind(); syncDim(); syncTk(); }
  function resetAll() { FIELDS.forEach((id) => (el(id).value = "")); DDS.forEach((k) => setDd(k, DEFAULTS[k])); syncAll(); maybeCalc(); }
  const put = (o) => Object.keys(o).forEach((k) => { el(k).value = o[k]; });
  const EXAMPLES = {
    sd: () => { setDd("find", "c"); syncFind(); put({ sA: "3", sB: "4" }); },
    rt: () => put({ rA: "7", rB: "24", rC: "25" }),
    bx: () => put({ dA: "3", dB: "4", dC: "12" }),
    ds: () => { setDd("dim", "2"); syncDim(); put({ x1: "0", y1: "0", x2: "3", y2: "4" }); },
    tp: () => { setDd("tkind", "euclid"); syncTk(); put({ p1: "2", p2: "1" }); }
  };
  function fillExample() { resetAll(); EXAMPLES[mode](); calc(true); toast(T.example); }
  function share() {
    const p = new URLSearchParams();
    p.set("m", mode);
    DDS.forEach((k) => p.set(DDP[k], el(k).value));
    FIELDS.forEach((id) => el(id).value.trim() && p.set(id, el(id).value.trim()));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const qs = new URLSearchParams(location.search);
    if (![...qs.keys()].length) return false;
    if (MODES.includes(qs.get("m"))) mode = qs.get("m");
    DDS.forEach((k) => { if (qs.has(DDP[k])) setDd(k, qs.get(DDP[k])); });
    FIELDS.forEach((id) => { if (qs.has(id)) el(id).value = qs.get(id).slice(0, 60); });
    return true;
  }
  async function copyResult() {
    if (!last) { toast(T.calcFirst); return; }
    try { await navigator.clipboard.writeText(textOf(last)); toast(T.copied); } catch { toast(T.copyFailed); }
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".pyt__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    DDS.forEach((k) => initDd(DDP[k], (v) => { setDd(k, v); if (k === "find") syncFind(); if (k === "dim") syncDim(); if (k === "tkind") syncTk(); maybeCalc(); }));
    FIELDS.forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); calc(true); } }); });
    el("calcBtn").addEventListener("click", () => { const m = calc(true); if (!m.ok && m.msg) toast(m.msg); });
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => { resetAll(); toast(T.reset); });
    el("shareBtn").addEventListener("click", share);
    el("copyBtn").addEventListener("click", copyResult);
    const used = applyFromUrl();
    syncAll();
    setMode(mode);
    if (used) calc();
  });
})();
