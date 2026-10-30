/* linear.js — калькулятор лінійного рівняння: чотири режими (рівняння, за коефіцієнтами, нерівність, пропорція), розв'язання по кроках, графік двох прямих і числова пряма (UK/EN)
   Рівняння вводиться як на папері: дужки, дроби (1/2), десяткові (0,5), множення 2x або 2*x, одна змінна-літера. Усе рахується точно на раціональних числах BigInt.
   Розбір: токени → дерево (+ − * / ^, неявне множення) → многочлени з раціональними коефіцієнтами; різниця лівої й правої частини має мати степінь ≤ 1 (x² може скоротитись).
   Рівняння: A·x = B, де A = a₁ − a₂, B = b₂ − b₁; x = B/A. A = 0: тотожність (B = 0) або немає розв'язків. Нерівність: те саме, але при діленні на від'ємне A знак змінюється.
   Пропорція A : B = C : D: основна властивість A·D = B·C, невідомий член знаходиться діленням. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const SEP = IS_EN ? "." : ",";
  const MODES = ["eq", "coef", "ineq", "prop"];
  const MAXD = 30;
  const MAXLEN = 160;
  let mode = "eq";

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
  const isZ = (x) => x.n === Z;
  const R = (n) => ({ n: BigInt(n), d: O });
  const ZERO = R(0), ONE = R(1);
  const fs = (x) => (x.d === O ? String(x.n) : x.n + "/" + x.d);
  const par = (x) => (x.n < Z || x.d !== O ? "(" + fs(x) + ")" : fs(x));
  const toNum = (r) => Number(r.n) / Number(r.d);
  const MN = "−";
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const step = (t, lines, note) => ({ t, l: lines, note });
  function decTxt(x, places = 10) {
    const pw = 10n ** BigInt(places), a = babs(x.n) * pw;
    let v = a / x.d;
    const rem = a % x.d;
    const exact = rem === Z;
    if (!exact && rem * 2n >= x.d) v += 1n;
    const s = v.toString().padStart(places + 1, "0");
    const ip = s.slice(0, s.length - places), fr = s.slice(s.length - places).replace(/0+$/, "");
    const mn = x.n < Z && v !== Z ? "-" : "";
    return { t: mn + ip + (fr ? SEP + fr : ""), exact };
  }
  const dsub = (x) => (x.d === O ? "" : (decTxt(x).exact ? "= " : "≈ ") + decTxt(x).t);

  // ===== число або дріб у полях (режими «за коефіцієнтами» і «пропорція») =====
  const NUM = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/;
  function parseDec(s) {
    if (!NUM.test(s)) return null;
    if (s.replace(/[+\-.,]/g, "").length > MAXD) return "long";
    const ng = s[0] === "-", t = s.replace(/^[+-]/, "").replace(",", "."), [ip, fp = ""] = t.split(".");
    const n = BigInt((ip || "0") + fp), d = 10n ** BigInt(fp.length);
    return q(ng ? -n : n, d);
  }
  const badNum = (s) => L("«" + s.slice(0, 14) + "» не підходить: потрібне число або дріб a/b.", "“" + s.slice(0, 14) + "” is not valid: use a number or a fraction a/b.");
  function parseRat(raw) {
    const s = String(raw || "").trim().replace(/[−–—]/g, "-");
    if (!s) return { empty: true };
    const parts = s.split("/");
    if (parts.length > 2) return { err: badNum(s) };
    const p = parts.map((x) => parseDec(x.trim()));
    if (p.some((x) => x === null)) return { err: badNum(s) };
    if (p.some((x) => x === "long")) return { err: L("Не більше " + MAXD + " цифр у числі.", "At most " + MAXD + " digits in a number.") };
    if (p.length === 2) { if (isZ(p[1])) return { err: L("Знаменник не може дорівнювати нулю.", "The denominator cannot be zero.") }; return { v: div(p[0], p[1]) }; }
    return { v: p[0] };
  }
  const val = (id, label) => { const r = parseRat(el(id).value); if (r.err) return { err: label + ": " + r.err }; if (r.empty) return { miss: label }; return { v: r.v }; };

  // ===== розбір виразу =====
  class PErr extends Error { constructor(msg, soft, link) { super(msg); this.soft = !!soft; this.link = link || null; } }
  const hard = (u, e, link) => { throw new PErr(L(u, e), false, link); };
  const soft = (u, e) => { throw new PErr(L(u, e), true); };

  function tokenize(raw) {
    const s = String(raw)
      .replace(/[−–—‒﹣－]/g, "-").replace(/[×·∙⋅]/g, "*").replace(/÷/g, "/").replace(/:/g, "/")
      .replace(/²/g, "^2").replace(/³/g, "^3").replace(/[[{]/g, "(").replace(/[\]}]/g, ")")
      .replace(/[хХ]/g, "x");
    const toks = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      const m = /^(\d+([.,]\d+)?|[.,]\d+)/.exec(s.slice(i));
      if (m) {
        if (m[0].replace(/[.,]/g, "").length > MAXD) hard("Не більше " + MAXD + " цифр у числі.", "At most " + MAXD + " digits in a number.");
        toks.push({ t: "num", s: m[0], v: parseDec(m[0]) });
        i += m[0].length;
        continue;
      }
      if (/[a-z]/i.test(ch)) { toks.push({ t: "var", s: ch.toLowerCase() }); i++; continue; }
      if (/[а-яіїєґ]/i.test(ch)) hard("Змінна — латинська літера (наприклад, x). Символ «" + ch + "» не підходить.", "The variable must be a Latin letter (for example x). “" + ch + "” is not allowed.");
      if ("+-*/^".includes(ch)) { toks.push({ t: "op", s: ch }); i++; continue; }
      if (ch === "(" || ch === ")") { toks.push({ t: ch, s: ch }); i++; continue; }
      const two = s.slice(i, i + 2);
      if (two === "<=" || two === "=<") { toks.push({ t: "rel", s: "≤" }); i += 2; continue; }
      if (two === ">=" || two === "=>") { toks.push({ t: "rel", s: "≥" }); i += 2; continue; }
      if (two === "==") { toks.push({ t: "rel", s: "=" }); i += 2; continue; }
      if (ch === "≤" || ch === "≥" || ch === "<" || ch === ">" || ch === "=") { toks.push({ t: "rel", s: ch }); i++; continue; }
      if (ch === "≠") hard("Знак ≠ не підтримується.", "The ≠ sign is not supported.");
      hard("Невідомий символ «" + ch + "».", "Unknown character “" + ch + "”.");
    }
    return toks;
  }

  function parseSide(toks) {
    let p = 0;
    const peek = () => toks[p];
    function expr() {
      let a = term();
      while (peek() && peek().t === "op" && (peek().s === "+" || peek().s === "-")) { const op = toks[p++].s; a = { k: "bin", op, a, b: term() }; }
      return a;
    }
    function term() {
      let a = factor();
      for (;;) {
        const t = peek();
        if (!t) break;
        if (t.t === "op" && (t.s === "*" || t.s === "/")) { p++; a = { k: "bin", op: t.s, a, b: factor() }; }
        else if (t.t === "var" || t.t === "(") a = { k: "bin", op: "*", a, b: factor() };
        else if (t.t === "num") hard("Пропущено знак дії перед числом «" + t.s + "».", "A sign is missing before the number “" + t.s + "”.");
        else break;
      }
      return a;
    }
    function factor() {
      const t = peek();
      if (!t) soft("Вираз обірвано — допишіть його.", "The expression is unfinished.");
      if (t.t === "op" && (t.s === "+" || t.s === "-")) { p++; const a = factor(); return t.s === "-" ? { k: "neg", a } : a; }
      return power();
    }
    function power() {
      const base = atom();
      if (peek() && peek().t === "op" && peek().s === "^") {
        p++;
        const e = peek();
        if (!e) soft("Вираз обірвано — допишіть степінь.", "The expression is unfinished.");
        if (e.t !== "num" || e.v.d !== O || e.v.n > 8n) hard("Степінь має бути цілим числом від 0 до 8.", "The exponent must be a whole number from 0 to 8.");
        p++;
        return { k: "pow", a: base, n: Number(e.v.n) };
      }
      return base;
    }
    function atom() {
      const t = toks[p++];
      if (!t) soft("Вираз обірвано — допишіть його.", "The expression is unfinished.");
      if (t.t === "num") return { k: "num", v: t.v };
      if (t.t === "var") return { k: "var" };
      if (t.t === "(") {
        const a = expr();
        if (!peek() || peek().t !== ")") soft("Не вистачає закритої дужки.", "A closing bracket is missing.");
        p++;
        return a;
      }
      if (t.t === ")") hard("Зайва закрита дужка.", "An extra closing bracket.");
      hard("Несподіваний символ «" + t.s + "».", "Unexpected “" + t.s + "”.");
    }
    const a = expr();
    if (p < toks.length) { const t = toks[p]; hard(t.t === ")" ? "Зайва закрита дужка." : "Несподіваний символ «" + t.s + "».", t.t === ")" ? "An extra closing bracket." : "Unexpected “" + t.s + "”."); }
    return a;
  }

  // ===== многочлени з раціональними коефіцієнтами =====
  const trim = (p) => { while (p.length && isZ(p[p.length - 1])) p.pop(); return p; };
  const pAdd = (a, b) => { const r = []; for (let i = 0; i < Math.max(a.length, b.length); i++) r.push(add(a[i] || ZERO, b[i] || ZERO)); return trim(r); };
  const pSub = (a, b) => { const r = []; for (let i = 0; i < Math.max(a.length, b.length); i++) r.push(sub(a[i] || ZERO, b[i] || ZERO)); return trim(r); };
  function pMul(a, b) {
    if (!a.length || !b.length) return [];
    if (a.length + b.length - 1 > 9) hard("Надто високий степінь змінної — це не лінійне рівняння.", "The power of the variable is too high — this is not a linear equation.");
    const r = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
    a.forEach((x, i) => b.forEach((y, j) => { r[i + j] = add(r[i + j], mul(x, y)); }));
    return trim(r);
  }
  function toPoly(n) {
    if (n.k === "num") return trim([n.v]);
    if (n.k === "var") return [ZERO, ONE];
    if (n.k === "neg") return toPoly(n.a).map(neg);
    if (n.k === "pow") { let r = [ONE]; const b = toPoly(n.a); for (let i = 0; i < n.n; i++) r = pMul(r, b); return r; }
    const a = toPoly(n.a), b = toPoly(n.b);
    if (n.op === "+") return pAdd(a, b);
    if (n.op === "-") return pSub(a, b);
    if (n.op === "*") return pMul(a, b);
    if (!b.length) hard("Ділення на нуль.", "Division by zero.");
    if (b.length > 1) hard("Ділення на вираз зі змінною — це не лінійне рівняння.", "Dividing by an expression with the variable — this is not a linear equation.");
    return trim(a.map((x) => div(x, b[0])));
  }
  function evalAst(n, x) {
    if (n.k === "num") return n.v;
    if (n.k === "var") return x;
    if (n.k === "neg") return neg(evalAst(n.a, x));
    if (n.k === "pow") { let r = ONE; const b = evalAst(n.a, x); for (let i = 0; i < n.n; i++) r = mul(r, b); return r; }
    const a = evalAst(n.a, x), b = evalAst(n.b, x);
    if (n.op === "+") return add(a, b);
    if (n.op === "-") return sub(a, b);
    if (n.op === "*") return mul(a, b);
    if (isZ(b)) hard("Ділення на нуль.", "Division by zero.");
    return div(a, b);
  }
  const evalPoly = (p, x) => p.reduceRight((acc, c) => add(mul(acc, x), c), ZERO);
  const SUP = ["", "", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸"];
  function termsTxt(items, xs) {
    items = items.filter((it) => !isZ(it.c));
    if (!items.length) return "0";
    return items.map((it, i) => {
      const ng = it.c.n < Z, abs = { n: babs(it.c.n), d: it.c.d };
      let body;
      if (it.s) {
        if (xs) body = abs.n === abs.d ? par(xs) : (abs.d === O ? String(abs.n) : "(" + fs(abs) + ")") + "·" + par(xs);
        else body = (abs.n === abs.d ? "" : abs.d === O ? String(abs.n) : "(" + fs(abs) + ")") + it.s;
      } else body = fs(abs);
      return (i === 0 ? (ng ? MN : "") : ng ? " " + MN + " " : " + ") + body;
    }).join("");
  }
  const polyItems = (p, vn) => p.map((c, k) => ({ c, s: k === 0 ? "" : vn + SUP[k] })).reverse();
  const polyTxt = (p, vn, xs) => termsTxt(polyItems(p, vn).map((it) => (xs && it.s ? { c: it.c, s: vn } : it)), xs);

  // ===== запис виразів із токенів =====
  const isVal = (t) => t && (t.t === "num" || t.t === "var" || t.t === ")");
  function fmtTokens(toks, xs) {
    let out = "", prev = null;
    toks.forEach((t, i) => {
      if (t.t === "num" || t.t === "var" || t.t === "(") {
        if (xs && isVal(prev) && (t.t === "var" || t.t === "(")) out += "·";
        if (t.t === "num") out += t.s.replace(/[.,]/, SEP);
        else if (t.t === "var") out += xs ? par(xs) : t.s;
        else out += "(";
      } else if (t.t === ")") out += ")";
      else if (t.t === "op") {
        if (t.s === "+" || t.s === "-") out += isVal(prev) ? " " + (t.s === "-" ? MN : "+") + " " : t.s === "-" ? MN : "";
        else if (t.s === "*") out += " · ";
        else if (t.s === "/") out += "/";
        else if (t.s === "^") out += "^";
      } else if (t.t === "rel") out += " " + t.s + " ";
      prev = t;
    });
    return out.replace(/\^2(?![\d])/g, "²").replace(/\^3(?![\d])/g, "³");
  }

  // ===== розбір рівняння / нерівності =====
  function parseRelation(src, wantRel) {
    const text = String(src || "").trim();
    if (!text) return { empty: true };
    if (text.length > MAXLEN) hard("Надто довгий запис (до " + MAXLEN + " символів).", "The entry is too long (up to " + MAXLEN + " characters).");
    const toks = tokenize(text);
    const rels = toks.filter((t) => t.t === "rel");
    if (!rels.length) soft(wantRel ? "Додайте знак нерівності (<, >, ≤, ≥)." : "Додайте знак «=».", wantRel ? "Add an inequality sign (<, >, ≤, ≥)." : "Add the “=” sign.");
    if (rels.length > 1) hard(rels[0].s === rels[1].s ? "У записі має бути лише один знак «" + rels[0].s + "»." : "Лише один знак у записі: «" + rels[0].s + "» і «" + rels[1].s + "» разом не можна.", rels[0].s === rels[1].s ? "Only one “" + rels[0].s + "” sign is allowed." : "Only one sign is allowed: “" + rels[0].s + "” and “" + rels[1].s + "” cannot be used together.");
    if (wantRel && rels[0].s === "=") hard("Для рівняння оберіть режим «Рівняння». Тут потрібен знак <, >, ≤ або ≥.", "For an equation use the “Equation” mode. Here use <, >, ≤ or ≥.");
    if (!wantRel && rels[0].s !== "=") hard("Для нерівності оберіть режим «Нерівність».", "For an inequality use the “Inequality” mode.");
    const ri = toks.indexOf(rels[0]);
    const lt = toks.slice(0, ri), rt = toks.slice(ri + 1);
    if (!lt.length || !rt.length) soft("Ліва і права частина мають бути заповнені.", "Both sides must be filled in.");
    const vars = Array.from(new Set(toks.filter((t) => t.t === "var").map((t) => t.s)));
    if (vars.length > 1) hard("Допускається одна змінна, а знайдено: " + vars.join(", ") + ".", "Only one variable is allowed, found: " + vars.join(", ") + ".");
    const astL = parseSide(lt), astR = parseSide(rt);
    return { toks, lt, rt, astL, astR, pL: toPoly(astL), pR: toPoly(astR), vn: vars[0] || "x", rel: rels[0].s };
  }

  // ===== розв'язання по кроках (рівняння й нерівність) =====
  const REL_FLIP = { "<": ">", ">": "<", "≤": "≥", "≥": "≤" };
  const relHolds = (rel, c) => (rel === "=" ? c === 0 : rel === "<" ? c < 0 : rel === ">" ? c > 0 : rel === "≤" ? c <= 0 : c >= 0);
  const interval = (rel, v) => (rel === "<" ? "(-∞; " + fs(v) + ")" : rel === "≤" ? "(-∞; " + fs(v) + "]" : rel === ">" ? "(" + fs(v) + "; +∞)" : "[" + fs(v) + "; +∞)");

  // ctx: { pL, pR, vn, rel ("=" або знак), origText, sub(xs) → { l, r, vl, vr } (підстановка для перевірки) }
  function solveSteps(ctx) {
    const { pL, pR, vn, rel } = ctx, ineq = rel !== "=";
    const steps = [];
    const sl = polyTxt(pL, vn), sr = polyTxt(pR, vn);
    const higher = pL.length > 2 || pR.length > 2;
    const net = pSub(pL, pR);
    if (net.length > 2) {
      const e = new PErr(L("Це не лінійне " + (ineq ? "нерівність" : "рівняння") + ": після спрощення є " + vn + "² (степінь " + (net.length - 1) + "). Використайте калькулятор квадратного рівняння.", "This is not a linear " + (ineq ? "inequality" : "equation") + ": after simplifying it contains " + vn + "² (degree " + (net.length - 1) + "). Use the quadratic equation calculator."), false, "quad");
      throw e;
    }
    let a1 = pL[1] || ZERO, b1 = pL[0] || ZERO, a2 = pR[1] || ZERO, b2 = pR[0] || ZERO;
    steps.push(step(ineq ? L("Нерівність", "The inequality") : L("Рівняння", "The equation"), [ctx.origText]));
    const simplified = sl + " " + rel + " " + sr;
    if (simplified.replace(/\s/g, "") !== ctx.origText.replace(/\s/g, "")) steps.push(step(L("Спрощуємо обидві частини", "Simplify both sides"), [L("Ліва частина: ", "Left side: ") + sl, L("Права частина: ", "Right side: ") + sr, simplified], L("Розкриваємо дужки, зводимо подібні доданки.", "Expand the brackets and combine like terms.")));
    // дроби
    let working = { a1, b1, a2, b2 };
    if (!higher) {
      const Nn = [a1, b1, a2, b2].reduce((m, x) => lcm(m, x.d), O);
      if (Nn > 1n) {
        const k = R(Nn);
        a1 = mul(a1, k); b1 = mul(b1, k); a2 = mul(a2, k); b2 = mul(b2, k);
        steps.push(step(L("Позбуваємося дробів", "Clear the fractions"), [L("НСК знаменників: ", "LCM of the denominators: ") + Nn, L("Множимо обидві частини на ", "Multiply both sides by ") + Nn + ":", termsTxt([{ c: a1, s: vn }, { c: b1, s: "" }]) + " " + rel + " " + termsTxt([{ c: a2, s: vn }, { c: b2, s: "" }])], L("Число додатне, тому " + (ineq ? "знак нерівності не змінюється." : "рівність зберігається."), "The number is positive, so " + (ineq ? "the inequality sign does not change." : "the equality is preserved."))));
        working = { a1, b1, a2, b2 };
      }
    }
    const A = sub(a1, a2), B = sub(b2, b1);
    // перенесення
    if (higher) {
      steps.push(step(L("Переносимо все в ліву частину", "Move everything to the left"), ["(" + sl + ") " + MN + " (" + sr + ") " + rel + " 0", polyTxt(net, vn) + " " + rel + " 0", termsTxt([{ c: A, s: vn }]) + " " + rel + " " + termsTxt([{ c: B, s: "" }])], L("Старші степені скорочуються, залишається лінійне " + (ineq ? "нерівність." : "рівняння."), "The higher powers cancel and a linear " + (ineq ? "inequality" : "equation") + " remains.")));
    } else if (!isZ(a2) || !isZ(b1)) {
      steps.push(step(L("Переносимо доданки", "Move the terms"), [
        termsTxt([{ c: a1, s: vn }, { c: neg(a2), s: vn }]) + " " + rel + " " + termsTxt([{ c: b2, s: "" }, { c: neg(b1), s: "" }]),
        termsTxt([{ c: A, s: vn }]) + " " + rel + " " + termsTxt([{ c: B, s: "" }])
      ], L("Доданки зі змінною — ліворуч, числа — праворуч; при перенесенні через знак порівняння знак доданка змінюється на протилежний.", "Terms with the variable go to the left, numbers to the right; a term changes its sign when it crosses the sign.")));
    }
    const res = { vn, A, B, rel, ineq, steps, net, higher, working };
    // особливі випадки
    if (isZ(A)) {
      // 0·x rel B ⇔ 0 rel B
      const holds = ineq ? relHolds(rel, sg(sub(ZERO, B))) : isZ(B);
      res.kind = holds ? "all" : "none";
      steps.push(step(L("Висновок", "Conclusion"), [("0·" + vn + " " + rel + " " + fs(B)).replace(/(?:^| )-/g, (m) => m.replace("-", MN)), holds ? (L("Це правильно для будь-якого " + vn + ".", "This is true for every " + vn + ".")) : (L("Це неправильно ні для якого " + vn + ".", "This is false for every " + vn + "."))], holds ? L("Розв'язків безліч: " + vn + " — будь-яке число.", "There are infinitely many solutions: " + vn + " is any number.") : L("Розв'язків немає.", "There are no solutions.")));
      return res;
    }
    let outRel = rel;
    const sol = div(B, A);
    if (ineq && sg(A) < 0) outRel = REL_FLIP[rel];
    res.sol = sol; res.outRel = outRel;
    res.kind = "one";
    if (!(A.n === 1n && A.d === O)) {
      const raw = fs(B) + "/" + par(A), dlines = [vn + " " + outRel + " " + raw];
      if (raw !== fs(sol)) dlines.push(vn + " " + outRel + " " + fs(sol));
      if (sol.d !== O) { const dc = decTxt(sol); if (dc.exact || !ineq) dlines.push(vn + " " + (ineq ? outRel : dc.exact ? "=" : "≈") + " " + dc.t); }
      const extra = ineq && sg(A) < 0 ? L("Ділимо обидві частини на від'ємне число " + fs(A) + ": знак нерівності змінюється на протилежний (" + rel + " → " + outRel + ").", "We divide both sides by the negative number " + fs(A) + ": the inequality sign flips (" + rel + " → " + outRel + ").") : (ineq ? L("Ділимо на додатне число — знак нерівності не змінюється.", "We divide by a positive number — the sign does not change.") : L("Ділимо обидві частини на коефіцієнт при " + vn + ".", "Divide both sides by the coefficient of " + vn + "."));
      steps.push(step(L("Ділимо на коефіцієнт при ", "Divide by the coefficient of ") + vn, dlines, extra));
    }
    return res;
  }

  // ===== режим «Рівняння» =====
  function modeEq() {
    const txt = el("eq").value;
    let P;
    try { P = parseRelation(txt, false); } catch (e) { if (e instanceof PErr) return errRes(e); throw e; }
    if (P.empty) return { ok: false, incomplete: true };
    const origText = fmtTokens(P.toks);
    const ctx = { pL: P.pL, pR: P.pR, vn: P.vn, rel: "=", origText };
    ctx.sub = (xs) => {
      const l = fmtTokens(P.lt, xs), r = fmtTokens(P.rt, xs);
      return { l, r, vl: evalAst(P.astL, xs), vr: evalAst(P.astR, xs) };
    };
    return finishLinear(ctx, origText, P.pL, P.pR);
  }
  const errRes = (e) => ({ ok: false, incomplete: e.soft, msg: e.message, link: e.link });

  // ===== режим «За коефіцієнтами» =====
  function modeCoef() {
    const vs = [["ca", "a"], ["cb", "b"], ["cc", "c"], ["cd", "d"]].map(([id, nm]) => val(id, nm));
    for (const r of vs) if (r.err) return { ok: false, msg: r.err };
    const miss = vs.filter((r) => r.miss).map((r) => r.miss);
    if (miss.length) return { ok: false, incomplete: true, msg: L("Вкажіть коефіцієнти: " + miss.join(", ") + ".", "Enter the coefficients: " + miss.join(", ") + ".") };
    const [a, b, c, d] = vs.map((r) => r.v);
    const pL = trim([b, a]), pR = trim([d, c]);
    const origText = polyTxt(pL, "x") + " = " + polyTxt(pR, "x");
    const ctx = { pL, pR, vn: "x", rel: "=", origText };
    ctx.sub = (xs) => ({ l: polyTxt(pL, "x", xs), r: polyTxt(pR, "x", xs), vl: evalPoly(pL, xs), vr: evalPoly(pR, xs) });
    return finishLinear(ctx, origText, pL, pR);
  }

  function finishLinear(ctx, origText, pL, pR) {
    let r;
    try { r = solveSteps(ctx); } catch (e) { if (e instanceof PErr) return errRes(e); throw e; }
    const vn = ctx.vn, steps = r.steps;
    const lineOk = pL.length <= 2 && pR.length <= 2;
    const g = lineOk ? { a1: pL[1] || ZERO, b1: pL[0] || ZERO, a2: pR[1] || ZERO, b2: pR[0] || ZERO, x: r.kind === "one" ? r.sol : null, kind: r.kind, vn } : null;
    const simpl = termsTxt([{ c: r.A, s: vn }]) + " = " + termsTxt([{ c: r.B, s: "" }]);
    if (r.kind === "all" || r.kind === "none") {
      const all = r.kind === "all";
      return { ok: true, kind: "eq", expr: origText, head: '<div class="lin__forms"><span class="lin__dec">' + esc(all ? L("Безліч розв'язків: " + vn + " — будь-яке число", "Infinitely many solutions: " + vn + " is any number") : L("Розв'язків немає", "No solutions")) + "</span></div>", tiles: [{ k: L("Тип", "Type"), v: all ? L("Тотожність", "Identity") : L("Суперечність", "Contradiction") }, { k: L("Після спрощення", "Simplified"), v: ("0 = " + fs(r.B)).replace("-", MN) }], steps, graph: g, resText: all ? L("безліч розв'язків", "infinitely many solutions") : L("розв'язків немає", "no solutions") };
    }
    // перевірка
    const x = r.sol, chk = ctx.sub(x);
    steps.push(step(L("Перевірка", "Check"), [L("Підставимо ", "Substitute ") + vn + " = " + fs(x) + ":", L("Ліва частина: ", "Left side: ") + chk.l + " = " + fs(chk.vl), L("Права частина: ", "Right side: ") + chk.r + " = " + fs(chk.vr), fs(chk.vl) + " = " + fs(chk.vr) + (isZ(sub(chk.vl, chk.vr)) ? " ✓" : " ✗")]));
    const dec = decTxt(x);
    const head = '<div class="lin__forms"><span class="lin__rt"><small>' + esc(vn) + "</small>" + vfr(x) + (x.d !== O ? '<span class="lin__eq">' + (dec.exact ? "=" : "≈") + '</span><span class="lin__dec">' + esc(dec.t) + "</span>" : "") + "</span></div>";
    return { ok: true, kind: "eq", expr: origText, head, tiles: [{ k: L("Тип", "Type"), v: L("Один розв'язок", "One solution") }, { k: L("Спрощено", "Simplified"), v: simpl }, { k: L("Перевірка", "Check"), v: fs(chk.vl) + " = " + fs(chk.vr) }], steps, graph: g, resText: vn + " = " + fs(x) + (x.d !== O ? " (" + (dec.exact ? "" : "≈ ") + dec.t + ")" : "") };
  }
  const vf = (num, den) => (den === undefined ? '<span class="lin__int">' + esc(num) + "</span>" : '<span class="lin__f"><span class="lin__fn">' + esc(num) + '</span><span class="lin__fd">' + esc(den) + "</span></span>");
  const vfr = (x) => (x.d === O ? vf(String(x.n)) : vf(String(x.n), String(x.d)));

  // ===== режим «Нерівність» =====
  function modeIneq() {
    let P;
    try { P = parseRelation(el("ie").value, true); } catch (e) { if (e instanceof PErr) return errRes(e); throw e; }
    if (P.empty) return { ok: false, incomplete: true };
    const origText = fmtTokens(P.toks);
    const ctx = { pL: P.pL, pR: P.pR, vn: P.vn, rel: P.rel, origText };
    ctx.sub = (xs) => ({ l: fmtTokens(P.lt, xs), r: fmtTokens(P.rt, xs), vl: evalAst(P.astL, xs), vr: evalAst(P.astR, xs) });
    let r;
    try { r = solveSteps(ctx); } catch (e) { if (e instanceof PErr) return errRes(e); throw e; }
    const vn = P.vn, steps = r.steps;
    if (r.kind === "all" || r.kind === "none") {
      const all = r.kind === "all";
      return { ok: true, kind: "ineq", expr: origText, head: '<div class="lin__forms"><span class="lin__dec">' + esc(all ? L(vn + " — будь-яке число", vn + " is any number") : L("Розв'язків немає", "No solutions")) + "</span></div>", tiles: [{ k: L("Тип", "Type"), v: all ? L("Завжди вірно", "Always true") : L("Ніколи не вірно", "Never true") }], steps, numline: { kind: r.kind }, resText: all ? L("будь-яке число", "any number") : L("розв'язків немає", "no solutions") };
    }
    const v = r.sol, out = r.outRel, closed = out === "≤" || out === "≥", left = out === "<" || out === "≤";
    // перевірка: точка всередині й (для нестрогих) межа
    const tpt = left ? sub(v, ONE) : add(v, ONE);
    const c1 = ctx.sub(tpt), ok1 = relHolds(rel0(P.rel), sg(sub(c1.vl, c1.vr)));
    const lines = [L("Беремо ", "Take ") + vn + " = " + fs(tpt) + L(" з відповіді:", " from the answer:"), L("Ліва частина: ", "Left side: ") + c1.l + " = " + fs(c1.vl), L("Права частина: ", "Right side: ") + c1.r + " = " + fs(c1.vr), fs(c1.vl) + " " + P.rel + " " + fs(c1.vr) + (ok1 ? L(" — вірно ✓", " — true ✓") : " ✗")];
    steps.push(step(L("Перевірка", "Check"), lines));
    if (closed) {
      const c2 = ctx.sub(v);
      steps.push(step(L("Межа входить у відповідь", "The boundary is included"), [vn + " = " + fs(v) + ": " + fs(c2.vl) + " " + P.rel + " " + fs(c2.vr) + (relHolds(rel0(P.rel), sg(sub(c2.vl, c2.vr))) ? L(" — вірно ✓", " — true ✓") : " ✗")], L("Знак нестрогий, тому число на межі теж є розв'язком.", "The sign is not strict, so the boundary value is a solution too.")));
    }
    const dec = decTxt(v);
    const ansIneq = vn + " " + out + " " + fs(v), ansInt = interval(out, v);
    const head = '<div class="lin__forms"><span class="lin__dec">' + esc(ansIneq) + '</span><span class="lin__eq">⇔</span><span class="lin__dec">' + esc(ansInt) + "</span></div>" + (v.d !== O && dec.exact ? '<div class="lin__sub2">' + esc(vn + " " + out + " " + dec.t) + "</div>" : "");
    return { ok: true, kind: "ineq", expr: origText, head, tiles: [{ k: L("Знак у відповіді", "Sign in the answer"), v: out + (sg(r.A) < 0 ? L(" (змінився)", " (flipped)") : L(" (той самий)", " (unchanged)")) }, { k: L("Межа", "Boundary"), v: vn + " = " + fs(v), s: dsub(v) }, { k: L("Проміжок", "Interval"), v: ansInt }], steps, numline: { kind: "one", v, left, closed, vn }, resText: ansIneq + "  " + ansInt };
  }
  // знак порівняння L ? R відносно різниці L − R
  const rel0 = (r) => r;

  // ===== режим «Пропорція» =====
  const PROP_IDS = ["pa", "pb", "pc", "pd"], PROP_NM = ["A", "B", "C", "D"];
  function modeProp() {
    const vs = PROP_IDS.map((id, i) => {
      const raw = el(id).value.trim();
      if (!raw || /^[a-zа-я]$/i.test(raw)) return { unknown: true };
      const r = parseRat(raw);
      if (r.err) return { err: PROP_NM[i] + ": " + r.err };
      return { v: r.v };
    });
    for (const r of vs) if (r.err) return { ok: false, msg: r.err };
    const unk = vs.map((r, i) => (r.unknown ? i : -1)).filter((i) => i >= 0);
    if (unk.length === 4) return { ok: false, incomplete: true };
    if (unk.length > 1) return { ok: false, incomplete: true, msg: L("Залиште порожнім лише одне поле — саме його буде знайдено.", "Leave only one field empty — that is the one to be found.") };
    const g = (i) => vs[i].v;
    const show = (i, u) => (u === i ? "x" : fs(g(i)));
    const steps = [];
    const prop = (u) => show(0, u) + " : " + show(1, u) + " = " + show(2, u) + " : " + show(3, u);
    const zeroDen = (i) => !vs[i].unknown && isZ(g(i));
    if (zeroDen(1) || zeroDen(3)) return { ok: false, msg: L("Член пропорції у знаменнику (B або D) не може дорівнювати нулю.", "A term in the denominator (B or D) cannot be zero.") };
    if (!unk.length) {
      const l = mul(g(0), g(3)), r = mul(g(1), g(2));
      const ok = isZ(sub(l, r));
      steps.push(step(L("Пропорція", "The proportion"), [prop(-1)]));
      steps.push(step(L("Основна властивість пропорції", "The basic property"), ["A · D = B · C", fs(g(0)) + " · " + par(g(3)) + " = " + par(g(1)) + " · " + par(g(2)), fs(l) + (ok ? " = " : " ≠ ") + fs(r)], L("Добуток крайніх членів дорівнює добутку середніх.", "The product of the extremes equals the product of the means.")));
      const rl = div(g(0), g(1)), rr = div(g(2), g(3));
      steps.push(step(L("Відношення", "The ratios"), [fs(g(0)) + "/" + par(g(1)) + " = " + fs(rl), fs(g(2)) + "/" + par(g(3)) + " = " + fs(rr)]));
      return { ok: true, kind: "prop", expr: prop(-1), head: '<div class="lin__forms"><span class="lin__dec">' + esc(ok ? L("Пропорція вірна", "The proportion holds") : L("Пропорція не виконується", "The proportion does not hold")) + "</span></div>", tiles: [{ k: "A · D", v: fs(l) }, { k: "B · C", v: fs(r) }, { k: L("Відношення A : B", "Ratio A : B"), v: fs(rl) }], steps, resText: ok ? L("пропорція вірна", "the proportion holds") : L("пропорція не виконується", "the proportion does not hold") };
    }
    const u = unk[0];
    // x знаходимо з A·D = B·C
    // [індекс дільника, індекси співмножників, назва дільника]
    const F = [[3, 1, 2, "D"], [2, 0, 3, "C"], [1, 0, 3, "B"], [0, 1, 2, "A"]][u];
    const num = mul(g(F[1]), g(F[2])), dv = g(F[0]);
    if (isZ(dv)) return { ok: false, msg: L("Ділення на нуль: " + F[3] + " = 0. Перевірте введені числа.", "Division by zero: " + F[3] + " = 0. Check the numbers.") };
    const x = div(num, dv);
    if ((u === 1 || u === 3) && isZ(x)) return { ok: false, msg: L("Розв'язку немає: знаходиться знаменник " + PROP_NM[u] + " = 0, а ділити на нуль не можна.", "No solution: the denominator " + PROP_NM[u] + " would be 0, and dividing by zero is not allowed.") };
    steps.push(step(L("Пропорція", "The proportion"), [prop(u)], L("Шукане число позначено x.", "The unknown is marked x.")));
    const sh = (i) => (i === u ? "x" : par(g(i)));
    const lhsTxt = sh(0) + " · " + sh(3), rhsTxt = sh(1) + " · " + sh(2);
    steps.push(step(L("Основна властивість пропорції", "The basic property"), ["A · D = B · C", lhsTxt + " = " + rhsTxt], L("Добуток крайніх членів (A, D) дорівнює добутку середніх (B, C).", "The product of the extremes (A, D) equals the product of the means (B, C).")));
    const f = "x = " + fs(g(F[1])) + " · " + par(g(F[2])) + " / " + par(g(F[0]));
    const fl = "x = " + fs(num) + " / " + par(dv);
    steps.push(step(L("Знаходимо x", "Find x"), [f, fl + (fl.slice(4) !== fs(x) ? " = " + fs(x) : "") + (x.d !== O ? " " + dsub(x) : "")]));
    const full = vs.map((r, i) => (i === u ? x : r.v));
    const rl = div(full[0], full[1]), rr = div(full[2], full[3]);
    steps.push(step(L("Перевірка", "Check"), [fs(full[0]) + "/" + par(full[1]) + " = " + fs(rl), fs(full[2]) + "/" + par(full[3]) + " = " + fs(rr), fs(rl) + " = " + fs(rr) + (isZ(sub(rl, rr)) ? " ✓" : " ✗")]));
    const dec = decTxt(x);
    const head = '<div class="lin__forms"><span class="lin__rt"><small>x</small>' + vfr(x) + (x.d !== O ? '<span class="lin__eq">' + (dec.exact ? "=" : "≈") + '</span><span class="lin__dec">' + esc(dec.t) + "</span>" : "") + "</span></div>";
    return { ok: true, kind: "prop", expr: prop(u), head, tiles: [{ k: "A · D", v: fs(mul(full[0], full[3])) }, { k: "B · C", v: fs(mul(full[1], full[2])) }, { k: L("Відношення", "The ratio"), v: fs(rl) }], steps, resText: "x = " + fs(x) + (x.d !== O ? " (" + (dec.exact ? "" : "≈ ") + dec.t + ")" : "") };
  }

  // ===== графіки =====
  function niceStep(range, n) {
    const raw = range / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), nm = raw / mag;
    return (nm <= 1 ? 1 : nm <= 2 ? 2 : nm <= 5 ? 5 : 10) * mag;
  }
  const dec2 = (st) => Math.max(0, -Math.floor(Math.log10(st) + 1e-9));
  const tick = (v, st) => (Math.abs(v) < st * 1e-6 ? "0" : v.toFixed(dec2(st))).replace(".", SEP);
  const fmtN = (v) => { const t = Math.abs(v) >= 100000 || (Math.abs(v) < 0.0001 && v !== 0) ? v.toExponential(2) : String(Math.round(v * 10000) / 10000); return t.replace(".", SEP); };
  const HALO = ' paint-order="stroke" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"';

  function lineGraph(g) {
    const l1 = [toNum(g.b1), toNum(g.a1)], l2 = [toNum(g.b2), toNum(g.a2)];
    const f = (l, x) => l[0] + l[1] * x;
    const xs = g.x === null ? null : toNum(g.x);
    let lo = -4, hi = 4;
    if (xs !== null) { lo = Math.min(xs, 0); hi = Math.max(xs, 0); }
    let span = hi - lo; if (span < 1e-9) span = 4;
    const pad = span * 0.6 + 1, xmin = lo - pad, xmax = hi + pad;
    const ys = [0, f(l1, xmin), f(l1, xmax), f(l2, xmin), f(l2, xmax)];
    if (xs !== null) ys.push(f(l1, xs));
    let ylo = Math.min(...ys), yhi = Math.max(...ys);
    if (yhi - ylo < 1e-9) { ylo -= 1; yhi += 1; }
    const yp = (yhi - ylo) * 0.12, ymin = ylo - yp, ymax = yhi + yp;
    const xStep = niceStep(xmax - xmin, 8), yStep = niceStep(ymax - ymin, 6);
    const xt = [], yt = [];
    for (let k = Math.ceil(xmin / xStep); k * xStep <= xmax + 1e-12; k++) xt.push(k * xStep);
    for (let k = Math.ceil(ymin / yStep); k * yStep <= ymax + 1e-12; k++) yt.push(k * yStep);
    const lw = Math.max(...yt.map((v) => tick(v, yStep).length), 2);
    const W = 560, H = 340, mL = Math.max(40, Math.round(lw * 7.4 + 18)), mR = 26, mT = 26, mB = 30, pw = W - mL - mR, ph = H - mT - mB;
    const X = (x) => mL + ((x - xmin) / (xmax - xmin)) * pw, Y = (y) => mT + ph - ((y - ymin) / (ymax - ymin)) * ph;
    const ax = Y(0), ay = X(0);
    let s = '<svg class="lin__svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + L("Графік лівої й правої частини рівняння", "Graph of the left and right sides") + '"><defs><clipPath id="linClip"><rect x="' + mL + '" y="' + mT + '" width="' + pw + '" height="' + ph + '"/></clipPath><marker id="linArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#4b5563"/></marker></defs>';
    s += '<rect x="' + mL + '" y="' + mT + '" width="' + pw + '" height="' + ph + '" fill="#fff" stroke="#dfe3ec"/>';
    xt.forEach((v) => { s += '<line x1="' + X(v).toFixed(1) + '" y1="' + mT + '" x2="' + X(v).toFixed(1) + '" y2="' + (mT + ph) + '" stroke="#eef0f6"/>'; });
    yt.forEach((v) => { s += '<line x1="' + mL + '" y1="' + Y(v).toFixed(1) + '" x2="' + (mL + pw) + '" y2="' + Y(v).toFixed(1) + '" stroke="#eef0f6"/>'; });
    s += '<line x1="' + mL + '" y1="' + ax.toFixed(1) + '" x2="' + (W - mR + 14) + '" y2="' + ax.toFixed(1) + '" stroke="#4b5563" stroke-width="1.4" marker-end="url(#linArr)"/>';
    s += '<line x1="' + ay.toFixed(1) + '" y1="' + (mT + ph) + '" x2="' + ay.toFixed(1) + '" y2="' + (mT - 14) + '" stroke="#4b5563" stroke-width="1.4" marker-end="url(#linArr)"/>';
    s += '<text x="' + (W - 6) + '" y="' + (ax + 4).toFixed(1) + '" font-size="18" font-style="italic" font-weight="700" fill="#1f2f55" text-anchor="end">x</text>';
    s += '<text x="' + (ay + 10).toFixed(1) + '" y="' + (mT - 8) + '" font-size="18" font-style="italic" font-weight="700" fill="#1f2f55">y</text>';
    const seg = (l, col, w, dash) => '<line clip-path="url(#linClip)" x1="' + X(xmin).toFixed(1) + '" y1="' + Y(f(l, xmin)).toFixed(1) + '" x2="' + X(xmax).toFixed(1) + '" y2="' + Y(f(l, xmax)).toFixed(1) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>";
    s += seg(l1, "#4f6fb8", 3);
    s += seg(l2, "#2f9d6a", g.kind === "all" ? 3 : 3, g.kind === "all" ? "2 7" : "");
    const txt = (x, y, t, anchor, col, bold) => {
      const w = t.length * 7.4;
      let xx = x;
      if (anchor === "middle") xx = Math.max(mL + w / 2 + 2, Math.min(W - mR - w / 2 - 2, x)); else if (anchor === "end") xx = Math.max(mL + w + 2, x); else xx = Math.min(W - mR - w - 2, x);
      return '<text x="' + xx.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="14" fill="' + (col || "#1f2937") + '"' + (bold ? ' font-weight="700"' : "") + ' text-anchor="' + anchor + '"' + HALO + ">" + esc(t) + "</text>";
    };
    const px = [], py = [];
    let marks = "";
    if (xs !== null) {
      const yv = f(l1, xs);
      px.push(X(xs)); py.push(Y(yv));
      s += '<line x1="' + X(xs).toFixed(1) + '" y1="' + Y(yv).toFixed(1) + '" x2="' + X(xs).toFixed(1) + '" y2="' + ax.toFixed(1) + '" stroke="#d85a30" stroke-width="1.4" stroke-dasharray="5 4"/>';
      marks += '<circle cx="' + X(xs).toFixed(1) + '" cy="' + Y(yv).toFixed(1) + '" r="5.5" fill="#d85a30" stroke="#fff" stroke-width="1.6"/><circle cx="' + X(xs).toFixed(1) + '" cy="' + ax.toFixed(1) + '" r="4" fill="#283b69" stroke="#fff" stroke-width="1.6"/>';
      const up = yv >= 0;
      marks += txt(X(xs), Y(yv) + (up ? -11 : 19), "(" + fmtN(xs) + "; " + fmtN(yv) + ")", "middle", "#b4411f", true);
      marks += txt(X(xs), ax + (up ? 17 : -9), g.vn + " = " + fmtN(xs), "middle", "#283b69", true);
    }
    const flipX = ax + 15 > mT + ph - 2, flipY = ay - 7 - lw * 7.4 < mL;
    xt.forEach((v) => { const x = X(v); if (Math.abs(v) < xStep * 1e-6 || px.some((p) => Math.abs(p - x) < 46)) return; s += '<line x1="' + x.toFixed(1) + '" y1="' + (ax - 3).toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + (ax + 3).toFixed(1) + '" stroke="#4b5563"/>' + txt(x, flipX ? ax - 8 : ax + 16, tick(v, xStep), "middle", "#4b5563"); });
    yt.forEach((v) => { const y = Y(v); if (Math.abs(v) < yStep * 1e-6 || py.some((p) => Math.abs(p - y) < 14)) return; s += '<line x1="' + (ay - 3).toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + (ay + 3).toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#4b5563"/>' + (flipY ? txt(ay + 8, y + 4, tick(v, yStep), "start", "#4b5563") : txt(ay - 8, y + 4, tick(v, yStep), "end", "#4b5563")); });
    s += txt(flipY ? ay + 8 : ay - 7, flipX ? ax - 7 : ax + 16, "0", flipY ? "start" : "end", "#4b5563");
    s += marks;
    const li = (cls, t) => '<span class="lin__legI"><i class="' + cls + '"></i>' + esc(t) + "</span>";
    const eqL = "y = " + polyTxt(trim([g.b1, g.a1]), "x"), eqR = "y = " + polyTxt(trim([g.b2, g.a2]), "x");
    let leg = li("lin__legL lin__legL--l", L("Ліва частина: ", "Left side: ") + eqL) + li("lin__legL lin__legL--r", L("Права частина: ", "Right side: ") + eqR);
    if (xs !== null) leg += li("lin__legD", L("Розв'язок — точка перетину прямих", "The solution is where the lines meet"));
    else if (g.kind === "all") leg += li("lin__legT", L("Прямі збігаються: розв'язків безліч", "The lines coincide: infinitely many solutions"));
    else leg += li("lin__legT", L("Прямі паралельні: розв'язків немає", "The lines are parallel: no solutions"));
    return s + '</svg><div class="lin__leg">' + leg + "</div>";
  }

  function numLine(nl) {
    const W = 560, H = 120, mL = 24, mR = 24, ay = 62, pw = W - mL - mR;
    let lo = 0, hi = 0, v = 0;
    if (nl.kind === "one") { v = toNum(nl.v); lo = Math.min(0, v); hi = Math.max(0, v); }
    let span = hi - lo; if (span < 1e-9) span = 4;
    const pad = span * 0.5 + 1.5, xmin = lo - pad, xmax = hi + pad;
    const X = (x) => mL + ((x - xmin) / (xmax - xmin)) * pw;
    const st = niceStep(xmax - xmin, 9);
    let s = '<svg class="lin__svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + L("Числова пряма з розв'язком нерівності", "Number line with the solution of the inequality") + '"><defs><marker id="linArr2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#4b5563"/></marker></defs>';
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#fff"/>';
    const sol = "#4f6fb8";
    if (nl.kind === "all") s += '<line x1="' + mL + '" y1="' + ay + '" x2="' + (W - mR) + '" y2="' + ay + '" stroke="' + sol + '" stroke-width="7" stroke-linecap="round" opacity=".55"/>';
    else if (nl.kind === "one") {
      const a = nl.left ? mL : X(v), b = nl.left ? X(v) : W - mR;
      s += '<line x1="' + a.toFixed(1) + '" y1="' + ay + '" x2="' + b.toFixed(1) + '" y2="' + ay + '" stroke="' + sol + '" stroke-width="7" stroke-linecap="round" opacity=".55"/>';
    }
    s += '<line x1="' + mL + '" y1="' + ay + '" x2="' + (W - mR + 8) + '" y2="' + ay + '" stroke="#4b5563" stroke-width="1.6" marker-end="url(#linArr2)"/>';
    const out = [];
    for (let k = Math.ceil(xmin / st); k * st <= xmax + 1e-12; k++) out.push(k * st);
    out.forEach((t) => {
      const x = X(t);
      if (nl.kind === "one" && Math.abs(x - X(v)) < 34) return;
      s += '<line x1="' + x.toFixed(1) + '" y1="' + (ay - 5) + '" x2="' + x.toFixed(1) + '" y2="' + (ay + 5) + '" stroke="#4b5563"/><text x="' + x.toFixed(1) + '" y="' + (ay + 24) + '" font-size="14" fill="#4b5563" text-anchor="middle">' + esc(tick(t, st)) + "</text>";
    });
    if (nl.kind === "one") {
      const x = X(v);
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + ay + '" r="7.5" fill="' + (nl.closed ? "#d85a30" : "#fff") + '" stroke="#d85a30" stroke-width="3"/>';
      s += '<text x="' + x.toFixed(1) + '" y="' + (ay + 28) + '" font-size="15" font-weight="700" fill="#b4411f" text-anchor="middle"' + HALO + ">" + esc(fmtN(v)) + "</text>";
      s += '<text x="' + (nl.left ? Math.max(mL + 20, x - 30) : Math.min(W - mR - 20, x + 30)).toFixed(1) + '" y="' + (ay - 18) + '" font-size="15" font-style="italic" font-weight="700" fill="#1f2f55" text-anchor="middle">' + esc(nl.vn) + "</text>";
    }
    return s + "</svg><div class=\"lin__leg\">" + '<span class="lin__legI"><i class="lin__legL lin__legL--l"></i>' + L("Розв'язок нерівності", "Solution set") + "</span>" + (nl.kind === "one" ? '<span class="lin__legI"><i class="lin__legD lin__legD--o"></i>' + (nl.closed ? L("Межа входить (●)", "Boundary included (●)") : L("Межа не входить (○)", "Boundary excluded (○)")) + "</span>" : "") + "</div>";
  }

  // ===== відображення =====
  const CALC = { eq: modeEq, coef: modeCoef, ineq: modeIneq, prop: modeProp };
  function stepsHtml(steps) {
    return '<div class="lin__sub">' + L("Розв'язання", "Solution") + "</div>" + steps.map((s, i) => '<div class="lin__step"><span class="lin__stepN">' + (i + 1) + '</span><div><b class="lin__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="lin__math">' + esc(x) + "</p>").join("") + (s.note ? '<p class="lin__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join("");
  }
  function textOf(m) {
    const head = m.expr.replace(/−/g, "-") + (m.resText ? "  →  " + m.resText : "");
    return [head, ""].concat(m.steps.map((s, i) => (i + 1) + ". " + s.t + "\n   " + s.l.join("\n   "))).join("\n");
  }
  let last = null;
  function render(m, strict) {
    const box = el("result");
    if (!m.ok) {
      last = null;
      if (m.incomplete && !strict) { box.innerHTML = T.enter; return; }
      const linkHtml = m.link === "quad" ? ' <a class="lin__inl" href="' + (IS_EN ? "/en" : "") + '/education/quadratic-equation-calculator">' + L("Квадратне рівняння →", "Quadratic equation →") + "</a>" : "";
      box.innerHTML = '<div class="lin__hintbox">' + esc(m.msg || T.enter) + linkHtml + "</div>";
      return;
    }
    last = m;
    const tiles = m.tiles && m.tiles.length ? '<div class="lin__tiles">' + m.tiles.map((t) => '<div class="lin__tile"><small>' + esc(t.k) + "</small><b>" + esc(t.v) + "</b>" + (t.s ? "<span>" + esc(t.s) + "</span>" : "") + "</div>").join("") + "</div>" : "";
    let graph = "";
    if (m.graph) graph = '<div class="lin__sub">' + L("Графік", "Graph") + '</div><div class="lin__graph">' + lineGraph(m.graph) + "</div>";
    else if (m.numline) graph = '<div class="lin__sub">' + L("Числова пряма", "Number line") + '</div><div class="lin__graph">' + numLine(m.numline) + "</div>";
    box.innerHTML = '<div class="lin__rhead"><div class="lin__expr">' + esc(m.expr) + "</div>" + m.head + "</div>" + tiles + stepsHtml(m.steps) + graph + '<div class="lin__note">' + L("Усі обчислення точні (раціональні числа): дроби не округлюються, десяткові значення додано для зручності.", "All calculations are exact (rational numbers): fractions are not rounded, decimals are shown for convenience.") + "</div>";
  }
  const autoOn = () => !el("autoCalc") || el("autoCalc").checked;
  function calc(strict) {
    let m;
    try { m = CALC[mode](); } catch (e) { if (e instanceof PErr) m = errRes(e); else throw e; }
    render(m, strict === true);
    preview();
    return m;
  }
  function maybeCalc() { if (autoOn()) calc(); else { render({ ok: false, incomplete: true }, false); preview(); } }
  function preview() {
    const p = el("eqPreview");
    if (!p) return;
    let t = "";
    try {
      if (mode === "eq" || mode === "ineq") {
        const P = parseRelation(el(mode === "eq" ? "eq" : "ie").value, mode === "ineq");
        if (!P.empty) t = fmtTokens(P.toks);
      } else if (mode === "coef") {
        const v = ["ca", "cb", "cc", "cd"].map((id) => parseRat(el(id).value));
        if (v.every((r) => r.v)) t = polyTxt(trim([v[1].v, v[0].v]), "x") + " = " + polyTxt(trim([v[3].v, v[2].v]), "x");
      } else {
        const raw = PROP_IDS.map((id) => el(id).value.trim());
        const v = raw.map((x) => (x && !/^[a-zа-я]$/i.test(x) ? x : "x"));
        if (raw.some(Boolean)) t = v[0] + " : " + v[1] + " = " + v[2] + " : " + v[3];
      }
    } catch (e) { t = ""; }
    p.textContent = t;
  }

  // ===== режими, кнопки =====
  const FIELDS = ["eq", "ca", "cb", "cc", "cd", "ie", "pa", "pb", "pc", "pd"];
  const PANELS = { eq: "panelEq", coef: "panelCoef", ineq: "panelIneq", prop: "panelProp" };
  function toast(msg) { const n = el("toast"); if (!n) return; n.textContent = msg; clearTimeout(toast._t); toast._t = setTimeout(() => (n.textContent = ""), 2600); }
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".lin__tab").forEach((b) => { const on = b.dataset.m === m; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    MODES.forEach((k) => { el(PANELS[k]).hidden = k !== m; });
    maybeCalc();
  }
  function resetAll() { FIELDS.forEach((id) => (el(id).value = "")); maybeCalc(); }
  const EXAMPLES = {
    eq: () => { el("eq").value = "3(x - 2) = 2x + 5"; },
    coef: () => { el("ca").value = "2"; el("cb").value = "3"; el("cc").value = "1"; el("cd").value = "-5"; },
    ineq: () => { el("ie").value = "-2x + 3 > 7"; },
    prop: () => { el("pa").value = "3"; el("pb").value = "4"; el("pc").value = "9"; el("pd").value = ""; }
  };
  function fillExample() { resetAll(); EXAMPLES[mode](); calc(true); toast(T.example); }
  function share() {
    const p = new URLSearchParams();
    p.set("m", mode);
    FIELDS.forEach((id) => el(id).value.trim() && p.set(id, el(id).value.trim()));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const qs = new URLSearchParams(location.search);
    if (![...qs.keys()].length) return false;
    if (MODES.includes(qs.get("m"))) mode = qs.get("m");
    FIELDS.forEach((id) => { if (qs.has(id)) el(id).value = qs.get(id).slice(0, MAXLEN); });
    return true;
  }
  async function copyResult() {
    if (!last) { toast(T.calcFirst); return; }
    try { await navigator.clipboard.writeText(textOf(last)); toast(T.copied); } catch { toast(T.copyFailed); }
  }
  function insertAt(id, text) {
    const inp = el(id);
    const s = inp.selectionStart ?? inp.value.length, e = inp.selectionEnd ?? inp.value.length;
    const pair = text === "()";
    inp.value = inp.value.slice(0, s) + text + inp.value.slice(e);
    const pos = pair ? s + 1 : s + text.length;
    inp.focus();
    inp.setSelectionRange(pos, pos);
    inp.dispatchEvent(new Event("input", { bubbles: true }));
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".lin__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    document.querySelectorAll(".lin__key").forEach((b) => b.addEventListener("mousedown", (e) => e.preventDefault()));
    document.querySelectorAll(".lin__key").forEach((b) => b.addEventListener("click", () => insertAt(b.dataset.for, b.dataset.ins)));
    FIELDS.forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); calc(true); } }); });
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
