/* triangle.js — калькулятор площі трикутника: п'ять режимів (основа й висота; три сторони — Герон; дві сторони й кут; координати вершин; особливі види), розв'язання по кроках, схеми за масштабом (UK/EN)
   Числа — точні раціональні (ціле, десяткове, дріб). Площа за Героном і довжини сторін за координатами записуються точно: S = c·√m (m без квадратних множників), поруч десяткове наближення.
   Герон: S² = p(p − a)(p − b)(p − c) — раціональне число, тому корінь спрощується без втрати точності. Додатково: P, h = 2S/a, r = S/p, R = abc/(4S), кути за теоремою косинусів, тип за сторонами й кутами.
   Дві сторони й кут: S = ab·sin γ / 2; для 30°, 45°, 60°, 90°, 120°, 135°, 150° синус точний, для решти — наближений (double).
   Координати: 2S = |x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)|. Особливі види: рівносторонній, рівнобедрений, прямокутний. Площа переводиться в інші одиниці точно. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const SEP = IS_EN ? "." : ",";
  const MODES = ["bh", "ts", "sa", "co", "sp"];
  const MAXD = 30;
  let mode = "bh";

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
  const Z = 0n, O = 1n, NB = " ";
  const babs = (x) => (x < Z ? -x : x);
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  const q = (n, d = O) => { if (d < Z) { n = -n; d = -d; } const g = gcd(n, d) || O; return { n: n / g, d: d / g }; };
  const add = (x, y) => q(x.n * y.d + y.n * x.d, x.d * y.d);
  const sub = (x, y) => q(x.n * y.d - y.n * x.d, x.d * y.d);
  const mul = (x, y) => q(x.n * y.n, x.d * y.d);
  const div = (x, y) => q(x.n * y.d, x.d * y.n);
  const neg = (x) => ({ n: -x.n, d: x.d });
  const abs = (x) => ({ n: babs(x.n), d: x.d });
  const isZ = (x) => x.n === Z;
  const R = (n) => ({ n: BigInt(n), d: O });
  const ONE = R(1), TWO = R(2);
  const cmp = (x, y) => { const d = sub(x, y); return d.n < Z ? -1 : d.n > Z ? 1 : 0; };
  const isqrt = (n) => { if (n < 2n) return n; let x = 1n << BigInt((n.toString(2).length + 1) >> 1), y = (x + n / x) >> 1n; while (y < x) { x = y; y = (x + n / x) >> 1n; } return x; };
  const sqrtApprox = (x) => { const P = 40n; return q(isqrt((x.n * 10n ** (2n * P)) / x.d), 10n ** P); };
  const toDbl = (r) => Number(r.n) / Number(r.d);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const step = (t, lines, note) => ({ t, l: lines, note });
  const MN = "−";
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
  const dblStr = (x, nd) => { if (!Number.isFinite(x) || Math.abs(x) >= 1e15) return "—"; return x.toFixed(nd).replace(/\.?0+$/, "").replace(".", SEP) || "0"; };
  const fromDbl = (x) => q(BigInt(Math.round(x * 1e12)), 10n ** 12n);
  const ND = () => Number(el("decs").value) || 4;

  // ===== радикали =====
  function simplifyRadical(m) { // m > 0 → { k, m }
    let k = O, rem = m;
    for (let p = 2n; p <= 100000n && p * p <= rem; p++) {
      const p2 = p * p;
      while (rem % p2 === Z) { rem /= p2; k *= p; }
    }
    if (rem > O) { const s = isqrt(rem); if (s * s === rem) { k *= s; rem = O; } }
    return { k, m: rem };
  }
  // √Q для раціонального Q ≥ 0 → { c, m }: √Q = c·√m
  function sqrtRat(Qv) {
    if (isZ(Qv)) return { c: R(0), m: O };
    const { k, m } = simplifyRadical(Qv.n * Qv.d);
    return { c: q(k, Qv.d), m };
  }
  const radText = (c, m) => (m === O ? nf(c) : (c.d === O ? (c.n === O ? "" : String(c.n)) : (c.n === O ? "" : String(c.n))) + "√" + m + (c.d === O ? "" : "/" + c.d));
  const rvScale = (r, k) => ({ c: mul(r.c, k), m: r.m });
  const rvItem = (r) => (r.m === O ? item(null, r.c, true) : item(radText(r.c, r.m), mul(r.c, sqrtApprox(R(r.m))), false));
  const rvVal = (r) => (r.m === O ? r.c : mul(r.c, sqrtApprox(R(r.m))));
  // величина: { ex: точний запис | null, v: наближення, rat: чи точно раціональна }
  const item = (ex, v, rat) => ({ ex, v, rat: !!rat });
  const num = (it, nd, suf) => {
    if (it.rat) return nf(it.v) + (it.v.d !== O && !exactDec(it.v) ? " ≈ " + roundStr(it.v, nd) : "") + (suf ? " " + suf : "");
    return (it.ex ? it.ex + (suf ? " " + suf : "") + " ≈ " : "≈ ") + roundStr(it.v, nd) + (suf ? " " + suf : "");
  };
  const brief = (it, nd, suf) => {
    if (it.rat) return (it.v.d === O || exactDec(it.v) ? nf(it.v) : "≈ " + roundStr(it.v, nd)) + (suf ? " " + suf : "");
    return (it.ex ? it.ex + " ≈ " : "≈ ") + roundStr(it.v, nd) + (suf ? " " + suf : "");
  };

  // ===== одиниці =====
  const MMF = { none: ONE, mm: ONE, cm: R(10), dm: R(100), m: R(1000), km: R(1000000), in: q(127n, 5n), ft: q(1524n, 5n) };
  const UL = { none: ["", ""], mm: [L("мм", "mm"), L("мм²", "mm²")], cm: [L("см", "cm"), L("см²", "cm²")], dm: [L("дм", "dm"), L("дм²", "dm²")], m: [L("м", "m"), L("м²", "m²")], km: [L("км", "km"), L("км²", "km²")], in: [L("дюйм", "in"), L("дюйм²", "in²")], ft: [L("фут", "ft"), L("фут²", "ft²")] };
  const unit = () => el("unit").value || "none";
  const U1 = () => (unit() === "none" ? "" : UL[unit()][0]);
  const U2 = () => (unit() === "none" ? "" : UL[unit()][1]);
  function convSteps(steps, S, nd) {
    const un = unit();
    if (un === "none") return;
    const f = MMF[un], mm2 = mul(S, mul(f, f));
    const lines = ["mm", "cm", "dm", "m", "km", "in", "ft"].filter((k) => k !== un).map((k) => { const g = MMF[k]; return "= " + roundStr(div(mm2, mul(g, g)), 10) + " " + UL[k][1]; });
    if (["mm", "cm", "dm", "m", "km"].includes(un)) lines.push("= " + roundStr(div(mm2, R(10000000000)), 10) + " " + L("га", "ha"));
    steps.push(step(L("Площа в інших одиницях", "The area in other units"), [roundStr(S, nd) + " " + UL[un][1]].concat(lines), L("Множники точні: 1 дюйм = 25,4 мм, 1 фут = 304,8 мм, 1 га = 10 000 м².", "The factors are exact: 1 in = 25.4 mm, 1 ft = 304.8 mm, 1 ha = 10 000 m².")));
  }

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

  // ===== тип трикутника =====
  function typeOf(a2, b2, c2, sideEq) { // a2, b2, c2 — квадрати сторін (раціональні); sideEq — [чи a=b, b=c, a=c]
    const arr = [a2, b2, c2].sort((x, y) => cmp(x, y));
    const sum = add(arr[0], arr[1]), c = cmp(arr[2], sum);
    const byAngle = c === 0 ? L("прямокутний", "right") : c < 0 ? L("гострокутний", "acute") : L("тупокутний", "obtuse");
    const eqn = sideEq.filter(Boolean).length;
    const bySide = eqn === 3 || (eqn >= 2 && sideEq[0] && sideEq[1]) ? L("рівносторонній", "equilateral") : eqn >= 1 ? L("рівнобедрений", "isosceles") : L("різносторонній", "scalene");
    return { byAngle, bySide, right: c === 0, cmpv: c, big: arr[2], sum };
  }

  // ===== режим «Основа і висота» =====
  function modeBh() {
    const a = posLen("bB", L("Основа", "Base")), h = posLen("bH", L("Висота", "Height"));
    for (const r of [a, h]) if (r.err) return { ok: false, msg: r.err };
    if (a.miss || h.miss) return { ok: false, incomplete: true };
    const nd = ND(), u = U1(), u2 = U2();
    const S = div(mul(a.v, h.v), TWO), sIt = item(null, S, true);
    const steps = [step(L("Формула", "The formula"), ["S = a · h / 2"], L("Площа трикутника — половина добутку основи на висоту, проведену до неї.", "The area of a triangle is half the product of a base and the height drawn to it.")), step(L("Підстановка", "Substitution"), ["S = " + nf(a.v) + " · " + nf(h.v) + " / 2 = " + nf(mul(a.v, h.v)) + " / 2 = " + num(sIt, nd, u2)])];
    convSteps(steps, S, nd);
    const head = '<div class="tri__forms"><span class="tri__rt"><small>S</small><span class="tri__big">' + esc(brief(sIt, nd, u2)) + "</span></span></div>";
    return { ok: true, expr: L("Трикутник: a = ", "Triangle: a = ") + el("bB").value.trim() + ", h = " + el("bH").value.trim() + (u ? " " + u : ""), head, tiles: [{ k: L("Основа a", "Base a"), v: nf(a.v) + (u ? " " + u : "") }, { k: L("Висота h", "Height h"), v: nf(h.v) + (u ? " " + u : "") }, { k: L("Добуток a·h", "Product a·h"), v: nf(mul(a.v, h.v)) + (u2 ? " " + u2 : "") }], steps, visual: { kind: "bh", a: toDbl(a.v), h: toDbl(h.v), al: nf(a.v), hl: nf(h.v) }, resText: "S = " + brief(sIt, nd, u2) };
  }

  // ===== режим «Три сторони» =====
  function modeTs() {
    const a = posLen("tA", L("Сторона a", "Side a")), b = posLen("tB", L("Сторона b", "Side b")), c = posLen("tC", L("Сторона c", "Side c"));
    for (const r of [a, b, c]) if (r.err) return { ok: false, msg: r.err };
    if (a.miss || b.miss || c.miss) return { ok: false, incomplete: true };
    const A = a.v, B = b.v, C = c.v;
    if (cmp(add(A, B), C) <= 0 || cmp(add(A, C), B) <= 0 || cmp(add(B, C), A) <= 0) return { ok: false, msg: L("Такі сторони не утворюють трикутник: сума двох сторін має бути більшою за третю (при рівності трикутник вироджується в відрізок).", "These sides do not form a triangle: the sum of two sides must be greater than the third (with equality it degenerates into a segment).") };
    const nd = ND(), u = U1(), u2 = U2();
    const P = add(add(A, B), C), p = div(P, TWO);
    const pa = sub(p, A), pb = sub(p, B), pc = sub(p, C);
    const Q = mul(mul(p, pa), mul(pb, pc));
    const rv = sqrtRat(Q), sIt = rvItem(rv), S = rvVal(rv);
    const steps = [];
    steps.push(step(L("Півпериметр", "The semiperimeter"), ["p = (a + b + c) / 2 = (" + nf(A) + " + " + nf(B) + " + " + nf(C) + ") / 2 = " + nf(p)]));
    steps.push(step(L("Формула Герона", "Heron's formula"), ["p − a = " + nf(pa) + ",  p − b = " + nf(pb) + ",  p − c = " + nf(pc), "S² = p(p − a)(p − b)(p − c) = " + nf(p) + " · " + nf(pa) + " · " + nf(pb) + " · " + nf(pc) + " = " + nf(Q), "S = √" + (Q.d === O ? nf(Q) : "(" + nf(Q) + ")") + " = " + num(sIt, nd, u2)], L("Квадрат площі — раціональне число, тому корінь спрощується точно.", "The square of the area is rational, so the root simplifies exactly.")));
    // висоти
    const ha = rvScale(rv, div(TWO, A)), hb = rvScale(rv, div(TWO, B)), hc = rvScale(rv, div(TWO, C));
    steps.push(step(L("Висоти", "The heights"), ["h(a) = 2S / a = " + num(rvItem(ha), nd, u), "h(b) = 2S / b = " + num(rvItem(hb), nd, u), "h(c) = 2S / c = " + num(rvItem(hc), nd, u)], L("Висота до сторони дорівнює подвоєній площі, поділеній на цю сторону.", "A height equals twice the area divided by its side.")));
    // кути
    const cosA = div(sub(add(mul(B, B), mul(C, C)), mul(A, A)), mul(TWO, mul(B, C)));
    const cosB = div(sub(add(mul(A, A), mul(C, C)), mul(B, B)), mul(TWO, mul(A, C)));
    const cosC = div(sub(add(mul(A, A), mul(B, B)), mul(C, C)), mul(TWO, mul(A, B)));
    const ang = (cs) => (isZ(cs) ? 90 : (Math.acos(Math.max(-1, Math.min(1, toDbl(cs)))) * 180) / Math.PI);
    const aA = ang(cosA), aB = ang(cosB), aC = ang(cosC);
    steps.push(step(L("Кути", "The angles"), ["cos A = (b² + c² − a²) / (2bc) = " + nf(cosA) + "  →  A ≈ " + dblStr(aA, nd) + "°", "cos B = (a² + c² − b²) / (2ac) = " + nf(cosB) + "  →  B ≈ " + dblStr(aB, nd) + "°", "cos C = (a² + b² − c²) / (2ab) = " + nf(cosC) + "  →  C ≈ " + dblStr(aC, nd) + "°"], L("Теорема косинусів; кути наближені, їх сума дорівнює 180°.", "The law of cosines; the angles are approximate and add up to 180°.")));
    // радіуси
    const rin = rvScale(rv, div(ONE, p));
    const Rout = rv.m === O ? { c: div(mul(mul(A, B), C), mul(R(4), rv.c)), m: O } : { c: div(mul(mul(A, B), C), mul(R(4), mul(rv.c, R(rv.m)))), m: rv.m };
    steps.push(step(L("Вписане й описане кола", "The incircle and circumcircle"), ["r = S / p = " + num(rvItem(rin), nd, u), "R = abc / (4S) = " + num(rvItem(Rout), nd, u)], L("r — радіус вписаного кола, R — описаного.", "r is the inradius, R is the circumradius.")));
    // тип
    const ty = typeOf(mul(A, A), mul(B, B), mul(C, C), [cmp(A, B) === 0, cmp(B, C) === 0, cmp(A, C) === 0]);
    steps.push(step(L("Вид трикутника", "The type of triangle"), [L("За сторонами: ", "By sides: ") + ty.bySide, L("За кутами: ", "By angles: ") + ty.byAngle + " (" + L("найбільша сторона² = ", "largest side² = ") + nf(ty.big) + (ty.cmpv === 0 ? " = " : ty.cmpv < 0 ? " < " : " > ") + L("сума квадратів двох інших = ", "the sum of the squares of the others = ") + nf(ty.sum) + ")"]));
    convSteps(steps, S, nd);
    const head = '<div class="tri__forms"><span class="tri__rt"><small>S</small><span class="tri__big">' + esc(brief(sIt, nd, u2)) + "</span></span></div>";
    return { ok: true, expr: L("Трикутник зі сторонами ", "Triangle with sides ") + el("tA").value.trim() + ", " + el("tB").value.trim() + ", " + el("tC").value.trim() + (u ? " " + u : ""), head, tiles: [{ k: L("Периметр P", "Perimeter P"), v: nf(P) + (u ? " " + u : "") }, { k: L("Півпериметр p", "Semiperimeter p"), v: nf(p) + (u ? " " + u : "") }, { k: L("Вид", "Type"), v: ty.bySide + ", " + ty.byAngle }], steps, visual: { kind: "sides", a: toDbl(A), b: toDbl(B), c: toDbl(C), al: nf(A), bl: nf(B), cl: nf(C) }, resText: "S = " + brief(sIt, nd, u2) + "; P = " + nf(P) };
  }

  // ===== режим «Дві сторони й кут» =====
  // sin і cos для особливих кутів у вигляді { c, m } (c·√m); знак cos окремо в c
  const SC = {
    30: { sin: { c: q(1n, 2n), m: O }, cos: { c: q(1n, 2n), m: 3n } },
    45: { sin: { c: q(1n, 2n), m: 2n }, cos: { c: q(1n, 2n), m: 2n } },
    60: { sin: { c: q(1n, 2n), m: 3n }, cos: { c: q(1n, 2n), m: O } },
    90: { sin: { c: ONE, m: O }, cos: { c: R(0), m: O } },
    120: { sin: { c: q(1n, 2n), m: 3n }, cos: { c: q(-1n, 2n), m: O } },
    135: { sin: { c: q(1n, 2n), m: 2n }, cos: { c: q(-1n, 2n), m: 2n } },
    150: { sin: { c: q(1n, 2n), m: O }, cos: { c: q(-1n, 2n), m: 3n } }
  };
  function modeSa() {
    const a = posLen("aA", L("Сторона a", "Side a")), b = posLen("aB", L("Сторона b", "Side b")), g = posLen("aG", L("Кут γ", "Angle γ"));
    for (const r of [a, b, g]) if (r.err) return { ok: false, msg: r.err };
    if (a.miss || b.miss || g.miss) return { ok: false, incomplete: true };
    if (cmp(g.v, R(180)) >= 0) return { ok: false, msg: L("Кут γ має бути більший за 0° і менший за 180°.", "The angle γ must be greater than 0° and less than 180°.") };
    const nd = ND(), u = U1(), u2 = U2(), A = a.v, B = b.v, G = g.v;
    const gd = toDbl(G), gr = (gd * Math.PI) / 180;
    const key = G.d === O && SC[String(G.n)] ? String(G.n) : null;
    const ab2 = div(mul(A, B), TWO);
    let sIt, S, sinTxt;
    if (key) {
      const sn = SC[key].sin;
      const rv = { c: mul(sn.c, ab2), m: sn.m };
      sIt = rvItem(rv); S = rvVal(rv);
      sinTxt = "sin " + key + "° = " + (sn.m === O ? nf(sn.c) : radText(sn.c, sn.m));
    } else {
      const sv = Math.sin(gr), area = toDbl(ab2) * sv;
      S = fromDbl(area); sIt = item(null, S, false);
      sinTxt = "sin " + nf(G) + "° ≈ " + dblStr(sv, 6);
    }
    // третя сторона: c² = a² + b² − 2ab cos γ
    const cosv = Math.cos(gr);
    let cIt, cNum;
    if (key && SC[key].cos.m === O) {
      const c2 = sub(add(mul(A, A), mul(B, B)), mul(mul(TWO, mul(A, B)), SC[key].cos.c));
      const cv = sqrtRat(c2);
      cIt = rvItem(cv); cNum = toDbl(rvVal(cv));
    } else {
      cNum = Math.sqrt(toDbl(A) ** 2 + toDbl(B) ** 2 - 2 * toDbl(A) * toDbl(B) * cosv);
      cIt = item(null, fromDbl(cNum), false);
    }
    const aAng = (Math.atan2(toDbl(A) * Math.sin(gr), toDbl(B) - toDbl(A) * cosv) * 180) / Math.PI;
    const bAng = 180 - gd - aAng;
    const steps = [];
    steps.push(step(L("Формула", "The formula"), ["S = a · b · sin γ / 2"], L("Площа дорівнює половині добутку двох сторін на синус кута між ними.", "The area is half the product of two sides and the sine of the angle between them.")));
    steps.push(step(L("Синус кута", "The sine of the angle"), [sinTxt], key ? L("Для цього кута синус відомий точно.", "For this angle the sine is known exactly.") : L("Для довільного кута синус наближений, тому й площа наближена.", "For an arbitrary angle the sine is approximate, so the area is too.")));
    steps.push(step(L("Площа", "The area"), ["S = " + nf(A) + " · " + nf(B) + " · " + (key ? (SC[key].sin.m === O ? nf(SC[key].sin.c) : radText(SC[key].sin.c, SC[key].sin.m)) : "sin " + nf(G) + "°") + " / 2 = " + num(sIt, nd, u2)]));
    steps.push(step(L("Третя сторона", "The third side"), ["c² = a² + b² − 2ab · cos γ", "c = " + num(cIt, nd, u)], L("Теорема косинусів.", "The law of cosines.")));
    steps.push(step(L("Інші кути й периметр", "The other angles and the perimeter"), ["A ≈ " + dblStr(aAng, nd) + "°,  B ≈ " + dblStr(bAng, nd) + "°", "P = a + b + c ≈ " + dblStr(toDbl(A) + toDbl(B) + cNum, nd) + (u ? " " + u : "")], L("Кути знайдено з теореми синусів, вони наближені.", "The angles come from the law of sines and are approximate.")));
    convSteps(steps, S, nd);
    const head = '<div class="tri__forms"><span class="tri__rt"><small>S</small><span class="tri__big">' + esc(brief(sIt, nd, u2)) + "</span></span></div>";
    return { ok: true, expr: L("Трикутник: a = ", "Triangle: a = ") + el("aA").value.trim() + ", b = " + el("aB").value.trim() + ", γ = " + el("aG").value.trim() + "°", head, tiles: [{ k: L("Третя сторона c", "Third side c"), v: brief(cIt, nd, u) }, { k: L("Кути A і B", "Angles A and B"), v: "≈ " + dblStr(aAng, nd) + "°, " + dblStr(bAng, nd) + "°" }, { k: L("Периметр P", "Perimeter P"), v: "≈ " + dblStr(toDbl(A) + toDbl(B) + cNum, nd) + (u ? " " + u : "") }], steps, visual: { kind: "sas", a: toDbl(A), b: toDbl(B), g: gd, al: nf(A), bl: nf(B), gl: nf(G) + "°" }, resText: "S = " + brief(sIt, nd, u2) };
  }

  // ===== режим «Координати вершин» =====
  function modeCo() {
    const ids = [["x1", "x₁"], ["y1", "y₁"], ["x2", "x₂"], ["y2", "y₂"], ["x3", "x₃"], ["y3", "y₃"]];
    const v = ids.map(([id, nm]) => anyNum(id, nm));
    for (const r of v) if (r.err) return { ok: false, msg: r.err };
    if (v.every((r) => r.miss)) return { ok: false, incomplete: true };
    if (v.some((r) => r.miss)) return { ok: false, incomplete: true, msg: L("Вкажіть усі шість координат.", "Enter all six coordinates.") };
    const [x1, y1, x2, y2, x3, y3] = v.map((r) => r.v);
    const nd = ND(), u = U1(), u2 = U2();
    const t1 = mul(x1, sub(y2, y3)), t2 = mul(x2, sub(y3, y1)), t3 = mul(x3, sub(y1, y2));
    const det = add(add(t1, t2), t3), S = div(abs(det), TWO), sIt = item(null, S, true);
    const d2 = (xa, ya, xb, yb) => add(mul(sub(xa, xb), sub(xa, xb)), mul(sub(ya, yb), sub(ya, yb)));
    const ab2 = d2(x1, y1, x2, y2), bc2 = d2(x2, y2, x3, y3), ca2 = d2(x3, y3, x1, y1);
    const ab = rvItem(sqrtRat(ab2)), bc = rvItem(sqrtRat(bc2)), ca = rvItem(sqrtRat(ca2));
    const Pv = add(add(ab.v, bc.v), ca.v), pRat = ab.rat && bc.rat && ca.rat;
    const steps = [];
    steps.push(step(L("Вершини", "The vertices"), ["A(" + nf(x1) + "; " + nf(y1) + "),  B(" + nf(x2) + "; " + nf(y2) + "),  C(" + nf(x3) + "; " + nf(y3) + ")"]));
    steps.push(step(L("Формула площі", "The area formula"), ["S = |x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)| / 2", "= |" + par(x1) + "·(" + nf(sub(y2, y3)) + ") + " + par(x2) + "·(" + nf(sub(y3, y1)) + ") + " + par(x3) + "·(" + nf(sub(y1, y2)) + ")| / 2", "= |" + nf(t1) + " + " + par(t2) + " + " + par(t3) + "| / 2 = |" + nf(det) + "| / 2 = " + num(sIt, nd, u2)], L("Це половина модуля векторного добутку двох сторін.", "This is half the absolute value of the cross product of two sides.")));
    if (isZ(det)) {
      steps.push(step(L("Висновок", "Conclusion"), [L("Площа дорівнює нулю: три точки лежать на одній прямій, трикутник виродився.", "The area is zero: the three points lie on one line, the triangle is degenerate.")]));
    } else {
      steps.push(step(L("Довжини сторін", "The side lengths"), ["AB = √((x₂ − x₁)² + (y₂ − y₁)²) = " + num(ab, nd, u), "BC = " + num(bc, nd, u), "CA = " + num(ca, nd, u), "P = AB + BC + CA " + (pRat ? "= " + nf(Pv) : "≈ " + roundStr(Pv, nd)) + (u ? " " + u : "")]));
      const ty = typeOf(ab2, bc2, ca2, [cmp(ab2, bc2) === 0, cmp(bc2, ca2) === 0, cmp(ab2, ca2) === 0]);
      steps.push(step(L("Вид трикутника", "The type of triangle"), [L("За сторонами: ", "By sides: ") + ty.bySide, L("За кутами: ", "By angles: ") + ty.byAngle], L("Порівнюємо квадрати довжин сторін: це точно, без коренів.", "We compare the squares of the lengths: this is exact, with no roots.")));
      const gx = div(add(add(x1, x2), x3), R(3)), gy = div(add(add(y1, y2), y3), R(3));
      steps.push(step(L("Центр мас (медіан)", "The centroid"), ["G = ((x₁ + x₂ + x₃)/3; (y₁ + y₂ + y₃)/3) = (" + nf(gx) + "; " + nf(gy) + ")"]));
    }
    convSteps(steps, S, nd);
    const head = '<div class="tri__forms"><span class="tri__rt"><small>S</small><span class="tri__big">' + esc(brief(sIt, nd, u2)) + "</span></span></div>" + (isZ(det) ? '<div class="tri__sub2">' + esc(L("Точки лежать на одній прямій", "The points are collinear")) + "</div>" : "");
    const tiles = isZ(det) ? [{ k: L("Подвоєна площа", "Doubled area"), v: "0" }] : [{ k: L("Периметр P", "Perimeter P"), v: (pRat ? nf(Pv) : "≈ " + roundStr(Pv, nd)) + (u ? " " + u : "") }, { k: "AB · BC · CA", v: ab.rat && bc.rat && ca.rat ? nf(ab.v) + " · " + nf(bc.v) + " · " + nf(ca.v) : roundStr(ab.v, 2) + " · " + roundStr(bc.v, 2) + " · " + roundStr(ca.v, 2) }, { k: L("Вид", "Type"), v: (() => { const t = typeOf(ab2, bc2, ca2, [cmp(ab2, bc2) === 0, cmp(bc2, ca2) === 0, cmp(ab2, ca2) === 0]); return t.bySide + ", " + t.byAngle; })() }];
    return { ok: true, expr: L("Трикутник за координатами", "Triangle from coordinates"), head, tiles, steps, visual: { kind: "co", pts: [[toDbl(x1), toDbl(y1)], [toDbl(x2), toDbl(y2)], [toDbl(x3), toDbl(y3)]], lbl: [nf(x1) + "; " + nf(y1), nf(x2) + "; " + nf(y2), nf(x3) + "; " + nf(y3)] }, resText: "S = " + brief(sIt, nd, u2) };
  }

  // ===== режим «Особливі види» =====
  function modeSp() {
    const kind = el("spKind").value, nd = ND(), u = U1(), u2 = U2();
    const steps = [];
    let head, tiles, vis, sIt, S, exprT, resT;
    if (kind === "eq") {
      const a = posLen("p1", L("Сторона a", "Side a"));
      if (a.err) return { ok: false, msg: a.err };
      if (a.miss) return { ok: false, incomplete: true };
      const A = a.v, a2 = mul(A, A);
      const rv = { c: div(a2, R(4)), m: 3n }; sIt = rvItem(rv); S = rvVal(rv);
      const hv = { c: div(A, TWO), m: 3n }, rin = { c: div(A, R(6)), m: 3n }, rout = { c: div(A, R(3)), m: 3n };
      steps.push(step(L("Формула", "The formula"), ["S = a² · √3 / 4"], L("Рівносторонній трикутник: усі сторони рівні, усі кути по 60°.", "An equilateral triangle: all sides are equal and all angles are 60°.")));
      steps.push(step(L("Площа", "The area"), ["S = " + nf(A) + "² · √3 / 4 = " + nf(a2) + " · √3 / 4 = " + num(sIt, nd, u2)]));
      steps.push(step(L("Інші величини", "Other values"), ["P = 3a = " + nf(mul(R(3), A)) + (u ? " " + u : ""), "h = a√3 / 2 = " + num(rvItem(hv), nd, u), "r = a√3 / 6 = " + num(rvItem(rin), nd, u), "R = a√3 / 3 = " + num(rvItem(rout), nd, u)]));
      tiles = [{ k: L("Периметр P", "Perimeter P"), v: nf(mul(R(3), A)) + (u ? " " + u : "") }, { k: L("Висота h", "Height h"), v: brief(rvItem(hv), nd, u) }, { k: L("Кути", "Angles"), v: "60° · 60° · 60°" }];
      vis = { kind: "sides", a: toDbl(A), b: toDbl(A), c: toDbl(A), al: nf(A), bl: nf(A), cl: nf(A) };
      exprT = L("Рівносторонній трикутник: a = ", "Equilateral triangle: a = ") + el("p1").value.trim() + (u ? " " + u : "");
    } else if (kind === "is") {
      const bb = posLen("p1", L("Основа b", "Base b")), aa = posLen("p2", L("Бічна сторона a", "Leg a"));
      for (const r of [bb, aa]) if (r.err) return { ok: false, msg: r.err };
      if (bb.miss || aa.miss) return { ok: false, incomplete: true };
      const Bs = bb.v, As = aa.v;
      if (cmp(mul(TWO, As), Bs) <= 0) return { ok: false, msg: L("Бічні сторони мають бути такими, щоб 2a > b, інакше трикутника не існує.", "The legs must satisfy 2a > b, otherwise the triangle does not exist.") };
      const h2 = sub(mul(As, As), div(mul(Bs, Bs), R(4))), hv = sqrtRat(h2), hIt = rvItem(hv);
      const rv = rvScale(hv, div(Bs, TWO)); sIt = rvItem(rv); S = rvVal(rv);
      const P = add(Bs, mul(TWO, As));
      steps.push(step(L("Висота до основи", "The height to the base"), ["h = √(a² − (b/2)²) = √(" + nf(mul(As, As)) + " − " + nf(div(mul(Bs, Bs), R(4))) + ") = √" + (h2.d === O ? nf(h2) : "(" + nf(h2) + ")") + " = " + num(hIt, nd, u)], L("У рівнобедреному трикутнику висота до основи ділить її навпіл.", "In an isosceles triangle the height to the base bisects it.")));
      steps.push(step(L("Площа", "The area"), ["S = b · h / 2 = " + nf(Bs) + " · " + brief(hIt, nd, "") + " / 2 = " + num(sIt, nd, u2)]));
      steps.push(step(L("Периметр", "The perimeter"), ["P = b + 2a = " + nf(Bs) + " + 2 · " + nf(As) + " = " + nf(P) + (u ? " " + u : "")]));
      tiles = [{ k: L("Висота h", "Height h"), v: brief(hIt, nd, u) }, { k: L("Периметр P", "Perimeter P"), v: nf(P) + (u ? " " + u : "") }, { k: L("Бічні сторони", "Legs"), v: nf(As) + " = " + nf(As) }];
      vis = { kind: "sides", a: toDbl(As), b: toDbl(As), c: toDbl(Bs), al: nf(As), bl: nf(As), cl: nf(Bs) };
      exprT = L("Рівнобедрений трикутник: b = ", "Isosceles triangle: b = ") + el("p1").value.trim() + ", a = " + el("p2").value.trim() + (u ? " " + u : "");
    } else {
      const a = posLen("p1", L("Катет a", "Leg a")), b = posLen("p2", L("Катет b", "Leg b"));
      for (const r of [a, b]) if (r.err) return { ok: false, msg: r.err };
      if (a.miss || b.miss) return { ok: false, incomplete: true };
      const A = a.v, B = b.v, Sr = div(mul(A, B), TWO); sIt = item(null, Sr, true); S = Sr;
      const c2 = add(mul(A, A), mul(B, B)), cv = sqrtRat(c2), cIt = rvItem(cv);
      const Pv = add(add(A, B), cIt.v);
      // h(c) = ab / c = ab / (k√m) = ab√m / (k·m)
      const hc = cv.m === O ? item(null, div(mul(A, B), cv.c), true) : rvItem({ c: div(mul(A, B), mul(cv.c, R(cv.m))), m: cv.m });
      steps.push(step(L("Площа", "The area"), ["S = a · b / 2 = " + nf(A) + " · " + nf(B) + " / 2 = " + num(sIt, nd, u2)], L("У прямокутному трикутнику катети — висота й основа один одного.", "In a right triangle the legs are the base and the height for each other.")));
      steps.push(step(L("Гіпотенуза", "The hypotenuse"), ["c = √(a² + b²) = √(" + nf(mul(A, A)) + " + " + nf(mul(B, B)) + ") = √" + (c2.d === O ? nf(c2) : "(" + nf(c2) + ")") + " = " + num(cIt, nd, u)], L("Теорема Піфагора.", "The Pythagorean theorem.")));
      steps.push(step(L("Інші величини", "Other values"), ["P = a + b + c " + (cIt.rat ? "= " + nf(Pv) : "≈ " + roundStr(Pv, nd)) + (u ? " " + u : ""), "h(c) = ab / c = " + num(hc, nd, u), "r = (a + b − c) / 2 " + (cIt.rat ? "= " + nf(div(sub(add(A, B), cIt.v), TWO)) : "≈ " + roundStr(div(sub(add(A, B), cIt.v), TWO), nd)) + (u ? " " + u : ""), "R = c / 2 = " + (cIt.rat ? nf(div(cIt.v, TWO)) : "≈ " + roundStr(div(cIt.v, TWO), nd)) + (u ? " " + u : "")]));
      tiles = [{ k: L("Гіпотенуза c", "Hypotenuse c"), v: brief(cIt, nd, u) }, { k: L("Периметр P", "Perimeter P"), v: (cIt.rat ? nf(Pv) : "≈ " + roundStr(Pv, nd)) + (u ? " " + u : "") }, { k: L("Висота h(c)", "Height h(c)"), v: brief(hc, nd, u) }];
      vis = { kind: "right", a: toDbl(A), b: toDbl(B), al: nf(A), bl: nf(B), cl: cIt.ex || roundStr(cIt.v, 2) };
      exprT = L("Прямокутний трикутник: a = ", "Right triangle: a = ") + el("p1").value.trim() + ", b = " + el("p2").value.trim() + (u ? " " + u : "");
    }
    resT = "S = " + brief(sIt, nd, u2);
    convSteps(steps, S, nd);
    head = '<div class="tri__forms"><span class="tri__rt"><small>S</small><span class="tri__big">' + esc(brief(sIt, nd, u2)) + "</span></span></div>";
    return { ok: true, expr: exprT, head, tiles, steps, visual: vis, resText: resT };
  }

  // ===== схеми =====
  const label = (x, y, t, anchor, col, size) => '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + (size || 15) + '" font-weight="700" fill="' + (col || "#1f2f55") + '" text-anchor="' + (anchor || "middle") + '" paint-order="stroke" stroke="#fff" stroke-width="3.5" stroke-linejoin="round">' + esc(t) + "</text>";
  // трикутник за точками в одиницях задачі (y вгору) → піксельні координати
  function fit(pts, W, H, pad) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const w = Math.max(x1 - x0, 1e-9), h = Math.max(y1 - y0, 1e-9), s = Math.min((W - 2 * pad) / w, (H - 2 * pad) / h);
    const ox = (W - w * s) / 2 - x0 * s, oy = (H + h * s) / 2 + y0 * s;
    return { P: (p) => [p[0] * s + ox, oy - p[1] * s], s, ox, oy };
  }
  function visual(v) {
    const W = 420, H = 260;
    let s = '<svg class="tri__svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + L("Схема трикутника", "Triangle diagram") + '"><rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    const poly = (p, dash) => '<polygon points="' + p.map((q2) => q2[0].toFixed(1) + "," + q2[1].toFixed(1)).join(" ") + '" fill="#e8efff" stroke="#4f6fb8" stroke-width="3" stroke-linejoin="round"' + (dash ? "" : "") + "/>";
    const dots = (p) => p.map((q2) => '<circle cx="' + q2[0].toFixed(1) + '" cy="' + q2[1].toFixed(1) + '" r="4.5" fill="#283b69" stroke="#fff" stroke-width="1.5"/>').join("");
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    // винесення підпису від центру
    const out = (m, c, d) => { const vx = m[0] - c[0], vy = m[1] - c[1], l = Math.hypot(vx, vy) || 1; return [m[0] + (vx / l) * d, m[1] + (vy / l) * d]; };
    if (v.kind === "co") {
      const pts = v.pts.concat([[0, 0]]);
      const f = fit(pts, W, H, 34), P = v.pts.map(f.P), O0 = f.P([0, 0]);
      const xs = v.pts.map((p) => p[0]).concat(0), ys = v.pts.map((p) => p[1]).concat(0);
      const step0 = (r) => { const raw = r / 5, mg = Math.pow(10, Math.floor(Math.log10(raw))), nm = raw / mg; return (nm <= 1 ? 1 : nm <= 2 ? 2 : nm <= 5 ? 5 : 10) * mg; };
      const sx = step0(Math.max(...xs) - Math.min(...xs) || 1), sy = step0(Math.max(...ys) - Math.min(...ys) || 1), gs = Math.max(sx, sy);
      for (let gx = Math.ceil((Math.min(...xs) - 1e-9) / gs) * gs; gx <= Math.max(...xs) + 1e-9; gx += gs) s += '<line x1="' + f.P([gx, 0])[0].toFixed(1) + '" y1="10" x2="' + f.P([gx, 0])[0].toFixed(1) + '" y2="' + (H - 10) + '" stroke="#eef0f6"/>';
      for (let gy = Math.ceil((Math.min(...ys) - 1e-9) / gs) * gs; gy <= Math.max(...ys) + 1e-9; gy += gs) s += '<line x1="10" y1="' + f.P([0, gy])[1].toFixed(1) + '" x2="' + (W - 10) + '" y2="' + f.P([0, gy])[1].toFixed(1) + '" stroke="#eef0f6"/>';
      s += '<line x1="10" y1="' + O0[1].toFixed(1) + '" x2="' + (W - 10) + '" y2="' + O0[1].toFixed(1) + '" stroke="#9aa3b5" stroke-width="1.4"/><line x1="' + O0[0].toFixed(1) + '" y1="10" x2="' + O0[0].toFixed(1) + '" y2="' + (H - 10) + '" stroke="#9aa3b5" stroke-width="1.4"/>';
      s += poly(P) + dots(P);
      const c = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3], nm2 = ["A", "B", "C"];
      P.forEach((p, i) => { const o = out(p, c, 20); s += label(o[0], o[1] + 5, nm2[i] + "(" + v.lbl[i] + ")", "middle", "#b4411f", 13); });
    } else {
      let A, B, C, hl = null, lab = {}, arcAt = null;
      if (v.kind === "bh") { A = [0, 0]; B = [v.a, 0]; C = [v.a * 0.3, v.h]; hl = { from: C, foot: [C[0], 0], t: "h = " + v.hl }; lab = { ab: "a = " + v.al }; }
      else if (v.kind === "right") { A = [0, 0]; B = [v.a, 0]; C = [0, v.b]; lab = { ab: "a = " + v.al, ac: "b = " + v.bl, bc: "c = " + v.cl }; arcAt = { at: A, right: true }; }
      else if (v.kind === "sas") { C = [0, 0]; A = [v.b, 0]; B = [v.a * Math.cos((v.g * Math.PI) / 180), v.a * Math.sin((v.g * Math.PI) / 180)]; lab = { ca: "b = " + v.bl, cb: "a = " + v.al }; arcAt = { at: C, gamma: v.g, t: "γ = " + v.gl }; }
      else { // за трьома сторонами: c = AB
        const cc = v.c, b = v.b, a = v.a, cosA = (b * b + cc * cc - a * a) / (2 * b * cc);
        A = [0, 0]; B = [cc, 0]; C = [b * cosA, b * Math.sqrt(Math.max(0, 1 - cosA * cosA))]; lab = { ab: "c = " + v.cl, ac: "b = " + v.bl, bc: "a = " + v.al };
      }
      const f = fit([A, B, C], W, H, 52), P = [f.P(A), f.P(B), f.P(C)], ctr = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
      s += poly(P);
      if (hl) { const a2 = f.P(hl.from), b2 = f.P(hl.foot); s += '<line x1="' + a2[0].toFixed(1) + '" y1="' + a2[1].toFixed(1) + '" x2="' + b2[0].toFixed(1) + '" y2="' + b2[1].toFixed(1) + '" stroke="#d85a30" stroke-width="2.4" stroke-dasharray="6 5"/>' + label(a2[0] + 8, (a2[1] + b2[1]) / 2, hl.t, "start", "#b4411f"); s += '<rect x="' + (b2[0] - 10).toFixed(1) + '" y="' + (b2[1] - 10).toFixed(1) + '" width="10" height="10" fill="none" stroke="#d85a30" stroke-width="1.4"/>'; }
      if (arcAt && arcAt.right) { const p0 = f.P(arcAt.at); s += '<rect x="' + p0[0].toFixed(1) + '" y="' + (p0[1] - 14).toFixed(1) + '" width="14" height="14" fill="none" stroke="#2f9d6a" stroke-width="2"/>'; }
      if (arcAt && arcAt.gamma) { const p0 = f.P(arcAt.at), r0 = 28, g = (arcAt.gamma * Math.PI) / 180; s += '<path d="M ' + (p0[0] + r0).toFixed(1) + " " + p0[1].toFixed(1) + " A " + r0 + " " + r0 + " 0 0 0 " + (p0[0] + r0 * Math.cos(g)).toFixed(1) + " " + (p0[1] - r0 * Math.sin(g)).toFixed(1) + '" fill="none" stroke="#2f9d6a" stroke-width="2.4"/>'; s += label(p0[0] + 44 * Math.cos(g / 2), p0[1] - 44 * Math.sin(g / 2) + 5, arcAt.t, "middle", "#0f6e56", 13); }
      s += dots(P);
      const names = ["A", "B", "C"];
      P.forEach((p, i) => { const o = out(p, ctr, 20); s += label(o[0], o[1] + 5, names[i], "middle", "#4b5563", 14); });
      const side = (i, j, t) => { if (!t) return; const m = mid(P[i], P[j]), o = out(m, ctr, 20); s += label(o[0], o[1] + 5, t, "middle", "#283b69", 14); };
      side(0, 1, lab.ab); side(0, 2, lab.ac); side(1, 2, lab.bc); side(2, 0, lab.ca); side(2, 1, lab.cb);
    }
    return s + "</svg>";
  }

  // ===== відображення =====
  const CALC = { bh: modeBh, ts: modeTs, sa: modeSa, co: modeCo, sp: modeSp };
  function stepsHtml(steps) {
    return '<div class="tri__sub">' + L("Розв'язання", "Solution") + "</div>" + steps.map((s, i) => '<div class="tri__step"><span class="tri__stepN">' + (i + 1) + '</span><div><b class="tri__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="tri__math">' + esc(x) + "</p>").join("") + (s.note ? '<p class="tri__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join("");
  }
  const clean = (s) => s.replace(/ /g, "");
  function textOf(m) { return clean([m.expr + "  →  " + m.resText, ""].concat(m.steps.map((s, i) => (i + 1) + ". " + s.t + "\n   " + s.l.join("\n   "))).join("\n")); }
  let last = null;
  function render(m, strict) {
    const box = el("result");
    if (!m.ok) {
      last = null;
      if (m.incomplete && !strict) { box.innerHTML = T.enter; return; }
      box.innerHTML = '<div class="tri__hintbox">' + esc(m.msg || T.enter) + "</div>";
      return;
    }
    last = m;
    const tiles = '<div class="tri__tiles">' + m.tiles.map((t) => '<div class="tri__tile"><small>' + esc(t.k) + "</small><b>" + esc(t.v) + "</b></div>").join("") + "</div>";
    box.innerHTML = '<div class="tri__rhead"><div class="tri__expr">' + esc(m.expr) + "</div>" + m.head + "</div>" + tiles + '<div class="tri__sub">' + L("Схема", "Diagram") + '</div><div class="tri__graph">' + visual(m.visual) + "</div>" + stepsHtml(m.steps) + '<div class="tri__note">' + L("Точні значення записано дробами й радикалами; десяткові наближені до обраної кількості знаків.", "Exact values are written with fractions and radicals; decimals are rounded to the chosen number of places.") + "</div>";
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
  const DDP = { unit: "ut", decs: "dc", spKind: "sk" };
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
  const FIELDS = ["bB", "bH", "tA", "tB", "tC", "aA", "aB", "aG", "x1", "y1", "x2", "y2", "x3", "y3", "p1", "p2"];
  const DDS = ["unit", "decs", "spKind"];
  const PANELS = { bh: "panelBh", ts: "panelTs", sa: "panelSa", co: "panelCo", sp: "panelSp" };
  const SPLAB = { eq: [["Сторона a", "Side a"], null], is: [["Основа b", "Base b"], ["Бічна сторона a", "Leg a"]], rt: [["Катет a", "Leg a"], ["Катет b", "Leg b"]] };
  function syncSp() {
    const k = el("spKind").value, l = SPLAB[k];
    el("p1Label").textContent = L(l[0][0], l[0][1]);
    el("p2Row").hidden = !l[1];
    if (l[1]) el("p2Label").textContent = L(l[1][0], l[1][1]);
  }
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".tri__tab").forEach((b) => { const on = b.dataset.m === m; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    MODES.forEach((k) => { el(PANELS[k]).hidden = k !== m; });
    maybeCalc();
  }
  const DEFAULTS = { unit: "none", decs: "4", spKind: "eq" };
  function resetAll() { FIELDS.forEach((id) => (el(id).value = "")); DDS.forEach((k) => setDd(k, DEFAULTS[k])); syncSp(); maybeCalc(); }
  const EXAMPLES = {
    bh: () => { el("bB").value = "6"; el("bH").value = "4"; },
    ts: () => { el("tA").value = "5"; el("tB").value = "6"; el("tC").value = "7"; },
    sa: () => { el("aA").value = "8"; el("aB").value = "5"; el("aG").value = "30"; },
    co: () => { ["0", "0", "4", "0", "0", "3"].forEach((v, i) => { el(["x1", "y1", "x2", "y2", "x3", "y3"][i]).value = v; }); },
    sp: () => { setDd("spKind", "eq"); syncSp(); el("p1").value = "6"; }
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
    document.querySelectorAll(".tri__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    DDS.forEach((k) => initDd(DDP[k], (v) => { setDd(k, v); if (k === "spKind") syncSp(); maybeCalc(); }));
    FIELDS.forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); calc(true); } }); });
    el("calcBtn").addEventListener("click", () => { const m = calc(true); if (!m.ok && m.msg) toast(m.msg); });
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => { resetAll(); toast(T.reset); });
    el("shareBtn").addEventListener("click", share);
    el("copyBtn").addEventListener("click", copyResult);
    const used = applyFromUrl();
    syncSp();
    setMode(mode);
    if (used) calc();
  });
})();
