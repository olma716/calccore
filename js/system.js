/* system.js — калькулятор системи лінійних рівнянь 2×2 і 3×3: підстановка, додавання, Крамер, Гаус; розв'язання по кроках, перевірка, графік (UK/EN)
   Рівняння вводяться як на папері (дужки, дроби, десяткові, змінна з обох боків) або коефіцієнтами. Усе рахується точно на раціональних числах BigInt.
   Розбір: токени → дерево → лінійна форма Σ aᵢ·vᵢ + c; рівняння зводиться до Σ aᵢ·vᵢ = rhs, система до розширеної матриці.
   Кількість розв'язків визначає зведення Гауса–Жордана (ранг): один, безліч (загальний розв'язок через вільні змінні) або жодного.
   2×2: підстановка (виражаємо змінну, підставляємо, повертаємось), додавання (множимо на НСК і додаємо/віднімаємо), Крамер (D, Dx, Dy). 3×3: Гаус (рядкові перетворення), Крамер (D, Dx, Dy, Dz правилом Саррюса). */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const SEP = IS_EN ? "." : ",";
  const MODES = ["s2", "s3"];
  const MAXD = 30;
  const MAXLEN = 160;
  let mode = "s2";

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
  const isOne = (x) => x.n === O && x.d === O;
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

  // ===== число або дріб у полях коефіцієнтів =====
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

  // ===== розбір виразів (лінійні форми з кількома змінними) =====
  class PErr extends Error { constructor(msg, soft) { super(msg); this.soft = !!soft; } }
  const hard = (u, e) => { throw new PErr(L(u, e), false); };
  const soft = (u, e) => { throw new PErr(L(u, e), true); };

  function tokenize(raw) {
    const s = String(raw)
      .replace(/[−–—‒﹣－]/g, "-").replace(/[×·∙⋅]/g, "*").replace(/÷/g, "/").replace(/:/g, "/")
      .replace(/²/g, "^2").replace(/³/g, "^3").replace(/[[{]/g, "(").replace(/[\]}]/g, ")")
      .replace(/[хХ]/g, "x").replace(/[уУ]/g, "y");
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
      if (/[а-яіїєґ]/i.test(ch)) hard("Змінна — латинська літера (x, y, z). Символ «" + ch + "» не підходить.", "A variable must be a Latin letter (x, y, z). “" + ch + "” is not allowed.");
      if ("+-*/^".includes(ch)) { toks.push({ t: "op", s: ch }); i++; continue; }
      if (ch === "(" || ch === ")") { toks.push({ t: ch, s: ch }); i++; continue; }
      if (ch === "=") { toks.push({ t: "rel", s: "=" }); i++; continue; }
      if (ch === "<" || ch === ">" || ch === "≤" || ch === "≥" || ch === "≠") hard("У системі потрібні рівності: використовуйте знак «=».", "A system needs equalities: use the “=” sign.");
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
      if (t.t === "var") return { k: "var", n: t.s };
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

  // лінійна форма: { c: константа, v: { змінна: коефіцієнт } }
  const fConst = (c) => ({ c, v: {} });
  const fAdd = (a, b, sgn) => { const v = { ...a.v }; for (const k of Object.keys(b.v)) v[k] = add(v[k] || ZERO, sgn > 0 ? b.v[k] : neg(b.v[k])); return { c: sgn > 0 ? add(a.c, b.c) : sub(a.c, b.c), v }; };
  const fScale = (a, r) => { const v = {}; for (const k of Object.keys(a.v)) v[k] = mul(a.v[k], r); return { c: mul(a.c, r), v }; };
  const isConstForm = (f) => Object.values(f.v).every(isZ);
  const NONLIN = () => hard("Добуток змінних чи їхній степінь — це не лінійне рівняння.", "A product of variables or a power of a variable is not a linear equation.");
  function toForm(n) {
    if (n.k === "num") return fConst(n.v);
    if (n.k === "var") return { c: ZERO, v: { [n.n]: ONE } };
    if (n.k === "neg") return fScale(toForm(n.a), R(-1));
    if (n.k === "pow") {
      const b = toForm(n.a);
      if (n.n === 0) return fConst(ONE);
      if (n.n === 1) return b;
      if (!isConstForm(b)) NONLIN();
      let r = ONE; for (let i = 0; i < n.n; i++) r = mul(r, b.c);
      return fConst(r);
    }
    const a = toForm(n.a), b = toForm(n.b);
    if (n.op === "+") return fAdd(a, b, 1);
    if (n.op === "-") return fAdd(a, b, -1);
    if (n.op === "*") { if (isConstForm(a)) return fScale(b, a.c); if (isConstForm(b)) return fScale(a, b.c); NONLIN(); }
    if (!isConstForm(b)) hard("Ділення на вираз зі змінною — це не лінійне рівняння.", "Dividing by an expression with a variable is not a linear equation.");
    if (isZ(b.c)) hard("Ділення на нуль.", "Division by zero.");
    return fScale(a, div(ONE, b.c));
  }
  function parseEquation(text) {
    const t = String(text || "").trim();
    if (t.length > MAXLEN) hard("Надто довгий запис (до " + MAXLEN + " символів).", "The entry is too long (up to " + MAXLEN + " characters).");
    const toks = tokenize(t);
    const rels = toks.filter((x) => x.t === "rel");
    if (!rels.length) soft("Додайте знак «=».", "Add the “=” sign.");
    if (rels.length > 1) hard("У рівнянні має бути лише один знак «=».", "An equation can have only one “=” sign.");
    const ri = toks.indexOf(rels[0]);
    const lt = toks.slice(0, ri), rt = toks.slice(ri + 1);
    if (!lt.length || !rt.length) soft("Ліва і права частина мають бути заповнені.", "Both sides must be filled in.");
    return { toks, form: fAdd(toForm(parseSide(lt)), toForm(parseSide(rt)), -1), letters: Array.from(new Set(toks.filter((x) => x.t === "var").map((x) => x.s))) };
  }

  // ===== запис рівнянь =====
  function termsTxt(items, vals) {
    items = items.filter((it) => !isZ(it.c));
    if (!items.length) return "0";
    return items.map((it, i) => {
      const ng = it.c.n < Z, abs = { n: babs(it.c.n), d: it.c.d };
      let body;
      if (it.s) {
        if (vals) body = abs.n === abs.d ? par(vals[it.s]) : (abs.d === O ? String(abs.n) : "(" + fs(abs) + ")") + "·" + par(vals[it.s]);
        else body = (abs.n === abs.d ? "" : abs.d === O ? String(abs.n) : "(" + fs(abs) + ")") + it.s;
      } else body = fs(abs);
      return (i === 0 ? (ng ? MN : "") : ng ? " " + MN + " " : " + ") + body;
    }).join("");
  }
  const rowTxt = (row, vars, vals) => termsTxt(vars.map((v, j) => ({ c: row[j], s: v })), vals) + " = " + termsTxt([{ c: row[vars.length], s: "" }]);
  const rowsTxt = (rows, vars) => rows.map((r) => rowTxt(r, vars));
  const cp = (M) => M.map((r) => r.slice());
  const rowZero = (r, n) => r.slice(0, n).every(isZ);

  // ===== Гаус–Жордан =====
  function mtxLines(M, n) { return M.map((r) => "[ " + r.slice(0, n).map((x) => fs(x)).join("  ") + " | " + fs(r[n]) + " ]"); }
  function gauss(M0, vars) {
    const M = cp(M0), rows = M.length, n = vars.length, steps = [], pivots = [];
    steps.push(step(L("Розширена матриця", "The augmented matrix"), mtxLines(M, n), L("Кожен рядок — одне рівняння: коефіцієнти при змінних і права частина після риски.", "Each row is one equation: the coefficients of the variables and the right-hand side after the bar.")));
    let r = 0;
    for (let c = 0; c < n && r < rows; c++) {
      let p = -1;
      for (let i = r; i < rows; i++) if (!isZ(M[i][c])) { p = i; break; }
      if (p < 0) continue;
      const ops = [];
      if (p !== r) { [M[p], M[r]] = [M[r], M[p]]; ops.push("R" + (r + 1) + " ↔ R" + (p + 1)); }
      if (!isOne(M[r][c])) { const d = M[r][c]; M[r] = M[r].map((x) => div(x, d)); ops.push("R" + (r + 1) + " ← R" + (r + 1) + " / " + par(d)); }
      for (let i = 0; i < rows; i++) {
        if (i === r || isZ(M[i][c])) continue;
        const f = M[i][c];
        M[i] = M[i].map((x, j) => sub(x, mul(f, M[r][j])));
        ops.push("R" + (i + 1) + " ← R" + (i + 1) + (f.n < Z ? " + " + (isOne(neg(f)) ? "" : par(neg(f)) + "·") : " − " + (isOne(f) ? "" : par(f) + "·")) + "R" + (r + 1));
      }
      pivots.push(c); r++;
      steps.push(step(L("Стовпець ", "Column ") + vars[c], ops.concat(mtxLines(M, n))));
    }
    return { R: M, pivots, steps };
  }
  function classify(Rm, pivots, n) {
    const bad = Rm.some((r) => rowZero(r, n) && !isZ(r[n]));
    if (bad) return { kind: "none" };
    if (pivots.length === n) { const sol = new Array(n).fill(ZERO); pivots.forEach((c, i) => { sol[c] = Rm[i][n]; }); return { kind: "one", sol }; }
    const free = []; for (let j = 0; j < n; j++) if (!pivots.includes(j)) free.push(j);
    return { kind: "inf", free, pivots, Rm };
  }
  function generalLines(cls, vars, n) {
    const lines = [];
    cls.pivots.forEach((c, i) => {
      const items = [{ c: cls.Rm[i][n], s: "" }];
      cls.free.forEach((j) => items.push({ c: neg(cls.Rm[i][j]), s: vars[j] }));
      lines.push(vars[c] + " = " + termsTxt(items));
    });
    cls.free.forEach((j) => lines.push(vars[j] + L(" — будь-яке число", " is any number")));
    return lines;
  }

  // ===== визначники =====
  const det2 = (a, b, c, d) => sub(mul(a, d), mul(b, c));
  function det3(m) {
    const p = [mul(mul(m[0][0], m[1][1]), m[2][2]), mul(mul(m[0][1], m[1][2]), m[2][0]), mul(mul(m[0][2], m[1][0]), m[2][1])];
    const s = [mul(mul(m[0][2], m[1][1]), m[2][0]), mul(mul(m[0][0], m[1][2]), m[2][1]), mul(mul(m[0][1], m[1][0]), m[2][2])];
    const txt = (a, b, c) => par(a) + "·" + par(b) + "·" + par(c);
    const tp = [txt(m[0][0], m[1][1], m[2][2]), txt(m[0][1], m[1][2], m[2][0]), txt(m[0][2], m[1][0], m[2][1])];
    const ts = [txt(m[0][2], m[1][1], m[2][0]), txt(m[0][0], m[1][2], m[2][1]), txt(m[0][1], m[1][0], m[2][2])];
    const val = p.reduce((a, x) => add(a, x), ZERO), vs = s.reduce((a, x) => add(a, x), ZERO);
    return { v: sub(val, vs), line: tp.join(" + ") + " − " + ts.map((t) => "(" + t + ")").join(" − "), vals: p.map(fs).join(" + ") + " − (" + s.map(fs).join(") − (") + ")" };
  }

  // ===== перевірка підстановкою =====
  function checkStep(M, vars, sol) {
    const n = vars.length, vals = {};
    vars.forEach((v, j) => { vals[v] = sol[j]; });
    const lines = [L("Підставимо ", "Substitute ") + vars.map((v, j) => v + " = " + fs(sol[j])).join(", ") + ":"];
    let ok = true;
    M.forEach((row, i) => {
      const left = row.slice(0, n).reduce((a, c, j) => add(a, mul(c, sol[j])), ZERO);
      const good = isZ(sub(left, row[n]));
      ok = ok && good;
      lines.push("(" + (i + 1) + ") " + termsTxt(vars.map((v, j) => ({ c: row[j], s: v })), vals) + " = " + fs(left) + (good ? " ✓" : " ≠ " + fs(row[n]) + " ✗"));
    });
    return { st: step(L("Перевірка", "Check"), lines), ok };
  }

  // ===== кроки методів 2×2 =====
  const absOne = (x) => x.d === O && babs(x.n) === O;
  function fallbackGauss(M, vars, note) {
    const g = gauss(M, vars);
    if (note) g.steps.unshift(step(L("Особливий випадок", "A special case"), [note]));
    return g;
  }
  const exprTxt = (v, a, items) => (isOne(a) ? v + " = " + termsTxt(items) : v + " = " + (items.filter((it) => !isZ(it.c)).length > 1 ? "(" + termsTxt(items) + ")" : termsTxt(items)) + "/" + par(a));
  const withSign = (t) => (t.startsWith(MN) ? " " + MN + " " + t.slice(1) : " + " + t);

  function subSteps(M, vars) {
    const steps = [];
    const cand = [];
    for (const e of [0, 1]) for (const v of [0, 1]) if (!isZ(M[e][v])) cand.push([e, v]);
    if (!cand.length) return null;
    const [e, v] = cand.find(([ee, vv]) => absOne(M[ee][vv])) || cand[0];
    const o = 1 - e, w = 1 - v, a = M[e][v], k = M[e][w], c = M[e][2];
    const items = [{ c, s: "" }, { c: neg(k), s: vars[w] }];
    const vconst = div(c, a), vw = neg(div(k, a));
    steps.push(step(L("Виражаємо " + vars[v] + " з рівняння (" + (e + 1) + ")", "Express " + vars[v] + " from equation (" + (e + 1) + ")"), [rowTxt(M[e], vars), exprTxt(vars[v], a, items)], L("Обираємо рівняння й змінну, де коефіцієнт простіший.", "We pick the equation and the variable with the simpler coefficient.")));
    const ao = M[o][v], ko = M[o][w], co = M[o][2];
    let A, B;
    if (isZ(ao)) {
      A = ko; B = co;
      steps.push(step(L("Підставляємо в рівняння (" + (o + 1) + ")", "Substitute into equation (" + (o + 1) + ")"), [rowTxt(M[o], vars)], L("Змінна " + vars[v] + " у цьому рівнянні відсутня, тому підстановка не потрібна.", vars[v] + " does not appear in this equation, so no substitution is needed.")));
    } else {
      const body = isOne(a) ? termsTxt(items) : "(" + termsTxt(items) + ")/" + par(a);
      const lhs = (isOne(ao) ? "" : par(ao) + "·") + "(" + body + ")" + (isZ(ko) ? "" : withSign(termsTxt([{ c: ko, s: vars[w] }])));
      A = add(mul(ao, vw), ko); B = sub(co, mul(ao, vconst));
      steps.push(step(L("Підставляємо в рівняння (" + (o + 1) + ")", "Substitute into equation (" + (o + 1) + ")"), [lhs + " = " + termsTxt([{ c: co, s: "" }]), termsTxt([{ c: A, s: vars[w] }]) + " = " + termsTxt([{ c: B, s: "" }])], L("Розкриваємо дужки й зводимо подібні доданки: залишилось рівняння з однією змінною.", "Expand and combine like terms: an equation in one variable remains.")));
    }
    if (isZ(A)) return { steps, degenerate: true, A, B };
    const wVal = div(B, A);
    const dl = [vars[w] + " = " + fs(B) + "/" + par(A) + (fs(B) + "/" + par(A) !== fs(wVal) ? " = " + fs(wVal) : "")];
    if (wVal.d !== O) dl.push(vars[w] + " " + dsub(wVal));
    steps.push(step(L("Знаходимо " + vars[w], "Find " + vars[w]), dl));
    const vVal = add(vconst, mul(vw, wVal));
    const numTxt = isZ(k) ? fs(c) : fs(c) + " − " + par(k) + "·" + par(wVal);
    steps.push(step(L("Повертаємось і знаходимо " + vars[v], "Go back and find " + vars[v]), [vars[v] + " = " + (isOne(a) ? numTxt : (isZ(k) ? numTxt : "(" + numTxt + ")") + "/" + par(a)) + " = " + fs(vVal)]));
    const sol = []; sol[v] = vVal; sol[w] = wVal;
    return { steps, sol };
  }

  function addSteps(M0, vars) {
    const steps = [];
    let M = cp(M0);
    // цілі коефіцієнти
    const sc = M.map((r) => r.reduce((m, x) => lcm(m, x.d), O));
    if (sc.some((x) => x > 1n)) {
      M = M.map((r, i) => r.map((x) => mul(x, R(sc[i]))));
      steps.push(step(L("Позбуваємося дробів", "Clear the fractions"), rowsTxt(M, vars).map((s, i) => "(" + (i + 1) + ") " + s), L("Кожне рівняння множимо на НСК його знаменників: рівняння не змінюється, а коефіцієнти стають цілими.", "Each equation is multiplied by the LCM of its denominators: the equation stays equivalent and the coefficients become whole.")));
    }
    let j = [0, 1].find((x) => !isZ(M[0][x]) && !isZ(M[1][x]));
    if (j === undefined) return null;
    const w = 1 - j;
    const p1 = M[0][j].n, p2 = M[1][j].n, Lc = lcm(babs(p1), babs(p2)), k1 = Lc / babs(p1), k2 = Lc / babs(p2);
    const S1 = M[0].map((x) => mul(x, R(k1))), S2 = M[1].map((x) => mul(x, R(k2)));
    const mulLines = [];
    if (k1 !== O) mulLines.push("(1) · " + k1 + ": " + rowTxt(S1, vars));
    if (k2 !== O) mulLines.push("(2) · " + k2 + ": " + rowTxt(S2, vars));
    const sameSign = (p1 < Z) === (p2 < Z);
    steps.push(step(L("Зрівнюємо коефіцієнти при " + vars[j], "Make the coefficients of " + vars[j] + " match"), mulLines.length ? mulLines : [L("Коефіцієнти при " + vars[j] + " уже однакові за модулем.", "The coefficients of " + vars[j] + " already match in absolute value.")], L("НСК модулів коефіцієнтів: " + Lc + ".", "LCM of the absolute values: " + Lc + ".")));
    const Tm = S1.map((x, i) => (sameSign ? sub(x, S2[i]) : add(x, S2[i])));
    const A = Tm[w], B = Tm[2];
    steps.push(step(sameSign ? L("Віднімаємо рівняння", "Subtract the equations") : L("Додаємо рівняння", "Add the equations"), [(sameSign ? "(1) − (2): " : "(1) + (2): ") + termsTxt([{ c: A, s: vars[w] }]) + " = " + termsTxt([{ c: B, s: "" }])], L(vars[j] + " зникає: коефіцієнти при ньому однакові за модулем " + (sameSign ? "і за знаком, тому віднімаємо." : "і протилежні за знаком, тому додаємо."), vars[j] + " cancels out: its coefficients have equal absolute values " + (sameSign ? "and the same sign, so we subtract." : "and opposite signs, so we add."))));
    if (isZ(A)) return { steps, degenerate: true, A, B, M };
    const wVal = div(B, A);
    steps.push(step(L("Знаходимо " + vars[w], "Find " + vars[w]), [vars[w] + " = " + fs(B) + "/" + par(A) + (fs(B) + "/" + par(A) !== fs(wVal) ? " = " + fs(wVal) : "")].concat(wVal.d !== O ? [vars[w] + " " + dsub(wVal)] : [])));
    const a = M[0][j], k = M[0][w], c = M[0][2], vVal = div(sub(c, mul(k, wVal)), a);
    const numTxt = isZ(k) ? fs(c) : fs(c) + " − " + par(k) + "·" + par(wVal);
    steps.push(step(L("Підставляємо в рівняння (1) і знаходимо " + vars[j], "Substitute into equation (1) and find " + vars[j]), [vars[j] + " = " + (isOne(a) ? numTxt : (isZ(k) ? numTxt : "(" + numTxt + ")") + "/" + par(a)) + " = " + fs(vVal)]));
    const sol = []; sol[j] = vVal; sol[w] = wVal;
    return { steps, sol };
  }

  function cramer2(M, vars) {
    const [a1, b1, c1] = M[0], [a2, b2, c2] = M[1];
    const D = det2(a1, b1, a2, b2), Dx = det2(c1, b1, c2, b2), Dy = det2(a1, c1, a2, c2);
    const [vx, vy] = vars;
    const steps = [step(L("Визначники", "The determinants"), [
      "D = " + par(a1) + "·" + par(b2) + " − " + par(a2) + "·" + par(b1) + " = " + fs(D),
      "D" + vx + " = " + par(c1) + "·" + par(b2) + " − " + par(c2) + "·" + par(b1) + " = " + fs(Dx),
      "D" + vy + " = " + par(a1) + "·" + par(c2) + " − " + par(a2) + "·" + par(c1) + " = " + fs(Dy)
    ], L("D складено з коефіцієнтів при змінних; у D" + vx + " стовпець при " + vx + " замінено правими частинами, у D" + vy + " — стовпець при " + vy + ".", "D is made of the coefficients; in D" + vx + " the column of " + vx + " is replaced by the right-hand sides, in D" + vy + " the column of " + vy + ".")) ];
    if (isZ(D)) return { steps, D, degenerate: true };
    const x = div(Dx, D), y = div(Dy, D);
    steps.push(step(L("Знаходимо " + vx + " та " + vy, "Find " + vx + " and " + vy), [vx + " = D" + vx + " / D = " + fs(Dx) + "/" + par(D) + " = " + fs(x), vy + " = D" + vy + " / D = " + fs(Dy) + "/" + par(D) + " = " + fs(y)]));
    return { steps, D, sol: [x, y] };
  }
  function cramer3(M, vars) {
    const A = M.map((r) => r.slice(0, 3)), cs = M.map((r) => r[3]);
    const rep = (j) => A.map((r, i) => r.map((x, c) => (c === j ? cs[i] : x)));
    const dets = [det3(A), det3(rep(0)), det3(rep(1)), det3(rep(2))];
    const names = ["D", "D" + vars[0], "D" + vars[1], "D" + vars[2]];
    const steps = [step(L("Визначники (правило Саррюса)", "The determinants (Sarrus' rule)"), dets.flatMap((d, i) => [names[i] + " = " + d.line, "   = " + d.vals + " = " + fs(d.v)]), L("Визначник 3×3: сума добутків уздовж «головних» діагоналей мінус сума добутків уздовж «побічних».", "A 3×3 determinant: the sum of the products along the main diagonals minus the sum along the secondary ones."))];
    const D = dets[0].v;
    if (isZ(D)) return { steps, D, degenerate: true };
    const sol = [1, 2, 3].map((i) => div(dets[i].v, D));
    steps.push(step(L("Знаходимо змінні", "Find the variables"), vars.map((v, j) => v + " = " + names[j + 1] + " / D = " + fs(dets[j + 1].v) + "/" + par(D) + " = " + fs(sol[j]))));
    return { steps, D, sol };
  }

  // ===== розв'язання системи =====
  function solveSystem(M, vars, method) {
    const n = vars.length;
    const G = gauss(M, vars), cls = classify(G.R, G.pivots, n);
    const D = n === 2 ? det2(M[0][0], M[0][1], M[1][0], M[1][1]) : det3(M.map((r) => r.slice(0, 3))).v;
    let steps = [step(L("Система", "The system"), rowsTxt(M, vars).map((s, i) => "(" + (i + 1) + ") " + s))];
    let produced = null;
    if (method !== "gauss") produced = n === 2 ? (method === "sub" ? subSteps(M, vars) : method === "add" ? addSteps(M, vars) : cramer2(M, vars)) : cramer3(M, vars);
    if (method === "gauss") steps = steps.concat(G.steps);
    else if (produced && !produced.degenerate) {
      steps = steps.concat(produced.steps);
      if (produced.sol && cls.kind === "one" && produced.sol.some((x, j) => cmpR(x, cls.sol[j]) !== 0)) (window.__sysMismatch = window.__sysMismatch || []).push({ method, M: M.map((r) => r.map(fs)), got: produced.sol.map(fs), want: cls.sol.map(fs) });
    } else {
      if (produced) steps = steps.concat(produced.steps);
      const why = produced
        ? (method === "cramer" ? L("D = 0, тому метод Крамера не дає єдиного розв'язку. Кількість розв'язків визначимо зведенням матриці (метод Гауса).", "D = 0, so Cramer's rule gives no unique solution. The number of solutions is found by reducing the matrix (Gauss' method).") : L("Змінна зникла, і залишилось рівняння без неї. Кількість розв'язків уточнимо зведенням матриці (метод Гауса).", "The variable cancelled out. The number of solutions is found by reducing the matrix (Gauss' method)."))
        : L("Для цієї системи зручніше зведення матриці (метод Гауса).", "For this system reducing the matrix (Gauss' method) is more convenient.");
      steps.push(step(L("Далі — метод Гауса", "Next — Gauss' method"), [why]));
      steps = steps.concat(G.steps);
    }
    let res;
    if (cls.kind === "one") {
      if (method === "gauss" || !produced || produced.degenerate) steps.push(step(L("Розв'язок", "The solution"), vars.map((v, j) => v + " = " + fs(cls.sol[j]))));
      const chk = checkStep(M, vars, cls.sol);
      steps.push(chk.st);
      res = { kind: "one", sol: cls.sol, ok: chk.ok };
    } else if (cls.kind === "none") {
      steps.push(step(L("Висновок", "Conclusion"), [L("Є рядок виду 0 = c, де c ≠ 0: рівність неможлива.", "There is a row of the form 0 = c with c ≠ 0: an impossible equality."), L("Система не має розв'язків.", "The system has no solutions.")]));
      res = { kind: "none" };
    } else {
      const gl = generalLines(cls, vars, n);
      steps.push(step(L("Висновок", "Conclusion"), [L("Ранг матриці (" + cls.pivots.length + ") менший за кількість змінних (" + n + "): є вільні змінні.", "The rank (" + cls.pivots.length + ") is smaller than the number of variables (" + n + "): there are free variables.")].concat(gl), L("Розв'язків безліч: кожному значенню вільної змінної відповідає розв'язок.", "There are infinitely many solutions: each value of the free variable gives one.")));
      res = { kind: "inf", general: gl, free: cls.free.length };
    }
    res.steps = steps; res.D = D; res.rank = G.pivots.length; res.vars = vars;
    return res;
  }
  const cmpR = (x, y) => sg(sub(x, y));

  // ===== графік двох прямих (2×2) =====
  function niceStep(range, n) {
    const raw = range / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), nm = raw / mag;
    return (nm <= 1 ? 1 : nm <= 2 ? 2 : nm <= 5 ? 5 : 10) * mag;
  }
  const dec2 = (st) => Math.max(0, -Math.floor(Math.log10(st) + 1e-9));
  const tick = (v, st) => (Math.abs(v) < st * 1e-6 ? "0" : v.toFixed(dec2(st))).replace(".", SEP);
  const fmtN = (v) => { const t = Math.abs(v) >= 100000 || (Math.abs(v) < 0.0001 && v !== 0) ? v.toExponential(2) : String(Math.round(v * 10000) / 10000); return t.replace(".", SEP); };
  const HALO = ' paint-order="stroke" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"';

  function lineGraph(M, vars, sol) {
    const lines = M.map((r) => ({ a: toNum(r[0]), b: toNum(r[1]), c: toNum(r[2]) }));
    const vert = (l) => Math.abs(l.b) < 1e-12;
    const xs = [0]; let ys = [0];
    if (sol) { xs.push(toNum(sol[0])); ys.push(toNum(sol[1])); }
    lines.forEach((l) => { if (vert(l)) xs.push(l.c / l.a); });
    let lo = Math.min(...xs), hi = Math.max(...xs);
    if (!sol && hi - lo < 1e-9) { lo = -5; hi = 5; }
    let span = hi - lo; if (span < 1e-9) span = 4;
    const padX = span * 0.6 + 1, xmin = lo - padX, xmax = hi + padX;
    lines.forEach((l) => { if (!vert(l)) { ys.push((l.c - l.a * xmin) / l.b, (l.c - l.a * xmax) / l.b); } });
    let ylo = Math.min(...ys), yhi = Math.max(...ys);
    if (yhi - ylo < 1e-9) { ylo -= 3; yhi += 3; }
    if (lines.every(vert)) { ylo = Math.min(ylo, -5); yhi = Math.max(yhi, 5); }
    const yp = (yhi - ylo) * 0.12, ymin = ylo - yp, ymax = yhi + yp;
    const xStep = niceStep(xmax - xmin, 8), yStep = niceStep(ymax - ymin, 6);
    const xt = [], yt = [];
    for (let k = Math.ceil(xmin / xStep); k * xStep <= xmax + 1e-12; k++) xt.push(k * xStep);
    for (let k = Math.ceil(ymin / yStep); k * yStep <= ymax + 1e-12; k++) yt.push(k * yStep);
    const lw = Math.max(...yt.map((v) => tick(v, yStep).length), 2);
    const W = 560, H = 340, mL = Math.max(40, Math.round(lw * 7.4 + 18)), mR = 26, mT = 26, mB = 30, pw = W - mL - mR, ph = H - mT - mB;
    const X = (x) => mL + ((x - xmin) / (xmax - xmin)) * pw, Y = (y) => mT + ph - ((y - ymin) / (ymax - ymin)) * ph;
    const ax = Y(0), ay = X(0);
    let s = '<svg class="sys__svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + L("Графік двох прямих", "Graph of the two lines") + '"><defs><clipPath id="sysClip"><rect x="' + mL + '" y="' + mT + '" width="' + pw + '" height="' + ph + '"/></clipPath><marker id="sysArr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#4b5563"/></marker></defs>';
    s += '<rect x="' + mL + '" y="' + mT + '" width="' + pw + '" height="' + ph + '" fill="#fff" stroke="#dfe3ec"/>';
    xt.forEach((v) => { s += '<line x1="' + X(v).toFixed(1) + '" y1="' + mT + '" x2="' + X(v).toFixed(1) + '" y2="' + (mT + ph) + '" stroke="#eef0f6"/>'; });
    yt.forEach((v) => { s += '<line x1="' + mL + '" y1="' + Y(v).toFixed(1) + '" x2="' + (mL + pw) + '" y2="' + Y(v).toFixed(1) + '" stroke="#eef0f6"/>'; });
    s += '<line x1="' + mL + '" y1="' + ax.toFixed(1) + '" x2="' + (W - mR + 14) + '" y2="' + ax.toFixed(1) + '" stroke="#4b5563" stroke-width="1.4" marker-end="url(#sysArr)"/>';
    s += '<line x1="' + ay.toFixed(1) + '" y1="' + (mT + ph) + '" x2="' + ay.toFixed(1) + '" y2="' + (mT - 14) + '" stroke="#4b5563" stroke-width="1.4" marker-end="url(#sysArr)"/>';
    s += '<text x="' + (W - 6) + '" y="' + (ax + 4).toFixed(1) + '" font-size="18" font-style="italic" font-weight="700" fill="#1f2f55" text-anchor="end">' + esc(vars[0]) + "</text>";
    s += '<text x="' + (ay + 10).toFixed(1) + '" y="' + (mT - 8) + '" font-size="18" font-style="italic" font-weight="700" fill="#1f2f55">' + esc(vars[1]) + "</text>";
    const cols = ["#4f6fb8", "#2f9d6a"];
    const same = lines.length === 2 && Math.abs(lines[0].a * lines[1].b - lines[1].a * lines[0].b) < 1e-12 && Math.abs(lines[0].a * lines[1].c - lines[1].a * lines[0].c) < 1e-12 && Math.abs(lines[0].b * lines[1].c - lines[1].b * lines[0].c) < 1e-12;
    lines.forEach((l, i) => {
      if (l.a === 0 && l.b === 0) return;
      let x1, y1, x2, y2;
      if (vert(l)) { x1 = x2 = l.c / l.a; y1 = ymin; y2 = ymax; }
      else { x1 = xmin; x2 = xmax; y1 = (l.c - l.a * x1) / l.b; y2 = (l.c - l.a * x2) / l.b; }
      s += '<line clip-path="url(#sysClip)" x1="' + X(x1).toFixed(1) + '" y1="' + Y(y1).toFixed(1) + '" x2="' + X(x2).toFixed(1) + '" y2="' + Y(y2).toFixed(1) + '" stroke="' + cols[i] + '" stroke-width="3" stroke-linecap="round"' + (i === 1 && same ? ' stroke-dasharray="2 7"' : "") + "/>";
    });
    const txt = (x, y, t, anchor, col, bold) => {
      const w = t.length * 7.4;
      let xx = x;
      if (anchor === "middle") xx = Math.max(mL + w / 2 + 2, Math.min(W - mR - w / 2 - 2, x)); else if (anchor === "end") xx = Math.max(mL + w + 2, x); else xx = Math.min(W - mR - w - 2, x);
      return '<text x="' + xx.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="14" fill="' + (col || "#1f2937") + '"' + (bold ? ' font-weight="700"' : "") + ' text-anchor="' + anchor + '"' + HALO + ">" + esc(t) + "</text>";
    };
    const px = [], py = [];
    let marks = "";
    if (sol) {
      const sx = toNum(sol[0]), sy = toNum(sol[1]);
      px.push(X(sx)); py.push(Y(sy));
      s += '<line x1="' + X(sx).toFixed(1) + '" y1="' + Y(sy).toFixed(1) + '" x2="' + X(sx).toFixed(1) + '" y2="' + ax.toFixed(1) + '" stroke="#d85a30" stroke-width="1.2" stroke-dasharray="5 4"/>';
      s += '<line x1="' + X(sx).toFixed(1) + '" y1="' + Y(sy).toFixed(1) + '" x2="' + ay.toFixed(1) + '" y2="' + Y(sy).toFixed(1) + '" stroke="#d85a30" stroke-width="1.2" stroke-dasharray="5 4"/>';
      marks += '<circle cx="' + X(sx).toFixed(1) + '" cy="' + Y(sy).toFixed(1) + '" r="5.5" fill="#d85a30" stroke="#fff" stroke-width="1.6"/>';
      marks += txt(X(sx) + 9, Y(sy) - 10, "(" + fmtN(sx) + "; " + fmtN(sy) + ")", "start", "#b4411f", true);
    }
    const flipX = ax + 15 > mT + ph - 2, flipY = ay - 7 - lw * 7.4 < mL;
    xt.forEach((v) => { const x = X(v); if (Math.abs(v) < xStep * 1e-6 || px.some((p) => Math.abs(p - x) < 40)) return; s += '<line x1="' + x.toFixed(1) + '" y1="' + (ax - 3).toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + (ax + 3).toFixed(1) + '" stroke="#4b5563"/>' + txt(x, flipX ? ax - 8 : ax + 16, tick(v, xStep), "middle", "#4b5563"); });
    yt.forEach((v) => { const y = Y(v); if (Math.abs(v) < yStep * 1e-6 || py.some((p) => Math.abs(p - y) < 14)) return; s += '<line x1="' + (ay - 3).toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + (ay + 3).toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#4b5563"/>' + (flipY ? txt(ay + 8, y + 4, tick(v, yStep), "start", "#4b5563") : txt(ay - 8, y + 4, tick(v, yStep), "end", "#4b5563")); });
    s += txt(flipY ? ay + 8 : ay - 7, flipX ? ax - 7 : ax + 16, "0", flipY ? "start" : "end", "#4b5563");
    s += marks;
    const li = (cls, t) => '<span class="sys__legI"><i class="' + cls + '"></i>' + esc(t) + "</span>";
    let leg = li("sys__legL sys__legL--l", "(1) " + rowTxt(M[0], vars)) + li("sys__legL sys__legL--r", "(2) " + rowTxt(M[1], vars));
    if (sol) leg += li("sys__legD", L("Розв'язок — точка перетину прямих", "The solution is where the lines meet"));
    return s + '</svg><div class="sys__leg">' + leg + "</div>";
  }

  // ===== читання введення =====
  const errRes = (e) => ({ ok: false, incomplete: e.soft, msg: e.message });
  const mid = (r, c) => "m" + (r + 1) + (c + 1);
  function readSystem() {
    const n = mode === "s2" ? 2 : 3;
    const inp = el("inKind").value;
    if (inp === "coef") {
      const M = [], vars = ["x", "y", "z"].slice(0, n);
      let anyEmpty = false, anyFilled = false;
      for (let r = 0; r < n; r++) {
        const row = [];
        for (let c = 0; c <= n; c++) {
          const cell = el(mid(r, c === n ? 3 : c)), raw = cell.value;
          const p = parseRat(raw);
          if (p.err) return { ok: false, msg: L("Рівняння " + (r + 1) + ": ", "Equation " + (r + 1) + ": ") + p.err };
          if (p.empty) anyEmpty = true; else anyFilled = true;
          row.push(p.v || ZERO);
        }
        M.push(row);
      }
      if (!anyFilled) return { ok: false, incomplete: true };
      if (anyEmpty) return { ok: false, incomplete: true, msg: L("Заповніть усі коефіцієнти (хоча б нулями).", "Fill in all coefficients (zeros at least).") };
      return { ok: true, M, vars, n, origLines: null };
    }
    const texts = ["e1", "e2", "e3"].slice(0, n).map((id) => el(id).value.trim());
    if (texts.every((t) => !t)) return { ok: false, incomplete: true };
    const forms = [], origLines = [];
    let letters = new Set();
    for (let i = 0; i < n; i++) {
      if (!texts[i]) return { ok: false, incomplete: true, msg: L("Заповніть усі рівняння.", "Fill in all the equations.") };
      let P;
      try { P = parseEquation(texts[i]); } catch (e) { if (e instanceof PErr) return { ok: false, incomplete: e.soft, msg: L("Рівняння " + (i + 1) + ": ", "Equation " + (i + 1) + ": ") + e.message }; throw e; }
      forms.push(P.form); P.letters.forEach((c) => letters.add(c)); origLines.push(P.toks);
    }
    const vars = Array.from(letters).sort();
    if (vars.length !== n) return { ok: false, incomplete: false, msg: L("Для системи " + n + "×" + n + " потрібно " + n + " змінні, у записі їх " + vars.length + (vars.length ? ": " + vars.join(", ") : "") + ".", "A " + n + "×" + n + " system needs " + n + " variables, the entries contain " + vars.length + (vars.length ? ": " + vars.join(", ") : "") + ".") };
    const M = forms.map((f) => [...vars.map((v) => f.v[v] || ZERO), neg(f.c)]);
    return { ok: true, M, vars, n, origToks: origLines };
  }

  // ===== розрахунок і відображення =====
  function calcSystem() {
    const rd = readSystem();
    if (!rd.ok) return rd;
    const { M, vars, n } = rd;
    const method = el("method").value;
    const r = solveSystem(M, vars, method);
    const steps = r.steps;
    const sysTxt = rowsTxt(M, vars);
    if (rd.origToks) {
      const norm = sysTxt.join(";").replace(/\s/g, "");
      const origTxt = rd.origToks.map((toks) => fmtTokens(toks));
      const orig = origTxt.join(";").replace(/\s/g, "");
      steps[0] = step(L("Система", "The system"), origTxt.map((s, i) => "(" + (i + 1) + ") " + s));
      if (norm !== orig) steps.splice(1, 0, step(L("Зводимо до стандартного вигляду", "Bring to the standard form"), sysTxt.map((s, i) => "(" + (i + 1) + ") " + s), L("Усі змінні — ліворуч, числа — праворуч; дужки розкрито.", "All variables on the left, numbers on the right; brackets expanded.")));
    }
    const type = r.kind === "one" ? L("Один розв'язок", "One solution") : r.kind === "inf" ? L("Безліч розв'язків", "Infinitely many solutions") : L("Розв'язків немає", "No solutions");
    const mname = { sub: L("Підстановка", "Substitution"), add: L("Додавання", "Addition"), cramer: L("Крамер", "Cramer"), gauss: L("Гаус", "Gauss") }[method];
    let head;
    if (r.kind === "one") {
      head = '<div class="sys__forms">' + vars.map((v, j) => { const x = r.sol[j], dec = decTxt(x); return '<span class="sys__rt"><small>' + esc(v) + "</small>" + vfr(x) + (x.d !== O ? '<span class="sys__eq">' + (dec.exact ? "=" : "≈") + '</span><span class="sys__dec">' + esc(dec.t) + "</span>" : "") + "</span>"; }).join("") + "</div>";
    } else if (r.kind === "inf") {
      head = '<div class="sys__forms"><span class="sys__dec">' + esc(L("Безліч розв'язків", "Infinitely many solutions")) + "</span></div>" + r.general.map((g) => '<div class="sys__sub2">' + esc(g) + "</div>").join("");
    } else head = '<div class="sys__forms"><span class="sys__dec">' + esc(L("Розв'язків немає", "No solutions")) + "</span></div>";
    const tiles = [{ k: L("Визначник D", "Determinant D"), v: fs(r.D) }, { k: L("Тип", "Type"), v: type }, { k: L("Метод", "Method"), v: mname }];
    const resText = r.kind === "one" ? vars.map((v, j) => v + " = " + fs(r.sol[j]) + (r.sol[j].d !== O ? " (" + dsub(r.sol[j]).replace(/^= /, "") + ")" : "")).join(", ") : r.kind === "inf" ? L("безліч розв'язків: ", "infinitely many solutions: ") + r.general.join("; ") : L("розв'язків немає", "no solutions");
    const graph = n === 2 && !M.some((row) => rowZero(row, 2)) ? { M, vars, sol: r.kind === "one" ? r.sol : null } : null;
    return { ok: true, kind: "sys", exprLines: sysTxt, head, tiles, steps, graph, resText };
  }
  const vf = (num, den) => (den === undefined ? '<span class="sys__int">' + esc(num) + "</span>" : '<span class="sys__f"><span class="sys__fn">' + esc(num) + '</span><span class="sys__fd">' + esc(den) + "</span></span>");
  const vfr = (x) => (x.d === O ? vf(String(x.n)) : vf(String(x.n), String(x.d)));
  // запис токенів (для порівняння з нормалізованим виглядом)
  function fmtTokens(toks) {
    let out = "", prev = null;
    const isVal = (t) => t && (t.t === "num" || t.t === "var" || t.t === ")");
    toks.forEach((t) => {
      if (t.t === "num") out += t.s.replace(/[.,]/, SEP);
      else if (t.t === "var") out += t.s;
      else if (t.t === "(" || t.t === ")") out += t.t;
      else if (t.t === "op") {
        if (t.s === "+" || t.s === "-") out += isVal(prev) ? " " + (t.s === "-" ? MN : "+") + " " : t.s === "-" ? MN : "";
        else if (t.s === "*") out += " · ";
        else out += t.s;
      } else if (t.t === "rel") out += " = ";
      prev = t;
    });
    return out;
  }

  function stepsHtml(steps) {
    return '<div class="sys__sub">' + L("Розв'язання", "Solution") + "</div>" + steps.map((s, i) => '<div class="sys__step"><span class="sys__stepN">' + (i + 1) + '</span><div><b class="sys__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="sys__math">' + esc(x) + "</p>").join("") + (s.note ? '<p class="sys__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join("");
  }
  function textOf(m) {
    const head = m.exprLines.join(";  ").replace(/−/g, "-") + "  →  " + m.resText;
    return [head, ""].concat(m.steps.map((s, i) => (i + 1) + ". " + s.t + "\n   " + s.l.join("\n   "))).join("\n");
  }
  let last = null;
  function render(m, strict) {
    const box = el("result");
    if (!m.ok) {
      last = null;
      if (m.incomplete && !strict) { box.innerHTML = T.enter; return; }
      box.innerHTML = '<div class="sys__hintbox">' + esc(m.msg || T.enter) + "</div>";
      return;
    }
    last = m;
    const tiles = '<div class="sys__tiles">' + m.tiles.map((t) => '<div class="sys__tile"><small>' + esc(t.k) + "</small><b>" + esc(t.v) + "</b></div>").join("") + "</div>";
    const graph = m.graph ? '<div class="sys__sub">' + L("Графік", "Graph") + '</div><div class="sys__graph">' + lineGraph(m.graph.M, m.graph.vars, m.graph.sol) + "</div>" : "";
    box.innerHTML = '<div class="sys__rhead"><div class="sys__expr">' + m.exprLines.map((l) => "<div>" + esc(l) + "</div>").join("") + "</div>" + m.head + "</div>" + tiles + stepsHtml(m.steps) + graph + '<div class="sys__note">' + L("Усі обчислення точні (раціональні числа): дроби не округлюються, десяткові значення додано для зручності.", "All calculations are exact (rational numbers): fractions are not rounded, decimals are shown for convenience.") + "</div>";
  }
  const autoOn = () => !el("autoCalc") || el("autoCalc").checked;
  function calc(strict) {
    let m;
    try { m = calcSystem(); } catch (e) { if (e instanceof PErr) m = errRes(e); else throw e; }
    render(m, strict === true);
    preview();
    return m;
  }
  function maybeCalc() { if (autoOn()) calc(); else { render({ ok: false, incomplete: true }, false); preview(); } }
  function preview() {
    const p = el("eqPreview");
    if (!p) return;
    let t = "";
    try { const rd = readSystem(); if (rd.ok) t = rowsTxt(rd.M, rd.vars).join(";   "); } catch (e) { t = ""; }
    p.textContent = t;
  }

  // ===== випадні списки, режими, кнопки =====
  const METHODS = { s2: [["sub", L("Підстановка", "Substitution")], ["add", L("Додавання", "Addition")], ["cramer", L("Крамер (визначники)", "Cramer (determinants)")]], s3: [["gauss", L("Гаус", "Gauss")], ["cramer", L("Крамер (визначники)", "Cramer (determinants)")]] };
  const DDP = { method: "md", inKind: "ik" };
  function setDd(hid, v) {
    const pre = DDP[hid], lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return false;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
    return true;
  }
  function fillMethods() {
    const list = el("md_list"), cur = el("method").value, opts = METHODS[mode];
    list.innerHTML = opts.map(([v, nm]) => '<li role="option" tabindex="-1" data-v="' + v + '" aria-selected="false">' + esc(nm) + "</li>").join("");
    setDd("method", opts.some(([v]) => v === cur) ? cur : opts[0][0]);
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
  const FIELDS = ["e1", "e2", "e3"].concat([1, 2, 3].flatMap((r) => [1, 2, 3, 4].map((c) => "m" + r + c)));
  function syncVisibility() {
    const n = mode === "s2" ? 2 : 3, coef = el("inKind").value === "coef";
    el("panelEq").hidden = coef;
    el("panelCoef").hidden = !coef;
    el("eqRow3").hidden = n < 3;
    el("keyZ").hidden = n < 3;
    document.querySelectorAll("[data-n3]").forEach((x) => { x.hidden = n < 3; });
    document.querySelectorAll("[data-n2]").forEach((x) => { x.hidden = n > 2; });
  }
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".sys__tab").forEach((b) => { const on = b.dataset.m === m; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    fillMethods();
    syncVisibility();
    maybeCalc();
  }
  function resetAll() { FIELDS.forEach((id) => (el(id).value = "")); maybeCalc(); }
  const EXAMPLES = {
    s2: { eq: ["2x + 3y = 13", "x - y = 1", ""], coef: [["2", "3", "", "13"], ["1", "-1", "", "1"]] },
    s3: { eq: ["x + y + z = 6", "2x - y + z = 3", "x + 2y - z = 2"], coef: [["1", "1", "1", "6"], ["2", "-1", "1", "3"], ["1", "2", "-1", "2"]] }
  };
  function fillExample() {
    resetAll();
    const ex = EXAMPLES[mode];
    if (el("inKind").value === "coef") ex.coef.forEach((row, r) => row.forEach((v, c) => { if (!(mode === "s2" && c === 2)) el(mid(r, c)).value = v; }));
    else ex.eq.forEach((v, i) => { el("e" + (i + 1)).value = v; });
    calc(true); toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("m", mode); p.set("in", el("inKind").value); p.set("md", el("method").value);
    FIELDS.forEach((id) => el(id).value.trim() && p.set(id, el(id).value.trim()));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const qs = new URLSearchParams(location.search);
    if (![...qs.keys()].length) return false;
    if (MODES.includes(qs.get("m"))) mode = qs.get("m");
    if (["eq", "coef"].includes(qs.get("in"))) setDd("inKind", qs.get("in"));
    fillMethods();
    if (qs.get("md")) setDd("method", qs.get("md"));
    FIELDS.forEach((id) => { if (qs.has(id)) el(id).value = qs.get(id).slice(0, MAXLEN); });
    return true;
  }
  async function copyResult() {
    if (!last) { toast(T.calcFirst); return; }
    try { await navigator.clipboard.writeText(textOf(last)); toast(T.copied); } catch { toast(T.copyFailed); }
  }
  let lastEq = "e1";
  function insertAt(text) {
    const inp = el(lastEq);
    const s = inp.selectionStart ?? inp.value.length, e = inp.selectionEnd ?? inp.value.length;
    inp.value = inp.value.slice(0, s) + text + inp.value.slice(e);
    const pos = text === "()" ? s + 1 : s + text.length;
    inp.focus();
    inp.setSelectionRange(pos, pos);
    inp.dispatchEvent(new Event("input", { bubbles: true }));
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".sys__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    initDd("md", (v) => { setDd("method", v); maybeCalc(); });
    initDd("ik", (v) => { setDd("inKind", v); syncVisibility(); maybeCalc(); });
    document.querySelectorAll(".sys__key").forEach((b) => { b.addEventListener("mousedown", (e) => e.preventDefault()); b.addEventListener("click", () => insertAt(b.dataset.ins)); });
    ["e1", "e2", "e3"].forEach((id) => el(id).addEventListener("focus", () => { lastEq = id; }));
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
