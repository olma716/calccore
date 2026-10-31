/* volume-calculator.js — калькулятор об'єму: восьми фігур (куб, паралелепіпед, призма, циліндр, конус і зрізаний конус, піраміда, куля й сегмент, еліпсоїд) та зворотна задача «розмір за об'ємом»; розв'язання по кроках, схеми, одиниці (UK/EN)
   Числа — точні раціональні (ціле, десяткове, дріб). Відповіді записуються точно через π і радикали: 256π/3, 3π√13; поруч — десяткове наближення.
   Величина Q = c·√m·π^p (c — раціональне, m без квадратних множників). Для правильних n-кутників точні формули є для n = 3, 4, 6, для інших n результат наближений.
   Об'єм у відповіді можна показати в см³, м³, літрах, галонах тощо: множники точні (1 дюйм = 25,4 мм, 1 фут = 304,8 мм, 1 галон США = 231 дюйм³). */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const SEP = IS_EN ? "." : ",";
  const MODES = ["dr", "iv"];
  const MAXD = 30;
  let mode = "dr";

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
  const isZ = (x) => x.n === Z;
  const R = (n) => ({ n: BigInt(n), d: O });
  const ONE = R(1), TWO = R(2), THREE = R(3), FOUR = R(4), HALF = q(1n, 2n), THIRD = q(1n, 3n);
  const cmp = (x, y) => { const d = sub(x, y); return d.n < Z ? -1 : d.n > Z ? 1 : 0; };
  const isqrt = (n) => { if (n < 2n) return n; let x = 1n << BigInt((n.toString(2).length + 1) >> 1), y = (x + n / x) >> 1n; while (y < x) { x = y; y = (x + n / x) >> 1n; } return x; };
  const icbrt = (n) => {
    if (n < 2n) return n;
    let x = 1n << BigInt(Math.ceil(n.toString(2).length / 3));
    for (;;) { const y = (2n * x + n / (x * x)) / 3n; if (y >= x) break; x = y; }
    while (x * x * x > n) x--;
    while ((x + 1n) * (x + 1n) * (x + 1n) <= n) x++;
    return x;
  };
  const SC = 40n;
  const sqrtApprox = (x) => q(isqrt((x.n * 10n ** (2n * SC)) / x.d), 10n ** SC);
  const cbrtApprox = (x) => q(icbrt((x.n * 10n ** (3n * SC)) / x.d), 10n ** SC);
  const toDbl = (r) => Number(r.n) / Number(r.d);
  const fromDbl = (x) => q(BigInt(Math.round(x * 1e12)), 10n ** 12n);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const step = (t, lines, note) => ({ t, l: lines, note });
  const exactDec = (x) => (x.n * 10n ** 30n) % x.d === Z;
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
  const nf = (x) => (x.d === O ? String(x.n) : exactDec(x) ? roundStr(x, 30) : x.n + "/" + x.d);
  const dblStr = (x, nd) => { if (!Number.isFinite(x) || Math.abs(x) >= 1e15) return "—"; return x.toFixed(nd).replace(/\.?0+$/, "").replace(".", SEP) || "0"; };
  const ND = () => Number(el("decs").value) || 4;
  const ints = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB);

  // ===== число π =====
  const PI50 = q(314159265358979323846264338327950288419716939937510n, 10n ** 50n);
  const PIV = { ex: PI50, "3.14": q(314n, 100n), "3.1416": q(31416n, 10000n), "3.14159": q(314159n, 100000n) };
  const pmode = () => el("pmode").value || "ex";
  const piVal = () => PIV[pmode()] || PI50;
  const piNote = () => (pmode() === "ex" ? "" : L(" (при π = " + pmode().replace(".", ",") + ")", " (with π = " + pmode() + ")"));

  // ===== величини Q = c·√m·π^p =====
  const Qn = (c, m = O, p = 0) => ({ c, m, p });
  const qScale = (a, k) => Qn(mul(a.c, k), a.m, a.p);
  function simplifyRadical(m) {
    let k = O, rem = m;
    for (let p = 2n; p <= 100000n && p * p <= rem; p++) {
      const p2 = p * p;
      while (rem % p2 === Z) { rem /= p2; k *= p; }
    }
    if (rem > O) { const s = isqrt(rem); if (s * s === rem) { k *= s; rem = O; } }
    return { k, m: rem === Z ? O : rem };
  }
  function sqrtRat(Qv) { // √Q для раціонального Q ≥ 0 → Qn(c, m)
    if (isZ(Qv)) return Qn(R(0));
    const { k, m } = simplifyRadical(Qv.n * Qv.d);
    return Qn(q(k, Qv.d), m);
  }
  const qMul = (a, b) => { const s = simplifyRadical(a.m * b.m); return Qn(mul(mul(a.c, b.c), R(s.k)), s.m, a.p + b.p); };
  const qAdd = (a, b) => { if (isZ(a.c)) return b; if (isZ(b.c)) return a; return a.m === b.m && a.p === b.p ? Qn(add(a.c, b.c), a.m, a.p) : null; };
  const qVal = (a) => { let v = a.m === O ? a.c : mul(a.c, sqrtApprox(R(a.m))); for (let i = 0; i < a.p; i++) v = mul(v, piVal()); return v; };
  function qText(a) {
    const sym = (a.p ? "π" : "") + (a.m === O ? "" : "√" + a.m);
    if (!sym) return nf(a.c);
    const n = a.c.n, d = a.c.d;
    return (n === O ? "" : String(n)) + sym + (d === O ? "" : "/" + d);
  }
  const item = (ex, v, rt) => ({ ex, v, rat: !!rt });
  const qItem = (a) => (a.m === O && !a.p ? item(null, a.c, true) : item(qText(a), qVal(a), false));
  const num = (it, nd, suf) => {
    if (it.rat) return nf(it.v) + (it.v.d !== O && !exactDec(it.v) ? " ≈ " + roundStr(it.v, nd) : "") + (suf ? " " + suf : "");
    return (it.ex ? it.ex + " ≈ " : "≈ ") + roundStr(it.v, nd) + (suf ? " " + suf : "");
  };
  const brief = (it, nd, suf) => {
    if (it.rat) return (it.v.d === O || exactDec(it.v) ? nf(it.v) : "≈ " + roundStr(it.v, nd)) + (suf ? " " + suf : "");
    return (it.ex ? it.ex + " ≈ " : "≈ ") + roundStr(it.v, nd) + (suf ? " " + suf : "");
  };
  const lblOf = (nm, it) => (it.rat ? nm + " = " + nf(it.v) : it.ex ? nm + " = " + it.ex : nm + " ≈ " + roundStr(it.v, 2));
  // сума величин: точна, якщо вони одного типу, інакше запис «x + y» і наближення
  function sumItem(list) {
    let acc = Qn(R(0));
    for (const x of list) { acc = acc ? qAdd(acc, x) : null; }
    if (acc) return qItem(acc);
    return item(list.map(qText).join(" + "), list.reduce((s, x) => add(s, qVal(x)), R(0)), false);
  }

  // ===== одиниці =====
  const LF = { none: ONE, mm: ONE, cm: R(10), dm: R(100), m: R(1000), km: R(1000000), in: q(127n, 5n), ft: q(1524n, 5n) };
  const LL = { none: "", mm: L("мм", "mm"), cm: L("см", "cm"), dm: L("дм", "dm"), m: L("м", "m"), km: L("км", "km"), in: L("дюйм", "in"), ft: L("фут", "ft") };
  const cube3 = (x) => mul(x, mul(x, x));
  const VF = { mm3: ONE, cm3: R(1000), dm3: R(1000000), m3: R(1000000000), km3: R(10n ** 18n), l: R(1000000), ml: R(1000), in3: q(2048383n, 125n), ft3: q(1524n ** 3n, 125n), yd3: q(4572n ** 3n, 125n), usgal: q(231n * 2048383n, 125n), ukgal: R(4546090) };
  const VL = { mm3: L("мм³", "mm³"), cm3: L("см³", "cm³"), dm3: L("дм³", "dm³"), m3: L("м³", "m³"), km3: L("км³", "km³"), l: L("л", "L"), ml: L("мл", "mL"), in3: L("дюйм³", "in³"), ft3: L("фут³", "ft³"), yd3: L("ярд³", "yd³"), usgal: L("гал. США", "US gal"), ukgal: L("гал. Британії", "UK gal") };
  const lenU = () => el("lunit").value || "none";
  const volU = () => el("vunit").value || "auto";
  const U1 = () => LL[lenU()];
  const U2 = () => (lenU() === "none" ? "" : LL[lenU()] + "²");
  const U3 = () => (lenU() === "none" ? "" : LL[lenU()] + "³");
  // множник для переведення об'єму з куба одиниці довжини в обрану одиницю об'єму
  const volCtx = () => {
    const lu = lenU(), vu = volU();
    if (lu === "none" || vu === "auto") return { f: ONE, label: U3(), conv: false };
    return { f: div(cube3(LF[lu]), VF[vu]), label: VL[vu], conv: true, vu };
  };
  function convSteps(steps, Vq, nd, ctx) {
    const lu = lenU();
    if (lu === "none") return;
    const vmm = qScale(Vq, cube3(LF[lu])), cur = ctx.conv ? ctx.vu : null;
    const lines = ["mm3", "cm3", "l", "m3", "in3", "ft3", "usgal"].filter((k) => k !== cur).map((k) => "= " + roundStr(div(qVal(vmm), VF[k]), 10) + " " + VL[k]);
    steps.push(step(L("Об'єм в інших одиницях", "The volume in other units"), [brief(qItem(qScale(Vq, ctx.f)), nd, ctx.label)].concat(lines), L("Множники точні: 1 дюйм = 25,4 мм, 1 фут = 304,8 мм, 1 л = 1 дм³, 1 галон США = 231 дюйм³.", "The factors are exact: 1 in = 25.4 mm, 1 ft = 304.8 mm, 1 L = 1 dm³, 1 US gal = 231 in³.")));
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
  function posInt(id, label, min, max) {
    const s = el(id).value.trim();
    if (!s) return { miss: label };
    if (!/^\d+$/.test(s)) return { err: label + ": " + L("потрібне ціле число.", "a whole number is required.") };
    const n = Number(s);
    if (n < min || n > max) return { err: label + ": " + L("від " + min + " до " + max + ".", "from " + min + " to " + max + ".") };
    return { v: n };
  }
  // об'єм може містити π: «256π/3», «36π», «π/3», «2 pi»
  function volIn(id, label) {
    const raw = String(el(id).value || "").trim();
    if (!raw) return { miss: label };
    const m = raw.match(/^(.*?)(?:π|pi|PI|Pi)(.*)$/);
    if (!m) { const r = posLen(id, label); return r.err || r.miss ? r : { v: r.v, pi: false }; }
    if (/π|pi/i.test(m[2])) return { err: label + ": " + L("π має бути один раз.", "π may appear only once.") };
    const pre = m[1].trim().replace(/[·*]$/, "").trim(), post = m[2].trim();
    let c = ONE;
    if (pre) { const r = plain(pre); if (r.err) return { err: label + ": " + r.err }; c = r.v; }
    if (post) {
      if (post[0] !== "/") return { err: label + ": " + L("після π допускається лише /знаменник.", "only /denominator is allowed after π.") };
      const r = plain(post.slice(1));
      if (r.err) return { err: label + ": " + r.err };
      if (r.empty || isZ(r.v)) return { err: label + ": " + L("потрібен знаменник.", "a denominator is required.") };
      c = div(c, r.v);
    }
    if (c.n <= Z) return { err: label + ": " + L("значення має бути більше нуля.", "the value must be greater than zero.") };
    return { v: c, pi: true };
  }
  const firstErr = (arr) => { for (const r of arr) if (r && r.err) return { ok: false, msg: r.err }; return null; };

  // ===== специфікації полів =====
  const F = (k, uk, en, ph, kind) => ({ k, uk, en, ph, kind: kind || "len" });
  const SPEC = {
    cube: { "": [F("a", "Ребро a", "Edge a", "5")] },
    box: { "": [F("a", "Довжина a", "Length a", "3"), F("b", "Ширина b", "Width b", "4"), F("c", "Висота c", "Height c", "12")] },
    prism: { reg: [F("n", "Кількість кутів n", "Number of sides n", "6", "n"), F("a", "Сторона основи a", "Base side a", "4"), F("h", "Висота h", "Height h", "10")], area: [F("S", "Площа основи S₀", "Base area S₀", "24"), F("h", "Висота h", "Height h", "10"), F("P", "Периметр основи P (необов.)", "Base perimeter P (optional)", "20", "opt")] },
    cylinder: { solid: [F("r", "Радіус r", "Radius r", "3"), F("h", "Висота h", "Height h", "10")], hollow: [F("R", "Зовнішній радіус R", "Outer radius R", "5"), F("r", "Внутрішній радіус r", "Inner radius r", "4"), F("h", "Висота h", "Height h", "10")] },
    cone: { full: [F("r", "Радіус основи r", "Base radius r", "3"), F("h", "Висота h", "Height h", "4")], frustum: [F("r", "Нижній радіус r₁", "Bottom radius r₁", "3"), F("s", "Верхній радіус r₂", "Top radius r₂", "2"), F("h", "Висота h", "Height h", "6")] },
    pyramid: { reg: [F("n", "Кількість кутів n", "Number of sides n", "4", "n"), F("a", "Сторона основи a", "Base side a", "6"), F("h", "Висота h", "Height h", "4")], area: [F("S", "Площа основи S₀", "Base area S₀", "36"), F("h", "Висота h", "Height h", "4")] },
    sphere: { full: [F("r", "Радіус r", "Radius r", "4")], seg: [F("r", "Радіус кулі r", "Sphere radius r", "5"), F("h", "Висота сегмента h", "Cap height h", "2")] },
    ellipsoid: { "": [F("a", "Піввісь a", "Semi-axis a", "3"), F("b", "Піввісь b", "Semi-axis b", "4"), F("c", "Піввісь c", "Semi-axis c", "5")] }
  };
  const SHAPES = [["cube", "Куб", "Cube"], ["box", "Паралелепіпед", "Cuboid"], ["prism", "Призма", "Prism"], ["cylinder", "Циліндр", "Cylinder"], ["cone", "Конус", "Cone"], ["pyramid", "Піраміда", "Pyramid"], ["sphere", "Куля (сфера)", "Sphere"], ["ellipsoid", "Еліпсоїд", "Ellipsoid"]];
  const VARS = {
    prism: [["reg", "Правильна n-кутна", "Regular n-gon"], ["area", "За площею основи", "By base area"]],
    cylinder: [["solid", "Суцільний", "Solid"], ["hollow", "Порожнистий (труба)", "Hollow (pipe)"]],
    cone: [["full", "Повний", "Full"], ["frustum", "Зрізаний", "Frustum"]],
    pyramid: [["reg", "Правильна n-кутна", "Regular n-gon"], ["area", "За площею основи", "By base area"]],
    sphere: [["full", "Куля", "Whole sphere"], ["seg", "Кульовий сегмент", "Spherical cap"]]
  };
  const shape = () => el("shape").value || "cube";
  const variant = () => { const s = shape(); return VARS[s] ? el("variant").value || VARS[s][0][0] : ""; };
  const specNow = () => SPEC[shape()][variant()] || SPEC[shape()][Object.keys(SPEC[shape()])[0]];
  const FLD = ["g1", "g2", "g3"];
  // значення полів за специфікацією → { vals: {k: Rat|n|null}, err, miss }
  function readFields() {
    const sp = specNow(), vals = {};
    const rs = sp.map((f, i) => {
      const id = FLD[i], lab = L(f.uk, f.en).replace(/ \(необов\.\)| \(optional\)/, "");
      if (f.kind === "n") return posInt(id, lab, 3, 100);
      if (f.kind === "opt") { if (!el(id).value.trim()) return { v: null }; return posLen(id, lab); }
      return posLen(id, lab);
    });
    const fe = firstErr(rs);
    if (fe) return { fe };
    if (rs.some((r) => r.miss)) return { incomplete: true };
    sp.forEach((f, i) => { vals[f.k] = rs[i].v; });
    return { vals };
  }

  // ===== правильний n-кутник =====
  const EXN = [3, 4, 6];
  // повертає площу S0, квадрат апофеми основи ρ² та квадрат радіуса описаного кола R² для точних n = 3, 4, 6
  function ngon(n, a) {
    const a2 = mul(a, a), ad = toDbl(a);
    const S0d = (n * ad * ad) / (4 * Math.tan(Math.PI / n)), rho = ad / (2 * Math.tan(Math.PI / n)), Rc = ad / (2 * Math.sin(Math.PI / n));
    if (n === 3) return { exact: true, S0: Qn(div(a2, FOUR), 3n), rho2: div(a2, R(12)), Rc2: div(a2, THREE), S0d, rho, Rc };
    if (n === 4) return { exact: true, S0: Qn(a2), rho2: div(a2, FOUR), Rc2: div(a2, TWO), S0d, rho, Rc };
    if (n === 6) return { exact: true, S0: Qn(mul(a2, q(3n, 2n)), 3n), rho2: mul(a2, q(3n, 4n)), Rc2: a2, S0d, rho, Rc };
    return { exact: false, S0d, rho, Rc };
  }

  // ===== прямий режим: фігури =====
  const head = (small, text) => '<div class="vol__forms"><span class="vol__rt"><small>' + esc(small) + '</small><span class="vol__big">' + esc(text) + "</span></span></div>";
  function modeDr() {
    const rf = readFields();
    if (rf.fe) return rf.fe;
    if (rf.incomplete) return { ok: false, incomplete: true };
    const v = rf.vals, nd = ND(), ctx = volCtx(), u1 = U1(), u2 = U2(), u3 = ctx.label, sh = shape(), vr = variant(), PN = piNote();
    const steps = [], tiles = [];
    const sq = (x) => mul(x, x);
    const vit = (Vq) => qItem(qScale(Vq, ctx.f));
    const u3len = U3();
    const Vtxt = (Vq) => num(qItem(Vq), nd, u3len) + PN;
    let Vq = null, Vit = null, visualO = null, exprT = "";
    const ex = (...pairs) => pairs.map((p) => p[0] + " = " + p[1]).join(", ");
    const F1 = (k) => el(FLD[specNow().findIndex((f) => f.k === k)]).value.trim();

    if (sh === "cube") {
      const a = v.a, a3 = cube3(a);
      Vq = Qn(a3);
      const Sq = Qn(mul(R(6), sq(a))), dq = Qn(a, 3n), fq = Qn(a, 2n);
      steps.push(step(L("Формула об'єму", "The volume formula"), ["V = a³"], L("Об'єм куба — ребро в третьому степені.", "The volume of a cube is the edge cubed.")));
      steps.push(step(L("Підстановка", "Substitution"), ["V = " + nf(a) + "³ = " + nf(a3) + (u3len ? " " + u3len : "")]));
      steps.push(step(L("Площа поверхні", "The surface area"), ["S = 6a² = 6 · " + nf(sq(a)) + " = " + nf(Sq.c) + (u2 ? " " + u2 : "")], L("У куба шість однакових граней.", "A cube has six equal faces.")));
      steps.push(step(L("Діагоналі", "The diagonals"), ["d = a√3 = " + num(qItem(dq), nd, u1), L("діагональ грані = a√2 = ", "face diagonal = a√2 = ") + num(qItem(fq), nd, u1)], L("Просторова діагональ і діагональ грані.", "The space diagonal and a face diagonal.")));
      tiles.push({ k: L("Площа поверхні S", "Surface area S"), v: brief(qItem(Sq), nd, u2) }, { k: L("Діагональ d", "Diagonal d"), v: brief(qItem(dq), nd, u1) }, { k: L("Діагональ грані", "Face diagonal"), v: brief(qItem(fq), nd, u1) });
      visualO = { kind: "box", a: toDbl(a), b: toDbl(a), c: toDbl(a), la: "a = " + nf(a), lb: "a = " + nf(a), lc: "a = " + nf(a) };
      exprT = L("Куб: a = ", "Cube: a = ") + F1("a") + (u1 ? " " + u1 : "");
    } else if (sh === "box") {
      const { a, b, c } = v, abc = mul(a, mul(b, c));
      Vq = Qn(abc);
      const S = mul(TWO, add(add(mul(a, b), mul(b, c)), mul(c, a))), d2 = add(add(sq(a), sq(b)), sq(c)), dq = sqrtRat(d2), E = mul(FOUR, add(add(a, b), c));
      steps.push(step(L("Формула об'єму", "The volume formula"), ["V = a · b · c"], L("Об'єм прямокутного паралелепіпеда — добуток трьох вимірів.", "The volume of a cuboid is the product of its three dimensions.")));
      steps.push(step(L("Підстановка", "Substitution"), ["V = " + nf(a) + " · " + nf(b) + " · " + nf(c) + " = " + nf(abc) + (u3len ? " " + u3len : "")]));
      steps.push(step(L("Площа поверхні", "The surface area"), ["S = 2(ab + bc + ca) = 2 · (" + nf(mul(a, b)) + " + " + nf(mul(b, c)) + " + " + nf(mul(c, a)) + ") = " + nf(S) + (u2 ? " " + u2 : "")]));
      steps.push(step(L("Діагональ і ребра", "The diagonal and edges"), ["d = √(a² + b² + c²) = √" + (d2.d === O ? nf(d2) : "(" + nf(d2) + ")") + " = " + num(qItem(dq), nd, u1), L("Сума всіх ребер = 4(a + b + c) = ", "Sum of all edges = 4(a + b + c) = ") + nf(E) + (u1 ? " " + u1 : "")]));
      tiles.push({ k: L("Площа поверхні S", "Surface area S"), v: brief(item(null, S, true), nd, u2) }, { k: L("Діагональ d", "Diagonal d"), v: brief(qItem(dq), nd, u1) }, { k: L("Сума ребер", "Sum of edges"), v: nf(E) + (u1 ? " " + u1 : "") });
      visualO = { kind: "box", a: toDbl(a), b: toDbl(b), c: toDbl(c), la: "a = " + nf(a), lb: "b = " + nf(b), lc: "c = " + nf(c), ld: lblOf("d", qItem(dq)) };
      exprT = L("Паралелепіпед: ", "Cuboid: ") + F1("a") + " × " + F1("b") + " × " + F1("c") + (u1 ? " " + u1 : "");
    } else if (sh === "prism" && vr === "reg") {
      const n = v.n, a = v.a, h = v.h, g = ngon(n, a), lat = mul(R(n), mul(a, h));
      let S0it, Vit2, Tit;
      if (g.exact) {
        Vq = qMul(g.S0, Qn(h));
        S0it = qItem(g.S0); Vit2 = vit(Vq); Tit = sumItem([qScale(g.S0, TWO), Qn(lat)]);
      } else {
        S0it = item(null, fromDbl(g.S0d), false);
        const vd = g.S0d * toDbl(h); Vq = Qn(fromDbl(vd));
        Vit2 = item(null, fromDbl(vd * toDbl(ctx.f)), false); Tit = item(null, fromDbl(2 * g.S0d + toDbl(lat)), false);
      }
      Vit = Vit2;
      steps.push(step(L("Площа основи", "The base area"), ["S₀ = n · a² / (4 · tg(180° / n)), n = " + n, "S₀ = " + num(S0it, nd, u2)], g.exact ? L("Для n = 3, 4, 6 площа основи точна.", "For n = 3, 4, 6 the base area is exact.") : L("Для цього n площа основи наближена.", "For this n the base area is approximate.")));
      steps.push(step(L("Формула об'єму", "The volume formula"), ["V = S₀ · h"], L("Об'єм призми — площа основи, помножена на висоту.", "The volume of a prism is the base area times the height.")));
      steps.push(step(L("Підстановка", "Substitution"), ["V = " + brief(S0it, nd, "") + " · " + nf(h) + " = " + (g.exact ? Vtxt(Vq) : num(item(null, Vq.c, false), nd, u3len))]));
      steps.push(step(L("Поверхня", "The surface"), [L("Бічна S = n · a · h = ", "Lateral S = n · a · h = ") + nf(lat) + (u2 ? " " + u2 : ""), L("Повна S = 2S₀ + n·a·h = ", "Total S = 2S₀ + n·a·h = ") + num(Tit, nd, u2)]));
      tiles.push({ k: L("Площа основи S₀", "Base area S₀"), v: brief(S0it, nd, u2) }, { k: L("Бічна поверхня", "Lateral area"), v: nf(lat) + (u2 ? " " + u2 : "") }, { k: L("Повна поверхня", "Total area"), v: brief(Tit, nd, u2) });
      visualO = { kind: "prism", n, rc: g.Rc, h: toDbl(h), la: "a = " + nf(a), lh: "h = " + nf(h), ln: "n = " + n };
      exprT = L("Призма: n = ", "Prism: n = ") + n + ", a = " + F1("a") + ", h = " + F1("h") + (u1 ? " " + u1 : "");
    } else if (sh === "prism") {
      const S0 = v.S, h = v.h, P = v.P;
      Vq = Qn(mul(S0, h));
      steps.push(step(L("Формула об'єму", "The volume formula"), ["V = S₀ · h"], L("Працює для будь-якої призми: основа може бути довільним многокутником.", "This works for any prism: the base may be any polygon.")));
      steps.push(step(L("Підстановка", "Substitution"), ["V = " + nf(S0) + " · " + nf(h) + " = " + nf(mul(S0, h)) + (u3len ? " " + u3len : "")]));
      if (P) {
        const lat = mul(P, h), tot = add(mul(TWO, S0), lat);
        steps.push(step(L("Поверхня", "The surface"), [L("Бічна S = P · h = ", "Lateral S = P · h = ") + nf(lat) + (u2 ? " " + u2 : ""), L("Повна S = 2S₀ + P·h = ", "Total S = 2S₀ + P·h = ") + nf(tot) + (u2 ? " " + u2 : "")]));
        tiles.push({ k: L("Площа основи S₀", "Base area S₀"), v: nf(S0) + (u2 ? " " + u2 : "") }, { k: L("Бічна поверхня", "Lateral area"), v: nf(lat) + (u2 ? " " + u2 : "") }, { k: L("Повна поверхня", "Total area"), v: nf(tot) + (u2 ? " " + u2 : "") });
      } else tiles.push({ k: L("Площа основи S₀", "Base area S₀"), v: nf(S0) + (u2 ? " " + u2 : "") }, { k: L("Висота h", "Height h"), v: nf(h) + (u1 ? " " + u1 : "") }, { k: L("Поверхня", "Surface"), v: L("вкажіть периметр P", "enter the perimeter P") });
      visualO = { kind: "prism", n: 5, rc: 1, h: toDbl(h) / Math.sqrt(toDbl(S0)), la: "S₀ = " + nf(S0), lh: "h = " + nf(h), ln: "" };
      exprT = L("Призма: S₀ = ", "Prism: S₀ = ") + F1("S") + ", h = " + F1("h") + (u1 ? " " + u1 : "");
    } else if (sh === "cylinder" && vr === "solid") {
      const r = v.r, h = v.h, r2 = sq(r);
      Vq = Qn(mul(r2, h), O, 1);
      const lat = Qn(mul(TWO, mul(r, h)), O, 1), tot = Qn(mul(TWO, mul(r, add(r, h))), O, 1), base = Qn(r2, O, 1);
      steps.push(step(L("Формула об'єму", "The volume formula"), ["V = π · r² · h"], L("Площа круга основи πr², помножена на висоту.", "The area of the base circle πr² times the height.")));
      steps.push(step(L("Підстановка", "Substitution"), ["V = π · " + nf(r) + "² · " + nf(h) + " = π · " + nf(r2) + " · " + nf(h) + " = " + Vtxt(Vq)]));
      steps.push(step(L("Поверхня", "The surface"), [L("Основа S₀ = πr² = ", "Base S₀ = πr² = ") + num(qItem(base), nd, u2), L("Бічна S = 2πrh = ", "Lateral S = 2πrh = ") + num(qItem(lat), nd, u2), L("Повна S = 2πr(r + h) = ", "Total S = 2πr(r + h) = ") + num(qItem(tot), nd, u2)]));
      tiles.push({ k: L("Площа основи S₀", "Base area S₀"), v: brief(qItem(base), nd, u2) }, { k: L("Бічна поверхня", "Lateral area"), v: brief(qItem(lat), nd, u2) }, { k: L("Повна поверхня", "Total area"), v: brief(qItem(tot), nd, u2) });
      visualO = { kind: "cyl", r: toDbl(r), h: toDbl(h), lr: "r = " + nf(r), lh: "h = " + nf(h) };
      exprT = L("Циліндр: r = ", "Cylinder: r = ") + F1("r") + ", h = " + F1("h") + (u1 ? " " + u1 : "");
    } else if (sh === "cylinder") {
      const Ro = v.R, r = v.r, h = v.h;
      if (cmp(r, Ro) >= 0) return { ok: false, msg: L("Внутрішній радіус r має бути меншим за зовнішній R.", "The inner radius r must be smaller than the outer radius R.") };
      const wall = sub(sq(Ro), sq(r));
      Vq = Qn(mul(wall, h), O, 1);
      const inner = Qn(mul(sq(r), h), O, 1), outer = Qn(mul(sq(Ro), h), O, 1), tot = Qn(mul(TWO, add(mul(add(Ro, r), h), wall)), O, 1);
      steps.push(step(L("Формула об'єму", "The volume formula"), ["V = π · (R² − r²) · h"], L("Матеріал стінки — різниця об'ємів зовнішнього й внутрішнього циліндрів.", "The wall material is the difference of the outer and inner cylinders.")));
      steps.push(step(L("Підстановка", "Substitution"), ["V = π · (" + nf(sq(Ro)) + " − " + nf(sq(r)) + ") · " + nf(h) + " = π · " + nf(wall) + " · " + nf(h) + " = " + Vtxt(Vq)]));
      steps.push(step(L("Місткість і товщина", "Capacity and thickness"), [L("Внутрішній об'єм (місткість) = πr²h = ", "Inner volume (capacity) = πr²h = ") + num(vit(inner), nd, u3), L("Зовнішній об'єм = πR²h = ", "Outer volume = πR²h = ") + num(vit(outer), nd, u3), L("Товщина стінки = R − r = ", "Wall thickness = R − r = ") + nf(sub(Ro, r)) + (u1 ? " " + u1 : "")]));
      steps.push(step(L("Повна поверхня", "The total surface"), ["S = 2π(R + r)h + 2π(R² − r²) = " + num(qItem(tot), nd, u2)], L("Зовнішня й внутрішня бічні поверхні та два кільця.", "The outer and inner lateral surfaces and two rings.")));
      tiles.push({ k: L("Місткість", "Capacity"), v: brief(vit(inner), nd, u3) }, { k: L("Товщина стінки", "Wall thickness"), v: nf(sub(Ro, r)) + (u1 ? " " + u1 : "") }, { k: L("Повна поверхня", "Total area"), v: brief(qItem(tot), nd, u2) });
      visualO = { kind: "cyl", r: toDbl(Ro), r2: toDbl(r), h: toDbl(h), lr: "R = " + nf(Ro), lr2: "r = " + nf(r), lh: "h = " + nf(h) };
      exprT = L("Труба: R = ", "Pipe: R = ") + F1("R") + ", r = " + F1("r") + ", h = " + F1("h") + (u1 ? " " + u1 : "");
    } else if (sh === "cone" && vr === "full") {
      const r = v.r, h = v.h, l2 = add(sq(r), sq(h)), lq = sqrtRat(l2);
      Vq = Qn(mul(THIRD, mul(sq(r), h)), O, 1);
      const lat = qMul(Qn(r, O, 1), lq), base = Qn(sq(r), O, 1), tot = sumItem([base, lat]);
      steps.push(step(L("Формула об'єму", "The volume formula"), ["V = π · r² · h / 3"], L("Об'єм конуса — третина об'єму циліндра з тією самою основою й висотою.", "The volume of a cone is a third of the cylinder with the same base and height.")));
      steps.push(step(L("Підстановка", "Substitution"), ["V = π · " + nf(sq(r)) + " · " + nf(h) + " / 3 = " + Vtxt(Vq)]));
      steps.push(step(L("Твірна", "The slant height"), ["l = √(r² + h²) = √" + (l2.d === O ? nf(l2) : "(" + nf(l2) + ")") + " = " + num(qItem(lq), nd, u1)], L("Твірна — гіпотенуза трикутника з катетами r і h.", "The slant height is the hypotenuse of the triangle with legs r and h.")));
      steps.push(step(L("Поверхня", "The surface"), [L("Бічна S = πrl = ", "Lateral S = πrl = ") + num(qItem(lat), nd, u2), L("Повна S = πr² + πrl = ", "Total S = πr² + πrl = ") + num(tot, nd, u2)]));
      tiles.push({ k: L("Твірна l", "Slant height l"), v: brief(qItem(lq), nd, u1) }, { k: L("Бічна поверхня", "Lateral area"), v: brief(qItem(lat), nd, u2) }, { k: L("Повна поверхня", "Total area"), v: brief(tot, nd, u2) });
      visualO = { kind: "cone", r: toDbl(r), h: toDbl(h), lr: "r = " + nf(r), lh: "h = " + nf(h), ll: lblOf("l", qItem(lq)) };
      exprT = L("Конус: r = ", "Cone: r = ") + F1("r") + ", h = " + F1("h") + (u1 ? " " + u1 : "");
    } else if (sh === "cone") {
      const r1 = v.r, r2 = v.s, h = v.h, dr = sub(r1, r2), l2 = add(sq(h), sq(dr)), lq = sqrtRat(l2);
      const kk = add(add(sq(r1), mul(r1, r2)), sq(r2));
      Vq = Qn(mul(THIRD, mul(h, kk)), O, 1);
      const lat = qMul(Qn(add(r1, r2), O, 1), lq), bases = Qn(add(sq(r1), sq(r2)), O, 1), tot = sumItem([bases, lat]);
      steps.push(step(L("Формула об'єму", "The volume formula"), ["V = π · h · (r₁² + r₁r₂ + r₂²) / 3"], L("Зрізаний конус: різниця повного конуса й відрізаної верхівки.", "A frustum: a full cone minus the cut-off top.")));
      steps.push(step(L("Підстановка", "Substitution"), ["r₁² + r₁r₂ + r₂² = " + nf(sq(r1)) + " + " + nf(mul(r1, r2)) + " + " + nf(sq(r2)) + " = " + nf(kk), "V = π · " + nf(h) + " · " + nf(kk) + " / 3 = " + Vtxt(Vq)]));
      steps.push(step(L("Твірна", "The slant height"), ["l = √(h² + (r₁ − r₂)²) = √" + (l2.d === O ? nf(l2) : "(" + nf(l2) + ")") + " = " + num(qItem(lq), nd, u1)]));
      steps.push(step(L("Поверхня", "The surface"), [L("Бічна S = π(r₁ + r₂)l = ", "Lateral S = π(r₁ + r₂)l = ") + num(qItem(lat), nd, u2), L("Повна S = π(r₁² + r₂²) + π(r₁ + r₂)l = ", "Total S = π(r₁² + r₂²) + π(r₁ + r₂)l = ") + num(tot, nd, u2)]));
      tiles.push({ k: L("Твірна l", "Slant height l"), v: brief(qItem(lq), nd, u1) }, { k: L("Бічна поверхня", "Lateral area"), v: brief(qItem(lat), nd, u2) }, { k: L("Повна поверхня", "Total area"), v: brief(tot, nd, u2) });
      visualO = { kind: "cone", r: toDbl(r1), r2: toDbl(r2), h: toDbl(h), lr: "r₁ = " + nf(r1), lr2: "r₂ = " + nf(r2), lh: "h = " + nf(h) };
      exprT = L("Зрізаний конус: r₁ = ", "Frustum: r₁ = ") + F1("r") + ", r₂ = " + F1("s") + ", h = " + F1("h") + (u1 ? " " + u1 : "");
    } else if (sh === "pyramid" && vr === "reg") {
      const n = v.n, a = v.a, h = v.h, g = ngon(n, a);
      let S0it, lq = null, latIt, totIt, edgeIt, Vit2;
      if (g.exact) {
        Vq = qMul(qScale(g.S0, THIRD), Qn(h));
        S0it = qItem(g.S0); Vit2 = vit(Vq);
        lq = sqrtRat(add(sq(h), g.rho2));
        const lat = qScale(lq, mul(R(n), div(a, TWO)));
        latIt = qItem(lat); totIt = sumItem([g.S0, lat]);
        edgeIt = qItem(sqrtRat(add(sq(h), g.Rc2)));
      } else {
        const hd = toDbl(h), ld = Math.sqrt(hd * hd + g.rho * g.rho), vd = (g.S0d * hd) / 3;
        S0it = item(null, fromDbl(g.S0d), false); Vq = Qn(fromDbl(vd)); Vit2 = item(null, fromDbl(vd * toDbl(ctx.f)), false);
        latIt = item(null, fromDbl((n * toDbl(a) * ld) / 2), false); totIt = item(null, fromDbl(g.S0d + (n * toDbl(a) * ld) / 2), false);
        edgeIt = item(null, fromDbl(Math.sqrt(hd * hd + g.Rc * g.Rc)), false); lq = { approx: ld };
      }
      Vit = Vit2;
      const lIt = g.exact ? qItem(lq) : item(null, fromDbl(lq.approx), false);
      steps.push(step(L("Площа основи", "The base area"), ["S₀ = n · a² / (4 · tg(180° / n)), n = " + n, "S₀ = " + num(S0it, nd, u2)], g.exact ? L("Для n = 3, 4, 6 площа основи точна.", "For n = 3, 4, 6 the base area is exact.") : L("Для цього n площа основи наближена.", "For this n the base area is approximate.")));
      steps.push(step(L("Формула об'єму", "The volume formula"), ["V = S₀ · h / 3"], L("Піраміда — третина призми з тією самою основою й висотою.", "A pyramid is a third of the prism with the same base and height.")));
      steps.push(step(L("Підстановка", "Substitution"), ["V = " + brief(S0it, nd, "") + " · " + nf(h) + " / 3 = " + (g.exact ? Vtxt(Vq) : num(item(null, Vq.c, false), nd, u3len))]));
      steps.push(step(L("Апофема і бічне ребро", "Slant height and lateral edge"), [L("Апофема l = √(h² + ρ²), ρ — радіус вписаного кола основи: l = ", "Slant height l = √(h² + ρ²), ρ is the inradius of the base: l = ") + num(lIt, nd, u1), L("Бічне ребро = √(h² + R²), R — радіус описаного кола основи: ", "Lateral edge = √(h² + R²), R is the circumradius of the base: ") + num(edgeIt, nd, u1)]));
      steps.push(step(L("Поверхня", "The surface"), [L("Бічна S = n · a · l / 2 = ", "Lateral S = n · a · l / 2 = ") + num(latIt, nd, u2), L("Повна S = S₀ + бічна = ", "Total S = S₀ + lateral = ") + num(totIt, nd, u2)]));
      tiles.push({ k: L("Апофема l", "Slant height l"), v: brief(lIt, nd, u1) }, { k: L("Бічна поверхня", "Lateral area"), v: brief(latIt, nd, u2) }, { k: L("Повна поверхня", "Total area"), v: brief(totIt, nd, u2) });
      visualO = { kind: "pyr", n, rc: g.Rc, h: toDbl(h), la: "a = " + nf(a), lh: "h = " + nf(h), ln: "n = " + n };
      exprT = L("Піраміда: n = ", "Pyramid: n = ") + n + ", a = " + F1("a") + ", h = " + F1("h") + (u1 ? " " + u1 : "");
    } else if (sh === "pyramid") {
      const S0 = v.S, h = v.h;
      Vq = Qn(mul(THIRD, mul(S0, h)));
      steps.push(step(L("Формула об'єму", "The volume formula"), ["V = S₀ · h / 3"], L("Працює для піраміди з будь-якою основою.", "This works for a pyramid with any base.")));
      steps.push(step(L("Підстановка", "Substitution"), ["V = " + nf(S0) + " · " + nf(h) + " / 3 = " + nf(Vq.c) + (u3len ? " " + u3len : "")]));
      tiles.push({ k: L("Площа основи S₀", "Base area S₀"), v: nf(S0) + (u2 ? " " + u2 : "") }, { k: L("Висота h", "Height h"), v: nf(h) + (u1 ? " " + u1 : "") }, { k: L("Поверхня", "Surface"), v: L("залежить від основи", "depends on the base") });
      visualO = { kind: "pyr", n: 5, rc: 1, h: toDbl(h) / Math.sqrt(toDbl(S0)), la: "S₀ = " + nf(S0), lh: "h = " + nf(h), ln: "" };
      exprT = L("Піраміда: S₀ = ", "Pyramid: S₀ = ") + F1("S") + ", h = " + F1("h") + (u1 ? " " + u1 : "");
    } else if (sh === "sphere" && vr === "full") {
      const r = v.r, r3 = cube3(r);
      Vq = Qn(mul(q(4n, 3n), r3), O, 1);
      const Sq = Qn(mul(FOUR, sq(r)), O, 1);
      steps.push(step(L("Формула об'єму", "The volume formula"), ["V = 4 · π · r³ / 3"]));
      steps.push(step(L("Підстановка", "Substitution"), ["V = 4 · π · " + nf(r) + "³ / 3 = 4 · π · " + nf(r3) + " / 3 = " + Vtxt(Vq)]));
      steps.push(step(L("Поверхня й діаметр", "The surface and diameter"), [L("Площа сфери S = 4πr² = ", "Sphere area S = 4πr² = ") + num(qItem(Sq), nd, u2), L("Діаметр D = 2r = ", "Diameter D = 2r = ") + nf(mul(TWO, r)) + (u1 ? " " + u1 : ""), L("Площа великого круга = πr² = ", "Great circle area = πr² = ") + num(qItem(Qn(sq(r), O, 1)), nd, u2)]));
      tiles.push({ k: L("Площа сфери S", "Sphere area S"), v: brief(qItem(Sq), nd, u2) }, { k: L("Діаметр D", "Diameter D"), v: nf(mul(TWO, r)) + (u1 ? " " + u1 : "") }, { k: L("Велике коло", "Great circle"), v: brief(qItem(Qn(sq(r), O, 1)), nd, u2) });
      visualO = { kind: "sph", lr: "r = " + nf(r) };
      exprT = L("Куля: r = ", "Sphere: r = ") + F1("r") + (u1 ? " " + u1 : "");
    } else if (sh === "sphere") {
      const r = v.r, hh = v.h;
      if (cmp(hh, mul(TWO, r)) > 0) return { ok: false, msg: L("Висота сегмента h не може бути більшою за діаметр кулі 2r.", "The cap height h cannot exceed the diameter 2r.") };
      Vq = Qn(mul(THIRD, mul(sq(hh), sub(mul(THREE, r), hh))), O, 1);
      const a2 = mul(hh, sub(mul(TWO, r), hh)), aq = sqrtRat(a2), curved = Qn(mul(TWO, mul(r, hh)), O, 1), tot = Qn(mul(hh, sub(mul(FOUR, r), hh)), O, 1);
      steps.push(step(L("Формула об'єму сегмента", "The cap volume formula"), ["V = π · h² · (3r − h) / 3"], L("Кульовий сегмент — частина кулі, відтята площиною.", "A spherical cap is the part of a sphere cut off by a plane.")));
      steps.push(step(L("Підстановка", "Substitution"), ["V = π · " + nf(sq(hh)) + " · (" + nf(mul(THREE, r)) + " − " + nf(hh) + ") / 3 = " + Vtxt(Vq)]));
      steps.push(step(L("Радіус основи сегмента", "The base radius of the cap"), ["a = √(h(2r − h)) = √" + (a2.d === O ? nf(a2) : "(" + nf(a2) + ")") + " = " + num(qItem(aq), nd, u1)]));
      steps.push(step(L("Поверхня", "The surface"), [L("Крива поверхня = 2πrh = ", "Curved surface = 2πrh = ") + num(qItem(curved), nd, u2), L("Повна поверхня = 2πrh + πa² = πh(4r − h) = ", "Total surface = 2πrh + πa² = πh(4r − h) = ") + num(qItem(tot), nd, u2)]));
      tiles.push({ k: L("Радіус основи a", "Base radius a"), v: brief(qItem(aq), nd, u1) }, { k: L("Крива поверхня", "Curved surface"), v: brief(qItem(curved), nd, u2) }, { k: L("Повна поверхня", "Total surface"), v: brief(qItem(tot), nd, u2) });
      visualO = { kind: "sph", lr: "r = " + nf(r), seg: toDbl(hh) / toDbl(r), lh: "h = " + nf(hh) };
      exprT = L("Сегмент: r = ", "Cap: r = ") + F1("r") + ", h = " + F1("h") + (u1 ? " " + u1 : "");
    } else { // еліпсоїд
      const { a, b, c } = v, abc = mul(a, mul(b, c));
      Vq = Qn(mul(q(4n, 3n), abc), O, 1);
      const eq = cbrtApprox(abc);
      steps.push(step(L("Формула об'єму", "The volume formula"), ["V = 4 · π · a · b · c / 3"], L("Піввісі a, b, c — відстані від центру до поверхні вздовж трьох осей. При a = b = c це куля.", "The semi-axes a, b, c are the distances from the centre to the surface along three axes. For a = b = c it is a sphere.")));
      steps.push(step(L("Підстановка", "Substitution"), ["V = 4 · π · " + nf(a) + " · " + nf(b) + " · " + nf(c) + " / 3 = 4 · π · " + nf(abc) + " / 3 = " + Vtxt(Vq)]));
      steps.push(step(L("Рівновелика куля", "The equal-volume sphere"), [L("r = ∛(abc) ≈ ", "r = ∛(abc) ≈ ") + roundStr(eq, nd) + (u1 ? " " + u1 : "")], L("Куля того самого об'єму. Точної формули площі поверхні еліпсоїда немає (потрібні еліптичні інтеграли), тому її тут не рахуємо.", "A sphere of the same volume. There is no closed formula for the surface area of an ellipsoid (it needs elliptic integrals), so it is not computed here.")));
      tiles.push({ k: L("Діаметри", "Diameters"), v: nf(mul(TWO, a)) + " · " + nf(mul(TWO, b)) + " · " + nf(mul(TWO, c)) }, { k: L("Рівновелика куля r", "Equal sphere r"), v: "≈ " + roundStr(eq, nd) + (u1 ? " " + u1 : "") }, { k: L("Добуток abc", "Product abc"), v: nf(abc) + (u3 ? " " + LL[lenU()] + "³" : "") });
      visualO = { kind: "ell", a: toDbl(a), b: toDbl(b), c: toDbl(c), la: "a = " + nf(a), lb: "b = " + nf(b), lc: "c = " + nf(c) };
      exprT = L("Еліпсоїд: ", "Ellipsoid: ") + F1("a") + ", " + F1("b") + ", " + F1("c") + (u1 ? " " + u1 : "");
    }
    if (!Vit) Vit = vit(Vq);
    convSteps(steps, Vq, nd, ctx);
    return { ok: true, expr: exprT, head: head("V", brief(Vit, nd, u3) + PN), tiles, steps, visual: visualO, resText: "V = " + brief(Vit, nd, u3) };
  }

  // ===== зворотна задача: розмір за об'ємом =====
  const ISHAPES = [["cube", "Куб (ребро a)", "Cube (edge a)"], ["sphere", "Куля (радіус r)", "Sphere (radius r)"], ["box", "Паралелепіпед (третє ребро c)", "Cuboid (third edge c)"], ["cylinder", "Циліндр", "Cylinder"], ["cone", "Конус", "Cone"]];
  const IKNOWN = { cylinder: [["h", "Відома висота h → знайти r", "Height h known → find r"], ["r", "Відомий радіус r → знайти h", "Radius r known → find h"]], cone: [["h", "Відома висота h → знайти r", "Height h known → find r"], ["r", "Відомий радіус r → знайти h", "Radius r known → find h"]] };
  const ishape = () => el("ishape").value || "cube";
  const iknown = () => (IKNOWN[ishape()] ? el("iknown").value || "h" : "");
  const IF = (k, uk, en, ph) => ({ k, uk, en, ph });
  function ispec() {
    const s = ishape(), k = iknown();
    const Vf = IF("V", "Об'єм V", "Volume V", L("125 або 36π", "125 or 36π"));
    if (s === "cube" || s === "sphere") return [Vf];
    if (s === "box") return [Vf, IF("a", "Ребро a", "Edge a", "5"), IF("b", "Ребро b", "Edge b", "5")];
    return [Vf, k === "h" ? IF("h", "Висота h", "Height h", "10") : IF("r", "Радіус r", "Radius r", "3")];
  }
  const IFLD = ["iV", "i1", "i2"];
  // значення Q·π^p з розкладом на корінь: radicand = c·π^p
  function rootItem(c, p, deg) { // deg = 2 або 3; c·π^p → { it (item), ex }
    if (p === 0) {
      if (deg === 3) { const a = icbrt(c.n), b = icbrt(c.d); if (a * a * a === c.n && b * b * b === c.d) return { it: item(null, q(a, b), true), form: null }; return { it: item(null, cbrtApprox(c), false), form: "∛" + (c.d === O ? nf(c) : "(" + nf(c) + ")") }; }
      const rq = sqrtRat(c); return { it: qItem(rq), form: null };
    }
    let x = c; for (let i = 0; i < Math.abs(p); i++) x = p > 0 ? mul(x, piVal()) : div(x, piVal());
    return { it: item(null, deg === 3 ? cbrtApprox(x) : sqrtApprox(x), false), form: (deg === 3 ? "∛" : "√") + "(" + nf(c) + (p > 0 ? " · π" : " / π") + ")" };
  }
  function modeIv() {
    const sp = ispec();
    const rs = sp.map((f, i) => (f.k === "V" ? volIn(IFLD[i], L("Об'єм V", "Volume V")) : posLen(IFLD[i], L(f.uk, f.en))));
    const fe = firstErr(rs);
    if (fe) return fe;
    if (rs.some((r) => r.miss)) return { ok: false, incomplete: true };
    const nd = ND(), ctx = volCtx(), u1 = U1(), u3 = U3(), s = ishape(), kn = iknown(), sq = (x) => mul(x, x);
    const V0 = rs[0], vals = {};
    sp.forEach((f, i) => { vals[f.k] = rs[i].v; });
    const vp = V0.pi ? 1 : 0, steps = [];
    // об'єм у кубі одиниці довжини
    const vs = (x) => (V0.pi ? qText(Qn(x, O, 1)) : nf(x));
    let Vc = V0.v, unitLines = [];
    if (ctx.conv) { Vc = div(V0.v, ctx.f); unitLines = [L("V у ", "V in ") + U3() + ": " + vs(V0.v) + " " + ctx.label + " → " + vs(Vc) + " " + U3()]; }
    const Vtxt = vs(V0.v) + (ctx.label ? " " + ctx.label : "");
    if (unitLines.length) steps.push(step(L("Переводимо одиниці", "Converting units"), unitLines, L("Далі всі довжини в одиницях, а об'єм — у кубі цієї одиниці.", "Below all lengths are in the length unit and the volume in its cube.")));
    let found, name, formula, subst, visualO, exprT, resForm = null, extraChk = null;
    if (s === "cube") {
      name = "a"; formula = ["a³ = V", "a = ∛V"];
      const r = rootItem(Vc, vp, 3); found = r.it; resForm = r.form;
      subst = ["a = ∛" + (V0.pi ? vs(Vc) : Vc.d === O ? nf(Vc) : "(" + nf(Vc) + ")") + " = " + num(found, nd, u1)];
      visualO = { kind: "box", a: toDbl(found.v), b: toDbl(found.v), c: toDbl(found.v), la: lblOf("a", found), lb: lblOf("a", found), lc: lblOf("a", found) };
      extraChk = (x) => cube3(x);
      exprT = L("Куб: V = ", "Cube: V = ");
    } else if (s === "sphere") {
      name = "r"; formula = ["V = 4πr³ / 3", "r³ = 3V / (4π)", "r = ∛(3V / (4π))"];
      const c = mul(THREE, div(Vc, FOUR)), r = rootItem(c, vp - 1, 3); found = r.it; resForm = r.form;
      subst = ["r³ = 3 · " + vs(Vc) + " / (4π) = " + (vp ? nf(c) : nf(c) + " / π"), "r = " + num(found, nd, u1)];
      visualO = { kind: "sph", lr: lblOf("r", found) };
      extraChk = (x) => mul(q(4n, 3n), mul(piVal(), cube3(x)));
      exprT = L("Куля: V = ", "Sphere: V = ");
    } else if (s === "box") {
      name = "c"; formula = ["V = a · b · c", "c = V / (a · b)"];
      const ab = mul(vals.a, vals.b), cq = Qn(div(Vc, ab), O, vp);
      found = qItem(cq);
      subst = ["c = " + vs(Vc) + " / (" + nf(vals.a) + " · " + nf(vals.b) + ") = " + num(found, nd, u1)];
      visualO = { kind: "box", a: toDbl(vals.a), b: toDbl(vals.b), c: Math.max(toDbl(qVal(cq)), 1e-9), la: "a = " + nf(vals.a), lb: "b = " + nf(vals.b), lc: lblOf("c", found) };
      extraChk = (x) => mul(ab, x);
      exprT = L("Паралелепіпед: V = ", "Cuboid: V = ");
    } else if (s === "cylinder" && kn === "h") {
      name = "r"; const h = vals.h; formula = ["V = πr²h", "r² = V / (π · h)", "r = √(V / (π · h))"];
      const c = div(Vc, h), r = rootItem(c, vp - 1, 2); found = r.it; resForm = r.form;
      subst = ["r² = " + vs(Vc) + " / (π · " + nf(h) + ") = " + (vp ? nf(c) : nf(c) + " / π"), "r = " + num(found, nd, u1)];
      visualO = { kind: "cyl", r: toDbl(found.v), h: toDbl(h), lr: lblOf("r", found), lh: "h = " + nf(h) };
      extraChk = (x) => mul(piVal(), mul(sq(x), h));
      exprT = L("Циліндр: V = ", "Cylinder: V = ");
    } else if (s === "cylinder") {
      name = "h"; const r = vals.r; formula = ["V = πr²h", "h = V / (π · r²)"];
      const c = div(Vc, sq(r)), p = vp - 1;
      found = p === 0 ? qItem(Qn(c)) : p > 0 ? qItem(Qn(c, O, p)) : item(null, div(c, piVal()), false);
      subst = ["h = " + vs(Vc) + " / (π · " + nf(sq(r)) + ") = " + num(found, nd, u1)];
      visualO = { kind: "cyl", r: toDbl(r), h: toDbl(found.v), lr: "r = " + nf(r), lh: lblOf("h", found) };
      extraChk = (x) => mul(piVal(), mul(sq(r), x));
      exprT = L("Циліндр: V = ", "Cylinder: V = ");
    } else if (s === "cone" && kn === "h") {
      name = "r"; const h = vals.h; formula = ["V = πr²h / 3", "r² = 3V / (π · h)", "r = √(3V / (π · h))"];
      const c = div(mul(THREE, Vc), h), r = rootItem(c, vp - 1, 2); found = r.it; resForm = r.form;
      subst = ["r² = 3 · " + vs(Vc) + " / (π · " + nf(h) + ") = " + (vp ? nf(c) : nf(c) + " / π"), "r = " + num(found, nd, u1)];
      visualO = { kind: "cone", r: toDbl(found.v), h: toDbl(h), lr: lblOf("r", found), lh: "h = " + nf(h) };
      extraChk = (x) => mul(THIRD, mul(piVal(), mul(sq(x), h)));
      exprT = L("Конус: V = ", "Cone: V = ");
    } else {
      name = "h"; const r = vals.r; formula = ["V = πr²h / 3", "h = 3V / (π · r²)"];
      const c = div(mul(THREE, Vc), sq(r)), p = vp - 1;
      found = p === 0 ? qItem(Qn(c)) : p > 0 ? qItem(Qn(c, O, p)) : item(null, div(c, piVal()), false);
      subst = ["h = 3 · " + vs(Vc) + " / (π · " + nf(sq(r)) + ") = " + num(found, nd, u1)];
      visualO = { kind: "cone", r: toDbl(r), h: toDbl(found.v), lr: "r = " + nf(r), lh: lblOf("h", found) };
      extraChk = (x) => mul(THIRD, mul(piVal(), mul(sq(r), x)));
      exprT = L("Конус: V = ", "Cone: V = ");
    }
    steps.push(step(L("Формула", "The formula"), formula));
    steps.push(step(L("Підстановка", "Substitution"), subst));
    const chk = extraChk(found.v);
    steps.push(step(L("Перевірка", "Check"), [L("Підставляємо знайдене значення назад: V ≈ ", "Putting the value back: V ≈ ") + roundStr(chk, Math.min(nd, 6)) + (u3 ? " " + u3 : ""), L("Задано V = ", "Given V = ") + roundStr(mul(Vc, V0.pi ? piVal() : ONE), Math.min(nd, 6)) + (u3 ? " " + u3 : "")], L("Збіг до відображених знаків — значення знайдено правильно.", "A match to the shown digits means the value is correct.")));
    return { ok: true, expr: exprT + Vtxt, head: head(name, brief(found, nd, u1) + piNote()), tiles: [{ k: L("Шукана величина", "The unknown"), v: name + (/^≈/.test(brief(found, nd, u1)) ? " " : " = ") + brief(found, nd, u1) }, { k: L("Задано V", "Given V"), v: Vtxt }, { k: L("Знайдено в одиницях", "Found in"), v: u1 || L("без одиниць", "no units") }], steps, visual: visualO, resText: name + (/^≈/.test(brief(found, nd, u1)) ? " " : " = ") + brief(found, nd, u1), resForm };
  }

  // ===== схеми =====
  const label = (x, y, t, anchor, col, size) => '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + (size || 15) + '" font-weight="700" fill="' + (col || "#1f2f55") + '" text-anchor="' + (anchor || "middle") + '" paint-order="stroke" stroke="#fff" stroke-width="3.5" stroke-linejoin="round">' + esc(t) + "</text>";
  const BLUE = "#4f6fb8", ORG = "#d85a30", FILL = "#e8efff", FILL2 = "#dbe6fb", HID = "#9aa8c7";
  const f1 = (x) => x.toFixed(1);
  const ln = (p, r, col, w, dash) => '<line x1="' + f1(p[0]) + '" y1="' + f1(p[1]) + '" x2="' + f1(r[0]) + '" y2="' + f1(r[1]) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>";
  const dot = (p) => '<circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="4.2" fill="#283b69" stroke="#fff" stroke-width="1.5"/>';
  const ellip = (cx, cy, rx, ry, fill, stroke, w, dash) => '<ellipse cx="' + f1(cx) + '" cy="' + f1(cy) + '" rx="' + f1(rx) + '" ry="' + f1(ry) + '" fill="' + (fill || "none") + '" stroke="' + (stroke || "none") + '" stroke-width="' + (w || 2.6) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>";
  const halfE = (cx, cy, rx, ry, front, stroke, w, dash) => '<path d="M ' + f1(cx - rx) + " " + f1(cy) + " A " + f1(rx) + " " + f1(ry) + " 0 0 " + (front ? 0 : 1) + " " + f1(cx + rx) + " " + f1(cy) + '" fill="none" stroke="' + stroke + '" stroke-width="' + (w || 2.6) + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>";
  const polyS = (p, fill, stroke, w) => '<polygon points="' + p.map((a) => f1(a[0]) + "," + f1(a[1])).join(" ") + '" fill="' + (fill || "none") + '" stroke="' + (stroke || "none") + '" stroke-width="' + (w || 2.6) + '" stroke-linejoin="round"/>';
  const cmpz = (x, mx) => Math.max(0.28, Math.pow(x / mx, 0.62));
  function boxSvg(v, W, H) {
    const mx = Math.max(v.a, v.b, v.c), ca = cmpz(v.a, mx), cb = cmpz(v.b, mx), cc = cmpz(v.c, mx), dx = 0.55 * cb * Math.cos(Math.PI / 4), dy = 0.55 * cb * Math.sin(Math.PI / 4);
    const raw = { f0: [0, 0], f1: [ca, 0], f2: [ca, cc], f3: [0, cc], b0: [dx, dy], b1: [ca + dx, dy], b2: [ca + dx, cc + dy], b3: [dx, cc + dy] };
    const pts = Object.values(raw), x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
    const s = Math.min((W - 130) / (x1 - x0), (H - 90) / (y1 - y0)), ox = (W - (x1 - x0) * s) / 2 - x0 * s, oy = (H + (y1 - y0) * s) / 2 + y0 * s, P = {};
    Object.keys(raw).forEach((k) => { P[k] = [raw[k][0] * s + ox, oy - raw[k][1] * s]; });
    let o = polyS([P.f0, P.f1, P.f2, P.f3], FILL) + polyS([P.f3, P.f2, P.b2, P.b3], FILL2) + polyS([P.f1, P.b1, P.b2, P.f2], "#cfdcf7");
    [["b0", "f0"], ["b0", "b1"], ["b0", "b3"]].forEach(([i, j]) => { o += ln(P[i], P[j], HID, 1.8, "5 5"); });
    [["f0", "f1"], ["f1", "f2"], ["f2", "f3"], ["f3", "f0"], ["f3", "b3"], ["f2", "b2"], ["b3", "b2"], ["f1", "b1"], ["b1", "b2"]].forEach(([i, j]) => { o += ln(P[i], P[j], BLUE, 2.8); });
    if (v.ld) o += ln(P.f0, P.b2, ORG, 3.4) + dot(P.f0) + dot(P.b2);
    o += label((P.f0[0] + P.f1[0]) / 2, P.f0[1] + 22, v.la, "middle", "#283b69", 14) + label(P.f0[0] - 10, (P.f0[1] + P.f3[1]) / 2 + 5, v.lc, "end", "#283b69", 14);
    const mb = [(P.f1[0] + P.b1[0]) / 2, (P.f1[1] + P.b1[1]) / 2];
    o += label(mb[0] + 12, mb[1] + 6, v.lb, "start", "#283b69", 14);
    if (v.ld) { const ctr = [(P.f0[0] + P.b2[0]) / 2, (P.f0[1] + P.b2[1]) / 2]; o += label(ctr[0] - 6, ctr[1] - 10, v.ld, "end", "#b4411f", 15); }
    return o;
  }
  // n-кутна основа в проєкції: вершини на еліпсі, передня вершина внизу
  function ngonPts(n, cx, cy, R0, k) { const a = []; for (let i = 0; i < n; i++) { const t = Math.PI / 2 + (2 * Math.PI * i) / n; a.push({ p: [cx + R0 * Math.cos(t), cy + k * R0 * Math.sin(t)], back: Math.sin(t) < -0.02 }); } return a; }
  function prismSvg(v, W, H, apex) {
    const k = 0.3, rc = cmpz(v.rc, Math.max(v.rc, v.h)), hh = cmpz(v.h, Math.max(v.rc, v.h));
    const s = Math.min((W - 150) / (2 * rc), (H - 90) / (hh + 2 * k * rc)), R0 = rc * s, Hp = hh * s;
    const cx = W / 2 - 10, cyB = (H + Hp) / 2 + 2, n = Math.max(3, Math.min(v.n || 5, 12));
    const B = ngonPts(n, cx, cyB, R0, k);
    let o = "";
    if (!apex) {
      const T = B.map((b) => [b.p[0], b.p[1] - Hp]);
      o += polyS(B.map((b) => b.p), FILL2) + polyS(T, FILL);
      B.forEach((b, i) => { const c = B[(i + 1) % n]; o += ln(b.p, c.p, b.back && c.back ? HID : BLUE, b.back && c.back ? 1.8 : 2.8, b.back && c.back ? "5 5" : null); });
      B.forEach((b, i) => { o += ln(b.p, T[i], b.back ? HID : BLUE, b.back ? 1.8 : 2.8, b.back ? "5 5" : null); });
      o += polyS(T, FILL, BLUE, 2.8);
      const m = [(B[0].p[0] + B[1 % n].p[0]) / 2, (B[0].p[1] + B[1 % n].p[1]) / 2];
      o += label(m[0], m[1] + 22, v.la, "middle", "#283b69", 14);
      o += ln([cx + R0 + 22, cyB], [cx + R0 + 22, cyB - Hp], ORG, 3) + label(cx + R0 + 30, cyB - Hp / 2 + 5, v.lh, "start", "#b4411f", 14);
      if (v.ln) o += label(cx, cyB - Hp - k * R0 - 10, v.ln, "middle", "#4a64a5", 13);
    } else {
      const A = [cx, cyB - Hp];
      o += polyS(B.map((b) => b.p), FILL2);
      B.forEach((b, i) => { const c = B[(i + 1) % n]; o += ln(b.p, c.p, b.back && c.back ? HID : BLUE, b.back && c.back ? 1.8 : 2.8, b.back && c.back ? "5 5" : null); });
      B.forEach((b) => { o += ln(b.p, A, b.back ? HID : BLUE, b.back ? 1.8 : 2.8, b.back ? "5 5" : null); });
      o += ln(A, [cx, cyB], ORG, 3, "6 5") + dot(A) + dot([cx, cyB]);
      const m = [(B[0].p[0] + B[1 % n].p[0]) / 2, (B[0].p[1] + B[1 % n].p[1]) / 2];
      o += label(m[0], m[1] + 22, v.la, "middle", "#283b69", 14) + label(cx + 8, cyB - Hp / 2 + 5, v.lh, "start", "#b4411f", 14);
      if (v.ln) o += label(cx, cyB - Hp - k * R0 - 10, v.ln, "middle", "#4a64a5", 13);
    }
    return o;
  }
  function cylSvg(v, W, H) {
    const mx = Math.max(v.r, v.h / 1.4), rr = cmpz(v.r, mx), hh = cmpz(v.h / 1.4, mx) * 1.4, k = 0.3;
    const s = Math.min((W - 190) / (2 * rr), (H - 80) / (hh + 2 * k * rr)), rx = rr * s, ry = k * rx, Hp = hh * s, cx = W / 2 - 22, yb = (H + Hp) / 2 - 2, yt = yb - Hp;
    let o = '<path d="M ' + f1(cx - rx) + " " + f1(yt) + " L " + f1(cx - rx) + " " + f1(yb) + " A " + f1(rx) + " " + f1(ry) + " 0 0 0 " + f1(cx + rx) + " " + f1(yb) + " L " + f1(cx + rx) + " " + f1(yt) + ' Z" fill="' + FILL2 + '" stroke="none"/>';
    o += halfE(cx, yb, rx, ry, false, HID, 1.8, "5 5") + ln([cx - rx, yt], [cx - rx, yb], BLUE, 2.8) + ln([cx + rx, yt], [cx + rx, yb], BLUE, 2.8) + halfE(cx, yb, rx, ry, true, BLUE, 2.8);
    o += ellip(cx, yt, rx, ry, FILL, BLUE, 2.8);
    if (v.r2) { const r2 = (v.r2 / v.r) * rx; o += ellip(cx, yt, r2, r2 * k, "#fff", ORG, 2.4, "5 4"); o += ln([cx, yt], [cx + r2, yt], ORG, 2.4) + label(cx - rx * 0.45, yt - ry - 8, v.lr2, "middle", "#b4411f", 13); }
    o += ln([cx, yt], [cx + rx, yt], v.r2 ? BLUE : ORG, v.r2 ? 2 : 3) + label(cx + rx + 8, yt - 6, v.lr, "start", "#b4411f", 14);
    o += ln([cx + rx + 26, yt], [cx + rx + 26, yb], ORG, 3) + label(cx + rx + 34, (yt + yb) / 2 + 5, v.lh, "start", "#b4411f", 14);
    return o;
  }
  function coneSvg(v, W, H) {
    const rbig = Math.max(v.r, v.r2 || 0), mx = Math.max(rbig, v.h / 1.3), rr = cmpz(rbig, mx), hh = cmpz(v.h / 1.3, mx) * 1.3, k = 0.3;
    const s = Math.min((W - 190) / (2 * rr), (H - 80) / (hh + 2 * k * rr)), rx = rr * s, ry = k * rx, Hp = hh * s, cx = W / 2 - 22, yb = (H + Hp) / 2 - 2, yt = yb - Hp;
    const r2x = v.r2 ? (v.r2 / v.r) * rx : 0;
    let o = "";
    const full = !v.r2;
    const tx = full ? 0 : r2x;
    o += '<path d="M ' + f1(cx - rx) + " " + f1(yb) + " L " + f1(cx - tx) + " " + f1(yt) + " L " + f1(cx + tx) + " " + f1(yt) + " L " + f1(cx + rx) + " " + f1(yb) + " A " + f1(rx) + " " + f1(ry) + " 0 0 1 " + f1(cx - rx) + " " + f1(yb) + ' Z" fill="' + FILL2 + '" stroke="none"/>';
    o += halfE(cx, yb, rx, ry, false, HID, 1.8, "5 5") + ln([cx - rx, yb], [cx - tx, yt], BLUE, 2.8) + ln([cx + rx, yb], [cx + tx, yt], BLUE, 2.8) + halfE(cx, yb, rx, ry, true, BLUE, 2.8);
    if (!full) o += ellip(cx, yt, r2x, r2x * k, FILL, BLUE, 2.8);
    o += ln([cx, yt], [cx, yb], ORG, 2.6, "6 5") + label(cx + 6, (yt + yb) / 2 + 5, v.lh, "start", "#b4411f", 14);
    o += ln([cx, yb], [cx + rx, yb], ORG, 3) + label(cx + rx / 2, yb + ry + 22, v.lr, "middle", "#b4411f", 14);
    if (!full) o += ln([cx, yt], [cx + r2x, yt], ORG, 3) + label(cx + r2x + 8, yt - 6, v.lr2, "start", "#b4411f", 14);
    else o += dot([cx, yt]);
    if (v.ll) o += label(cx + rx * 0.62 + 10, (yt + yb) / 2 - 8, v.ll, "start", "#283b69", 14);
    return o;
  }
  function sphSvg(v, W, H) {
    const Rr = 84, cx = W / 2 - 14, cy = H / 2 + 2;
    let o = ellip(cx, cy, Rr, Rr, FILL, BLUE, 2.8) + halfE(cx, cy, Rr, Rr * 0.3, false, HID, 1.8, "5 5") + halfE(cx, cy, Rr, Rr * 0.3, true, "#7e97cf", 2);
    if (v.seg) {
      const t = Math.min(2, Math.max(0.04, v.seg)), yy = cy - Rr + t * Rr, dyc = yy - cy, w = Math.sqrt(Math.max(0, Rr * Rr - dyc * dyc)), big = yy > cy ? 1 : 0;
      o += '<path d="M ' + f1(cx - w) + " " + f1(yy) + " A " + Rr + " " + Rr + " 0 " + big + " 1 " + f1(cx + w) + " " + f1(yy) + " A " + f1(w) + " " + f1(w * 0.3) + " 0 0 1 " + f1(cx - w) + " " + f1(yy) + ' Z" fill="rgba(216,90,48,.28)" stroke="' + ORG + '" stroke-width="2.4"/>';
      o += ellip(cx, yy, w, w * 0.3, "none", ORG, 2.4);
      o += ln([cx + Rr + 18, cy - Rr], [cx + Rr + 18, yy], ORG, 3) + label(cx + Rr + 26, (cy - Rr + yy) / 2 + 5, v.lh, "start", "#b4411f", 14);
    }
    o += ln([cx, cy], [cx + Rr, cy], ORG, 3) + dot([cx, cy]) + label(cx + Rr / 2, cy + 20, v.lr, "middle", "#b4411f", 14);
    return o;
  }
  function ellSvg(v, W, H) {
    const mx = Math.max(v.a, v.b, v.c), a = cmpz(v.a, mx), c = cmpz(v.c, mx), b = cmpz(v.b, mx), s = Math.min((W - 150) / (2 * a), (H - 70) / (2 * c)), rx = a * s, ry = c * s, cx = W / 2 - 14, cy = H / 2;
    const bx = Math.max(0.12, b * 0.3 * (s * a) / Math.max(rx, 1)) ;
    let o = ellip(cx, cy, rx, ry, FILL, BLUE, 2.8) + halfE(cx, cy, rx, Math.min(ry, 0.32 * rx * b / Math.max(a, 0.28)), false, HID, 1.8, "5 5") + halfE(cx, cy, rx, Math.min(ry, 0.32 * rx * b / Math.max(a, 0.28)), true, "#7e97cf", 2);
    void bx;
    o += ln([cx, cy], [cx + rx, cy], ORG, 3) + label(cx + rx / 2, cy + 20, v.la, "middle", "#b4411f", 14);
    o += ln([cx, cy], [cx, cy - ry], ORG, 3) + label(cx + 6, cy - ry / 2, v.lc, "start", "#b4411f", 14);
    o += ln([cx, cy], [cx - rx * 0.5, cy + ry * 0.25], ORG, 3, "5 4") + label(cx - rx * 0.5 - 6, cy + ry * 0.25 + 18, v.lb, "end", "#b4411f", 14) + dot([cx, cy]);
    return o;
  }
  function visual(v) {
    const W = 420, H = 260;
    let s = '<svg class="vol__svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + L("Схема тіла", "Diagram of the solid") + '"><rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    if (v.kind === "box") s += boxSvg(v, W, H);
    else if (v.kind === "prism") s += prismSvg(v, W, H, false);
    else if (v.kind === "pyr") s += prismSvg(v, W, H, true);
    else if (v.kind === "cyl") s += cylSvg(v, W, H);
    else if (v.kind === "cone") s += coneSvg(v, W, H);
    else if (v.kind === "sph") s += sphSvg(v, W, H);
    else s += ellSvg(v, W, H);
    return s + "</svg>";
  }

  // ===== відображення =====
  const CALC = { dr: modeDr, iv: modeIv };
  function stepsHtml(steps) {
    return '<div class="vol__sub">' + L("Розв'язання", "Solution") + "</div>" + steps.map((s, i) => '<div class="vol__step"><span class="vol__stepN">' + (i + 1) + '</span><div><b class="vol__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="vol__math">' + esc(x) + "</p>").join("") + (s.note ? '<p class="vol__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join("");
  }
  const clean = (s) => s.replace(/ /g, "");
  function textOf(m) { return clean([m.expr + "  →  " + m.resText, ""].concat(m.steps.map((s, i) => (i + 1) + ". " + s.t + "\n   " + s.l.join("\n   "))).join("\n")); }
  let last = null;
  function render(m, strict) {
    const box = el("result");
    if (!m.ok) {
      last = null;
      if (m.incomplete && !strict) { box.innerHTML = T.enter; return; }
      box.innerHTML = '<div class="vol__hintbox">' + esc(m.msg || T.enter) + "</div>";
      return;
    }
    last = m;
    const tiles = '<div class="vol__tiles">' + m.tiles.map((t) => '<div class="vol__tile"><small>' + esc(t.k) + "</small><b>" + esc(t.v) + "</b></div>").join("") + "</div>";
    const vis = m.visual ? '<div class="vol__sub">' + L("Схема", "Diagram") + '</div><div class="vol__graph">' + visual(m.visual) + '</div><div class="vol__note">' + L("Схема умовна: пропорції стиснуті, щоб тіло вміщалось у малюнок.", "The sketch is schematic: proportions are compressed so the solid fits the picture.") + "</div>" : "";
    box.innerHTML = '<div class="vol__rhead"><div class="vol__expr">' + esc(m.expr) + "</div>" + m.head + "</div>" + tiles + vis + stepsHtml(m.steps) + '<div class="vol__note">' + L("Точні значення записано дробами, радикалами й через π; десяткові наближені до обраної кількості знаків.", "Exact values are written with fractions, radicals and π; decimals are rounded to the chosen number of places.") + "</div>";
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
  const DDP = { shape: "sh", variant: "vr", ishape: "is", iknown: "ik", lunit: "lu", vunit: "vu", pmode: "pm", decs: "dc" };
  function setDd(hid, v) {
    const pre = DDP[hid], lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return false;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
    return true;
  }
  function setOptions(hid, opts) { // [[v, uk, en]]
    const pre = DDP[hid], ul = el(pre + "_list");
    ul.innerHTML = opts.map(([v, uk, en], i) => '<li role="option" tabindex="-1" data-v="' + v + '" aria-selected="' + (i === 0) + '">' + esc(L(uk, en)) + "</li>").join("");
    el(hid).value = opts[0][0]; el(pre + "_val").textContent = L(opts[0][1], opts[0][2]);
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
  const FIELDS = ["g1", "g2", "g3", "iV", "i1", "i2"];
  const DDS = ["shape", "variant", "ishape", "iknown", "lunit", "vunit", "pmode", "decs"];
  const PANELS = { dr: "panelDr", iv: "panelIv" };
  function syncShape() {
    const s = shape(), has = !!VARS[s];
    if (has && !el("variant").dataset.sh) { /* первинна ініціалізація */ }
    if (el("variant").dataset.sh !== s) { if (has) setOptions("variant", VARS[s]); el("variant").dataset.sh = s; }
    el("variantFld").hidden = !has;
    const sp = specNow();
    FLD.forEach((id, i) => {
      const f = sp[i], row = el(id + "Row");
      row.hidden = !f;
      if (f) { el(id + "Label").textContent = L(f.uk, f.en); el(id).placeholder = L("напр.: ", "e.g.: ") + f.ph; }
    });
    el("gRows").className = sp.length === 1 ? "vol__rows2" : sp.length === 2 ? "vol__rows2" : "vol__rows3";
  }
  function syncIv() {
    const s = ishape(), has = !!IKNOWN[s];
    if (el("iknown").dataset.sh !== s) { if (has) setOptions("iknown", IKNOWN[s]); el("iknown").dataset.sh = s; }
    el("iknownFld").hidden = !has;
    const sp = ispec();
    IFLD.forEach((id, i) => {
      const f = sp[i], row = el(id + "Row");
      row.hidden = !f;
      if (f) { el(id + "Label").textContent = L(f.uk, f.en); el(id).placeholder = L("напр.: ", "e.g.: ") + f.ph; }
    });
    el("iRows").className = sp.length === 3 ? "vol__rows3" : "vol__rows2";
  }
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".vol__tab").forEach((b) => { const on = b.dataset.m === m; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    MODES.forEach((k) => { el(PANELS[k]).hidden = k !== m; });
    maybeCalc();
  }
  const DEFAULTS = { shape: "cube", ishape: "cube", lunit: "none", vunit: "auto", pmode: "ex", decs: "4" };
  function syncAll() { syncShape(); syncIv(); }
  function resetAll() {
    FIELDS.forEach((id) => (el(id).value = ""));
    ["shape", "ishape", "lunit", "vunit", "pmode", "decs"].forEach((k) => setDd(k, DEFAULTS[k]));
    el("variant").dataset.sh = ""; el("iknown").dataset.sh = "";
    syncAll(); maybeCalc();
  }
  const put = (o) => Object.keys(o).forEach((k) => { el(k).value = o[k]; });
  const EXAMPLES = {
    dr: () => { setDd("shape", "sphere"); syncShape(); put({ g1: "4" }); },
    iv: () => { setDd("ishape", "cube"); syncIv(); put({ iV: "125" }); }
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
    // порядок важливий: спершу фігури, потім їх підваріанти
    ["shape", "ishape"].forEach((k) => { if (qs.has(DDP[k])) setDd(k, qs.get(DDP[k])); });
    syncAll();
    ["variant", "iknown"].forEach((k) => { if (qs.has(DDP[k])) setDd(k, qs.get(DDP[k])); });
    ["lunit", "vunit", "pmode", "decs"].forEach((k) => { if (qs.has(DDP[k])) setDd(k, qs.get(DDP[k])); });
    FIELDS.forEach((id) => { if (qs.has(id)) el(id).value = qs.get(id).slice(0, 60); });
    return true;
  }
  async function copyResult() {
    if (!last) { toast(T.calcFirst); return; }
    try { await navigator.clipboard.writeText(textOf(last)); toast(T.copied); } catch { toast(T.copyFailed); }
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".vol__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    DDS.forEach((k) => initDd(DDP[k], (v) => {
      setDd(k, v);
      if (k === "shape") { el("variant").dataset.sh = ""; syncShape(); }
      if (k === "ishape") { el("iknown").dataset.sh = ""; syncIv(); }
      if (k === "variant") syncShape();
      if (k === "iknown") syncIv();
      maybeCalc();
    }));
    FIELDS.forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); calc(true); } }); });
    el("calcBtn").addEventListener("click", () => { const m = calc(true); if (!m.ok && m.msg) toast(m.msg); });
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => { resetAll(); toast(T.reset); });
    el("shareBtn").addEventListener("click", share);
    el("copyBtn").addEventListener("click", copyResult);
    // початкові списки підваріантів (перша фігура без підваріантів)
    el("variant").dataset.sh = ""; el("iknown").dataset.sh = "";
    const used = applyFromUrl();
    syncAll();
    setMode(mode);
    if (used) calc();
  });
})();
